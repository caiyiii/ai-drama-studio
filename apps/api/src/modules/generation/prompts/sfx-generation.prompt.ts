import { buildSfxPrompt } from "@ai-drama-studio/core";
import type { SfxContext } from "@ai-drama-studio/types";

export function buildSfxGenerationPrompt(input: {
  userPrompt: string;
  context: SfxContext;
  category?: string;
  intensity?: string;
  negativePrompt?: string;
}): string {
  return buildSfxPrompt(input);
}
