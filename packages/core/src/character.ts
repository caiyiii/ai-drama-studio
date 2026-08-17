import {
  CHARACTER_RELATION_TYPE_LABELS,
  CHARACTER_STATUS_LABELS,
  CharacterRelationType,
  CharacterStatus,
  type Character,
  type CharacterContext,
  type CharacterRelationship,
  type Faction,
} from "@ai-drama-studio/types";

export const DEFAULT_RELATION_STRENGTH = 3;

export function getCharacterStatusLabel(status: CharacterStatus): string {
  return CHARACTER_STATUS_LABELS[status] ?? status;
}

export function getCharacterRelationTypeLabel(
  type: CharacterRelationType,
): string {
  return CHARACTER_RELATION_TYPE_LABELS[type] ?? type;
}

export function isActiveCharacter(
  character: Pick<Character, "status">,
): boolean {
  return character.status === CharacterStatus.ACTIVE;
}

export function isSelfRelationship(
  fromCharacterId: string,
  toCharacterId: string,
): boolean {
  return fromCharacterId === toCharacterId;
}

export function canLinkCharacters(
  from: Pick<Character, "id" | "projectId">,
  to: Pick<Character, "id" | "projectId">,
): boolean {
  return from.projectId === to.projectId && from.id !== to.id;
}

export function clampRelationStrength(value: number | null | undefined): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return DEFAULT_RELATION_STRENGTH;
  }
  return Math.min(5, Math.max(1, Math.round(value)));
}

export function filterFactionsByCivilization(
  factions: Faction[],
  civilizationId: string | null | undefined,
): Faction[] {
  if (!civilizationId) {
    return factions;
  }
  return factions.filter(
    (item) => !item.civilizationId || item.civilizationId === civilizationId,
  );
}

export function relationshipsForCharacter(
  items: CharacterRelationship[],
  characterId: string,
): CharacterRelationship[] {
  return items.filter(
    (item) =>
      item.fromCharacterId === characterId || item.toCharacterId === characterId,
  );
}

export function buildCharacterContext(
  character: Pick<
    Character,
    | "name"
    | "alias"
    | "gender"
    | "age"
    | "role"
    | "status"
    | "description"
    | "personality"
    | "appearance"
    | "background"
    | "motivation"
    | "goal"
    | "ability"
    | "civilization"
    | "faction"
  >,
): CharacterContext {
  return {
    name: character.name,
    alias: character.alias,
    gender: character.gender,
    age: character.age,
    role: character.role,
    status: character.status,
    civilization: character.civilization?.name ?? null,
    faction: character.faction?.name ?? null,
    description: character.description,
    personality: character.personality,
    appearance: character.appearance,
    background: character.background,
    motivation: character.motivation,
    goal: character.goal,
    ability: character.ability,
  };
}

export function serializeCharacterContext(character: Character): string {
  const context = buildCharacterContext(character);
  const lines = [
    `姓名：${context.name}`,
    context.alias ? `别名：${context.alias}` : null,
    context.role ? `定位：${context.role}` : null,
    context.gender ? `性别：${context.gender}` : null,
    context.age !== null ? `年龄：${context.age}` : null,
    context.civilization ? `文明：${context.civilization}` : null,
    context.faction ? `势力：${context.faction}` : null,
    `状态：${getCharacterStatusLabel(context.status)}`,
    context.description ? `简介：${context.description}` : null,
    context.personality ? `性格：${context.personality}` : null,
    context.appearance ? `外貌：${context.appearance}` : null,
    context.background ? `背景：${context.background}` : null,
    context.motivation ? `动机：${context.motivation}` : null,
    context.goal ? `目标：${context.goal}` : null,
    context.ability ? `能力：${context.ability}` : null,
  ];
  return lines.filter((line): line is string => Boolean(line)).join("\n");
}
