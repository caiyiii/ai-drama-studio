<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p class="text-[11px] uppercase tracking-[0.2em] text-gold-400/80">History</p>
        <h2 class="mt-1 font-display text-3xl">历史</h2>
      </div>
      <div class="flex gap-2">
        <AiSoonButton />
        <button type="button" class="rounded-xl bg-gold-400 px-3 py-1.5 text-sm font-medium text-ink-950" @click="openCreate">
          新增事件
        </button>
      </div>
    </div>

    <p v-if="items.length === 0" class="text-sm text-zinc-500">还没有历史事件。用时间线记录这个世界的关键节点。</p>
    <ol v-else class="relative space-y-0 border-l border-gold-400/30 pl-6">
      <li v-for="(item, index) in sorted" :key="item.id" class="relative pb-8">
        <span class="absolute -left-[31px] top-1 h-3 w-3 rounded-full bg-gold-400" />
        <div class="rounded-2xl border border-white/5 bg-ink-800/70 p-4">
          <p class="text-[11px] text-zinc-500">{{ String(index + 1).padStart(2, "0") }}</p>
          <h3 class="mt-1 font-display text-2xl">{{ item.title }}</h3>
          <p class="mt-2 text-sm text-zinc-400">{{ item.description || "暂无描述" }}</p>
          <div class="mt-4 flex flex-wrap gap-2">
            <button type="button" class="rounded-xl border border-white/10 px-3 py-1.5 text-xs" :disabled="index === 0" @click="$emit('move', item.id, 'up')">上移</button>
            <button type="button" class="rounded-xl border border-white/10 px-3 py-1.5 text-xs" :disabled="index === sorted.length - 1" @click="$emit('move', item.id, 'down')">下移</button>
            <button type="button" class="rounded-xl border border-white/10 px-3 py-1.5 text-xs" @click="openEdit(item)">编辑</button>
            <button type="button" class="rounded-xl border border-red-500/20 px-3 py-1.5 text-xs text-red-300" @click="pending = item">删除</button>
          </div>
        </div>
      </li>
    </ol>

    <AppModal :open="showForm" :title="editing ? '编辑事件' : '新增事件'" description="按时间顺序记录世界变迁。" @close="showForm = false">
      <form class="space-y-3" @submit.prevent="onSubmit">
        <input v-model="form.title" required maxlength="120" placeholder="事件标题" class="w-full rounded-xl border border-white/10 bg-ink-900 px-4 py-3 text-sm" />
        <textarea v-model="form.description" rows="4" placeholder="描述" class="w-full rounded-xl border border-white/10 bg-ink-900 px-4 py-3 text-sm" />
        <div class="flex justify-end gap-2">
          <button type="button" class="text-sm text-zinc-400" @click="showForm = false">取消</button>
          <button type="submit" class="rounded-xl bg-gold-400 px-4 py-2 text-sm font-medium text-ink-950">保存</button>
        </div>
      </form>
    </AppModal>

    <ConfirmDialog
      :open="Boolean(pending)"
      :title="pending ? `确定删除《${pending.title}》？` : ''"
      message="删除后该历史事件将无法恢复。"
      @confirm="onDelete"
      @cancel="pending = null"
    />
  </div>
</template>

<script setup lang="ts">
import type { CreateWorldHistoryInput, WorldHistory } from "@ai-drama-studio/types";

const props = defineProps<{
  items: WorldHistory[];
}>();

const emit = defineEmits<{
  create: [data: CreateWorldHistoryInput];
  update: [id: string, data: CreateWorldHistoryInput];
  remove: [id: string];
  move: [id: string, direction: "up" | "down"];
}>();

const sorted = computed(() => [...props.items].sort((a, b) => a.order - b.order));
const showForm = ref(false);
const editing = ref<WorldHistory | null>(null);
const pending = ref<WorldHistory | null>(null);
const form = reactive({ title: "", description: "" });

function openCreate() {
  editing.value = null;
  form.title = "";
  form.description = "";
  showForm.value = true;
}

function openEdit(item: WorldHistory) {
  editing.value = item;
  form.title = item.title;
  form.description = item.description ?? "";
  showForm.value = true;
}

function onSubmit() {
  const data = {
    title: form.title.trim(),
    description: form.description.trim() || undefined,
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
