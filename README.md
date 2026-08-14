# AI Drama Studio

多端 AI 漫剧创作平台。

用户可按以下流程逐步完成一部 AI 漫剧：

Project → World → Characters → Locations → Episodes → Script → Storyboard → Images → Videos → Voices → Render

## 支持平台

| 端 | 技术 | 目录 |
| --- | --- | --- |
| Web | Nuxt 3 + Vue 3 + Tailwind CSS + Pinia | `apps/web` |
| Android / iOS | Ionic Vue + Capacitor | `apps/mobile` |
| Windows / macOS | Tauri 2 + Vue | `apps/desktop` |
| API | NestJS | `apps/api` |

Web 是主要生产端。Desktop 尽可能复用 Web 的业务逻辑与 UI 结构。三个客户端共用同一套 API Client 与类型定义。

## 仓库结构

```
ai-drama-studio/
├── apps/
│   ├── web/          Nuxt 3
│   ├── mobile/       Ionic Vue + Capacitor
│   ├── desktop/      Tauri 2 + Vue
│   └── api/          NestJS
├── packages/
│   ├── types/        共享领域类型
│   ├── api-client/   统一 HTTP 客户端
│   ├── core/         跨平台业务逻辑
│   ├── utils/        纯工具函数
│   └── config/       共享配置与断点
├── prisma/
└── docs/
```

## 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 启动 PostgreSQL

```bash
docker compose up -d
cp .env.example .env
pnpm db:push
pnpm db:seed
```

### 3. 启动 Web + API

```bash
pnpm dev
```

- Web: http://localhost:3000
- API: http://localhost:3001
- Health: http://localhost:3001/health

### 4. 启动 Mobile

```bash
pnpm dev:mobile
```

### 5. 启动 Desktop（Vite 壳）

```bash
pnpm dev:desktop
```

启动完整 Tauri 窗口（需要 Rust / Cargo）：

```bash
pnpm dev:tauri
```

## 常用命令

| 命令 | 说明 |
| --- | --- |
| `pnpm dev` | 同时启动 Web (3000) 与 API (3001) |
| `pnpm dev:web` | 仅 Web |
| `pnpm dev:api` | 仅 API |
| `pnpm dev:mobile` | Ionic / Vite 开发环境 |
| `pnpm dev:desktop` | Desktop Vite 壳 |
| `pnpm dev:tauri` | Tauri 2 原生窗口 |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | 全仓 TypeScript 检查 |
| `pnpm db:push` | 将 Prisma schema 同步到数据库 |
| `pnpm db:seed` | 写入默认本地用户 |

## 文档

- [产品说明](docs/product.md)
- [架构说明](docs/architecture.md)
- [多端策略](docs/multi-platform.md)
