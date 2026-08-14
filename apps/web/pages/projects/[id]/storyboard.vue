<template>
  <WorkspacePlaceholder
    eyebrow="Storyboard"
    title="分镜"
    description="将剧本落成分镜序列。"
    :step="ProjectStep.STORYBOARD"
  />
</template>

<script setup lang="ts">
import { ProjectStep } from "@ai-drama-studio/types";
</script>
