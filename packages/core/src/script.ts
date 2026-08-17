import {
  SCRIPT_BLOCK_TYPE_LABELS,
  SCRIPT_STATUS_LABELS,
  ScriptBlockType,
  ScriptStatus,
} from "@ai-drama-studio/types";

export function getScriptStatusLabel(status: ScriptStatus): string {
  return SCRIPT_STATUS_LABELS[status] ?? status;
}

export function getScriptBlockTypeLabel(type: ScriptBlockType): string {
  return SCRIPT_BLOCK_TYPE_LABELS[type] ?? type;
}

export function isScriptBlockType(value: string): value is ScriptBlockType {
  return (Object.values(ScriptBlockType) as string[]).includes(value);
}

export function matchCharacterByName(
  name: string,
  characters: Array<{ id: string; name: string; alias: string | null; projectId: string }>,
  projectId: string,
): { id: string; name: string } | null {
  const target = name.trim();
  if (!target) {
    return null;
  }
  const scoped = characters.filter((item) => item.projectId === projectId);
  const exact = scoped.find((item) => item.name === target);
  if (exact) {
    return { id: exact.id, name: exact.name };
  }
  const alias = scoped.find((item) => item.alias === target);
  if (alias) {
    return { id: alias.id, name: alias.name };
  }
  const lower = target.toLowerCase();
  const fuzzy = scoped.find((item) => item.name.toLowerCase() === lower);
  return fuzzy ? { id: fuzzy.id, name: fuzzy.name } : null;
}
