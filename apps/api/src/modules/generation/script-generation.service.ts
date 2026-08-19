import {
  BadRequestException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  AiCapability,
  GenerationTaskStatus,
  GenerationTaskType,
  Prisma,
} from "@prisma/client";
import { AppError, ErrorCodes } from "../../common/app-error";
import { PrismaService } from "../../prisma/prisma.service";
import { AiService } from "../ai/ai.service";
import { StoryContextBuilder } from "../story/story-context.builder";
import { StoryContinuityService } from "../story/story-continuity.service";
import { GenerationExecutor } from "./generation.executor";
import { CreateScriptGenerationDto } from "./dto/create-script-generation.dto";
import { buildScriptGenerationPrompt } from "./prompts/script-generation.prompt";
import { validateScriptGenerationResult } from "./script/script-generation.schema";
import { applyScriptGeneration } from "./script/apply-script-generation";

@Injectable()
export class ScriptGenerationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
    private readonly executor: GenerationExecutor,
    private readonly contextBuilder: StoryContextBuilder,
    private readonly continuity: StoryContinuityService,
  ) {}

  async createScriptGeneration(projectId: string, dto: CreateScriptGenerationDto) {
    await this.ensureProject(projectId);
    const episode = await this.prisma.episode.findFirst({
      where: { id: dto.episodeId, projectId },
    });
    if (!episode) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.PROJECT_EPISODE_MISMATCH,
        "剧集不属于当前项目",
      );
    }
    if (!episode.synopsis?.trim() && !episode.outline?.trim()) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.INVALID_REQUEST,
        "请先完成本集规划，再生成正式剧本",
      );
    }
    const continuity = await this.continuity.validateEpisodeContinuity(
      projectId,
      episode.seasonId,
      dto.episodeId,
    );
    if (!continuity.ok) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.PROJECT_EPISODE_MISMATCH,
        continuity.errors.join("；") || "连续性校验失败",
      );
    }
    const resolved = await this.ai.resolveForCapability(
      projectId,
      AiCapability.STRUCTURED_OUTPUT,
    );
    const context = await this.contextBuilder.buildScriptContext(
      projectId,
      dto.episodeId,
    );
    const input = {
      episodeId: dto.episodeId,
      prompt: dto.prompt?.trim() || undefined,
      tone: dto.tone?.trim() || undefined,
      style: dto.style?.trim() || undefined,
      targetDurationSeconds: dto.targetDurationSeconds || episode.durationSeconds || 300,
      additionalInstructions: dto.additionalInstructions?.trim() || undefined,
    };
    const task = await this.prisma.generationTask.create({
      data: {
        projectId,
        type: GenerationTaskType.SCRIPT,
        status: GenerationTaskStatus.PENDING,
        capability: AiCapability.STRUCTURED_OUTPUT,
        provider: resolved.source === "system" ? resolved.kind : resolved.name,
        model: resolved.model || null,
        input: input as Prisma.InputJsonValue,
      },
    });
    try {
      await this.executor.run(
        task.id,
        async () => {
          const prompt = buildScriptGenerationPrompt({ ...input, context });
          const raw = await this.ai.generateWith(resolved, {
            system: prompt.system,
            prompt: prompt.prompt,
          });
          return validateScriptGenerationResult(raw);
        },
        resolved.apiKey,
      );
    } catch {
      // FAILED already recorded
    }
    return this.executor.getTask(projectId, task.id);
  }

  async apply(projectId: string, id: string) {
    await this.ensureProject(projectId);
    const task = await this.getOwnedTask(projectId, id);
    if (task.type !== GenerationTaskType.SCRIPT) {
      throw new BadRequestException("只能应用剧本生成结果");
    }
    if (task.status !== GenerationTaskStatus.SUCCEEDED) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.GENERATION_NOT_SUCCEEDED,
        "只能应用已成功的生成结果",
      );
    }
    if (task.appliedAt) {
      throw new BadRequestException("该生成结果已经应用过");
    }
    const input = asInput(task.input);
    const episodeId = String(input.episodeId || "");
    try {
      const result = validateScriptGenerationResult(task.output);
      await this.prisma.$transaction(async (tx) => {
        await applyScriptGeneration(tx, projectId, episodeId, id, result);
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new BadRequestException(
        error instanceof Error ? `数据库写入失败：${error.message}` : "数据库写入失败",
      );
    }
    return this.getOwnedTask(projectId, id);
  }

  private async getOwnedTask(projectId: string, id: string) {
    try {
      return await this.executor.getTask(projectId, id);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new AppError(
          HttpStatus.NOT_FOUND,
          ErrorCodes.GENERATION_NOT_FOUND,
          "生成任务不存在",
        );
      }
      throw error;
    }
  }

  private async ensureProject(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) {
      throw new NotFoundException("Project not found");
    }
  }
}

function asInput(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}
