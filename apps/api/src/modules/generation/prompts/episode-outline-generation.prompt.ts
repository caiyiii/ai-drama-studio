import type { StoryContext } from "@ai-drama-studio/types";

export function buildEpisodeOutlinePrompt(input: {
  instruction?: string;
  context: StoryContext;
}): { system: string; prompt: string } {
  const system = `你是专业的 AI 漫剧单集大纲作者。
生成的是 Episode Outline，不是完整剧本，不要写逐句对白。
必须承接上一集 Story State，并输出本集结束时的新状态。
只输出 JSON。`;
  const previous = input.context.previousEpisode;
  const episode = input.context.episode;
  const prompt = `附加要求：${input.instruction?.trim() || "无"}
当前集：E${String(episode?.number || 0).padStart(2, "0")} ${episode?.title || ""}
当前简介：${episode?.synopsis || ""}
季：${input.context.season?.title || ""} ${input.context.season?.synopsis || ""}
Story Bible：${input.context.storyBible?.logline || ""}
世界冲突：${input.context.world?.coreConflict || ""}
人物：${input.context.characters.map((item) => item.name).join("、")}
上一集：${previous ? `E${String(previous.number).padStart(2, "0")} ${previous.title}` : "无"}
上一集状态：${previous?.storyState ? JSON.stringify(previous.storyState) : "无"}

输出结构：
{
  "title": "string",
  "synopsis": "string",
  "outline": "string",
  "opening": "string",
  "middle": "string",
  "ending": "string",
  "cliffhanger": "string",
  "keyCharacters": ["string"],
  "keyLocations": ["string"],
  "conflict": "string",
  "storyState": {
    "characters": [],
    "worldChanges": [],
    "unresolvedThreads": [],
    "revealedSecrets": [],
    "foreshadowing": []
  }
}`;
  return { system, prompt };
}
