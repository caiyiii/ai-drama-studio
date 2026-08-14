<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 flex items-end bg-black/70 p-4 tablet:items-center tablet:justify-center"
    @click.self="emit('cancel')"
  >
    <div class="w-full max-w-md rounded-2xl border border-white/10 bg-ink-800 p-6">
      <h2 class="font-display text-2xl text-zinc-100">{{ title }}</h2>
      <p class="mt-3 text-sm leading-6 text-zinc-400">{{ message }}</p>
      <div class="mt-6 flex justify-end gap-3">
        <button
          type="button"
          class="rounded-xl px-4 py-2 text-sm text-zinc-400 hover:text-zinc-100"
          @click="emit('cancel')"
        >
          {{ cancelLabel }}
        </button>
        <button
          type="button"
          class="rounded-xl bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-400"
          @click="emit('confirm')"
        >
          {{ confirmLabel }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    open: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
  }>(),
  {
    confirmLabel: "确认删除",
    cancelLabel: "取消",
  },
);

const emit = defineEmits<{
  confirm: [];
  cancel: [];
}>();
</script>
