import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import { sanitizeRenderDiagnostic } from "@ai-drama-studio/core";

export interface ProbeResult {
  durationSeconds: number | null;
  width: number | null;
  height: number | null;
  fps: number | null;
  fileSize: number;
  videoCodec: string | null;
  audioCodec: string | null;
  mimeType: string;
}

function parseFps(value: string | undefined): number | null {
  if (!value) {
    return null;
  }
  const [a, b] = value.split("/");
  const num = Number(a);
  const den = Number(b || 1);
  if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) {
    return null;
  }
  return num / den;
}

export async function probeMediaFile(ffprobePath: string, filePath: string): Promise<ProbeResult> {
  const stat = await fs.stat(filePath);
  const json = await new Promise<string>((resolve, reject) => {
    const child = spawn(
      ffprobePath,
      ["-v", "error", "-print_format", "json", "-show_format", "-show_streams", filePath],
      { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] },
    );
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(sanitizeRenderDiagnostic(stderr || `ffprobe exit ${code}`)));
        return;
      }
      resolve(stdout);
    });
  });
  const parsed = JSON.parse(json) as {
    format?: { duration?: string };
    streams?: Array<{
      codec_type?: string;
      codec_name?: string;
      width?: number;
      height?: number;
      avg_frame_rate?: string;
      r_frame_rate?: string;
    }>;
  };
  const video = parsed.streams?.find((item) => item.codec_type === "video");
  const audio = parsed.streams?.find((item) => item.codec_type === "audio");
  return {
    durationSeconds: parsed.format?.duration ? Number(parsed.format.duration) : null,
    width: video?.width ?? null,
    height: video?.height ?? null,
    fps: parseFps(video?.avg_frame_rate) || parseFps(video?.r_frame_rate),
    fileSize: stat.size,
    videoCodec: video?.codec_name ?? null,
    audioCodec: audio?.codec_name ?? null,
    mimeType: "video/mp4",
  };
}
