import { describe, expect, it } from "vitest";
import { validateTtsGenerationResult } from "./tts-generation.schema";

describe("validateTtsGenerationResult", () => {
  it("accepts url or base64 audio", () => {
    expect(
      validateTtsGenerationResult({
        url: "https://cdn.example/a.mp3",
        mimeType: "audio/mpeg",
      }).url,
    ).toBe("https://cdn.example/a.mp3");
    expect(
      validateTtsGenerationResult({
        base64: "abc",
        mimeType: "audio/mpeg",
      }).base64,
    ).toBe("abc");
  });

  it("rejects empty results", () => {
    expect(() => validateTtsGenerationResult({})).toThrow();
  });
});
