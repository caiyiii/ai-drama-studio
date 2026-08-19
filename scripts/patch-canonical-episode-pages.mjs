import fs from "node:fs";
import path from "node:path";

const dir =
  "d:/myProject/ai-drama-studio/apps/web/pages/projects/[id]/seasons/[seasonId]/episodes/[episodeId]";

for (const file of fs.readdirSync(dir).filter((name) => name.endsWith(".vue"))) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, "utf8");

  if (!content.includes("useEpisodeProductionPaths")) {
    content = content.replace(
      'import { useEpisodeWorkspaceContext } from "~/composables/useEpisodeWorkspaceContext";',
      'import { useEpisodeProductionPaths } from "~/composables/useEpisodeProduction";\nimport { useEpisodeWorkspaceContext } from "~/composables/useEpisodeWorkspaceContext";',
    );
    content = content.replace(
      "const route = useRoute();",
      "const route = useRoute();\nconst { pathFor } = useEpisodeProductionPaths();",
    );
  }

  content = content.replace(
    /:to="`\/projects\/\$\{projectId\}\/episodes\/\$\{episodeId\}`"/g,
    ':to="pathFor(\'workspace\')"',
  );
  content = content.replace(
    /:to="`\/projects\/\$\{projectId\.value\}\/episodes\/\$\{episodeId\.value\}`"/g,
    ':to="pathFor(\'workspace\')"',
  );
  content = content.replace(
    /:to="`\/projects\/\$\{projectId\}\/episodes\/\$\{episodeId\}\/(\w+)`"/g,
    ":to=\"pathFor('$1')\"",
  );
  content = content.replace(
    /:to="`\/projects\/\$\{projectId\.value\}\/episodes\/\$\{episodeId\.value\}\/(\w+)`"/g,
    ":to=\"pathFor('$1')\"",
  );
  content = content.replace(
    /:to="workspacePath"/g,
    ':to="pathFor(\'workspace\')"',
  );
  content = content.replace(
    /:to="workspacePath\(episodeId\)"/g,
    ':to="pathFor(\'workspace\')"',
  );
  content = content.replace(
    /to: `\/projects\/\$\{projectId\.value\}\/episodes\/\$\{episodeId\.value\}`/g,
    "to: pathFor('workspace')",
  );
  content = content.replace(
    /to: `\/projects\/\$\{projectId\.value\}\/episodes\/\$\{episodeId\.value\}\/(\w+)`/g,
    "to: pathFor('$1')",
  );
  content = content.replace(
    /return `\/projects\/\$\{projectId\.value\}\/episodes\/\$\{episodeId\.value\}\/(\w+)`;/g,
    "return pathFor('$1');",
  );
  content = content.replace(
    /void navigateTo\(`\/projects\/\$\{projectId\.value\}\/episodes\/\$\{episodeId\.value\}\/(\w+)`\);/g,
    "void navigateTo(pathFor('$1'));",
  );
  content = content.replace(
    /<EpisodeProductionNav(\s+:project-id="projectId"\s+:episode-id="episodeId")/g,
    '<EpisodeProductionNav$1\n          :season-id="seasonId"',
  );

  if (!content.includes("const workspacePath = computed")) {
    content = content.replace(
      /const workspacePath = computed\(\(\) =>[\s\S]*?\);/g,
      "",
    );
  }

  fs.writeFileSync(filePath, content);
  console.log("patched", file);
}
