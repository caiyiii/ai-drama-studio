import {
  BadRequestException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import {
  AiCapability,
  GenerationTaskStatus,
  GenerationTaskType,
  Prisma,
} from "@prisma/client";
import type {
  StoryboardGenerationResult,
  StoryContext,
} from "@ai-drama-studio/types";
import { AppError, ErrorCodes } from "../../common/app-error";
import { PrismaService } from "../../prisma/prisma.service";
import { AiProviderError } from "../ai/ai.errors";
import { AiService } from "../ai/ai.service";
import type { ResolvedAiProvider } from "../ai/provider-resolver";
import { StoryContextBuilder } from "../story/story-context.builder";
import { StoryContinuityService } from "../story/story-continuity.service";
import { GenerationExecutor } from "./generation.executor";
import { CreateStoryboardGenerationDto } from "./dto/create-storyboard-generation.dto";
import { buildStoryboardGenerationPrompt } from "./prompts/storyboard-generation.prompt";
import { applyStoryboardGeneration } from "./storyboard/apply-storyboard-generation";
import { validateStoryboardGenerationResult } from "./storyboard/storyboard-generation.schema";

const MAX_STORYBOARD_ATTEMPTS = 3;
const STORYBOARD_MAX_TOKENS = 8192;

@Injectable()
export class StoryboardGenerationService {
  private readonly logger = new Logger(StoryboardGenerationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
    private readonly executor: GenerationExecutor,
    private readonly contextBuilder: StoryContextBuilder,
    private readonly continuity: StoryContinuityService,
  ) {}

  async createStoryboardGeneration(
    projectId: string,
    dto: CreateStoryboardGenerationDto,
  ) {
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
    const script = await this.prisma.script.findUnique({
      where: { episodeId: dto.episodeId },
      select: { status: true, projectId: true },
    });
    if (!script || script.projectId !== projectId) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.SCRIPT_REQUIRED_FOR_STORYBOARD,
        "请先完成本集剧本",
      );
    }
    if (script.status !== "READY" && script.status !== "LOCKED") {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.INVALID_REQUEST,
        "请先确认剧本，再生成正式分镜",
      );
    }
    await this.continuity.validateStoryboardContinuity(projectId, dto.episodeId);
    const resolved = await this.ai.resolveForCapability(
      projectId,
      AiCapability.STRUCTURED_OUTPUT,
    );
    const context = await this.contextBuilder.buildStoryboardContext(
      projectId,
      dto.episodeId,
    );
    const input = {
      episodeId: dto.episodeId,
      prompt: dto.prompt?.trim() || undefined,
      additionalInstructions: dto.additionalInstructions?.trim() || undefined,
    };
    const task = await this.prisma.generationTask.create({
      data: {
        projectId,
        type: GenerationTaskType.STORYBOARD,
        status: GenerationTaskStatus.PENDING,
        capability: AiCapability.STRUCTURED_OUTPUT,
        provider: resolved.source === "system" ? resolved.kind : resolved.name,
        model: resolved.model || null,
        input: input as Prisma.InputJsonValue,
        retryCount: 0,
      },
    });
    try {
      await this.executor.run(
        task.id,
        async () => {
          const scenes = context.script?.scenes ?? [];
          if (!scenes.length) {
            throw new AiProviderError(
              "Storyboard Schema Validation 失败：剧本场景为空",
              "SCHEMA_INVALID",
            );
          }

          const mergedShots: StoryboardGenerationResult["shots"] = [];
          let storyboardMeta: StoryboardGenerationResult["storyboard"] | null =
            null;
          let totalAttemptsUsed = 0;

          for (const scene of scenes) {
            const sceneResult = await this.generateSceneShots({
              taskId: task.id,
              providerLabel: String(task.provider || resolved.name),
              modelLabel: String(task.model || resolved.model || ""),
              resolved,
              context,
              input,
              focusSceneNumber: scene.number,
            });
            totalAttemptsUsed += sceneResult.attemptsUsed;
            if (!storyboardMeta) {
              storyboardMeta = sceneResult.result.storyboard;
            }
            for (const shot of sceneResult.result.shots) {
              mergedShots.push({
                ...shot,
                sceneNumber: scene.number,
                shotNumber: mergedShots.length + 1,
              });
            }
          }

          await this.prisma.generationTask.update({
            where: { id: task.id },
            data: {
              retryCount: Math.max(totalAttemptsUsed - scenes.length, 0),
            },
          });

          const merged: StoryboardGenerationResult = {
            storyboard: {
              title:
                storyboardMeta?.title ||
                `${context.episode?.title || "本集"} · 分镜`,
              description:
                storyboardMeta?.description ||
                `E${String(context.episode?.number || 0).padStart(2, "0")} 分镜`,
              totalDurationSeconds:
                mergedShots.reduce((sum, item) => sum + item.durationSeconds, 0) ||
                1,
            },
            shots: mergedShots,
          };
          const validated = validateStoryboardGenerationResult(merged);
          if (!validated.shots.length) {
            throw new AiProviderError(
              "Storyboard Schema Validation 失败：shots 不能为空",
              "SCHEMA_INVALID",
            );
          }
          return validated;
        },
        resolved.apiKey,
      );
      await this.attachUsage(task.id);
    } catch {
      // FAILED already recorded
    }
    return this.executor.getTask(projectId, task.id);
  }

  private async generateSceneShots(params: {
    taskId: string;
    providerLabel: string;
    modelLabel: string;
    resolved: ResolvedAiProvider;
    context: StoryContext;
    input: {
      episodeId: string;
      prompt?: string;
      additionalInstructions?: string;
    };
    focusSceneNumber: number;
  }): Promise<{ result: StoryboardGenerationResult; attemptsUsed: number }> {
    let lastError: unknown = null;
    for (let attempt = 1; attempt <= MAX_STORYBOARD_ATTEMPTS; attempt += 1) {
      const retryReason =
        attempt === 1 ? undefined : describeAttemptFailure(lastError);
      const prompt = buildStoryboardGenerationPrompt({
        ...params.input,
        context: params.context,
        retryReason,
        focusSceneNumber: params.focusSceneNumber,
      });
      this.logger.log(
        `Storyboard generation task=${params.taskId} provider=${params.providerLabel} model=${params.modelLabel} scene=${params.focusSceneNumber} attempt=${attempt}/${MAX_STORYBOARD_ATTEMPTS}`,
      );
      try {
        const raw = await this.ai.generateWith(params.resolved, {
          system: prompt.system,
          prompt: prompt.prompt,
          maxTokens: STORYBOARD_MAX_TOKENS,
        });
        const preview = safePreview(raw);
        this.logger.log(
          `Storyboard generation task=${params.taskId} scene=${params.focusSceneNumber} attempt=${attempt} rawPreviewLength=${preview.length} rawPreview=${preview}`,
        );
        const validated = validateStoryboardGenerationResult(raw);
        if (!validated.shots.length) {
          throw new AiProviderError(
            "Storyboard Schema Validation 失败：shots 不能为空",
            "SCHEMA_INVALID",
          );
        }
        const filteredShots = validated.shots
          .filter((shot) => shot.sceneNumber === params.focusSceneNumber)
          .map((shot, index) => ({
            ...shot,
            sceneNumber: params.focusSceneNumber,
            shotNumber: index + 1,
          }));
        if (!filteredShots.length) {
          throw new AiProviderError(
            `Storyboard Schema Validation 失败：Scene ${params.focusSceneNumber} 没有有效 shots`,
            "SCHEMA_INVALID",
          );
        }
        return {
          result: {
            storyboard: validated.storyboard,
            shots: filteredShots,
          },
          attemptsUsed: attempt,
        };
      } catch (error) {
        lastError = error;
        const message = describeAttemptFailure(error);
        this.logger.warn(
          `Storyboard generation task=${params.taskId} scene=${params.focusSceneNumber} attempt=${attempt} failed: ${message}`,
        );
        if (attempt >= MAX_STORYBOARD_ATTEMPTS) {
          throw error;
        }
      }
    }
    throw lastError instanceof Error ? lastError : new Error("分镜生成失败");
  }

  async apply(projectId: string, id: string) {
    await this.ensureProject(projectId);
    const task = await this.getOwnedTask(projectId, id);
    if (task.type !== GenerationTaskType.STORYBOARD) {
      throw new BadRequestException("只能应用分镜生成结果");
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
      const result = validateStoryboardGenerationResult(task.output);
      if (!result.shots.length) {
        throw new AppError(
          HttpStatus.BAD_REQUEST,
          ErrorCodes.STORYBOARD_APPLY_FAILED,
          "分镜写入失败：shots 不能为空",
        );
      }
      await this.prisma.$transaction(async (tx) => {
        await applyStoryboardGeneration(tx, projectId, episodeId, id, result);
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.STORYBOARD_APPLY_FAILED,
        error instanceof Error ? `分镜写入失败：${error.message}` : "分镜写入失败",
      );
    }
    return this.getOwnedTask(projectId, id);
  }

  private async attachUsage(taskId: string) {
    const task = await this.prisma.generationTask.findUnique({ where: { id: taskId } });
    if (!task || task.status !== GenerationTaskStatus.SUCCEEDED) {
      return;
    }
    const output = asInput(task.output);
    const shots = Array.isArray(output.shots) ? output.shots : [];
    const sceneCount = new Set(
      shots
        .map((item) =>
          item && typeof item === "object" && !Array.isArray(item)
            ? (item as { sceneNumber?: number }).sceneNumber
            : undefined,
        )
        .filter((item): item is number => typeof item === "number"),
    ).size;
    const usage = asInput(task.usage);
    await this.prisma.generationTask.update({
      where: { id: taskId },
      data: {
        usage: {
          ...(typeof usage.durationMs === "number" ? { durationMs: usage.durationMs } : {}),
          shotCount: shots.length,
          sceneCount,
          attemptCount: task.retryCount + sceneCount,
          sceneBatch: true,
        } as Prisma.InputJsonValue,
      },
    });
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

function describeAttemptFailure(error: unknown): string {
  if (error instanceof AiProviderError) {
    if (error.code === "INVALID_JSON") {
      return `Provider 返回非法 JSON。${error.message}`;
    }
    if (error.code === "SCHEMA_INVALID") {
      return `Storyboard Schema Validation 失败。${error.message}`;
    }
    return error.message;
  }
  if (error instanceof Error) {
    if (/Schema Validation/i.test(error.message)) {
      return `Storyboard Schema Validation 失败。${error.message}`;
    }
    return error.message;
  }
  return "未知错误";
}

function safePreview(value: unknown): string {
  try {
    const text = typeof value === "string" ? value : JSON.stringify(value);
    return text.slice(0, 240).replace(/\s+/g, " ");
  } catch {
    return "[unserializable]";
  }
}
