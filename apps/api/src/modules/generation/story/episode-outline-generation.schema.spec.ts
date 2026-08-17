import { describe, expect, it } from "vitest";
import type { EpisodeGenerationResult } from "@ai-drama-studio/types";
import { AiProviderError } from "../../ai/ai.errors";
import { validateEpisodeOutlineGenerationResult } from "./episode-outline-generation.schema";

export const validEpisodeOutlineGeneration: EpisodeGenerationResult = {
  title: "星系碰撞",
  synopsis: "星图失效，沈星河第一次看见另一文明。",
  outline: "以折剑星夜空裂开作为开场，以未知信号作为收束。",
  opening: "星轨撕裂。",
  middle: "宗门震动，沈星河被派去查探。",
  ending: "信号降落。",
  cliffhanger: "一个义体人从火光中站起。",
  keyCharacters: ["沈星河", "太虚真人"],
  keyLocations: ["折剑星", "问天宗"],
  conflict: "未知灾难与宗门秩序",
  storyState: {
    characters: [{ name: "沈星河", state: "炼气三层", location: "折剑星" }],
    worldChanges: ["星图失效"],
    unresolvedThreads: ["信号来源"],
    revealedSecrets: [],
    foreshadowing: ["义体舰队"],
  },
};

describe("Episode outline generation schema", () => {
  it("accepts a valid structured result", () => {
    expect(validateEpisodeOutlineGenerationResult(validEpisodeOutlineGeneration).title).toBe(
      "星系碰撞",
    );
  });

  it("rejects unknown fields", () => {
    expect(() =>
      validateEpisodeOutlineGenerationResult({
        ...validEpisodeOutlineGeneration,
        dialogue: "这不是剧本",
      }),
    ).toThrow(/未定义字段/);
  });

  it("rejects missing required title", () => {
    expect(() =>
      validateEpisodeOutlineGenerationResult({
        ...validEpisodeOutlineGeneration,
        title: "",
      }),
    ).toThrow(AiProviderError);
  });
});
