import { AssetStatus, AssetType, type Asset, type ScriptBlockAsset, type StoryboardShotAsset } from "@ai-drama-studio/types";
import type { Prisma } from "@prisma/client";

function asRecord(value: Prisma.JsonValue | null | undefined): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

export function mapAsset(row: {
  id: string;
  projectId: string;
  type: string;
  status: string;
  name: string;
  mimeType: string | null;
  storageKey: string | null;
  url: string | null;
  thumbnailUrl: string | null;
  width: number | null;
  height: number | null;
  durationSeconds: number | null;
  sizeBytes: number | null;
  provider: string | null;
  model: string | null;
  version: number;
  generationTaskId: string | null;
  metadata: Prisma.JsonValue | null;
  createdAt: Date;
  updatedAt: Date;
}): Asset {
  return {
    id: row.id,
    projectId: row.projectId,
    type: row.type as AssetType,
    status: row.status as AssetStatus,
    name: row.name,
    mimeType: row.mimeType,
    storageKey: row.storageKey,
    url: row.url,
    thumbnailUrl: row.thumbnailUrl,
    width: row.width,
    height: row.height,
    durationSeconds: row.durationSeconds,
    sizeBytes: row.sizeBytes,
    provider: row.provider,
    model: row.model,
    version: row.version,
    generationTaskId: row.generationTaskId,
    metadata: asRecord(row.metadata),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function mapShotAsset(row: {
  id: string;
  shotId: string;
  assetId: string;
  role: string;
  isPrimary: boolean;
  sortOrder: number;
  metadata: Prisma.JsonValue | null;
  createdAt: Date;
  asset?: Parameters<typeof mapAsset>[0];
}): StoryboardShotAsset {
  return {
    id: row.id,
    shotId: row.shotId,
    assetId: row.assetId,
    role: row.role as StoryboardShotAsset["role"],
    isPrimary: row.isPrimary,
    sortOrder: row.sortOrder,
    metadata: asRecord(row.metadata),
    createdAt: row.createdAt.toISOString(),
    asset: row.asset ? mapAsset(row.asset) : undefined,
  };
}

export function mapBlockAsset(row: {
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
