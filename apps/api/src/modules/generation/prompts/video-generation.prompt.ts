import {
  buildVideoNegativePrompt,
  buildVideoPrompt,
  type ShotVideoPromptSource,
} from "@ai-drama-studio/core";

export function buildVideoGenerationPrompt(input: {
  shot: ShotVideoPromptSource;
  promptOverride?: string | null;
  negativeOverride?: string | null;
  sourceImageNote?: string | null;
}): { prompt: string; negativePrompt?: string } {
  const prompt = [
    buildVideoPrompt(input.shot, input.promptOverride),
    input.sourceImageNote?.trim()
      ? `Animate from the provided source still. ${input.sourceImageNote.trim()}`
      : "",
  ]
    .filter(Boolean)
    .join(" ");
  return {
    prompt,
    negativePrompt: buildVideoNegativePrompt(input.shot, input.negativeOverride),
  };
}
