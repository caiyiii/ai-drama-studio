import { Prisma } from "@prisma/client";
import { notesFromList } from "@ai-drama-studio/core";
import type {
  EpisodeGenerationResult,
  SeasonGenerationResult,
  StoryBibleGenerationResult,
} from "@ai-drama-studio/types";
import { HttpStatus } from "@nestjs/common";
import { AppError, ErrorCodes } from "../../../common/app-error";

export async function applyStoryBibleGeneration(
  tx: Prisma.TransactionClient,
  projectId: string,
  taskId: string,
  result: StoryBibleGenerationResult,
) {
  const data = {
    title: result.title.trim(),
    logline: result.logline,
    premise: result.premise,
    theme: result.theme,
    tone: result.tone,
    style: result.style,
    audience: result.audience,
    storyPromise: result.storyPromise,
    rules: result.rules as unknown as Prisma.InputJsonValue,
    timelineSummary: result.timelineSummary,
    continuityNotes: notesFromList(result.continuityNotes),
  };
  const existing = await tx.storyBible.findUnique({ where: { projectId } });
  if (existing) {
    await tx.storyBible.update({ where: { projectId }, data });
  } else {
    await tx.storyBible.create({ data: { projectId, ...data } });
  }
  await tx.generationTask.update({
    where: { id: taskId },
    data: { appliedAt: new Date() },
  });
}

export async function applySeasonOutlineGeneration(
  tx: Prisma.TransactionClient,
  projectId: string,
  seasonId: string,
  taskId: string,
  result: SeasonGenerationResult,
  durationSeconds: number,
) {
  const season = await tx.season.findFirst({
    where: { id: seasonId, projectId },
  });
  if (!season) {
    throw new AppError(
      HttpStatus.NOT_FOUND,
      ErrorCodes.SEASON_NOT_FOUND,
      "季不存在",
    );
  }
  const existing = await tx.episode.findMany({ where: { seasonId } });
  const existingNumbers = new Set(existing.map((item) => item.number));
  const incomingNumbers = result.episodes.map((item) => item.number);
  if (new Set(incomingNumbers).size !== incomingNumbers.length) {
    throw new AppError(
      HttpStatus.CONFLICT,
      ErrorCodes.EPISODE_NUMBER_CONFLICT,
      "生成结果中存在重复集数",
    );
  }
  for (const episode of result.episodes) {
    if (existingNumbers.has(episode.number)) {
      throw new AppError(
        HttpStatus.CONFLICT,
        ErrorCodes.EPISODE_NUMBER_CONFLICT,
        `该季已经存在第 ${episode.number} 集`,
      );
    }
  }
  for (const episode of result.episodes) {
    await tx.episode.create({
      data: {
        projectId,
        seasonId,
        number: episode.number,
        order: episode.number,
        title: episode.title,
        synopsis: episode.synopsis,
        outline: episode.outline,
        status: "OUTLINED",
        durationSeconds,
        storyState: episode.storyStateChanges as unknown as Prisma.InputJsonValue,
        metadata: {
          keyCharacters: episode.keyCharacters,
          keyLocations: episode.keyLocations,
          conflict: episode.conflict,
          cliffhanger: episode.cliffhanger,
        },
      },
    });
  }
  await tx.generationTask.update({
    where: { id: taskId },
    data: { appliedAt: new Date() },
  });
}

export async function applyEpisodeOutlineGeneration(
  tx: Prisma.TransactionClient,
  projectId: string,
  episodeId: string,
  taskId: string,
  result: EpisodeGenerationResult,
) {
  const episode = await tx.episode.findFirst({
    where: { id: episodeId, projectId },
  });
  if (!episode) {
    throw new AppError(
      HttpStatus.NOT_FOUND,
      ErrorCodes.EPISODE_NOT_FOUND,
      "剧集不存在",
    );
  }
  await tx.episode.update({
    where: { id: episodeId },
    data: {
      title: result.title,
      synopsis: result.synopsis,
      outline: result.outline,
      status: "OUTLINED",
      storyState: result.storyState as unknown as Prisma.InputJsonValue,
      continuityNotes: result.cliffhanger,
      metadata: {
        opening: result.opening,
        middle: result.middle,
        ending: result.ending,
        cliffhanger: result.cliffhanger,
        keyCharacters: result.keyCharacters,
        keyLocations: result.keyLocations,
        conflict: result.conflict,
      },
    },
  });
  await tx.generationTask.update({
    where: { id: taskId },
    data: { appliedAt: new Date() },
  });
}
