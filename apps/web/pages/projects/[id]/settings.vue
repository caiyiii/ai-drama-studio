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
              <p class="mt-1 text-xs text-zinc-500">
                图片、视频、图生视频、语音可以分别使用不同 Provider。
              </p>
              <p class="mt-2 text-xs text-zinc-500">
                默认 Provider 仅用于开发 / Demo。正式生产建议配置自己的 Provider。
              </p>
              <p class="mt-1 text-xs text-zinc-500">
                视频生成将使用当前项目配置的 AI Provider，费用由该 Provider 账户承担。
              </p>
              <p class="mt-1 text-xs text-zinc-500">
                语音生成费用由当前项目配置的 Provider 账户承担。
              </p>
            </div>
            <NuxtLink
              to="/ai-providers"
              class="rounded-xl border border-white/10 px-3 py-1.5 text-sm text-zinc-300 hover:border-gold-400/40"
            >
              管理 Providers
            </NuxtLink>
          </div>

          <div class="mt-5 space-y-3">
            <article
              v-for="item in aiStore.capabilities"
              :id="item.capability"
              :key="item.capability"
              class="rounded-xl border border-white/5 bg-ink-900/50 p-4"
              :class="highlightCapability === item.capability ? 'ring-1 ring-gold-400/50' : ''"
            >
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 class="text-sm font-medium text-zinc-100">{{ item.label }}</h3>
                  <p class="mt-1 text-xs text-zinc-500">
                    {{ capabilitySummary(item.capability) }}
                  </p>
                </div>
                <span
                  class="rounded-full px-2 py-0.5 text-[11px]"
                  :class="item.implemented ? 'border border-emerald-400/20 text-emerald-300' : 'border border-white/10 text-zinc-500'"
                >
                  {{ item.implemented ? "已实现" : "架构预留" }}
                </span>
              </div>
              <div class="mt-3 flex flex-col gap-2 tablet:flex-row tablet:items-center">
                <StudioSelect
                  v-model="capabilitySelection[item.capability]"
                  class="w-full tablet:max-w-sm"
                  :disabled="!item.implemented"
                  :options="capabilityProviderOptions(item.capability)"
                />
                <button
                  v-if="item.implemented"
                  type="button"
                  :disabled="aiStore.saving"
                  class="rounded-xl border border-white/10 px-3 py-1.5 text-sm disabled:opacity-40"
                  @click="onSaveCapability(item.capability)"
                >
                  {{ capabilityConfigured(item.capability) ? "更新" : "配置" }}
                </button>
                <span v-else class="text-xs text-zinc-500">Coming Soon</span>
              </div>
            </article>
          </div>

          <p v-if="aiStore.error" class="mt-4 text-sm text-red-300">{{ aiStore.error }}</p>

          <div class="mt-6 border-t border-white/5 pt-5">
            <h3 class="text-sm font-medium text-zinc-200">兼容：项目默认文本 Provider</h3>
            <p class="mt-1 text-xs text-zinc-500">
              用于 CHAT / STRUCTURED_OUTPUT 的旧版回退。未单独配置能力时仍会使用它。
            </p>
            <dl class="mt-3 space-y-2 text-sm text-zinc-400">
              <div class="flex justify-between gap-3">
                <dt>当前</dt>
                <dd class="text-zinc-100">{{ currentName }} · {{ currentModel }}</dd>
              </div>
              <div class="flex justify-between gap-3">
                <dt>来源</dt>
                <dd>{{ sourceLabel }}</dd>
              </div>
            </dl>
            <div class="mt-3 flex flex-col gap-3 tablet:flex-row tablet:items-center">
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
  AiCapability,
  type CreateProjectInput,
} from "@ai-drama-studio/types";
import { useCurrentProject } from "~/composables/useCurrentProject";
import { useAiProviderStore } from "~/stores/ai-provider";

const { store, project, loading, error, ensureProject, projectId } = useCurrentProject();
const aiStore = useAiProviderStore();
const route = useRoute();
const pendingDelete = ref(false);
const selectedId = ref("");
const capabilitySelection = reactive<Record<string, string>>({});
const highlightCapability = ref("");
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
const currentModel = computed(() => resolved.value?.provider.model ?? "—");
const sourceLabel = computed(() => {
  const source = resolved.value?.source;
  if (source === "project") return "项目指定";
  if (source === "user") return "用户 Provider";
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
    aiStore.loadCapabilities(),
    aiStore.loadProjectAiConfig(projectId.value),
  ]);
  selectedId.value = aiStore.projectConfig?.aiProviderId ?? "";
  syncCapabilitySelection();
  const hash = String(route.hash || "").replace("#", "");
  if (hash) {
    highlightCapability.value = hash;
    await nextTick();
    document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }
});

function syncCapabilitySelection() {
  const config = aiStore.projectAiConfig;
  if (!config) {
    return;
  }
  for (const item of aiStore.capabilities) {
    const summary = config[item.capability];
    capabilitySelection[item.capability] =
      summary?.source === "PROJECT" ? summary.providerId ?? "" : "";
  }
}

function capabilityConfigured(capability: AiCapability) {
  return Boolean(aiStore.projectAiConfig?.[capability]?.configured);
}

function capabilitySummary(capability: AiCapability) {
  const summary = aiStore.projectAiConfig?.[capability];
  if (!summary?.configured) {
    if (capability === AiCapability.IMAGE) {
      return "尚未配置图片生成 AI";
    }
    if (capability === AiCapability.VIDEO || capability === AiCapability.IMAGE_TO_VIDEO) {
      return "尚未配置视频生成 AI。平台默认 Provider 不支持视频生成，请配置自己的 Video Provider。";
    }
    if (capability === AiCapability.TTS) {
      return "尚未配置语音生成 AI。平台默认文本 Provider 不支持 TTS，请配置自己的语音 Provider。";
    }
    return "未配置，将使用自动回退";
  }
  const source =
    summary.source === "PROJECT"
      ? "项目配置"
      : summary.source === "USER"
        ? "用户 Provider"
        : summary.source === "PLATFORM"
          ? "平台默认"
          : "系统 .env";
  return `${summary.providerName ?? "未命名"} · ${summary.model ?? "—"} · ${source}`;
}

function capabilityProviderOptions(capability: AiCapability) {
  const compatible = aiStore.providers.filter((item) =>
    item.capabilities?.includes(capability),
  );
  return [
    { value: "", label: "自动回退" },
    ...compatible.map((item) => ({
      value: item.id,
      label: `${item.name} · ${item.model}`,
    })),
  ];
}

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
    await aiStore.loadProjectAiConfig(projectId.value);
    syncCapabilitySelection();
  }
}

async function onSaveCapability(capability: AiCapability) {
  if (!projectId.value) {
    return;
  }
  const next = capabilitySelection[capability]?.trim() || "";
  if (!next) {
    await aiStore.clearProjectAiCapability(projectId.value, capability);
  } else {
    const provider = aiStore.providers.find((item) => item.id === next);
    await aiStore.setProjectAiCapability(
      projectId.value,
      capability,
      next,
      provider?.model ?? null,
    );
  }
  syncCapabilitySelection();
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
