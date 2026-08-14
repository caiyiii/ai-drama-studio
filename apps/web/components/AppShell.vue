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
        @settings="showSettings = true"
      />
      <slot />
    </main>

    <MobileBottomNav v-if="isMobile" />

    <AppModal
      :open="showSettings"
      title="项目设置"
      description="修改漫剧基础信息。"
      @close="showSettings = false"
    >
      <ProjectForm
        v-if="project"
        :initial-name="project.name"
        :initial-description="project.description"
        :initial-genre="project.genre"
        :saving="store.saving"
        :error="store.error"
        submit-label="保存"
        @submit="onUpdate"
        @cancel="showSettings = false"
      />
      <button
        v-if="project"
        type="button"
        class="mt-4 w-full rounded-xl border border-red-500/20 px-4 py-2 text-sm text-red-300 hover:bg-red-500/10"
        @click="pendingDelete = true"
      >
        删除项目
      </button>
    </AppModal>

    <ConfirmDialog
      :open="pendingDelete"
      :title="deleteTitle"
      message="删除后项目数据将无法恢复。"
      @confirm="onDelete"
      @cancel="pendingDelete = false"
    />
  </div>
</template>

<script setup lang="ts">
const { isMobile, isTablet, isDesktop } = useViewport();
const { store, isProjectRoute, project, projectId } = useCurrentProject();
const tabletExpanded = ref(false);
const showSettings = ref(false);
const pendingDelete = ref(false);

const showWorkspaceBar = computed(
  () => isProjectRoute.value && (isDesktop.value || isTablet.value),
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

const deleteTitle = computed(() =>
  project.value ? `确定删除《${project.value.name}》？` : "确定删除该项目？",
);

async function onUpdate(payload: { name: string; description?: string; genre?: string }) {
  if (!projectId.value) {
    return;
  }
  const updated = await store.updateProject(projectId.value, payload);
  if (updated) {
    showSettings.value = false;
  }
}

async function onDelete() {
  if (!projectId.value) {
    return;
  }
  const ok = await store.deleteProject(projectId.value);
  pendingDelete.value = false;
  showSettings.value = false;
  if (ok) {
    await navigateTo("/projects");
  }
}
</script>
