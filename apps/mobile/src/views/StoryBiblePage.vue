<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button :default-href="`/tabs/projects/${projectId}`" text="返回" />
        </ion-buttons>
        <ion-title>故事圣经</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <div v-if="error" class="state">
        <p>{{ error }}</p>
        <ion-button fill="outline" size="small" @click="() => loadBible(projectId)">重试</ion-button>
      </div>
      <p v-else-if="loading" class="state">正在载入…</p>
      <div v-else>
        <p class="hint">AI 生成请使用 Web 工作台。</p>
        <ion-item>
          <ion-input v-model="title" label="作品名称" label-placement="stacked" />
        </ion-item>
        <ion-item>
          <ion-textarea v-model="logline" label="故事一句话" label-placement="stacked" auto-grow />
        </ion-item>
        <ion-item>
          <ion-textarea v-model="premise" label="故事前提" label-placement="stacked" auto-grow />
        </ion-item>
        <ion-item>
          <ion-input v-model="theme" label="主题" label-placement="stacked" />
        </ion-item>
        <ion-button expand="block" class="ion-margin-top" :disabled="saving" @click="onSave">
          {{ missingBible ? "创建" : "保存" }}
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
const { bible, missingBible, loading, saving, error, loadBible, saveBible } = useStory();
const title = ref("");
const logline = ref("");
const premise = ref("");
const theme = ref("");

watch(
  () => route.params.id,
  (id) => {
    if (typeof id === "string") {
      void loadBible(id);
    }
  },
  { immediate: true },
);

watch(bible, (value) => {
  title.value = value?.title || "";
  logline.value = value?.logline || "";
  premise.value = value?.premise || "";
  theme.value = value?.theme || "";
});

async function onSave() {
  await saveBible(projectId, {
    title: title.value.trim() || "未命名作品",
    logline: logline.value,
    premise: premise.value,
    theme: theme.value,
  });
}
</script>

<style scoped>
.state,
.hint {
  color: #a1a1aa;
  line-height: 1.6;
}
</style>
