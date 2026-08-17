<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button :default-href="`/tabs/projects/${projectId}`" text="返回" />
        </ion-buttons>
        <ion-title>人物</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <div v-if="error" class="state">
        <p>{{ error }}</p>
        <ion-button fill="outline" size="small" @click="() => load(projectId)">重试</ion-button>
      </div>
      <p v-else-if="loading" class="state">正在载入…</p>
      <div v-else-if="characters.length === 0" class="state">
        <p>还没有人物</p>
        <p class="hint">创建第一个角色。完整 AI 生成请使用 Web。</p>
        <ion-item>
          <ion-input v-model="name" label="名称" label-placement="stacked" />
        </ion-item>
        <ion-button expand="block" class="ion-margin-top" :disabled="saving" @click="onCreate">
          创建第一个角色
        </ion-button>
      </div>
      <ion-list v-else>
        <ion-item
          v-for="item in characters"
          :key="item.id"
          button
          :router-link="`/tabs/projects/${projectId}/characters/${item.id}`"
        >
          <ion-label>
            <h2>{{ item.name }}</h2>
            <p>{{ item.role || "未定位" }} · {{ item.civilization?.name || "无所属文明" }}</p>
          </ion-label>
        </ion-item>
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
  IonLabel,
  IonList,
  IonPage,
  IonTitle,
  IonToolbar,
} from "@ionic/vue";
import { ref, watch } from "vue";
import { useRoute } from "vue-router";
import { useCharacters } from "../composables/useCharacters";

const route = useRoute();
const projectId = String(route.params.id);
const { characters, loading, saving, error, load, create } = useCharacters();
const name = ref("");

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
  const created = await create(projectId, { name: name.value.trim() || "未命名人物" });
  if (created) {
    name.value = "";
  }
}
</script>

<style scoped>
.state,
.hint {
  color: #a1a1aa;
  line-height: 1.6;
}
</style>
