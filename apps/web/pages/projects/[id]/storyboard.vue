<script setup lang="ts">
import { resolveLegacyProductionRedirect } from "@ai-drama-studio/core";

const route = useRoute();
const projectId = String(route.params.id || "");

await navigateTo(
  resolveLegacyProductionRedirect(projectId, "storyboard") || `/projects/${projectId}/episodes`,
  { replace: true },
);
</script>
