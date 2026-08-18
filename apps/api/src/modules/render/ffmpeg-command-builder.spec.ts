import { describe, expect, it } from "vitest";
import {
  TimelineClipType,
  TimelineStatus,
  TimelineTrackType,
  type RenderManifestSnapshot,
} from "@ai-drama-studio/types";
import { emptyMissingAssets } from "@ai-drama-studio/core";
import { assertArgvSafe, buildFfmpegCommand } from "./ffmpeg-command-builder";
import type { RenderLayerClip } from "@ai-drama-studio/core";

function layer(over: Partial<RenderLayerClip> & { path: string }): RenderLayerClip & { path: string } {
  return {
    id: "c1",
    type: TimelineClipType.IMAGE,
    trackType: TimelineTrackType.IMAGE,
    assetId: "img-1",
    startTime: 0,
    duration: 2,
    sourceStartTime: 0,
    sourceDuration: 2,
    zIndex: 0,
    speed: 1,
    opacity: 1,
    volume: 1,
    playbackVolume: 1,
    mimeType: "image/png",
    ...over,
  };
}

const manifest: RenderManifestSnapshot = {
  episodeId: "ep-a",
  projectId: "proj-a",
  timelineId: "tl-1",
  version: 3,
  status: TimelineStatus.LOCKED,
  durationSeconds: 2,
  fps: 24,
  resolution: "640x360",
  aspectRatio: "16:9",
  missing: emptyMissingAssets(),
  assets: [],
  tracks: [],
};

describe("ffmpeg command builder", () => {
  it("builds argv arrays with libx264/aac and no shell interpolation", () => {
    const command = buildFfmpegCommand({
      manifest,
      visual: [
        layer({ path: "D:\\tmp\\render\\job\\inputs\\c1.png" }),
        layer({
          id: "c2",
          type: TimelineClipType.VIDEO,
          trackType: TimelineTrackType.VIDEO,
          path: "D:\\tmp\\render\\job\\inputs\\c2.mp4",
          startTime: 1,
          assetId: "vid-1",
        }),
      ],
      audio: [
        layer({
          id: "a1",
          type: TimelineClipType.AUDIO,
          trackType: TimelineTrackType.DIALOGUE,
          path: "D:\\tmp\\render\\job\\inputs\\a1.wav",
          playbackVolume: 0.5,
          volume: 0.5,
        }),
      ],
      outputPath: "D:\\tmp\\render\\job\\output\\episode.mp4",
    });
    assertArgvSafe(command.args);
    expect(Array.isArray(command.args)).toBe(true);
    expect(command.args).toContain("libx264");
    expect(command.args).toContain("aac");
    expect(command.args.join(" ")).not.toContain("ffmpeg -i D:");
    expect(command.args).toContain("D:\\tmp\\render\\job\\inputs\\c1.png");
    expect(command.args.some((item) => item.includes("filter_complex") || item.includes("color=c=black"))).toBe(true);
    expect(JSON.stringify(command)).not.toContain("apiKey");
    expect(command.hasAudio).toBe(true);
  });

  it("omits audio mapping for video-only episodes", () => {
    const command = buildFfmpegCommand({
      manifest,
      visual: [layer({ path: "/tmp/in.png" })],
      audio: [],
      outputPath: "/tmp/out.mp4",
    });
    expect(command.args).toContain("-an");
    expect(command.args).not.toContain("aac");
  });
});
