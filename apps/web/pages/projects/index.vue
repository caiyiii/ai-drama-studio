<template>
  <section class="mx-auto max-w-6xl px-4 py-8 tablet:px-8 desktop:px-10">
    <div class="flex flex-col gap-4 tablet:flex-row tablet:items-end tablet:justify-between">
      <div>
        <p class="text-[11px] uppercase tracking-[0.2em] text-gold-400/80">Projects</p>
        <h1 class="mt-2 font-display text-4xl text-zinc-100">我的漫剧</h1>
        <p class="mt-2 text-sm text-zinc-500">从一部项目开始，逐步完成世界观到成片的创作流程。</p>
      </div>
      <button
        type="button"
        class="rounded-xl bg-gold-400 px-4 py-2 text-sm font-medium text-ink-950 hover:bg-gold-300"
        @click="openCreate"
      >
        + 新建漫剧
      </button>
    </div>

    <PageState
      :loading="store.loading"
      :error="store.error"
      :empty="!store.loading && !store.error && store.projects.length === 0"
      loading-text="正在载入漫剧项目…"
      empty-title="还没有创建漫剧"
      empty-action-label="创建第一部漫剧"
      :on-retry="() => store.fetchProjects()"
      :on-empty-action="openCreate"
    >
      <div class="mt-8 grid gap-4 tablet:grid-cols-2 desktop:grid-cols-3">
        <ProjectCard
          v-for="project in store.projects"
          :key="project.id"
          :project="project"
          @edit="openEdit"
          @delete="askDelete"
        />
      </div>
    </PageState>

    <AppModal
      :open="showForm"
      :title="editing ? '编辑漫剧' : '新建漫剧'"
      :description="editing ? '更新项目基础信息。' : '填写名称、简介与类型即可开始。'"
      @close="closeForm"
    >
      <ProjectForm
        :initial-name="editing?.name"
        :initial-description="editing?.description"
        :initial-genre="editing?.genre"
        :saving="store.saving"
        :error="store.error"
        :submit-label="editing ? '保存' : '创建'"
        @submit="onSubmit"
        @cancel="closeForm"
      />
    </AppModal>

    <ConfirmDialog
      :open="Boolean(pendingDelete)"
      :title="pendingDelete ? `确定删除《${pendingDelete.name}》？` : ''"
      message="删除后项目数据将无法恢复。"
      @confirm="onDelete"
      @cancel="pendingDelete = null"
    />
  </section>
</template>

<script setup lang="ts">
import type { CreateProjectInput, Project } from "@ai-drama-studio/types";

const store = useProjectStore();
const showForm = ref(false);
const editing = ref<Project | null>(null);
const pendingDelete = ref<Project | null>(null);

onMounted(() => {
  void store.fetchProjects();
});

function openCreate() {
  editing.value = null;
  showForm.value = true;
}

function openEdit(project: Project) {
  editing.value = project;
  showForm.value = true;
}

function closeForm() {
  showForm.value = false;
  editing.value = null;
}

function askDelete(project: Project) {
  pendingDelete.value = project;
}

async function onSubmit(payload: CreateProjectInput) {
  if (editing.value) {
    const updated = await store.updateProject(editing.value.id, payload);
    if (updated) {
      closeForm();
    }
    return;
  }
  const project = await store.createProject(payload);
  if (project) {
    closeForm();
    await navigateTo(`/projects/${project.id}`);
  }
}

async function onDelete() {
  if (!pendingDelete.value) {
    return;
  }
  const ok = await store.deleteProject(pendingDelete.value.id);
  if (ok) {
    pendingDelete.value = null;
  }
}
</script>
