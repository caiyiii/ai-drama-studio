import {
  AssetType,
  TimelineClipType,
  TimelineStatus,
  TimelineTrackType,
  type CompositionAssetRef,
  type CompositionClip,
  type CompositionManifest,
  type CompositionTrack,
  type TimelineClip,
  type TimelineMissingAssets,
  type TimelineTrack,
} from "@ai-drama-studio/types";

export type ShotTimingInput = {
  id: string;
  shotNumber: number;
  durationSeconds: number;
  sceneId?: string | null;
  scriptBlockId?: string | null;
  sourceScriptBlockIds?: string[] | unknown;
};

export type ShotTimelineEntry = ShotTimingInput & {
  startTime: number;
  endTime: number;
};

export type SceneTimelineEntry = {
  sceneId: string;
  startTime: number;
  endTime: number;
  duration: number;
};

export type DialogueTimelineEntry = {
  blockId: string;
  startTime: number;
  duration: number;
  endTime: number;
};

export type VisualAssetCandidate = {
  id: string;
  type?: string | null;
  role?: string | null;
  isPrimary?: boolean;
  status?: string | null;
};

const SECRET_KEYS = ["apiKey", "encryptedApiKey", "AI_API_KEY"];

export function getTimelineStatusLabel(status: TimelineStatus | string): string {
  if (status === TimelineStatus.PREVIEW_READY) {
    return "可预览";
  }
  if (status === TimelineStatus.STALE) {
    return "已过期";
  }
  if (status === TimelineStatus.LOCKED) {
    return "已锁定";
  }
  return "草稿";
}

export function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(1, Math.max(0, value));
}

function asIdArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string" && item.length > 0);
}

export function calculateShotTimeline(shots: ShotTimingInput[]): ShotTimelineEntry[] {
  const ordered = [...shots].sort((left, right) => left.shotNumber - right.shotNumber);
  let cursor = 0;
  return ordered.map((shot) => {
    const duration = Math.max(0, Number(shot.durationSeconds) || 0);
    const startTime = cursor;
    const endTime = startTime + duration;
    cursor = endTime;
    return { ...shot, startTime, endTime };
  });
}

export function calculateSceneTimeline(shots: ShotTimelineEntry[]): SceneTimelineEntry[] {
  const grouped = new Map<string, ShotTimelineEntry[]>();
  for (const shot of shots) {
    if (!shot.sceneId) {
      continue;
    }
    const list = grouped.get(shot.sceneId) ?? [];
    list.push(shot);
    grouped.set(shot.sceneId, list);
  }
  return [...grouped.entries()].map(([sceneId, sceneShots]) => {
    const startTime = Math.min(...sceneShots.map((item) => item.startTime));
    const endTime = Math.max(...sceneShots.map((item) => item.endTime));
    return {
      sceneId,
      startTime,
      endTime,
      duration: endTime - startTime,
    };
  });
}

export function calculateDialogueTimeline(input: {
  blocks: Array<{ id: string; durationSeconds: number }>;
  shots: ShotTimelineEntry[];
}): DialogueTimelineEntry[] {
  return input.blocks.map((block) => {
    const related = input.shots.filter(
      (shot) =>
        shot.scriptBlockId === block.id ||
        asIdArray(shot.sourceScriptBlockIds).includes(block.id),
    );
    const startTime =
      related.length > 0 ? Math.min(...related.map((item) => item.startTime)) : 0;
    const duration = Math.max(0, Number(block.durationSeconds) || 0);
    return {
      blockId: block.id,
      startTime,
      duration,
      endTime: startTime + duration,
    };
  });
}

export function calculateTimelineDuration(
  shots: Array<{ startTime: number; endTime?: number; duration?: number }>,
  clips: Array<{ startTime: number; duration: number }> = [],
): number {
  const shotEnd = shots.reduce((max, shot) => {
    const end = shot.endTime ?? shot.startTime + (shot.duration ?? 0);
    return Math.max(max, end);
  }, 0);
  const clipEnd = clips.reduce(
    (max, clip) => Math.max(max, clip.startTime + clip.duration),
    0,
  );
  return Math.max(shotEnd, clipEnd, 0);
}

export function truncateToTimelineDuration(
  clipDuration: number,
  timelineDuration: number,
): number {
  if (!(clipDuration > 0)) {
    return 0;
  }
  if (!(timelineDuration > 0)) {
    return clipDuration;
  }
  return Math.min(clipDuration, timelineDuration);
}

export function resolveSfxStartTime(input: {
  shotId?: string | null;
  sceneId?: string | null;
  shots: ShotTimelineEntry[];
  scenes: SceneTimelineEntry[];
}): number {
  if (input.shotId) {
    const shot = input.shots.find((item) => item.id === input.shotId);
    if (shot) {
      return shot.startTime;
    }
  }
  if (input.sceneId) {
    const scene = input.scenes.find((item) => item.sceneId === input.sceneId);
    if (scene) {
      return scene.startTime;
    }
  }
  return 0;
}

export function detectTimelineStale(input: {
  sourceStoryboardVersion?: number | null;
  sourceScriptVersion?: number | null;
  currentStoryboardVersion?: number | null;
  currentScriptVersion?: number | null;
  sourceAssetFingerprint?: string | null;
  currentAssetFingerprint?: string | null;
}): boolean {
  if (
    typeof input.sourceStoryboardVersion === "number" &&
    typeof input.currentStoryboardVersion === "number" &&
    input.currentStoryboardVersion !== input.sourceStoryboardVersion
  ) {
    return true;
  }
  if (
    typeof input.sourceScriptVersion === "number" &&
    typeof input.currentScriptVersion === "number" &&
    input.currentScriptVersion !== input.sourceScriptVersion
  ) {
    return true;
  }
  if (
    input.sourceAssetFingerprint &&
    input.currentAssetFingerprint &&
    input.sourceAssetFingerprint !== input.currentAssetFingerprint
  ) {
    return true;
  }
  return false;
}

export function buildAssetVersionFingerprint(
  assets: Array<{ id: string; version: number }>,
): string {
  return [...assets]
    .map((item) => `${item.id}:${item.version}`)
    .sort()
    .join("|");
}

export function isReadyFinalAsset(
  item: VisualAssetCandidate | null | undefined,
  type: "IMAGE" | "VIDEO" | "AUDIO",
): boolean {
  if (!item?.id) {
    return false;
  }
  if (item.type && item.type !== type) {
    return false;
  }
  if (item.status && item.status !== "READY") {
    return false;
  }
  return item.role === "FINAL" || Boolean(item.isPrimary && item.role !== "REFERENCE");
}

export function pickFinalAsset(
  items: VisualAssetCandidate[] | null | undefined,
  type: "IMAGE" | "VIDEO" | "AUDIO",
): VisualAssetCandidate | null {
  const rows = (items ?? []).filter((item) => isReadyFinalAsset(item, type));
  return rows.find((item) => item.isPrimary) ?? rows.find((item) => item.role === "FINAL") ?? null;
}

export function resolveVisualClip(input: {
  video?: VisualAssetCandidate | null;
  image?: VisualAssetCandidate | null;
}): { kind: "VIDEO" | "IMAGE"; assetId: string } | null {
  if (input.video?.id) {
    return { kind: "VIDEO", assetId: input.video.id };
  }
  if (input.image?.id) {
    return { kind: "IMAGE", assetId: input.image.id };
  }
  return null;
}

export function resolveAudioClip(
  item: VisualAssetCandidate | null | undefined,
): { kind: "AUDIO"; assetId: string } | null {
  if (!item?.id) {
    return null;
  }
  return { kind: "AUDIO", assetId: item.id };
}

export function emptyMissingAssets(): TimelineMissingAssets {
  return {
    visual: [],
    dialogue: [],
    music: false,
    sfx: false,
  };
}

export function hasMissingAssets(missing: TimelineMissingAssets): boolean {
  return (
    missing.visual.length > 0 ||
    missing.dialogue.length > 0 ||
    missing.music ||
    missing.sfx
  );
}

export function timelineReadyMessage(missing: TimelineMissingAssets): {
  ready: boolean;
  message: string;
} {
  if (!hasMissingAssets(missing)) {
    return { ready: true, message: "时间线已就绪，可预览。" };
  }
  return { ready: false, message: "时间线存在缺失素材。" };
}

export function validateClipTiming(input: {
  startTime?: number;
  duration?: number;
  sourceStartTime?: number;
  sourceDuration?: number;
  volume?: number;
  speed?: number;
  opacity?: number;
}): string[] {
  const errors: string[] = [];
  if (input.startTime !== undefined && (!(Number.isFinite(input.startTime)) || input.startTime < 0)) {
    errors.push("TIMELINE_INVALID_TIME_RANGE");
  }
  if (input.duration !== undefined && (!(Number.isFinite(input.duration)) || input.duration <= 0)) {
    errors.push("TIMELINE_INVALID_DURATION");
  }
  if (
    input.sourceStartTime !== undefined &&
    (!(Number.isFinite(input.sourceStartTime)) || input.sourceStartTime < 0)
  ) {
    errors.push("TIMELINE_INVALID_TIME_RANGE");
  }
  if (
    input.sourceDuration !== undefined &&
    (!(Number.isFinite(input.sourceDuration)) || input.sourceDuration <= 0)
  ) {
    errors.push("TIMELINE_INVALID_DURATION");
  }
  if (input.volume !== undefined && (!(Number.isFinite(input.volume)) || input.volume < 0 || input.volume > 1)) {
    errors.push("TIMELINE_INVALID_VOLUME");
  }
  if (input.speed !== undefined && (!(Number.isFinite(input.speed)) || input.speed <= 0)) {
    errors.push("TIMELINE_INVALID_DURATION");
  }
  if (
    input.opacity !== undefined &&
    (!(Number.isFinite(input.opacity)) || input.opacity < 0 || input.opacity > 1)
  ) {
    errors.push("TIMELINE_INVALID_VOLUME");
  }
  return errors;
}

export function calculatePlaybackVolume(
  track: { volume?: number | null; muted?: boolean | null; enabled?: boolean | null },
  clip: { volume?: number | null; enabled?: boolean | null },
): number {
  if (track.muted || track.enabled === false || clip.enabled === false) {
    return 0;
  }
  return clamp01(track.volume ?? 1) * clamp01(clip.volume ?? 1);
}

export function clipCoversTime(
  clip: { startTime: number; duration: number; enabled?: boolean | null },
  currentTime: number,
): boolean {
  if (clip.enabled === false) {
    return false;
  }
  return currentTime >= clip.startTime && currentTime < clip.startTime + clip.duration;
}

export function resolveActiveVisualClip<
  T extends {
    type: string;
    startTime: number;
    duration: number;
    zIndex?: number | null;
    enabled?: boolean | null;
  },
>(clips: T[], currentTime: number): T | null {
  const covering = clips.filter(
    (clip) =>
      (clip.type === TimelineClipType.VIDEO || clip.type === TimelineClipType.IMAGE) &&
      clipCoversTime(clip, currentTime),
  );
  covering.sort((left, right) => {
    const z = (right.zIndex ?? 0) - (left.zIndex ?? 0);
    if (z !== 0) {
      return z;
    }
    if (left.type === right.type) {
      return 0;
    }
    return left.type === TimelineClipType.VIDEO ? -1 : 1;
  });
  return covering[0] ?? null;
}

export function stripSecretFields<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripSecretFields(item)) as T;
  }
  if (!value || typeof value !== "object") {
    return value;
  }
  const record = value as Record<string, unknown>;
  const next: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(record)) {
    if (SECRET_KEYS.includes(key) || key.toLowerCase().includes("apikey")) {
      continue;
    }
    if (key === "generationTask" || key === "generationTaskId") {
      continue;
    }
    next[key] = stripSecretFields(item);
  }
  return next as T;
}

export function toCompositionAssetRef(asset: {
  id: string;
  type: string;
  name: string;
  url?: string | null;
  mimeType?: string | null;
  durationSeconds?: number | null;
} | null | undefined): CompositionAssetRef | null {
  if (!asset) {
    return null;
  }
  return {
    id: asset.id,
    type: asset.type as AssetType,
    name: asset.name,
    url: asset.url ?? null,
    mimeType: asset.mimeType ?? null,
    durationSeconds: asset.durationSeconds ?? null,
  };
}

export function buildTimelineManifest(input: {
  projectId: string;
  episodeId: string;
  timelineId: string;
  version: number;
  status: TimelineStatus | string;
  durationSeconds: number;
  fps: number;
  resolution: string;
  aspectRatio: string;
  tracks: Array<
    TimelineTrack & {
      clips?: Array<
        TimelineClip & {
          asset?: Parameters<typeof toCompositionAssetRef>[0];
        }
      >;
    }
  >;
}): CompositionManifest {
  const tracks: CompositionTrack[] = [...input.tracks]
    .sort((left, right) => left.order - right.order)
    .map((track) => ({
      id: track.id,
      type: track.type,
      name: track.name,
      order: track.order,
      enabled: track.enabled,
      muted: track.muted,
      volume: track.volume,
      clips: [...(track.clips ?? [])]
        .sort((left, right) => left.startTime - right.startTime || left.zIndex - right.zIndex)
        .map((clip) => {
          const composed: CompositionClip = {
            id: clip.id,
            type: clip.type,
            sourceType: clip.sourceType,
            sourceId: clip.sourceId,
            assetId: clip.assetId,
            startTime: clip.startTime,
            duration: clip.duration,
            sourceStartTime: clip.sourceStartTime,
            sourceDuration: clip.sourceDuration,
            zIndex: clip.zIndex,
            volume: clip.volume,
            speed: clip.speed,
            opacity: clip.opacity,
            enabled: clip.enabled,
            playbackVolume: calculatePlaybackVolume(track, clip),
            asset: toCompositionAssetRef(clip.asset),
          };
          return composed;
        }),
    }));
  return stripSecretFields({
    episodeId: input.episodeId,
    projectId: input.projectId,
    timelineId: input.timelineId,
    version: input.version,
    status: input.status as TimelineStatus,
    durationSeconds: input.durationSeconds,
    fps: input.fps,
    resolution: input.resolution,
    aspectRatio: input.aspectRatio,
    tracks,
  });
}

export function missingFromMetadata(
  metadata: Record<string, unknown> | null | undefined,
): TimelineMissingAssets {
  const visualRaw = metadata?.missingVisualAsset;
  const dialogueRaw = metadata?.missingDialogueAudio;
  const visual: TimelineMissingAssets["visual"] = [];
  if (Array.isArray(visualRaw)) {
    for (const item of visualRaw) {
      if (!item || typeof item !== "object") {
        continue;
      }
      const row = item as { shotId?: unknown; shotNumber?: unknown };
      if (typeof row.shotId !== "string") {
        continue;
      }
      visual.push({
        shotId: row.shotId,
        shotNumber: typeof row.shotNumber === "number" ? row.shotNumber : undefined,
      });
    }
  }
  const dialogue: TimelineMissingAssets["dialogue"] = [];
  if (Array.isArray(dialogueRaw)) {
    for (const item of dialogueRaw) {
      if (!item || typeof item !== "object") {
        continue;
      }
      const row = item as { blockId?: unknown };
      if (typeof row.blockId === "string") {
        dialogue.push({ blockId: row.blockId });
      }
    }
  }
  return {
    visual,
    dialogue,
    music: Boolean(metadata?.missingMusicAsset),
    sfx: Boolean(metadata?.missingSfxAsset),
  };
}

export function defaultTrackName(type: TimelineTrackType | string): string {
  if (type === TimelineTrackType.VIDEO) {
    return "VIDEO";
  }
  if (type === TimelineTrackType.IMAGE) {
    return "IMAGE";
  }
  if (type === TimelineTrackType.DIALOGUE) {
    return "VOICE";
  }
  if (type === TimelineTrackType.MUSIC) {
    return "MUSIC";
  }
  return "SFX";
}

export const COMPOSITION_PREVIEW_DISCLAIMER = "这是合成预览，不是最终视频导出。";
