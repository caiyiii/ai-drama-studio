<template>
  <section class="mx-auto max-w-3xl px-4 py-8 tablet:px-8 desktop:px-10">
    <p class="text-[11px] uppercase tracking-[0.2em] text-gold-400/80">{{ eyebrow }}</p>
    <h1 class="mt-2 font-display text-4xl text-zinc-100">{{ title }}</h1>
    <p class="mt-3 max-w-xl text-sm leading-6 text-zinc-500">{{ description }}</p>
    <div v-if="step" class="mt-6 flex flex-wrap items-center gap-3 text-sm">
      <span class="rounded-full border border-white/10 px-3 py-1 text-zinc-400">
        当前项目步骤：{{ currentStepLabel }}
      </span>
      <span
        class="rounded-full px-3 py-1"
        :class="isCurrent ? 'bg-gold-400/10 text-gold-300' : 'bg-white/5 text-zinc-500'"
      >
        {{ isCurrent ? "当前步骤" : "待开发步骤" }}
      </span>
    </div>
    <div class="mt-8 rounded-2xl border border-dashed border-white/10 bg-ink-800/40 px-6 py-10 text-sm text-zinc-500">
      即将开始开发。本阶段不实现该步骤的真实业务。
    </div>
  </section>
</template>

<script setup lang="ts">
import { getProjectStepLabel } from "@ai-drama-studio/core";
import type { ProjectStep } from "@ai-drama-studio/types";

const props = defineProps<{
  eyebrow: string;
  title: string;
  description: string;
  step?: ProjectStep;
}>();

const { project } = useCurrentProject();

const currentStepLabel = computed(() =>
  project.value ? getProjectStepLabel(project.value.currentStep) : "—",
);
const isCurrent = computed(() => project.value?.currentStep === props.step);
</script>
