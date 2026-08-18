import { buildTtsContext } from "@ai-drama-studio/core";
import type { CharacterVoiceProfile } from "@ai-drama-studio/types";

export function buildTtsGenerationPrompt(input: {
  projectName?: string | null;
  episodeTitle?: string | null;
  sceneTitle?: string | null;
  characterName?: string | null;
  voiceProfile?: CharacterVoiceProfile | null;
  text: string;
}) {
  return buildTtsContext(input);
}
