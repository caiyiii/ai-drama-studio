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
    <p v-if="!projectId" class="hint">选择一个项目以查看剧本。</p>
    <p v-else-if="loading" class="hint">正在载入…</p>
    <div v-else class="layout">
      <aside>
        <button
          v-for="item in episodes"
          :key="item.id"
          type="button"
          :class="{ active: episodeId === item.id }"
          @click="selectEpisode(item.id)"
        >
          E{{ String(item.number).padStart(2, "0") }} {{ item.title }}
        </button>
      </aside>
      <article v-if="missing">
        <p class="hint">这一集还没有剧本。复杂 AI Script Generation 请使用 Web 工作台。</p>
      </article>
      <article v-else-if="script">
        <h2>{{ script.title }}</h2>
        <p class="hint">{{ script.status }} · v{{ script.version }} · AI 生成请使用 Web。</p>
        <input v-model="title" />
        <textarea v-model="summary" />
        <button type="button" @click="saveScript">保存剧本信息</button>
        <section v-for="scene in script.scenes || []" :key="scene.id" class="scene">
          <h3>Scene {{ scene.number }} {{ scene.title }}</h3>
          <p class="hint">{{ scene.location }} · {{ scene.timeOfDay }}</p>
          <div v-for="block in scene.blocks || []" :key="block.id" class="block">
            <strong>{{ block.type }}</strong>
            <span v-if="block.character"> · {{ block.character.name }}</span>
            <textarea :value="block.content" @change="saveBlock(scene.id, block.id, ($event.target as HTMLTextAreaElement).value)" />
          </div>
        </section>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { API_DEFAULT_BASE_URL } from "@ai-drama-studio/config";
import { ApiError, createApiClient } from "@ai-drama-studio/api-client";
import type { Episode, Project, Script } from "@ai-drama-studio/types";
import { onMounted, ref } from "vue";

const api = createApiClient(import.meta.env.VITE_API_BASE || API_DEFAULT_BASE_URL);
const projects = ref<Project[]>([]);
const projectId = ref("");
const episodes = ref<Episode[]>([]);
const episodeId = ref("");
const script = ref<Script | null>(null);
const missing = ref(false);
const loading = ref(false);
const message = ref("");
const title = ref("");
const summary = ref("");

onMounted(async () => {
  try {
    projects.value = await api.getProjects();
  } catch {
    message.value = "无法加载项目，请先启动 API。";
  }
});

async function load() {
  episodes.value = [];
  episodeId.value = "";
  script.value = null;
  if (!projectId.value) {
    return;
  }
  loading.value = true;
  try {
    episodes.value = await api.getProjectEpisodes(projectId.value);
    episodeId.value = episodes.value[0]?.id ?? "";
    if (episodeId.value) {
      await selectEpisode(episodeId.value);
    }
  } catch (err) {
    message.value = err instanceof Error ? err.message : "加载失败";
  } finally {
    loading.value = false;
  }
}

async function selectEpisode(id: string) {
  episodeId.value = id;
  missing.value = false;
  try {
    script.value = await api.getScript(projectId.value, id);
    title.value = script.value.title;
    summary.value = script.value.summary || "";
  } catch (err) {
    script.value = null;
    if (err instanceof ApiError && (err.status === 404 || err.code === "SCRIPT_NOT_FOUND")) {
      missing.value = true;
    } else {
      message.value = err instanceof Error ? err.message : "加载剧本失败";
    }
  }
}

async function saveScript() {
  if (!episodeId.value) {
    return;
  }
  script.value = await api.updateScript(projectId.value, episodeId.value, {
    title: title.value,
    summary: summary.value,
  });
  message.value = "剧本已保存。";
}

async function saveBlock(sceneId: string, blockId: string, content: string) {
  if (!episodeId.value) {
    return;
  }
  await api.updateScriptBlock(projectId.value, episodeId.value, sceneId, blockId, { content });
  await selectEpisode(episodeId.value);
  message.value = "段落已保存。";
}
</script>

<style scoped>
.panel { max-width: 960px; }
.toolbar, aside { display: grid; gap: 8px; }
.layout { display: grid; grid-template-columns: 220px 1fr; gap: 20px; }
select, input, textarea, button { font: inherit; color: inherit; background: #121216; border: 1px solid rgba(255,255,255,.1); border-radius: 8px; padding: 8px 10px; }
button { background: #d4af37; color: #070708; cursor: pointer; }
aside button { display: block; width: 100%; background: transparent; color: #e4e4e7; text-align: left; }
aside button.active { border-color: rgba(212,175,55,.5); }
.hint { color: #a1a1aa; }
.scene { margin-top: 16px; }
.block { margin-top: 8px; }
textarea { min-height: 72px; width: 100%; }
</style>
