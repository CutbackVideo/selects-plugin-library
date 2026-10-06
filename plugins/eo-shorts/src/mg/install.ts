import type { HostFs, PanelSdk } from "../host/types.ts";
import { writeFileAtomic, writeJsonAtomic } from "../host/fs.ts";
import { readScript, runScript, type RunScriptOptions } from "../host/runScript.ts";
import { installStateScript, type DraftGuard } from "./installScript.ts";
import { packageReceipt, type PartPackage, type ScenePackage } from "./packageScene.ts";

export type InstalledPart = {
  label: string;
  reused: boolean;
  removed: string[];
  placed: { clipId: number; start: number; end: number } | null;
  commitId: string | null;
  attempts: number;
  recoveredBy: "verify" | null;
  ms: number;
};

type StateAnswer = { placed: boolean; duplicates: number; stale: string[] };

export async function installPart(sdk: PanelSdk, guard: DraftGuard, part: PartPackage, o: Pick<RunScriptOptions, "signal" | "backoffMs" | "onAttempt" | "sleepFn"> = {}): Promise<InstalledPart> {
  const t0 = Date.now();
  const out = await runScript<Omit<InstalledPart, "attempts" | "recoveredBy" | "ms">>(sdk, {
    ...o,
    summary: "EO Shorts: install the graphic of scene " + part.sceneId + (part.labels.length > 1 ? " (part " + (part.index + 1) + "/" + part.labels.length + ")" : ""),
    script: part.script,
    allowCommit: true,
    verify: async () => {
      const s = await readScript<StateAnswer>(sdk, "EO Shorts: check scene " + part.sceneId + " graphic", installStateScript(guard, part), { signal: o.signal, backoffMs: o.backoffMs, sleepFn: o.sleepFn });
      if (s.placed && !s.duplicates && !s.stale.length) return "done";
      return "retry";
    },
  });
  const r = out.result ?? { label: part.label, reused: true, removed: [], placed: null, commitId: out.committed[0]?.commitId ?? null };
  return { ...r, attempts: out.attempts, recoveredBy: out.recoveredBy, ms: Date.now() - t0 };
}

export async function installScene(sdk: PanelSdk, guard: DraftGuard, pkg: ScenePackage, o: Pick<RunScriptOptions, "signal" | "backoffMs" | "onAttempt" | "sleepFn"> = {}): Promise<InstalledPart[]> {
  const out: InstalledPart[] = [];
  for (const part of pkg.parts) out.push(await installPart(sdk, guard, part, o));
  return out;
}

export async function writeSceneFiles(fs: HostFs, dir: string, pkg: ScenePackage, installed?: InstalledPart[]): Promise<string[]> {
  const written: string[] = [];
  const put = async (name: string, data: string | object) => {
    const file = fs.join(dir, name);
    if (typeof data === "string") await writeFileAtomic(fs, file, data);
    else await writeJsonAtomic(fs, file, data);
    written.push(file);
  };
  await put("mg-package.json", packageReceipt(pkg));
  for (const part of pkg.parts) await put("mg-script" + (pkg.parts.length > 1 ? "." + (part.index + 1) : "") + ".js", part.script);
  if (installed) await put("install.json", installed);
  return written;
}
