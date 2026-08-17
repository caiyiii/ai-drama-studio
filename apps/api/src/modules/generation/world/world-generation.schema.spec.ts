import { describe, expect, it } from "vitest";
import type { WorldGenerationResult } from "@ai-drama-studio/types";
import {
  WORLD_GENERATION_JSON_SCHEMA,
  validateWorldGenerationResult,
} from "./world-generation.schema";
import { AiProviderError } from "../../ai/ai.errors";

const valid: WorldGenerationResult = {
  world: {
    name: "星河碰撞",
    description: "两个星系被强行拉近。",
    cosmicBackground: "轨道扰动撕裂旧星图。",
    coreConflict: "修仙与赛博选择了相反的生存道路。",
  },
  civilizations: [
    {
      name: "修仙文明",
      type: "修仙",
      description: "以自身为炉鼎。",
      philosophy: "问心问天。",
      society: "宗门。",
      culture: "剑与符。",
      technology: "星舟禁制。",
    },
  ],
  histories: [{ title: "碰撞", description: "星图失效", order: 0 }],
  factions: [
    { name: "问天宗", description: "反对义体", civilizationName: "修仙文明" },
  ],
  locations: [
    { name: "折剑星", description: "母星", civilizationName: "修仙文明" },
  ],
  powerSystems: [
    {
      name: "修仙体系",
      description: "灵气淬炼",
      rules: ["心魔更危险"],
      levels: [{ name: "炼气", description: "感应灵气" }],
    },
  ],
};

describe("World generation schema", () => {
  it("exposes a JSON Schema contract", () => {
    expect(WORLD_GENERATION_JSON_SCHEMA.required).toContain("world");
    expect(WORLD_GENERATION_JSON_SCHEMA.properties.world.required).toContain("name");
  });

  it("accepts a valid structured result", () => {
    expect(validateWorldGenerationResult(valid).world.name).toBe("星河碰撞");
  });

  it("rejects missing world fields", () => {
    expect(() =>
      validateWorldGenerationResult({
        ...valid,
        world: { name: "x" },
      }),
    ).toThrow(AiProviderError);
  });

  it("rejects unknown keys", () => {
    expect(() =>
      validateWorldGenerationResult({
        ...valid,
        extra: true,
      }),
    ).toThrow(/未定义字段/);
  });
});
