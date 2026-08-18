import { AiCapability, AiProviderKind } from "@prisma/client";
import { ConfigService } from "@nestjs/config";
import { describe, expect, it, beforeEach } from "vitest";
import { ErrorCodes } from "../../common/app-error";
import { CryptoService } from "./crypto/crypto.service";
import { encryptSecret } from "./crypto/aes-gcm";
import { ProviderResolver } from "./provider-resolver";

const KEY = "c".repeat(64);
const encrypted = encryptSecret("sk-db", KEY);
const userEncrypted = encryptSecret("sk-user", KEY);
const platformEncrypted = encryptSecret("sk-platform", KEY);

type CapRow = { capability: AiCapability; enabled: boolean };
type ModelRow = {
  id: string;
  providerId: string;
  name: string;
  modelId: string;
  capabilities: AiCapability[];
  enabled: boolean;
};
type ProviderRow = {
  id: string;
  name: string;
  provider: AiProviderKind;
  baseUrl: string;
  model: string;
  encryptedApiKey: string;
  enabled: boolean;
  isDefault: boolean;
  userId: string | null;
  projectId: string | null;
  createdAt: Date;
  updatedAt: Date;
  capabilities: CapRow[];
  models: ModelRow[];
};

function textCaps(): CapRow[] {
  return [
    { capability: AiCapability.CHAT, enabled: true },
    { capability: AiCapability.STRUCTURED_OUTPUT, enabled: true },
  ];
}

function makeProvider(partial: Partial<ProviderRow> & Pick<ProviderRow, "id" | "name">): ProviderRow {
  const model = partial.model ?? "deepseek-chat";
  const id = partial.id;
  return {
    provider: AiProviderKind.OPENAI_COMPATIBLE,
    baseUrl: "https://api.deepseek.com/v1",
    model,
    encryptedApiKey: encrypted,
    enabled: true,
    isDefault: false,
    userId: null,
    projectId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    capabilities: textCaps(),
    models: [
      {
        id: `mdl-${id}`,
        providerId: id,
        name: model,
        modelId: model,
        capabilities: [AiCapability.CHAT, AiCapability.STRUCTURED_OUTPUT],
        enabled: true,
      },
    ],
    ...partial,
    id,
    name: partial.name,
  };
}

function createResolver(store: {
  project?: { id: string; aiProviderId: string | null } | null;
  providers: ProviderRow[];
  configs?: Array<{
    projectId: string;
    capability: AiCapability;
    providerId: string | null;
    modelId: string | null;
  }>;
  env?: { apiKey?: string; baseUrl?: string; model?: string };
}) {
  const prisma = {
    project: {
      findUnique: async ({ where: { id } }: { where: { id: string } }) => {
        if (!store.project || store.project.id !== id) {
          return store.project === undefined ? null : store.project;
        }
        const aiProvider =
          store.providers.find((item) => item.id === store.project?.aiProviderId) ?? null;
        return { ...store.project, aiProvider };
      },
    },
    projectAiConfig: {
      findUnique: async ({
        where: { projectId_capability },
      }: {
        where: { projectId_capability: { projectId: string; capability: AiCapability } };
      }) => {
        const row = (store.configs ?? []).find(
          (item) =>
            item.projectId === projectId_capability.projectId &&
            item.capability === projectId_capability.capability,
        );
        if (!row) {
          return null;
        }
        const provider =
          store.providers.find((item) => item.id === row.providerId) ?? null;
        const model =
          provider?.models.find((item) => item.id === row.modelId) ?? null;
        return { ...row, provider, model };
      },
    },
    aiProvider: {
      findUnique: async ({ where: { id } }: { where: { id: string } }) =>
        store.providers.find((item) => item.id === id) ?? null,
      findFirst: async ({
        where,
      }: {
        where?: {
          isDefault?: boolean;
          enabled?: boolean;
          userId?: string | null;
          projectId?: string | null;
        };
      }) =>
        store.providers.find((item) => {
          if (where?.isDefault !== undefined && item.isDefault !== where.isDefault) {
            return false;
          }
          if (where?.enabled !== undefined && item.enabled !== where.enabled) {
            return false;
          }
          if (where?.userId === null && item.userId !== null) {
            return false;
          }
          if (where?.projectId === null && item.projectId !== null) {
            return false;
          }
          return true;
        }) ?? null,
      findMany: async ({
        where,
      }: {
        where?: { userId?: { not: null }; enabled?: boolean };
      }) =>
        store.providers.filter((item) => {
          if (where?.enabled !== undefined && item.enabled !== where.enabled) {
            return false;
          }
          if (where?.userId?.not === null && item.userId == null) {
            return false;
          }
          return true;
        }),
    },
  };
  const config = {
    get: (path: string) => {
      if (path === "ai.encryptionKey") return KEY;
      if (path === "ai.provider") return "openai-compatible";
      if (path === "ai.baseUrl") return store.env?.baseUrl ?? "";
      if (path === "ai.apiKey") return store.env?.apiKey ?? "";
      if (path === "ai.model") return store.env?.model ?? "";
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

describe("Capability Resolver", () => {
  beforeEach(() => {
    process.env.AI_ENCRYPTION_KEY = KEY;
  });

  it("prefers ProjectAiConfig over the legacy project provider", async () => {
    const projectProvider = makeProvider({ id: "legacy", name: "Legacy DeepSeek" });
    const configured = makeProvider({ id: "cfg", name: "配置 DeepSeek" });
    const resolver = createResolver({
      project: { id: "proj-1", aiProviderId: "legacy" },
      providers: [projectProvider, configured],
      configs: [
        {
          projectId: "proj-1",
          capability: AiCapability.STRUCTURED_OUTPUT,
          providerId: "cfg",
          modelId: "mdl-cfg",
        },
      ],
    });
    const resolved = await resolver.resolveForCapability({
      projectId: "proj-1",
      capability: AiCapability.STRUCTURED_OUTPUT,
    });
    expect(resolved.capabilitySource).toBe("PROJECT");
    expect(resolved.name).toBe("配置 DeepSeek");
    expect(resolved.model).toBe("deepseek-chat");
  });

  it("falls back to legacy Project.aiProviderId for CHAT and STRUCTURED_OUTPUT", async () => {
    const resolver = createResolver({
      project: { id: "proj-1", aiProviderId: "legacy" },
      providers: [makeProvider({ id: "legacy", name: "我的 DeepSeek" })],
    });
    const chat = await resolver.resolveForCapability({
      projectId: "proj-1",
      capability: AiCapability.CHAT,
    });
    const structured = await resolver.resolveForCapability({
      projectId: "proj-1",
      capability: AiCapability.STRUCTURED_OUTPUT,
    });
    expect(chat.capabilitySource).toBe("PROJECT");
    expect(structured.name).toBe("我的 DeepSeek");
  });

  it("does not use a text legacy provider for IMAGE", async () => {
    const resolver = createResolver({
      project: { id: "proj-1", aiProviderId: "legacy" },
      providers: [makeProvider({ id: "legacy", name: "我的 DeepSeek" })],
      env: {},
    });
    await expect(
      resolver.resolveForCapability({
        projectId: "proj-1",
        capability: AiCapability.IMAGE,
      }),
    ).rejects.toMatchObject({ code: ErrorCodes.NO_AI_PROVIDER_CONFIGURED });
  });

  it("falls back to a user provider", async () => {
    const resolver = createResolver({
      project: { id: "proj-1", aiProviderId: null },
      providers: [
        makeProvider({
          id: "user-1",
          name: "用户 DeepSeek",
          userId: "user-1",
          encryptedApiKey: userEncrypted,
        }),
      ],
    });
    const resolved = await resolver.resolveForCapability({
      projectId: "proj-1",
      capability: AiCapability.CHAT,
    });
    expect(resolved.capabilitySource).toBe("USER");
    expect(resolved.apiKey).toBe("sk-user");
  });

  it("falls back to a platform default provider", async () => {
    const resolver = createResolver({
      project: { id: "proj-1", aiProviderId: null },
      providers: [
        makeProvider({
          id: "plat",
          name: "平台 DeepSeek",
          isDefault: true,
          encryptedApiKey: platformEncrypted,
        }),
      ],
    });
    const resolved = await resolver.resolveForCapability({
      projectId: "proj-1",
      capability: AiCapability.STRUCTURED_OUTPUT,
    });
    expect(resolved.capabilitySource).toBe("PLATFORM");
    expect(resolved.source).toBe("default");
    expect(resolved.apiKey).toBe("sk-platform");
  });

  it("falls back to the system .env provider", async () => {
    const resolver = createResolver({
      project: { id: "proj-1", aiProviderId: null },
      providers: [],
      env: {
        apiKey: "sk-env",
        baseUrl: "https://api.deepseek.com/v1",
        model: "deepseek-chat",
      },
    });
    const resolved = await resolver.resolveForCapability({
      projectId: "proj-1",
      capability: AiCapability.CHAT,
    });
    expect(resolved.capabilitySource).toBe("SYSTEM");
    expect(resolved.apiKey).toBe("sk-env");
  });

  it("throws NO_AI_PROVIDER_CONFIGURED when every source is empty", async () => {
    const resolver = createResolver({
      project: { id: "proj-1", aiProviderId: null },
      providers: [],
      env: {},
    });
    await expect(
      resolver.resolveForCapability({
        projectId: "proj-1",
        capability: AiCapability.CHAT,
      }),
    ).rejects.toMatchObject({ code: ErrorCodes.NO_AI_PROVIDER_CONFIGURED });
  });

  it("rejects an explicit disabled provider", async () => {
    const resolver = createResolver({
      project: { id: "proj-1", aiProviderId: null },
      providers: [makeProvider({ id: "off", name: "停用", enabled: false })],
      configs: [
        {
          projectId: "proj-1",
          capability: AiCapability.CHAT,
          providerId: "off",
          modelId: null,
        },
      ],
    });
    await expect(
      resolver.resolveForCapability({
        projectId: "proj-1",
        capability: AiCapability.CHAT,
      }),
    ).rejects.toMatchObject({ code: ErrorCodes.PROVIDER_DISABLED });
  });

  it("rejects an explicit provider without an API key", async () => {
    const resolver = createResolver({
      project: { id: "proj-1", aiProviderId: null },
      providers: [makeProvider({ id: "empty", name: "空 Key", encryptedApiKey: "" })],
      configs: [
        {
          projectId: "proj-1",
          capability: AiCapability.CHAT,
          providerId: "empty",
          modelId: null,
        },
      ],
    });
    await expect(
      resolver.resolveForCapability({
        projectId: "proj-1",
        capability: AiCapability.CHAT,
      }),
    ).rejects.toMatchObject({ code: ErrorCodes.PROVIDER_API_KEY_MISSING });
  });

  it("rejects an explicit provider that does not support the capability", async () => {
    const resolver = createResolver({
      project: { id: "proj-1", aiProviderId: null },
      providers: [makeProvider({ id: "text", name: "文本" })],
      configs: [
        {
          projectId: "proj-1",
          capability: AiCapability.IMAGE,
          providerId: "text",
          modelId: null,
        },
      ],
    });
    await expect(
      resolver.resolveForCapability({
        projectId: "proj-1",
        capability: AiCapability.IMAGE,
      }),
    ).rejects.toMatchObject({ code: ErrorCodes.PROVIDER_CAPABILITY_NOT_SUPPORTED });
  });

  it("rejects a model that does not belong to the provider", async () => {
    const resolver = createResolver({
      project: { id: "proj-1", aiProviderId: null },
      providers: [makeProvider({ id: "p1", name: "P1" })],
      configs: [
        {
          projectId: "proj-1",
          capability: AiCapability.CHAT,
          providerId: "p1",
          modelId: "someone-else",
        },
      ],
    });
    await expect(
      resolver.resolveForCapability({
        projectId: "proj-1",
        capability: AiCapability.CHAT,
      }),
    ).rejects.toMatchObject({ code: ErrorCodes.MODEL_NOT_IN_PROVIDER });
  });

  it("rejects a disabled model", async () => {
    const provider = makeProvider({ id: "p1", name: "P1" });
    provider.models[0]!.enabled = false;
    const resolver = createResolver({
      project: { id: "proj-1", aiProviderId: null },
      providers: [provider],
      configs: [
        {
          projectId: "proj-1",
          capability: AiCapability.CHAT,
          providerId: "p1",
          modelId: "mdl-p1",
        },
      ],
    });
    await expect(
      resolver.resolveForCapability({
        projectId: "proj-1",
        capability: AiCapability.CHAT,
      }),
    ).rejects.toMatchObject({ code: ErrorCodes.MODEL_DISABLED });
  });

  it("rejects a model that does not support the capability", async () => {
    const provider = makeProvider({ id: "p1", name: "P1" });
    provider.models[0]!.capabilities = [AiCapability.CHAT];
    const resolver = createResolver({
      project: { id: "proj-1", aiProviderId: null },
      providers: [provider],
      configs: [
        {
          projectId: "proj-1",
          capability: AiCapability.STRUCTURED_OUTPUT,
          providerId: "p1",
          modelId: "mdl-p1",
        },
      ],
    });
    await expect(
      resolver.resolveForCapability({
        projectId: "proj-1",
        capability: AiCapability.STRUCTURED_OUTPUT,
      }),
    ).rejects.toMatchObject({ code: ErrorCodes.MODEL_CAPABILITY_NOT_SUPPORTED });
  });

  it("falls back after a project AI config is removed", async () => {
    const platform = makeProvider({
      id: "plat",
      name: "平台",
      isDefault: true,
      encryptedApiKey: platformEncrypted,
    });
    const resolver = createResolver({
      project: { id: "proj-1", aiProviderId: null },
      providers: [platform],
      configs: [],
    });
    const resolved = await resolver.resolveForCapability({
      projectId: "proj-1",
      capability: AiCapability.CHAT,
    });
    expect(resolved.capabilitySource).toBe("PLATFORM");
  });

  it("does not use a text legacy DeepSeek provider for VIDEO", async () => {
    const resolver = createResolver({
      project: { id: "proj-1", aiProviderId: "legacy" },
      providers: [makeProvider({ id: "legacy", name: "我的 DeepSeek" })],
      env: {},
    });
    await expect(
      resolver.resolveForCapability({
        projectId: "proj-1",
        capability: AiCapability.VIDEO,
      }),
    ).rejects.toMatchObject({ code: ErrorCodes.NO_AI_PROVIDER_CONFIGURED });
  });

  it("does not use a text legacy DeepSeek provider for IMAGE_TO_VIDEO", async () => {
    const resolver = createResolver({
      project: { id: "proj-1", aiProviderId: "legacy" },
      providers: [makeProvider({ id: "legacy", name: "我的 DeepSeek" })],
      env: {},
    });
    await expect(
      resolver.resolveForCapability({
        projectId: "proj-1",
        capability: AiCapability.IMAGE_TO_VIDEO,
      }),
    ).rejects.toMatchObject({ code: ErrorCodes.NO_AI_PROVIDER_CONFIGURED });
  });

  it("does not use a text legacy DeepSeek provider for TTS", async () => {
    const resolver = createResolver({
      project: { id: "proj-1", aiProviderId: "legacy" },
      providers: [makeProvider({ id: "legacy", name: "我的 DeepSeek" })],
      env: {},
    });
    await expect(
      resolver.resolveForCapability({
        projectId: "proj-1",
        capability: AiCapability.TTS,
      }),
    ).rejects.toMatchObject({ code: ErrorCodes.NO_AI_PROVIDER_CONFIGURED });
  });

  it("does not use a text legacy DeepSeek provider for MUSIC or SFX", async () => {
    const resolver = createResolver({
      project: { id: "proj-1", aiProviderId: "legacy" },
      providers: [makeProvider({ id: "legacy", name: "我的 DeepSeek" })],
      env: {},
    });
    await expect(
      resolver.resolveForCapability({
        projectId: "proj-1",
        capability: AiCapability.MUSIC,
      }),
    ).rejects.toMatchObject({ code: ErrorCodes.NO_AI_PROVIDER_CONFIGURED });
    await expect(
      resolver.resolveForCapability({
        projectId: "proj-1",
        capability: AiCapability.SFX,
      }),
    ).rejects.toMatchObject({ code: ErrorCodes.NO_AI_PROVIDER_CONFIGURED });
  });

  it("does not use an IMAGE provider for VIDEO", async () => {
    const imageOnly = makeProvider({
      id: "img",
      name: "Image Only",
      isDefault: true,
      capabilities: [{ capability: AiCapability.IMAGE, enabled: true }],
      models: [
        {
          id: "mdl-img",
          providerId: "img",
          name: "flux",
          modelId: "flux",
          capabilities: [AiCapability.IMAGE],
          enabled: true,
        },
      ],
    });
    const resolver = createResolver({
      project: { id: "proj-1", aiProviderId: null },
      providers: [imageOnly],
    });
    await expect(
      resolver.resolveForCapability({
        projectId: "proj-1",
        capability: AiCapability.VIDEO,
      }),
    ).rejects.toMatchObject({ code: ErrorCodes.NO_AI_PROVIDER_CONFIGURED });
  });

  it("resolves a project VIDEO provider separately from IMAGE", async () => {
    const image = makeProvider({
      id: "img",
      name: "Image Provider",
      capabilities: [{ capability: AiCapability.IMAGE, enabled: true }],
      models: [
        {
          id: "mdl-img",
          providerId: "img",
          name: "flux",
          modelId: "flux",
          capabilities: [AiCapability.IMAGE],
          enabled: true,
        },
      ],
    });
    const video = makeProvider({
      id: "vid",
      name: "Video Provider",
      model: "video-1",
      capabilities: [
        { capability: AiCapability.VIDEO, enabled: true },
        { capability: AiCapability.IMAGE_TO_VIDEO, enabled: true },
      ],
      models: [
        {
          id: "mdl-vid",
          providerId: "vid",
          name: "video-1",
          modelId: "video-1",
          capabilities: [AiCapability.VIDEO, AiCapability.IMAGE_TO_VIDEO],
          enabled: true,
        },
      ],
    });
    const resolver = createResolver({
      project: { id: "proj-1", aiProviderId: null },
      providers: [image, video],
      configs: [
        {
          projectId: "proj-1",
          capability: AiCapability.IMAGE,
          providerId: "img",
          modelId: "mdl-img",
        },
        {
          projectId: "proj-1",
          capability: AiCapability.VIDEO,
          providerId: "vid",
          modelId: "mdl-vid",
        },
        {
          projectId: "proj-1",
          capability: AiCapability.IMAGE_TO_VIDEO,
          providerId: "vid",
          modelId: "mdl-vid",
        },
      ],
    });
    const imageResolved = await resolver.resolveForCapability({
      projectId: "proj-1",
      capability: AiCapability.IMAGE,
    });
    const videoResolved = await resolver.resolveForCapability({
      projectId: "proj-1",
      capability: AiCapability.VIDEO,
    });
    const i2v = await resolver.resolveForCapability({
      projectId: "proj-1",
      capability: AiCapability.IMAGE_TO_VIDEO,
    });
    expect(imageResolved.name).toBe("Image Provider");
    expect(videoResolved.name).toBe("Video Provider");
    expect(i2v.name).toBe("Video Provider");
  });
});
