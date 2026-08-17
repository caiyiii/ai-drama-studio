<template>
  <div>
    <button
      type="button"
      class="rounded-xl border border-gold-400/30 px-3 py-1.5 text-sm text-gold-300 hover:bg-gold-400/10"
      @click="open = true"
    >
      AI生成世界观
    </button>

    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-end bg-black/70 p-4 tablet:items-center tablet:justify-center"
      @click.self="close"
    >
      <div class="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-white/10 bg-ink-800 p-6">
        <h2 class="font-display text-2xl">AI 生成世界观</h2>
        <p class="mt-1 text-sm text-zinc-500">生成结果会先预览，不会自动覆盖当前世界观。</p>

        <form class="mt-6 space-y-3" @submit.prevent="onGenerate">
          <label class="block text-sm">
            <span class="text-xs uppercase tracking-[0.16em] text-zinc-500">创作提示词</span>
            <textarea
              v-model="form.prompt"
              required
              rows="5"
              class="studio-field mt-2 resize-none"
              placeholder="两大星系发生碰撞，两大文明发生交融，一个走向修仙，一个走向赛博科技。"
            />
          </label>
          <div class="grid gap-3 tablet:grid-cols-2">
            <label class="block text-sm">
              <span class="text-xs uppercase tracking-[0.16em] text-zinc-500">生成风格</span>
              <StudioSelect v-model="form.style" class="mt-2" :options="styleOptions" />
            </label>
            <label class="block text-sm">
              <span class="text-xs uppercase tracking-[0.16em] text-zinc-500">详细程度</span>
              <StudioSelect v-model="form.detailLevel" class="mt-2" :options="detailOptions" />
            </label>
          </div>
          <div class="flex justify-end gap-2">
            <button type="button" class="text-sm text-zinc-400" @click="close">关闭</button>
            <button
              type="submit"
              :disabled="generating"
              class="rounded-xl bg-gold-400 px-4 py-2 text-sm font-medium text-ink-950 disabled:opacity-40"
            >
              {{ generating ? "生成中…" : preview ? "重新生成" : "生成" }}
            </button>
          </div>
        </form>

        <p v-if="generating" class="mt-6 text-sm text-gold-300">生成中...</p>
        <p v-if="localError" class="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {{ localError }}
        </p>

        <div v-if="preview && !generating" class="mt-6 space-y-4">
          <h3 class="font-display text-xl">AI Preview</h3>
          <article class="rounded-2xl border border-white/5 bg-ink-900/80 p-4">
            <p class="text-xs text-zinc-500">世界</p>
            <h4 class="mt-1 font-display text-2xl">{{ preview.world.name }}</h4>
            <p class="mt-2 text-sm text-zinc-400">{{ preview.world.description }}</p>
            <p class="mt-3 text-sm text-zinc-500">宇宙背景：{{ preview.world.cosmicBackground }}</p>
            <p class="mt-2 text-sm text-zinc-500">核心冲突：{{ preview.world.coreConflict }}</p>
          </article>
          <div class="grid gap-3 tablet:grid-cols-2">
            <article v-for="item in preview.civilizations" :key="item.name" class="rounded-2xl border border-white/5 p-4">
              <p class="text-xs text-gold-300">{{ item.type }}</p>
              <h4 class="mt-1 text-lg">{{ item.name }}</h4>
              <p class="mt-2 text-sm text-zinc-400">{{ item.description }}</p>
            </article>
          </div>
          <ol class="space-y-2 border-l border-gold-400/30 pl-4">
            <li v-for="item in preview.histories" :key="`${item.order}-${item.title}`" class="text-sm text-zinc-400">
              <strong class="text-zinc-100">{{ item.title }}</strong>
              <span> · {{ item.description }}</span>
            </li>
          </ol>
          <div class="flex flex-wrap gap-2">
            <button
              type="button"
              class="rounded-xl bg-gold-400 px-4 py-2 text-sm font-medium text-ink-950"
              @click="askApply"
            >
              应用到世界观
            </button>
            <button type="button" class="rounded-xl border border-white/10 px-4 py-2 text-sm" @click="onGenerate">
              重新生成
            </button>
          </div>
        </div>
      </div>
    </div>

    <ConfirmDialog
      :open="confirmOpen"
      title="应用 AI 世界观？"
      message="应用 AI 世界观将更新当前世界观内容，是否继续？"
      confirm-label="确认应用"
      @confirm="onApply"
      @cancel="confirmOpen = false"
    />
  </div>
</template>

<script setup lang="ts">
import {
  GenerationStatus,
  WORLD_GENERATION_DETAIL_LEVELS,
  WORLD_GENERATION_STYLES,
  type WorldGenerationResult,
} from "@ai-drama-studio/types";
import { useWorldStore } from "~/stores/world";

const props = defineProps<{
  projectId: string;
  hasWorld: boolean;
}>();

const emit = defineEmits<{
  applied: [];
}>();

const worldStore = useWorldStore();
const open = ref(false);
const confirmOpen = ref(false);
const localError = ref<string | null>(null);
const preview = ref<WorldGenerationResult | null>(null);
const taskId = ref<string | null>(null);
const form = reactive({
  prompt: "两大星系发生碰撞，两大文明发生交融，一个走向修仙，一个走向赛博科技。",
  style: "史诗",
  detailLevel: "标准",
});
const styleOptions = WORLD_GENERATION_STYLES.map((item) => ({
  value: item,
  label: item,
}));
const detailOptions = WORLD_GENERATION_DETAIL_LEVELS.map((item) => ({
  value: item,
  label: item,
}));
const generating = computed(() => worldStore.generating);

function close() {
  open.value = false;
}

function asPreview(output: unknown): WorldGenerationResult | null {
  if (!output || typeof output !== "object") {
    return null;
  }
  const value = output as WorldGenerationResult;
  if (!value.world?.name) {
    return null;
  }
  return value;
}

async function onGenerate() {
  localError.value = null;
  preview.value = null;
  const task = await worldStore.createWorldGeneration(props.projectId, {
    prompt: form.prompt.trim(),
    style: form.style,
    detailLevel: form.detailLevel,
  });
  if (!task) {
    localError.value = worldStore.actionError || "AI 生成失败";
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
  if (props.hasWorld) {
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
  const task = await worldStore.applyWorldGeneration(props.projectId, taskId.value);
  if (!task) {
    localError.value = worldStore.actionError || "应用失败";
    return;
  }
  emit("applied");
  close();
}
</script>
