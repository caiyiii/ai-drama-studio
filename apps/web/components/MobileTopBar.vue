<template>
  <header
    class="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-white/5 bg-ink-950/90 px-4 backdrop-blur"
  >
    <StudioBreadcrumb v-if="isProjectRoute || isAiProviders" :items="crumbs" />
    <NuxtLink v-else to="/" class="flex min-w-0 items-center gap-2">
      <BrandMark small />
      <span class="font-display text-lg text-gold-400">AI Drama</span>
    </NuxtLink>
    <NuxtLink
      v-if="isProjectRoute && project && !onSettings"
      :to="`/projects/${project.id}/settings`"
      class="shrink-0 text-sm text-zinc-400"
    >
      设置
    </NuxtLink>
    <span v-else-if="!isProjectRoute && !isAiProviders" class="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
      Studio
    </span>
  </header>
</template>

<script setup lang="ts">
import { useCurrentProject } from "~/composables/useCurrentProject";
import { useWorkspaceBreadcrumbs } from "~/composables/useWorkspaceBreadcrumbs";

const route = useRoute();
const { isProjectRoute, project } = useCurrentProject();
const { items: crumbs } = useWorkspaceBreadcrumbs();

const isAiProviders = computed(() => route.path === "/ai-providers");
const onSettings = computed(() =>
  Boolean(project.value && route.path.endsWith("/settings")),
);
</script>
