import { randomUUID } from "node:crypto";
import { HttpStatus } from "@nestjs/common";
import {
  AssetStatus,
  AssetType,
  Prisma,
  StoryboardShotAssetRole,
} from "@prisma/client";
import type { VideoGenerationResult } from "@ai-drama-studio/types";
import { AppError, ErrorCodes } from "../../../common/app-error";
import type { AssetStorageService } from "../../assets/asset-storage.service";

type Tx = Prisma.TransactionClient;

export async function persistPreviewVideo(
  storage: AssetStorageService,
  projectId: string,
  video: VideoGenerationResult,
): Promise<{
  id: string;
  saved: Awaited<ReturnType<AssetStorageService["saveFromBase64"]>>;
  video: VideoGenerationResult;
}> {
  const id = randomUUID();
  try {
    const file = video.base64
      ? await storage.saveFromBase64({
          projectId,
          assetId: id,
          base64: video.base64,
          mimeType: video.mimeType || "video/mp4",
        })
      : video.url
        ? await storage.saveFromUrl({
            projectId,
            assetId: id,
            url: video.url,
            mimeType: video.mimeType || "video/mp4",
          })
        : null;
    if (!file) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.VIDEO_DOWNLOAD_FAILED,
        "视频结果缺少可保存的内容",
      );
    }
    return { id, saved: file, video };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(
      HttpStatus.BAD_REQUEST,
      ErrorCodes.VIDEO_DOWNLOAD_FAILED,
      "下载或保存视频失败",
    );
  }
}

export async function applyVideoGeneration(
  tx: Tx,
  input: {
    projectId: string;
    shotId: string;
    taskId: string;
    provider: string | null;
    model: string | null;
    capability: string | null;
    prompt: string;
    negativePrompt?: string;
    sourceAssetId?: string;
    storyboardVersion: number;
    file: {
      id: string;
      saved: {
        storageKey: string;
        url: string;
        mimeType: string;
        sizeBytes: number;
      };
      video: VideoGenerationResult;
    };
  },
) {
  const existingCount = await tx.storyboardShotAsset.count({
    where: { shotId: input.shotId, asset: { type: AssetType.VIDEO } },
  });
  await tx.storyboardShotAsset.updateMany({
    where: {
      shotId: input.shotId,
      isPrimary: true,
      asset: { type: AssetType.VIDEO },
    },
    data: { isPrimary: false },
  });
  const version = existingCount + 1;
  await tx.asset.create({
    data: {
      id: input.file.id,
      projectId: input.projectId,
      type: AssetType.VIDEO,
      status: AssetStatus.READY,
      name: `Shot video v${version}`,
      mimeType: input.file.saved.mimeType,
      storageKey: input.file.saved.storageKey,
      url: input.file.saved.url,
      width: input.file.video.width ?? null,
      height: input.file.video.height ?? null,
      durationSeconds: input.file.video.durationSeconds ?? null,
      sizeBytes: input.file.saved.sizeBytes,
      provider: input.provider,
      model: input.model,
      version,
      generationTaskId: input.taskId,
      metadata: {
        source: "video-generation",
        shotId: input.shotId,
        prompt: input.prompt,
        negativePrompt: input.negativePrompt,
        sourceAssetId: input.sourceAssetId,
        capability: input.capability,
        storyboardVersion: input.storyboardVersion,
        providerRequestId: input.file.video.providerRequestId,
      } as Prisma.InputJsonValue,
    },
  });
  await tx.storyboardShotAsset.create({
    data: {
      shotId: input.shotId,
      assetId: input.file.id,
      role: StoryboardShotAssetRole.FINAL,
      isPrimary: true,
      sortOrder: existingCount,
    },
  });
  await tx.generationTask.update({
    where: { id: input.taskId },
    data: { appliedAt: new Date() },
  });
}
