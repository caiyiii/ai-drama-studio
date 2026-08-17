export function buildCharacterGenerationPrompt(input: {
  prompt: string;
  style?: string;
  detailLevel?: string;
  name?: string;
  role?: string;
  gender?: string;
  age?: string;
  personality?: string;
  appearance?: string;
  background?: string;
  goal?: string;
  motivation?: string;
  conflict?: string;
  worldTitle?: string;
  worldSummary?: string;
  coreConflict?: string;
  civilizationName?: string;
  civilizationDescription?: string;
  factionName?: string;
  factionDescription?: string;
  existingNames?: string[];
}): { system: string; prompt: string } {
  const style = input.style?.trim() || "科幻";
  const detailLevel = input.detailLevel?.trim() || "MEDIUM";

  const system = `你是专业的 AI 漫剧角色设计师，不是小说家。
你的任务是根据项目世界观生成一个可以用于连续剧集生产的结构化角色卡。

硬性规则：
- 只输出一个 JSON 对象，不要输出 markdown，不要输出解释文字
- 角色必须符合当前世界观、文明背景与势力背景
- 必须有明确的人物目标、动机和核心冲突
- 必须具有可视觉化的外貌特征，避免空泛形容词堆砌
- 避免与现有角色完全重复
- 关系必须指向已有角色姓名，如果没有合适对象则返回空数组
- personality 与 appearance 必须是对象，不要用字符串
- abilities 必须是数组

JSON 必须严格符合以下结构：
{
  "character": {
    "name": "string",
    "alias": "string",
    "gender": "string",
    "age": "string",
    "race": "string",
    "identity": "string",
    "role": "string",
    "personality": { "traits": "string", "summary": "string" },
    "appearance": { "look": "string", "visualHook": "string" },
    "background": "string",
    "goal": "string",
    "motivation": "string",
    "conflict": "string",
    "abilities": ["string"],
    "civilizationName": "string",
    "factionName": "string"
  },
  "relationships": [
    {
      "targetName": "string",
      "type": "FRIEND|ENEMY|ALLY|RIVAL|MASTER|FAMILY|LOVER|OTHER",
      "label": "string",
      "description": "string",
      "strength": 3
    }
  ]
}`;

  const contextLines = [
    input.worldTitle ? `世界观：${input.worldTitle}` : null,
    input.worldSummary ? `世界简介：${input.worldSummary}` : null,
    input.coreConflict ? `核心冲突：${input.coreConflict}` : null,
    input.civilizationName
      ? `指定文明：${input.civilizationName}${input.civilizationDescription ? `。${input.civilizationDescription}` : ""}`
      : null,
    input.factionName
      ? `指定势力：${input.factionName}${input.factionDescription ? `。${input.factionDescription}` : ""}`
      : null,
    input.existingNames?.length
      ? `现有角色（避免重复）：${input.existingNames.join("、")}`
      : "现有角色：暂无",
    input.name ? `期望姓名：${input.name}` : null,
    input.role ? `角色定位：${input.role}` : null,
    input.gender ? `性别：${input.gender}` : null,
    input.age ? `年龄：${input.age}` : null,
    input.personality ? `性格提示：${input.personality}` : null,
    input.appearance ? `外貌提示：${input.appearance}` : null,
    input.background ? `背景提示：${input.background}` : null,
    input.goal ? `目标提示：${input.goal}` : null,
    input.motivation ? `动机提示：${input.motivation}` : null,
    input.conflict ? `冲突提示：${input.conflict}` : null,
  ].filter(Boolean);

  const prompt = `用户需求：
${input.prompt.trim()}

生成风格：${style}
详细程度：${detailLevel}

上下文：
${contextLines.join("\n")}

请生成一个完整、可视觉化、能支撑连续剧集的角色 JSON。`;

  return { system, prompt };
}
