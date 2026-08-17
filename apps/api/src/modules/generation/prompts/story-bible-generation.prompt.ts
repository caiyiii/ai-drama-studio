import type { StoryContext } from "@ai-drama-studio/types";

export function buildStoryBibleGenerationPrompt(input: {
  instruction: string;
  tone?: string;
  style?: string;
  audience?: string;
  context: StoryContext;
}): { system: string; prompt: string } {
  const system = `你是专业的 AI 漫剧故事架构师。
根据项目世界观与人物，生成作品圣经 Story Bible。
Story Bible 是创作规则与故事承诺，不是世界观副本，不要复述全部世界设定。
只输出一个 JSON 对象，不要 markdown。`;
  const prompt = `用户需求：${input.instruction}
基调：${input.tone || "未指定"}
风格：${input.style || "未指定"}
受众：${input.audience || "未指定"}

项目上下文（摘要）：
世界：${input.context.world?.title || "未创建"} ${input.context.world?.coreConflict || ""}
人物：${input.context.characters.map((item) => `${item.name}（${item.role || "未定位"}）`).join("、") || "暂无"}

输出结构：
{
  "title": "string",
  "logline": "string",
  "premise": "string",
  "theme": "string",
  "tone": "string",
  "style": "string",
  "audience": "string",
  "storyPromise": "string",
  "rules": {
    "worldRules": ["string"],
    "characterRules": ["string"],
    "narrativeRules": ["string"],
    "forbidden": ["string"]
  },
  "timelineSummary": "string",
  "continuityNotes": ["string"]
}`;
  return { system, prompt };
}
