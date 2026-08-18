import { describe, expect, it } from "vitest";
import {
  assertRenderReady,
  calculateEffectiveVolume,
  calculateRenderProgress,
  canCreateRender,
  containsForbiddenRenderLeak,
  isProgressMonotonic,
  parseFfmpegProgress,
  parseResolution,
  renderArtifactStorageKey,
  resolveRenderAudioClips,
  resolveRenderLayers,
  sanitizeRenderDiagnostic,
  validateRenderJobTransition,
  validateRenderManifest,
} from "@ai-drama-studio/core";
import {
  RenderJobStage,
  RenderJobStatus,
  TimelineClipSourceType,
  TimelineClipType,
  TimelineStatus,
  TimelineTrackType,
  type RenderManifestSnapshot,
} from "@ai-drama-studio/types";
import { emptyMissingAssets } from "@ai-drama-studio/core";

function clip(over: Partial<RenderManifestSnapshot["tracks"][0]["clips"][0]> = {}) {
  return {
    id: over.id || "c1",
    type: TimelineClipType.IMAGE,
    sourceType: TimelineClipSourceType.STORYBOARD_SHOT,
    sourceId: "shot-1",
    assetId: "img-1",
    startTime: 0,
    duration: 4,
    sourceStartTime: 0,
    sourceDuration: 4,
    zIndex: 0,
    volume: 1,
    speed: 1,
    opacity: 1,
    enabled: true,
    playbackVolume: 1,
    asset: {
      id: "img-1",
      type: "IMAGE" as const,
      name: "img",
      url: "/projects/proj-a/assets/img-1/file",
      mimeType: "image/png",
      durationSeconds: null,
    },
    ...over,
  };
}

function snapshot(over: Partial<RenderManifestSnapshot> = {}): RenderManifestSnapshot {
  return {
    episodeId: "ep-a",
    projectId: "proj-a",
    timelineId: "tl-1",
    version: 5,
    status: TimelineStatus.LOCKED,
    durationSeconds: 4,
    fps: 24,
    resolution: "640x360",
    aspectRatio: "16:9",
    missing: emptyMissingAssets(),
    assets: [
      {
        id: "img-1",
        storageKey: "assets/proj-a/img-1/original.png",
        mimeType: "image/png",
        type: "IMAGE" as const,
        name: "img",
        durationSeconds: null,
      },
    ],
    tracks: [
      {
        id: "tr-image",
        type: TimelineTrackType.IMAGE,
        name: "IMAGE",
        order: 1,
        enabled: true,
        muted: false,
        volume: 1,
        clips: [clip()],
      },
    ],
    ...over,
  };
}

describe("render core", () => {
  it("allows render only when timeline is LOCKED and not stale", () => {
    expect(canCreateRender(TimelineStatus.DRAFT)).toBe(false);
    expect(canCreateRender(TimelineStatus.PREVIEW_READY)).toBe(false);
    expect(canCreateRender(TimelineStatus.STALE)).toBe(false);
    expect(canCreateRender(TimelineStatus.LOCKED, true)).toBe(false);
    expect(canCreateRender(TimelineStatus.LOCKED)).toBe(true);
  });

  it("validates status transitions", () => {
    expect(validateRenderJobTransition(RenderJobStatus.QUEUED, RenderJobStatus.PREPARING)).toBe(true);
    expect(validateRenderJobTransition(RenderJobStatus.PREPARING, RenderJobStatus.RENDERING)).toBe(true);
    expect(validateRenderJobTransition(RenderJobStatus.RENDERING, RenderJobStatus.SUCCEEDED)).toBe(true);
    expect(validateRenderJobTransition(RenderJobStatus.QUEUED, RenderJobStatus.CANCELLED)).toBe(true);
    expect(validateRenderJobTransition(RenderJobStatus.RENDERING, RenderJobStatus.CANCEL_REQUESTED)).toBe(true);
    expect(validateRenderJobTransition(RenderJobStatus.SUCCEEDED, RenderJobStatus.RENDERING)).toBe(false);
    expect(validateRenderJobTransition(RenderJobStatus.CANCELLED, RenderJobStatus.RENDERING)).toBe(false);
    expect(validateRenderJobTransition(RenderJobStatus.FAILED, RenderJobStatus.QUEUED)).toBe(false);
  });

  it("parses resolution and rejects invalid values", () => {
    expect(parseResolution("1920x1080")).toEqual({ width: 1920, height: 1080 });
    expect(() => parseResolution("fullhd")).toThrow();
  });

  it("multiplies track and clip volume and respects mute", () => {
    expect(calculateEffectiveVolume(0.5, 0.4)).toBeCloseTo(0.2);
    expect(calculateEffectiveVolume(1, 1, true)).toBe(0);
    expect(calculateEffectiveVolume(0, 1)).toBe(0);
  });

  it("calculates progress without faking a percent when ffmpeg ratio is unknown", () => {
    expect(calculateRenderProgress({ status: RenderJobStatus.QUEUED, stage: RenderJobStage.QUEUED })).toBe(0);
    expect(
      calculateRenderProgress({
        status: RenderJobStatus.PREPARING,
        stage: RenderJobStage.PREPARING,
      }),
    ).toBe(5);
    expect(
      calculateRenderProgress({
        status: RenderJobStatus.RENDERING,
        stage: RenderJobStage.ENCODING_VIDEO,
        ffmpegRatio: null,
      }),
    ).toBeNull();
    expect(
      calculateRenderProgress({
        status: RenderJobStatus.RENDERING,
        stage: RenderJobStage.ENCODING_VIDEO,
        ffmpegRatio: 0.5,
      }),
    ).toBe(50);
    expect(
      calculateRenderProgress({
        status: RenderJobStatus.SUCCEEDED,
        stage: RenderJobStage.COMPLETED,
      }),
    ).toBe(100);
    expect(isProgressMonotonic(10, 20)).toBe(true);
    expect(isProgressMonotonic(40, 10)).toBe(false);
  });

  it("parses ffmpeg out_time progress", () => {
    const parsed = parseFfmpegProgress("out_time_ms=2000000\nprogress=continue", 4);
    expect(parsed.outTimeSeconds).toBeCloseTo(2);
    expect(parsed.ratio).toBeCloseTo(0.5);
    expect(parseFfmpegProgress("progress=end", 4).ended).toBe(true);
  });

  it("rejects missing required visual and dialogue assets", () => {
    const missing = emptyMissingAssets();
    missing.visual.push({ shotId: "shot-1" });
    missing.dialogue.push({ blockId: "b1" });
    const result = assertRenderReady(missing);
    expect(result.ok).toBe(false);
    expect(result.errorCode).toBe("RENDER_MISSING_REQUIRED_ASSET");
    expect(result.message).toContain("视觉素材");
    expect(result.message).toContain("对白音频");
    expect(assertRenderReady({ ...emptyMissingAssets(), music: true, sfx: true }).ok).toBe(true);
  });

  it("validates manifest and visual layers", () => {
    expect(validateRenderManifest(snapshot()).ok).toBe(true);
    expect(validateRenderManifest({ ...snapshot(), durationSeconds: 0 }).ok).toBe(false);
    expect(validateRenderManifest({ ...snapshot(), tracks: [] }).ok).toBe(false);
  });

  it("keeps VIDEO above IMAGE at the same zIndex", () => {
    const layers = resolveRenderLayers(
      snapshot({
        tracks: [
          {
            id: "tr-v",
            type: TimelineTrackType.VIDEO,
            name: "VIDEO",
            order: 0,
            enabled: true,
            muted: false,
            volume: 1,
            clips: [
              clip({
                id: "video",
                type: TimelineClipType.VIDEO,
                assetId: "vid-1",
                zIndex: 1,
              }),
            ],
          },
          {
            id: "tr-i",
            type: TimelineTrackType.IMAGE,
            name: "IMAGE",
            order: 1,
            enabled: true,
            muted: false,
            volume: 1,
            clips: [clip({ id: "image", zIndex: 1 })],
          },
        ],
      }),
    );
    expect(layers.map((item) => item.id)).toEqual(["image", "video"]);
  });

  it("skips muted tracks and disabled clips for audio", () => {
    const audio = resolveRenderAudioClips(
      snapshot({
        tracks: [
          {
            id: "dlg",
            type: TimelineTrackType.DIALOGUE,
            name: "DIALOGUE",
            order: 2,
            enabled: true,
            muted: true,
            volume: 1,
            clips: [clip({ id: "d1", type: TimelineClipType.AUDIO, assetId: "tts-1" })],
          },
          {
            id: "music",
            type: TimelineTrackType.MUSIC,
            name: "MUSIC",
            order: 3,
            enabled: true,
            muted: false,
            volume: 0.5,
            clips: [
              clip({
                id: "m1",
                type: TimelineClipType.AUDIO,
                assetId: "music-1",
                volume: 0.4,
                playbackVolume: 0.2,
                enabled: false,
              }),
            ],
          },
        ],
      }),
    );
    expect(audio).toEqual([]);
  });

  it("sanitizes diagnostics and forbids secret / path leaks", () => {
    expect(sanitizeRenderDiagnostic("C:\\Users\\admin\\secret.mp4 apiKey=sk-test")).toContain("[path]");
    expect(sanitizeRenderDiagnostic("C:\\Users\\admin\\secret.mp4 apiKey=sk-test")).not.toContain("sk-test");
    expect(
      containsForbiddenRenderLeak({
        apiKey: "sk",
        encryptedApiKey: "x",
        generationTask: { id: "t1" },
        path: "C:\\Users\\a\\file.mp4",
      }),
    ).toBe(true);
    expect(containsForbiddenRenderLeak({ id: "job-1", status: "QUEUED" })).toBe(false);
  });

  it("builds unique render artifact storage keys", () => {
    expect(
      renderArtifactStorageKey({
        projectId: "p1",
        episodeId: "e1",
        renderJobId: "j1",
      }),
    ).toBe("renders/p1/e1/j1/episode.mp4");
  });
});
