import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const counts = {
    Project: await prisma.project.count(),
    World: await prisma.world.count(),
    Character: await prisma.character.count(),
    Season: await prisma.season.count(),
    Episode: await prisma.episode.count(),
    Provider: await prisma.aiProvider.count(),
    GenerationTask: await prisma.generationTask.count(),
    Script: await prisma.script.count(),
    Storyboard: await prisma.storyboard.count(),
    Asset: await prisma.asset.count(),
    EpisodeTimeline: await prisma.episodeTimeline.count(),
    RenderJob: await prisma.renderJob.count(),
    RenderArtifact: await prisma.renderArtifact.count(),
  };
  console.log(JSON.stringify(counts, null, 2));
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
