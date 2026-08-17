import { Prisma } from "@prisma/client";
import { matchCharacterByName } from "@ai-drama-studio/core";
import type { ScriptGenerationResult } from "@ai-drama-studio/types";
import { HttpStatus } from "@nestjs/common";
import { AppError, ErrorCodes } from "../../../common/app-error";

export async function applyScriptGeneration(
  tx: Prisma.TransactionClient,
  projectId: string,
  episodeId: string,
  taskId: string,
  result: ScriptGenerationResult,
) {
  const episode = await tx.episode.findFirst({
    where: { id: episodeId, projectId },
  });
  if (!episode) {
    throw new AppError(
      HttpStatus.BAD_REQUEST,
      ErrorCodes.PROJECT_EPISODE_MISMATCH,
      "剧集不属于当前项目",
    );
  }
  const task = await tx.generationTask.findFirst({
    where: { id: taskId, projectId },
  });
  if (!task) {
    throw new AppError(
      HttpStatus.NOT_FOUND,
      ErrorCodes.GENERATION_NOT_FOUND,
      "生成任务不存在",
    );
  }
  if (task.type !== "SCRIPT") {
    throw new AppError(
      HttpStatus.BAD_REQUEST,
      ErrorCodes.GENERATION_NOT_SUCCEEDED,
      "只能应用剧本生成结果",
    );
  }
  if (task.status !== "SUCCEEDED") {
    throw new AppError(
      HttpStatus.BAD_REQUEST,
      ErrorCodes.GENERATION_NOT_SUCCEEDED,
      "只能应用已成功的生成结果",
    );
  }
  const characters = await tx.character.findMany({
    where: { projectId },
    select: { id: true, name: true, alias: true, projectId: true },
  });
  const warnings: string[] = [];
  const existing = await tx.script.findUnique({ where: { episodeId } });
  const scriptData = {
    title: result.script.title,
    logline: result.script.logline,
    summary: result.script.summary,
    estimatedDurationSeconds: result.script.estimatedDurationSeconds || null,
    status: "READY" as const,
  };
  const script = existing
    ? await tx.script.update({
        where: { episodeId },
        data: {
          ...scriptData,
          version: existing.version + 1,
        },
      })
    : await tx.script.create({
        data: {
          projectId,
          episodeId,
          ...scriptData,
          version: 1,
        },
      });
  await tx.scene.deleteMany({ where: { scriptId: script.id } });
  for (const scene of result.scenes) {
    const createdScene = await tx.scene.create({
      data: {
        scriptId: script.id,
        number: scene.number,
        title: scene.title,
        location: scene.location || null,
        timeOfDay: scene.timeOfDay || null,
        summary: scene.summary || null,
        purpose: scene.purpose || null,
        conflict: scene.conflict || null,
        estimatedDurationSeconds: scene.estimatedDurationSeconds || null,
      },
    });
    for (const block of scene.blocks) {
      const matched = block.characterName
        ? matchCharacterByName(block.characterName, characters, projectId)
        : null;
      if (block.characterName && !matched) {
        warnings.push(`未匹配人物：${block.characterName}`);
      }
      const metadata: Record<string, unknown> = {
        ...block.metadata,
      };
      if (block.characterName) {
        metadata.characterName = block.characterName;
      }
      if (block.type === "DIALOGUE" && block.characterName && !matched) {
        metadata.unresolvedCharacter = true;
      }
      await tx.scriptBlock.create({
        data: {
          sceneId: createdScene.id,
          order: block.order,
          type: block.type,
          content: block.content,
          characterId: matched?.id ?? null,
          metadata: metadata as Prisma.InputJsonValue,
        },
      });
    }
  }
  if (warnings.length > 0) {
    await tx.script.update({
      where: { id: script.id },
      data: {
        metadata: { unresolvedCharacters: warnings } as Prisma.InputJsonValue,
      },
    });
  }
  await tx.episode.update({
    where: { id: episodeId },
    data: {
      status:
        episode.status === "COMPLETED" || episode.status === "ARCHIVED"
          ? episode.status
          : "SCRIPTING",
      durationSeconds: episode.durationSeconds ?? result.script.estimatedDurationSeconds ?? null,
    },
  });
  await tx.generationTask.update({
    where: { id: taskId },
    data: { appliedAt: new Date() },
  });
}
