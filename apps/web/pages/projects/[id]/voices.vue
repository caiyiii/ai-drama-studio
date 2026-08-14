<template>
  <WorkspacePlaceholder
    eyebrow="Voices"
    title="配音"
    description="对白与旁白的 TTS 将在后续由后端任务系统调度。"
    :step="ProjectStep.VOICES"
  />
</template>

<script setup lang="ts">
import { ProjectStep } from "@ai-drama-studio/types";
</script>
