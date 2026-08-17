<template>
  <section class="space-y-3 border-t border-white/5 pt-3">
    <p class="text-xs uppercase tracking-[0.16em] text-gold-400/80">视频</p>
    <p class="text-[11px] text-zinc-500">
      视频生成将使用当前项目配置的 AI Provider，费用由该 Provider 账户承担。
    </p>
    <p class="text-[11px] text-zinc-600">
      默认 Provider 仅用于开发 / Demo。正式生产建议配置自己的 Provider。
    </p>

    <p class="text-xs text-zinc-500">状态：{{ statusLabel }}</p>
    <p v-if="stale" class="text-xs text-amber-200">分镜已更新，当前视频可能已过期。</p>

    <div>
      <p class="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Source</p>
      <p class="mt-1 text-xs text-zinc-400">最终图片</p>
      <img
        v-if="sourceImageSrc"
        :src="sourceImageSrc"
        alt="最终图片"
        class="mt-2 max-h-32 w-full rounded-xl object-cover"
      />
      <p v-else class="mt-2 text-xs text-zinc-500">还没有最终图片。图生视频需要先 Apply 镜头图片。</p>
    </div>

    <label class="block text-sm">
      <span class="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Prompt</span>
      <textarea
        v-model="prompt"
        rows="3"
        class="studio-field mt-1 resize-none"
        :disabled="store.locked"
        placeholder="Video Prompt"
        @change="onSavePrompt"
      />
    </label>
    <label class="block text-sm">
      <span class="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Negative Prompt</span>
      <textarea
        v-model="negativePrompt"
        rows="2"
        class="studio-field mt-1 resize-none"
        :disabled="store.locked"
        placeholder="Negative Prompt"
        @change="onSavePrompt"
      />
    </label>

    <div class="grid grid-cols-2 gap-2 text-xs">
      <label>
        <span class="text-zinc-500">时长</span>
        <input v-model.number="durationSeconds" type="number" min="1" max="30" class="studio-field mt-1" />
      </label>
      <p class="pt-5 text-zinc-500">分辨率：{{ width }} × {{ height }}</p>
    </div>

    <div class="space-y-1 text-xs">
      <p class="text-zinc-500">视频生成方式</p>
      <label class="flex items-center gap-2">
        <input v-model="mode" type="radio" value="IMAGE_TO_VIDEO" />
        基于最终图片生成
      </label>
      <label class="flex items-center gap-2">
        <input v-model="mode" type="radio" value="TEXT_TO_VIDEO" />
        纯 Prompt 生成
      </label>
      <p class="text-zinc-500">生成模式：{{ mode === "IMAGE_TO_VIDEO" ? "Image to Video" : "Text to Video" }}</p>
    </div>

    <p class="text-[11px] text-zinc-500">Provider：{{ providerName }}</p>
    <p class="text-[11px] text-zinc-500">Model：{{ modelName }}</p>

    <p v-if="!capabilityConfigured" class="text-xs text-amber-200">
      尚未配置视频模型。
      <NuxtLink class="text-gold-300" :to="settingsHref">配置 AI</NuxtLink>
    </p>

    <div class="flex flex-wrap gap-2">
      <button
        type="button"
        class="rounded-xl bg-gold-400 px-3 py-1.5 text-xs font-medium text-ink-950 disabled:opacity-40"
        :disabled="!canGenerate"
        @click="onGenerate"
      >
        {{ generating ? "生成中..." : previewTask ? "重新生成" : "生成视频" }}
      </button>
      <button
        v-if="canApply"
        type="button"
        class="rounded-xl border border-gold-400/40 px-3 py-1.5 text-xs text-gold-200 disabled:opacity-40"
        :disabled="applying"
        @click="onApply"
      >
        {{ applying ? "应用中…" : "应用为最终视频" }}
      </button>
      <button
        v-if="videoAssets.length > 0"
        type="button"
        class="rounded-xl border border-white/10 px-3 py-1.5 text-xs"
        @click="galleryOpen = true"
      >
        视频历史
      </button>
    </div>

    <p v-if="previewTask?.status === 'FAILED'" class="text-xs text-red-300">
      {{ previewTask.error || "视频生成失败" }}
    </p>

    <video
      v-if="primarySrc"
      :src="primarySrc"
      controls
      class="max-h-48 w-full rounded-xl bg-ink-950"
    />

    <VideoGenerationPreviewModal
      :open="previewOpen"
      :task="previewTask"
      :generating="generating"
      :applying="applying"
      @close="previewOpen = false"
      @regenerate="onGenerate"
      @apply="onApply"
    />

    <AppModal :open="galleryOpen" title="视频历史" description="不会删除历史版本。" @close="galleryOpen = false">
      <div class="space-y-3">
        <article
          v-for="item in videoAssets"
          :key="item.id"
          class="rounded-xl border border-white/10 p-3"
        >
          <video
            v-if="assetSrc(item.asset)"
            :src="assetSrc(item.asset)"
            controls
            class="mb-2 max-h-40 w-full rounded-lg bg-ink-950"
          />
          <p class="text-xs text-zinc-300">v{{ item.asset?.version ?? "—" }}</p>
          <p class="text-[11px] text-zinc-500">
            {{ item.asset?.provider || "—" }} · {{ item.asset?.model || "—" }}
          </p>
          <p class="text-[11px] text-zinc-500">
            {{ item.asset?.durationSeconds ? `${item.asset.durationSeconds}s` : "—" }}
            · {{ formatTime(item.createdAt) }}
          </p>
          <p class="text-[11px] text-zinc-500">
            {{ item.isPrimary ? "Final" : "Candidate" }} · {{ item.asset?.status || item.role }}
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
        <p v-if="videoAssets.length === 0" class="text-sm text-zinc-500">还没有已应用的视频。</p>
      </div>
    </AppModal>
  </section>
</template>

<script setup lang="ts">
import {
  filterShotAssetsByMediaType,
  getPrimaryShotAsset,
  getShotVideoStatus,
  getShotVideoStatusLabel,
  isShotVideoStale,
  previewVideoSrc,
  resolveAssetDisplayUrl,
} from "@ai-drama-studio/core";
import {
  AssetType,
  GenerationTaskStatus,
  type Asset,
  type StoryboardShot,
  type VideoGenerationMode,
} from "@ai-drama-studio/types";
import { useAiProviderStore } from "~/stores/ai-provider";
import { useStoryboardStore } from "~/stores/storyboard";

const props = defineProps<{
  projectId: string;
  episodeId: string;
  shot: StoryboardShot;
  videoConfigured: boolean;
  imageToVideoConfigured: boolean;
  storyboardVersion?: number;
}>();

const config = useRuntimeConfig();
const store = useStoryboardStore();
const aiStore = useAiProviderStore();
const galleryOpen = ref(false);
const previewOpen = ref(false);
const applying = ref(false);
const mode = ref<VideoGenerationMode>("IMAGE_TO_VIDEO");
const prompt = ref(props.shot.videoPrompt || "");
const negativePrompt = ref(props.shot.negativePrompt || "");
const durationSeconds = ref(props.shot.durationSeconds || 5);
const width = 1280;
const height = 720;

watch(
  () => props.shot.id,
  () => {
    prompt.value = props.shot.videoPrompt || "";
    negativePrompt.value = props.shot.negativePrompt || "";
    durationSeconds.value = props.shot.durationSeconds || 5;
  },
);

const generating = computed(() => store.videoGeneratingShotId === props.shot.id);

const videoAssets = computed(() =>
  filterShotAssetsByMediaType(props.shot.assets, AssetType.VIDEO),
);

const sourceImage = computed(
  () => getPrimaryShotAsset(props.shot.assets, AssetType.IMAGE)?.asset ?? null,
);

const sourceImageSrc = computed(() => assetSrc(sourceImage.value));

const shotVideoTasks = computed(() =>
  store.videoGenerations.filter((item) => {
    const input = item.input as { shotId?: string } | null;
    return input?.shotId === props.shot.id;
  }),
);

const previewTask = computed(() => {
  const local = store.videoPreviewByShotId[props.shot.id];
  if (local) {
    return local;
  }
  return (
    shotVideoTasks.value.find(
      (item) => item.status === GenerationTaskStatus.SUCCEEDED && !item.appliedAt,
    ) ??
    shotVideoTasks.value[0] ??
    null
  );
});

const hasUnappliedPreview = computed(
  () =>
    previewTask.value?.status === GenerationTaskStatus.SUCCEEDED &&
    !previewTask.value.appliedAt,
);

const primaryVideo = computed(
  () => getPrimaryShotAsset(props.shot.assets, AssetType.VIDEO)?.asset ?? null,
);

const stale = computed(() =>
  isShotVideoStale({
    storyboardVersion: props.storyboardVersion,
    generatedFromStoryboardVersion:
      typeof primaryVideo.value?.metadata?.storyboardVersion === "number"
        ? primaryVideo.value.metadata.storyboardVersion
        : null,
    shotUpdatedAt: props.shot.updatedAt,
    videoCreatedAt: primaryVideo.value?.createdAt,
  }),
);

const status = computed(() =>
  getShotVideoStatus({
    assets: props.shot.assets,
    generating: generating.value,
    hasUnappliedPreview: hasUnappliedPreview.value,
    stale: stale.value,
  }),
);

const statusLabel = computed(() => getShotVideoStatusLabel(status.value));

const capabilityConfigured = computed(() =>
  mode.value === "IMAGE_TO_VIDEO" ? props.imageToVideoConfigured : props.videoConfigured,
);

const settingsHref = computed(
  () =>
    `/projects/${props.projectId}/settings#${mode.value === "IMAGE_TO_VIDEO" ? "IMAGE_TO_VIDEO" : "VIDEO"}`,
);

const capabilityKey = computed(() =>
  mode.value === "IMAGE_TO_VIDEO" ? "IMAGE_TO_VIDEO" : "VIDEO",
);

const providerName = computed(
  () => aiStore.projectAiConfig?.[capabilityKey.value]?.providerName || "未配置",
);

const modelName = computed(
  () => aiStore.projectAiConfig?.[capabilityKey.value]?.model || "—",
);

const canGenerate = computed(() => {
  if (!capabilityConfigured.value || generating.value) {
    return false;
  }
  if (mode.value === "IMAGE_TO_VIDEO" && !sourceImage.value) {
    return false;
  }
  return Boolean(prompt.value.trim() || props.shot.videoPrompt || props.shot.imagePrompt || props.shot.visualDescription);
});

const canApply = computed(
  () =>
    previewTask.value?.status === GenerationTaskStatus.SUCCEEDED &&
    !previewTask.value.appliedAt,
);

const primarySrc = computed(() => {
  if (primaryVideo.value) {
    return assetSrc(primaryVideo.value);
  }
  const output = previewTask.value?.output as {
    url?: string;
    base64?: string;
    mimeType?: string;
  } | null;
  const src = output ? previewVideoSrc(output) : null;
  return src ? resolveAssetDisplayUrl(config.public.apiBase, src) ?? "" : "";
});

function assetSrc(asset?: Asset | null) {
  return resolveAssetDisplayUrl(config.public.apiBase, asset?.url ?? null) ?? "";
}

function formatTime(value: string) {
  return new Date(value).toLocaleString("zh-CN");
}

async function onSavePrompt() {
  await store.updateShot(props.projectId, props.episodeId, props.shot.id, {
    videoPrompt: prompt.value,
    negativePrompt: negativePrompt.value,
    durationSeconds: durationSeconds.value,
  });
}

async function onGenerate() {
  const payload = {
    shotId: props.shot.id,
    prompt: prompt.value || undefined,
    negativePrompt: negativePrompt.value || undefined,
    durationSeconds: durationSeconds.value,
    width,
    height,
    aspectRatio: "16:9" as const,
  };
  const task =
    mode.value === "IMAGE_TO_VIDEO"
      ? await store.createImageToVideoGeneration(props.projectId, {
          ...payload,
          sourceAssetId: sourceImage.value?.id,
        })
      : await store.createVideoGeneration(props.projectId, payload);
  if (task) {
    previewOpen.value = true;
  }
}

async function onApply() {
  if (!previewTask.value) {
    return;
  }
  applying.value = true;
  try {
    await store.applyVideoGeneration(props.projectId, props.episodeId, previewTask.value.id);
    previewOpen.value = false;
  } finally {
    applying.value = false;
  }
}

async function onSetPrimary(assetId: string) {
  await store.setPrimaryVideoAsset(props.projectId, props.episodeId, props.shot.id, assetId);
}
</script>
