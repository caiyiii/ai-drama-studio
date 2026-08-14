<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button :default-href="`/tabs/projects/${projectId}`" text="返回" />
        </ion-buttons>
        <ion-title>世界观</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <div v-if="error" class="state">
        <p>{{ error }}</p>
        <ion-button fill="outline" size="small" @click="() => load(projectId)">重试</ion-button>
      </div>
      <p v-else-if="loading" class="state">正在载入…</p>
      <div v-else-if="missing" class="state">
        <p>还没有世界观</p>
        <ion-item>
          <ion-input v-model="title" label="世界名称" label-placement="stacked" />
        </ion-item>
        <ion-button expand="block" class="ion-margin-top" :disabled="saving" @click="onCreate">
          创建世界观
        </ion-button>
      </div>
      <ion-list v-else>
        <ion-item button :router-link="`/tabs/projects/${projectId}/world/overview`">概览</ion-item>
        <ion-item button :router-link="`/tabs/projects/${projectId}/world/civilizations`">文明</ion-item>
        <ion-item button :router-link="`/tabs/projects/${projectId}/world/history`">历史</ion-item>
        <ion-item button :router-link="`/tabs/projects/${projectId}/world/factions`">势力</ion-item>
        <ion-item button :router-link="`/tabs/projects/${projectId}/world/locations`">地点</ion-item>
        <ion-item button :router-link="`/tabs/projects/${projectId}/world/power`">能力体系</ion-item>
      </ion-list>
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
  IonList,
  IonPage,
  IonTitle,
  IonToolbar,
} from "@ionic/vue";
import { ref, watch } from "vue";
import { useRoute } from "vue-router";
import { useWorld } from "../composables/useWorld";

const route = useRoute();
const projectId = String(route.params.id);
const { loading, saving, error, missing, load, createWorld } = useWorld();
const title = ref("未命名世界");

watch(
  () => route.params.id,
  (id) => {
    if (typeof id === "string") {
      void load(id);
    }
  },
  { immediate: true },
);

async function onCreate() {
  await createWorld(projectId, { title: title.value.trim() || "未命名世界" });
}
</script>

<style scoped>
.state {
  color: #a1a1aa;
  padding: 12px 0;
}
</style>
