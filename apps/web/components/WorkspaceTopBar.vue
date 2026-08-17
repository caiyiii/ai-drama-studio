<template>
  <header
    class="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b border-white/5 bg-ink-950/90 px-4 backdrop-blur tablet:px-6"
  >
    <StudioBreadcrumb :items="crumbs" />
    <div class="flex shrink-0 items-center gap-3">
      <span v-if="project" class="hidden text-xs text-zinc-500 tablet:inline">
        当前步骤
        <span class="text-gold-300">{{ stepLabel }}</span>
      </span>
      <NuxtLink
        v-if="project && !onSettings"
        :to="`/projects/${project.id}/settings`"
        class="rounded-xl border border-white/10 px-3 py-1.5 text-sm text-zinc-300 hover:border-gold-400/40"
      >
        设置
      </NuxtLink>
    </div>
  </header>
</template>

<script setup lang="ts">
import { getProjectStepLabel } from "@ai-drama-studio/core";
import type { Project } from "@ai-drama-studio/types";
import { useWorkspaceBreadcrumbs } from "~/composables/useWorkspaceBreadcrumbs";

const props = defineProps<{
  project: Project | null;
}>();

const route = useRoute();
const { items: crumbs } = useWorkspaceBreadcrumbs();

const stepLabel = computed(() =>
  props.project ? getProjectStepLabel(props.project.currentStep) : "—",
);

const onSettings = computed(() =>
  Boolean(props.project && route.path.endsWith("/settings")),
);
</script>
