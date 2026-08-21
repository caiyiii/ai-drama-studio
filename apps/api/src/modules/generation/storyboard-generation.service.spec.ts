import { HttpStatus } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { AppError, ErrorCodes } from "../../common/app-error";
import { AiProviderError } from "../ai/ai.errors";
import { StoryboardGenerationService } from "./storyboard-generation.service";
import { validStoryboardGeneration } from "./storyboard/storyboard-generation.schema.spec";

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
        visualSummary: "黑发青年",
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
      status: "SCRIPTING",
      storyState: { unresolvedThreads: ["谁改写了星轨"] },
    },
    previousEpisode: null,
    script: {
      id: "script-1",
      version: 1,
      status: "READY",
      title: "星系碰撞",
      scenes: [
        {
          id: "scene-1",
          number: 1,
          title: "问天宗夜课",
          location: "外门",
          timeOfDay: "夜",
          summary: "",
          blocks: [
            {
              id: "block-1",
              order: 1,
              type: "ACTION",
              characterId: "c1",
              characterName: "沈星河",
              content: "沈星河抬头望向天空。",
            },
          ],
        },
      ],
    },
  };
}

function createService(options?: {
  generate?: () => Promise<unknown>;
  hasScript?: boolean;
  providerSource?: "project" | "default" | "system" | "legacy";
}) {
  const createdTasks: Array<Record<string, unknown>> = [];
  const createdBoards: Array<Record<string, unknown>> = [];
  const createdShots: Array<Record<string, unknown>> = [];
  const captured: Array<{ system?: string; prompt: string; maxTokens?: number }> = [];
  const taskState = {
    appliedAt: null as Date | null,
    usage: { durationMs: 180 } as Record<string, unknown>,
    retryCount: 0,
  };
  const hasScript = options?.hasScript !== false;
  const prisma = {
    project: { findUnique: async () => ({ id: "proj-1" }) },
    episode: {
      findFirst: async () => ({
        id: "ep-1",
        projectId: "proj-1",
        seasonId: "season-1",
        durationSeconds: 300,
        status: "SCRIPTING",
      }),
    },
    script: {
      findUnique: async () =>
        hasScript
          ? {
              id: "script-1",
              episodeId: "ep-1",
              projectId: "proj-1",
              version: 1,
              status: "READY",
              scenes: [
                {
                  id: "scene-1",
                  number: 1,
                  scriptId: "script-1",
                  blocks: [
                    { id: "block-1", sceneId: "scene-1" },
                    { id: "block-2", sceneId: "scene-1" },
                  ],
                },
              ],
            }
          : null,
    },
    character: {
      findMany: async () => [{ id: "c1", name: "沈星河", projectId: "proj-1" }],
    },
    storyboard: {
      findUnique: async () => createdBoards[0] ?? null,
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const created = { id: "board-1", version: 1, ...data };
        createdBoards.push(created);
        return created;
      },
      update: async ({ data }: { data: Record<string, unknown> }) => {
        Object.assign(createdBoards[0] ?? {}, data);
        return createdBoards[0];
      },
    },
    storyboardShot: {
      deleteMany: async () => {
        createdShots.length = 0;
      },
      create: async ({ data }: { data: Record<string, unknown> }) => {
        createdShots.push(data);
        return { id: `shot-${createdShots.length}`, ...data };
      },
    },
    generationTask: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        createdTasks.push(data);
        return { id: "task-1", ...data };
      },
      findMany: async () => [],
      findUnique: async () => ({
        id: "task-1",
        status: "SUCCEEDED",
        output: validStoryboardGeneration,
        usage: taskState.usage,
        retryCount: taskState.retryCount,
      }),
      update: async ({ data }: { data: Record<string, unknown> }) => {
        if (data.appliedAt) {
          taskState.appliedAt = data.appliedAt as Date;
        }
        if (data.usage) {
          taskState.usage = data.usage as Record<string, unknown>;
        }
        if (typeof data.retryCount === "number") {
          taskState.retryCount = data.retryCount;
        }
        return { id: "task-1" };
      },
      findFirst: async () => ({
        id: "task-1",
        projectId: "proj-1",
        type: "STORYBOARD",
        status: "SUCCEEDED",
      }),
    },
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn(prisma),
  };
  const source = options?.providerSource ?? "project";
  const resolved = {
    source,
    id: source === "system" ? "system" : "prov-1",
    name: source === "system" ? "DeepSeek（系统）" : source === "default" ? "默认 Provider" : "我的 DeepSeek",
    kind: "OPENAI_COMPATIBLE",
    model: "deepseek-chat",
    apiKey: "sk-secret-key",
  };
  const ai = {
    resolveForCapability: async (_projectId: string, capability: string) => {
      expect(capability).toBe("STRUCTURED_OUTPUT");
      return resolved;
    },
    generateWith: async (
      _resolved: unknown,
      payload: { system?: string; prompt: string; maxTokens?: number },
    ) => {
      captured.push(payload);
      if (options?.generate) {
        return options.generate();
      }
      return validStoryboardGeneration;
    },
  };
  const taskByStatus = {
    id: "task-1",
    projectId: "proj-1",
    type: "STORYBOARD",
    status: "SUCCEEDED",
    output: validStoryboardGeneration as unknown,
    error: null as string | null,
    appliedAt: null as Date | null,
    provider: source === "system" ? "OPENAI_COMPATIBLE" : resolved.name,
    model: "deepseek-chat",
    capability: "STRUCTURED_OUTPUT",
    usage: taskState.usage,
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
      usage: taskState.usage,
      retryCount: taskState.retryCount,
    }),
  };
  const continuity = {
    validateStoryboardContinuity: async () => {
      if (!hasScript) {
        throw new AppError(
          HttpStatus.BAD_REQUEST,
          ErrorCodes.SCRIPT_REQUIRED_FOR_STORYBOARD,
          "生成分镜前必须先有剧本",
        );
      }
      return { ok: true };
    },
  };
  const contextBuilder = {
    buildStoryboardContext: async () => emptyContext(),
  };
  const service = new StoryboardGenerationService(
    prisma as never,
    ai as never,
    executor as never,
    contextBuilder as never,
    continuity as never,
  );
  return {
    service,
    createdTasks,
    createdBoards,
    createdShots,
    captured,
    taskByStatus,
    taskState,
  };
}

describe("Storyboard generation uses ProviderResolver", () => {
  it("records STORYBOARD + STRUCTURED_OUTPUT and does not write Storyboard on preview", async () => {
    const { service, createdTasks, createdBoards, captured, taskState } = createService();
    const task = await service.createStoryboardGeneration("proj-1", { episodeId: "ep-1" });
    expect(createdTasks[0]?.type).toBe("STORYBOARD");
    expect(createdTasks[0]?.capability).toBe("STRUCTURED_OUTPUT");
    expect(createdTasks[0]?.provider).toBe("我的 DeepSeek");
    expect(createdTasks[0]?.model).toBe("deepseek-chat");
    expect(JSON.stringify(createdTasks[0])).not.toContain("sk-secret-key");
    expect(createdBoards).toHaveLength(0);
    expect(task.status).toBe("SUCCEEDED");
    expect(captured[0]?.prompt).toContain("星河碰撞");
    expect(captured[0]?.prompt).toContain("沈星河");
    expect(taskState.usage.shotCount).toBe(4);
    expect(taskState.usage.sceneCount).toBe(1);
    expect(taskState.usage).not.toHaveProperty("promptTokens");
  });

  it("fails before AI when Script is missing", async () => {
    const { service, createdTasks } = createService({ hasScript: false });
    await expect(
      service.createStoryboardGeneration("proj-1", { episodeId: "ep-1" }),
    ).rejects.toMatchObject({ code: ErrorCodes.SCRIPT_REQUIRED_FOR_STORYBOARD });
    expect(createdTasks).toHaveLength(0);
  });

  it("marks FAILED for invalid JSON and schema errors without creating Storyboard", async () => {
    const invalid = createService({
      generate: async () => {
        throw new AiProviderError("AI 返回非法 JSON", "INVALID_JSON");
      },
    });
    const failedJson = await invalid.service.createStoryboardGeneration("proj-1", {
      episodeId: "ep-1",
    });
    expect(failedJson.status).toBe("FAILED");
    expect(invalid.createdBoards).toHaveLength(0);
    expect(invalid.captured).toHaveLength(3);
    expect(invalid.captured[1]?.prompt).toContain("RETRY REQUIRED");

    const schema = createService({
      generate: async () => ({ unexpected: true }),
    });
    const failedSchema = await schema.service.createStoryboardGeneration("proj-1", {
      episodeId: "ep-1",
    });
    expect(failedSchema.status).toBe("FAILED");
    expect(String(failedSchema.error)).toMatch(/Schema Validation/);
    expect(schema.createdBoards).toHaveLength(0);
    expect(schema.captured).toHaveLength(3);
  });

  it("retries invalid JSON then succeeds within 3 attempts", async () => {
    let calls = 0;
    const { service, captured, taskState } = createService({
      generate: async () => {
        calls += 1;
        if (calls < 2) {
          throw new AiProviderError("AI 返回非法 JSON", "INVALID_JSON");
        }
        return validStoryboardGeneration;
      },
    });
    const task = await service.createStoryboardGeneration("proj-1", { episodeId: "ep-1" });
    expect(task.status).toBe("SUCCEEDED");
    expect(captured).toHaveLength(2);
    expect(captured[0]?.maxTokens).toBe(8192);
    expect(captured[1]?.prompt).toContain("RETRY REQUIRED");
    expect(taskState.retryCount).toBe(1);
  });

  it("does not leak API keys", async () => {
    const { service } = createService({
      generate: async () => {
        throw new Error("upstream failed with sk-secret-key");
      },
    });
    const task = await service.createStoryboardGeneration("proj-1", { episodeId: "ep-1" });
    expect(JSON.stringify(task)).not.toContain("sk-secret-key");
  });

  it("uses system provider kind without leaking the env key", async () => {
    const { createdTasks, service } = createService({ providerSource: "system" });
    await service.createStoryboardGeneration("proj-1", { episodeId: "ep-1" });
    expect(createdTasks[0]?.provider).toBe("OPENAI_COMPATIBLE");
    expect(JSON.stringify(createdTasks[0])).not.toContain("sk-secret-key");
  });

  it("uses default provider when project has none", async () => {
    const { createdTasks, service } = createService({ providerSource: "default" });
    await service.createStoryboardGeneration("proj-1", { episodeId: "ep-1" });
    expect(createdTasks[0]?.provider).toBe("默认 Provider");
  });

  it("preview does not create Storyboard, apply does and sets appliedAt", async () => {
    const { service, createdBoards, createdShots, taskState } = createService();
    await service.createStoryboardGeneration("proj-1", { episodeId: "ep-1" });
    expect(createdBoards).toHaveLength(0);
    const applied = await service.apply("proj-1", "task-1");
    expect(createdBoards).toHaveLength(1);
    expect(createdShots).toHaveLength(4);
    expect(applied.appliedAt).toBeInstanceOf(Date);
    expect(taskState.appliedAt).toBeInstanceOf(Date);
  });

  it("rejects apply when generation is not succeeded", async () => {
    const { service, taskByStatus } = createService();
    taskByStatus.status = "FAILED";
    await expect(service.apply("proj-1", "task-1")).rejects.toMatchObject({
      code: ErrorCodes.GENERATION_NOT_SUCCEEDED,
    });
  });
});
