<template>
  <section class="px-4 py-6 tablet:px-8 desktop:px-8">
    <PageState
      :loading="loading"
      :error="error"
      loading-text="正在载入剧集工作台…"
      :on-retry="reload"
    >
      <div v-if="overview" class="space-y-6">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <NuxtLink
              :to="`/projects/${projectId}/seasons/${overview.season.id}`"
              class="text-[11px] uppercase tracking-[0.2em] text-gold-400/80"
            >
              ← {{ overview.season.title }}
            </NuxtLink>
            <h1 class="mt-1 font-display text-3xl">
              E{{ String(overview.episode.number).padStart(2, "0") }} · {{ overview.episode.title }}
            </h1>
            <p class="mt-2 text-sm text-zinc-500">
              状态：{{ productionStatusLabel }}
              · 当前阶段：{{ stageLabel }}
            </p>
            <p class="mt-1 text-xs text-zinc-600">
              AI 生成使用当前项目配置的 Provider / Model，不会自动批量生成。
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <NuxtLink
              :to="primaryActionPath"
              class="rounded-xl bg-gold-400 px-3 py-1.5 text-sm font-medium text-ink-950"
            >
              {{ overview.nextAction.label }}
            </NuxtLink>
            <EpisodeOutlineGenerateModal
              :project-id="projectId"
              :episode-id="episodeId"
              @applied="reload"
            />
            <button
              type="button"
              class="rounded-xl border border-red-500/30 px-3 py-1.5 text-sm text-red-300"
              @click="confirmDelete = true"
            >
              删除
            </button>
          </div>
        </div>

        <p
          v-if="actionError"
          class="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300"
        >
          {{ actionError }}
        </p>

        <section class="rounded-3xl border border-white/5 bg-ink-900/70 p-5">
          <p class="text-[11px] uppercase tracking-[0.2em] text-gold-400/80">Production Steps</p>
          <div class="mt-4 flex flex-wrap gap-2">
            <span
              v-for="item in overview.progress"
              :key="item.id"
              class="rounded-full border px-3 py-1 text-sm"
              :class="stepChipClass(item.state)"
            >
              {{ stepMark(item.state) }} {{ item.label }}
            </span>
          </div>
          <p class="mt-3 text-sm text-zinc-500">
            {{ completedCount }} / {{ overview.progress.length }} stages completed
          </p>
        </section>

        <div class="grid gap-4 desktop:grid-cols-[1.2fr_0.8fr]">
          <section class="rounded-3xl border border-white/5 bg-ink-900/70 p-5">
            <p class="text-[11px] uppercase tracking-[0.2em] text-gold-400/80">Current Task</p>
            <h2 class="mt-1 font-display text-2xl">{{ overview.nextAction.label }}</h2>
            <p class="mt-2 text-sm text-zinc-400">{{ overview.nextAction.description }}</p>
            <p v-if="overview.nextAction.reason" class="mt-2 text-sm text-amber-200">
              {{ overview.nextAction.reason }}
            </p>
            <div class="mt-4 flex flex-wrap gap-2">
              <NuxtLink
                :to="primaryActionPath"
                class="rounded-xl bg-gold-400 px-4 py-2 text-sm font-medium text-ink-950"
              >
                {{ overview.nextAction.label }}
              </NuxtLink>
              <NuxtLink
                v-if="secondaryAction"
                :to="secondaryAction.to"
                class="rounded-xl border border-white/10 px-4 py-2 text-sm"
              >
                {{ secondaryAction.label }}
              </NuxtLink>
            </div>
          </section>

          <section class="rounded-3xl border border-white/5 bg-ink-900/70 p-5">
            <p class="text-[11px] uppercase tracking-[0.2em] text-gold-400/80">Asset Readiness</p>
            <div class="mt-3 space-y-2 text-sm text-zinc-300">
              <p>视觉素材：{{ overview.assets.images.ready + overview.assets.videos.ready > 0 ? `${visualReadyCount} / ${overview.storyboard.shotCount || 0}` : `0 / ${overview.storyboard.shotCount || 0}` }}</p>
              <p>对白：{{ overview.assets.voices.ready }} / {{ overview.assets.voices.total }}</p>
              <p>音乐：{{ overview.assets.music.ready }} / {{ overview.assets.music.total }}</p>
              <p>音效：{{ overview.assets.sfx.ready }} / {{ overview.assets.sfx.total }}</p>
            </div>
            <div v-if="overview.missing.visual.length || overview.missing.dialogue.length" class="mt-3 text-sm text-amber-200">
              <p v-for="item in overview.missing.visual.slice(0, 4)" :key="item.shotId">
                缺失视觉素材：Shot {{ String(item.shotNumber || "").padStart(3, "0") }}
              </p>
              <p v-for="item in overview.missing.dialogue.slice(0, 4)" :key="item.blockId">
                缺失对白：ScriptBlock {{ String(item.blockIndex || "").padStart(2, "0") }}
              </p>
            </div>
            <p
              v-if="overview.readiness.stale.storyboard || overview.readiness.stale.timeline"
              class="mt-3 text-sm text-amber-200"
            >
              上游内容发生变化，当前时间线需要重新检查。
            </p>
          </section>
        </div>

        <section class="rounded-3xl border border-white/5 bg-ink-900/70 p-5">
          <p class="text-[11px] uppercase tracking-[0.2em] text-gold-400/80">Production Checklist</p>
          <div class="mt-3 grid gap-2 tablet:grid-cols-2 desktop:grid-cols-5">
            <p
              v-for="item in overview.checklist"
              :key="item.id"
              class="text-sm"
              :class="item.done ? 'text-emerald-300' : 'text-zinc-500'"
            >
              {{ item.done ? "☑" : "☐" }} {{ item.label }}
              <span v-if="item.detail" class="text-xs text-zinc-500">{{ item.detail }}</span>
            </p>
          </div>
        </section>

        <section class="rounded-3xl border border-white/5 bg-ink-900/70 p-5">
          <p class="text-[11px] uppercase tracking-[0.2em] text-gold-400/80">Episode Navigation</p>
          <div class="mt-3 flex flex-wrap gap-2 text-sm">
            <span class="rounded-xl border border-gold-400/30 px-3 py-1.5 text-gold-300">概览</span>
            <NuxtLink :to="pathFor('plan')" class="rounded-xl border border-white/10 px-3 py-1.5">剧集规划</NuxtLink>
            <NuxtLink :to="pathFor('script')" class="rounded-xl border border-white/10 px-3 py-1.5">剧本</NuxtLink>
            <NuxtLink :to="pathFor('storyboard')" class="rounded-xl border border-white/10 px-3 py-1.5">分镜</NuxtLink>
            <NuxtLink :to="pathFor('assets')" class="rounded-xl border border-white/10 px-3 py-1.5">素材</NuxtLink>
            <NuxtLink :to="pathFor('timeline')" class="rounded-xl border border-white/10 px-3 py-1.5">时间线</NuxtLink>
            <NuxtLink :to="pathFor('render')" class="rounded-xl border border-white/10 px-3 py-1.5">成片</NuxtLink>
          </div>
        </section>

        <div v-if="overview.render.latestArtifact" class="rounded-3xl border border-white/5 bg-ink-900/70 p-5">
          <p class="text-[11px] uppercase tracking-[0.2em] text-gold-400/80">Episode MP4</p>
          <video
            :src="artifactSrc(overview.render.latestArtifact.url)"
            controls
            class="mt-4 w-full max-w-3xl rounded-xl bg-black"
          />
          <p class="mt-2 text-sm text-zinc-500">
            {{ overview.render.latestArtifact.durationSeconds ?? 0 }}s
            · {{ overview.render.latestArtifact.width }}x{{ overview.render.latestArtifact.height }}
            · {{ overview.render.latestArtifact.fps }}fps
          </p>
          <div class="mt-3 flex flex-wrap gap-2">
            <NuxtLink :to="pathFor('render')" class="rounded-xl bg-gold-400 px-3 py-1.5 text-sm font-medium text-ink-950">
              再次渲染
            </NuxtLink>
            <NuxtLink :to="pathFor('render')" class="rounded-xl border border-white/10 px-3 py-1.5 text-sm">
              查看 Render History
            </NuxtLink>
          </div>
        </div>

        <section v-if="overview.render.history.length" class="rounded-3xl border border-white/5 bg-ink-900/70 p-5">
          <p class="text-[11px] uppercase tracking-[0.2em] text-gold-400/80">Render History</p>
          <div class="mt-3 space-y-2">
            <article
              v-for="item in overview.render.history"
              :key="item.id"
              class="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/5 bg-ink-800/70 px-4 py-3 text-sm"
            >
              <p>
                Timeline v{{ item.timelineVersion }} · {{ item.status }}
                <span class="text-zinc-500"> · {{ item.createdAt.slice(0, 10) }}</span>
              </p>
              <div class="flex gap-3">
                <NuxtLink :to="pathFor('render')" class="text-gold-300">查看</NuxtLink>
                <NuxtLink v-if="item.hasArtifact" :to="pathFor('render')" class="text-gold-300">播放</NuxtLink>
                <NuxtLink v-if="item.status === 'FAILED'" :to="pathFor('render')" class="text-amber-200">Retry</NuxtLink>
              </div>
            </article>
          </div>
        </section>

        <section v-if="overview.activity.length" class="rounded-3xl border border-white/5 bg-ink-900/70 p-5">
          <p class="text-[11px] uppercase tracking-[0.2em] text-gold-400/80">Recent Activity</p>
          <ul class="mt-3 space-y-2 text-sm text-zinc-400">
            <li v-for="item in overview.activity" :key="item.id">{{ item.label }}</li>
          </ul>
        </section>
      </div>
    </PageState>

    <ConfirmDialog
      :open="confirmDelete"
      title="删除这一集？"
      message="本阶段如果还没有后续生成任务，可以删除。"
      @confirm="onDelete"
      @cancel="confirmDelete = false"
    />
  </section>
</template>

<script setup lang="ts">
import { getEpisodeProductionStageLabel } from "@ai-drama-studio/core";
import {
  EpisodeNextActionType,
  EpisodeProductionStage,
  type EpisodeOverview,
  type EpisodeProductionState,
} from "@ai-drama-studio/types";
import { episodeActionPath, episodeModulePath } from "~/composables/useEpisodeProduction";
import { useCurrentProject } from "~/composables/useCurrentProject";
import { useStoryStore } from "~/stores/story";

const route = useRoute();
const config = useRuntimeConfig();
const { projectId } = useCurrentProject();
const store = useStoryStore();
const { $api } = useNuxtApp();
const seasonId = computed(() => String(route.params.seasonId || ""));
const episodeId = computed(() => String(route.params.episodeId || ""));
const confirmDelete = ref(false);
const loading = ref(false);
const error = ref<string | null>(null);
const actionError = ref<string | null>(null);
const overview = ref<EpisodeOverview | null>(null);

const stageLabel = computed(() =>
  overview.value ? getEpisodeProductionStageLabel(overview.value.productionStage) : "",
);
const productionStatusLabel = computed(() =>
  overview.value?.productionStage === EpisodeProductionStage.COMPLETED ? "已完成" : "制作中",
);
const completedCount = computed(
  () => overview.value?.progress.filter((item) => item.state === "COMPLETED" || item.state === "LOCKED").length ?? 0,
);
const primaryActionPath = computed(() =>
  overview.value
    ? episodeActionPath(projectId.value, episodeId.value, overview.value.nextAction.type)
    : pathFor("workspace"),
);
const visualReadyCount = computed(() => {
  if (!overview.value) return 0;
  const shotCount = overview.value.storyboard.shotCount;
  const missing = overview.value.missing.visual.length;
  return Math.max(shotCount - missing, 0);
});
const secondaryAction = computed(() => {
  const type = overview.value?.nextAction.type;
  if (type === EpisodeNextActionType.CONFIRM_SCRIPT) {
    return { label: "查看剧本", to: pathFor("script") };
  }
  if (type === EpisodeNextActionType.GENERATE_STORYBOARD) {
    return { label: "查看剧本", to: pathFor("script") };
  }
  if (type === EpisodeNextActionType.CONFIRM_STORYBOARD) {
    return { label: "查看分镜", to: pathFor("storyboard") };
  }
  if (type === EpisodeNextActionType.RENDER_EPISODE) {
    return { label: "打开合成", to: pathFor("timeline") };
  }
  return null;
});

function pathFor(module: "plan" | "script" | "storyboard" | "assets" | "timeline" | "render" | "workspace") {
  return episodeModulePath(projectId.value, episodeId.value, module);
}

function stepMark(state: EpisodeProductionState) {
  if (state === "COMPLETED" || state === "LOCKED") return "✓";
  if (state === "IN_PROGRESS" || state === "READY") return "●";
  return "○";
}

function stepChipClass(state: EpisodeProductionState) {
  if (state === "COMPLETED" || state === "LOCKED") return "border-emerald-500/30 text-emerald-300";
  if (state === "IN_PROGRESS" || state === "READY") return "border-gold-400/40 text-gold-300";
  if (state === "STALE") return "border-amber-500/30 text-amber-200";
  return "border-white/10 text-zinc-500";
}

function artifactSrc(url: string) {
  if (url.startsWith("http")) return url;
  return `${String(config.public.apiBase || "").replace(/\/$/, "")}${url}`;
}

async function reload() {
  loading.value = true;
  error.value = null;
  try {
    overview.value = await $api.getEpisodeProductionOverview(projectId.value, episodeId.value);
    if (seasonId.value) {
      await store.loadEpisode(projectId.value, seasonId.value, episodeId.value);
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : "加载 Episode Workspace 失败";
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void reload();
});

watch([seasonId, episodeId], () => {
  void reload();
});

async function onDelete() {
  confirmDelete.value = false;
  const sid = overview.value?.season.id || seasonId.value;
  const ok = await store.removeEpisode(projectId.value, sid, episodeId.value);
  if (!ok) {
    actionError.value = store.actionError;
    return;
  }
  await navigateTo(`/projects/${projectId.value}/seasons/${sid}`);
}
</script>
