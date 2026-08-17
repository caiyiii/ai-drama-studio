import {
  EPISODE_STATUS_LABELS,
  SEASON_STATUS_LABELS,
  EpisodeStatus,
  SeasonStatus,
  type EpisodeStoryState,
  type StoryBibleRules,
  type StoryCharacterSummary,
} from "@ai-drama-studio/types";

export function getSeasonStatusLabel(status: SeasonStatus): string {
  return SEASON_STATUS_LABELS[status] ?? status;
}

export function getEpisodeStatusLabel(status: EpisodeStatus): string {
  return EPISODE_STATUS_LABELS[status] ?? status;
}

export function emptyStoryBibleRules(): StoryBibleRules {
  return {
    worldRules: [],
    characterRules: [],
    narrativeRules: [],
    forbidden: [],
  };
}

export function emptyEpisodeStoryState(): EpisodeStoryState {
  return {
    characters: [],
    relationships: [],
    worldChanges: [],
    factionChanges: [],
    unresolvedThreads: [],
    revealedSecrets: [],
    foreshadowing: [],
  };
}

export function formatEpisodeCode(number: number): string {
  return `E${String(number).padStart(2, "0")}`;
}

export function summarizeCharacterForStory(input: {
  id: string;
  name: string;
  role: string | null;
  identity: string | null;
  personality: string | null;
  goal: string | null;
  conflict: string | null;
}): StoryCharacterSummary {
  return {
    id: input.id,
    name: input.name,
    role: input.role,
    identity: input.identity,
    personality: input.personality,
    goal: input.goal,
    conflict: input.conflict,
  };
}

export function hasEpisodeNumberGap(numbers: number[]): boolean {
  if (numbers.length === 0) {
    return false;
  }
  const sorted = [...new Set(numbers)].sort((a, b) => a - b);
  if (sorted[0] !== 1) {
    return true;
  }
  for (let i = 1; i < sorted.length; i += 1) {
    if (sorted[i] !== sorted[i - 1] + 1) {
      return true;
    }
  }
  return false;
}

export function previousEpisodeNumber(number: number): number | null {
  return number > 1 ? number - 1 : null;
}

export function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

export function notesFromList(value: string[] | string | null | undefined): string | null {
  if (Array.isArray(value)) {
    const text = value.map((item) => item.trim()).filter(Boolean).join("\n");
    return text || null;
  }
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  return null;
}
