<template>
  <div class="min-h-screen overflow-x-clip bg-ink-950 text-zinc-100">
    <DesktopSidebar class="!hidden desktop:!flex" :expanded="true" />
    <TabletRail
      class="!hidden tablet:!flex desktop:!hidden"
      :expanded="tabletExpanded"
      @toggle="tabletExpanded = !tabletExpanded"
    />
    <MobileTopBar class="tablet:hidden" />

    <div
      v-show="tabletExpanded"
      class="fixed inset-0 z-20 hidden bg-black/50 tablet:block desktop:hidden"
      @click="tabletExpanded = false"
    />

    <main :class="mainClass">
      <WorkspaceTopBar
        v-if="showWorkspaceBar"
        class="hidden tablet:block"
        :project="project"
      />
      <slot />
    </main>

    <MobileBottomNav class="tablet:hidden" />
  </div>
</template>

<script setup lang="ts">
import { useCurrentProject } from "~/composables/useCurrentProject";

const route = useRoute();
const { isProjectRoute, project } = useCurrentProject();
const tabletExpanded = ref(false);

const showWorkspaceBar = computed(
  () => isProjectRoute.value || route.path === "/ai-providers",
);

const mainClass = computed(() => [
  "min-h-screen min-w-0 pb-20 pt-14 tablet:pb-0 tablet:pt-0 desktop:ml-[240px]",
  tabletExpanded.value ? "tablet:ml-[240px]" : "tablet:ml-[72px]",
]);
</script>
