import { HttpStatus } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { AppError, ErrorCodes } from "../../common/app-error";
import { WorldGenerationService } from "./world-generation.service";

describe("World generation uses ProviderResolver", () => {
  it("records the project provider on the generation task", async () => {
    const created: Array<Record<string, unknown>> = [];
    const prisma = {
      project: { findUnique: async () => ({ id: "proj-1" }) },
      generationTask: {
        create: async ({ data }: { data: Record<string, unknown> }) => {
          created.push(data);
          return { id: "task-1", ...data };
        },
      },
    };
    const ai = {
      resolveForCapability: async (
        _projectId: string,
        capability: string,
      ) => {
        expect(capability).toBe("STRUCTURED_OUTPUT");
        return {
        source: "project",
        id: "prov-1",
        name: "我的 DeepSeek",
        kind: "OPENAI_COMPATIBLE",
        baseUrl: "https://example.test/v1",
        model: "deepseek-chat",
        apiKey: "sk-project",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      },
      generateWith: async () => ({
        world: {
          name: "星河碰撞",
          description: "d",
          cosmicBackground: "b",
          coreConflict: "c",
        },
        civilizations: [],
        histories: [],
        factions: [],
        locations: [],
        powerSystems: [],
      }),
    };
    const executor = {
      run: async (_id: string, work: () => Promise<unknown>) => work(),
      getTask: async () => created[0],
    };
    const service = new WorldGenerationService(
      prisma as never,
      ai as never,
      executor as never,
    );
    await service.createWorldGeneration("proj-1", {
      prompt: "两大星系发生碰撞",
    });
    expect(created[0]?.provider).toBe("我的 DeepSeek");
    expect(created[0]?.model).toBe("deepseek-chat");
    expect(created[0]?.capability).toBe("STRUCTURED_OUTPUT");
  });

  it("uses the default provider when the project has none", async () => {
    const created: Array<Record<string, unknown>> = [];
    const prisma = {
      project: { findUnique: async () => ({ id: "proj-1" }) },
      generationTask: {
        create: async ({ data }: { data: Record<string, unknown> }) => {
          created.push(data);
          return { id: "task-1", ...data };
        },
      },
    };
    const ai = {
      resolveForCapability: async () => ({
        source: "default",
        id: "prov-default",
        name: "默认 Provider",
        kind: "OPENAI_COMPATIBLE",
        baseUrl: "https://example.test/v1",
        model: "gpt-4o-mini",
        apiKey: "sk-default",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
      generateWith: async () => {
        throw new Error("stop after resolve");
      },
    };
    const executor = {
      run: async (_id: string, work: () => Promise<unknown>) => work(),
      getTask: async () => created[0],
    };
    const service = new WorldGenerationService(
      prisma as never,
      ai as never,
      executor as never,
    );
    await service.createWorldGeneration("proj-1", { prompt: "test" });
    expect(created[0]?.provider).toBe("默认 Provider");
  });

  it("records OPENAI_COMPATIBLE when using the system provider", async () => {
    const created: Array<Record<string, unknown>> = [];
    const prisma = {
      project: { findUnique: async () => ({ id: "proj-1" }) },
      generationTask: {
        create: async ({ data }: { data: Record<string, unknown> }) => {
          created.push(data);
          return { id: "task-1", ...data };
        },
      },
    };
    const ai = {
      resolveForCapability: async () => ({
        source: "system",
        id: "system",
        name: "DeepSeek（系统）",
        kind: "OPENAI_COMPATIBLE",
        baseUrl: "https://api.deepseek.com",
        model: "deepseek-chat",
        apiKey: "sk-env",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
      generateWith: async () => {
        throw new Error("stop after resolve");
      },
    };
    const executor = {
      run: async (_id: string, work: () => Promise<unknown>) => work(),
      getTask: async () => created[0],
    };
    const service = new WorldGenerationService(
      prisma as never,
      ai as never,
      executor as never,
    );
    await service.createWorldGeneration("proj-1", { prompt: "test" });
    expect(created[0]?.provider).toBe("OPENAI_COMPATIBLE");
    expect(created[0]?.model).toBe("deepseek-chat");
    expect(JSON.stringify(created[0])).not.toContain("sk-env");
  });

  it("returns NO_AI_PROVIDER_CONFIGURED before creating a task", async () => {
    const prisma = {
      project: { findUnique: async () => ({ id: "proj-1" }) },
      generationTask: { create: async () => ({ id: "should-not" }) },
    };
    const ai = {
      resolveForCapability: async () => {
        throw new AppError(
          HttpStatus.BAD_REQUEST,
          ErrorCodes.NO_AI_PROVIDER_CONFIGURED,
          "尚未配置可用的 AI Provider。",
        );
      },
    };
    const service = new WorldGenerationService(
      prisma as never,
      ai as never,
      { run: async () => undefined, getTask: async () => null } as never,
    );
    await expect(
      service.createWorldGeneration("proj-1", { prompt: "test" }),
    ).rejects.toMatchObject({ code: ErrorCodes.NO_AI_PROVIDER_CONFIGURED });
  });
});
