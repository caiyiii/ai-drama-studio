<template>
  <nav class="flex flex-wrap gap-2 text-sm" aria-label="本集制作导航">
    <NuxtLink
      v-for="item in items"
      :key="item.id"
      :to="item.to"
      class="rounded-xl border px-3 py-1.5"
      :class="item.id === current ? 'border-gold-400/30 text-gold-300' : 'border-white/10'"
    >
      {{ item.label }}
    </NuxtLink>
  </nav>
</template>

<script setup lang="ts">
import { episodeModulePath } from "~/composables/useEpisodeProduction";

const props = defineProps<{
  projectId: string;
  episodeId: string;
  seasonId?: string | null;
  current: "workspace" | "plan" | "script" | "storyboard" | "assets" | "timeline" | "render";
}>();

const items = computed(() => [
  { id: "workspace" as const, label: "概览", to: episodeModulePath(props.projectId, props.episodeId, "workspace", props.seasonId) },
  { id: "plan" as const, label: "剧集规划", to: episodeModulePath(props.projectId, props.episodeId, "plan", props.seasonId) },
  { id: "script" as const, label: "剧本", to: episodeModulePath(props.projectId, props.episodeId, "script", props.seasonId) },
  { id: "storyboard" as const, label: "分镜", to: episodeModulePath(props.projectId, props.episodeId, "storyboard", props.seasonId) },
  { id: "assets" as const, label: "素材", to: episodeModulePath(props.projectId, props.episodeId, "assets", props.seasonId) },
  { id: "timeline" as const, label: "时间线", to: episodeModulePath(props.projectId, props.episodeId, "timeline", props.seasonId) },
  { id: "render" as const, label: "成片", to: episodeModulePath(props.projectId, props.episodeId, "render", props.seasonId) },
]);
</script>
