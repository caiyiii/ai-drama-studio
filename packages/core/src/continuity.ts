import type { ContinuityCheckResult } from "@ai-drama-studio/types";

export function episodeBelongsToSeason(
  episode: { seasonId: string },
  seasonId: string,
): boolean {
  return episode.seasonId === seasonId;
}

export function seasonBelongsToProject(
  season: { projectId: string },
  projectId: string,
): boolean {
  return season.projectId === projectId;
}

export function episodeBelongsToProject(
  episode: { projectId: string },
  projectId: string,
): boolean {
  return episode.projectId === projectId;
}

export function characterBelongsToProject(
  character: { projectId: string },
  projectId: string,
): boolean {
  return character.projectId === projectId;
}

export function worldBelongsToProject(
  world: { projectId: string },
  projectId: string,
): boolean {
  return world.projectId === projectId;
}

export function continuityResult(
  errors: string[] = [],
  warnings: string[] = [],
): ContinuityCheckResult {
  return {
    ok: errors.length === 0,
    errors,
    warnings,
  };
}
