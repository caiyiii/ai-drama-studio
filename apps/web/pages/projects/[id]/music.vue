<template>
  <section class="px-4 py-6 tablet:px-8 desktop:px-8">
    <p class="text-[11px] uppercase tracking-[0.2em] text-gold-400/80">Music</p>
    <h1 class="mt-1 font-display text-3xl">剧集音乐</h1>
    <p class="mt-2 text-sm text-zinc-500">
      正式音乐来自剧集 Apply 后的 Audio Asset。重新生成会保留历史，不会覆盖。编排请进入时间线，本页不做混音。
      <NuxtLink :to="`/projects/${projectId}/timeline`" class="ml-1 text-gold-300">进入时间线</NuxtLink>
    </p>
    <p class="mt-2 text-xs text-zinc-500">费用由当前配置的 Provider 账户承担。</p>
    <PageState
      :loading="loading"
      :error="error"
      :empty="!loading && !error && items.length === 0"
      loading-text="正在载入音乐…"
      empty-title="还没有音乐资产"
      empty-action-label="前往剧集"
      :on-retry="load"
      :on-empty-action="() => navigateTo(`/projects/${projectId}/episodes`)"
    >
      <div class="mt-6 grid gap-4 tablet:grid-cols-2 desktop:grid-cols-3">
        <article
          v-for="item in items"
          :key="item.id"
          class="overflow-hidden rounded-2xl border border-white/5 bg-ink-800/60 p-4"
        >
          <p class="text-zinc-100">{{ item.asset?.name || "未命名音乐" }}</p>
          <p class="mt-1 text-xs text-zinc-500">
            v{{ item.asset?.version }} · {{ item.asset?.provider || "—" }} · {{ item.asset?.model || "—" }}
          </p>
          <p class="mt-1 text-xs text-zinc-500">
            {{ meta(item, "style") }} · {{ meta(item, "mood") }} ·
            {{ item.asset?.durationSeconds ? `${item.asset.durationSeconds}s` : "—" }}
          </p>
          <p class="mt-1 text-[11px] uppercase tracking-widest" :class="item.isPrimary ? 'text-emerald-300' : 'text-zinc-600'">
            {{ item.isPrimary ? "Primary / Final" : "History" }}
          </p>
          <audio v-if="src(item)" :src="src(item)" controls class="mt-3 w-full" />
          <p class="mt-2 text-xs text-zinc-600">{{ formatTime(item.createdAt) }}</p>
          <button
            v-if="!item.isPrimary"
            type="button"
            class="mt-3 rounded-xl border border-white/10 px-3 py-1 text-xs"
            @click="setPrimary(item)"
          >
            设为最终
          </button>
        </article>
      </div>
    </PageState>
  </section>
</template>

<script setup lang="ts">
import { resolveAssetDisplayUrl } from "@ai-drama-studio/core";
import type { EpisodeAudioAsset } from "@ai-drama-studio/types";
import { useCurrentProject } from "~/composables/useCurrentProject";

const { $api } = useNuxtApp();
const config = useRuntimeConfig();
const { projectId } = useCurrentProject();
const items = ref<EpisodeAudioAsset[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

function src(item: EpisodeAudioAsset) {
  return resolveAssetDisplayUrl(config.public.apiBase, item.asset?.url) ?? "";
}

function meta(item: EpisodeAudioAsset, key: string) {
  const value = item.asset?.metadata?.[key] ?? item.metadata?.[key];
  return typeof value === "string" && value ? value : "—";
}

function formatTime(value: string) {
  return new Date(value).toLocaleString("zh-CN");
}

async function load() {
  loading.value = true;
  error.value = null;
  try {
    items.value = await $api.getMusicAssets(projectId.value);
  } catch (err) {
    error.value = err instanceof Error ? err.message : "加载音乐失败";
  } finally {
    loading.value = false;
  }
}

async function setPrimary(item: EpisodeAudioAsset) {
  await $api.setPrimaryMusicAsset(projectId.value, item.episodeId, item.assetId);
  await load();
}

onMounted(() => {
  void load();
});
</script>
