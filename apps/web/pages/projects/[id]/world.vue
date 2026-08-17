<template>
  <section class="px-4 py-6 tablet:px-8 desktop:px-8">
    <PageState
      :loading="worldStore.loading"
      :error="worldStore.error"
      loading-text="正在载入世界观…"
      :on-retry="() => worldStore.load(projectId)"
    >
      <div v-if="worldStore.missing" class="mx-auto max-w-xl py-10 text-center">
        <p class="font-display text-3xl">还没有世界观</p>
        <p class="mt-3 text-sm text-zinc-500">先创建这个漫剧的世界根基，再展开文明、历史与能力体系。</p>
        <p v-if="worldStore.actionError" class="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {{ worldStore.actionError }}
        </p>
        <WorldGenerateModal :project-id="projectId" :has-world="false" @applied="onApplied" />
        <WorldGenerationHistory :items="worldStore.generations" :type="GenerationTaskType.WORLD" />
        <form class="mt-8 space-y-3 text-left" @submit.prevent="onCreate">
          <input v-model="createTitle" required maxlength="120" placeholder="世界名称" class="studio-field" />
          <textarea v-model="createSummary" rows="4" placeholder="世界简介" class="studio-field resize-none" />
          <button type="submit" :disabled="worldStore.saving" class="w-full rounded-xl bg-gold-400 px-4 py-2 text-sm font-medium text-ink-950">
            {{ worldStore.saving ? "创建中…" : "创建世界观" }}
          </button>
        </form>
      </div>

      <div v-else-if="worldStore.world" class="desktop:grid desktop:grid-cols-[200px_1fr] desktop:gap-8">
        <aside v-if="!isMobile || !activeSection" class="mb-6 desktop:mb-0">
          <WorldNav :current="section" @select="onSelect" />
        </aside>
        <div v-if="!isMobile || activeSection">
          <p
            v-if="worldStore.actionError"
            class="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300"
          >
            {{ worldStore.actionError }}
          </p>
          <button
            v-if="isMobile && activeSection"
            type="button"
            class="mb-4 text-sm text-zinc-400"
            @click="activeSection = null"
          >
            返回分类
          </button>

          <WorldOverviewPanel
            v-if="section === 'overview'"
            :world="worldStore.world"
            :saving="worldStore.saving"
            @save="onSaveWorld"
          />
          <div v-if="section === 'overview'" class="mt-6">
            <WorldGenerateModal :project-id="projectId" :has-world="true" @applied="onApplied" />
            <WorldGenerationHistory :items="worldStore.generations" :type="GenerationTaskType.WORLD" />
          </div>
          <WorldTextPanel
            v-else-if="section === 'cosmic'"
            eyebrow="Cosmos"
            title="宇宙背景"
            :value="worldStore.world.cosmicBackground"
            :saving="worldStore.saving"
            @save="(value) => onSaveWorld({ cosmicBackground: value })"
          />
          <WorldCivilizationPanel
            v-else-if="section === 'civilizations'"
            :items="worldStore.civilizations"
            @create="(data) => worldStore.createCivilization(projectId, data)"
            @update="(id, data) => worldStore.updateCivilization(projectId, id, data)"
            @remove="(id) => worldStore.deleteCivilization(projectId, id)"
          />
          <WorldPowerPanel
            v-else-if="section === 'power'"
            :items="worldStore.powerSystems"
            @create="(data) => worldStore.createPowerSystem(projectId, data)"
            @update="(id, data) => worldStore.updatePowerSystem(projectId, id, data)"
            @remove="(id) => worldStore.deletePowerSystem(projectId, id)"
          />
          <WorldHistoryPanel
            v-else-if="section === 'history'"
            :items="worldStore.history"
            @create="(data) => worldStore.createHistory(projectId, data)"
            @update="(id, data) => worldStore.updateHistory(projectId, id, data)"
            @remove="(id) => worldStore.deleteHistory(projectId, id)"
            @move="(id, direction) => worldStore.moveHistory(projectId, id, direction)"
          />
          <WorldFactionPanel
            v-else-if="section === 'factions'"
            :items="worldStore.factions"
            :civilizations="worldStore.civilizations"
            @create="(data) => worldStore.createFaction(projectId, data)"
            @update="(id, data) => worldStore.updateFaction(projectId, id, data)"
            @remove="(id) => worldStore.deleteFaction(projectId, id)"
          />
          <WorldLocationPanel
            v-else-if="section === 'locations'"
            :items="worldStore.locations"
            :civilizations="worldStore.civilizations"
            @create="(data) => worldStore.createLocation(projectId, data)"
            @update="(id, data) => worldStore.updateLocation(projectId, id, data)"
            @remove="(id) => worldStore.deleteLocation(projectId, id)"
          />
          <WorldTextPanel
            v-else-if="section === 'conflict'"
            eyebrow="Conflict"
            title="核心冲突"
            :value="worldStore.world.coreConflict"
            :saving="worldStore.saving"
            @save="(value) => onSaveWorld({ coreConflict: value })"
          />
        </div>
      </div>
    </PageState>
  </section>
</template>

<script setup lang="ts">
import { GenerationTaskType, type UpdateWorldInput } from "@ai-drama-studio/types";
import { useCurrentProject } from "~/composables/useCurrentProject";
import { useViewport } from "~/composables/useViewport";
import { useWorldStore } from "~/stores/world";

const route = useRoute();
const { projectId, project } = useCurrentProject();
const { isMobile } = useViewport();
const worldStore = useWorldStore();

function readWorldSection() {
  const value = route.query.section;
  return typeof value === "string" && value ? value : "overview";
}

const section = ref(readWorldSection());
const activeSection = ref<string | null>(null);
const createTitle = ref("");
const createSummary = ref("");

onMounted(async () => {
  section.value = readWorldSection();
  if (isMobile.value && section.value !== "overview") {
    activeSection.value = section.value;
  }
  if (projectId.value) {
    await worldStore.load(projectId.value);
    createTitle.value = project.value?.name ? `${project.value.name}` : "未命名世界";
  }
});

watch(projectId, (id) => {
  if (id) {
    void worldStore.load(id);
  }
});

watch(
  () => route.query.section,
  () => {
    section.value = readWorldSection();
    if (isMobile.value && section.value !== "overview") {
      activeSection.value = section.value;
    }
  },
);

function onSelect(key: string) {
  if (isMobile.value) {
    activeSection.value = key;
  }
  const current = readWorldSection();
  if (current === key) {
    section.value = key;
    return;
  }
  void navigateTo({
    path: route.path,
    query: key === "overview" ? {} : { section: key },
  });
}

async function onCreate() {
  await worldStore.createWorld(projectId.value, {
    title: createTitle.value.trim(),
    summary: createSummary.value.trim() || undefined,
  });
}

async function onSaveWorld(payload: UpdateWorldInput) {
  await worldStore.updateWorld(projectId.value, payload);
}

async function onApplied() {
  await worldStore.load(projectId.value);
}
</script>
