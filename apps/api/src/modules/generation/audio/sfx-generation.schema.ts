import { normalizeSfxGenerationResult } from "@ai-drama-studio/core";
import type { GeneratedAudio } from "@ai-drama-studio/types";
import { AiProviderError } from "../../ai/ai.errors";

export function validateSfxGenerationResult(raw: unknown): GeneratedAudio {
  try {
    return normalizeSfxGenerationResult(raw);
  } catch {
    throw new AiProviderError("音效生成结果无效。", "SCHEMA_INVALID");
  }
}
