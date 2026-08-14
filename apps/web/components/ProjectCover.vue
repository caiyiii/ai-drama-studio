<template>
  <div
    class="relative overflow-hidden bg-ink-800"
    :class="compact ? 'h-28' : 'h-40 tablet:h-48'"
  >
    <img
      v-if="cover"
      :src="cover"
      :alt="name"
      class="h-full w-full object-cover"
    />
    <div
      v-else
      class="absolute inset-0"
      :style="{ background: placeholder }"
    />
    <div class="absolute inset-0 bg-gradient-to-t from-ink-950/80 via-transparent to-transparent" />
    <p
      v-if="genre"
      class="absolute bottom-3 left-3 text-[11px] uppercase tracking-[0.16em] text-gold-300"
    >
      {{ genre }}
    </p>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  name: string;
  cover?: string | null;
  genre?: string | null;
  compact?: boolean;
}>();

const tones: Record<string, [string, string]> = {
  科幻: ["#10233f", "#d4af37"],
  修仙: ["#1a1430", "#c9a227"],
  赛博朋克: ["#1a0b24", "#e4c56a"],
  都市: ["#16161c", "#d4af37"],
  爱情: ["#2a1520", "#e4c56a"],
  悬疑: ["#12151c", "#c9a227"],
  玄幻: ["#14102a", "#d4af37"],
  其他: ["#18181b", "#c9a227"],
};

const placeholder = computed(() => {
  const [from, to] = tones[props.genre ?? "其他"] ?? tones["其他"];
  return `linear-gradient(135deg, ${from} 0%, ${to} 140%)`;
});
</script>
