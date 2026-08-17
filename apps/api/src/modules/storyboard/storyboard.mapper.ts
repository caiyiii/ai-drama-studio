import { Prisma } from "@prisma/client";
import { isStoryboardStale } from "@ai-drama-studio/core";
import type { Storyboard, StoryboardShot } from "@ai-drama-studio/types";
import { mapShotAsset } from "../assets/asset.mapper";

export function asRecord(
  value: Prisma.JsonValue | null,
): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

export function asStringIds(value: Prisma.JsonValue | null): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string" && Boolean(item));
}

export function emptyToNull(value?: string | null): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === null || !value.trim()) {
    return null;
  }
  return value.trim();
}

export function mapStoryboardShot(row: {
  id: string;
  storyboardId: string;
  sceneId: string | null;
  scriptBlockId: string | null;
  shotNumber: number;
  shotType: string;
  shotSize: string;
  cameraMovement: string;
  cameraAngle: string;
  composition: string | null;
  visualDescription: string;
  characterIds: Prisma.JsonValue | null;
  location: string | null;
  action: string | null;
  dialogue: string | null;
  narration: string | null;
  direction: string | null;
  durationSeconds: number;
  transition: string;
  lighting: string | null;
  mood: string | null;
  visualStyle: string | null;
  imagePrompt: string | null;
  videoPrompt: string | null;
  negativePrompt: string | null;
  continuityNotes: string | null;
  cameraMovementParams: Prisma.JsonValue | null;
  metadata: Prisma.JsonValue | null;
  createdAt: Date;
  updatedAt: Date;
  shotAssets?: Array<Parameters<typeof mapShotAsset>[0]>;
}): StoryboardShot {
  const metadata = asRecord(row.metadata);
  const extraIds = Array.isArray(metadata?.sourceScriptBlockIds)
    ? (metadata.sourceScriptBlockIds as unknown[]).filter(
        (item): item is string => typeof item === "string",
      )
    : [];
  const scriptBlockIds = extraIds.length > 0
    ? extraIds
    : row.scriptBlockId
      ? [row.scriptBlockId]
      : [];
  return {
    id: row.id,
    storyboardId: row.storyboardId,
    sceneId: row.sceneId,
    scriptBlockId: row.scriptBlockId,
    scriptBlockIds,
    shotNumber: row.shotNumber,
    shotType: row.shotType as StoryboardShot["shotType"],
    shotSize: row.shotSize as StoryboardShot["shotSize"],
    cameraMovement: row.cameraMovement as StoryboardShot["cameraMovement"],
    cameraAngle: row.cameraAngle as StoryboardShot["cameraAngle"],
    composition: row.composition,
    visualDescription: row.visualDescription,
    characterIds: asStringIds(row.characterIds),
    location: row.location,
    action: row.action,
    dialogue: row.dialogue,
    narration: row.narration,
    direction: row.direction,
    durationSeconds: row.durationSeconds,
    transition: row.transition as StoryboardShot["transition"],
    lighting: row.lighting,
    mood: row.mood,
    visualStyle: row.visualStyle,
    imagePrompt: row.imagePrompt,
    videoPrompt: row.videoPrompt,
    negativePrompt: row.negativePrompt,
    continuityNotes: row.continuityNotes,
    cameraMovementParams: asRecord(row.cameraMovementParams),
    metadata,
    assets: row.shotAssets?.map(mapShotAsset) ?? [],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function mapStoryboard(
  row: {
    id: string;
    episodeId: string;
    projectId: string;
    version: number;
    status: string;
    title: string;
    description: string | null;
    totalDurationSeconds: number | null;
    sourceScriptVersion: number;
    metadata: Prisma.JsonValue | null;
    createdAt: Date;
    updatedAt: Date;
    shots?: Array<Parameters<typeof mapStoryboardShot>[0]>;
  },
  currentScriptVersion?: number | null,
): Storyboard {
  return {
    id: row.id,
    episodeId: row.episodeId,
    projectId: row.projectId,
    version: row.version,
    status: row.status as Storyboard["status"],
    title: row.title,
    description: row.description,
    totalDurationSeconds: row.totalDurationSeconds,
    sourceScriptVersion: row.sourceScriptVersion,
    stale: isStoryboardStale(row.sourceScriptVersion, currentScriptVersion),
    metadata: asRecord(row.metadata),
    shots: row.shots?.map(mapStoryboardShot),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
