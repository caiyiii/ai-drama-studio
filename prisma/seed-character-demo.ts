import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const project = await prisma.project.findUnique({
    where: { id: "demo-xinghe" },
  });
  if (!project) {
    throw new Error("未找到项目「星河碰撞」。请先执行 pnpm db:seed:world-demo");
  }

  const world = await prisma.world.findUnique({
    where: { projectId: project.id },
  });
  if (!world) {
    throw new Error("未找到「星河碰撞」世界观。请先执行 pnpm db:seed:world-demo");
  }

  const xianxia = await prisma.civilization.findFirst({
    where: { worldId: world.id, name: "修仙文明" },
  });
  const cyber = await prisma.civilization.findFirst({
    where: { worldId: world.id, name: "赛博科技文明" },
  });
  const wentianzong = await prisma.faction.findFirst({
    where: { worldId: world.id, name: "问天宗" },
  });
  const xinghuan = await prisma.faction.findFirst({
    where: { worldId: world.id, name: "星环议会" },
  });

  const shenxinghe = await prisma.character.upsert({
    where: { id: "demo-char-shenxinghe" },
    update: {
      worldId: world.id,
      civilizationId: xianxia?.id ?? null,
      factionId: wentianzong?.id ?? null,
    },
    create: {
      id: "demo-char-shenxinghe",
      projectId: project.id,
      worldId: world.id,
      civilizationId: xianxia?.id ?? null,
      factionId: wentianzong?.id ?? null,
      name: "沈星河",
      alias: "星河",
      gender: "男",
      age: 19,
      race: "人族",
      identity: "问天宗外门弟子",
      role: "主角",
      personality: "隐忍、锋锐、不服输",
      appearance: "青衫，左眼有浅淡星纹",
      background: "星系碰撞后被卷入修仙文明，在折剑星问天宗修行。",
      goal: "查清星河碰撞的源头",
      motivation: "守护折剑星上仍未逃离的普通人",
      conflict: "修炼与科技无法共存的信仰撕裂",
      ability: "星河剑意",
    },
  });

  const taixu = await prisma.character.upsert({
    where: { id: "demo-char-taixu" },
    update: {
      worldId: world.id,
      civilizationId: xianxia?.id ?? null,
      factionId: wentianzong?.id ?? null,
    },
    create: {
      id: "demo-char-taixu",
      projectId: project.id,
      worldId: world.id,
      civilizationId: xianxia?.id ?? null,
      factionId: wentianzong?.id ?? null,
      name: "太虚真人",
      alias: "太虚",
      gender: "男",
      age: 312,
      race: "人族",
      identity: "问天宗长老",
      role: "导师",
      personality: "克制、严厉、护短",
      appearance: "白发束冠，常持旧剑",
      background: "经历过第一次文明接触的修士。",
      goal: "保住问天宗的心证传统",
      motivation: "不愿弟子被义体改写命运",
      conflict: "知道科技能救人，却更怕它改人",
      ability: "问心剑阵",
    },
  });

  const aer = await prisma.character.upsert({
    where: { id: "demo-char-aer" },
    update: {
      worldId: world.id,
      civilizationId: cyber?.id ?? null,
      factionId: xinghuan?.id ?? null,
    },
    create: {
      id: "demo-char-aer",
      projectId: project.id,
      worldId: world.id,
      civilizationId: cyber?.id ?? null,
      factionId: xinghuan?.id ?? null,
      name: "艾尔",
      alias: "AER",
      gender: "女",
      age: 24,
      race: "义体人",
      identity: "星环议会观察员",
      role: "配角",
      personality: "冷静、好奇、协议优先",
      appearance: "银白义体纹路，左耳有数据坠",
      background: "被派往接触带，记录无法计算的修仙现象。",
      goal: "把修仙编入可审计协议",
      motivation: "证明不可计算之物仍可被理解",
      conflict: "越靠近沈星河，越无法把对方当成数据",
      ability: "协议解析、短距跃迁",
    },
  });

  await prisma.characterRelationship.deleteMany({
    where: {
      projectId: project.id,
      OR: [
        { fromCharacterId: { in: [shenxinghe.id, taixu.id, aer.id] } },
        { toCharacterId: { in: [shenxinghe.id, taixu.id, aer.id] } },
      ],
    },
  });

  await prisma.characterRelationship.createMany({
    data: [
      {
        projectId: project.id,
        fromCharacterId: shenxinghe.id,
        toCharacterId: taixu.id,
        type: "MASTER",
        label: "师徒",
        description: "太虚真人收沈星河入门，以心证道。",
        strength: 5,
      },
      {
        projectId: project.id,
        fromCharacterId: shenxinghe.id,
        toCharacterId: aer.id,
        type: "RIVAL",
        label: "宿敌",
        description: "两条文明道路在两人之间正面相撞。",
        strength: 4,
      },
      {
        projectId: project.id,
        fromCharacterId: taixu.id,
        toCharacterId: aer.id,
        type: "UNKNOWN",
        label: "未知",
        description: "太虚真人尚无法判断这个赛博观察员的立场。",
        strength: 2,
      },
    ],
  });

  console.log("Character demo seed completed: 沈星河 / 太虚真人 / 艾尔");
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
