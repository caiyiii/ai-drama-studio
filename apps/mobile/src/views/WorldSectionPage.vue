<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button :default-href="`/tabs/projects/${projectId}/world`" text="返回" />
        </ion-buttons>
        <ion-title>{{ title }}</ion-title>
        <ion-buttons slot="end">
          <ion-button v-if="section !== 'overview'" @click="openCreate">新增</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <p v-if="error" class="state">{{ error }}</p>
      <p v-else-if="loading" class="state">正在载入…</p>

      <div v-else-if="section === 'overview' && world">
        <ion-item><ion-input v-model="overview.title" label="世界名称" label-placement="stacked" /></ion-item>
        <ion-item><ion-textarea v-model="overview.summary" label="简介" label-placement="stacked" :auto-grow="true" /></ion-item>
        <ion-item><ion-textarea v-model="overview.cosmicBackground" label="宇宙背景" label-placement="stacked" :auto-grow="true" /></ion-item>
        <ion-item><ion-textarea v-model="overview.coreConflict" label="核心冲突" label-placement="stacked" :auto-grow="true" /></ion-item>
        <ion-button expand="block" class="ion-margin-top" :disabled="saving" @click="saveOverview">保存</ion-button>
        <ion-button expand="block" fill="outline" class="ion-margin-top" @click="aiHint">AI生成</ion-button>
      </div>

      <ion-list v-else-if="section === 'civilizations'">
        <ion-item v-for="item in civilizations" :key="item.id" button @click="editCivilization(item)">
          <ion-label>
            <h2>{{ item.name }}</h2>
            <p>{{ item.description || "暂无简介" }}</p>
          </ion-label>
          <ion-button slot="end" fill="clear" color="danger" @click.stop="confirmDelete('civilization', item.id, item.name)">删除</ion-button>
        </ion-item>
        <p v-if="civilizations.length === 0" class="state">还没有文明</p>
      </ion-list>

      <ion-list v-else-if="section === 'history'">
        <ion-item v-for="item in history" :key="item.id" button @click="editHistory(item)">
          <ion-label>
            <h2>{{ item.title }}</h2>
            <p>{{ item.description || "暂无描述" }}</p>
          </ion-label>
          <ion-button slot="end" fill="clear" color="danger" @click.stop="confirmDelete('history', item.id, item.title)">删除</ion-button>
        </ion-item>
        <p v-if="history.length === 0" class="state">还没有历史事件</p>
      </ion-list>

      <ion-list v-else-if="section === 'factions'">
        <ion-item v-for="item in factions" :key="item.id" button @click="editFaction(item)">
          <ion-label>
            <h2>{{ item.name }}</h2>
            <p>{{ item.type || "未分类" }} · {{ item.description || "暂无简介" }}</p>
          </ion-label>
          <ion-button slot="end" fill="clear" color="danger" @click.stop="confirmDelete('faction', item.id, item.name)">删除</ion-button>
        </ion-item>
        <p v-if="factions.length === 0" class="state">还没有势力</p>
      </ion-list>

      <ion-list v-else-if="section === 'locations'">
        <ion-item v-for="item in locations" :key="item.id" button @click="editLocation(item)">
          <ion-label>
            <h2>{{ item.name }}</h2>
            <p>{{ item.type || "未分类" }} · {{ item.description || "暂无简介" }}</p>
          </ion-label>
          <ion-button slot="end" fill="clear" color="danger" @click.stop="confirmDelete('location', item.id, item.name)">删除</ion-button>
        </ion-item>
        <p v-if="locations.length === 0" class="state">还没有地点</p>
      </ion-list>

      <ion-list v-else-if="section === 'power'">
        <ion-item v-for="item in powerSystems" :key="item.id" button @click="editPower(item)">
          <ion-label>
            <h2>{{ item.name }}</h2>
            <p>{{ item.levels.map((level) => level.name).join(" / ") || "暂无等级" }}</p>
          </ion-label>
          <ion-button slot="end" fill="clear" color="danger" @click.stop="confirmDelete('power', item.id, item.name)">删除</ion-button>
        </ion-item>
        <p v-if="powerSystems.length === 0" class="state">还没有能力体系</p>
      </ion-list>

      <ion-modal :is-open="showForm" @didDismiss="showForm = false">
        <ion-header>
          <ion-toolbar>
            <ion-title>{{ formTitle }}</ion-title>
            <ion-buttons slot="end">
              <ion-button @click="showForm = false">关闭</ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding">
          <form @submit.prevent="submitForm">
            <ion-item v-if="section !== 'history'">
              <ion-input v-model="form.name" label="名称" label-placement="stacked" required />
            </ion-item>
            <ion-item v-if="section === 'history'">
              <ion-input v-model="form.title" label="标题" label-placement="stacked" required />
            </ion-item>
            <ion-item>
              <ion-textarea v-model="form.description" label="简介" label-placement="stacked" :auto-grow="true" />
            </ion-item>
            <template v-if="section === 'civilizations'">
              <ion-item><ion-textarea v-model="form.origin" label="起源" label-placement="stacked" /></ion-item>
              <ion-item><ion-textarea v-model="form.philosophy" label="哲学" label-placement="stacked" /></ion-item>
              <ion-item><ion-textarea v-model="form.society" label="社会" label-placement="stacked" /></ion-item>
              <ion-item><ion-textarea v-model="form.culture" label="文化" label-placement="stacked" /></ion-item>
              <ion-item><ion-textarea v-model="form.technology" label="科技" label-placement="stacked" /></ion-item>
            </template>
            <ion-item v-if="section === 'factions'">
              <ion-select v-model="form.type" label="类型" label-placement="stacked">
                <ion-select-option v-for="item in factionTypes" :key="item" :value="item">{{ item }}</ion-select-option>
              </ion-select>
            </ion-item>
            <ion-item v-if="section === 'locations'">
              <ion-select v-model="form.type" label="类型" label-placement="stacked">
                <ion-select-option v-for="item in locationTypes" :key="item" :value="item">{{ item }}</ion-select-option>
              </ion-select>
            </ion-item>
            <ion-item v-if="section === 'factions' || section === 'locations'">
              <ion-select v-model="form.civilizationId" label="所属文明" label-placement="stacked">
                <ion-select-option value="">无</ion-select-option>
                <ion-select-option v-for="item in civilizations" :key="item.id" :value="item.id">{{ item.name }}</ion-select-option>
              </ion-select>
            </ion-item>
            <template v-if="section === 'power'">
              <ion-item>
                <ion-textarea v-model="form.rulesText" label="规则（一行一条）" label-placement="stacked" :auto-grow="true" />
              </ion-item>
              <ion-item>
                <ion-textarea v-model="form.levelsText" label="等级（一行一级，可用逗号加说明）" label-placement="stacked" :auto-grow="true" />
              </ion-item>
            </template>
            <ion-button expand="block" class="ion-margin-top" type="submit">保存</ion-button>
          </form>
        </ion-content>
      </ion-modal>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  alertController,
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonPage,
  IonSelect,
  IonSelectOption,
  IonTextarea,
  IonTitle,
  IonToolbar,
} from "@ionic/vue";
import { FACTION_TYPES, WORLD_LOCATION_TYPES } from "@ai-drama-studio/config";
import type { Civilization, Faction, PowerSystem, WorldHistory, WorldLocation } from "@ai-drama-studio/types";
import { computed, reactive, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { useWorld } from "../composables/useWorld";

const route = useRoute();
const projectId = computed(() => String(route.params.id));
const section = computed(() => String(route.params.section));
const titles: Record<string, string> = {
  overview: "概览",
  civilizations: "文明",
  history: "历史",
  factions: "势力",
  locations: "地点",
  power: "能力体系",
};
const title = computed(() => titles[section.value] ?? "世界观");
const factionTypes = FACTION_TYPES;
const locationTypes = WORLD_LOCATION_TYPES;

const {
  world,
  civilizations,
  history,
  factions,
  locations,
  powerSystems,
  loading,
  saving,
  error,
  load,
  updateWorld,
  api,
} = useWorld();

const showForm = ref(false);
const editingId = ref<string | null>(null);
const overview = reactive({
  title: "",
  summary: "",
  cosmicBackground: "",
  coreConflict: "",
});
const form = reactive({
  name: "",
  title: "",
  description: "",
  origin: "",
  philosophy: "",
  society: "",
  culture: "",
  technology: "",
  type: "其他",
  civilizationId: "",
  rulesText: "",
  levelsText: "",
});

watch(
  () => String(route.params.id),
  (id) => {
    if (id) {
      void load(id);
    }
  },
  { immediate: true },
);

watch(world, (value) => {
  if (!value) {
    return;
  }
  overview.title = value.title;
  overview.summary = value.summary ?? "";
  overview.cosmicBackground = value.cosmicBackground ?? "";
  overview.coreConflict = value.coreConflict ?? "";
});

function resetForm() {
  form.name = "";
  form.title = "";
  form.description = "";
  form.origin = "";
  form.philosophy = "";
  form.society = "";
  form.culture = "";
  form.technology = "";
  form.type = "其他";
  form.civilizationId = "";
  form.rulesText = "";
  form.levelsText = "炼气\n筑基\n金丹\n元婴";
}

function openCreate() {
  editingId.value = null;
  resetForm();
  showForm.value = true;
}

function editCivilization(item: Civilization) {
  editingId.value = item.id;
  form.name = item.name;
  form.description = item.description ?? "";
  form.origin = item.origin ?? "";
  form.philosophy = item.philosophy ?? "";
  form.society = item.society ?? "";
  form.culture = item.culture ?? "";
  form.technology = item.technology ?? "";
  showForm.value = true;
}

function editHistory(item: WorldHistory) {
  editingId.value = item.id;
  form.title = item.title;
  form.description = item.description ?? "";
  showForm.value = true;
}

function editFaction(item: Faction) {
  editingId.value = item.id;
  form.name = item.name;
  form.description = item.description ?? "";
  form.type = item.type || "其他";
  form.civilizationId = item.civilizationId ?? "";
  showForm.value = true;
}

function editLocation(item: WorldLocation) {
  editingId.value = item.id;
  form.name = item.name;
  form.description = item.description ?? "";
  form.type = item.type || "其他";
  form.civilizationId = item.civilizationId ?? "";
  showForm.value = true;
}

function editPower(item: PowerSystem) {
  editingId.value = item.id;
  form.name = item.name;
  form.description = item.description ?? "";
  form.rulesText = item.rules.join("\n");
  form.levelsText = item.levels
    .map((level) =>
      level.description ? `${level.name},${level.description}` : level.name,
    )
    .join("\n");
  showForm.value = true;
}

const formTitle = computed(() => (editingId.value ? "编辑" : "新增"));

async function saveOverview() {
  await updateWorld(projectId.value, {
    title: overview.title.trim(),
    summary: overview.summary.trim() || undefined,
    cosmicBackground: overview.cosmicBackground.trim() || undefined,
    coreConflict: overview.coreConflict.trim() || undefined,
  });
}

async function aiHint() {
  const alert = await alertController.create({
    header: "AI 生成",
    message: "AI世界观生成将在下一阶段开放。",
    buttons: ["知道了"],
  });
  await alert.present();
}

async function submitForm() {
  const id = projectId.value;
  try {
    if (section.value === "civilizations") {
    const data = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      origin: form.origin.trim() || undefined,
      philosophy: form.philosophy.trim() || undefined,
      society: form.society.trim() || undefined,
      culture: form.culture.trim() || undefined,
      technology: form.technology.trim() || undefined,
    };
    if (editingId.value) {
      await api.updateCivilization(id, editingId.value, data);
    } else {
      await api.createCivilization(id, data);
    }
  } else if (section.value === "history") {
    const data = {
      title: form.title.trim(),
      description: form.description.trim() || undefined,
    };
    if (editingId.value) {
      await api.updateWorldHistory(id, editingId.value, data);
    } else {
      await api.createWorldHistory(id, data);
    }
  } else if (section.value === "factions") {
    const data = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      type: form.type,
      civilizationId: form.civilizationId || null,
    };
    if (editingId.value) {
      await api.updateFaction(id, editingId.value, data);
    } else {
      await api.createFaction(id, data);
    }
  } else if (section.value === "locations") {
    const data = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      type: form.type,
      civilizationId: form.civilizationId || null,
    };
    if (editingId.value) {
      await api.updateWorldLocation(id, editingId.value, data);
    } else {
      await api.createWorldLocation(id, data);
    }
  } else if (section.value === "power") {
    const data = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      rules: form.rulesText.split("\n").map((item) => item.trim()).filter(Boolean),
      levels: form.levelsText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const [name, description] = line.split(",");
          return { name: name.trim(), description: description?.trim() };
        }),
    };
    if (editingId.value) {
      await api.updatePowerSystem(id, editingId.value, data);
    } else {
      await api.createPowerSystem(id, data);
    }
  }
    showForm.value = false;
    await load(id);
  } catch (err) {
    error.value = err instanceof Error ? err.message : "保存失败";
  }
}

async function confirmDelete(
  kind: "civilization" | "history" | "faction" | "location" | "power",
  id: string,
  name: string,
) {
  const alert = await alertController.create({
    header: `确定删除《${name}》？`,
    message: "删除后数据将无法恢复。",
    buttons: [
      { text: "取消", role: "cancel" },
      { text: "确认删除", role: "confirm" },
    ],
  });
  await alert.present();
  const result = await alert.onDidDismiss();
  if (result.role !== "confirm") {
    return;
  }
  const project = projectId.value;
  try {
    if (kind === "civilization") await api.deleteCivilization(project, id);
    if (kind === "history") await api.deleteWorldHistory(project, id);
    if (kind === "faction") await api.deleteFaction(project, id);
    if (kind === "location") await api.deleteWorldLocation(project, id);
    if (kind === "power") await api.deletePowerSystem(project, id);
    await load(project);
  } catch (err) {
    error.value = err instanceof Error ? err.message : "删除失败";
  }
}
</script>

<style scoped>
.state {
  color: #a1a1aa;
  padding: 12px 0;
}
</style>
