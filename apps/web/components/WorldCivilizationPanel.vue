<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p class="text-[11px] uppercase tracking-[0.2em] text-gold-400/80">Civilizations</p>
        <h2 class="mt-1 font-display text-3xl">文明体系</h2>
      </div>
      <div class="flex gap-2">
        <AiSoonButton />
        <button
          type="button"
          class="rounded-xl bg-gold-400 px-3 py-1.5 text-sm font-medium text-ink-950"
          @click="openCreate"
        >
          新增文明
        </button>
      </div>
    </div>

    <p v-if="items.length === 0" class="text-sm text-zinc-500">还没有文明。创建第一个文明体系。</p>
    <div v-else class="grid gap-4 tablet:grid-cols-2">
      <article
        v-for="item in items"
        :key="item.id"
        class="rounded-2xl border border-white/5 bg-ink-800/70 p-5"
      >
        <h3 class="font-display text-2xl">{{ item.name }}</h3>
        <dl class="mt-3 space-y-2 text-sm text-zinc-400">
          <div><dt class="text-zinc-600">简介</dt><dd>{{ item.description || "—" }}</dd></div>
          <div><dt class="text-zinc-600">起源</dt><dd>{{ item.origin || "—" }}</dd></div>
          <div><dt class="text-zinc-600">哲学</dt><dd>{{ item.philosophy || "—" }}</dd></div>
          <div><dt class="text-zinc-600">社会</dt><dd>{{ item.society || "—" }}</dd></div>
          <div><dt class="text-zinc-600">文化</dt><dd>{{ item.culture || "—" }}</dd></div>
          <div><dt class="text-zinc-600">科技</dt><dd>{{ item.technology || "—" }}</dd></div>
        </dl>
        <div class="mt-4 flex gap-2">
          <button type="button" class="rounded-xl border border-white/10 px-3 py-1.5 text-sm" @click="openEdit(item)">
            编辑
          </button>
          <button type="button" class="rounded-xl border border-red-500/20 px-3 py-1.5 text-sm text-red-300" @click="askDelete(item)">
            删除
          </button>
        </div>
      </article>
    </div>

    <AppModal
      :open="showForm"
      :title="editing ? '编辑文明' : '新增文明'"
      description="描述这个文明如何生存与发展。"
      @close="showForm = false"
    >
      <form class="space-y-3" @submit.prevent="onSubmit">
        <input v-model="form.name" required maxlength="120" placeholder="名称" class="studio-field" />
        <textarea v-model="form.description" rows="2" placeholder="简介" class="studio-field resize-none" />
        <textarea v-model="form.origin" rows="2" placeholder="起源" class="studio-field resize-none" />
        <textarea v-model="form.philosophy" rows="2" placeholder="哲学" class="studio-field resize-none" />
        <textarea v-model="form.society" rows="2" placeholder="社会" class="studio-field resize-none" />
        <textarea v-model="form.culture" rows="2" placeholder="文化" class="studio-field resize-none" />
        <textarea v-model="form.technology" rows="2" placeholder="科技" class="studio-field resize-none" />
        <div class="flex justify-end gap-2">
          <button type="button" class="text-sm text-zinc-400" @click="showForm = false">取消</button>
          <button type="submit" class="rounded-xl bg-gold-400 px-4 py-2 text-sm font-medium text-ink-950">保存</button>
        </div>
      </form>
    </AppModal>

    <ConfirmDialog
      :open="Boolean(pending)"
      :title="pending ? `确定删除《${pending.name}》？` : ''"
      message="删除后该文明数据将无法恢复。"
      @confirm="onDelete"
      @cancel="pending = null"
    />
  </div>
</template>

<script setup lang="ts">
import type { Civilization, CreateCivilizationInput } from "@ai-drama-studio/types";

defineProps<{
  items: Civilization[];
}>();

const emit = defineEmits<{
  create: [data: CreateCivilizationInput];
  update: [id: string, data: CreateCivilizationInput];
  remove: [id: string];
}>();

const showForm = ref(false);
const editing = ref<Civilization | null>(null);
const pending = ref<Civilization | null>(null);
const form = reactive({
  name: "",
  description: "",
  origin: "",
  philosophy: "",
  society: "",
  culture: "",
  technology: "",
});

function fill(item?: Civilization) {
  form.name = item?.name ?? "";
  form.description = item?.description ?? "";
  form.origin = item?.origin ?? "";
  form.philosophy = item?.philosophy ?? "";
  form.society = item?.society ?? "";
  form.culture = item?.culture ?? "";
  form.technology = item?.technology ?? "";
}

function payload(): CreateCivilizationInput {
  return {
    name: form.name.trim(),
    description: form.description.trim() || undefined,
    origin: form.origin.trim() || undefined,
    philosophy: form.philosophy.trim() || undefined,
    society: form.society.trim() || undefined,
    culture: form.culture.trim() || undefined,
    technology: form.technology.trim() || undefined,
  };
}

function openCreate() {
  editing.value = null;
  fill();
  showForm.value = true;
}

function openEdit(item: Civilization) {
  editing.value = item;
  fill(item);
  showForm.value = true;
}

function askDelete(item: Civilization) {
  pending.value = item;
}

function onSubmit() {
  if (editing.value) {
    emit("update", editing.value.id, payload());
  } else {
    emit("create", payload());
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
