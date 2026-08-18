import fs from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Minimal RIFF/WAVE fixture. Demo placeholder, not a real AI generation.
const PLACEHOLDER_WAV = Buffer.from(
  "524946462400000057415645666d742010000000010001004400000088000000020010006461746100000000",
  "hex",
);

async function writePlaceholder(projectId: string, assetId: string) {
  const storageKey = `assets/${projectId}/${assetId}/audio.wav`;
  const full = path.join(process.cwd(), "storage", storageKey);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, PLACEHOLDER_WAV);
  return {
    storageKey,
    url: `/projects/${projectId}/assets/${assetId}/file`,
    sizeBytes: PLACEHOLDER_WAV.byteLength,
  };
}

async function main() {
  const project = await prisma.project.findUnique({
    where: { id: "demo-xinghe" },
  });
  if (!project) {
    throw new Error("未找到项目「星河碰撞」。请先执行 pnpm db:seed:world-demo");
  }

  const script = await prisma.script.findUnique({
    where: { episodeId: "demo-ep-01" },
    include: {
      scenes: {
        include: {
          blocks: { orderBy: { order: "asc" } },
        },
      },
    },
  });
  if (!script || script.scenes.length === 0) {
    throw new Error("未找到 E01 剧本。请先执行 pnpm db:seed:script-demo");
  }

  const dialogues = script.scenes
    .flatMap((scene) => scene.blocks)
    .filter((block) => block.type === "DIALOGUE")
    .slice(0, 3);
  if (dialogues.length === 0) {
    throw new Error("E01 剧本没有对白。请先执行 pnpm db:seed:script-demo");
  }

  const shen = await prisma.character.findUnique({
    where: { id: "demo-char-shenxinghe" },
  });
  if (shen) {
    await prisma.character.update({
      where: { id: shen.id },
      data: {
        voiceProfile: {
          voiceId: "xinghe-calm",
          language: "zh-CN",
          style: "calm",
          speed: 1,
          pitch: 0,
        },
      },
    });
  }

  let index = 0;
  for (const block of dialogues) {
    index += 1;
    const assetId = `demo-tts-ep01-d${String(index).padStart(2, "0")}`;
    const file = await writePlaceholder(project.id, assetId);
    const task = await prisma.generationTask.upsert({
      where: { id: `demo-tts-task-${index}` },
      update: {
        status: "SUCCEEDED",
        capability: "TTS",
        provider: "demo-placeholder",
        model: "placeholder",
        appliedAt: new Date(),
        input: {
          episodeId: "demo-ep-01",
          scriptBlockId: block.id,
          text: block.content,
          voiceId: "xinghe-calm",
        },
        output: {
          mimeType: "audio/wav",
          format: "wav",
          voice: "xinghe-calm",
        },
        usage: { durationMs: 0, characterCount: block.content.length },
      },
      create: {
        id: `demo-tts-task-${index}`,
        projectId: project.id,
        type: "TTS",
        status: "SUCCEEDED",
        capability: "TTS",
        provider: "demo-placeholder",
        model: "placeholder",
        appliedAt: new Date(),
        input: {
          episodeId: "demo-ep-01",
          scriptBlockId: block.id,
          text: block.content,
          voiceId: "xinghe-calm",
        },
        output: {
          mimeType: "audio/wav",
          format: "wav",
          voice: "xinghe-calm",
        },
        usage: { durationMs: 0, characterCount: block.content.length },
      },
    });
    await prisma.asset.upsert({
      where: { id: assetId },
      update: {
        name: `E01 Dialogue ${index} demo audio`,
        status: "READY",
        mimeType: "audio/wav",
        storageKey: file.storageKey,
        url: file.url,
        durationSeconds: 1,
        sizeBytes: file.sizeBytes,
        provider: "demo-placeholder",
        model: "placeholder",
        version: 1,
        generationTaskId: task.id,
        metadata: {
          demo: true,
          source: "seed",
          scriptBlockId: block.id,
          voiceId: "xinghe-calm",
          note: "本地 fixture，未调用真实 AI",
        },
      },
      create: {
        id: assetId,
        projectId: project.id,
        type: "AUDIO",
        status: "READY",
        name: `E01 Dialogue ${index} demo audio`,
        mimeType: "audio/wav",
        storageKey: file.storageKey,
        url: file.url,
        durationSeconds: 1,
        sizeBytes: file.sizeBytes,
        provider: "demo-placeholder",
        model: "placeholder",
        version: 1,
        generationTaskId: task.id,
        metadata: {
          demo: true,
          source: "seed",
          scriptBlockId: block.id,
          voiceId: "xinghe-calm",
          note: "本地 fixture，未调用真实 AI",
        },
      },
    });
    await prisma.scriptBlockAsset.updateMany({
      where: {
        scriptBlockId: block.id,
        isPrimary: true,
        asset: { type: "AUDIO" },
      },
      data: { isPrimary: false },
    });
    await prisma.scriptBlockAsset.upsert({
      where: {
        scriptBlockId_assetId: { scriptBlockId: block.id, assetId },
      },
      update: {
        role: "FINAL",
        isPrimary: true,
        sortOrder: 100,
      },
      create: {
        scriptBlockId: block.id,
        assetId,
        role: "FINAL",
        isPrimary: true,
        sortOrder: 100,
      },
    });
  }

  console.log(
    `已为「星河碰撞」E01 写入 ${dialogues.length} 个 Demo 语音 Asset（本地 fixture，未调用 AI）。`,
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
