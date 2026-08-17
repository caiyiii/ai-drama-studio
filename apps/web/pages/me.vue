<template>
  <section class="mx-auto max-w-xl px-4 py-10">
    <p class="text-[11px] uppercase tracking-[0.2em] text-gold-400/80">Account</p>
    <h1 class="mt-2 font-display text-4xl">我的</h1>
    <p class="mt-3 text-sm leading-6 text-zinc-500">
      当前阶段不实现登录、注册与订阅。本地创作默认绑定 studio@local 用户。
    </p>
    <NuxtLink
      to="/ai-providers"
      class="mt-8 inline-flex rounded-xl border border-white/10 px-4 py-2 text-sm text-zinc-300 hover:border-gold-400/40"
    >
      AI 配置
    </NuxtLink>
  </section>
</template>
