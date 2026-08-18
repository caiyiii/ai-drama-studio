export default () => ({
  port: Number(process.env.API_PORT ?? 3011),
  nodeEnv: process.env.NODE_ENV ?? "development",
  databaseUrl: process.env.DATABASE_URL,
  ai: {
    provider: process.env.AI_PROVIDER ?? "OPENAI_COMPATIBLE",
    baseUrl: process.env.AI_BASE_URL ?? "https://api.deepseek.com",
    apiKey: process.env.AI_API_KEY ?? "",
    model: process.env.AI_MODEL ?? "deepseek-chat",
    encryptionKey: process.env.AI_ENCRYPTION_KEY ?? "",
  },
  ffmpegPath: process.env.FFMPEG_PATH ?? "",
  ffprobePath: process.env.FFPROBE_PATH ?? "",
  renderWorkerDisabled: process.env.RENDER_WORKER_DISABLED === "true",
});
