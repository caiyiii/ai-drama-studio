<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>项目</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="showCreate = true">新建</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-refresher slot="fixed" @ionRefresh="refresh($event)">
        <ion-refresher-content />
      </ion-refresher>

      <div v-if="error" class="state">
        <p>{{ error }}</p>
        <ion-button fill="outline" size="small" @click="fetchProjects">重试</ion-button>
      </div>
      <p v-else-if="loading" class="state">正在载入…</p>
      <div v-else-if="projects.length === 0" class="state">
        <p>还没有创建漫剧</p>
        <ion-button class="ion-margin-top" @click="showCreate = true">
          创建第一部漫剧
        </ion-button>
      </div>

      <div v-else class="list">
        <button
          v-for="project in projects"
          :key="project.id"
          type="button"
          class="card"
          @click="openProject(project.id)"
        >
          <div class="cover" :class="coverClass(project.genre)">
            <span>{{ project.genre || "漫剧" }}</span>
          </div>
          <div class="body">
            <div class="row">
              <h2>{{ project.name }}</h2>
              <span class="status">{{ getProjectStatusLabel(project.status) }}</span>
            </div>
            <p>{{ project.description || "尚未填写简介" }}</p>
            <div class="progress">
              <span>制作进度 {{ progressOf(project) }}%</span>
              <span>{{ getProjectStepLabel(project.currentStep) }}</span>
            </div>
            <div class="bar">
              <i :style="{ width: `${progressOf(project)}%` }" />
            </div>
          </div>
        </button>
      </div>

      <ion-modal :is-open="showCreate" @didDismiss="showCreate = false">
        <ion-header>
          <ion-toolbar>
            <ion-title>新建漫剧</ion-title>
            <ion-buttons slot="end">
              <ion-button @click="showCreate = false">关闭</ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding">
          <form @submit.prevent="onCreate">
            <ion-item>
              <ion-label position="stacked">漫剧名称</ion-label>
              <ion-input v-model="form.name" required :maxlength="120" />
            </ion-item>
            <ion-item>
              <ion-label position="stacked">简介</ion-label>
              <ion-textarea v-model="form.description" :rows="4" :maxlength="2000" />
            </ion-item>
            <ion-item>
              <ion-label position="stacked">类型</ion-label>
              <ion-select v-model="form.genre" interface="popover">
                <ion-select-option v-for="item in genres" :key="item" :value="item">
                  {{ item }}
                </ion-select-option>
              </ion-select>
            </ion-item>
            <p v-if="error" class="state">{{ error }}</p>
            <ion-button
              class="ion-margin-top"
              expand="block"
              type="submit"
              :disabled="saving"
            >
              {{ saving ? "创建中…" : "创建" }}
            </ion-button>
          </form>
        </ion-content>
      </ion-modal>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonModal,
  IonPage,
  IonRefresher,
  IonRefresherContent,
  IonSelect,
  IonSelectOption,
  IonTextarea,
  IonTitle,
  IonToolbar,
  onIonViewWillEnter,
} from "@ionic/vue";
import {
  getProjectProgressPercent,
  getProjectStatusLabel,
  getProjectStepLabel,
} from "@ai-drama-studio/core";
import { PROJECT_GENRES, type Project } from "@ai-drama-studio/types";
import { reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { useProjects } from "../composables/useProjects";

const router = useRouter();
const {
  projects,
  loading,
  saving,
  error,
  fetchProjects,
  createProject,
} = useProjects();
const showCreate = ref(false);
const genres = PROJECT_GENRES;
const form = reactive({
  name: "",
  description: "",
  genre: "其他",
});

onIonViewWillEnter(() => {
  void fetchProjects();
});

function progressOf(project: Project) {
  return getProjectProgressPercent(project.status, project.currentStep);
}

function coverClass(genre: string | null) {
  const map: Record<string, string> = {
    科幻: "scifi",
    修仙: "xianxia",
    赛博朋克: "cyber",
    都市: "urban",
    爱情: "romance",
    悬疑: "mystery",
    玄幻: "fantasy",
    其他: "other",
  };
  return `genre-${map[genre ?? "其他"] ?? "other"}`;
}

function openProject(id: string) {
  void router.push(`/tabs/projects/${id}`);
}

async function refresh(event: CustomEvent) {
  await fetchProjects();
  const target = event.target as unknown as { complete: () => void };
  target.complete();
}

async function onCreate() {
  const project = await createProject({
    name: form.name.trim(),
    description: form.description.trim() || undefined,
    genre: form.genre,
  });
  if (project) {
    showCreate.value = false;
    form.name = "";
    form.description = "";
    form.genre = "其他";
    await router.push(`/tabs/projects/${project.id}`);
  }
}
</script>

<style scoped>
.state {
  padding: 24px 16px;
  color: #a1a1aa;
}

.list {
  padding: 12px;
  display: grid;
  gap: 12px;
}

.card {
  text-align: left;
  border: 0;
  padding: 0;
  border-radius: 16px;
  overflow: hidden;
  background: #121216;
  color: inherit;
}

.cover {
  height: 92px;
  display: flex;
  align-items: flex-end;
  padding: 12px;
  color: #e4c56a;
  font-size: 11px;
  letter-spacing: 0.16em;
}

.genre-scifi { background: linear-gradient(135deg, #10233f, #d4af37); }
.genre-xianxia { background: linear-gradient(135deg, #1a1430, #c9a227); }
.genre-cyber { background: linear-gradient(135deg, #1a0b24, #e4c56a); }
.genre-urban { background: linear-gradient(135deg, #16161c, #d4af37); }
.genre-romance { background: linear-gradient(135deg, #2a1520, #e4c56a); }
.genre-mystery { background: linear-gradient(135deg, #12151c, #c9a227); }
.genre-fantasy { background: linear-gradient(135deg, #14102a, #d4af37); }
.genre-other { background: linear-gradient(135deg, #18181b, #c9a227); }

.body {
  padding: 14px;
}

.row {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: flex-start;
}

h2 {
  margin: 0;
  font-size: 18px;
}

.status {
  color: #d4af37;
  font-size: 11px;
}

p {
  color: #a1a1aa;
  font-size: 13px;
  margin: 8px 0 0;
}

.progress {
  display: flex;
  justify-content: space-between;
  margin-top: 12px;
  font-size: 11px;
  color: #a1a1aa;
}

.bar {
  height: 4px;
  margin-top: 8px;
  border-radius: 99px;
  background: rgba(255, 255, 255, 0.08);
}

.bar i {
  display: block;
  height: 100%;
  border-radius: 99px;
  background: #d4af37;
}
</style>
