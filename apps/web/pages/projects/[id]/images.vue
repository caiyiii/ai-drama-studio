<template>
  <section class="px-4 py-6 tablet:px-8 desktop:px-8">
    <p class="text-[11px] uppercase tracking-[0.2em] text-gold-400/80">Images</p>
    <h1 class="mt-1 font-display text-3xl">图片资产</h1>
    <p class="mt-2 text-sm text-zinc-500">
      正式图片来自分镜镜头 Apply 后的 Asset。请在分镜工作台生成与确认。
      <NuxtLink :to="`/projects/${projectId}/timeline`" class="ml-1 text-gold-300">进入时间线</NuxtLink>
    </p>
    <p class="mt-2 text-xs text-zinc-500">
      图片生成将使用当前项目配置的 AI Provider，相关 API 使用费用由对应 Provider 账户承担。
    </p>
    <PageState
      :loading="loading"
      :error="error"
      :empty="!loading && !error && assets.length === 0"
      loading-text="正在载入图片…"
      empty-title="还没有图片资产"
      empty-action-label="前往分镜"
      :on-retry="load"
      :on-empty-action="() => navigateTo(`/projects/${projectId}/storyboard`)"
    >
      <div class="mt-6 grid gap-4 tablet:grid-cols-2 desktop:grid-cols-3">
        <article
          v-for="item in assets"
          :key="item.id"
          class="overflow-hidden rounded-2xl border border-white/5 bg-ink-800/60"
        >
          <img
            v-if="src(item)"
            :src="src(item)"
            :alt="item.name"
            class="h-40 w-full object-cover"
          />
          <div class="p-4 text-sm">
            <p class="text-zinc-100">{{ item.name }}</p>
            <p class="mt-1 text-xs text-zinc-500">
              v{{ item.version }} · {{ item.provider || "—" }} · {{ item.model || "—" }}
            </p>
          </div>
        </article>
      </div>
    </PageState>
  </section>
</template>

<script setup lang="ts">
import { AssetType, type Asset } from "@ai-drama-studio/types";
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

async function load() {
  loading.value = true;
  error.value = null;
  try {
    assets.value = await $api.listAssets(projectId.value, AssetType.IMAGE);
  } catch (err) {
    error.value = err instanceof Error ? err.message : "加载图片失败";
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void load();
});
</script>
