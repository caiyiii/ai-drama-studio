<template>
  <section class="rounded-3xl border border-white/5 bg-ink-900/70 p-5">
    <p class="text-[11px] uppercase tracking-[0.2em] text-gold-400/80">现在做什么</p>
    <p class="mt-2 text-sm text-zinc-500">当前：{{ currentStepLabel }}</p>
    <h2 class="mt-1 font-display text-2xl">{{ ui.label }}</h2>
    <p class="mt-2 text-sm text-zinc-400">{{ ui.description }}</p>
    <p v-if="ui.reason" class="mt-2 text-sm text-amber-200">{{ ui.reason }}</p>
    <p v-if="detail" class="mt-2 text-sm text-zinc-300">{{ detail }}</p>

    <div
      v-if="blocker"
      class="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
    >
      <p>{{ blocker.message }}</p>
      <NuxtLink v-if="blocker.to" :to="blocker.to" class="mt-2 inline-block text-gold-300">
        {{ blocker.actionLabel }}
      </NuxtLink>
    </div>

    <div class="mt-4 flex flex-wrap gap-2">
      <AiGenerateButton
        v-if="mode === 'link'"
        :label="ui.label"
        :disabled="Boolean(blocker)"
        @click="onPrimaryLink"
      />
      <AiGenerateButton
        v-else
        :label="ui.label"
        :loading="loading"
        :disabled="disabled || Boolean(blocker)"
        :progress-text="progressText"
        @click="$emit('primary')"
      />
      <NuxtLink
        v-if="secondary"
        :to="secondary.to"
        class="rounded-xl border border-white/10 px-4 py-2 text-sm"
      >
        {{ secondary.label }}
      </NuxtLink>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { EpisodeNextAction } from "@ai-drama-studio/types";
import { computed } from "vue";
import { navigateTo } from "#imports";
import { mapNextActionToUi } from "~/composables/useProductionUx";

const props = withDefaults(
  defineProps<{
    action: EpisodeNextAction;
    currentStepLabel: string;
    detail?: string | null;
    primaryTo?: string | null;
    mode?: "link" | "action";
    loading?: boolean;
    disabled?: boolean;
    progressText?: string | null;
    secondary?: { label: string; to: string } | null;
    blocker?: { message: string; to?: string; actionLabel?: string } | null;
  }>(),
  {
    detail: null,
    primaryTo: null,
    mode: "link",
    loading: false,
    disabled: false,
    progressText: null,
    secondary: null,
    blocker: null,
  },
);

defineEmits<{ primary: [] }>();

const ui = computed(() => mapNextActionToUi(props.action));

function onPrimaryLink() {
  if (props.blocker || !props.primaryTo) return;
  void navigateTo(props.primaryTo);
}
</script>
