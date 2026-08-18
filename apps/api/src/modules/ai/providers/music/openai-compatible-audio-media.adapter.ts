import type { GeneratedAudio } from "@ai-drama-studio/types";
import { mimeToAudioFormat } from "@ai-drama-studio/core";
import { AiProviderError, sanitizeSecret } from "../../ai.errors";

interface AudioMediaJsonResponse {
  data?: Array<{
    url?: string;
    b64_json?: string;
    mime_type?: string;
  }>;
  url?: string;
  audio?: string;
  output?: { url?: string };
  error?: { message?: string };
}

export interface OpenAiCompatibleAudioMediaConfig {
  protocol: string;
  path: string;
  label: string;
}

/**
 * Generic OpenAI-compatible music/sfx protocol.
 * Tries POST {baseUrl}{path}. Unsupported gateways must return
 * CAPABILITY_NOT_SUPPORTED instead of fabricating audio.
 */
export class OpenAiCompatibleAudioMediaAdapter {
  readonly protocol: string;
  private readonly path: string;
  private readonly label: string;

  constructor(config: OpenAiCompatibleAudioMediaConfig) {
    this.protocol = config.protocol;
    this.path = config.path;
    this.label = config.label;
  }

  async generate(input: {
    baseUrl: string;
    apiKey: string;
    model: string;
    body: Record<string, unknown>;
  }): Promise<GeneratedAudio> {
    if (!input.apiKey.trim()) {
      throw new AiProviderError("AI 服务未配置 API Key。", "MISSING_API_KEY");
    }
    if (!input.baseUrl.trim()) {
      throw new AiProviderError("AI 服务未配置接口地址。", "UNAVAILABLE");
    }
    const model = String(input.body.model || input.model || "").trim();
    if (!model) {
      throw new AiProviderError("AI 服务未配置模型。", "MODEL_NOT_FOUND");
    }

    const url = `${input.baseUrl.replace(/\/$/, "")}${this.path}`;
    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${input.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...input.body, model }),
        signal: AbortSignal.timeout(180_000),
      });
    } catch (error) {
      if (
        error instanceof Error &&
        (error.name === "TimeoutError" || error.name === "AbortError")
      ) {
        throw new AiProviderError(`${this.label}超时。`, "TIMEOUT");
      }
      throw new AiProviderError(
        `AI Provider 不可用：${sanitizeSecret(
          error instanceof Error ? error.message : "网络错误",
          input.apiKey,
        )}`,
        "UNAVAILABLE",
      );
    }

    const contentType = response.headers.get("content-type") || "";
    const isJson =
      contentType.includes("application/json") || contentType.includes("text/");

    if (!response.ok) {
      const parsed = isJson ? await parseJsonSafe(response) : {};
      throw mapHttpError(response.status, parsed, input.apiKey, this.label);
    }

    if (!isJson) {
      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.byteLength === 0) {
        throw new AiProviderError(`${this.label}未返回可播放结果。`, "UNAVAILABLE");
      }
      const mimeType = contentType.split(";")[0]?.trim() || "audio/mpeg";
      return {
        base64: buffer.toString("base64"),
        mimeType,
        format: mimeToAudioFormat(mimeType),
        provider: "openai-compatible",
        model,
      };
    }

    const parsed = await parseJsonSafe(response);
    const item = parsed.data?.[0];
    const audioUrl = item?.url || parsed.url || parsed.output?.url;
    const base64 = item?.b64_json || parsed.audio;
    if (!audioUrl && !base64) {
      throw new AiProviderError(`${this.label}未返回可播放结果。`, "UNAVAILABLE");
    }
    const mimeType = item?.mime_type || "audio/mpeg";
    return {
      url: audioUrl,
      base64,
      mimeType,
      format: mimeToAudioFormat(mimeType),
      provider: "openai-compatible",
      model,
    };
  }
}

async function parseJsonSafe(response: Response): Promise<AudioMediaJsonResponse> {
  try {
    return (await response.json()) as AudioMediaJsonResponse;
  } catch {
    return {};
  }
}

function mapHttpError(
  status: number,
  body: AudioMediaJsonResponse,
  apiKey: string,
  label: string,
): AiProviderError {
  const detail = sanitizeSecret(body.error?.message || `HTTP ${status}`, apiKey);
  if (status === 401 || status === 403) {
    return new AiProviderError("AI API Key 无效或没有权限。", "MISSING_API_KEY");
  }
  if (status === 404) {
    return new AiProviderError(
      `当前 Provider 不支持${label}。`,
      "CAPABILITY_NOT_SUPPORTED",
    );
  }
  return new AiProviderError(`${label}失败：${detail}`, "UNAVAILABLE");
}
