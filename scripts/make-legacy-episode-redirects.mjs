import fs from "node:fs";
import path from "node:path";

const dir =
  "d:/myProject/ai-drama-studio/apps/web/pages/projects/[id]/episodes/[episodeId]";

const modules = ["plan", "script", "storyboard", "assets", "timeline", "render", "overview"];

for (const moduleName of modules) {
  const filePath = path.join(dir, `${moduleName}.vue`);
  const content = `<template>
  <section class="px-4 py-6 tablet:px-8 desktop:px-8">
    <PageState
      :loading="loading"
      :error="error"
      loading-text="正在进入本集制作…"
      :on-retry="redirectIfNeeded"
    />
  </section>
</template>

<script setup lang="ts">
import { useEpisodeCanonicalRedirect } from "~/composables/useEpisodeCanonicalRedirect";

const { loading, error, redirectIfNeeded } = useEpisodeCanonicalRedirect("${moduleName === "overview" ? "workspace" : moduleName}");
</script>
`;
  fs.writeFileSync(filePath, content);
  console.log("redirect", moduleName);
}
