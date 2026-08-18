import type { GeneratedAudio } from "@ai-drama-studio/types";
import { normalizeTtsGenerationResult } from "@ai-drama-studio/core";
import { AiProviderError } from "../../ai/ai.errors";

export function validateTtsGenerationResult(raw: unknown): GeneratedAudio {
  try {
    return normalizeTtsGenerationResult(raw);
  } catch {
    throw new AiProviderError("语音生成结果无效。", "SCHEMA_INVALID");
  }
}
