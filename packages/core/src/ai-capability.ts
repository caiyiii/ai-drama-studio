import { AI_CAPABILITY_DEFINITIONS } from "@ai-drama-studio/config";
import { AiCapability, type AiCapabilityDefinition } from "@ai-drama-studio/types";

export const LEGACY_TEXT_CAPABILITIES: AiCapability[] = [
  AiCapability.CHAT,
  AiCapability.STRUCTURED_OUTPUT,
];

export function isAiCapability(value: string): value is AiCapability {
  return (Object.values(AiCapability) as string[]).includes(value);
}

export function isLegacyTextCapability(capability: string): boolean {
  return (LEGACY_TEXT_CAPABILITIES as string[]).includes(capability);
}

export function defaultProviderCapabilities(): AiCapability[] {
  return [...LEGACY_TEXT_CAPABILITIES];
}

export function getAiCapabilityDefinitions(): AiCapabilityDefinition[] {
  return AI_CAPABILITY_DEFINITIONS.map((item) => ({
    capability: item.capability as AiCapability,
    label: item.label,
    implemented: item.implemented,
  }));
}

export function getAiCapabilityLabel(capability: string): string {
  return (
    AI_CAPABILITY_DEFINITIONS.find((item) => item.capability === capability)?.label ??
    capability
  );
}

export function isAiCapabilityImplemented(capability: string): boolean {
  return (
    AI_CAPABILITY_DEFINITIONS.find((item) => item.capability === capability)
      ?.implemented ?? false
  );
}

export function providerSupportsCapability(
  capabilities:
    | Array<{ capability: string; enabled?: boolean }>
    | string[]
    | null
    | undefined,
  capability: string,
): boolean {
  if (!capabilities || capabilities.length === 0) {
    return isLegacyTextCapability(capability);
  }
  return capabilities.some((item) => {
    if (typeof item === "string") {
      return item === capability;
    }
    return item.capability === capability && item.enabled !== false;
  });
}

export function modelSupportsCapability(
  capabilities: string[] | null | undefined,
  capability: string,
): boolean {
  if (!capabilities || capabilities.length === 0) {
    return isLegacyTextCapability(capability);
  }
  return capabilities.includes(capability);
}

const KINDS_ALLOWING_MEDIA = new Set(["OPENAI_COMPATIBLE", "OPENAI"]);

const MEDIA_CAPABILITIES = new Set([
  AiCapability.IMAGE,
  AiCapability.VIDEO,
  AiCapability.IMAGE_TO_VIDEO,
]);

export function kindAllowsCapability(
  kind: string,
  capability: string,
): boolean {
  if (isLegacyTextCapability(capability)) {
    return true;
  }
  if (MEDIA_CAPABILITIES.has(capability as AiCapability)) {
    return KINDS_ALLOWING_MEDIA.has(kind);
  }
  return false;
}

export type CapabilityProviderSource = "PROJECT" | "USER" | "PLATFORM" | "SYSTEM";

export function toLegacyProviderSource(
  source: CapabilityProviderSource,
): "project" | "user" | "default" | "system" {
  switch (source) {
    case "PROJECT":
      return "project";
    case "USER":
      return "user";
    case "PLATFORM":
      return "default";
    case "SYSTEM":
      return "system";
  }
}
