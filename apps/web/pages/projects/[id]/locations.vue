<template>
  <section class="px-4 py-6 tablet:px-8 desktop:px-8">
    <div class="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div>
        <p class="text-[11px] uppercase tracking-[0.2em] text-gold-400/80">Locations</p>
        <h1 class="mt-1 font-display text-3xl">场景</h1>
        <p class="mt-2 text-sm text-zinc-500">管理故事发生的地点与空间氛围，供剧集规划、剧本与分镜引用。</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <LocationGenerateModal :project-id="projectId" @applied="reload" />
        <button
          type="button"
          class="rounded-xl bg-gold-400 px-3 py-1.5 text-sm font-medium text-ink-950"
          @click="openCreate"
        >
          创建场景
        </button>
      </div>
    </div>

    <PageState
      :loading="store.loading"
      :error="store.error"
      :empty="!store.loading && store.locations.length === 0"
      loading-text="正在载入场景…"
      empty-title="还没有场景"
      empty-description="创建第一个场景，或使用 AI 生成场景。"
      empty-action-label="创建场景"
      :on-retry="reload"
      :on-empty-action="openCreate"
    >
      <p v-if="store.actionError" class="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
        {{ store.actionError }}
      </p>

      <div class="grid gap-4 tablet:grid-cols-2 desktop:grid-cols-3">
        <article
          v-for="item in store.locations"
          :key="item.id"
          class="rounded-2xl border border-white/5 bg-ink-800/60 p-4"
        >
          <h2 class="font-display text-xl text-zinc-100">{{ item.name }}</h2>
          <p class="mt-2 text-sm text-zinc-400">{{ item.description || "暂无描述" }}</p>
          <dl class="mt-3 space-y-1 text-xs text-zinc-500">
            <div v-if="item.environment"><dt class="inline">环境：</dt><dd class="inline text-zinc-300">{{ item.environment }}</dd></div>
            <div v-if="item.atmosphere"><dt class="inline">氛围：</dt><dd class="inline text-zinc-300">{{ item.atmosphere }}</dd></div>
            <div v-if="item.visualStyle"><dt class="inline">视觉风格：</dt><dd class="inline text-zinc-300">{{ item.visualStyle }}</dd></div>
          </dl>
          <div v-if="item.tags.length" class="mt-3 flex flex-wrap gap-1">
            <span
              v-for="tag in item.tags"
              :key="tag"
              class="rounded-full border border-white/10 px-2 py-0.5 text-[11px] text-zinc-400"
            >
              {{ tag }}
            </span>
          </div>
          <div class="mt-4 flex gap-2">
            <button type="button" class="rounded-xl border border-white/10 px-3 py-1.5 text-sm" @click="openEdit(item)">
              编辑
            </button>
            <button type="button" class="rounded-xl border border-red-500/30 px-3 py-1.5 text-sm text-red-300" @click="confirmDelete(item)">
              删除
            </button>
          </div>
        </article>
      </div>
    </PageState>

    <AppModal
      :open="showForm"
      :title="editing ? '编辑场景' : '创建场景'"
      description="创建项目级场景资产，供剧集规划、剧本与分镜复用。"
      @close="showForm = false"
    >
      <form class="space-y-3" @submit.prevent="onSave">
        <input v-model="form.name" required class="studio-field" placeholder="场景名称" />
        <textarea v-model="form.description" rows="3" class="studio-field resize-none" placeholder="描述" />
        <input v-model="form.environment" class="studio-field" placeholder="环境" />
        <input v-model="form.atmosphere" class="studio-field" placeholder="氛围" />
        <input v-model="form.visualStyle" class="studio-field" placeholder="视觉风格" />
        <input v-model="form.tags" class="studio-field" placeholder="标签，逗号分隔" />
        <button type="submit" class="rounded-xl bg-gold-400 px-4 py-2 text-sm font-medium text-ink-950" :disabled="store.saving">
          保存
        </button>
      </form>
    </AppModal>

    <ConfirmDialog
      :open="Boolean(pendingDelete)"
      title="删除这个场景？"
      message="删除后不会自动修改已有剧本或分镜，但引用关系会失效。"
      @confirm="onDelete"
      @cancel="pendingDelete = null"
    />
  </section>
</template>

<script setup lang="ts">
import type { Location } from "@ai-drama-studio/types";
import { onMounted, reactive, ref } from "vue";
import { useCurrentProject } from "~/composables/useCurrentProject";
import { useLocationStore } from "~/stores/location";

const { projectId } = useCurrentProject();
const store = useLocationStore();
const showForm = ref(false);
const editing = ref<Location | null>(null);
const pendingDelete = ref<Location | null>(null);
const form = reactive({
  name: "",
  description: "",
  environment: "",
  atmosphere: "",
  visualStyle: "",
  tags: "",
});

function openCreate() {
  editing.value = null;
  form.name = "";
  form.description = "";
  form.environment = "";
  form.atmosphere = "";
  form.visualStyle = "";
  form.tags = "";
  showForm.value = true;
}

function openEdit(item: Location) {
  editing.value = item;
  form.name = item.name;
  form.description = item.description || "";
  form.environment = item.environment || "";
  form.atmosphere = item.atmosphere || "";
  form.visualStyle = item.visualStyle || "";
  form.tags = item.tags.join(", ");
  showForm.value = true;
}

function parseTags(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

async function reload() {
  await store.load(projectId.value);
}

async function onSave() {
  const payload = {
    name: form.name.trim(),
    description: form.description.trim() || undefined,
    environment: form.environment.trim() || undefined,
    atmosphere: form.atmosphere.trim() || undefined,
    visualStyle: form.visualStyle.trim() || undefined,
    tags: parseTags(form.tags),
  };
  const result = editing.value
    ? await store.update(projectId.value, editing.value.id, payload)
    : await store.create(projectId.value, payload);
  if (result) {
    showForm.value = false;
  }
}

function confirmDelete(item: Location) {
  pendingDelete.value = item;
}

async function onDelete() {
  if (!pendingDelete.value) {
    return;
  }
  const ok = await store.remove(projectId.value, pendingDelete.value.id);
  if (ok) {
    pendingDelete.value = null;
  }
}

onMounted(() => {
  void reload();
});
</script>
