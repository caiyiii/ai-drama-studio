<template>
  <section class="relative overflow-hidden">
    <div class="pointer-events-none absolute inset-0 film-grain opacity-40" />
    <div class="mx-auto max-w-5xl px-4 py-10 tablet:px-8 tablet:py-16 desktop:px-10 desktop:py-20">
      <p class="text-[11px] uppercase tracking-[0.28em] text-gold-400">Cinematic Creation</p>
      <h1 class="mt-4 max-w-3xl font-display text-5xl leading-tight text-zinc-50 tablet:text-6xl desktop:text-7xl">
        用一条工作流，<br />完成一部 AI 漫剧。
      </h1>
      <p class="mt-6 max-w-xl text-sm leading-7 text-zinc-400 tablet:text-base">
        从世界观、人物、场景到分镜、画面、配音与成片。Web 是主生产端，Mobile 与 Desktop 共用同一套创作数据。
      </p>
      <div class="mt-8 flex flex-col gap-3 tablet:flex-row">
        <NuxtLink
          to="/projects"
          class="rounded-xl bg-gold-400 px-5 py-3 text-center text-sm font-medium text-ink-950 hover:bg-gold-300"
        >
          进入项目
        </NuxtLink>
        <NuxtLink
          to="/projects"
          class="rounded-xl border border-white/10 px-5 py-3 text-center text-sm text-zinc-300 hover:border-gold-400/40"
        >
          查看工作台
        </NuxtLink>
      </div>

      <ol class="mt-14 grid gap-3 tablet:grid-cols-2 desktop:grid-cols-3">
        <li
          v-for="step in steps"
          :key="step"
          class="rounded-2xl border border-white/5 bg-ink-800/50 px-4 py-4 text-sm text-zinc-400"
        >
          {{ step }}
        </li>
      </ol>
    </div>
  </section>
</template>

<script setup lang="ts">
const steps = [
  "Project",
  "World",
  "Characters",
  "Locations",
  "Episodes",
  "Script",
  "Storyboard",
  "Images",
  "Videos",
  "Voices",
  "Render",
];
</script>
