<template>
  <span
    class="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] tracking-wide"
    :class="tone"
  >
    {{ label }}
  </span>
</template>

<script setup lang="ts">
import { getProjectStatusLabel } from "@ai-drama-studio/core";
import { ProjectStatus } from "@ai-drama-studio/types";

const props = defineProps<{
  status: ProjectStatus;
}>();

const label = computed(() => getProjectStatusLabel(props.status));

const tone = computed(() => {
  if (props.status === ProjectStatus.COMPLETED) {
    return "border-emerald-400/30 bg-emerald-400/10 text-emerald-300";
  }
  if (props.status === ProjectStatus.IN_PROGRESS) {
    return "border-gold-400/30 bg-gold-400/10 text-gold-300";
  }
  if (props.status === ProjectStatus.ARCHIVED) {
    return "border-zinc-500/30 bg-zinc-500/10 text-zinc-400";
  }
  return "border-white/10 bg-white/5 text-zinc-400";
});
</script>
