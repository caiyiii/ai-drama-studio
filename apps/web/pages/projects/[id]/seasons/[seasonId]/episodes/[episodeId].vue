<template>
  <section class="px-4 py-6 tablet:px-8 desktop:px-8">
    <PageState
      :loading="store.loading"
      :error="store.error"
      loading-text="正在载入剧集…"
      :on-retry="reload"
    >
      <div v-if="store.episode" class="space-y-6">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p class="text-[11px] uppercase tracking-[0.2em] text-gold-400/80">
              {{ store.season?.title || "Season" }} · E{{ String(store.episode.number).padStart(2, "0") }}
            </p>
            <h1 class="mt-1 font-display text-3xl">{{ store.episode.title }}</h1>
            <p class="mt-2 text-sm text-zinc-500">
              {{ statusLabel(store.episode.status) }}
              · {{ store.episode.durationSeconds ? `${Math.round(store.episode.durationSeconds / 60)} 分钟` : "时长未定" }}
            </p>
          </div>
          <div class="flex gap-2">
            <NuxtLink
              :to="`/projects/${projectId}/episodes/${episodeId}/timeline`"
              class="rounded-xl border border-gold-400/30 px-3 py-1.5 text-sm text-gold-300"
            >
              进入时间线
            </NuxtLink>
            <NuxtLink
              :to="`/projects/${projectId}/episodes/${episodeId}/script`"
              class="rounded-xl border border-white/10 px-3 py-1.5 text-sm"
            >
              进入剧本
            </NuxtLink>
            <NuxtLink
              :to="`/projects/${projectId}/episodes/${episodeId}/storyboard`"
              class="rounded-xl border border-white/10 px-3 py-1.5 text-sm"
            >
              进入分镜
            </NuxtLink>
            <EpisodeOutlineGenerateModal
              :project-id="projectId"
              :episode-id="episodeId"
              @applied="reload"
            />
            <button type="button" class="rounded-xl border border-red-500/30 px-3 py-1.5 text-sm text-red-300" @click="confirmDelete = true">
              删除
            </button>
          </div>
        </div>

        <p v-if="store.actionError" class="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {{ store.actionError }}
        </p>

        <form class="space-y-3" @submit.prevent="onSave">
          <input v-model="form.title" class="studio-field" />
          <textarea v-model="form.synopsis" rows="3" class="studio-field resize-none" placeholder="简介" />
          <textarea v-model="form.outline" rows="6" class="studio-field resize-none" placeholder="故事大纲" />
          <div class="grid gap-3 tablet:grid-cols-3">
            <textarea v-model="form.opening" rows="3" class="studio-field resize-none" placeholder="开场" />
            <textarea v-model="form.middle" rows="3" class="studio-field resize-none" placeholder="中段" />
            <textarea v-model="form.ending" rows="3" class="studio-field resize-none" placeholder="结尾" />
          </div>
          <textarea v-model="form.conflict" rows="2" class="studio-field resize-none" placeholder="核心冲突" />
          <textarea v-model="form.cliffhanger" rows="2" class="studio-field resize-none" placeholder="悬念" />
          <input v-model="form.keyCharacters" class="studio-field" placeholder="主要人物，逗号分隔" />
          <input v-model="form.keyLocations" class="studio-field" placeholder="主要地点，逗号分隔" />
          <button type="submit" :disabled="store.saving" class="rounded-xl bg-gold-400 px-4 py-2 text-sm font-medium text-ink-950">
            保存
          </button>
        </form>

        <section class="rounded-2xl border border-white/5 bg-ink-800/60 p-4">
          <h2 class="font-display text-xl">Episode Workspace</h2>
          <p class="mt-1 text-xs text-zinc-500">Timeline 是合成层，不生产新素材。</p>
          <div class="mt-3 flex flex-wrap gap-2 text-sm">
            <NuxtLink :to="`/projects/${projectId}/episodes/${episodeId}/script`" class="rounded-xl border border-white/10 px-3 py-1.5">剧本</NuxtLink>
            <NuxtLink :to="`/projects/${projectId}/episodes/${episodeId}/storyboard`" class="rounded-xl border border-white/10 px-3 py-1.5">分镜</NuxtLink>
            <NuxtLink :to="`/projects/${projectId}/images`" class="rounded-xl border border-white/10 px-3 py-1.5">图片</NuxtLink>
            <NuxtLink :to="`/projects/${projectId}/videos`" class="rounded-xl border border-white/10 px-3 py-1.5">视频</NuxtLink>
            <NuxtLink :to="`/projects/${projectId}/voices`" class="rounded-xl border border-white/10 px-3 py-1.5">配音</NuxtLink>
            <NuxtLink :to="`/projects/${projectId}/music`" class="rounded-xl border border-white/10 px-3 py-1.5">音乐</NuxtLink>
            <NuxtLink :to="`/projects/${projectId}/sfx`" class="rounded-xl border border-white/10 px-3 py-1.5">音效</NuxtLink>
            <NuxtLink :to="`/projects/${projectId}/episodes/${episodeId}/timeline`" class="rounded-xl border border-gold-400/30 px-3 py-1.5 text-gold-300">时间线</NuxtLink>
          </div>
        </section>

        <section class="rounded-2xl border border-white/5 bg-ink-800/60 p-4">
          <h2 class="font-display text-xl">Story State</h2>
          <pre class="mt-3 overflow-auto text-xs text-zinc-400">{{ JSON.stringify(store.episode.storyState, null, 2) }}</pre>
          <p class="mt-4 text-sm text-zinc-500">Unresolved Threads</p>
          <ul class="mt-1 list-disc pl-5 text-sm text-zinc-400">
            <li v-for="item in listOf(store.episode.storyState?.unresolvedThreads)" :key="String(item)">{{ item }}</li>
          </ul>
          <p class="mt-4 text-sm text-zinc-500">Foreshadowing</p>
          <ul class="mt-1 list-disc pl-5 text-sm text-zinc-400">
            <li v-for="item in listOf(store.episode.storyState?.foreshadowing)" :key="String(item)">{{ item }}</li>
          </ul>
        </section>

        <section class="rounded-2xl border border-white/5 bg-ink-800/60 p-4">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 class="font-display text-xl">🎵 Music</h2>
              <p class="mt-1 text-xs text-zinc-500">剧集背景音乐。生成后需确认 Apply，不会进入分镜或对白。</p>
            </div>
            <div class="flex gap-2">
              <NuxtLink :to="`/projects/${projectId}/music`" class="rounded-xl border border-white/10 px-3 py-1.5 text-xs">
                查看历史
              </NuxtLink>
              <MusicGenerationModal :project-id="projectId" :episode-id="episodeId" @applied="reloadAudio" />
            </div>
          </div>
          <div v-if="musicAssets.length === 0" class="mt-3 text-sm text-zinc-500">尚未应用音乐。</div>
          <ul v-else class="mt-3 space-y-3">
            <li v-for="item in musicAssets" :key="item.id" class="rounded-xl border border-white/5 p-3">
              <p class="text-sm text-zinc-100">{{ item.asset?.name }} {{ item.isPrimary ? "· Final" : "" }}</p>
              <audio v-if="audioSrc(item)" :src="audioSrc(item)" controls class="mt-2 w-full" />
            </li>
          </ul>
        </section>

        <section class="rounded-2xl border border-white/5 bg-ink-800/60 p-4">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 class="font-display text-xl">🔊 SFX</h2>
              <p class="mt-1 text-xs text-zinc-500">剧集音效。时间线编排请进入合成预览，本页不混音。</p>
            </div>
            <div class="flex gap-2">
              <NuxtLink :to="`/projects/${projectId}/sfx`" class="rounded-xl border border-white/10 px-3 py-1.5 text-xs">
                查看历史
              </NuxtLink>
              <SfxGenerationModal :project-id="projectId" :episode-id="episodeId" @applied="reloadAudio" />
            </div>
          </div>
          <div v-if="sfxAssets.length === 0" class="mt-3 text-sm text-zinc-500">尚未应用音效。</div>
          <ul v-else class="mt-3 space-y-3">
            <li v-for="item in sfxAssets" :key="item.id" class="rounded-xl border border-white/5 p-3">
              <p class="text-sm text-zinc-100">{{ item.asset?.name }} {{ item.isPrimary ? "· Final" : "" }}</p>
              <audio v-if="audioSrc(item)" :src="audioSrc(item)" controls class="mt-2 w-full" />
            </li>
          </ul>
        </section>

        <WorldGenerationHistory :items="store.episodeOutlineGenerations" :type="GenerationTaskType.EPISODE_OUTLINE" />
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
import { getEpisodeStatusLabel, resolveAssetDisplayUrl } from "@ai-drama-studio/core";
import { GenerationTaskType, AudioAssetRole, type EpisodeAudioAsset, type EpisodeStatus } from "@ai-drama-studio/types";
import { useCurrentProject } from "~/composables/useCurrentProject";
import { useStoryStore } from "~/stores/story";
import { useAiProviderStore } from "~/stores/ai-provider";

const route = useRoute();
const { projectId } = useCurrentProject();
const store = useStoryStore();
const aiStore = useAiProviderStore();
const { $api } = useNuxtApp();
const runtime = useRuntimeConfig();
const seasonId = computed(() => String(route.params.seasonId || ""));
const episodeId = computed(() => String(route.params.episodeId || ""));
const confirmDelete = ref(false);
const musicAssets = ref<EpisodeAudioAsset[]>([]);
const sfxAssets = ref<EpisodeAudioAsset[]>([]);
const form = reactive({
  title: "",
  synopsis: "",
  outline: "",
  opening: "",
  middle: "",
  ending: "",
  conflict: "",
  cliffhanger: "",
  keyCharacters: "",
  keyLocations: "",
});

function statusLabel(status: EpisodeStatus) {
  return getEpisodeStatusLabel(status);
}

function listOf(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function asMeta(key: string) {
  const meta = store.episode?.metadata;
  if (!meta || typeof meta !== "object") {
    return "";
  }
  const value = meta[key];
  return Array.isArray(value) ? value.join("，") : String(value || "");
}

function syncForm() {
  const episode = store.episode;
  form.title = episode?.title || "";
  form.synopsis = episode?.synopsis || "";
  form.outline = episode?.outline || "";
  form.opening = asMeta("opening");
  form.middle = asMeta("middle");
  form.ending = asMeta("ending");
  form.conflict = asMeta("conflict");
  form.cliffhanger = episode?.continuityNotes || asMeta("cliffhanger");
  form.keyCharacters = asMeta("keyCharacters");
  form.keyLocations = asMeta("keyLocations");
}

function audioSrc(item: EpisodeAudioAsset) {
  return resolveAssetDisplayUrl(runtime.public.apiBase, item.asset?.url) ?? "";
}

async function reloadAudio() {
  if (!projectId.value || !episodeId.value) {
    return;
  }
  const [music, sfx] = await Promise.all([
    $api.getEpisodeAudioAssets(projectId.value, episodeId.value, AudioAssetRole.MUSIC),
    $api.getEpisodeAudioAssets(projectId.value, episodeId.value, AudioAssetRole.SFX),
  ]);
  musicAssets.value = music;
  sfxAssets.value = sfx;
}

async function reload() {
  await store.loadEpisode(projectId.value, seasonId.value, episodeId.value);
  syncForm();
  await Promise.all([
    aiStore.loadProjectAiConfig(projectId.value),
    reloadAudio(),
  ]);
}

onMounted(() => {
  void reload();
});

async function onSave() {
  await store.updateEpisode(projectId.value, seasonId.value, episodeId.value, {
    title: form.title,
    synopsis: form.synopsis,
    outline: form.outline,
    continuityNotes: form.cliffhanger,
  });
}

async function onDelete() {
  confirmDelete.value = false;
  const ok = await store.removeEpisode(projectId.value, seasonId.value, episodeId.value);
  if (ok) {
    await navigateTo(`/projects/${projectId.value}/seasons/${seasonId.value}`);
  }
}
</script>
