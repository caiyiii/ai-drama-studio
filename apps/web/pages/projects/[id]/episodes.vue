<template>
  <WorkspacePlaceholder
    eyebrow="Episodes"
    title="剧集"
    description="拆分剧集结构、场次与叙事节奏。"
    :step="ProjectStep.EPISODES"
  />
</template>

<script setup lang="ts">
import { ProjectStep } from "@ai-drama-studio/types";
</script>
