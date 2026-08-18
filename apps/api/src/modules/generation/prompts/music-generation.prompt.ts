import { buildMusicPrompt } from "@ai-drama-studio/core";
import type { MusicContext } from "@ai-drama-studio/types";

export function buildMusicGenerationPrompt(input: {
  userPrompt: string;
  context: MusicContext;
  style?: string;
  mood?: string;
  genre?: string;
  instrumentation?: string;
  tempo?: string;
  isInstrumental?: boolean;
  negativePrompt?: string;
}): string {
  return buildMusicPrompt(input);
}
