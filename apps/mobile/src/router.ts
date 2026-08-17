import { createRouter, createWebHistory } from "@ionic/vue-router";
import type { RouteRecordRaw } from "vue-router";
import TabsPage from "./views/TabsPage.vue";

const routes: RouteRecordRaw[] = [
  {
    path: "/",
    redirect: "/tabs/home",
  },
  {
    path: "/tabs",
    component: TabsPage,
    children: [
      { path: "", redirect: "/tabs/home" },
      {
        path: "home",
        component: () => import("./views/HomePage.vue"),
      },
      {
        path: "projects",
        component: () => import("./views/ProjectsPage.vue"),
      },
      {
        path: "projects/:id",
        component: () => import("./views/ProjectDetailPage.vue"),
      },
      {
        path: "projects/:id/world",
        component: () => import("./views/WorldHubPage.vue"),
      },
      {
        path: "projects/:id/world/:section",
        component: () => import("./views/WorldSectionPage.vue"),
      },
      {
        path: "projects/:id/characters",
        component: () => import("./views/CharactersPage.vue"),
      },
      {
        path: "projects/:id/characters/:characterId",
        component: () => import("./views/CharacterDetailPage.vue"),
      },
      {
        path: "projects/:id/story-bible",
        component: () => import("./views/StoryBiblePage.vue"),
      },
      {
        path: "projects/:id/seasons",
        component: () => import("./views/SeasonsPage.vue"),
      },
      {
        path: "projects/:id/seasons/:seasonId",
        component: () => import("./views/SeasonDetailPage.vue"),
      },
      {
        path: "projects/:id/seasons/:seasonId/episodes/:episodeId",
        component: () => import("./views/EpisodeDetailPage.vue"),
      },
      {
        path: "projects/:id/seasons/:seasonId/episodes/:episodeId/script",
        component: () => import("./views/ScriptPage.vue"),
      },
      {
        path: "projects/:id/seasons/:seasonId/episodes/:episodeId/storyboard",
        component: () => import("./views/StoryboardPage.vue"),
      },
      {
        path: "projects/:id/seasons/:seasonId/episodes/:episodeId/storyboard/:shotId",
        component: () => import("./views/StoryboardShotPage.vue"),
      },
      {
        path: "tasks",
        component: () => import("./views/PlaceholderPage.vue"),
        props: { title: "任务", body: "生成任务继续使用 GenerationTask。本阶段已支持按 AI Capability 记录 STRUCTURED_OUTPUT。" },
      },
      {
        path: "assets",
        component: () => import("./views/PlaceholderPage.vue"),
        props: { title: "素材", body: "素材库仅作信息架构预留，当前不实现上传。" },
      },
      {
        path: "me",
        component: () => import("./views/PlaceholderPage.vue"),
        props: { title: "我的", body: "当前阶段不实现登录。用户 AI Provider（BYOK）已在数据库预留 userId。" },
      },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
