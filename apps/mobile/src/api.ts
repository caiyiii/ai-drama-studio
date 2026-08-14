import { API_DEFAULT_BASE_URL } from "@ai-drama-studio/config";
import { createApiClient } from "@ai-drama-studio/api-client";

export const api = createApiClient(import.meta.env.VITE_API_BASE || API_DEFAULT_BASE_URL);
