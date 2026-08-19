import type { LocationGenerationResult } from "@ai-drama-studio/types";
import { AiProviderError } from "../../ai/ai.errors";

export function validateLocationGenerationResult(value: unknown): LocationGenerationResult {
  if (!value || typeof value !== "object") {
    throw new AiProviderError("AI 返回非法 JSON", "SCHEMA_INVALID");
  }
  const root = value as Record<string, unknown>;
  const location = root.location;
  if (!location || typeof location !== "object") {
    throw new AiProviderError("缺少 location 字段", "SCHEMA_INVALID");
  }
  const item = location as Record<string, unknown>;
  const name = String(item.name || "").trim();
  const description = String(item.description || "").trim();
  if (!name || !description) {
    throw new AiProviderError("场景名称与描述不能为空", "SCHEMA_INVALID");
  }
  const tags = Array.isArray(item.tags)
    ? item.tags.map((tag) => String(tag).trim()).filter(Boolean)
    : [];
  return {
    location: {
      name,
      description,
      environment: String(item.environment || "").trim(),
      atmosphere: String(item.atmosphere || "").trim(),
      visualStyle: String(item.visualStyle || "").trim(),
      tags,
    },
  };
}
