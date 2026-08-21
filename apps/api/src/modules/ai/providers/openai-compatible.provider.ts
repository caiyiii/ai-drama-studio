import { AiProviderError, sanitizeSecret } from "../ai.errors";
import { capabilityNotImplemented } from "../capability-not-implemented";
import type {
  AiEmbeddingRequest,
  AiImageRequest,
  AiImageToVideoRequest,
  AiMusicRequest,
  AiProvider,
  AiSfxRequest,
  AiSpeechRequest,
  AiStructuredRequest,
  AiTextRequest,
  AiVideoRequest,
  AiVoiceCloneRequest,
} from "../ai.provider";
import type { ImageGenerationImage, ImageGenerationResult, VideoGenerationResult, GeneratedAudio } from "@ai-drama-studio/types";
import { formatImageSize } from "@ai-drama-studio/core";
import { OpenAiCompatibleVideoAdapter } from "./video/openai-compatible-video.adapter";
import { OpenAiCompatibleTtsAdapter } from "./tts/openai-compatible-tts.adapter";
import { OpenAiCompatibleMusicAdapter } from "./music/openai-compatible-music.adapter";
import { OpenAiCompatibleSfxAdapter } from "./sfx/openai-compatible-sfx.adapter";

interface OpenAiCompatibleConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string | Array<{ type?: string; text?: string }>;
    };
  }>;
  error?: { message?: string; code?: string; type?: string };
}

interface ImageGenerationResponse {
  data?: Array<{
    url?: string;
    b64_json?: string;
    revised_prompt?: string;
    seed?: number;
  }>;
  error?: { message?: string; code?: string; type?: string };
}

export class OpenAiCompatibleProvider implements AiProvider {
  readonly name = "openai-compatible";
  private readonly videoAdapter = new OpenAiCompatibleVideoAdapter();
  private readonly ttsAdapter = new OpenAiCompatibleTtsAdapter();
  private readonly musicAdapter = new OpenAiCompatibleMusicAdapter();
  private readonly sfxAdapter = new OpenAiCompatibleSfxAdapter();

  constructor(private readonly config: OpenAiCompatibleConfig) {}

  async generateText(request: AiTextRequest): Promise<string> {
    return this.complete(request);
  }

  async generateStructured(request: AiStructuredRequest): Promise<unknown> {
    const content = await this.complete(request, true);
    return parseModelJson(content);
  }

  async testConnection(): Promise<void> {
    await this.complete(
      {
        prompt: "Reply with the single word OK.",
        maxTokens: 8,
      },
      false,
    );
  }

  async generateImage(request: AiImageRequest): Promise<ImageGenerationResult> {
    if (!this.config.apiKey.trim()) {
      throw new AiProviderError("AI 服务未配置 API Key。", "MISSING_API_KEY");
    }
    if (!this.config.baseUrl.trim()) {
      throw new AiProviderError("AI 服务未配置接口地址。", "UNAVAILABLE");
    }
    const model = request.model || this.config.model;
    if (!model.trim()) {
      throw new AiProviderError("AI 服务未配置模型。", "MODEL_NOT_FOUND");
    }

    const url = `${this.config.baseUrl.replace(/\/$/, "")}/images/generations`;
    const size =
      request.size ||
      formatImageSize(request.width, request.height);
    const body: Record<string, unknown> = {
      model,
      prompt: request.prompt,
      n: request.n ?? 1,
      size,
      response_format: request.responseFormat ?? "b64_json",
    };
    if (request.negativePrompt) {
      body.negative_prompt = request.negativePrompt;
    }
    if (typeof request.seed === "number") {
      body.seed = request.seed;
    }

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(120_000),
      });
    } catch (error) {
      if (isTimeoutError(error)) {
        throw new AiProviderError("图片生成超时。", "TIMEOUT");
      }
      throw new AiProviderError(
        `AI Provider 不可用：${sanitizeSecret(
          error instanceof Error ? error.message : "网络错误",
          this.config.apiKey,
        )}`,
        "UNAVAILABLE",
      );
    }

    const raw = await response.text();
    const parsed = parseImageResponseBody(raw);

    if (!response.ok) {
      throw mapImageHttpError(response.status, parsed, this.config.apiKey);
    }

    const images = (parsed.data ?? [])
      .map((item) => mapImageItem(item))
      .filter((item): item is ImageGenerationImage => Boolean(item));
    if (images.length === 0) {
      throw new AiProviderError("图片生成未返回任何结果。", "UNAVAILABLE");
    }
    return { images, model, requestedCount: request.n ?? 1 };
  }

  async generateVideo(request: AiVideoRequest): Promise<VideoGenerationResult> {
    return this.videoAdapter.generateVideo({
      baseUrl: this.config.baseUrl,
      apiKey: this.config.apiKey,
      model: this.config.model,
      request,
      imageToVideo: Boolean(request.imageUrl || request.imageBase64),
    });
  }

  async generateImageToVideo(
    request: AiImageToVideoRequest,
  ): Promise<VideoGenerationResult> {
    return this.videoAdapter.generateVideo({
      baseUrl: this.config.baseUrl,
      apiKey: this.config.apiKey,
      model: this.config.model,
      request,
      imageToVideo: true,
    });
  }

  async generateSpeech(request: AiSpeechRequest): Promise<GeneratedAudio> {
    return this.ttsAdapter.generateSpeech({
      baseUrl: this.config.baseUrl,
      apiKey: this.config.apiKey,
      model: this.config.model,
      request,
    });
  }

  async generateVoiceClone(_request: AiVoiceCloneRequest): Promise<never> {
    return capabilityNotImplemented("VOICE_CLONE", "声音克隆");
  }

  async generateMusic(request: AiMusicRequest): Promise<GeneratedAudio> {
    return this.musicAdapter.generateMusic({
      baseUrl: this.config.baseUrl,
      apiKey: this.config.apiKey,
      model: this.config.model,
      request,
    });
  }

  async generateSfx(request: AiSfxRequest): Promise<GeneratedAudio> {
    return this.sfxAdapter.generateSfx({
      baseUrl: this.config.baseUrl,
      apiKey: this.config.apiKey,
      model: this.config.model,
      request,
    });
  }

  async generateEmbedding(_request: AiEmbeddingRequest): Promise<never> {
    return capabilityNotImplemented("EMBEDDING", "向量 Embedding");
  }

  private async complete(
    request: AiTextRequest | AiStructuredRequest,
    jsonObject = false,
  ): Promise<string> {
    if (!this.config.apiKey.trim()) {
      throw new AiProviderError("AI 服务未配置 API Key。", "MISSING_API_KEY");
    }
    if (!this.config.baseUrl.trim()) {
      throw new AiProviderError("AI 服务未配置接口地址。", "UNAVAILABLE");
    }
    const model = request.model || this.config.model;
    if (!model.trim()) {
      throw new AiProviderError("AI 服务未配置模型。", "MODEL_NOT_FOUND");
    }

    const url = `${this.config.baseUrl.replace(/\/$/, "")}/chat/completions`;
    const messages = [
      ...(request.system ? [{ role: "system", content: request.system }] : []),
      { role: "user", content: request.prompt },
    ];

    const maxTokens =
      "maxTokens" in request && typeof request.maxTokens === "number"
        ? request.maxTokens
        : undefined;

    // Prefer OpenAI-style json_object; if the compatible provider rejects it,
    // fall back to prompt-only structured generation.
    const attempts = jsonObject ? [true, false] : [false];
    let lastError: AiProviderError | null = null;

    for (const useResponseFormat of attempts) {
      let response: Response;
      try {
        response = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.config.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages,
            temperature: jsonObject ? 0.2 : 0.7,
            ...(typeof maxTokens === "number" ? { max_tokens: maxTokens } : {}),
            ...(useResponseFormat
              ? { response_format: { type: "json_object" } }
              : {}),
          }),
          signal: AbortSignal.timeout(120_000),
        });
      } catch (error) {
        if (isTimeoutError(error)) {
          throw new AiProviderError("AI 请求超时。", "TIMEOUT");
        }
        throw new AiProviderError(
          `AI Provider 不可用：${sanitizeSecret(
            error instanceof Error ? error.message : "网络错误",
            this.config.apiKey,
          )}`,
          "UNAVAILABLE",
        );
      }

      const raw = await response.text();
      const body = parseResponseBody(raw);

      if (!response.ok) {
        const mapped = mapHttpError(response.status, body, this.config.apiKey);
        lastError = mapped;
        if (
          useResponseFormat &&
          isResponseFormatUnsupported(response.status, body)
        ) {
          continue;
        }
        throw mapped;
      }

      const content = extractContent(body);
      if (!content.trim()) {
        throw new AiProviderError("AI 返回了空内容。", "INVALID_JSON");
      }
      return content;
    }

    throw (
      lastError ??
      new AiProviderError("AI Provider 不可用：结构化输出请求失败。", "UNAVAILABLE")
    );
  }
}

export function parseModelJson(content: string): unknown {
  const candidates = collectJsonCandidates(content);
  let lastError: Error | null = null;

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate) as unknown;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("JSON parse failed");
    }
    const repaired = stripTrailingCommas(candidate);
    if (repaired !== candidate) {
      try {
        return JSON.parse(repaired) as unknown;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error("JSON parse failed");
      }
    }
  }

  throw new AiProviderError(
    `AI 返回非法 JSON：${lastError?.message ?? "无法解析"}`,
    "INVALID_JSON",
  );
}

export function collectJsonCandidates(content: string): string[] {
  const trimmed = content.trim();
  const candidates: string[] = [];
  const push = (value: string | null | undefined) => {
    const next = value?.trim();
    if (!next) return;
    if (!candidates.includes(next)) {
      candidates.push(next);
    }
  };

  push(trimmed);

  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    push(fenced[1]);
  }

  push(extractBalancedJson(content, "{", "}"));
  push(extractBalancedJson(content, "[", "]"));

  return candidates;
}

export function stripTrailingCommas(input: string): string {
  // Safe structural cleanup only: remove trailing commas before } or ].
  return input.replace(/,\s*(?=[}\]])/g, "");
}

function extractBalancedJson(
  content: string,
  openChar: "{" | "[",
  closeChar: "}" | "]",
): string | null {
  const start = content.indexOf(openChar);
  if (start < 0) {
    return null;
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < content.length; i += 1) {
    const ch = content[i];
    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === "\\") {
        escaped = true;
        continue;
      }
      if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === openChar) {
      depth += 1;
      continue;
    }
    if (ch === closeChar) {
      depth -= 1;
      if (depth === 0) {
        return content.slice(start, i + 1);
      }
    }
  }

  // Truncated payloads are common; keep the outer-bound slice as a last resort
  // candidate so trailing-comma repair still has a chance on nearly-complete JSON.
  const end = content.lastIndexOf(closeChar);
  if (end > start) {
    return content.slice(start, end + 1);
  }
  return null;
}

function isResponseFormatUnsupported(
  status: number,
  body: ChatCompletionResponse,
): boolean {
  const detail = `${body.error?.message || ""} ${body.error?.code || ""} ${body.error?.type || ""}`.toLowerCase();
  if (status === 400 || status === 422) {
    return (
      detail.includes("response_format") ||
      detail.includes("json_object") ||
      detail.includes("response format")
    );
  }
  return false;
}

function parseResponseBody(raw: string): ChatCompletionResponse {
  try {
    return JSON.parse(raw) as ChatCompletionResponse;
  } catch {
    return {};
  }
}

function extractContent(body: ChatCompletionResponse): string {
  const content = body.choices?.[0]?.message?.content;
  if (typeof content === "string") {
    return content;
  }
  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part.text === "string" ? part.text : ""))
      .join("");
  }
  return "";
}

function parseImageResponseBody(raw: string): ImageGenerationResponse {
  try {
    return JSON.parse(raw) as ImageGenerationResponse;
  } catch {
    return {};
  }
}

function mapImageItem(item: {
  url?: string;
  b64_json?: string;
  revised_prompt?: string;
  seed?: number;
}): ImageGenerationImage | null {
  if (!item.url && !item.b64_json) {
    return null;
  }
  return {
    url: item.url,
    base64: item.b64_json,
    mimeType: "image/png",
    seed: item.seed,
    revisedPrompt: item.revised_prompt,
  };
}

function mapImageHttpError(
  status: number,
  body: ImageGenerationResponse,
  apiKey: string,
): AiProviderError {
  const detail = sanitizeSecret(body.error?.message || `HTTP ${status}`, apiKey);
  if (status === 401 || status === 403) {
    return new AiProviderError("AI API Key 无效或没有权限。", "MISSING_API_KEY");
  }
  if (status === 404) {
    return new AiProviderError(
      "当前 Provider 不支持图片生成。",
      "CAPABILITY_NOT_SUPPORTED",
    );
  }
  return new AiProviderError(`图片生成失败：${detail}`, "UNAVAILABLE");
}

function isTimeoutError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === "TimeoutError" || error.name === "AbortError")
  );
}

function mapHttpError(
  status: number,
  body: ChatCompletionResponse,
  apiKey: string,
): AiProviderError {
  const detail = sanitizeSecret(body.error?.message || `HTTP ${status}`, apiKey);
  if (status === 401 || status === 403) {
    return new AiProviderError("AI API Key 无效或没有权限。", "MISSING_API_KEY");
  }
  if (status === 404) {
    return new AiProviderError("指定的 AI 模型不存在。", "MODEL_NOT_FOUND");
  }
  return new AiProviderError(`AI Provider 不可用：${detail}`, "UNAVAILABLE");
}
