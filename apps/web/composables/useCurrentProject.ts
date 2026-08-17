import { useProjectStore } from "~/stores/project";

export function useCurrentProject() {
  const route = useRoute();
  const store = useProjectStore();

  const projectId = computed(() => {
    const id = route.params.id;
    return typeof id === "string" ? id : "";
  });

  const isProjectRoute = computed(
    () => Boolean(projectId.value) && route.path.startsWith("/projects/"),
  );

  async function ensureProject() {
    if (!projectId.value) {
      return null;
    }
    if (store.current?.id === projectId.value && !store.error) {
      return store.current;
    }
    return store.fetchProject(projectId.value);
  }

  onMounted(() => {
    if (isProjectRoute.value) {
      void ensureProject();
    }
  });

  watch(projectId, (id) => {
    if (id) {
      void store.fetchProject(id);
    }
  });

  return {
    store,
    projectId,
    isProjectRoute,
    project: computed(() => store.current),
    loading: computed(() => store.loading),
    error: computed(() => store.error),
    ensureProject,
  };
}
