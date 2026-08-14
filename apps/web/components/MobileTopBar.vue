<template>
  <header
    class="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-white/5 bg-ink-950/90 px-4 backdrop-blur"
  >
    <div class="flex min-w-0 items-center gap-3">
      <NuxtLink
        v-if="isProjectRoute"
        to="/projects"
        class="text-sm text-zinc-400"
      >
        返回
      </NuxtLink>
      <NuxtLink v-else to="/" class="flex items-center gap-2">
        <BrandMark small />
        <span class="font-display text-lg text-gold-400">AI Drama</span>
      </NuxtLink>
      <p v-if="isProjectRoute" class="truncate font-display text-lg text-zinc-100">
        {{ project?.name ?? "项目" }}
      </p>
    </div>
    <span v-if="!isProjectRoute" class="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
      Studio
    </span>
  </header>
</template>

<script setup lang="ts">
const { isProjectRoute, project } = useCurrentProject();
</script>
