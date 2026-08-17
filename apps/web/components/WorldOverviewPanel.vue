<template>
  <div class="space-y-6">
    <div>
      <p class="text-[11px] uppercase tracking-[0.2em] text-gold-400/80">Overview</p>
      <h2 class="mt-1 font-display text-3xl">世界概览</h2>
    </div>
    <WorldFieldEditor
      label="世界名称"
      :model-value="world.title"
      :saving="saving"
      @save="(value) => emit('save', { title: value })"
    />
    <WorldFieldEditor
      label="世界简介"
      :model-value="world.summary"
      multiline
      :rows="5"
      :saving="saving"
      @save="(value) => emit('save', { summary: value })"
    />
    <WorldFieldEditor
      label="宇宙背景"
      :model-value="world.cosmicBackground"
      multiline
      :rows="7"
      :saving="saving"
      @save="(value) => emit('save', { cosmicBackground: value })"
    />
    <WorldFieldEditor
      label="核心冲突"
      :model-value="world.coreConflict"
      multiline
      :rows="6"
      :saving="saving"
      @save="(value) => emit('save', { coreConflict: value })"
    />
  </div>
</template>

<script setup lang="ts">
import type { UpdateWorldInput, World } from "@ai-drama-studio/types";

defineProps<{
  world: World;
  saving: boolean;
}>();

const emit = defineEmits<{
  save: [payload: UpdateWorldInput];
}>();
</script>
