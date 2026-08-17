<template>
  <div>
    <button
      type="button"
      class="rounded-xl border border-gold-400/30 px-3 py-1.5 text-sm text-gold-300 hover:bg-gold-400/10"
      @click="open = true"
    >
      AI生成人物
    </button>

    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-end bg-black/70 p-4 tablet:items-center tablet:justify-center"
      @click.self="close"
    >
      <div class="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-white/10 bg-ink-800 p-6">
        <h2 class="font-display text-2xl">AI 生成人物</h2>
        <p class="mt-1 text-sm text-zinc-500">生成结果会先预览，不会立即创建人物。</p>

        <form class="mt-6 space-y-3" @submit.prevent="onGenerate">
          <label class="block text-sm">
            <span class="text-xs uppercase tracking-[0.16em] text-zinc-500">自由描述 *</span>
            <textarea
              v-model="form.prompt"
              required
              rows="4"
              class="studio-field mt-2 resize-none"
              placeholder="一个来自修仙文明的年轻天才"
            />
          </label>
          <div class="grid gap-3 tablet:grid-cols-2 desktop:grid-cols-3">
            <label class="block text-sm">
              <span class="text-xs uppercase tracking-[0.16em] text-zinc-500">角色定位</span>
              <StudioSelect v-model="form.role" class="mt-2" :options="roleOptions" />
            </label>
            <label class="block text-sm">
              <span class="text-xs uppercase tracking-[0.16em] text-zinc-500">姓名（可选）</span>
              <input v-model="form.name" maxlength="120" class="studio-field mt-2" placeholder="沈星河" />
            </label>
            <label class="block text-sm">
              <span class="text-xs uppercase tracking-[0.16em] text-zinc-500">性别</span>
              <StudioSelect v-model="form.gender" class="mt-2" :options="genderOptions" />
            </label>
            <label class="block text-sm">
              <span class="text-xs uppercase tracking-[0.16em] text-zinc-500">年龄</span>
              <input v-model="form.age" maxlength="40" class="studio-field mt-2" placeholder="19" />
            </label>
            <label class="block text-sm">
              <span class="text-xs uppercase tracking-[0.16em] text-zinc-500">文明</span>
              <StudioSelect v-model="form.civilizationId" class="mt-2" :options="civilizationOptions" />
            </label>
            <label class="block text-sm">
              <span class="text-xs uppercase tracking-[0.16em] text-zinc-500">势力</span>
              <StudioSelect v-model="form.factionId" class="mt-2" :options="factionOptions" />
            </label>
          </div>
          <div class="grid gap-3 tablet:grid-cols-2">
            <label class="block text-sm">
              <span class="text-xs uppercase tracking-[0.16em] text-zinc-500">性格</span>
              <textarea v-model="form.personality" rows="2" class="studio-field mt-2 resize-none" />
            </label>
            <label class="block text-sm">
              <span class="text-xs uppercase tracking-[0.16em] text-zinc-500">外貌</span>
              <textarea v-model="form.appearance" rows="2" class="studio-field mt-2 resize-none" />
            </label>
            <label class="block text-sm">
              <span class="text-xs uppercase tracking-[0.16em] text-zinc-500">背景</span>
              <textarea v-model="form.background" rows="2" class="studio-field mt-2 resize-none" />
            </label>
            <label class="block text-sm">
              <span class="text-xs uppercase tracking-[0.16em] text-zinc-500">目标</span>
              <textarea v-model="form.goal" rows="2" class="studio-field mt-2 resize-none" />
            </label>
            <label class="block text-sm">
              <span class="text-xs uppercase tracking-[0.16em] text-zinc-500">冲突</span>
              <textarea v-model="form.conflict" rows="2" class="studio-field mt-2 resize-none" />
            </label>
          </div>
          <div class="grid gap-3 tablet:grid-cols-2">
            <label class="block text-sm">
              <span class="text-xs uppercase tracking-[0.16em] text-zinc-500">风格</span>
              <StudioSelect v-model="form.style" class="mt-2" :options="styleOptions" />
            </label>
            <label class="block text-sm">
              <span class="text-xs uppercase tracking-[0.16em] text-zinc-500">详细程度</span>
              <StudioSelect v-model="form.detailLevel" class="mt-2" :options="detailOptions" />
            </label>
          </div>
          <div class="flex justify-end gap-2">
            <button type="button" class="text-sm text-zinc-400" @click="close">取消</button>
            <button
              type="submit"
              :disabled="generating"
              class="rounded-xl bg-gold-400 px-4 py-2 text-sm font-medium text-ink-950 disabled:opacity-40"
            >
              {{ generating ? "生成中…" : preview ? "重新生成" : "生成" }}
            </button>
          </div>
        </form>

        <p v-if="generating" class="mt-6 text-sm text-gold-300">AI 正在生成</p>
        <p v-if="generating" class="mt-1 text-xs text-zinc-500">
          正在构思人物 · 正在结合世界观 · 正在设计人物背景 · 正在生成角色卡
        </p>
        <p v-if="localError" class="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {{ localError }}
        </p>

        <div v-if="preview && !generating" class="mt-6 grid gap-4 desktop:grid-cols-[280px_1fr]">
          <article class="rounded-2xl border border-white/5 bg-ink-900/80 p-4">
            <p class="text-xs text-zinc-500">AI生成角色卡</p>
            <div class="mt-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-gold-400/15 font-display text-3xl text-gold-300">
              {{ preview.character.name.slice(0, 1) }}
            </div>
            <h4 class="mt-4 font-display text-2xl">{{ preview.character.name }}</h4>
            <p class="mt-1 text-sm text-gold-300">{{ preview.character.role || "未定位" }}</p>
            <p class="mt-2 text-sm text-zinc-400">{{ preview.character.identity || "身份待定" }}</p>
            <p class="mt-3 text-xs text-zinc-500">
              {{ preview.character.civilizationName || "无所属文明" }}
              <span v-if="preview.character.factionName"> · {{ preview.character.factionName }}</span>
            </p>
          </article>
          <div class="space-y-3 text-sm">
            <h3 class="font-display text-xl">人物详细信息</h3>
            <p><span class="text-zinc-500">别名：</span>{{ preview.character.alias || "—" }}</p>
            <p><span class="text-zinc-500">性别 / 年龄：</span>{{ preview.character.gender || "—" }} · {{ preview.character.age || "—" }}</p>
            <p><span class="text-zinc-500">种族：</span>{{ preview.character.race || "—" }}</p>
            <p><span class="text-zinc-500">性格：</span>{{ profileText(preview.character.personality) }}</p>
            <p><span class="text-zinc-500">外貌：</span>{{ profileText(preview.character.appearance) }}</p>
            <p><span class="text-zinc-500">背景：</span>{{ preview.character.background || "—" }}</p>
            <p><span class="text-zinc-500">目标：</span>{{ preview.character.goal || "—" }}</p>
            <p><span class="text-zinc-500">动机：</span>{{ preview.character.motivation || "—" }}</p>
            <p><span class="text-zinc-500">冲突：</span>{{ preview.character.conflict || "—" }}</p>
            <p><span class="text-zinc-500">能力：</span>{{ abilitiesText(preview.character.abilities) }}</p>
            <div v-if="preview.relationships.length > 0">
              <p class="text-zinc-500">建议关系</p>
              <ul class="mt-2 space-y-1 text-zinc-300">
                <li v-for="(item, index) in preview.relationships" :key="`${item.targetName}-${index}`">
                  {{ item.type }} → {{ item.targetName }}
                  <span v-if="item.label">（{{ item.label }}）</span>
                </li>
              </ul>
            </div>
            <div class="flex flex-wrap gap-2 pt-2">
              <button
                type="button"
                class="rounded-xl bg-gold-400 px-4 py-2 text-sm font-medium text-ink-950"
                @click="askApply"
              >
                应用人物
              </button>
              <button type="button" class="rounded-xl border border-white/10 px-4 py-2 text-sm" @click="onGenerate">
                重新生成
              </button>
              <button type="button" class="rounded-xl border border-white/10 px-4 py-2 text-sm" @click="close">
                取消
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <ConfirmDialog
      :open="confirmOpen"
      title="应用 AI 人物？"
      message="应用后将创建人物及其关系，是否继续？"
      confirm-label="确认应用"
      @confirm="onApply"
      @cancel="confirmOpen = false"
    />
  </div>
</template>

<script setup lang="ts">
import {
  CHARACTER_GENDERS,
  CHARACTER_GENERATION_DETAIL_LEVELS,
  CHARACTER_GENERATION_STYLES,
  CHARACTER_ROLES,
} from "@ai-drama-studio/config";
import { filterFactionsByCivilization } from "@ai-drama-studio/core";
import {
  GenerationStatus,
  type CharacterGenerationInput,
  type CharacterGenerationResult,
  type Civilization,
  type Faction,
} from "@ai-drama-studio/types";
import { useCharacterStore } from "~/stores/character";

const props = defineProps<{
  projectId: string;
  civilizations: Civilization[];
  factions: Faction[];
}>();

const emit = defineEmits<{
  applied: [];
}>();

const store = useCharacterStore();
const open = ref(false);
const confirmOpen = ref(false);
const localError = ref<string | null>(null);
const preview = ref<CharacterGenerationResult | null>(null);
const taskId = ref<string | null>(null);
const form = reactive({
  prompt: "一个来自修仙文明的年轻天才",
  style: "东方玄幻",
  detailLevel: "HIGH",
  name: "",
  role: "",
  gender: "",
  age: "",
  civilizationId: "",
  factionId: "",
  personality: "",
  appearance: "",
  background: "",
  goal: "",
  conflict: "",
});
const styleOptions = CHARACTER_GENERATION_STYLES.map((item) => ({
  value: item,
  label: item,
}));
const detailOptions = CHARACTER_GENERATION_DETAIL_LEVELS.map((item) => ({
  value: item,
  label: item,
}));
const roleOptions = [
  { value: "", label: "未指定" },
  ...CHARACTER_ROLES.map((item) => ({ value: item, label: item })),
];
const genderOptions = [
  { value: "", label: "未指定" },
  ...CHARACTER_GENDERS.map((item) => ({ value: item, label: item })),
];
const civilizationOptions = computed(() => [
  { value: "", label: "不指定文明" },
  ...props.civilizations.map((item) => ({ value: item.id, label: item.name })),
]);
const factionOptions = computed(() => [
  { value: "", label: "不指定势力" },
  ...filterFactionsByCivilization(props.factions, form.civilizationId || null).map(
    (item) => ({ value: item.id, label: item.name }),
  ),
]);
const generating = computed(() => store.generating);

function close() {
  open.value = false;
}

function profileText(value: Record<string, unknown>) {
  return Object.values(value)
    .filter((item): item is string => typeof item === "string" && Boolean(item.trim()))
    .join("；") || "—";
}

function abilitiesText(value: unknown[]) {
  return value
    .map((item) => (typeof item === "string" ? item : ""))
    .filter(Boolean)
    .join("；") || "—";
}

function asPreview(output: unknown): CharacterGenerationResult | null {
  if (!output || typeof output !== "object") {
    return null;
  }
  const value = output as CharacterGenerationResult;
  if (!value.character?.name) {
    return null;
  }
  return value;
}

function payload(): CharacterGenerationInput {
  return {
    prompt: form.prompt.trim(),
    style: form.style,
    detailLevel: form.detailLevel,
    name: form.name.trim() || undefined,
    role: form.role || undefined,
    gender: form.gender || undefined,
    age: form.age.trim() || undefined,
    civilizationId: form.civilizationId || undefined,
    factionId: form.factionId || undefined,
    personality: form.personality.trim() || undefined,
    appearance: form.appearance.trim() || undefined,
    background: form.background.trim() || undefined,
    goal: form.goal.trim() || undefined,
    conflict: form.conflict.trim() || undefined,
  };
}

async function onGenerate() {
  localError.value = null;
  preview.value = null;
  const task = await store.createCharacterGeneration(props.projectId, payload());
  if (!task) {
    localError.value = store.actionError || "AI 生成失败";
    return;
  }
  taskId.value = task.id;
  if (task.status !== GenerationStatus.SUCCEEDED) {
    localError.value = task.error || "AI 生成失败";
    return;
  }
  preview.value = asPreview(task.output);
  if (!preview.value) {
    localError.value = "生成结果无法预览";
  }
}

function askApply() {
  if (!taskId.value) {
    return;
  }
  confirmOpen.value = true;
}

async function onApply() {
  confirmOpen.value = false;
  if (!taskId.value) {
    return;
  }
  const task = await store.applyCharacterGeneration(props.projectId, taskId.value);
  if (!task) {
    localError.value = store.actionError || "应用失败";
    return;
  }
  emit("applied");
  close();
}
</script>
