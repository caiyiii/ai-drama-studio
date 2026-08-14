<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between gap-3">
      <div>
        <p class="text-[11px] uppercase tracking-[0.2em] text-gold-400/80">{{ eyebrow }}</p>
        <h2 class="mt-1 font-display text-3xl">{{ title }}</h2>
      </div>
      <AiSoonButton />
    </div>
    <WorldFieldEditor
      :label="title"
      :model-value="value"
      multiline
      :rows="12"
      :saving="saving"
      @save="(next) => emit('save', next)"
    />
  </div>
</template>

<script setup lang="ts">
defineProps<{
  eyebrow: string;
  title: string;
  value: string | null | undefined;
  saving: boolean;
}>();

const emit = defineEmits<{
  save: [value: string];
}>();
</script>
