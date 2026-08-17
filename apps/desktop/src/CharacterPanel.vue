<template>
  <section class="panel">
    <div class="toolbar">
      <label>
        项目
        <select v-model="projectId" @change="load">
          <option value="">选择项目</option>
          <option v-for="item in projects" :key="item.id" :value="item.id">
            {{ item.name }}
          </option>
        </select>
      </label>
      <p v-if="message" class="hint">{{ message }}</p>
    </div>

    <p v-if="!projectId" class="hint">选择一个项目以查看人物。</p>
    <p v-else-if="loading" class="hint">正在载入…</p>
    <div v-else-if="characters.length === 0" class="empty">
      <p>还没有人物</p>
        <p class="hint">创建第一个角色。完整 AI 生成请使用 Web。</p>
      <input v-model="createName" placeholder="人物名称" />
      <button type="button" @click="create">创建人物</button>
    </div>
    <div v-else class="layout">
      <aside>
        <button
          v-for="item in characters"
          :key="item.id"
          type="button"
          :class="{ active: selectedId === item.id }"
          @click="selectedId = item.id"
        >
          <strong>{{ item.name }}</strong>
          <span>{{ item.role || "未定位" }}</span>
        </button>
      </aside>
      <article v-if="selected">
        <h2>{{ selected.name }}</h2>
        <p class="hint">
          {{ selected.civilization?.name || "无所属文明" }}
          <span v-if="selected.faction"> · {{ selected.faction.name }}</span>
        </p>
        <p>{{ selected.description || "暂无简介" }}</p>
        <h3>人物关系</h3>
        <p v-if="relations.length === 0" class="hint">还没有人物关系。</p>
        <div v-for="item in relations" :key="item.id" class="relation">
          <span>{{ item.fromCharacter.name }}</span>
          <em>↓ {{ relationLabel(item.type) }} ↓</em>
          <span>{{ item.toCharacter.name }}</span>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { API_DEFAULT_BASE_URL } from "@ai-drama-studio/config";
import { createApiClient } from "@ai-drama-studio/api-client";
import { getCharacterRelationTypeLabel, relationshipsForCharacter } from "@ai-drama-studio/core";
import type {
  Character,
  CharacterRelationType,
  CharacterRelationship,
  Project,
} from "@ai-drama-studio/types";
import { computed, onMounted, ref } from "vue";

const api = createApiClient(import.meta.env.VITE_API_BASE || API_DEFAULT_BASE_URL);
const projects = ref<Project[]>([]);
const projectId = ref("");
const characters = ref<Character[]>([]);
const relationships = ref<CharacterRelationship[]>([]);
const selectedId = ref("");
const loading = ref(false);
const message = ref("");
const createName = ref("");

const selected = computed(
  () => characters.value.find((item) => item.id === selectedId.value) ?? null,
);
const relations = computed(() =>
  selected.value
    ? relationshipsForCharacter(relationships.value, selected.value.id)
    : [],
);

onMounted(async () => {
  try {
    projects.value = await api.getProjects();
  } catch {
    message.value = "无法加载项目，请先启动 API。";
  }
});

async function load() {
  characters.value = [];
  relationships.value = [];
  selectedId.value = "";
  if (!projectId.value) {
    return;
  }
  loading.value = true;
  try {
    characters.value = await api.getCharacters(projectId.value);
    relationships.value = await api.getCharacterRelationships(projectId.value);
    selectedId.value = characters.value[0]?.id ?? "";
  } catch (err) {
    message.value = err instanceof Error ? err.message : "加载失败";
  } finally {
    loading.value = false;
  }
}

async function create() {
  try {
    const created = await api.createCharacter(projectId.value, {
      name: createName.value.trim() || "未命名人物",
    });
    characters.value = [...characters.value, created];
    selectedId.value = created.id;
    createName.value = "";
    message.value = "已创建。完整编辑请使用 Web 工作台。";
  } catch (err) {
    message.value = err instanceof Error ? err.message : "创建失败";
  }
}

function relationLabel(type: CharacterRelationType) {
  return getCharacterRelationTypeLabel(type);
}
</script>

<style scoped>
.panel {
  max-width: 920px;
}

.toolbar,
.empty {
  display: grid;
  gap: 12px;
}

select,
input,
button {
  font: inherit;
  color: inherit;
  background: #121216;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 8px 10px;
}

button {
  background: #d4af37;
  color: #070708;
  cursor: pointer;
}

.layout {
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 20px;
  margin-top: 16px;
}

aside button {
  display: grid;
  width: 100%;
  margin-bottom: 8px;
  background: transparent;
  color: #e4e4e7;
  text-align: left;
}

aside button.active {
  border-color: rgba(212, 175, 55, 0.5);
}

.hint {
  color: #a1a1aa;
}

.relation {
  display: grid;
  justify-items: start;
  gap: 4px;
  margin: 12px 0;
  padding: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
}

.relation em {
  color: #d4af37;
  font-style: normal;
}
</style>
