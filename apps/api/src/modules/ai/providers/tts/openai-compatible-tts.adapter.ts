import type { GeneratedAudio } from "@ai-drama-studio/types";
import { mimeToAudioFormat } from "@ai-drama-studio/core";
import { AiProviderError, sanitizeSecret } from "../../ai.errors";
import type { AiSpeechRequest } from "../../ai.provider";

export interface TtsProviderAdapter {
  readonly protocol: string;
  generateSpeech(input: {
    baseUrl: string;
    apiKey: string;
    model: string;
    request: AiSpeechRequest;
  }): Promise<GeneratedAudio>;
}

interface TtsJsonResponse {
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

/**
 * Generic OpenAI-compatible TTS protocol.
 * Official OpenAI returns binary audio from POST {baseUrl}/audio/speech.
 * Compatible gateways may return JSON with url/base64. Unsupported endpoints
 * must surface CAPABILITY_NOT_SUPPORTED instead of fabricating audio.
 */
export class OpenAiCompatibleTtsAdapter implements TtsProviderAdapter {
  readonly protocol = "openai-compatible-tts-v1";

  async generateSpeech(input: {
    baseUrl: string;
    apiKey: string;
    model: string;
    request: AiSpeechRequest;
  }): Promise<GeneratedAudio> {
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
    const voice = input.request.voice?.trim();
    if (!voice) {
      throw new AiProviderError("语音生成需要指定 Voice ID。", "UNAVAILABLE");
    }

    const url = `${input.baseUrl.replace(/\/$/, "")}/audio/speech`;
    const format = input.request.format || "mp3";
    const body: Record<string, unknown> = {
      model,
      input: input.request.text,
      voice,
      response_format: format,
    };
    if (typeof input.request.speed === "number") {
      body.speed = input.request.speed;
    }
    if (typeof input.request.pitch === "number") {
      body.pitch = input.request.pitch;
    }
    if (input.request.language) {
      body.language = input.request.language;
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
        signal: AbortSignal.timeout(120_000),
      });
    } catch (error) {
      if (
        error instanceof Error &&
        (error.name === "TimeoutError" || error.name === "AbortError")
      ) {
        throw new AiProviderError("语音生成超时。", "TIMEOUT");
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
      throw mapTtsHttpError(response.status, parsed, input.apiKey);
    }

    if (!isJson) {
      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.byteLength === 0) {
        throw new AiProviderError("语音生成未返回可播放结果。", "UNAVAILABLE");
      }
      const mimeType = contentType.split(";")[0]?.trim() || mimeFromFormat(format);
      return {
        base64: buffer.toString("base64"),
        mimeType,
        format: mimeToAudioFormat(mimeType),
        provider: "openai-compatible",
        model,
        voice,
      };
    }

    const parsed = await parseJsonSafe(response);
    const item = parsed.data?.[0];
    const audioUrl = item?.url || parsed.url || parsed.output?.url;
    const base64 = item?.b64_json || parsed.audio;
    if (!audioUrl && !base64) {
      throw new AiProviderError("语音生成未返回可播放结果。", "UNAVAILABLE");
    }
    const mimeType = item?.mime_type || mimeFromFormat(format);
    return {
      url: audioUrl,
      base64,
      mimeType,
      format: mimeToAudioFormat(mimeType),
      provider: "openai-compatible",
      model,
      voice,
    };
  }
}

async function parseJsonSafe(response: Response): Promise<TtsJsonResponse> {
  try {
    return (await response.json()) as TtsJsonResponse;
  } catch {
    return {};
  }
}

function mimeFromFormat(format?: string): string {
  if (format === "wav") return "audio/wav";
  if (format === "ogg" || format === "opus") return "audio/ogg";
  if (format === "aac") return "audio/aac";
  if (format === "m4a") return "audio/mp4";
  return "audio/mpeg";
}

function mapTtsHttpError(
  status: number,
  body: TtsJsonResponse,
  apiKey: string,
): AiProviderError {
  const detail = sanitizeSecret(body.error?.message || `HTTP ${status}`, apiKey);
  if (status === 401 || status === 403) {
    return new AiProviderError("AI API Key 无效或没有权限。", "MISSING_API_KEY");
  }
  if (status === 404) {
    return new AiProviderError(
      "当前 Provider 不支持语音生成。",
      "CAPABILITY_NOT_SUPPORTED",
    );
  }
  return new AiProviderError(`语音生成失败：${detail}`, "UNAVAILABLE");
}
