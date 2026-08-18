import {
  SFX_DURATION_MAX_SECONDS,
  SFX_DURATION_MIN_SECONDS,
} from "@ai-drama-studio/config";
import type { GeneratedAudio, SfxContext, SfxGenerationInput } from "@ai-drama-studio/types";
import { mimeToAudioFormat } from "./tts";

export function normalizeSfxInput(input: SfxGenerationInput): SfxGenerationInput {
  return {
    ...input,
    episodeId: input.episodeId.trim(),
    prompt: input.prompt.trim(),
    category: input.category?.trim() || undefined,
    intensity: input.intensity?.trim() || undefined,
    negativePrompt: input.negativePrompt?.trim() || undefined,
    sceneId: input.sceneId?.trim() || undefined,
    shotId: input.shotId?.trim() || undefined,
  };
}

export function validateSfxDuration(durationSeconds?: number | null): void {
  if (typeof durationSeconds !== "number" || !Number.isFinite(durationSeconds)) {
    throw new Error("INVALID_DURATION");
  }
  if (
    durationSeconds < SFX_DURATION_MIN_SECONDS ||
    durationSeconds > SFX_DURATION_MAX_SECONDS
  ) {
    throw new Error("INVALID_DURATION");
  }
}

export function normalizeSfxGenerationResult(raw: unknown): GeneratedAudio {
  if (!raw || typeof raw !== "object") {
    throw new Error("SFX_GENERATION_FAILED");
  }
  const record = raw as Record<string, unknown>;
  const url = typeof record.url === "string" ? record.url : undefined;
  const base64 = typeof record.base64 === "string" ? record.base64 : undefined;
  if (!url && !base64) {
    throw new Error("SFX_GENERATION_FAILED");
  }
  return {
    url,
    base64,
    mimeType: typeof record.mimeType === "string" ? record.mimeType : "audio/mpeg",
    format:
      typeof record.format === "string"
        ? record.format
        : mimeToAudioFormat(String(record.mimeType || "")),
    durationSeconds:
      typeof record.durationSeconds === "number" ? record.durationSeconds : undefined,
    provider: typeof record.provider === "string" ? record.provider : undefined,
    model: typeof record.model === "string" ? record.model : undefined,
    providerRequestId:
      typeof record.providerRequestId === "string"
        ? record.providerRequestId
        : undefined,
    metadata:
      record.metadata && typeof record.metadata === "object"
        ? (record.metadata as Record<string, unknown>)
        : undefined,
  };
}

export function buildSfxPrompt(input: {
  userPrompt: string;
  context: SfxContext;
  category?: string;
  intensity?: string;
  negativePrompt?: string;
}): string {
  const lines = [
    input.userPrompt,
    input.context.episodeTitle ? `Episode: ${input.context.episodeTitle}` : "",
    input.context.sceneTitle ? `Scene: ${input.context.sceneTitle}` : "",
    input.context.shotAction ? `Action: ${truncate(input.context.shotAction, 240)}` : "",
    input.context.shotVisualDescription
      ? `Visual: ${truncate(input.context.shotVisualDescription, 240)}`
      : "",
    input.context.shotEnvironment
      ? `Environment: ${truncate(input.context.shotEnvironment, 160)}`
      : "",
    input.category ? `Category: ${input.category}` : "",
    input.intensity ? `Intensity: ${input.intensity}` : "",
    input.negativePrompt ? `Avoid: ${input.negativePrompt}` : "",
  ].filter(Boolean);
  return lines.join("\n");
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}
