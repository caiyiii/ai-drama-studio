<template>
  <section class="panel">
    <p class="hint">这是合成预览，不是最终视频导出。复杂时间线编辑请使用 Web 工作台。</p>
    <label>
      项目
      <select v-model="projectId" @change="loadEpisodes">
        <option value="">选择项目</option>
        <option v-for="item in projects" :key="item.id" :value="item.id">{{ item.name }}</option>
      </select>
    </label>
    <label>
      剧集
      <select v-model="episodeId" @change="load">
        <option value="">选择剧集</option>
        <option v-for="item in episodes" :key="item.id" :value="item.id">
          E{{ String(item.number).padStart(2, "0") }} {{ item.title }}
        </option>
      </select>
    </label>
    <p v-if="message" class="hint">{{ message }}</p>
    <div v-if="preview">
      <p class="hint">{{ preview.readyMessage }}</p>
      <video v-if="visualSrc" :src="visualSrc" controls class="preview" />
      <article v-for="track in preview.manifest.tracks" :key="track.id" class="card">
        <p>{{ track.name }} · {{ (track.clips || []).length }} clips {{ track.muted ? "· muted" : "" }}</p>
        <div v-for="clip in track.clips || []" :key="clip.id" class="clip">
          <p>{{ clip.type }} · {{ clip.startTime }}s</p>
          <audio v-if="clip.type === 'AUDIO' && clip.asset?.url" :src="clip.asset.url" controls />
          <label v-if="timelineId">
            启用
            <input
              type="checkbox"
              :checked="clip.enabled"
              @change="onToggle(clip.id, ($event.target as HTMLInputElement).checked)"
            />
          </label>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { API_DEFAULT_BASE_URL } from "@ai-drama-studio/config";
import { createApiClient } from "@ai-drama-studio/api-client";
import type { CompositionPreview, Episode, Project } from "@ai-drama-studio/types";
import { computed, onMounted, ref } from "vue";

const api = createApiClient(import.meta.env.VITE_API_BASE || API_DEFAULT_BASE_URL);
const projectId = ref("");
const episodeId = ref("");
const projects = ref<Project[]>([]);
const episodes = ref<Episode[]>([]);
const preview = ref<CompositionPreview | null>(null);
const timelineId = ref<string | null>(null);
const message = ref("");

const visualSrc = computed(() => {
  const clips = preview.value?.manifest.tracks.flatMap((track) => track.clips) ?? [];
  const video = clips.find((clip) => clip.type === "VIDEO" && clip.asset?.url);
  return video?.asset?.url || clips.find((clip) => clip.type === "IMAGE")?.asset?.url || "";
});

async function loadProjects() {
  projects.value = await api.getProjects();
}

async function loadEpisodes() {
  episodeId.value = "";
  preview.value = null;
  if (!projectId.value) {
    episodes.value = [];
    return;
  }
  episodes.value = await api.getProjectEpisodes(projectId.value);
}

async function load() {
  preview.value = null;
  timelineId.value = null;
  if (!projectId.value || !episodeId.value) {
    return;
  }
  message.value = "";
  try {
    const timeline = await api.getEpisodeTimeline(projectId.value, episodeId.value);
    timelineId.value = timeline.id;
    preview.value = await api.getCompositionPreview(projectId.value, episodeId.value);
  } catch (error) {
    message.value = error instanceof Error ? error.message : "加载失败";
  }
}

async function onToggle(clipId: string, enabled: boolean) {
  if (!projectId.value || !timelineId.value) {
    return;
  }
  await api.updateTimelineClip(projectId.value, timelineId.value, clipId, { enabled });
  await load();
}

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
.preview,
audio {
  width: 100%;
  margin-top: 8px;
}
.clip {
  margin-top: 8px;
}
</style>
