import { describe, expect, it } from "vitest";
import type { SeasonGenerationResult } from "@ai-drama-studio/types";
import { AiProviderError } from "../../ai/ai.errors";
import { validateSeasonOutlineGenerationResult } from "./season-outline-generation.schema";

export const validSeasonOutlineGeneration: SeasonGenerationResult = {
  season: {
    title: "星河初遇",
    synopsis: "碰撞后的第一次接触。",
    coreConflict: "修仙与赛博无法互相理解。",
    beginning: "星图失效。",
    middle: "接触与误判。",
    ending: "临时盟友。",
  },
  existingEpisodes: [
    {
      number: 1,
      title: "已存在的第一集",
      synopsis: "旧剧集不会被覆盖。",
    },
  ],
  newEpisodes: [
    {
      number: 1,
      title: "星系碰撞",
      synopsis: "星轨被改写。",
      outline: "沈星河目睹星图撕裂。",
      keyCharacters: ["沈星河"],
      keyLocations: ["折剑星"],
      conflict: "生存",
      cliffhanger: "未知信号靠近",
      storyStateChanges: {
        characters: [{ name: "沈星河", state: "炼气三层", location: "折剑星" }],
        worldChanges: ["星图失效"],
        unresolvedThreads: ["谁改写了星轨"],
        foreshadowing: ["义体舰队的影子"],
      },
    },
    {
      number: 2,
      title: "第一次接触",
      synopsis: "两种文明第一次看见彼此。",
      outline: "艾尔坠落折剑星。",
      keyCharacters: ["沈星河", "艾尔"],
      keyLocations: ["折剑星"],
      conflict: "信任",
      cliffhanger: "宗门发现外来者",
      storyStateChanges: {
        unresolvedThreads: ["艾尔的真实任务"],
        foreshadowing: [],
      },
    },
    {
      number: 3,
      title: "临时盟友",
      synopsis: "共同面对第三股力量。",
      outline: "太虚真人介入。",
      keyCharacters: ["沈星河", "艾尔", "太虚真人"],
      keyLocations: ["问天宗"],
      conflict: "立场",
      cliffhanger: "议会舰队抵达",
      storyStateChanges: {
        unresolvedThreads: ["临时盟约能维持多久"],
      },
    },
  ],
};

describe("Season outline generation schema", () => {
  it("accepts a valid structured result", () => {
    const result = validateSeasonOutlineGenerationResult(validSeasonOutlineGeneration);
    expect(result.existingEpisodes).toHaveLength(1);
    expect(result.newEpisodes).toHaveLength(3);
  });

  it("rejects unknown fields", () => {
    expect(() =>
      validateSeasonOutlineGenerationResult({
        ...validSeasonOutlineGeneration,
        extra: true,
      }),
    ).toThrow(/未定义字段/);
  });

  it("rejects duplicate episode numbers", () => {
    expect(() =>
      validateSeasonOutlineGenerationResult({
        ...validSeasonOutlineGeneration,
        newEpisodes: [
          validSeasonOutlineGeneration.newEpisodes[0],
          { ...validSeasonOutlineGeneration.newEpisodes[1], number: 1 },
        ],
      }),
    ).toThrow(AiProviderError);
  });
});
