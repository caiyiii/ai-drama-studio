import { ScriptBlockType, type ScriptGenerationResult } from "@ai-drama-studio/types";
import {
  asArray,
  asInteger,
  asRequiredString,
  asString,
  isRecord,
  rejectUnknownKeys,
  requireKeys,
  schemaError,
} from "../schema-utils";

export const SCRIPT_GENERATION_JSON_SCHEMA = {
  $id: "ScriptGenerationResult",
  type: "object",
  additionalProperties: false,
  required: ["script", "scenes"],
  properties: {
    script: {
      type: "object",
      additionalProperties: false,
      required: ["title", "logline", "summary", "estimatedDurationSeconds"],
      properties: {
        title: { type: "string", minLength: 1 },
        logline: { type: "string" },
        summary: { type: "string" },
        estimatedDurationSeconds: { type: "integer" },
      },
    },
    scenes: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "number",
          "title",
          "location",
          "timeOfDay",
          "summary",
          "purpose",
          "conflict",
          "estimatedDurationSeconds",
          "blocks",
        ],
        properties: {
          number: { type: "integer" },
          title: { type: "string", minLength: 1 },
          location: { type: "string" },
          timeOfDay: { type: "string" },
          summary: { type: "string" },
          purpose: { type: "string" },
          conflict: { type: "string" },
          estimatedDurationSeconds: { type: "integer" },
          blocks: {
            type: "array",
            minItems: 1,
            items: {
              type: "object",
              additionalProperties: false,
              required: ["order", "type", "characterName", "content", "metadata"],
              properties: {
                order: { type: "integer" },
                type: {
                  type: "string",
                  enum: ["DIALOGUE", "ACTION", "NARRATION", "DIRECTION"],
                },
                characterName: { type: "string" },
                content: { type: "string", minLength: 1 },
                metadata: { type: "object" },
              },
            },
          },
        },
      },
    },
  },
} as const;

const SCRIPT_KEYS = ["title", "logline", "summary", "estimatedDurationSeconds"];
const SCENE_KEYS = [
  "number",
  "title",
  "location",
  "timeOfDay",
  "summary",
  "purpose",
  "conflict",
  "estimatedDurationSeconds",
  "blocks",
];
const BLOCK_KEYS = ["order", "type", "characterName", "content", "metadata"];
const BLOCK_TYPES = new Set(Object.values(ScriptBlockType));

export function validateScriptGenerationResult(value: unknown): ScriptGenerationResult {
  const errors: string[] = [];
  if (!isRecord(value)) {
    throw schemaError("结果必须是 JSON 对象");
  }
  requireKeys(value, ["script", "scenes"], errors);
  rejectUnknownKeys(value, ["script", "scenes"], "result", errors);
  const script = value.script;
  if (!isRecord(script)) {
    errors.push("script 必须是对象");
  } else {
    requireKeys(script, SCRIPT_KEYS, errors, "script");
    rejectUnknownKeys(script, SCRIPT_KEYS, "script", errors);
  }
  const scenes = asArray(value.scenes, "scenes", errors).map((item, index) => {
    if (!isRecord(item)) {
      errors.push(`scenes[${index}] 必须是对象`);
      return null;
    }
    requireKeys(item, SCENE_KEYS, errors, `scenes[${index}]`);
    rejectUnknownKeys(item, SCENE_KEYS, `scenes[${index}]`, errors);
    const blocks = asArray(item.blocks, `scenes[${index}].blocks`, errors).map((block, blockIndex) => {
      if (!isRecord(block)) {
        errors.push(`scenes[${index}].blocks[${blockIndex}] 必须是对象`);
        return null;
      }
      requireKeys(block, BLOCK_KEYS, errors, `scenes[${index}].blocks[${blockIndex}]`);
      rejectUnknownKeys(block, BLOCK_KEYS, `scenes[${index}].blocks[${blockIndex}]`, errors);
      const type = asRequiredString(block.type, `scenes[${index}].blocks[${blockIndex}].type`, errors);
      if (type && !BLOCK_TYPES.has(type as ScriptBlockType)) {
        errors.push(`scenes[${index}].blocks[${blockIndex}].type 非法`);
      }
      if (block.metadata !== undefined && block.metadata !== null && !isRecord(block.metadata)) {
        errors.push(`scenes[${index}].blocks[${blockIndex}].metadata 必须是对象`);
      }
      return {
        order: asInteger(block.order, `scenes[${index}].blocks[${blockIndex}].order`, errors),
        type: type as ScriptBlockType,
        characterName: asString(block.characterName),
        content: asRequiredString(
          block.content,
          `scenes[${index}].blocks[${blockIndex}].content`,
          errors,
        ),
        metadata: isRecord(block.metadata) ? block.metadata : {},
      };
    });
    return {
      number: asInteger(item.number, `scenes[${index}].number`, errors),
      title: asRequiredString(item.title, `scenes[${index}].title`, errors),
      location: asString(item.location),
      timeOfDay: asString(item.timeOfDay),
      summary: asString(item.summary),
      purpose: asString(item.purpose),
      conflict: asString(item.conflict),
      estimatedDurationSeconds: asInteger(
        item.estimatedDurationSeconds,
        `scenes[${index}].estimatedDurationSeconds`,
        errors,
      ),
      blocks: blocks.filter(Boolean) as ScriptGenerationResult["scenes"][number]["blocks"],
    };
  });
  const scriptPayload = isRecord(script)
    ? {
        title: asRequiredString(script.title, "script.title", errors),
        logline: asString(script.logline),
        summary: asString(script.summary),
        estimatedDurationSeconds: asInteger(
          script.estimatedDurationSeconds,
          "script.estimatedDurationSeconds",
          errors,
        ),
      }
    : {
        title: "",
        logline: "",
        summary: "",
        estimatedDurationSeconds: 0,
      };
  const validScenes = scenes.filter(Boolean) as ScriptGenerationResult["scenes"];
  if (validScenes.length === 0) {
    errors.push("scenes 不能为空");
  }
  const numbers = validScenes.map((item) => item.number);
  if (numbers.length > 0 && new Set(numbers).size !== numbers.length) {
    errors.push("scenes.number 不能重复");
  }
  if (errors.length > 0) {
    throw schemaError(errors.join("；"));
  }
  return {
    script: scriptPayload,
    scenes: validScenes,
  };
}
