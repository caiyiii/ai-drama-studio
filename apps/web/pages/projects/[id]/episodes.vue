<template>
  <section class="px-4 py-6 tablet:px-8 desktop:px-8">
    <div class="mb-6">
      <p class="text-[11px] uppercase tracking-[0.2em] text-gold-400/80">Episode Production Entry</p>
      <h1 class="mt-1 font-display text-3xl">剧集工作台</h1>
      <p class="mt-2 text-sm text-zinc-500">
        选择一集进入制作。剧本、分镜、时间线和成片都属于某一集，而不是项目级平行入口。
      </p>
    </div>
    <PageState
      :loading="store.loading"
      :error="store.error"
      :empty="!store.loading && store.projectEpisodes.length === 0"
      empty-title="还没有剧集"
      empty-description="先创建季，再用 AI 拆分剧集。"
      empty-action-label="前往季规划"
      :on-retry="reload"
      :on-empty-action="() => navigateTo(`/projects/${projectId}/seasons`)"
    >
      <div class="space-y-6">
        <section
          v-if="recent"
          class="rounded-3xl border border-gold-400/20 bg-gold-400/5 p-5"
        >
          <p class="text-[11px] uppercase tracking-[0.2em] text-gold-400/80">最近制作</p>
          <h2 class="mt-1 font-display text-2xl">
            E{{ String(recent.episode.number).padStart(2, "0") }} · {{ recent.episode.title }}
          </h2>
          <p class="mt-2 text-sm text-zinc-400">
            当前阶段：{{ stageLabel(recent.productionStage) }}
          </p>
          <NuxtLink
            :to="recentPath"
            class="mt-4 inline-flex rounded-xl bg-gold-400 px-4 py-2 text-sm font-medium text-ink-950"
          >
            继续制作
          </NuxtLink>
        </section>

        <section v-for="season in store.seasons" :key="season.id">
          <div class="mb-3 flex items-center justify-between">
            <h2 class="font-display text-2xl">Season {{ season.number }} · {{ season.title }}</h2>
            <NuxtLink :to="`/projects/${projectId}/seasons/${season.id}`" class="text-sm text-gold-300">
              季规划
            </NuxtLink>
          </div>
          <div class="grid gap-3 tablet:grid-cols-2 desktop:grid-cols-3">
            <article
              v-for="item in episodesOf(season.id)"
              :key="item.id"
              class="rounded-2xl border border-white/5 bg-ink-800/60 p-4"
            >
              <p class="text-xs text-gold-300">E{{ String(item.number).padStart(2, "0") }}</p>
              <h3 class="mt-1 font-display text-xl">{{ item.title }}</h3>
              <p class="mt-2 text-sm text-zinc-400">
                状态：{{ stageLabel(overviews[item.id]?.productionStage) }}
              </p>
              <p class="mt-1 text-xs text-zinc-500">
                {{ overviews[item.id]?.nextAction.label || item.synopsis || "进入本集制作" }}
              </p>
              <NuxtLink
                :to="`/projects/${projectId}/seasons/${season.id}/episodes/${item.id}`"
                class="mt-4 inline-flex rounded-xl bg-gold-400 px-3 py-1.5 text-sm font-medium text-ink-950"
              >
                进入制作
              </NuxtLink>
            </article>
          </div>
        </section>
      </div>
    </PageState>
  </section>
</template>

<script setup lang="ts">
import { getEpisodeProductionStageLabel } from "@ai-drama-studio/core";
import { type EpisodeOverview, type EpisodeProductionStage } from "@ai-drama-studio/types";
import { useCurrentProject } from "~/composables/useCurrentProject";
import { useStoryStore } from "~/stores/story";

const { projectId } = useCurrentProject();
const store = useStoryStore();
const { $api } = useNuxtApp();
const overviews = ref<Record<string, EpisodeOverview>>({});

const recentId = ref("");
const recent = computed(() => (recentId.value ? overviews.value[recentId.value] ?? null : null));
const recentPath = computed(() => {
  if (!recent.value) {
    return `/projects/${projectId.value}/episodes`;
  }
  return `/projects/${projectId.value}/seasons/${recent.value.episode.seasonId}/episodes/${recent.value.episode.id}`;
});

onMounted(() => {
  void reload();
});

async function reload() {
  await store.loadProjectEpisodes(projectId.value);
  if (typeof window !== "undefined") {
    recentId.value = window.sessionStorage.getItem(`ads:last-episode:${projectId.value}`) || "";
  }
  const entries = await Promise.all(
    store.projectEpisodes.map(async (item) => {
      const overview = await $api.getEpisodeProductionOverview(projectId.value, item.id).catch(() => null);
      return [item.id, overview] as const;
    }),
  );
  overviews.value = Object.fromEntries(
    entries.filter((item): item is [string, EpisodeOverview] => item[1] !== null),
  );
}

function episodesOf(seasonId: string) {
  return store.projectEpisodes.filter((item) => item.seasonId === seasonId);
}

function stageLabel(stage?: EpisodeProductionStage) {
  return stage ? getEpisodeProductionStageLabel(stage) : "待进入制作";
}
</script>
