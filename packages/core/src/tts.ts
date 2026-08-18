import {
  AssetType,
  ScriptBlockType,
  TTS_MAX_TEXT_LENGTH,
  type CharacterVoiceProfile,
  type GeneratedAudio,
} from "@ai-drama-studio/types";

export function normalizeTtsText(raw?: string | null): string {
  return (raw ?? "")
    // eslint-disable-next-line no-control-regex -- strip ASCII control characters, keep Chinese punctuation
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/\r\n/g, "\n")
    .trim();
}

export function validateTtsText(text: string, maxLength = TTS_MAX_TEXT_LENGTH): void {
  if (!text) {
    throw new Error("TTS_TEXT_EMPTY");
  }
  if (text.length > maxLength) {
    throw new Error("TTS_TEXT_TOO_LONG");
  }
}

export function resolveTtsVoice(input: {
  requestVoiceId?: string | null;
  voiceProfile?: CharacterVoiceProfile | null;
}): string | undefined {
  const requested = input.requestVoiceId?.trim();
  if (requested) {
    return requested;
  }
  const profileVoice = input.voiceProfile?.voiceId?.trim();
  return profileVoice || undefined;
}

export function resolveTtsLanguage(input: {
  requestLanguage?: string | null;
  voiceProfile?: CharacterVoiceProfile | null;
}): string {
  return input.requestLanguage?.trim() || input.voiceProfile?.language?.trim() || "zh-CN";
}

export function resolveTtsSpeed(input: {
  requestSpeed?: number | null;
  voiceProfile?: CharacterVoiceProfile | null;
}): number | undefined {
  if (typeof input.requestSpeed === "number" && Number.isFinite(input.requestSpeed)) {
    return input.requestSpeed;
  }
  if (typeof input.voiceProfile?.speed === "number" && Number.isFinite(input.voiceProfile.speed)) {
    return input.voiceProfile.speed;
  }
  return undefined;
}

export function resolveTtsPitch(input: {
  requestPitch?: number | null;
  voiceProfile?: CharacterVoiceProfile | null;
}): number | undefined {
  if (typeof input.requestPitch === "number" && Number.isFinite(input.requestPitch)) {
    return input.requestPitch;
  }
  if (typeof input.voiceProfile?.pitch === "number" && Number.isFinite(input.voiceProfile.pitch)) {
    return input.voiceProfile.pitch;
  }
  return undefined;
}

export function assertDialogueBlock(type?: string | null): void {
  if (type !== ScriptBlockType.DIALOGUE) {
    throw new Error("TTS_SOURCE_NOT_DIALOGUE");
  }
}

export function buildTtsContext(input: {
  projectName?: string | null;
  episodeTitle?: string | null;
  sceneTitle?: string | null;
  characterName?: string | null;
  voiceProfile?: CharacterVoiceProfile | null;
  text: string;
}): { text: string; characterName?: string; language: string; style?: string } {
  return {
    text: input.text,
    characterName: input.characterName?.trim() || undefined,
    language: resolveTtsLanguage({ voiceProfile: input.voiceProfile }),
    style: input.voiceProfile?.style?.trim() || undefined,
  };
}

export function mimeToAudioFormat(mimeType?: string | null): string {
  if (!mimeType) {
    return "mp3";
  }
  if (mimeType.includes("wav")) return "wav";
  if (mimeType.includes("ogg")) return "ogg";
  if (mimeType.includes("aac")) return "aac";
  if (mimeType.includes("mp4")) return "m4a";
  if (mimeType.includes("opus")) return "opus";
  return "mp3";
}

export function previewAudioSrc(result: {
  url?: string;
  base64?: string;
  mimeType?: string;
}): string | null {
  if (result.url) {
    return result.url;
  }
  if (result.base64) {
    return `data:${result.mimeType || "audio/mpeg"};base64,${result.base64}`;
  }
  return null;
}

export function sanitizeVoiceProfile(
  profile: CharacterVoiceProfile | null | undefined,
): CharacterVoiceProfile | null {
  if (!profile) {
    return null;
  }
  return {
    voiceId: profile.voiceId ?? null,
    providerId: profile.providerId ?? null,
    modelId: profile.modelId ?? null,
    language: profile.language ?? null,
    gender: profile.gender ?? null,
    style: profile.style ?? null,
    speed: profile.speed ?? null,
    pitch: profile.pitch ?? null,
  };
}

export function normalizeTtsGenerationResult(raw: unknown): GeneratedAudio {
  if (!raw || typeof raw !== "object") {
    throw new Error("TTS_GENERATION_FAILED");
  }
  const record = raw as Record<string, unknown>;
  const url = typeof record.url === "string" ? record.url : undefined;
  const base64 = typeof record.base64 === "string" ? record.base64 : undefined;
  if (!url && !base64) {
    throw new Error("TTS_GENERATION_FAILED");
  }
  return {
    url,
    base64,
    mimeType: typeof record.mimeType === "string" ? record.mimeType : "audio/mpeg",
    format: typeof record.format === "string" ? record.format : mimeToAudioFormat(String(record.mimeType || "")),
    durationSeconds:
      typeof record.durationSeconds === "number" ? record.durationSeconds : undefined,
    provider: typeof record.provider === "string" ? record.provider : undefined,
    model: typeof record.model === "string" ? record.model : undefined,
    voice: typeof record.voice === "string" ? record.voice : undefined,
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

export function filterBlockAssetsByMediaType<
  T extends { asset?: { type?: string } | null },
>(assets: T[] | null | undefined, type: "AUDIO"): T[] {
  return (assets ?? []).filter((item) => item.asset?.type === type);
}

export function getPrimaryBlockAsset<
  T extends { isPrimary?: boolean; asset?: { type?: string } | null },
>(assets: T[] | null | undefined, type: "AUDIO" = AssetType.AUDIO): T | undefined {
  const rows = filterBlockAssetsByMediaType(assets, type);
  return rows.find((item) => item.isPrimary) ?? rows[0];
}
