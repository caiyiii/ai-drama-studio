import { Prisma } from "@prisma/client";
import type { Scene, Script, ScriptBlock, ScriptBlockAsset } from "@ai-drama-studio/types";
import { mapAsset } from "../assets/asset.mapper";

export const SCRIPT_BLOCK_INCLUDE = {
  character: { select: { id: true, name: true, alias: true, role: true } },
  blockAssets: {
    include: { asset: true },
    orderBy: [
      { isPrimary: "desc" as const },
      { sortOrder: "asc" as const },
      { createdAt: "asc" as const },
    ],
  },
};

function mapBlockAsset(row: {
  id: string;
  scriptBlockId: string;
  assetId: string;
  role: string;
  isPrimary: boolean;
  sortOrder: number;
  metadata: Prisma.JsonValue | null;
  createdAt: Date;
  asset?: Parameters<typeof mapAsset>[0];
}): ScriptBlockAsset {
  return {
    id: row.id,
    scriptBlockId: row.scriptBlockId,
    assetId: row.assetId,
    role: row.role as ScriptBlockAsset["role"],
    isPrimary: row.isPrimary,
    sortOrder: row.sortOrder,
    metadata: asRecord(row.metadata),
    createdAt: row.createdAt.toISOString(),
    asset: row.asset ? mapAsset(row.asset) : undefined,
  };
}

export function asRecord(
  value: Prisma.JsonValue | null,
): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

export function mapScriptBlock(row: {
  id: string;
  sceneId: string;
  order: number;
  type: string;
  content: string;
  characterId: string | null;
  metadata: Prisma.JsonValue | null;
  createdAt: Date;
  updatedAt: Date;
  character?: { id: string; name: string; alias: string | null; role: string | null } | null;
  blockAssets?: Array<Parameters<typeof mapBlockAsset>[0]>;
}): ScriptBlock {
  return {
    id: row.id,
    sceneId: row.sceneId,
    order: row.order,
    type: row.type as ScriptBlock["type"],
    content: row.content,
    characterId: row.characterId,
    character: row.character ?? null,
    metadata: asRecord(row.metadata),
    assets: row.blockAssets?.map(mapBlockAsset),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function mapScene(row: {
  id: string;
  scriptId: string;
  number: number;
  title: string;
  location: string | null;
  timeOfDay: string | null;
  summary: string | null;
  purpose: string | null;
  conflict: string | null;
  estimatedDurationSeconds: number | null;
  metadata: Prisma.JsonValue | null;
  createdAt: Date;
  updatedAt: Date;
  blocks?: Array<Parameters<typeof mapScriptBlock>[0]>;
}): Scene {
  return {
    id: row.id,
    scriptId: row.scriptId,
    number: row.number,
    title: row.title,
    location: row.location,
    timeOfDay: row.timeOfDay,
    summary: row.summary,
    purpose: row.purpose,
    conflict: row.conflict,
    estimatedDurationSeconds: row.estimatedDurationSeconds,
    metadata: asRecord(row.metadata),
    blocks: row.blocks?.map(mapScriptBlock),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function mapScript(row: {
  id: string;
  episodeId: string;
  projectId: string;
  title: string;
  version: number;
  status: string;
  logline: string | null;
  summary: string | null;
  estimatedDurationSeconds: number | null;
  metadata: Prisma.JsonValue | null;
  createdAt: Date;
  updatedAt: Date;
  scenes?: Array<Parameters<typeof mapScene>[0]>;
}): Script {
  return {
    id: row.id,
    episodeId: row.episodeId,
    projectId: row.projectId,
    title: row.title,
    version: row.version,
    status: row.status as Script["status"],
    logline: row.logline,
    summary: row.summary,
    estimatedDurationSeconds: row.estimatedDurationSeconds,
    metadata: asRecord(row.metadata),
    scenes: row.scenes?.map(mapScene),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
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
