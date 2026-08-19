import type { LocationGenerationResult } from "@ai-drama-studio/types";
import type { Prisma } from "@prisma/client";

export async function applyLocationGenerationResult(
  tx: Prisma.TransactionClient,
  projectId: string,
  generationTaskId: string,
  result: LocationGenerationResult,
) {
  const existing = await tx.location.findFirst({
    where: {
      projectId,
      name: { equals: result.location.name, mode: "insensitive" },
    },
  });
  if (existing) {
    throw new Error(`场景名称已存在：${result.location.name}`);
  }
  const row = await tx.location.create({
    data: {
      projectId,
      name: result.location.name,
      description: result.location.description,
      environment: result.location.environment || null,
      atmosphere: result.location.atmosphere || null,
      visualStyle: result.location.visualStyle || null,
      tags: result.location.tags,
      metadata: { generationTaskId },
    },
  });
  await tx.generationTask.update({
    where: { id: generationTaskId },
    data: { appliedAt: new Date() },
  });
  return row;
}
