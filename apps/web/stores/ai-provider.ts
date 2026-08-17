import { ApiError } from "@ai-drama-studio/api-client";
import type {
  AIProvider,
  AIProviderTestInput,
  AIProviderTestResult,
  AiCapability,
  AiCapabilityDefinition,
  CreateAIProviderInput,
  ProjectAIProvider,
  ProjectAiConfigMap,
  UpdateAIProviderInput,
} from "@ai-drama-studio/types";

export const useAiProviderStore = defineStore("ai-provider", () => {
  const { $api } = useNuxtApp();
  const providers = ref<AIProvider[]>([]);
  const projectConfig = ref<ProjectAIProvider | null>(null);
  const capabilities = ref<AiCapabilityDefinition[]>([]);
  const projectAiConfig = ref<ProjectAiConfigMap | null>(null);
  const loading = ref(false);
  const saving = ref(false);
  const testing = ref(false);
  const error = ref<string | null>(null);
  const testResults = ref<Record<string, AIProviderTestResult>>({});

  async function loadProviders() {
    loading.value = true;
    error.value = null;
    try {
      providers.value = await $api.getAIProviders();
    } catch (err) {
      error.value = err instanceof Error ? err.message : "加载 AI Provider 失败";
    } finally {
      loading.value = false;
    }
  }

  async function createProvider(data: CreateAIProviderInput) {
    saving.value = true;
    error.value = null;
    try {
      const created = await $api.createAIProvider(data);
      providers.value = [created, ...providers.value];
      return created;
    } catch (err) {
      error.value = err instanceof Error ? err.message : "创建 Provider 失败";
      return null;
    } finally {
      saving.value = false;
    }
  }

  async function updateProvider(id: string, data: UpdateAIProviderInput) {
    saving.value = true;
    error.value = null;
    try {
      const updated = await $api.updateAIProvider(id, data);
      providers.value = providers.value.map((item) =>
        item.id === id ? updated : item,
      );
      return updated;
    } catch (err) {
      error.value = err instanceof Error ? err.message : "更新 Provider 失败";
      return null;
    } finally {
      saving.value = false;
    }
  }

  async function deleteProvider(id: string) {
    saving.value = true;
    error.value = null;
    try {
      await $api.deleteAIProvider(id);
      providers.value = providers.value.filter((item) => item.id !== id);
      return true;
    } catch (err) {
      if (err instanceof ApiError && err.code === "PROVIDER_IN_USE") {
        error.value = "该 Provider 正被项目使用，请先更换项目 AI Provider。";
      } else {
        error.value = err instanceof Error ? err.message : "删除 Provider 失败";
      }
      return false;
    } finally {
      saving.value = false;
    }
  }

  async function testProvider(id: string) {
    testing.value = true;
    error.value = null;
    try {
      const result = await $api.testAIProvider(id);
      testResults.value = { ...testResults.value, [id]: result };
      return result;
    } catch (err) {
      const result: AIProviderTestResult = {
        success: false,
        message: err instanceof Error ? err.message : "测试连接失败",
      };
      testResults.value = { ...testResults.value, [id]: result };
      return result;
    } finally {
      testing.value = false;
    }
  }

  async function testProviderConfig(data: AIProviderTestInput) {
    testing.value = true;
    error.value = null;
    try {
      return await $api.testAIProviderConfig(data);
    } catch (err) {
      return {
        success: false,
        message: err instanceof Error ? err.message : "测试连接失败",
      } satisfies AIProviderTestResult;
    } finally {
      testing.value = false;
    }
  }

  async function loadProjectConfig(projectId: string) {
    loading.value = true;
    error.value = null;
    try {
      projectConfig.value = await $api.getProjectAIProvider(projectId);
      return projectConfig.value;
    } catch (err) {
      error.value = err instanceof Error ? err.message : "加载项目 AI 配置失败";
      return null;
    } finally {
      loading.value = false;
    }
  }

  async function setProjectProvider(projectId: string, aiProviderId: string | null) {
    saving.value = true;
    error.value = null;
    try {
      projectConfig.value = await $api.setProjectAIProvider(projectId, aiProviderId);
      return projectConfig.value;
    } catch (err) {
      error.value = err instanceof Error ? err.message : "更新项目 Provider 失败";
      return null;
    } finally {
      saving.value = false;
    }
  }

  async function loadCapabilities() {
    try {
      capabilities.value = await $api.getAiCapabilities();
    } catch (err) {
      error.value = err instanceof Error ? err.message : "加载 AI 能力失败";
    }
  }

  async function loadProjectAiConfig(projectId: string) {
    try {
      projectAiConfig.value = await $api.getProjectAiConfig(projectId);
      return projectAiConfig.value;
    } catch (err) {
      error.value = err instanceof Error ? err.message : "加载项目 AI 能力配置失败";
      return null;
    }
  }

  async function setProjectAiCapability(
    projectId: string,
    capability: AiCapability,
    providerId: string | null,
    modelId?: string | null,
  ) {
    saving.value = true;
    error.value = null;
    try {
      projectAiConfig.value = await $api.setProjectAiConfig(projectId, capability, {
        providerId,
        modelId,
      });
      return projectAiConfig.value;
    } catch (err) {
      error.value = err instanceof Error ? err.message : "更新项目 AI 能力配置失败";
      return null;
    } finally {
      saving.value = false;
    }
  }

  async function clearProjectAiCapability(projectId: string, capability: AiCapability) {
    saving.value = true;
    error.value = null;
    try {
      projectAiConfig.value = await $api.deleteProjectAiConfig(projectId, capability);
      return projectAiConfig.value;
    } catch (err) {
      error.value = err instanceof Error ? err.message : "清除项目 AI 能力配置失败";
      return null;
    } finally {
      saving.value = false;
    }
  }

  return {
    providers,
    projectConfig,
    capabilities,
    projectAiConfig,
    loading,
    saving,
    testing,
    error,
    testResults,
    loadProviders,
    createProvider,
    updateProvider,
    deleteProvider,
    testProvider,
    testProviderConfig,
    loadProjectConfig,
    setProjectProvider,
    loadCapabilities,
    loadProjectAiConfig,
    setProjectAiCapability,
    clearProjectAiCapability,
  };
});
