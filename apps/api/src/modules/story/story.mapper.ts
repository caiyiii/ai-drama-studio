import { Prisma } from "@prisma/client";
import type {
  Episode,
  EpisodeStoryState,
  Season,
  StoryBible,
  StoryBibleRules,
} from "@ai-drama-studio/types";

export function asRecord(
  value: Prisma.JsonValue | null,
): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

export function asRules(value: Prisma.JsonValue | null): StoryBibleRules | null {
  const record = asRecord(value);
  if (!record) {
    return null;
  }
  return {
    worldRules: asStringList(record.worldRules),
    characterRules: asStringList(record.characterRules),
    narrativeRules: asStringList(record.narrativeRules),
    forbidden: asStringList(record.forbidden),
  };
}

export function asStoryState(
  value: Prisma.JsonValue | null,
): EpisodeStoryState | null {
  const record = asRecord(value);
  return record ? (record as EpisodeStoryState) : null;
}

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string");
}

export function mapStoryBible(row: {
  id: string;
  projectId: string;
  title: string;
  logline: string | null;
  premise: string | null;
  theme: string | null;
  tone: string | null;
  style: string | null;
  audience: string | null;
  storyPromise: string | null;
  rules: Prisma.JsonValue | null;
  timelineSummary: string | null;
  continuityNotes: string | null;
  metadata: Prisma.JsonValue | null;
  createdAt: Date;
  updatedAt: Date;
}): StoryBible {
  return {
    id: row.id,
    projectId: row.projectId,
    title: row.title,
    logline: row.logline,
    premise: row.premise,
    theme: row.theme,
    tone: row.tone,
    style: row.style,
    audience: row.audience,
    storyPromise: row.storyPromise,
    rules: asRules(row.rules),
    timelineSummary: row.timelineSummary,
    continuityNotes: row.continuityNotes,
    metadata: asRecord(row.metadata),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function mapSeason(
  row: {
    id: string;
    projectId: string;
    number: number;
    title: string;
    synopsis: string | null;
    outline: string | null;
    status: string;
    metadata: Prisma.JsonValue | null;
    createdAt: Date;
    updatedAt: Date;
  },
  episodeCount?: number,
): Season {
  return {
    id: row.id,
    projectId: row.projectId,
    number: row.number,
    title: row.title,
    synopsis: row.synopsis,
    outline: row.outline,
    status: row.status as Season["status"],
    metadata: asRecord(row.metadata),
    episodeCount,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function mapEpisode(row: {
  id: string;
  projectId: string;
  seasonId: string;
  number: number;
  title: string;
  synopsis: string | null;
  outline: string | null;
  status: string;
  durationSeconds: number | null;
  storyState: Prisma.JsonValue | null;
  continuityNotes: string | null;
  metadata: Prisma.JsonValue | null;
  createdAt: Date;
  updatedAt: Date;
}): Episode {
  return {
    id: row.id,
    projectId: row.projectId,
    seasonId: row.seasonId,
    number: row.number,
    title: row.title,
    synopsis: row.synopsis,
    outline: row.outline,
    status: row.status as Episode["status"],
    durationSeconds: row.durationSeconds,
    storyState: asStoryState(row.storyState),
    continuityNotes: row.continuityNotes,
    metadata: asRecord(row.metadata),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
