import type { StoryContext } from "@ai-drama-studio/types";

export function buildStoryboardGenerationPrompt(input: {
  prompt?: string;
  additionalInstructions?: string;
  context: StoryContext;
}): { system: string; prompt: string } {
  const bible = input.context.storyBible;
  const script = input.context.script;
  const system = `你是一名专业动画导演、分镜师、摄影指导。
根据 Story Bible、World、Characters、Episode、Script，将完整剧本转换为可执行 Storyboard。
必须：
1. 不改变原故事
2. 不新增未经剧本支持的主要剧情
3. 不改变角色关系
4. 不改变角色身份
5. 不随意改变场景地点
6. 不随意修改对白
7. 不删除关键对白
8. 不改变事件顺序
9. 可以将一个 ScriptBlock 拆成多个 Shot
10. 每个 Shot 必须有明确视觉目的
11. 必须考虑镜头连续性、人物位置连续性、视线方向与镜头轴线
12. 必须考虑景别变化，避免连续镜头全部使用同一种景别
13. 对关键剧情使用视觉强化
14. 对对白设计适合口型与镜头的构图
15. 为未来 Image Generation 生成 imagePrompt
16. 为未来 Video Generation 生成 videoPrompt
Storyboard 描述如何拍，而不是复述剧本。
scriptBlockIds 必须使用上下文中给出的真实 ScriptBlock id。
characterIds 必须使用上下文中给出的真实 Character id。
sceneNumber 必须对应剧本中的场景编号。
只输出 JSON，不要 markdown。`;

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
        `${item.id}/${item.name}/${item.role || ""}/${item.identity || ""}/外观:${item.appearance || item.visualSummary || ""}/能力:${item.abilities || ""}/目标:${item.goal || ""}/冲突:${item.conflict || ""}`,
    )
    .join("；");

  const prompt = `项目：${input.context.project?.name || ""} ${input.context.project?.genre || ""}
${input.context.project?.description || ""}
用户要求：${input.prompt?.trim() || "将本集完整剧本转换为可执行分镜"}
附加说明：${input.additionalInstructions?.trim() || "无"}

Story Bible：
一句话：${bible?.logline || ""}
前提：${bible?.premise || ""}
主题：${bible?.theme || ""}
基调：${bible?.tone || ""}
风格：${bible?.style || ""}
故事承诺：${bible?.storyPromise || ""}
规则：${bible?.rules ? JSON.stringify(bible.rules) : ""}
连续性：${bible?.continuityNotes || ""}

世界：${input.context.world?.title || ""} ${input.context.world?.summary || ""}
宇宙背景：${input.context.world?.cosmicBackground || ""}
核心冲突：${input.context.world?.coreConflict || ""}

人物：${characters || "暂无"}

季：第${input.context.season?.number || "?"}季 ${input.context.season?.title || ""} ${input.context.season?.synopsis || ""}
当前集：E${String(input.context.episode?.number || 0).padStart(2, "0")} ${input.context.episode?.title || ""}
大纲：${input.context.episode?.outline || ""}
本集状态：${input.context.episode?.storyState ? JSON.stringify(input.context.episode.storyState) : "无"}
本集连续性：${input.context.episode?.continuityNotes || "无"}
上一集：${input.context.previousEpisode ? `E${String(input.context.previousEpisode.number).padStart(2, "0")} ${input.context.previousEpisode.title}` : "无"}
上一集状态：${input.context.previousEpisode?.storyState ? JSON.stringify(input.context.previousEpisode.storyState) : "无"}
上一集连续性：${input.context.previousEpisode?.continuityNotes || "无"}

剧本：${script ? `${script.title} v${script.version} ${script.status}` : "缺失"}
Scenes / ScriptBlocks：
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
      "dialogue": "string",
      "narration": "string",
      "direction": "string",
      "durationSeconds": 5,
      "transition": "CUT | FADE_IN | FADE_OUT | DISSOLVE | WIPE | MATCH_CUT | SMASH_CUT",
      "lighting": "string",
      "mood": "string",
      "visualStyle": "string",
      "imagePrompt": "string",
      "videoPrompt": "string",
      "negativePrompt": "string",
      "continuityNotes": "string"
    }
  ]
}

shotNumber 必须从 1 连续递增。durationSeconds 必须大于 0。不要发明人物、场景或 ScriptBlock id。`;
  return { system, prompt };
}
