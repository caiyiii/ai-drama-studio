import type { AiProvider as AiProviderRow } from "@prisma/client";
import {
  AIProviderKind,
  SYSTEM_AI_PROVIDER_ID,
  type AIProvider,
  type AIProviderSource,
} from "@ai-drama-studio/types";
import type { ResolvedAiProvider } from "./provider-resolver";
import { getSystemProviderDisplayName } from "./system-provider-label";

export function toPublicAiProvider(row: AiProviderRow): AIProvider {
  return {
    id: row.id,
    name: row.name,
    provider: row.provider as AIProviderKind,
    baseUrl: row.baseUrl,
    model: row.model,
    isDefault: row.isDefault,
    enabled: row.enabled,
    hasApiKey: row.encryptedApiKey.length > 0,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toSystemPublicProvider(resolved: {
  kind: AIProviderKind;
  baseUrl: string;
  model: string;
  hasApiKey: boolean;
}): AIProvider {
  const now = new Date(0).toISOString();
  return {
    id: SYSTEM_AI_PROVIDER_ID,
    name: getSystemProviderDisplayName(resolved.baseUrl),
    provider: resolved.kind,
    baseUrl: resolved.baseUrl,
    model: resolved.model,
    isDefault: false,
    enabled: true,
    hasApiKey: resolved.hasApiKey,
    createdAt: now,
    updatedAt: now,
  };
}

export function toPublicFromResolved(
  resolved: ResolvedAiProvider,
): { source: AIProviderSource; provider: AIProvider } {
  if (resolved.source === "system") {
    return {
      source: "system",
      provider: toSystemPublicProvider({
        kind: resolved.kind as AIProviderKind,
        baseUrl: resolved.baseUrl,
        model: resolved.model,
        hasApiKey: Boolean(resolved.apiKey),
      }),
    };
  }
  return {
    source: resolved.source,
    provider: {
      id: resolved.id ?? "",
      name: resolved.name,
      provider: resolved.kind as AIProviderKind,
      baseUrl: resolved.baseUrl,
      model: resolved.model,
      isDefault: resolved.source === "default",
      enabled: true,
      hasApiKey: Boolean(resolved.apiKey),
      createdAt: resolved.createdAt,
      updatedAt: resolved.updatedAt,
    },
  };
}
