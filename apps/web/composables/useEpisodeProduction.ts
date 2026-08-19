import {
  getEpisodeProductionStageLabel,
  resolveEpisodeNextActionRoute,
} from "@ai-drama-studio/core";
import { EpisodeNextActionType } from "@ai-drama-studio/types";
import { computed } from "vue";
import { useRoute } from "#imports";
import { useCurrentProject } from "~/composables/useCurrentProject";

export type EpisodeProductionModule =
  | "plan"
  | "script"
  | "storyboard"
  | "assets"
  | "timeline"
  | "render"
  | "workspace";

export function episodeModulePath(
  projectId: string,
  episodeId: string,
  module: EpisodeProductionModule,
  seasonId?: string | null,
) {
  const base = seasonId
    ? `/projects/${projectId}/seasons/${seasonId}/episodes/${episodeId}`
    : `/projects/${projectId}/episodes/${episodeId}`;
  if (module === "workspace") {
    return base;
  }
  return `${base}/${module}`;
}

export function episodeActionPath(
  projectId: string,
  episodeId: string,
  type: EpisodeNextActionType,
  seasonId?: string | null,
) {
  return episodeModulePath(
    projectId,
    episodeId,
    resolveEpisodeNextActionRoute(type),
    seasonId,
  );
}

export function episodeStageLabel(stage: string) {
  return getEpisodeProductionStageLabel(stage as Parameters<typeof getEpisodeProductionStageLabel>[0]);
}

export function useEpisodeProductionPaths() {
  const route = useRoute();
  const { projectId } = useCurrentProject();
  const seasonId = computed(() => String(route.params.seasonId || ""));
  const episodeId = computed(() => String(route.params.episodeId || ""));

  function pathFor(module: EpisodeProductionModule, targetEpisodeId?: string) {
    const eid = targetEpisodeId || episodeId.value;
    const sid = seasonId.value || undefined;
    return episodeModulePath(projectId.value, eid, module, sid);
  }

  return {
    projectId,
    seasonId,
    episodeId,
    pathFor,
  };
}
