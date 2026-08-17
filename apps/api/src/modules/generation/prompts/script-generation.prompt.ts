import type { StoryContext } from "@ai-drama-studio/types";

export function buildScriptGenerationPrompt(input: {
  prompt?: string;
  tone?: string;
  style?: string;
  targetDurationSeconds: number;
  additionalInstructions?: string;
  context: StoryContext;
}): { system: string; prompt: string } {
  const bible = input.context.storyBible;
  const system = `你是专业影视/动画/漫剧剧本编剧。
必须输出可视化可拍摄的结构化剧本 JSON，不要写成小说长文。
严格遵守 Story Bible、World、Character、Season、Episode。
禁止：改变世界观核心规则、擅自改变人物核心设定、擅自增加重要人物、擅自改变人物关系、跳过 Episode 大纲、与上一集发生明显连续性冲突。
信息不足时，基于已有上下文合理补全，但不得破坏 Story Bible。
对白必须尽量写成可表演的台词；动作必须是镜头可见行为；指示只给镜头/表演提示。
只输出 JSON，不要 markdown。`;
  const prompt = `项目：${input.context.project?.name || ""} ${input.context.project?.genre || ""}
用户要求：${input.prompt?.trim() || "根据当前剧集大纲生成完整剧本"}
基调：${input.tone || bible?.tone || "未指定"}
风格：${input.style || bible?.style || "未指定"}
目标时长：${input.targetDurationSeconds} 秒
附加说明：${input.additionalInstructions?.trim() || "无"}

Story Bible：
标题：${bible?.title || "未创建"}
一句话：${bible?.logline || ""}
前提：${bible?.premise || ""}
主题：${bible?.theme || ""}
故事承诺：${bible?.storyPromise || ""}
规则：${bible?.rules ? JSON.stringify(bible.rules) : ""}
时间线：${bible?.timelineSummary || ""}
连续性：${bible?.continuityNotes || ""}

世界：${input.context.world?.title || ""} ${input.context.world?.summary || ""}
宇宙背景：${input.context.world?.cosmicBackground || ""}
核心冲突：${input.context.world?.coreConflict || ""}
人物：${input.context.characters.map((item) => `${item.name}/${item.role || ""}/${item.identity || ""}/目标:${item.goal || ""}/冲突:${item.conflict || ""}`).join("；") || "暂无"}
季：第${input.context.season?.number || "?"}季 ${input.context.season?.title || ""} ${input.context.season?.synopsis || ""}
当前集：E${String(input.context.episode?.number || 0).padStart(2, "0")} ${input.context.episode?.title || ""}
大纲：${input.context.episode?.outline || ""}
本集状态：${input.context.episode?.storyState ? JSON.stringify(input.context.episode.storyState) : "无"}
上一集：${input.context.previousEpisode ? `E${String(input.context.previousEpisode.number).padStart(2, "0")} ${input.context.previousEpisode.title}` : "无"}
上一集状态：${input.context.previousEpisode?.storyState ? JSON.stringify(input.context.previousEpisode.storyState) : "无"}

输出结构：
{
  "script": {
    "title": "string",
    "logline": "string",
    "summary": "string",
    "estimatedDurationSeconds": ${input.targetDurationSeconds}
  },
  "scenes": [
    {
      "number": 1,
      "title": "string",
      "location": "string",
      "timeOfDay": "string",
      "summary": "string",
      "purpose": "string",
      "conflict": "string",
      "estimatedDurationSeconds": 0,
      "blocks": [
        {
          "order": 1,
          "type": "DIALOGUE | ACTION | NARRATION | DIRECTION",
          "characterName": "string",
          "content": "string",
          "metadata": {}
        }
      ]
    }
  ]
}

characterName 必须使用已有人物姓名。不要发明重要新角色。metadata 只能是对象，不要塞未知字段。`;
  return { system, prompt };
}
