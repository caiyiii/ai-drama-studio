import type { StoryContext } from "@ai-drama-studio/types";

export function buildStoryboardGenerationPrompt(input: {
  prompt?: string;
  additionalInstructions?: string;
  context: StoryContext;
}): { system: string; prompt: string } {
  const bible = input.context.storyBible;
  const script = input.context.script;
  const system = `你是一名专业动画导演、分镜师、摄影指导。
任务：把当前 Episode Script 转成可执行 Storyboard。

硬性规则：
1. 只依据当前剧本，不新增主剧情，不改变事件顺序。
2. scriptBlockIds 必须使用上下文给出的真实 id。
3. characterIds 必须使用上下文给出的真实 id。
4. sceneNumber 必须对应当前剧本场景编号。
5. 每个 shot 都要有明确视觉目的。
6. 默认每个 ScriptBlock 只生成 1 个 Shot，只有确实必要时才拆成 2 个 Shot。
7. 所有字符串都写成单行短句，不要换行。
8. 所有字符串里不要出现双引号字符 "。
9. 只输出一个合法 JSON 对象，不要 markdown，不要解释，不要代码围栏。
10. 如果某个可选字段不需要，输出空字符串或空数组，不要输出额外字段。

Storyboard 描述怎么拍，不是复述剧本。`;

  const scenes = (script?.scenes ?? [])
    .map((scene) => {
      const blocks = scene.blocks
        .map(
          (block) =>
            `#${block.order} id=${block.id} ${block.type} ${block.characterName || ""} ${block.content}`,
        )
        .join(" | ");
      return `Scene ${scene.number} id=${scene.id} ${scene.title} @${scene.location || ""} ${scene.timeOfDay || ""}\n${blocks}`;
    })
    .join("\n\n");

  const characters = input.context.characters
    .map(
      (item) =>
        `${item.id}/${item.name}/${item.role || ""}/${item.identity || ""}`,
    )
    .join("；");

  const prompt = `用户要求：${input.prompt?.trim() || "将本集完整剧本转换为可执行分镜"}
附加说明：${input.additionalInstructions?.trim() || "无"}

项目：${input.context.project?.name || ""} / ${input.context.project?.genre || ""}
当前集：E${String(input.context.episode?.number || 0).padStart(2, "0")} ${input.context.episode?.title || ""}
本集大纲：${input.context.episode?.outline || ""}
本集连续性：${input.context.episode?.continuityNotes || "无"}
故事基调：${bible?.tone || ""} / ${bible?.style || ""}
主要人物：${characters || "暂无"}

剧本：${script ? `${script.title} v${script.version} ${script.status}` : "缺失"}
当前剧本场景与段落：
${scenes || "无"}

输出结构：
{
  "storyboard": {
    "title": "string",
    "description": "string",
    "totalDurationSeconds": 0
  },
  "shots": [
    {
      "shotNumber": 1,
      "sceneNumber": 1,
      "scriptBlockIds": ["真实 ScriptBlock id"],
      "shotType": "ESTABLISHING | WIDE | FULL | MEDIUM | MEDIUM_CLOSE_UP | CLOSE_UP | EXTREME_CLOSE_UP | OVER_SHOULDER | POV | TWO_SHOT | INSERT | AERIAL | DYNAMIC",
      "shotSize": "EXTREME_WIDE | WIDE | FULL | MEDIUM | MEDIUM_CLOSE_UP | CLOSE_UP | EXTREME_CLOSE_UP",
      "cameraMovement": "STATIC | PAN | TILT | DOLLY_IN | DOLLY_OUT | TRUCK_LEFT | TRUCK_RIGHT | CRANE_UP | CRANE_DOWN | ZOOM_IN | ZOOM_OUT | HANDHELD | ORBIT | FOLLOW | TRACKING",
      "cameraAngle": "EYE_LEVEL | LOW_ANGLE | HIGH_ANGLE | BIRDS_EYE | WORMS_EYE | DUTCH_ANGLE | OVERHEAD",
      "composition": "string",
      "visualDescription": "string",
      "characterIds": ["真实 Character id"],
      "location": "string",
      "action": "string",
      "dialogue": "",
      "narration": "",
      "direction": "",
      "durationSeconds": 5,
      "transition": "CUT | FADE_IN | FADE_OUT | DISSOLVE | WIPE | MATCH_CUT | SMASH_CUT",
      "lighting": "",
      "mood": "",
      "visualStyle": "",
      "imagePrompt": "string",
      "videoPrompt": "string",
      "negativePrompt": "",
      "continuityNotes": ""
    }
  ]
}

额外要求：
1. shotNumber 必须从 1 连续递增。
2. durationSeconds 必须大于 0。
3. 不要发明人物、场景或 ScriptBlock id。
4. 每个字符串尽量简短，建议不超过 40 个字。
5. 必须重点填好 visualDescription / location / action / imagePrompt / videoPrompt。
6. 其余可选字段如果不必要，直接输出空字符串。
7. 返回前自行检查 JSON 是否能被 JSON.parse 解析。`;
  return { system, prompt };
}
