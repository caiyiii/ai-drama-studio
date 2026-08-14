import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.upsert({
    where: { email: "studio@local" },
    update: {},
    create: {
      email: "studio@local",
      name: "Local Studio",
    },
  });

  const project = await prisma.project.upsert({
    where: { id: "demo-xinghe" },
    update: {},
    create: {
      id: "demo-xinghe",
      name: "星河碰撞",
      description:
        "两个星系因宇宙碰撞发生文明接触，两个文明发现彼此选择了完全不同的生存与发展道路。",
      genre: "科幻",
      userId: user.id,
    },
  });

  const world = await prisma.world.upsert({
    where: { projectId: project.id },
    update: {},
    create: {
      projectId: project.id,
      title: "星河碰撞",
      summary: "一场无法回避的星系相撞，把两条完全相反的文明道路推到了同一片星空。",
      cosmicBackground:
        "两个原本相隔亿万光年的星系被一场宇宙尺度的轨道扰动强行拉近。空间褶皱撕裂了旧有的星图，两套物理常识开始在接触带互相干扰。",
      coreConflict:
        "两个星系因宇宙碰撞发生文明接触，两个文明发现彼此选择了完全不同的生存与发展道路。",
    },
  });

  await prisma.civilization.deleteMany({ where: { worldId: world.id } });
  await prisma.worldHistory.deleteMany({ where: { worldId: world.id } });
  await prisma.faction.deleteMany({ where: { worldId: world.id } });
  await prisma.worldLocation.deleteMany({ where: { worldId: world.id } });
  await prisma.powerSystem.deleteMany({ where: { worldId: world.id } });

  const xianxia = await prisma.civilization.create({
    data: {
      worldId: world.id,
      name: "修仙文明",
      description: "以个体修炼突破寿命与物质极限的文明。",
      origin: "在资源稀薄的内圈星域，生命学会把自身当作炼器炉鼎。",
      philosophy: "问心、问天、问长生。",
      society: "宗门与散修并存，以境界决定话语权。",
      culture: "诗、剑、丹、符构成日常与战争。",
      technology: "拒绝大规模机械，但能炼制星舟与禁制。",
    },
  });

  const cyber = await prisma.civilization.create({
    data: {
      worldId: world.id,
      name: "赛博科技文明",
      description: "以集体工程和外置智能扩张生存边界的文明。",
      origin: "母星生态崩溃后，他们把意识迁入城市与星舰。",
      philosophy: "可计算的才是可信任的。",
      society: "公司联邦与协议议会共同治理。",
      culture: "数据、义体、虚拟神殿。",
      technology: "纳米、跃迁、意识备份。",
    },
  });

  await prisma.worldHistory.createMany({
    data: [
      {
        worldId: world.id,
        title: "星系碰撞",
        description: "两套星图在同一夜同时失效。",
        order: 0,
      },
      {
        worldId: world.id,
        title: "文明首次接触",
        description: "修士看见了会说话的星舰，工程师看见了会飞的人。",
        order: 1,
      },
      {
        worldId: world.id,
        title: "第一次战争",
        description: "双方都把对方的生存方式当成污染。",
        order: 2,
      },
      {
        worldId: world.id,
        title: "文明融合",
        description: "接触带出现第一座同时供奉丹炉与服务器的城市。",
        order: 3,
      },
    ],
  });

  await prisma.faction.createMany({
    data: [
      {
        worldId: world.id,
        civilizationId: xianxia.id,
        name: "问天宗",
        type: "教团",
        description: "主张以心证道，反对把修炼交给义体。",
      },
      {
        worldId: world.id,
        civilizationId: cyber.id,
        name: "星环议会",
        type: "联盟",
        description: "试图用协议把修仙者编入可审计网络。",
      },
    ],
  });

  await prisma.worldLocation.createMany({
    data: [
      {
        worldId: world.id,
        civilizationId: xianxia.id,
        name: "折剑星",
        type: "星球",
        description: "修仙文明的母星，云海中藏着宗门。",
      },
      {
        worldId: world.id,
        civilizationId: cyber.id,
        name: "环城",
        type: "空间站",
        description: "赛博文明的首都，昼夜都在编译。",
      },
    ],
  });

  await prisma.powerSystem.create({
    data: {
      worldId: world.id,
      name: "修仙体系",
      description: "以灵气淬炼肉身与神识。",
      rules: ["越阶战斗会反噬神识", "心魔比外敌更危险"],
      levels: [
        { name: "炼气", description: "感应灵气" },
        { name: "筑基", description: "凝练灵台" },
        { name: "金丹", description: "一念成丹" },
        { name: "元婴", description: "神识可离体" },
      ],
    },
  });
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
