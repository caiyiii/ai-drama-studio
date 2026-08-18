import { randomUUID } from "node:crypto";
import { HttpStatus } from "@nestjs/common";
import {
  AssetStatus,
  AssetType,
  Prisma,
  ScriptBlockAssetRole,
} from "@prisma/client";
import type { GeneratedAudio } from "@ai-drama-studio/types";
import { AppError, ErrorCodes } from "../../../common/app-error";
import type { AssetStorageService } from "../../assets/asset-storage.service";

type Tx = Prisma.TransactionClient;

export async function persistPreviewAudio(
  storage: AssetStorageService,
  projectId: string,
  audio: GeneratedAudio,
): Promise<{
  id: string;
  saved: Awaited<ReturnType<AssetStorageService["saveFromBase64"]>>;
  audio: GeneratedAudio;
}> {
  const id = randomUUID();
  try {
    const file = audio.base64
      ? await storage.saveFromBase64({
          projectId,
          assetId: id,
          base64: audio.base64,
          mimeType: audio.mimeType || "audio/mpeg",
        })
      : audio.url
        ? await storage.saveFromUrl({
            projectId,
            assetId: id,
            url: audio.url,
            mimeType: audio.mimeType || "audio/mpeg",
          })
        : null;
    if (!file) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.TTS_DOWNLOAD_FAILED,
        "语音结果缺少可保存的内容",
      );
    }
    return { id, saved: file, audio };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(
      HttpStatus.BAD_REQUEST,
      ErrorCodes.TTS_DOWNLOAD_FAILED,
      "下载或保存语音失败",
    );
  }
}

export async function applyTtsGeneration(
  tx: Tx,
  input: {
    projectId: string;
    scriptBlockId: string;
    taskId: string;
    provider: string | null;
    model: string | null;
    capability: string | null;
    text: string;
    characterId?: string;
    voiceId?: string;
    language?: string;
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
  const existingCount = await tx.scriptBlockAsset.count({
    where: { scriptBlockId: input.scriptBlockId, asset: { type: AssetType.AUDIO } },
  });
  await tx.scriptBlockAsset.updateMany({
    where: {
      scriptBlockId: input.scriptBlockId,
      isPrimary: true,
      asset: { type: AssetType.AUDIO },
    },
    data: { isPrimary: false },
  });
  const version = existingCount + 1;
  await tx.asset.create({
    data: {
      id: input.file.id,
      projectId: input.projectId,
      type: AssetType.AUDIO,
      status: AssetStatus.READY,
      name: `Dialogue audio v${version}`,
      mimeType: input.file.saved.mimeType,
      storageKey: input.file.saved.storageKey,
      url: input.file.saved.url,
      durationSeconds: input.file.audio.durationSeconds ?? null,
      sizeBytes: input.file.saved.sizeBytes,
      provider: input.provider,
      model: input.model,
      version,
      generationTaskId: input.taskId,
      metadata: {
        source: "tts",
        scriptBlockId: input.scriptBlockId,
        characterId: input.characterId,
        voiceId: input.voiceId,
        language: input.language,
        format: input.file.audio.format,
        generationTaskId: input.taskId,
        providerRequestId: input.file.audio.providerRequestId,
      } as Prisma.InputJsonValue,
    },
  });
  await tx.scriptBlockAsset.create({
    data: {
      scriptBlockId: input.scriptBlockId,
      assetId: input.file.id,
      role: ScriptBlockAssetRole.FINAL,
      isPrimary: true,
      sortOrder: existingCount,
    },
  });
  await tx.generationTask.update({
    where: { id: input.taskId },
    data: { appliedAt: new Date() },
  });
}
