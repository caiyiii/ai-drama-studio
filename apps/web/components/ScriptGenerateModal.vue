<template>
  <div>
    <button
      type="button"
      class="rounded-xl border border-gold-400/30 px-3 py-1.5 text-sm text-gold-300 hover:bg-gold-400/10"
      @click="open = true"
    >
      AI 生成整集剧本
    </button>

    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-end bg-black/70 p-4 tablet:items-center tablet:justify-center"
      @click.self="close"
    >
      <div class="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-white/10 bg-ink-800 p-6">
        <h2 class="font-display text-2xl">AI 生成剧本</h2>
        <p class="mt-1 text-sm text-zinc-500">生成结果会先进入 Preview，确认后才会写入 Script / Scene / ScriptBlock。</p>
        <p v-if="hasExistingScript" class="mt-3 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-sm text-amber-200">
          当前剧本已有内容，应用后将替换当前剧本。
        </p>
        <form class="mt-6 space-y-3" @submit.prevent="onGenerate">
          <label class="block text-sm">
            <span class="text-xs uppercase tracking-[0.16em] text-zinc-500">额外要求</span>
            <textarea v-model="form.prompt" rows="3" class="studio-field mt-2 resize-none" placeholder="例如：强调可视化动作与镜头提示" />
          </label>
          <div class="grid gap-3 tablet:grid-cols-2">
            <input v-model="form.tone" class="studio-field" placeholder="基调，如热血 / 悬疑 / 喜剧" />
            <input v-model="form.style" class="studio-field" placeholder="风格，如日漫 / 国漫 / 短剧 / 电影感" />
          </div>
          <label class="block text-sm">
            <span class="text-xs uppercase tracking-[0.16em] text-zinc-500">目标时长（秒）</span>
            <select v-model.number="form.targetDurationSeconds" class="studio-field mt-2">
              <option :value="60">60 秒</option>
              <option :value="90">90 秒</option>
              <option :value="180">180 秒</option>
              <option :value="300">300 秒</option>
            </select>
          </label>
          <textarea v-model="form.additionalInstructions" rows="2" class="studio-field resize-none" placeholder="附加说明" />
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
          <h3 class="font-display text-2xl">{{ preview.script.title }}</h3>
          <p class="text-zinc-400">{{ preview.script.logline }}</p>
          <p class="text-zinc-500">{{ preview.script.summary }}</p>
          <p class="text-xs text-gold-300">
            预计 {{ preview.script.estimatedDurationSeconds }} 秒 · {{ preview.scenes.length }} 场
          </p>
          <ul class="space-y-2">
            <li v-for="scene in preview.scenes" :key="scene.number" class="rounded-xl border border-white/5 p-3">
              <p class="font-medium">Scene {{ scene.number }} · {{ scene.title }}</p>
              <p class="mt-1 text-zinc-500">{{ scene.summary }}</p>
              <p class="mt-1 text-xs text-zinc-600">{{ scene.blocks.length }} 个段落</p>
            </li>
          </ul>
          <div class="flex gap-2 pt-2">
            <button type="button" class="rounded-xl bg-gold-400 px-4 py-2 text-sm font-medium text-ink-950" @click="onApply">
              应用剧本
            </button>
            <button type="button" class="rounded-xl border border-white/10 px-4 py-2 text-sm" @click="close">取消</button>
          </div>
        </div>
      </div>
    </div>

    <ConfirmDialog
      :open="confirmReplace"
      title="替换当前剧本？"
      message="应用 AI 剧本后将替换当前剧本内容。"
      confirm-label="确认替换"
      @confirm="applyNow"
      @cancel="confirmReplace = false"
    />
  </div>
</template>

<script setup lang="ts">
import { GenerationTaskStatus, type ScriptGenerationResult } from "@ai-drama-studio/types";
import { useScriptStore } from "~/stores/script";

const props = defineProps<{
  projectId: string;
  episodeId: string;
  hasExistingScript: boolean;
}>();
const emit = defineEmits<{ applied: [] }>();
const store = useScriptStore();
const open = ref(false);
const localError = ref<string | null>(null);
const preview = ref<ScriptGenerationResult | null>(null);
const taskId = ref<string | null>(null);
const confirmReplace = ref(false);
const form = reactive({
  prompt: "",
  tone: "",
  style: "",
  targetDurationSeconds: 300,
  additionalInstructions: "",
});

function close() {
  open.value = false;
  confirmReplace.value = false;
}

async function onGenerate() {
  localError.value = null;
  preview.value = null;
  const task = await store.createScriptGeneration(props.projectId, {
    episodeId: props.episodeId,
    prompt: form.prompt || undefined,
    tone: form.tone || undefined,
    style: form.style || undefined,
    targetDurationSeconds: form.targetDurationSeconds,
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
  preview.value = task.output as ScriptGenerationResult | null;
}

async function onApply() {
  if (props.hasExistingScript) {
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
