<template>
  <WorkspacePlaceholder
    eyebrow="Images"
    title="图片"
    description="尚未配置图片生成 AI。请先在项目设置中为 IMAGE 指定 Image Provider。"
    :step="ProjectStep.IMAGES"
  />
</template>

<script setup lang="ts">
import { ProjectStep } from "@ai-drama-studio/types";
</script>
