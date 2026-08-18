<template>
  <section class="px-4 py-6 tablet:px-8 desktop:px-8">
    <p class="text-[11px] uppercase tracking-[0.2em] text-gold-400/80">Videos</p>
    <h1 class="mt-1 font-display text-3xl">视频资产</h1>
    <p class="mt-2 text-sm text-zinc-500">
      正式视频来自分镜镜头 Apply 后的 Asset。本页只浏览 Shot Video，不做剪辑。
      <NuxtLink :to="`/projects/${projectId}/timeline`" class="ml-1 text-gold-300">进入时间线</NuxtLink>
    </p>
    <p class="mt-2 text-xs text-zinc-500">
      视频生成将使用当前项目配置的 AI Provider，费用由该 Provider 账户承担。
    </p>
    <PageState
      :loading="loading"
      :error="error"
      :empty="!loading && !error && assets.length === 0"
      loading-text="正在载入视频…"
      empty-title="还没有视频资产"
      empty-action-label="前往分镜"
      :on-retry="load"
      :on-empty-action="() => navigateTo(`/projects/${projectId}/storyboard`)"
    >
      <div class="mt-6 grid gap-4 tablet:grid-cols-2 desktop:grid-cols-3">
        <article
          v-for="item in assets"
          :key="item.id"
          class="cursor-pointer overflow-hidden rounded-2xl border border-white/5 bg-ink-800/60"
          @click="selected = item"
        >
          <video
            v-if="src(item)"
            :src="src(item)"
            class="h-40 w-full object-cover"
            muted
            preload="metadata"
          />
          <div class="p-4 text-sm">
            <p class="text-zinc-100">{{ item.name }}</p>
            <p class="mt-1 text-xs text-zinc-500">
              Shot {{ shotLabel(item) }} · {{ item.provider || "—" }} · {{ item.model || "—" }}
            </p>
            <p class="mt-1 text-xs text-zinc-500">
              {{ item.status }} · {{ formatTime(item.createdAt) }}
            </p>
          </div>
        </article>
      </div>
    </PageState>

    <AppModal
      :open="Boolean(selected)"
      :title="selected?.name || '视频详情'"
      description="HTML5 播放器。复杂时间线编辑请使用 Web Timeline。"
      @close="selected = null"
    >
      <div v-if="selected" class="space-y-3 text-sm">
        <video
          v-if="src(selected)"
          :src="src(selected)"
          controls
          class="max-h-72 w-full rounded-xl bg-ink-950"
        />
        <p class="text-zinc-500">Episode / Scene / Shot：{{ shotLabel(selected) }}</p>
        <p class="text-zinc-500">Provider：{{ selected.provider || "—" }}</p>
        <p class="text-zinc-500">Model：{{ selected.model || "—" }}</p>
        <p class="text-zinc-500">Status：{{ selected.status }}</p>
        <p class="text-zinc-500">Created At：{{ formatTime(selected.createdAt) }}</p>
        <p class="text-zinc-500">
          {{ selected.width && selected.height ? `${selected.width} × ${selected.height}` : "—" }}
          · {{ selected.durationSeconds ? `${selected.durationSeconds}s` : "—" }}
        </p>
      </div>
    </AppModal>
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
const selected = ref<Asset | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);

function src(item: Asset) {
  return resolveAssetDisplayUrl(config.public.apiBase, item.url) ?? "";
}

function shotLabel(item: Asset) {
  const shotId = item.metadata?.shotId;
  return typeof shotId === "string" ? shotId : "—";
}

function formatTime(value: string) {
  return new Date(value).toLocaleString("zh-CN");
}

async function load() {
  loading.value = true;
  error.value = null;
  try {
    assets.value = await $api.getVideoAssets(projectId.value);
  } catch (err) {
    error.value = err instanceof Error ? err.message : "加载视频失败";
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void load();
});
</script>
