<template>
  <div class="min-h-screen bg-ink-950 text-zinc-100">
    <DesktopSidebar v-if="isDesktop" :expanded="true" />
    <TabletRail
      v-else-if="isTablet"
      :expanded="tabletExpanded"
      @toggle="tabletExpanded = !tabletExpanded"
    />
    <MobileTopBar v-else />

    <div
      v-if="isTablet && tabletExpanded"
      class="fixed inset-0 z-20 bg-black/50"
      @click="tabletExpanded = false"
    />

    <main :class="mainClass">
      <WorkspaceTopBar
        v-if="showWorkspaceBar"
        :project="project"
      />
      <slot />
    </main>

    <MobileBottomNav v-if="isMobile" />
  </div>
</template>

<script setup lang="ts">
import { useCurrentProject } from "~/composables/useCurrentProject";
import { useViewport } from "~/composables/useViewport";

const route = useRoute();
const { isMobile, isTablet, isDesktop } = useViewport();
const { isProjectRoute, project } = useCurrentProject();
const tabletExpanded = ref(false);

const showWorkspaceBar = computed(
  () =>
    (isDesktop.value || isTablet.value) &&
    (isProjectRoute.value || route.path === "/ai-providers"),
);

const mainClass = computed(() => {
  if (isDesktop.value) {
    return showWorkspaceBar.value ? "ml-[240px] min-h-screen pt-0" : "ml-[240px] min-h-screen";
  }
  if (isTablet.value) {
    return tabletExpanded.value ? "ml-[240px] min-h-screen" : "ml-[72px] min-h-screen";
  }
  return "pb-20 pt-14 min-h-screen";
});
</script>
