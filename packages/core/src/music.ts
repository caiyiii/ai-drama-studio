import {
  MUSIC_DURATION_MAX_SECONDS,
  MUSIC_DURATION_MIN_SECONDS,
} from "@ai-drama-studio/config";
import type { GeneratedAudio, MusicContext, MusicGenerationInput } from "@ai-drama-studio/types";
import { mimeToAudioFormat } from "./tts";

export function normalizeMusicInput(input: MusicGenerationInput): MusicGenerationInput {
  return {
    ...input,
    episodeId: input.episodeId.trim(),
    prompt: input.prompt.trim(),
    style: input.style?.trim() || undefined,
    mood: input.mood?.trim() || undefined,
    genre: input.genre?.trim() || undefined,
    instrumentation: input.instrumentation?.trim() || undefined,
    tempo: input.tempo?.trim() || undefined,
    language: input.language?.trim() || undefined,
    title: input.title?.trim() || undefined,
    negativePrompt: input.negativePrompt?.trim() || undefined,
    intensity: input.intensity?.trim() || undefined,
  };
}

export function validateMusicDuration(durationSeconds?: number | null): void {
  if (typeof durationSeconds !== "number" || !Number.isFinite(durationSeconds)) {
    throw new Error("INVALID_DURATION");
  }
  if (
    durationSeconds < MUSIC_DURATION_MIN_SECONDS ||
    durationSeconds > MUSIC_DURATION_MAX_SECONDS
  ) {
    throw new Error("INVALID_DURATION");
  }
}

export function normalizeMusicGenerationResult(raw: unknown): GeneratedAudio {
  if (!raw || typeof raw !== "object") {
    throw new Error("MUSIC_GENERATION_FAILED");
  }
  const record = raw as Record<string, unknown>;
  const url = typeof record.url === "string" ? record.url : undefined;
  const base64 = typeof record.base64 === "string" ? record.base64 : undefined;
  if (!url && !base64) {
    throw new Error("MUSIC_GENERATION_FAILED");
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

export function getPrimaryEpisodeAudio<
  T extends { isPrimary?: boolean; role?: string },
>(assets: T[] | null | undefined, role: string): T | undefined {
  const rows = (assets ?? []).filter((item) => item.role === role);
  return rows.find((item) => item.isPrimary) ?? rows[0];
}

export function buildMusicPrompt(input: {
  userPrompt: string;
  context: MusicContext;
  style?: string;
  mood?: string;
  genre?: string;
  instrumentation?: string;
  tempo?: string;
  isInstrumental?: boolean;
  negativePrompt?: string;
}): string {
  const lines = [
    input.userPrompt,
    input.context.episodeTitle ? `Episode: ${input.context.episodeTitle}` : "",
    input.context.episodeOutline ? `Outline: ${truncate(input.context.episodeOutline, 400)}` : "",
    input.context.storyBibleTone ? `Tone: ${input.context.storyBibleTone}` : "",
    input.context.worldSummary ? `World: ${truncate(input.context.worldSummary, 240)}` : "",
    input.style ? `Style: ${input.style}` : "",
    input.mood ? `Mood: ${input.mood}` : "",
    input.genre ? `Genre: ${input.genre}` : "",
    input.instrumentation ? `Instrumentation: ${input.instrumentation}` : "",
    input.tempo ? `Tempo: ${input.tempo}` : "",
    input.isInstrumental ? "Instrumental only." : "",
    input.negativePrompt ? `Avoid: ${input.negativePrompt}` : "",
  ].filter(Boolean);
  return lines.join("\n");
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}
