import { createApiClient } from "@ai-drama-studio/api-client";

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig();
  const api = createApiClient(config.public.apiBase);
  return {
    provide: {
      api,
    },
  };
});
