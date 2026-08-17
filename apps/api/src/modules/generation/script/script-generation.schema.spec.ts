import { describe, expect, it } from "vitest";
import { ScriptBlockType, type ScriptGenerationResult } from "@ai-drama-studio/types";
import { AiProviderError } from "../../ai/ai.errors";
import {
  SCRIPT_GENERATION_JSON_SCHEMA,
  validateScriptGenerationResult,
} from "./script-generation.schema";

export const validScriptGeneration: ScriptGenerationResult = {
  script: {
    title: "星系碰撞",
    logline: "星图失效之夜，沈星河第一次看见无法用灵气解释的光芒。",
    summary: "问天宗夜课被星裂打断，太虚真人下令查探，未知信号降落折剑星。",
    estimatedDurationSeconds: 300,
  },
  scenes: [
    {
      number: 1,
      title: "问天宗夜课",
      location: "折剑星·问天宗外门",
      timeOfDay: "夜",
      summary: "夜课被星光打断。",
      purpose: "建立日常与灾难的落差。",
      conflict: "宗门秩序与未知天象。",
      estimatedDurationSeconds: 90,
      blocks: [
        {
          order: 1,
          type: ScriptBlockType.ACTION,
          characterName: "沈星河",
          content: "沈星河抬头望向天空，瞳孔收缩。",
          metadata: {},
        },
        {
          order: 2,
          type: ScriptBlockType.DIALOGUE,
          characterName: "沈星河",
          content: "那是什么？",
          metadata: { emotion: "震惊" },
        },
        {
          order: 3,
          type: ScriptBlockType.NARRATION,
          characterName: "",
          content: "天穹之上，一道裂缝缓缓出现。",
          metadata: {},
        },
        {
          order: 4,
          type: ScriptBlockType.DIRECTION,
          characterName: "",
          content: "镜头快速推近他的眼睛。",
          metadata: {},
        },
      ],
    },
  ],
};

describe("Script generation schema", () => {
  it("exposes a strict JSON Schema contract", () => {
    expect(SCRIPT_GENERATION_JSON_SCHEMA.additionalProperties).toBe(false);
    expect(SCRIPT_GENERATION_JSON_SCHEMA.required).toContain("script");
    expect(SCRIPT_GENERATION_JSON_SCHEMA.required).toContain("scenes");
  });

  it("accepts a valid structured result", () => {
    expect(validateScriptGenerationResult(validScriptGeneration).script.title).toBe(
      "星系碰撞",
    );
  });

  it("rejects unknown fields", () => {
    expect(() =>
      validateScriptGenerationResult({
        ...validScriptGeneration,
        extra: true,
      }),
    ).toThrow(/未定义字段/);
  });

  it("rejects invalid block types", () => {
    expect(() =>
      validateScriptGenerationResult({
        ...validScriptGeneration,
        scenes: [
          {
            ...validScriptGeneration.scenes[0],
            blocks: [
              {
                order: 1,
                type: "MONOLOGUE",
                characterName: "沈星河",
                content: "不对",
                metadata: {},
              },
            ],
          },
        ],
      }),
    ).toThrow(AiProviderError);
  });
});
