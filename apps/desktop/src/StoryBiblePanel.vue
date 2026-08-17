<template>
  <section class="panel">
    <div class="toolbar">
      <label>
        项目
        <select v-model="projectId" @change="load">
          <option value="">选择项目</option>
          <option v-for="item in projects" :key="item.id" :value="item.id">{{ item.name }}</option>
        </select>
      </label>
      <p v-if="message" class="hint">{{ message }}</p>
    </div>
    <p v-if="!projectId" class="hint">选择一个项目以查看故事圣经。</p>
    <p v-else-if="loading" class="hint">正在载入…</p>
    <div v-else class="form">
      <p class="hint">复杂 AI 生成请使用 Web 工作台。</p>
      <label>作品名称<input v-model="form.title" /></label>
      <label>故事一句话<textarea v-model="form.logline" /></label>
      <label>故事前提<textarea v-model="form.premise" /></label>
      <label>主题<input v-model="form.theme" /></label>
      <button type="button" @click="save">{{ missing ? "创建" : "保存" }}</button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { API_DEFAULT_BASE_URL } from "@ai-drama-studio/config";
import { ApiError, createApiClient } from "@ai-drama-studio/api-client";
import type { Project } from "@ai-drama-studio/types";
import { onMounted, reactive, ref } from "vue";

const api = createApiClient(import.meta.env.VITE_API_BASE || API_DEFAULT_BASE_URL);
const projects = ref<Project[]>([]);
const projectId = ref("");
const loading = ref(false);
const missing = ref(false);
const message = ref("");
const form = reactive({ title: "", logline: "", premise: "", theme: "" });

onMounted(async () => {
  try {
    projects.value = await api.getProjects();
  } catch {
    message.value = "无法加载项目，请先启动 API。";
  }
});

async function load() {
  if (!projectId.value) {
    return;
  }
  loading.value = true;
  missing.value = false;
  try {
    const bible = await api.getStoryBible(projectId.value);
    form.title = bible.title;
    form.logline = bible.logline || "";
    form.premise = bible.premise || "";
    form.theme = bible.theme || "";
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.code === "STORY_BIBLE_NOT_FOUND")) {
      missing.value = true;
      form.title = "";
      form.logline = "";
      form.premise = "";
      form.theme = "";
    } else {
      message.value = err instanceof Error ? err.message : "加载失败";
    }
  } finally {
    loading.value = false;
  }
}

async function save() {
  try {
    const payload = {
      title: form.title.trim() || "未命名作品",
      logline: form.logline,
      premise: form.premise,
      theme: form.theme,
    };
    if (missing.value) {
      await api.createStoryBible(projectId.value, payload);
      missing.value = false;
    } else {
      await api.updateStoryBible(projectId.value, payload);
    }
    message.value = "已保存。AI 生成请使用 Web。";
  } catch (err) {
    message.value = err instanceof Error ? err.message : "保存失败";
  }
}
</script>

<style scoped>
.panel { max-width: 720px; }
.toolbar, .form { display: grid; gap: 12px; }
select, input, textarea, button { font: inherit; color: inherit; background: #121216; border: 1px solid rgba(255,255,255,.1); border-radius: 8px; padding: 8px 10px; }
button { background: #d4af37; color: #070708; cursor: pointer; }
.hint { color: #a1a1aa; }
label { display: grid; gap: 6px; }
</style>
