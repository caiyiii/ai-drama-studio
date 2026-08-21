<template>
  <nav class="space-y-3" aria-label="剧集生产步骤">
    <div class="flex flex-wrap gap-2">
      <NuxtLink
        v-for="item in steps"
        :key="item.id"
        :to="pathFor(item)"
        class="rounded-full border px-3 py-1.5 text-sm transition"
        :class="chipClass(item)"
      >
        {{ item.mark }} {{ item.label }}
      </NuxtLink>
    </div>
    <p class="text-xs text-zinc-500">
      {{ completedCount }} / {{ steps.length }} 阶段完成
      <NuxtLink
        v-if="showAdvancedTimeline"
        :to="timelinePath"
        class="ml-3 text-zinc-500 underline-offset-2 hover:text-zinc-300 hover:underline"
      >
        高级时间线
      </NuxtLink>
    </p>
  </nav>
</template>

<script setup lang="ts">
import type { EpisodeOverview } from "@ai-drama-studio/types";
import { computed } from "vue";
import {
  resolveUserProductionSteps,
  userStepPath,
  type UserStepItem,
} from "~/composables/useProductionUx";
import { episodeModulePath } from "~/composables/useEpisodeProduction";

const props = withDefaults(
  defineProps<{
    overview: EpisodeOverview;
    projectId: string;
    episodeId: string;
    seasonId?: string | null;
    current?: UserStepItem["id"] | "workspace";
    showAdvancedTimeline?: boolean;
  }>(),
  {
    seasonId: null,
    current: "workspace",
    showAdvancedTimeline: true,
  },
);

const steps = computed(() => resolveUserProductionSteps(props.overview));
const completedCount = computed(
  () => steps.value.filter((s) => s.state === "COMPLETED" || s.state === "LOCKED").length,
);
const timelinePath = computed(() =>
  episodeModulePath(props.projectId, props.episodeId, "timeline", props.seasonId),
);

function pathFor(item: UserStepItem) {
  return userStepPath(props.projectId, props.episodeId, item.id, props.seasonId);
}

function chipClass(item: UserStepItem) {
  const active =
    props.current === item.id ||
    (props.current === "workspace" && item.state === "IN_PROGRESS");
  if (active) return "border-gold-400/40 bg-gold-400/10 text-gold-300";
  if (item.state === "COMPLETED" || item.state === "LOCKED") {
    return "border-emerald-500/30 text-emerald-300";
  }
  if (item.state === "BLOCKED" || item.state === "STALE") {
    return "border-amber-500/30 text-amber-200";
  }
  if (item.state === "IN_PROGRESS" || item.state === "READY") {
    return "border-gold-400/25 text-gold-200";
  }
  return "border-white/10 text-zinc-500";
}
</script>
