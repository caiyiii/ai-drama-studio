import { HttpStatus, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AiProviderKind } from "@prisma/client";
import { AppError, ErrorCodes } from "../../common/app-error";
import { PrismaService } from "../../prisma/prisma.service";
import { CryptoService } from "./crypto/crypto.service";
import { parseEnvProviderKind } from "./providers/create-provider";
import { getSystemProviderDisplayName } from "./system-provider-label";

export type ResolvedProviderSource = "project" | "default" | "system";

export interface ResolvedAiProvider {
  source: ResolvedProviderSource;
  id: string | null;
  name: string;
  kind: AiProviderKind;
  baseUrl: string;
  model: string;
  apiKey: string;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class ProviderResolver {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly crypto: CryptoService,
  ) {}

  async resolve(projectId?: string): Promise<ResolvedAiProvider> {
    if (projectId) {
      const project = await this.prisma.project.findUnique({
        where: { id: projectId },
        include: { aiProvider: true },
      });
      if (!project) {
        throw new AppError(HttpStatus.NOT_FOUND, "PROJECT_NOT_FOUND", "Project not found");
      }
      const selected = this.asUsable(project.aiProvider);
      if (selected) {
        return this.fromRow(selected, "project");
      }
    }

    const fallback = await this.prisma.aiProvider.findFirst({
      where: { isDefault: true, enabled: true },
      orderBy: { updatedAt: "desc" },
    });
    const usableDefault = this.asUsable(fallback);
    if (usableDefault) {
      return this.fromRow(usableDefault, "default");
    }

    const system = this.fromEnv();
    if (system) {
      return system;
    }

    throw new AppError(
      HttpStatus.BAD_REQUEST,
      ErrorCodes.NO_AI_PROVIDER_CONFIGURED,
      "尚未配置可用的 AI Provider。请前往项目设置 → AI 配置。",
    );
  }

  fromEnv(): ResolvedAiProvider | null {
    const baseUrl = (this.config.get<string>("ai.baseUrl") || "").trim();
    const apiKey = (this.config.get<string>("ai.apiKey") || "").trim();
    const model = (this.config.get<string>("ai.model") || "").trim();
    const provider = this.config.get<string>("ai.provider") || "OPENAI_COMPATIBLE";
    if (!baseUrl || !apiKey || !model) {
      return null;
    }
    const now = new Date(0).toISOString();
    return {
      source: "system",
      id: "system",
      name: getSystemProviderDisplayName(baseUrl),
      kind: parseEnvProviderKind(provider),
      baseUrl,
      model,
      apiKey,
      createdAt: now,
      updatedAt: now,
    };
  }

  private asUsable<T extends { enabled: boolean; encryptedApiKey: string }>(
    row: T | null | undefined,
  ): T | null {
    if (!row || !row.enabled || !row.encryptedApiKey) {
      return null;
    }
    return row;
  }

  private fromRow(
    row: {
      id: string;
      name: string;
      provider: AiProviderKind;
      baseUrl: string;
      model: string;
      encryptedApiKey: string;
      createdAt: Date;
      updatedAt: Date;
    },
    source: Exclude<ResolvedProviderSource, "system">,
  ): ResolvedAiProvider {
    return {
      source,
      id: row.id,
      name: row.name,
      kind: row.provider,
      baseUrl: row.baseUrl,
      model: row.model,
      apiKey: this.crypto.decryptApiKey(row.encryptedApiKey),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
