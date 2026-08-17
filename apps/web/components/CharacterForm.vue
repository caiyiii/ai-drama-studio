<template>
  <form class="max-h-[70vh] space-y-3 overflow-y-auto pr-1" @submit.prevent="onSubmit">
    <div class="grid gap-3 tablet:grid-cols-2">
      <label class="block text-sm">
        <span class="text-xs uppercase tracking-[0.16em] text-zinc-500">名称 *</span>
        <input v-model="form.name" required maxlength="120" class="studio-field mt-2" placeholder="林玄" />
      </label>
      <label class="block text-sm">
        <span class="text-xs uppercase tracking-[0.16em] text-zinc-500">别名</span>
        <input v-model="form.alias" maxlength="120" class="studio-field mt-2" placeholder="玄子" />
      </label>
      <label class="block text-sm">
        <span class="text-xs uppercase tracking-[0.16em] text-zinc-500">性别</span>
        <StudioSelect v-model="form.gender" class="mt-2" :options="genderOptions" />
      </label>
      <label class="block text-sm">
        <span class="text-xs uppercase tracking-[0.16em] text-zinc-500">年龄</span>
        <input v-model="form.age" type="number" min="0" max="20000" class="studio-field mt-2" placeholder="19" />
      </label>
      <label class="block text-sm">
        <span class="text-xs uppercase tracking-[0.16em] text-zinc-500">种族</span>
        <input v-model="form.race" maxlength="80" class="studio-field mt-2" placeholder="人族" />
      </label>
      <label class="block text-sm">
        <span class="text-xs uppercase tracking-[0.16em] text-zinc-500">身份</span>
        <input v-model="form.identity" maxlength="120" class="studio-field mt-2" placeholder="问天宗外门弟子" />
      </label>
      <label class="block text-sm">
        <span class="text-xs uppercase tracking-[0.16em] text-zinc-500">角色定位</span>
        <StudioSelect v-model="form.role" class="mt-2" :options="roleOptions" />
      </label>
      <label class="block text-sm">
        <span class="text-xs uppercase tracking-[0.16em] text-zinc-500">状态</span>
        <StudioSelect v-model="form.status" class="mt-2" :options="statusOptions" />
      </label>
    </div>

    <p v-if="!hasWorld" class="rounded-xl border border-gold-400/20 bg-gold-400/5 px-4 py-3 text-sm text-gold-300">
      请先创建世界观，才能选择文明与势力。仍可先创建无所属人物。
    </p>
    <p v-else-if="civilizations.length === 0" class="text-sm text-zinc-500">暂无文明。</p>

    <div class="grid gap-3 tablet:grid-cols-2">
      <label class="block text-sm">
        <span class="text-xs uppercase tracking-[0.16em] text-zinc-500">文明</span>
        <StudioSelect v-model="form.civilizationId" class="mt-2" :options="civilizationOptions" />
      </label>
      <label class="block text-sm">
        <span class="text-xs uppercase tracking-[0.16em] text-zinc-500">势力</span>
        <StudioSelect v-model="form.factionId" class="mt-2" :options="factionOptions" />
      </label>
    </div>

    <label class="block text-sm">
      <span class="text-xs uppercase tracking-[0.16em] text-zinc-500">人物简介</span>
      <textarea v-model="form.description" rows="3" class="studio-field mt-2 resize-none" />
    </label>
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
      <span class="text-xs uppercase tracking-[0.16em] text-zinc-500">动机</span>
      <textarea v-model="form.motivation" rows="2" class="studio-field mt-2 resize-none" />
    </label>
    <label class="block text-sm">
      <span class="text-xs uppercase tracking-[0.16em] text-zinc-500">目标</span>
      <textarea v-model="form.goal" rows="2" class="studio-field mt-2 resize-none" />
    </label>
    <label class="block text-sm">
      <span class="text-xs uppercase tracking-[0.16em] text-zinc-500">核心冲突</span>
      <textarea v-model="form.conflict" rows="2" class="studio-field mt-2 resize-none" />
    </label>
    <label class="block text-sm">
      <span class="text-xs uppercase tracking-[0.16em] text-zinc-500">能力</span>
      <textarea v-model="form.ability" rows="2" class="studio-field mt-2 resize-none" />
    </label>

    <p v-if="error" class="text-sm text-red-300">{{ error }}</p>
    <div class="flex justify-end gap-2 pt-2">
      <button type="button" class="text-sm text-zinc-400" @click="$emit('cancel')">取消</button>
      <button
        type="submit"
        :disabled="saving"
        class="rounded-xl bg-gold-400 px-4 py-2 text-sm font-medium text-ink-950 disabled:opacity-40"
      >
        {{ saving ? "保存中…" : "保存" }}
      </button>
    </div>
  </form>
</template>

<script setup lang="ts">
import {
  CHARACTER_GENDERS,
  CHARACTER_ROLES,
} from "@ai-drama-studio/config";
import { filterFactionsByCivilization } from "@ai-drama-studio/core";
import {
  CHARACTER_STATUS_LABELS,
  CharacterStatus,
  type Character,
  type CharacterInput,
  type Civilization,
  type Faction,
} from "@ai-drama-studio/types";

const props = defineProps<{
  initial?: Character | null;
  civilizations: Civilization[];
  factions: Faction[];
  hasWorld: boolean;
  saving?: boolean;
  error?: string | null;
}>();

const emit = defineEmits<{
  submit: [payload: CharacterInput];
  cancel: [];
}>();

const form = reactive({
  name: "",
  alias: "",
  gender: "",
  age: "",
  race: "",
  identity: "",
  role: "",
  status: CharacterStatus.ACTIVE,
  civilizationId: "",
  factionId: "",
  description: "",
  personality: "",
  appearance: "",
  background: "",
  motivation: "",
  goal: "",
  conflict: "",
  ability: "",
});

const genderOptions = [
  { value: "", label: "未填写" },
  ...CHARACTER_GENDERS.map((item) => ({ value: item, label: item })),
];
const roleOptions = [
  { value: "", label: "未填写" },
  ...CHARACTER_ROLES.map((item) => ({ value: item, label: item })),
];
const statusOptions = Object.values(CharacterStatus).map((item) => ({
  value: item,
  label: CHARACTER_STATUS_LABELS[item],
}));
const civilizationOptions = computed(() => [
  { value: "", label: props.hasWorld ? "无所属文明" : "请先创建世界观" },
  ...props.civilizations.map((item) => ({ value: item.id, label: item.name })),
]);
const factionOptions = computed(() => [
  { value: "", label: props.hasWorld ? "无所属势力" : "请先创建世界观" },
  ...filterFactionsByCivilization(props.factions, form.civilizationId || null).map(
    (item) => ({ value: item.id, label: item.name }),
  ),
]);

watch(
  () => props.initial,
  (value) => {
    form.name = value?.name ?? "";
    form.alias = value?.alias ?? "";
    form.gender = value?.gender ?? "";
    form.age = value?.age != null ? String(value.age) : "";
    form.race = value?.race ?? "";
    form.identity = value?.identity ?? "";
    form.role = value?.role ?? "";
    form.status = value?.status ?? CharacterStatus.ACTIVE;
    form.civilizationId = value?.civilizationId ?? "";
    form.factionId = value?.factionId ?? "";
    form.description = value?.description ?? "";
    form.personality = value?.personality ?? "";
    form.appearance = value?.appearance ?? "";
    form.background = value?.background ?? "";
    form.motivation = value?.motivation ?? "";
    form.goal = value?.goal ?? "";
    form.conflict = value?.conflict ?? "";
    form.ability = value?.ability ?? "";
  },
  { immediate: true },
);

watch(
  () => form.civilizationId,
  () => {
    const allowed = filterFactionsByCivilization(
      props.factions,
      form.civilizationId || null,
    );
    if (
      form.factionId &&
      !allowed.some((item) => item.id === form.factionId) &&
      props.factions.find((item) => item.id === form.factionId)?.civilizationId
    ) {
      form.factionId = "";
    }
  },
);

function onSubmit() {
  const ageValue = form.age.trim() ? Number(form.age) : null;
  emit("submit", {
    name: form.name.trim(),
    alias: form.alias.trim() || null,
    gender: form.gender || null,
    age: Number.isFinite(ageValue) ? ageValue : null,
    race: form.race.trim() || null,
    identity: form.identity.trim() || null,
    role: form.role || null,
    status: form.status as CharacterStatus,
    civilizationId: form.civilizationId || null,
    factionId: form.factionId || null,
    description: form.description.trim() || null,
    personality: form.personality.trim() || null,
    appearance: form.appearance.trim() || null,
    background: form.background.trim() || null,
    motivation: form.motivation.trim() || null,
    goal: form.goal.trim() || null,
    conflict: form.conflict.trim() || null,
    ability: form.ability.trim() || null,
  });
}
</script>
