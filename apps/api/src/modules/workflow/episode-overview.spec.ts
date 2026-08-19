import { describe, expect, it } from "vitest";
import { EpisodeProductionStage, EpisodeStatus, SeasonStatus } from "@ai-drama-studio/types";
import { buildEpisodeOverview } from "../story/episode-overview.builder";

const episode = {
  id: "ep-1",
  projectId: "proj-a",
  seasonId: "season-a",
  number: 1,
  title: "星门初现",
  synopsis: null,
  outline: null,
  status: EpisodeStatus.DRAFT,
  durationSeconds: null,
  storyState: null,
  continuityNotes: null,
  metadata: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe("Episode Overview builder", () => {
  it("empty episode returns PLANNING without leaking secrets", () => {
    const overview = buildEpisodeOverview({
      season: { id: "season-a", number: 1, title: "第一季", status: SeasonStatus.DRAFT },
      episode,
      plan: {
        ready: false,
        goal: null,
        conflict: null,
        keyCharacters: [],
        keyLocations: [],
        mood: null,
        pace: null,
        opening: null,
        climax: null,
        ending: null,
        startState: null,
        endState: null,
        previousEpisode: null,
        nextEpisode: null,
      },
      script: null,
      storyboard: null,
      timeline: null,
      musicAssets: [],
      sfxAssets: [],
      renderJobs: [],
      generationTasks: [
        {
          id: "task-1",
          type: "SCRIPT",
          status: "SUCCEEDED",
          createdAt: new Date("2026-08-19T00:00:00.000Z"),
          encryptedApiKey: "sk-secret-should-not-leak",
        } as never,
      ],
    });
    expect(overview.productionStage).toBe(EpisodeProductionStage.PLANNING);
    expect(overview.nextAction.label).toContain("规划");
    expect(JSON.stringify(overview)).not.toContain("sk-secret");
    expect(JSON.stringify(overview)).not.toContain("encryptedApiKey");
    expect(overview.activity[0]?.label).toContain("剧本");
  });

  it("plan ready without script is SCRIPTING", () => {
    const overview = buildEpisodeOverview({
      season: { id: "season-a", number: 1, title: "第一季", status: SeasonStatus.DRAFT },
      episode: { ...episode, synopsis: "沈星河发现星门", outline: "开场夜课" },
      plan: {
        ready: true,
        goal: "发现星门",
        conflict: null,
        keyCharacters: [],
        keyLocations: [],
        mood: null,
        pace: null,
        opening: null,
        climax: null,
        ending: null,
        startState: null,
        endState: null,
        previousEpisode: null,
        nextEpisode: null,
      },
      script: null,
      storyboard: null,
      timeline: null,
      musicAssets: [],
      sfxAssets: [],
      renderJobs: [],
      generationTasks: [],
    });
    expect(overview.productionStage).toBe(EpisodeProductionStage.SCRIPTING);
    expect(overview.nextAction.type).toBe("GENERATE_SCRIPT");
    expect(overview.readiness.canGenerateScript).toBe(true);
  });
});
