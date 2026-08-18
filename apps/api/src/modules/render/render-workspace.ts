import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { resolveLocalAssetStorageRoot } from "../assets/storage-root";

export interface RenderWorkspace {
  root: string;
  inputs: string;
  work: string;
  output: string;
  logs: string;
  outputFile: string;
}

export async function createRenderWorkspace(renderJobId: string): Promise<RenderWorkspace> {
  const root = path.join(resolveRenderTmpRoot(), renderJobId);
  const workspace: RenderWorkspace = {
    root,
    inputs: path.join(root, "inputs"),
    work: path.join(root, "work"),
    output: path.join(root, "output"),
    logs: path.join(root, "logs"),
    outputFile: path.join(root, "output", "episode.mp4"),
  };
  await fs.mkdir(workspace.inputs, { recursive: true });
  await fs.mkdir(workspace.work, { recursive: true });
  await fs.mkdir(workspace.output, { recursive: true });
  await fs.mkdir(workspace.logs, { recursive: true });
  return workspace;
}

export async function cleanupRenderWorkspace(root: string): Promise<void> {
  try {
    await fs.rm(root, { recursive: true, force: true });
  } catch {
    // Windows file locks should not fail the job after output is stored.
  }
}

function resolveRenderTmpRoot(): string {
  const fromEnv = process.env.RENDER_TMP_DIR?.trim();
  if (fromEnv) {
    return path.resolve(fromEnv);
  }
  try {
    return path.join(path.dirname(resolveLocalAssetStorageRoot()), "tmp", "render");
  } catch {
    return path.join(os.tmpdir(), "ai-drama-studio-render");
  }
}
