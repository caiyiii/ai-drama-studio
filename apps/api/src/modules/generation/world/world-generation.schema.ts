import type { WorldGenerationResult } from "@ai-drama-studio/types";
import { AiProviderError } from "../../ai/ai.errors";

export const WORLD_GENERATION_JSON_SCHEMA = {
  $id: "WorldGenerationResult",
  type: "object",
  additionalProperties: false,
  required: [
    "world",
    "civilizations",
    "histories",
    "factions",
    "locations",
    "powerSystems",
  ],
  properties: {
    world: {
      type: "object",
      additionalProperties: false,
      required: ["name", "description", "cosmicBackground", "coreConflict"],
      properties: {
        name: { type: "string", minLength: 1 },
        description: { type: "string" },
        cosmicBackground: { type: "string" },
        coreConflict: { type: "string" },
      },
    },
    civilizations: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "name",
          "type",
          "description",
          "philosophy",
          "society",
          "culture",
          "technology",
        ],
        properties: {
          name: { type: "string", minLength: 1 },
          type: { type: "string" },
          description: { type: "string" },
          philosophy: { type: "string" },
          society: { type: "string" },
          culture: { type: "string" },
          technology: { type: "string" },
        },
      },
    },
    histories: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "description", "order"],
        properties: {
          title: { type: "string", minLength: 1 },
          description: { type: "string" },
          order: { type: "integer" },
        },
      },
    },
    factions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "description", "civilizationName"],
        properties: {
          name: { type: "string", minLength: 1 },
          description: { type: "string" },
          civilizationName: { type: "string" },
        },
      },
    },
    locations: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "description", "civilizationName"],
        properties: {
          name: { type: "string", minLength: 1 },
          description: { type: "string" },
          civilizationName: { type: "string" },
        },
      },
    },
    powerSystems: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "description", "rules", "levels"],
        properties: {
          name: { type: "string", minLength: 1 },
          description: { type: "string" },
          rules: {
            type: "array",
            items: { type: "string" },
          },
          levels: {
            type: "array",
            items: {
              anyOf: [
                { type: "string" },
                {
                  type: "object",
                  required: ["name"],
                  properties: {
                    name: { type: "string", minLength: 1 },
                    description: { type: "string" },
                  },
                },
              ],
            },
          },
        },
      },
    },
  },
} as const;

export function validateWorldGenerationResult(
  value: unknown,
): WorldGenerationResult {
  const errors: string[] = [];
  if (!isRecord(value)) {
    throw schemaError("结果必须是 JSON 对象");
  }

  requireKeys(value, [
    "world",
    "civilizations",
    "histories",
    "factions",
    "locations",
    "powerSystems",
  ], errors);
  rejectUnknownKeys(value, [
    "world",
    "civilizations",
    "histories",
    "factions",
    "locations",
    "powerSystems",
  ], "result", errors);

  const worldRaw = value.world;
  if (!isRecord(worldRaw)) {
    errors.push("world 必须是对象");
  } else {
    requireKeys(worldRaw, [
      "name",
      "description",
      "cosmicBackground",
      "coreConflict",
    ], errors, "world");
    assertString(worldRaw.name, "world.name", errors, true);
    assertString(worldRaw.description, "world.description", errors);
    assertString(worldRaw.cosmicBackground, "world.cosmicBackground", errors);
    assertString(worldRaw.coreConflict, "world.coreConflict", errors);
    rejectUnknownKeys(worldRaw, [
      "name",
      "description",
      "cosmicBackground",
      "coreConflict",
    ], "world", errors);
  }

  const civilizations = asArray(value.civilizations, "civilizations", errors).map(
    (item, index) => {
      if (!isRecord(item)) {
        errors.push(`civilizations[${index}] 必须是对象`);
        return null;
      }
      requireKeys(item, [
        "name",
        "type",
        "description",
        "philosophy",
        "society",
        "culture",
        "technology",
      ], errors, `civilizations[${index}]`);
      rejectUnknownKeys(item, [
        "name",
        "type",
        "description",
        "philosophy",
        "society",
        "culture",
        "technology",
      ], `civilizations[${index}]`, errors);
      return {
        name: asRequiredString(item.name, `civilizations[${index}].name`, errors),
        type: asString(item.type),
        description: asString(item.description),
        philosophy: asString(item.philosophy),
        society: asString(item.society),
        culture: asString(item.culture),
        technology: asString(item.technology),
      };
    },
  );

  const histories = asArray(value.histories, "histories", errors).map((item, index) => {
    if (!isRecord(item)) {
      errors.push(`histories[${index}] 必须是对象`);
      return null;
    }
    requireKeys(item, ["title", "description", "order"], errors, `histories[${index}]`);
    rejectUnknownKeys(item, ["title", "description", "order"], `histories[${index}]`, errors);
    return {
      title: asRequiredString(item.title, `histories[${index}].title`, errors),
      description: asString(item.description),
      order: asInteger(item.order, `histories[${index}].order`, errors),
    };
  });

  const factions = asArray(value.factions, "factions", errors).map((item, index) => {
    if (!isRecord(item)) {
      errors.push(`factions[${index}] 必须是对象`);
      return null;
    }
    requireKeys(
      item,
      ["name", "description", "civilizationName"],
      errors,
      `factions[${index}]`,
    );
    rejectUnknownKeys(
      item,
      ["name", "description", "civilizationName"],
      `factions[${index}]`,
      errors,
    );
    return {
      name: asRequiredString(item.name, `factions[${index}].name`, errors),
      description: asString(item.description),
      civilizationName: asString(item.civilizationName),
    };
  });

  const locations = asArray(value.locations, "locations", errors).map((item, index) => {
    if (!isRecord(item)) {
      errors.push(`locations[${index}] 必须是对象`);
      return null;
    }
    requireKeys(
      item,
      ["name", "description", "civilizationName"],
      errors,
      `locations[${index}]`,
    );
    rejectUnknownKeys(
      item,
      ["name", "description", "civilizationName"],
      `locations[${index}]`,
      errors,
    );
    return {
      name: asRequiredString(item.name, `locations[${index}].name`, errors),
      description: asString(item.description),
      civilizationName: asString(item.civilizationName),
    };
  });

  const powerSystems = asArray(value.powerSystems, "powerSystems", errors).map(
    (item, index) => {
      if (!isRecord(item)) {
        errors.push(`powerSystems[${index}] 必须是对象`);
        return null;
      }
      requireKeys(
        item,
        ["name", "description", "rules", "levels"],
        errors,
        `powerSystems[${index}]`,
      );
      rejectUnknownKeys(
        item,
        ["name", "description", "rules", "levels"],
        `powerSystems[${index}]`,
        errors,
      );
      return {
        name: asRequiredString(item.name, `powerSystems[${index}].name`, errors),
        description: asString(item.description),
        rules: asStringArray(item.rules, `powerSystems[${index}].rules`, errors),
        levels: asLevels(item.levels, `powerSystems[${index}].levels`, errors),
      };
    },
  );

  if (errors.length > 0) {
    throw schemaError(errors.join("；"));
  }

  if (!isRecord(worldRaw)) {
    throw schemaError("world 必须是对象");
  }

  return {
    world: {
      name: String(worldRaw.name).trim(),
      description: asString(worldRaw.description),
      cosmicBackground: asString(worldRaw.cosmicBackground),
      coreConflict: asString(worldRaw.coreConflict),
    },
    civilizations: civilizations.filter(Boolean) as WorldGenerationResult["civilizations"],
    histories: histories.filter(Boolean) as WorldGenerationResult["histories"],
    factions: factions.filter(Boolean) as WorldGenerationResult["factions"],
    locations: locations.filter(Boolean) as WorldGenerationResult["locations"],
    powerSystems: powerSystems.filter(Boolean) as WorldGenerationResult["powerSystems"],
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
  if (typeof value !== "string") {
    errors.push(`${path} 必须是字符串`);
    return;
  }
  if (required && !value.trim()) {
    errors.push(`${path} 不能为空`);
  }
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asRequiredString(value: unknown, path: string, errors: string[]): string {
  if (typeof value !== "string" || !value.trim()) {
    errors.push(`${path} 必须是非空字符串`);
    return "";
  }
  return value.trim();
}

function asInteger(value: unknown, path: string, errors: string[]): number {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    errors.push(`${path} 必须是整数`);
    return 0;
  }
  return value;
}

function asStringArray(value: unknown, path: string, errors: string[]): string[] {
  if (!Array.isArray(value)) {
    errors.push(`${path} 必须是字符串数组`);
    return [];
  }
  const items: string[] = [];
  value.forEach((item, index) => {
    if (typeof item !== "string") {
      errors.push(`${path}[${index}] 必须是字符串`);
      return;
    }
    if (item.trim()) {
      items.push(item.trim());
    }
  });
  return items;
}

function asLevels(
  value: unknown,
  path: string,
  errors: string[],
): WorldGenerationResult["powerSystems"][number]["levels"] {
  if (!Array.isArray(value)) {
    errors.push(`${path} 必须是数组`);
    return [];
  }
  const levels: WorldGenerationResult["powerSystems"][number]["levels"] = [];
  value.forEach((item, index) => {
    if (typeof item === "string" && item.trim()) {
      levels.push({ name: item.trim() });
      return;
    }
    if (isRecord(item) && typeof item.name === "string" && item.name.trim()) {
      levels.push({
        name: item.name.trim(),
        description: typeof item.description === "string" ? item.description : undefined,
      });
      return;
    }
    errors.push(`${path}[${index}] 必须是字符串或包含 name 的对象`);
  });
  return levels;
}
