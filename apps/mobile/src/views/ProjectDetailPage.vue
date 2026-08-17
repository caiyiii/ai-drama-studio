<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/tabs/projects" text="返回" />
        </ion-buttons>
        <ion-title>{{ project?.name ?? "项目" }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <div v-if="error" class="state">
        <p>{{ error }}</p>
        <ion-button fill="outline" size="small" @click="reload">重试</ion-button>
      </div>
      <p v-else-if="loading || !project" class="state">正在载入…</p>
      <div v-else>
        <div class="cover" :class="coverClass(project.genre)">
          <span>{{ project.genre || "漫剧" }}</span>
        </div>
        <div class="hero">
          <p class="eyebrow">{{ getProjectStatusLabel(project.status) }}</p>
          <h1>{{ project.name }}</h1>
          <p class="lead">{{ project.description || "尚未填写简介" }}</p>
          <div class="progress-label">
            <span>制作进度</span>
            <span>{{ progress }}%</span>
          </div>
          <div class="bar">
            <i :style="{ width: `${progress}%` }" />
          </div>
          <ion-button expand="block" class="ion-margin-top" :router-link="`/tabs/projects/${project.id}/world`">
            进入世界观
          </ion-button>
          <ion-button expand="block" fill="outline" class="ion-margin-top" :router-link="`/tabs/projects/${project.id}/characters`">
            进入人物
          </ion-button>
          <ion-button expand="block" fill="outline" class="ion-margin-top" :router-link="`/tabs/projects/${project.id}/story-bible`">
            查看故事圣经
          </ion-button>
          <ion-button expand="block" fill="outline" class="ion-margin-top" :router-link="`/tabs/projects/${project.id}/seasons`">
            进入季 / 剧集
          </ion-button>
        </div>

        <section class="flow">
          <p class="eyebrow">创作流程</p>
          <ol>
            <li v-for="(item, index) in steps" :key="item.step">
              <div>
                <p class="index">{{ String(index + 1).padStart(2, "0") }} {{ item.label }}</p>
                <p class="meta">
                  {{ stateLabel(item.step) }} · {{ getStepProgressPercent(item.step) }}%
                </p>
              </div>
            </li>
          </ol>
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
  IonPage,
  IonTitle,
  IonToolbar,
} from "@ionic/vue";
import {
  getProductionNavItems,
  getProductionStepState,
  getProductionStepStateLabel,
  getProjectProgressPercent,
  getProjectStatusLabel,
  getStepProgressPercent,
} from "@ai-drama-studio/core";
import { computed, watch } from "vue";
import { useRoute } from "vue-router";
import { useProjects } from "../composables/useProjects";

const route = useRoute();
const { current: project, loading, error, fetchProject } = useProjects();
const steps = getProductionNavItems();

const progress = computed(() =>
  project.value
    ? getProjectProgressPercent(project.value.status, project.value.currentStep)
    : 0,
);

function stateLabel(step: (typeof steps)[number]["step"]) {
  if (!project.value) {
    return "";
  }
  return getProductionStepStateLabel(getProductionStepState(project.value, step));
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

function reload() {
  const id = route.params.id;
  if (typeof id === "string") {
    void fetchProject(id);
  }
}

watch(
  () => route.params.id,
  (id) => {
    if (typeof id === "string") {
      void fetchProject(id);
    }
  },
  { immediate: true },
);
</script>

<style scoped>
.state,
.hero,
.flow {
  padding: 16px;
}

.eyebrow {
  color: #d4af37;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  font-size: 11px;
  margin: 0;
}

h1 {
  font-size: 28px;
  margin: 8px 0 12px;
}

.lead,
.meta,
.state {
  color: #a1a1aa;
  line-height: 1.6;
}

.cover {
  height: 160px;
  display: flex;
  align-items: flex-end;
  padding: 16px;
  color: #e4c56a;
  letter-spacing: 0.16em;
  font-size: 12px;
}

.genre-scifi { background: linear-gradient(135deg, #10233f, #d4af37); }
.genre-xianxia { background: linear-gradient(135deg, #1a1430, #c9a227); }
.genre-cyber { background: linear-gradient(135deg, #1a0b24, #e4c56a); }
.genre-urban { background: linear-gradient(135deg, #16161c, #d4af37); }
.genre-romance { background: linear-gradient(135deg, #2a1520, #e4c56a); }
.genre-mystery { background: linear-gradient(135deg, #12151c, #c9a227); }
.genre-fantasy { background: linear-gradient(135deg, #14102a, #d4af37); }
.genre-other { background: linear-gradient(135deg, #18181b, #c9a227); }

.progress-label {
  display: flex;
  justify-content: space-between;
  color: #a1a1aa;
  font-size: 12px;
  margin-top: 16px;
}

.bar {
  height: 6px;
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

.flow ol {
  list-style: none;
  padding: 0;
  margin: 12px 0 0;
}

.flow li {
  padding: 12px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.index {
  margin: 0;
  color: #f4f1ea;
}

.meta {
  margin: 4px 0 0;
  font-size: 12px;
}
</style>
