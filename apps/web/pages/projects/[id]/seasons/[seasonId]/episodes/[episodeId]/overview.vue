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
import { onMounted, ref } from "vue";
import { navigateTo } from "#imports";
import { useEpisodeProductionPaths } from "~/composables/useEpisodeProduction";

const { pathFor } = useEpisodeProductionPaths();
const loading = ref(false);
const error = ref<string | null>(null);

async function redirectToWorkspace() {
  loading.value = true;
  error.value = null;
  try {
    await navigateTo(pathFor("workspace"), { replace: true });
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
