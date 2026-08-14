import { WORLD_NAV } from "@ai-drama-studio/config";
import type { PowerSystemLevel } from "@ai-drama-studio/types";

export function getWorldNav() {
  return WORLD_NAV;
}

export function parsePowerRules(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string");
}

export function parsePowerLevels(value: unknown): PowerSystemLevel[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const levels: PowerSystemLevel[] = [];
  for (const item of value) {
    if (typeof item === "string" && item.trim()) {
      levels.push({ name: item.trim() });
      continue;
    }
    if (item && typeof item === "object" && "name" in item) {
      const name = (item as { name: unknown }).name;
      if (typeof name === "string" && name.trim()) {
        const descriptionValue = (item as { description?: unknown }).description;
        levels.push({
          name: name.trim(),
          description:
            typeof descriptionValue === "string" ? descriptionValue : undefined,
        });
      }
    }
  }
  return levels;
}
