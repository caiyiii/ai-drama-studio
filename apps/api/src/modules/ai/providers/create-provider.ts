import { AiProviderKind } from "@prisma/client";
import { FAL_DEFAULT_BASE_URL } from "@ai-drama-studio/config";
import { AiProviderError } from "../ai.errors";
import type { AiProvider } from "../ai.provider";
import { FalProvider } from "./fal/fal.provider";
import { OpenAiCompatibleProvider } from "./openai-compatible.provider";

export interface RuntimeProviderConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

export function instantiateAiProvider(
  kind: AiProviderKind | string,
  config: RuntimeProviderConfig,
): AiProvider {
  switch (kind) {
    case AiProviderKind.OPENAI_COMPATIBLE:
    case "openai-compatible":
    case "OPENAI_COMPATIBLE":
      return new OpenAiCompatibleProvider(config);
    case AiProviderKind.FAL:
    case "FAL":
    case "fal":
      return new FalProvider({
        apiKey: config.apiKey,
        model: config.model,
        baseUrl: config.baseUrl?.trim() || FAL_DEFAULT_BASE_URL,
      });
    default:
      throw new AiProviderError(`暂不支持的 AI Provider：${kind}`, "UNAVAILABLE");
  }
}

export function parseEnvProviderKind(value: string): AiProviderKind {
  const normalized = value.trim().toUpperCase().replace(/-/g, "_");
  if (
    normalized === AiProviderKind.OPENAI_COMPATIBLE ||
    value.trim() === "openai-compatible"
  ) {
    return AiProviderKind.OPENAI_COMPATIBLE;
  }
  if (normalized === "FAL" || value.trim().toLowerCase() === "fal.ai") {
    return AiProviderKind.FAL;
  }
  if ((Object.values(AiProviderKind) as string[]).includes(normalized)) {
    return normalized as AiProviderKind;
  }
  return AiProviderKind.OPENAI_COMPATIBLE;
}

export function isSupportedProviderKind(kind: AiProviderKind | string): boolean {
  return (
    kind === AiProviderKind.OPENAI_COMPATIBLE ||
    kind === "openai-compatible" ||
    kind === "OPENAI_COMPATIBLE" ||
    kind === AiProviderKind.FAL ||
    kind === "FAL" ||
    kind === "fal"
  );
}

export function defaultBaseUrlForKind(kind: AiProviderKind | string): string | null {
  if (kind === AiProviderKind.FAL || kind === "FAL" || kind === "fal") {
    return FAL_DEFAULT_BASE_URL;
  }
  return null;
}
