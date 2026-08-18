import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function requireCount(
  label: string,
  count: number,
  command: string,
) {
  if (count <= 0) {
    throw new Error(`${label}。请先执行：\n${command}`);
  }
}

async function main() {
  const project = await prisma.project.findUnique({
    where: { id: "demo-xinghe" },
  });
  if (!project) {
    throw new Error(
      "未找到项目「星河碰撞」。请先执行：\npnpm db:seed:script-demo\npnpm db:seed:storyboard-demo\npnpm db:seed:image-demo\npnpm db:seed:video-demo\npnpm db:seed:tts-demo\npnpm db:seed:music-sfx-demo",
    );
  }
  const episode = await prisma.episode.findUnique({ where: { id: "demo-ep-01" } });
  if (!episode || episode.projectId !== project.id) {
    throw new Error("未找到 E01。请先执行：\npnpm db:seed:story-demo");
  }

  const storyboard = await prisma.storyboard.findUnique({
    where: { episodeId: episode.id },
    include: {
      shots: {
        orderBy: { shotNumber: "asc" },
        include: { shotAssets: { include: { asset: true } } },
      },
    },
  });
  if (!storyboard) {
    throw new Error("未找到 E01 分镜。请先执行：\npnpm db:seed:storyboard-demo");
  }

  const script = await prisma.script.findUnique({
    where: { episodeId: episode.id },
    include: {
      scenes: {
        orderBy: { number: "asc" },
        include: {
          blocks: {
            orderBy: { order: "asc" },
            include: { blockAssets: { include: { asset: true } } },
          },
        },
      },
    },
  });
  if (!script) {
    throw new Error("未找到 E01 剧本。请先执行：\npnpm db:seed:script-demo");
  }

  const videoShots = storyboard.shots.filter((shot) =>
    shot.shotAssets.some(
      (item) => item.asset.type === "VIDEO" && item.role === "FINAL" && item.asset.status === "READY",
    ),
  );
  const imageShots = storyboard.shots.filter((shot) =>
    shot.shotAssets.some(
      (item) => item.asset.type === "IMAGE" && item.role === "FINAL" && item.asset.status === "READY",
    ),
  );
  requireCount("未找到 Shot Video Asset", videoShots.length, "pnpm db:seed:video-demo");
  requireCount("未找到 Shot Image Asset", imageShots.length, "pnpm db:seed:image-demo");

  const dialogues = script.scenes
    .flatMap((scene) => scene.blocks)
    .filter((block) => block.type === "DIALOGUE")
    .filter((block) =>
      block.blockAssets.some(
        (item) => item.asset.type === "AUDIO" && item.role === "FINAL" && item.asset.status === "READY",
      ),
    );
  requireCount("未找到 Dialogue TTS Asset", dialogues.length, "pnpm db:seed:tts-demo");

  const music = await prisma.episodeAudioAsset.findFirst({
    where: { episodeId: episode.id, role: "MUSIC", isPrimary: true },
    include: { asset: true },
  });
  if (!music || music.asset.projectId !== project.id) {
    throw new Error("未找到 E01 主音乐。请先执行：\npnpm db:seed:music-sfx-demo");
  }
  const sfxRows = await prisma.episodeAudioAsset.findMany({
    where: { episodeId: episode.id, role: "SFX" },
    include: { asset: true },
    orderBy: { sortOrder: "asc" },
  });
  requireCount("未找到 SFX Asset", sfxRows.length, "pnpm db:seed:music-sfx-demo");

  const shotTimes: Array<{ id: string; sceneId: string | null; start: number; duration: number }> = [];
  let cursor = 0;
  for (const shot of storyboard.shots) {
    shotTimes.push({
      id: shot.id,
      sceneId: shot.sceneId,
      start: cursor,
      duration: shot.durationSeconds,
    });
    cursor += shot.durationSeconds;
  }

  const sfxTargets = sfxRows.slice(0, 3);
  if (sfxTargets[0] && shotTimes[0]) {
    await prisma.episodeAudioAsset.update({
      where: { id: sfxTargets[0].id },
      data: {
        metadata: {
          ...(typeof sfxTargets[0].metadata === "object" && sfxTargets[0].metadata && !Array.isArray(sfxTargets[0].metadata)
            ? sfxTargets[0].metadata
            : {}),
          shotId: shotTimes[0].id,
        },
      },
    });
  }
  if (sfxTargets[1] && shotTimes[1]) {
    await prisma.episodeAudioAsset.update({
      where: { id: sfxTargets[1].id },
      data: {
        metadata: {
          ...(typeof sfxTargets[1].metadata === "object" && sfxTargets[1].metadata && !Array.isArray(sfxTargets[1].metadata)
            ? sfxTargets[1].metadata
            : {}),
          sceneId: shotTimes[1].sceneId,
        },
      },
    });
  }

  const existing = await prisma.episodeTimeline.findUnique({
    where: { episodeId: episode.id },
  });
  if (existing) {
    await prisma.timelineTrack.deleteMany({ where: { timelineId: existing.id } });
  }

  const timeline = await prisma.episodeTimeline.upsert({
    where: { episodeId: episode.id },
    update: {
      status: "PREVIEW_READY",
      durationSeconds: cursor,
      fps: 24,
      resolution: "1920x1080",
      aspectRatio: "16:9",
      sourceStoryboardVersion: storyboard.version,
      sourceScriptVersion: script.version,
      sourceAssetVersionSummary: {
        fingerprint: "seed",
        visualAssetCount: 6,
        dialogueAssetCount: 3,
        musicAssetCount: 1,
        sfxAssetCount: 3,
      },
      metadata: {
        demo: true,
        missingVisualAsset: [],
        missingDialogueAudio: [],
        missingMusicAsset: false,
        missingSfxAsset: false,
      },
    },
    create: {
      id: "demo-timeline-ep01",
      projectId: project.id,
      episodeId: episode.id,
      version: 1,
      status: "PREVIEW_READY",
      durationSeconds: cursor,
      fps: 24,
      resolution: "1920x1080",
      aspectRatio: "16:9",
      sourceStoryboardVersion: storyboard.version,
      sourceScriptVersion: script.version,
      sourceAssetVersionSummary: {
        fingerprint: "seed",
      },
      metadata: {
        demo: true,
        missingVisualAsset: [],
        missingDialogueAudio: [],
        missingMusicAsset: false,
        missingSfxAsset: false,
      },
    },
  });

  const tracks = await Promise.all(
    [
      { type: "VIDEO" as const, name: "VIDEO", order: 0 },
      { type: "IMAGE" as const, name: "IMAGE", order: 1 },
      { type: "DIALOGUE" as const, name: "VOICE", order: 2 },
      { type: "MUSIC" as const, name: "MUSIC", order: 3 },
      { type: "SFX" as const, name: "SFX", order: 4 },
    ].map((track) =>
      prisma.timelineTrack.create({
        data: {
          timelineId: timeline.id,
          type: track.type,
          name: track.name,
          order: track.order,
          volume: 1,
        },
      }),
    ),
  );
  const byType = Object.fromEntries(tracks.map((track) => [track.type, track]));

  const videoClips = videoShots.slice(0, 3).map((shot) => {
    const asset = shot.shotAssets.find((item) => item.asset.type === "VIDEO" && item.role === "FINAL")!.asset;
    const time = shotTimes.find((item) => item.id === shot.id)!;
    return {
      trackId: byType.VIDEO.id,
      type: "VIDEO" as const,
      sourceType: "STORYBOARD_SHOT" as const,
      sourceId: shot.id,
      assetId: asset.id,
      startTime: time.start,
      duration: time.duration,
      sourceStartTime: 0,
      sourceDuration: time.duration,
      zIndex: 2,
    };
  });
  const imageClips = imageShots.slice(0, 3).map((shot) => {
    const asset = shot.shotAssets.find((item) => item.asset.type === "IMAGE" && item.role === "FINAL")!.asset;
    const time = shotTimes.find((item) => item.id === shot.id)!;
    return {
      trackId: byType.IMAGE.id,
      type: "IMAGE" as const,
      sourceType: "STORYBOARD_SHOT" as const,
      sourceId: shot.id,
      assetId: asset.id,
      startTime: time.start,
      duration: time.duration,
      sourceStartTime: 0,
      sourceDuration: time.duration,
      zIndex: 1,
    };
  });
  const dialogueClips = dialogues.slice(0, 3).map((block, index) => {
    const asset = block.blockAssets.find((item) => item.asset.type === "AUDIO" && item.role === "FINAL")!.asset;
    const related = shotTimes.find((shot, shotIndex) => shotIndex === index) ?? shotTimes[0];
    const duration = asset.durationSeconds && asset.durationSeconds > 0 ? asset.durationSeconds : 1;
    return {
      trackId: byType.DIALOGUE.id,
      type: "AUDIO" as const,
      sourceType: "SCRIPT_BLOCK" as const,
      sourceId: block.id,
      assetId: asset.id,
      startTime: related?.start ?? 0,
      duration,
      sourceStartTime: 0,
      sourceDuration: duration,
      zIndex: 0,
    };
  });
  const musicDuration = Math.min(
    music.asset.durationSeconds && music.asset.durationSeconds > 0 ? music.asset.durationSeconds : cursor,
    cursor || music.asset.durationSeconds || 1,
  );
  const musicClip = {
    trackId: byType.MUSIC.id,
    type: "AUDIO" as const,
    sourceType: "EPISODE_AUDIO" as const,
    sourceId: music.id,
    assetId: music.assetId,
    startTime: 0,
    duration: musicDuration,
    sourceStartTime: 0,
    sourceDuration: musicDuration,
    zIndex: 0,
  };
  const sfxClips = sfxTargets.map((row, index) => {
    const time = shotTimes[index];
    const duration = row.asset.durationSeconds && row.asset.durationSeconds > 0 ? row.asset.durationSeconds : 1;
    return {
      trackId: byType.SFX.id,
      type: "AUDIO" as const,
      sourceType: "EPISODE_AUDIO" as const,
      sourceId: row.id,
      assetId: row.assetId,
      startTime: time?.start ?? 0,
      duration,
      sourceStartTime: 0,
      sourceDuration: duration,
      zIndex: 0,
    };
  });

  await prisma.timelineClip.createMany({
    data: [...videoClips, ...imageClips, ...dialogueClips, musicClip, ...sfxClips],
  });

  const clipCount =
    videoClips.length + imageClips.length + dialogueClips.length + 1 + sfxClips.length;
  console.log(
    `已为「星河碰撞」E01 写入 Timeline Demo：5 条轨道、${clipCount} 个 Clips（真实引用现有 Asset，未调用 AI / 未导出 MP4）。`,
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
