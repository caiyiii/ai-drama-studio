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
    <p v-if="!projectId" class="hint">选择一个项目以查看分镜。</p>
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
        <p class="hint">这一集还没有分镜。复杂 AI Storyboard Generation 请使用 Web 工作台。</p>
      </article>
      <article v-else-if="storyboard" class="board">
        <h2>{{ storyboard.title }}</h2>
        <p class="hint">
          {{ storyboard.status }} · v{{ storyboard.version }} · {{ totalDuration }}s
          <span v-if="storyboard.stale"> · 剧本已更新，当前分镜可能已过期</span>
        </p>
        <p class="hint">AI 生成请使用 Web。此处提供 Scene / Shot List / Inspector 基础编辑。</p>
        <div class="workbench">
          <section>
            <h3>Scenes</h3>
            <button
              v-for="sceneId in sceneIds"
              :key="sceneId"
              type="button"
              :class="{ active: selectedSceneId === sceneId }"
              @click="selectedSceneId = sceneId"
            >
              {{ sceneId.slice(-6) }}
            </button>
          </section>
          <section>
            <h3>Shots</h3>
            <button
              v-for="shot in visibleShots"
              :key="shot.id"
              type="button"
              :class="{ active: selectedShot?.id === shot.id }"
              @click="selectShot(shot.id)"
            >
              Shot {{ String(shot.shotNumber).padStart(3, "0") }} · {{ shot.shotSize }} · {{ shot.durationSeconds }}s
            </button>
          </section>
          <section v-if="selectedShot">
            <h3>Inspector</h3>
            <p class="hint">{{ selectedShot.shotType }} · {{ selectedShot.cameraMovement }} · {{ selectedShot.cameraAngle }}</p>
            <textarea v-model="visualDescription" />
            <input v-model.number="durationSeconds" type="number" min="1" />
            <textarea v-model="imagePrompt" placeholder="Image Prompt" />
            <textarea v-model="videoPrompt" placeholder="Video Prompt" />
            <button type="button" @click="saveShot">保存镜头</button>
          </section>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { API_DEFAULT_BASE_URL } from "@ai-drama-studio/config";
import { ApiError, createApiClient } from "@ai-drama-studio/api-client";
import type { Episode, Project, Storyboard, StoryboardShot } from "@ai-drama-studio/types";
import { computed, onMounted, ref } from "vue";

const api = createApiClient(import.meta.env.VITE_API_BASE || API_DEFAULT_BASE_URL);
const projects = ref<Project[]>([]);
const projectId = ref("");
const episodes = ref<Episode[]>([]);
const episodeId = ref("");
const storyboard = ref<Storyboard | null>(null);
const missing = ref(false);
const loading = ref(false);
const message = ref("");
const selectedSceneId = ref<string | null>(null);
const selectedShotId = ref<string | null>(null);
const visualDescription = ref("");
const durationSeconds = ref(4);
const imagePrompt = ref("");
const videoPrompt = ref("");

const shots = computed(() => storyboard.value?.shots ?? []);
const sceneIds = computed(
  () => [...new Set(shots.value.map((item) => item.sceneId).filter(Boolean))] as string[],
);
const visibleShots = computed(() =>
  selectedSceneId.value
    ? shots.value.filter((item) => item.sceneId === selectedSceneId.value)
    : shots.value,
);
const selectedShot = computed(
  () => shots.value.find((item) => item.id === selectedShotId.value) ?? visibleShots.value[0] ?? null,
);
const totalDuration = computed(
  () =>
    storyboard.value?.totalDurationSeconds ??
    shots.value.reduce((sum, item) => sum + item.durationSeconds, 0),
);

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
  storyboard.value = null;
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
    storyboard.value = await api.getEpisodeStoryboard(projectId.value, id);
    selectedSceneId.value = storyboard.value.shots?.[0]?.sceneId ?? null;
    selectShot(storyboard.value.shots?.[0]?.id ?? null);
  } catch (err) {
    storyboard.value = null;
    if (err instanceof ApiError && (err.status === 404 || err.code === "STORYBOARD_NOT_FOUND")) {
      missing.value = true;
    } else {
      message.value = err instanceof Error ? err.message : "加载分镜失败";
    }
  }
}

function selectShot(id: string | null) {
  selectedShotId.value = id;
  const shot: StoryboardShot | null =
    shots.value.find((item) => item.id === id) ?? visibleShots.value[0] ?? null;
  visualDescription.value = shot?.visualDescription || "";
  durationSeconds.value = shot?.durationSeconds || 4;
  imagePrompt.value = shot?.imagePrompt || "";
  videoPrompt.value = shot?.videoPrompt || "";
}

async function saveShot() {
  if (!episodeId.value || !selectedShot.value) {
    return;
  }
  await api.updateStoryboardShot(projectId.value, episodeId.value, selectedShot.value.id, {
    visualDescription: visualDescription.value,
    durationSeconds: durationSeconds.value,
    imagePrompt: imagePrompt.value,
    videoPrompt: videoPrompt.value,
  });
  await selectEpisode(episodeId.value);
  message.value = "镜头已保存。";
}
</script>

<style scoped>
.panel { max-width: 1100px; }
.toolbar, aside { display: grid; gap: 8px; }
.layout { display: grid; grid-template-columns: 220px 1fr; gap: 20px; }
.workbench { display: grid; grid-template-columns: 160px 220px 1fr; gap: 16px; margin-top: 16px; }
select, input, textarea, button { font: inherit; color: inherit; background: #121216; border: 1px solid rgba(255,255,255,.1); border-radius: 8px; padding: 8px 10px; }
button { background: #d4af37; color: #070708; cursor: pointer; }
aside button, .workbench button { display: block; width: 100%; background: transparent; color: #e4e4e7; text-align: left; margin-bottom: 6px; }
aside button.active, .workbench button.active { border-color: rgba(212,175,55,.5); }
.hint { color: #a1a1aa; }
textarea { min-height: 72px; width: 100%; }
</style>
