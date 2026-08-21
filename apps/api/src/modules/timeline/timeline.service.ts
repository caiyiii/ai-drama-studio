import { HttpStatus, Injectable } from "@nestjs/common";
import {
  Prisma,
  TimelineClipSourceType,
  TimelineClipType,
  TimelineStatus,
  TimelineTrackType,
} from "@prisma/client";
import { validateClipTiming } from "@ai-drama-studio/core";
import { AppError, ErrorCodes } from "../../common/app-error";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateTimelineClipDto, UpdateTimelineClipDto } from "./dto/clip.dto";
import { CreateTimelineTrackDto, UpdateTimelineTrackDto } from "./dto/track.dto";
import { UpdateTimelineDto } from "./dto/update-timeline.dto";
import { TimelineContinuityService } from "./timeline-continuity.service";
import { mapClip, mapTimeline, mapTrack, timelineStaleFromSources } from "./timeline.mapper";

export const TIMELINE_INCLUDE = {
  tracks: {
    orderBy: { order: "asc" as const },
    include: {
      clips: {
        orderBy: [{ startTime: "asc" as const }, { zIndex: "asc" as const }],
      },
    },
  },
};

@Injectable()
export class TimelineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly continuity: TimelineContinuityService,
  ) {}

  async get(projectId: string, episodeId: string) {
    await this.continuity.ensureEpisode(projectId, episodeId);
    const row = await this.prisma.episodeTimeline.findUnique({
      where: { episodeId },
      include: TIMELINE_INCLUDE,
    });
    if (!row || row.projectId !== projectId) {
      throw new AppError(HttpStatus.NOT_FOUND, ErrorCodes.TIMELINE_NOT_FOUND, "尚未创建时间线");
    }
    return this.withComputedStatus(row);
  }

  async update(projectId: string, episodeId: string, dto: UpdateTimelineDto) {
    const current = await this.requireRow(projectId, episodeId);
    if (current.status === TimelineStatus.LOCKED) {
      throw new AppError(
        HttpStatus.CONFLICT,
        ErrorCodes.TIMELINE_ALREADY_LOCKED,
        "时间线已锁定，请先解锁",
      );
    }
    if (dto.status === TimelineStatus.STALE) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.TIMELINE_STALE,
        "STALE 只能由版本检测计算，不能直接写入",
      );
    }
    if (dto.status === TimelineStatus.LOCKED) {
      const metadata =
        current.metadata &&
        typeof current.metadata === "object" &&
        !Array.isArray(current.metadata)
          ? (current.metadata as Record<string, unknown>)
          : {};
      const missingVisual = Array.isArray(metadata.missingVisualAsset)
        ? metadata.missingVisualAsset
        : [];
      const missingDialogue = Array.isArray(metadata.missingDialogueAudio)
        ? metadata.missingDialogueAudio
        : [];
      if (missingVisual.length > 0 || missingDialogue.length > 0) {
        throw new AppError(
          HttpStatus.BAD_REQUEST,
          ErrorCodes.TIMELINE_INCOMPLETE,
          "时间线仍有缺失素材，无法锁定。请先补齐视觉 / 对白素材后重建时间线。",
        );
      }
    }
    const row = await this.prisma.episodeTimeline.update({
      where: { id: current.id },
      data: {
        fps: dto.fps,
        resolution: dto.resolution?.trim(),
        aspectRatio: dto.aspectRatio?.trim(),
        status: dto.status,
        metadata:
          dto.metadata === undefined ? undefined : (dto.metadata as Prisma.InputJsonValue),
      },
      include: TIMELINE_INCLUDE,
    });
    return this.withComputedStatus(row);
  }

  async remove(projectId: string, episodeId: string) {
    const current = await this.requireRow(projectId, episodeId);
    if (current.status === TimelineStatus.LOCKED) {
      throw new AppError(
        HttpStatus.CONFLICT,
        ErrorCodes.TIMELINE_ALREADY_LOCKED,
        "时间线已锁定，无法删除",
      );
    }
    await this.prisma.episodeTimeline.delete({ where: { id: current.id } });
  }

  async unlock(projectId: string, episodeId: string) {
    const current = await this.requireRow(projectId, episodeId);
    const nextStatus =
      current.durationSeconds > 0 ? TimelineStatus.PREVIEW_READY : TimelineStatus.DRAFT;
    const row = await this.prisma.episodeTimeline.update({
      where: { id: current.id },
      data: { status: nextStatus },
      include: TIMELINE_INCLUDE,
    });
    return this.withComputedStatus(row);
  }

  async listTracks(projectId: string, timelineId: string) {
    await this.continuity.ensureTimeline(projectId, timelineId);
    const rows = await this.prisma.timelineTrack.findMany({
      where: { timelineId },
      orderBy: { order: "asc" },
      include: { clips: { orderBy: [{ startTime: "asc" }, { zIndex: "asc" }] } },
    });
    return rows.map(mapTrack);
  }

  async createTrack(projectId: string, timelineId: string, dto: CreateTimelineTrackDto) {
    const timeline = await this.continuity.ensureTimeline(projectId, timelineId);
    this.assertUnlocked(timeline.status);
    const row = await this.prisma.timelineTrack.create({
      data: {
        timelineId,
        type: dto.type as TimelineTrackType,
        name: dto.name.trim(),
        order: dto.order ?? 0,
        enabled: dto.enabled ?? true,
        muted: dto.muted ?? false,
        volume: dto.volume ?? 1,
        metadata: (dto.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      },
      include: { clips: true },
    });
    return mapTrack(row);
  }

  async updateTrack(
    projectId: string,
    timelineId: string,
    trackId: string,
    dto: UpdateTimelineTrackDto,
  ) {
    const track = await this.requireTrack(projectId, timelineId, trackId);
    this.assertUnlocked(track.timeline.status);
    const row = await this.prisma.timelineTrack.update({
      where: { id: track.id },
      data: {
        name: dto.name?.trim(),
        order: dto.order,
        enabled: dto.enabled,
        muted: dto.muted,
        volume: dto.volume,
        metadata: dto.metadata === undefined ? undefined : (dto.metadata as Prisma.InputJsonValue),
      },
      include: { clips: { orderBy: [{ startTime: "asc" }, { zIndex: "asc" }] } },
    });
    return mapTrack(row);
  }

  async removeTrack(projectId: string, timelineId: string, trackId: string) {
    const track = await this.requireTrack(projectId, timelineId, trackId);
    this.assertUnlocked(track.timeline.status);
    await this.prisma.timelineTrack.delete({ where: { id: track.id } });
  }

  async listClips(projectId: string, timelineId: string) {
    await this.continuity.ensureTimeline(projectId, timelineId);
    const rows = await this.prisma.timelineClip.findMany({
      where: { track: { timelineId } },
      orderBy: [{ startTime: "asc" }, { zIndex: "asc" }],
    });
    return rows.map(mapClip);
  }

  async createClip(projectId: string, timelineId: string, dto: CreateTimelineClipDto) {
    const timeline = await this.continuity.ensureTimeline(projectId, timelineId);
    this.assertUnlocked(timeline.status);
    this.assertClipTiming(dto);
    const track = await this.requireTrack(projectId, timelineId, dto.trackId);
    await this.continuity.validateClipSource({
      projectId,
      episodeId: timeline.episodeId,
      sourceType: dto.sourceType as TimelineClipSourceType,
      sourceId: dto.sourceId,
      assetId: dto.assetId,
    });
    const sourceDuration = dto.sourceDuration ?? dto.duration;
    const row = await this.prisma.timelineClip.create({
      data: {
        trackId: track.id,
        type: dto.type as TimelineClipType,
        sourceType: dto.sourceType as TimelineClipSourceType,
        sourceId: dto.sourceId,
        assetId: dto.assetId,
        startTime: dto.startTime,
        duration: dto.duration,
        sourceStartTime: dto.sourceStartTime ?? 0,
        sourceDuration,
        zIndex: dto.zIndex ?? 0,
        volume: dto.volume ?? 1,
        speed: dto.speed ?? 1,
        opacity: dto.opacity ?? 1,
        enabled: dto.enabled ?? true,
        metadata: (dto.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
    return mapClip(row);
  }

  async updateClip(
    projectId: string,
    timelineId: string,
    clipId: string,
    dto: UpdateTimelineClipDto,
  ) {
    const clip = await this.requireClip(projectId, timelineId, clipId);
    this.assertUnlocked(clip.track.timeline.status);
    this.assertClipTiming(dto);
    const row = await this.prisma.timelineClip.update({
      where: { id: clip.id },
      data: {
        startTime: dto.startTime,
        duration: dto.duration,
        sourceStartTime: dto.sourceStartTime,
        sourceDuration: dto.sourceDuration,
        zIndex: dto.zIndex,
        volume: dto.volume,
        speed: dto.speed,
        opacity: dto.opacity,
        enabled: dto.enabled,
      },
    });
    return mapClip(row);
  }

  async removeClip(projectId: string, timelineId: string, clipId: string) {
    const clip = await this.requireClip(projectId, timelineId, clipId);
    this.assertUnlocked(clip.track.timeline.status);
    await this.prisma.timelineClip.delete({ where: { id: clip.id } });
  }

  async withComputedStatus(row: Parameters<typeof mapTimeline>[0]) {
    const versions = await this.continuity.currentSourceVersions(row.episodeId);
    const fingerprint = await this.continuity.currentAssetFingerprint(
      row.projectId,
      row.episodeId,
    );
    const stale = timelineStaleFromSources({
      sourceStoryboardVersion: row.sourceStoryboardVersion,
      sourceScriptVersion: row.sourceScriptVersion,
      sourceAssetVersionSummary: row.sourceAssetVersionSummary,
      currentStoryboardVersion: versions.storyboardVersion,
      currentScriptVersion: versions.scriptVersion,
      currentAssetFingerprint: fingerprint,
    });
    return mapTimeline(row, { stale });
  }

  private async requireRow(projectId: string, episodeId: string) {
    await this.continuity.ensureEpisode(projectId, episodeId);
    const row = await this.prisma.episodeTimeline.findUnique({
      where: { episodeId },
      include: TIMELINE_INCLUDE,
    });
    if (!row || row.projectId !== projectId) {
      throw new AppError(HttpStatus.NOT_FOUND, ErrorCodes.TIMELINE_NOT_FOUND, "尚未创建时间线");
    }
    return row;
  }

  private async requireTrack(projectId: string, timelineId: string, trackId: string) {
    await this.continuity.ensureTimeline(projectId, timelineId);
    const track = await this.prisma.timelineTrack.findUnique({
      where: { id: trackId },
      include: { timeline: true },
    });
    if (!track || track.timelineId !== timelineId) {
      throw new AppError(HttpStatus.NOT_FOUND, ErrorCodes.TIMELINE_TRACK_NOT_FOUND, "轨道不存在");
    }
    if (track.timeline.projectId !== projectId) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.TIMELINE_PROJECT_MISMATCH,
        "轨道不属于当前项目",
      );
    }
    return track;
  }

  private async requireClip(projectId: string, timelineId: string, clipId: string) {
    const clip = await this.prisma.timelineClip.findUnique({
      where: { id: clipId },
      include: { track: { include: { timeline: true } } },
    });
    if (!clip || clip.track.timelineId !== timelineId) {
      throw new AppError(HttpStatus.NOT_FOUND, ErrorCodes.TIMELINE_CLIP_NOT_FOUND, "片段不存在");
    }
    if (clip.track.timeline.projectId !== projectId) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.TIMELINE_PROJECT_MISMATCH,
        "片段不属于当前项目",
      );
    }
    return clip;
  }

  private assertUnlocked(status: TimelineStatus | string) {
    if (status === TimelineStatus.LOCKED) {
      throw new AppError(
        HttpStatus.CONFLICT,
        ErrorCodes.TIMELINE_ALREADY_LOCKED,
        "时间线已锁定，无法修改",
      );
    }
  }

  private assertClipTiming(dto: {
    startTime?: number;
    duration?: number;
    sourceStartTime?: number;
    sourceDuration?: number;
    volume?: number;
    speed?: number;
    opacity?: number;
  }) {
    const errors = validateClipTiming(dto);
    if (errors.includes("TIMELINE_INVALID_TIME_RANGE")) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.TIMELINE_INVALID_TIME_RANGE,
        "时间范围无效",
      );
    }
    if (errors.includes("TIMELINE_INVALID_DURATION")) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.TIMELINE_INVALID_DURATION,
        "时长或速度无效",
      );
    }
    if (errors.includes("TIMELINE_INVALID_VOLUME")) {
      throw new AppError(HttpStatus.BAD_REQUEST, ErrorCodes.TIMELINE_INVALID_DURATION, "音量或透明度无效");
    }
  }
}
