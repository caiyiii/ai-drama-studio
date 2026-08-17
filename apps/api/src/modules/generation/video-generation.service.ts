import fs from "node:fs/promises";
import { HttpStatus, Injectable } from "@nestjs/common";
import {
  AiCapability,
  AssetStatus,
  AssetType,
  GenerationTaskStatus,
  GenerationTaskType,
  Prisma,
} from "@prisma/client";
import {
  resolveVideoSize,
  validateVideoGenerationInput,
} from "@ai-drama-studio/core";
import { AppError, ErrorCodes } from "../../common/app-error";
import { PrismaService } from "../../prisma/prisma.service";
import { AiProviderError } from "../ai/ai.errors";
import { AiService } from "../ai/ai.service";
import { AssetStorageService } from "../assets/asset-storage.service";
import { GenerationExecutor } from "./generation.executor";
import {
  CreateImageToVideoGenerationDto,
  CreateVideoGenerationDto,
} from "./dto/create-video-generation.dto";
import { buildVideoGenerationPrompt } from "./prompts/video-generation.prompt";
import {
  applyVideoGeneration,
  persistPreviewVideo,
} from "./video/apply-video-generation";
import { validateVideoGenerationResult } from "./video/video-generation.schema";

@Injectable()
export class VideoGenerationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
    private readonly executor: GenerationExecutor,
    private readonly storage: AssetStorageService,
  ) {}

  createVideoGeneration(projectId: string, dto: CreateVideoGenerationDto) {
    return this.create(projectId, dto, "TEXT_TO_VIDEO");
  }

  createImageToVideoGeneration(
    projectId: string,
    dto: CreateImageToVideoGenerationDto,
  ) {
    return this.create(projectId, dto, "IMAGE_TO_VIDEO");
  }

  async apply(projectId: string, id: string) {
    await this.ensureProject(projectId);
    const task = await this.executor.getTask(projectId, id);
    if (
      task.type !== GenerationTaskType.VIDEO &&
      task.type !== GenerationTaskType.IMAGE_TO_VIDEO
    ) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.GENERATION_NOT_SUCCEEDED,
        "只能应用视频生成结果",
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
    const input = asRecord(task.input);
    const shotId = String(input.shotId || "");
    const shot = await this.requireOwnedShot(projectId, shotId);
    const result = validateVideoGenerationResult(task.output);
    const file = await persistPreviewVideo(this.storage, projectId, result);
    try {
      await this.prisma.$transaction(async (tx) => {
        await applyVideoGeneration(tx, {
          projectId,
          shotId,
          taskId: id,
          provider: task.provider,
          model: task.model,
          capability: task.capability,
          prompt: String(input.prompt || ""),
          negativePrompt:
            typeof input.negativePrompt === "string" ? input.negativePrompt : undefined,
          sourceAssetId:
            typeof input.sourceAssetId === "string" ? input.sourceAssetId : undefined,
          storyboardVersion: shot.storyboard.version,
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
        ErrorCodes.VIDEO_ASSET_APPLY_FAILED,
        "应用视频失败，已回滚",
      );
    }
    return this.executor.getTask(projectId, id);
  }

  private async create(
    projectId: string,
    dto: CreateImageToVideoGenerationDto,
    mode: "TEXT_TO_VIDEO" | "IMAGE_TO_VIDEO",
  ) {
    await this.ensureProject(projectId);
    try {
      validateVideoGenerationInput({
        shotId: dto.shotId,
        durationSeconds: dto.durationSeconds,
        width: dto.width,
        height: dto.height,
      });
    } catch {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.VIDEO_GENERATION_FAILED,
        "视频参数无效",
      );
    }
    const shot = await this.requireOwnedShot(projectId, dto.shotId);
    const size = resolveVideoSize({
      width: dto.width,
      height: dto.height,
      aspectRatio: dto.aspectRatio,
    });
    const durationSeconds = dto.durationSeconds ?? shot.durationSeconds ?? 5;
    const source =
      mode === "IMAGE_TO_VIDEO"
        ? await this.requireSourceImage(projectId, shot.id, dto.sourceAssetId)
        : null;

    const capability =
      mode === "IMAGE_TO_VIDEO"
        ? AiCapability.IMAGE_TO_VIDEO
        : AiCapability.VIDEO;
    let resolved;
    try {
      resolved = await this.ai.resolveForCapability(projectId, capability);
    } catch (error) {
      throw this.mapResolveError(error, capability);
    }

    const characterNames = await this.characterNames(projectId, shot.characterIds);
    const built = buildVideoGenerationPrompt({
      shot: {
        ...shot,
        characterNames,
      },
      promptOverride: dto.prompt,
      negativeOverride: dto.negativePrompt,
      sourceImageNote: source
        ? "Keep character and scene identity consistent with the source frame."
        : null,
    });
    if (!built.prompt) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.VIDEO_GENERATION_FAILED,
        "镜头缺少 Video Prompt 或可用的视觉描述",
      );
    }
    const providerLabel =
      resolved.source === "system" ? resolved.kind : resolved.name;
    const taskType =
      mode === "IMAGE_TO_VIDEO"
        ? GenerationTaskType.IMAGE_TO_VIDEO
        : GenerationTaskType.VIDEO;
    const input = {
      shotId: shot.id,
      mode,
      prompt: built.prompt,
      negativePrompt: built.negativePrompt,
      durationSeconds,
      width: size.width,
      height: size.height,
      aspectRatio: dto.aspectRatio,
      fps: dto.fps,
      seed: dto.seed,
      sourceAssetId: source?.id,
      cameraMovement: shot.cameraMovement,
    };

    const task = await this.prisma.generationTask.create({
      data: {
        projectId,
        type: taskType,
        status: GenerationTaskStatus.PENDING,
        capability,
        provider: providerLabel,
        model: resolved.model || null,
        input: input as Prisma.InputJsonValue,
      },
    });

    try {
      await this.executor.run(
        task.id,
        async () => {
          const started = Date.now();
          try {
            const payload = {
              prompt: built.prompt,
              negativePrompt: built.negativePrompt,
              durationSeconds,
              width: size.width,
              height: size.height,
              aspectRatio: dto.aspectRatio,
              fps: dto.fps,
              seed: dto.seed,
              cameraMovement: shot.cameraMovement,
              imageUrl: source?.remoteUrl,
              imageBase64: source?.base64,
            };
            const raw =
              mode === "IMAGE_TO_VIDEO"
                ? await this.ai.generateImageToVideoWith(resolved, payload)
                : await this.ai.generateVideoWith(resolved, payload);
            const validated = validateVideoGenerationResult(raw);
            return {
              ...validated,
              provider: providerLabel,
              model: resolved.model,
              durationMs: Date.now() - started,
            };
          } catch (error) {
            throw this.mapProviderError(error, capability);
          }
        },
        resolved.apiKey,
      );
      await this.attachUsage(task.id, {
        sourceShotId: shot.id,
        sourceAssetId: source?.id,
        outputAssetCount: 0,
      });
    } catch {
      // FAILED already recorded
    }
    return this.executor.getTask(projectId, task.id);
  }

  private async requireSourceImage(
    projectId: string,
    shotId: string,
    sourceAssetId?: string,
  ) {
    let assetId = sourceAssetId?.trim() || "";
    if (!assetId) {
      const primary = await this.prisma.storyboardShotAsset.findFirst({
        where: {
          shotId,
          isPrimary: true,
          asset: { type: AssetType.IMAGE, status: AssetStatus.READY },
        },
        include: { asset: true },
      });
      const fallback =
        primary ??
        (await this.prisma.storyboardShotAsset.findFirst({
          where: {
            shotId,
            role: "FINAL",
            asset: { type: AssetType.IMAGE, status: AssetStatus.READY },
          },
          include: { asset: true },
        }));
      if (!fallback?.asset) {
        throw new AppError(
          HttpStatus.BAD_REQUEST,
          ErrorCodes.SOURCE_IMAGE_REQUIRED,
          "图生视频需要镜头的最终图片 Asset",
        );
      }
      assetId = fallback.asset.id;
    }
    const asset = await this.prisma.asset.findUnique({ where: { id: assetId } });
    if (!asset) {
      throw new AppError(
        HttpStatus.NOT_FOUND,
        ErrorCodes.SOURCE_IMAGE_NOT_FOUND,
        "源图片不存在",
      );
    }
    if (asset.projectId !== projectId) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.SOURCE_IMAGE_PROJECT_MISMATCH,
        "源图片不属于当前项目",
      );
    }
    if (asset.type !== AssetType.IMAGE) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.SOURCE_IMAGE_REQUIRED,
        "源资源必须是图片",
      );
    }
    if (asset.status !== AssetStatus.READY) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.SOURCE_IMAGE_NOT_READY,
        "源图片尚未就绪",
      );
    }
    const linked = await this.prisma.storyboardShotAsset.findUnique({
      where: { shotId_assetId: { shotId, assetId: asset.id } },
    });
    if (!linked) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.SOURCE_IMAGE_SHOT_MISMATCH,
        "源图片不属于当前镜头",
      );
    }
    let base64: string | undefined;
    if (asset.storageKey) {
      try {
        const buf = await fs.readFile(this.storage.resolvePath(asset.storageKey));
        base64 = buf.toString("base64");
      } catch {
        base64 = undefined;
      }
    }
    const remoteUrl =
      asset.url && /^https?:\/\//i.test(asset.url) ? asset.url : undefined;
    return { id: asset.id, base64, remoteUrl };
  }

  private async requireOwnedShot(projectId: string, shotId: string) {
    const shot = await this.prisma.storyboardShot.findUnique({
      where: { id: shotId },
      include: { storyboard: true },
    });
    if (!shot) {
      throw new AppError(
        HttpStatus.NOT_FOUND,
        ErrorCodes.STORYBOARD_SHOT_NOT_FOUND,
        "镜头不存在",
      );
    }
    if (shot.storyboard.projectId !== projectId) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.SHOT_PROJECT_MISMATCH,
        "镜头不属于当前项目",
      );
    }
    return shot;
  }

  private async characterNames(
    projectId: string,
    characterIds: Prisma.JsonValue | null,
  ): Promise<string[]> {
    const ids = Array.isArray(characterIds)
      ? characterIds.filter((item): item is string => typeof item === "string")
      : [];
    if (ids.length === 0) {
      return [];
    }
    const rows = await this.prisma.character.findMany({
      where: { projectId, id: { in: ids } },
      select: { name: true },
    });
    return rows.map((item) => item.name);
  }

  private async attachUsage(
    taskId: string,
    extra: {
      sourceShotId: string;
      sourceAssetId?: string;
      outputAssetCount: number;
    },
  ) {
    const current = await this.prisma.generationTask.findUnique({
      where: { id: taskId },
      select: { usage: true },
    });
    const usage = asRecord(current?.usage);
    await this.prisma.generationTask.update({
      where: { id: taskId },
      data: {
        usage: {
          durationMs: typeof usage.durationMs === "number" ? usage.durationMs : undefined,
          ...extra,
        } as Prisma.InputJsonValue,
      },
    });
  }

  private mapResolveError(error: unknown, capability: AiCapability): never {
    if (error instanceof AppError) {
      if (error.code === ErrorCodes.NO_AI_PROVIDER_CONFIGURED) {
        throw new AppError(
          HttpStatus.BAD_REQUEST,
          capability === AiCapability.IMAGE_TO_VIDEO
            ? ErrorCodes.IMAGE_TO_VIDEO_PROVIDER_NOT_CONFIGURED
            : ErrorCodes.VIDEO_PROVIDER_NOT_CONFIGURED,
          capability === AiCapability.IMAGE_TO_VIDEO
            ? "尚未配置图生视频 AI。请在项目设置中选择支持 IMAGE_TO_VIDEO 的 Provider。"
            : "尚未配置视频生成 AI。请在项目设置中选择支持 VIDEO 的 Provider。",
        );
      }
      if (error.code === ErrorCodes.PROVIDER_CAPABILITY_NOT_SUPPORTED) {
        throw new AppError(
          error.getStatus(),
          capability === AiCapability.IMAGE_TO_VIDEO
            ? ErrorCodes.IMAGE_TO_VIDEO_CAPABILITY_NOT_SUPPORTED
            : ErrorCodes.VIDEO_CAPABILITY_NOT_SUPPORTED,
          "当前 Provider 不支持该视频能力。",
        );
      }
      throw error;
    }
    throw error;
  }

  private mapProviderError(error: unknown, capability: AiCapability): never {
    if (error instanceof AiProviderError) {
      if (error.code === "CAPABILITY_NOT_SUPPORTED") {
        throw new AppError(
          HttpStatus.BAD_REQUEST,
          capability === AiCapability.IMAGE_TO_VIDEO
            ? ErrorCodes.IMAGE_TO_VIDEO_CAPABILITY_NOT_SUPPORTED
            : ErrorCodes.VIDEO_CAPABILITY_NOT_SUPPORTED,
          error.message,
        );
      }
      if (error.code === "TIMEOUT") {
        throw new AppError(
          HttpStatus.GATEWAY_TIMEOUT,
          ErrorCodes.VIDEO_GENERATION_TIMEOUT,
          "视频生成超时。",
        );
      }
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.VIDEO_GENERATION_FAILED,
        error.message,
      );
    }
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(
      HttpStatus.BAD_REQUEST,
      ErrorCodes.VIDEO_GENERATION_FAILED,
      "视频生成失败",
    );
  }

  private async ensureProject(projectId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      throw new AppError(HttpStatus.NOT_FOUND, ErrorCodes.PROJECT_NOT_FOUND, "项目不存在");
    }
    return project;
  }
}

function asRecord(value: Prisma.JsonValue | null | undefined): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}
