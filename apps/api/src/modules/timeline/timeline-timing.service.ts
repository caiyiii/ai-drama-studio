import { Injectable } from "@nestjs/common";
import {
  calculateDialogueTimeline,
  calculateSceneTimeline,
  calculateShotTimeline,
  calculateTimelineDuration,
  resolveSfxStartTime,
  truncateToTimelineDuration,
  type SceneTimelineEntry,
  type ShotTimelineEntry,
  type ShotTimingInput,
} from "@ai-drama-studio/core";

@Injectable()
export class TimelineTimingService {
  shotTimeline(shots: ShotTimingInput[]): ShotTimelineEntry[] {
    return calculateShotTimeline(shots);
  }

  sceneTimeline(shots: ShotTimelineEntry[]): SceneTimelineEntry[] {
    return calculateSceneTimeline(shots);
  }

  dialogueTimeline(input: {
    blocks: Array<{ id: string; durationSeconds: number }>;
    shots: ShotTimelineEntry[];
  }) {
    return calculateDialogueTimeline(input);
  }

  timelineDuration(
    shots: ShotTimelineEntry[],
    clips: Array<{ startTime: number; duration: number }> = [],
  ): number {
    return calculateTimelineDuration(shots, clips);
  }

  musicDuration(assetDuration: number, timelineDuration: number): number {
    return truncateToTimelineDuration(assetDuration, timelineDuration);
  }

  sfxStartTime(input: {
    shotId?: string | null;
    sceneId?: string | null;
    shots: ShotTimelineEntry[];
    scenes: SceneTimelineEntry[];
  }): number {
    return resolveSfxStartTime(input);
  }
}
