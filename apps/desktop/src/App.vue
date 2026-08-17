<template>
  <div class="shell">
    <aside class="sidebar">
      <div class="brand">
        <span class="mark">AD</span>
        <div>
          <p class="title">AI Drama</p>
          <p class="sub">Studio</p>
        </div>
      </div>
      <nav>
        <p class="section">工作台</p>
        <button
          v-for="item in items"
          :key="item.key"
          type="button"
          :class="{ active: current === item.key }"
          @click="current = item.key"
        >
          {{ item.label }}
        </button>
      </nav>
    </aside>
    <main>
      <p class="eyebrow">Desktop Shell</p>
      <h1>{{ activeLabel }}</h1>
      <WorldPanel v-if="current === 'world'" />
      <CharacterPanel v-else-if="current === 'characters'" />
      <template v-else>
        <p class="lead">
          当前阶段 Desktop 复用共享类型与 API Client。项目 AI 能力配置（Chat / Structured Output / Image / Video / TTS）请使用 Web 工作台。
        </p>
        <p class="health">API：{{ health }}</p>
      </template>
    </main>
  </div>
</template>

<script setup lang="ts">
import { API_DEFAULT_BASE_URL } from "@ai-drama-studio/config";
import { createApiClient } from "@ai-drama-studio/api-client";
import { getWorkspaceSteps } from "@ai-drama-studio/core";
import { computed, onMounted, ref } from "vue";
import WorldPanel from "./WorldPanel.vue";
import CharacterPanel from "./CharacterPanel.vue";

const items = getWorkspaceSteps();
const current = ref<(typeof items)[number]["key"]>("overview");
const activeLabel = computed(
  () => items.find((item) => item.key === current.value)?.label ?? "项目概览",
);
const health = ref("检测中…");

onMounted(async () => {
  try {
    const api = createApiClient(import.meta.env.VITE_API_BASE || API_DEFAULT_BASE_URL);
    const result = await api.getHealth();
    health.value = result.status === "ok" ? "已连接" : "未知";
  } catch {
    health.value = "未连接（请先启动 API）";
  }
});
</script>

<style scoped>
.shell {
  display: grid;
  grid-template-columns: 240px 1fr;
  min-height: 100%;
}

.sidebar {
  border-right: 1px solid rgba(255, 255, 255, 0.06);
  background: #0c0c0e;
  padding: 24px 16px;
  display: flex;
  flex-direction: column;
  min-height: 100%;
}

.brand {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 28px;
}

.mark {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  border: 1px solid rgba(212, 175, 55, 0.4);
  border-radius: 8px;
  color: #d4af37;
  font-size: 12px;
}

.title {
  margin: 0;
  color: #d4af37;
  font-size: 18px;
}

.sub {
  margin: 0;
  color: #71717a;
  font-size: 11px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
}

.section {
  color: #52525b;
  font-size: 10px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  margin: 0 8px 8px;
}

nav {
  overflow-y: auto;
  flex: 1;
}

nav button {
  display: block;
  width: 100%;
  text-align: left;
  background: transparent;
  border: 0;
  color: #a1a1aa;
  padding: 8px 12px;
  border-radius: 8px;
  cursor: pointer;
}

nav button.active,
nav button:hover {
  background: rgba(255, 255, 255, 0.05);
  color: #e4c56a;
}

main {
  padding: 48px;
}

.eyebrow {
  color: #d4af37;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  font-size: 11px;
}

h1 {
  font-size: 40px;
  font-weight: 500;
  margin: 12px 0;
}

.lead,
.health {
  max-width: 560px;
  color: #a1a1aa;
  line-height: 1.7;
}
</style>
