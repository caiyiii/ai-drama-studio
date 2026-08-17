import {
  CameraAngle,
  CameraMovement,
  StoryboardShotSize,
  StoryboardShotType,
  StoryboardTransition,
  type StoryboardGenerationResult,
} from "@ai-drama-studio/types";
import { describe, expect, it } from "vitest";
import {
  STORYBOARD_GENERATION_JSON_SCHEMA,
  validateStoryboardGenerationResult,
} from "./storyboard-generation.schema";

export const validStoryboardGeneration: StoryboardGenerationResult = {
  storyboard: {
    title: "星系碰撞 · 分镜",
    description: "以远景建立问天宗夜空，再推进到沈星河的震惊。",
    totalDurationSeconds: 18,
  },
  shots: [
    {
      shotNumber: 1,
      sceneNumber: 1,
      scriptBlockIds: ["block-1"],
      shotType: StoryboardShotType.WIDE,
      shotSize: StoryboardShotSize.WIDE,
      cameraMovement: CameraMovement.STATIC,
      cameraAngle: CameraAngle.EYE_LEVEL,
      composition: "城市废墟前景，天空占上三分之二",
      visualDescription: "废弃城市远景，沈星河从远处进入画面。",
      characterIds: ["c1"],
      location: "问天宗外门",
      action: "沈星河从远处走入画面",
      dialogue: "",
      narration: "",
      direction: "建立空间",
      durationSeconds: 6,
      transition: StoryboardTransition.FADE_IN,
      lighting: "冷蓝夜光",
      mood: "不安",
      visualStyle: "科幻修仙",
      imagePrompt: "wide shot abandoned city night, youth walking in, cosmic crack forming",
      videoPrompt: "slow wide establishing, youth walks into frame, sky crack appears",
      negativePrompt: "text, watermark, extra limbs",
      continuityNotes: "人物从画面左侧进入，面向天空",
    },
    {
      shotNumber: 2,
      sceneNumber: 1,
      scriptBlockIds: ["block-1"],
      shotType: StoryboardShotType.MEDIUM,
      shotSize: StoryboardShotSize.MEDIUM,
      cameraMovement: CameraMovement.DOLLY_IN,
      cameraAngle: CameraAngle.LOW_ANGLE,
      composition: "中景，人物居中偏右",
      visualDescription: "沈星河抬头，摄像机从背后缓慢推近。",
      characterIds: ["c1"],
      location: "问天宗外门",
      action: "抬头",
      dialogue: "",
      narration: "",
      direction: "视线向上",
      durationSeconds: 4,
      transition: StoryboardTransition.CUT,
      lighting: "星裂白光",
      mood: "震惊",
      visualStyle: "科幻修仙",
      imagePrompt: "medium shot youth looking up, cosmic light on face",
      videoPrompt: "dolly in behind youth as he looks up",
      negativePrompt: "text, watermark",
      continuityNotes: "接上一镜左侧进入后的站位",
    },
    {
      shotNumber: 3,
      sceneNumber: 1,
      scriptBlockIds: ["block-2"],
      shotType: StoryboardShotType.CLOSE_UP,
      shotSize: StoryboardShotSize.CLOSE_UP,
      cameraMovement: CameraMovement.STATIC,
      cameraAngle: CameraAngle.EYE_LEVEL,
      composition: "面部特写",
      visualDescription: "沈星河震惊的表情。",
      characterIds: ["c1"],
      location: "问天宗外门",
      action: "瞳孔收缩",
      dialogue: "那是什么？",
      narration: "",
      direction: "口型特写",
      durationSeconds: 3,
      transition: StoryboardTransition.CUT,
      lighting: "高反差",
      mood: "震惊",
      visualStyle: "科幻修仙",
      imagePrompt: "close up shocked youth, cosmic crack reflected in eyes",
      videoPrompt: "static close up, mouth saying the line",
      negativePrompt: "text, watermark",
      continuityNotes: "视线仍朝上",
    },
    {
      shotNumber: 4,
      sceneNumber: 1,
      scriptBlockIds: ["block-2"],
      shotType: StoryboardShotType.OVER_SHOULDER,
      shotSize: StoryboardShotSize.MEDIUM,
      cameraMovement: CameraMovement.PAN,
      cameraAngle: CameraAngle.EYE_LEVEL,
      composition: "过肩看向天空裂缝",
      visualDescription: "从沈星河肩后看见巨大宇宙裂缝。",
      characterIds: ["c1"],
      location: "问天宗外门",
      action: "凝视天空",
      dialogue: "",
      narration: "",
      direction: "轴线保持",
      durationSeconds: 5,
      transition: StoryboardTransition.DISSOLVE,
      lighting: "裂缝强光",
      mood: "敬畏",
      visualStyle: "科幻修仙",
      imagePrompt: "over shoulder cosmic crack in sky above city",
      videoPrompt: "slow pan from shoulder to sky crack",
      negativePrompt: "text, watermark",
      continuityNotes: "人物仍在画面左下",
    },
  ],
};

describe("Storyboard generation schema", () => {
  it("exposes a strict JSON Schema contract", () => {
    expect(STORYBOARD_GENERATION_JSON_SCHEMA.additionalProperties).toBe(false);
    expect(STORYBOARD_GENERATION_JSON_SCHEMA.required).toContain("storyboard");
    expect(STORYBOARD_GENERATION_JSON_SCHEMA.required).toContain("shots");
  });

  it("accepts a valid structured result including one ScriptBlock to many shots", () => {
    const result = validateStoryboardGenerationResult(validStoryboardGeneration);
    expect(result.shots).toHaveLength(4);
    expect(result.shots.filter((item) => item.scriptBlockIds[0] === "block-1")).toHaveLength(2);
  });

  it("rejects unknown fields", () => {
    expect(() =>
      validateStoryboardGenerationResult({
        ...validStoryboardGeneration,
        extra: true,
      }),
    ).toThrow(/未定义字段/);
  });

  it("rejects non-consecutive shotNumber", () => {
    expect(() =>
      validateStoryboardGenerationResult({
        ...validStoryboardGeneration,
        shots: [
          validStoryboardGeneration.shots[0],
          { ...validStoryboardGeneration.shots[1], shotNumber: 3 },
        ],
      }),
    ).toThrow(/连续/);
  });

  it("rejects invalid durationSeconds", () => {
    expect(() =>
      validateStoryboardGenerationResult({
        ...validStoryboardGeneration,
        shots: [{ ...validStoryboardGeneration.shots[0], durationSeconds: 0 }],
      }),
    ).toThrow(/大于 0/);
  });
});
