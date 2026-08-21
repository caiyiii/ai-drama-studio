import { HttpStatus } from "@nestjs/common";
import {
  GenerationTaskStatus,
  GenerationTaskType,
  type PrismaClient,
} from "@prisma/client";
import { AppError, ErrorCodes } from "../../common/app-error";

type PrismaLike = Pick<PrismaClient, "generationTask">;

/**
 * Prevent duplicate concurrent generations for the same logical target
 * (shot / scriptBlock / episode storyboard). Creates a new task only when
 * no PENDING/RUNNING task already matches.
 */
export async function assertNoActiveGeneration(
  prisma: PrismaLike,
  input: {
    projectId: string;
    type: GenerationTaskType;
    match: (taskInput: Record<string, unknown>) => boolean;
    message?: string;
  },
) {
  const active = await prisma.generationTask.findMany({
    where: {
      projectId: input.projectId,
      type: input.type,
      status: {
        in: [GenerationTaskStatus.PENDING, GenerationTaskStatus.RUNNING],
      },
    },
    select: {
      id: true,
      input: true,
      status: true,
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const conflict = active.find((task) => {
    const payload =
      task.input && typeof task.input === "object" && !Array.isArray(task.input)
        ? (task.input as Record<string, unknown>)
        : {};
    return input.match(payload);
  });

  if (conflict) {
    throw new AppError(
      HttpStatus.CONFLICT,
      ErrorCodes.GENERATION_ALREADY_RUNNING,
      input.message || "同类生成任务正在进行中，请稍候再试。",
    );
  }
}
