import { describe, expect, it } from "vitest";
import {
  getProjectStepPath,
  getWorkspaceSteps,
  isLegacyProjectProductionPath,
  resolveEpisodeNextAction,
  resolveLegacyProductionRedirect,
} from "@ai-drama-studio/core";
import { ProjectStep } from "@ai-drama-studio/types";

describe("Phase 15.5 workspace routing", () => {
  it("sidebar no longer exposes project-level script/storyboard/timeline/render", () => {
    const keys = getWorkspaceSteps().map((item) => item.key);
    expect(keys).toContain("seasons");
    expect(keys).toContain("episodes");
    expect(keys).not.toContain("script");
    expect(keys).not.toContain("storyboard");
    expect(keys).not.toContain("timeline");
    expect(keys).not.toContain("render");
  });

  it("legacy project production paths redirect to episode selector", () => {
    expect(isLegacyProjectProductionPath("script")).toBe(true);
    expect(resolveLegacyProductionRedirect("demo-xinghe", "script")).toBe(
      "/projects/demo-xinghe/episodes",
    );
    expect(resolveLegacyProductionRedirect("demo-xinghe", "storyboard")).toBe(
      "/projects/demo-xinghe/episodes",
    );
    expect(resolveLegacyProductionRedirect("demo-xinghe", "timeline")).toBe(
      "/projects/demo-xinghe/episodes",
    );
    expect(resolveLegacyProductionRedirect("demo-xinghe", "render")).toBe(
      "/projects/demo-xinghe/episodes",
    );
  });

  it("legacy production paths with episodeId redirect to episode-scoped routes", () => {
    expect(resolveLegacyProductionRedirect("demo-xinghe", "script", "demo-ep-01")).toBe(
      "/projects/demo-xinghe/episodes/demo-ep-01/script",
    );
    expect(resolveLegacyProductionRedirect("demo-xinghe", "render", "demo-ep-01")).toBe(
      "/projects/demo-xinghe/episodes/demo-ep-01/render",
    );
  });

  it("continue production for script/storyboard/render maps to episodes entry", () => {
    expect(getProjectStepPath(ProjectStep.SCRIPT)).toBe("episodes");
    expect(getProjectStepPath(ProjectStep.STORYBOARD)).toBe("episodes");
    expect(getProjectStepPath(ProjectStep.RENDER)).toBe("episodes");
  });

  it("E01 plan-ready state uses GENERATE_SCRIPT with explicit label", () => {
    const action = resolveEpisodeNextAction({
      episode: { id: "demo-ep-01", status: "DRAFT" },
      plan: { ready: true },
      script: null,
      storyboard: null,
      visuals: null,
      voice: null,
      audio: null,
      timeline: null,
      render: null,
    });
    expect(action.type).toBe("GENERATE_SCRIPT");
    expect(action.label).toBe("AI 生成剧本");
  });
});
