<template>
  <section class="px-4 py-6 tablet:px-8 desktop:px-8">
    <PageState
      :loading="loading"
      :error="error"
      loading-text="正在载入成片…"
      :on-retry="load"
    >
      <div class="space-y-6">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <NuxtLink
              :to="pathFor('workspace')"
              class="text-[11px] uppercase tracking-[0.2em] text-gold-400/80"
            >
              ←
              <template v-if="overview">
                E{{ String(overview.episode.number).padStart(2, "0") }} · {{ overview.episode.title }}
              </template>
              <template v-else>本集</template>
            </NuxtLink>
            <h1 class="mt-1 font-display text-3xl">成片</h1>
            <p class="mt-2 text-sm text-zinc-500">
              把本集画面与配音合成为可播放的视频。
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <AiGenerateButton
              :label="primaryLabel"
              :loading="creating"
              :disabled="!canStartFilm || creating"
              :progress-text="creating ? filmProgressText : null"
              @click="onGenerateFilm"
            />
            <button
              v-if="activeJob && isRunning(activeJob.status)"
              type="button"
              class="rounded-xl border border-white/10 px-3 py-1.5 text-sm"
              @click="onCancel"
            >
              取消
            </button>
            <details class="relative">
              <summary class="cursor-pointer list-none rounded-xl border border-white/10 px-3 py-1.5 text-sm">
                更多
              </summary>
              <div class="absolute right-0 z-20 mt-2 min-w-[11rem] rounded-xl border border-white/10 bg-ink-900 p-2 text-sm shadow-xl">
                <NuxtLink :to="pathFor('timeline')" class="block rounded-lg px-3 py-2 hover:bg-white/5">
                  高级时间线
                </NuxtLink>
                <button
                  v-if="latestFailed"
                  type="button"
                  class="block w-full rounded-lg px-3 py-2 text-left hover:bg-white/5"
                  @click="onRetry"
                >
                  重试失败任务
                </button>
              </div>
            </details>
          </div>
        </div>

        <EpisodeProductionNav
          v-if="overview"
          :project-id="projectId"
          :episode-id="episodeId"
          :season-id="seasonId"
          current="render"
        />

        <section class="rounded-3xl border border-white/5 bg-ink-900/70 p-5">
          <p class="text-[11px] uppercase tracking-[0.2em] text-gold-400/80">准备情况</p>
          <ul class="mt-4 space-y-2 text-sm">
            <li :class="checkClass(scriptReady)">
              {{ checkMark(scriptReady) }} 剧本
            </li>
            <li :class="checkClass(storyboardReady)">
              {{ checkMark(storyboardReady) }} 分镜
            </li>
            <li :class="checkClass(visualComplete)">
              {{ checkMark(visualComplete) }} 画面
              <span class="text-zinc-500">{{ visualLabel }}</span>
            </li>
            <li :class="checkClass(audioComplete)">
              {{ checkMark(audioComplete) }} 配音
              <span class="text-zinc-500">{{ audioLabel }}</span>
            </li>
            <li :class="checkClass(timelineReady)">
              {{ checkMark(timelineReady) }} 素材编排
            </li>
          </ul>
          <p v-if="userBlocker" class="mt-4 text-sm text-amber-200">
            {{ userBlocker }}
            <NuxtLink v-if="userBlockerTo" :to="userBlockerTo" class="ml-2 text-gold-300">
              {{ userBlockerAction }}
            </NuxtLink>
          </p>
          <p v-else class="mt-4 text-sm text-emerald-300">已经准备好生成成片。</p>
        </section>

        <article v-if="activeJob" class="rounded-2xl border border-white/5 bg-ink-800/60 p-4">
          <p class="text-xs uppercase tracking-widest text-gold-300">{{ jobStatus(activeJob.status) }}</p>
          <p class="mt-1 text-lg text-zinc-100">{{ friendlyStage(activeJob.currentStage) }}</p>
          <p class="mt-2 text-sm text-zinc-400">
            <template v-if="activeJob.progress == null && isRunning(activeJob.status)">
              AI 正在生成成片…
            </template>
            <template v-else>
              进度 {{ activeJob.progress ?? 0 }}%
            </template>
          </p>
          <p v-if="activeJob.errorMessage" class="mt-2 text-sm text-rose-300">
            {{ friendlyError(activeJob.errorCode, activeJob.errorMessage) }}
          </p>
          <div v-if="activeJob.artifact" class="mt-4 space-y-2">
            <p class="text-emerald-300">成片已生成</p>
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
              下载成片
            </a>
          </div>
        </article>

        <details class="rounded-2xl border border-white/5 bg-ink-800/60 p-4">
          <summary class="cursor-pointer font-display text-xl">生成记录</summary>
          <p v-if="jobs.length === 0" class="mt-3 text-sm text-zinc-500">还没有成片记录。</p>
          <ul class="mt-3 space-y-2">
            <li
              v-for="item in jobs"
              :key="item.id"
              class="rounded-xl border border-white/5 px-3 py-2 text-sm"
            >
              <p class="text-zinc-200">{{ jobStatus(item.status) }} · {{ formatTime(item.createdAt) }}</p>
              <a
                v-if="item.artifact"
                :href="artifactSrc(item.artifact.url)"
                class="mt-1 inline-block text-xs text-gold-300"
              >
                打开成片
              </a>
            </li>
          </ul>
        </details>
      </div>
    </PageState>
  </section>
</template>

<script setup lang="ts">
import {
  getRenderJobStatusLabel,
  resolveAssetDisplayUrl,
} from "@ai-drama-studio/core";
import {
  RenderJobStatus,
  TimelineStatus,
  type EpisodeOverview,
  type EpisodeTimeline,
  type RenderJob,
} from "@ai-drama-studio/types";
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRoute, useRuntimeConfig } from "#imports";
import { useEpisodeProductionPaths } from "~/composables/useEpisodeProduction";
import { audioReadyLabel, visualReadyLabel, userStepPath } from "~/composables/useProductionUx";
import { ApiError } from "@ai-drama-studio/api-client";
import { useCurrentProject } from "~/composables/useCurrentProject";

const route = useRoute();
const { pathFor, seasonId } = useEpisodeProductionPaths();
const { $api } = useNuxtApp();
const runtime = useRuntimeConfig();
const { projectId } = useCurrentProject();
const episodeId = computed(() => String(route.params.episodeId || ""));
const loading = ref(false);
const creating = ref(false);
const error = ref<string | null>(null);
const timeline = ref<EpisodeTimeline | null>(null);
const overview = ref<EpisodeOverview | null>(null);
const jobs = ref<RenderJob[]>([]);
const filmProgressText = ref("正在准备成片…");
let poll: ReturnType<typeof setInterval> | null = null;

const visual = computed(() =>
  overview.value ? visualReadyLabel(overview.value) : { ready: 0, total: 0, label: "0 / 0" },
);
const audio = computed(() =>
  overview.value ? audioReadyLabel(overview.value) : { ready: 0, total: 0, label: "0 / 0" },
);
const visualLabel = computed(() => visual.value.label);
const audioLabel = computed(() => audio.value.label);
const visualComplete = computed(
  () => visual.value.total > 0 && visual.value.ready >= visual.value.total,
);
const audioComplete = computed(
  () => audio.value.total === 0 || audio.value.ready >= audio.value.total,
);
const scriptReady = computed(
  () => Boolean(overview.value?.script.exists && overview.value.script.status === "READY"),
);
const storyboardReady = computed(
  () =>
    Boolean(overview.value?.storyboard.exists && overview.value.storyboard.status === "READY"),
);
const timelineReady = computed(() => {
  if (!timeline.value || timeline.value.stale) return false;
  if (timeline.value.status === TimelineStatus.LOCKED) return true;
  return Boolean(overview.value?.readiness.canComposeTimeline);
});

const assetsReady = computed(() => visualComplete.value && audioComplete.value);
const canStartFilm = computed(() => assetsReady.value);
const primaryLabel = computed(() => {
  if (activeJob.value && isRunning(activeJob.value.status)) return "成片生成中";
  if (overview.value?.render.latestArtifact) return "再次生成成片";
  return "✨ AI生成成片";
});

const userBlocker = computed(() => {
  if (!overview.value) return "正在检查准备情况…";
  if (!visualComplete.value) {
    return `还有 ${Math.max(visual.value.total - visual.value.ready, 0)} 个镜头没有画面。`;
  }
  if (!audioComplete.value) {
    return `还有 ${Math.max(audio.value.total - audio.value.ready, 0)} 条对白没有配音。`;
  }
  return null;
});
const userBlockerTo = computed(() => {
  if (!visualComplete.value) {
    return userStepPath(projectId.value, episodeId.value, "visual", seasonId.value);
  }
  if (!audioComplete.value) {
    return userStepPath(projectId.value, episodeId.value, "audio", seasonId.value);
  }
  return null;
});
const userBlockerAction = computed(() => {
  if (!visualComplete.value) return "查看画面";
  if (!audioComplete.value) return "查看配音";
  return "继续";
});

const activeJob = computed(() => jobs.value[0] || null);
const latestFailed = computed(
  () => jobs.value.find((item) => item.status === RenderJobStatus.FAILED) || null,
);

function isRunning(status: string) {
  return ["QUEUED", "PREPARING", "RENDERING", "CANCEL_REQUESTED"].includes(status);
}
function checkMark(ok: boolean) {
  return ok ? "✓" : "○";
}
function checkClass(ok: boolean) {
  return ok ? "text-emerald-300" : "text-zinc-500";
}
function jobStatus(status: string) {
  return getRenderJobStatusLabel(status);
}
function friendlyStage(stage: string) {
  if (stage === "FFMPEG" || stage === "ENCODING") return "正在合成视频";
  if (stage === "PREPARE" || stage === "PREPARING") return "正在准备素材";
  if (stage === "UPLOAD" || stage === "FINALIZE") return "正在保存成片";
  return "正在生成成片";
}
function friendlyError(code: string | null | undefined, message: string) {
  if (code === "FFMPEG_NOT_FOUND" || message.includes("FFmpeg")) {
    return "本机尚未安装视频合成工具，暂时无法生成成片。";
  }
  return message;
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
    const [currentTimeline, currentJobs, currentOverview] = await Promise.all([
      $api.getEpisodeTimeline(projectId.value, episodeId.value).catch((err) => {
        if (err instanceof ApiError && err.code === "TIMELINE_NOT_FOUND") {
          return null;
        }
        throw err;
      }),
      $api.getRenderJobs(projectId.value, episodeId.value),
      $api.getEpisodeProductionOverview(projectId.value, episodeId.value).catch(() => null),
    ]);
    timeline.value = currentTimeline;
    jobs.value = currentJobs;
    overview.value = currentOverview;
  } catch (err) {
    error.value = err instanceof Error ? err.message : "加载成片失败";
  } finally {
    loading.value = false;
  }
}

async function refreshJobs() {
  jobs.value = await $api.getRenderJobs(projectId.value, episodeId.value);
}

async function onGenerateFilm() {
  if (!canStartFilm.value) {
    error.value = userBlocker.value || "当前还不能生成成片。";
    return;
  }
  creating.value = true;
  error.value = null;
  try {
    filmProgressText.value = "正在整理素材…";
    const built = await $api.buildEpisodeTimeline(projectId.value, episodeId.value, {
      rebuild: Boolean(timeline.value),
    });
    timeline.value = built.timeline;

    if (timeline.value.status !== TimelineStatus.LOCKED) {
      filmProgressText.value = "正在确认成片版本…";
      timeline.value = await $api.updateEpisodeTimeline(projectId.value, episodeId.value, {
        status: TimelineStatus.LOCKED,
      });
    }

    filmProgressText.value = "正在生成成片…";
    const job = await $api.createRenderJob(projectId.value, episodeId.value);
    jobs.value = [job, ...jobs.value.filter((item) => item.id !== job.id)];
    overview.value = await $api.getEpisodeProductionOverview(projectId.value, episodeId.value).catch(
      () => overview.value,
    );
  } catch (err) {
    if (err instanceof ApiError && err.code === "TIMELINE_INCOMPLETE") {
      error.value = "成片暂时无法生成。还有镜头或对白素材不完整。";
    } else if (err instanceof ApiError && (err.code === "FFMPEG_NOT_FOUND" || err.message.includes("FFmpeg"))) {
      error.value = "本机尚未安装视频合成工具，暂时无法生成成片。";
    } else {
      error.value = err instanceof Error ? err.message : "生成成片失败";
    }
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
    const running = jobs.value.some((item) => isRunning(item.status));
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
