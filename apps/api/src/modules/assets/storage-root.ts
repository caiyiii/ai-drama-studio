import fs from "node:fs";
import path from "node:path";

export function resolveLocalAssetStorageRoot(): string {
  const fromEnv = process.env.ASSET_STORAGE_DIR?.trim();
  if (fromEnv) {
    return path.resolve(fromEnv);
  }
  let dir = process.cwd();
  for (let i = 0; i < 6; i += 1) {
    if (fs.existsSync(path.join(dir, "pnpm-workspace.yaml"))) {
      return path.join(dir, "storage");
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      break;
    }
    dir = parent;
  }
  return path.resolve(process.cwd(), "storage");
}
