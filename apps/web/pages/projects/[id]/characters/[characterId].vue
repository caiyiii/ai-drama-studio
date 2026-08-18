<template>
  <section class="px-4 py-6 tablet:px-8 desktop:px-8">
    <PageState
      :loading="store.loading && !character"
      :error="store.error || pageError"
      :empty="!store.loading && !character"
      loading-text="正在载入人物…"
      empty-title="未找到该人物"
      empty-action-label="返回人物列表"
      :on-retry="load"
      :on-empty-action="() => navigateTo(`/projects/${projectId}/characters`)"
    >
      <p v-if="store.actionError" class="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
        {{ store.actionError }}
      </p>
      <article v-if="character" class="space-y-6">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="flex items-start gap-4">
            <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-gold-400/15 font-display text-3xl text-gold-300">
              {{ character.name.slice(0, 1) }}
            </div>
            <div>
              <p class="text-[11px] uppercase tracking-[0.2em] text-gold-400/80">Character</p>
              <h1 class="mt-1 font-display text-3xl">{{ character.name }}</h1>
              <p class="mt-1 text-sm text-zinc-500">
                {{ character.alias ? `${character.alias} · ` : "" }}{{ character.role || "未定位" }}
              </p>
            </div>
          </div>
          <div class="flex gap-2">
            <button type="button" class="rounded-xl border border-white/10 px-3 py-1.5 text-sm" @click="openEdit">
              编辑
            </button>
            <button
              type="button"
              class="rounded-xl border border-red-500/20 px-3 py-1.5 text-sm text-red-300"
              @click="pendingDelete = true"
            >
              删除
            </button>
          </div>
        </div>

        <dl class="grid gap-4 tablet:grid-cols-2">
          <div v-for="field in detailFields" :key="field.label" class="rounded-2xl border border-white/5 bg-ink-800/60 p-4">
            <dt class="text-xs uppercase tracking-[0.16em] text-zinc-500">{{ field.label }}</dt>
            <dd class="mt-2 whitespace-pre-wrap text-sm text-zinc-300">{{ field.value || "暂无" }}</dd>
          </div>
        </dl>

        <div class="grid gap-4 tablet:grid-cols-2">
          <article class="rounded-2xl border border-white/5 bg-ink-800/60 p-4">
            <p class="text-xs uppercase tracking-[0.16em] text-zinc-500">角色图片</p>
            <p class="mt-2 text-sm text-zinc-500">即将开放</p>
          </article>
          <article class="rounded-2xl border border-white/5 bg-ink-800/60 p-4">
            <p class="text-xs uppercase tracking-[0.16em] text-zinc-500">角色声音</p>
            <div class="mt-3 grid gap-3">
              <label class="block text-sm">
                <span class="text-xs text-zinc-500">Voice ID</span>
                <input v-model="voiceForm.voiceId" class="studio-field mt-1" placeholder="例如 xinghe-calm" />
              </label>
              <label class="block text-sm">
                <span class="text-xs text-zinc-500">Language</span>
                <input v-model="voiceForm.language" class="studio-field mt-1" placeholder="zh-CN" />
              </label>
              <div class="grid gap-3 tablet:grid-cols-2">
                <label class="block text-sm">
                  <span class="text-xs text-zinc-500">Speed</span>
                  <input v-model.number="voiceForm.speed" type="number" min="0.25" max="4" step="0.05" class="studio-field mt-1" />
                </label>
                <label class="block text-sm">
                  <span class="text-xs text-zinc-500">Pitch</span>
                  <input v-model.number="voiceForm.pitch" type="number" min="-20" max="20" step="1" class="studio-field mt-1" />
                </label>
              </div>
              <label class="block text-sm">
                <span class="text-xs text-zinc-500">Style</span>
                <input v-model="voiceForm.style" class="studio-field mt-1" placeholder="calm / firm" />
              </label>
              <p class="text-xs text-zinc-600">声音偏好，不保存 API Key。Voice Clone 尚未开放。</p>
              <button
                type="button"
                class="rounded-xl border border-white/10 px-3 py-1.5 text-sm"
                :disabled="store.saving"
                @click="onSaveVoice"
              >
                {{ store.saving ? "保存中…" : "保存声音配置" }}
              </button>
            </div>
          </article>
        </div>

        <section>
          <div class="flex items-center justify-between">
            <h2 class="font-display text-2xl">人物关系</h2>
            <button type="button" class="text-sm text-gold-300" @click="openRelation()">
              + 添加关系
            </button>
          </div>
          <p v-if="selectedRelations.length === 0" class="mt-3 text-sm text-zinc-500">还没有人物关系。</p>
          <ul class="mt-4 space-y-3">
            <li
              v-for="item in selectedRelations"
              :key="item.id"
              class="rounded-xl border border-white/5 bg-ink-800/60 p-4"
            >
              <div class="flex flex-wrap items-center justify-center gap-3 text-sm">
                <span class="text-zinc-100">{{ item.fromCharacter.name }}</span>
                <span class="text-zinc-600">→</span>
                <span class="text-gold-300">{{ relationLabel(item) }}</span>
                <span class="text-zinc-600">→</span>
                <span class="text-zinc-100">{{ item.toCharacter.name }}</span>
              </div>
              <p v-if="item.description" class="mt-2 text-center text-sm text-zinc-500">{{ item.description }}</p>
              <div class="mt-3 flex justify-center gap-2">
                <button type="button" class="rounded-xl border border-white/10 px-3 py-1 text-xs" @click="openRelation(item)">
                  编辑
                </button>
                <button
                  type="button"
                  class="rounded-xl border border-red-500/20 px-3 py-1 text-xs text-red-300"
                  @click="pendingRelation = item"
                >
                  删除
                </button>
              </div>
            </li>
          </ul>
        </section>

        <WorldGenerationHistory :items="store.characterGenerations" :type="GenerationTaskType.CHARACTER" />
      </article>
    </PageState>

    <AppModal
      :open="showForm"
      title="编辑人物"
      description="人物可以不属于任何文明或势力。"
      @close="showForm = false"
    >
      <CharacterForm
        :initial="character"
        :civilizations="store.civilizations"
        :factions="store.factions"
        :has-world="store.hasWorld"
        :saving="store.saving"
        :error="store.actionError"
        @submit="onSaveCharacter"
        @cancel="showForm = false"
      />
    </AppModal>

    <CharacterRelationModal
      :open="showRelation"
      :from-character="character"
      :characters="store.characters"
      :editing="editingRelation"
      :saving="store.saving"
      :error="store.actionError"
      @close="showRelation = false"
      @create="onCreateRelation"
      @update="onUpdateRelation"
    />

    <ConfirmDialog
      :open="pendingDelete"
      :title="character ? `确定删除《${character.name}》？` : ''"
      message="删除后，与该人物相关的关系也会一并删除。"
      @confirm="onDeleteCharacter"
      @cancel="pendingDelete = false"
    />
    <ConfirmDialog
      :open="Boolean(pendingRelation)"
      title="确定删除这段人物关系？"
      message="删除后不会自动创建或保留反向关系。"
      @confirm="onDeleteRelation"
      @cancel="pendingRelation = null"
    />
  </section>
</template>

<script setup lang="ts">
import {
  getCharacterRelationTypeLabel,
  getCharacterStatusLabel,
  relationshipsForCharacter,
} from "@ai-drama-studio/core";
import {
  GenerationTaskType,
  type CharacterInput,
  type CharacterRelationship,
  type CharacterRelationshipInput,
  type CharacterRelationshipUpdateInput,
} from "@ai-drama-studio/types";
import { useCharacterStore } from "~/stores/character";
import { useCurrentProject } from "~/composables/useCurrentProject";

const route = useRoute();
const { projectId } = useCurrentProject();
const store = useCharacterStore();
const showForm = ref(false);
const showRelation = ref(false);
const editingRelation = ref<CharacterRelationship | null>(null);
const pendingDelete = ref(false);
const pendingRelation = ref<CharacterRelationship | null>(null);
const pageError = ref<string | null>(null);
const voiceForm = reactive({
  voiceId: "",
  language: "zh-CN",
  speed: 1 as number | null,
  pitch: 0 as number | null,
  style: "",
});

const characterId = computed(() => String(route.params.characterId || ""));
const character = computed(
  () => store.characters.find((item) => item.id === characterId.value) ?? null,
);
const selectedRelations = computed(() =>
  character.value
    ? relationshipsForCharacter(store.relationships, character.value.id)
    : [],
);

const detailFields = computed(() => {
  if (!character.value) {
    return [];
  }
  return [
    {
      label: "基本信息",
      value: `${character.value.gender || "未填性别"} · ${character.value.age ?? "年龄未知"} · ${getCharacterStatusLabel(character.value.status)}`,
    },
    { label: "身份信息", value: [character.value.race, character.value.identity].filter(Boolean).join(" · ") },
    { label: "外貌", value: character.value.appearance },
    { label: "性格", value: character.value.personality },
    { label: "背景", value: character.value.background },
    { label: "目标", value: character.value.goal },
    { label: "动机", value: character.value.motivation },
    { label: "核心冲突", value: character.value.conflict },
    { label: "能力", value: character.value.ability },
    { label: "所属文明", value: character.value.civilization?.name },
    { label: "所属势力", value: character.value.faction?.name },
  ];
});

onMounted(() => {
  void load();
});

watch([projectId, characterId], () => {
  void load();
});

watch(
  character,
  (value) => {
    const profile = value?.voiceProfile;
    voiceForm.voiceId = profile?.voiceId || "";
    voiceForm.language = profile?.language || "zh-CN";
    voiceForm.speed = typeof profile?.speed === "number" ? profile.speed : 1;
    voiceForm.pitch = typeof profile?.pitch === "number" ? profile.pitch : 0;
    voiceForm.style = profile?.style || "";
  },
  { immediate: true },
);

async function load() {
  pageError.value = null;
  if (!projectId.value) {
    return;
  }
  await store.load(projectId.value);
}

function relationLabel(item: CharacterRelationship) {
  return item.label || getCharacterRelationTypeLabel(item.type);
}

function openEdit() {
  showForm.value = true;
}

function openRelation(item?: CharacterRelationship) {
  editingRelation.value = item ?? null;
  showRelation.value = true;
}

async function onSaveCharacter(payload: CharacterInput) {
  if (!projectId.value || !character.value) {
    return;
  }
  const result = await store.update(projectId.value, character.value.id, payload);
  if (result) {
    showForm.value = false;
  }
}

async function onSaveVoice() {
  if (!projectId.value || !character.value) {
    return;
  }
  await store.update(projectId.value, character.value.id, {
    voiceProfile: {
      voiceId: voiceForm.voiceId.trim() || null,
      language: voiceForm.language.trim() || null,
      speed: voiceForm.speed,
      pitch: voiceForm.pitch,
      style: voiceForm.style.trim() || null,
    },
  });
}

async function onDeleteCharacter() {
  if (!projectId.value || !character.value) {
    return;
  }
  const ok = await store.remove(projectId.value, character.value.id);
  pendingDelete.value = false;
  if (ok) {
    await navigateTo(`/projects/${projectId.value}/characters`);
  }
}

async function onCreateRelation(payload: CharacterRelationshipInput) {
  if (!projectId.value) {
    return;
  }
  const created = await store.createRelationship(projectId.value, payload);
  if (created) {
    showRelation.value = false;
  }
}

async function onUpdateRelation(payload: CharacterRelationshipUpdateInput) {
  if (!projectId.value || !editingRelation.value) {
    return;
  }
  const updated = await store.updateRelationship(
    projectId.value,
    editingRelation.value.id,
    payload,
  );
  if (updated) {
    showRelation.value = false;
  }
}

async function onDeleteRelation() {
  if (!projectId.value || !pendingRelation.value) {
    return;
  }
  await store.removeRelationship(projectId.value, pendingRelation.value.id);
  pendingRelation.value = null;
}
</script>
