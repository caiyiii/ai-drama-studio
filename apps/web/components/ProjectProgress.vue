<template>
  <div class="space-y-2">
    <div class="flex items-center justify-between text-xs text-zinc-500">
      <span>{{ label }}</span>
      <span class="text-gold-400">{{ percent }}%</span>
    </div>
    <div class="h-1.5 overflow-hidden rounded-full bg-white/10">
      <div
        class="h-full rounded-full bg-gold-400 transition-all"
        :style="{ width: `${percent}%` }"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    percent: number;
    label?: string;
  }>(),
  {
    label: "制作进度",
  },
);
</script>
