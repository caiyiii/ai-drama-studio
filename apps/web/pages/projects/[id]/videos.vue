<template>
  <WorkspacePlaceholder
    eyebrow="Videos"
    title="视频"
    description="尚未配置视频生成 AI。VIDEO / IMAGE_TO_VIDEO 请在项目设置中配置对应 Provider。"
    :step="ProjectStep.VIDEOS"
  />
</template>

<script setup lang="ts">
import { ProjectStep } from "@ai-drama-studio/types";
</script>
