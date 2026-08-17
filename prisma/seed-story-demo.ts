import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const project = await prisma.project.findUnique({
    where: { id: "demo-xinghe" },
  });
  if (!project) {
    throw new Error("未找到项目「星河碰撞」。请先执行 pnpm db:seed:world-demo");
  }

  await prisma.storyBible.upsert({
    where: { projectId: project.id },
    update: {},
    create: {
      id: "demo-story-bible",
      projectId: project.id,
      title: "星河碰撞",
      logline: "两星系被强行拉近，修仙与赛博必须选择共存或毁灭。",
      premise: "碰撞不是天灾，而是有人改写了星轨，把两种互斥文明推到同一条命运线上。",
      theme: "文明冲突与共存",
      tone: "史诗",
      style: "科幻修仙",
      audience: "青年向短剧观众",
      storyPromise: "用五分钟一集的节奏，看见两种文明第一次真正接触。",
      rules: {
        worldRules: ["灵气与义体互斥", "不要把 Story Bible 写成世界观副本"],
        characterRules: ["沈星河是视角人物，但不能全知"],
        narrativeRules: ["每集必须留下未解线索", "上一集 Story State 必须影响下一集"],
        forbidden: ["不要瞬间统一两种文明", "不要无故让角色越境"],
      },
      timelineSummary: "第一季覆盖碰撞发生后的三十日：接触、误判、临时结盟。",
      continuityNotes: "人物状态、地点与未解线索必须按 Episode.storyState 延续。",
    },
  });

  const season = await prisma.season.upsert({
    where: {
      projectId_number: {
        projectId: project.id,
        number: 1,
      },
    },
    update: {
      title: "星河初遇",
      synopsis: "碰撞撕开旧星图，修仙文明与赛博文明第一次看见彼此。",
      outline:
        "开篇以星图失效建立灾难感，中段完成第一次接触与误判，收束于临时盟友和更大的未知舰队。",
      status: "PLANNING",
    },
    create: {
      id: "demo-season-1",
      projectId: project.id,
      number: 1,
      title: "星河初遇",
      synopsis: "碰撞撕开旧星图，修仙文明与赛博文明第一次看见彼此。",
      outline:
        "开篇以星图失效建立灾难感，中段完成第一次接触与误判，收束于临时盟友和更大的未知舰队。",
      status: "PLANNING",
    },
  });

  const episodes = [
    {
      id: "demo-ep-01",
      number: 1,
      title: "星系碰撞",
      synopsis: "星轨被改写，折剑星夜空裂开，沈星河第一次看见无法用灵气解释的光芒。",
      outline: "以问天宗夜课被星光打断开场，以未知信号降落作为收束。",
      storyState: {
        characters: [
          {
            characterId: "demo-char-shenxinghe",
            name: "沈星河",
            state: "炼气三层",
            location: "折剑星",
            condition: "healthy",
            goal: "查清星图为何失效",
          },
        ],
        worldChanges: ["星图失效"],
        unresolvedThreads: ["谁改写了星轨"],
        revealedSecrets: [],
        foreshadowing: ["义体舰队的影子"],
      },
    },
    {
      id: "demo-ep-02",
      number: 2,
      title: "第一次接触",
      synopsis: "艾尔坠落折剑星。两种文明第一次近距离看见彼此。",
      outline: "沈星河救下受伤的观察员，却无法判断她是敌人还是信使。",
      storyState: {
        characters: [
          {
            characterId: "demo-char-shenxinghe",
            name: "沈星河",
            state: "炼气三层",
            location: "折剑星外围",
            goal: "确认外来者意图",
          },
          {
            characterId: "demo-char-aer",
            name: "艾尔",
            state: "义体受损",
            location: "折剑星",
            goal: "完成接触记录",
          },
        ],
        unresolvedThreads: ["艾尔的真实任务", "宗门是否会处决外来者"],
        foreshadowing: ["太虚真人已经感应到异动"],
      },
    },
    {
      id: "demo-ep-03",
      number: 3,
      title: "临时盟友",
      synopsis: "太虚真人介入。共同面对第三股力量，双方结成极不稳定的盟约。",
      outline: "问天宗、星环议会观察员与未知舰队形成三角对峙。",
      storyState: {
        characters: [
          {
            characterId: "demo-char-shenxinghe",
            name: "沈星河",
            location: "问天宗",
            goal: "保住临时盟约",
          },
          {
            characterId: "demo-char-taixu",
            name: "太虚真人",
            location: "问天宗",
            goal: "保住心证传统",
          },
          {
            characterId: "demo-char-aer",
            name: "艾尔",
            location: "问天宗",
            goal: "把修仙编入可审计协议",
          },
        ],
        unresolvedThreads: ["临时盟约能维持多久", "第三股力量是谁"],
        foreshadowing: ["议会舰队即将抵达"],
      },
    },
  ];

  for (const item of episodes) {
    await prisma.episode.upsert({
      where: {
        seasonId_number: {
          seasonId: season.id,
          number: item.number,
        },
      },
      update: {
        projectId: project.id,
        seasonId: season.id,
        number: item.number,
        order: item.number,
        title: item.title,
        synopsis: item.synopsis,
        outline: item.outline,
        status: "OUTLINED",
        durationSeconds: 300,
        storyState: item.storyState,
      },
      create: {
        id: item.id,
        projectId: project.id,
        seasonId: season.id,
        number: item.number,
        order: item.number,
        title: item.title,
        synopsis: item.synopsis,
        outline: item.outline,
        status: "OUTLINED",
        durationSeconds: 300,
        storyState: item.storyState,
      },
    });
  }

  console.log("Story demo seed completed: Story Bible / Season 1 星河初遇 / E01-E03");
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
