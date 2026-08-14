<template>
  <nav class="flex gap-2 overflow-x-auto pb-1 desktop:flex-col desktop:overflow-visible">
    <button
      v-for="item in items"
      :key="item.key"
      type="button"
      class="shrink-0 rounded-lg px-3 py-2 text-sm transition"
      :class="current === item.key ? 'bg-white/5 text-gold-300' : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-100'"
      @click="$emit('select', item.key)"
    >
      {{ item.label }}
    </button>
  </nav>
</template>

<script setup lang="ts">
import { getWorldNav } from "@ai-drama-studio/core";

defineProps<{
  current: string;
}>();

defineEmits<{
  select: [key: string];
}>();

const items = getWorldNav();
</script>
