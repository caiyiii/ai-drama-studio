# Music / SFX Generation Engine

Phase 12 把音乐和音效接到现有内容生产链的 **Episode → Asset** 段。本阶段不实现 Timeline、FFmpeg、混音、整集成片、字幕或发布。

## 1. Architecture

音乐与音效是两个独立 Capability，不允许跨能力 fallback。

```
User
 ↓
Project
 ↓
Music / SFX Generation Request
 ↓
AiCapability.MUSIC 或 AiCapability.SFX
 ↓
ProjectAiConfig
 ↓
ProviderResolver
 ↓
Music / SFX Provider Adapter
 ↓
GenerationTask(type=MUSIC|SFX) Preview
 ↓
用户确认 Apply
 ↓
Asset(type=AUDIO) + EpisodeAudioAsset
```

层次必须分开：

- `StoryboardShot` → IMAGE / VIDEO
- `ScriptBlock(DIALOGUE)` → TTS Audio
- `Episode` → MUSIC / SFX

不要把 Music / SFX 塞进 `StoryboardShotAsset` 或 `ScriptBlockAsset`。

## 2. Capability

- `MUSIC` 与 `SFX` 是两个不同 Capability
- 禁止 MUSIC → TTS / CHAT / IMAGE fallback
- 禁止 SFX → TTS / CHAT / IMAGE fallback
- 没有配置时：
  - `MUSIC_PROVIDER_NOT_CONFIGURED`（尚未配置音乐生成 AI。）
  - `SFX_PROVIDER_NOT_CONFIGURED`（尚未配置音效生成 AI。）
- Provider 存在但不支持：`MUSIC_CAPABILITY_NOT_SUPPORTED` / `SFX_CAPABILITY_NOT_SUPPORTED`

Resolver 优先级保持现有架构：

`ProjectAiConfig → Legacy（仅文本能力）→ User Provider → Platform Default → System Provider → NO_AI_PROVIDER_CONFIGURED`

Legacy / System `.env` 只适用于 CHAT / STRUCTURED_OUTPUT。

## 3. Provider Adapter

`OpenAiCompatibleProvider.generateMusic()` / `generateSfx()` 委托独立 adapter：

- 协议：`openai-compatible-music-v1` / `openai-compatible-sfx-v1`
- 同步：`POST {baseUrl}/music/generations`、`POST {baseUrl}/sfx/generations`
- 支持二进制或 JSON `{url|b64_json}`
- 404 → `CAPABILITY_NOT_SUPPORTED`，不伪造音频
- 只有 Provider **明确声明** MUSIC / SFX capability 才允许配置和调用
- 错误信息必须脱敏，不能包含 API Key

## 4. Preview → Apply

Generate 只写 `GenerationTask`，不创建正式 Asset。

Preview 把音频落到 `storage/assets/{projectId}/preview-{taskId}/music.*` 或 `sfx.*`，`output` 保存：

```
{
  assetType: "AUDIO",
  audioType: "MUSIC" | "SFX",
  durationSeconds,
  mimeType,
  previewUrl,
  previewStorageKey,
  provider,
  model,
  metadata
}
```

不在 GenerationTask 中长期保存大 Base64。Preview URL 只用于预览，不假设永久有效。

Apply 必须 `prisma.$transaction`：

1. 从 preview 复制到 `storage/assets/{projectId}/{assetId}/music.*` 或 `sfx.*`
2. 创建 `Asset(type=AUDIO)`
3. 同 role 旧 primary → false
4. 新 `EpisodeAudioAsset(role=MUSIC|SFX, isPrimary=true)`
5. `GenerationTask.appliedAt`

事务失败必须补偿删除已写入的正式文件。重新生成保留历史。`setPrimary` 只改关联，不调 AI。

## 5. EpisodeAudioAsset

```
EpisodeAudioAsset
  episodeId
  assetId
  role: MUSIC | SFX | REFERENCE | FINAL
  isPrimary
  metadata
```

唯一：`episodeId + assetId`。Apply 时 role 使用 `MUSIC` 或 `SFX`（用 `isPrimary` 表示最终，而不是 role=FINAL，以免丢失类型）。

## 6. Context

`StoryContextBuilder.buildMusicContext()` / `buildSfxContext()` 只提供摘要：

- Project / Story Bible / World summary / Season / Episode outline / storyState / continuityNotes / Script summary / Storyboard summary
- SFX 可附加 Scene / Shot visual / action / environment

禁止 dump 全库、API Key、encryptedApiKey、GenerationTask 全量、imageProfile / voiceProfile。

最终 Prompt = 用户 Prompt + Story Context。不替用户强行生成 Prompt。

## 7. Duration

配置常量：

- Music：1–600 秒
- SFX：0.1–60 秒

超出返回 `INVALID_DURATION`。

## 8. Storage

继续 `AssetStorageService`。业务代码不直接 `fs.writeFile`。支持 `audio/mpeg|wav|ogg|aac|mp4`，按真实 Content-Type 处理，不硬编码 mp3。

## 9. 当前没有 Timeline

本阶段明确没有：

- Audio Timeline / 轨道 / 拖动
- FFmpeg / Mixing / Fade / Ducking
- Episode Render / 整集成片
- Billing / Login / Redis / Worker

Music / SFX 仍是“生产资产”，不要把它们拼成最终视频。
