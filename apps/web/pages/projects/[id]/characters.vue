<template>
  <WorkspacePlaceholder
    eyebrow="Characters"
    title="人物"
    description="建立角色档案、关系与外形设定。"
    :step="ProjectStep.CHARACTERS"
  />
</template>

<script setup lang="ts">
import { ProjectStep } from "@ai-drama-studio/types";
</script>
