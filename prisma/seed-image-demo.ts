import fs from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PLACEHOLDER_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

async function writePlaceholder(projectId: string, assetId: string) {
  const storageKey = `assets/${projectId}/${assetId}/original.png`;
  const full = path.join(process.cwd(), "storage", storageKey);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, PLACEHOLDER_PNG);
  return {
    storageKey,
    url: `/projects/${projectId}/assets/${assetId}/file`,
    sizeBytes: PLACEHOLDER_PNG.byteLength,
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
    const assetId = `demo-image-ep01-s${String(shot.shotNumber).padStart(2, "0")}`;
    const file = await writePlaceholder(project.id, assetId);
    await prisma.asset.upsert({
      where: { id: assetId },
      update: {
        name: `E01 Shot ${shot.shotNumber} placeholder`,
        status: "READY",
        mimeType: "image/png",
        storageKey: file.storageKey,
        url: file.url,
        width: 1,
        height: 1,
        sizeBytes: file.sizeBytes,
        provider: "demo-placeholder",
        model: "placeholder",
        version: 1,
        metadata: {
          source: "seed-image-demo",
          shotId: shot.id,
          note: "本地 placeholder，未调用真实 AI",
        },
      },
      create: {
        id: assetId,
        projectId: project.id,
        type: "IMAGE",
        status: "READY",
        name: `E01 Shot ${shot.shotNumber} placeholder`,
        mimeType: "image/png",
        storageKey: file.storageKey,
        url: file.url,
        width: 1,
        height: 1,
        sizeBytes: file.sizeBytes,
        provider: "demo-placeholder",
        model: "placeholder",
        version: 1,
        metadata: {
          source: "seed-image-demo",
          shotId: shot.id,
          note: "本地 placeholder，未调用真实 AI",
        },
      },
    });
    await prisma.storyboardShotAsset.upsert({
      where: {
        shotId_assetId: { shotId: shot.id, assetId },
      },
      update: {
        role: "FINAL",
        isPrimary: true,
        sortOrder: 0,
      },
      create: {
        shotId: shot.id,
        assetId,
        role: "FINAL",
        isPrimary: true,
        sortOrder: 0,
      },
    });
  }

  console.log(
    `已为「星河碰撞」E01 写入 ${targets.length} 张 Demo 图片 Asset（本地 placeholder，未调用 AI）。`,
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
