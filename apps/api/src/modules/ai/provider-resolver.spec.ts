import { AiProviderKind } from "@prisma/client";
import { ConfigService } from "@nestjs/config";
import { describe, expect, it, beforeEach } from "vitest";
import { AppError, ErrorCodes } from "../../common/app-error";
import { CryptoService } from "./crypto/crypto.service";
import { encryptSecret } from "./crypto/aes-gcm";
import { ProviderResolver } from "./provider-resolver";

const KEY = "c".repeat(64);
const encrypted = encryptSecret("sk-db", KEY);

function createResolver(options: {
  project?: { id: string; aiProviderId: string | null; aiProvider: Record<string, unknown> | null } | null;
  defaultProvider?: Record<string, unknown> | null;
  env?: { provider?: string; baseUrl?: string; apiKey?: string; model?: string };
}) {
  const prisma = {
    project: {
      findUnique: async () => options.project ?? null,
    },
    aiProvider: {
      findFirst: async () => options.defaultProvider ?? null,
    },
  };
  const config = {
    get: (path: string) => {
      if (path === "ai.encryptionKey") return KEY;
      if (path === "ai.provider") return options.env?.provider ?? "openai-compatible";
      if (path === "ai.baseUrl") return options.env?.baseUrl ?? "";
      if (path === "ai.apiKey") return options.env?.apiKey ?? "";
      if (path === "ai.model") return options.env?.model ?? "";
      if (path === "nodeEnv") return "development";
      return "";
    },
  };
  const crypto = new CryptoService(config as unknown as ConfigService);
  return new ProviderResolver(
    prisma as never,
    config as unknown as ConfigService,
    crypto,
  );
}

const dbProvider = {
  id: "prov-1",
  name: "我的 DeepSeek",
  provider: AiProviderKind.OPENAI_COMPATIBLE,
  baseUrl: "https://api.deepseek.com/v1",
  model: "deepseek-chat",
  encryptedApiKey: encrypted,
  enabled: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("ProviderResolver", () => {
  beforeEach(() => {
    process.env.AI_ENCRYPTION_KEY = KEY;
  });

  it("uses the project provider first", async () => {
    const resolver = createResolver({
      project: {
        id: "proj-1",
        aiProviderId: "prov-1",
        aiProvider: dbProvider,
      },
      defaultProvider: { ...dbProvider, id: "prov-default", name: "默认" },
      env: { apiKey: "sk-env", baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini" },
    });
    const resolved = await resolver.resolve("proj-1");
    expect(resolved.source).toBe("project");
    expect(resolved.name).toBe("我的 DeepSeek");
    expect(resolved.apiKey).toBe("sk-db");
  });

  it("falls back to the default provider", async () => {
    const resolver = createResolver({
      project: { id: "proj-1", aiProviderId: null, aiProvider: null },
      defaultProvider: dbProvider,
      env: { apiKey: "sk-env", baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini" },
    });
    const resolved = await resolver.resolve("proj-1");
    expect(resolved.source).toBe("default");
    expect(resolved.id).toBe("prov-1");
  });

  it("falls back to the system .env provider", async () => {
    const resolver = createResolver({
      project: { id: "proj-1", aiProviderId: null, aiProvider: null },
      defaultProvider: null,
      env: { apiKey: "sk-env", baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini" },
    });
    const resolved = await resolver.resolve("proj-1");
    expect(resolved.source).toBe("system");
    expect(resolved.apiKey).toBe("sk-env");
  });

  it("throws NO_AI_PROVIDER_CONFIGURED when nothing is available", async () => {
    const resolver = createResolver({
      project: { id: "proj-1", aiProviderId: null, aiProvider: null },
      defaultProvider: null,
      env: {},
    });
    await expect(resolver.resolve("proj-1")).rejects.toBeInstanceOf(AppError);
    await expect(resolver.resolve("proj-1")).rejects.toHaveProperty(
      "code",
      ErrorCodes.NO_AI_PROVIDER_CONFIGURED,
    );
  });
});
