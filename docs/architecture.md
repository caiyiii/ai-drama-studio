# 架构说明

## 总览

所有客户端共享同一个 NestJS API、同一份 PostgreSQL 数据，以及同一套领域类型与 API Client。

```
Web (Nuxt 3)
Mobile (Ionic Vue + Capacitor)
Desktop (Tauri 2 + Vue)
        │
        │  packages/api-client
        ▼
   NestJS API  (:3001)
        │
        ▼
   PostgreSQL + Prisma
```

客户端 **永远不直接调用 AI Provider**。所有生成任务由 Backend 统一受理。

## Monorepo

- **pnpm workspaces** 管理 apps / packages
- **Turborepo** 编排 `dev` / `build` / `typecheck`
- 共享包通过 `workspace:*` 引用，禁止在三个客户端各自实现 API 请求或复制业务逻辑

| 包 | 职责 |
| --- | --- |
| `@ai-drama-studio/types` | Project、Episode、Character、Location、Asset、GenerationTask 及枚举 |
| `@ai-drama-studio/api-client` | 统一 HTTP 客户端 |
| `@ai-drama-studio/core` | 项目逻辑、工作流状态、生成任务状态机 |
| `@ai-drama-studio/utils` | 纯函数工具 |
| `@ai-drama-studio/config` | API 基址、断点、导航配置 |

## 数据模型

```
User
 └── Project
      ├── Episode
      ├── Character
      ├── Location
      ├── Asset
      └── GenerationTask
```

当前阶段不实现登录。API 在创建项目时绑定到本地默认用户（seed）。

## 生成任务（预留）

`GenerationTask` 记录一次后端生成作业：

- `type`：SCRIPT / IMAGE / VIDEO / VOICE / STORYBOARD
- `status`：PENDING / PROCESSING / SUCCESS / FAILED / CANCELLED

当前 **不执行真正的 AI Generation**，模型与模块仅作结构预留。

## 未来生成管线

```
Client
  → API
  → Generation Service
  → BullMQ
  → Worker
  → AI Provider
```

最终形态：

```
Web / Mobile / Desktop
  → 同一个 NestJS API
  → 同一个 PostgreSQL
  → 同一个 GenerationTask
  → 同一个任务系统
```

本阶段不引入 Redis、BullMQ、Worker 或任何 Provider SDK。

## 文件上传（未来）

不要把「Client → Backend → Storage」设计成唯一方案。

推荐主路径使用预签名 URL：

```
Client
  → Backend（创建上传任务、签发 Presigned URL、保存 Asset metadata）
  → Client 使用 Presigned URL 直传
  → S3-compatible Object Storage
```

Backend 只负责：

1. 创建上传任务
2. 生成签名 URL
3. 保存 Asset metadata

对象字节流不强制经过 API 服务器。当前阶段仅保留 `Asset` 模型与上述设计，不实现实际上传。

## API

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/health` | `{ "status": "ok" }` |
| GET | `/projects` | 项目列表 |
| GET | `/projects/:id` | 项目详情 |
| POST | `/projects` | 创建项目 |
| PATCH | `/projects/:id` | 更新项目 |
| DELETE | `/projects/:id` | 删除项目 |

`episodes` / `characters` / `locations` / `storyboard` / `assets` / `generation` 模块目录已预留，本阶段不提供业务接口。
