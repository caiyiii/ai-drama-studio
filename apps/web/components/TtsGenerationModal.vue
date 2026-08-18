<template>
  <div>
    <button
      type="button"
      class="rounded-xl border border-gold-400/30 px-2 py-1 text-xs text-gold-300 disabled:opacity-40"
      :disabled="generating"
      @click="open = true"
    >
      生成语音
    </button>

    <AppModal
      :open="open"
      title="生成语音"
      description="从对白生成 TTS Preview。确认后才会写入正式 Audio Asset。"
      @close="close"
    >
      <div class="space-y-3 text-sm">
        <p class="text-zinc-400">角色：{{ characterName }}</p>
        <p class="whitespace-pre-wrap text-zinc-200">「{{ text }}」</p>

        <label class="block">
          <span class="text-xs uppercase tracking-[0.16em] text-zinc-500">Voice ID</span>
          <input v-model="voiceId" class="studio-field mt-1" placeholder="角色 Voice ID 或手动填写" />
        </label>
        <div class="grid gap-3 tablet:grid-cols-2">
          <label class="block">
            <span class="text-xs uppercase tracking-[0.16em] text-zinc-500">Language</span>
            <input v-model="language" class="studio-field mt-1" placeholder="zh-CN" />
          </label>
          <label class="block">
            <span class="text-xs uppercase tracking-[0.16em] text-zinc-500">Speed</span>
            <input v-model.number="speed" type="number" min="0.25" max="4" step="0.05" class="studio-field mt-1" />
          </label>
          <label class="block">
            <span class="text-xs uppercase tracking-[0.16em] text-zinc-500">Pitch</span>
            <input v-model.number="pitch" type="number" min="-20" max="20" step="1" class="studio-field mt-1" />
          </label>
        </div>

        <p class="text-xs text-zinc-500">Provider：{{ providerLabel }}</p>
        <p class="text-xs text-zinc-500">Model：{{ modelLabel }}</p>
        <p v-if="!configured" class="rounded-xl border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs text-amber-200">
          尚未配置语音生成 AI。
          <NuxtLink :to="`/projects/${projectId}/settings#TTS`" class="underline">前往项目设置</NuxtLink>
        </p>
        <p class="text-xs text-zinc-600">语音生成费用由当前项目配置的 Provider 账户承担。</p>
        <p v-if="error" class="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {{ error }}
        </p>

        <audio
          v-if="previewSrc"
          :src="previewSrc"
          controls
          class="w-full"
        />
        <p v-if="task" class="text-xs text-zinc-500">
          Duration：{{ durationLabel }} · Voice：{{ taskVoice }}
        </p>

        <div class="flex flex-wrap justify-end gap-2 pt-2">
          <button type="button" class="text-sm text-zinc-400" @click="close">取消</button>
          <button
            type="button"
            class="rounded-xl border border-white/10 px-3 py-1.5 text-xs disabled:opacity-40"
            :disabled="generating || !configured"
            @click="generate"
          >
            {{ generating ? "生成中…" : task ? "重新生成" : "生成语音" }}
          </button>
          <button
            v-if="canApply"
            type="button"
            class="rounded-xl bg-gold-400 px-3 py-1.5 text-xs font-medium text-ink-950 disabled:opacity-40"
            :disabled="applying"
            @click="apply"
          >
            {{ applying ? "应用中…" : "应用为最终语音" }}
          </button>
        </div>
      </div>
    </AppModal>
  </div>
</template>

<script setup lang="ts">
import {
  getGenerationDurationLabel,
  previewAudioSrc,
  resolveAssetDisplayUrl,
} from "@ai-drama-studio/core";
import {
  GenerationTaskStatus,
  type Character,
  type GenerationTask,
  type ScriptBlock,
} from "@ai-drama-studio/types";
import { useAiProviderStore } from "~/stores/ai-provider";

const props = defineProps<{
  projectId: string;
  episodeId: string;
  block: ScriptBlock;
  character?: Character | null;
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
const voiceId = ref("");
const language = ref("zh-CN");
const speed = ref<number | undefined>(undefined);
const pitch = ref<number | undefined>(undefined);

const characterName = computed(
  () => props.character?.name || props.block.character?.name || "未绑定角色 / 旁白",
);
const text = computed(() => props.block.content);
const ttsConfig = computed(() => aiStore.projectAiConfig?.TTS);
const configured = computed(() => Boolean(ttsConfig.value?.configured));
const providerLabel = computed(() => ttsConfig.value?.providerName || "未配置");
const modelLabel = computed(() => ttsConfig.value?.model || "未配置");

const canApply = computed(
  () => task.value?.status === GenerationTaskStatus.SUCCEEDED && !task.value.appliedAt,
);

const previewSrc = computed(() => {
  const output = task.value?.output as {
    url?: string;
    base64?: string;
    mimeType?: string;
  } | null;
  const src = output ? previewAudioSrc(output) : null;
  return src ? resolveAssetDisplayUrl(config.public.apiBase, src) ?? "" : "";
});

const durationLabel = computed(() => {
  const output = task.value?.output as { durationSeconds?: number } | null;
  if (typeof output?.durationSeconds === "number") {
    return `${output.durationSeconds}s`;
  }
  return getGenerationDurationLabel(task.value?.usage) || "—";
});

const taskVoice = computed(() => {
  const output = task.value?.output as { voice?: string } | null;
  const input = task.value?.input as { voiceId?: string } | null;
  return output?.voice || input?.voiceId || voiceId.value || "—";
});

watch(
  () => [open.value, props.character, props.block.id] as const,
  () => {
    if (!open.value) {
      return;
    }
    const profile = props.character?.voiceProfile;
    voiceId.value = profile?.voiceId || "";
    language.value = profile?.language || "zh-CN";
    speed.value = typeof profile?.speed === "number" ? profile.speed : 1;
    pitch.value = typeof profile?.pitch === "number" ? profile.pitch : 0;
    error.value = null;
  },
);

async function generate() {
  generating.value = true;
  error.value = null;
  try {
    task.value = await $api.createTtsGeneration(props.projectId, {
      episodeId: props.episodeId,
      scriptBlockId: props.block.id,
      text: props.block.content,
      characterId: props.character?.id || props.block.characterId || undefined,
      voiceId: voiceId.value.trim() || undefined,
      language: language.value.trim() || undefined,
      speed: speed.value,
      pitch: pitch.value,
    });
    if (task.value.status === GenerationTaskStatus.FAILED) {
      error.value = task.value.error || "语音生成失败";
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : "语音生成失败";
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
    task.value = await $api.applyTtsGeneration(props.projectId, task.value.id);
    emit("applied");
    open.value = false;
  } catch (err) {
    error.value = err instanceof Error ? err.message : "应用语音失败";
  } finally {
    applying.value = false;
  }
}

function close() {
  open.value = false;
}
</script>
