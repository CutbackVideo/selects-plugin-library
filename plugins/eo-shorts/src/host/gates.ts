import type { PanelSdk } from "./types.ts";
import { FS_METHODS, RUNTIME_METHODS, hostPlatform, hostVersion, missingMethods } from "./di.ts";

export const MIN_APP_VERSION = "2.0.511";
export const PLUGIN_FILES_VERSION = "2.0.512";

export function versionBelow(version: string, minimum: string): boolean {
  const a = String(version || "0").split(".").map((x) => parseInt(x, 10) || 0);
  const b = String(minimum).split(".").map((x) => parseInt(x, 10) || 0);
  for (let i = 0; i < Math.max(a.length, b.length, 3); i += 1) {
    if ((a[i] || 0) !== (b[i] || 0)) return (a[i] || 0) < (b[i] || 0);
  }
  return false;
}

export type Capabilities = {
  version: string;
  platform: string;
  versionOk: boolean;
  fsMissing: string[];
  runtimeMissing: string[];
  mediaGeneration: { present: boolean; pluginFiles: boolean | null };
  stockSearch: boolean;
  canAuthorGeneratedMedia: boolean | null;
  askAI: boolean;
};

export async function readCapabilities(sdk: PanelSdk, di: Record<string, any> | null, versionOverride?: string): Promise<Capabilities> {
  const version = versionOverride ?? hostVersion(di);
  const mg = di?.MediaGeneration;
  let pluginFiles: boolean | null = null;
  if (mg && typeof mg.supportsPluginFiles === "function") {
    try {
      pluginFiles = !!(await mg.supportsPluginFiles());
    } catch {
      pluginFiles = null;
    }
  } else if (mg) pluginFiles = false;
  if (pluginFiles && version && versionBelow(version, PLUGIN_FILES_VERSION)) pluginFiles = false;
  let canAuthor: boolean | null = null;
  if (typeof sdk.call === "function") {
    try {
      canAuthor = !!(await sdk.call("canAuthorGeneratedMedia"));
    } catch {
      canAuthor = null;
    }
  }
  const stock = di?.StockMediaSearch;
  return {
    version,
    platform: hostPlatform(di),
    versionOk: !version || !versionBelow(version, MIN_APP_VERSION),
    fsMissing: missingMethods("FileSystem", FS_METHODS, di),
    runtimeMissing: missingMethods("Runtime", RUNTIME_METHODS, di),
    mediaGeneration: { present: !!(mg && typeof mg.submit === "function"), pluginFiles },
    stockSearch: !!(stock && typeof stock.searchVideos === "function"),
    canAuthorGeneratedMedia: canAuthor,
    askAI: typeof sdk.askAI === "function",
  };
}
