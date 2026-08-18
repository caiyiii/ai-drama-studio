import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const project = await prisma.project.findUnique({ where: { id: "demo-xinghe" } });
  if (!project) {
    throw new Error(
      "未找到项目「星河碰撞」。请先执行 Phase 13 上游 seed：\npnpm db:seed:script-demo\npnpm db:seed:storyboard-demo\npnpm db:seed:image-demo\npnpm db:seed:video-demo\npnpm db:seed:tts-demo\npnpm db:seed:music-sfx-demo\npnpm db:seed:timeline-demo",
    );
  }
  const episode = await prisma.episode.findUnique({ where: { id: "demo-ep-01" } });
  if (!episode || episode.projectId !== project.id) {
    throw new Error("未找到 E01。请先执行：\npnpm db:seed:story-demo\npnpm db:seed:timeline-demo");
  }

  const script = await prisma.script.findUnique({ where: { episodeId: episode.id } });
  const storyboard = await prisma.storyboard.findUnique({ where: { episodeId: episode.id } });
  const assetCount = await prisma.asset.count({ where: { projectId: project.id } });
  if (!script || !storyboard || assetCount <= 0) {
    throw new Error(
      "上游 Script / Storyboard / Asset 不存在。请先执行 Phase 13 上游 seed，不要 reset 数据库。",
    );
  }

  const timeline = await prisma.episodeTimeline.findUnique({ where: { episodeId: episode.id } });
  if (!timeline) {
    throw new Error("未找到 E01 Timeline。请先执行：\npnpm db:seed:timeline-demo");
  }

  if (timeline.status !== "LOCKED") {
    await prisma.episodeTimeline.update({
      where: { id: timeline.id },
      data: { status: "LOCKED" },
    });
    console.log(`已将 E01 Timeline ${timeline.id} 锁定为 LOCKED（version ${timeline.version}）。`);
  } else {
    console.log(`E01 Timeline 已是 LOCKED（version ${timeline.version}）。`);
  }

  console.log(
    [
      "Render Demo 准备完成。没有写入假 MP4 / 假 RenderArtifact。",
      "下一步：确认已安装 FFmpeg，然后：",
      "1) pnpm render:check",
      "2) 启动 API 后 POST /projects/demo-xinghe/episodes/demo-ep-01/render",
      "   或 pnpm render:episode -- --project demo-xinghe --episode demo-ep-01",
    ].join("\n"),
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
