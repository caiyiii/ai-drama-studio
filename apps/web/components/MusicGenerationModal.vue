<template>
  <div>
    <button
      type="button"
      class="rounded-xl border border-gold-400/30 px-2 py-1 text-xs text-gold-300 disabled:opacity-40"
      :disabled="generating"
      @click="open = true"
    >
      生成音乐
    </button>

    <AppModal
      :open="open"
      title="生成音乐"
      description="结合剧集故事上下文生成 BGM Preview。确认后才会写入正式 Audio Asset。"
      @close="close"
    >
      <div class="space-y-3 text-sm">
        <label class="block">
          <span class="text-xs uppercase tracking-[0.16em] text-zinc-500">Prompt</span>
          <textarea v-model="prompt" rows="3" class="studio-field mt-1 resize-none" placeholder="神秘的第一次接触，紧张而带有希望" />
        </label>
        <div class="grid gap-3 tablet:grid-cols-2">
          <label class="block">
            <span class="text-xs uppercase tracking-[0.16em] text-zinc-500">Style</span>
            <input v-model="style" class="studio-field mt-1" placeholder="cinematic" />
          </label>
          <label class="block">
            <span class="text-xs uppercase tracking-[0.16em] text-zinc-500">Mood</span>
            <input v-model="mood" class="studio-field mt-1" placeholder="mysterious" />
          </label>
          <label class="block">
            <span class="text-xs uppercase tracking-[0.16em] text-zinc-500">Genre</span>
            <input v-model="genre" class="studio-field mt-1" placeholder="sci-fi" />
          </label>
          <label class="block">
            <span class="text-xs uppercase tracking-[0.16em] text-zinc-500">Duration（秒）</span>
            <input v-model.number="durationSeconds" type="number" min="1" max="600" class="studio-field mt-1" />
          </label>
          <label class="block">
            <span class="text-xs uppercase tracking-[0.16em] text-zinc-500">Instrumentation</span>
            <input v-model="instrumentation" class="studio-field mt-1" placeholder="strings, synth" />
          </label>
          <label class="block">
            <span class="text-xs uppercase tracking-[0.16em] text-zinc-500">Tempo</span>
            <input v-model="tempo" class="studio-field mt-1" placeholder="slow" />
          </label>
        </div>
        <label class="flex items-center gap-2 text-xs text-zinc-400">
          <input v-model="isInstrumental" type="checkbox" />
          Instrumental
        </label>

        <p class="text-xs text-zinc-500">Provider：{{ providerLabel }}</p>
        <p class="text-xs text-zinc-500">Model：{{ modelLabel }}</p>
        <p v-if="!configured" class="rounded-xl border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs text-amber-200">
          尚未配置音乐生成 AI。
          <NuxtLink :to="`/projects/${projectId}/settings#MUSIC`" class="underline">前往 AI 配置</NuxtLink>
        </p>
        <p class="text-xs text-zinc-600">费用由当前配置的 Provider 账户承担。</p>
        <p v-if="error" class="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {{ error }}
        </p>

        <audio v-if="previewSrc" :src="previewSrc" controls class="w-full" />

        <div class="flex flex-wrap justify-end gap-2 pt-2">
          <button type="button" class="text-sm text-zinc-400" @click="close">取消</button>
          <button
            type="button"
            class="rounded-xl border border-white/10 px-3 py-1.5 text-xs disabled:opacity-40"
            :disabled="generating || !configured || !prompt.trim()"
            @click="generate"
          >
            {{ generating ? "正在生成音乐..." : task ? "重新生成" : "生成音乐" }}
          </button>
          <button
            v-if="canApply"
            type="button"
            class="rounded-xl bg-gold-400 px-3 py-1.5 text-xs font-medium text-ink-950 disabled:opacity-40"
            :disabled="applying"
            @click="apply"
          >
            {{ applying ? "应用中…" : "应用为最终" }}
          </button>
        </div>
      </div>
    </AppModal>
  </div>
</template>

<script setup lang="ts">
import { resolveAssetDisplayUrl } from "@ai-drama-studio/core";
import { GenerationTaskStatus, type GenerationTask } from "@ai-drama-studio/types";
import { useAiProviderStore } from "~/stores/ai-provider";

const props = defineProps<{
  projectId: string;
  episodeId: string;
}>();

const emit = defineEmits<{
  applied: [];
}>();

const { $api } = useNuxtApp();
const config = useRuntimeConfig();
const aiStore = useAiProviderStore();
const open = ref(false);
const generating = ref(false);
const applying = ref(false);
const error = ref<string | null>(null);
const task = ref<GenerationTask | null>(null);
const prompt = ref("");
const style = ref("");
const mood = ref("");
const genre = ref("");
const durationSeconds = ref(30);
const instrumentation = ref("");
const tempo = ref("");
const isInstrumental = ref(true);

const musicConfig = computed(() => aiStore.projectAiConfig?.MUSIC);
const configured = computed(() => Boolean(musicConfig.value?.configured));
const providerLabel = computed(() => musicConfig.value?.providerName || "未配置");
const modelLabel = computed(() => musicConfig.value?.model || "—");
const canApply = computed(
  () => task.value?.status === GenerationTaskStatus.SUCCEEDED && !task.value.appliedAt,
);
const previewSrc = computed(() => {
  const output = task.value?.output as { previewUrl?: string } | null;
  return output?.previewUrl
    ? resolveAssetDisplayUrl(config.public.apiBase, output.previewUrl) ?? ""
    : "";
});

function mapError(err: unknown) {
  if (err && typeof err === "object" && "code" in err) {
    const code = String((err as { code?: string }).code || "");
    if (code === "MUSIC_PROVIDER_NOT_CONFIGURED") {
      return "尚未配置音乐生成 AI";
    }
    if (code === "MUSIC_CAPABILITY_NOT_SUPPORTED") {
      return "当前 Provider 不支持音乐生成";
    }
  }
  return err instanceof Error ? err.message : "音乐生成失败";
}

async function generate() {
  generating.value = true;
  error.value = null;
  try {
    task.value = await $api.createMusicGeneration(props.projectId, {
      episodeId: props.episodeId,
      prompt: prompt.value,
      durationSeconds: durationSeconds.value,
      style: style.value.trim() || undefined,
      mood: mood.value.trim() || undefined,
      genre: genre.value.trim() || undefined,
      instrumentation: instrumentation.value.trim() || undefined,
      tempo: tempo.value.trim() || undefined,
      isInstrumental: isInstrumental.value,
    });
    if (task.value.status === GenerationTaskStatus.FAILED) {
      error.value = task.value.error || "当前 Provider 不支持音乐生成";
    }
  } catch (err) {
    error.value = mapError(err);
  } finally {
    generating.value = false;
  }
}

async function apply() {
  if (!task.value) {
    return;
  }
  applying.value = true;
  error.value = null;
  try {
    task.value = await $api.applyMusicGeneration(props.projectId, task.value.id);
    emit("applied");
    open.value = false;
  } catch (err) {
    error.value = mapError(err);
  } finally {
    applying.value = false;
  }
}

function close() {
  open.value = false;
}
</script>
