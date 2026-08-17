<template>
  <div>
    <button
      type="button"
      class="rounded-xl border border-gold-400/30 px-3 py-1.5 text-sm text-gold-300 hover:bg-gold-400/10"
      @click="open = true"
    >
      {{ hasBible ? "AI完善" : "AI生成" }}
    </button>

    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-end bg-black/70 p-4 tablet:items-center tablet:justify-center"
      @click.self="close"
    >
      <div class="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-white/10 bg-ink-800 p-6">
        <h2 class="font-display text-2xl">{{ hasBible ? "AI 完善故事圣经" : "AI 生成故事圣经" }}</h2>
        <p class="mt-1 text-sm text-zinc-500">生成结果会先预览，不会自动覆盖已有 Story Bible。</p>

        <form class="mt-6 space-y-3" @submit.prevent="onGenerate">
          <label class="block text-sm">
            <span class="text-xs uppercase tracking-[0.16em] text-zinc-500">创作要求 *</span>
            <textarea
              v-model="form.instruction"
              required
              rows="4"
              class="studio-field mt-2 resize-none"
              placeholder="完善星河碰撞的故事承诺、创作规则与连续性约束"
            />
          </label>
          <div class="grid gap-3 tablet:grid-cols-3">
            <label class="block text-sm">
              <span class="text-xs uppercase tracking-[0.16em] text-zinc-500">基调</span>
              <input v-model="form.tone" class="studio-field mt-2" placeholder="史诗" />
            </label>
            <label class="block text-sm">
              <span class="text-xs uppercase tracking-[0.16em] text-zinc-500">风格</span>
              <input v-model="form.style" class="studio-field mt-2" placeholder="科幻修仙" />
            </label>
            <label class="block text-sm">
              <span class="text-xs uppercase tracking-[0.16em] text-zinc-500">受众</span>
              <input v-model="form.audience" class="studio-field mt-2" placeholder="青年向" />
            </label>
          </div>
          <div class="flex justify-end gap-2">
            <button type="button" class="text-sm text-zinc-400" @click="close">取消</button>
            <button
              type="submit"
              :disabled="store.generating"
              class="rounded-xl bg-gold-400 px-4 py-2 text-sm font-medium text-ink-950 disabled:opacity-40"
            >
              {{ store.generating ? "生成中…" : preview ? "重新生成" : "开始生成" }}
            </button>
          </div>
        </form>

        <p v-if="store.generating" class="mt-6 text-sm text-gold-300">AI 正在生成 Story Bible</p>
        <p v-if="localError" class="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {{ localError }}
        </p>

        <div v-if="preview && !store.generating" class="mt-6 space-y-3">
          <h3 class="font-display text-xl">Preview</h3>
          <p class="font-display text-2xl">{{ preview.title }}</p>
          <p class="text-sm text-zinc-400">{{ preview.logline }}</p>
          <p class="text-sm text-zinc-500">主题：{{ preview.theme }} · 基调：{{ preview.tone }}</p>
          <p class="text-sm text-zinc-400">{{ preview.storyPromise }}</p>
          <div class="flex gap-2">
            <button type="button" class="rounded-xl bg-gold-400 px-4 py-2 text-sm font-medium text-ink-950" @click="askApply">
              确认应用
            </button>
            <button type="button" class="rounded-xl border border-white/10 px-4 py-2 text-sm" @click="onGenerate">
              取消
            </button>
          </div>
        </div>
      </div>
    </div>

    <ConfirmDialog
      :open="confirmOpen"
      title="覆盖现有故事圣经？"
      message="应用后会覆盖当前 Story Bible，不会修改 World / Character / Season。"
      confirm-label="确认覆盖"
      @confirm="onApply"
      @cancel="confirmOpen = false"
    />
  </div>
</template>

<script setup lang="ts">
import { GenerationTaskStatus, type StoryBibleGenerationResult } from "@ai-drama-studio/types";
import { useStoryStore } from "~/stores/story";

const props = defineProps<{
  projectId: string;
  hasBible: boolean;
}>();
const emit = defineEmits<{ applied: [] }>();
const store = useStoryStore();
const open = ref(false);
const confirmOpen = ref(false);
const localError = ref<string | null>(null);
const preview = ref<StoryBibleGenerationResult | null>(null);
const taskId = ref<string | null>(null);
const form = reactive({
  instruction: "完善星河碰撞的故事承诺、创作规则与连续性约束",
  tone: "史诗",
  style: "科幻修仙",
  audience: "青年向",
});

function close() {
  open.value = false;
}

function asPreview(output: unknown): StoryBibleGenerationResult | null {
  if (!output || typeof output !== "object" || !("title" in output)) {
    return null;
  }
  return output as StoryBibleGenerationResult;
}

async function onGenerate() {
  localError.value = null;
  preview.value = null;
  const task = await store.createStoryBibleGeneration(props.projectId, { ...form });
  if (!task) {
    localError.value = store.actionError || "AI 生成失败";
    return;
  }
  taskId.value = task.id;
  if (task.status !== GenerationTaskStatus.SUCCEEDED) {
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
  if (props.hasBible) {
    confirmOpen.value = true;
    return;
  }
  void onApply();
}

async function onApply() {
  confirmOpen.value = false;
  if (!taskId.value) {
    return;
  }
  const task = await store.applyGeneration(props.projectId, taskId.value);
  if (!task) {
    localError.value = store.actionError || "应用失败";
    return;
  }
  emit("applied");
  close();
}
</script>
