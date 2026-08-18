import { randomUUID } from "node:crypto";
import { HttpStatus } from "@nestjs/common";
import {
  AssetStatus,
  AssetType,
  AudioAssetRole,
  Prisma,
} from "@prisma/client";
import type { GeneratedAudio } from "@ai-drama-studio/types";
import { AppError, ErrorCodes } from "../../../common/app-error";
import type { AssetStorageService } from "../../assets/asset-storage.service";

type Tx = Prisma.TransactionClient;

export type EpisodeAudioKind = "MUSIC" | "SFX";

export async function persistEpisodePreviewAudio(
  storage: AssetStorageService,
  projectId: string,
  audio: GeneratedAudio,
  options: { fileStem: "music" | "sfx"; assetId?: string },
): Promise<{
  id: string;
  saved: Awaited<ReturnType<AssetStorageService["saveFromBase64"]>>;
  audio: GeneratedAudio;
}> {
  const id = options.assetId || randomUUID();
  try {
    const file = audio.base64
      ? await storage.saveFromBase64({
          projectId,
          assetId: id,
          base64: audio.base64,
          mimeType: audio.mimeType || "audio/mpeg",
          fileStem: options.fileStem,
        })
      : audio.url
        ? await storage.saveFromUrl({
            projectId,
            assetId: id,
            url: audio.url,
            mimeType: audio.mimeType || "audio/mpeg",
            fileStem: options.fileStem,
          })
        : null;
    if (!file) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.AUDIO_DOWNLOAD_FAILED,
        "音频结果缺少可保存的内容",
      );
    }
    return { id, saved: file, audio };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(
      HttpStatus.BAD_REQUEST,
      ErrorCodes.AUDIO_DOWNLOAD_FAILED,
      "下载或保存音频失败",
    );
  }
}

export async function persistEpisodeApplyAudio(
  storage: AssetStorageService,
  projectId: string,
  input: {
    fileStem: "music" | "sfx";
    previewStorageKey?: string;
    audio: GeneratedAudio;
  },
): Promise<{
  id: string;
  saved: Awaited<ReturnType<AssetStorageService["saveFromBase64"]>>;
  audio: GeneratedAudio;
}> {
  const id = randomUUID();
  try {
    const file = input.previewStorageKey
      ? await storage.copy({
          sourceStorageKey: input.previewStorageKey,
          projectId,
          assetId: id,
          mimeType: input.audio.mimeType || "audio/mpeg",
          fileStem: input.fileStem,
        })
      : input.audio.base64
        ? await storage.saveFromBase64({
            projectId,
            assetId: id,
            base64: input.audio.base64,
            mimeType: input.audio.mimeType || "audio/mpeg",
            fileStem: input.fileStem,
          })
        : input.audio.url
          ? await storage.saveFromUrl({
              projectId,
              assetId: id,
              url: input.audio.url,
              mimeType: input.audio.mimeType || "audio/mpeg",
              fileStem: input.fileStem,
            })
          : null;
    if (!file) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.AUDIO_DOWNLOAD_FAILED,
        "音频结果缺少可保存的内容",
      );
    }
    return { id, saved: file, audio: input.audio };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(
      HttpStatus.BAD_REQUEST,
      ErrorCodes.AUDIO_DOWNLOAD_FAILED,
      "下载或保存音频失败",
    );
  }
}

export async function applyEpisodeAudioGeneration(
  tx: Tx,
  input: {
    projectId: string;
    episodeId: string;
    taskId: string;
    kind: EpisodeAudioKind;
    provider: string | null;
    model: string | null;
    name: string;
    metadata: Record<string, unknown>;
    file: {
      id: string;
      saved: {
        storageKey: string;
        url: string;
        mimeType: string;
        sizeBytes: number;
      };
      audio: GeneratedAudio;
    };
  },
) {
  const role =
    input.kind === "MUSIC" ? AudioAssetRole.MUSIC : AudioAssetRole.SFX;
  const existingCount = await tx.episodeAudioAsset.count({
    where: { episodeId: input.episodeId, role },
  });
  await tx.episodeAudioAsset.updateMany({
    where: {
      episodeId: input.episodeId,
      role,
      isPrimary: true,
    },
    data: { isPrimary: false },
  });
  const version = existingCount + 1;
  const name =
    input.name.trim() ||
    `${input.kind === "MUSIC" ? "Music" : "SFX"} v${version}`;
  await tx.asset.create({
    data: {
      id: input.file.id,
      projectId: input.projectId,
      type: AssetType.AUDIO,
      status: AssetStatus.READY,
      name,
      mimeType: input.file.saved.mimeType,
      storageKey: input.file.saved.storageKey,
      url: input.file.saved.url,
      durationSeconds: input.file.audio.durationSeconds ?? null,
      sizeBytes: input.file.saved.sizeBytes,
      provider: input.provider,
      model: input.model,
      version,
      generationTaskId: input.taskId,
      metadata: input.metadata as Prisma.InputJsonValue,
    },
  });
  await tx.episodeAudioAsset.create({
    data: {
      episodeId: input.episodeId,
      assetId: input.file.id,
      role,
      isPrimary: true,
      sortOrder: existingCount,
      metadata: input.metadata as Prisma.InputJsonValue,
    },
  });
  await tx.generationTask.update({
    where: { id: input.taskId },
    data: { appliedAt: new Date() },
  });
}
