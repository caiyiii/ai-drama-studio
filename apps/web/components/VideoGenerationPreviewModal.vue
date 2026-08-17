<template>
  <AppModal
    :open="open"
    title="视频 Preview"
    description="确认后才会写入正式 Video Asset。费用由当前项目配置的 AI Provider 账户承担。"
    @close="$emit('close')"
  >
    <div class="space-y-3 text-sm">
      <video
        v-if="previewSrc"
        :src="previewSrc"
        controls
        class="max-h-64 w-full rounded-xl bg-ink-950"
      />
      <p v-else-if="failed" class="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-red-300">
        {{ task?.error || "视频生成失败" }}
      </p>
      <p v-else class="text-zinc-500">暂无 Preview。</p>

      <p class="text-xs text-zinc-500">Provider：{{ task?.provider || "—" }}</p>
      <p class="text-xs text-zinc-500">Model：{{ task?.model || "—" }}</p>
      <p class="text-xs text-zinc-500">Capability：{{ task?.capability || "—" }}</p>
      <p class="text-xs text-zinc-500">Duration：{{ durationLabel }}</p>
      <p class="text-xs text-zinc-500">Resolution：{{ resolutionLabel }}</p>
      <p v-if="sourceImageLabel" class="text-xs text-zinc-500">Source Image：{{ sourceImageLabel }}</p>
      <p class="line-clamp-4 text-xs text-zinc-500">Prompt：{{ promptLabel }}</p>
      <p v-if="durationMsLabel" class="text-xs text-zinc-500">Generation Time：{{ durationMsLabel }}</p>

      <div class="flex flex-wrap justify-end gap-2 pt-2">
        <button type="button" class="text-sm text-zinc-400" @click="$emit('close')">取消</button>
        <button
          type="button"
          class="rounded-xl border border-white/10 px-3 py-1.5 text-xs"
          :disabled="generating"
          @click="$emit('regenerate')"
        >
          重新生成
        </button>
        <button
          v-if="canApply"
          type="button"
          class="rounded-xl bg-gold-400 px-3 py-1.5 text-xs font-medium text-ink-950 disabled:opacity-40"
          :disabled="applying"
          @click="$emit('apply')"
        >
          {{ applying ? "应用中…" : "应用为最终视频" }}
        </button>
      </div>
    </div>
  </AppModal>
</template>

<script setup lang="ts">
import { getGenerationDurationLabel, previewVideoSrc, resolveAssetDisplayUrl } from "@ai-drama-studio/core";
import { GenerationTaskStatus, type GenerationTask } from "@ai-drama-studio/types";

const props = defineProps<{
  open: boolean;
  task?: GenerationTask | null;
  generating?: boolean;
  applying?: boolean;
}>();

defineEmits<{
  close: [];
  regenerate: [];
  apply: [];
}>();

const config = useRuntimeConfig();

const failed = computed(() => props.task?.status === GenerationTaskStatus.FAILED);

const canApply = computed(
  () =>
    props.task?.status === GenerationTaskStatus.SUCCEEDED && !props.task.appliedAt,
);

const previewSrc = computed(() => {
  const output = props.task?.output as {
    url?: string;
    base64?: string;
    mimeType?: string;
  } | null;
  const src = output ? previewVideoSrc(output) : null;
  return src ? resolveAssetDisplayUrl(config.public.apiBase, src) ?? "" : "";
});

const durationLabel = computed(() => {
  const input = props.task?.input as { durationSeconds?: number } | null;
  const output = props.task?.output as { durationSeconds?: number } | null;
  const value = output?.durationSeconds ?? input?.durationSeconds;
  return typeof value === "number" ? `${value}s` : "—";
});

const resolutionLabel = computed(() => {
  const input = props.task?.input as { width?: number; height?: number } | null;
  const output = props.task?.output as { width?: number; height?: number } | null;
  const width = output?.width ?? input?.width;
  const height = output?.height ?? input?.height;
  return width && height ? `${width} × ${height}` : "—";
});

const sourceImageLabel = computed(() => {
  const input = props.task?.input as { sourceAssetId?: string } | null;
  return input?.sourceAssetId || "";
});

const promptLabel = computed(() => {
  const input = props.task?.input as { prompt?: string } | null;
  return input?.prompt || "—";
});

const durationMsLabel = computed(() => getGenerationDurationLabel(props.task?.usage));
</script>
