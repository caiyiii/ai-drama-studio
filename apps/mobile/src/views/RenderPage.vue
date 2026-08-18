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
        <ion-title>成片 Render</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <p class="hint">这是最终 Episode MP4 Render。复杂 Render 管理请使用 Web 工作台。</p>
      <div v-if="error" class="state">
        <p>{{ error }}</p>
        <ion-button fill="outline" size="small" @click="reload">重试</ion-button>
      </div>
      <p v-else-if="loading" class="state">正在载入…</p>
      <p v-else-if="jobs.length === 0" class="state">这一集还没有 Render 记录。</p>
      <div v-else>
        <article v-for="job in jobs" :key="job.id" class="card">
          <p class="eyebrow">v{{ job.timelineVersion }} · {{ statusLabel(job.status) }}</p>
          <p class="meta">{{ stageLabel(job.currentStage) }}</p>
          <p class="meta">
            <template v-if="job.progress == null && (job.status === 'RENDERING' || job.status === 'PREPARING')">
              Rendering…
            </template>
            <template v-else>进度 {{ job.progress ?? 0 }}%</template>
          </p>
          <p v-if="job.errorMessage" class="hint">{{ job.errorCode }} · {{ job.errorMessage }}</p>
          <video v-if="job.artifact?.url" :src="job.artifact.url" controls class="preview" />
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
  IonPage,
  IonTitle,
  IonToolbar,
} from "@ionic/vue";
import { ref, watch } from "vue";
import { useRoute } from "vue-router";
import { getRenderJobStageLabel, getRenderJobStatusLabel } from "@ai-drama-studio/core";
import type { RenderJob } from "@ai-drama-studio/types";
import { api } from "../api";

const route = useRoute();
const projectId = String(route.params.id);
const seasonId = String(route.params.seasonId);
const episodeId = String(route.params.episodeId);
const loading = ref(false);
const error = ref<string | null>(null);
const jobs = ref<RenderJob[]>([]);

function statusLabel(status: string) {
  return getRenderJobStatusLabel(status);
}
function stageLabel(stage: string) {
  return getRenderJobStageLabel(stage);
}

async function reload() {
  loading.value = true;
  error.value = null;
  try {
    jobs.value = await api.getRenderJobs(projectId, episodeId);
  } catch (err) {
    error.value = err instanceof Error ? err.message : "加载失败";
  } finally {
    loading.value = false;
  }
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
.card {
  margin-bottom: 16px;
  padding: 12px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
}
.preview {
  width: 100%;
  margin-top: 8px;
  background: #000;
}
</style>
