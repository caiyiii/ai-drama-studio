import { describe, expect, it } from "vitest";
import {
  resolveEpisodeNextAction,
  resolveEpisodeProductionProgress,
  resolveEpisodeProductionStage,
  resolveEpisodeReadiness,
} from "@ai-drama-studio/core";
import {
  EpisodeNextActionType,
  EpisodeProductionStage,
  RenderJobStatus,
  ScriptStatus,
  StoryboardStatus,
  TimelineStatus,
  type EpisodeProductionInput,
} from "@ai-drama-studio/types";

function input(over: Partial<EpisodeProductionInput> = {}): EpisodeProductionInput {
  return {
    episode: { id: "ep-1", status: "DRAFT" as const },
    plan: { ready: false },
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

const scriptReady = { status: ScriptStatus.READY, sceneCount: 3 };
const boardReady = { status: StoryboardStatus.READY, shotCount: 5 };
const visualsComplete = {
  shotCount: 5,
  visualReadyCount: 5,
  imageReadyCount: 5,
  videoReadyCount: 2,
  missingCount: 0,
};
const visualsPartial = {
  shotCount: 5,
  visualReadyCount: 4,
  imageReadyCount: 4,
  videoReadyCount: 2,
  missingCount: 1,
  missing: [{ shotId: "shot-3", shotNumber: 3 }],
};
const audioComplete = {
  voice: { dialogueTotal: 8, dialogueReadyCount: 8 },
  audio: { musicReady: true, musicReadyCount: 1, musicExpected: 1, sfxReady: true, sfxReadyCount: 5, sfxExpected: 5 },
};

describe("resolveEpisodeProductionStage / nextAction", () => {
  it("Empty Episode -> PLANNING", () => {
    expect(resolveEpisodeProductionStage(input())).toBe(EpisodeProductionStage.PLANNING);
    expect(resolveEpisodeNextAction(input()).type).toBe(EpisodeNextActionType.EDIT_PLAN);
  });

  it("Episode Plan Ready -> SCRIPTING / GENERATE_SCRIPT", () => {
    const value = input({ plan: { ready: true } });
    expect(resolveEpisodeProductionStage(value)).toBe(EpisodeProductionStage.SCRIPTING);
    expect(resolveEpisodeNextAction(value).type).toBe(EpisodeNextActionType.GENERATE_SCRIPT);
  });

  it("Script Draft -> CONFIRM_SCRIPT", () => {
    const value = input({
      plan: { ready: true },
      script: { status: ScriptStatus.DRAFT, sceneCount: 2 },
    });
    expect(resolveEpisodeProductionStage(value)).toBe(EpisodeProductionStage.SCRIPTING);
    expect(resolveEpisodeNextAction(value).type).toBe(EpisodeNextActionType.CONFIRM_SCRIPT);
  });

  it("Script Confirmed -> STORYBOARDING", () => {
    const value = input({ plan: { ready: true }, script: scriptReady });
    expect(resolveEpisodeProductionStage(value)).toBe(EpisodeProductionStage.STORYBOARDING);
    expect(resolveEpisodeNextAction(value).type).toBe(EpisodeNextActionType.GENERATE_STORYBOARD);
  });

  it("Storyboard Confirmed -> VISUAL_ASSETS", () => {
    const value = input({ plan: { ready: true }, script: scriptReady, storyboard: boardReady });
    expect(resolveEpisodeProductionStage(value)).toBe(EpisodeProductionStage.VISUAL_ASSETS);
  });

  it("Partial Visual Assets -> VISUAL_ASSETS", () => {
    const value = input({
      plan: { ready: true },
      script: scriptReady,
      storyboard: boardReady,
      visuals: visualsPartial,
    });
    expect(resolveEpisodeProductionStage(value)).toBe(EpisodeProductionStage.VISUAL_ASSETS);
    expect(resolveEpisodeNextAction(value).type).toBe(
      EpisodeNextActionType.GENERATE_MISSING_VISUAL_ASSETS,
    );
  });

  it("Visual Complete -> AUDIO_ASSETS", () => {
    const value = input({
      plan: { ready: true },
      script: scriptReady,
      storyboard: boardReady,
      visuals: visualsComplete,
    });
    expect(resolveEpisodeProductionStage(value)).toBe(EpisodeProductionStage.AUDIO_ASSETS);
  });

  it("Partial Audio -> AUDIO_ASSETS", () => {
    const value = input({
      plan: { ready: true },
      script: scriptReady,
      storyboard: boardReady,
      visuals: visualsComplete,
      voice: { dialogueTotal: 8, dialogueReadyCount: 6, missing: [{ blockId: "b8" }] },
      audio: { musicReady: true, musicReadyCount: 1, musicExpected: 1 },
    });
    expect(resolveEpisodeProductionStage(value)).toBe(EpisodeProductionStage.AUDIO_ASSETS);
    expect(resolveEpisodeNextAction(value).type).toBe(
      EpisodeNextActionType.GENERATE_MISSING_AUDIO_ASSETS,
    );
  });

  it("Timeline Draft -> COMPOSING", () => {
    const value = input({
      plan: { ready: true },
      script: scriptReady,
      storyboard: boardReady,
      visuals: visualsComplete,
      ...audioComplete,
      timeline: { status: TimelineStatus.DRAFT, computedStatus: TimelineStatus.DRAFT, stale: false },
    });
    expect(resolveEpisodeProductionStage(value)).toBe(EpisodeProductionStage.COMPOSING);
    expect(resolveEpisodeNextAction(value).type).toBe(EpisodeNextActionType.LOCK_TIMELINE);
  });

  it("Timeline Locked -> READY_TO_RENDER", () => {
    const value = input({
      plan: { ready: true },
      script: scriptReady,
      storyboard: boardReady,
      visuals: visualsComplete,
      ...audioComplete,
      timeline: { status: TimelineStatus.LOCKED, computedStatus: TimelineStatus.LOCKED, stale: false },
    });
    expect(resolveEpisodeProductionStage(value)).toBe(EpisodeProductionStage.READY_TO_RENDER);
    expect(resolveEpisodeNextAction(value).type).toBe(EpisodeNextActionType.RENDER_EPISODE);
  });

  it("Render Queued -> RENDERING", () => {
    const value = input({
      plan: { ready: true },
      script: scriptReady,
      storyboard: boardReady,
      visuals: visualsComplete,
      ...audioComplete,
      timeline: { status: TimelineStatus.LOCKED, computedStatus: TimelineStatus.LOCKED, stale: false },
      render: { status: RenderJobStatus.QUEUED },
    });
    expect(resolveEpisodeProductionStage(value)).toBe(EpisodeProductionStage.RENDERING);
    expect(resolveEpisodeNextAction(value).type).toBe(EpisodeNextActionType.VIEW_RENDER_JOB);
  });

  it("Render Success -> COMPLETED", () => {
    const value = input({
      plan: { ready: true },
      script: { status: ScriptStatus.LOCKED, sceneCount: 3 },
      storyboard: { status: StoryboardStatus.LOCKED, shotCount: 5 },
      visuals: visualsComplete,
      ...audioComplete,
      timeline: { status: TimelineStatus.LOCKED, computedStatus: TimelineStatus.LOCKED, stale: false },
      render: { status: RenderJobStatus.SUCCEEDED },
    });
    expect(resolveEpisodeProductionStage(value)).toBe(EpisodeProductionStage.COMPLETED);
    expect(resolveEpisodeNextAction(value).type).toBe(EpisodeNextActionType.VIEW_EPISODE);
  });

  it("Render Failure -> Retry", () => {
    const value = input({
      plan: { ready: true },
      script: scriptReady,
      storyboard: boardReady,
      visuals: visualsComplete,
      ...audioComplete,
      timeline: { status: TimelineStatus.LOCKED, computedStatus: TimelineStatus.LOCKED, stale: false },
      render: { status: RenderJobStatus.FAILED },
    });
    expect(resolveEpisodeProductionStage(value)).toBe(EpisodeProductionStage.READY_TO_RENDER);
    expect(resolveEpisodeNextAction(value).type).toBe(EpisodeNextActionType.RETRY_RENDER);
  });

  it("Script modification -> Storyboard stale stays STORYBOARDING", () => {
    const value = input({
      plan: { ready: true },
      script: scriptReady,
      storyboard: { status: StoryboardStatus.STALE, shotCount: 5, stale: true },
    });
    expect(resolveEpisodeProductionStage(value)).toBe(EpisodeProductionStage.STORYBOARDING);
  });

  it("Storyboard modification -> Timeline stale blocks render", () => {
    const value = input({
      plan: { ready: true },
      script: scriptReady,
      storyboard: boardReady,
      visuals: visualsComplete,
      ...audioComplete,
      timeline: {
        status: TimelineStatus.LOCKED,
        computedStatus: TimelineStatus.STALE,
        stale: true,
      },
    });
    expect(resolveEpisodeProductionStage(value)).toBe(EpisodeProductionStage.COMPOSING);
    expect(resolveEpisodeReadiness(value).canRender).toBe(false);
    expect(resolveEpisodeReadiness(value).renderBlockedReason).toContain("过期");
  });

  it("Timeline stale -> Render blocked", () => {
    const value = input({
      plan: { ready: true },
      script: scriptReady,
      storyboard: boardReady,
      visuals: visualsComplete,
      ...audioComplete,
      timeline: { status: TimelineStatus.LOCKED, computedStatus: TimelineStatus.LOCKED, stale: true },
    });
    expect(resolveEpisodeReadiness(value).canRender).toBe(false);
  });

  it("Missing visual -> Render blocked", () => {
    const value = input({
      plan: { ready: true },
      script: scriptReady,
      storyboard: boardReady,
      visuals: visualsPartial,
      ...audioComplete,
      timeline: { status: TimelineStatus.LOCKED, computedStatus: TimelineStatus.LOCKED, stale: false },
    });
    expect(resolveEpisodeReadiness(value).canRender).toBe(false);
    expect(resolveEpisodeReadiness(value).renderBlockedReason).toContain("Shot 003");
  });

  it("Missing required dialogue -> Render blocked", () => {
    const value = input({
      plan: { ready: true },
      script: scriptReady,
      storyboard: boardReady,
      visuals: visualsComplete,
      voice: {
        dialogueTotal: 8,
        dialogueReadyCount: 7,
        missing: [{ blockId: "b8", blockIndex: 8 }],
        missingRequired: true,
      },
      audio: { musicReady: true, musicReadyCount: 1, musicExpected: 1 },
      timeline: { status: TimelineStatus.LOCKED, computedStatus: TimelineStatus.LOCKED, stale: false },
    });
    expect(resolveEpisodeReadiness(value).canRender).toBe(false);
    expect(resolveEpisodeReadiness(value).renderBlockedReason).toContain("ScriptBlock 08");
  });

  it("returns seven production progress items", () => {
    expect(resolveEpisodeProductionProgress(input())).toHaveLength(7);
  });
});
