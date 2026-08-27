import type {
  AiImageRequest,
  AiImageToVideoRequest,
  AiVideoRequest,
} from "../../ai.provider";
import type { FalResultPayload } from "./fal.types";

export function buildFalImageInput(request: AiImageRequest): Record<string, unknown> {
  const input: Record<string, unknown> = {
    prompt: request.prompt,
  };
  const numImages = request.n ?? 1;
  if (numImages > 1) {
    input.num_images = numImages;
  }
  if (request.negativePrompt) {
    input.negative_prompt = request.negativePrompt;
  }
  if (typeof request.seed === "number") {
    input.seed = request.seed;
  }
  if (request.width && request.height) {
    input.image_size = { width: request.width, height: request.height };
  } else if (request.size) {
    input.image_size = request.size;
  }
  return input;
}

export function buildFalVideoInput(
  request: AiVideoRequest | AiImageToVideoRequest,
  imageToVideo: boolean,
): Record<string, unknown> {
  const input: Record<string, unknown> = {
    prompt: request.prompt,
  };
  if (request.negativePrompt) {
    input.negative_prompt = request.negativePrompt;
  }
  if (typeof request.seed === "number") {
    input.seed = request.seed;
  }
  if (typeof request.durationSeconds === "number") {
    input.duration = request.durationSeconds;
  }
  if (request.aspectRatio) {
    input.aspect_ratio = request.aspectRatio;
  }
  if (imageToVideo) {
    const imageUrl = request.imageUrl?.trim();
    if (imageUrl) {
      input.image_url = imageUrl;
    } else if (request.imageBase64?.trim()) {
      const raw = request.imageBase64.trim();
      input.image_url = raw.startsWith("data:")
        ? raw
        : `data:image/png;base64,${raw}`;
    }
  }
  return input;
}

export function extractFalImageUrls(payload: FalResultPayload): Array<{
  url?: string;
  base64?: string;
  mimeType: string;
  width?: number;
  height?: number;
}> {
  const items = payload.images?.length
    ? payload.images
    : payload.image
      ? [payload.image]
      : [];
  return items
    .map((item) => {
      if (item.url) {
        return {
          url: item.url,
          mimeType: item.content_type || "image/png",
          width: item.width,
          height: item.height,
        };
      }
      if (item.file_data) {
        return {
          base64: item.file_data,
          mimeType: item.content_type || "image/png",
          width: item.width,
          height: item.height,
        };
      }
      return null;
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
}

export function extractFalVideo(payload: FalResultPayload): {
  url?: string;
  base64?: string;
  mimeType: string;
  durationSeconds?: number;
  width?: number;
  height?: number;
} | null {
  const item = payload.video || payload.videos?.[0];
  if (!item) {
    return null;
  }
  if (item.url) {
    return {
      url: item.url,
      mimeType: item.content_type || "video/mp4",
      durationSeconds: item.duration,
      width: item.width,
      height: item.height,
    };
  }
  if (item.file_data) {
    return {
      base64: item.file_data,
      mimeType: item.content_type || "video/mp4",
      durationSeconds: item.duration,
      width: item.width,
      height: item.height,
    };
  }
  return null;
}
