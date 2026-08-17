import type { StoryBibleGenerationResult } from "@ai-drama-studio/types";
import {
  asArray,
  asRequiredString,
  asString,
  asStringArray,
  isRecord,
  rejectUnknownKeys,
  requireKeys,
  schemaError,
} from "../schema-utils";

const ROOT_KEYS = [
  "title",
  "logline",
  "premise",
  "theme",
  "tone",
  "style",
  "audience",
  "storyPromise",
  "rules",
  "timelineSummary",
  "continuityNotes",
];

export function validateStoryBibleGenerationResult(
  value: unknown,
): StoryBibleGenerationResult {
  const errors: string[] = [];
  if (!isRecord(value)) {
    throw schemaError("结果必须是 JSON 对象");
  }
  requireKeys(value, ROOT_KEYS, errors);
  rejectUnknownKeys(value, ROOT_KEYS, "result", errors);
  if (!isRecord(value.rules)) {
    errors.push("rules 必须是对象");
  } else {
    requireKeys(
      value.rules,
      ["worldRules", "characterRules", "narrativeRules", "forbidden"],
      errors,
      "rules",
    );
    rejectUnknownKeys(
      value.rules,
      ["worldRules", "characterRules", "narrativeRules", "forbidden"],
      "rules",
      errors,
    );
  }
  const notes = asArray(value.continuityNotes, "continuityNotes", errors).map((item) =>
    asString(item),
  );
  const rules = isRecord(value.rules) ? value.rules : {};
  const result: StoryBibleGenerationResult = {
    title: asRequiredString(value.title, "title", errors),
    logline: asString(value.logline),
    premise: asString(value.premise),
    theme: asString(value.theme),
    tone: asString(value.tone),
    style: asString(value.style),
    audience: asString(value.audience),
    storyPromise: asString(value.storyPromise),
    rules: {
      worldRules: asStringArray(rules.worldRules, "rules.worldRules", errors),
      characterRules: asStringArray(rules.characterRules, "rules.characterRules", errors),
      narrativeRules: asStringArray(rules.narrativeRules, "rules.narrativeRules", errors),
      forbidden: asStringArray(rules.forbidden, "rules.forbidden", errors),
    },
    timelineSummary: asString(value.timelineSummary),
    continuityNotes: notes.filter(Boolean),
  };
  if (errors.length > 0) {
    throw schemaError(errors.join("；"));
  }
  return result;
}
