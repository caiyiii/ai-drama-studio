import type { ApiClient } from "@ai-drama-studio/api-client";

declare module "#app" {
  interface NuxtApp {
    $api: ApiClient;
  }
}

declare module "vue" {
  interface ComponentCustomProperties {
    $api: ApiClient;
  }
}

export {};
