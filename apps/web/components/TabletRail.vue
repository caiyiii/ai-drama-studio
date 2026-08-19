<template>
  <aside
    class="fixed inset-y-0 left-0 z-30 flex flex-col border-r border-white/5 bg-ink-900/95 transition-[width]"
    :class="expanded ? 'w-[240px]' : 'w-[72px]'"
  >
    <div class="flex items-center justify-center py-5" :class="expanded ? 'px-5 justify-start gap-3' : ''">
      <NuxtLink to="/">
        <BrandMark :small="!expanded" />
      </NuxtLink>
      <div v-if="expanded">
        <p class="font-display text-lg text-gold-400">AI Drama</p>
      </div>
    </div>

    <nav class="flex flex-1 flex-col items-stretch gap-1 overflow-y-auto px-2">
      <NuxtLink
        v-for="item in railItems"
        :key="item.to"
        :to="item.to"
        class="flex items-center rounded-lg text-zinc-500 transition hover:bg-white/5 hover:text-gold-300"
        :class="[
          expanded ? 'gap-3 px-3 py-2 text-sm' : 'h-10 w-10 justify-center self-center text-[11px]',
          isActive(item.to) ? 'bg-white/5 text-gold-300' : '',
        ]"
        :title="item.label"
      >
        <span>{{ expanded ? item.label : item.short }}</span>
      </NuxtLink>
    </nav>

    <button
      type="button"
      class="m-3 rounded-lg border border-white/10 py-2 text-xs text-zinc-400 hover:text-gold-300"
      @click="$emit('toggle')"
    >
      {{ expanded ? "折叠" : "展开" }}
    </button>
  </aside>
</template>

<script setup lang="ts">
import { getWorkspacePath, getWorkspaceSteps } from "@ai-drama-studio/core";

defineProps<{
  expanded: boolean;
}>();

defineEmits<{
  toggle: [];
}>();

const route = useRoute();
const steps = getWorkspaceSteps();

const projectId = computed(() => {
  const id = route.params.id;
  return typeof id === "string" ? id : null;
});

const railItems = computed(() => {
  if (projectId.value) {
    return steps.map((item) => ({
      label: item.label,
      short: item.short,
      to: getWorkspacePath(projectId.value as string, item.path),
    }));
  }

  return [
    { label: "首页", short: "首", to: "/" },
    { label: "项目", short: "项", to: "/projects" },
    { label: "AI 配置", short: "AI", to: "/ai-providers" },
  ];
});

function isActive(to: string) {
  if (route.path === to) {
    return true;
  }
  if (to.endsWith("/episodes")) {
    return route.path.includes("/episodes");
  }
  if (to.endsWith("/seasons")) {
    return route.path.includes("/seasons") && !route.path.includes("/episodes");
  }
  return to !== "/" && route.path.startsWith(`${to}/`);
}
</script>
