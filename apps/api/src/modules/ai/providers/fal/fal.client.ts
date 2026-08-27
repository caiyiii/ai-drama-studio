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

export interface FalSubmitResult {
  requestId: string;
  modelPath: string;
  submitUrl: string;
  statusUrl?: string;
  responseUrl?: string;
  raw: FalQueueSubmitResponse;
}

/**
 * Thin HTTP client for FAL queue API.
 * Auth: Authorization: Key <FAL_KEY>
 * Protocol: submit → poll status → fetch result
 *
 * Endpoint MUST always be: {baseUrl}/{model}
 * Never POST to the bare queue root.
 */
export class FalClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly pollIntervalMs: number;
  private readonly maxPollAttempts: number;

  constructor(config: FalClientConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = normalizeFalBaseUrl(config.baseUrl);
    this.timeoutMs = config.timeoutMs ?? 120_000;
    this.pollIntervalMs = config.pollIntervalMs ?? 2_000;
    this.maxPollAttempts = config.maxPollAttempts ?? 90;
  }

  async runModel(
    modelId: string,
    input: Record<string, unknown>,
  ): Promise<{ requestId: string; data: FalResultPayload; submitUrl: string }> {
    const submitted = await this.submitRequest(modelId, input);
    const status = await this.waitUntilCompleted(
      submitted.modelPath,
      submitted.requestId,
      submitted.responseUrl,
    );
    const data = await this.getRequestResult(
      submitted.modelPath,
      submitted.requestId,
      status.response_url || submitted.responseUrl,
    );
    return {
      requestId: submitted.requestId,
      data,
      submitUrl: submitted.submitUrl,
    };
  }

  async submitRequest(
    modelId: string,
    input: Record<string, unknown>,
  ): Promise<FalSubmitResult> {
    const modelPath = requireFalModelPath(modelId);
    const submitUrl = buildFalQueueEndpoint(this.baseUrl, modelPath);
    assertFalModelEndpoint(submitUrl, modelPath);

    const response = await this.request(submitUrl, {
      method: "POST",
      body: JSON.stringify(input),
    });
    const payload = (await this.readJson(response)) as FalQueueSubmitResponse;
    if (!response.ok) {
      throw mapFalHttpError(response.status, payload, this.apiKey, {
        modelPath,
        endpoint: submitUrl,
      });
    }
    const requestId = payload.request_id?.trim();
    if (!requestId) {
      throw new AiProviderError("FAL 未返回 request_id。", "UNAVAILABLE");
    }
    return {
      requestId,
      modelPath,
      submitUrl,
      statusUrl: payload.status_url,
      responseUrl: payload.response_url,
      raw: payload,
    };
  }

  async getRequestStatus(
    modelId: string,
    requestId: string,
    statusUrl?: string,
  ): Promise<FalQueueStatusResponse> {
    const modelPath = requireFalModelPath(modelId);
    const url =
      statusUrl?.trim() ||
      `${buildFalQueueEndpoint(this.baseUrl, modelPath)}/requests/${encodeURIComponent(requestId)}/status`;
    const response = await this.request(url, { method: "GET" });
    const payload = (await this.readJson(response)) as FalQueueStatusResponse;
    if (!response.ok) {
      throw mapFalHttpError(response.status, payload, this.apiKey, {
        modelPath,
        endpoint: url,
        requestId,
      });
    }
    return payload;
  }

  async getRequestResult(
    modelId: string,
    requestId: string,
    responseUrl?: string,
  ): Promise<FalResultPayload> {
    const modelPath = requireFalModelPath(modelId);
    const url =
      responseUrl?.trim() ||
      `${buildFalQueueEndpoint(this.baseUrl, modelPath)}/requests/${encodeURIComponent(requestId)}`;
    const response = await this.request(url, { method: "GET" });
    const payload = (await this.readJson(response)) as FalResultPayload &
      FalQueueSubmitResponse;
    if (!response.ok) {
      throw mapFalHttpError(response.status, payload, this.apiKey, {
        modelPath,
        endpoint: url,
        requestId,
      });
    }
    return payload;
  }

  private async waitUntilCompleted(
    modelPath: string,
    requestId: string,
    responseUrl?: string,
  ): Promise<FalQueueStatusResponse> {
    for (let attempt = 0; attempt < this.maxPollAttempts; attempt += 1) {
      const payload = await this.getRequestStatus(modelPath, requestId);
      const status = String(payload.status || "").toUpperCase();
      if (status === "COMPLETED") {
        if (payload.error) {
          throw new AiProviderError(
            sanitizeSecret(String(payload.error), this.apiKey),
            "UNAVAILABLE",
          );
        }
        return {
          ...payload,
          response_url: payload.response_url || responseUrl,
        };
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
      // IN_QUEUE / IN_PROGRESS / unknown → keep polling until deadline
      await sleep(this.pollIntervalMs);
    }
    throw new AiProviderError("FAL 任务等待超时。", "TIMEOUT");
  }

  private async request(url: string, init: RequestInit): Promise<Response> {
    const headers: Record<string, string> = {
      Authorization: `Key ${this.apiKey}`,
      ...(init.headers as Record<string, string> | undefined),
    };
    if (init.body) {
      headers["Content-Type"] = "application/json";
    }
    try {
      return await fetch(url, {
        ...init,
        headers,
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

export function normalizeFalBaseUrl(baseUrl?: string): string {
  const raw = (baseUrl || FAL_QUEUE_BASE_URL).trim() || FAL_QUEUE_BASE_URL;
  return raw.replace(/\/$/, "");
}

export function normalizeFalModelPath(modelId: string): string {
  return modelId
    .trim()
    .replace(/^https?:\/\/(queue\.)?fal\.run\/?/i, "")
    .replace(/^\//, "")
    .replace(/\/+$/, "");
}

export function requireFalModelPath(modelId: string): string {
  const modelPath = normalizeFalModelPath(modelId);
  if (!modelPath) {
    throw new AiProviderError(
      "FAL model endpoint is required. Expected https://queue.fal.run/{model}",
      "MODEL_NOT_FOUND",
    );
  }
  if (modelPath.includes("://") || /\s/.test(modelPath)) {
    throw new AiProviderError(
      `FAL model endpoint is invalid. Expected https://queue.fal.run/{model}. Current model: ${modelId.trim()}`,
      "MODEL_NOT_FOUND",
    );
  }
  if (!modelPath.includes("/")) {
    throw new AiProviderError(
      `FAL model must look like owner/name (e.g. fal-ai/nano-banana-2). Current model: ${modelPath}`,
      "MODEL_NOT_FOUND",
    );
  }
  return modelPath;
}

/**
 * Build https://queue.fal.run/{model} without duplicating slashes.
 */
export function buildFalQueueEndpoint(baseUrl: string, modelId: string): string {
  const root = normalizeFalBaseUrl(baseUrl);
  const modelPath = requireFalModelPath(modelId);
  return `${root}/${modelPath}`;
}

export function assertFalModelEndpoint(endpoint: string, modelPath: string): void {
  const normalized = endpoint.replace(/\/$/, "");
  const root = normalizeFalBaseUrl(FAL_QUEUE_BASE_URL);
  if (
    normalized === root ||
    normalized === `${root}/` ||
    normalized.endsWith("://queue.fal.run") ||
    normalized.endsWith("://fal.run")
  ) {
    throw new AiProviderError(
      `FAL model endpoint is required. Expected https://queue.fal.run/{model}. Current model: ${modelPath || "(empty)"}`,
      "MODEL_NOT_FOUND",
    );
  }
}

export function mapFalHttpError(
  status: number,
  payload: { detail?: unknown; error?: string; message?: string },
  apiKey: string,
  context?: { modelPath?: string; endpoint?: string; requestId?: string },
): AiProviderError {
  const detail = formatFalDetail(payload);
  const modelHint = context?.modelPath
    ? `\nCurrent model: ${context.modelPath}`
    : "";
  const endpointHint = context?.endpoint
    ? `\nEndpoint: ${sanitizeSecret(context.endpoint, apiKey)}`
    : "";
  const requestHint = context?.requestId
    ? `\nRequest ID: ${context.requestId}`
    : "";

  if (status === 401) {
    return new AiProviderError("Invalid FAL API Key。", "MISSING_API_KEY");
  }
  if (status === 403) {
    return new AiProviderError(
      "FAL API Key does not have sufficient permissions。",
      "MISSING_API_KEY",
    );
  }
  if (status === 404) {
    return new AiProviderError(
      sanitizeSecret(
        `FAL model endpoint not found。${modelHint}${endpointHint}`,
        apiKey,
      ),
      "MODEL_NOT_FOUND",
    );
  }
  if (status === 405) {
    return new AiProviderError(
      sanitizeSecret(
        `FAL HTTP 405: Invalid Queue API endpoint or method.\nExpected: https://queue.fal.run/{model}${modelHint}${endpointHint}${requestHint}`,
        apiKey,
      ),
      "UNAVAILABLE",
    );
  }
  if (status === 429) {
    return new AiProviderError("FAL rate limit exceeded. Please retry later。", "UNAVAILABLE");
  }
  if (status >= 500) {
    return new AiProviderError(
      sanitizeSecret(
        `FAL upstream error (HTTP ${status}): ${detail || "server error"}${requestHint}`,
        apiKey,
      ),
      "UNAVAILABLE",
    );
  }
  return new AiProviderError(
    sanitizeSecret(
      detail || `FAL HTTP ${status}${modelHint}${endpointHint}${requestHint}`,
      apiKey,
    ),
    "UNAVAILABLE",
  );
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
