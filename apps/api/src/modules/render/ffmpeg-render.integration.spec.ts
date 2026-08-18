import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { emptyMissingAssets } from "@ai-drama-studio/core";
import {
  TimelineClipType,
  TimelineStatus,
  TimelineTrackType,
  type RenderManifestSnapshot,
} from "@ai-drama-studio/types";
import { ErrorCodes } from "../../common/app-error";
import { resolveFfmpegPath, resolveFfprobePath } from "./ffmpeg-binaries";
import { FFmpegService } from "./ffmpeg.service";
import { LocalFfmpegRenderEngine } from "./local-ffmpeg-render.engine";
import { probeMediaFile } from "./ffmpeg-probe";
import { spawn } from "node:child_process";

function run(bin: string, args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(bin, args, { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr || `exit ${code}`));
    });
  });
}

describe("ffmpeg render engine", () => {
  it("returns FFMPEG_NOT_FOUND without faking success", async () => {
    const engine = new LocalFfmpegRenderEngine(new FFmpegService());
    const result = await engine.render({
      renderId: "missing-ffmpeg",
      manifest: {
        episodeId: "ep",
        projectId: "p",
        timelineId: "t",
        version: 1,
        status: TimelineStatus.LOCKED,
        durationSeconds: 1,
        fps: 24,
        resolution: "320x180",
        aspectRatio: "16:9",
        missing: emptyMissingAssets(),
        assets: [],
        tracks: [],
      },
      visual: [],
      audio: [],
      outputPath: path.join(os.tmpdir(), "no.mp4"),
      ffmpegPath: null,
    });
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe(ErrorCodes.FFMPEG_NOT_FOUND);
  });

  const ffmpegPath = resolveFfmpegPath();
  const ffprobePath = resolveFfprobePath(undefined, ffmpegPath);
  const maybe = ffmpegPath && ffprobePath ? it : it.skip;

  maybe("renders a real mp4 from image + audio via ffmpeg", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ads-render-"));
    const image = path.join(dir, "frame.png");
    const audio = path.join(dir, "tone.wav");
    const output = path.join(dir, "episode.mp4");
    await run(ffmpegPath!, [
      "-y",
      "-f",
      "lavfi",
      "-i",
      "color=c=red:s=320x180:d=1:r=24",
      "-frames:v",
      "1",
      image,
    ]);
    await run(ffmpegPath!, ["-y", "-f", "lavfi", "-i", "sine=frequency=440:duration=1", audio]);
    const engine = new LocalFfmpegRenderEngine(new FFmpegService());
    const manifest: RenderManifestSnapshot = {
      episodeId: "ep",
      projectId: "p",
      timelineId: "t",
      version: 1,
      status: TimelineStatus.LOCKED,
      durationSeconds: 1,
      fps: 24,
      resolution: "320x180",
      aspectRatio: "16:9",
      missing: emptyMissingAssets(),
      assets: [],
      tracks: [],
    };
    const result = await engine.render({
      renderId: "it-1",
      manifest,
      visual: [
        {
          id: "v1",
          type: TimelineClipType.IMAGE,
          trackType: TimelineTrackType.IMAGE,
          assetId: "img",
          startTime: 0,
          duration: 1,
          sourceStartTime: 0,
          sourceDuration: 1,
          zIndex: 0,
          speed: 1,
          opacity: 1,
          volume: 1,
          playbackVolume: 1,
          mimeType: "image/png",
          path: image,
        },
      ],
      audio: [
        {
          id: "a1",
          type: TimelineClipType.AUDIO,
          trackType: TimelineTrackType.DIALOGUE,
          assetId: "tts",
          startTime: 0,
          duration: 1,
          sourceStartTime: 0,
          sourceDuration: 1,
          zIndex: 0,
          speed: 1,
          opacity: 1,
          volume: 1,
          playbackVolume: 1,
          mimeType: "audio/wav",
          path: audio,
        },
      ],
      outputPath: output,
      ffmpegPath,
      ffprobePath,
    });
    expect(result.success).toBe(true);
    const stat = await fs.stat(output);
    expect(stat.size).toBeGreaterThan(0);
    const probe = await probeMediaFile(ffprobePath!, output);
    expect(probe.videoCodec).toBeTruthy();
    expect(probe.durationSeconds).toBeGreaterThan(0);
    expect(probe.fileSize).toBeGreaterThan(0);
  }, 60_000);
});
