import type { StoryContext } from "@ai-drama-studio/types";

export function buildSeasonOutlinePrompt(input: {
  mode: "INITIAL" | "CONTINUE" | "REPLAN";
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
  const existingEpisodes = input.context.episodes
    .map((item) => `E${String(item.number).padStart(2, "0")} ${item.title}: ${item.synopsis || ""}`)
    .join("\n");
  const maxEpisodeNumber = input.context.episodes.reduce(
    (max, item) => Math.max(max, item.number || 0),
    0,
  );
  const modeInstruction =
    input.mode === "INITIAL"
      ? "当前用于首次规划整季。请从 E01 开始生成新的剧集规划。"
      : input.mode === "CONTINUE"
        ? `当前用于继续规划后续剧集。已有剧集必须保留，不得重写。请只生成新增剧集，且集数必须从 E${String(maxEpisodeNumber + 1).padStart(2, "0")} 开始连续编号。`
        : `当前用于重新规划整季。你可以重新提出整季结构，但输出的 newEpisodes 仍然只能是建议新增或替换的规划结果，不要把 existingEpisodes 当成待写入内容。`;
  const prompt = `拆成 ${input.episodeCount} 集，目标单集时长 ${input.targetDurationSeconds} 秒。
规划模式：${input.mode}
${modeInstruction}
附加要求：${input.instruction?.trim() || "无"}

Story Bible：${bible?.title || "未创建"} / ${bible?.logline || ""}
主题：${bible?.theme || ""} 基调：${bible?.tone || ""}
世界：${input.context.world?.title || ""} 核心冲突：${input.context.world?.coreConflict || ""}
人物：${input.context.characters.map((item) => `${item.name}:${item.goal || ""}`).join("；") || "暂无"}
当前季：第${input.context.season?.number || "?"}季 ${input.context.season?.title || ""}
季简介：${input.context.season?.synopsis || ""}
季大纲：${input.context.season?.outline || ""}
已有剧集：
${existingEpisodes || "暂无"}

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
  "existingEpisodes": [
    {
      "number": 1,
      "title": "string",
      "synopsis": "string"
    }
  ],
  "newEpisodes": [
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
