<template>
  <WorkspacePlaceholder
    eyebrow="Images"
    title="图片"
    description="角色、场景与关键帧图像将统一经由后端生成任务处理。"
    :step="ProjectStep.IMAGES"
  />
</template>

<script setup lang="ts">
import { ProjectStep } from "@ai-drama-studio/types";
</script>
