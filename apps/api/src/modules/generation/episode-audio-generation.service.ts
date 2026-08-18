import { createReadStream } from "node:fs";
import { HttpStatus, Injectable, StreamableFile } from "@nestjs/common";
import {
  AiCapability,
  GenerationTaskStatus,
  GenerationTaskType,
  Prisma,
} from "@prisma/client";
import {
  normalizeMusicInput,
  normalizeSfxInput,
  validateMusicDuration,
  validateSfxDuration,
} from "@ai-drama-studio/core";
import { AppError, ErrorCodes } from "../../common/app-error";
import { PrismaService } from "../../prisma/prisma.service";
import { AiProviderError } from "../ai/ai.errors";
import { AiService } from "../ai/ai.service";
import { AssetStorageService } from "../assets/asset-storage.service";
import { StoryContextBuilder } from "../story/story-context.builder";
import { GenerationExecutor } from "./generation.executor";
import { CreateMusicGenerationDto } from "./dto/create-music-generation.dto";
import { CreateSfxGenerationDto } from "./dto/create-sfx-generation.dto";
import { buildMusicGenerationPrompt } from "./prompts/music-generation.prompt";
import { buildSfxGenerationPrompt } from "./prompts/sfx-generation.prompt";
import {
  applyEpisodeAudioGeneration,
  persistEpisodeApplyAudio,
  persistEpisodePreviewAudio,
  type EpisodeAudioKind,
} from "./audio/apply-episode-audio";
import { validateMusicGenerationResult } from "./audio/music-generation.schema";
import { validateSfxGenerationResult } from "./audio/sfx-generation.schema";

@Injectable()
export class EpisodeAudioGenerationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
    private readonly executor: GenerationExecutor,
    private readonly storage: AssetStorageService,
    private readonly contextBuilder: StoryContextBuilder,
  ) {}

  async createMusicGeneration(projectId: string, dto: CreateMusicGenerationDto) {
    const episode = await this.requireOwnedEpisode(projectId, dto.episodeId);
    const normalized = normalizeMusicInput({
      episodeId: dto.episodeId,
      prompt: dto.prompt,
      durationSeconds: dto.durationSeconds,
      style: dto.style,
      mood: dto.mood,
      genre: dto.genre,
      instrumentation: dto.instrumentation,
      tempo: dto.tempo,
      language: dto.language,
      isInstrumental: dto.isInstrumental,
      title: dto.title,
      negativePrompt: dto.negativePrompt,
      loopable: dto.loopable,
      intensity: dto.intensity,
    });
    if (!normalized.prompt) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.MUSIC_GENERATION_FAILED,
        "请填写音乐提示词",
      );
    }
    try {
      validateMusicDuration(normalized.durationSeconds);
    } catch {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.INVALID_DURATION,
        "音乐时长必须在 1–600 秒之间",
      );
    }

    let resolved;
    try {
      resolved = await this.ai.resolveForCapability(projectId, AiCapability.MUSIC);
    } catch (error) {
      throw this.mapResolveError(error, "MUSIC");
    }

    const context = await this.contextBuilder.buildMusicContext(
      projectId,
      episode.id,
    );
    const prompt = buildMusicGenerationPrompt({
      userPrompt: normalized.prompt,
      context,
      style: normalized.style,
      mood: normalized.mood,
      genre: normalized.genre,
      instrumentation: normalized.instrumentation,
      tempo: normalized.tempo,
      isInstrumental: normalized.isInstrumental,
      negativePrompt: normalized.negativePrompt,
    });
    const providerLabel =
      resolved.source === "system" ? resolved.kind : resolved.name;
    const input = {
      ...normalized,
      context,
    };
    const task = await this.prisma.generationTask.create({
      data: {
        projectId,
        type: GenerationTaskType.MUSIC,
        status: GenerationTaskStatus.PENDING,
        capability: AiCapability.MUSIC,
        provider: providerLabel,
        model: resolved.model || null,
        input: input as unknown as Prisma.InputJsonValue,
      },
    });

    try {
      await this.executor.run(
        task.id,
        async () => {
          const started = Date.now();
          try {
            const raw = await this.ai.generateMusicWith(resolved, {
              prompt,
              durationSeconds: normalized.durationSeconds,
              style: normalized.style,
              mood: normalized.mood,
              genre: normalized.genre,
              instrumentation: normalized.instrumentation,
              tempo: normalized.tempo,
              language: normalized.language,
              isInstrumental: normalized.isInstrumental,
              negativePrompt: normalized.negativePrompt,
              title: normalized.title,
              loopable: normalized.loopable,
              intensity: normalized.intensity,
            });
            const validated = validateMusicGenerationResult(raw);
            const preview = await persistEpisodePreviewAudio(
              this.storage,
              projectId,
              validated,
              { fileStem: "music", assetId: `preview-${task.id}` },
            );
            return {
              assetType: "AUDIO",
              audioType: "MUSIC",
              durationSeconds:
                validated.durationSeconds ?? normalized.durationSeconds,
              mimeType: preview.saved.mimeType,
              previewUrl: `/projects/${projectId}/generations/${task.id}/preview`,
              previewStorageKey: preview.saved.storageKey,
              provider: providerLabel,
              model: resolved.model,
              metadata: {
                type: "music",
                style: normalized.style,
                mood: normalized.mood,
                genre: normalized.genre,
                durationSeconds: normalized.durationSeconds,
                instrumentation: normalized.instrumentation,
                tempo: normalized.tempo,
                isInstrumental: normalized.isInstrumental,
              },
              durationMs: Date.now() - started,
              sizeBytes: preview.saved.sizeBytes,
              providerRequestId: validated.providerRequestId,
            };
          } catch (error) {
            throw this.mapProviderError(error, "MUSIC");
          }
        },
        resolved.apiKey,
      );
      await this.attachUsage(task.id);
    } catch {
      // FAILED already recorded
    }
    return this.executor.getTask(projectId, task.id);
  }

  async createSfxGeneration(projectId: string, dto: CreateSfxGenerationDto) {
    const episode = await this.requireOwnedEpisode(projectId, dto.episodeId);
    const normalized = normalizeSfxInput({
      episodeId: dto.episodeId,
      prompt: dto.prompt,
      durationSeconds: dto.durationSeconds,
      category: dto.category,
      intensity: dto.intensity,
      negativePrompt: dto.negativePrompt,
      sceneId: dto.sceneId,
      shotId: dto.shotId,
    });
    if (!normalized.prompt) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.SFX_GENERATION_FAILED,
        "请填写音效提示词",
      );
    }
    try {
      validateSfxDuration(normalized.durationSeconds);
    } catch {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.INVALID_DURATION,
        "音效时长必须在 0.1–60 秒之间",
      );
    }
    await this.validateSfxRefs(projectId, episode.id, normalized.sceneId, normalized.shotId);

    let resolved;
    try {
      resolved = await this.ai.resolveForCapability(projectId, AiCapability.SFX);
    } catch (error) {
      throw this.mapResolveError(error, "SFX");
    }

    const context = await this.contextBuilder.buildSfxContext(
      projectId,
      episode.id,
      normalized.sceneId,
      normalized.shotId,
    );
    const prompt = buildSfxGenerationPrompt({
      userPrompt: normalized.prompt,
      context,
      category: normalized.category,
      intensity: normalized.intensity,
      negativePrompt: normalized.negativePrompt,
    });
    const providerLabel =
      resolved.source === "system" ? resolved.kind : resolved.name;
    const input = {
      ...normalized,
      context,
    };
    const task = await this.prisma.generationTask.create({
      data: {
        projectId,
        type: GenerationTaskType.SFX,
        status: GenerationTaskStatus.PENDING,
        capability: AiCapability.SFX,
        provider: providerLabel,
        model: resolved.model || null,
        input: input as unknown as Prisma.InputJsonValue,
      },
    });

    try {
      await this.executor.run(
        task.id,
        async () => {
          const started = Date.now();
          try {
            const raw = await this.ai.generateSfxWith(resolved, {
              prompt,
              durationSeconds: normalized.durationSeconds,
              category: normalized.category,
              intensity: normalized.intensity,
              negativePrompt: normalized.negativePrompt,
            });
            const validated = validateSfxGenerationResult(raw);
            const preview = await persistEpisodePreviewAudio(
              this.storage,
              projectId,
              validated,
              { fileStem: "sfx", assetId: `preview-${task.id}` },
            );
            return {
              assetType: "AUDIO",
              audioType: "SFX",
              durationSeconds:
                validated.durationSeconds ?? normalized.durationSeconds,
              mimeType: preview.saved.mimeType,
              previewUrl: `/projects/${projectId}/generations/${task.id}/preview`,
              previewStorageKey: preview.saved.storageKey,
              provider: providerLabel,
              model: resolved.model,
              metadata: {
                type: "sfx",
                category: normalized.category,
                intensity: normalized.intensity,
                sceneId: normalized.sceneId,
                shotId: normalized.shotId,
                source: normalized.shotId || normalized.sceneId ? "storyboard" : undefined,
              },
              durationMs: Date.now() - started,
              sizeBytes: preview.saved.sizeBytes,
              providerRequestId: validated.providerRequestId,
            };
          } catch (error) {
            throw this.mapProviderError(error, "SFX");
          }
        },
        resolved.apiKey,
      );
      await this.attachUsage(task.id);
    } catch {
      // FAILED already recorded
    }
    return this.executor.getTask(projectId, task.id);
  }

  async apply(projectId: string, id: string) {
    await this.ensureProject(projectId);
    const task = await this.executor.getTask(projectId, id);
    if (
      task.type !== GenerationTaskType.MUSIC &&
      task.type !== GenerationTaskType.SFX
    ) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.GENERATION_NOT_SUCCEEDED,
        "只能应用音乐或音效生成结果",
      );
    }
    if (task.status !== GenerationTaskStatus.SUCCEEDED) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.GENERATION_NOT_SUCCEEDED,
        "只能应用已成功的生成结果",
      );
    }
    if (task.appliedAt) {
      throw new AppError(
        HttpStatus.CONFLICT,
        ErrorCodes.GENERATION_ALREADY_APPLIED,
        "该生成结果已经应用过",
      );
    }
    const kind: EpisodeAudioKind =
      task.type === GenerationTaskType.MUSIC ? "MUSIC" : "SFX";
    const input = asRecord(task.input);
    const output = asRecord(task.output);
    const episodeId = String(input.episodeId || "");
    await this.requireOwnedEpisode(projectId, episodeId);
    const previewStorageKey =
      typeof output.previewStorageKey === "string"
        ? output.previewStorageKey
        : undefined;
    const file = await persistEpisodeApplyAudio(this.storage, projectId, {
      fileStem: kind === "MUSIC" ? "music" : "sfx",
      previewStorageKey,
      audio: {
        url: typeof output.url === "string" ? output.url : undefined,
        mimeType:
          typeof output.mimeType === "string" ? output.mimeType : "audio/mpeg",
        durationSeconds:
          typeof output.durationSeconds === "number"
            ? output.durationSeconds
            : undefined,
      },
    });
    const extra = asRecord(output.metadata);
    const metadata = {
      ...extra,
      generationTaskId: id,
      type: kind === "MUSIC" ? "music" : "sfx",
    };
    try {
      await this.prisma.$transaction(async (tx) => {
        await applyEpisodeAudioGeneration(tx, {
          projectId,
          episodeId,
          taskId: id,
          kind,
          provider: task.provider,
          model: task.model,
          name:
            (typeof input.title === "string" && input.title.trim()) ||
            (kind === "MUSIC" ? "Episode music" : "Episode SFX"),
          metadata,
          file,
        });
      });
    } catch (error) {
      await Promise.allSettled([this.storage.delete(file.saved.storageKey)]);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.AUDIO_ASSET_APPLY_FAILED,
        "应用音频失败，已回滚",
      );
    }
    return this.executor.getTask(projectId, id);
  }

  async streamPreview(projectId: string, id: string) {
    const task = await this.executor.getTask(projectId, id);
    const output = asRecord(task.output);
    const storageKey =
      typeof output.previewStorageKey === "string"
        ? output.previewStorageKey
        : null;
    if (!storageKey) {
      throw new AppError(
        HttpStatus.NOT_FOUND,
        ErrorCodes.ASSET_NOT_FOUND,
        "预览音频不存在",
      );
    }
    const mimeType =
      typeof output.mimeType === "string" ? output.mimeType : "audio/mpeg";
    return new StreamableFile(createReadStream(this.storage.resolvePath(storageKey)), {
      type: mimeType,
      disposition: `inline; filename="${id}"`,
    });
  }

  private async requireOwnedEpisode(projectId: string, episodeId: string) {
    await this.ensureProject(projectId);
    const episode = await this.prisma.episode.findUnique({
      where: { id: episodeId },
      include: { season: true },
    });
    if (!episode) {
      throw new AppError(
        HttpStatus.NOT_FOUND,
        ErrorCodes.EPISODE_NOT_FOUND,
        "剧集不存在",
      );
    }
    if (
      episode.projectId !== projectId ||
      episode.season.projectId !== projectId
    ) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.EPISODE_NOT_IN_PROJECT,
        "剧集不属于当前项目",
      );
    }
    return episode;
  }

  private async validateSfxRefs(
    projectId: string,
    episodeId: string,
    sceneId?: string,
    shotId?: string,
  ) {
    if (sceneId) {
      const scene = await this.prisma.scene.findUnique({
        where: { id: sceneId },
        include: { script: true },
      });
      if (
        !scene ||
        scene.script.episodeId !== episodeId ||
        scene.script.projectId !== projectId
      ) {
        throw new AppError(
          HttpStatus.BAD_REQUEST,
          ErrorCodes.STORYBOARD_INVALID_SCENE,
          "场景不属于当前剧集",
        );
      }
    }
    if (shotId) {
      const shot = await this.prisma.storyboardShot.findUnique({
        where: { id: shotId },
        include: { storyboard: true },
      });
      if (
        !shot ||
        shot.storyboard.episodeId !== episodeId ||
        shot.storyboard.projectId !== projectId
      ) {
        throw new AppError(
          HttpStatus.BAD_REQUEST,
          ErrorCodes.STORYBOARD_SHOT_NOT_FOUND,
          "镜头不属于当前剧集",
        );
      }
    }
  }

  private async attachUsage(taskId: string) {
    const current = await this.prisma.generationTask.findUnique({
      where: { id: taskId },
      select: { usage: true, output: true },
    });
    const usage = asRecord(current?.usage);
    const output = asRecord(current?.output);
    await this.prisma.generationTask.update({
      where: { id: taskId },
      data: {
        usage: {
          durationMs:
            typeof usage.durationMs === "number"
              ? usage.durationMs
              : typeof output.durationMs === "number"
                ? output.durationMs
                : undefined,
          ...(typeof output.durationSeconds === "number"
            ? { audioDurationSeconds: output.durationSeconds }
            : {}),
          ...(typeof output.sizeBytes === "number"
            ? { sizeBytes: output.sizeBytes }
            : {}),
        } as Prisma.InputJsonValue,
      },
    });
  }

  private mapResolveError(error: unknown, kind: EpisodeAudioKind): never {
    const notConfigured =
      kind === "MUSIC"
        ? ErrorCodes.MUSIC_PROVIDER_NOT_CONFIGURED
        : ErrorCodes.SFX_PROVIDER_NOT_CONFIGURED;
    const notSupported =
      kind === "MUSIC"
        ? ErrorCodes.MUSIC_CAPABILITY_NOT_SUPPORTED
        : ErrorCodes.SFX_CAPABILITY_NOT_SUPPORTED;
    const label = kind === "MUSIC" ? "音乐" : "音效";
    if (error instanceof AppError) {
      if (error.code === ErrorCodes.NO_AI_PROVIDER_CONFIGURED) {
        throw new AppError(
          HttpStatus.BAD_REQUEST,
          notConfigured,
          `尚未配置${label}生成 AI。请在项目设置中选择支持 ${kind} 的 Provider。`,
        );
      }
      if (error.code === ErrorCodes.PROVIDER_CAPABILITY_NOT_SUPPORTED) {
        throw new AppError(
          error.getStatus(),
          notSupported,
          `当前 Provider 不支持${label}生成。`,
        );
      }
      if (error.code === ErrorCodes.MODEL_CAPABILITY_NOT_SUPPORTED) {
        throw new AppError(
          error.getStatus(),
          notSupported,
          `当前模型不支持${label}生成。`,
        );
      }
      throw error;
    }
    throw error;
  }

  private mapProviderError(error: unknown, kind: EpisodeAudioKind): never {
    const failed =
      kind === "MUSIC"
        ? ErrorCodes.MUSIC_GENERATION_FAILED
        : ErrorCodes.SFX_GENERATION_FAILED;
    const notSupported =
      kind === "MUSIC"
        ? ErrorCodes.MUSIC_CAPABILITY_NOT_SUPPORTED
        : ErrorCodes.SFX_CAPABILITY_NOT_SUPPORTED;
    const label = kind === "MUSIC" ? "音乐" : "音效";
    if (error instanceof AiProviderError) {
      if (error.code === "CAPABILITY_NOT_SUPPORTED") {
        throw new AppError(
          HttpStatus.BAD_REQUEST,
          notSupported,
          error.message,
        );
      }
      if (error.code === "TIMEOUT") {
        throw new AppError(
          HttpStatus.GATEWAY_TIMEOUT,
          failed,
          `${label}生成超时。`,
        );
      }
      throw new AppError(HttpStatus.BAD_REQUEST, failed, error.message);
    }
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(HttpStatus.BAD_REQUEST, failed, `${label}生成失败`);
  }

  private async ensureProject(projectId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      throw new AppError(HttpStatus.NOT_FOUND, ErrorCodes.PROJECT_NOT_FOUND, "项目不存在");
    }
    return project;
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}
