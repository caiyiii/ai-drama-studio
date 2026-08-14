<template>
  <label class="block">
    <span class="text-xs uppercase tracking-[0.16em] text-zinc-500">{{ label }}</span>
    <textarea
      v-if="multiline"
      v-model="draft"
      :rows="rows"
      class="mt-2 w-full resize-y rounded-xl border border-white/10 bg-ink-900 px-4 py-3 text-sm outline-none ring-gold-400/40 focus:ring-2"
    />
    <input
      v-else
      v-model="draft"
      class="mt-2 w-full rounded-xl border border-white/10 bg-ink-900 px-4 py-3 text-sm outline-none ring-gold-400/40 focus:ring-2"
    />
    <div class="mt-3 flex justify-end">
      <button
        type="button"
        :disabled="saving || draft === (modelValue ?? '')"
        class="rounded-xl bg-gold-400 px-3 py-1.5 text-sm font-medium text-ink-950 disabled:opacity-40"
        @click="$emit('save', draft)"
      >
        {{ saving ? "保存中…" : "保存" }}
      </button>
    </div>
  </label>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    label: string;
    modelValue: string | null | undefined;
    multiline?: boolean;
    rows?: number;
    saving?: boolean;
  }>(),
  {
    multiline: false,
    rows: 6,
    saving: false,
  },
);

defineEmits<{
  save: [value: string];
}>();

const draft = ref(props.modelValue ?? "");

watch(
  () => props.modelValue,
  (value) => {
    draft.value = value ?? "";
  },
);
</script>
