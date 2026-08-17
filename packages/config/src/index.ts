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
  {
    key: "characters",
    label: "人物",
    short: "人",
    path: "characters",
    step: "CHARACTERS",
  },
  {
    key: "locations",
    label: "场景",
    short: "场",
    path: "locations",
    step: "LOCATIONS",
  },
  { key: "episodes", label: "剧集", short: "集", path: "episodes", step: "EPISODES" },
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
