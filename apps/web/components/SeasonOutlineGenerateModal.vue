<template>
  <div>
    <button
      type="button"
      class="rounded-xl border border-gold-400/30 px-3 py-1.5 text-sm text-gold-300 hover:bg-gold-400/10"
      @click="open = true"
    >
      AI 拆分剧集
    </button>

    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-end bg-black/70 p-4 tablet:items-center tablet:justify-center"
      @click.self="close"
    >
      <div class="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-white/10 bg-ink-800 p-6">
        <h2 class="font-display text-2xl">AI 拆分剧集</h2>
        <p class="mt-1 text-sm text-zinc-500">只会生成 Preview。确认后才会创建 Episode。</p>

        <form class="mt-6 grid gap-3 tablet:grid-cols-3" @submit.prevent="onGenerate">
          <label class="block text-sm">
            <span class="text-xs uppercase tracking-[0.16em] text-zinc-500">剧集数量</span>
            <input v-model.number="form.episodeCount" type="number" min="1" max="48" class="studio-field mt-2" />
          </label>
          <label class="block text-sm">
            <span class="text-xs uppercase tracking-[0.16em] text-zinc-500">单集时长（秒）</span>
            <input v-model.number="form.targetDurationSeconds" type="number" min="30" max="3600" class="studio-field mt-2" />
          </label>
          <label class="block text-sm tablet:col-span-3">
            <span class="text-xs uppercase tracking-[0.16em] text-zinc-500">额外要求</span>
            <textarea v-model="form.instruction" rows="3" class="studio-field mt-2 resize-none" placeholder="12 集，每集 5 分钟" />
          </label>
          <div class="tablet:col-span-3 flex justify-end gap-2">
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

        <div v-if="preview && !store.generating" class="mt-6 space-y-3">
          <h3 class="font-display text-xl">{{ preview.season.title }}</h3>
          <p class="text-sm text-zinc-400">{{ preview.season.synopsis }}</p>
          <article
            v-for="item in preview.episodes"
            :key="item.number"
            class="rounded-2xl border border-white/5 bg-ink-900/80 p-4"
          >
            <p class="text-xs text-gold-300">E{{ String(item.number).padStart(2, "0") }}</p>
            <h4 class="mt-1 font-display text-xl">{{ item.title }}</h4>
            <p class="mt-2 text-sm text-zinc-400">{{ item.synopsis }}</p>
            <p class="mt-2 text-xs text-zinc-500">冲突：{{ item.conflict }}</p>
            <p class="text-xs text-zinc-500">悬念：{{ item.cliffhanger }}</p>
          </article>
          <div class="flex gap-2">
            <button type="button" class="rounded-xl bg-gold-400 px-4 py-2 text-sm font-medium text-ink-950" @click="onApply">
              确认全部
            </button>
            <button type="button" class="rounded-xl border border-white/10 px-4 py-2 text-sm" @click="close">
              取消
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { GenerationTaskStatus, type SeasonGenerationResult } from "@ai-drama-studio/types";
import { useStoryStore } from "~/stores/story";

const props = defineProps<{
  projectId: string;
  seasonId: string;
}>();
const emit = defineEmits<{ applied: [] }>();
const store = useStoryStore();
const open = ref(false);
const localError = ref<string | null>(null);
const preview = ref<SeasonGenerationResult | null>(null);
const taskId = ref<string | null>(null);
const form = reactive({
  episodeCount: 12,
  targetDurationSeconds: 300,
  instruction: "",
});

function close() {
  open.value = false;
}

async function onGenerate() {
  localError.value = null;
  preview.value = null;
  const task = await store.createSeasonOutlineGeneration(props.projectId, {
    seasonId: props.seasonId,
    episodeCount: form.episodeCount,
    targetDurationSeconds: form.targetDurationSeconds,
    instruction: form.instruction || undefined,
  });
  if (!task) {
    localError.value = store.actionError || "AI 拆集失败";
    return;
  }
  taskId.value = task.id;
  if (task.status !== GenerationTaskStatus.SUCCEEDED) {
    localError.value = task.error || "AI 拆集失败";
    return;
  }
  preview.value = task.output as SeasonGenerationResult | null;
  if (!preview.value?.episodes?.length) {
    localError.value = "生成结果无法预览";
  }
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
