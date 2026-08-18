import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

function firstExisting(candidates: Array<string | null | undefined>): string | null {
  for (const candidate of candidates) {
    const value = candidate?.trim();
    if (value && fs.existsSync(value)) {
      return value;
    }
  }
  return null;
}

function lookupOnPath(binary: string): string | null {
  const command = process.platform === "win32" ? "where" : "which";
  const result = spawnSync(command, [binary], {
    encoding: "utf8",
    windowsHide: true,
  });
  if (result.status !== 0) {
    return null;
  }
  const line = String(result.stdout || "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .find(Boolean);
  return line && fs.existsSync(line) ? line : null;
}

export function resolveFfmpegPath(explicit?: string | null): string | null {
  return firstExisting([explicit, process.env.FFMPEG_PATH, lookupOnPath("ffmpeg")]);
}

export function resolveFfprobePath(explicit?: string | null, ffmpegPath?: string | null): string | null {
  const sibling =
    ffmpegPath && fs.existsSync(ffmpegPath)
      ? path.join(path.dirname(ffmpegPath), process.platform === "win32" ? "ffprobe.exe" : "ffprobe")
      : null;
  return firstExisting([
    explicit,
    process.env.FFPROBE_PATH,
    sibling,
    lookupOnPath("ffprobe"),
  ]);
}

export function describeBinaryAvailability(input?: {
  ffmpegPath?: string | null;
  ffprobePath?: string | null;
}): { ffmpeg: string | null; ffprobe: string | null } {
  const ffmpeg = resolveFfmpegPath(input?.ffmpegPath);
  return {
    ffmpeg,
    ffprobe: resolveFfprobePath(input?.ffprobePath, ffmpeg),
  };
}
