<template>
  <AppModal
    :open="open"
    :title="editing ? '编辑人物关系' : '添加人物关系'"
    description="关系只属于当前项目，不会自动创建反向关系。"
    @close="$emit('close')"
  >
    <form class="space-y-3" @submit.prevent="onSubmit">
      <label class="block text-sm">
        <span class="text-xs uppercase tracking-[0.16em] text-zinc-500">目标人物 *</span>
        <StudioSelect
          v-model="form.toCharacterId"
          class="mt-2"
          :disabled="Boolean(editing)"
          :options="targetOptions"
        />
      </label>
      <label class="block text-sm">
        <span class="text-xs uppercase tracking-[0.16em] text-zinc-500">关系类型 *</span>
        <StudioSelect v-model="form.type" class="mt-2" :options="typeOptions" />
      </label>
      <label v-if="form.type === CharacterRelationType.OTHER" class="block text-sm">
        <span class="text-xs uppercase tracking-[0.16em] text-zinc-500">自定义关系</span>
        <input
          v-model="form.label"
          maxlength="80"
          class="studio-field mt-2"
          placeholder="前世夫妻"
        />
      </label>
      <label v-else class="block text-sm">
        <span class="text-xs uppercase tracking-[0.16em] text-zinc-500">关系标签</span>
        <input
          v-model="form.label"
          maxlength="80"
          class="studio-field mt-2"
          placeholder="可选，如：同门"
        />
      </label>
      <label class="block text-sm">
        <span class="text-xs uppercase tracking-[0.16em] text-zinc-500">关系强度</span>
        <StudioSelect v-model="form.strength" class="mt-2" :options="strengthOptions" />
      </label>
      <label class="block text-sm">
        <span class="text-xs uppercase tracking-[0.16em] text-zinc-500">描述</span>
        <textarea
          v-model="form.description"
          rows="3"
          class="studio-field mt-2 resize-none"
          placeholder="双方互相不信任"
        />
      </label>
      <p v-if="error" class="text-sm text-red-300">{{ error }}</p>
      <div class="flex justify-end gap-2 pt-2">
        <button type="button" class="text-sm text-zinc-400" @click="$emit('close')">取消</button>
        <button
          type="submit"
          :disabled="saving || !form.toCharacterId"
          class="rounded-xl bg-gold-400 px-4 py-2 text-sm font-medium text-ink-950 disabled:opacity-40"
        >
          {{ saving ? "保存中…" : "保存" }}
        </button>
      </div>
    </form>
  </AppModal>
</template>

<script setup lang="ts">
import { CHARACTER_RELATION_STRENGTHS } from "@ai-drama-studio/config";
import { getCharacterRelationTypeLabel } from "@ai-drama-studio/core";
import {
  CharacterRelationType,
  type Character,
  type CharacterRelationship,
  type CharacterRelationshipInput,
  type CharacterRelationshipUpdateInput,
} from "@ai-drama-studio/types";

const props = defineProps<{
  open: boolean;
  fromCharacter: Character | null;
  characters: Character[];
  editing?: CharacterRelationship | null;
  saving?: boolean;
  error?: string | null;
}>();

const emit = defineEmits<{
  close: [];
  create: [payload: CharacterRelationshipInput];
  update: [payload: CharacterRelationshipUpdateInput];
}>();

const form = reactive({
  toCharacterId: "",
  type: CharacterRelationType.UNKNOWN,
  label: "",
  strength: "3",
  description: "",
});

const targetOptions = computed(() =>
  props.characters
    .filter((item) => item.id !== props.fromCharacter?.id)
    .map((item) => ({
      value: item.id,
      label: item.alias ? `${item.name}（${item.alias}）` : item.name,
    })),
);

const typeOptions = Object.values(CharacterRelationType).map((item) => ({
  value: item,
  label: getCharacterRelationTypeLabel(item),
}));

const strengthOptions = CHARACTER_RELATION_STRENGTHS.map((item) => ({
  value: String(item),
  label: String(item),
}));

watch(
  () => [props.open, props.editing, props.fromCharacter?.id] as const,
  () => {
    if (!props.open) {
      return;
    }
    form.toCharacterId = props.editing?.toCharacterId ?? "";
    form.type = props.editing?.type ?? CharacterRelationType.UNKNOWN;
    form.label = props.editing?.label ?? "";
    form.strength = String(props.editing?.strength ?? 3);
    form.description = props.editing?.description ?? "";
  },
);

function onSubmit() {
  if (props.editing) {
    emit("update", {
      type: form.type as CharacterRelationType,
      label: form.label.trim() || null,
      strength: Number(form.strength),
      description: form.description.trim() || null,
    });
    return;
  }
  if (!props.fromCharacter || !form.toCharacterId) {
    return;
  }
  emit("create", {
    fromCharacterId: props.fromCharacter.id,
    toCharacterId: form.toCharacterId,
    type: form.type as CharacterRelationType,
    label: form.label.trim() || null,
    strength: Number(form.strength),
    description: form.description.trim() || null,
  });
}
</script>
