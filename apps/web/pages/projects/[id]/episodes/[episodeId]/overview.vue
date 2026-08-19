<template>
  <section class="px-4 py-6 tablet:px-8 desktop:px-8">
    <PageState
      :loading="loading"
      :error="error"
      loading-text="正在返回本集工作台…"
      :on-retry="redirectToWorkspace"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { navigateTo, useRoute } from "#imports";
import { useEpisodeWorkspaceContext } from "~/composables/useEpisodeWorkspaceContext";

const route = useRoute();
const { workspacePath } = useEpisodeWorkspaceContext();
const episodeId = computed(() => String(route.params.episodeId || ""));
const loading = ref(false);
const error = ref<string | null>(null);

async function redirectToWorkspace() {
  loading.value = true;
  error.value = null;
  try {
    await navigateTo(workspacePath(episodeId.value), { replace: true });
  } catch (err) {
    error.value = err instanceof Error ? err.message : "返回本集工作台失败";
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void redirectToWorkspace();
});
</script>
