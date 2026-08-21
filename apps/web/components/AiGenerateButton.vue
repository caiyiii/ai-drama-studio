<template>
  <button
    type="button"
    class="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40"
    :class="variantClass"
    :disabled="disabled || loading"
    @click="$emit('click')"
  >
    <span v-if="loading" class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent" />
    <span>{{ displayLabel }}</span>
  </button>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    label: string;
    loading?: boolean;
    disabled?: boolean;
    progressText?: string | null;
    variant?: "primary" | "secondary";
  }>(),
  {
    loading: false,
    disabled: false,
    progressText: null,
    variant: "primary",
  },
);

defineEmits<{ click: [] }>();

const displayLabel = computed(() => {
  if (props.loading && props.progressText) return props.progressText;
  if (props.loading) return "生成中…";
  return props.label;
});

const variantClass = computed(() =>
  props.variant === "secondary"
    ? "border border-white/10 bg-transparent text-zinc-100 hover:bg-white/5"
    : "bg-gold-400 text-ink-950 hover:bg-gold-300",
);
</script>
