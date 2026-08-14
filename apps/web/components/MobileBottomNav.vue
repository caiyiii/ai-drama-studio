<template>
  <nav
    class="fixed inset-x-0 bottom-0 z-30 grid h-[64px] grid-cols-5 border-t border-white/5 bg-ink-950/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
  >
    <NuxtLink
      v-for="item in items"
      :key="item.to"
      :to="item.to"
      class="flex flex-col items-center justify-center gap-1 text-[11px] text-zinc-500"
      active-class="text-gold-400"
    >
      <span>{{ item.label }}</span>
    </NuxtLink>
  </nav>
</template>

<script setup lang="ts">
const items = [
  { label: "首页", to: "/" },
  { label: "项目", to: "/projects" },
  { label: "任务", to: "/tasks" },
  { label: "素材", to: "/library" },
  { label: "我的", to: "/me" },
];
</script>
