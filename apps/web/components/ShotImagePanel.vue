<template>
  <section class="space-y-3 border-t border-white/5 pt-3">
    <p class="text-xs uppercase tracking-[0.16em] text-gold-400/80">图片</p>
    <p class="text-[11px] text-zinc-500">
      图片生成将使用当前项目配置的 AI Provider，相关 API 使用费用由对应 Provider 账户承担。
    </p>

    <div
      class="overflow-hidden rounded-xl border border-white/10 bg-ink-950/50"
    >
      <img
        v-if="primarySrc"
        :src="primarySrc"
        alt="镜头图片"
        class="max-h-48 w-full cursor-pointer object-cover"
        @click="galleryOpen = true"
      />
      <div v-else class="flex h-28 items-center justify-center text-xs text-zinc-500">
        {{ statusLabel }}
      </div>
    </div>

    <p class="text-xs text-zinc-500">状态：{{ statusLabel }}</p>

    <div v-if="previewTask?.status === 'SUCCEEDED' && previewImages.length" class="space-y-2">
      <p class="text-xs text-zinc-400">Preview</p>
      <div class="grid grid-cols-2 gap-2">
        <img
          v-for="(image, index) in previewImages"
          :key="index"
          :src="previewSrc(image)"
          alt="候选图"
          class="h-20 w-full rounded-lg object-cover"
        />
      </div>
      <p class="text-[11px] text-zinc-500">Provider：{{ previewTask.provider || "—" }}</p>
      <p class="text-[11px] text-zinc-500">Model：{{ previewTask.model || "—" }}</p>
      <p class="text-[11px] text-zinc-500">Size：{{ sizeLabel }}</p>
      <p class="line-clamp-3 text-[11px] text-zinc-500">Prompt：{{ promptLabel }}</p>
      <p v-if="negativeLabel" class="line-clamp-2 text-[11px] text-zinc-500">
        Negative：{{ negativeLabel }}
      </p>
      <p v-if="durationLabel" class="text-[11px] text-zinc-500">耗时：{{ durationLabel }}</p>
      <p v-if="seedLabel" class="text-[11px] text-zinc-500">Seed：{{ seedLabel }}</p>
    </div>
    <p v-else-if="previewTask?.status === 'FAILED'" class="text-xs text-red-300">
      {{ previewTask.error || "图片生成失败" }}
    </p>

    <p v-if="!imageConfigured" class="text-xs text-amber-200">
      尚未配置图片模型。
      <NuxtLink class="text-gold-300" :to="`/projects/${projectId}/settings#IMAGE`">
        去 AI 配置
      </NuxtLink>
    </p>

    <div class="flex flex-wrap gap-2">
      <button
        type="button"
        class="rounded-xl bg-gold-400 px-3 py-1.5 text-xs font-medium text-ink-950 disabled:opacity-40"
        :disabled="!imageConfigured || generating || !(shot.imagePrompt || shot.visualDescription)"
        @click="onGenerate"
      >
        {{ generating ? "生成中..." : previewTask ? "重新生成" : "生成图片" }}
      </button>
      <button
        v-if="canApply"
        type="button"
        class="rounded-xl border border-gold-400/40 px-3 py-1.5 text-xs text-gold-200 disabled:opacity-40"
        :disabled="applying"
        @click="onApply"
      >
        {{ applying ? "应用中…" : "应用为最终图片" }}
      </button>
      <button
        v-if="imageAssets.length > 0"
        type="button"
        class="rounded-xl border border-white/10 px-3 py-1.5 text-xs"
        @click="galleryOpen = true"
      >
        图片历史
      </button>
    </div>

    <AppModal :open="galleryOpen" title="图片历史" description="不会删除历史版本。" @close="galleryOpen = false">
      <div class="space-y-3">
        <article
          v-for="item in imageAssets"
          :key="item.id"
          class="rounded-xl border border-white/10 p-3"
        >
          <img
            v-if="assetSrc(item.asset)"
            :src="assetSrc(item.asset)"
            :alt="item.asset?.name || '历史图片'"
            class="mb-2 max-h-40 w-full rounded-lg object-cover"
          />
          <p class="text-xs text-zinc-300">v{{ item.asset?.version ?? "—" }}</p>
          <p class="text-[11px] text-zinc-500">
            {{ item.asset?.provider || "—" }} · {{ item.asset?.model || "—" }}
          </p>
          <p class="text-[11px] text-zinc-500">{{ formatTime(item.createdAt) }}</p>
          <p class="text-[11px] text-zinc-500">
            Seed：{{ seedFromAsset(item.asset) }} · {{ item.isPrimary ? "Final" : item.role }}
          </p>
          <button
            v-if="!item.isPrimary"
            type="button"
            class="mt-2 text-xs text-gold-300"
            @click="onSetPrimary(item.assetId)"
          >
            设为最终
          </button>
        </article>
        <p v-if="imageAssets.length === 0" class="text-sm text-zinc-500">还没有已应用的图片。</p>
      </div>
    </AppModal>
  </section>
</template>

<script setup lang="ts">
import {
  filterShotAssetsByMediaType,
  getGenerationDurationLabel,
  getPrimaryShotAsset,
  getShotImageStatus,
  getShotImageStatusLabel,
  previewImageSrc,
  resolveAssetDisplayUrl,
} from "@ai-drama-studio/core";
import {
  AssetType,
  GenerationTaskStatus,
  type Asset,
  type ImageGenerationImage,
  type StoryboardShot,
} from "@ai-drama-studio/types";
import { useStoryboardStore } from "~/stores/storyboard";

const props = defineProps<{
  projectId: string;
  episodeId: string;
  shot: StoryboardShot;
  imageConfigured: boolean;
  storyboardStale?: boolean;
}>();

const config = useRuntimeConfig();
const store = useStoryboardStore();
const galleryOpen = ref(false);
const applying = ref(false);

const generating = computed(
  () => store.imageGeneratingShotId === props.shot.id,
);

const shotImageTasks = computed(() =>
  store.imageGenerations.filter((item) => {
    const input = item.input as { shotId?: string } | null;
    return input?.shotId === props.shot.id;
  }),
);

const previewTask = computed(() => {
  const local = store.previewByShotId[props.shot.id];
  if (local) {
    return local;
  }
  return (
    shotImageTasks.value.find(
      (item) => item.status === GenerationTaskStatus.SUCCEEDED && !item.appliedAt,
    ) ??
    shotImageTasks.value[0] ??
    null
  );
});

const previewImages = computed(() => {
  const output = previewTask.value?.output as { images?: ImageGenerationImage[] } | null;
  return output?.images ?? [];
});

const hasUnappliedPreview = computed(
  () =>
    previewTask.value?.status === GenerationTaskStatus.SUCCEEDED &&
    !previewTask.value.appliedAt,
);

const imageAssets = computed(() =>
  filterShotAssetsByMediaType(props.shot.assets, AssetType.IMAGE),
);

const status = computed(() =>
  getShotImageStatus({
    assets: imageAssets.value,
    generating: generating.value,
    hasUnappliedPreview: hasUnappliedPreview.value,
    storyboardStale: props.storyboardStale,
  }),
);

const statusLabel = computed(() => getShotImageStatusLabel(status.value));

const primaryAsset = computed(
  () => getPrimaryShotAsset(imageAssets.value, AssetType.IMAGE)?.asset ?? null,
);

const primarySrc = computed(() => assetSrc(primaryAsset.value));

const canApply = computed(
  () =>
    previewTask.value?.status === GenerationTaskStatus.SUCCEEDED &&
    !previewTask.value.appliedAt,
);

const sizeLabel = computed(() => {
  const input = previewTask.value?.input as { aspectRatio?: string; width?: number; height?: number } | null;
  if (input?.aspectRatio) {
    return input.aspectRatio;
  }
  if (input?.width && input?.height) {
    return `${input.width}x${input.height}`;
  }
  return "—";
});

const promptLabel = computed(() => {
  const input = previewTask.value?.input as { prompt?: string } | null;
  return input?.prompt || props.shot.imagePrompt || "—";
});

const negativeLabel = computed(() => {
  const input = previewTask.value?.input as { negativePrompt?: string } | null;
  return input?.negativePrompt || props.shot.negativePrompt || "";
});

const durationLabel = computed(() => getGenerationDurationLabel(previewTask.value?.usage));

const seedLabel = computed(() => {
  const first = previewImages.value[0];
  const input = previewTask.value?.input as { seed?: number } | null;
  return first?.seed ?? input?.seed ?? "";
});

function previewSrc(image: ImageGenerationImage) {
  const src = previewImageSrc(image);
  return src ? resolveAssetDisplayUrl(config.public.apiBase, src) ?? "" : "";
}

function assetSrc(asset?: Asset | null) {
  return resolveAssetDisplayUrl(config.public.apiBase, asset?.url ?? null) ?? "";
}

function seedFromAsset(asset?: Asset | null) {
  const seed = asset?.metadata?.seed;
  return typeof seed === "number" ? seed : "—";
}

function formatTime(value: string) {
  return new Date(value).toLocaleString("zh-CN");
}

async function onGenerate() {
  await store.createImageGeneration(props.projectId, {
    shotId: props.shot.id,
    aspectRatio: "16:9",
  });
}

async function onApply() {
  if (!previewTask.value) {
    return;
  }
  applying.value = true;
  try {
    await store.applyImageGeneration(props.projectId, props.episodeId, previewTask.value.id);
  } finally {
    applying.value = false;
  }
}

async function onSetPrimary(assetId: string) {
  await store.setPrimaryShotAsset(props.projectId, props.episodeId, props.shot.id, assetId);
}
</script>
