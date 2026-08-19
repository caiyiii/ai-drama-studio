<template>
  <section class="px-4 py-6 tablet:px-8 desktop:px-8">
    <div class="mb-6">
      <p class="text-[11px] uppercase tracking-[0.2em] text-gold-400/80">Episodes</p>
      <h1 class="mt-1 font-display text-3xl">剧集</h1>
      <p class="mt-2 text-sm text-zinc-500">按季查看全部剧集。拆集与大纲请进入对应季。</p>
    </div>
    <PageState
      :loading="store.loading"
      :error="store.error"
      :empty="!store.loading && store.projectEpisodes.length === 0"
      empty-title="还没有剧集"
      empty-description="先创建季，再用 AI 拆分剧集。"
      empty-action-label="前往季"
      :on-retry="() => store.loadProjectEpisodes(projectId)"
      :on-empty-action="() => navigateTo(`/projects/${projectId}/seasons`)"
    >
      <div class="space-y-6">
        <section v-for="season in store.seasons" :key="season.id">
          <div class="mb-3 flex items-center justify-between">
            <h2 class="font-display text-2xl">Season {{ season.number }} · {{ season.title }}</h2>
            <NuxtLink :to="`/projects/${projectId}/seasons/${season.id}`" class="text-sm text-gold-300">
              进入该季
            </NuxtLink>
          </div>
          <div class="grid gap-3 tablet:grid-cols-2 desktop:grid-cols-3">
            <NuxtLink
              v-for="item in episodesOf(season.id)"
              :key="item.id"
              :to="`/projects/${projectId}/episodes/${item.id}`"
              class="rounded-2xl border border-white/5 bg-ink-800/60 p-4 hover:border-gold-400/30"
            >
              <p class="text-xs text-gold-300">E{{ String(item.number).padStart(2, "0") }}</p>
              <h3 class="mt-1 font-display text-xl">{{ item.title }}</h3>
              <p class="mt-2 text-sm text-zinc-500">{{ item.synopsis || "尚未填写简介" }}</p>
            </NuxtLink>
          </div>
        </section>
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

function episodesOf(seasonId: string) {
  return store.projectEpisodes.filter((item) => item.seasonId === seasonId);
}
</script>
