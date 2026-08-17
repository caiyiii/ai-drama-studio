<template>
  <div>
    <button
      type="button"
      class="rounded-xl border border-gold-400/30 px-3 py-1.5 text-sm text-gold-300 hover:bg-gold-400/10"
      @click="open = true"
    >
      AI生成本集大纲
    </button>

    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-end bg-black/70 p-4 tablet:items-center tablet:justify-center"
      @click.self="close"
    >
      <div class="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-white/10 bg-ink-800 p-6">
        <h2 class="font-display text-2xl">AI 生成本集大纲</h2>
        <p class="mt-1 text-sm text-zinc-500">这是 Episode Outline，不是完整剧本。</p>
        <form class="mt-6 space-y-3" @submit.prevent="onGenerate">
          <label class="block text-sm">
            <span class="text-xs uppercase tracking-[0.16em] text-zinc-500">额外要求</span>
            <textarea v-model="instruction" rows="4" class="studio-field mt-2 resize-none" />
          </label>
          <div class="flex justify-end gap-2">
            <button type="button" class="text-sm text-zinc-400" @click="close">取消</button>
            <button
              type="submit"
              :disabled="store.generating"
              class="rounded-xl bg-gold-400 px-4 py-2 text-sm font-medium text-ink-950 disabled:opacity-40"
            >
              {{ store.generating ? "生成中…" : "开始生成" }}
            </button>
          </div>
        </form>
        <p v-if="localError" class="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {{ localError }}
        </p>
        <div v-if="preview && !store.generating" class="mt-6 space-y-2 text-sm">
          <h3 class="font-display text-2xl">{{ preview.title }}</h3>
          <p class="text-zinc-400">{{ preview.synopsis }}</p>
          <p>开场：{{ preview.opening }}</p>
          <p>中段：{{ preview.middle }}</p>
          <p>结尾：{{ preview.ending }}</p>
          <p>冲突：{{ preview.conflict }}</p>
          <p>悬念：{{ preview.cliffhanger }}</p>
          <div class="flex gap-2 pt-2">
            <button type="button" class="rounded-xl bg-gold-400 px-4 py-2 text-sm font-medium text-ink-950" @click="onApply">
              确认应用
            </button>
            <button type="button" class="rounded-xl border border-white/10 px-4 py-2 text-sm" @click="close">取消</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { GenerationTaskStatus, type EpisodeGenerationResult } from "@ai-drama-studio/types";
import { useStoryStore } from "~/stores/story";

const props = defineProps<{
  projectId: string;
  episodeId: string;
}>();
const emit = defineEmits<{ applied: [] }>();
const store = useStoryStore();
const open = ref(false);
const localError = ref<string | null>(null);
const preview = ref<EpisodeGenerationResult | null>(null);
const taskId = ref<string | null>(null);
const instruction = ref("");

function close() {
  open.value = false;
}

async function onGenerate() {
  localError.value = null;
  preview.value = null;
  const task = await store.createEpisodeOutlineGeneration(props.projectId, {
    episodeId: props.episodeId,
    instruction: instruction.value || undefined,
  });
  if (!task) {
    localError.value = store.actionError || "AI 生成失败";
    return;
  }
  taskId.value = task.id;
  if (task.status !== GenerationTaskStatus.SUCCEEDED) {
    localError.value = task.error || "AI 生成失败";
    return;
  }
  preview.value = task.output as EpisodeGenerationResult | null;
}

async function onApply() {
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
