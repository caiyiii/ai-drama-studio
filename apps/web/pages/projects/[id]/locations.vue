<template>
  <WorkspacePlaceholder
    eyebrow="Locations"
    title="场景"
    description="管理故事发生的地点与空间氛围。"
    :step="ProjectStep.LOCATIONS"
  />
</template>

<script setup lang="ts">
import { ProjectStep } from "@ai-drama-studio/types";
</script>
