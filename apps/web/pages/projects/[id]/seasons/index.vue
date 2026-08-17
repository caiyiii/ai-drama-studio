<template>
  <section class="px-4 py-6 tablet:px-8 desktop:px-8">
    <div class="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div>
        <p class="text-[11px] uppercase tracking-[0.2em] text-gold-400/80">Seasons</p>
        <h1 class="mt-1 font-display text-3xl">季</h1>
      </div>
      <button type="button" class="rounded-xl bg-gold-400 px-3 py-1.5 text-sm font-medium text-ink-950" @click="showCreate = true">
        创建季
      </button>
    </div>

    <PageState
      :loading="store.loading"
      :error="store.error"
      :empty="!store.loading && store.seasons.length === 0"
      empty-title="还没有季"
      empty-description="先创建 Season 1，再拆分剧集。"
      empty-action-label="创建第一季"
      :on-retry="() => store.loadSeasons(projectId)"
      :on-empty-action="() => (showCreate = true)"
    >
      <p v-if="store.actionError" class="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
        {{ store.actionError }}
      </p>
      <div class="grid gap-4 tablet:grid-cols-2 desktop:grid-cols-3">
        <NuxtLink
          v-for="item in store.seasons"
          :key="item.id"
          :to="`/projects/${projectId}/seasons/${item.id}`"
          class="rounded-2xl border border-white/5 bg-ink-800/60 p-4 hover:border-gold-400/30"
        >
          <p class="text-xs text-gold-300">Season {{ item.number }}</p>
          <h2 class="mt-1 font-display text-2xl">{{ item.title }}</h2>
          <p class="mt-2 text-sm text-zinc-500">{{ item.synopsis || "尚未填写简介" }}</p>
          <p class="mt-3 text-xs text-zinc-500">{{ item.episodeCount ?? 0 }} 集 · {{ statusLabel(item.status) }}</p>
        </NuxtLink>
      </div>
    </PageState>

    <AppModal :open="showCreate" title="新建季" description="创建一季后，再拆分剧集。" @close="showCreate = false">
      <form class="space-y-3" @submit.prevent="onCreate">
        <input v-model.number="createForm.number" type="number" min="1" required class="studio-field" placeholder="季数" />
        <input v-model="createForm.title" required class="studio-field" placeholder="标题，例如：星河初遇" />
        <textarea v-model="createForm.synopsis" rows="3" class="studio-field resize-none" placeholder="简介" />
        <button type="submit" :disabled="store.saving" class="rounded-xl bg-gold-400 px-4 py-2 text-sm font-medium text-ink-950">
          创建
        </button>
      </form>
    </AppModal>
  </section>
</template>

<script setup lang="ts">
import { getSeasonStatusLabel } from "@ai-drama-studio/core";
import type { SeasonStatus } from "@ai-drama-studio/types";
import { useCurrentProject } from "~/composables/useCurrentProject";
import { useStoryStore } from "~/stores/story";

const { projectId } = useCurrentProject();
const store = useStoryStore();
const showCreate = ref(false);
const createForm = reactive({ number: 1, title: "", synopsis: "" });

onMounted(() => {
  void store.loadSeasons(projectId.value);
});

function statusLabel(status: SeasonStatus) {
  return getSeasonStatusLabel(status);
}

async function onCreate() {
  const created = await store.createSeason(projectId.value, {
    number: createForm.number,
    title: createForm.title.trim(),
    synopsis: createForm.synopsis,
  });
  if (created) {
    showCreate.value = false;
    createForm.title = "";
    createForm.synopsis = "";
  }
}
</script>
