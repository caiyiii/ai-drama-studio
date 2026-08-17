import { describe, expect, it } from "vitest";
import { assertImageCount, buildShotImagePrompt, resolveImageSize } from "@ai-drama-studio/core";
import { validateImageGenerationResult } from "./image-generation.schema";

describe("image generation helpers", () => {
  it("builds prompt from StoryboardShot instead of dumping the whole row", () => {
    const prompt = buildShotImagePrompt({
      imagePrompt: "沈星河站在废墟中",
      visualDescription: "不该被 JSON 整包发出",
      composition: "中心构图",
    });
    expect(prompt).toContain("沈星河站在废墟中");
    expect(prompt).not.toContain("{");
  });

  it("honors prompt override", () => {
    expect(
      buildShotImagePrompt({ imagePrompt: "a" }, "  override prompt  "),
    ).toBe("override prompt");
  });

  it("limits count to 1-4", () => {
    expect(assertImageCount(undefined)).toBe(1);
    expect(assertImageCount(4)).toBe(4);
    expect(() => assertImageCount(0)).toThrow("INVALID_IMAGE_COUNT");
    expect(() => assertImageCount(100)).toThrow("INVALID_IMAGE_COUNT");
  });

  it("resolves aspect ratio sizes", () => {
    expect(resolveImageSize({ aspectRatio: "16:9" })).toMatchObject({
      width: 1792,
      height: 1024,
    });
    expect(() => resolveImageSize({ aspectRatio: "7:5" })).toThrow("INVALID_IMAGE_SIZE");
  });

  it("validates preview output images", () => {
    const result = validateImageGenerationResult({
      images: [{ url: "https://cdn.example/a.png", mimeType: "image/png" }],
      provider: "Flux",
    });
    expect(result.images).toHaveLength(1);
    expect(() => validateImageGenerationResult({ images: [] })).toThrow();
  });
});
