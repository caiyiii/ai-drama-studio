import { HttpStatus, Injectable } from "@nestjs/common";
import { AssetStatus } from "@prisma/client";
import {
  COMPOSITION_PREVIEW_DISCLAIMER,
  buildTimelineManifest,
  missingFromMetadata,
  stripSecretFields,
  timelineReadyMessage,
} from "@ai-drama-studio/core";
import type { CompositionManifest, CompositionPreview } from "@ai-drama-studio/types";
import { AppError, ErrorCodes } from "../../common/app-error";
import { PrismaService } from "../../prisma/prisma.service";
import { TimelineContinuityService } from "./timeline-continuity.service";
import { TIMELINE_INCLUDE, TimelineService } from "./timeline.service";
import { mapClip, mapTrack, timelineStaleFromSources } from "./timeline.mapper";

@Injectable()
export class CompositionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly continuity: TimelineContinuityService,
    private readonly timelines: TimelineService,
  ) {}

  async compose(projectId: string, episodeId: string): Promise<CompositionManifest> {
    try {
      await this.continuity.ensureEpisode(projectId, episodeId);
      const row = await this.prisma.episodeTimeline.findUnique({
        where: { episodeId },
        include: {
          tracks: {
            orderBy: { order: "asc" },
            include: {
              clips: {
                orderBy: [{ startTime: "asc" }, { zIndex: "asc" }],
                include: { asset: true },
              },
            },
          },
        },
      });
      if (!row || row.projectId !== projectId) {
        throw new AppError(HttpStatus.NOT_FOUND, ErrorCodes.TIMELINE_NOT_FOUND, "尚未创建时间线");
      }
      const timeline = await this.timelines.withComputedStatus(row);
      const tracks = row.tracks.map((track) => {
        const mapped = mapTrack(track);
        mapped.clips = track.clips.map((clip) => ({
          ...mapClip(clip),
          asset:
            clip.asset.projectId === projectId && clip.asset.status !== AssetStatus.DELETED
              ? {
                  id: clip.asset.id,
                  type: clip.asset.type,
                  name: clip.asset.name,
                  url: clip.asset.url,
                  mimeType: clip.asset.mimeType,
                  durationSeconds: clip.asset.durationSeconds,
                }
              : null,
        }));
        return mapped;
      });
      return stripSecretFields(
        buildTimelineManifest({
          projectId,
          episodeId,
          timelineId: row.id,
          version: row.version,
          status: timeline.computedStatus ?? timeline.status,
          durationSeconds: row.durationSeconds,
          fps: row.fps,
          resolution: row.resolution,
          aspectRatio: row.aspectRatio,
          tracks,
        }),
      );
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        ErrorCodes.COMPOSITION_BUILD_FAILED,
        "合成清单构建失败",
      );
    }
  }

  async preview(projectId: string, episodeId: string): Promise<CompositionPreview> {
    const timelineRow = await this.prisma.episodeTimeline.findUnique({
      where: { episodeId },
      include: TIMELINE_INCLUDE,
    });
    if (!timelineRow || timelineRow.projectId !== projectId) {
      throw new AppError(HttpStatus.NOT_FOUND, ErrorCodes.TIMELINE_NOT_FOUND, "尚未创建时间线");
    }
    const versions = await this.continuity.currentSourceVersions(episodeId);
    const fingerprint = await this.continuity.currentAssetFingerprint(projectId, episodeId);
    const stale = timelineStaleFromSources({
      sourceStoryboardVersion: timelineRow.sourceStoryboardVersion,
      sourceScriptVersion: timelineRow.sourceScriptVersion,
      sourceAssetVersionSummary: timelineRow.sourceAssetVersionSummary,
      currentStoryboardVersion: versions.storyboardVersion,
      currentScriptVersion: versions.scriptVersion,
      currentAssetFingerprint: fingerprint,
    });
    const missing = missingFromMetadata(
      timelineRow.metadata && typeof timelineRow.metadata === "object" && !Array.isArray(timelineRow.metadata)
        ? (timelineRow.metadata as Record<string, unknown>)
        : null,
    );
    const ready = timelineReadyMessage(missing);
    const manifest = await this.compose(projectId, episodeId);
    return stripSecretFields({
      disclaimer: COMPOSITION_PREVIEW_DISCLAIMER,
      ready: ready.ready && !stale,
      readyMessage: stale ? "时间线已过期，建议重新构建。" : ready.message,
      missing,
      stale,
      manifest,
    });
  }
}
