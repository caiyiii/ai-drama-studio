import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "../..");

export default defineConfig({
  plugins: [vue()],
  envDir: rootDir,
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
  },
});
