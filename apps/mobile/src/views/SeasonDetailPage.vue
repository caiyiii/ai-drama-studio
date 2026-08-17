<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button :default-href="`/tabs/projects/${projectId}/seasons`" text="返回" />
        </ion-buttons>
        <ion-title>{{ season?.title ?? "季详情" }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <div v-if="error" class="state">
        <p>{{ error }}</p>
        <ion-button fill="outline" size="small" @click="reload">重试</ion-button>
      </div>
      <p v-else-if="loading || !season" class="state">正在载入…</p>
      <div v-else>
        <p class="hint">AI 拆集请使用 Web 工作台。</p>
        <ion-item>
          <ion-input v-model="title" label="标题" label-placement="stacked" />
        </ion-item>
        <ion-item>
          <ion-textarea v-model="synopsis" label="简介" label-placement="stacked" auto-grow />
        </ion-item>
        <ion-button expand="block" class="ion-margin-top" :disabled="saving" @click="onSave">保存</ion-button>

        <ion-list class="ion-margin-top">
          <ion-item
            v-for="item in episodes"
            :key="item.id"
            button
            :router-link="`/tabs/projects/${projectId}/seasons/${seasonId}/episodes/${item.id}`"
          >
            <ion-label>
              <h2>E{{ String(item.number).padStart(2, "0") }} {{ item.title }}</h2>
              <p>{{ item.synopsis || "尚未填写简介" }}</p>
            </ion-label>
          </ion-item>
        </ion-list>

        <ion-item>
          <ion-input v-model.number="epNumber" type="number" label="集数" label-placement="stacked" />
        </ion-item>
        <ion-item>
          <ion-input v-model="epTitle" label="剧集标题" label-placement="stacked" />
        </ion-item>
        <ion-button expand="block" fill="outline" class="ion-margin-top" :disabled="saving" @click="onCreateEpisode">
          创建剧集草稿
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
  IonInput,
  IonItem,
  IonLabel,
  IonList,
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
const { season, episodes, loading, saving, error, loadSeason, saveSeason, createEpisode } = useStory();
const title = ref("");
const synopsis = ref("");
const epNumber = ref(1);
const epTitle = ref("");

function reload() {
  void loadSeason(projectId, seasonId);
}

watch(
  () => [route.params.id, route.params.seasonId],
  () => reload(),
  { immediate: true },
);

watch(season, (value) => {
  title.value = value?.title || "";
  synopsis.value = value?.synopsis || "";
});

async function onSave() {
  await saveSeason(projectId, seasonId, { title: title.value, synopsis: synopsis.value });
}

async function onCreateEpisode() {
  await createEpisode(projectId, seasonId, Number(epNumber.value) || 1, epTitle.value.trim() || "未命名剧集");
  epTitle.value = "";
}
</script>

<style scoped>
.state,
.hint {
  color: #a1a1aa;
  line-height: 1.6;
}
</style>
