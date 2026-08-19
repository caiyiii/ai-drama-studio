<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button :default-href="`/tabs/projects/${projectId}/seasons/${seasonId}`" text="返回" />
        </ion-buttons>
        <ion-title>{{ episode?.title ?? "剧集" }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <div v-if="error" class="state">
        <p>{{ error }}</p>
        <ion-button fill="outline" size="small" @click="reload">重试</ion-button>
      </div>
      <p v-else-if="loading || !episode" class="state">正在载入…</p>
      <div v-else>
        <p class="hint">AI 生成本集大纲与完整剧本请使用 Web 工作台。</p>
        <p class="meta">E{{ String(episode.number).padStart(2, "0") }} · {{ episode.durationSeconds || 0 }} 秒</p>
        <section class="block">
          <p class="eyebrow">Production Progress</p>
          <p class="meta">{{ overview?.productionStage || "PLANNING" }} · {{ completedStepCount }}/7 已完成</p>
          <p class="hint">下一步：{{ nextLabel }}。复杂编辑请在 Web 端完成。</p>
          <p v-if="overview" class="hint">
            视觉 {{ overview.assets.images.ready + overview.assets.videos.ready > 0 ? Math.max(overview.storyboard.shotCount - overview.missing.visual.length, 0) : 0 }}/{{ overview.storyboard.shotCount }}
            · 对白 {{ overview.assets.voices.ready }}/{{ overview.assets.voices.total }}
            · 音乐 {{ overview.assets.music.ready }}/{{ overview.assets.music.total }}
          </p>
        </section>
        <ion-item>
          <ion-input v-model="title" label="标题" label-placement="stacked" />
        </ion-item>
        <ion-item>
          <ion-textarea v-model="synopsis" label="简介" label-placement="stacked" auto-grow />
        </ion-item>
        <ion-item>
          <ion-textarea v-model="outline" label="大纲" label-placement="stacked" auto-grow />
        </ion-item>
        <ion-button expand="block" fill="outline" class="ion-margin-top" :router-link="`/tabs/projects/${projectId}/seasons/${seasonId}/episodes/${episodeId}/script`">
          查看剧本
        </ion-button>
        <ion-button expand="block" fill="outline" class="ion-margin-top" :router-link="`/tabs/projects/${projectId}/seasons/${seasonId}/episodes/${episodeId}/storyboard`">
          查看分镜
        </ion-button>
        <ion-button expand="block" fill="outline" class="ion-margin-top" :router-link="`/tabs/projects/${projectId}/seasons/${seasonId}/episodes/${episodeId}/timeline`">
          查看时间线预览
        </ion-button>
        <ion-button expand="block" fill="outline" class="ion-margin-top" :router-link="`/tabs/projects/${projectId}/seasons/${seasonId}/episodes/${episodeId}/render`">
          查看成片 Render
        </ion-button>
        <section v-if="musicItems.length || sfxItems.length" class="block">
          <p class="eyebrow">Music / SFX</p>
          <p class="hint">可播放已生成的剧集音频。复杂 AI 生成请使用 Web 工作台。</p>
          <article v-for="item in musicItems" :key="item.id" class="audio-card">
            <p class="meta">🎵 {{ item.asset?.name || "Music" }}</p>
            <audio v-if="item.asset?.url" :src="item.asset.url" controls />
          </article>
          <article v-for="item in sfxItems" :key="'sfx-' + item.id" class="audio-card">
            <p class="meta">🔊 {{ item.asset?.name || "SFX" }}</p>
            <audio v-if="item.asset?.url" :src="item.asset.url" controls />
          </article>
        </section>
        <p v-else class="hint">复杂 Music / SFX 生成请使用 Web 工作台。</p>
        <ion-button expand="block" class="ion-margin-top" :disabled="saving" @click="onSave">保存</ion-button>
        <section v-if="episode.storyState" class="block">
          <p class="eyebrow">Story State</p>
          <pre>{{ JSON.stringify(episode.storyState, null, 2) }}</pre>
        </section>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonPage,
  IonTextarea,
  IonTitle,
  IonToolbar,
} from "@ionic/vue";
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";
import {
  AudioAssetRole,
  type EpisodeAudioAsset,
  type EpisodeOverview,
} from "@ai-drama-studio/types";
import { useStory } from "../composables/useStory";
import { api } from "../api";

const route = useRoute();
const projectId = String(route.params.id);
const seasonId = String(route.params.seasonId);
const episodeId = String(route.params.episodeId);
const { episode, loading, saving, error, loadEpisode, saveEpisode } = useStory();
const title = ref("");
const synopsis = ref("");
const outline = ref("");
const musicItems = ref<EpisodeAudioAsset[]>([]);
const sfxItems = ref<EpisodeAudioAsset[]>([]);
const overview = ref<EpisodeOverview | null>(null);

const completedStepCount = computed(
  () => overview.value?.progress.filter((item) => item.state === "COMPLETED" || item.state === "LOCKED").length ?? 0,
);
const nextLabel = computed(() => overview.value?.nextAction.label || "查看本集");

function reload() {
  void loadEpisode(projectId, seasonId, episodeId);
  void loadAudio();
}

async function loadAudio() {
  try {
    const [music, sfx, loadedOverview] = await Promise.all([
      api.getEpisodeAudioAssets(projectId, episodeId, AudioAssetRole.MUSIC),
      api.getEpisodeAudioAssets(projectId, episodeId, AudioAssetRole.SFX),
      api.getEpisodeProductionOverview(projectId, episodeId).catch(() => null),
    ]);
    musicItems.value = music;
    sfxItems.value = sfx;
    overview.value = loadedOverview;
  } catch {
    musicItems.value = [];
    sfxItems.value = [];
    overview.value = null;
  }
}

watch(
  () => [route.params.id, route.params.seasonId, route.params.episodeId],
  () => reload(),
  { immediate: true },
);

watch(episode, (value) => {
  title.value = value?.title || "";
  synopsis.value = value?.synopsis || "";
  outline.value = value?.outline || "";
});

async function onSave() {
  await saveEpisode(projectId, seasonId, episodeId, {
    title: title.value,
    synopsis: synopsis.value,
    outline: outline.value,
  });
}
</script>

<style scoped>
.state,
.hint,
.meta {
  color: #a1a1aa;
  line-height: 1.6;
}
.eyebrow {
  color: #d4af37;
  letter-spacing: 0.16em;
  font-size: 11px;
  text-transform: uppercase;
}
.audio-card {
  margin-top: 8px;
}
audio {
  width: 100%;
  margin-top: 4px;
}
pre {
  white-space: pre-wrap;
  color: #d4d4d8;
  font-size: 12px;
}
</style>
