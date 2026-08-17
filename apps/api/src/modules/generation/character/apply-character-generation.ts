import {
  CharacterRelationType,
  Prisma,
  type CharacterRelationType as PrismaRelationType,
} from "@prisma/client";
import type { CharacterGenerationResult } from "@ai-drama-studio/types";
import { AppError, ErrorCodes } from "../../../common/app-error";
import { HttpStatus } from "@nestjs/common";
import { clampRelationStrength, isSelfRelationship } from "@ai-drama-studio/core";

export type CharacterApplyClient = {
  world: {
    findUnique: (args: {
      where: { projectId: string };
    }) => Promise<{ id: string } | null>;
  };
  civilization: {
    findMany: (args: {
      where: { worldId: string };
    }) => Promise<Array<{ id: string; name: string }>>;
  };
  faction: {
    findMany: (args: {
      where: { worldId: string };
    }) => Promise<Array<{ id: string; name: string; civilizationId: string | null }>>;
  };
  character: {
    findMany: (args: {
      where: { projectId: string };
    }) => Promise<Array<{ id: string; name: string }>>;
    create: (args: {
      data: Prisma.CharacterUncheckedCreateInput;
    }) => Promise<{ id: string }>;
  };
  characterRelationship: {
    create: (args: {
      data: {
        projectId: string;
        fromCharacterId: string;
        toCharacterId: string;
        type: PrismaRelationType;
        label?: string | null;
        description?: string | null;
        strength: number;
      };
    }) => Promise<unknown>;
  };
  generationTask: {
    update: (args: {
      where: { id: string };
      data: { appliedAt: Date };
    }) => Promise<unknown>;
  };
};

export async function applyCharacterGenerationResult(
  tx: CharacterApplyClient,
  projectId: string,
  taskId: string,
  result: CharacterGenerationResult,
) {
  const name = result.character.name.trim();
  const existing = await tx.character.findMany({ where: { projectId } });
  const duplicate = existing.find(
    (item) => item.name.trim().toLowerCase() === name.toLowerCase(),
  );
  if (duplicate) {
    throw new AppError(
      HttpStatus.CONFLICT,
      ErrorCodes.CHARACTER_NAME_CONFLICT,
      `项目中已经存在名为 ${duplicate.name} 的角色`,
    );
  }

  const world = await tx.world.findUnique({ where: { projectId } });
  const civilizations = world
    ? await tx.civilization.findMany({ where: { worldId: world.id } })
    : [];
  const factions = world
    ? await tx.faction.findMany({ where: { worldId: world.id } })
    : [];

  const civilization =
    matchByName(civilizations, result.character.civilizationName) ?? null;
  const faction = matchByName(factions, result.character.factionName) ?? null;

  const created = await tx.character.create({
    data: {
      projectId,
      worldId: world?.id ?? null,
      civilizationId: civilization?.id ?? null,
      factionId: faction?.id ?? null,
      name,
      alias: emptyToNull(result.character.alias),
      gender: emptyToNull(result.character.gender),
      age: parseAge(result.character.age),
      race: emptyToNull(result.character.race),
      identity: emptyToNull(result.character.identity),
      role: emptyToNull(result.character.role),
      personality: profileToText(result.character.personality),
      appearance: profileToText(result.character.appearance),
      background: emptyToNull(result.character.background),
      goal: emptyToNull(result.character.goal),
      motivation: emptyToNull(result.character.motivation),
      conflict: emptyToNull(result.character.conflict),
      ability: abilitiesToText(result.character.abilities),
      personalityProfile: result.character.personality as Prisma.InputJsonValue,
      appearanceProfile: result.character.appearance as Prisma.InputJsonValue,
      abilities: result.character.abilities as Prisma.InputJsonValue,
      imageProfile: {
        visualStyle: null,
        referencePrompt: profileToText(result.character.appearance),
        negativePrompt: null,
        identityPrompt: emptyToNull(result.character.identity),
        seed: null,
        referenceAssetId: null,
        consistencyConfig: null,
      } as Prisma.InputJsonValue,
      voiceProfile: {
        voiceId: null,
        providerId: null,
        modelId: null,
        language: "zh-CN",
        gender: emptyToNull(result.character.gender),
        style: null,
      } as Prisma.InputJsonValue,
    },
  });

  const nameMap = new Map(
    existing.map((item) => [item.name.trim().toLowerCase(), item.id]),
  );
  nameMap.set(name.toLowerCase(), created.id);
  const seenRelations = new Set<string>();

  for (const relation of result.relationships) {
    const targetId = nameMap.get(relation.targetName.trim().toLowerCase());
    if (!targetId || isSelfRelationship(created.id, targetId)) {
      continue;
    }
    const type = toRelationType(relation.type);
    const key = `${created.id}:${targetId}:${type}`;
    if (seenRelations.has(key)) {
      continue;
    }
    seenRelations.add(key);
    await tx.characterRelationship.create({
      data: {
        projectId,
        fromCharacterId: created.id,
        toCharacterId: targetId,
        type,
        label: emptyToNull(relation.label),
        description: emptyToNull(relation.description),
        strength: clampRelationStrength(relation.strength),
      },
    });
  }

  await tx.generationTask.update({
    where: { id: taskId },
    data: { appliedAt: new Date() },
  });

  return created;
}

function matchByName<T extends { name: string }>(
  items: T[],
  name?: string,
): T | undefined {
  if (!name?.trim()) {
    return undefined;
  }
  const needle = name.trim().toLowerCase();
  return items.find((item) => item.name.trim().toLowerCase() === needle);
}

function emptyToNull(value?: string | null): string | null {
  if (!value || !value.trim()) {
    return null;
  }
  return value.trim();
}

function parseAge(value: string): number | null {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function profileToText(value: Record<string, unknown>): string | null {
  const parts = Object.values(value)
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
  return parts.length > 0 ? parts.join("；") : null;
}

function abilitiesToText(value: unknown[]): string | null {
  const parts = value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
  return parts.length > 0 ? parts.join("；") : null;
}

function toRelationType(value: string): PrismaRelationType {
  const normalized = value.trim().toUpperCase().replace(/[-\s]/g, "_");
  if ((Object.values(CharacterRelationType) as string[]).includes(normalized)) {
    return normalized as PrismaRelationType;
  }
  return CharacterRelationType.OTHER;
}
