import { HttpStatus, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AppError, ErrorCodes } from "../../../common/app-error";
import { decryptSecret, encryptSecret } from "./aes-gcm";

@Injectable()
export class CryptoService {
  constructor(private readonly config: ConfigService) {}

  encryptApiKey(plainText: string): string {
    return encryptSecret(plainText, this.requireEncryptionKey());
  }

  decryptApiKey(payload: string): string {
    return decryptSecret(payload, this.requireEncryptionKey());
  }

  hasEncryptionKey(): boolean {
    return Boolean(this.getEncryptionKey());
  }

  assertManagementEnabled(): void {
    if (this.hasEncryptionKey()) {
      return;
    }
    const nodeEnv = this.config.get<string>("nodeEnv") || "development";
    if (nodeEnv === "production") {
      throw new AppError(
        HttpStatus.SERVICE_UNAVAILABLE,
        ErrorCodes.PROVIDER_MANAGEMENT_DISABLED,
        "生产环境未配置加密密钥，已禁用 Provider 管理。",
      );
    }
    throw new AppError(
      HttpStatus.INTERNAL_SERVER_ERROR,
      ErrorCodes.ENCRYPTION_KEY_MISSING,
      "开发环境未配置 AI_ENCRYPTION_KEY，无法管理 Provider。",
    );
  }

  private requireEncryptionKey(): string {
    this.assertManagementEnabled();
    return this.getEncryptionKey();
  }

  private getEncryptionKey(): string {
    return (this.config.get<string>("ai.encryptionKey") || "").trim();
  }
}
