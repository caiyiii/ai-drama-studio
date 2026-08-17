<template>
  <aside
    class="fixed inset-y-0 left-0 z-30 flex w-[240px] flex-col border-r border-white/5 bg-ink-900/95"
  >
    <NuxtLink to="/" class="flex items-center gap-3 px-5 py-6">
      <BrandMark />
      <div>
        <p class="font-display text-xl tracking-wide text-gold-400">AI Drama</p>
        <p class="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Studio</p>
      </div>
    </NuxtLink>

    <nav class="flex flex-1 flex-col gap-1 overflow-y-auto px-3">
      <p class="px-2 pb-2 text-[10px] uppercase tracking-[0.2em] text-zinc-600">工作台</p>
      <NuxtLink
        v-for="item in sidebarItems"
        :key="item.to"
        :to="item.to"
        class="rounded-lg px-3 py-2 text-sm transition hover:bg-white/5 hover:text-zinc-100"
        :class="isActive(item.to) ? 'bg-white/5 text-gold-300' : 'text-zinc-400'"
      >
        <span>{{ item.label }}</span>
        <span
          v-if="item.current"
          class="ml-2 text-[10px] text-gold-400/80"
        >
          当前
        </span>
      </NuxtLink>
    </nav>

    <p class="px-5 py-4 text-[11px] text-zinc-600">专业 AI 漫剧创作</p>
  </aside>
</template>

<script setup lang="ts">
import { getWorkspacePath, getWorkspaceSteps } from "@ai-drama-studio/core";
import { useCurrentProject } from "~/composables/useCurrentProject";

defineProps<{
  expanded?: boolean;
}>();

const route = useRoute();
const { project } = useCurrentProject();
const steps = getWorkspaceSteps();

const projectId = computed(() => {
  const id = route.params.id;
  return typeof id === "string" ? id : null;
});

const sidebarItems = computed(() => {
  if (projectId.value) {
    return steps.map((item) => ({
      label: item.label,
      to: getWorkspacePath(projectId.value as string, item.path),
      current: item.step !== null && item.step === project.value?.currentStep,
    }));
  }

  return [
    { label: "首页", to: "/", current: false },
    { label: "项目", to: "/projects", current: false },
    { label: "AI 配置", to: "/ai-providers", current: false },
  ];
});

function isActive(to: string) {
  return route.path === to;
}
</script>
