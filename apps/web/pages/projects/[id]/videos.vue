<template>
  <WorkspacePlaceholder
    eyebrow="Videos"
    title="视频"
    description="镜头与成片生成将通过 GenerationTask 接入，客户端不直连 Provider。"
    :step="ProjectStep.VIDEOS"
  />
</template>

<script setup lang="ts">
import { ProjectStep } from "@ai-drama-studio/types";
</script>
