import { Prisma } from "@prisma/client";
import type { StoryboardGenerationResult } from "@ai-drama-studio/types";
import { HttpStatus } from "@nestjs/common";
import { AppError, ErrorCodes } from "../../../common/app-error";

export async function applyStoryboardGeneration(
  tx: Prisma.TransactionClient,
  projectId: string,
  episodeId: string,
  taskId: string,
  result: StoryboardGenerationResult,
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
  if (task.type !== "STORYBOARD") {
    throw new AppError(
      HttpStatus.BAD_REQUEST,
      ErrorCodes.GENERATION_NOT_SUCCEEDED,
      "只能应用分镜生成结果",
    );
  }
  if (task.status !== "SUCCEEDED") {
    throw new AppError(
      HttpStatus.BAD_REQUEST,
      ErrorCodes.GENERATION_NOT_SUCCEEDED,
      "只能应用已成功的生成结果",
    );
  }

  const script = await tx.script.findUnique({
    where: { episodeId },
    include: {
      scenes: {
        include: { blocks: true },
        orderBy: { number: "asc" },
      },
    },
  });
  if (!script || script.projectId !== projectId) {
    throw new AppError(
      HttpStatus.BAD_REQUEST,
      ErrorCodes.SCRIPT_REQUIRED_FOR_STORYBOARD,
      "生成分镜前必须先有剧本",
    );
  }

  const scenesByNumber = new Map(script.scenes.map((item) => [item.number, item]));
  const blocksById = new Map(
    script.scenes.flatMap((scene) => scene.blocks.map((block) => [block.id, block])),
  );
  const characters = await tx.character.findMany({
    where: { projectId },
    select: { id: true, projectId: true },
  });
  const characterIds = new Set(characters.map((item) => item.id));

  for (const shot of result.shots) {
    const scene = scenesByNumber.get(shot.sceneNumber);
    if (!scene) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.STORYBOARD_INVALID_SCENE,
        `场景 ${shot.sceneNumber} 不属于当前剧本`,
      );
    }
    for (const blockId of shot.scriptBlockIds) {
      const block = blocksById.get(blockId);
      if (!block || block.sceneId !== scene.id) {
        throw new AppError(
          HttpStatus.BAD_REQUEST,
          ErrorCodes.STORYBOARD_INVALID_SCRIPT_BLOCK,
          "剧本段落不属于当前场景",
        );
      }
    }
    for (const characterId of shot.characterIds) {
      if (!characterIds.has(characterId)) {
        throw new AppError(
          HttpStatus.BAD_REQUEST,
          ErrorCodes.STORYBOARD_INVALID_CHARACTER,
          "人物不属于当前项目",
        );
      }
    }
  }

  const existing = await tx.storyboard.findUnique({ where: { episodeId } });
  if (existing?.status === "LOCKED") {
    throw new AppError(
      HttpStatus.CONFLICT,
      ErrorCodes.STORYBOARD_LOCKED,
      "分镜已锁定，无法应用新的生成结果",
    );
  }

  const totalDurationSeconds =
    result.storyboard.totalDurationSeconds ||
    result.shots.reduce((sum, item) => sum + item.durationSeconds, 0);

  const boardData = {
    title: result.storyboard.title,
    description: result.storyboard.description || null,
    totalDurationSeconds,
    status: "READY" as const,
    sourceScriptVersion: script.version,
  };

  const storyboard = existing
    ? await tx.storyboard.update({
        where: { episodeId },
        data: {
          ...boardData,
          version: existing.version + 1,
        },
      })
    : await tx.storyboard.create({
        data: {
          projectId,
          episodeId,
          ...boardData,
          version: 1,
        },
      });

  await tx.storyboardShot.deleteMany({ where: { storyboardId: storyboard.id } });

  for (const shot of result.shots) {
    const scene = scenesByNumber.get(shot.sceneNumber);
    if (!scene) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.STORYBOARD_INVALID_SCENE,
        `场景 ${shot.sceneNumber} 不属于当前剧本`,
      );
    }
    await tx.storyboardShot.create({
      data: {
        storyboardId: storyboard.id,
        sceneId: scene.id,
        scriptBlockId: shot.scriptBlockIds[0] ?? null,
        shotNumber: shot.shotNumber,
        shotType: shot.shotType,
        shotSize: shot.shotSize,
        cameraMovement: shot.cameraMovement,
        cameraAngle: shot.cameraAngle,
        composition: shot.composition || null,
        visualDescription: shot.visualDescription,
        characterIds: shot.characterIds as Prisma.InputJsonValue,
        location: shot.location || null,
        action: shot.action || null,
        dialogue: shot.dialogue || null,
        narration: shot.narration || null,
        direction: shot.direction || null,
        durationSeconds: shot.durationSeconds,
        transition: shot.transition,
        lighting: shot.lighting || null,
        mood: shot.mood || null,
        visualStyle: shot.visualStyle || null,
        imagePrompt: shot.imagePrompt || null,
        videoPrompt: shot.videoPrompt || null,
        negativePrompt: shot.negativePrompt || null,
        continuityNotes: shot.continuityNotes || null,
        metadata: {
          sourceScriptBlockIds: shot.scriptBlockIds,
        } as Prisma.InputJsonValue,
      },
    });
  }

  await tx.generationTask.update({
    where: { id: taskId },
    data: { appliedAt: new Date() },
  });
}
