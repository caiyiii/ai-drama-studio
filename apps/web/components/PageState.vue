<template>
  <div v-if="loading" class="py-16 text-sm text-zinc-500">{{ loadingText }}</div>
  <div
    v-else-if="error"
    class="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-4 text-sm text-red-300"
  >
    <p>{{ error }}</p>
    <button
      v-if="onRetry"
      type="button"
      class="mt-3 rounded-xl border border-red-500/20 px-3 py-1.5 text-xs text-red-200"
      @click="onRetry"
    >
      重试
    </button>
  </div>
  <div v-else-if="empty" class="py-16 text-center">
    <p class="text-sm text-zinc-400">{{ emptyTitle }}</p>
    <p v-if="emptyDescription" class="mt-2 text-sm text-zinc-600">{{ emptyDescription }}</p>
    <button
      v-if="emptyActionLabel"
      type="button"
      class="mt-6 rounded-xl bg-gold-400 px-4 py-2 text-sm font-medium text-ink-950 hover:bg-gold-300"
      @click="onEmptyAction"
    >
      {{ emptyActionLabel }}
    </button>
  </div>
  <slot v-else />
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    loading?: boolean;
    error?: string | null;
    empty?: boolean;
    loadingText?: string;
    emptyTitle?: string;
    emptyDescription?: string;
    emptyActionLabel?: string;
    onRetry?: () => void;
    onEmptyAction?: () => void;
  }>(),
  {
    loading: false,
    error: null,
    empty: false,
    loadingText: "正在载入…",
    emptyTitle: "暂无内容",
    emptyDescription: "",
    emptyActionLabel: "",
    onRetry: undefined,
    onEmptyAction: undefined,
  },
);
</script>
