import {
  RenderJobStage,
  RenderJobStatus,
  TimelineClipType,
  TimelineStatus,
  TimelineTrackType,
  type CompositionClip,
  type CompositionTrack,
  type RenderManifestSnapshot,
  type TimelineMissingAssets,
} from "@ai-drama-studio/types";

export function canCreateRender(status: TimelineStatus | string, stale = false): boolean {
  return status === TimelineStatus.LOCKED && !stale;
}

export const RENDER_ACTIVE_STATUSES: RenderJobStatus[] = [
  RenderJobStatus.QUEUED,
  RenderJobStatus.PREPARING,
  RenderJobStatus.RENDERING,
];

const ALLOWED_TRANSITIONS: Record<RenderJobStatus, RenderJobStatus[]> = {
  [RenderJobStatus.QUEUED]: [
    RenderJobStatus.PREPARING,
    RenderJobStatus.FAILED,
    RenderJobStatus.CANCELLED,
  ],
  [RenderJobStatus.PREPARING]: [
    RenderJobStatus.RENDERING,
    RenderJobStatus.FAILED,
    RenderJobStatus.CANCEL_REQUESTED,
  ],
  [RenderJobStatus.RENDERING]: [
    RenderJobStatus.SUCCEEDED,
    RenderJobStatus.FAILED,
    RenderJobStatus.CANCEL_REQUESTED,
  ],
  [RenderJobStatus.CANCEL_REQUESTED]: [
    RenderJobStatus.CANCELLED,
    RenderJobStatus.FAILED,
  ],
  [RenderJobStatus.SUCCEEDED]: [],
  [RenderJobStatus.FAILED]: [],
  [RenderJobStatus.CANCELLED]: [],
};

export interface RenderLayerClip {
  id: string;
  type: TimelineClipType;
  trackType: TimelineTrackType;
  assetId: string;
  startTime: number;
  duration: number;
  sourceStartTime: number;
  sourceDuration: number;
  zIndex: number;
  speed: number;
  opacity: number;
  volume: number;
  playbackVolume: number;
  mimeType: string | null;
}

export function parseResolution(value: string): { width: number; height: number } {
  const match = /^(\d+)\s*[xX]\s*(\d+)$/.exec(String(value || "").trim());
  if (!match) {
    throw new Error("RENDER_MANIFEST_INVALID");
  }
  const width = Number(match[1]);
  const height = Number(match[2]);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 16 || height < 16) {
    throw new Error("RENDER_MANIFEST_INVALID");
  }
  return { width, height };
}

export function validateRenderJobTransition(
  from: RenderJobStatus,
  to: RenderJobStatus,
): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) === true;
}

export function assertRenderJobTransition(from: RenderJobStatus, to: RenderJobStatus): void {
  if (!validateRenderJobTransition(from, to)) {
    throw new Error("RENDER_JOB_INVALID_STATE");
  }
}

export function calculateEffectiveVolume(trackVolume: number, clipVolume: number, muted = false): number {
  if (muted) {
    return 0;
  }
  const volume = Number(trackVolume) * Number(clipVolume);
  if (!Number.isFinite(volume) || volume <= 0) {
    return 0;
  }
  return Math.min(volume, 4);
}

export function clampProgress(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(100, value));
}

export function calculateRenderProgress(input: {
  status: RenderJobStatus;
  stage: RenderJobStage;
  ffmpegRatio?: number | null;
}): number | null {
  if (input.status === RenderJobStatus.QUEUED) {
    return 0;
  }
  if (input.status === RenderJobStatus.SUCCEEDED) {
    return 100;
  }
  if (input.status === RenderJobStatus.FAILED || input.status === RenderJobStatus.CANCELLED) {
    return input.ffmpegRatio == null ? null : clampProgress(input.ffmpegRatio * 100);
  }
  if (input.stage === RenderJobStage.QUEUED) {
    return 0;
  }
  if (input.stage === RenderJobStage.PREPARING) {
    return 5;
  }
  if (input.stage === RenderJobStage.FINALIZING || input.stage === RenderJobStage.COMPLETED) {
    return input.stage === RenderJobStage.COMPLETED ? 100 : 95;
  }
  if (input.ffmpegRatio == null || !Number.isFinite(input.ffmpegRatio)) {
    return null;
  }
  return clampProgress(5 + Math.max(0, Math.min(1, input.ffmpegRatio)) * 90);
}

export function parseFfmpegProgress(
  chunk: string,
  durationSeconds: number,
): { ratio: number | null; outTimeSeconds: number | null; ended: boolean } {
  const ended = /progress=end/.test(chunk);
  let outTimeSeconds: number | null = null;
  const msMatch = /out_time_ms=(\d+)/.exec(chunk);
  if (msMatch) {
    outTimeSeconds = Number(msMatch[1]) / 1_000_000;
  } else {
    const timeMatch = /out_time=(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(chunk);
    if (timeMatch) {
      outTimeSeconds =
        Number(timeMatch[1]) * 3600 + Number(timeMatch[2]) * 60 + Number(timeMatch[3]);
    }
  }
  if (outTimeSeconds == null || !Number.isFinite(outTimeSeconds) || outTimeSeconds < 0) {
    return { ratio: ended ? 1 : null, outTimeSeconds: null, ended };
  }
  if (!(durationSeconds > 0)) {
    return { ratio: ended ? 1 : null, outTimeSeconds, ended };
  }
  return {
    ratio: Math.max(0, Math.min(1, outTimeSeconds / durationSeconds)),
    outTimeSeconds,
    ended,
  };
}

export function isProgressMonotonic(previous: number | null, next: number | null): boolean {
  if (previous == null || next == null) {
    return true;
  }
  return next + 0.0001 >= previous;
}

export function assertRenderReady(missing: TimelineMissingAssets): {
  ok: boolean;
  errorCode?: string;
  message?: string;
} {
  const visualItems = missing.visual ?? [];
  const dialogueItems = missing.dialogue ?? [];
  if (visualItems.length > 0 || dialogueItems.length > 0) {
    const visual = visualItems[0];
    const dialogue = dialogueItems[0];
    const parts = [
      visual
        ? visual.shotNumber
          ? `Shot ${String(visual.shotNumber).padStart(3, "0")} 缺少视频或图片素材。`
          : `缺少 ${visualItems.length} 个视觉素材`
        : "",
      dialogue
        ? dialogue.blockIndex
          ? `ScriptBlock ${String(dialogue.blockIndex).padStart(2, "0")} 缺少对白音频。`
          : `缺少 ${dialogueItems.length} 个对白音频`
        : "",
    ].filter(Boolean);
    return {
      ok: false,
      errorCode: "RENDER_MISSING_REQUIRED_ASSET",
      message: parts.join(" "),
    };
  }
  return { ok: true };
}

export function validateRenderManifest(snapshot: Partial<RenderManifestSnapshot> | null | undefined): {
  ok: boolean;
  errorCode?: string;
  message?: string;
} {
  if (!snapshot || typeof snapshot !== "object") {
    return { ok: false, errorCode: "RENDER_MANIFEST_INVALID", message: "Render manifest 无效" };
  }
  if (!snapshot.episodeId || !snapshot.projectId || !snapshot.timelineId) {
    return { ok: false, errorCode: "RENDER_MANIFEST_INVALID", message: "Render manifest 缺少标识" };
  }
  if (!(Number(snapshot.durationSeconds) > 0)) {
    return { ok: false, errorCode: "RENDER_MANIFEST_INVALID", message: "Render duration 无效" };
  }
  if (!(Number(snapshot.fps) > 0)) {
    return { ok: false, errorCode: "RENDER_MANIFEST_INVALID", message: "Render fps 无效" };
  }
  try {
    parseResolution(String(snapshot.resolution || ""));
  } catch {
    return { ok: false, errorCode: "RENDER_MANIFEST_INVALID", message: "Render resolution 无效" };
  }
  if (!Array.isArray(snapshot.tracks)) {
    return { ok: false, errorCode: "RENDER_MANIFEST_INVALID", message: "Render tracks 无效" };
  }
  const layers = resolveRenderLayers(snapshot as RenderManifestSnapshot);
  if (layers.length === 0) {
    return { ok: false, errorCode: "RENDER_MANIFEST_INVALID", message: "没有可渲染的视觉片段" };
  }
  return { ok: true };
}

export function resolveRenderLayers(snapshot: RenderManifestSnapshot): RenderLayerClip[] {
  const layers: RenderLayerClip[] = [];
  for (const track of snapshot.tracks || []) {
    if (!track.enabled) {
      continue;
    }
    if (track.type !== TimelineTrackType.VIDEO && track.type !== TimelineTrackType.IMAGE) {
      continue;
    }
    for (const clip of track.clips || []) {
      if (!clip.enabled || !clip.assetId) {
        continue;
      }
      if (clip.type !== TimelineClipType.VIDEO && clip.type !== TimelineClipType.IMAGE) {
        continue;
      }
      layers.push(toLayer(track, clip));
    }
  }
  return layers.sort(compareVisualLayers);
}

export function resolveRenderAudioClips(snapshot: RenderManifestSnapshot): RenderLayerClip[] {
  const clips: RenderLayerClip[] = [];
  for (const track of snapshot.tracks || []) {
    if (!track.enabled || track.muted) {
      continue;
    }
    if (
      track.type !== TimelineTrackType.DIALOGUE &&
      track.type !== TimelineTrackType.MUSIC &&
      track.type !== TimelineTrackType.SFX
    ) {
      continue;
    }
    for (const clip of track.clips || []) {
      if (!clip.enabled || clip.type !== TimelineClipType.AUDIO || !clip.assetId) {
        continue;
      }
      const volume = calculateEffectiveVolume(track.volume, clip.volume, track.muted);
      if (volume <= 0) {
        continue;
      }
      clips.push({ ...toLayer(track, clip), playbackVolume: volume, volume });
    }
  }
  return clips.sort((a, b) => a.startTime - b.startTime || a.id.localeCompare(b.id));
}

function toLayer(track: CompositionTrack, clip: CompositionClip): RenderLayerClip {
  return {
    id: clip.id,
    type: clip.type,
    trackType: track.type,
    assetId: clip.assetId,
    startTime: Number(clip.startTime) || 0,
    duration: Number(clip.duration) || 0,
    sourceStartTime: Number(clip.sourceStartTime) || 0,
    sourceDuration: Number(clip.sourceDuration) || Number(clip.duration) || 0,
    zIndex: Number(clip.zIndex) || 0,
    speed: Number(clip.speed) > 0 ? Number(clip.speed) : 1,
    opacity: Number.isFinite(clip.opacity) ? Math.max(0, Math.min(1, Number(clip.opacity))) : 1,
    volume: Number(clip.volume) || 0,
    playbackVolume: clip.playbackVolume,
    mimeType: clip.asset?.mimeType ?? null,
  };
}

function compareVisualLayers(left: RenderLayerClip, right: RenderLayerClip): number {
  if (left.zIndex !== right.zIndex) {
    return left.zIndex - right.zIndex;
  }
  if (left.type === right.type) {
    return left.startTime - right.startTime;
  }
  return left.type === TimelineClipType.IMAGE ? -1 : 1;
}

export function sanitizeRenderDiagnostic(text: string, maxLength = 2000): string {
  return String(text || "")
    .replace(/[A-Za-z]:\\[^\s"'`]+/g, "[path]")
    .replace(/\/(?:tmp|Users|home|var|opt|usr)[^\s"'`]+/g, "[path]")
    .replace(/api[_-]?key[^\s"'`]*/gi, "[redacted]")
    .replace(/encryptedApiKey/gi, "[redacted]")
    .slice(0, maxLength);
}

export function containsForbiddenRenderLeak(value: unknown): boolean {
  const text = JSON.stringify(value ?? "");
  return (
    /apiKey/i.test(text) ||
    /encryptedApiKey/i.test(text) ||
    /generationTask/i.test(text) ||
    /[A-Za-z]:\\Users\\/i.test(text) ||
    /\/tmp\/render\//i.test(text)
  );
}

export function renderArtifactStorageKey(input: {
  projectId: string;
  episodeId: string;
  renderJobId: string;
}): string {
  return `renders/${input.projectId}/${input.episodeId}/${input.renderJobId}/episode.mp4`;
}

export function getRenderJobStatusLabel(status: RenderJobStatus | string): string {
  const labels: Record<string, string> = {
    QUEUED: "排队中",
    PREPARING: "准备中",
    RENDERING: "渲染中",
    SUCCEEDED: "已完成",
    FAILED: "失败",
    CANCEL_REQUESTED: "正在取消",
    CANCELLED: "已取消",
  };
  return labels[status] || status;
}

export function getRenderJobStageLabel(stage: RenderJobStage | string): string {
  const labels: Record<string, string> = {
    QUEUED: "排队",
    PREPARING: "准备素材",
    ENCODING_VIDEO: "编码画面",
    MIXING_AUDIO: "混合音频",
    FINALIZING: "收尾",
    COMPLETED: "完成",
  };
  return labels[stage] || stage;
}
