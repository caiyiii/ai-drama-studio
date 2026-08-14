import type { CreateProjectInput, Project, UpdateProjectInput } from "@ai-drama-studio/types";

export const useProjectStore = defineStore("project", () => {
  const { $api } = useNuxtApp();
  const projects = ref<Project[]>([]);
  const current = ref<Project | null>(null);
  const loading = ref(false);
  const saving = ref(false);
  const error = ref<string | null>(null);

  async function fetchProjects() {
    loading.value = true;
    error.value = null;
    try {
      projects.value = await $api.getProjects();
    } catch (err) {
      error.value = err instanceof Error ? err.message : "加载项目失败";
    } finally {
      loading.value = false;
    }
  }

  async function fetchProject(id: string) {
    loading.value = true;
    error.value = null;
    try {
      current.value = await $api.getProject(id);
      return current.value;
    } catch (err) {
      current.value = null;
      error.value = err instanceof Error ? err.message : "加载项目失败";
      return null;
    } finally {
      loading.value = false;
    }
  }

  async function createProject(input: CreateProjectInput) {
    saving.value = true;
    error.value = null;
    try {
      const project = await $api.createProject(input);
      projects.value = [project, ...projects.value];
      current.value = project;
      return project;
    } catch (err) {
      error.value = err instanceof Error ? err.message : "创建项目失败";
      return null;
    } finally {
      saving.value = false;
    }
  }

  async function updateProject(id: string, input: UpdateProjectInput) {
    saving.value = true;
    error.value = null;
    try {
      const project = await $api.updateProject(id, input);
      projects.value = projects.value.map((item) => (item.id === id ? project : item));
      if (current.value?.id === id) {
        current.value = project;
      }
      return project;
    } catch (err) {
      error.value = err instanceof Error ? err.message : "更新项目失败";
      return null;
    } finally {
      saving.value = false;
    }
  }

  async function deleteProject(id: string) {
    saving.value = true;
    error.value = null;
    try {
      await $api.deleteProject(id);
      projects.value = projects.value.filter((item) => item.id !== id);
      if (current.value?.id === id) {
        current.value = null;
      }
      return true;
    } catch (err) {
      error.value = err instanceof Error ? err.message : "删除项目失败";
      return false;
    } finally {
      saving.value = false;
    }
  }

  return {
    projects,
    current,
    loading,
    saving,
    error,
    fetchProjects,
    fetchProject,
    createProject,
    updateProject,
    deleteProject,
  };
});
