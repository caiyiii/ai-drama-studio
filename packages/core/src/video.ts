import {
  AssetType,
  StoryboardShotAssetRole,
  type ShotVideoUiStatus,
  type VideoGenerationMode,
  type VideoGenerationResult,
} from "@ai-drama-studio/types";

export type ShotVideoPromptSource = {
  videoPrompt?: string | null;
  imagePrompt?: string | null;
  negativePrompt?: string | null;
  visualDescription?: string | null;
  action?: string | null;
  dialogue?: string | null;
  narration?: string | null;
  composition?: string | null;
  lighting?: string | null;
  mood?: string | null;
  visualStyle?: string | null;
  cameraAngle?: string | null;
  cameraMovement?: string | null;
  shotSize?: string | null;
  location?: string | null;
  durationSeconds?: number | null;
  continuityNotes?: string | null;
  characterNames?: string[];
};

export function resolveVideoGenerationMode(
  mode?: string | null,
): VideoGenerationMode {
  return mode === "TEXT_TO_VIDEO" ? "TEXT_TO_VIDEO" : "IMAGE_TO_VIDEO";
}

export function buildVideoPrompt(
  shot: ShotVideoPromptSource,
  override?: string | null,
): string {
  const trimmed = override?.trim();
  if (trimmed) {
    return trimmed;
  }
  if (shot.videoPrompt?.trim()) {
    return shot.videoPrompt.trim();
  }
  if (shot.imagePrompt?.trim()) {
    return composeMotion(shot.imagePrompt.trim(), shot);
  }
  const visual = [shot.visualDescription?.trim(), shot.action?.trim()]
    .filter(Boolean)
    .join(". ");
  return composeMotion(visual, shot);
}

function composeMotion(base: string, shot: ShotVideoPromptSource): string {
  const extras = [
    shot.cameraMovement ? `camera movement: ${shot.cameraMovement}` : "",
    shot.cameraAngle ? `camera angle: ${shot.cameraAngle}` : "",
    shot.shotSize ? `shot size: ${shot.shotSize}` : "",
    shot.lighting?.trim() ? `lighting: ${shot.lighting.trim()}` : "",
    shot.mood?.trim() ? `mood: ${shot.mood.trim()}` : "",
    shot.visualStyle?.trim() ? `style: ${shot.visualStyle.trim()}` : "",
    shot.composition?.trim() ? `composition: ${shot.composition.trim()}` : "",
    typeof shot.durationSeconds === "number"
      ? `duration: ${shot.durationSeconds}s`
      : "",
    shot.characterNames && shot.characterNames.length > 0
      ? `characters: ${shot.characterNames.join(", ")}`
      : "",
    shot.continuityNotes?.trim()
      ? `continuity: ${shot.continuityNotes.trim()}`
      : "",
  ].filter(Boolean);
  return [base, extras.join(", ")].filter(Boolean).join(". ").trim();
}

export function buildVideoNegativePrompt(
  shot: { negativePrompt?: string | null },
  override?: string | null,
): string | undefined {
  const trimmed = override?.trim() || shot.negativePrompt?.trim();
  return trimmed || undefined;
}

export function validateVideoGenerationInput(input: {
  shotId?: string;
  durationSeconds?: number | null;
  width?: number | null;
  height?: number | null;
}): void {
  if (!input.shotId?.trim()) {
    throw new Error("SHOT_NOT_FOUND");
  }
  if (
    input.durationSeconds !== undefined &&
    input.durationSeconds !== null &&
    (!Number.isFinite(input.durationSeconds) ||
      input.durationSeconds < 1 ||
      input.durationSeconds > 30)
  ) {
    throw new Error("INVALID_VIDEO_DURATION");
  }
  if (
    (input.width != null && (input.width < 16 || input.width > 4096)) ||
    (input.height != null && (input.height < 16 || input.height > 4096))
  ) {
    throw new Error("INVALID_VIDEO_SIZE");
  }
}

export function resolveVideoSize(input?: {
  width?: number | null;
  height?: number | null;
  aspectRatio?: string | null;
}): { width: number; height: number } {
  if (
    typeof input?.width === "number" &&
    typeof input?.height === "number" &&
    input.width > 0 &&
    input.height > 0
  ) {
    return { width: input.width, height: input.height };
  }
  if (input?.aspectRatio === "9:16") {
    return { width: 720, height: 1280 };
  }
  if (input?.aspectRatio === "1:1") {
    return { width: 720, height: 720 };
  }
  return { width: 1280, height: 720 };
}

export function normalizeVideoGenerationResult(
  raw: unknown,
): VideoGenerationResult {
  if (!raw || typeof raw !== "object") {
    throw new Error("VIDEO_GENERATION_FAILED");
  }
  const record = raw as Record<string, unknown>;
  const url = typeof record.url === "string" ? record.url : undefined;
  const base64 = typeof record.base64 === "string" ? record.base64 : undefined;
  if (!url && !base64) {
    throw new Error("VIDEO_GENERATION_FAILED");
  }
  return {
    url,
    base64,
    mimeType: typeof record.mimeType === "string" ? record.mimeType : "video/mp4",
    durationSeconds:
      typeof record.durationSeconds === "number" ? record.durationSeconds : undefined,
    width: typeof record.width === "number" ? record.width : undefined,
    height: typeof record.height === "number" ? record.height : undefined,
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

export function filterShotAssetsByMediaType<
  T extends { asset?: { type?: string } | null },
>(assets: T[] | null | undefined, type: "IMAGE" | "VIDEO"): T[] {
  return (assets ?? []).filter((item) => {
    const assetType = item.asset?.type;
    if (!assetType) {
      return type === "IMAGE";
    }
    return assetType === type;
  });
}

export function getPrimaryShotAsset<
  T extends { isPrimary?: boolean; role?: string; asset?: { type?: string } | null },
>(assets: T[] | null | undefined, type: "IMAGE" | "VIDEO"): T | undefined {
  const rows = filterShotAssetsByMediaType(assets, type);
  return (
    rows.find((item) => item.isPrimary) ??
    rows.find((item) => item.role === StoryboardShotAssetRole.FINAL) ??
    rows[0]
  );
}

export function isShotVideoStale(input: {
  storyboardVersion?: number | null;
  generatedFromStoryboardVersion?: number | null;
  shotUpdatedAt?: string | Date | null;
  videoCreatedAt?: string | Date | null;
}): boolean {
  if (
    typeof input.storyboardVersion === "number" &&
    typeof input.generatedFromStoryboardVersion === "number" &&
    input.storyboardVersion > input.generatedFromStoryboardVersion
  ) {
    return true;
  }
  if (input.shotUpdatedAt && input.videoCreatedAt) {
    const shotAt = new Date(input.shotUpdatedAt).getTime();
    const videoAt = new Date(input.videoCreatedAt).getTime();
    if (Number.isFinite(shotAt) && Number.isFinite(videoAt) && shotAt > videoAt) {
      return true;
    }
  }
  return false;
}

export function getShotVideoStatus(input: {
  assets?: Array<{ isPrimary?: boolean; role?: string; asset?: { type?: string } | null }> | null;
  generating?: boolean;
  hasUnappliedPreview?: boolean;
  stale?: boolean;
}): ShotVideoUiStatus {
  if (input.generating) {
    return "GENERATING";
  }
  const assets = filterShotAssetsByMediaType(input.assets, AssetType.VIDEO);
  const hasFinal = assets.some(
    (item) => item.isPrimary === true || item.role === StoryboardShotAssetRole.FINAL,
  );
  if (hasFinal) {
    return input.stale ? "STALE" : "READY";
  }
  if (input.hasUnappliedPreview || assets.length > 0) {
    return "CANDIDATE";
  }
  return "EMPTY";
}

export function getShotVideoStatusLabel(status: ShotVideoUiStatus): string {
  switch (status) {
    case "GENERATING":
      return "生成中";
    case "CANDIDATE":
      return "有候选";
    case "READY":
      return "已完成";
    case "STALE":
      return "分镜已更新";
    default:
      return "未生成";
  }
}

export function previewVideoSrc(result: {
  url?: string;
  base64?: string;
  mimeType?: string;
}): string | null {
  if (result.url) {
    return result.url;
  }
  if (result.base64) {
    return `data:${result.mimeType || "video/mp4"};base64,${result.base64}`;
  }
  return null;
}
