# 产品说明

## 定位

AI Drama Studio 是一个多端 AI 漫剧创作平台，帮助创作者从项目立项一路走到成片渲染。

## 创作流程

```
Project
  → World
  → Characters
  → Locations
  → Episodes
  → Script
  → Storyboard
  → Images
  → Videos
  → Voices
  → Render
```

当前阶段只打通 **项目（Project）** 的创建、查看、修改、删除，以及进入项目工作台。其余步骤以工作台入口与占位页存在，不实现完整创作能力。

## 平台角色

| 端 | 角色 |
| --- | --- |
| Web | 主要生产端，完整工作台布局 |
| Desktop | 生产端的桌面壳，复用 Web 业务逻辑与信息架构 |
| Mobile | 移动优先的轻量端：浏览项目、查看进度，不承担完整创作流程 |

## 当前阶段范围

已实现：

- 多端 Monorepo 骨架
- 项目 CRUD（Web + API）
- Web 响应式工作台入口
- Mobile 首页 / 项目列表 / 项目详情
- Desktop 基础 App Shell
- GenerationTask 数据模型预留

明确不做（本阶段）：

- 登录 / 注册 / 支付 / 订阅
- LLM、图片生成、视频生成、TTS
- Redis、BullMQ、AI Agent、RAG
- 复杂权限、完整剪辑器
