import { HttpStatus } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { AppError, ErrorCodes } from "../../common/app-error";
import { AiProviderError } from "../ai/ai.errors";
import { ScriptGenerationService } from "./script-generation.service";
import { validScriptGeneration } from "./script/script-generation.schema.spec";

function emptyContext() {
  return {
    project: { name: "星河碰撞", description: "demo", genre: "科幻修仙" },
    storyBible: {
      title: "星河碰撞",
      logline: "两星系被迫靠近",
      premise: "碰撞",
      theme: "文明冲突",
      tone: "史诗",
      style: "科幻修仙",
      storyPromise: "看见第一次接触",
      rules: { worldRules: ["灵气与义体互斥"] },
      timelineSummary: "三十日",
      continuityNotes: "按 storyState 延续",
    },
    world: { title: "灵械纪元", summary: "碰撞", cosmicBackground: "", coreConflict: "修仙与赛博" },
    civilizations: [],
    factions: [],
    locations: [],
    powerSystems: [],
    characters: [
      {
        id: "c1",
        name: "沈星河",
        role: "主角",
        identity: "外门弟子",
        personality: "隐忍",
        goal: "查清星图",
        conflict: "信仰撕裂",
      },
    ],
    relationships: [],
    seasons: [],
    episodes: [],
    season: { id: "season-1", number: 1, title: "星河初遇", synopsis: "", outline: "", status: "DRAFT" },
    episode: {
      id: "ep-1",
      number: 1,
      title: "星系碰撞",
      synopsis: "",
      outline: "以问天宗夜课开场",
      status: "OUTLINED",
      storyState: { unresolvedThreads: ["谁改写了星轨"] },
    },
    previousEpisode: null,
  };
}

function createService(options?: { generate?: () => Promise<unknown> }) {
  const createdTasks: Array<Record<string, unknown>> = [];
  const createdScripts: Array<Record<string, unknown>> = [];
  const captured: Array<{ system?: string; prompt: string }> = [];
  const taskState = { appliedAt: null as Date | null };
  const prisma = {
    project: { findUnique: async () => ({ id: "proj-1" }) },
    episode: {
      findFirst: async () => ({
        id: "ep-1",
        projectId: "proj-1",
        seasonId: "season-1",
        durationSeconds: 300,
        status: "OUTLINED",
      }),
      update: async ({ data }: { data: Record<string, unknown> }) => data,
    },
    character: {
      findMany: async () => [
        { id: "c1", name: "沈星河", alias: null, projectId: "proj-1" },
      ],
    },
    script: {
      findUnique: async () => null,
      create: async ({ data }: { data: Record<string, unknown> }) => {
        createdScripts.push(data);
        return { id: "script-1", version: 1, ...data };
      },
      update: async ({ data }: { data: Record<string, unknown> }) => data,
    },
    scene: {
      deleteMany: async () => ({ count: 0 }),
      create: async ({ data }: { data: Record<string, unknown> }) => ({
        id: "scene-1",
        ...data,
      }),
    },
    scriptBlock: {
      create: async ({ data }: { data: Record<string, unknown> }) => data,
    },
    generationTask: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        createdTasks.push(data);
        return { id: "task-1", ...data };
      },
      update: async ({ data }: { data: Record<string, unknown> }) => {
        if (data.appliedAt) {
          taskState.appliedAt = data.appliedAt as Date;
        }
        return { id: "task-1" };
      },
      findFirst: async () => ({
        id: "task-1",
        projectId: "proj-1",
        type: "SCRIPT",
        status: "SUCCEEDED",
      }),
    },
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn(prisma),
  };
  const resolved = {
    source: "project",
    id: "prov-1",
    name: "我的 DeepSeek",
    kind: "OPENAI_COMPATIBLE",
    model: "deepseek-chat",
    apiKey: "sk-secret-key",
  };
  const ai = {
    resolveForCapability: async (_projectId: string, capability: string) => {
      expect(capability).toBe("STRUCTURED_OUTPUT");
      return resolved;
    },
    generateWith: async (_resolved: unknown, payload: { system?: string; prompt: string }) => {
      captured.push(payload);
      if (options?.generate) {
        return options.generate();
      }
      return validScriptGeneration;
    },
  };
  const taskByStatus = {
    id: "task-1",
    projectId: "proj-1",
    type: "SCRIPT",
    status: "SUCCEEDED",
    output: validScriptGeneration as unknown,
    error: null as string | null,
    appliedAt: null as Date | null,
    provider: "我的 DeepSeek",
    model: "deepseek-chat",
    capability: "STRUCTURED_OUTPUT",
    usage: { durationMs: 180 },
    input: { episodeId: "ep-1" },
  };
  const executor = {
    run: async (_id: string, work: () => Promise<unknown>, secret?: string) => {
      try {
        const output = await work();
        taskByStatus.output = output;
        taskByStatus.status = "SUCCEEDED";
        return output;
      } catch (error) {
        const message = error instanceof Error ? error.message : "AI 生成失败";
        taskByStatus.status = "FAILED";
        taskByStatus.output = null;
        taskByStatus.error =
          secret && message.includes(secret)
            ? message.split(secret).join("[redacted]")
            : message;
        throw error;
      }
    },
    getTask: async () => ({
      ...createdTasks[0],
      ...taskByStatus,
      appliedAt: taskState.appliedAt ?? taskByStatus.appliedAt,
    }),
  };
  const continuity = {
    validateEpisodeContinuity: async () => ({ ok: true, errors: [], warnings: [] }),
  };
  const contextBuilder = {
    buildScriptContext: async () => emptyContext(),
  };
  const service = new ScriptGenerationService(
    prisma as never,
    ai as never,
    executor as never,
    contextBuilder as never,
    continuity as never,
  );
  return { service, createdTasks, createdScripts, captured, taskByStatus };
}

describe("Script generation uses ProviderResolver", () => {
  it("records SCRIPT + STRUCTURED_OUTPUT and does not write Script on preview", async () => {
    const { service, createdTasks, createdScripts, captured } = createService();
    const task = await service.createScriptGeneration("proj-1", { episodeId: "ep-1" });
    expect(createdTasks[0]?.type).toBe("SCRIPT");
    expect(createdTasks[0]?.capability).toBe("STRUCTURED_OUTPUT");
    expect(createdTasks[0]?.provider).toBe("我的 DeepSeek");
    expect(createdTasks[0]?.model).toBe("deepseek-chat");
    expect(JSON.stringify(createdTasks[0])).not.toContain("sk-secret-key");
    expect(createdScripts).toHaveLength(0);
    expect(task.status).toBe("SUCCEEDED");
    expect(captured[0]?.prompt).toContain("星河碰撞");
    expect(captured[0]?.prompt).toContain("沈星河");
    expect(captured[0]?.prompt).toContain("以问天宗夜课开场");
  });

  it("marks FAILED for invalid JSON and schema errors without creating Script", async () => {
    const invalid = createService({
      generate: async () => {
        throw new AiProviderError("AI 返回非法 JSON", "INVALID_JSON");
      },
    });
    const failedJson = await invalid.service.createScriptGeneration("proj-1", {
      episodeId: "ep-1",
    });
    expect(failedJson.status).toBe("FAILED");
    expect(invalid.createdScripts).toHaveLength(0);

    const schema = createService({
      generate: async () => ({ unexpected: true }),
    });
    const failedSchema = await schema.service.createScriptGeneration("proj-1", {
      episodeId: "ep-1",
    });
    expect(failedSchema.status).toBe("FAILED");
    expect(String(failedSchema.error)).toMatch(/Schema Validation/);
    expect(schema.createdScripts).toHaveLength(0);
  });

  it("does not leak API keys", async () => {
    const { service } = createService({
      generate: async () => {
        throw new Error("upstream failed with sk-secret-key");
      },
    });
    const task = await service.createScriptGeneration("proj-1", { episodeId: "ep-1" });
    expect(JSON.stringify(task)).not.toContain("sk-secret-key");
  });

  it("returns NO_AI_PROVIDER_CONFIGURED before creating a task", async () => {
    const prisma = {
      project: { findUnique: async () => ({ id: "proj-1" }) },
      episode: {
        findFirst: async () => ({ id: "ep-1", projectId: "proj-1", seasonId: "season-1" }),
      },
      generationTask: { create: async () => ({ id: "should-not" }) },
    };
    const service = new ScriptGenerationService(
      prisma as never,
      {
        resolveForCapability: async () => {
          throw new AppError(
            HttpStatus.BAD_REQUEST,
            ErrorCodes.NO_AI_PROVIDER_CONFIGURED,
            "尚未配置可用的 AI Provider。",
          );
        },
      } as never,
      { run: async () => undefined, getTask: async () => null } as never,
      { buildScriptContext: async () => emptyContext() } as never,
      { validateEpisodeContinuity: async () => ({ ok: true, errors: [], warnings: [] }) } as never,
    );
    await expect(
      service.createScriptGeneration("proj-1", { episodeId: "ep-1" }),
    ).rejects.toMatchObject({ code: ErrorCodes.NO_AI_PROVIDER_CONFIGURED });
  });

  it("rejects continuity failures before creating a task", async () => {
    const prisma = {
      project: { findUnique: async () => ({ id: "proj-1" }) },
      episode: {
        findFirst: async () => ({ id: "ep-1", projectId: "proj-1", seasonId: "season-1" }),
      },
      generationTask: { create: async () => ({ id: "should-not" }) },
    };
    const service = new ScriptGenerationService(
      prisma as never,
      { resolveForCapability: async () => ({}) } as never,
      { run: async () => undefined, getTask: async () => null } as never,
      { buildScriptContext: async () => emptyContext() } as never,
      {
        validateEpisodeContinuity: async () => ({
          ok: false,
          errors: ["剧集不属于指定季"],
          warnings: [],
        }),
      } as never,
    );
    await expect(
      service.createScriptGeneration("proj-1", { episodeId: "ep-1" }),
    ).rejects.toMatchObject({ code: ErrorCodes.PROJECT_EPISODE_MISMATCH });
  });

  it("preview does not create Script, apply does and sets appliedAt", async () => {
    const { service, createdScripts, taskByStatus } = createService();
    await service.createScriptGeneration("proj-1", { episodeId: "ep-1" });
    expect(createdScripts).toHaveLength(0);
    const applied = await service.apply("proj-1", "task-1");
    expect(createdScripts).toHaveLength(1);
    expect(applied.appliedAt).toBeInstanceOf(Date);
    expect(taskByStatus.status).toBe("SUCCEEDED");
  });

  it("rejects apply when generation is not succeeded", async () => {
    const { service, taskByStatus } = createService();
    taskByStatus.status = "FAILED";
    await expect(service.apply("proj-1", "task-1")).rejects.toMatchObject({
      code: ErrorCodes.GENERATION_NOT_SUCCEEDED,
    });
  });
});
