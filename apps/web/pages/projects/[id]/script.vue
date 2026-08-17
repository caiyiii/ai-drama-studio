<template>
  <WorkspacePlaceholder
    eyebrow="Script"
    title="剧本"
    description="将在后续阶段开放。本阶段不实现剧本生成。"
    :step="ProjectStep.SCRIPT"
  />
</template>

<script setup lang="ts">
import { ProjectStep } from "@ai-drama-studio/types";
</script>
