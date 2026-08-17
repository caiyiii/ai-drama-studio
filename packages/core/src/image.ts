import {
  IMAGE_ASPECT_RATIOS,
  IMAGE_GENERATION_MAX_COUNT,
  IMAGE_GENERATION_MIN_COUNT,
  StoryboardShotAssetRole,
  type ImageAspectRatio,
  type ShotImageUiStatus,
} from "@ai-drama-studio/types";

export {
  IMAGE_ASPECT_RATIOS,
  IMAGE_GENERATION_MAX_COUNT,
  IMAGE_GENERATION_MIN_COUNT,
};

export const DEFAULT_IMAGE_SIZE = { width: 1024, height: 1024 };

const SIZE_BY_RATIO: Record<ImageAspectRatio, { width: number; height: number }> = {
  "1:1": { width: 1024, height: 1024 },
  "4:3": { width: 1024, height: 768 },
  "3:4": { width: 768, height: 1024 },
  "16:9": { width: 1792, height: 1024 },
  "9:16": { width: 1024, height: 1792 },
  "21:9": { width: 1536, height: 640 },
};

export function isImageAspectRatio(value: string | undefined | null): value is ImageAspectRatio {
  return Boolean(value && (IMAGE_ASPECT_RATIOS as readonly string[]).includes(value));
}

export function resolveImageSize(input?: {
  aspectRatio?: string | null;
  width?: number | null;
  height?: number | null;
}): { width: number; height: number; aspectRatio: ImageAspectRatio | null } {
  const width = Number(input?.width);
  const height = Number(input?.height);
  if (Number.isInteger(width) && Number.isInteger(height) && width > 0 && height > 0) {
    if (width > 4096 || height > 4096) {
      throw new Error("INVALID_IMAGE_SIZE");
    }
    return {
      width,
      height,
      aspectRatio: isImageAspectRatio(input?.aspectRatio ?? "")
        ? (input?.aspectRatio as ImageAspectRatio)
        : null,
    };
  }
  if (input?.aspectRatio && !isImageAspectRatio(input.aspectRatio)) {
    throw new Error("INVALID_IMAGE_SIZE");
  }
  const ratio = isImageAspectRatio(input?.aspectRatio ?? "")
    ? (input?.aspectRatio as ImageAspectRatio)
    : "16:9";
  return { ...SIZE_BY_RATIO[ratio], aspectRatio: ratio };
}

export function assertImageCount(count?: number | null): number {
  if (count === undefined || count === null) {
    return IMAGE_GENERATION_MIN_COUNT;
  }
  if (
    !Number.isInteger(count) ||
    count < IMAGE_GENERATION_MIN_COUNT ||
    count > IMAGE_GENERATION_MAX_COUNT
  ) {
    throw new Error("INVALID_IMAGE_COUNT");
  }
  return count;
}

export function formatImageSize(width?: number | null, height?: number | null): string {
  if (typeof width === "number" && typeof height === "number") {
    return `${width}x${height}`;
  }
  return "1024x1024";
}

type ShotPromptSource = {
  imagePrompt?: string | null;
  negativePrompt?: string | null;
  visualDescription?: string | null;
  composition?: string | null;
  lighting?: string | null;
  mood?: string | null;
  visualStyle?: string | null;
  style?: string | null;
  cameraAngle?: string | null;
  shotSize?: string | null;
  cameraMovement?: string | null;
  location?: string | null;
};

export function buildShotImagePrompt(
  shot: ShotPromptSource,
  override?: string | null,
): string {
  const trimmedOverride = override?.trim();
  if (trimmedOverride) {
    return trimmedOverride;
  }
  const parts: string[] = [];
  const imagePrompt = shot.imagePrompt?.trim();
  const visual = shot.visualDescription?.trim();
  if (imagePrompt) {
    parts.push(imagePrompt);
  } else if (visual) {
    parts.push(visual);
  }
  const extras = [
    shot.composition?.trim() ? `composition: ${shot.composition.trim()}` : "",
    shot.lighting?.trim() ? `lighting: ${shot.lighting.trim()}` : "",
    shot.mood?.trim() ? `mood: ${shot.mood.trim()}` : "",
    (shot.visualStyle || shot.style)?.trim()
      ? `style: ${(shot.visualStyle || shot.style)!.trim()}`
      : "",
    shot.shotSize ? `shot size: ${shot.shotSize}` : "",
    shot.cameraAngle ? `camera angle: ${shot.cameraAngle}` : "",
    shot.cameraMovement ? `camera movement: ${shot.cameraMovement}` : "",
    shot.location?.trim() ? `location: ${shot.location.trim()}` : "",
  ].filter(Boolean);
  if (!imagePrompt && extras.length > 0) {
    parts.push(...extras);
  } else if (imagePrompt && extras.length > 0) {
    parts.push(extras.join(", "));
  }
  return parts.filter(Boolean).join(". ").trim();
}

export function buildShotNegativePrompt(
  shot: Pick<ShotPromptSource, "negativePrompt">,
  override?: string | null,
): string | undefined {
  const trimmed = override?.trim() || shot.negativePrompt?.trim();
  return trimmed || undefined;
}

export function getShotImageStatus(input: {
  assets?: Array<{ isPrimary?: boolean; role?: string; asset?: { type?: string } | null }> | null;
  generating?: boolean;
  hasUnappliedPreview?: boolean;
  storyboardStale?: boolean;
}): ShotImageUiStatus {
  if (input.generating) {
    return "GENERATING";
  }
  const assets = (input.assets ?? []).filter((item) => {
    const type = item.asset?.type;
    return !type || type === "IMAGE";
  });
  const hasFinal = assets.some(
    (item) =>
      item.isPrimary === true ||
      item.role === StoryboardShotAssetRole.FINAL,
  );
  if (hasFinal) {
    return input.storyboardStale ? "STALE" : "READY";
  }
  if (input.hasUnappliedPreview || assets.length > 0) {
    return "CANDIDATE";
  }
  return "EMPTY";
}

export function getShotImageStatusLabel(status: ShotImageUiStatus): string {
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

export function resolveAssetDisplayUrl(
  apiBase: string,
  url: string | null | undefined,
): string | null {
  if (!url) {
    return null;
  }
  if (url.startsWith("data:") || url.startsWith("blob:") || /^https?:\/\//i.test(url)) {
    return url;
  }
  const base = apiBase.replace(/\/$/, "");
  return url.startsWith("/") ? `${base}${url}` : `${base}/${url}`;
}

export function previewImageSrc(image: {
  url?: string;
  base64?: string;
  mimeType?: string;
}): string | null {
  if (image.url) {
    return image.url;
  }
  if (image.base64) {
    const mime = image.mimeType || "image/png";
    return `data:${mime};base64,${image.base64}`;
  }
  return null;
}
