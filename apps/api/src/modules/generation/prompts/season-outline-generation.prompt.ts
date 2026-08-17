import type { StoryContext } from "@ai-drama-studio/types";

export function buildSeasonOutlinePrompt(input: {
  instruction?: string;
  episodeCount: number;
  targetDurationSeconds: number;
  context: StoryContext;
}): { system: string; prompt: string } {
  const system = `你是专业的 AI 漫剧分集设计师。
根据 Story Bible、世界观摘要、人物摘要和当前季信息，拆分剧集大纲。
每集必须能独立成篇，同时服务整季弧线。
不要复制全部世界设定。只输出 JSON。`;
  const bible = input.context.storyBible;
  const prompt = `拆成 ${input.episodeCount} 集，目标单集时长 ${input.targetDurationSeconds} 秒。
附加要求：${input.instruction?.trim() || "无"}

Story Bible：${bible?.title || "未创建"} / ${bible?.logline || ""}
主题：${bible?.theme || ""} 基调：${bible?.tone || ""}
世界：${input.context.world?.title || ""} 核心冲突：${input.context.world?.coreConflict || ""}
人物：${input.context.characters.map((item) => `${item.name}:${item.goal || ""}`).join("；") || "暂无"}
当前季：第${input.context.season?.number || "?"}季 ${input.context.season?.title || ""}
季简介：${input.context.season?.synopsis || ""}
季大纲：${input.context.season?.outline || ""}

输出结构：
{
  "season": {
    "title": "string",
    "synopsis": "string",
    "coreConflict": "string",
    "beginning": "string",
    "middle": "string",
    "ending": "string"
  },
  "episodes": [
    {
      "number": 1,
      "title": "string",
      "synopsis": "string",
      "outline": "string",
      "keyCharacters": ["string"],
      "keyLocations": ["string"],
      "conflict": "string",
      "cliffhanger": "string",
      "storyStateChanges": {
        "characters": [],
        "worldChanges": [],
        "unresolvedThreads": [],
        "foreshadowing": []
      }
    }
  ]
}`;
  return { system, prompt };
}
