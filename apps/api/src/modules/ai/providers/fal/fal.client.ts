import { AiProviderError, sanitizeSecret } from "../../ai.errors";
import {
  FAL_QUEUE_BASE_URL,
  type FalQueueStatusResponse,
  type FalQueueSubmitResponse,
  type FalResultPayload,
} from "./fal.types";

export interface FalClientConfig {
  apiKey: string;
  baseUrl?: string;
  timeoutMs?: number;
  pollIntervalMs?: number;
  maxPollAttempts?: number;
}

/**
 * Thin HTTP client for FAL queue API.
 * Auth: Authorization: Key <FAL_KEY>
 * Protocol: submit → poll status → fetch result
 */
export class FalClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly pollIntervalMs: number;
  private readonly maxPollAttempts: number;

  constructor(config: FalClientConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl || FAL_QUEUE_BASE_URL).replace(/\/$/, "");
    this.timeoutMs = config.timeoutMs ?? 120_000;
    this.pollIntervalMs = config.pollIntervalMs ?? 2_000;
    this.maxPollAttempts = config.maxPollAttempts ?? 90;
  }

  async runModel(
    modelId: string,
    input: Record<string, unknown>,
  ): Promise<{ requestId: string; data: FalResultPayload }> {
    const modelPath = normalizeFalModelPath(modelId);
    const submitted = await this.submit(modelPath, input);
    const requestId = submitted.request_id;
    if (!requestId) {
      throw new AiProviderError("FAL 未返回 request_id。", "UNAVAILABLE");
    }
    await this.waitUntilCompleted(modelPath, requestId);
    const data = await this.fetchResult(modelPath, requestId);
    return { requestId, data };
  }

  private async submit(
    modelPath: string,
    input: Record<string, unknown>,
  ): Promise<FalQueueSubmitResponse> {
    const url = `${this.baseUrl}/${modelPath}`;
    const response = await this.request(url, {
      method: "POST",
      body: JSON.stringify(input),
    });
    const payload = (await this.readJson(response)) as FalQueueSubmitResponse;
    if (!response.ok) {
      throw mapFalHttpError(response.status, payload, this.apiKey);
    }
    return payload;
  }

  private async waitUntilCompleted(modelPath: string, requestId: string) {
    const statusUrl = `${this.baseUrl}/${modelPath}/requests/${requestId}/status`;
    for (let attempt = 0; attempt < this.maxPollAttempts; attempt += 1) {
      const response = await this.request(statusUrl, { method: "GET" });
      const payload = (await this.readJson(response)) as FalQueueStatusResponse;
      if (!response.ok) {
        throw mapFalHttpError(response.status, payload, this.apiKey);
      }
      const status = String(payload.status || "").toUpperCase();
      if (status === "COMPLETED") {
        return;
      }
      if (status === "FAILED" || status === "ERROR" || status === "CANCELLED") {
        throw new AiProviderError(
          sanitizeSecret(
            payload.error || `FAL 任务失败：${status}`,
            this.apiKey,
          ),
          "UNAVAILABLE",
        );
      }
      await sleep(this.pollIntervalMs);
    }
    throw new AiProviderError("FAL 任务等待超时。", "TIMEOUT");
  }

  private async fetchResult(
    modelPath: string,
    requestId: string,
  ): Promise<FalResultPayload> {
    const resultUrl = `${this.baseUrl}/${modelPath}/requests/${requestId}`;
    const response = await this.request(resultUrl, { method: "GET" });
    const payload = (await this.readJson(response)) as FalResultPayload &
      FalQueueSubmitResponse;
    if (!response.ok) {
      throw mapFalHttpError(response.status, payload, this.apiKey);
    }
    return payload;
  }

  private async request(url: string, init: RequestInit): Promise<Response> {
    try {
      return await fetch(url, {
        ...init,
        headers: {
          Authorization: `Key ${this.apiKey}`,
          "Content-Type": "application/json",
          ...(init.headers || {}),
        },
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error) {
      if (isTimeoutError(error)) {
        throw new AiProviderError("FAL 请求超时。", "TIMEOUT");
      }
      throw new AiProviderError(
        `FAL Provider 不可用：${sanitizeSecret(
          error instanceof Error ? error.message : "网络错误",
          this.apiKey,
        )}`,
        "UNAVAILABLE",
      );
    }
  }

  private async readJson(response: Response): Promise<unknown> {
    const text = await response.text();
    if (!text.trim()) {
      return {};
    }
    try {
      return JSON.parse(text) as unknown;
    } catch {
      throw new AiProviderError(
        sanitizeSecret(`FAL 返回非法 JSON：${text.slice(0, 200)}`, this.apiKey),
        "INVALID_JSON",
      );
    }
  }
}

export function normalizeFalModelPath(modelId: string): string {
  return modelId
    .trim()
    .replace(/^https?:\/\/(queue\.)?fal\.run\//i, "")
    .replace(/^\//, "");
}

export function mapFalHttpError(
  status: number,
  payload: { detail?: unknown; error?: string; message?: string },
  apiKey: string,
): AiProviderError {
  const detail = formatFalDetail(payload);
  const message = sanitizeSecret(detail || `FAL HTTP ${status}`, apiKey);
  if (status === 401 || status === 403) {
    return new AiProviderError("FAL API Key 无效或没有权限。", "MISSING_API_KEY");
  }
  if (status === 404) {
    return new AiProviderError(
      message.includes("model") || message.includes("Model")
        ? "FAL 模型不存在。"
        : message,
      "MODEL_NOT_FOUND",
    );
  }
  if (status === 429) {
    return new AiProviderError("FAL 请求过于频繁，请稍后重试。", "UNAVAILABLE");
  }
  if (status >= 500) {
    return new AiProviderError(`FAL 服务不可用：${message}`, "UNAVAILABLE");
  }
  return new AiProviderError(message, "UNAVAILABLE");
}

function formatFalDetail(payload: {
  detail?: unknown;
  error?: string;
  message?: string;
}): string {
  if (typeof payload.error === "string" && payload.error.trim()) {
    return payload.error;
  }
  if (typeof payload.message === "string" && payload.message.trim()) {
    return payload.message;
  }
  if (typeof payload.detail === "string") {
    return payload.detail;
  }
  if (Array.isArray(payload.detail)) {
    return payload.detail
      .map((item) => {
        if (item && typeof item === "object" && "msg" in item) {
          return String((item as { msg?: string }).msg || "");
        }
        return String(item);
      })
      .filter(Boolean)
      .join("; ");
  }
  return "";
}

function isTimeoutError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === "TimeoutError" || error.name === "AbortError")
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
