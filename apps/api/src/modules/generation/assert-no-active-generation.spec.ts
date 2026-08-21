import { describe, expect, it } from "vitest";
import { GenerationTaskStatus, GenerationTaskType } from "@prisma/client";
import { ErrorCodes } from "../../common/app-error";
import { assertNoActiveGeneration } from "./assert-no-active-generation";

describe("assertNoActiveGeneration", () => {
  it("allows create when no active task matches", async () => {
    const prisma = {
      generationTask: {
        findMany: async () => [
          {
            id: "task-old",
            status: GenerationTaskStatus.RUNNING,
            input: { shotId: "shot-other" },
          },
        ],
      },
    };
    await expect(
      assertNoActiveGeneration(prisma as never, {
        projectId: "proj-1",
        type: GenerationTaskType.IMAGE,
        match: (payload) => String(payload.shotId || "") === "shot-1",
      }),
    ).resolves.toBeUndefined();
  });

  it("rejects duplicate running generation for the same shot", async () => {
    const prisma = {
      generationTask: {
        findMany: async () => [
          {
            id: "task-1",
            status: GenerationTaskStatus.RUNNING,
            input: { shotId: "shot-1" },
          },
        ],
      },
    };
    await expect(
      assertNoActiveGeneration(prisma as never, {
        projectId: "proj-1",
        type: GenerationTaskType.IMAGE,
        match: (payload) => String(payload.shotId || "") === "shot-1",
        message: "该镜头已有图片生成任务正在进行中。",
      }),
    ).rejects.toMatchObject({
      code: ErrorCodes.GENERATION_ALREADY_RUNNING,
      message: "该镜头已有图片生成任务正在进行中。",
    });
  });
});
