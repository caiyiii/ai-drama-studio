<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button
            :default-href="`/tabs/projects/${projectId}/seasons/${seasonId}/episodes/${episodeId}`"
            text="返回"
          />
        </ion-buttons>
        <ion-title>时间线预览</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <p class="hint">这是合成预览，不是最终视频导出。复杂时间线编辑请使用 Web。</p>
      <div v-if="error" class="state">
        <p>{{ error }}</p>
        <ion-button fill="outline" size="small" @click="reload">重试</ion-button>
      </div>
      <p v-else-if="loading" class="state">正在载入…</p>
      <p v-else-if="!preview" class="state">这一集还没有时间线。请在 Web 工作台构建。</p>
      <div v-else>
        <p class="meta">{{ preview.readyMessage }}</p>
        <p v-if="preview.missing.visual.length || preview.missing.dialogue.length || preview.missing.music || preview.missing.sfx" class="hint">
          存在缺失素材，仍可预览，不会自动生成。
        </p>
        <video
          v-if="visualSrc"
          :src="visualSrc"
          controls
          class="preview"
        />
        <p v-else class="hint">当前没有可播放的视觉片段。</p>
        <article v-for="track in preview.manifest.tracks" :key="track.id" class="track">
          <p class="eyebrow">{{ track.name }} {{ track.muted ? "· muted" : "" }}</p>
          <p class="meta">{{ (track.clips || []).length }} clips · vol {{ track.volume }}</p>
          <div v-for="clip in track.clips || []" :key="clip.id" class="clip">
            <p class="meta">{{ clip.type }} · {{ clip.startTime }}s / {{ clip.duration }}s</p>
            <audio v-if="clip.type === 'AUDIO' && clip.asset?.url" :src="clip.asset.url" controls />
            <ion-item v-if="clip.type !== 'AUDIO'">
              <ion-toggle :checked="clip.enabled" @ionChange="(event) => onToggle(clip.id, event.detail.checked)">
                启用片段
              </ion-toggle>
            </ion-item>
          </div>
        </article>
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
  IonItem,
  IonPage,
  IonTitle,
  IonToggle,
  IonToolbar,
} from "@ionic/vue";
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";
import type { CompositionPreview } from "@ai-drama-studio/types";
import { api } from "../api";

const route = useRoute();
const projectId = String(route.params.id);
const seasonId = String(route.params.seasonId);
const episodeId = String(route.params.episodeId);
const loading = ref(false);
const error = ref<string | null>(null);
const preview = ref<CompositionPreview | null>(null);
const timelineId = ref<string | null>(null);

const visualSrc = computed(() => {
  const clips = preview.value?.manifest.tracks.flatMap((track) => track.clips) ?? [];
  const video = clips.find((clip) => clip.type === "VIDEO" && clip.enabled && clip.asset?.url);
  const image = clips.find((clip) => clip.type === "IMAGE" && clip.enabled && clip.asset?.url);
  return video?.asset?.url || image?.asset?.url || "";
});

async function reload() {
  loading.value = true;
  error.value = null;
  try {
    const timeline = await api.getEpisodeTimeline(projectId, episodeId);
    timelineId.value = timeline.id;
    preview.value = await api.getCompositionPreview(projectId, episodeId);
  } catch (err) {
    preview.value = null;
    error.value = err instanceof Error ? err.message : "加载失败";
    if (String(error.value).includes("尚未创建时间线") || String(error.value).includes("TIMELINE_NOT_FOUND")) {
      error.value = null;
    }
  } finally {
    loading.value = false;
  }
}

async function onToggle(clipId: string, enabled: boolean) {
  if (!timelineId.value) {
    return;
  }
  await api.updateTimelineClip(projectId, timelineId.value, clipId, { enabled });
  await reload();
}

watch(
  () => [route.params.id, route.params.episodeId],
  () => reload(),
  { immediate: true },
);
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
.track {
  margin-top: 16px;
}
.clip {
  margin-top: 8px;
}
.preview,
audio {
  width: 100%;
  margin-top: 8px;
}
</style>
