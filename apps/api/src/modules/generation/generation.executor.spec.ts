import { GenerationTaskStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { GenerationExecutor } from "./generation.executor";

describe("GenerationTask status flow", () => {
  it("marks RUNNING then SUCCEEDED", async () => {
    const updates: Array<{ status?: GenerationTaskStatus; output?: unknown; error?: string | null }> = [];
    const prisma = {
      generationTask: {
        update: async ({ data }: { data: { status?: GenerationTaskStatus; output?: unknown; error?: string | null } }) => {
          updates.push(data);
          return data;
        },
        findFirst: async () => null,
      },
    };
    const executor = new GenerationExecutor(prisma as never);
    const result = await executor.run("task-1", async () => ({ ok: true }));
    expect(result).toEqual({ ok: true });
    expect(updates.map((item) => item.status)).toEqual([
      GenerationTaskStatus.RUNNING,
      GenerationTaskStatus.SUCCEEDED,
    ]);
  });

  it("marks FAILED and does not write invalid output", async () => {
    const updates: Array<{ status?: GenerationTaskStatus; output?: unknown; error?: string | null }> = [];
    const prisma = {
      generationTask: {
        update: async ({ data }: { data: { status?: GenerationTaskStatus; output?: unknown; error?: string | null } }) => {
          updates.push(data);
          return data;
        },
        findFirst: async () => null,
      },
    };
    const executor = new GenerationExecutor(prisma as never);
    await expect(
      executor.run("task-2", async () => {
        throw new Error("AI 返回非法 JSON");
      }),
    ).rejects.toThrow(/非法 JSON/);
    expect(updates[0]?.status).toBe(GenerationTaskStatus.RUNNING);
    expect(updates[1]?.status).toBe(GenerationTaskStatus.FAILED);
    expect(updates[1]?.output).toBeUndefined();
    expect(updates[1]?.error).toContain("非法 JSON");
  });
});
