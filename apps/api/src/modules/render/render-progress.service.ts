import { Injectable } from "@nestjs/common";
import {
  calculateRenderProgress,
  isProgressMonotonic,
} from "@ai-drama-studio/core";
import { RenderJobStage, RenderJobStatus } from "@ai-drama-studio/types";

@Injectable()
export class RenderProgressService {
  next(input: {
    status: RenderJobStatus;
    stage: RenderJobStage;
    ffmpegRatio?: number | null;
    previous?: number | null;
  }): number | null {
    const next = calculateRenderProgress({
      status: input.status,
      stage: input.stage,
      ffmpegRatio: input.ffmpegRatio,
    });
    if (!isProgressMonotonic(input.previous ?? null, next)) {
      return input.previous ?? next;
    }
    return next;
  }
}
