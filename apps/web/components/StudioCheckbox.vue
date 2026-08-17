<script setup lang="ts">
const props = defineProps<{
  modelValue: boolean;
  label: string;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
}>();

function toggle() {
  emit("update:modelValue", !props.modelValue);
}
</script>

<template>
  <button
    type="button"
    class="flex items-center gap-3 text-sm text-zinc-300"
    role="checkbox"
    :aria-checked="modelValue"
    @click="toggle"
  >
    <span
      class="flex h-5 w-5 items-center justify-center rounded-md border transition"
      :class="
        modelValue
          ? 'border-gold-400 bg-gold-400 text-ink-950'
          : 'border-white/20 bg-ink-900'
      "
    >
      <span v-if="modelValue" class="text-[11px] font-bold">✓</span>
    </span>
    <span>{{ label }}</span>
  </button>
</template>
