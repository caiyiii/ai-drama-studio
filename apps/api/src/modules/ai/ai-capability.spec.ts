import { AiCapability } from "@ai-drama-studio/types";
import {
  defaultProviderCapabilities,
  isAiCapability,
  isLegacyTextCapability,
  kindAllowsCapability,
  modelSupportsCapability,
  providerSupportsCapability,
} from "@ai-drama-studio/core";
import { describe, expect, it } from "vitest";

describe("AiCapability", () => {
  it("includes the full production capability set", () => {
    expect(Object.values(AiCapability)).toEqual([
      "CHAT",
      "STRUCTURED_OUTPUT",
      "IMAGE",
      "VIDEO",
      "IMAGE_TO_VIDEO",
      "TTS",
      "VOICE_CLONE",
      "MUSIC",
      "EMBEDDING",
    ]);
  });

  it("recognizes valid capability names", () => {
    expect(isAiCapability("CHAT")).toBe(true);
    expect(isAiCapability("IMAGE")).toBe(true);
    expect(isAiCapability("UNKNOWN")).toBe(false);
  });

  it("treats missing provider capabilities as CHAT and STRUCTURED_OUTPUT", () => {
    expect(providerSupportsCapability([], AiCapability.CHAT)).toBe(true);
    expect(providerSupportsCapability(null, AiCapability.STRUCTURED_OUTPUT)).toBe(true);
    expect(providerSupportsCapability([], AiCapability.IMAGE)).toBe(false);
  });

  it("checks enabled provider capability rows", () => {
    const rows = [
      { capability: "CHAT", enabled: true },
      { capability: "STRUCTURED_OUTPUT", enabled: false },
    ];
    expect(providerSupportsCapability(rows, AiCapability.CHAT)).toBe(true);
    expect(providerSupportsCapability(rows, AiCapability.STRUCTURED_OUTPUT)).toBe(false);
  });

  it("checks model capabilities", () => {
    expect(modelSupportsCapability(["CHAT"], AiCapability.CHAT)).toBe(true);
    expect(modelSupportsCapability(["CHAT"], AiCapability.IMAGE)).toBe(false);
    expect(modelSupportsCapability([], AiCapability.STRUCTURED_OUTPUT)).toBe(true);
  });

  it("only allows OpenAI Compatible text capabilities", () => {
    expect(kindAllowsCapability("OPENAI_COMPATIBLE", AiCapability.CHAT)).toBe(true);
    expect(kindAllowsCapability("OPENAI_COMPATIBLE", AiCapability.IMAGE)).toBe(false);
  });

  it("defaults new providers to text capabilities", () => {
    expect(defaultProviderCapabilities()).toEqual([
      AiCapability.CHAT,
      AiCapability.STRUCTURED_OUTPUT,
    ]);
    expect(isLegacyTextCapability(AiCapability.CHAT)).toBe(true);
    expect(isLegacyTextCapability(AiCapability.TTS)).toBe(false);
  });
});
