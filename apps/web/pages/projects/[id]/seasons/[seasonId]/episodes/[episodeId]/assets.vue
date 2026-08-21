<template>
  <section class="px-4 py-6 tablet:px-8 desktop:px-8">
    <PageState
      :loading="loading"
      :error="error"
      loading-text="正在载入 Episode Assets…"
      :on-retry="load"
    >
      <div v-if="overview" class="space-y-6">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p class="text-[11px] uppercase tracking-[0.2em] text-gold-400/80">本集素材</p>
            <h1 class="mt-1 font-display text-3xl">
              E{{ String(overview.episode.number).padStart(2, "0") }} · {{ overview.episode.title }}
            </h1>
            <p class="mt-1 text-sm text-zinc-400">视觉 / 音频素材</p>
            <p class="mt-2 text-sm text-zinc-500">
              这里汇总本集已绑定的画面、配音与音频。全局素材库只用于跨集浏览。
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <NuxtLink :to="pathFor('workspace')" class="rounded-xl border border-white/10 px-3 py-1.5 text-sm">
              返回本集工作台
            </NuxtLink>
            <NuxtLink
              :to="nextAction.to"
              class="rounded-xl bg-gold-400 px-3 py-1.5 text-sm font-medium text-ink-950"
            >
              {{ nextAction.label }}
            </NuxtLink>
          </div>
        </div>

        <EpisodeProductionNav
          :project-id="projectId"
          :episode-id="episodeId"
          :season-id="seasonId"
          current="assets"
        />

        <div class="grid gap-4 tablet:grid-cols-2 desktop:grid-cols-5">
          <article v-for="card in summaryCards" :key="card.title" class="rounded-2xl border border-white/5 bg-ink-900/70 p-4">
            <p class="text-xs uppercase tracking-[0.16em] text-zinc-500">{{ card.title }}</p>
            <p class="mt-2 font-display text-2xl">{{ card.value }}</p>
            <p class="mt-2 text-sm text-zinc-400">{{ card.detail }}</p>
          </article>
        </div>

        <div
          v-if="!overview.storyboard.exists"
          class="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200"
        >
          分镜还不存在，视觉素材会在分镜阶段之后逐步补齐。
          <NuxtLink :to="pathFor('storyboard')" class="ml-2 text-gold-300">
            先去分镜
          </NuxtLink>
        </div>

        <div class="grid gap-4 desktop:grid-cols-2">
          <section class="rounded-3xl border border-white/5 bg-ink-900/70 p-5">
            <div class="flex items-center justify-between gap-3">
              <div>
                <p class="text-[11px] uppercase tracking-[0.2em] text-gold-400/80">Visual Assets</p>
                <h2 class="mt-1 font-display text-2xl">画面与镜头</h2>
              </div>
              <NuxtLink :to="`/projects/${projectId}/images`" class="text-sm text-gold-300">打开图片库</NuxtLink>
            </div>
            <div class="mt-4 space-y-3">
              <article v-for="item in visualRows" :key="item.label" class="rounded-2xl border border-white/5 bg-ink-800/70 p-4">
                <div class="flex items-center justify-between gap-3">
                  <p class="text-sm text-zinc-200">{{ item.label }}</p>
                  <span class="text-xs text-zinc-500">{{ item.count }}</span>
                </div>
                <p class="mt-2 text-sm text-zinc-400">{{ item.detail }}</p>
              </article>
            </div>
          </section>

          <section class="rounded-3xl border border-white/5 bg-ink-900/70 p-5">
            <div class="flex items-center justify-between gap-3">
              <div>
                <p class="text-[11px] uppercase tracking-[0.2em] text-gold-400/80">Dialogue & Audio</p>
                <h2 class="mt-1 font-display text-2xl">对白、音乐与音效</h2>
              </div>
              <NuxtLink :to="`/projects/${projectId}/voices`" class="text-sm text-gold-300">打开配音库</NuxtLink>
            </div>
            <div class="mt-4 space-y-3">
              <article v-for="item in audioRows" :key="item.label" class="rounded-2xl border border-white/5 bg-ink-800/70 p-4">
                <div class="flex items-center justify-between gap-3">
                  <p class="text-sm text-zinc-200">{{ item.label }}</p>
                  <span class="text-xs text-zinc-500">{{ item.count }}</span>
                </div>
                <p class="mt-2 text-sm text-zinc-400">{{ item.detail }}</p>
              </article>
            </div>
          </section>
        </div>

        <section class="rounded-3xl border border-white/5 bg-ink-900/70 p-5">
          <p class="text-[11px] uppercase tracking-[0.2em] text-gold-400/80">Missing</p>
          <div class="mt-4 grid gap-4 desktop:grid-cols-2">
            <div>
              <p class="text-sm text-zinc-300">
                缺失视觉：{{ overview.missing.visual.length }} / {{ overview.storyboard.shotCount || 0 }}
              </p>
              <ul class="mt-2 space-y-1 text-sm text-amber-200">
                <li v-for="item in overview.missing.visual.slice(0, 12)" :key="item.shotId">
                  <NuxtLink :to="pathFor('storyboard')" class="hover:text-gold-300">
                    Shot {{ String(item.shotNumber || "").padStart(3, "0") || item.shotId }}
                  </NuxtLink>
                </li>
              </ul>
              <p v-if="!overview.missing.visual.length" class="mt-2 text-sm text-emerald-300">视觉素材已齐全</p>
            </div>
            <div>
              <p class="text-sm text-zinc-300">
                缺失对白：{{ overview.missing.dialogue.length }} / {{ overview.assets.voices.total || 0 }}
              </p>
              <ul class="mt-2 space-y-1 text-sm text-amber-200">
                <li v-for="item in overview.missing.dialogue.slice(0, 12)" :key="item.blockId">
                  <NuxtLink :to="pathFor('script')" class="hover:text-gold-300">
                    ScriptBlock {{ String(item.blockIndex || "").padStart(2, "0") || item.blockId }}
                  </NuxtLink>
                </li>
              </ul>
              <p v-if="!overview.missing.dialogue.length" class="mt-2 text-sm text-emerald-300">对白音频已齐全</p>
            </div>
          </div>
          <p class="mt-3 text-xs text-zinc-500">
            局部重生成：只处理缺失项。已成功的 Shot / ScriptBlock 不会被批量覆盖。
          </p>
        </section>

        <section class="rounded-3xl border border-white/5 bg-ink-900/70 p-5">
          <p class="text-[11px] uppercase tracking-[0.2em] text-gold-400/80">Shots</p>
          <p class="mt-1 text-sm text-zinc-500">图片 / 视频按镜头归属，不进入全局素材库作为生产主入口。</p>
          <div class="mt-4 space-y-3">
            <article
              v-for="shot in shotRows"
              :key="shot.id"
              class="rounded-2xl border border-white/5 bg-ink-800/70 p-4"
            >
              <div class="flex flex-wrap items-center justify-between gap-3">
                <p class="text-sm text-zinc-200">
                  {{ shot.scene }} · Shot {{ String(shot.number).padStart(3, "0") }}
                </p>
                <NuxtLink
                  :to="pathFor('storyboard')"
                  class="text-sm text-gold-300"
                >
                  {{ shot.ready ? "查看镜头" : "生成图片 / 视频" }}
                </NuxtLink>
              </div>
              <p class="mt-2 text-xs text-zinc-500">Image：{{ shot.image }} · Video：{{ shot.video }}</p>
            </article>
            <NuxtLink
              :to="pathFor('storyboard')"
              class="inline-flex rounded-xl border border-white/10 px-3 py-1.5 text-sm"
            >
              生成缺失视觉素材
            </NuxtLink>
            <p v-if="!shotRows.length" class="text-sm text-zinc-500">还没有镜头。</p>
          </div>
        </section>

        <section class="rounded-3xl border border-white/5 bg-ink-900/70 p-5">
          <p class="text-[11px] uppercase tracking-[0.2em] text-gold-400/80">Dialogue</p>
          <div class="mt-4 space-y-3">
            <article
              v-for="item in dialogueRows"
              :key="item.id"
              class="rounded-2xl border border-white/5 bg-ink-800/70 p-4"
            >
              <div class="flex flex-wrap items-center justify-between gap-3">
                <p class="text-sm text-zinc-200">{{ item.character }}：{{ item.content }}</p>
                <span class="text-xs" :class="item.ready ? 'text-emerald-300' : 'text-amber-200'">
                  {{ item.ready ? "已生成" : "未生成" }}
                </span>
              </div>
            </article>
            <p v-if="!dialogueRows.length" class="text-sm text-zinc-500">还没有对白块。</p>
            <NuxtLink
              :to="pathFor('script')"
              class="inline-flex rounded-xl border border-white/10 px-3 py-1.5 text-sm"
            >
              生成缺失对白
            </NuxtLink>
          </div>
        </section>

        <div class="grid gap-4 desktop:grid-cols-2">
          <section class="rounded-3xl border border-white/5 bg-ink-900/70 p-5">
            <p class="text-[11px] uppercase tracking-[0.2em] text-gold-400/80">Music</p>
            <div class="mt-4 space-y-3">
              <article v-for="item in musicAssets" :key="item.id" class="rounded-2xl border border-white/5 bg-ink-800/70 p-4">
                <div class="flex items-center justify-between gap-3">
                  <p class="text-sm text-zinc-200">{{ item.asset?.name || item.assetId }}</p>
                  <span class="text-xs" :class="item.isPrimary ? 'text-emerald-300' : 'text-zinc-500'">
                    {{ item.isPrimary ? "PRIMARY" : "候选" }}
                  </span>
                </div>
              </article>
              <p v-if="!musicAssets.length" class="text-sm text-zinc-500">还没有绑定音乐素材。</p>
            </div>
          </section>

          <section class="rounded-3xl border border-white/5 bg-ink-900/70 p-5">
            <p class="text-[11px] uppercase tracking-[0.2em] text-gold-400/80">SFX</p>
            <div class="mt-4 space-y-3">
              <article v-for="item in sfxAssets" :key="item.id" class="rounded-2xl border border-white/5 bg-ink-800/70 p-4">
                <div class="flex items-center justify-between gap-3">
                  <p class="text-sm text-zinc-200">{{ item.asset?.name || item.assetId }}</p>
                  <span class="text-xs" :class="item.isPrimary ? 'text-emerald-300' : 'text-zinc-500'">
                    {{ item.isPrimary ? "PRIMARY" : "候选" }}
                  </span>
                </div>
              </article>
              <p v-if="!sfxAssets.length" class="text-sm text-zinc-500">还没有绑定音效素材。</p>
              <NuxtLink
                :to="pathFor('storyboard')"
                class="inline-flex rounded-xl border border-white/10 px-3 py-1.5 text-sm"
              >
                生成缺失音效
              </NuxtLink>
            </div>
          </section>
        </div>
      </div>
    </PageState>
  </section>
</template>

<script setup lang="ts">
import {
  AssetType,
  AudioAssetRole,
  type EpisodeAudioAsset,
  type EpisodeOverview,
  type Script,
  type Storyboard,
} from "@ai-drama-studio/types";
import { getPrimaryBlockAsset, getPrimaryShotAsset } from "@ai-drama-studio/core";
import { computed, onMounted, ref } from "vue";
import { episodeActionPath, useEpisodeProductionPaths } from "~/composables/useEpisodeProduction";
import { useEpisodeWorkspaceContext, useNuxtApp, useRoute } from "#imports";

const route = useRoute();
const { pathFor, seasonId } = useEpisodeProductionPaths();
const { $api } = useNuxtApp();
const { projectId, workspacePath } = useEpisodeWorkspaceContext();
const episodeId = computed(() => String(route.params.episodeId || ""));

const loading = ref(false);
const error = ref<string | null>(null);
const overview = ref<EpisodeOverview | null>(null);
const script = ref<Script | null>(null);
const storyboard = ref<Storyboard | null>(null);
const musicAssets = ref<EpisodeAudioAsset[]>([]);
const sfxAssets = ref<EpisodeAudioAsset[]>([]);

const shotImageCount = computed(() =>
  (storyboard.value?.shots ?? []).filter((shot) =>
    Boolean(getPrimaryShotAsset(shot.assets, AssetType.IMAGE)?.asset),
  ).length,
);
const shotVideoCount = computed(() =>
  (storyboard.value?.shots ?? []).filter((shot) =>
    Boolean(getPrimaryShotAsset(shot.assets, AssetType.VIDEO)?.asset),
  ).length,
);
const dialogueCount = computed(() =>
  (script.value?.scenes ?? []).reduce(
    (sum, scene) =>
      sum +
      (scene.blocks ?? []).filter((block) => Boolean(getPrimaryBlockAsset(block.assets)?.asset)).length,
    0,
  ),
);

const summaryCards = computed(() => [
  { title: "Images", value: `${overview.value?.assets.images.ready ?? 0} / ${overview.value?.assets.images.total ?? 0}`, detail: "镜头主图或参考图" },
  { title: "Videos", value: `${overview.value?.assets.videos.ready ?? 0} / ${overview.value?.assets.videos.total ?? 0}`, detail: "镜头视频素材" },
  { title: "Voices", value: `${overview.value?.assets.voices.ready ?? 0} / ${overview.value?.assets.voices.total ?? 0}`, detail: "对白或语音结果" },
  { title: "Music", value: `${overview.value?.assets.music.ready ?? 0} / ${overview.value?.assets.music.total ?? 0}`, detail: "本集音乐绑定" },
  { title: "SFX", value: `${overview.value?.assets.sfx.ready ?? 0} / ${overview.value?.assets.sfx.total ?? 0}`, detail: "本集音效绑定" },
]);

const visualRows = computed(() => [
  {
    label: "已配置图片镜头",
    count: `${shotImageCount.value}/${overview.value?.storyboard.shotCount ?? 0}`,
    detail: "对应 storyboard shot 的主图片素材。",
  },
  {
    label: "已配置视频镜头",
    count: `${shotVideoCount.value}/${overview.value?.storyboard.shotCount ?? 0}`,
    detail: "用于动态镜头或视频替代。",
  },
]);

const audioRows = computed(() => [
  {
    label: "已配置对白配音",
    count: `${dialogueCount.value}/${overview.value?.assets.voices.total ?? 0}`,
    detail: "统计已有主配音资产的脚本块数量。",
  },
  {
    label: "已绑定音乐",
    count: String(musicAssets.value.length),
    detail: "音乐库中与本集关联的条目。",
  },
  {
    label: "已绑定音效",
    count: String(sfxAssets.value.length),
    detail: "音效库中与本集关联的条目。",
  },
]);

const shotRows = computed(() =>
  (storyboard.value?.shots ?? []).map((shot) => {
    const image = Boolean(getPrimaryShotAsset(shot.assets, AssetType.IMAGE)?.asset);
    const video = Boolean(getPrimaryShotAsset(shot.assets, AssetType.VIDEO)?.asset);
    return {
      id: shot.id,
      number: shot.shotNumber,
      scene: shot.sceneId ? "Scene" : "Shot",
      image: image ? "已生成" : "未生成",
      video: video ? "已生成" : "未生成",
      ready: image || video,
    };
  }),
);

const dialogueRows = computed(() =>
  (script.value?.scenes ?? []).flatMap((scene) =>
    (scene.blocks ?? [])
      .filter((block) => block.type === "DIALOGUE")
      .map((block) => ({
        id: block.id,
        character: block.character?.name || "对白",
        content: block.content,
        ready: Boolean(getPrimaryBlockAsset(block.assets)?.asset),
      })),
  ),
);

const nextAction = computed(() => {
  const action = overview.value?.nextAction;
  if (action) {
    return {
      label: action.label,
      to: episodeActionPath(projectId.value, episodeId.value, action.type),
    };
  }
  return {
    label: "返回本集工作台",
    to: workspacePath(episodeId.value),
  };
});

async function load() {
  loading.value = true;
  error.value = null;
  try {
    const [currentOverview, currentScript, currentStoryboard, currentMusic, currentSfx] = await Promise.all([
      $api.getEpisodeProductionOverview(projectId.value, episodeId.value),
      $api.getScript(projectId.value, episodeId.value).catch(() => null),
      $api.getEpisodeStoryboard(projectId.value, episodeId.value).catch(() => null),
      $api.getEpisodeAudioAssets(projectId.value, episodeId.value, AudioAssetRole.MUSIC),
      $api.getEpisodeAudioAssets(projectId.value, episodeId.value, AudioAssetRole.SFX),
    ]);
    overview.value = currentOverview;
    script.value = currentScript;
    storyboard.value = currentStoryboard;
    musicAssets.value = currentMusic;
    sfxAssets.value = currentSfx;
  } catch (err) {
    error.value = err instanceof Error ? err.message : "加载 Episode Assets 失败";
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void load();
});
</script>
