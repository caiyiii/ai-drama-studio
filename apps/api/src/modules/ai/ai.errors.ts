export class AiProviderError extends Error {
  readonly code:
    | "UNAVAILABLE"
    | "MISSING_API_KEY"
    | "MODEL_NOT_FOUND"
    | "INVALID_JSON"
    | "SCHEMA_INVALID"
    | "NO_AI_PROVIDER_CONFIGURED"
    | "CAPABILITY_NOT_IMPLEMENTED"
    | "CAPABILITY_NOT_SUPPORTED"
    | "TIMEOUT"
    | "UNKNOWN";

  constructor(
    message: string,
    code: AiProviderError["code"] = "UNKNOWN",
  ) {
    super(message);
    this.name = "AiProviderError";
    this.code = code;
  }
}

export function sanitizeSecret(text: string, secret?: string): string {
  let output = text;
  if (secret) {
    output = output.split(secret).join("[redacted]");
  }
  return output
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]")
    .replace(/\bKey\s+\S+/gi, "Key [redacted]");
}

export function userFacingAiError(error: unknown, secret?: string): string {
  if (error instanceof AiProviderError) {
    return sanitizeSecret(error.message, secret);
  }
  if (error instanceof Error) {
    return sanitizeSecret(error.message, secret);
  }
  return "AI 生成失败";
}
