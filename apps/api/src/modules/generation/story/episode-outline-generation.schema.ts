import type { EpisodeGenerationResult } from "@ai-drama-studio/types";
import {
  asRequiredString,
  asString,
  asStringArray,
  asStoryState,
  isRecord,
  rejectUnknownKeys,
  requireKeys,
  schemaError,
} from "../schema-utils";

const KEYS = [
  "title",
  "synopsis",
  "outline",
  "opening",
  "middle",
  "ending",
  "cliffhanger",
  "keyCharacters",
  "keyLocations",
  "conflict",
  "storyState",
];

export function validateEpisodeOutlineGenerationResult(
  value: unknown,
): EpisodeGenerationResult {
  const errors: string[] = [];
  if (!isRecord(value)) {
    throw schemaError("结果必须是 JSON 对象");
  }
  requireKeys(value, KEYS, errors);
  rejectUnknownKeys(value, KEYS, "result", errors);
  const result = {
    title: asRequiredString(value.title, "title", errors),
    synopsis: asString(value.synopsis),
    outline: asString(value.outline),
    opening: asString(value.opening),
    middle: asString(value.middle),
    ending: asString(value.ending),
    cliffhanger: asString(value.cliffhanger),
    keyCharacters: asStringArray(value.keyCharacters, "keyCharacters", errors),
    keyLocations: asStringArray(value.keyLocations, "keyLocations", errors),
    conflict: asString(value.conflict),
    storyState: asStoryState(value.storyState, "storyState", errors),
  };
  if (errors.length > 0) {
    throw schemaError(errors.join("；"));
  }
  return result;
}
