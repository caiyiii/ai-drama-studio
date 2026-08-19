import type { Location as PrismaLocation } from "@prisma/client";
import type { Location } from "@ai-drama-studio/types";

export function mapLocation(row: PrismaLocation): Location {
  const tags = Array.isArray(row.tags)
    ? row.tags.map((item) => String(item)).filter(Boolean)
    : [];
  return {
    id: row.id,
    projectId: row.projectId,
    name: row.name,
    description: row.description,
    environment: row.environment,
    atmosphere: row.atmosphere,
    visualStyle: row.visualStyle,
    tags,
    metadata: (row.metadata as Record<string, unknown> | null) ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
