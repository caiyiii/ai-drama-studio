<template>
  <section class="px-4 py-6 tablet:px-8 desktop:px-8">
    <PageState
      :loading="loading"
      :error="error"
      loading-text="正在载入时间线…"
      :on-retry="load"
    >
      <div class="space-y-6">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p class="text-[11px] uppercase tracking-[0.2em] text-gold-400/80">本集时间线</p>
            <h1 class="mt-1 font-display text-3xl">
              <template v-if="overview">
                E{{ String(overview.episode.number).padStart(2, "0") }} · {{ overview.episode.title }}
              </template>
              <template v-else>时间线</template>
            </h1>
            <p v-if="overview" class="mt-1 text-sm text-zinc-400">时间线</p>
            <p class="mt-2 text-sm text-zinc-500">
              把已生成的视觉和音频素材按时间排列。这是合成预览，不是最终视频导出。
            </p>
            <p v-if="timeline" class="mt-1 text-xs text-zinc-500">
              v{{ timeline.version }} · {{ statusLabel }} · {{ Math.round(timeline.durationSeconds) }}s ·
              {{ timeline.fps }}fps · {{ timeline.resolution }}
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <NuxtLink
              :to="`/projects/${projectId}/episodes/${episodeId}`"
              class="rounded-xl border border-white/10 px-3 py-1.5 text-sm"
            >
              返回本集工作台
            </NuxtLink>
            <button
              type="button"
              class="rounded-xl bg-gold-400 px-3 py-1.5 text-sm font-medium text-ink-950"
              :disabled="building"
              @click="onBuild(false)"
            >
              {{ timeline ? "已构建" : "构建时间线" }}
            </button>
            <button
              type="button"
              class="rounded-xl border border-white/10 px-3 py-1.5 text-sm"
              :disabled="building || !timeline || locked"
              @click="onBuild(true)"
            >
              重新构建
            </button>
            <button
              v-if="locked && !stale"
              type="button"
              class="rounded-xl bg-gold-400 px-3 py-1.5 text-sm font-medium text-ink-950"
              @click="goRender"
            >
              生成成片
            </button>
            <button
              v-else-if="locked"
              type="button"
              class="rounded-xl border border-white/10 px-3 py-1.5 text-sm text-zinc-500"
              disabled
            >
              时间线已过期，无法渲染
            </button>
            <button
              v-else
              type="button"
              class="rounded-xl border border-white/10 px-3 py-1.5 text-sm text-zinc-500"
              disabled
            >
              请先锁定时间线
            </button>
            <button
              v-if="locked"
              type="button"
              class="rounded-xl border border-white/10 px-3 py-1.5 text-sm"
              @click="onUnlock"
            >
              解锁
            </button>
            <button
              v-else-if="timeline"
              type="button"
              class="rounded-xl border border-white/10 px-3 py-1.5 text-sm"
              @click="onLock"
            >
              锁定时间线
            </button>
          </div>
        </div>

        <EpisodeProductionNav
          :project-id="projectId"
          :episode-id="episodeId"
          current="timeline"
        />

        <p class="rounded-xl border border-gold-400/20 bg-gold-400/5 px-4 py-3 text-sm text-gold-200">
          {{ preview?.readyMessage || COMPOSITION_PREVIEW_DISCLAIMER }}
        </p>

        <div
          v-if="timelinePrerequisiteMessage"
          class="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200"
        >
          {{ timelinePrerequisiteMessage }}
          <NuxtLink :to="timelinePrerequisiteCta.to" class="ml-2 text-gold-300">
            {{ timelinePrerequisiteCta.label }}
          </NuxtLink>
        </div>

        <div
          v-if="staleMessage"
          class="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200"
        >
          {{ staleMessage }}
        </div>

        <div v-if="missingLines.length" class="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          <p class="font-medium">时间线存在缺失素材。</p>
          <ul class="mt-2 list-disc pl-5">
            <li v-for="line in missingLines" :key="line">{{ line }}</li>
          </ul>
          <p class="mt-2 text-xs text-amber-100/80">允许预览，但不会自动生成缺失的图片、视频或音频。</p>
        </div>

        <CompositionPreviewPlayer v-if="preview?.manifest" :manifest="preview.manifest" :api-base="apiBase" />

        <section v-if="timeline" class="rounded-2xl border border-white/5 bg-ink-800/60 p-4">
          <h2 class="font-display text-xl">Timeline</h2>
          <div class="mt-4 space-y-3">
            <div v-for="track in timeline.tracks || []" :key="track.id">
              <div class="mb-1 flex items-center justify-between text-xs uppercase tracking-[0.16em] text-zinc-500">
                <span>{{ track.name }} {{ track.muted ? "· muted" : "" }}</span>
                <span>vol {{ track.volume }}</span>
              </div>
              <div class="relative h-8 overflow-hidden rounded-lg bg-ink-950">
                <button
                  v-for="clip in track.clips || []"
                  :key="clip.id"
                  type="button"
                  class="absolute top-1 h-6 rounded-md border border-white/10"
                  :class="clip.enabled ? barClass(track.type) : 'bg-zinc-700/40'"
                  :style="barStyle(clip)"
                  :title="`${clip.startTime}s · ${clip.duration}s`"
                  @click="selectClip(track.id, clip)"
                />
              </div>
            </div>
          </div>
        </section>

        <section v-if="selectedClip" class="rounded-2xl border border-white/5 bg-ink-800/60 p-4">
          <h2 class="font-display text-xl">片段</h2>
          <p class="mt-1 text-xs text-zinc-500">只能改播放参数。更换素材请删除后新建。</p>
          <div class="mt-3 grid gap-3 tablet:grid-cols-2 desktop:grid-cols-4">
            <label class="text-xs text-zinc-500">
              startTime
              <input v-model.number="edit.startTime" type="number" min="0" step="0.1" class="studio-field mt-1" />
            </label>
            <label class="text-xs text-zinc-500">
              duration
              <input v-model.number="edit.duration" type="number" min="0.1" step="0.1" class="studio-field mt-1" />
            </label>
            <label class="text-xs text-zinc-500">
              volume
              <input v-model.number="edit.volume" type="number" min="0" max="1" step="0.05" class="studio-field mt-1" />
            </label>
            <label class="text-xs text-zinc-500">
              启用
              <select v-model="edit.enabled" class="studio-field mt-1">
                <option :value="true">启用</option>
                <option :value="false">禁用</option>
              </select>
            </label>
          </div>
          <div class="mt-3 flex gap-2">
            <button type="button" class="rounded-xl bg-gold-400 px-3 py-1.5 text-sm text-ink-950" :disabled="locked" @click="saveClip">
              保存片段
            </button>
            <button type="button" class="rounded-xl border border-red-500/30 px-3 py-1.5 text-sm text-red-300" :disabled="locked" @click="removeClip">
              删除片段
            </button>
          </div>
        </section>
      </div>
    </PageState>
  </section>
</template>

<script setup lang="ts">
import {
  COMPOSITION_PREVIEW_DISCLAIMER,
  getTimelineStatusLabel,
} from "@ai-drama-studio/core";
import {
  TimelineStatus,
  TimelineTrackType,
  type CompositionPreview,
  type EpisodeOverview,
  type EpisodeTimeline,
  type TimelineClip,
} from "@ai-drama-studio/types";
import { ApiError } from "@ai-drama-studio/api-client";
import { useCurrentProject } from "~/composables/useCurrentProject";

const route = useRoute();
const { $api } = useNuxtApp();
const runtime = useRuntimeConfig();
const { projectId } = useCurrentProject();
const episodeId = computed(() => String(route.params.episodeId || ""));
const apiBase = computed(() => String(runtime.public.apiBase || ""));
const loading = ref(false);
const building = ref(false);
const error = ref<string | null>(null);
const overview = ref<EpisodeOverview | null>(null);
const timeline = ref<EpisodeTimeline | null>(null);
const preview = ref<CompositionPreview | null>(null);
const selectedClip = ref<TimelineClip | null>(null);
const selectedTrackId = ref<string | null>(null);
const edit = reactive({
  startTime: 0,
  duration: 1,
  volume: 1,
  enabled: true,
});

const locked = computed(() => timeline.value?.status === TimelineStatus.LOCKED);
const stale = computed(
  () =>
    Boolean(timeline.value?.stale) ||
    timeline.value?.computedStatus === TimelineStatus.STALE ||
    timeline.value?.status === TimelineStatus.STALE,
);
const staleMessage = computed(() =>
  stale.value ? "上游内容发生变化，当前时间线需要重新检查。" : "",
);
const statusLabel = computed(() =>
  getTimelineStatusLabel(timeline.value?.computedStatus || timeline.value?.status || TimelineStatus.DRAFT),
);

const missingLines = computed(() => {
  const missing = preview.value?.missing;
  if (!missing) {
    return [];
  }
  const lines: string[] = [];
  for (const shot of missing.visual) {
    lines.push(
      shot.shotNumber
        ? `缺失视觉素材：Shot ${String(shot.shotNumber).padStart(3, "0")}`
        : `缺失视觉素材：${shot.shotId}`,
    );
  }
  missing.dialogue.forEach((block, index) => {
    lines.push(
      block.blockIndex
        ? `缺失对白：ScriptBlock ${String(block.blockIndex).padStart(2, "0")}`
        : `缺失对白：ScriptBlock ${index + 1}`,
    );
  });
  if (missing.music) {
    lines.push("缺失音乐");
  }
  if (missing.sfx) {
    lines.push("缺失音效");
  }
  return lines;
});
const timelinePrerequisiteMessage = computed(() => {
  if (!timeline.value) {
    return "当前 Episode 还没有时间线。建议先完成剧本、分镜和素材准备，再来构建时间线。";
  }
  if (stale.value) {
    return "时间线已过期，请重新构建或检查时间线。";
  }
  if (missingLines.value.length > 0) {
    return "当前 Episode 还有缺失素材，暂不推荐直接进入时间线定稿。";
  }
  return "";
});
const timelinePrerequisiteCta = computed(() => {
  if (!timeline.value) {
    return {
      label: "返回本集工作台",
      to: `/projects/${projectId.value}/episodes/${episodeId.value}`,
    };
  }
  return {
    label: "继续补齐分镜与素材",
    to: `/projects/${projectId.value}/episodes/${episodeId.value}/storyboard`,
  };
});

function barClass(type: TimelineTrackType | string) {
  if (type === TimelineTrackType.VIDEO) return "bg-sky-400/80";
  if (type === TimelineTrackType.IMAGE) return "bg-violet-400/80";
  if (type === TimelineTrackType.DIALOGUE) return "bg-amber-400/80";
  if (type === TimelineTrackType.MUSIC) return "bg-emerald-400/80";
  return "bg-rose-400/80";
}

function barStyle(clip: TimelineClip) {
  const total = Math.max(timeline.value?.durationSeconds || 1, 1);
  return {
    left: `${(clip.startTime / total) * 100}%`,
    width: `${Math.max((clip.duration / total) * 100, 1.2)}%`,
  };
}

function selectClip(trackId: string, clip: TimelineClip) {
  selectedTrackId.value = trackId;
  selectedClip.value = clip;
  edit.startTime = clip.startTime;
  edit.duration = clip.duration;
  edit.volume = clip.volume;
  edit.enabled = clip.enabled;
}

async function load() {
  loading.value = true;
  error.value = null;
  try {
    const [currentOverview, currentTimeline, currentPreview] = await Promise.all([
      $api.getEpisodeProductionOverview(projectId.value, episodeId.value).catch(() => null),
      $api.getEpisodeTimeline(projectId.value, episodeId.value).catch((err) => {
        if (err instanceof ApiError && err.code === "TIMELINE_NOT_FOUND") {
          return null;
        }
        throw err;
      }),
      $api.getCompositionPreview(projectId.value, episodeId.value).catch(() => null),
    ]);
    overview.value = currentOverview;
    timeline.value = currentTimeline;
    preview.value = currentPreview;
  } catch (err) {
    error.value = err instanceof Error ? err.message : "加载时间线失败";
  } finally {
    loading.value = false;
  }
}

async function onBuild(rebuild: boolean) {
  if (!rebuild && timeline.value) {
    return;
  }
  building.value = true;
  error.value = null;
  try {
    const result = await $api.buildEpisodeTimeline(projectId.value, episodeId.value, { rebuild });
    timeline.value = result.timeline;
    preview.value = await $api.getCompositionPreview(projectId.value, episodeId.value);
  } catch (err) {
    error.value = err instanceof Error ? err.message : "构建失败";
  } finally {
    building.value = false;
  }
}

async function onLock() {
  if (!timeline.value) return;
  timeline.value = await $api.updateEpisodeTimeline(projectId.value, episodeId.value, {
    status: TimelineStatus.LOCKED,
  });
}

async function onUnlock() {
  timeline.value = await $api.unlockEpisodeTimeline(projectId.value, episodeId.value);
}

function goRender() {
  void navigateTo(`/projects/${projectId.value}/episodes/${episodeId.value}/render`);
}

async function saveClip() {
  if (!timeline.value || !selectedClip.value) return;
  const updated = await $api.updateTimelineClip(
    projectId.value,
    timeline.value.id,
    selectedClip.value.id,
    {
      startTime: edit.startTime,
      duration: edit.duration,
      volume: edit.volume,
      enabled: edit.enabled,
    },
  );
  selectedClip.value = updated;
  await load();
}

async function removeClip() {
  if (!timeline.value || !selectedClip.value) return;
  await $api.deleteTimelineClip(projectId.value, timeline.value.id, selectedClip.value.id);
  selectedClip.value = null;
  await load();
}

onMounted(() => {
  void load();
});
</script>
