import type { VideoGenerationResult } from "@ai-drama-studio/types";
import { AiProviderError, sanitizeSecret } from "../../ai.errors";
import type { AiImageToVideoRequest, AiVideoRequest } from "../../ai.provider";

export type VideoGenerationModeHint = "SYNC" | "ASYNC";

export interface VideoProviderAdapter {
  readonly protocol: string;
  readonly supportsAsync: boolean;
  generateVideo(input: {
    baseUrl: string;
    apiKey: string;
    model: string;
    request: AiVideoRequest | AiImageToVideoRequest;
    imageToVideo?: boolean;
  }): Promise<VideoGenerationResult>;
}

interface VideoApiResponse {
  data?: Array<{
    url?: string;
    b64_json?: string;
    mime_type?: string;
  }>;
  url?: string;
  output?: { url?: string };
  error?: { message?: string };
}

/**
 * Generic OpenAI-compatible video protocol (not a vendor-specific Sora/Kling client).
 * Tries POST {baseUrl}/videos/generations. Unsupported gateways must return
 * CAPABILITY_NOT_SUPPORTED instead of a fake video.
 */
export class OpenAiCompatibleVideoAdapter implements VideoProviderAdapter {
  readonly protocol = "openai-compatible-video-v1";
  readonly supportsAsync = false;

  async generateVideo(input: {
    baseUrl: string;
    apiKey: string;
    model: string;
    request: AiVideoRequest | AiImageToVideoRequest;
    imageToVideo?: boolean;
  }): Promise<VideoGenerationResult> {
    if (!input.apiKey.trim()) {
      throw new AiProviderError("AI 服务未配置 API Key。", "MISSING_API_KEY");
    }
    if (!input.baseUrl.trim()) {
      throw new AiProviderError("AI 服务未配置接口地址。", "UNAVAILABLE");
    }
    const model = input.request.model || input.model;
    if (!model.trim()) {
      throw new AiProviderError("AI 服务未配置模型。", "MODEL_NOT_FOUND");
    }
    const url = `${input.baseUrl.replace(/\/$/, "")}/videos/generations`;
    const body: Record<string, unknown> = {
      model,
      prompt: input.request.prompt,
    };
    if (input.request.negativePrompt) {
      body.negative_prompt = input.request.negativePrompt;
    }
    if (typeof input.request.durationSeconds === "number") {
      body.seconds = input.request.durationSeconds;
    }
    if (input.request.width && input.request.height) {
      body.size = `${input.request.width}x${input.request.height}`;
    }
    if (input.request.aspectRatio) {
      body.aspect_ratio = input.request.aspectRatio;
    }
    if ("fps" in input.request && typeof input.request.fps === "number") {
      body.fps = input.request.fps;
    }
    if ("seed" in input.request && typeof input.request.seed === "number") {
      body.seed = input.request.seed;
    }
    if (input.request.imageUrl) {
      body.image = input.request.imageUrl;
    } else if (input.request.imageBase64) {
      body.image = `data:image/png;base64,${input.request.imageBase64}`;
    }

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${input.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(180_000),
      });
    } catch (error) {
      if (
        error instanceof Error &&
        (error.name === "TimeoutError" || error.name === "AbortError")
      ) {
        throw new AiProviderError("视频生成超时。", "TIMEOUT");
      }
      throw new AiProviderError(
        `AI Provider 不可用：${sanitizeSecret(
          error instanceof Error ? error.message : "网络错误",
          input.apiKey,
        )}`,
        "UNAVAILABLE",
      );
    }

    const raw = await response.text();
    let parsed: VideoApiResponse = {};
    try {
      parsed = JSON.parse(raw) as VideoApiResponse;
    } catch {
      parsed = {};
    }

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new AiProviderError("AI API Key 无效或没有权限。", "MISSING_API_KEY");
      }
      if (response.status === 404) {
        throw new AiProviderError(
          input.imageToVideo
            ? "当前 Provider 不支持图生视频。"
            : "当前 Provider 不支持视频生成。",
          "CAPABILITY_NOT_SUPPORTED",
        );
      }
      throw new AiProviderError(
        `视频生成失败：${sanitizeSecret(parsed.error?.message || `HTTP ${response.status}`, input.apiKey)}`,
        "UNAVAILABLE",
      );
    }

    const item = parsed.data?.[0];
    const videoUrl = item?.url || parsed.url || parsed.output?.url;
    const base64 = item?.b64_json;
    if (!videoUrl && !base64) {
      throw new AiProviderError("视频生成未返回可播放结果。", "UNAVAILABLE");
    }
    return {
      url: videoUrl,
      base64,
      mimeType: item?.mime_type || "video/mp4",
      provider: "openai-compatible",
      model,
    };
  }
}
