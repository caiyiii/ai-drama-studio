# TTS / Voice Engine

Phase 11 把语音生成接到现有内容生产链的 **ScriptBlock Dialogue → Asset** 段。本阶段不实现 Voice Clone、Music、SFX、Timeline、FFmpeg、字幕、整集成片或发布。

## 1. Dialogue → Audio

语音内容的唯一 Source of Truth 是 `ScriptBlock(type=DIALOGUE)`。

```
ScriptBlock (DIALOGUE)
    ↓
Character.voiceProfile（声音偏好，可选）
    ↓
ProjectAiConfig(TTS)
    ↓
ProviderResolver（TTS）
    ↓
TTS Provider Adapter
    ↓
GenerationTask Preview
    ↓
Apply
    ↓
Asset(type=AUDIO) + ScriptBlockAsset
```

禁止：

- Shot / Episode → TTS
- 非 Dialogue 段落生成语音
- 用 CHAT / STRUCTURED_OUTPUT / IMAGE / VIDEO Provider 冒充 TTS
- 把多条 Dialogue 合并成 Episode Audio

## 2. Voice 优先级

1. Request `voiceId`
2. `Character.voiceProfile.voiceId`
3. 都没有 → `TTS_VOICE_REQUIRED`

不写死 OpenAI `alloy` 作为产品默认。旁白 / 未绑定角色允许生成，但仍必须提供 `voiceId`。

`Character.voiceProfile` 只保存声音偏好（voiceId / language / speed / pitch / style），禁止写入 API Key。

## 3. Provider Adapter

`OpenAiCompatibleProvider.generateSpeech()` 委托 `OpenAiCompatibleTtsAdapter`：

- 协议名：`openai-compatible-tts-v1`
- 同步：`POST {baseUrl}/audio/speech`
- OpenAI 官方返回 **二进制 audio/mpeg**，不要当 JSON 解析
- 兼容网关可返回 JSON `{url|b64_json}`
- 404 → `CAPABILITY_NOT_SUPPORTED`，不伪造音频
- 错误信息必须经过 secret sanitization

Resolver：`resolveForCapability(projectId, AiCapability.TTS)`。

没有配置时返回：

- `TTS_PROVIDER_NOT_CONFIGURED`（文案：「尚未配置语音生成 AI。」）
- `TTS_CAPABILITY_NOT_SUPPORTED` / `TTS_MODEL_NOT_SUPPORTED`

**禁止 fallback** 到 CHAT / STRUCTURED_OUTPUT / IMAGE / VIDEO / DeepSeek 文本。

## 4. Preview → Apply

Generate 只写 `GenerationTask`，不创建正式 Asset。

Apply 必须 `prisma.$transaction`：

1. 下载 / 保存音频到 `storage/assets/{projectId}/{assetId}/audio.*`
2. 创建 `Asset(type=AUDIO)`
3. 旧 AUDIO primary → false
4. 新 `ScriptBlockAsset(role=FINAL, isPrimary=true)`
5. `GenerationTask.appliedAt`

事务失败必须补偿删除已写入的文件。重新生成保留历史。`setPrimary` 只改关联，不调 AI。

## 5. 文本约束

`normalizeTtsText`：trim、去掉控制字符、保留中文标点。

- 空文本 → `TTS_TEXT_EMPTY`
- 超过 4000 字 → `TTS_TEXT_TOO_LONG`（本阶段不自动拆段）

## 6. 成本模型

BYOK / User Pays。UI 文案：

「语音生成费用由当前项目配置的 Provider 账户承担。」

没有真实 TTS Provider 是正常产品状态，不要伪造成功。

## 7. Demo Seed

`pnpm db:seed:tts-demo` 写入本地 WAV fixture，标记 `metadata.demo=true`，**不调用真实 AI**。不会自动执行。
