<template>
  <WorkspacePlaceholder
    eyebrow="Voices"
    title="配音"
    description="尚未配置语音生成 AI。TTS / VOICE_CLONE 请在项目设置中配置对应 Provider。"
    :step="ProjectStep.VOICES"
  />
</template>

<script setup lang="ts">
import { ProjectStep } from "@ai-drama-studio/types";
</script>
