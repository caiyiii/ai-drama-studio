import { describe, expect, it } from "vitest";
import type { StoryBibleGenerationResult } from "@ai-drama-studio/types";
import { AiProviderError } from "../../ai/ai.errors";
import { validateStoryBibleGenerationResult } from "./story-bible-generation.schema";

export const validStoryBibleGeneration: StoryBibleGenerationResult = {
  title: "星河碰撞",
  logline: "两星系被强行拉近，修仙与赛博必须选择共存或毁灭。",
  premise: "碰撞不是天灾，而是有人改写了星轨。",
  theme: "文明冲突与共存",
  tone: "史诗",
  style: "科幻修仙",
  audience: "青年向",
  storyPromise: "用短剧节奏看见两种文明第一次真正接触。",
  rules: {
    worldRules: ["灵气与义体互斥"],
    characterRules: ["沈星河不能无故越境"],
    narrativeRules: ["每集必须留下未解线索"],
    forbidden: ["不要把 Story Bible 写成世界观副本"],
  },
  timelineSummary: "碰撞发生后三十日内的第一季。",
  continuityNotes: ["不能瞬移跨越星系"],
};

describe("Story Bible generation schema", () => {
  it("accepts a valid structured result", () => {
    expect(validateStoryBibleGenerationResult(validStoryBibleGeneration).title).toBe(
      "星河碰撞",
    );
  });

  it("rejects unknown fields", () => {
    expect(() =>
      validateStoryBibleGenerationResult({
        ...validStoryBibleGeneration,
        worldDump: true,
      }),
    ).toThrow(/未定义字段/);
  });

  it("rejects missing title", () => {
    expect(() =>
      validateStoryBibleGenerationResult({
        ...validStoryBibleGeneration,
        title: "",
      }),
    ).toThrow(AiProviderError);
  });
});
