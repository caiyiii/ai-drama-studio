<template>
  <div>
    <button
      type="button"
      class="rounded-xl border border-gold-400/30 px-3 py-1.5 text-sm text-gold-300 hover:bg-gold-400/10"
      @click="open = true"
    >
      AI 生成场景
    </button>

    <AppModal
      :open="open"
      title="AI 生成场景"
      description="生成结果会先预览，不会立即写入正式场景。"
      @close="open = false"
    >
      <form class="space-y-3" @submit.prevent="onGenerate">
        <textarea
          v-model="form.prompt"
          required
          rows="4"
          class="studio-field resize-none"
          placeholder="例如：一个漂浮在环形星云中的古老观测站，兼具科研感与神秘感。"
        />
        <div class="grid gap-3 tablet:grid-cols-2">
          <input v-model="form.style" class="studio-field" placeholder="风格，如：科幻 / 史诗 / 克制" />
          <input v-model="form.detailLevel" class="studio-field" placeholder="细节等级，如：标准 / 详尽" />
        </div>
        <button
          type="submit"
          class="rounded-xl bg-gold-400 px-4 py-2 text-sm font-medium text-ink-950"
          :disabled="generating"
        >
          {{ generating ? "生成中…" : "开始生成" }}
        </button>
      </form>

      <p
        v-if="localError"
        class="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300"
      >
        {{ localError }}
      </p>

      <section v-if="preview" class="mt-6 rounded-2xl border border-white/5 bg-ink-900/70 p-4">
        <p class="text-xs uppercase tracking-[0.16em] text-gold-400/80">Preview</p>
        <h3 class="mt-1 font-display text-2xl">{{ preview.location.name }}</h3>
        <p class="mt-2 text-sm text-zinc-400">{{ preview.location.description }}</p>
        <dl class="mt-4 space-y-2 text-sm">
          <div>
            <dt class="text-zinc-500">环境</dt>
            <dd class="text-zinc-200">{{ preview.location.environment || "未提供" }}</dd>
          </div>
          <div>
            <dt class="text-zinc-500">氛围</dt>
            <dd class="text-zinc-200">{{ preview.location.atmosphere || "未提供" }}</dd>
          </div>
          <div>
            <dt class="text-zinc-500">视觉风格</dt>
            <dd class="text-zinc-200">{{ preview.location.visualStyle || "未提供" }}</dd>
          </div>
        </dl>
        <div v-if="preview.location.tags.length" class="mt-3 flex flex-wrap gap-1">
          <span
            v-for="tag in preview.location.tags"
            :key="tag"
            class="rounded-full border border-white/10 px-2 py-0.5 text-[11px] text-zinc-400"
          >
            {{ tag }}
          </span>
        </div>
        <div class="mt-4 flex gap-2">
          <button
            type="button"
            class="rounded-xl border border-white/10 px-3 py-1.5 text-sm"
            :disabled="generating"
            @click="onGenerate"
          >
            重新生成
          </button>
          <button
            type="button"
            class="rounded-xl bg-gold-400 px-3 py-1.5 text-sm font-medium text-ink-950"
            :disabled="applying || !taskId"
            @click="onApply"
          >
            {{ applying ? "应用中…" : "应用" }}
          </button>
        </div>
      </section>
    </AppModal>
  </div>
</template>

<script setup lang="ts">
import type { GenerationTask, LocationGenerationInput, LocationGenerationResult } from "@ai-drama-studio/types";
import { computed, reactive, ref } from "vue";
import { GenerationTaskStatus } from "@ai-drama-studio/types";

const props = defineProps<{
  projectId: string;
}>();

const emit = defineEmits<{
  applied: [];
}>();

const { $api } = useNuxtApp();
const open = ref(false);
const generating = ref(false);
const applying = ref(false);
const taskId = ref<string | null>(null);
const localError = ref<string | null>(null);
const preview = ref<LocationGenerationResult | null>(null);
const form = reactive<LocationGenerationInput>({
  prompt: "",
  style: "科幻",
  detailLevel: "标准",
});

const canGenerate = computed(() => Boolean(form.prompt.trim()));

function asPreview(task: GenerationTask): LocationGenerationResult | null {
  const output = task.output;
  if (!output || typeof output !== "object") return null;
  const value = output as unknown as LocationGenerationResult;
  return value.location?.name ? value : null;
}

async function onGenerate() {
  if (!canGenerate.value) return;
  generating.value = true;
  localError.value = null;
  preview.value = null;
  taskId.value = null;
  try {
    const task = await $api.createLocationGeneration(props.projectId, {
      prompt: form.prompt.trim(),
      style: form.style?.trim() || undefined,
      detailLevel: form.detailLevel?.trim() || undefined,
    });
    taskId.value = task.id;
    if (task.status !== GenerationTaskStatus.SUCCEEDED) {
      localError.value = task.error || "AI 生成失败";
      return;
    }
    preview.value = asPreview(task);
    if (!preview.value) {
      localError.value = "生成结果无法预览";
    }
  } catch (error) {
    localError.value = error instanceof Error ? error.message : "AI 生成失败";
  } finally {
    generating.value = false;
  }
}

async function onApply() {
  if (!taskId.value) return;
  applying.value = true;
  localError.value = null;
  try {
    await $api.applyGeneration(props.projectId, taskId.value);
    emit("applied");
    open.value = false;
  } catch (error) {
    localError.value = error instanceof Error ? error.message : "应用失败";
  } finally {
    applying.value = false;
  }
}
</script>
