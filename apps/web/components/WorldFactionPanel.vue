<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p class="text-[11px] uppercase tracking-[0.2em] text-gold-400/80">Factions</p>
        <h2 class="mt-1 font-display text-3xl">势力</h2>
      </div>
      <div class="flex gap-2">
        <AiSoonButton />
        <button type="button" class="rounded-xl bg-gold-400 px-3 py-1.5 text-sm font-medium text-ink-950" @click="openCreate">
          新增势力
        </button>
      </div>
    </div>

    <p v-if="items.length === 0" class="text-sm text-zinc-500">还没有势力。可以绑定文明，也可以保持跨文明。</p>
    <div v-else class="grid gap-4 tablet:grid-cols-2">
      <article v-for="item in items" :key="item.id" class="rounded-2xl border border-white/5 bg-ink-800/70 p-5">
        <h3 class="font-display text-2xl">{{ item.name }}</h3>
        <p class="mt-2 text-xs text-gold-300">{{ item.type || "未分类" }} · {{ civilizationName(item.civilizationId) }}</p>
        <p class="mt-3 text-sm text-zinc-400">{{ item.description || "暂无简介" }}</p>
        <div class="mt-4 flex gap-2">
          <button type="button" class="rounded-xl border border-white/10 px-3 py-1.5 text-sm" @click="openEdit(item)">编辑</button>
          <button type="button" class="rounded-xl border border-red-500/20 px-3 py-1.5 text-sm text-red-300" @click="pending = item">删除</button>
        </div>
      </article>
    </div>

    <AppModal :open="showForm" :title="editing ? '编辑势力' : '新增势力'" description="描述这个世界中的权力结构。" @close="showForm = false">
      <form class="space-y-3" @submit.prevent="onSubmit">
        <input v-model="form.name" required maxlength="120" placeholder="名称" class="w-full rounded-xl border border-white/10 bg-ink-900 px-4 py-3 text-sm" />
        <select v-model="form.type" class="w-full rounded-xl border border-white/10 bg-ink-900 px-4 py-3 text-sm">
          <option v-for="item in types" :key="item" :value="item">{{ item }}</option>
        </select>
        <select v-model="form.civilizationId" class="w-full rounded-xl border border-white/10 bg-ink-900 px-4 py-3 text-sm">
          <option value="">跨文明 / 无所属</option>
          <option v-for="item in civilizations" :key="item.id" :value="item.id">{{ item.name }}</option>
        </select>
        <textarea v-model="form.description" rows="3" placeholder="简介" class="w-full rounded-xl border border-white/10 bg-ink-900 px-4 py-3 text-sm" />
        <div class="flex justify-end gap-2">
          <button type="button" class="text-sm text-zinc-400" @click="showForm = false">取消</button>
          <button type="submit" class="rounded-xl bg-gold-400 px-4 py-2 text-sm font-medium text-ink-950">保存</button>
        </div>
      </form>
    </AppModal>

    <ConfirmDialog
      :open="Boolean(pending)"
      :title="pending ? `确定删除《${pending.name}》？` : ''"
      message="删除后该势力数据将无法恢复。"
      @confirm="onDelete"
      @cancel="pending = null"
    />
  </div>
</template>

<script setup lang="ts">
import { FACTION_TYPES } from "@ai-drama-studio/config";
import type { Civilization, CreateFactionInput, Faction } from "@ai-drama-studio/types";

const props = defineProps<{
  items: Faction[];
  civilizations: Civilization[];
}>();

const emit = defineEmits<{
  create: [data: CreateFactionInput];
  update: [id: string, data: CreateFactionInput];
  remove: [id: string];
}>();

const types = FACTION_TYPES;
const showForm = ref(false);
const editing = ref<Faction | null>(null);
const pending = ref<Faction | null>(null);
const form = reactive({
  name: "",
  type: "其他",
  civilizationId: "",
  description: "",
});

function civilizationName(id: string | null) {
  if (!id) {
    return "跨文明";
  }
  return props.civilizations.find((item) => item.id === id)?.name ?? "未知文明";
}

function openCreate() {
  editing.value = null;
  form.name = "";
  form.type = "其他";
  form.civilizationId = "";
  form.description = "";
  showForm.value = true;
}

function openEdit(item: Faction) {
  editing.value = item;
  form.name = item.name;
  form.type = item.type || "其他";
  form.civilizationId = item.civilizationId ?? "";
  form.description = item.description ?? "";
  showForm.value = true;
}

function onSubmit() {
  const data: CreateFactionInput = {
    name: form.name.trim(),
    type: form.type,
    description: form.description.trim() || undefined,
    civilizationId: form.civilizationId || null,
  };
  if (editing.value) {
    emit("update", editing.value.id, data);
  } else {
    emit("create", data);
  }
  showForm.value = false;
}

function onDelete() {
  if (pending.value) {
    emit("remove", pending.value.id);
    pending.value = null;
  }
}
</script>
