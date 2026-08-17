# Image Generation Engine

Phase 9 把图片生成接到现有内容生产链的 **StoryboardShot → Asset** 段。本阶段不实现 Video / TTS / 剪辑 / 发布。

## 1. Storyboard → Image

图片内容的唯一 Source of Truth 是 `StoryboardShot`。

```
StoryboardShot.imagePrompt / visualDescription / composition / lighting / mood / style / camera
        ↓
ImageGenerationService 构造结构化 ImageGenerationInput
        ↓
IMAGE Provider Adapter
```

禁止重新解析 Script、Episode 或 Story Bible 来决定画面。分镜已经完成视觉规划；图片生成只消费分镜，不回写 `imagePrompt` / `videoPrompt` / `visualDescription`。

## 2. Provider Resolver

所有 AI 调用必须经过：

```
ProjectAiConfig (capability = IMAGE)
  → User Provider（需支持 IMAGE）
  → Platform Default（需支持 IMAGE）
  → NO_AI_PROVIDER_CONFIGURED / IMAGE_PROVIDER_NOT_CONFIGURED
```

IMAGE **不允许** fallback 到：

- Legacy `Project.aiProviderId` 的文本 Provider（例如 DeepSeek Chat）
- `STRUCTURED_OUTPUT` / `CHAT`
- 系统 `.env` 文本模型（`fromEnv` 只服务 legacy 文本能力）

平台默认 Provider 仅用于开发 / Demo / 冷启动，不是最终商业模式。

## 3. Capability

`AiCapability.IMAGE` 本阶段标记为已实现。VIDEO / IMAGE_TO_VIDEO 见 Phase 10。TTS / MUSIC 等仍为架构预留。

Resolver 与 Adapter 同时校验：

- Provider enabled
- Provider 有 API Key
- Provider 声明 IMAGE
- Model enabled
- Model 声明 IMAGE

OpenAI Compatible 允许勾选 IMAGE，但不假设每个兼容网关都实现 `POST /images/generations`。若接口 404，返回 `CAPABILITY_NOT_SUPPORTED` / `IMAGE_CAPABILITY_NOT_SUPPORTED`，而不是 500。

## 4. Asset

统一使用 `Asset`，不建 `ImageAsset` 表。`AssetType.IMAGE` 已存在并复用。增量字段包括 status、storageKey、mimeType、宽高、version、provider、model 等，为未来 VIDEO / AUDIO 预留。

镜头与资源通过 `StoryboardShotAsset` 多对多关联：

- `role`：REFERENCE / GENERATED / FINAL / THUMBNAIL
- `isPrimary`：当前最终画面
- 历史版本保留，不删除

未来 Video 将继续挂在同一 Shot 上：Final Image Asset → Video Asset。

## 5. Storage

不要把大体积 Base64 或二进制长期写入 PostgreSQL。

`AssetStorageService` 抽象：

- `saveFromUrl()`
- `saveFromBase64()`
- `delete()`
- `getUrl()`

本阶段实现 `LocalAssetStorageProvider`（`storage/assets/{projectId}/{assetId}/...`）。S3 / R2 / OSS 仅保留接口，不实现。业务代码不直接操作 `fs`。文件通过 `GET /projects/:projectId/assets/:assetId/file` 读取，并校验项目归属。

## 6. GenerationTask

复用 `GenerationTask`，`type = IMAGE`，`capability = IMAGE`。记录 input / output / provider / model / usage / error。usage 至少包含 `durationMs` 与 `imageCount`。不伪造 token 或美元成本。

错误经过 `sanitizeSecret()`，禁止 API Key 进入日志、input、output 或前端。

## 7. Preview / Apply

1. `POST /projects/:projectId/generations/image` 同步调用 IMAGE Provider。
2. 成功结果写入 `GenerationTask.output` 作为 Preview，**不创建**正式 Asset。
3. 用户确认后 `POST /projects/:projectId/generations/:id/apply`：
   - 先落盘
   - 再 `prisma.$transaction` 创建 Asset + StoryboardShotAsset + `appliedAt`
   - 旧 FINAL 仅把 `isPrimary` 设为 false，不删除
4. 已 Apply 的任务返回 `GENERATION_ALREADY_APPLIED`。
5. 重新生成创建新的 GenerationTask，不覆盖旧 Asset。

失败只更新 `GenerationTask.status = FAILED`，不创建 READY Asset。

## 8. 未来 Video

```
StoryboardShot → Final Image Asset → Video Generation → Video Asset
StoryboardShot → Image Asset → Image-to-Video → Video Asset
```

Asset 必须保持通用媒体抽象。本阶段明确不实现 Video / IMAGE_TO_VIDEO / FFmpeg / Timeline。

## 9. 用户 BYOK

正式产品中，用户使用自己的 Provider、API Key 和账单：

- CHAT / STRUCTURED_OUTPUT → 例如 DeepSeek
- IMAGE → 用户自己的 Flux / SDXL / GPT Image 等
- 未来 VIDEO / TTS / MUSIC 同理

平台提供工作流、Prompt 组装、Capability 路由、任务与资产管理，不长期替用户承担生成成本。

## 10. 为什么图片不能直接从 Script 生成

剧本描述情节与对白，分镜才把每一镜的构图、景别、镜头运动、光影、角色站位和 Image Prompt 规划好。若 Image Generation 绕过 Storyboard 直接读 Script，会：

- 丢失镜头级视觉决策
- 与后续 Video / Editing 的 Shot 对齐断裂
- 让 Script 与画面出现两套 Source of Truth

因此 Phase 9 的上游固定为 `StoryboardShot`。
