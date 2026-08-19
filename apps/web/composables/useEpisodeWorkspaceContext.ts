import { useCurrentProject } from "~/composables/useCurrentProject";

export function useEpisodeWorkspaceContext() {
  const { $api } = useNuxtApp();
  const { projectId } = useCurrentProject();

  async function resolveSeasonId(episodeId: string) {
    const episodes = await $api.getProjectEpisodes(projectId.value);
    const episode = episodes.find((item) => item.id === episodeId);
    if (!episode) {
      throw new Error("未找到对应剧集");
    }
    return episode.seasonId;
  }

  function workspacePath(episodeId: string) {
    return `/projects/${projectId.value}/episodes/${episodeId}`;
  }

  return {
    projectId,
    resolveSeasonId,
    workspacePath,
  };
}
