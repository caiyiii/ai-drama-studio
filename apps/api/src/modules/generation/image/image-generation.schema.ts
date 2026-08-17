import type { ImageGenerationResult } from "@ai-drama-studio/types";
import { AiProviderError } from "../../ai/ai.errors";

export function validateImageGenerationResult(raw: unknown): ImageGenerationResult {
  if (!raw || typeof raw !== "object") {
    throw new AiProviderError("图片生成结果无效。", "INVALID_JSON");
  }
  const record = raw as Record<string, unknown>;
  const images = record.images;
  if (!Array.isArray(images) || images.length === 0) {
    throw new AiProviderError("图片生成结果缺少 images。", "SCHEMA_INVALID");
  }
  const mapped = images.map((item, index) => {
    if (!item || typeof item !== "object") {
      throw new AiProviderError(`第 ${index + 1} 张图片无效。`, "SCHEMA_INVALID");
    }
    const image = item as Record<string, unknown>;
    const url = typeof image.url === "string" ? image.url : undefined;
    const base64 = typeof image.base64 === "string" ? image.base64 : undefined;
    if (!url && !base64) {
      throw new AiProviderError(`第 ${index + 1} 张图片缺少 url 或 base64。`, "SCHEMA_INVALID");
    }
    return {
      url,
      base64,
      mimeType: typeof image.mimeType === "string" ? image.mimeType : "image/png",
      width: typeof image.width === "number" ? image.width : undefined,
      height: typeof image.height === "number" ? image.height : undefined,
      seed: typeof image.seed === "number" ? image.seed : undefined,
      revisedPrompt:
        typeof image.revisedPrompt === "string" ? image.revisedPrompt : undefined,
      providerAssetId:
        typeof image.providerAssetId === "string" ? image.providerAssetId : undefined,
      metadata:
        image.metadata && typeof image.metadata === "object"
          ? (image.metadata as Record<string, unknown>)
          : undefined,
    };
  });
  return {
    images: mapped,
    provider: typeof record.provider === "string" ? record.provider : undefined,
    model: typeof record.model === "string" ? record.model : undefined,
    requestedCount:
      typeof record.requestedCount === "number" ? record.requestedCount : mapped.length,
    durationMs: typeof record.durationMs === "number" ? record.durationMs : undefined,
  };
}
