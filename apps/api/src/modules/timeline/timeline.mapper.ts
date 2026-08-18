import {
  TimelineClipSourceType,
  TimelineClipType,
  TimelineStatus,
  TimelineTrackType,
  type EpisodeTimeline,
  type TimelineClip,
  type TimelineTrack,
} from "@ai-drama-studio/types";
import type { Prisma } from "@prisma/client";
import { detectTimelineStale, missingFromMetadata } from "@ai-drama-studio/core";

function asRecord(value: Prisma.JsonValue | null | undefined): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

export function mapClip(row: {
  id: string;
  trackId: string;
  type: string;
  sourceType: string;
  sourceId: string;
  assetId: string;
  startTime: number;
  duration: number;
  sourceStartTime: number;
  sourceDuration: number;
  zIndex: number;
  volume: number;
  speed: number;
  opacity: number;
  enabled: boolean;
  metadata: Prisma.JsonValue | null;
  createdAt: Date;
  updatedAt: Date;
}): TimelineClip {
  return {
    id: row.id,
    trackId: row.trackId,
    type: row.type as TimelineClipType,
    sourceType: row.sourceType as TimelineClipSourceType,
    sourceId: row.sourceId,
    assetId: row.assetId,
    startTime: row.startTime,
    duration: row.duration,
    sourceStartTime: row.sourceStartTime,
    sourceDuration: row.sourceDuration,
    zIndex: row.zIndex,
    volume: row.volume,
    speed: row.speed,
    opacity: row.opacity,
    enabled: row.enabled,
    metadata: asRecord(row.metadata),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function mapTrack(row: {
  id: string;
  timelineId: string;
  type: string;
  name: string;
  order: number;
  enabled: boolean;
  muted: boolean;
  volume: number;
  metadata: Prisma.JsonValue | null;
  createdAt: Date;
  updatedAt: Date;
  clips?: Parameters<typeof mapClip>[0][];
}): TimelineTrack {
  return {
    id: row.id,
    timelineId: row.timelineId,
    type: row.type as TimelineTrackType,
    name: row.name,
    order: row.order,
    enabled: row.enabled,
    muted: row.muted,
    volume: row.volume,
    metadata: asRecord(row.metadata),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    clips: row.clips ? row.clips.map(mapClip) : undefined,
  };
}

export function mapTimeline(
  row: {
    id: string;
    projectId: string;
    episodeId: string;
    version: number;
    status: string;
    durationSeconds: number;
    fps: number;
    resolution: string;
    aspectRatio: string;
    sourceStoryboardVersion: number | null;
    sourceScriptVersion: number | null;
    sourceAssetVersionSummary: Prisma.JsonValue | null;
    metadata: Prisma.JsonValue | null;
    createdAt: Date;
    updatedAt: Date;
    tracks?: Parameters<typeof mapTrack>[0][];
  },
  computed?: { stale?: boolean },
): EpisodeTimeline {
  const stale = Boolean(computed?.stale);
  const status = row.status as TimelineStatus;
  return {
    id: row.id,
    projectId: row.projectId,
    episodeId: row.episodeId,
    version: row.version,
    status,
    computedStatus: status === TimelineStatus.LOCKED ? TimelineStatus.LOCKED : stale ? TimelineStatus.STALE : status,
    stale,
    durationSeconds: row.durationSeconds,
    fps: row.fps,
    resolution: row.resolution,
    aspectRatio: row.aspectRatio,
    sourceStoryboardVersion: row.sourceStoryboardVersion,
    sourceScriptVersion: row.sourceScriptVersion,
    sourceAssetVersionSummary: asRecord(row.sourceAssetVersionSummary),
    metadata: asRecord(row.metadata),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    tracks: row.tracks ? row.tracks.map(mapTrack) : undefined,
  };
}

export function timelineStaleFromSources(input: {
  sourceStoryboardVersion: number | null;
  sourceScriptVersion: number | null;
  sourceAssetVersionSummary: Prisma.JsonValue | null;
  currentStoryboardVersion?: number | null;
  currentScriptVersion?: number | null;
  currentAssetFingerprint?: string | null;
}): boolean {
  const summary = asRecord(input.sourceAssetVersionSummary);
  const sourceFingerprint =
    typeof summary?.fingerprint === "string" ? summary.fingerprint : null;
  return detectTimelineStale({
    sourceStoryboardVersion: input.sourceStoryboardVersion,
    sourceScriptVersion: input.sourceScriptVersion,
    currentStoryboardVersion: input.currentStoryboardVersion,
    currentScriptVersion: input.currentScriptVersion,
    sourceAssetFingerprint: sourceFingerprint,
    currentAssetFingerprint: input.currentAssetFingerprint,
  });
}

export function timelineMissing(metadata: Prisma.JsonValue | null | undefined) {
  return missingFromMetadata(asRecord(metadata));
}

export { asRecord };
