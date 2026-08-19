export function buildLocationGenerationPrompt(input: {
  prompt: string;
  style?: string;
  detailLevel?: string;
  worldTitle?: string;
  worldSummary?: string;
  coreConflict?: string;
  storyBiblePremise?: string;
  storyBibleTone?: string;
  existingNames: string[];
}) {
  const system = `你是专业影视场景设计师。
必须输出结构化 JSON，描述故事世界中的“地点/场景”，不是剧本场次。
地点必须可用于后续剧本、分镜与视觉生成。
只输出 JSON，不要 markdown。`;
  const prompt = `用户描述：${input.prompt}
风格：${input.style || "科幻"}
细节：${input.detailLevel || "标准"}

世界：${input.worldTitle || ""} ${input.worldSummary || ""}
核心冲突：${input.coreConflict || ""}
故事前提：${input.storyBiblePremise || ""}
故事基调：${input.storyBibleTone || ""}
已有场景：${input.existingNames.join("、") || "无"}

输出结构：
{
  "location": {
    "name": "string",
    "description": "string",
    "environment": "string",
    "atmosphere": "string",
    "visualStyle": "string",
    "tags": ["string"]
  }
}

不要与已有场景重名。`;
  return { system, prompt };
}
