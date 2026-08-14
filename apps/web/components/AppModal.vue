<template>
  <div
    v-if="open"
    class="fixed inset-0 z-40 flex items-end bg-black/70 p-4 tablet:items-center tablet:justify-center"
    @click.self="$emit('close')"
  >
    <div class="w-full max-w-lg rounded-2xl border border-white/10 bg-ink-800 p-6">
      <h2 class="font-display text-2xl">{{ title }}</h2>
      <p class="mt-1 text-sm text-zinc-500">{{ description }}</p>
      <div class="mt-6">
        <slot />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  open: boolean;
  title: string;
  description: string;
}>();

defineEmits<{
  close: [];
}>();
</script>
