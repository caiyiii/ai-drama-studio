<template>
  <article class="flex h-full flex-col overflow-hidden rounded-2xl border border-white/5 bg-ink-800/80">
    <NuxtLink :to="overviewPath" class="block">
      <ProjectCover :name="project.name" :cover="project.cover" :genre="project.genre" />
    </NuxtLink>
    <div class="flex flex-1 flex-col p-5">
      <div class="flex items-start justify-between gap-3">
        <NuxtLink :to="overviewPath" class="min-w-0">
          <h3 class="font-display text-2xl text-zinc-100">{{ project.name }}</h3>
        </NuxtLink>
        <StatusBadge :status="project.status" />
      </div>
      <p class="mt-2 line-clamp-2 text-sm text-zinc-500">
        {{ project.description || "尚未填写简介" }}
      </p>
      <p class="mt-3 text-xs text-zinc-500">{{ project.genre || "未分类" }} · {{ stepLabel }}</p>
      <div class="mt-4">
        <ProjectProgress :percent="progress" />
      </div>
      <p class="mt-3 text-xs text-zinc-600">更新于 {{ formatDate(project.updatedAt) }}</p>
      <div class="mt-5 flex gap-2">
        <button
          type="button"
          class="flex-1 rounded-xl bg-gold-400 px-3 py-2 text-sm font-medium text-ink-950 hover:bg-gold-300"
          @click="onContinue"
        >
          继续制作
        </button>
        <button
          type="button"
          class="rounded-xl border border-white/10 px-3 py-2 text-sm text-zinc-300 hover:border-gold-400/40"
          @click="$emit('edit', project)"
        >
          编辑
        </button>
        <button
          type="button"
          class="rounded-xl border border-red-500/20 px-3 py-2 text-sm text-red-300 hover:bg-red-500/10"
          @click="$emit('delete', project)"
        >
          删除
        </button>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import {
  getContinueProductionPath,
  getProjectProgressPercent,
  getProjectStepLabel,
  getWorkspacePath,
} from "@ai-drama-studio/core";
import type { Project } from "@ai-drama-studio/types";
import { formatDate } from "@ai-drama-studio/utils";

const props = defineProps<{
  project: Project;
}>();

defineEmits<{
  edit: [project: Project];
  delete: [project: Project];
}>();

const overviewPath = computed(() => getWorkspacePath(props.project.id));
const progress = computed(() =>
  getProjectProgressPercent(props.project.status, props.project.currentStep),
);
const stepLabel = computed(() => getProjectStepLabel(props.project.currentStep));

function onContinue() {
  void navigateTo(
    getContinueProductionPath(props.project.id, props.project.currentStep),
  );
}
</script>
