import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const project = await prisma.project.findUnique({
    where: { id: "demo-xinghe" },
  });
  if (!project) {
    throw new Error("未找到项目「星河碰撞」。请先执行 pnpm db:seed:world-demo");
  }

  const episode = await prisma.episode.findUnique({
    where: { id: "demo-ep-01" },
  });
  if (!episode) {
    throw new Error("未找到 Episode 1。请先执行 pnpm db:seed:story-demo");
  }

  const shen = await prisma.character.findUnique({ where: { id: "demo-char-shenxinghe" } });
  const taixu = await prisma.character.findUnique({ where: { id: "demo-char-taixu" } });
  const aer = await prisma.character.findUnique({ where: { id: "demo-char-aer" } });
  if (!shen || !taixu || !aer) {
    throw new Error("未找到沈星河 / 太虚真人 / 艾尔。请先执行 pnpm db:seed:character-demo");
  }

  const script = await prisma.script.upsert({
    where: { episodeId: episode.id },
    update: {
      title: "星系碰撞",
      logline: "星图失效之夜，沈星河第一次看见无法用灵气解释的光芒。",
      summary: "问天宗夜课被星裂打断。太虚真人下令查探。未知信号降落折剑星，艾尔的影子尚未现身。",
      estimatedDurationSeconds: 300,
      status: "READY",
    },
    create: {
      id: "demo-script-ep01",
      projectId: project.id,
      episodeId: episode.id,
      title: "星系碰撞",
      version: 1,
      status: "READY",
      logline: "星图失效之夜，沈星河第一次看见无法用灵气解释的光芒。",
      summary: "问天宗夜课被星裂打断。太虚真人下令查探。未知信号降落折剑星，艾尔的影子尚未现身。",
      estimatedDurationSeconds: 300,
    },
  });

  await prisma.scene.deleteMany({ where: { scriptId: script.id } });

  const scene1 = await prisma.scene.create({
    data: {
      scriptId: script.id,
      number: 1,
      title: "问天宗夜课",
      location: "折剑星·问天宗外门广场",
      timeOfDay: "夜",
      summary: "外门弟子例行夜课，星图突然失效。",
      purpose: "建立日常秩序，并让观众看见沈星河的视角。",
      conflict: "宗门规矩要求继续诵经，天空却已经裂开。",
      estimatedDurationSeconds: 90,
    },
  });
  const scene2 = await prisma.scene.create({
    data: {
      scriptId: script.id,
      number: 2,
      title: "太虚示警",
      location: "问天宗·观星台",
      timeOfDay: "夜",
      summary: "太虚真人感应到轨道被改写，下令沈星河下山查探。",
      purpose: "把灾难从天象推进到人物选择。",
      conflict: "弟子想追问真相，宗门只能先保住人。",
      estimatedDurationSeconds: 100,
    },
  });
  const scene3 = await prisma.scene.create({
    data: {
      scriptId: script.id,
      number: 3,
      title: "未知信号",
      location: "折剑星外围荒原",
      timeOfDay: "黎明前",
      summary: "沈星河追上坠落的光，看见义体残骸与尚未现身的艾尔。",
      purpose: "留下第一集悬念，为第一次接触铺路。",
      conflict: "修仙感知无法解释机械残骸。",
      estimatedDurationSeconds: 110,
    },
  });

  await prisma.scriptBlock.createMany({
    data: [
      {
        sceneId: scene1.id,
        order: 1,
        type: "NARRATION",
        content: "折剑星的夜从来都很安静。直到今晚，星图上的轨道像被一只看不见的手生生拧断。",
      },
      {
        sceneId: scene1.id,
        order: 2,
        type: "ACTION",
        characterId: shen.id,
        content: "沈星河抬头望向天空，瞳孔收缩。手中的木剑差点滑落。",
      },
      {
        sceneId: scene1.id,
        order: 3,
        type: "DIRECTION",
        content: "镜头快速推近他的眼睛，星裂的倒影在瞳孔里拉成一条白线。",
      },
      {
        sceneId: scene1.id,
        order: 4,
        type: "DIALOGUE",
        characterId: shen.id,
        content: "那是什么？",
        metadata: { emotion: "震惊", delivery: "气声" },
      },
      {
        sceneId: scene2.id,
        order: 1,
        type: "ACTION",
        characterId: taixu.id,
        content: "太虚真人踏出观星台，白发被乱流掀起。他一掌按住虚空，禁制却像纸一样碎开。",
      },
      {
        sceneId: scene2.id,
        order: 2,
        type: "DIALOGUE",
        characterId: taixu.id,
        content: "星轨被人改写了。不是天灾。",
        metadata: { emotion: "凝重" },
      },
      {
        sceneId: scene2.id,
        order: 3,
        type: "DIALOGUE",
        characterId: shen.id,
        content: "师父，我去看。",
      },
      {
        sceneId: scene2.id,
        order: 4,
        type: "DIRECTION",
        content: "俯拍观星台，宗门灯火在星裂下显得极小。",
      },
      {
        sceneId: scene2.id,
        order: 5,
        type: "NARRATION",
        content: "太虚真人没有阻止。有些真相，必须由还愿意抬头的人去碰。",
      },
      {
        sceneId: scene3.id,
        order: 1,
        type: "ACTION",
        characterId: shen.id,
        content: "沈星河冲过荒原。坠落的光在地面砸出焦黑深坑，坑底有一截还在闪烁的义体残臂。",
      },
      {
        sceneId: scene3.id,
        order: 2,
        type: "DIRECTION",
        content: "特写残臂内侧的星环议会徽记，再切到沈星河握紧木剑的手指。",
      },
      {
        sceneId: scene3.id,
        order: 3,
        type: "DIALOGUE",
        characterId: shen.id,
        content: "这不是灵器……这是什么人？",
      },
      {
        sceneId: scene3.id,
        order: 4,
        type: "NARRATION",
        content: "风停了一息。坑外的阴影里，艾尔尚未开口，但她的观察记录已经开始。",
      },
      {
        sceneId: scene3.id,
        order: 5,
        type: "DIALOGUE",
        characterId: aer.id,
        content: "接触记录，启动。",
        metadata: { emotion: "冷静", voiceStyle: "电子轻声" },
      },
    ],
  });

  await prisma.episode.update({
    where: { id: episode.id },
    data: {
      status: episode.status === "COMPLETED" || episode.status === "ARCHIVED"
        ? episode.status
        : "SCRIPTING",
      durationSeconds: episode.durationSeconds ?? 300,
    },
  });

  console.log("已为「星河碰撞」Season 1 Episode 1 写入 Demo Script。");
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
