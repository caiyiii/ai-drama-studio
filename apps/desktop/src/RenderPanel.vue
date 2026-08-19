<template>
  <section class="panel">
    <p class="hint">这是最终 Episode MP4 Render。浏览器合成预览不是最终视频导出。</p>
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
    <p v-else-if="renderHint" class="hint">{{ renderHint }}</p>
    <div class="actions">
      <button type="button" :disabled="!canRender" @click="onRender">
        {{ canRender ? "Render Episode" : "请先锁定时间线" }}
      </button>
      <button type="button" :disabled="!activeRunning" @click="onCancel">取消</button>
      <button type="button" :disabled="!latestFailed" @click="onRetry">重试</button>
    </div>
    <article v-for="job in jobs" :key="job.id" class="card">
      <p>v{{ job.timelineVersion }} · {{ job.status }} · {{ job.currentStage }}</p>
      <p class="hint">
        <template v-if="job.progress == null && (job.status === 'RENDERING' || job.status === 'PREPARING')">
          Rendering…
        </template>
        <template v-else>进度 {{ job.progress ?? 0 }}%</template>
      </p>
      <p v-if="job.errorMessage" class="hint">{{ job.errorCode }} · {{ job.errorMessage }}</p>
      <video v-if="job.artifact?.url" :src="job.artifact.url" controls class="preview" />
    </article>
  </section>
</template>

<script setup lang="ts">
import { API_DEFAULT_BASE_URL } from "@ai-drama-studio/config";
import { createApiClient } from "@ai-drama-studio/api-client";
import { isEpisodeReadyForRender } from "@ai-drama-studio/core";
import {
  type Episode,
  type EpisodeProductionInput,
  type EpisodeTimeline,
  type Project,
  type RenderJob,
  EpisodeStatus,
} from "@ai-drama-studio/types";
import { computed, onMounted, onUnmounted, ref } from "vue";

const api = createApiClient(import.meta.env.VITE_API_BASE || API_DEFAULT_BASE_URL);
const projectId = ref("");
const episodeId = ref("");
const projects = ref<Project[]>([]);
const episodes = ref<Episode[]>([]);
const jobs = ref<RenderJob[]>([]);
const timelineSummary = ref<Pick<EpisodeTimeline, "status" | "computedStatus" | "stale"> | null>(null);
const message = ref("");
let poll: ReturnType<typeof setInterval> | null = null;

const productionInput = computed<EpisodeProductionInput>(() => ({
  episode: episodeId.value
    ? { id: episodeId.value, status: EpisodeStatus.IN_PRODUCTION }
    : null,
  timeline: timelineSummary.value,
}));
const canRender = computed(() => Boolean(projectId.value && episodeId.value && isEpisodeReadyForRender(productionInput.value)));
const activeRunning = computed(() =>
  jobs.value.some((item) =>
    ["QUEUED", "PREPARING", "RENDERING", "CANCEL_REQUESTED"].includes(item.status),
  ),
);
const latestFailed = computed(() => jobs.value.find((item) => item.status === "FAILED") || null);
const renderHint = computed(() => {
  if (!episodeId.value) {
    return "";
  }
  if (!timelineSummary.value) {
    return "当前剧集还没有时间线，请先在 Timeline 工作台构建。";
  }
  if (timelineSummary.value.stale) {
    return "当前时间线已经过期，请先回 Timeline 工作台重新检查并锁定。";
  }
  if (!canRender.value) {
    return "请先锁定时间线，再开始成片 Render。";
  }
  return "";
});

async function loadProjects() {
  projects.value = await api.getProjects();
}

async function loadEpisodes() {
  episodeId.value = "";
  jobs.value = [];
  timelineSummary.value = null;
  if (!projectId.value) {
    episodes.value = [];
    return;
  }
  episodes.value = await api.getProjectEpisodes(projectId.value);
}

async function load() {
  jobs.value = [];
  timelineSummary.value = null;
  message.value = "";
  if (!projectId.value || !episodeId.value) {
    return;
  }
  try {
    const timeline = await api.getEpisodeTimeline(projectId.value, episodeId.value);
    timelineSummary.value = {
      status: timeline.status,
      computedStatus: timeline.computedStatus ?? timeline.status,
      stale: timeline.stale ?? false,
    };
    jobs.value = await api.getRenderJobs(projectId.value, episodeId.value);
  } catch (error) {
    message.value = error instanceof Error ? error.message : "加载失败";
  }
}

async function onRender() {
  const job = await api.createRenderJob(projectId.value, episodeId.value);
  jobs.value = [job, ...jobs.value.filter((item) => item.id !== job.id)];
}

async function onCancel() {
  const running = jobs.value.find((item) =>
    ["QUEUED", "PREPARING", "RENDERING"].includes(item.status),
  );
  if (!running) return;
  await api.cancelRenderJob(projectId.value, running.id);
  await load();
}

async function onRetry() {
  if (!latestFailed.value) return;
  const job = await api.retryRenderJob(projectId.value, latestFailed.value.id);
  jobs.value = [job, ...jobs.value.filter((item) => item.id !== job.id)];
}

onMounted(async () => {
  await loadProjects();
  poll = setInterval(() => {
    if (activeRunning.value) {
      void load();
    }
  }, 2500);
});

onUnmounted(() => {
  if (poll) clearInterval(poll);
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
.actions {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}
.card {
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  padding: 12px;
  margin-bottom: 12px;
}
.preview {
  width: 100%;
  margin-top: 8px;
  background: #000;
}
</style>
