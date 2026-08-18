import fs from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PLACEHOLDER_WAV = Buffer.from(
  "524946462400000057415645666d742010000000010001004400000088000000020010006461746100000000",
  "hex",
);

async function writePlaceholder(
  projectId: string,
  assetId: string,
  stem: "music" | "sfx",
) {
  const storageKey = `assets/${projectId}/${assetId}/${stem}.wav`;
  const full = path.join(process.cwd(), "storage", storageKey);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, PLACEHOLDER_WAV);
  return {
    storageKey,
    url: `/projects/${projectId}/assets/${assetId}/file`,
    sizeBytes: PLACEHOLDER_WAV.byteLength,
  };
}

async function upsertAudio(input: {
  id: string;
  name: string;
  role: "MUSIC" | "SFX";
  durationSeconds: number;
  metadata: Record<string, unknown>;
  projectId: string;
  episodeId: string;
  taskId: string;
  stem: "music" | "sfx";
  sortOrder: number;
  isPrimary: boolean;
}) {
  const file = await writePlaceholder(input.projectId, input.id, input.stem);
  await prisma.generationTask.upsert({
    where: { id: input.taskId },
    update: {
      status: "SUCCEEDED",
      capability: input.role,
      provider: "demo-placeholder",
      model: "placeholder",
      appliedAt: new Date(),
      input: { episodeId: input.episodeId, prompt: input.name },
      output: {
        assetType: "AUDIO",
        audioType: input.role,
        mimeType: "audio/wav",
        durationSeconds: input.durationSeconds,
      },
      usage: { durationMs: 0, audioDurationSeconds: input.durationSeconds },
    },
    create: {
      id: input.taskId,
      projectId: input.projectId,
      type: input.role,
      status: "SUCCEEDED",
      capability: input.role,
      provider: "demo-placeholder",
      model: "placeholder",
      appliedAt: new Date(),
      input: { episodeId: input.episodeId, prompt: input.name },
      output: {
        assetType: "AUDIO",
        audioType: input.role,
        mimeType: "audio/wav",
        durationSeconds: input.durationSeconds,
      },
      usage: { durationMs: 0, audioDurationSeconds: input.durationSeconds },
    },
  });
  await prisma.asset.upsert({
    where: { id: input.id },
    update: {
      name: input.name,
      status: "READY",
      mimeType: "audio/wav",
      storageKey: file.storageKey,
      url: file.url,
      durationSeconds: input.durationSeconds,
      sizeBytes: file.sizeBytes,
      provider: "demo-placeholder",
      model: "placeholder",
      version: 1,
      generationTaskId: input.taskId,
      metadata: input.metadata,
    },
    create: {
      id: input.id,
      projectId: input.projectId,
      type: "AUDIO",
      status: "READY",
      name: input.name,
      mimeType: "audio/wav",
      storageKey: file.storageKey,
      url: file.url,
      durationSeconds: input.durationSeconds,
      sizeBytes: file.sizeBytes,
      provider: "demo-placeholder",
      model: "placeholder",
      version: 1,
      generationTaskId: input.taskId,
      metadata: input.metadata,
    },
  });
  if (input.isPrimary) {
    await prisma.episodeAudioAsset.updateMany({
      where: {
        episodeId: input.episodeId,
        role: input.role,
        isPrimary: true,
      },
      data: { isPrimary: false },
    });
  }
  await prisma.episodeAudioAsset.upsert({
    where: {
      episodeId_assetId: { episodeId: input.episodeId, assetId: input.id },
    },
    update: {
      role: input.role,
      isPrimary: input.isPrimary,
      sortOrder: input.sortOrder,
      metadata: input.metadata,
    },
    create: {
      episodeId: input.episodeId,
      assetId: input.id,
      role: input.role,
      isPrimary: input.isPrimary,
      sortOrder: input.sortOrder,
      metadata: input.metadata,
    },
  });
}

async function main() {
  const project = await prisma.project.findUnique({
    where: { id: "demo-xinghe" },
  });
  if (!project) {
    throw new Error("未找到项目「星河碰撞」。请先执行 pnpm db:seed:story-demo");
  }
  const episode = await prisma.episode.findUnique({
    where: { id: "demo-ep-01" },
  });
  if (!episode || episode.projectId !== project.id) {
    throw new Error("未找到 E01。请先执行 pnpm db:seed:story-demo");
  }

  const common = {
    projectId: project.id,
    episodeId: episode.id,
  };
  await upsertAudio({
    ...common,
    id: "demo-music-first-contact",
    taskId: "demo-music-task-1",
    name: "First Contact Theme",
    role: "MUSIC",
    stem: "music",
    durationSeconds: 30,
    sortOrder: 0,
    isPrimary: true,
    metadata: {
      type: "music",
      demo: true,
      source: "seed",
      style: "cinematic",
      mood: "mysterious",
    },
  });
  await upsertAudio({
    ...common,
    id: "demo-music-cyber-cultivation",
    taskId: "demo-music-task-2",
    name: "Cyber Cultivation Theme",
    role: "MUSIC",
    stem: "music",
    durationSeconds: 28,
    sortOrder: 1,
    isPrimary: false,
    metadata: {
      type: "music",
      demo: true,
      source: "seed",
      style: "synth",
      mood: "hope",
    },
  });
  const sfx = [
    { id: "demo-sfx-spaceship-impact", name: "Spaceship Impact", category: "impact" },
    { id: "demo-sfx-energy-explosion", name: "Energy Explosion", category: "explosion" },
    { id: "demo-sfx-mechanical-core", name: "Mechanical Core", category: "mechanical" },
    { id: "demo-sfx-sword-draw", name: "Sword Draw", category: "weapon" },
  ];
  for (const [index, item] of sfx.entries()) {
    await upsertAudio({
      ...common,
      id: item.id,
      taskId: `demo-sfx-task-${index + 1}`,
      name: item.name,
      role: "SFX",
      stem: "sfx",
      durationSeconds: 1.5,
      sortOrder: index,
      isPrimary: index === 0,
      metadata: {
        type: "sfx",
        demo: true,
        source: "seed",
        category: item.category,
      },
    });
  }

  console.log(
    "已为「星河碰撞」E01 写入 2 个 Music Asset 与 4 个 SFX Asset（本地 fixture，未调用 AI）。",
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
