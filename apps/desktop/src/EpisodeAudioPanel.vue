<template>
  <section class="panel">
    <p class="hint">可播放已生成的剧集 {{ kind === "music" ? "音乐" : "音效" }}。复杂 AI 生成请使用 Web 工作台。</p>
    <label>
      项目
      <select v-model="projectId" @change="load">
        <option value="">选择项目</option>
        <option v-for="item in projects" :key="item.id" :value="item.id">{{ item.name }}</option>
      </select>
    </label>
    <p v-if="message" class="hint">{{ message }}</p>
    <article v-for="item in items" :key="item.id" class="card">
      <p>{{ item.asset?.name || "未命名" }} {{ item.isPrimary ? "· Final" : "" }}</p>
      <audio v-if="item.asset?.url" :src="item.asset.url" controls />
    </article>
  </section>
</template>

<script setup lang="ts">
import { API_DEFAULT_BASE_URL } from "@ai-drama-studio/config";
import { createApiClient } from "@ai-drama-studio/api-client";
import type { EpisodeAudioAsset, Project } from "@ai-drama-studio/types";
import { onMounted, ref, watch } from "vue";

const props = defineProps<{
  kind: "music" | "sfx";
}>();

const api = createApiClient(import.meta.env.VITE_API_BASE || API_DEFAULT_BASE_URL);
const projectId = ref("");
const projects = ref<Project[]>([]);
const items = ref<EpisodeAudioAsset[]>([]);
const message = ref("");

async function loadProjects() {
  projects.value = await api.getProjects();
}

async function load() {
  if (!projectId.value) {
    items.value = [];
    return;
  }
  message.value = "";
  try {
    items.value =
      props.kind === "music"
        ? await api.getMusicAssets(projectId.value)
        : await api.getSfxAssets(projectId.value);
    if (items.value.length === 0) {
      message.value = "还没有资产。复杂生成请使用 Web。";
    }
  } catch (error) {
    message.value = error instanceof Error ? error.message : "加载失败";
  }
}

watch(
  () => props.kind,
  () => {
    void load();
  },
);

onMounted(async () => {
  await loadProjects();
});
</script>

<style scoped>
.panel {
  max-width: 720px;
}
.hint,
label {
  color: #a1a1aa;
  display: block;
  margin-bottom: 12px;
}
select {
  margin-left: 8px;
}
.card {
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  padding: 12px;
  margin-bottom: 12px;
}
audio {
  width: 100%;
  margin-top: 8px;
}
</style>
