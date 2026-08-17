import { describe, expect, it } from "vitest";
import {
  buildVideoPrompt,
  filterShotAssetsByMediaType,
  getPrimaryShotAsset,
  getShotVideoStatus,
  isShotVideoStale,
  normalizeVideoGenerationResult,
  resolveVideoGenerationMode,
  resolveVideoSize,
  validateVideoGenerationInput,
} from "@ai-drama-studio/core";
import { validateVideoGenerationResult } from "./video-generation.schema";
import { buildVideoGenerationPrompt } from "../prompts/video-generation.prompt";

describe("video generation helpers", () => {
  it("prefers user override then videoPrompt then imagePrompt then visual+action", () => {
    expect(
      buildVideoPrompt(
        {
          videoPrompt: "镜头推进",
          imagePrompt: "废墟立像",
          visualDescription: "不该整包发出",
        },
        "  用户改写  ",
      ),
    ).toBe("用户改写");
    expect(
      buildVideoPrompt({
        videoPrompt: "镜头推进",
        imagePrompt: "废墟立像",
      }),
    ).toBe("镜头推进");
    expect(buildVideoPrompt({ imagePrompt: "废墟立像", cameraMovement: "DOLLY_IN" })).toContain(
      "废墟立像",
    );
    expect(
      buildVideoPrompt({ visualDescription: "星裂", action: "抬头" }),
    ).toContain("星裂");
  });

  it("does not JSON.stringify the whole shot", () => {
    const prompt = buildVideoGenerationPrompt({
      shot: {
        visualDescription: "废墟",
        action: "迈步",
        encryptedApiKey: "sk-secret",
      } as never,
    }).prompt;
    expect(prompt).toContain("废墟");
    expect(prompt).not.toContain("encryptedApiKey");
    expect(prompt).not.toContain("{");
  });

  it("defaults to IMAGE_TO_VIDEO", () => {
    expect(resolveVideoGenerationMode(null)).toBe("IMAGE_TO_VIDEO");
    expect(resolveVideoGenerationMode("TEXT_TO_VIDEO")).toBe("TEXT_TO_VIDEO");
  });

  it("validates duration and size", () => {
    expect(() => validateVideoGenerationInput({ shotId: "s1" })).not.toThrow();
    expect(() =>
      validateVideoGenerationInput({ shotId: "", durationSeconds: 5 }),
    ).toThrow("SHOT_NOT_FOUND");
    expect(() =>
      validateVideoGenerationInput({ shotId: "s1", durationSeconds: 99 }),
    ).toThrow("INVALID_VIDEO_DURATION");
  });

  it("resolves 1280x720 by default", () => {
    expect(resolveVideoSize()).toEqual({ width: 1280, height: 720 });
    expect(resolveVideoSize({ aspectRatio: "9:16" })).toEqual({
      width: 720,
      height: 1280,
    });
  });

  it("normalizes provider video output", () => {
    const result = validateVideoGenerationResult({
      url: "https://cdn.example/a.mp4",
      mimeType: "video/webm",
    });
    expect(result.mimeType).toBe("video/webm");
    expect(() => normalizeVideoGenerationResult({})).toThrow("VIDEO_GENERATION_FAILED");
  });

  it("filters shot assets by media type and detects stale video", () => {
    const assets = [
      { isPrimary: true, role: "FINAL", asset: { type: "IMAGE" } },
      { isPrimary: true, role: "FINAL", asset: { type: "VIDEO" } },
    ];
    expect(filterShotAssetsByMediaType(assets, "VIDEO")).toHaveLength(1);
    expect(getPrimaryShotAsset(assets, "VIDEO")?.asset?.type).toBe("VIDEO");
    expect(
      isShotVideoStale({
        storyboardVersion: 3,
        generatedFromStoryboardVersion: 1,
      }),
    ).toBe(true);
    expect(
      getShotVideoStatus({
        assets,
        stale: true,
      }),
    ).toBe("STALE");
  });
});
