import { HttpStatus, Injectable } from "@nestjs/common";
import {
  AiCapability,
  AssetStatus,
  GenerationTaskStatus,
  GenerationTaskType,
  Prisma,
} from "@prisma/client";
import {
  assertImageCount,
  buildShotImagePrompt,
  buildShotNegativePrompt,
  formatImageSize,
  resolveImageSize,
} from "@ai-drama-studio/core";
import { AppError, ErrorCodes } from "../../common/app-error";
import { PrismaService } from "../../prisma/prisma.service";
import { AiProviderError } from "../ai/ai.errors";
import { AiService } from "../ai/ai.service";
import { AssetStorageService } from "../assets/asset-storage.service";
import { GenerationExecutor } from "./generation.executor";
import { CreateImageGenerationDto } from "./dto/create-image-generation.dto";
import {
  applyImageGeneration,
  persistPreviewImages,
} from "./image/apply-image-generation";
import { validateImageGenerationResult } from "./image/image-generation.schema";
import { assertNoActiveGeneration } from "./assert-no-active-generation";

@Injectable()
export class ImageGenerationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
    private readonly executor: GenerationExecutor,
    private readonly storage: AssetStorageService,
  ) {}

  async createImageGeneration(projectId: string, dto: CreateImageGenerationDto) {
    await this.ensureProject(projectId);
    const shot = await this.requireOwnedShot(projectId, dto.shotId);
    await assertNoActiveGeneration(this.prisma, {
      projectId,
      type: GenerationTaskType.IMAGE,
      match: (payload) => String(payload.shotId || "") === shot.id,
      message: "该镜头已有图片生成任务正在进行中。",
    });
    let count: number;
    let size: ReturnType<typeof resolveImageSize>;
    try {
      count = assertImageCount(dto.count);
    } catch {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.INVALID_IMAGE_COUNT,
        "图片生成数量必须在 1～4 之间",
      );
    }
    try {
      size = resolveImageSize({
        aspectRatio: dto.aspectRatio,
        width: dto.width,
        height: dto.height,
      });
    } catch {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.INVALID_IMAGE_SIZE,
        "图片尺寸或比例无效",
      );
    }
    await this.validateReferenceAssets(projectId, dto.referenceAssetIds);

    let resolved;
    try {
      resolved = await this.ai.resolveForCapability(projectId, AiCapability.IMAGE);
    } catch (error) {
      throw this.mapResolveError(error);
    }

    const prompt = buildShotImagePrompt(
      { ...shot, style: dto.style },
      dto.promptOverride,
    );
    if (!prompt) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.IMAGE_GENERATION_FAILED,
        "镜头缺少 Image Prompt 或视觉描述，无法生成图片",
      );
    }
    const negativePrompt = buildShotNegativePrompt(shot, dto.negativePromptOverride);
    const providerLabel =
      resolved.source === "system" ? resolved.kind : resolved.name;
    const input = {
      shotId: shot.id,
      prompt,
      negativePrompt,
      aspectRatio: size.aspectRatio,
      width: size.width,
      height: size.height,
      count,
      seed: dto.seed,
      style: dto.style?.trim() || undefined,
      referenceAssetIds: dto.referenceAssetIds ?? [],
    };

    const task = await this.prisma.generationTask.create({
      data: {
        projectId,
        type: GenerationTaskType.IMAGE,
        status: GenerationTaskStatus.PENDING,
        capability: AiCapability.IMAGE,
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
            const raw = await this.ai.generateImageWith(resolved, {
              prompt,
              negativePrompt,
              width: size.width,
              height: size.height,
              size: formatImageSize(size.width, size.height),
              n: count,
              seed: dto.seed,
            });
            const validated = validateImageGenerationResult(raw);
            return {
              images: validated.images,
              provider: providerLabel,
              model: resolved.model,
              requestedCount: count,
              durationMs: Date.now() - started,
            };
          } catch (error) {
            throw this.mapProviderError(error);
          }
        },
        resolved.apiKey,
      );
      await this.attachUsage(task.id, count);
    } catch {
      // FAILED already recorded
    }
    return this.executor.getTask(projectId, task.id);
  }

  async apply(projectId: string, id: string) {
    await this.ensureProject(projectId);
    const task = await this.executor.getTask(projectId, id);
    if (task.type !== GenerationTaskType.IMAGE) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.GENERATION_NOT_SUCCEEDED,
        "只能应用图片生成结果",
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
    await this.requireOwnedShot(projectId, shotId);
    const result = validateImageGenerationResult(task.output);
    const files = await persistPreviewImages(this.storage, projectId, result.images);
    try {
      await this.prisma.$transaction(async (tx) => {
        await applyImageGeneration(tx, {
          projectId,
          shotId,
          taskId: id,
          provider: task.provider,
          model: task.model,
          prompt: String(input.prompt || ""),
          negativePrompt:
            typeof input.negativePrompt === "string" ? input.negativePrompt : undefined,
          files,
          result,
        });
      });
    } catch (error) {
      await Promise.allSettled(
        files.map((item) => this.storage.delete(item.saved.storageKey)),
      );
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.IMAGE_ASSET_SAVE_FAILED,
        "应用图片失败，已回滚",
      );
    }
    return this.executor.getTask(projectId, id);
  }

  private async attachUsage(taskId: string, imageCount: number) {
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
          imageCount,
        } as Prisma.InputJsonValue,
      },
    });
  }

  private async validateReferenceAssets(projectId: string, ids?: string[]) {
    if (!ids || ids.length === 0) {
      return;
    }
    const unique = Array.from(new Set(ids));
    const rows = await this.prisma.asset.findMany({
      where: { id: { in: unique } },
    });
    for (const id of unique) {
      const row = rows.find((item) => item.id === id);
      if (!row || row.status === AssetStatus.DELETED) {
        throw new AppError(
          HttpStatus.NOT_FOUND,
          ErrorCodes.IMAGE_REFERENCE_ASSET_NOT_FOUND,
          "参考图资源不存在",
        );
      }
      if (row.projectId !== projectId) {
        throw new AppError(
          HttpStatus.BAD_REQUEST,
          ErrorCodes.IMAGE_REFERENCE_ASSET_PROJECT_MISMATCH,
          "参考图不属于当前项目",
        );
      }
    }
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
        ErrorCodes.PROJECT_EPISODE_MISMATCH,
        "镜头不属于当前项目",
      );
    }
    return shot;
  }

  private mapResolveError(error: unknown): never {
    if (error instanceof AppError) {
      if (error.code === ErrorCodes.NO_AI_PROVIDER_CONFIGURED) {
        throw new AppError(
          HttpStatus.BAD_REQUEST,
          ErrorCodes.IMAGE_PROVIDER_NOT_CONFIGURED,
          "尚未配置图片生成 AI。请在项目设置中选择支持 IMAGE 的 Provider / Model。",
        );
      }
      if (error.code === ErrorCodes.PROVIDER_CAPABILITY_NOT_SUPPORTED) {
        throw new AppError(
          error.getStatus(),
          ErrorCodes.IMAGE_CAPABILITY_NOT_SUPPORTED,
          "当前 Provider 不支持图片生成。",
        );
      }
      if (error.code === ErrorCodes.MODEL_CAPABILITY_NOT_SUPPORTED) {
        throw new AppError(
          error.getStatus(),
          ErrorCodes.IMAGE_MODEL_NOT_SUPPORTED,
          "当前 Model 不支持图片生成。",
        );
      }
      throw error;
    }
    throw error;
  }

  private mapProviderError(error: unknown): never {
    if (error instanceof AiProviderError) {
      if (error.code === "CAPABILITY_NOT_SUPPORTED") {
        throw new AppError(
          HttpStatus.BAD_REQUEST,
          ErrorCodes.IMAGE_CAPABILITY_NOT_SUPPORTED,
          "当前 Provider 不支持图片生成。",
        );
      }
      if (error.code === "TIMEOUT") {
        throw new AppError(
          HttpStatus.GATEWAY_TIMEOUT,
          ErrorCodes.IMAGE_GENERATION_TIMEOUT,
          "图片生成超时。",
        );
      }
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.IMAGE_GENERATION_FAILED,
        error.message,
      );
    }
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(
      HttpStatus.BAD_REQUEST,
      ErrorCodes.IMAGE_GENERATION_FAILED,
      "图片生成失败",
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
