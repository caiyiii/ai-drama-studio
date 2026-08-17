import { AiProviderKind } from "@prisma/client";
import { ConfigService } from "@nestjs/config";
import { describe, expect, it } from "vitest";
import { AppError, ErrorCodes } from "../../common/app-error";
import { AiProvidersService } from "./ai-providers.service";
import { CryptoService } from "./crypto/crypto.service";
import { encryptSecret } from "./crypto/aes-gcm";
import { ProviderResolver } from "./provider-resolver";
import { AiService } from "./ai.service";
import { AiProviderError } from "./ai.errors";

const KEY = "d".repeat(64);

function createService(store: {
  providers: Array<Record<string, unknown>>;
  projects: Array<{ id: string; aiProviderId: string | null }>;
  testImpl?: () => Promise<void>;
}) {
  const prisma = {
    aiProvider: {
      findMany: async () => store.providers,
      findUnique: async ({ where: { id } }: { where: { id: string } }) =>
        store.providers.find((item) => item.id === id) ?? null,
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const row = {
          id: `prov-${store.providers.length + 1}`,
          createdAt: new Date(),
          updatedAt: new Date(),
          userId: null,
          projectId: null,
          enabled: true,
          isDefault: false,
          ...data,
        };
        store.providers.push(row);
        return row;
      },
      update: async ({
        where: { id },
        data,
      }: {
        where: { id: string };
        data: Record<string, unknown>;
      }) => {
        const row = store.providers.find((item) => item.id === id);
        if (!row) {
          throw new Error("missing");
        }
        Object.assign(row, data, { updatedAt: new Date() });
        return row;
      },
      updateMany: async ({
        where,
        data,
      }: {
        where: { isDefault?: boolean; id?: { not: string } };
        data: Record<string, unknown>;
      }) => {
        for (const row of store.providers) {
          if (where.isDefault !== undefined && row.isDefault !== where.isDefault) {
            continue;
          }
          if (where.id?.not && row.id === where.id.not) {
            continue;
          }
          Object.assign(row, data);
        }
        return { count: 1 };
      },
      delete: async ({ where: { id } }: { where: { id: string } }) => {
        store.providers = store.providers.filter((item) => item.id !== id);
      },
      findFirst: async () =>
        store.providers.find((item) => item.isDefault && item.enabled) ?? null,
    },
      project: {
        findUnique: async ({ where: { id } }: { where: { id: string } }) => {
          const project = store.projects.find((item) => item.id === id);
          if (!project) {
            return null;
          }
          return {
            ...project,
            aiProvider:
              store.providers.find((item) => item.id === project.aiProviderId) ?? null,
          };
        },
        count: async ({ where: { aiProviderId } }: { where: { aiProviderId: string } }) =>
          store.projects.filter((item) => item.aiProviderId === aiProviderId).length,
        update: async ({
          where: { id },
          data,
        }: {
          where: { id: string };
          data: { aiProviderId: string | null };
        }) => {
          const project = store.projects.find((item) => item.id === id);
          if (project) {
            project.aiProviderId = data.aiProviderId;
          }
          return project;
        },
      },
      projectAiConfig: {
        count: async () => 0,
        findMany: async () => [],
        findUnique: async () => null,
      },
      aiModel: {
        upsert: async ({ create }: { create: Record<string, unknown> }) => ({
          id: "mdl-1",
          ...create,
        }),
      },
      aiProviderCapability: {
        deleteMany: async () => ({ count: 0 }),
        createMany: async () => ({ count: 0 }),
      },
    $transaction: async <T>(fn: (tx: unknown) => Promise<T>) => fn(prisma),
  };

  const config = {
    get: (path: string) => {
      if (path === "ai.encryptionKey") return KEY;
      if (path === "nodeEnv") return "development";
      return "";
    },
  } as unknown as ConfigService;

  const crypto = new CryptoService(config);
  const resolver = new ProviderResolver(prisma as never, config, crypto);
  const ai = {
    runtimeFromConfig: () => ({
      testConnection: store.testImpl ?? (async () => undefined),
    }),
    resolveForProject: (projectId: string) => resolver.resolve(projectId),
  } as unknown as AiService;

  const service = new AiProvidersService(
    prisma as never,
    crypto,
    resolver,
    ai,
  );
  return { service, store };
}

describe("AI Provider CRUD", () => {
  it("creates a provider and encrypts the API key", async () => {
    const { service, store } = createService({ providers: [], projects: [] });
    const created = await service.create({
      name: "DeepSeek",
      provider: AiProviderKind.OPENAI_COMPATIBLE,
      baseUrl: "https://api.deepseek.com/v1",
      apiKey: "sk-secret",
      model: "deepseek-chat",
      isDefault: true,
    });
    expect(created.hasApiKey).toBe(true);
    expect(created).not.toHaveProperty("apiKey");
    expect(created).not.toHaveProperty("encryptedApiKey");
    expect(String(store.providers[0]?.encryptedApiKey)).toContain("v1:gcm:");
    expect(String(store.providers[0]?.encryptedApiKey)).not.toContain("sk-secret");
    expect(store.providers[0]?.isDefault).toBe(true);
  });

  it("GET payload never includes secrets", async () => {
    const encrypted = encryptSecret("sk-secret", KEY);
    const { service } = createService({
      providers: [
        {
          id: "p1",
          name: "A",
          provider: AiProviderKind.OPENAI_COMPATIBLE,
          baseUrl: "https://example.test/v1",
          model: "demo",
          encryptedApiKey: encrypted,
          isDefault: false,
          enabled: true,
          userId: null,
          projectId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      projects: [],
    });
    const list = await service.list();
    expect(JSON.stringify(list)).not.toContain("sk-secret");
    expect(JSON.stringify(list)).not.toContain("encryptedApiKey");
  });

  it("clears the previous default in a transaction", async () => {
    const encrypted = encryptSecret("sk-secret", KEY);
    const { service, store } = createService({
      providers: [
        {
          id: "old",
          name: "Old",
          provider: AiProviderKind.OPENAI_COMPATIBLE,
          baseUrl: "https://example.test/v1",
          model: "a",
          encryptedApiKey: encrypted,
          isDefault: true,
          enabled: true,
          userId: null,
          projectId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "new",
          name: "New",
          provider: AiProviderKind.OPENAI_COMPATIBLE,
          baseUrl: "https://example.test/v1",
          model: "b",
          encryptedApiKey: encrypted,
          isDefault: false,
          enabled: true,
          userId: null,
          projectId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      projects: [],
    });
    await service.update("new", { isDefault: true });
    expect(store.providers.find((item) => item.id === "old")?.isDefault).toBe(false);
    expect(store.providers.find((item) => item.id === "new")?.isDefault).toBe(true);
  });

  it("protects providers used by a project", async () => {
    const encrypted = encryptSecret("sk-secret", KEY);
    const { service } = createService({
      providers: [
        {
          id: "p1",
          name: "Used",
          provider: AiProviderKind.OPENAI_COMPATIBLE,
          baseUrl: "https://example.test/v1",
          model: "demo",
          encryptedApiKey: encrypted,
          isDefault: false,
          enabled: true,
          userId: null,
          projectId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      projects: [{ id: "proj-1", aiProviderId: "p1" }],
    });
    await expect(service.remove("p1")).rejects.toBeInstanceOf(AppError);
    await expect(service.remove("p1")).rejects.toHaveProperty(
      "code",
      ErrorCodes.PROVIDER_IN_USE,
    );
  });

  it("assigns a project provider", async () => {
    const encrypted = encryptSecret("sk-secret", KEY);
    const { service, store } = createService({
      providers: [
        {
          id: "p1",
          name: "Used",
          provider: AiProviderKind.OPENAI_COMPATIBLE,
          baseUrl: "https://example.test/v1",
          model: "demo",
          encryptedApiKey: encrypted,
          isDefault: true,
          enabled: true,
          userId: null,
          projectId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      projects: [{ id: "proj-1", aiProviderId: null }],
    });
    const result = await service.setProjectProvider("proj-1", "p1");
    expect(store.projects[0]?.aiProviderId).toBe("p1");
    expect(result.aiProviderId).toBe("p1");
    expect(result.selected?.id).toBe("p1");
  });

  it("tests a saved provider", async () => {
    const encrypted = encryptSecret("sk-secret", KEY);
    const { service } = createService({
      providers: [
        {
          id: "p1",
          name: "Used",
          provider: AiProviderKind.OPENAI_COMPATIBLE,
          baseUrl: "https://example.test/v1",
          model: "demo",
          encryptedApiKey: encrypted,
          isDefault: false,
          enabled: true,
          userId: null,
          projectId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      projects: [],
    });
    await expect(service.testSaved("p1")).resolves.toEqual({ success: true });
  });

  it("rejects IMAGE capability on OpenAI Compatible providers", async () => {
    const { service } = createService({ providers: [], projects: [] });
    await expect(
      service.create({
        name: "Bad",
        provider: AiProviderKind.OPENAI_COMPATIBLE,
        baseUrl: "https://api.deepseek.com/v1",
        apiKey: "sk-secret",
        model: "deepseek-chat",
        capabilities: ["IMAGE"] as never,
      }),
    ).rejects.toMatchObject({
      code: ErrorCodes.PROVIDER_CAPABILITY_NOT_SUPPORTED,
    });
  });

  it("returns a safe failure for an invalid API key", async () => {
    const encrypted = encryptSecret("sk-bad", KEY);
    const { service } = createService({
      providers: [
        {
          id: "p1",
          name: "Bad",
          provider: AiProviderKind.OPENAI_COMPATIBLE,
          baseUrl: "https://example.test/v1",
          model: "demo",
          encryptedApiKey: encrypted,
          isDefault: false,
          enabled: true,
          userId: null,
          projectId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      projects: [],
      testImpl: async () => {
        throw new AiProviderError("AI API Key 无效或没有权限。", "MISSING_API_KEY");
      },
    });
    const result = await service.testSaved("p1");
    expect(result.success).toBe(false);
    expect(result.code).toBe(ErrorCodes.INVALID_API_KEY);
    expect(JSON.stringify(result)).not.toContain("sk-bad");
  });
});
