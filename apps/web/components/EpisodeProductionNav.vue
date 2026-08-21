<template>
  <nav class="space-y-2" aria-label="本集制作导航">
    <div class="flex flex-wrap gap-2 text-sm">
      <NuxtLink
        v-for="item in items"
        :key="item.id"
        :to="item.to"
        class="rounded-xl border px-3 py-1.5"
        :class="item.id === current || (current === 'assets' && (item.id === 'visual' || item.id === 'audio') && focusMatch(item.id))
          ? 'border-gold-400/30 text-gold-300'
          : 'border-white/10'"
      >
        {{ item.label }}
      </NuxtLink>
    </div>
    <p class="text-xs text-zinc-600">
      <NuxtLink :to="timelineTo" class="hover:text-zinc-400">高级时间线</NuxtLink>
    </p>
  </nav>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "#imports";
import { episodeModulePath } from "~/composables/useEpisodeProduction";
import { userStepPath } from "~/composables/useProductionUx";

const props = defineProps<{
  projectId: string;
  episodeId: string;
  seasonId?: string | null;
  current:
    | "workspace"
    | "plan"
    | "script"
    | "storyboard"
    | "assets"
    | "timeline"
    | "render"
    | "visual"
    | "audio"
    | "outline";
}>();

const route = useRoute();
const focus = computed(() => String(route.query.focus || ""));

const items = computed(() => [
  {
    id: "outline" as const,
    label: "大纲",
    to: userStepPath(props.projectId, props.episodeId, "outline", props.seasonId),
  },
  {
    id: "script" as const,
    label: "剧本",
    to: userStepPath(props.projectId, props.episodeId, "script", props.seasonId),
  },
  {
    id: "storyboard" as const,
    label: "分镜",
    to: userStepPath(props.projectId, props.episodeId, "storyboard", props.seasonId),
  },
  {
    id: "visual" as const,
    label: "画面",
    to: userStepPath(props.projectId, props.episodeId, "visual", props.seasonId),
  },
  {
    id: "audio" as const,
    label: "配音",
    to: userStepPath(props.projectId, props.episodeId, "audio", props.seasonId),
  },
  {
    id: "render" as const,
    label: "成片",
    to: userStepPath(props.projectId, props.episodeId, "render", props.seasonId),
  },
]);

const timelineTo = computed(() =>
  episodeModulePath(props.projectId, props.episodeId, "timeline", props.seasonId),
);

function focusMatch(id: string) {
  if (id === "visual") return focus.value === "visual" || !focus.value;
  if (id === "audio") return focus.value === "audio";
  return false;
}
</script>
