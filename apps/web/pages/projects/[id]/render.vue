<template>
  <section class="px-4 py-6 tablet:px-8 desktop:px-8">
    <p class="text-[11px] uppercase tracking-[0.2em] text-gold-400/80">Render</p>
    <h1 class="mt-1 font-display text-3xl">成片</h1>
    <p class="mt-2 text-sm text-zinc-500">
      这是最终 Episode MP4 Render。请先在时间线锁定后再导出。浏览器合成预览不是最终视频。
    </p>
    <PageState
      :loading="store.loading"
      :error="store.error"
      :empty="!store.loading && store.projectEpisodes.length === 0"
      empty-title="还没有剧集"
      empty-action-label="前往剧集"
      :on-retry="() => store.loadProjectEpisodes(projectId)"
      :on-empty-action="() => navigateTo(`/projects/${projectId}/episodes`)"
    >
      <div class="mt-6 grid gap-3 tablet:grid-cols-2 desktop:grid-cols-3">
        <NuxtLink
          v-for="item in store.projectEpisodes"
          :key="item.id"
          :to="`/projects/${projectId}/episodes/${item.id}/render`"
          class="rounded-2xl border border-white/5 bg-ink-800/60 p-4 hover:border-gold-400/30"
        >
          <p class="text-xs text-gold-300">E{{ String(item.number).padStart(2, "0") }}</p>
          <h3 class="mt-1 font-display text-xl">{{ item.title }}</h3>
          <p class="mt-2 text-sm text-zinc-500">打开最终 MP4 Render</p>
        </NuxtLink>
      </div>
    </PageState>
  </section>
</template>

<script setup lang="ts">
import { useCurrentProject } from "~/composables/useCurrentProject";
import { useStoryStore } from "~/stores/story";

const { projectId } = useCurrentProject();
const store = useStoryStore();

onMounted(() => {
  void store.loadProjectEpisodes(projectId.value);
});
</script>
