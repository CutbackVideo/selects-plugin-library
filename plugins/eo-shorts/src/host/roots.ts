import type { HostFs } from "./types.ts";
import { PLUGIN_ID } from "../identity.ts";
import { ensureDir } from "./fs.ts";

export type PluginRoots = {
  home: string;
  skills: string;
  panel: string;
  data: string;
  config: string;
  cache: string;
  runtime: string;
  jobs: string;
};

export function pluginRoots(fs: HostFs, id = PLUGIN_ID): PluginRoots {
  const home = fs.homedir();
  const sel = fs.join(home, ".selects");
  const data = fs.join(sel, "plugin-data", id);
  return {
    home,
    skills: fs.join(sel, "skills", id),
    panel: fs.join(sel, "panels", id),
    data,
    config: fs.join(data, "config"),
    cache: fs.join(data, "cache"),
    runtime: fs.join(data, "runtime"),
    jobs: fs.join(data, "jobs"),
  };
}

export async function ensureDataRoots(fs: HostFs, roots: PluginRoots): Promise<PluginRoots> {
  for (const dir of [roots.data, roots.config, roots.cache, roots.runtime, roots.jobs]) (await ensureDir(fs, dir));
  return roots;
}

export async function installedPackage(fs: HostFs, roots: PluginRoots): Promise<string | null> {
  try {
    return (await fs.exists(fs.join(roots.skills, "plugin.json"))) ? roots.skills : null;
  } catch {
    return null;
  }
}
