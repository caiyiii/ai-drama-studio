import { HttpException, HttpStatus } from "@nestjs/common";

export const ErrorCodes = {
  NO_AI_PROVIDER_CONFIGURED: "NO_AI_PROVIDER_CONFIGURED",
  PROVIDER_IN_USE: "PROVIDER_IN_USE",
  ENCRYPTION_KEY_MISSING: "ENCRYPTION_KEY_MISSING",
  PROVIDER_MANAGEMENT_DISABLED: "PROVIDER_MANAGEMENT_DISABLED",
  PROVIDER_NOT_SUPPORTED: "PROVIDER_NOT_SUPPORTED",
  INVALID_API_KEY: "INVALID_API_KEY",
} as const;

export class AppError extends HttpException {
  readonly code: string;

  constructor(status: HttpStatus, code: string, message: string) {
    super({ statusCode: status, code, message }, status);
    this.code = code;
  }
}
