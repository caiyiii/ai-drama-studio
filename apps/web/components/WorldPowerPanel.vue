<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p class="text-[11px] uppercase tracking-[0.2em] text-gold-400/80">Power Systems</p>
        <h2 class="mt-1 font-display text-3xl">能力体系</h2>
      </div>
      <div class="flex gap-2">
        <AiSoonButton />
        <button type="button" class="rounded-xl bg-gold-400 px-3 py-1.5 text-sm font-medium text-ink-950" @click="openCreate">
          新增体系
        </button>
      </div>
    </div>

    <p v-if="items.length === 0" class="text-sm text-zinc-500">还没有能力体系。用结构化等级描述修炼、科技或异能。</p>
    <div v-else class="grid gap-4">
      <article v-for="item in items" :key="item.id" class="rounded-2xl border border-white/5 bg-ink-800/70 p-5">
        <h3 class="font-display text-2xl">{{ item.name }}</h3>
        <p class="mt-2 text-sm text-zinc-400">{{ item.description || "暂无简介" }}</p>
        <div class="mt-4">
          <p class="text-xs text-zinc-500">规则</p>
          <ul class="mt-2 list-disc pl-5 text-sm text-zinc-300">
            <li v-for="rule in item.rules" :key="rule">{{ rule }}</li>
            <li v-if="item.rules.length === 0" class="list-none pl-0 text-zinc-600">尚未填写规则</li>
          </ul>
        </div>
        <div class="mt-4">
          <p class="text-xs text-zinc-500">等级</p>
          <ol class="mt-2 space-y-1 text-sm text-zinc-300">
            <li v-for="(level, index) in item.levels" :key="`${level.name}-${index}`">
              {{ String(index + 1).padStart(2, "0") }} {{ level.name }}
              <span v-if="level.description" class="text-zinc-500"> · {{ level.description }}</span>
            </li>
            <li v-if="item.levels.length === 0" class="text-zinc-600">尚未填写等级</li>
          </ol>
        </div>
        <div class="mt-4 flex gap-2">
          <button type="button" class="rounded-xl border border-white/10 px-3 py-1.5 text-sm" @click="openEdit(item)">编辑</button>
          <button type="button" class="rounded-xl border border-red-500/20 px-3 py-1.5 text-sm text-red-300" @click="pending = item">删除</button>
        </div>
      </article>
    </div>

    <AppModal :open="showForm" :title="editing ? '编辑能力体系' : '新增能力体系'" description="用等级和规则描述力量如何成长，无需手写 JSON。" @close="showForm = false">
      <form class="space-y-4" @submit.prevent="onSubmit">
        <input v-model="form.name" required maxlength="120" placeholder="名称，如修仙体系" class="w-full rounded-xl border border-white/10 bg-ink-900 px-4 py-3 text-sm" />
        <textarea v-model="form.description" rows="3" placeholder="简介" class="w-full rounded-xl border border-white/10 bg-ink-900 px-4 py-3 text-sm" />
        <div>
          <div class="flex items-center justify-between">
            <p class="text-xs text-zinc-500">规则</p>
            <button type="button" class="text-xs text-gold-300" @click="form.rules.push('')">添加规则</button>
          </div>
          <div v-for="(_, index) in form.rules" :key="`rule-${index}`" class="mt-2 flex gap-2">
            <input v-model="form.rules[index]" placeholder="例如：越阶战斗会反噬" class="flex-1 rounded-xl border border-white/10 bg-ink-900 px-3 py-2 text-sm" />
            <button type="button" class="text-xs text-red-300" @click="form.rules.splice(index, 1)">删除</button>
          </div>
        </div>
        <div>
          <div class="flex items-center justify-between">
            <p class="text-xs text-zinc-500">等级</p>
            <button type="button" class="text-xs text-gold-300" @click="form.levels.push({ name: '', description: '' })">添加等级</button>
          </div>
          <div v-for="(level, index) in form.levels" :key="`level-${index}`" class="mt-2 grid gap-2 tablet:grid-cols-[1fr_2fr_auto]">
            <input v-model="level.name" placeholder="炼气 / 筑基" class="rounded-xl border border-white/10 bg-ink-900 px-3 py-2 text-sm" />
            <input v-model="level.description" placeholder="简要说明" class="rounded-xl border border-white/10 bg-ink-900 px-3 py-2 text-sm" />
            <button type="button" class="text-xs text-red-300" @click="form.levels.splice(index, 1)">删除</button>
          </div>
        </div>
        <div class="flex justify-end gap-2">
          <button type="button" class="text-sm text-zinc-400" @click="showForm = false">取消</button>
          <button type="submit" class="rounded-xl bg-gold-400 px-4 py-2 text-sm font-medium text-ink-950">保存</button>
        </div>
      </form>
    </AppModal>

    <ConfirmDialog
      :open="Boolean(pending)"
      :title="pending ? `确定删除《${pending.name}》？` : ''"
      message="删除后该能力体系将无法恢复。"
      @confirm="onDelete"
      @cancel="pending = null"
    />
  </div>
</template>

<script setup lang="ts">
import type { CreatePowerSystemInput, PowerSystem, PowerSystemLevel } from "@ai-drama-studio/types";

defineProps<{
  items: PowerSystem[];
}>();

const emit = defineEmits<{
  create: [data: CreatePowerSystemInput];
  update: [id: string, data: CreatePowerSystemInput];
  remove: [id: string];
}>();

const showForm = ref(false);
const editing = ref<PowerSystem | null>(null);
const pending = ref<PowerSystem | null>(null);
const form = reactive({
  name: "",
  description: "",
  rules: [""] as string[],
  levels: [{ name: "", description: "" }] as PowerSystemLevel[],
});

function openCreate() {
  editing.value = null;
  form.name = "";
  form.description = "";
  form.rules = [""];
  form.levels = [
    { name: "炼气", description: "" },
    { name: "筑基", description: "" },
    { name: "金丹", description: "" },
    { name: "元婴", description: "" },
  ];
  showForm.value = true;
}

function openEdit(item: PowerSystem) {
  editing.value = item;
  form.name = item.name;
  form.description = item.description ?? "";
  form.rules = item.rules.length ? [...item.rules] : [""];
  form.levels = item.levels.length
    ? item.levels.map((level) => ({ name: level.name, description: level.description ?? "" }))
    : [{ name: "", description: "" }];
  showForm.value = true;
}

function onSubmit() {
  const data: CreatePowerSystemInput = {
    name: form.name.trim(),
    description: form.description.trim() || undefined,
    rules: form.rules.map((item) => item.trim()).filter(Boolean),
    levels: form.levels
      .filter((item) => item.name.trim())
      .map((item) => ({
        name: item.name.trim(),
        description: item.description?.trim() || undefined,
      })),
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
