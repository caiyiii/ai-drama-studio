import eslint from "@eslint/js";
import globals from "globals";
import pluginVue from "eslint-plugin-vue";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.nuxt/**",
      "**/.output/**",
      "**/.turbo/**",
      "**/src-tauri/target/**",
      "**/src-tauri/gen/**",
      "apps/mobile/android/**",
      "apps/mobile/ios/**",
      "eslint.config.mjs",
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs["flat/recommended"],
  {
    files: ["**/*.vue"],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
        extraFileExtensions: [".vue"],
      },
    },
  },
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        computed: "readonly",
        ref: "readonly",
        reactive: "readonly",
        watch: "readonly",
        onMounted: "readonly",
        useRoute: "readonly",
        useRouter: "readonly",
        navigateTo: "readonly",
        useRuntimeConfig: "readonly",
        useNuxtApp: "readonly",
        defineNuxtConfig: "readonly",
        defineNuxtPlugin: "readonly",
        defineStore: "readonly",
        useProjectStore: "readonly",
        useCurrentProject: "readonly",
        useWorldStore: "readonly",
        useAiProviderStore: "readonly",
        useViewport: "readonly",
        nextTick: "readonly",
        onUnmounted: "readonly",
        useWorkspaceBreadcrumbs: "readonly",
        definePageMeta: "readonly",
      },
    },
    rules: {
      "vue/multi-word-component-names": "off",
      "vue/max-attributes-per-line": "off",
      "vue/singleline-html-element-content-newline": "off",
      "vue/html-self-closing": "off",
      "vue/html-indent": "off",
      "vue/html-closing-bracket-newline": "off",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-empty-object-type": "off",
    },
  },
  {
    files: ["apps/mobile/**/*.{vue,ts}"],
    rules: {
      "vue/no-deprecated-slot-attribute": "off",
      "vue/v-on-event-hyphenation": "off",
    },
  },
);
