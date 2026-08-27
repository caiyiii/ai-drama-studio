# FAL.ai Provider

FAL.ai 是 Ai-Drama-Studio 的一等 AI Provider，用于：

- `IMAGE`
- `VIDEO`
- `IMAGE_TO_VIDEO`

不用于 `CHAT` / `STRUCTURED_OUTPUT` / `TTS` / `MUSIC` / `SFX`。

## 架构

```text
Project AI Config (capability)
  → ProviderResolver
  → ResolvedAiProvider (kind = FAL)
  → AiService.instantiateAiProvider()
  → FalProvider
  → FalClient (queue.fal.run)
  → FAL.ai
```

Generation Service（如 `ImageGenerationService`）**不会**直接调用 FAL。

## Queue endpoints

Submit:

```http
POST https://queue.fal.run/{model}
Authorization: Key <FAL_KEY>
Content-Type: application/json

{ "prompt": "A simple cinematic landscape" }
```

Never call the bare root:

```text
https://queue.fal.run
```

Status / result:

```text
GET https://queue.fal.run/{model}/requests/{request_id}/status
GET https://queue.fal.run/{model}/requests/{request_id}
```

Adapter code: `FalClient.submitRequest` / `getRequestStatus` / `getRequestResult`.

## 创建 Provider

1. 打开 **AI Providers** 管理页
2. 添加 Provider：
   - **名称**：例如 `FAL.ai`
   - **类型**：`FAL.ai`
   - **API Key**：你的 FAL Key（仅服务端加密存储）
   - **Model**：例如 `fal-ai/nano-banana-2`（必须是 `owner/name` 形式）
   - **Capabilities**：勾选 `IMAGE` / `VIDEO` / `IMAGE_TO_VIDEO`
3. 点击 **测试连接**（会发起一次最小 IMAGE Queue 请求并轮询至完成）
4. 测试成功后保存

Base URL 默认使用官方 Queue API：`https://queue.fal.run`。UI 不要求填写 OpenAI 风格 Base URL。

若测试返回 HTTP 405，通常表示请求打到了错误 endpoint（例如缺少 model）。正确 endpoint 必须是：

```text
https://queue.fal.run/{model}
```

## 绑定项目

在项目的 **AI Configuration** 中：

| Capability       | 建议 Provider |
|------------------|---------------|
| CHAT             | DeepSeek / OpenAI Compatible |
| STRUCTURED_OUTPUT| DeepSeek / OpenAI Compatible |
| IMAGE            | FAL.ai        |
| VIDEO            | FAL.ai        |
| IMAGE_TO_VIDEO   | FAL.ai        |
| TTS              | 现有 TTS Provider |

示例（星河碰撞）：

```text
CHAT / STRUCTURED_OUTPUT → DeepSeek
IMAGE / VIDEO / IMAGE_TO_VIDEO → FAL.ai
```

当前 Provider 行上的 `model` 字段作为该 Provider 的默认模型。若 IMAGE / VIDEO / I2V 需要不同模型，可创建多个 FAL Provider（或使用已有 capability-level `AiModel` 绑定）。

## Provider Test

- Endpoint：`POST /ai/providers/test`（草稿）或已保存 Provider 的 test 接口
- FAL 测试会调用一次最小 `generateImage`（prompt：`A simple cinematic test image`）
- 响应**不会**返回 API Key / encrypted secret
- 错误信息会脱敏（含 `Key …` / API Key 原文）

## 模型建议

请使用与能力匹配的 FAL 模型 ID，例如：

- IMAGE：`fal-ai/flux/schnell`（示例，可替换）
- VIDEO / I2V：使用真实支持视频或图生视频的 `fal-ai/...` 模型

不要把纯 IMAGE 模型声明为 `IMAGE_TO_VIDEO`。

## 安全

- API Key 经现有 `CryptoService` 加密入库
- 列表 / 详情接口不返回明文 Key
- 日志禁止输出 Authorization / FAL_KEY / apiKey

## 本地开发

环境变量 `FAL_API_KEY` **不是**本阶段强制要求；优先使用数据库 Provider 配置。若未来接入 env fallback，不得覆盖用户明确配置的 Database Provider。
