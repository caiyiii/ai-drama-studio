<template>
  <WorkspacePlaceholder
    eyebrow="Render"
    title="成片"
    description="合成影像、配音与字幕，输出最终漫剧。"
    :step="ProjectStep.RENDER"
  />
</template>

<script setup lang="ts">
import { ProjectStep } from "@ai-drama-studio/types";
</script>
