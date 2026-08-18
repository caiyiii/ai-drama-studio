<template>
  <section class="px-4 py-6 tablet:px-8 desktop:px-8">
    <p class="text-[11px] uppercase tracking-[0.2em] text-gold-400/80">Voices</p>
    <h1 class="mt-1 font-display text-3xl">配音资产</h1>
    <p class="mt-2 text-sm text-zinc-500">
      正式语音来自剧本对白 Apply 后的 Audio Asset。本页只浏览独立 Dialogue Audio，不做混音或拼接。
    </p>
    <p class="mt-2 text-xs text-zinc-500">
      语音生成费用由当前项目配置的 Provider 账户承担。
    </p>
    <PageState
      :loading="loading"
      :error="error"
      :empty="!loading && !error && assets.length === 0"
      loading-text="正在载入语音…"
      empty-title="还没有语音资产"
      empty-action-label="前往剧本"
      :on-retry="load"
      :on-empty-action="() => navigateTo(`/projects/${projectId}/script`)"
    >
      <div class="mt-6 grid gap-4 tablet:grid-cols-2 desktop:grid-cols-3">
        <article
          v-for="item in assets"
          :key="item.id"
          class="overflow-hidden rounded-2xl border border-white/5 bg-ink-800/60 p-4"
        >
          <p class="text-zinc-100">{{ item.name }}</p>
          <p class="mt-1 text-xs text-zinc-500">
            v{{ item.version }} · {{ item.provider || "—" }} · {{ item.model || "—" }}
          </p>
          <p class="mt-1 text-xs text-zinc-500">
            Voice {{ voiceLabel(item) }} · {{ item.durationSeconds ? `${item.durationSeconds}s` : "—" }}
          </p>
          <audio v-if="src(item)" :src="src(item)" controls class="mt-3 w-full" />
          <p class="mt-2 text-xs text-zinc-600">{{ formatTime(item.createdAt) }}</p>
        </article>
      </div>
    </PageState>
  </section>
</template>

<script setup lang="ts">
import { type Asset } from "@ai-drama-studio/types";
import { resolveAssetDisplayUrl } from "@ai-drama-studio/core";
import { useCurrentProject } from "~/composables/useCurrentProject";

const { $api } = useNuxtApp();
const config = useRuntimeConfig();
const { projectId } = useCurrentProject();
const assets = ref<Asset[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

function src(item: Asset) {
  return resolveAssetDisplayUrl(config.public.apiBase, item.url) ?? "";
}

function voiceLabel(item: Asset) {
  const voiceId = item.metadata?.voiceId;
  return typeof voiceId === "string" ? voiceId : "—";
}

function formatTime(value: string) {
  return new Date(value).toLocaleString("zh-CN");
}

async function load() {
  loading.value = true;
  error.value = null;
  try {
    assets.value = await $api.getAudioAssets(projectId.value);
  } catch (err) {
    error.value = err instanceof Error ? err.message : "加载语音失败";
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void load();
});
</script>
