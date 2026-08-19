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
import { AiProviderError } from "../ai/ai.errors";
import { StoryContextBuilder } from "../story/story-context.builder";
import { GenerationExecutor } from "./generation.executor";
import {
  CreateEpisodeOutlineGenerationDto,
  CreateSeasonOutlineGenerationDto,
  CreateStoryBibleGenerationDto,
} from "./dto/create-story-generation.dto";
import { buildStoryBibleGenerationPrompt } from "./prompts/story-bible-generation.prompt";
import { buildSeasonOutlinePrompt } from "./prompts/season-outline-generation.prompt";
import { buildEpisodeOutlinePrompt } from "./prompts/episode-outline-generation.prompt";
import { validateStoryBibleGenerationResult } from "./story/story-bible-generation.schema";
import { validateSeasonOutlineGenerationResult } from "./story/season-outline-generation.schema";
import { validateEpisodeOutlineGenerationResult } from "./story/episode-outline-generation.schema";
import {
  applyEpisodeOutlineGeneration,
  applySeasonOutlineGeneration,
  applyStoryBibleGeneration,
} from "./story/apply-story-generation";

@Injectable()
export class StoryGenerationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
    private readonly executor: GenerationExecutor,
    private readonly contextBuilder: StoryContextBuilder,
  ) {}

  async createStoryBibleGeneration(
    projectId: string,
    dto: CreateStoryBibleGenerationDto,
  ) {
    await this.ensureProject(projectId);
    const resolved = await this.ai.resolveForCapability(
      projectId,
      AiCapability.STRUCTURED_OUTPUT,
    );
    const context = await this.contextBuilder.buildProjectContext(projectId);
    const input = {
      instruction: dto.instruction.trim(),
      tone: dto.tone?.trim() || undefined,
      style: dto.style?.trim() || undefined,
      audience: dto.audience?.trim() || undefined,
    };
    const task = await this.prisma.generationTask.create({
      data: {
        projectId,
        type: GenerationTaskType.STORY_BIBLE,
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
          const prompt = buildStoryBibleGenerationPrompt({ ...input, context });
          const raw = await this.ai.generateWith(resolved, {
            system: prompt.system,
            prompt: prompt.prompt,
          });
          return validateStoryBibleGenerationResult(raw);
        },
        resolved.apiKey,
      );
    } catch {
      // FAILED already recorded
    }
    return this.executor.getTask(projectId, task.id);
  }

  async createSeasonOutlineGeneration(
    projectId: string,
    dto: CreateSeasonOutlineGenerationDto,
  ) {
    await this.ensureProject(projectId);
    const season = await this.prisma.season.findFirst({
      where: { id: dto.seasonId, projectId },
    });
    if (!season) {
      throw new AppError(
        HttpStatus.NOT_FOUND,
        ErrorCodes.SEASON_NOT_FOUND,
        "季不存在",
      );
    }
    const resolved = await this.ai.resolveForCapability(
      projectId,
      AiCapability.STRUCTURED_OUTPUT,
    );
    const context = await this.contextBuilder.buildSeasonContext(
      projectId,
      dto.seasonId,
    );
    const mode =
      dto.mode ||
      (context.episodes.length > 0 ? "CONTINUE" : "INITIAL");
    const input = {
      seasonId: dto.seasonId,
      mode,
      instruction: dto.instruction?.trim() || undefined,
      episodeCount: dto.episodeCount || 12,
      targetDurationSeconds: dto.targetDurationSeconds || 300,
      replanConfirmed: dto.replanConfirmed === true,
    };
    const task = await this.prisma.generationTask.create({
      data: {
        projectId,
        type: GenerationTaskType.SEASON_OUTLINE,
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
          const prompt = buildSeasonOutlinePrompt({ ...input, context });
          const raw = await this.ai.generateWith(resolved, {
            system: prompt.system,
            prompt: prompt.prompt,
          });
          return validateSeasonOutlineGenerationResult(raw);
        },
        resolved.apiKey,
      );
    } catch {
      // FAILED already recorded
    }
    return this.executor.getTask(projectId, task.id);
  }

  async createEpisodeOutlineGeneration(
    projectId: string,
    dto: CreateEpisodeOutlineGenerationDto,
  ) {
    await this.ensureProject(projectId);
    const episode = await this.prisma.episode.findFirst({
      where: { id: dto.episodeId, projectId },
    });
    if (!episode) {
      throw new AppError(
        HttpStatus.NOT_FOUND,
        ErrorCodes.EPISODE_NOT_FOUND,
        "剧集不存在",
      );
    }
    const resolved = await this.ai.resolveForCapability(
      projectId,
      AiCapability.STRUCTURED_OUTPUT,
    );
    const context = await this.contextBuilder.buildEpisodeContext(
      projectId,
      dto.episodeId,
    );
    const input = {
      episodeId: dto.episodeId,
      instruction: dto.instruction?.trim() || undefined,
    };
    const task = await this.prisma.generationTask.create({
      data: {
        projectId,
        type: GenerationTaskType.EPISODE_OUTLINE,
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
          const prompt = buildEpisodeOutlinePrompt({ ...input, context });
          const raw = await this.ai.generateWith(resolved, {
            system: prompt.system,
            prompt: prompt.prompt,
          });
          return validateEpisodeOutlineGenerationResult(raw);
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
    const task = await this.executor.getTask(projectId, id);
    if (task.status !== GenerationTaskStatus.SUCCEEDED) {
      throw new BadRequestException("只能应用已成功的生成结果");
    }
    if (task.appliedAt) {
      throw new BadRequestException("该生成结果已经应用过");
    }
    try {
      await this.prisma.$transaction(async (tx) => {
        if (task.type === GenerationTaskType.STORY_BIBLE) {
          const result = validateStoryBibleGenerationResult(task.output);
          await applyStoryBibleGeneration(tx, projectId, id, result);
          return;
        }
        if (task.type === GenerationTaskType.SEASON_OUTLINE) {
          const result = validateSeasonOutlineGenerationResult(task.output);
          const input = asInput(task.input);
          await applySeasonOutlineGeneration(
            tx,
            projectId,
            String(input.seasonId || ""),
            id,
            result,
            Number(input.targetDurationSeconds || 300),
            String(input.mode || "INITIAL") as "INITIAL" | "CONTINUE" | "REPLAN",
            input.replanConfirmed === true,
          );
          return;
        }
        if (task.type === GenerationTaskType.EPISODE_OUTLINE) {
          const result = validateEpisodeOutlineGenerationResult(task.output);
          const input = asInput(task.input);
          await applyEpisodeOutlineGeneration(
            tx,
            projectId,
            String(input.episodeId || ""),
            id,
            result,
          );
        }
      });
    } catch (error) {
      if (error instanceof AppError || error instanceof AiProviderError) {
        throw error instanceof AppError
          ? error
          : new BadRequestException(error.message);
      }
      throw new BadRequestException(
        error instanceof Error ? `数据库写入失败：${error.message}` : "数据库写入失败",
      );
    }
    return this.executor.getTask(projectId, id);
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
