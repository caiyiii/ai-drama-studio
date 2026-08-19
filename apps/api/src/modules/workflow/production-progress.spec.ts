import { describe, expect, it } from "vitest";
import {
  getEpisodeNextStep,
  getEpisodeProductionProgress,
} from "@ai-drama-studio/core";
import {
  EpisodeProductionStep,
  RenderJobStatus,
  ScriptStatus,
  StoryboardStatus,
  TimelineStatus,
  type EpisodeProductionInput,
} from "@ai-drama-studio/types";

function input(over: Partial<EpisodeProductionInput> = {}): EpisodeProductionInput {
  return {
    episode: { id: "ep-1", status: "DRAFT" as const },
    script: null,
    storyboard: null,
    visuals: null,
    voice: null,
    audio: null,
    timeline: null,
    render: null,
    ...over,
  };
}

describe("episode production progress", () => {
  it("Empty Episode -> OVERVIEW (planning)", () => {
    expect(getEpisodeNextStep(input()).step).toBe(EpisodeProductionStep.OVERVIEW);
  });

  it("Script ready -> STORYBOARD", () => {
    expect(
      getEpisodeNextStep(
        input({
          plan: { ready: true },
          script: { status: ScriptStatus.READY, sceneCount: 3 },
        }),
      ).step,
    ).toBe(EpisodeProductionStep.STORYBOARD);
  });

  it("Storyboard ready -> VISUALS", () => {
    expect(
      getEpisodeNextStep(
        input({
          script: { status: ScriptStatus.READY, sceneCount: 3 },
          storyboard: { status: StoryboardStatus.READY, shotCount: 8 },
        }),
      ).step,
    ).toBe(EpisodeProductionStep.VISUALS);
  });

  it("Visual ready -> AUDIO", () => {
    expect(
      getEpisodeNextStep(
        input({
          script: { status: ScriptStatus.READY, sceneCount: 3 },
          storyboard: { status: StoryboardStatus.READY, shotCount: 8 },
          visuals: { imageReadyCount: 3, videoReadyCount: 1 },
        }),
      ).step,
    ).toBe(EpisodeProductionStep.AUDIO);
  });

  it("Voice ready -> AUDIO", () => {
    expect(
      getEpisodeNextStep(
        input({
          script: { status: ScriptStatus.READY, sceneCount: 3 },
          storyboard: { status: StoryboardStatus.READY, shotCount: 8 },
          visuals: { imageReadyCount: 3, videoReadyCount: 1 },
          voice: { dialogueReadyCount: 5 },
        }),
      ).step,
    ).toBe(EpisodeProductionStep.AUDIO);
  });

  it("Audio ready -> TIMELINE", () => {
    expect(
      getEpisodeNextStep(
        input({
          script: { status: ScriptStatus.READY, sceneCount: 3 },
          storyboard: { status: StoryboardStatus.READY, shotCount: 8 },
          visuals: { imageReadyCount: 3, videoReadyCount: 1 },
          voice: { dialogueReadyCount: 5 },
          audio: { musicReady: true, sfxReady: false },
        }),
      ).step,
    ).toBe(EpisodeProductionStep.TIMELINE);
  });

  it("Timeline preview ready -> TIMELINE", () => {
    expect(
      getEpisodeNextStep(
        input({
          script: { status: ScriptStatus.READY, sceneCount: 3 },
          storyboard: { status: StoryboardStatus.READY, shotCount: 8 },
          visuals: { imageReadyCount: 3, videoReadyCount: 1 },
          voice: { dialogueReadyCount: 5 },
          audio: { musicReady: true, sfxReady: false },
          timeline: { status: TimelineStatus.PREVIEW_READY, computedStatus: TimelineStatus.PREVIEW_READY, stale: false },
        }),
      ).step,
    ).toBe(EpisodeProductionStep.TIMELINE);
  });

  it("Timeline locked -> RENDER", () => {
    expect(
      getEpisodeNextStep(
        input({
          script: { status: ScriptStatus.READY, sceneCount: 3 },
          storyboard: { status: StoryboardStatus.READY, shotCount: 8 },
          visuals: { imageReadyCount: 3, videoReadyCount: 1 },
          voice: { dialogueReadyCount: 5 },
          audio: { musicReady: true, sfxReady: true },
          timeline: { status: TimelineStatus.LOCKED, computedStatus: TimelineStatus.LOCKED, stale: false },
        }),
      ).step,
    ).toBe(EpisodeProductionStep.RENDER);
  });

  it("Render success -> COMPLETE", () => {
    expect(
      getEpisodeNextStep(
        input({
          script: { status: ScriptStatus.LOCKED, sceneCount: 3 },
          storyboard: { status: StoryboardStatus.LOCKED, shotCount: 8 },
          visuals: { imageReadyCount: 3, videoReadyCount: 1 },
          voice: { dialogueReadyCount: 5 },
          audio: { musicReady: true, sfxReady: true },
          timeline: { status: TimelineStatus.LOCKED, computedStatus: TimelineStatus.LOCKED, stale: false },
          render: { status: RenderJobStatus.SUCCEEDED },
        }),
      ).step,
    ).toBe(EpisodeProductionStep.COMPLETE);
  });

  it("returns seven visible progress steps", () => {
    expect(getEpisodeProductionProgress(input())).toHaveLength(7);
  });
});
