import fs from "node:fs";
import path from "node:path";

const dir = path.join(process.cwd(), "dist", "esm");
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(
  path.join(dir, "package.json"),
  `${JSON.stringify({ type: "module" })}\n`,
);
