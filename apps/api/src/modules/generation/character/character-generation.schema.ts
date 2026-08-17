import type { CharacterGenerationResult } from "@ai-drama-studio/types";
import { AiProviderError } from "../../ai/ai.errors";

export const CHARACTER_GENERATION_JSON_SCHEMA = {
  $id: "CharacterGenerationResult",
  type: "object",
  additionalProperties: false,
  required: ["character", "relationships"],
  properties: {
    character: {
      type: "object",
      additionalProperties: false,
      required: [
        "name",
        "alias",
        "gender",
        "age",
        "race",
        "identity",
        "role",
        "personality",
        "appearance",
        "background",
        "goal",
        "motivation",
        "conflict",
        "abilities",
      ],
      properties: {
        name: { type: "string", minLength: 1 },
        alias: { type: "string" },
        gender: { type: "string" },
        age: { type: "string" },
        race: { type: "string" },
        identity: { type: "string" },
        role: { type: "string" },
        personality: { type: "object" },
        appearance: { type: "object" },
        background: { type: "string" },
        goal: { type: "string" },
        motivation: { type: "string" },
        conflict: { type: "string" },
        abilities: { type: "array" },
        civilizationName: { type: "string" },
        factionName: { type: "string" },
      },
    },
    relationships: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["targetName", "type"],
        properties: {
          targetName: { type: "string", minLength: 1 },
          type: { type: "string" },
          label: { type: "string" },
          description: { type: "string" },
          strength: { type: "number" },
        },
      },
    },
  },
} as const;

const CHARACTER_KEYS = [
  "name",
  "alias",
  "gender",
  "age",
  "race",
  "identity",
  "role",
  "personality",
  "appearance",
  "background",
  "goal",
  "motivation",
  "conflict",
  "abilities",
  "civilizationName",
  "factionName",
] as const;

const RELATIONSHIP_KEYS = [
  "targetName",
  "type",
  "label",
  "description",
  "strength",
] as const;

export function validateCharacterGenerationResult(
  value: unknown,
): CharacterGenerationResult {
  const errors: string[] = [];
  if (!isRecord(value)) {
    throw schemaError("结果必须是 JSON 对象");
  }
  requireKeys(value, ["character", "relationships"], errors);
  rejectUnknownKeys(value, ["character", "relationships"], "result", errors);

  const raw = value.character;
  if (!isRecord(raw)) {
    errors.push("character 必须是对象");
  } else {
    requireKeys(raw, [
      "name",
      "alias",
      "gender",
      "age",
      "race",
      "identity",
      "role",
      "personality",
      "appearance",
      "background",
      "goal",
      "motivation",
      "conflict",
      "abilities",
    ], errors, "character");
    rejectUnknownKeys(raw, [...CHARACTER_KEYS], "character", errors);
    assertString(raw.name, "character.name", errors, true);
    for (const key of [
      "alias",
      "gender",
      "age",
      "race",
      "identity",
      "role",
      "background",
      "goal",
      "motivation",
      "conflict",
      "civilizationName",
      "factionName",
    ] as const) {
      if (key in raw) {
        assertString(raw[key], `character.${key}`, errors);
      }
    }
    if (!isRecord(raw.personality)) {
      errors.push("character.personality 必须是对象");
    }
    if (!isRecord(raw.appearance)) {
      errors.push("character.appearance 必须是对象");
    }
    if (!Array.isArray(raw.abilities)) {
      errors.push("character.abilities 必须是数组");
    }
  }

  const relationships = asArray(value.relationships, "relationships", errors).map(
    (item, index) => {
      if (!isRecord(item)) {
        errors.push(`relationships[${index}] 必须是对象`);
        return null;
      }
      requireKeys(item, ["targetName", "type"], errors, `relationships[${index}]`);
      rejectUnknownKeys(
        item,
        [...RELATIONSHIP_KEYS],
        `relationships[${index}]`,
        errors,
      );
      return {
        targetName: asRequiredString(
          item.targetName,
          `relationships[${index}].targetName`,
          errors,
        ),
        type: asString(item.type),
        label: asString(item.label),
        description: asString(item.description),
        strength:
          typeof item.strength === "number" ? item.strength : undefined,
      };
    },
  );

  if (errors.length > 0) {
    throw schemaError(errors.join("；"));
  }
  if (!isRecord(raw)) {
    throw schemaError("character 必须是对象");
  }

  return {
    character: {
      name: String(raw.name).trim(),
      alias: asString(raw.alias),
      gender: asString(raw.gender),
      age: asString(raw.age),
      race: asString(raw.race),
      identity: asString(raw.identity),
      role: asString(raw.role),
      personality: isRecord(raw.personality) ? raw.personality : {},
      appearance: isRecord(raw.appearance) ? raw.appearance : {},
      background: asString(raw.background),
      goal: asString(raw.goal),
      motivation: asString(raw.motivation),
      conflict: asString(raw.conflict),
      abilities: Array.isArray(raw.abilities)
        ? raw.abilities.map((item) =>
            typeof item === "string"
              ? item
              : isRecord(item) && typeof item.name === "string"
                ? item.name
                : item,
          )
        : [],
      civilizationName: asString(raw.civilizationName) || undefined,
      factionName: asString(raw.factionName) || undefined,
    },
    relationships: relationships.filter(
      Boolean,
    ) as CharacterGenerationResult["relationships"],
  };
}

function schemaError(message: string): AiProviderError {
  return new AiProviderError(`Schema Validation 失败：${message}`, "SCHEMA_INVALID");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function requireKeys(
  value: Record<string, unknown>,
  keys: string[],
  errors: string[],
  prefix = "",
) {
  for (const key of keys) {
    if (!(key in value)) {
      errors.push(`${prefix ? `${prefix}.` : ""}${key} 缺失`);
    }
  }
}

function rejectUnknownKeys(
  value: Record<string, unknown>,
  allowed: string[],
  prefix: string,
  errors: string[],
) {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) {
      errors.push(`${prefix} 含有未定义字段 ${key}`);
    }
  }
}

function asArray(value: unknown, path: string, errors: string[]): unknown[] {
  if (!Array.isArray(value)) {
    errors.push(`${path} 必须是数组`);
    return [];
  }
  return value;
}

function assertString(
  value: unknown,
  path: string,
  errors: string[],
  required = false,
) {
  if (value === undefined) {
    return;
  }
  if (typeof value !== "string" && typeof value !== "number") {
    errors.push(`${path} 必须是字符串`);
    return;
  }
  if (required && !String(value).trim()) {
    errors.push(`${path} 不能为空`);
  }
}

function asString(value: unknown): string {
  if (typeof value === "number") {
    return String(value);
  }
  return typeof value === "string" ? value : "";
}

function asRequiredString(value: unknown, path: string, errors: string[]): string {
  if (typeof value !== "string" || !value.trim()) {
    errors.push(`${path} 必须是非空字符串`);
    return "";
  }
  return value.trim();
}
