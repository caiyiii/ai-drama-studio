<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button
            :default-href="`/tabs/projects/${projectId}/seasons/${seasonId}/episodes/${episodeId}/storyboard`"
            text="返回"
          />
        </ion-buttons>
        <ion-title>镜头详情</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <p v-if="!shot" class="state">镜头不存在。</p>
      <div v-else>
        <p class="eyebrow">Shot {{ String(shot.shotNumber).padStart(3, "0") }}</p>
        <p class="meta">{{ shot.shotType }} · {{ shot.shotSize }} · {{ shot.cameraMovement }}</p>
        <ion-item>
          <ion-textarea v-model="visualDescription" label="视觉描述" label-placement="stacked" auto-grow />
        </ion-item>
        <ion-item>
          <ion-input v-model.number="durationSeconds" type="number" label="时长（秒）" label-placement="stacked" />
        </ion-item>
        <ion-item>
          <ion-textarea v-model="imagePrompt" label="Image Prompt" label-placement="stacked" auto-grow />
        </ion-item>
        <ion-item>
          <ion-textarea v-model="videoPrompt" label="Video Prompt" label-placement="stacked" auto-grow />
        </ion-item>
        <ion-button expand="block" class="ion-margin-top" :disabled="saving" @click="onSave">保存</ion-button>
        <p class="hint">AI 生成请使用 Web 工作台。</p>
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
import { useStoryboard } from "../composables/useStoryboard";

const route = useRoute();
const projectId = String(route.params.id);
const seasonId = String(route.params.seasonId);
const episodeId = String(route.params.episodeId);
const shotId = String(route.params.shotId);
const { storyboard, saving, loadStoryboard, saveShot } = useStoryboard();
const visualDescription = ref("");
const durationSeconds = ref(3);
const imagePrompt = ref("");
const videoPrompt = ref("");

const shot = computed(
  () => storyboard.value?.shots?.find((item) => item.id === shotId) ?? null,
);

watch(
  () => [route.params.id, route.params.episodeId, route.params.shotId],
  () => {
    void loadStoryboard(projectId, episodeId);
  },
  { immediate: true },
);

watch(shot, (value) => {
  visualDescription.value = value?.visualDescription || "";
  durationSeconds.value = value?.durationSeconds || 3;
  imagePrompt.value = value?.imagePrompt || "";
  videoPrompt.value = value?.videoPrompt || "";
});

async function onSave() {
  await saveShot(projectId, episodeId, shotId, {
    visualDescription: visualDescription.value,
    durationSeconds: durationSeconds.value,
    imagePrompt: imagePrompt.value,
    videoPrompt: videoPrompt.value,
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
</style>
