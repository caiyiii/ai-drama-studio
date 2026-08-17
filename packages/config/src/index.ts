export const API_DEFAULT_PORT = 3011;
export const API_DEFAULT_BASE_URL = `http://localhost:${API_DEFAULT_PORT}`;
export const WEB_DEV_ORIGIN = "http://localhost:3010";

export const BREAKPOINTS = {
  mobileMax: 767,
  tabletMin: 768,
  tabletMax: 1199,
  desktopMin: 1200,
} as const;

export const WORKSPACE_NAV = [
  { key: "overview", label: "项目概览", short: "览", path: "", step: null },
  { key: "world", label: "世界观", short: "界", path: "world", step: "WORLD" },
  { key: "characters", label: "人物", short: "人", path: "characters", step: "CHARACTERS" },
  { key: "story-bible", label: "故事圣经", short: "经", path: "story-bible", step: null },
  { key: "locations", label: "场景", short: "场", path: "locations", step: "LOCATIONS" },
  { key: "seasons", label: "季", short: "季", path: "seasons", step: "EPISODES" },
  { key: "episodes", label: "剧集", short: "集", path: "episodes", step: null },
  { key: "script", label: "剧本", short: "本", path: "script", step: "SCRIPT" },
  {
    key: "storyboard",
    label: "分镜",
    short: "镜",
    path: "storyboard",
    step: "STORYBOARD",
  },
  { key: "images", label: "图片", short: "图", path: "images", step: "IMAGES" },
  { key: "videos", label: "视频", short: "影", path: "videos", step: "VIDEOS" },
  { key: "voices", label: "配音", short: "音", path: "voices", step: "VOICES" },
  { key: "render", label: "成片", short: "片", path: "render", step: "RENDER" },
  { key: "assets", label: "素材", short: "材", path: "assets", step: null },
  { key: "settings", label: "设置", short: "设", path: "settings", step: null },
] as const;

export const MOBILE_TAB_NAV = [
  { key: "home", label: "首页", path: "/home" },
  { key: "projects", label: "项目", path: "/projects" },
  { key: "tasks", label: "任务", path: "/tasks" },
  { key: "assets", label: "素材", path: "/assets" },
  { key: "me", label: "我的", path: "/me" },
] as const;

export const WORLD_NAV = [
  { key: "overview", label: "世界概览" },
  { key: "cosmic", label: "宇宙背景" },
  { key: "civilizations", label: "文明体系" },
  { key: "power", label: "能力体系" },
  { key: "history", label: "历史" },
  { key: "factions", label: "势力" },
  { key: "locations", label: "地点" },
  { key: "conflict", label: "核心冲突" },
] as const;

export const FACTION_TYPES = [
  "帝国",
  "教团",
  "商会",
  "联盟",
  "军团",
  "隐秘组织",
  "其他",
] as const;

export const WORLD_LOCATION_TYPES = [
  "星球",
  "城市",
  "秘境",
  "战场",
  "空间站",
  "遗迹",
  "其他",
] as const;

export const WORLD_GENERATION_STYLES = [
  "史诗",
  "克制",
  "黑暗",
  "奇幻",
  "硬科幻",
] as const;

export const WORLD_GENERATION_DETAIL_LEVELS = ["简要", "标准", "详尽"] as const;

export const AI_PROVIDER_KINDS = [
  "OPENAI_COMPATIBLE",
  "OPENAI",
  "DEEPSEEK",
  "QWEN",
  "GEMINI",
  "CLAUDE",
] as const;

export const CHARACTER_GENDERS = ["男", "女", "非二元", "未知"] as const;

export const CHARACTER_ROLES = [
  "主角",
  "第二主角",
  "配角",
  "反派",
  "导师",
  "盟友",
  "神秘人物",
  "其他",
] as const;

export const CHARACTER_RELATION_STRENGTHS = [1, 2, 3, 4, 5] as const;

export const CHARACTER_GENERATION_STYLES = [
  "东方玄幻",
  "赛博朋克",
  "科幻",
  "现代",
  "其他",
] as const;

export const CHARACTER_GENERATION_DETAIL_LEVELS = [
  "LOW",
  "MEDIUM",
  "HIGH",
] as const;

export const AI_CAPABILITY_DEFINITIONS = [
  { capability: "CHAT", label: "故事 / 文本生成", implemented: true },
  { capability: "STRUCTURED_OUTPUT", label: "结构化生成", implemented: true },
  { capability: "IMAGE", label: "图片生成", implemented: true },
  { capability: "VIDEO", label: "视频生成", implemented: true },
  { capability: "IMAGE_TO_VIDEO", label: "图片转视频", implemented: true },
  { capability: "TTS", label: "语音生成", implemented: false },
  { capability: "VOICE_CLONE", label: "声音克隆", implemented: false },
  { capability: "MUSIC", label: "音乐生成", implemented: false },
  { capability: "EMBEDDING", label: "向量 Embedding", implemented: false },
] as const;

export type AiCapabilityId = (typeof AI_CAPABILITY_DEFINITIONS)[number]["capability"];

export const IMPLEMENTED_AI_CAPABILITIES = AI_CAPABILITY_DEFINITIONS.filter(
  (item) => item.implemented,
).map((item) => item.capability);

export const OPENAI_COMPATIBLE_CAPABILITIES = [
  "CHAT",
  "STRUCTURED_OUTPUT",
  "IMAGE",
  "VIDEO",
  "IMAGE_TO_VIDEO",
] as const satisfies readonly AiCapabilityId[];
