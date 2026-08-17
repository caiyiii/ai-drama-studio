# Video Generation Engine

Phase 10 把视频生成接到现有内容生产链的 **StoryboardShot → Asset** 段。本阶段不实现 TTS、字幕、音乐、FFmpeg Timeline、整集成片、批量生成或发布。

## 1. Storyboard → Video

视频内容的唯一 Source of Truth 是 `StoryboardShot`。

```
StoryboardShot
    ↓
Final Image Asset（IMAGE_TO_VIDEO）或纯 Prompt（VIDEO）
    ↓
ProjectAiConfig
    ↓
ProviderResolver（VIDEO 或 IMAGE_TO_VIDEO）
    ↓
Video Provider Adapter
    ↓
GenerationTask Preview
    ↓
Apply
    ↓
Asset(type=VIDEO) + StoryboardShotAsset
```

禁止：

- Script → Video
- Character → Video
- Episode → Video
- 用 CHAT / STRUCTURED_OUTPUT / IMAGE Provider 冒充 Video

## 2. VIDEO vs IMAGE_TO_VIDEO

| Capability | 业务含义 | 默认 |
| --- | --- | --- |
| `IMAGE_TO_VIDEO` | 基于 Shot Final Image + Prompt | **推荐默认** |
| `VIDEO` | 纯 Prompt 文生视频 | 次选 |

Resolver 必须分别调用：

- `resolveForCapability(projectId, AiCapability.VIDEO)`
- `resolveForCapability(projectId, AiCapability.IMAGE_TO_VIDEO)`

没有配置时返回明确错误：

- `VIDEO_PROVIDER_NOT_CONFIGURED`
- `IMAGE_TO_VIDEO_PROVIDER_NOT_CONFIGURED`
- `CAPABILITY_NOT_SUPPORTED`

**禁止 fallback** 到 CHAT / STRUCTURED_OUTPUT / IMAGE / DeepSeek 文本 Provider。

## 3. Provider Adapter

`OpenAiCompatibleProvider.generateVideo()` 委托 `OpenAiCompatibleVideoAdapter`：

- 协议名：`openai-compatible-video-v1`
- 同步：`POST {baseUrl}/videos/generations`
- 404 → `CAPABILITY_NOT_SUPPORTED`，不伪造 URL
- 接口预留 `supportsAsync`，本阶段只实现 SYNC

没有真实 Video Provider 是正常产品状态，不是 500。

## 4. Preview / Apply

Preview 只写 `GenerationTask`，不创建正式 `Asset`。

Apply 在 transaction 中：

1. 下载 / 保存到 Asset Storage
2. 创建 `Asset(type=VIDEO)`
3. 创建 `StoryboardShotAsset(role=FINAL, isPrimary=true)`
4. 旧 Final Video 降为 `isPrimary=false`（不影响 Final Image）
5. 标记 `GenerationTask.appliedAt`

Storage 无法进 DB transaction 时：DB 失败则补偿删除刚写入的文件。

## 5. History / Stale

同一 Shot 可有多个 Video Asset。重新生成保留历史。`setPrimaryVideoAsset` 不调用 AI。

Stale 动态计算：`storyboard.version` vs `asset.metadata.storyboardVersion`，或 Shot `updatedAt` vs video `createdAt`。GET 不写库。

## 6. Storage

视频文件：`storage/assets/{projectId}/{assetId}/video.mp4`

DB 只存 metadata。不把 MP4 Base64 存 PostgreSQL。

## 7. 未实现

TTS、字幕、音乐、FFmpeg Timeline、整集 Render、批量生成、Redis / BullMQ、Billing、Login。
