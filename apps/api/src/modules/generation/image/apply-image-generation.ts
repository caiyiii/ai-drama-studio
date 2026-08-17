import { randomUUID } from "node:crypto";
import { HttpStatus } from "@nestjs/common";
import {
  AssetStatus,
  AssetType,
  Prisma,
  StoryboardShotAssetRole,
} from "@prisma/client";
import type { ImageGenerationImage, ImageGenerationResult } from "@ai-drama-studio/types";
import { AppError, ErrorCodes } from "../../../common/app-error";
import type { AssetStorageService } from "../../assets/asset-storage.service";

type Tx = Prisma.TransactionClient;

export async function persistPreviewImages(
  storage: AssetStorageService,
  projectId: string,
  images: ImageGenerationImage[],
): Promise<
  Array<{
    id: string;
    saved: Awaited<ReturnType<AssetStorageService["saveFromBase64"]>>;
    image: ImageGenerationImage;
  }>
> {
  const saved: Array<{
    id: string;
    saved: Awaited<ReturnType<AssetStorageService["saveFromBase64"]>>;
    image: ImageGenerationImage;
  }> = [];
  try {
    for (const image of images) {
      const id = randomUUID();
      const file = image.base64
        ? await storage.saveFromBase64({
            projectId,
            assetId: id,
            base64: image.base64,
            mimeType: image.mimeType,
          })
        : image.url
          ? await storage.saveFromUrl({
              projectId,
              assetId: id,
              url: image.url,
              mimeType: image.mimeType,
            })
          : null;
      if (!file) {
        throw new AppError(
          HttpStatus.BAD_REQUEST,
          ErrorCodes.IMAGE_ASSET_SAVE_FAILED,
          "图片结果缺少可保存的内容",
        );
      }
      saved.push({ id, saved: file, image });
    }
    return saved;
  } catch (error) {
    await Promise.allSettled(saved.map((item) => storage.delete(item.saved.storageKey)));
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(
      HttpStatus.BAD_REQUEST,
      ErrorCodes.IMAGE_ASSET_SAVE_FAILED,
      "保存图片文件失败",
    );
  }
}

export async function applyImageGeneration(
  tx: Tx,
  input: {
    projectId: string;
    shotId: string;
    taskId: string;
    provider: string | null;
    model: string | null;
    prompt: string;
    negativePrompt?: string;
    files: Array<{
      id: string;
      saved: {
        storageKey: string;
        url: string;
        mimeType: string;
        sizeBytes: number;
      };
      image: ImageGenerationImage;
    }>;
    result: ImageGenerationResult;
  },
) {
  const existingCount = await tx.storyboardShotAsset.count({
    where: { shotId: input.shotId, asset: { type: AssetType.IMAGE } },
  });
  await tx.storyboardShotAsset.updateMany({
    where: {
      shotId: input.shotId,
      isPrimary: true,
      asset: { type: AssetType.IMAGE },
    },
    data: { isPrimary: false },
  });

  for (const [index, file] of input.files.entries()) {
    const version = existingCount + index + 1;
    const isPrimary = index === 0;
    await tx.asset.create({
      data: {
        id: file.id,
        projectId: input.projectId,
        type: AssetType.IMAGE,
        status: AssetStatus.READY,
        name: `Shot image v${version}`,
        mimeType: file.saved.mimeType,
        storageKey: file.saved.storageKey,
        url: file.saved.url,
        width: file.image.width ?? null,
        height: file.image.height ?? null,
        sizeBytes: file.saved.sizeBytes,
        provider: input.provider,
        model: input.model,
        version,
        generationTaskId: input.taskId,
        metadata: {
          source: "image-generation",
          shotId: input.shotId,
          prompt: input.prompt,
          negativePrompt: input.negativePrompt,
          seed: file.image.seed,
          requestedWidth: file.image.width,
          requestedHeight: file.image.height,
          actualWidth: file.image.width,
          actualHeight: file.image.height,
          revisedPrompt: file.image.revisedPrompt,
        } as Prisma.InputJsonValue,
      },
    });
    await tx.storyboardShotAsset.create({
      data: {
        shotId: input.shotId,
        assetId: file.id,
        role: isPrimary
          ? StoryboardShotAssetRole.FINAL
          : StoryboardShotAssetRole.GENERATED,
        isPrimary,
        sortOrder: index,
      },
    });
  }

  await tx.generationTask.update({
    where: { id: input.taskId },
    data: { appliedAt: new Date() },
  });
}
