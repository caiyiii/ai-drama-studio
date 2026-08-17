<template>
  <form class="space-y-4" @submit.prevent="onSubmit">
    <label class="block">
      <span class="text-xs uppercase tracking-[0.16em] text-zinc-500">漫剧名称</span>
      <input
        v-model="name"
        required
        maxlength="120"
        class="mt-2 w-full rounded-xl border border-white/10 bg-ink-900 px-4 py-3 text-sm outline-none ring-gold-400/40 placeholder:text-zinc-600 focus:ring-2"
        placeholder="一部尚未开拍的漫剧"
      />
    </label>
    <label class="block">
      <span class="text-xs uppercase tracking-[0.16em] text-zinc-500">简介</span>
      <textarea
        v-model="description"
        rows="4"
        maxlength="2000"
        class="mt-2 w-full resize-none rounded-xl border border-white/10 bg-ink-900 px-4 py-3 text-sm outline-none ring-gold-400/40 placeholder:text-zinc-600 focus:ring-2"
        placeholder="世界观、基调、或一句话故事"
      />
    </label>
    <label class="block">
      <span class="text-xs uppercase tracking-[0.16em] text-zinc-500">类型</span>
      <StudioSelect v-model="genre" class="mt-2" :options="genreOptions" />
    </label>
    <p v-if="error" class="text-sm text-red-300">{{ error }}</p>
    <div class="flex justify-end gap-3">
      <button
        type="button"
        class="rounded-xl px-4 py-2 text-sm text-zinc-400 hover:text-zinc-100"
        @click="$emit('cancel')"
      >
        取消
      </button>
      <button
        type="submit"
        :disabled="saving"
        class="rounded-xl bg-gold-400 px-4 py-2 text-sm font-medium text-ink-950 hover:bg-gold-300 disabled:opacity-60"
      >
        {{ saving ? "提交中…" : submitLabel }}
      </button>
    </div>
  </form>
</template>

<script setup lang="ts">
import { PROJECT_GENRES, type CreateProjectInput } from "@ai-drama-studio/types";

const props = withDefaults(
  defineProps<{
    initialName?: string;
    initialDescription?: string | null;
    initialGenre?: string | null;
    submitLabel?: string;
    saving?: boolean;
    error?: string | null;
  }>(),
  {
    initialName: "",
    initialDescription: "",
    initialGenre: "其他",
    submitLabel: "保存",
    saving: false,
    error: null,
  },
);

const emit = defineEmits<{
  submit: [payload: CreateProjectInput];
  cancel: [];
}>();

const genreOptions = PROJECT_GENRES.map((item) => ({ value: item, label: item }));
const name = ref(props.initialName);
const description = ref(props.initialDescription ?? "");
const genre = ref(props.initialGenre || "其他");

watch(
  () => [props.initialName, props.initialDescription, props.initialGenre] as const,
  ([nextName, nextDescription, nextGenre]) => {
    name.value = nextName;
    description.value = nextDescription ?? "";
    genre.value = nextGenre || "其他";
  },
);

function onSubmit() {
  emit("submit", {
    name: name.value.trim(),
    description: description.value.trim() || undefined,
    genre: genre.value,
  });
}
</script>
