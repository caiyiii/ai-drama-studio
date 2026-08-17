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
import { ref, watch } from "vue";
import { useRoute } from "vue-router";
import { useStory } from "../composables/useStory";

const route = useRoute();
const projectId = String(route.params.id);
const seasonId = String(route.params.seasonId);
const episodeId = String(route.params.episodeId);
const { episode, loading, saving, error, loadEpisode, saveEpisode } = useStory();
const title = ref("");
const synopsis = ref("");
const outline = ref("");

function reload() {
  void loadEpisode(projectId, seasonId, episodeId);
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
.block {
  margin-top: 16px;
}
pre {
  white-space: pre-wrap;
  color: #d4d4d8;
  font-size: 12px;
}
</style>
