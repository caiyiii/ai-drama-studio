import { episodeModulePath, type EpisodeProductionModule } from "~/composables/useEpisodeProduction";
import { useEpisodeWorkspaceContext } from "~/composables/useEpisodeWorkspaceContext";

export function useEpisodeCanonicalRedirect(module: EpisodeProductionModule) {
  const route = useRoute();
  const { projectId, resolveSeasonId } = useEpisodeWorkspaceContext();
  const episodeId = computed(() => String(route.params.episodeId || ""));
  const seasonId = computed(() => String(route.params.seasonId || ""));
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function redirectIfNeeded() {
    if (seasonId.value) {
      return;
    }
    loading.value = true;
    error.value = null;
    try {
      const resolvedSeasonId = await resolveSeasonId(episodeId.value);
      await navigateTo(
        episodeModulePath(projectId.value, episodeId.value, module, resolvedSeasonId),
        { replace: true },
      );
    } catch (err) {
      error.value = err instanceof Error ? err.message : "定位剧集路由失败";
    } finally {
      loading.value = false;
    }
  }

  onMounted(() => {
    void redirectIfNeeded();
  });

  return {
    loading,
    error,
    redirectIfNeeded,
    isCanonical: computed(() => Boolean(seasonId.value)),
  };
}
