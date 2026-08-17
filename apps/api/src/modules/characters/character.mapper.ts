import type {
  Character as PrismaCharacter,
  CharacterRelationship as PrismaRelationship,
  CharacterRelationType as PrismaRelationType,
  CharacterStatus as PrismaStatus,
  Prisma,
} from "@prisma/client";
import {
  CharacterRelationType,
  CharacterStatus,
  type Character,
  type CharacterImageProfile,
  type CharacterRelationship,
  type CharacterVoiceProfile,
} from "@ai-drama-studio/types";

type CharacterRow = PrismaCharacter & {
  civilization: { id: string; name: string } | null;
  faction: { id: string; name: string } | null;
};

type RelationshipRow = PrismaRelationship & {
  fromCharacter: {
    id: string;
    name: string;
    alias: string | null;
    role: string | null;
  };
  toCharacter: {
    id: string;
    name: string;
    alias: string | null;
    role: string | null;
  };
};

export const CHARACTER_INCLUDE = {
  civilization: { select: { id: true, name: true } },
  faction: { select: { id: true, name: true } },
} as const;

export const RELATIONSHIP_INCLUDE = {
  fromCharacter: {
    select: { id: true, name: true, alias: true, role: true },
  },
  toCharacter: {
    select: { id: true, name: true, alias: true, role: true },
  },
} as const;

export function mapCharacter(row: CharacterRow): Character {
  return {
    id: row.id,
    projectId: row.projectId,
    worldId: row.worldId,
    civilizationId: row.civilizationId,
    factionId: row.factionId,
    name: row.name,
    alias: row.alias,
    gender: row.gender,
    age: row.age,
    race: row.race,
    identity: row.identity,
    role: row.role,
    description: row.description,
    personality: row.personality,
    appearance: row.appearance,
    background: row.background,
    motivation: row.motivation,
    goal: row.goal,
    conflict: row.conflict,
    ability: row.ability,
    personalityProfile: asRecord(row.personalityProfile),
    appearanceProfile: asRecord(row.appearanceProfile),
    abilities: Array.isArray(row.abilities) ? row.abilities : null,
    voiceProfile: asRecord(row.voiceProfile) as CharacterVoiceProfile | null,
    imageProfile: asRecord(row.imageProfile) as CharacterImageProfile | null,
    metadata: asRecord(row.metadata),
    status: row.status as CharacterStatus,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    civilization: row.civilization,
    faction: row.faction,
  };
}

export function mapRelationship(row: RelationshipRow): CharacterRelationship {
  return {
    id: row.id,
    projectId: row.projectId,
    fromCharacterId: row.fromCharacterId,
    toCharacterId: row.toCharacterId,
    type: row.type as CharacterRelationType,
    label: row.label,
    description: row.description,
    strength: row.strength,
    metadata: asRecord(row.metadata),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    fromCharacter: row.fromCharacter,
    toCharacter: row.toCharacter,
  };
}

export function toPrismaStatus(status?: CharacterStatus): PrismaStatus | undefined {
  return status as PrismaStatus | undefined;
}

export function toPrismaRelationType(
  type: CharacterRelationType,
): PrismaRelationType {
  return type as PrismaRelationType;
}

function asRecord(value: Prisma.JsonValue | null): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}
