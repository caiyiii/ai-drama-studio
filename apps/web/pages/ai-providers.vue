<template>
  <section class="mx-auto max-w-5xl px-4 py-8 tablet:px-8 desktop:px-10">
    <div class="flex flex-col gap-4 tablet:flex-row tablet:items-end tablet:justify-between">
      <div>
        <p class="text-[11px] uppercase tracking-[0.2em] text-gold-400/80">AI Providers</p>
        <h1 class="mt-2 font-display text-4xl text-zinc-100">AI 配置</h1>
        <p class="mt-2 text-sm text-zinc-500">
          API Key 只保存在服务端，并加密存储。前端永远不会看到完整密钥。
        </p>
      </div>
      <button
        type="button"
        class="rounded-xl bg-gold-400 px-4 py-2 text-sm font-medium text-ink-950 hover:bg-gold-300"
        @click="openCreate"
      >
        + 添加 AI Provider
      </button>
    </div>

    <p v-if="store.error" class="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
      {{ store.error }}
    </p>

    <PageState
      :loading="store.loading && store.providers.length === 0"
      :error="null"
      :empty="!store.loading && store.providers.length === 0"
      loading-text="正在载入 AI Provider…"
      empty-title="还没有 AI Provider"
      empty-action-label="添加第一个 Provider"
      :on-empty-action="openCreate"
    >
      <div class="mt-8 grid gap-4 tablet:grid-cols-2">
        <article
          v-for="item in store.providers"
          :key="item.id"
          class="rounded-2xl border border-white/5 bg-ink-800/60 p-5"
        >
          <div class="flex items-start justify-between gap-3">
            <div>
              <h2 class="font-display text-2xl text-zinc-100">{{ item.name }}</h2>
              <p class="mt-1 text-sm text-zinc-500">{{ kindLabel(item.provider) }}</p>
            </div>
            <span
              v-if="item.isDefault"
              class="rounded-full border border-gold-400/30 px-2 py-0.5 text-[11px] text-gold-300"
            >
              默认
            </span>
          </div>
          <dl class="mt-4 space-y-2 text-sm text-zinc-400">
            <div class="flex justify-between gap-3">
              <dt>Model</dt>
              <dd class="text-zinc-200">{{ item.model }}</dd>
            </div>
            <div>
              <dt class="mb-2">支持能力</dt>
              <dd class="flex flex-wrap gap-1.5">
                <span
                  v-for="cap in item.capabilities"
                  :key="cap"
                  class="rounded-full border border-white/10 px-2 py-0.5 text-[11px] text-zinc-300"
                >
                  ✓ {{ capabilityLabel(cap) }}
                </span>
              </dd>
            </div>
            <div class="flex justify-between gap-3">
              <dt>API Key</dt>
              <dd>{{ item.hasApiKey ? "已配置" : "未配置" }}</dd>
            </div>
            <div class="flex items-center justify-between gap-3">
              <dt>状态</dt>
              <dd class="flex items-center gap-2">
                <span
                  class="h-2 w-2 rounded-full"
                  :class="statusDot(item)"
                />
                {{ statusLabel(item) }}
              </dd>
            </div>
          </dl>
          <p
            v-if="store.testResults[item.id] && !store.testResults[item.id]?.success"
            class="mt-3 text-sm text-red-300"
          >
            {{ store.testResults[item.id]?.message }}
          </p>
          <div class="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              class="rounded-xl border border-white/10 px-3 py-1.5 text-sm"
              :disabled="store.testing"
              @click="onTest(item.id)"
            >
              测试连接
            </button>
            <button
              type="button"
              class="rounded-xl border border-white/10 px-3 py-1.5 text-sm"
              @click="openEdit(item)"
            >
              编辑
            </button>
            <button
              v-if="!item.isDefault"
              type="button"
              class="rounded-xl border border-white/10 px-3 py-1.5 text-sm"
              @click="onDefault(item.id)"
            >
              设为默认
            </button>
            <button
              type="button"
              class="rounded-xl border border-red-500/20 px-3 py-1.5 text-sm text-red-300"
              @click="pendingDelete = item"
            >
              删除
            </button>
          </div>
        </article>
      </div>
    </PageState>

    <AiProviderFormModal
      :open="showForm"
      :editing="editing"
      @close="showForm = false"
      @saved="onSaved"
    />

    <ConfirmDialog
      :open="Boolean(pendingDelete)"
      :title="pendingDelete ? `确定删除「${pendingDelete.name}」？` : ''"
      message="删除后需要重新填写 API Key。如果项目正在使用该 Provider，删除会被拒绝。"
      @confirm="onDelete"
      @cancel="pendingDelete = null"
    />
  </section>
</template>

<script setup lang="ts">
import {
  AI_PROVIDER_KIND_LABELS,
  type AIProvider,
  type AIProviderKind,
  type AiCapability,
} from "@ai-drama-studio/types";
import { getAiCapabilityLabel } from "@ai-drama-studio/core";
import { useAiProviderStore } from "~/stores/ai-provider";

const store = useAiProviderStore();
const showForm = ref(false);
const editing = ref<AIProvider | null>(null);
const pendingDelete = ref<AIProvider | null>(null);

onMounted(() => {
  void store.loadProviders();
});

function kindLabel(kind: AIProviderKind) {
  return AI_PROVIDER_KIND_LABELS[kind] ?? kind;
}

function capabilityLabel(capability: AiCapability) {
  return getAiCapabilityLabel(capability);
}

function statusLabel(item: AIProvider) {
  const result = store.testResults[item.id];
  if (result?.success) {
    return "已连接";
  }
  if (result && !result.success) {
    return "连接失败";
  }
  if (!item.enabled) {
    return "已停用";
  }
  return item.hasApiKey ? "已配置" : "未配置";
}

function statusDot(item: AIProvider) {
  const result = store.testResults[item.id];
  if (result?.success) {
    return "bg-emerald-400";
  }
  if (result && !result.success) {
    return "bg-red-400";
  }
  return item.enabled && item.hasApiKey ? "bg-gold-400" : "bg-zinc-600";
}

function openCreate() {
  editing.value = null;
  showForm.value = true;
}

function openEdit(item: AIProvider) {
  editing.value = item;
  showForm.value = true;
}

function onSaved() {
  void store.loadProviders();
}

async function onTest(id: string) {
  await store.testProvider(id);
}

async function onDefault(id: string) {
  await store.updateProvider(id, { isDefault: true });
}

async function onDelete() {
  if (!pendingDelete.value) {
    return;
  }
  const ok = await store.deleteProvider(pendingDelete.value.id);
  pendingDelete.value = null;
  if (!ok) {
    return;
  }
}
</script>
