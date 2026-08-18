import { normalizeMusicGenerationResult } from "@ai-drama-studio/core";
import type { GeneratedAudio } from "@ai-drama-studio/types";
import { AiProviderError } from "../../ai/ai.errors";

export function validateMusicGenerationResult(raw: unknown): GeneratedAudio {
  try {
    return normalizeMusicGenerationResult(raw);
  } catch {
    throw new AiProviderError("音乐生成结果无效。", "SCHEMA_INVALID");
  }
}
