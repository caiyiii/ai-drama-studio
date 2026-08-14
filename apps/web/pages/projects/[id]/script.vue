<template>
  <WorkspacePlaceholder
    eyebrow="Script"
    title="剧本"
    description="撰写对白、旁白与场次剧本。"
    :step="ProjectStep.SCRIPT"
  />
</template>

<script setup lang="ts">
import { ProjectStep } from "@ai-drama-studio/types";
</script>
