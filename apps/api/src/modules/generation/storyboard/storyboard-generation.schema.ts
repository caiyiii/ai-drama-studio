import { isConsecutiveShotNumbers } from "@ai-drama-studio/core";
import {
  CameraAngle,
  CameraMovement,
  StoryboardShotSize,
  StoryboardShotType,
  StoryboardTransition,
  type StoryboardGenerationResult,
} from "@ai-drama-studio/types";
import {
  asArray,
  asPositiveInteger,
  asRequiredString,
  asString,
  asStringArray,
  isRecord,
  rejectUnknownKeys,
  requireKeys,
  schemaError,
} from "../schema-utils";

export const STORYBOARD_GENERATION_JSON_SCHEMA = {
  $id: "StoryboardGenerationResult",
  type: "object",
  additionalProperties: false,
  required: ["storyboard", "shots"],
  properties: {
    storyboard: {
      type: "object",
      additionalProperties: false,
      required: ["title", "description", "totalDurationSeconds"],
      properties: {
        title: { type: "string", minLength: 1 },
        description: { type: "string" },
        totalDurationSeconds: { type: "integer", minimum: 1 },
      },
    },
    shots: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "shotNumber",
          "sceneNumber",
          "scriptBlockIds",
          "shotType",
          "shotSize",
          "cameraMovement",
          "cameraAngle",
          "visualDescription",
          "durationSeconds",
        ],
        properties: {
          shotNumber: { type: "integer", minimum: 1 },
          sceneNumber: { type: "integer", minimum: 1 },
          scriptBlockIds: { type: "array", items: { type: "string" } },
          shotType: { type: "string" },
          shotSize: { type: "string" },
          cameraMovement: { type: "string" },
          cameraAngle: { type: "string" },
          composition: { type: "string" },
          visualDescription: { type: "string", minLength: 1 },
          characterIds: { type: "array", items: { type: "string" } },
          location: { type: "string" },
          action: { type: "string" },
          dialogue: { type: "string" },
          narration: { type: "string" },
          direction: { type: "string" },
          durationSeconds: { type: "integer", minimum: 1 },
          transition: { type: "string" },
          lighting: { type: "string" },
          mood: { type: "string" },
          visualStyle: { type: "string" },
          imagePrompt: { type: "string" },
          videoPrompt: { type: "string" },
          negativePrompt: { type: "string" },
          continuityNotes: { type: "string" },
        },
      },
    },
  },
} as const;

const STORYBOARD_KEYS = ["title", "description", "totalDurationSeconds"];
const SHOT_KEYS = [
  "shotNumber",
  "sceneNumber",
  "scriptBlockIds",
  "shotType",
  "shotSize",
  "cameraMovement",
  "cameraAngle",
  "composition",
  "visualDescription",
  "characterIds",
  "location",
  "action",
  "dialogue",
  "narration",
  "direction",
  "durationSeconds",
  "transition",
  "lighting",
  "mood",
  "visualStyle",
  "imagePrompt",
  "videoPrompt",
  "negativePrompt",
  "continuityNotes",
];

const SHOT_TYPES = new Set(Object.values(StoryboardShotType));
const SHOT_SIZES = new Set(Object.values(StoryboardShotSize));
const MOVEMENTS = new Set(Object.values(CameraMovement));
const ANGLES = new Set(Object.values(CameraAngle));
const TRANSITIONS = new Set(Object.values(StoryboardTransition));

export function validateStoryboardGenerationResult(
  value: unknown,
): StoryboardGenerationResult {
  const errors: string[] = [];
  if (!isRecord(value)) {
    throw schemaError("结果必须是 JSON 对象");
  }
  requireKeys(value, ["storyboard", "shots"], errors);
  rejectUnknownKeys(value, ["storyboard", "shots"], "result", errors);
  const storyboard = value.storyboard;
  if (!isRecord(storyboard)) {
    errors.push("storyboard 必须是对象");
  } else {
    requireKeys(storyboard, STORYBOARD_KEYS, errors, "storyboard");
    rejectUnknownKeys(storyboard, STORYBOARD_KEYS, "storyboard", errors);
  }
  const shots = asArray(value.shots, "shots", errors).map((item, index) => {
    if (!isRecord(item)) {
      errors.push(`shots[${index}] 必须是对象`);
      return null;
    }
    requireKeys(
      item,
      [
        "shotNumber",
        "sceneNumber",
        "scriptBlockIds",
        "shotType",
        "shotSize",
        "cameraMovement",
        "cameraAngle",
        "visualDescription",
        "durationSeconds",
      ],
      errors,
      `shots[${index}]`,
    );
    rejectUnknownKeys(item, SHOT_KEYS, `shots[${index}]`, errors);
    const shotType = asRequiredString(item.shotType, `shots[${index}].shotType`, errors);
    if (shotType && !SHOT_TYPES.has(shotType as StoryboardShotType)) {
      errors.push(`shots[${index}].shotType 非法`);
    }
    const shotSize = asRequiredString(item.shotSize, `shots[${index}].shotSize`, errors);
    if (shotSize && !SHOT_SIZES.has(shotSize as StoryboardShotSize)) {
      errors.push(`shots[${index}].shotSize 非法`);
    }
    const cameraMovement = asRequiredString(
      item.cameraMovement,
      `shots[${index}].cameraMovement`,
      errors,
    );
    if (cameraMovement && !MOVEMENTS.has(cameraMovement as CameraMovement)) {
      errors.push(`shots[${index}].cameraMovement 非法`);
    }
    const cameraAngle = asRequiredString(
      item.cameraAngle,
      `shots[${index}].cameraAngle`,
      errors,
    );
    if (cameraAngle && !ANGLES.has(cameraAngle as CameraAngle)) {
      errors.push(`shots[${index}].cameraAngle 非法`);
    }
    const transition = asString(item.transition) || StoryboardTransition.CUT;
    if (!TRANSITIONS.has(transition as StoryboardTransition)) {
      errors.push(`shots[${index}].transition 非法`);
    }
    return {
      shotNumber: asPositiveInteger(item.shotNumber, `shots[${index}].shotNumber`, errors),
      sceneNumber: asPositiveInteger(item.sceneNumber, `shots[${index}].sceneNumber`, errors),
      scriptBlockIds: asStringArray(item.scriptBlockIds, `shots[${index}].scriptBlockIds`, errors),
      shotType: shotType as StoryboardShotType,
      shotSize: shotSize as StoryboardShotSize,
      cameraMovement: cameraMovement as CameraMovement,
      cameraAngle: cameraAngle as CameraAngle,
      composition: asString(item.composition),
      visualDescription: asRequiredString(
        item.visualDescription,
        `shots[${index}].visualDescription`,
        errors,
      ),
      characterIds: asStringArray(item.characterIds ?? [], `shots[${index}].characterIds`, errors),
      location: asString(item.location),
      action: asString(item.action),
      dialogue: asString(item.dialogue),
      narration: asString(item.narration),
      direction: asString(item.direction),
      durationSeconds: asPositiveInteger(
        item.durationSeconds,
        `shots[${index}].durationSeconds`,
        errors,
      ),
      transition: transition as StoryboardTransition,
      lighting: asString(item.lighting),
      mood: asString(item.mood),
      visualStyle: asString(item.visualStyle),
      imagePrompt: asString(item.imagePrompt),
      videoPrompt: asString(item.videoPrompt),
      negativePrompt: asString(item.negativePrompt),
      continuityNotes: asString(item.continuityNotes),
    };
  });
  const validShots = shots.filter(Boolean) as StoryboardGenerationResult["shots"];
  if (validShots.length === 0) {
    errors.push("shots 不能为空");
  }
  if (!isConsecutiveShotNumbers(validShots.map((item) => item.shotNumber))) {
    errors.push("shotNumber 必须从 1 连续递增");
  }
  const storyboardPayload = isRecord(storyboard)
    ? {
        title: asRequiredString(storyboard.title, "storyboard.title", errors),
        description: asString(storyboard.description),
        totalDurationSeconds: asPositiveInteger(
          storyboard.totalDurationSeconds,
          "storyboard.totalDurationSeconds",
          errors,
        ),
      }
    : { title: "", description: "", totalDurationSeconds: 0 };
  if (errors.length > 0) {
    throw schemaError(errors.join("；"));
  }
  return {
    storyboard: storyboardPayload,
    shots: validShots,
  };
}
