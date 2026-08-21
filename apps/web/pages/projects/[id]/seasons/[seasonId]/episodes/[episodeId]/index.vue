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
              ← 第{{ overview.season.number }}季 · {{ overview.season.title }}
            </NuxtLink>
            <h1 class="mt-1 font-display text-3xl">
              E{{ String(overview.episode.number).padStart(2, "0") }} · {{ overview.episode.title }}
            </h1>
            <p class="mt-2 text-sm text-zinc-500">剧集生产 · {{ currentStepLabel }}</p>
          </div>
          <div class="flex flex-wrap gap-2">
            <details class="relative">
              <summary
                class="cursor-pointer list-none rounded-xl border border-white/10 px-3 py-1.5 text-sm"
              >
                更多
              </summary>
              <div
                class="absolute right-0 z-20 mt-2 min-w-[10rem] rounded-xl border border-white/10 bg-ink-900 p-2 text-sm shadow-xl"
              >
                <NuxtLink :to="pathFor('timeline')" class="block rounded-lg px-3 py-2 hover:bg-white/5">
                  高级时间线
                </NuxtLink>
                <NuxtLink :to="pathFor('render')" class="block rounded-lg px-3 py-2 hover:bg-white/5">
                  成片记录
                </NuxtLink>
                <button
                  type="button"
                  class="block w-full rounded-lg px-3 py-2 text-left text-red-300 hover:bg-white/5"
                  @click="confirmDelete = true"
                >
                  删除本集
                </button>
              </div>
            </details>
          </div>
        </div>

        <p
          v-if="actionError"
          class="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300"
        >
          {{ actionError }}
        </p>

        <section class="rounded-3xl border border-white/5 bg-ink-900/70 p-5">
          <p class="text-[11px] uppercase tracking-[0.2em] text-gold-400/80">生产进度</p>
          <div class="mt-4">
            <ProductionStepBar
              :overview="overview"
              :project-id="projectId"
              :episode-id="episodeId"
              :season-id="seasonId"
              current="workspace"
            />
          </div>
        </section>

        <ProductionNextActionCard
          :action="overview.nextAction"
          :current-step-label="currentStepLabel"
          :detail="actionDetail"
          :primary-to="primaryActionPath"
          mode="link"
          :secondary="secondaryAction"
          :blocker="blocker"
        />

        <div class="grid gap-4 desktop:grid-cols-3">
          <article class="rounded-3xl border border-white/5 bg-ink-900/70 p-5">
            <p class="text-[11px] uppercase tracking-[0.2em] text-gold-400/80">画面</p>
            <p class="mt-2 font-display text-2xl">{{ visual.label }}</p>
            <p class="mt-1 text-sm text-zinc-500">{{ visual.total }} 个镜头</p>
          </article>
          <article class="rounded-3xl border border-white/5 bg-ink-900/70 p-5">
            <p class="text-[11px] uppercase tracking-[0.2em] text-gold-400/80">配音</p>
            <p class="mt-2 font-display text-2xl">{{ audio.label }}</p>
            <p class="mt-1 text-sm text-zinc-500">{{ audio.total }} 条对白</p>
          </article>
          <article class="rounded-3xl border border-white/5 bg-ink-900/70 p-5">
            <p class="text-[11px] uppercase tracking-[0.2em] text-gold-400/80">成片</p>
            <p class="mt-2 font-display text-2xl">
              {{ overview.render.latestArtifact ? "已生成" : "未生成" }}
            </p>
            <p class="mt-1 text-sm text-zinc-500">
              {{ overview.readiness.canRender ? "可以生成成片" : overview.readiness.renderBlockedReason || "等待素材完成" }}
            </p>
          </article>
        </div>

        <div v-if="overview.render.latestArtifact" class="rounded-3xl border border-white/5 bg-ink-900/70 p-5">
          <p class="text-[11px] uppercase tracking-[0.2em] text-gold-400/80">本集成片</p>
          <video
            :src="artifactSrc(overview.render.latestArtifact.url)"
            controls
            class="mt-4 w-full max-w-3xl rounded-xl bg-black"
          />
          <div class="mt-3">
            <NuxtLink :to="pathFor('render')" class="rounded-xl border border-white/10 px-3 py-1.5 text-sm">
              查看成片页
            </NuxtLink>
          </div>
        </div>
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
  type EpisodeOverview,
} from "@ai-drama-studio/types";
import { computed, onMounted, ref, watch } from "vue";
import { navigateTo, useRoute, useRuntimeConfig } from "#imports";
import { episodeModulePath } from "~/composables/useEpisodeProduction";
import {
  audioReadyLabel,
  mapNextActionToUi,
  nextActionPath,
  visualReadyLabel,
} from "~/composables/useProductionUx";
import { useCurrentProject } from "~/composables/useCurrentProject";
import { useStoryStore } from "~/stores/story";
import { useNuxtApp } from "#app";

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

const uiAction = computed(() =>
  overview.value ? mapNextActionToUi(overview.value.nextAction) : null,
);
const currentStepLabel = computed(() => {
  if (!overview.value) return "";
  const ui = uiAction.value;
  if (ui?.step === "visual") return "画面";
  if (ui?.step === "audio") return "配音";
  if (ui?.step === "render") return "成片";
  if (ui?.step === "storyboard") return "分镜";
  if (ui?.step === "script") return "剧本";
  if (ui?.step === "outline") return "大纲";
  return getEpisodeProductionStageLabel(overview.value.productionStage);
});
const primaryActionPath = computed(() =>
  overview.value
    ? nextActionPath(projectId.value, episodeId.value, overview.value.nextAction, seasonId.value)
    : pathFor("workspace"),
);
const visual = computed(() =>
  overview.value ? visualReadyLabel(overview.value) : { ready: 0, total: 0, label: "0 / 0" },
);
const audio = computed(() =>
  overview.value ? audioReadyLabel(overview.value) : { ready: 0, total: 0, label: "0 / 0" },
);
const actionDetail = computed(() => {
  if (!overview.value || !uiAction.value) return null;
  if (uiAction.value.step === "visual") {
    return `画面进度 ${visual.value.label}`;
  }
  if (uiAction.value.step === "audio") {
    return `配音进度 ${audio.value.label}`;
  }
  return null;
});
const secondaryAction = computed(() => {
  const type = overview.value?.nextAction.type;
  if (type === EpisodeNextActionType.CONFIRM_SCRIPT) {
    return { label: "查看剧本", to: pathFor("script") };
  }
  if (type === EpisodeNextActionType.CONFIRM_STORYBOARD) {
    return { label: "查看分镜", to: pathFor("storyboard") };
  }
  if (
    type === EpisodeNextActionType.GENERATE_MISSING_VISUAL_ASSETS ||
    type === EpisodeNextActionType.GENERATE_MISSING_AUDIO_ASSETS
  ) {
    return null;
  }
  return null;
});
const blocker = computed(() => {
  if (!overview.value) return null;
  const type = overview.value.nextAction.type;
  if (type === EpisodeNextActionType.GENERATE_MISSING_VISUAL_ASSETS) {
    return null;
  }
  if (type === EpisodeNextActionType.GENERATE_MISSING_AUDIO_ASSETS) {
    return null;
  }
  return null;
});

function pathFor(module: "plan" | "script" | "storyboard" | "assets" | "timeline" | "render" | "workspace") {
  return episodeModulePath(projectId.value, episodeId.value, module, seasonId.value);
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
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(`ads:last-episode:${projectId.value}`, episodeId.value);
    }
    if (seasonId.value) {
      await store.loadEpisode(projectId.value, seasonId.value, episodeId.value);
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : "加载 Episode Workspace 失败";
  } finally {
    loading.value = false;
  }
}

async function onDelete() {
  confirmDelete.value = false;
  actionError.value = null;
  try {
    await store.removeEpisode(projectId.value, seasonId.value, episodeId.value);
    await navigateTo(`/projects/${projectId.value}/seasons/${seasonId.value}`);
  } catch (err) {
    actionError.value = err instanceof Error ? err.message : "删除失败";
  }
}

onMounted(() => {
  void reload();
});

watch(episodeId, () => {
  void reload();
});
</script>
