import {
  CAMERA_ANGLE_LABELS,
  CAMERA_MOVEMENT_LABELS,
  CameraAngle,
  CameraMovement,
  STORYBOARD_SHOT_SIZE_LABELS,
  STORYBOARD_SHOT_TYPE_LABELS,
  STORYBOARD_STATUS_LABELS,
  STORYBOARD_TRANSITION_LABELS,
  StoryboardShotSize,
  StoryboardShotType,
  StoryboardStatus,
  StoryboardTransition,
  type StoryCharacterSummary,
} from "@ai-drama-studio/types";

export function getStoryboardStatusLabel(status: StoryboardStatus): string {
  return STORYBOARD_STATUS_LABELS[status] ?? status;
}

export function getStoryboardShotTypeLabel(type: StoryboardShotType): string {
  return STORYBOARD_SHOT_TYPE_LABELS[type] ?? type;
}

export function getStoryboardShotSizeLabel(size: StoryboardShotSize): string {
  return STORYBOARD_SHOT_SIZE_LABELS[size] ?? size;
}

export function getCameraMovementLabel(movement: CameraMovement): string {
  return CAMERA_MOVEMENT_LABELS[movement] ?? movement;
}

export function getCameraAngleLabel(angle: CameraAngle): string {
  return CAMERA_ANGLE_LABELS[angle] ?? angle;
}

export function getStoryboardTransitionLabel(transition: StoryboardTransition): string {
  return STORYBOARD_TRANSITION_LABELS[transition] ?? transition;
}

export function isConsecutiveShotNumbers(numbers: number[]): boolean {
  if (numbers.length === 0) {
    return false;
  }
  const sorted = [...numbers].sort((a, b) => a - b);
  if (sorted[0] !== 1) {
    return false;
  }
  for (let i = 1; i < sorted.length; i += 1) {
    if (sorted[i] !== sorted[i - 1] + 1) {
      return false;
    }
  }
  return new Set(sorted).size === sorted.length;
}

export function isStoryboardStale(
  sourceScriptVersion: number,
  currentScriptVersion: number | null | undefined,
): boolean {
  if (!currentScriptVersion) {
    return false;
  }
  return sourceScriptVersion !== currentScriptVersion;
}

export function summarizeVisualProfile(input: {
  appearance?: string | null;
  appearanceProfile?: unknown;
  imageProfile?: unknown;
}): string | null {
  const parts: string[] = [];
  if (input.appearance?.trim()) {
    parts.push(input.appearance.trim());
  }
  const appearance = asRecord(input.appearanceProfile);
  const image = asRecord(input.imageProfile);
  for (const key of ["hair", "face", "body", "clothing", "colors", "visualTraits", "age", "species"]) {
    const value = appearance?.[key] ?? image?.[key];
    if (typeof value === "string" && value.trim()) {
      parts.push(`${key}:${value.trim()}`);
    }
  }
  const visualStyle = image?.visualStyle;
  if (typeof visualStyle === "string" && visualStyle.trim()) {
    parts.push(`style:${visualStyle.trim()}`);
  }
  const identityPrompt = image?.identityPrompt;
  if (typeof identityPrompt === "string" && identityPrompt.trim()) {
    parts.push(identityPrompt.trim());
  }
  return parts.length > 0 ? parts.slice(0, 8).join("；") : null;
}

export function summarizeCharacterForStoryboard(input: {
  id: string;
  name: string;
  role: string | null;
  identity: string | null;
  personality: string | null;
  goal: string | null;
  conflict: string | null;
  appearance?: string | null;
  appearanceProfile?: unknown;
  imageProfile?: unknown;
  abilities?: string | null;
  civilization?: string | null;
  faction?: string | null;
}): StoryCharacterSummary {
  return {
    id: input.id,
    name: input.name,
    role: input.role,
    identity: input.identity,
    personality: input.personality,
    goal: input.goal,
    conflict: input.conflict,
    appearance: input.appearance ?? null,
    visualSummary: summarizeVisualProfile(input),
    abilities: input.abilities ?? null,
    civilization: input.civilization ?? null,
    faction: input.faction ?? null,
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}
