export default defineNuxtConfig({
  compatibilityDate: "2024-11-01",
  devtools: { enabled: false },
  srcDir: ".",
  modules: ["@nuxtjs/tailwindcss", "@pinia/nuxt", "@vueuse/nuxt"],
  css: ["~/assets/css/main.css"],
  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || "http://localhost:3001",
    },
  },
  app: {
    head: {
      title: "AI Drama Studio",
      htmlAttrs: { lang: "zh-CN" },
      meta: [
        {
          name: "description",
          content: "多端 AI 漫剧创作平台",
        },
      ],
      link: [
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        {
          rel: "preconnect",
          href: "https://fonts.gstatic.com",
          crossorigin: "",
        },
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Outfit:wght@300;400;500;600&display=swap",
        },
      ],
    },
  },
  build: {
    transpile: [
      "@ai-drama-studio/api-client",
      "@ai-drama-studio/core",
      "@ai-drama-studio/types",
      "@ai-drama-studio/utils",
      "@ai-drama-studio/config",
    ],
  },
  typescript: {
    strict: true,
    typeCheck: false,
  },
});
