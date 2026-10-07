import type { Host } from "./types.ts";

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

export async function readCapabilities(host: Host, versionOverride?: string): Promise<Capabilities> {
  const sdk = host.sdk;
  const version = versionOverride ?? host.environment?.version ?? "";
  let generation = false;
  try {
    const response = await sdk.runScript({ summary: "Check generation support", script: 'return typeof selects.generation.submit === "function";' });
    generation = !response.isError && response.result === true;
  } catch {}
  let canAuthor: boolean | null = null;
  try { if (sdk.call) canAuthor = !!await sdk.call("canAuthorGeneratedMedia"); } catch {}
  return { version, platform: host.environment?.platform ?? "", versionOk: true,
    fsMissing: [], runtimeMissing: host.runtime ? [] : ["media.startFFmpeg"],
    mediaGeneration: { present: generation, pluginFiles: generation },
    stockSearch: typeof sdk.runScript === "function", canAuthorGeneratedMedia: canAuthor,
    askAI: typeof sdk.askAI === "function" };
}
