import { Injectable } from "@nestjs/common";
import fs from "node:fs/promises";
import { spawn } from "node:child_process";
import type { RenderResult } from "@ai-drama-studio/types";
import type { RenderLayerClip } from "@ai-drama-studio/core";
import { ErrorCodes } from "../../common/app-error";
import { assertArgvSafe, buildFfmpegCommand } from "./ffmpeg-command-builder";
import { resolveFfmpegPath, resolveFfprobePath } from "./ffmpeg-binaries";
import { probeMediaFile } from "./ffmpeg-probe";
import { FFmpegService } from "./ffmpeg.service";
import type { RenderManifestSnapshot } from "@ai-drama-studio/types";

export interface RenderEngine {
  render(input: LocalRenderInput): Promise<RenderResult>;
  cancel(renderId: string): Promise<void>;
}

export interface LocalRenderInput {
  renderId: string;
  manifest: RenderManifestSnapshot;
  visual: Array<RenderLayerClip & { path: string }>;
  audio: Array<RenderLayerClip & { path: string }>;
  outputPath: string;
  onProgress?: (ratio: number | null) => void;
  ffmpegPath?: string | null;
  ffprobePath?: string | null;
}

@Injectable()
export class LocalFfmpegRenderEngine implements RenderEngine {
  constructor(private readonly ffmpeg: FFmpegService) {}

  async render(input: LocalRenderInput): Promise<RenderResult> {
    const ffmpegPath =
      input.ffmpegPath === undefined ? resolveFfmpegPath() : input.ffmpegPath;
    if (!ffmpegPath) {
      return fail(ErrorCodes.FFMPEG_NOT_FOUND, "未找到 FFmpeg。请安装 FFmpeg 或配置 FFMPEG_PATH。");
    }
    const ffprobePath =
      input.ffprobePath === undefined
        ? resolveFfprobePath(undefined, ffmpegPath)
        : input.ffprobePath;
    if (!ffprobePath) {
      return fail(ErrorCodes.FFPROBE_NOT_FOUND, "未找到 FFprobe。请安装 FFmpeg 发行版或配置 FFPROBE_PATH。");
    }
    const hasEncoder = await encoderAvailable(ffmpegPath, "libx264");
    if (!hasEncoder) {
      return fail(ErrorCodes.FFMPEG_ENCODER_UNAVAILABLE, "当前 FFmpeg 不支持 libx264，无法输出 H.264 MP4。");
    }

    const command = buildFfmpegCommand({
      manifest: input.manifest,
      visual: input.visual,
      audio: input.audio,
      outputPath: input.outputPath,
    });
    assertArgvSafe(command.args);

    let result;
    try {
      result = await this.ffmpeg.run({
        renderId: input.renderId,
        ffmpegPath,
        args: command.args,
        durationSeconds: input.manifest.durationSeconds,
        onProgress: (ratio) => input.onProgress?.(ratio),
      });
    } catch (error) {
      return fail(
        ErrorCodes.FFMPEG_EXECUTION_FAILED,
        error instanceof Error ? error.message : "FFmpeg 启动失败",
      );
    }

    if (result.cancelled) {
      return fail(ErrorCodes.FFMPEG_CANCELLED, "渲染已被取消");
    }
    if (result.exitCode !== 0) {
      return fail(
        ErrorCodes.FFMPEG_EXECUTION_FAILED,
        result.stderr || `FFmpeg 退出码 ${result.exitCode}`,
      );
    }

    try {
      const stat = await fs.stat(input.outputPath);
      if (!stat.size) {
        return fail(ErrorCodes.RENDER_OUTPUT_INVALID, "输出文件为空");
      }
    } catch {
      return fail(ErrorCodes.RENDER_OUTPUT_NOT_FOUND, "未生成输出 MP4");
    }

    let probe;
    try {
      probe = await probeMediaFile(ffprobePath, input.outputPath);
    } catch (error) {
      return fail(
        ErrorCodes.RENDER_OUTPUT_INVALID,
        error instanceof Error ? error.message : "FFprobe 校验失败",
      );
    }
    if (!probe.videoCodec || !(probe.fileSize > 0)) {
      return fail(ErrorCodes.RENDER_OUTPUT_INVALID, "输出 MP4 缺少有效视频流");
    }

    return {
      success: true,
      outputPath: input.outputPath,
      durationSeconds: probe.durationSeconds ?? input.manifest.durationSeconds,
      width: probe.width ?? undefined,
      height: probe.height ?? undefined,
      fps: probe.fps ?? input.manifest.fps,
      fileSize: probe.fileSize,
      videoCodec: probe.videoCodec,
      audioCodec: probe.audioCodec,
    };
  }

  async cancel(renderId: string): Promise<void> {
    await this.ffmpeg.cancel(renderId);
  }
}

function fail(code: string, message: string): RenderResult {
  return { success: false, error: { code, message } };
}

async function encoderAvailable(ffmpegPath: string, encoder: string): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn(ffmpegPath, ["-hide_banner", "-encoders"], {
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });
    child.on("error", () => resolve(false));
    child.on("close", () => {
      resolve(stdout.includes(encoder));
    });
  });
}
