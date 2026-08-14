<template>
  <header
    class="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b border-white/5 bg-ink-950/90 px-4 backdrop-blur tablet:px-6"
  >
    <div class="flex min-w-0 items-center gap-3">
      <NuxtLink
        to="/projects"
        class="shrink-0 text-sm text-zinc-400 transition hover:text-gold-300"
      >
        返回项目
      </NuxtLink>
      <span class="text-zinc-700">/</span>
      <p class="truncate font-display text-lg text-zinc-100">
        {{ project?.name ?? "载入中…" }}
      </p>
    </div>
    <div class="flex items-center gap-3">
      <span class="hidden text-xs text-zinc-500 tablet:inline">
        当前步骤
        <span class="text-gold-300">{{ stepLabel }}</span>
      </span>
      <button
        type="button"
        class="rounded-xl border border-white/10 px-3 py-1.5 text-sm text-zinc-300 hover:border-gold-400/40"
        @click="$emit('settings')"
      >
        设置
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { getProjectStepLabel } from "@ai-drama-studio/core";
import type { Project } from "@ai-drama-studio/types";

const props = defineProps<{
  project: Project | null;
}>();

defineEmits<{
  settings: [];
}>();

const stepLabel = computed(() =>
  props.project ? getProjectStepLabel(props.project.currentStep) : "—",
);
</script>
