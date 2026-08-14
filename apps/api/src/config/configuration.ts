export default () => ({
  port: Number(process.env.API_PORT ?? 3001),
  databaseUrl: process.env.DATABASE_URL,
});
