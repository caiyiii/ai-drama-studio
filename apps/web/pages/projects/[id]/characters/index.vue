<template>
  <section class="px-4 py-6 tablet:px-8 desktop:px-8">
    <div class="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div>
        <p class="text-[11px] uppercase tracking-[0.2em] text-gold-400/80">Characters</p>
        <h1 class="mt-1 font-display text-3xl">人物</h1>
      </div>
      <div class="flex gap-2">
        <CharacterGenerateModal
          :project-id="projectId"
          :civilizations="store.civilizations"
          :factions="store.factions"
          @applied="onApplied"
        />
        <button
          type="button"
          class="rounded-xl bg-gold-400 px-3 py-1.5 text-sm font-medium text-ink-950"
          @click="openCreate"
        >
          + 创建人物
        </button>
      </div>
    </div>

    <div class="mb-6 grid gap-3 tablet:grid-cols-[1fr_auto_auto_auto]">
      <input
        v-model="search"
        class="studio-field"
        placeholder="搜索人物姓名"
      />
      <StudioSelect v-model="roleFilter" :options="roleFilterOptions" />
      <StudioSelect v-model="civilizationId" :options="civilizationOptions" />
      <StudioSelect v-model="factionId" :options="factionOptions" />
    </div>

    <PageState
      :loading="store.loading"
      :error="store.error"
      :empty="!store.loading && visibleCharacters.length === 0"
      loading-text="正在载入人物…"
      empty-title="还没有人物"
      empty-description="创建第一个角色，或使用 AI 生成人物。"
      empty-action-label="创建第一个角色"
      :on-retry="() => store.load(projectId)"
      :on-empty-action="openCreate"
    >
      <p v-if="store.actionError" class="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
        {{ store.actionError }}
      </p>

      <div class="grid gap-4 tablet:grid-cols-2 desktop:grid-cols-3">
        <NuxtLink
          v-for="item in visibleCharacters"
          :key="item.id"
          :to="`/projects/${projectId}/characters/${item.id}`"
          class="rounded-2xl border border-white/5 bg-ink-800/60 p-4 transition hover:border-gold-400/30"
        >
          <div class="flex items-start gap-3">
            <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gold-400/15 font-display text-xl text-gold-300">
              {{ item.name.slice(0, 1) }}
            </div>
            <div class="min-w-0">
              <p class="truncate font-display text-xl text-zinc-100">{{ item.name }}</p>
              <p class="mt-1 text-xs text-zinc-400">{{ item.identity || "身份未填" }}</p>
              <p class="mt-1 text-xs text-gold-300">{{ item.role || "未定位" }}</p>
            </div>
          </div>
          <p class="mt-3 text-xs text-zinc-500">
            {{ item.civilization?.name || "无所属文明" }}
            <span v-if="item.faction"> · {{ item.faction.name }}</span>
          </p>
          <div v-if="personalityTags(item).length > 0" class="mt-3 flex flex-wrap gap-1">
            <span
              v-for="tag in personalityTags(item)"
              :key="tag"
              class="rounded-full border border-white/10 px-2 py-0.5 text-[11px] text-zinc-400"
            >
              {{ tag }}
            </span>
          </div>
        </NuxtLink>
      </div>
    </PageState>

    <WorldGenerationHistory :items="store.characterGenerations" :type="GenerationTaskType.CHARACTER" />

    <AppModal
      :open="showForm"
      title="新建人物"
      description="人物可以不属于任何文明或势力。"
      @close="showForm = false"
    >
      <CharacterForm
        :civilizations="store.civilizations"
        :factions="store.factions"
        :has-world="store.hasWorld"
        :saving="store.saving"
        :error="store.actionError"
        @submit="onSaveCharacter"
        @cancel="showForm = false"
      />
    </AppModal>
  </section>
</template>

<script setup lang="ts">
import { filterFactionsByCivilization } from "@ai-drama-studio/core";
import { GenerationTaskType, type Character, type CharacterInput } from "@ai-drama-studio/types";
import { useCharacterStore } from "~/stores/character";
import { useCurrentProject } from "~/composables/useCurrentProject";

const { projectId } = useCurrentProject();
const store = useCharacterStore();
const search = ref("");
const roleFilter = ref("");
const civilizationId = ref("");
const factionId = ref("");
const showForm = ref(false);

const roleFilterOptions = [
  { value: "", label: "全部" },
  { value: "主角", label: "主角" },
  { value: "配角", label: "配角" },
  { value: "NPC", label: "NPC" },
];
const civilizationOptions = computed(() => [
  { value: "", label: "全部文明" },
  ...store.civilizations.map((item) => ({ value: item.id, label: item.name })),
]);
const factionOptions = computed(() => [
  { value: "", label: "全部势力" },
  ...filterFactionsByCivilization(store.factions, civilizationId.value || null).map(
    (item) => ({ value: item.id, label: item.name }),
  ),
]);

const visibleCharacters = computed(() =>
  store.characters.filter((item) => {
    if (search.value.trim() && !item.name.toLowerCase().includes(search.value.trim().toLowerCase())) {
      return false;
    }
    if (roleFilter.value === "NPC") {
      return !["主角", "第二主角", "配角"].includes(item.role || "");
    }
    if (roleFilter.value && item.role !== roleFilter.value) {
      return false;
    }
    if (civilizationId.value && item.civilizationId !== civilizationId.value) {
      return false;
    }
    if (factionId.value && item.factionId !== factionId.value) {
      return false;
    }
    return true;
  }),
);

onMounted(() => {
  if (projectId.value) {
    void store.load(projectId.value);
  }
});

watch(projectId, (id) => {
  if (id) {
    void store.load(id);
  }
});

function personalityTags(item: Character) {
  const raw =
    item.personality ||
    (typeof item.personalityProfile?.traits === "string"
      ? item.personalityProfile.traits
      : "") ||
    "";
  return raw
    .split(/[、，,;；/]/)
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 3);
}

function openCreate() {
  showForm.value = true;
}

async function onSaveCharacter(payload: CharacterInput) {
  if (!projectId.value) {
    return;
  }
  const result = await store.create(projectId.value, payload);
  if (result) {
    showForm.value = false;
    await navigateTo(`/projects/${projectId.value}/characters/${result.id}`);
  }
}

async function onApplied() {
  if (projectId.value) {
    await store.load(projectId.value);
  }
}
</script>
