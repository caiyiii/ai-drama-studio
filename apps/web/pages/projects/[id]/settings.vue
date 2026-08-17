<template>
  <section class="mx-auto max-w-3xl px-4 py-6 tablet:px-8 desktop:px-10 desktop:py-8">
    <p class="text-[11px] uppercase tracking-[0.2em] text-gold-400/80">Project Settings</p>
    <h1 class="mt-2 font-display text-4xl">项目设置</h1>
    <p class="mt-2 text-sm text-zinc-500">修改漫剧基础信息，并指定本项目使用的 AI Provider。</p>

    <PageState
      :loading="loading && !project"
      :error="error"
      :empty="!loading && !error && !project"
      loading-text="正在载入项目设置…"
      empty-title="未找到该项目"
      empty-action-label="返回项目列表"
      :on-retry="() => ensureProject()"
      :on-empty-action="() => navigateTo('/projects')"
    >
      <div v-if="project" class="mt-8 space-y-8">
        <article class="rounded-2xl border border-white/5 bg-ink-800/60 p-6">
          <h2 class="font-display text-2xl">基础信息</h2>
          <div class="mt-4">
            <ProjectForm
              :initial-name="project.name"
              :initial-description="project.description"
              :initial-genre="project.genre"
              :saving="store.saving"
              :error="store.error"
              submit-label="保存项目"
              @submit="onUpdate"
              @cancel="() => navigateTo(`/projects/${projectId}`)"
            />
          </div>
        </article>

        <article class="rounded-2xl border border-white/5 bg-ink-800/60 p-6">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 class="font-display text-2xl">AI 配置</h2>
              <p class="mt-1 text-sm text-zinc-500">当前项目 AI Provider。未指定时使用默认或系统 Provider。</p>
            </div>
            <NuxtLink
              to="/ai-providers"
              class="rounded-xl border border-white/10 px-3 py-1.5 text-sm text-zinc-300 hover:border-gold-400/40"
            >
              管理 Providers
            </NuxtLink>
          </div>

          <dl class="mt-5 space-y-2 text-sm text-zinc-400">
            <div class="flex justify-between gap-3">
              <dt>Provider</dt>
              <dd class="text-zinc-100">{{ currentName }}</dd>
            </div>
            <div class="flex justify-between gap-3">
              <dt>类型</dt>
              <dd class="text-zinc-100">{{ currentKind }}</dd>
            </div>
            <div class="flex justify-between gap-3">
              <dt>Model</dt>
              <dd class="text-zinc-100">{{ currentModel }}</dd>
            </div>
            <div class="flex items-center justify-between gap-3">
              <dt>Status</dt>
              <dd class="flex items-center gap-2 text-zinc-100">
                <span class="h-2 w-2 rounded-full" :class="statusClass" />
                {{ currentStatus }}
              </dd>
            </div>
            <div class="flex justify-between gap-3">
              <dt>来源</dt>
              <dd>{{ sourceLabel }}</dd>
            </div>
          </dl>

          <p v-if="aiStore.error" class="mt-4 text-sm text-red-300">{{ aiStore.error }}</p>

          <div class="mt-5 flex flex-col gap-3 tablet:flex-row tablet:items-center">
            <StudioSelect
              v-model="selectedId"
              class="w-full tablet:max-w-sm"
              :options="providerOptions"
            />
            <button
              type="button"
              :disabled="aiStore.saving"
              class="rounded-xl bg-gold-400 px-4 py-2 text-sm font-medium text-ink-950 disabled:opacity-40"
              @click="onChangeProvider"
            >
              {{ aiStore.saving ? "保存中…" : "更换 Provider" }}
            </button>
          </div>
        </article>

        <button
          type="button"
          class="w-full rounded-xl border border-red-500/20 px-4 py-2 text-sm text-red-300 hover:bg-red-500/10"
          @click="pendingDelete = true"
        >
          删除项目
        </button>
      </div>
    </PageState>

    <ConfirmDialog
      :open="pendingDelete"
      :title="deleteTitle"
      message="删除后项目数据将无法恢复。"
      @confirm="onDelete"
      @cancel="pendingDelete = false"
    />
  </section>
</template>

<script setup lang="ts">
import {
  AI_PROVIDER_KIND_LABELS,
  type CreateProjectInput,
} from "@ai-drama-studio/types";
import { useCurrentProject } from "~/composables/useCurrentProject";
import { useAiProviderStore } from "~/stores/ai-provider";

const { store, project, loading, error, ensureProject, projectId } = useCurrentProject();
const aiStore = useAiProviderStore();
const pendingDelete = ref(false);
const selectedId = ref("");
const providerOptions = computed(() => [
  { value: "", label: "使用默认 / 系统 Provider" },
  ...aiStore.providers.map((item) => ({
    value: item.id,
    label: `${item.name} · ${item.model}`,
  })),
]);

const deleteTitle = computed(() =>
  project.value ? `确定删除《${project.value.name}》？` : "确定删除该项目？",
);

const resolved = computed(() => aiStore.projectConfig?.resolved ?? null);
const currentName = computed(() => resolved.value?.provider.name ?? "未配置");
const currentKind = computed(() => {
  const kind = resolved.value?.provider.provider;
  return kind ? AI_PROVIDER_KIND_LABELS[kind] ?? kind : "—";
});
const currentModel = computed(() => resolved.value?.provider.model ?? "—");
const currentStatus = computed(() => {
  if (!resolved.value) {
    return "未配置";
  }
  return resolved.value.provider.hasApiKey ? "已配置" : "缺少 API Key";
});
const statusClass = computed(() =>
  resolved.value?.provider.hasApiKey ? "bg-emerald-400" : "bg-zinc-600",
);
const sourceLabel = computed(() => {
  const source = resolved.value?.source;
  if (source === "project") return "项目指定";
  if (source === "default") return "默认 Provider";
  if (source === "system") return "系统 .env";
  return "无";
});

onMounted(async () => {
  await ensureProject();
  if (!projectId.value) {
    return;
  }
  await Promise.all([
    aiStore.loadProviders(),
    aiStore.loadProjectConfig(projectId.value),
  ]);
  selectedId.value = aiStore.projectConfig?.aiProviderId ?? "";
});

async function onUpdate(payload: CreateProjectInput) {
  if (!projectId.value) {
    return;
  }
  await store.updateProject(projectId.value, payload);
}

async function onChangeProvider() {
  if (!projectId.value) {
    return;
  }
  const next = selectedId.value.trim() ? selectedId.value : null;
  const result = await aiStore.setProjectProvider(projectId.value, next);
  if (result) {
    selectedId.value = result.aiProviderId ?? "";
    await store.fetchProject(projectId.value);
  }
}

async function onDelete() {
  if (!projectId.value) {
    return;
  }
  const ok = await store.deleteProject(projectId.value);
  pendingDelete.value = false;
  if (ok) {
    await navigateTo("/projects");
  }
}
</script>
