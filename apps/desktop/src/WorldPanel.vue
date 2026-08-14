<template>
  <section class="world">
    <div class="toolbar">
      <label>
        项目
        <select v-model="projectId" @change="loadWorld">
          <option value="">选择项目</option>
          <option v-for="item in projects" :key="item.id" :value="item.id">{{ item.name }}</option>
        </select>
      </label>
      <p v-if="message" class="hint">{{ message }}</p>
    </div>

    <p v-if="!projectId" class="hint">选择一个项目以进入世界观。</p>
    <p v-else-if="loading" class="hint">正在载入…</p>
    <div v-else-if="missing" class="create">
      <p>该项目还没有世界观。</p>
      <input v-model="createTitle" placeholder="世界名称" />
      <button type="button" @click="create">创建世界观</button>
    </div>
    <div v-else-if="world">
      <nav class="tabs">
        <button
          v-for="item in nav"
          :key="item.key"
          type="button"
          :class="{ active: tab === item.key }"
          @click="tab = item.key"
        >
          {{ item.label }}
        </button>
      </nav>

      <div v-if="tab === 'overview' || tab === 'cosmic' || tab === 'conflict'" class="form">
        <label>世界名称<input v-model="form.title" /></label>
        <label>简介<textarea v-model="form.summary" /></label>
        <label>宇宙背景<textarea v-model="form.cosmicBackground" /></label>
        <label>核心冲突<textarea v-model="form.coreConflict" /></label>
        <button type="button" @click="saveWorld">保存</button>
        <button type="button" class="ghost" @click="aiHint">AI生成</button>
      </div>

      <div v-else class="list">
        <p class="hint">{{ emptyText }}</p>
        <article v-for="item in currentItems" :key="item.id">
          <strong>{{ item.title || item.name }}</strong>
          <p>{{ item.description || "暂无简介" }}</p>
        </article>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { API_DEFAULT_BASE_URL } from "@ai-drama-studio/config";
import { ApiError, createApiClient } from "@ai-drama-studio/api-client";
import { getWorldNav } from "@ai-drama-studio/core";
import type { Project, World } from "@ai-drama-studio/types";
import { computed, onMounted, reactive, ref, watch } from "vue";

const api = createApiClient(import.meta.env.VITE_API_BASE || API_DEFAULT_BASE_URL);
const nav = getWorldNav();
const projects = ref<Project[]>([]);
const projectId = ref("");
const world = ref<World | null>(null);
const missing = ref(false);
const loading = ref(false);
const message = ref("");
const tab = ref<(typeof nav)[number]["key"]>("overview");
const createTitle = ref("");
const form = reactive({
  title: "",
  summary: "",
  cosmicBackground: "",
  coreConflict: "",
});
const extraItems = ref<{ id: string; name?: string; title?: string; description: string | null }[]>([]);

const currentItems = computed(() => extraItems.value);
const emptyText = computed(() => {
  if (extraItems.value.length > 0) {
    return "";
  }
  return "该分类暂无条目。完整编辑请使用 Web 工作台。";
});

onMounted(async () => {
  try {
    projects.value = await api.getProjects();
  } catch {
    message.value = "无法加载项目，请先启动 API。";
  }
});

watch(tab, () => {
  void loadExtras();
});

async function loadWorld() {
  world.value = null;
  extraItems.value = [];
  missing.value = false;
  if (!projectId.value) {
    return;
  }
  loading.value = true;
  try {
    world.value = await api.getWorld(projectId.value);
    fillForm();
    await loadExtras();
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      missing.value = true;
      createTitle.value = projects.value.find((item) => item.id === projectId.value)?.name ?? "";
    } else {
      message.value = err instanceof Error ? err.message : "加载失败";
    }
  } finally {
    loading.value = false;
  }
}

function fillForm() {
  if (!world.value) {
    return;
  }
  form.title = world.value.title;
  form.summary = world.value.summary ?? "";
  form.cosmicBackground = world.value.cosmicBackground ?? "";
  form.coreConflict = world.value.coreConflict ?? "";
}

async function loadExtras() {
  if (!projectId.value) {
    return;
  }
  try {
    if (tab.value === "civilizations") {
      extraItems.value = await api.getCivilizations(projectId.value);
    } else if (tab.value === "history") {
      extraItems.value = await api.getWorldHistory(projectId.value);
    } else if (tab.value === "factions") {
      extraItems.value = await api.getFactions(projectId.value);
    } else if (tab.value === "locations") {
      extraItems.value = await api.getWorldLocations(projectId.value);
    } else if (tab.value === "power") {
      extraItems.value = await api.getPowerSystems(projectId.value);
    } else {
      extraItems.value = [];
    }
  } catch (err) {
    message.value = err instanceof Error ? err.message : "加载分类失败";
  }
}

async function create() {
  try {
    world.value = await api.createWorld(projectId.value, {
      title: createTitle.value.trim() || "未命名世界",
    });
    missing.value = false;
    fillForm();
    message.value = "已创建";
  } catch (err) {
    message.value = err instanceof Error ? err.message : "创建失败";
  }
}

async function saveWorld() {
  try {
    world.value = await api.updateWorld(projectId.value, {
      title: form.title.trim(),
      summary: form.summary.trim() || undefined,
      cosmicBackground: form.cosmicBackground.trim() || undefined,
      coreConflict: form.coreConflict.trim() || undefined,
    });
    message.value = "已保存";
  } catch (err) {
    message.value = err instanceof Error ? err.message : "保存失败";
  }
}

function aiHint() {
  message.value = "AI世界观生成将在下一阶段开放。";
}
</script>

<style scoped>
.world {
  max-width: 760px;
}

.toolbar,
.form,
.create {
  display: grid;
  gap: 12px;
}

select,
input,
textarea,
button {
  font: inherit;
  color: inherit;
  background: #121216;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 8px 10px;
}

textarea {
  min-height: 90px;
}

button {
  background: #d4af37;
  color: #070708;
  cursor: pointer;
}

button.ghost,
.tabs button {
  background: transparent;
  color: #d4af37;
}

.tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 16px 0;
}

.tabs button.active {
  background: rgba(212, 175, 55, 0.15);
}

.hint {
  color: #a1a1aa;
}

article {
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  padding: 12px;
  margin-bottom: 8px;
}
</style>
