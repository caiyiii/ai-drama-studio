<template>
  <section class="mt-8">
    <p class="text-[11px] uppercase tracking-[0.2em] text-gold-400/80">Generation History</p>
    <h3 class="mt-1 font-display text-2xl">AI生成记录</h3>
    <p v-if="visibleItems.length === 0" class="mt-3 text-sm text-zinc-500">还没有生成记录。</p>
    <ul v-else class="mt-4 space-y-2">
      <li v-for="item in visibleItems" :key="item.id">
        <button
          type="button"
          class="w-full rounded-2xl border border-white/5 bg-ink-800/70 px-4 py-3 text-left hover:border-gold-400/30"
          @click="selected = item"
        >
          <div class="flex flex-wrap items-center justify-between gap-2">
            <span class="text-sm text-zinc-100">{{ typeLabel(item.type) }}</span>
            <span class="text-xs text-gold-300">{{ statusLabel(item.status) }}</span>
          </div>
          <p class="mt-1 text-xs text-zinc-500">
            {{ formatTime(item.createdAt) }}
            · {{ item.provider || "未记录 Provider" }}
            · {{ item.model || "未记录模型" }}
            <span v-if="durationLabel(item)"> · {{ durationLabel(item) }}</span>
          </p>
        </button>
      </li>
    </ul>

    <AppModal
      :open="Boolean(selected)"
      :title="selected ? typeLabel(selected.type) : ''"
      :description="selected ? statusLabel(selected.status) : ''"
      @close="selected = null"
    >
      <div v-if="selected" class="space-y-3 text-sm">
        <p class="text-zinc-500">Provider：{{ selected.provider || "—" }}</p>
        <p class="text-zinc-500">模型：{{ selected.model || "—" }}</p>
        <p class="text-zinc-500">时间：{{ formatTime(selected.createdAt) }}</p>
        <p v-if="durationLabel(selected)" class="text-zinc-500">耗时：{{ durationLabel(selected) }}</p>
        <div>
          <p class="text-xs text-zinc-500">Input</p>
          <pre class="mt-1 max-h-40 overflow-auto rounded-xl bg-ink-950 p-3 text-xs text-zinc-300">{{ formatJson(selected.input) }}</pre>
        </div>
        <div>
          <p class="text-xs text-zinc-500">Output</p>
          <pre class="mt-1 max-h-52 overflow-auto rounded-xl bg-ink-950 p-3 text-xs text-zinc-300">{{ formatJson(selected.output) }}</pre>
        </div>
        <p v-if="selected.error" class="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-red-300">
          {{ selected.error }}
        </p>
      </div>
    </AppModal>
  </section>
</template>

<script setup lang="ts">
import {
  getGenerationDurationLabel,
  getGenerationStatusLabel,
  getGenerationTypeLabel,
} from "@ai-drama-studio/core";
import { GenerationTaskType, type GenerationTask } from "@ai-drama-studio/types";

const props = defineProps<{
  items: GenerationTask[];
  type?: GenerationTaskType;
}>();

const selected = ref<GenerationTask | null>(null);

const visibleItems = computed(() =>
  props.type ? props.items.filter((item) => item.type === props.type) : props.items,
);

function statusLabel(status: GenerationTask["status"]) {
  return getGenerationStatusLabel(status);
}

function typeLabel(type: GenerationTask["type"]) {
  return getGenerationTypeLabel(type);
}

function durationLabel(item: GenerationTask) {
  return getGenerationDurationLabel(item.usage);
}

function formatTime(value: string) {
  return new Date(value).toLocaleString("zh-CN");
}

function formatJson(value: unknown) {
  if (value == null) {
    return "无";
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}
</script>
