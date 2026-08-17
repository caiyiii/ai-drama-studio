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
        <ion-title>{{ script?.title ?? "剧本" }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <div v-if="error" class="state">
        <p>{{ error }}</p>
        <ion-button fill="outline" size="small" @click="reload">重试</ion-button>
      </div>
      <p v-else-if="loading" class="state">正在载入…</p>
      <p v-else-if="missing" class="state">这一集还没有剧本。复杂 AI 生成请使用 Web 工作台。</p>
      <div v-else-if="script">
        <p class="hint">可查看 Scene / Dialogue / Action / Narration，并做基础编辑。AI 生成请使用 Web。</p>
        <ion-item>
          <ion-input v-model="title" label="标题" label-placement="stacked" />
        </ion-item>
        <ion-item>
          <ion-textarea v-model="summary" label="概要" label-placement="stacked" auto-grow />
        </ion-item>
        <ion-button expand="block" class="ion-margin-top" :disabled="saving" @click="onSaveScript">保存剧本</ion-button>

        <section v-for="scene in script.scenes || []" :key="scene.id" class="block">
          <p class="eyebrow">Scene {{ scene.number }}</p>
          <h2>{{ scene.title }}</h2>
          <p class="meta">{{ scene.location || "地点未定" }} · {{ scene.timeOfDay || "时间未定" }}</p>
          <div v-for="block in scene.blocks || []" :key="block.id" class="card">
            <p class="type">{{ blockLabel(block.type) }} <span v-if="block.character">· {{ block.character.name }}</span></p>
            <ion-textarea
              :value="block.content"
              auto-grow
              @ionBlur="(event) => onSaveBlock(scene.id, block.id, textareaValue(event))"
            />
          </div>
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
import { getScriptBlockTypeLabel } from "@ai-drama-studio/core";
import type { ScriptBlockType } from "@ai-drama-studio/types";
import { ref, watch } from "vue";
import { useRoute } from "vue-router";
import { useScript } from "../composables/useScript";

const route = useRoute();
const projectId = String(route.params.id);
const seasonId = String(route.params.seasonId);
const episodeId = String(route.params.episodeId);
const { script, missing, loading, saving, error, loadScript, saveScript, saveBlock } = useScript();
const title = ref("");
const summary = ref("");

function blockLabel(type: ScriptBlockType) {
  return getScriptBlockTypeLabel(type);
}

function reload() {
  void loadScript(projectId, episodeId);
}

watch(
  () => [route.params.id, route.params.episodeId],
  () => reload(),
  { immediate: true },
);

watch(script, (value) => {
  title.value = value?.title || "";
  summary.value = value?.summary || "";
});

async function onSaveScript() {
  await saveScript(projectId, episodeId, {
    title: title.value,
    summary: summary.value,
  });
}

async function onSaveBlock(sceneId: string, blockId: string, content: string) {
  if (!content) {
    return;
  }
  await saveBlock(projectId, episodeId, sceneId, blockId, { content });
}

function textareaValue(event: Event) {
  const target = event.target as { value?: string } | null;
  return typeof target?.value === "string" ? target.value : "";
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
  margin-top: 20px;
}
.card {
  margin-top: 10px;
  padding: 10px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
}
.type {
  color: #e4c56a;
  font-size: 12px;
}
</style>
