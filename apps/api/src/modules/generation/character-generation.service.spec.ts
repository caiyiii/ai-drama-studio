import { HttpStatus } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { AppError, ErrorCodes } from "../../common/app-error";
import { AiProviderError } from "../ai/ai.errors";
import { CharacterGenerationService } from "./character-generation.service";
import { validCharacterGeneration } from "./character/character-generation.schema.spec";

function createService(options?: {
  generate?: () => Promise<unknown>;
  resolved?: Record<string, unknown>;
  existingNames?: string[];
}) {
  const createdTasks: Array<Record<string, unknown>> = [];
  const createdCharacters: Array<Record<string, unknown>> = [];
  const prisma = {
    project: { findUnique: async () => ({ id: "proj-1" }) },
    world: {
      findUnique: async () => ({
        id: "world-1",
        projectId: "proj-1",
        title: "星河碰撞",
        summary: "星系相撞",
        coreConflict: "修仙与赛博",
      }),
    },
    civilization: {
      findFirst: async () => ({
        id: "civ-1",
        name: "修仙文明",
        description: "以自身为炉鼎",
      }),
      findMany: async () => [{ id: "civ-1", name: "修仙文明" }],
    },
    faction: {
      findFirst: async () => ({
        id: "fac-1",
        name: "问天宗",
        description: "以心证道",
      }),
      findMany: async () => [
        { id: "fac-1", name: "问天宗", civilizationId: "civ-1" },
      ],
    },
    character: {
      findMany: async () =>
        (options?.existingNames ?? []).map((name, index) => ({
          id: `char-${index}`,
          name,
        })),
      create: async ({ data }: { data: Record<string, unknown> }) => {
        createdCharacters.push(data);
        return { id: "char-new", ...data };
      },
    },
    characterRelationship: {
      create: async () => ({ id: "rel-1" }),
    },
    generationTask: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        createdTasks.push(data);
        return { id: "task-1", ...data };
      },
      update: async () => ({ id: "task-1" }),
    },
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn(prisma),
  };
  const resolved = options?.resolved ?? {
    source: "project",
    id: "prov-1",
    name: "我的 DeepSeek",
    kind: "OPENAI_COMPATIBLE",
    baseUrl: "https://example.test/v1",
    model: "deepseek-chat",
    apiKey: "sk-secret-key",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const ai = {
    resolveForCapability: async (_projectId: string, capability: string) => {
      expect(capability).toBe("STRUCTURED_OUTPUT");
      return resolved;
    },
    generateWith: async () => {
      if (options?.generate) {
        return options.generate();
      }
      return validCharacterGeneration;
    },
  };
  const taskByStatus: {
    id: string;
    projectId: string;
    type: string;
    status: string;
    output: unknown;
    error: string | null;
    appliedAt: Date | null;
    provider: string;
    model: string;
  } = {
    id: "task-1",
    projectId: "proj-1",
    type: "CHARACTER",
    status: "SUCCEEDED",
    output: validCharacterGeneration,
    error: null,
    appliedAt: null,
    provider: "我的 DeepSeek",
    model: "deepseek-chat",
  };
  const executor = {
    run: async (_id: string, work: () => Promise<unknown>, secret?: string) => {
      try {
        return await work();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "AI 生成失败";
        taskByStatus.status = "FAILED";
        taskByStatus.output = null;
        taskByStatus.error =
          secret && message.includes(secret)
            ? message.split(secret).join("[redacted]")
            : message;
        throw error;
      }
    },
    getTask: async () => ({ ...createdTasks[0], ...taskByStatus }),
  };
  const service = new CharacterGenerationService(
    prisma as never,
    ai as never,
    executor as never,
  );
  return { service, createdTasks, createdCharacters, taskByStatus, prisma };
}

describe("Character generation uses ProviderResolver", () => {
  it("records STRUCTURED_OUTPUT and does not create a character on preview", async () => {
    const { service, createdTasks, createdCharacters } = createService();
    const task = await service.createCharacterGeneration("proj-1", {
      prompt: "一个来自修仙文明的年轻天才",
      civilizationId: "civ-1",
      factionId: "fac-1",
    });
    expect(createdTasks[0]?.type).toBe("CHARACTER");
    expect(createdTasks[0]?.capability).toBe("STRUCTURED_OUTPUT");
    expect(createdTasks[0]?.provider).toBe("我的 DeepSeek");
    expect(createdTasks[0]?.model).toBe("deepseek-chat");
    expect(JSON.stringify(createdTasks[0])).not.toContain("sk-secret-key");
    expect(createdCharacters).toHaveLength(0);
    expect(task.status).toBe("SUCCEEDED");
  });

  it("marks the task FAILED for invalid JSON and does not write a character", async () => {
    const { service, createdCharacters, taskByStatus } = createService({
      generate: async () => {
        throw new AiProviderError("AI 返回非法 JSON", "INVALID_JSON");
      },
    });
    const task = await service.createCharacterGeneration("proj-1", {
      prompt: "生成一个角色",
    });
    expect(task.status).toBe("FAILED");
    expect(taskByStatus.output).toBeNull();
    expect(createdCharacters).toHaveLength(0);
  });

  it("marks the task FAILED when schema validation fails", async () => {
    const { service, createdCharacters, taskByStatus } = createService({
      generate: async () => ({ unexpected: true }),
    });
    const task = await service.createCharacterGeneration("proj-1", {
      prompt: "生成一个角色",
    });
    expect(task.status).toBe("FAILED");
    expect(String(task.error)).toMatch(/Schema Validation/);
    expect(taskByStatus.output).toBeNull();
    expect(createdCharacters).toHaveLength(0);
  });

  it("does not leak API keys in failed task errors", async () => {
    const { service } = createService({
      generate: async () => {
        throw new Error("upstream failed with sk-secret-key");
      },
    });
    const task = await service.createCharacterGeneration("proj-1", {
      prompt: "生成一个角色",
    });
    expect(task.status).toBe("FAILED");
    expect(JSON.stringify(task)).not.toContain("sk-secret-key");
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
    const service = new CharacterGenerationService(
      prisma as never,
      ai as never,
      { run: async () => undefined, getTask: async () => null } as never,
    );
    await expect(
      service.createCharacterGeneration("proj-1", { prompt: "test" }),
    ).rejects.toMatchObject({ code: ErrorCodes.NO_AI_PROVIDER_CONFIGURED });
  });

  it("applies a succeeded preview into a character", async () => {
    const { service, createdCharacters } = createService();
    await service.createCharacterGeneration("proj-1", {
      prompt: "一个来自修仙文明的年轻天才",
    });
    const applied = await service.apply("proj-1", "task-1");
    expect(createdCharacters).toHaveLength(1);
    expect(createdCharacters[0]?.name).toBe("沈星河");
    expect(applied.status).toBe("SUCCEEDED");
  });
});
