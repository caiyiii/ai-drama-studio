import { AiCapability, AiProviderKind } from "@prisma/client";
import { ConfigService } from "@nestjs/config";
import { describe, expect, it, beforeEach } from "vitest";
import { ErrorCodes } from "../../common/app-error";
import { CryptoService } from "./crypto/crypto.service";
import { encryptSecret } from "./crypto/aes-gcm";
import { ProjectAiConfigService } from "./project-ai-config.service";
import { ProviderResolver } from "./provider-resolver";

const KEY = "d".repeat(64);
const encrypted = encryptSecret("sk-secret", KEY);

type ConfigRow = {
  id: string;
  projectId: string;
  capability: AiCapability;
  providerId: string | null;
  modelId: string | null;
};

function createService() {
  const providers = [
    {
      id: "p1",
      name: "我的 DeepSeek",
      provider: AiProviderKind.OPENAI_COMPATIBLE,
      baseUrl: "https://api.deepseek.com/v1",
      model: "deepseek-chat",
      encryptedApiKey: encrypted,
      isDefault: true,
      enabled: true,
      userId: null,
      projectId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      capabilities: [
        { capability: AiCapability.CHAT, enabled: true },
        { capability: AiCapability.STRUCTURED_OUTPUT, enabled: true },
      ],
      models: [
        {
          id: "m1",
          providerId: "p1",
          name: "DeepSeek Chat",
          modelId: "deepseek-chat",
          capabilities: [AiCapability.CHAT, AiCapability.STRUCTURED_OUTPUT],
          enabled: true,
        },
        {
          id: "m-off",
          providerId: "p1",
          name: "Disabled",
          modelId: "disabled-model",
          capabilities: [AiCapability.CHAT],
          enabled: false,
        },
      ],
    },
  ];
  const projects = [{ id: "proj-1", aiProviderId: null as string | null }];
  const configs: ConfigRow[] = [];

  const prisma = {
    project: {
      findUnique: async ({ where: { id } }: { where: { id: string } }) => {
        const project = projects.find((item) => item.id === id);
        if (!project) {
          return null;
        }
        return {
          ...project,
          aiProvider: providers.find((item) => item.id === project.aiProviderId) ?? null,
        };
      },
    },
    aiProvider: {
      findUnique: async ({ where: { id } }: { where: { id: string } }) =>
        providers.find((item) => item.id === id) ?? null,
      findFirst: async () => providers.find((item) => item.isDefault) ?? null,
      findMany: async () => providers.filter((item) => item.userId),
    },
    projectAiConfig: {
      findMany: async ({ where: { projectId } }: { where: { projectId: string } }) =>
        configs
          .filter((item) => item.projectId === projectId)
          .map((item) => ({
            ...item,
            provider: providers.find((provider) => provider.id === item.providerId) ?? null,
            model:
              providers
                .find((provider) => provider.id === item.providerId)
                ?.models.find((model) => model.id === item.modelId) ?? null,
          })),
      findUnique: async ({
        where: { projectId_capability },
      }: {
        where: { projectId_capability: { projectId: string; capability: AiCapability } };
      }) => {
        const row = configs.find(
          (item) =>
            item.projectId === projectId_capability.projectId &&
            item.capability === projectId_capability.capability,
        );
        if (!row) {
          return null;
        }
        const provider = providers.find((item) => item.id === row.providerId) ?? null;
        return {
          ...row,
          provider,
          model: provider?.models.find((item) => item.id === row.modelId) ?? null,
        };
      },
      upsert: async ({
        where: { projectId_capability },
        create,
        update,
      }: {
        where: { projectId_capability: { projectId: string; capability: AiCapability } };
        create: Omit<ConfigRow, "id">;
        update: Partial<ConfigRow>;
      }) => {
        const existing = configs.find(
          (item) =>
            item.projectId === projectId_capability.projectId &&
            item.capability === projectId_capability.capability,
        );
        if (existing) {
          Object.assign(existing, update);
          return existing;
        }
        const created = { id: `cfg-${configs.length + 1}`, ...create };
        configs.push(created);
        return created;
      },
      deleteMany: async ({
        where,
      }: {
        where: { projectId: string; capability: AiCapability };
      }) => {
        const next = configs.filter(
          (item) =>
            !(item.projectId === where.projectId && item.capability === where.capability),
        );
        const count = configs.length - next.length;
        configs.length = 0;
        configs.push(...next);
        return { count };
      },
    },
  };

  const config = {
    get: (path: string) => {
      if (path === "ai.encryptionKey") return KEY;
      return "";
    },
  } as unknown as ConfigService;
  const crypto = new CryptoService(config);
  const resolver = new ProviderResolver(prisma as never, config, crypto);
  const service = new ProjectAiConfigService(prisma as never, resolver);
  return { service, configs, providers };
}

describe("Project AI Config", () => {
  beforeEach(() => {
    process.env.AI_ENCRYPTION_KEY = KEY;
  });

  it("creates a project capability config", async () => {
    const { service, configs } = createService();
    const result = await service.setProjectConfig("proj-1", "CHAT", {
      providerId: "p1",
      modelId: "deepseek-chat",
    });
    expect(configs).toHaveLength(1);
    expect(result.CHAT.configured).toBe(true);
    expect(result.CHAT.source).toBe("PROJECT");
    expect(result.CHAT.providerName).toBe("我的 DeepSeek");
    expect(JSON.stringify(result)).not.toContain("sk-secret");
    expect(JSON.stringify(result)).not.toContain("encryptedApiKey");
  });

  it("updates the same unique projectId + capability row", async () => {
    const { service, configs } = createService();
    await service.setProjectConfig("proj-1", "CHAT", { providerId: "p1" });
    await service.setProjectConfig("proj-1", "CHAT", {
      providerId: "p1",
      modelId: "m1",
    });
    expect(configs).toHaveLength(1);
    expect(configs[0]?.modelId).toBe("m1");
  });

  it("deletes a project capability config and falls back", async () => {
    const { service, configs } = createService();
    await service.setProjectConfig("proj-1", "CHAT", { providerId: "p1" });
    const result = await service.deleteProjectConfig("proj-1", "CHAT");
    expect(configs).toHaveLength(0);
    expect(result.CHAT.source).toBe("PLATFORM");
    expect(result.CHAT.configured).toBe(true);
  });

  it("clears the config when providerId is empty", async () => {
    const { service, configs } = createService();
    await service.setProjectConfig("proj-1", "STRUCTURED_OUTPUT", { providerId: "p1" });
    await service.setProjectConfig("proj-1", "STRUCTURED_OUTPUT", { providerId: "" });
    expect(configs).toHaveLength(0);
  });

  it("rejects a provider that does not support IMAGE", async () => {
    const { service } = createService();
    await expect(
      service.setProjectConfig("proj-1", "IMAGE", { providerId: "p1" }),
    ).rejects.toMatchObject({
      code: ErrorCodes.PROVIDER_CAPABILITY_NOT_SUPPORTED,
    });
  });

  it("rejects a disabled provider", async () => {
    const { service, providers } = createService();
    providers[0]!.enabled = false;
    await expect(
      service.setProjectConfig("proj-1", "CHAT", { providerId: "p1" }),
    ).rejects.toMatchObject({ code: ErrorCodes.PROVIDER_DISABLED });
  });

  it("rejects a missing API key", async () => {
    const { service, providers } = createService();
    providers[0]!.encryptedApiKey = "";
    await expect(
      service.setProjectConfig("proj-1", "CHAT", { providerId: "p1" }),
    ).rejects.toMatchObject({ code: ErrorCodes.PROVIDER_API_KEY_MISSING });
  });

  it("rejects a model that does not belong to the provider", async () => {
    const { service } = createService();
    await expect(
      service.setProjectConfig("proj-1", "CHAT", {
        providerId: "p1",
        modelId: "other-model",
      }),
    ).rejects.toMatchObject({ code: ErrorCodes.MODEL_NOT_IN_PROVIDER });
  });

  it("rejects a disabled model", async () => {
    const { service } = createService();
    await expect(
      service.setProjectConfig("proj-1", "CHAT", {
        providerId: "p1",
        modelId: "m-off",
      }),
    ).rejects.toMatchObject({ code: ErrorCodes.MODEL_DISABLED });
  });

  it("lists capability metadata without secrets", async () => {
    const { service } = createService();
    const list = service.listCapabilities();
    expect(list.find((item) => item.capability === "CHAT")?.implemented).toBe(true);
    expect(list.find((item) => item.capability === "IMAGE")?.implemented).toBe(true);
    expect(list.find((item) => item.capability === "VIDEO")?.implemented).toBe(true);
    expect(list.find((item) => item.capability === "IMAGE_TO_VIDEO")?.implemented).toBe(true);
    expect(JSON.stringify(list)).not.toContain("apiKey");
  });

  it("returns unconfigured IMAGE without leaking keys", async () => {
    const { service } = createService();
    const result = await service.getProjectConfig("proj-1");
    expect(result.IMAGE.configured).toBe(false);
    expect(JSON.stringify(result)).not.toContain("sk-secret");
  });
});
