import type { VideoGenerationResult } from "@ai-drama-studio/types";
import { normalizeVideoGenerationResult } from "@ai-drama-studio/core";
import { AiProviderError } from "../../ai/ai.errors";

export function validateVideoGenerationResult(raw: unknown): VideoGenerationResult {
  try {
    return normalizeVideoGenerationResult(raw);
  } catch {
    throw new AiProviderError("视频生成结果无效。", "SCHEMA_INVALID");
  }
}
