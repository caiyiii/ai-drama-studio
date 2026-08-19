import {
  getEpisodeProductionStageLabel,
  resolveEpisodeNextActionRoute,
} from "@ai-drama-studio/core";
import { EpisodeNextActionType } from "@ai-drama-studio/types";

export function episodeModulePath(
  projectId: string,
  episodeId: string,
  module:
    | "plan"
    | "script"
    | "storyboard"
    | "assets"
    | "timeline"
    | "render"
    | "workspace",
) {
  if (module === "workspace") {
    return `/projects/${projectId}/episodes/${episodeId}`;
  }
  return `/projects/${projectId}/episodes/${episodeId}/${module}`;
}

export function episodeActionPath(
  projectId: string,
  episodeId: string,
  type: EpisodeNextActionType,
) {
  return episodeModulePath(projectId, episodeId, resolveEpisodeNextActionRoute(type));
}

export function episodeStageLabel(stage: string) {
  return getEpisodeProductionStageLabel(stage as Parameters<typeof getEpisodeProductionStageLabel>[0]);
}
