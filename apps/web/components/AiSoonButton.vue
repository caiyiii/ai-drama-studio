<template>
  <button
    type="button"
    class="rounded-xl border border-gold-400/30 px-3 py-1.5 text-sm text-gold-300 hover:bg-gold-400/10"
    @click="open = true"
  >
    AI生成
  </button>
  <div
    v-if="open"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
    @click.self="open = false"
  >
    <div class="w-full max-w-md rounded-2xl border border-white/10 bg-ink-800 p-6">
      <h2 class="font-display text-2xl">AI 生成</h2>
      <p class="mt-3 text-sm leading-6 text-zinc-400">
        AI世界观生成将在下一阶段开放。
      </p>
      <div class="mt-6 flex justify-end">
        <button
          type="button"
          class="rounded-xl bg-gold-400 px-4 py-2 text-sm font-medium text-ink-950"
          @click="open = false"
        >
          知道了
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const open = ref(false);
</script>
