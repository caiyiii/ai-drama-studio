const args = process.argv.slice(2);
function flag(name: string): string | null {
  const index = args.indexOf(`--${name}`);
  if (index >= 0 && args[index + 1]) {
    return args[index + 1];
  }
  return null;
}

const projectId = flag("project") || "demo-xinghe";
const episodeId = flag("episode") || "demo-ep-01";
const base = process.env.API_BASE || "http://localhost:3011";

const response = await fetch(`${base}/projects/${projectId}/episodes/${episodeId}/render`, {
  method: "POST",
  headers: { Accept: "application/json", "Content-Type": "application/json" },
});
const body = await response.json().catch(() => null);
if (!response.ok) {
  console.error(JSON.stringify(body, null, 2) || `HTTP ${response.status}`);
  process.exit(1);
}
console.log(JSON.stringify(body, null, 2));
console.log("已创建 RenderJob。请轮询 GET /projects/:projectId/render-jobs/:id，不要把 QUEUED 当成成功。");
