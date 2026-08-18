import { Injectable } from "@nestjs/common";
import { spawn } from "node:child_process";
import { parseFfmpegProgress, sanitizeRenderDiagnostic } from "@ai-drama-studio/core";

export interface FfmpegRunInput {
  renderId: string;
  ffmpegPath: string;
  args: string[];
  durationSeconds: number;
  onProgress?: (ratio: number | null, outTimeSeconds: number | null) => void;
}

export interface FfmpegRunResult {
  exitCode: number | null;
  cancelled: boolean;
  stderr: string;
}

@Injectable()
export class FFmpegService {
  private readonly processes = new Map<string, ReturnType<typeof spawn>>();
  private readonly cancelled = new Set<string>();

  async run(input: FfmpegRunInput): Promise<FfmpegRunResult> {
    this.cancelled.delete(input.renderId);
    return new Promise((resolve, reject) => {
      const child = spawn(input.ffmpegPath, input.args, {
        windowsHide: true,
        stdio: ["ignore", "pipe", "pipe"],
      });
      this.processes.set(input.renderId, child);
      let stderr = "";
      let stdout = "";

      child.stdout?.on("data", (chunk: Buffer) => {
        stdout += chunk.toString("utf8");
        const parsed = parseFfmpegProgress(stdout, input.durationSeconds);
        if (parsed.ratio != null || parsed.ended) {
          input.onProgress?.(parsed.ended ? 1 : parsed.ratio, parsed.outTimeSeconds);
        }
        if (stdout.length > 8000) {
          stdout = stdout.slice(-4000);
        }
      });
      child.stderr?.on("data", (chunk: Buffer) => {
        stderr = sanitizeRenderDiagnostic(stderr + chunk.toString("utf8"), 8000);
      });
      child.on("error", (error) => {
        this.processes.delete(input.renderId);
        reject(error);
      });
      child.on("close", (code) => {
        this.processes.delete(input.renderId);
        resolve({
          exitCode: code,
          cancelled: this.cancelled.has(input.renderId),
          stderr,
        });
      });
    });
  }

  async cancel(renderId: string): Promise<boolean> {
    this.cancelled.add(renderId);
    const child = this.processes.get(renderId);
    if (!child || child.killed) {
      return false;
    }
    child.kill();
    await new Promise((resolve) => setTimeout(resolve, 250));
    if (!child.killed && child.exitCode == null) {
      child.kill("SIGKILL");
    }
    return true;
  }

  hasActiveProcess(renderId: string): boolean {
    return this.processes.has(renderId);
  }
}
