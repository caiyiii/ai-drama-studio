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
    <p v-if="!projectId" class="hint">选择一个项目以查看季与剧集。</p>
    <p v-else-if="loading" class="hint">正在载入…</p>
    <div v-else class="layout">
      <aside>
        <button
          v-for="item in seasons"
          :key="item.id"
          type="button"
          :class="{ active: seasonId === item.id }"
          @click="selectSeason(item.id)"
        >
          <strong>S{{ item.number }} {{ item.title }}</strong>
        </button>
        <input v-model="newSeasonTitle" placeholder="新季标题" />
        <button type="button" @click="createSeason">创建季</button>
      </aside>
      <article v-if="season">
        <h2>{{ season.title }}</h2>
        <p class="hint">AI 拆集请使用 Web 工作台。</p>
        <textarea v-model="synopsis" />
        <button type="button" @click="saveSeason">保存季简介</button>
        <h3>剧集</h3>
        <button
          v-for="item in episodes"
          :key="item.id"
          type="button"
          class="episode"
          :class="{ active: episodeId === item.id }"
          @click="selectEpisode(item.id)"
        >
          E{{ String(item.number).padStart(2, "0") }} {{ item.title }}
        </button>
        <div v-if="episode">
          <h3>{{ episode.title }}</h3>
          <p v-if="episodeNextStep" class="hint">
            下一步：{{ episodeNextStep.label }} · {{ episodeNextStep.description }}
          </p>
          <textarea v-model="outline" />
          <button type="button" @click="saveEpisode">保存大纲</button>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { API_DEFAULT_BASE_URL } from "@ai-drama-studio/config";
import { createApiClient } from "@ai-drama-studio/api-client";
import type { Episode, EpisodeNextAction, EpisodeOverview, Project, Season } from "@ai-drama-studio/types";
import { computed, onMounted, ref } from "vue";

const api = createApiClient(import.meta.env.VITE_API_BASE || API_DEFAULT_BASE_URL);
const projects = ref<Project[]>([]);
const projectId = ref("");
const seasons = ref<Season[]>([]);
const episodes = ref<Episode[]>([]);
const seasonId = ref("");
const episodeId = ref("");
const loading = ref(false);
const message = ref("");
const newSeasonTitle = ref("");
const synopsis = ref("");
const outline = ref("");
const episodeNextStep = ref<EpisodeNextAction | null>(null);

const season = computed(() => seasons.value.find((item) => item.id === seasonId.value) ?? null);
const episode = computed(() => episodes.value.find((item) => item.id === episodeId.value) ?? null);

onMounted(async () => {
  try {
    projects.value = await api.getProjects();
  } catch {
    message.value = "无法加载项目，请先启动 API。";
  }
});

async function load() {
  seasons.value = [];
  episodes.value = [];
  seasonId.value = "";
  episodeId.value = "";
  if (!projectId.value) {
    return;
  }
  loading.value = true;
  try {
    seasons.value = await api.getSeasons(projectId.value);
    seasonId.value = seasons.value[0]?.id ?? "";
    if (seasonId.value) {
      await selectSeason(seasonId.value);
    }
  } catch (err) {
    message.value = err instanceof Error ? err.message : "加载失败";
  } finally {
    loading.value = false;
  }
}

async function selectSeason(id: string) {
  seasonId.value = id;
  episodeId.value = "";
  episodes.value = await api.getEpisodes(projectId.value, id);
  synopsis.value = season.value?.synopsis || "";
  episodeId.value = episodes.value[0]?.id ?? "";
  outline.value = episode.value?.outline || "";
  await loadEpisodeWorkflow();
}

async function selectEpisode(id: string) {
  episodeId.value = id;
  outline.value = episode.value?.outline || "";
  await loadEpisodeWorkflow();
}

async function loadEpisodeWorkflow() {
  if (!projectId.value || !episode.value) {
    episodeNextStep.value = null;
    return;
  }
  const overview = await api.getEpisodeProductionOverview(projectId.value, episode.value.id).catch(
    () => null as EpisodeOverview | null,
  );
  episodeNextStep.value = overview?.nextAction ?? null;
}

async function createSeason() {
  const created = await api.createSeason(projectId.value, {
    number: (seasons.value[seasons.value.length - 1]?.number ?? 0) + 1,
    title: newSeasonTitle.value.trim() || "未命名季",
  });
  seasons.value = [...seasons.value, created];
  newSeasonTitle.value = "";
  await selectSeason(created.id);
}

async function saveSeason() {
  if (!season.value) {
    return;
  }
  const updated = await api.updateSeason(projectId.value, season.value.id, { synopsis: synopsis.value });
  seasons.value = seasons.value.map((item) => (item.id === updated.id ? updated : item));
  message.value = "季已保存。";
}

async function saveEpisode() {
  if (!season.value || !episode.value) {
    return;
  }
  const updated = await api.updateEpisode(projectId.value, season.value.id, episode.value.id, {
    outline: outline.value,
  });
  episodes.value = episodes.value.map((item) => (item.id === updated.id ? updated : item));
  message.value = "剧集已保存。";
}
</script>

<style scoped>
.panel { max-width: 960px; }
.toolbar, aside { display: grid; gap: 8px; }
.layout { display: grid; grid-template-columns: 220px 1fr; gap: 20px; }
select, input, textarea, button { font: inherit; color: inherit; background: #121216; border: 1px solid rgba(255,255,255,.1); border-radius: 8px; padding: 8px 10px; }
button { background: #d4af37; color: #070708; cursor: pointer; }
aside button, .episode { display: block; width: 100%; background: transparent; color: #e4e4e7; text-align: left; margin-bottom: 8px; }
aside button.active, .episode.active { border-color: rgba(212,175,55,.5); }
.hint { color: #a1a1aa; }
textarea { min-height: 88px; width: 100%; }
</style>
