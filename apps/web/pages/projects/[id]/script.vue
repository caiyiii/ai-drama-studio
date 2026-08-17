<template>
  <section class="px-4 py-6 tablet:px-8 desktop:px-8">
    <div class="mb-6">
      <p class="text-[11px] uppercase tracking-[0.2em] text-gold-400/80">Script</p>
      <h1 class="mt-1 font-display text-3xl">剧本</h1>
      <p class="mt-2 text-sm text-zinc-500">选择一集进入 Script Engine。剧本与剧集大纲分开保存。</p>
    </div>
    <PageState
      :loading="story.loading"
      :error="story.error"
      :empty="!story.loading && story.projectEpisodes.length === 0"
      empty-title="还没有剧集"
      empty-description="先完成季与剧集大纲，再进入剧本。"
      empty-action-label="前往季"
      :on-retry="() => story.loadProjectEpisodes(projectId)"
      :on-empty-action="() => navigateTo(`/projects/${projectId}/seasons`)"
    >
      <div class="space-y-6">
        <section v-for="season in story.seasons" :key="season.id">
          <h2 class="font-display text-2xl">Season {{ season.number }} · {{ season.title }}</h2>
          <div class="mt-3 grid gap-3 tablet:grid-cols-2 desktop:grid-cols-3">
            <NuxtLink
              v-for="item in episodesOf(season.id)"
              :key="item.id"
              :to="`/projects/${projectId}/episodes/${item.id}/script`"
              class="rounded-2xl border border-white/5 bg-ink-800/60 p-4 hover:border-gold-400/30"
            >
              <p class="text-xs text-gold-300">E{{ String(item.number).padStart(2, "0") }}</p>
              <h3 class="mt-1 font-display text-xl">{{ item.title }}</h3>
              <p class="mt-2 text-sm text-zinc-500">{{ item.synopsis || "进入剧本工作台" }}</p>
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
const story = useStoryStore();

onMounted(() => {
  void story.loadProjectEpisodes(projectId.value);
});

function episodesOf(seasonId: string) {
  return story.projectEpisodes.filter((item) => item.seasonId === seasonId);
}
</script>
