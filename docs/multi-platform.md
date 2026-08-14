# 多端策略

## 原则

从初始化阶段就把 Web、Mobile、Desktop 当作同一产品的三个壳，而不是三个独立应用。

- 领域类型只定义在 `packages/types`
- HTTP 只走 `packages/api-client`
- 业务规则只放在 `packages/core`
- UI 可以按端拆分，但信息架构与工作流必须一致

## Web（主要生产端）

- Nuxt 3 + Vue 3 + TypeScript + Tailwind CSS + Pinia + VueUse
- 完整项目工作台路由
- Desktop 将尽可能复用其业务逻辑与布局概念

## Mobile

- Ionic Vue + Capacitor
- 预留 Android / iOS（`npx cap add android` / `npx cap add ios`）
- Mobile First 信息架构，不把 Desktop 页面缩小后塞进手机
- 本阶段只做：首页、项目列表、项目详情
- 底栏：首页 / 项目 / 任务 / 素材 / 我的

## Desktop

- Tauri 2 + Vue + TypeScript
- 预留 Windows 与 macOS bundle
- 本阶段只提供 App Shell，不实现复杂原生能力（文件系统深度集成、托盘、自动更新等）

## 响应式断点

| 名称 | 宽度 | 布局 |
| --- | --- | --- |
| Mobile | `< 768px` | 顶栏 + 内容 + 底栏 |
| Tablet | `768px – 1199px` | 图标轨道侧栏 + 主工作区 |
| Desktop | `>= 1200px` | 完整 Sidebar + 主工作区 |

禁止将 Desktop 布局简单缩放为 Mobile。

## 工作台导航

Desktop / Tablet Sidebar：

- 项目概览
- 世界观
- 人物
- 场景
- 剧集
- 分镜
- 图片
- 视频
- 配音
- 素材

Mobile Bottom Navigation：

- 首页
- 项目
- 任务
- 素材
- 我的
