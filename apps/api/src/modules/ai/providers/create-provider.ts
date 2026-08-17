import { AiProviderKind } from "@prisma/client";
import { AiProviderError } from "../ai.errors";
import type { AiProvider } from "../ai.provider";
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
  if ((Object.values(AiProviderKind) as string[]).includes(normalized)) {
    return normalized as AiProviderKind;
  }
  return AiProviderKind.OPENAI_COMPATIBLE;
}

export function isSupportedProviderKind(kind: AiProviderKind | string): boolean {
  return (
    kind === AiProviderKind.OPENAI_COMPATIBLE ||
    kind === "openai-compatible" ||
    kind === "OPENAI_COMPATIBLE"
  );
}
