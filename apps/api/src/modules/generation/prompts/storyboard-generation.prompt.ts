import type { StoryContext } from "@ai-drama-studio/types";

export function buildStoryboardGenerationPrompt(input: {
  prompt?: string;
  additionalInstructions?: string;
  context: StoryContext;
  retryReason?: string;
  focusSceneNumber?: number;
}): { system: string; prompt: string } {
  const bible = input.context.storyBible;
  const script = input.context.script;
  const focusSceneNumber = input.focusSceneNumber;
  const system = `你是一名专业动画导演、分镜师、摄影指导。
任务：把当前 Episode Script 的指定场景转成可执行 Storyboard shots。

输出硬性规则：
1. Return ONLY valid JSON.
2. Do not use Markdown.
3. Do not use \`\`\`json.
4. Do not add explanations.
5. Do not add comments.
6. Do not add fields outside the requested schema.
7. All strings must be valid JSON strings. If a string needs quotes, escape them as \\" .
8. All arrays and objects must be properly closed.
9. No trailing commas.
10. Keep every string short (preferably under 40 Chinese characters).
11. Prefer compact JSON. Do not invent filler text.

业务硬性规则：
1. 只依据当前场景剧本，不新增主剧情，不改变事件顺序。
2. scriptBlockIds 必须使用上下文给出的真实 id。
3. characterIds 必须使用上下文给出的真实 id。
4. sceneNumber 必须等于当前指定场景编号。
5. 每个关键 ScriptBlock 至少对应 1 个 Shot；可合并次要段落，单场景最多 8 个 Shot。
6. 每个 Shot 必须有明确视觉目的。
7. Storyboard 描述怎么拍，不是复述剧本。`;

  const scenes = (script?.scenes ?? [])
    .filter((scene) =>
      typeof focusSceneNumber === "number"
        ? scene.number === focusSceneNumber
        : true,
    )
    .map((scene) => {
      const blocks = scene.blocks
        .map((block) => {
          const content = compactText(block.content, 80);
          return `#${block.order} id=${block.id} ${block.type} ${block.characterName || ""} ${content}`;
        })
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

  const locations = (input.context.locations ?? [])
    .slice(0, 12)
    .map((item) => `${item.name}:${compactText(item.description || "", 40)}`)
    .join("；");

  const retryBlock = input.retryReason
    ? `RETRY REQUIRED:
Your previous response was invalid: ${input.retryReason}

Return the same requested storyboard data again.
Return ONLY valid JSON.
Do not include markdown.
Do not include explanations.
Make sure all objects and arrays are properly closed.
Make sure all strings are valid JSON strings.
Do not add fields outside the requested schema.
Prefer fewer shots and shorter strings so the JSON stays complete.

`
    : "";

  const sceneScope =
    typeof focusSceneNumber === "number"
      ? `只生成 Scene ${focusSceneNumber} 的 shots。不要输出其他场景。`
      : "生成本集全部场景的 shots。";

  const prompt = `${retryBlock}用户要求：${input.prompt?.trim() || "将本集完整剧本转换为可执行分镜"}
附加说明：${input.additionalInstructions?.trim() || "无"}
场景范围：${sceneScope}

项目：${input.context.project?.name || ""} / ${input.context.project?.genre || ""}
当前集：E${String(input.context.episode?.number || 0).padStart(2, "0")} ${input.context.episode?.title || ""}
本集大纲：${compactText(input.context.episode?.outline || "", 160)}
本集连续性：${compactText(input.context.episode?.continuityNotes || "无", 120)}
故事基调：${bible?.tone || ""} / ${bible?.style || ""}
主要人物：${characters || "暂无"}
相关地点：${locations || "暂无"}

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
      "sceneNumber": ${typeof focusSceneNumber === "number" ? focusSceneNumber : 1},
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
      "transition": "CUT",
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
1. 本响应内 shotNumber 从 1 开始连续递增。
2. durationSeconds 必须大于 0。
3. 不要发明人物、场景或 ScriptBlock id。
4. 必须重点填好 visualDescription / location / action / imagePrompt / videoPrompt。
5. 其余可选字段如果不必要，直接输出空字符串。
6. 单场景最多 8 个 Shot。
7. 返回前自行检查 JSON 是否完整且可被 JSON.parse 解析。`;
  return { system, prompt };
}

function compactText(value: string, max: number): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= max) {
    return normalized;
  }
  return `${normalized.slice(0, max - 1)}…`;
}
