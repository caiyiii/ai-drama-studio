import { HttpStatus, Injectable } from "@nestjs/common";
import { Prisma, TimelineStatus } from "@prisma/client";
import {
  RENDER_ACTIVE_STATUSES,
  assertRenderReady,
  parseResolution,
  sanitizeRenderDiagnostic,
  stripSecretFields,
  validateRenderJobTransition,
} from "@ai-drama-studio/core";
import {
  RenderJobEventType,
  RenderJobStage,
  RenderJobStatus,
  type RenderManifestSnapshot,
} from "@ai-drama-studio/types";
import { AppError, ErrorCodes } from "../../common/app-error";
import { PrismaService } from "../../prisma/prisma.service";
import { TimelineContinuityService } from "../timeline/timeline-continuity.service";
import { TimelineService } from "../timeline/timeline.service";
import { RenderManifestService } from "./render-manifest.service";
import { mapRenderArtifact, mapRenderJob } from "./render.mapper";
import { FFmpegService } from "./ffmpeg.service";

const JOB_INCLUDE = {
  artifacts: { orderBy: { createdAt: "desc" as const } },
};

@Injectable()
export class RenderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly continuity: TimelineContinuityService,
    private readonly timelines: TimelineService,
    private readonly manifests: RenderManifestService,
    private readonly ffmpeg: FFmpegService,
  ) {}

  async create(projectId: string, episodeId: string) {
    await this.continuity.ensureEpisode(projectId, episodeId);
    const timeline = await this.prisma.episodeTimeline.findUnique({
      where: { episodeId },
    });
    if (!timeline || timeline.projectId !== projectId) {
      throw new AppError(HttpStatus.NOT_FOUND, ErrorCodes.RENDER_TIMELINE_NOT_FOUND, "尚未创建时间线");
    }
    const computed = await this.timelines.withComputedStatus(timeline);
    if (computed.stale || computed.computedStatus === TimelineStatus.STALE) {
      throw new AppError(
        HttpStatus.CONFLICT,
        ErrorCodes.RENDER_TIMELINE_STALE,
        "时间线已过期，请先重新构建后再锁定并渲染",
      );
    }
    if (timeline.status !== TimelineStatus.LOCKED) {
      throw new AppError(
        HttpStatus.CONFLICT,
        ErrorCodes.RENDER_TIMELINE_NOT_LOCKED,
        "请先锁定时间线后再渲染",
      );
    }

    const existing = await this.prisma.renderJob.findFirst({
      where: {
        projectId,
        episodeId,
        timelineId: timeline.id,
        timelineVersion: timeline.version,
        status: { in: RENDER_ACTIVE_STATUSES },
      },
      include: JOB_INCLUDE,
      orderBy: { createdAt: "desc" },
    });
    if (existing) {
      return mapRenderJob(existing);
    }

    const snapshot = await this.manifests.createSnapshot(projectId, episodeId);
    const ready = assertRenderReady(snapshot.missing);
    if (!ready.ok) {
      throw new AppError(
        HttpStatus.CONFLICT,
        ErrorCodes.RENDER_MISSING_REQUIRED_ASSET,
        ready.message || "缺少必要素材，无法正式 Render",
      );
    }
    const { width, height } = parseResolution(snapshot.resolution);

    const job = await this.prisma.$transaction(async (tx) => {
      const created = await tx.renderJob.create({
        data: {
          projectId,
          episodeId,
          timelineId: timeline.id,
          timelineVersion: timeline.version,
          status: RenderJobStatus.QUEUED,
          currentStage: RenderJobStage.QUEUED,
          progress: 0,
          manifestSnapshot: snapshot as unknown as Prisma.InputJsonValue,
          outputFormat: "h264_aac",
          outputContainer: "mp4",
          width,
          height,
          fps: snapshot.fps,
          durationSeconds: snapshot.durationSeconds,
          attempt: 1,
          maxAttempts: 3,
        },
        include: JOB_INCLUDE,
      });
      await tx.renderJobEvent.create({
        data: {
          renderJobId: created.id,
          type: RenderJobEventType.QUEUED,
          message: "Render job queued",
          progress: 0,
        },
      });
      return created;
    });
    return mapRenderJob(job);
  }

  async list(projectId: string, episodeId?: string) {
    await this.ensureProject(projectId);
    const rows = await this.prisma.renderJob.findMany({
      where: { projectId, ...(episodeId ? { episodeId } : {}) },
      include: JOB_INCLUDE,
      orderBy: { createdAt: "desc" },
    });
    return rows.map((row) => mapRenderJob(row));
  }

  async get(projectId: string, renderJobId: string) {
    const row = await this.requireJob(projectId, renderJobId);
    return mapRenderJob(row);
  }

  async getArtifact(projectId: string, renderJobId: string) {
    const row = await this.requireJob(projectId, renderJobId);
    const artifact = row.artifacts[0];
    if (!artifact) {
      throw new AppError(HttpStatus.NOT_FOUND, ErrorCodes.RENDER_ARTIFACT_NOT_FOUND, "尚未生成成片");
    }
    return mapRenderArtifact(artifact);
  }

  async cancel(projectId: string, renderJobId: string) {
    const row = await this.requireJob(projectId, renderJobId);
    if (row.status === RenderJobStatus.QUEUED) {
      const updated = await this.transition(
        row.id,
        row.status as unknown as RenderJobStatus,
        RenderJobStatus.CANCELLED,
        {
          currentStage: RenderJobStage.COMPLETED,
          cancelledAt: new Date(),
          progress: row.progress,
        },
      );
      await this.addEvent(row.id, RenderJobEventType.CANCELLED, "Queued render cancelled");
      return mapRenderJob(updated);
    }
    if (
      row.status === RenderJobStatus.PREPARING ||
      row.status === RenderJobStatus.RENDERING
    ) {
      if (!validateRenderJobTransition(row.status as unknown as RenderJobStatus, RenderJobStatus.CANCEL_REQUESTED)) {
        throw new AppError(
          HttpStatus.CONFLICT,
          ErrorCodes.RENDER_CANCEL_NOT_ALLOWED,
          "当前状态不允许取消",
        );
      }
      const updated = await this.prisma.renderJob.update({
        where: { id: row.id },
        data: { status: RenderJobStatus.CANCEL_REQUESTED },
        include: JOB_INCLUDE,
      });
      await this.addEvent(row.id, RenderJobEventType.CANCEL_REQUESTED, "Cancel requested");
      await this.ffmpeg.cancel(row.id);
      return mapRenderJob(updated);
    }
    throw new AppError(
      HttpStatus.CONFLICT,
      ErrorCodes.RENDER_CANCEL_NOT_ALLOWED,
      "当前状态不允许取消",
    );
  }

  async retry(projectId: string, renderJobId: string) {
    const row = await this.requireJob(projectId, renderJobId);
    if (row.status !== RenderJobStatus.FAILED) {
      throw new AppError(
        HttpStatus.CONFLICT,
        ErrorCodes.RENDER_RETRY_NOT_ALLOWED,
        "只能重试失败的 Render Job",
      );
    }
    const snapshot = stripSecretFields(row.manifestSnapshot) as unknown as RenderManifestSnapshot;
    const created = await this.prisma.$transaction(async (tx) => {
      const next = await tx.renderJob.create({
        data: {
          projectId: row.projectId,
          episodeId: row.episodeId,
          timelineId: row.timelineId,
          timelineVersion: row.timelineVersion,
          status: RenderJobStatus.QUEUED,
          currentStage: RenderJobStage.QUEUED,
          progress: 0,
          manifestSnapshot: snapshot as unknown as Prisma.InputJsonValue,
          outputFormat: row.outputFormat,
          outputContainer: row.outputContainer,
          width: row.width,
          height: row.height,
          fps: row.fps,
          durationSeconds: row.durationSeconds,
          attempt: row.attempt + 1,
          maxAttempts: row.maxAttempts,
        },
        include: JOB_INCLUDE,
      });
      await tx.renderJobEvent.create({
        data: {
          renderJobId: next.id,
          type: RenderJobEventType.QUEUED,
          message: `Retry of ${row.id}`,
          progress: 0,
          metadata: { retryOf: row.id },
        },
      });
      return next;
    });
    return mapRenderJob(created);
  }

  async requireJob(projectId: string, renderJobId: string) {
    await this.ensureProject(projectId);
    const row = await this.prisma.renderJob.findUnique({
      where: { id: renderJobId },
      include: JOB_INCLUDE,
    });
    if (!row) {
      throw new AppError(HttpStatus.NOT_FOUND, ErrorCodes.RENDER_JOB_NOT_FOUND, "Render Job 不存在");
    }
    if (row.projectId !== projectId) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.RENDER_PROJECT_MISMATCH,
        "Render Job 不属于当前项目",
      );
    }
    return row;
  }

  private async ensureProject(projectId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      throw new AppError(HttpStatus.NOT_FOUND, ErrorCodes.PROJECT_NOT_FOUND, "项目不存在");
    }
  }

  private async transition(
    id: string,
    from: RenderJobStatus,
    to: RenderJobStatus,
    extra: {
      currentStage?: RenderJobStage;
      cancelledAt?: Date;
      failedAt?: Date;
      completedAt?: Date;
      progress?: number | null;
    } = {},
  ) {
    if (!validateRenderJobTransition(from, to)) {
      throw new AppError(
        HttpStatus.CONFLICT,
        ErrorCodes.RENDER_JOB_INVALID_STATE,
        "非法 Render 状态转换",
      );
    }
    const updated = await this.prisma.renderJob.updateMany({
      where: { id, status: from },
      data: { status: to, ...extra },
    });
    if (updated.count !== 1) {
      throw new AppError(
        HttpStatus.CONFLICT,
        ErrorCodes.RENDER_JOB_INVALID_STATE,
        "Render 状态已被其他操作更新",
      );
    }
    const row = await this.prisma.renderJob.findUniqueOrThrow({
      where: { id },
      include: JOB_INCLUDE,
    });
    return row;
  }

  private addEvent(
    renderJobId: string,
    type: RenderJobEventType,
    message?: string,
    progress?: number | null,
    metadata?: Record<string, unknown>,
  ) {
    return this.prisma.renderJobEvent.create({
      data: {
        renderJobId,
        type,
        message: message ? sanitizeRenderDiagnostic(message, 500) : undefined,
        progress: progress ?? undefined,
        metadata: metadata ? (stripSecretFields(metadata) as Prisma.InputJsonValue) : undefined,
      },
    });
  }
}
