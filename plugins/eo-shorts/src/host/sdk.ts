import { panelLocalClient } from "../../../../shared/local-client.ts";
import { sdkGeneration } from "../../../../shared/generation-client.js";
import type { Host, HostFs, PanelSdk } from "./types.ts";

/** The panel wrapper initializes this private adapter before any EO component runs. */
export function makeHost(sdk: PanelSdk): Host {
  const client = panelLocalClient(sdk);
  const fs: HostFs = {
    ...client.files,
    unlink: (path) => client.files.rm(path, { force: true }),
  };
  return { sdk, fs, runtime: client.media, environment: client.environment,
    generation: sdkGeneration(sdk), now: () => Date.now() };
}
