<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button :default-href="`/tabs/projects/${projectId}`" text="返回" />
        </ion-buttons>
        <ion-title>季</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <div v-if="error" class="state">
        <p>{{ error }}</p>
        <ion-button fill="outline" size="small" @click="() => loadSeasons(projectId)">重试</ion-button>
      </div>
      <p v-else-if="loading" class="state">正在载入…</p>
      <div v-else>
        <ion-list v-if="seasons.length > 0">
          <ion-item
            v-for="item in seasons"
            :key="item.id"
            button
            :router-link="`/tabs/projects/${projectId}/seasons/${item.id}`"
          >
            <ion-label>
              <h2>Season {{ item.number }} · {{ item.title }}</h2>
              <p>{{ item.synopsis || "尚未填写简介" }}</p>
            </ion-label>
          </ion-item>
        </ion-list>
        <p v-else class="state">还没有季</p>
        <ion-item>
          <ion-input v-model.number="number" type="number" label="季数" label-placement="stacked" />
        </ion-item>
        <ion-item>
          <ion-input v-model="title" label="标题" label-placement="stacked" />
        </ion-item>
        <ion-button expand="block" class="ion-margin-top" :disabled="saving" @click="onCreate">创建季</ion-button>
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
  IonLabel,
  IonList,
  IonPage,
  IonTitle,
  IonToolbar,
} from "@ionic/vue";
import { ref, watch } from "vue";
import { useRoute } from "vue-router";
import { useStory } from "../composables/useStory";

const route = useRoute();
const projectId = String(route.params.id);
const { seasons, loading, saving, error, loadSeasons, createSeason } = useStory();
const number = ref(1);
const title = ref("");

watch(
  () => route.params.id,
  (id) => {
    if (typeof id === "string") {
      void loadSeasons(id);
    }
  },
  { immediate: true },
);

async function onCreate() {
  await createSeason(projectId, Number(number.value) || 1, title.value.trim() || "未命名季");
  title.value = "";
}
</script>

<style scoped>
.state {
  color: #a1a1aa;
  line-height: 1.6;
}
</style>
