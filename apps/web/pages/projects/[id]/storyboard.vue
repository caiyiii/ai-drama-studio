<template>
  <WorkspacePlaceholder
    eyebrow="Storyboard"
    title="分镜"
    description="将在后续阶段开放。本阶段不实现分镜。"
    :step="ProjectStep.STORYBOARD"
  />
</template>

<script setup lang="ts">
import { ProjectStep } from "@ai-drama-studio/types";
</script>
