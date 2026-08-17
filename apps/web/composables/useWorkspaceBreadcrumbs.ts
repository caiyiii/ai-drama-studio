import { WORKSPACE_NAV, WORLD_NAV } from "@ai-drama-studio/config";
import { getWorkspacePath } from "@ai-drama-studio/core";
import { useCurrentProject } from "./useCurrentProject";
import { useProjectStore } from "~/stores/project";

export type BreadcrumbItem = {
  label: string;
  to?: string;
};

export function useWorkspaceBreadcrumbs() {
  const route = useRoute();
  const { project, projectId, isProjectRoute } = useCurrentProject();
  const projectStore = useProjectStore();

  const items = computed<BreadcrumbItem[]>(() => {
    if (route.path === "/ai-providers") {
      const current = projectStore.current;
      const crumbs: BreadcrumbItem[] = [{ label: "项目", to: "/projects" }];
      if (current) {
        crumbs.push({
          label: current.name,
          to: `/projects/${current.id}`,
        });
        crumbs.push({
          label: "设置",
          to: `/projects/${current.id}/settings`,
        });
      }
      crumbs.push({ label: "AI 配置" });
      return crumbs;
    }

    if (!isProjectRoute.value || !projectId.value) {
      return [{ label: "项目", to: "/projects" }];
    }

    const crumbs: BreadcrumbItem[] = [
      { label: "项目", to: "/projects" },
      {
        label: project.value?.name ?? "载入中…",
        to: getWorkspacePath(projectId.value),
      },
    ];

    const suffix = route.path
      .replace(`/projects/${projectId.value}`, "")
      .replace(/^\//, "");
    if (suffix) {
      const parts = suffix.split("/").filter(Boolean);
      const page = parts[0] ?? "";
      const nav = WORKSPACE_NAV.find((item) => item.path === page);
      const section =
        page === "world" && typeof route.query.section === "string"
          ? route.query.section
          : "";
      const worldItem =
        section && section !== "overview"
          ? WORLD_NAV.find((item) => item.key === section)
          : null;
      crumbs.push({
        label: nav?.label ?? page,
        to:
          worldItem || parts.length > 1
            ? `/projects/${projectId.value}/${page}`
            : undefined,
      });
      if (worldItem) {
        crumbs.push({ label: worldItem.label });
      } else if (page === "characters" && parts[1]) {
        crumbs.push({ label: "详情" });
      } else if (page === "episodes" && parts[1]) {
        crumbs.push({
          label: "剧集",
          to: `/projects/${projectId.value}/episodes`,
        });
        crumbs.push({ label: parts[2] === "storyboard" ? "分镜" : "剧本" });
      } else if (page === "seasons" && parts[1]) {
        crumbs.push({
          label: "季详情",
          to: parts[3] ? `/projects/${projectId.value}/seasons/${parts[1]}` : undefined,
        });
        if (parts[3]) {
          crumbs.push({ label: "剧集详情" });
        }
      }
    }

    return crumbs;
  });

  const parent = computed(() => {
    const last = items.value[items.value.length - 1];
    const list = items.value.filter((item) => item.to);
    if (last?.to) {
      return list.length >= 2 ? list[list.length - 2] ?? null : null;
    }
    return list[list.length - 1] ?? null;
  });

  return { items, parent };
}
