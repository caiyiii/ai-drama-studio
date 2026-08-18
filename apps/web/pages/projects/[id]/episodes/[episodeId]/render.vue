<template>
  <section class="px-4 py-6 tablet:px-8 desktop:px-8">
    <PageState
      :loading="loading"
      :error="error"
      loading-text="正在载入 Render…"
      :on-retry="load"
    >
      <div class="space-y-6">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p class="text-[11px] uppercase tracking-[0.2em] text-gold-400/80">Final Render</p>
            <h1 class="mt-1 font-display text-3xl">Episode MP4 Render</h1>
            <p class="mt-2 text-sm text-zinc-500">这是最终 Episode MP4 Render。浏览器合成预览不是最终视频导出。</p>
            <p v-if="timeline" class="mt-1 text-xs text-zinc-500">
              Timeline v{{ timeline.version }} · {{ statusLabel }} · {{ timeline.resolution }} · {{ timeline.fps }}fps
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <NuxtLink
              :to="`/projects/${projectId}/episodes/${episodeId}/timeline`"
              class="rounded-xl border border-white/10 px-3 py-1.5 text-sm"
            >
              返回时间线
            </NuxtLink>
            <button
              type="button"
              class="rounded-xl bg-gold-400 px-3 py-1.5 text-sm font-medium text-ink-950"
              :disabled="!canRender || creating"
              @click="onRender"
            >
              {{ canRender ? "Render Episode" : "请先锁定时间线" }}
            </button>
            <button
              v-if="activeJob && (activeJob.status === 'QUEUED' || activeJob.status === 'PREPARING' || activeJob.status === 'RENDERING' || activeJob.status === 'CANCEL_REQUESTED')"
              type="button"
              class="rounded-xl border border-white/10 px-3 py-1.5 text-sm"
              @click="onCancel"
            >
              取消
            </button>
            <button
              v-if="latestFailed"
              type="button"
              class="rounded-xl border border-white/10 px-3 py-1.5 text-sm"
              @click="onRetry"
            >
              重试失败任务
            </button>
          </div>
        </div>

        <article v-if="activeJob" class="rounded-2xl border border-white/5 bg-ink-800/60 p-4">
          <p class="text-xs uppercase tracking-widest text-gold-300">{{ jobStatus(activeJob.status) }}</p>
          <p class="mt-1 text-lg text-zinc-100">{{ stageLabel(activeJob.currentStage) }}</p>
          <p class="mt-2 text-sm text-zinc-400">
            <template v-if="activeJob.progress == null && (activeJob.status === 'RENDERING' || activeJob.status === 'PREPARING')">
              Rendering…
            </template>
            <template v-else>
              进度 {{ activeJob.progress ?? 0 }}%
            </template>
          </p>
          <p v-if="activeJob.errorMessage" class="mt-2 text-sm text-rose-300">
            {{ activeJob.errorCode }} · {{ activeJob.errorMessage }}
          </p>
          <div v-if="activeJob.artifact" class="mt-4 space-y-2">
            <p class="text-emerald-300">Episode MP4 Ready</p>
            <video
              :src="artifactSrc(activeJob.artifact.url)"
              controls
              class="w-full max-w-3xl rounded-xl bg-black"
            />
            <a
              :href="artifactSrc(activeJob.artifact.url)"
              class="inline-block rounded-xl border border-white/10 px-3 py-1.5 text-sm"
              download
            >
              Download
            </a>
          </div>
        </article>

        <section class="rounded-2xl border border-white/5 bg-ink-800/60 p-4">
          <h2 class="font-display text-xl">Render History</h2>
          <p v-if="jobs.length === 0" class="mt-3 text-sm text-zinc-500">还没有 Render 记录。</p>
          <ul class="mt-3 space-y-2">
            <li
              v-for="item in jobs"
              :key="item.id"
              class="rounded-xl border border-white/5 px-3 py-2 text-sm"
            >
              <p class="text-zinc-200">
                Version {{ item.timelineVersion }} · {{ jobStatus(item.status) }}
              </p>
              <p class="text-xs text-zinc-500">
                {{ formatTime(item.createdAt) }}
                <template v-if="item.durationSeconds"> · {{ item.durationSeconds }}s</template>
                <template v-if="item.errorCode"> · {{ item.errorCode }}</template>
              </p>
              <a
                v-if="item.artifact"
                :href="artifactSrc(item.artifact.url)"
                class="mt-1 inline-block text-xs text-gold-300"
              >
                打开成片
              </a>
            </li>
          </ul>
        </section>
      </div>
    </PageState>
  </section>
</template>

<script setup lang="ts">
import {
  getRenderJobStageLabel,
  getRenderJobStatusLabel,
  getTimelineStatusLabel,
  resolveAssetDisplayUrl,
} from "@ai-drama-studio/core";
import {
  RenderJobStatus,
  TimelineStatus,
  type EpisodeTimeline,
  type RenderJob,
} from "@ai-drama-studio/types";
import { useCurrentProject } from "~/composables/useCurrentProject";

const route = useRoute();
const { $api } = useNuxtApp();
const runtime = useRuntimeConfig();
const { projectId } = useCurrentProject();
const episodeId = computed(() => String(route.params.episodeId || ""));
const loading = ref(false);
const creating = ref(false);
const error = ref<string | null>(null);
const timeline = ref<EpisodeTimeline | null>(null);
const jobs = ref<RenderJob[]>([]);
let poll: ReturnType<typeof setInterval> | null = null;

const canRender = computed(
  () => timeline.value?.status === TimelineStatus.LOCKED && !timeline.value.stale,
);
const statusLabel = computed(() =>
  getTimelineStatusLabel(timeline.value?.computedStatus || timeline.value?.status || TimelineStatus.DRAFT),
);
const activeJob = computed(() => jobs.value[0] || null);
const latestFailed = computed(
  () => jobs.value.find((item) => item.status === RenderJobStatus.FAILED) || null,
);

function jobStatus(status: string) {
  return getRenderJobStatusLabel(status);
}
function stageLabel(stage: string) {
  return getRenderJobStageLabel(stage);
}
function formatTime(value: string) {
  return new Date(value).toLocaleString("zh-CN");
}
function artifactSrc(url: string) {
  return resolveAssetDisplayUrl(String(runtime.public.apiBase || ""), url) ?? url;
}

async function load() {
  loading.value = true;
  error.value = null;
  try {
    timeline.value = await $api.getEpisodeTimeline(projectId.value, episodeId.value);
    jobs.value = await $api.getRenderJobs(projectId.value, episodeId.value);
  } catch (err) {
    error.value = err instanceof Error ? err.message : "加载 Render 失败";
  } finally {
    loading.value = false;
  }
}

async function refreshJobs() {
  jobs.value = await $api.getRenderJobs(projectId.value, episodeId.value);
}

async function onRender() {
  creating.value = true;
  error.value = null;
  try {
    const job = await $api.createRenderJob(projectId.value, episodeId.value);
    jobs.value = [job, ...jobs.value.filter((item) => item.id !== job.id)];
  } catch (err) {
    error.value = err instanceof Error ? err.message : "创建 Render 失败";
  } finally {
    creating.value = false;
  }
}

async function onCancel() {
  if (!activeJob.value) return;
  await $api.cancelRenderJob(projectId.value, activeJob.value.id);
  await refreshJobs();
}

async function onRetry() {
  if (!latestFailed.value) return;
  const job = await $api.retryRenderJob(projectId.value, latestFailed.value.id);
  jobs.value = [job, ...jobs.value.filter((item) => item.id !== job.id)];
}

onMounted(async () => {
  await load();
  poll = setInterval(() => {
    const running = jobs.value.some((item) =>
      ["QUEUED", "PREPARING", "RENDERING", "CANCEL_REQUESTED"].includes(item.status),
    );
    if (running) {
      void refreshJobs();
    }
  }, 2000);
});

onUnmounted(() => {
  if (poll) {
    clearInterval(poll);
  }
});
</script>
