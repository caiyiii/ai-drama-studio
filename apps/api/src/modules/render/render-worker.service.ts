import fs from "node:fs/promises";
import path from "node:path";
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { AssetStatus } from "@prisma/client";
import {
  assertRenderReady,
  resolveRenderAudioClips,
  resolveRenderLayers,
  sanitizeRenderDiagnostic,
  stripSecretFields,
  validateRenderManifest,
  type RenderLayerClip,
} from "@ai-drama-studio/core";
import {
  RenderJobEventType,
  RenderJobStage,
  RenderJobStatus,
  type RenderManifestSnapshot,
} from "@ai-drama-studio/types";
import { ErrorCodes } from "../../common/app-error";
import { PrismaService } from "../../prisma/prisma.service";
import { AssetStorageService } from "../assets/asset-storage.service";
import { cleanupRenderWorkspace, createRenderWorkspace } from "./render-workspace";
import { LocalFfmpegRenderEngine } from "./local-ffmpeg-render.engine";
import { RenderProgressService } from "./render-progress.service";
import { renderArtifactStorageKey } from "@ai-drama-studio/core";

const EXT: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "audio/mpeg": ".mp3",
  "audio/wav": ".wav",
  "audio/x-wav": ".wav",
  "audio/aac": ".aac",
  "audio/ogg": ".ogg",
};

@Injectable()
export class RenderWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RenderWorkerService.name);
  private timer: ReturnType<typeof setInterval> | null = null;
  private busy = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: AssetStorageService,
    private readonly engine: LocalFfmpegRenderEngine,
    private readonly progress: RenderProgressService,
  ) {}

  onModuleInit() {
    if (process.env.VITEST || process.env.RENDER_WORKER_DISABLED === "true") {
      return;
    }
    this.timer = setInterval(() => {
      void this.tick();
    }, 1500);
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async tick(): Promise<void> {
    if (this.busy) {
      return;
    }
    this.busy = true;
    try {
      const next = await this.prisma.renderJob.findFirst({
        where: { status: RenderJobStatus.QUEUED },
        orderBy: { createdAt: "asc" },
      });
      if (next) {
        await this.processJob(next.id);
      }
    } catch (error) {
      this.logger.warn(error instanceof Error ? error.message : String(error));
    } finally {
      this.busy = false;
    }
  }

  async processJob(renderJobId: string): Promise<void> {
    const claimed = await this.prisma.renderJob.updateMany({
      where: { id: renderJobId, status: RenderJobStatus.QUEUED },
      data: {
        status: RenderJobStatus.PREPARING,
        currentStage: RenderJobStage.PREPARING,
        progress: 5,
        startedAt: new Date(),
      },
    });
    if (claimed.count !== 1) {
      return;
    }
    await this.addEvent(renderJobId, RenderJobEventType.PREPARING, "Preparing render inputs", 5);

    const job = await this.prisma.renderJob.findUnique({ where: { id: renderJobId } });
    if (!job) {
      return;
    }
    if (await this.cancelled(renderJobId)) {
      await this.markCancelled(renderJobId);
      return;
    }

    const snapshot = stripSecretFields(job.manifestSnapshot) as unknown as RenderManifestSnapshot;
    const valid = validateRenderManifest(snapshot);
    if (!valid.ok) {
      await this.fail(renderJobId, ErrorCodes.RENDER_MANIFEST_INVALID, valid.message || "Manifest 无效");
      return;
    }
    const ready = assertRenderReady(snapshot.missing);
    if (!ready.ok) {
      await this.fail(
        renderJobId,
        ErrorCodes.RENDER_MISSING_REQUIRED_ASSET,
        ready.message || "缺少必要素材",
      );
      return;
    }

    const workspace = await createRenderWorkspace(renderJobId);
    try {
      const visualLayers = resolveRenderLayers(snapshot);
      const audioLayers = resolveRenderAudioClips(snapshot);
      const visual = await this.materialize(job.projectId, snapshot, visualLayers, workspace.inputs);
      const audio = await this.materialize(job.projectId, snapshot, audioLayers, workspace.inputs);
      await fs.writeFile(
        path.join(workspace.work, "inputs.json"),
        JSON.stringify(
          {
            renderJobId,
            timelineVersion: job.timelineVersion,
            durationSeconds: snapshot.durationSeconds,
            fps: snapshot.fps,
            resolution: snapshot.resolution,
            clips: [...visual, ...audio].map((clip) => ({
              clipId: clip.id,
              assetId: clip.assetId,
              startTime: clip.startTime,
              duration: clip.duration,
              volume: clip.playbackVolume,
              track: clip.trackType,
              file: path.basename(clip.path),
            })),
          },
          null,
          2,
        ),
        "utf8",
      );

      if (await this.cancelled(renderJobId)) {
        await this.engine.cancel(renderJobId);
        await this.markCancelled(renderJobId);
        return;
      }

      await this.prisma.renderJob.update({
        where: { id: renderJobId },
        data: {
          status: RenderJobStatus.RENDERING,
          currentStage: audio.length ? RenderJobStage.MIXING_AUDIO : RenderJobStage.ENCODING_VIDEO,
        },
      });
      await this.addEvent(renderJobId, RenderJobEventType.FFMPEG_STARTED, "FFmpeg started", 5);

      const result = await this.engine.render({
        renderId: renderJobId,
        manifest: snapshot,
        visual,
        audio,
        outputPath: workspace.outputFile,
        onProgress: (ratio) => {
          void this.updateProgress(renderJobId, ratio);
        },
      });

      if (await this.cancelled(renderJobId) || result.error?.code === ErrorCodes.FFMPEG_CANCELLED) {
        await this.markCancelled(renderJobId);
        return;
      }
      if (!result.success || !result.outputPath) {
        await this.fail(
          renderJobId,
          result.error?.code || ErrorCodes.FFMPEG_EXECUTION_FAILED,
          result.error?.message || "FFmpeg 执行失败",
        );
        return;
      }

      await this.prisma.renderJob.update({
        where: { id: renderJobId },
        data: { currentStage: RenderJobStage.FINALIZING, progress: 95 },
      });
      await this.addEvent(renderJobId, RenderJobEventType.FFMPEG_COMPLETED, "FFmpeg completed", 95);

      const storageKey = renderArtifactStorageKey({
        projectId: job.projectId,
        episodeId: job.episodeId,
        renderJobId,
      });
      const saved = await this.storage.saveFromFile({
        storageKey,
        sourcePath: result.outputPath,
        mimeType: "video/mp4",
      });
      if (!(saved.sizeBytes > 0)) {
        await this.fail(renderJobId, ErrorCodes.RENDER_OUTPUT_INVALID, "输出文件为空");
        return;
      }

      await this.prisma.$transaction(async (tx) => {
        const artifact = await tx.renderArtifact.create({
          data: {
            projectId: job.projectId,
            episodeId: job.episodeId,
            renderJobId,
            type: "EPISODE_VIDEO",
            storageKey: saved.storageKey,
            mimeType: "video/mp4",
            fileSize: saved.sizeBytes,
            durationSeconds: result.durationSeconds ?? job.durationSeconds,
            width: result.width ?? job.width,
            height: result.height ?? job.height,
            fps: result.fps ?? job.fps,
          },
        });
        await tx.renderJob.update({
          where: { id: renderJobId },
          data: {
            status: RenderJobStatus.SUCCEEDED,
            currentStage: RenderJobStage.COMPLETED,
            progress: 100,
            completedAt: new Date(),
            outputArtifactId: artifact.id,
          },
        });
        await tx.renderJobEvent.create({
          data: {
            renderJobId,
            type: RenderJobEventType.ARTIFACT_CREATED,
            message: "Episode MP4 artifact created",
            progress: 100,
          },
        });
        await tx.renderJobEvent.create({
          data: {
            renderJobId,
            type: RenderJobEventType.SUCCEEDED,
            message: "Render succeeded",
            progress: 100,
          },
        });
      });
    } catch (error) {
      const code =
        error instanceof Error && error.message in ErrorCodes
          ? error.message
          : ErrorCodes.FFMPEG_EXECUTION_FAILED;
      await this.fail(
        renderJobId,
        code,
        error instanceof Error ? error.message : "Render worker failed",
      );
    } finally {
      await cleanupRenderWorkspace(workspace.root);
    }
  }

  private async materialize(
    projectId: string,
    snapshot: RenderManifestSnapshot,
    layers: RenderLayerClip[],
    inputDir: string,
  ): Promise<Array<RenderLayerClip & { path: string }>> {
    const result: Array<RenderLayerClip & { path: string }> = [];
    for (const layer of layers) {
      const snap = snapshot.assets.find((item) => item.id === layer.assetId);
      const asset = await this.prisma.asset.findUnique({ where: { id: layer.assetId } });
      if (!asset || asset.status === AssetStatus.DELETED) {
        throw new Error(ErrorCodes.RENDER_ASSET_NOT_FOUND);
      }
      if (asset.projectId !== projectId) {
        throw new Error(ErrorCodes.RENDER_ASSET_PROJECT_MISMATCH);
      }
      const storageKey = snap?.storageKey || asset.storageKey;
      if (!storageKey) {
        throw new Error(ErrorCodes.RENDER_ASSET_NOT_FOUND);
      }
      const source = this.storage.resolvePath(storageKey);
      const ext =
        EXT[asset.mimeType || ""] ||
        (layer.type === "IMAGE" ? ".png" : layer.type === "VIDEO" ? ".mp4" : ".wav");
      const dest = path.join(inputDir, `${layer.id}${ext}`);
      await fs.copyFile(source, dest);
      result.push({ ...layer, path: dest });
    }
    return result;
  }

  private async updateProgress(renderJobId: string, ratio: number | null) {
    const job = await this.prisma.renderJob.findUnique({ where: { id: renderJobId } });
    if (!job || job.status !== RenderJobStatus.RENDERING) {
      return;
    }
    const next = this.progress.next({
      status: RenderJobStatus.RENDERING,
      stage: job.currentStage as unknown as RenderJobStage,
      ffmpegRatio: ratio,
      previous: job.progress,
    });
    if (next == null || next === job.progress) {
      return;
    }
    await this.prisma.renderJob.update({
      where: { id: renderJobId },
      data: { progress: next },
    });
  }

  private async cancelled(renderJobId: string): Promise<boolean> {
    const row = await this.prisma.renderJob.findUnique({ where: { id: renderJobId } });
    return row?.status === RenderJobStatus.CANCEL_REQUESTED;
  }

  private async markCancelled(renderJobId: string) {
    await this.engine.cancel(renderJobId);
    await this.prisma.renderJob.updateMany({
      where: {
        id: renderJobId,
        status: { in: [RenderJobStatus.PREPARING, RenderJobStatus.RENDERING, RenderJobStatus.CANCEL_REQUESTED] },
      },
      data: {
        status: RenderJobStatus.CANCELLED,
        currentStage: RenderJobStage.COMPLETED,
        cancelledAt: new Date(),
      },
    });
    await this.addEvent(renderJobId, RenderJobEventType.CANCELLED, "Render cancelled");
  }

  private async fail(renderJobId: string, errorCode: string, errorMessage: string) {
    const row = await this.prisma.renderJob.findUnique({ where: { id: renderJobId } });
    if (row?.status === RenderJobStatus.CANCEL_REQUESTED) {
      await this.markCancelled(renderJobId);
      return;
    }
    const from = row?.status as unknown as RenderJobStatus | undefined;
    if (
      from &&
      from !== RenderJobStatus.PREPARING &&
      from !== RenderJobStatus.RENDERING &&
      from !== RenderJobStatus.QUEUED
    ) {
      return;
    }
    await this.prisma.renderJob.update({
      where: { id: renderJobId },
      data: {
        status: RenderJobStatus.FAILED,
        failedAt: new Date(),
        errorCode,
        errorMessage: sanitizeRenderDiagnostic(errorMessage, 2000),
      },
    });
    await this.addEvent(renderJobId, RenderJobEventType.FAILED, errorMessage);
  }

  private addEvent(
    renderJobId: string,
    type: RenderJobEventType,
    message?: string,
    progress?: number,
  ) {
    return this.prisma.renderJobEvent.create({
      data: {
        renderJobId,
        type,
        message: message ? sanitizeRenderDiagnostic(message, 500) : undefined,
        progress,
      },
    });
  }
}
