# Episode Timeline / Composition Preview

Phase 13 把已有 Script / Storyboard / Assets / TTS / Music / SFX **编排**进 Episode Timeline，并输出浏览器可播放的 Composition Preview。

```
Script → Storyboard → Assets → Timeline → Composition Preview → 未来 Render → 未来 Publish
```

Timeline 是编排层，不是 Script / Storyboard / Asset 的替代。它只保存：

- sourceType + sourceId
- assetId
- 时间位置 / 持续时间
- 轨道 / 层级 / 播放参数

不复制 `imagePrompt` / `videoPrompt` / `dialogueText` / 文件 URL / storageKey。

## 构建规则

- 视觉：FINAL Video 优先，否则 FINAL Image；都没有则记录 `missingVisualAsset`，不调用 AI
- 对白：仅 `ScriptBlock.DIALOGUE` + FINAL AUDIO；没有音频则记录 `missingDialogueAudio`，不调用 TTS
- 音乐：`EpisodeAudioAsset role=MUSIC isPrimary`，从 0 秒开始；长于时间线则截断，短于不循环
- 音效：有 shotId 放 Shot 时间，有 sceneId 放 Scene 时间，否则从 0 秒开始

Timeline Build **不调用 Provider / AI / GenerationTask**。

## Preview

`GET /timeline/preview` 返回结构化 JSON。Web 使用 HTML5 `video` / `img` / `audio` 按 `currentTime` 合成播放。

这是合成预览，**不是**最终 MP4 导出。
