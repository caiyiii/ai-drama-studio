import { AiProviderError } from "../ai/ai.errors";

export function schemaError(message: string): AiProviderError {
  return new AiProviderError(`Schema Validation 失败：${message}`, "SCHEMA_INVALID");
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function requireKeys(
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

export function rejectUnknownKeys(
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

export function asArray(value: unknown, path: string, errors: string[]): unknown[] {
  if (!Array.isArray(value)) {
    errors.push(`${path} 必须是数组`);
    return [];
  }
  return value;
}

export function asString(value: unknown): string {
  if (typeof value === "number") {
    return String(value);
  }
  return typeof value === "string" ? value : "";
}

export function asRequiredString(
  value: unknown,
  path: string,
  errors: string[],
): string {
  if (typeof value !== "string" || !value.trim()) {
    errors.push(`${path} 必须是非空字符串`);
    return "";
  }
  return value.trim();
}

export function asStringArray(value: unknown, path: string, errors: string[]): string[] {
  if (!Array.isArray(value)) {
    errors.push(`${path} 必须是字符串数组`);
    return [];
  }
  return value
    .map((item, index) => {
      if (typeof item !== "string") {
        errors.push(`${path}[${index}] 必须是字符串`);
        return "";
      }
      return item.trim();
    })
    .filter(Boolean);
}

export function asInteger(value: unknown, path: string, errors: string[]): number {
  if (typeof value === "string" && /^\d+$/.test(value)) {
    return Number(value);
  }
  if (typeof value !== "number" || !Number.isInteger(value)) {
    errors.push(`${path} 必须是整数`);
    return 0;
  }
  return value;
}

export function asStoryState(
  value: unknown,
  path: string,
  errors: string[],
): Record<string, unknown> {
  if (value === undefined || value === null) {
    return {
      characters: [],
      worldChanges: [],
      unresolvedThreads: [],
      foreshadowing: [],
    };
  }
  if (!isRecord(value)) {
    errors.push(`${path} 必须是对象`);
    return {};
  }
  rejectUnknownKeys(
    value,
    [
      "characters",
      "relationships",
      "worldChanges",
      "factionChanges",
      "unresolvedThreads",
      "revealedSecrets",
      "foreshadowing",
    ],
    path,
    errors,
  );
  return value;
}
