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
  requireKeys(value, ["season", "existingEpisodes", "newEpisodes"], errors);
  rejectUnknownKeys(value, ["season", "existingEpisodes", "newEpisodes"], "result", errors);
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
  const existingEpisodes = asArray(value.existingEpisodes, "existingEpisodes", errors).map(
    (item, index) => {
      if (!isRecord(item)) {
        errors.push(`existingEpisodes[${index}] 必须是对象`);
        return null;
      }
      requireKeys(
        item,
        ["number", "title", "synopsis"],
        errors,
        `existingEpisodes[${index}]`,
      );
      rejectUnknownKeys(
        item,
        ["number", "title", "synopsis"],
        `existingEpisodes[${index}]`,
        errors,
      );
      return {
        number: asInteger(item.number, `existingEpisodes[${index}].number`, errors),
        title: asRequiredString(item.title, `existingEpisodes[${index}].title`, errors),
        synopsis: asString(item.synopsis),
      };
    },
  );
  const newEpisodes = asArray(value.newEpisodes, "newEpisodes", errors).map((item, index) => {
    if (!isRecord(item)) {
      errors.push(`newEpisodes[${index}] 必须是对象`);
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
      `newEpisodes[${index}]`,
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
      `newEpisodes[${index}]`,
      errors,
    );
    return {
      number: asInteger(item.number, `newEpisodes[${index}].number`, errors),
      title: asRequiredString(item.title, `newEpisodes[${index}].title`, errors),
      synopsis: asString(item.synopsis),
      outline: asString(item.outline),
      keyCharacters: asStringArray(item.keyCharacters, `newEpisodes[${index}].keyCharacters`, errors),
      keyLocations: asStringArray(item.keyLocations, `newEpisodes[${index}].keyLocations`, errors),
      conflict: asString(item.conflict),
      cliffhanger: asString(item.cliffhanger),
      storyStateChanges: asStoryState(
        item.storyStateChanges,
        `newEpisodes[${index}].storyStateChanges`,
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
  const validExistingEpisodes =
    existingEpisodes.filter(Boolean) as SeasonGenerationResult["existingEpisodes"];
  const validNewEpisodes = newEpisodes.filter(Boolean) as SeasonGenerationResult["newEpisodes"];
  const numbers = validNewEpisodes.map((item) => item.number);
  if (new Set(numbers).size !== numbers.length) {
    throw schemaError("newEpisodes.number 不能重复");
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
    existingEpisodes: validExistingEpisodes,
    newEpisodes: validNewEpisodes,
  };
}
