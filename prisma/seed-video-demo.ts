import fs from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Minimal ISO BMFF fixture. Demo placeholder, not a real AI generation.
const PLACEHOLDER_MP4 = Buffer.from(
  "000000186674797069736F6D0000000169736F6D61766331000000086D646174",
  "hex",
);

async function writePlaceholder(projectId: string, assetId: string) {
  const storageKey = `assets/${projectId}/${assetId}/video.mp4`;
  const full = path.join(process.cwd(), "storage", storageKey);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, PLACEHOLDER_MP4);
  return {
    storageKey,
    url: `/projects/${projectId}/assets/${assetId}/file`,
    sizeBytes: PLACEHOLDER_MP4.byteLength,
  };
}

async function main() {
  const project = await prisma.project.findUnique({
    where: { id: "demo-xinghe" },
  });
  if (!project) {
    throw new Error("未找到项目「星河碰撞」。请先执行 pnpm db:seed:world-demo");
  }

  const storyboard = await prisma.storyboard.findUnique({
    where: { episodeId: "demo-ep-01" },
    include: { shots: { orderBy: { shotNumber: "asc" } } },
  });
  if (!storyboard || storyboard.shots.length === 0) {
    throw new Error("未找到 E01 分镜。请先执行 pnpm db:seed:storyboard-demo");
  }

  const targets = storyboard.shots.slice(0, 3);
  for (const shot of targets) {
    const assetId = `demo-video-ep01-s${String(shot.shotNumber).padStart(2, "0")}`;
    const file = await writePlaceholder(project.id, assetId);
    await prisma.asset.upsert({
      where: { id: assetId },
      update: {
        name: `E01 Shot ${shot.shotNumber} demo video`,
        status: "READY",
        mimeType: "video/mp4",
        storageKey: file.storageKey,
        url: file.url,
        width: 1280,
        height: 720,
        durationSeconds: shot.durationSeconds,
        sizeBytes: file.sizeBytes,
        provider: "demo-placeholder",
        model: "placeholder",
        version: 1,
        metadata: {
          demo: true,
          source: "seed",
          shotId: shot.id,
          note: "本地 fixture，未调用真实 AI",
        },
      },
      create: {
        id: assetId,
        projectId: project.id,
        type: "VIDEO",
        status: "READY",
        name: `E01 Shot ${shot.shotNumber} demo video`,
        mimeType: "video/mp4",
        storageKey: file.storageKey,
        url: file.url,
        width: 1280,
        height: 720,
        durationSeconds: shot.durationSeconds,
        sizeBytes: file.sizeBytes,
        provider: "demo-placeholder",
        model: "placeholder",
        version: 1,
        metadata: {
          demo: true,
          source: "seed",
          shotId: shot.id,
          note: "本地 fixture，未调用真实 AI",
        },
      },
    });
    await prisma.storyboardShotAsset.updateMany({
      where: {
        shotId: shot.id,
        isPrimary: true,
        asset: { type: "VIDEO" },
      },
      data: { isPrimary: false },
    });
    await prisma.storyboardShotAsset.upsert({
      where: {
        shotId_assetId: { shotId: shot.id, assetId },
      },
      update: {
        role: "FINAL",
        isPrimary: true,
        sortOrder: 100,
      },
      create: {
        shotId: shot.id,
        assetId,
        role: "FINAL",
        isPrimary: true,
        sortOrder: 100,
      },
    });
  }

  console.log(
    `已为「星河碰撞」E01 写入 ${targets.length} 个 Demo 视频 Asset（本地 fixture，未调用 AI）。`,
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
