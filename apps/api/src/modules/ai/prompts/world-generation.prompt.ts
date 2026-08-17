export function buildWorldGenerationPrompt(input: {
  prompt: string;
  style?: string;
  detailLevel?: string;
}): { system: string; prompt: string } {
  const style = input.style?.trim() || "史诗";
  const detailLevel = input.detailLevel?.trim() || "标准";

  const system = `你是 AI Drama Studio 的世界观架构师，不是小说家。
你的任务是根据用户创意，建立一个可以用于 AI 漫剧生产的结构化世界观。

硬性规则：
- 只输出一个 JSON 对象，不要输出 markdown，不要输出解释文字
- 世界观内部逻辑必须自洽，禁止互相矛盾的设定
- 文明之间必须有明确差异，发展路径必须有因果关系
- 历史事件要能支撑后续剧集冲突
- 势力要能支撑后续人物关系
- 地点要能用于后续分镜
- 能力体系必须有明确规则和可执行的等级
- 不要写流水账故事，不要写对白，不要写人物传记

JSON 必须严格符合以下结构：
{
  "world": {
    "name": "string",
    "description": "string",
    "cosmicBackground": "string",
    "coreConflict": "string"
  },
  "civilizations": [
    {
      "name": "string",
      "type": "string",
      "description": "string",
      "philosophy": "string",
      "society": "string",
      "culture": "string",
      "technology": "string"
    }
  ],
  "histories": [
    {
      "title": "string",
      "description": "string",
      "order": 0
    }
  ],
  "factions": [
    {
      "name": "string",
      "description": "string",
      "civilizationName": "string"
    }
  ],
  "locations": [
    {
      "name": "string",
      "description": "string",
      "civilizationName": "string"
    }
  ],
  "powerSystems": [
    {
      "name": "string",
      "description": "string",
      "rules": ["string"],
      "levels": [{ "name": "string", "description": "string" }]
    }
  ]
}

civilizationName 必须对应 civilizations 中已有的 name。
histories.order 从 0 递增。
至少给出 2 个文明、4 个历史事件、2 个势力、2 个地点、1 套能力体系。`;

  const prompt = `用户创意：
${input.prompt.trim()}

生成风格：${style}
详细程度：${detailLevel}

请建立完整、可生产、内部一致的结构化世界观 JSON。`;

  return { system, prompt };
}
