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
        <ion-title>{{ storyboard?.title ?? "分镜" }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <div v-if="error" class="state">
        <p>{{ error }}</p>
        <ion-button fill="outline" size="small" @click="reload">重试</ion-button>
      </div>
      <p v-else-if="loading" class="state">正在载入…</p>
      <p v-else-if="missing" class="state">这一集还没有分镜。AI 生成请使用 Web 工作台。</p>
      <div v-else-if="storyboard">
        <p class="hint">
          v{{ storyboard.version }} · {{ storyboard.status }}
          <span v-if="storyboard.stale"> · 剧本已更新，当前分镜可能已过期</span>
        </p>
        <p class="hint">可查看 Shot List 并做基础编辑。复杂 AI Generate 请使用 Web。</p>
        <ion-button
          v-for="shot in storyboard.shots || []"
          :key="shot.id"
          expand="block"
          fill="outline"
          class="ion-margin-top"
          :router-link="`/tabs/projects/${projectId}/seasons/${seasonId}/episodes/${episodeId}/storyboard/${shot.id}`"
        >
          Shot {{ String(shot.shotNumber).padStart(3, "0") }} · {{ shot.shotSize }} · {{ shot.durationSeconds }}s
        </ion-button>
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
  IonPage,
  IonTitle,
  IonToolbar,
} from "@ionic/vue";
import { watch } from "vue";
import { useRoute } from "vue-router";
import { useStoryboard } from "../composables/useStoryboard";

const route = useRoute();
const projectId = String(route.params.id);
const seasonId = String(route.params.seasonId);
const episodeId = String(route.params.episodeId);
const { storyboard, missing, loading, error, loadStoryboard } = useStoryboard();

function reload() {
  void loadStoryboard(projectId, episodeId);
}

watch(
  () => [route.params.id, route.params.episodeId],
  () => reload(),
  { immediate: true },
);
</script>

<style scoped>
.state,
.hint {
  color: #a1a1aa;
  line-height: 1.6;
}
</style>
