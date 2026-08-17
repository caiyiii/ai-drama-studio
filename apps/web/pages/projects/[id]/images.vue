<template>
  <WorkspacePlaceholder
    eyebrow="Images"
    title="图片"
    description="将在后续阶段开放。本阶段不实现图片生成。"
    :step="ProjectStep.IMAGES"
  />
</template>

<script setup lang="ts">
import { ProjectStep } from "@ai-drama-studio/types";
</script>
