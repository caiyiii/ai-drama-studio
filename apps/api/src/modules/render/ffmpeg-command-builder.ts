import { parseResolution, type RenderLayerClip } from "@ai-drama-studio/core";
import type { RenderManifestSnapshot } from "@ai-drama-studio/types";

export interface PreparedRenderInput {
  clipId: string;
  path: string;
  kind: "video" | "image" | "audio";
}

export interface FfmpegCommandBuildInput {
  manifest: RenderManifestSnapshot;
  visual: Array<RenderLayerClip & { path: string }>;
  audio: Array<RenderLayerClip & { path: string }>;
  outputPath: string;
}

export interface FfmpegCommand {
  args: string[];
  filterComplex: string;
  hasAudio: boolean;
}

function num(value: number, digits = 3): string {
  return Number(value).toFixed(digits).replace(/\.?0+$/, "") || "0";
}

export function buildFfmpegCommand(input: FfmpegCommandBuildInput): FfmpegCommand {
  const { width, height } = parseResolution(input.manifest.resolution);
  const fps = Number(input.manifest.fps);
  const duration = Number(input.manifest.durationSeconds);
  const args: string[] = [
    "-y",
    "-hide_banner",
    "-loglevel",
    "error",
    "-progress",
    "pipe:1",
    "-nostats",
  ];

  for (const clip of input.visual) {
    if (clip.type === "IMAGE") {
      args.push("-loop", "1", "-framerate", String(fps), "-t", num(clip.duration), "-i", clip.path);
    } else {
      args.push("-i", clip.path);
    }
  }
  for (const clip of input.audio) {
    args.push("-i", clip.path);
  }

  const filters: string[] = [
    `color=c=black:s=${width}x${height}:d=${num(duration)}:r=${fps}[base]`,
  ];
  const overlayLabels: string[] = [];
  input.visual.forEach((clip, index) => {
    const label = `v${index}`;
    const start = Math.max(0, clip.sourceStartTime);
    const playDuration = Math.max(0.04, clip.duration);
    const speed = clip.speed > 0 ? clip.speed : 1;
    const opacity = clip.opacity >= 0 && clip.opacity <= 1 ? clip.opacity : 1;
    const parts = [
      `[${index}:v]scale=${width}:${height}:force_original_aspect_ratio=decrease`,
      `pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`,
      "setsar=1",
      `fps=${fps}`,
      `trim=start=${num(start)}:duration=${num(playDuration * speed)}`,
      "setpts=PTS-STARTPTS",
    ];
    if (speed !== 1) {
      parts.push(`setpts=PTS/${num(speed, 4)}`);
    }
    if (opacity < 1) {
      parts.push("format=rgba", `colorchannelmixer=aa=${num(opacity, 4)}`);
    }
    filters.push(`${parts.join(",")}[${label}]`);
    overlayLabels.push(label);
  });

  let last = "base";
  overlayLabels.forEach((label, index) => {
    const clip = input.visual[index];
    const start = Math.max(0, clip.startTime);
    const end = start + Math.max(0.04, clip.duration);
    const next = index === overlayLabels.length - 1 ? "voutpre" : `o${index}`;
    filters.push(
      `[${last}][${label}]overlay=0:0:enable='between(t,${num(start)},${num(end)})'[${next}]`,
    );
    last = next;
  });
  filters.push(`[${last}]format=yuv420p[vout]`);

  const audioLabels: string[] = [];
  input.audio.forEach((clip, audioIndex) => {
    const inputIndex = input.visual.length + audioIndex;
    const label = `a${audioIndex}`;
    const start = Math.max(0, clip.sourceStartTime);
    const playDuration = Math.max(0.04, clip.duration);
    const delayMs = Math.max(0, Math.round(clip.startTime * 1000));
    const volume = clip.playbackVolume > 0 ? clip.playbackVolume : clip.volume;
    const parts = [
      `[${inputIndex}:a]atrim=start=${num(start)}:duration=${num(playDuration)}`,
      "asetpts=PTS-STARTPTS",
      `volume=${num(volume, 4)}`,
    ];
    if (delayMs > 0) {
      parts.push(`adelay=${delayMs}|${delayMs}`);
    }
    filters.push(`${parts.join(",")}[${label}]`);
    audioLabels.push(label);
  });

  if (audioLabels.length === 1) {
    filters.push(`[${audioLabels[0]}]anull[aout]`);
  } else if (audioLabels.length > 1) {
    filters.push(
      `${audioLabels.map((label) => `[${label}]`).join("")}amix=inputs=${audioLabels.length}:duration=longest:dropout_transition=0:normalize=0[aout]`,
    );
  }

  const filterComplex = filters.join(";");
  args.push("-filter_complex", filterComplex, "-map", "[vout]");
  if (audioLabels.length > 0) {
    args.push("-map", "[aout]", "-c:a", "aac", "-b:a", "192k");
  } else {
    args.push("-an");
  }
  args.push(
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-preset",
    "veryfast",
    "-crf",
    "23",
    "-r",
    String(fps),
    "-movflags",
    "+faststart",
    "-t",
    num(duration),
    input.outputPath,
  );

  return {
    args,
    filterComplex,
    hasAudio: audioLabels.length > 0,
  };
}

export function assertArgvSafe(args: string[]): void {
  if (!Array.isArray(args) || args.some((item) => typeof item !== "string")) {
    throw new Error("FFmpeg args must be a string array");
  }
}
