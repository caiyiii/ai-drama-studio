import { describe, expect, it } from "vitest";
import {
  buildAssetVersionFingerprint,
  buildTimelineManifest,
  calculateDialogueTimeline,
  calculatePlaybackVolume,
  calculateSceneTimeline,
  calculateShotTimeline,
  calculateTimelineDuration,
  clipCoversTime,
  detectTimelineStale,
  emptyMissingAssets,
  hasMissingAssets,
  pickFinalAsset,
  resolveActiveVisualClip,
  resolveAudioClip,
  resolveSfxStartTime,
  resolveVisualClip,
  stripSecretFields,
  timelineReadyMessage,
  truncateToTimelineDuration,
  validateClipTiming,
} from "@ai-drama-studio/core";
import {
  TimelineClipSourceType,
  TimelineClipType,
  TimelineStatus,
  TimelineTrackType,
} from "@ai-drama-studio/types";

describe("timeline core timing", () => {
  const shots = calculateShotTimeline([
    { id: "s1", shotNumber: 1, durationSeconds: 6, sceneId: "sc1", scriptBlockId: "b1" },
    { id: "s2", shotNumber: 2, durationSeconds: 4, sceneId: "sc1", scriptBlockId: "b2" },
    { id: "s3", shotNumber: 3, durationSeconds: 5, sceneId: "sc2", sourceScriptBlockIds: ["b3"] },
  ]);

  it("accumulates shot times in order", () => {
    expect(shots[0]).toMatchObject({ startTime: 0, endTime: 6 });
    expect(shots[1]).toMatchObject({ startTime: 6, endTime: 10 });
    expect(shots[2]).toMatchObject({ startTime: 10, endTime: 15 });
  });

  it("derives scene times from first and last shot", () => {
    const scenes = calculateSceneTimeline(shots);
    expect(scenes.find((item) => item.sceneId === "sc1")).toMatchObject({
      startTime: 0,
      endTime: 10,
      duration: 10,
    });
    expect(scenes.find((item) => item.sceneId === "sc2")).toMatchObject({
      startTime: 10,
      endTime: 15,
    });
  });

  it("places dialogue on the first related shot and does not truncate overflow", () => {
    const dialogue = calculateDialogueTimeline({
      shots,
      blocks: [
        { id: "b1", durationSeconds: 8 },
        { id: "b3", durationSeconds: 2 },
      ],
    });
    expect(dialogue[0]).toMatchObject({ startTime: 0, duration: 8, endTime: 8 });
    expect(dialogue[1]).toMatchObject({ startTime: 10, duration: 2 });
  });

  it("calculates timeline duration from shots and clips", () => {
    expect(calculateTimelineDuration(shots)).toBe(15);
    expect(calculateTimelineDuration(shots, [{ startTime: 14, duration: 4 }])).toBe(18);
  });

  it("truncates music to timeline duration and does not loop", () => {
    expect(truncateToTimelineDuration(30, 15)).toBe(15);
    expect(truncateToTimelineDuration(8, 15)).toBe(8);
  });

  it("places sfx by shot, then scene, then episode start", () => {
    const scenes = calculateSceneTimeline(shots);
    expect(resolveSfxStartTime({ shotId: "s2", shots, scenes })).toBe(6);
    expect(resolveSfxStartTime({ sceneId: "sc2", shots, scenes })).toBe(10);
    expect(resolveSfxStartTime({ shots, scenes })).toBe(0);
  });
});

describe("timeline visual and audio selection", () => {
  it("prefers final video over final image", () => {
    expect(
      resolveVisualClip({
        video: { id: "v1", role: "FINAL", type: "VIDEO" },
        image: { id: "i1", role: "FINAL", type: "IMAGE" },
      }),
    ).toEqual({ kind: "VIDEO", assetId: "v1" });
  });

  it("falls back to final image when video is missing", () => {
    expect(resolveVisualClip({ image: { id: "i1", role: "FINAL", type: "IMAGE" } })).toEqual({
      kind: "IMAGE",
      assetId: "i1",
    });
  });

  it("does not invent a visual clip from prompts", () => {
    expect(resolveVisualClip({})).toBeNull();
    expect(pickFinalAsset([{ id: "x", role: "REFERENCE", type: "VIDEO", status: "READY" }], "VIDEO")).toBeNull();
  });

  it("resolves audio clips only from real assets", () => {
    expect(resolveAudioClip({ id: "a1" })).toEqual({ kind: "AUDIO", assetId: "a1" });
    expect(resolveAudioClip(null)).toBeNull();
  });

  it("prefers video over image at the same time when zIndex is equal", () => {
    const active = resolveActiveVisualClip(
      [
        { type: "IMAGE", startTime: 0, duration: 5, zIndex: 1, enabled: true },
        { type: "VIDEO", startTime: 0, duration: 5, zIndex: 1, enabled: true },
      ],
      1,
    );
    expect(active?.type).toBe("VIDEO");
  });

  it("honors higher zIndex and skips disabled clips", () => {
    expect(
      resolveActiveVisualClip(
        [
          { type: "VIDEO", startTime: 0, duration: 5, zIndex: 1, enabled: true },
          { type: "IMAGE", startTime: 0, duration: 5, zIndex: 5, enabled: true },
        ],
        1,
      )?.type,
    ).toBe("IMAGE");
    expect(
      clipCoversTime({ startTime: 0, duration: 2, enabled: false }, 1),
    ).toBe(false);
  });
});

describe("timeline stale, volume and validation", () => {
  it("detects stale storyboard, script and asset fingerprint changes", () => {
    expect(
      detectTimelineStale({
        sourceStoryboardVersion: 2,
        currentStoryboardVersion: 3,
      }),
    ).toBe(true);
    expect(
      detectTimelineStale({
        sourceScriptVersion: 1,
        currentScriptVersion: 2,
      }),
    ).toBe(true);
    expect(
      detectTimelineStale({
        sourceAssetFingerprint: "a:1",
        currentAssetFingerprint: "a:2",
      }),
    ).toBe(true);
    expect(
      detectTimelineStale({
        sourceStoryboardVersion: 1,
        currentStoryboardVersion: 1,
        sourceScriptVersion: 4,
        currentScriptVersion: 4,
      }),
    ).toBe(false);
  });

  it("builds a stable asset fingerprint", () => {
    expect(
      buildAssetVersionFingerprint([
        { id: "b", version: 2 },
        { id: "a", version: 1 },
      ]),
    ).toBe("a:1|b:2");
  });

  it("multiplies track and clip volume and mutes when requested", () => {
    expect(calculatePlaybackVolume({ volume: 0.5, muted: false }, { volume: 0.4, enabled: true })).toBeCloseTo(0.2);
    expect(calculatePlaybackVolume({ volume: 1, muted: true }, { volume: 1, enabled: true })).toBe(0);
    expect(calculatePlaybackVolume({ volume: 1, muted: false }, { volume: 1, enabled: false })).toBe(0);
  });

  it("validates clip timing, volume, speed and opacity", () => {
    expect(validateClipTiming({ startTime: -1, duration: 1 })).toContain("TIMELINE_INVALID_TIME_RANGE");
    expect(validateClipTiming({ duration: 0 })).toContain("TIMELINE_INVALID_DURATION");
    expect(validateClipTiming({ volume: 1.2 })).toContain("TIMELINE_INVALID_VOLUME");
    expect(validateClipTiming({ speed: 0 })).toContain("TIMELINE_INVALID_DURATION");
    expect(validateClipTiming({ opacity: -0.1 })).toContain("TIMELINE_INVALID_VOLUME");
    expect(validateClipTiming({ startTime: 0, duration: 1, volume: 1, speed: 1, opacity: 1 })).toEqual([]);
  });

  it("summarizes missing assets without pretending generation is running", () => {
    const missing = emptyMissingAssets();
    expect(hasMissingAssets(missing)).toBe(false);
    expect(timelineReadyMessage(missing).message).toContain("已就绪");
    missing.visual.push({ shotId: "s3" });
    expect(timelineReadyMessage(missing).message).toContain("缺失素材");
  });

  it("strips api keys and generation tasks from composition payloads", () => {
    const cleaned = stripSecretFields({
      apiKey: "secret",
      encryptedApiKey: "enc",
      generationTask: { id: "task" },
      generationTaskId: "task",
      tracks: [{ clips: [{ asset: { id: "a1", url: "/file" } }] }],
    });
    expect(JSON.stringify(cleaned)).not.toContain("secret");
    expect(JSON.stringify(cleaned)).not.toContain("apiKey");
    expect(JSON.stringify(cleaned)).not.toContain("generationTask");
    expect(JSON.stringify(cleaned)).toContain("/file");
  });

  it("builds a render-ready JSON manifest without filesystem paths", () => {
    const manifest = buildTimelineManifest({
      projectId: "p1",
      episodeId: "e1",
      timelineId: "t1",
      version: 1,
      status: TimelineStatus.PREVIEW_READY,
      durationSeconds: 10,
      fps: 24,
      resolution: "1920x1080",
      aspectRatio: "16:9",
      tracks: [
        {
          id: "tr1",
          timelineId: "t1",
          type: TimelineTrackType.VIDEO,
          name: "VIDEO",
          order: 0,
          enabled: true,
          muted: false,
          volume: 1,
          metadata: null,
          createdAt: "",
          updatedAt: "",
          clips: [
            {
              id: "c1",
              trackId: "tr1",
              type: TimelineClipType.VIDEO,
              sourceType: TimelineClipSourceType.STORYBOARD_SHOT,
              sourceId: "shot-1",
              assetId: "asset-1",
              startTime: 0,
              duration: 6,
              sourceStartTime: 0,
              sourceDuration: 6,
              zIndex: 1,
              volume: 1,
              speed: 1,
              opacity: 1,
              enabled: true,
              metadata: null,
              createdAt: "",
              updatedAt: "",
              asset: {
                id: "asset-1",
                type: "VIDEO",
                name: "shot",
                url: "/projects/p1/assets/asset-1/file",
                mimeType: "video/mp4",
                durationSeconds: 6,
              },
            },
          ],
        },
      ],
    });
    expect(manifest.tracks[0]?.clips[0]?.asset?.url).toContain("/projects/p1/assets/");
    expect(JSON.stringify(manifest)).not.toContain("storageKey");
    expect(JSON.stringify(manifest)).not.toContain("apiKey");
    expect(JSON.stringify(manifest)).not.toContain("generationTask");
  });
});
