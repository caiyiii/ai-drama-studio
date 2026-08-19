<template>
  <section class="px-4 py-6 tablet:px-8 desktop:px-8">
    <PageState
      :loading="loading"
      :error="error"
      loading-text="正在定位 Episode Workspace…"
      :on-retry="resolveWorkspace"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { navigateTo, useRoute } from "#imports";
import { useEpisodeWorkspaceContext } from "~/composables/useEpisodeWorkspaceContext";

const route = useRoute();
const { projectId, resolveSeasonId } = useEpisodeWorkspaceContext();
const episodeId = computed(() => String(route.params.episodeId || ""));
const loading = ref(false);
const error = ref<string | null>(null);

async function resolveWorkspace() {
  loading.value = true;
  error.value = null;
  try {
    const seasonId = await resolveSeasonId(episodeId.value);
    await navigateTo(
      `/projects/${projectId.value}/seasons/${seasonId}/episodes/${episodeId.value}`,
      { replace: true },
    );
  } catch (err) {
    error.value = err instanceof Error ? err.message : "定位 Episode Workspace 失败";
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void resolveWorkspace();
});
</script>
