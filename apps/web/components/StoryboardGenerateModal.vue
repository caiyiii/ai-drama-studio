<template>
  <div>
    <button
      type="button"
      class="rounded-xl border border-gold-400/30 px-3 py-1.5 text-sm text-gold-300 hover:bg-gold-400/10"
      @click="open = true"
    >
      AI 生成分镜
    </button>

    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-end bg-black/70 p-4 tablet:items-center tablet:justify-center"
      @click.self="close"
    >
      <div class="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-white/10 bg-ink-800 p-6">
        <h2 class="font-display text-2xl">AI 生成分镜</h2>
        <p class="mt-1 text-sm text-zinc-500">
          Phase 8 仅支持整集生成。结果会先进入 Preview，确认后才会写入 Storyboard / Shot。
        </p>
        <p
          v-if="hasExistingStoryboard"
          class="mt-3 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-sm text-amber-200"
        >
          应用新的 AI 分镜将替换当前分镜内容，并生成新版本。
        </p>
        <form class="mt-6 space-y-3" @submit.prevent="onGenerate">
          <label class="block text-sm">
            <span class="text-xs uppercase tracking-[0.16em] text-zinc-500">生成范围</span>
            <select disabled class="studio-field mt-2">
              <option>整集</option>
            </select>
          </label>
          <textarea
            v-model="form.prompt"
            rows="3"
            class="studio-field resize-none"
            placeholder="额外要求，例如：加强星裂出现时的景别变化"
          />
          <textarea
            v-model="form.additionalInstructions"
            rows="2"
            class="studio-field resize-none"
            placeholder="附加说明"
          />
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
        <p v-if="localError" class="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {{ localError }}
        </p>
        <div v-if="preview && !store.generating" class="mt-6 space-y-3 text-sm">
          <h3 class="font-display text-2xl">{{ preview.storyboard.title }}</h3>
          <p class="text-zinc-400">{{ preview.storyboard.description }}</p>
          <p class="text-xs text-gold-300">
            {{ preview.storyboard.totalDurationSeconds }} 秒 · {{ preview.shots.length }} 镜
          </p>
          <div v-for="sceneNumber in sceneNumbers" :key="sceneNumber" class="rounded-xl border border-white/5 p-3">
            <p class="font-medium">Scene {{ String(sceneNumber).padStart(2, "0") }}</p>
            <ul class="mt-2 space-y-1 text-zinc-400">
              <li v-for="shot in shotsOf(sceneNumber)" :key="shot.shotNumber">
                Shot {{ String(shot.shotNumber).padStart(3, "0") }}
                · {{ shot.shotSize }}
                · {{ shot.durationSeconds }}s
                · {{ shot.visualDescription }}
              </li>
            </ul>
          </div>
          <div class="flex gap-2 pt-2">
            <button type="button" class="rounded-xl bg-gold-400 px-4 py-2 text-sm font-medium text-ink-950" @click="onApply">
              应用
            </button>
            <button type="button" class="rounded-xl border border-white/10 px-4 py-2 text-sm" @click="onGenerate">
              重新生成
            </button>
            <button type="button" class="rounded-xl border border-white/10 px-4 py-2 text-sm" @click="close">
              取消
            </button>
          </div>
        </div>
      </div>
    </div>

    <ConfirmDialog
      :open="confirmReplace"
      title="替换当前分镜？"
      message="应用新的 AI 分镜将替换当前分镜内容，并生成新版本，是否继续？"
      confirm-label="确认替换"
      @confirm="applyNow"
      @cancel="confirmReplace = false"
    />
  </div>
</template>

<script setup lang="ts">
import {
  GenerationTaskStatus,
  type StoryboardGenerationResult,
} from "@ai-drama-studio/types";
import { useStoryboardStore } from "~/stores/storyboard";

const props = defineProps<{
  projectId: string;
  episodeId: string;
  hasExistingStoryboard: boolean;
}>();
const emit = defineEmits<{ applied: [] }>();
const store = useStoryboardStore();
const open = ref(false);
const localError = ref<string | null>(null);
const preview = ref<StoryboardGenerationResult | null>(null);
const taskId = ref<string | null>(null);
const confirmReplace = ref(false);
const form = reactive({
  prompt: "",
  additionalInstructions: "",
});

const sceneNumbers = computed(() =>
  [...new Set((preview.value?.shots ?? []).map((item) => item.sceneNumber))].sort((a, b) => a - b),
);

function shotsOf(sceneNumber: number) {
  return (preview.value?.shots ?? []).filter((item) => item.sceneNumber === sceneNumber);
}

function close() {
  open.value = false;
  confirmReplace.value = false;
}

async function onGenerate() {
  localError.value = null;
  preview.value = null;
  const task = await store.createStoryboardGeneration(props.projectId, {
    episodeId: props.episodeId,
    prompt: form.prompt || undefined,
    additionalInstructions: form.additionalInstructions || undefined,
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
  preview.value = task.output as StoryboardGenerationResult | null;
}

async function onApply() {
  if (props.hasExistingStoryboard) {
    confirmReplace.value = true;
    return;
  }
  await applyNow();
}

async function applyNow() {
  confirmReplace.value = false;
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
