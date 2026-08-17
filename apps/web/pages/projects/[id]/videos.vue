<template>
  <WorkspacePlaceholder
    eyebrow="Videos"
    title="视频"
    description="将在后续阶段开放。本阶段不实现视频生成。"
    :step="ProjectStep.VIDEOS"
  />
</template>

<script setup lang="ts">
import { ProjectStep } from "@ai-drama-studio/types";
</script>
