import { ref } from "vue";
import type { CreateProjectInput, Project } from "@ai-drama-studio/types";
import { api } from "../api";

const projects = ref<Project[]>([]);
const current = ref<Project | null>(null);
const loading = ref(false);
const saving = ref(false);
const error = ref<string | null>(null);

export function useProjects() {
  async function fetchProjects() {
    loading.value = true;
    error.value = null;
    try {
      projects.value = await api.getProjects();
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
      current.value = await api.getProject(id);
    } catch (err) {
      current.value = null;
      error.value = err instanceof Error ? err.message : "加载项目失败";
    } finally {
      loading.value = false;
    }
  }

  async function createProject(input: CreateProjectInput) {
    saving.value = true;
    error.value = null;
    try {
      const project = await api.createProject(input);
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

  return {
    projects,
    current,
    loading,
    saving,
    error,
    fetchProjects,
    fetchProject,
    createProject,
  };
}
