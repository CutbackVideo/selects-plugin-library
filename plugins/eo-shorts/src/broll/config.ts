import DEFAULT_CONFIG from "../../config/config.json" with { type: "json" };
import type { HostFs } from "../host/types.ts";
import { readJsonIfExists } from "../host/fs.ts";
import { PLUGIN_VERSION } from "../identity.ts";

export interface CommonsConfig {
  contact: string;
  apiUrl: string;
  searchLimit: number;
  thumbWidth: number;
  minWidth: number;
  maxJudged: number;
}

const DEFAULTS = (DEFAULT_CONFIG as { commons: CommonsConfig }).commons;

export function commonsConfig(override: Partial<CommonsConfig> = {}): CommonsConfig {
  const c = { ...DEFAULTS, ...Object.fromEntries(Object.entries(override).filter(([, v]) => v !== undefined && v !== null)) } as CommonsConfig;
  return {
    contact: String(c.contact ?? "").trim(),
    apiUrl: String(c.apiUrl),
    searchLimit: Math.max(1, Math.min(50, Number(c.searchLimit) || 20)),
    thumbWidth: Math.max(320, Math.min(4096, Number(c.thumbWidth) || 1600)),
    minWidth: Math.max(1, Number(c.minWidth) || 600),
    maxJudged: Math.max(1, Math.min(8, Number(c.maxJudged) || 4)),
  };
}

export async function loadCommonsConfig(fs: HostFs, dataRoot: string): Promise<CommonsConfig> {
  const file = await readJsonIfExists<{ commons?: Partial<CommonsConfig> } | null>(fs, fs.join(dataRoot, "config", "config.json"), null);
  return commonsConfig(file?.commons ?? {});
}

export function commonsUserAgent(c: CommonsConfig, version: string = PLUGIN_VERSION): string {
  if (!c.contact) throw new Error("config.json commons.contact is empty: Wikimedia asks every client for a contact.");
  return "EOShorts/" + version + " (" + c.contact + ")";
}
