import { describe, expect, it } from "vitest";
import {
  buildMusicPrompt,
  normalizeMusicInput,
  validateMusicDuration,
} from "@ai-drama-studio/core";
import {
  buildSfxPrompt,
  normalizeSfxInput,
  validateSfxDuration,
} from "@ai-drama-studio/core";

describe("music / sfx core helpers", () => {
  it("normalizes music input and validates duration", () => {
    const input = normalizeMusicInput({
      episodeId: " ep-1 ",
      prompt: "  epic theme ",
      durationSeconds: 30,
      style: " cinematic ",
    });
    expect(input.episodeId).toBe("ep-1");
    expect(input.prompt).toBe("epic theme");
    expect(input.style).toBe("cinematic");
    expect(() => validateMusicDuration(30)).not.toThrow();
    expect(() => validateMusicDuration(0)).toThrow("INVALID_DURATION");
    expect(() => validateMusicDuration(601)).toThrow("INVALID_DURATION");
  });

  it("normalizes sfx input and validates duration", () => {
    const input = normalizeSfxInput({
      episodeId: " ep-1 ",
      prompt: " impact ",
      durationSeconds: 1.5,
      category: " explosion ",
    });
    expect(input.prompt).toBe("impact");
    expect(input.category).toBe("explosion");
    expect(() => validateSfxDuration(0.1)).not.toThrow();
    expect(() => validateSfxDuration(0)).toThrow("INVALID_DURATION");
    expect(() => validateSfxDuration(61)).toThrow("INVALID_DURATION");
  });

  it("builds prompts from user input plus story context", () => {
    const music = buildMusicPrompt({
      userPrompt: "Generate epic music",
      context: {
        episodeTitle: "第一次接触",
        storyBibleTone: "神秘、紧张、希望",
        worldSummary: "修仙与赛博融合",
      },
      mood: "mysterious",
    });
    expect(music).toContain("Generate epic music");
    expect(music).toContain("第一次接触");
    expect(music).not.toContain("apiKey");
    const sfx = buildSfxPrompt({
      userPrompt: "飞船撞击空间站",
      context: {
        episodeTitle: "第一次接触",
        shotAction: "飞船撞击",
        shotVisualDescription: "金属变形",
      },
      category: "impact",
    });
    expect(sfx).toContain("飞船撞击空间站");
    expect(sfx).toContain("飞船撞击");
  });
});
