import type { SeasonGenerationResult } from "@ai-drama-studio/types";
import {
  asArray,
  asInteger,
  asRequiredString,
  asString,
  asStringArray,
  asStoryState,
  isRecord,
  rejectUnknownKeys,
  requireKeys,
  schemaError,
} from "../schema-utils";

export function validateSeasonOutlineGenerationResult(
  value: unknown,
): SeasonGenerationResult {
  const errors: string[] = [];
  if (!isRecord(value)) {
    throw schemaError("结果必须是 JSON 对象");
  }
  requireKeys(value, ["season", "episodes"], errors);
  rejectUnknownKeys(value, ["season", "episodes"], "result", errors);
  const season = value.season;
  if (!isRecord(season)) {
    errors.push("season 必须是对象");
  } else {
    requireKeys(
      season,
      ["title", "synopsis", "coreConflict", "beginning", "middle", "ending"],
      errors,
      "season",
    );
    rejectUnknownKeys(
      season,
      ["title", "synopsis", "coreConflict", "beginning", "middle", "ending"],
      "season",
      errors,
    );
  }
  const episodes = asArray(value.episodes, "episodes", errors).map((item, index) => {
    if (!isRecord(item)) {
      errors.push(`episodes[${index}] 必须是对象`);
      return null;
    }
    requireKeys(
      item,
      [
        "number",
        "title",
        "synopsis",
        "outline",
        "keyCharacters",
        "keyLocations",
        "conflict",
        "cliffhanger",
        "storyStateChanges",
      ],
      errors,
      `episodes[${index}]`,
    );
    rejectUnknownKeys(
      item,
      [
        "number",
        "title",
        "synopsis",
        "outline",
        "keyCharacters",
        "keyLocations",
        "conflict",
        "cliffhanger",
        "storyStateChanges",
      ],
      `episodes[${index}]`,
      errors,
    );
    return {
      number: asInteger(item.number, `episodes[${index}].number`, errors),
      title: asRequiredString(item.title, `episodes[${index}].title`, errors),
      synopsis: asString(item.synopsis),
      outline: asString(item.outline),
      keyCharacters: asStringArray(item.keyCharacters, `episodes[${index}].keyCharacters`, errors),
      keyLocations: asStringArray(item.keyLocations, `episodes[${index}].keyLocations`, errors),
      conflict: asString(item.conflict),
      cliffhanger: asString(item.cliffhanger),
      storyStateChanges: asStoryState(
        item.storyStateChanges,
        `episodes[${index}].storyStateChanges`,
        errors,
      ),
    };
  });
  if (errors.length > 0) {
    throw schemaError(errors.join("；"));
  }
  if (!isRecord(season)) {
    throw schemaError("season 必须是对象");
  }
  const validEpisodes = episodes.filter(Boolean) as SeasonGenerationResult["episodes"];
  if (validEpisodes.length === 0) {
    throw schemaError("episodes 不能为空");
  }
  const numbers = validEpisodes.map((item) => item.number);
  if (new Set(numbers).size !== numbers.length) {
    throw schemaError("episodes.number 不能重复");
  }
  return {
    season: {
      title: asString(season.title),
      synopsis: asString(season.synopsis),
      coreConflict: asString(season.coreConflict),
      beginning: asString(season.beginning),
      middle: asString(season.middle),
      ending: asString(season.ending),
    },
    episodes: validEpisodes,
  };
}
