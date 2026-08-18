<template>
  <section class="px-4 py-6 tablet:px-8 desktop:px-8">
    <p class="text-[11px] uppercase tracking-[0.2em] text-gold-400/80">SFX</p>
    <h1 class="mt-1 font-display text-3xl">剧集音效</h1>
    <p class="mt-2 text-sm text-zinc-500">
      正式音效挂在剧集上。重新生成会创建新 Asset，不会覆盖历史。本页不做时间线或混音。
    </p>
    <p class="mt-2 text-xs text-zinc-500">费用由当前配置的 Provider 账户承担。</p>
    <PageState
      :loading="loading"
      :error="error"
      :empty="!loading && !error && items.length === 0"
      loading-text="正在载入音效…"
      empty-title="还没有音效资产"
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
          <p class="text-zinc-100">{{ item.asset?.name || "未命名音效" }}</p>
          <p class="mt-1 text-xs text-zinc-500">
            {{ meta(item, "category") }} · {{ item.asset?.durationSeconds ? `${item.asset.durationSeconds}s` : "—" }}
          </p>
          <p class="mt-1 text-xs text-zinc-500">
            v{{ item.asset?.version }} · {{ item.asset?.provider || "—" }} · {{ item.asset?.model || "—" }}
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
    items.value = await $api.getSfxAssets(projectId.value);
  } catch (err) {
    error.value = err instanceof Error ? err.message : "加载音效失败";
  } finally {
    loading.value = false;
  }
}

async function setPrimary(item: EpisodeAudioAsset) {
  await $api.setPrimarySfxAsset(projectId.value, item.episodeId, item.assetId);
  await load();
}

onMounted(() => {
  void load();
});
</script>
