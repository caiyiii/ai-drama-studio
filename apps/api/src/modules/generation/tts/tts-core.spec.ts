import { describe, expect, it } from "vitest";
import {
  assertDialogueBlock,
  normalizeTtsText,
  resolveTtsVoice,
  sanitizeVoiceProfile,
  validateTtsText,
} from "@ai-drama-studio/core";
import { ScriptBlockType } from "@ai-drama-studio/types";

describe("tts core helpers", () => {
  it("normalizes text and keeps Chinese punctuation", () => {
    expect(normalizeTtsText("  你是谁？\u0000  ")).toBe("你是谁？");
  });

  it("rejects empty and oversized text", () => {
    expect(() => validateTtsText("")).toThrow("TTS_TEXT_EMPTY");
    expect(() => validateTtsText("a".repeat(4001))).toThrow("TTS_TEXT_TOO_LONG");
  });

  it("prefers request voiceId over character profile", () => {
    expect(
      resolveTtsVoice({
        requestVoiceId: "manual",
        voiceProfile: { voiceId: "profile" },
      }),
    ).toBe("manual");
    expect(resolveTtsVoice({ voiceProfile: { voiceId: "profile" } })).toBe("profile");
    expect(resolveTtsVoice({})).toBeUndefined();
  });

  it("rejects non-dialogue sources", () => {
    expect(() => assertDialogueBlock(ScriptBlockType.ACTION)).toThrow(
      "TTS_SOURCE_NOT_DIALOGUE",
    );
    expect(() => assertDialogueBlock(ScriptBlockType.DIALOGUE)).not.toThrow();
  });

  it("strips unknown secret-like fields from voice profile", () => {
    const sanitized = sanitizeVoiceProfile({
      voiceId: "xinghe",
      language: "zh-CN",
      apiKey: "sk-secret",
    } as never);
    expect(sanitized).toEqual({
      voiceId: "xinghe",
      providerId: null,
      modelId: null,
      language: "zh-CN",
      gender: null,
      style: null,
      speed: null,
      pitch: null,
    });
    expect(JSON.stringify(sanitized)).not.toContain("sk-secret");
  });
});
