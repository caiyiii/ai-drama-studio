import { WORKSPACE_NAV, WORLD_NAV } from "@ai-drama-studio/config";
import { getWorkspacePath } from "@ai-drama-studio/core";
import { useCurrentProject } from "./useCurrentProject";
import { useProjectStore } from "~/stores/project";
import { useStoryStore } from "~/stores/story";

export type BreadcrumbItem = {
  label: string;
  to?: string;
};

export function useWorkspaceBreadcrumbs() {
  const route = useRoute();
  const { project, projectId, isProjectRoute } = useCurrentProject();
  const projectStore = useProjectStore();
  const storyStore = useStoryStore();

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
      const seasonIdParam = String(route.params.seasonId || "");
      const episodeIdParam = String(route.params.episodeId || parts[1] || "");
      const episode =
        storyStore.episode?.id === episodeIdParam
          ? storyStore.episode
          : storyStore.projectEpisodes.find((item) => item.id === episodeIdParam) ?? null;
      const season =
        storyStore.season?.id === seasonIdParam ||
        storyStore.season?.id === episode?.seasonId
          ? storyStore.season
          : storyStore.seasons.find((item) => item.id === (seasonIdParam || episode?.seasonId)) ?? null;
      const episodeLabel = episode
        ? `E${String(episode.number).padStart(2, "0")} · ${episode.title}`
        : "Episode Workspace";
      if (worldItem) {
        crumbs.push({ label: worldItem.label });
      } else if (page === "characters" && parts[1]) {
        crumbs.push({ label: "详情" });
      } else if (page === "episodes" && parts[1]) {
        crumbs.push({
          label: season?.title || "Season",
          to: season?.id ? `/projects/${projectId.value}/seasons/${season.id}` : `/projects/${projectId.value}/episodes`,
        });
        crumbs.push({
          label: episodeLabel,
          to: `/projects/${projectId.value}/episodes/${parts[1]}`,
        });
        if (parts[2]) {
          crumbs.push({
            label:
              parts[2] === "plan"
                ? "剧集规划"
                : parts[2] === "storyboard"
                  ? "分镜"
                  : parts[2] === "assets"
                    ? "素材"
                    : parts[2] === "timeline"
                      ? "时间线"
                      : parts[2] === "render"
                        ? "成片"
                        : parts[2] === "overview"
                          ? "概览"
                          : "剧本",
          });
        }
      } else if (page === "seasons" && parts[1]) {
        crumbs.push({
          label: season?.title || "Season",
          to: parts[3] ? `/projects/${projectId.value}/seasons/${parts[1]}` : undefined,
        });
        if (parts[3]) {
          crumbs.push({
            label: episodeLabel,
            to:
              parts[4]
                ? `/projects/${projectId.value}/episodes/${parts[3]}`
                : undefined,
          });
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
