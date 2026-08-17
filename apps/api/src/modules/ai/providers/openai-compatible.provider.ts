import { AiProviderError, sanitizeSecret } from "../ai.errors";
import type {
  AiProvider,
  AiStructuredRequest,
  AiTextRequest,
} from "../ai.provider";

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

export class OpenAiCompatibleProvider implements AiProvider {
  readonly name = "openai-compatible";

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
          temperature: 0.7,
          ...("maxTokens" in request && typeof request.maxTokens === "number"
            ? { max_tokens: request.maxTokens }
            : {}),
          ...(jsonObject ? { response_format: { type: "json_object" } } : {}),
        }),
        signal: AbortSignal.timeout(120_000),
      });
    } catch (error) {
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
      throw mapHttpError(response.status, body, this.config.apiKey);
    }

    const content = extractContent(body);
    if (!content.trim()) {
      throw new AiProviderError("AI 返回了空内容。", "INVALID_JSON");
    }
    return content;
  }
}

export function parseModelJson(content: string): unknown {
  const candidates = [content.trim()];
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    candidates.unshift(fenced[1].trim());
  }
  const firstBrace = content.indexOf("{");
  const lastBrace = content.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    candidates.push(content.slice(firstBrace, lastBrace + 1));
  }

  let lastError: Error | null = null;
  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate) as unknown;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("JSON parse failed");
    }
  }
  throw new AiProviderError(
    `AI 返回非法 JSON：${lastError?.message ?? "无法解析"}`,
    "INVALID_JSON",
  );
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
