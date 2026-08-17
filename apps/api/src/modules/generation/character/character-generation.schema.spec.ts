import { describe, expect, it } from "vitest";
import type { CharacterGenerationResult } from "@ai-drama-studio/types";
import { AiProviderError } from "../../ai/ai.errors";
import {
  CHARACTER_GENERATION_JSON_SCHEMA,
  validateCharacterGenerationResult,
} from "./character-generation.schema";

export const validCharacterGeneration: CharacterGenerationResult = {
  character: {
    name: "沈星河",
    alias: "星河",
    gender: "男",
    age: "19",
    race: "人族",
    identity: "问天宗外门弟子",
    role: "主角",
    personality: { traits: "隐忍、锋锐", summary: "外表克制，内心不服输" },
    appearance: { look: "青衫白发带", visualHook: "左眼有星纹" },
    background: "星系碰撞后被卷入修仙文明。",
    goal: "查清星河碰撞的源头",
    motivation: "守护折剑星上的普通人",
    conflict: "修炼与科技无法共存的信仰撕裂",
    abilities: ["星河剑意"],
    civilizationName: "修仙文明",
    factionName: "问天宗",
  },
  relationships: [
    {
      targetName: "太虚真人",
      type: "MASTER",
      label: "师徒",
      description: "授业与考验",
      strength: 5,
    },
  ],
};

describe("Character generation schema", () => {
  it("exposes a JSON Schema contract", () => {
    expect(CHARACTER_GENERATION_JSON_SCHEMA.required).toContain("character");
    expect(CHARACTER_GENERATION_JSON_SCHEMA.additionalProperties).toBe(false);
  });

  it("accepts a valid structured result", () => {
    expect(validateCharacterGenerationResult(validCharacterGeneration).character.name).toBe(
      "沈星河",
    );
  });

  it("rejects missing character fields", () => {
    expect(() =>
      validateCharacterGenerationResult({
        character: { name: "x" },
        relationships: [],
      }),
    ).toThrow(AiProviderError);
  });

  it("rejects unknown keys", () => {
    expect(() =>
      validateCharacterGenerationResult({
        ...validCharacterGeneration,
        extra: true,
      }),
    ).toThrow(/未定义字段/);
  });

  it("rejects personality as a string", () => {
    expect(() =>
      validateCharacterGenerationResult({
        ...validCharacterGeneration,
        character: {
          ...validCharacterGeneration.character,
          personality: "隐忍",
        },
      }),
    ).toThrow(/personality 必须是对象/);
  });
});
