import type { Host } from "../../host/types.ts";
import { ensureDir, readBytes, writeFileAtomic, writeJsonAtomic } from "../../host/fs.ts";
import { probeMedia } from "../../host/ffmpeg.ts";
import { readScript, runScript, scriptBytes } from "../../host/runScript.ts";
import { compileScene } from "../../engine/compileScene.ts";
import type { FontSource } from "../../engine/fontFaces.ts";
import { reportText, type Execution, type FilmStyle, type Picture, type ScenePlan } from "../../../engine/compiler/core.mjs";
import { packageScenes, type ScenePackage, type SceneInput } from "../../mg/packageScene.ts";
import { installScene, writeSceneFiles, type InstalledPart } from "../../mg/install.ts";
import { SCRIPT_BUDGET_BYTES } from "../../mg/installScript.ts";
import { assertInstallable } from "../../mg/staticCheck.ts";
import type { Subsetter } from "../../mg/hbSubset.ts";
import { SCENE_RUNTIME_SHA256, SCENE_RUNTIME_TSX } from "../../mg/sceneRuntimeSource.ts";
import { shotKinds, type FootageExecution } from "./footageFrames.ts";
import { bakeKey, bakePlan, bakeStockRun, type BakeResult, type StockSource } from "./stockBake.ts";
import { mainLookTargets, planComposition, type SceneFootage } from "./composition.ts";
import { lookLabel } from "./effects.ts";
import { checkComposition, type CoverageReport } from "./coverage.ts";
import { compositionScript, effectsScript, effectsStateScript, importScript, placeScript, resolveScript, splitCheckScript, stateScript, type ComposeGuard, type EffectTarget, type EffectsInput, type PlaceInput, type ResolvedFile } from "./scripts.ts";
import { crossingWarnings, type CrossingClip, type MainEffectCrossing, type SplitCheck } from "./splitCrossing.ts";
import { RESERVED_FONT_NAMES } from "../../mg/renameFamily.ts";

export type StockInput = Omit<StockSource, "size" | "durationSeconds"> & Partial<Pick<StockSource, "size" | "durationSeconds">>;

export type ComposeScene = {
  sceneId: string;
  start: number;
  end: number;
  plan: ScenePlan;
  pictures?: Record<string, string>;
  stills?: Record<string, string>;
  stock?: Record<string, StockInput>;
};

export type ComposeInput = {
  host: Pick<Host, "sdk" | "fs" | "runtime">;
  doc: Document;
  projectId: string;
  draftId: string;
  style: FilmStyle;
  scenes: ComposeScene[];
  dirs: { compose: string; footage: string; sound: string; tmp: string };
  readFont: FontSource;
  subsetter: Subsetter;
  expect?: { mainEnd?: number; wordsSig?: string | null };
  tsx?: string;
  tsxSha256?: string;
  signal?: AbortSignal | null;
  progress?: (note: string) => void;
  backoffMs?: number[];
  compile?: typeof compileScene;
  packageScenes?: typeof packageScenes;
};

export type ComposeReport = {
  schema: "eo-compose/1";
  guard: ComposeGuard;
  scenes: { sceneId: string; start: number; end: number; compileMs: number; warnings: string[]; parts: { label: string; start: number; end: number; opaque: boolean; scriptBytes: number }[] }[];
  bakes: (BakeResult & { sceneId: string; run: number; start: number; end: number })[];
  imports: { imported: string[]; files: ResolvedFile[] } | null;
  place: PlaceResult | { recoveredBy: unknown };
  splitCheck: SplitCheck | null;
  effects: { targets: { kind: string; start: number; end: number; label: string }[]; batches: unknown[] };
  installed: { sceneId: string; parts: InstalledPart[] }[];
  coverage: CoverageReport;
  warnings: string[];
  ms: Record<string, number>;
};

export const EFFECTS_PER_SCRIPT = 6;

export async function composeFilm(c: ComposeInput): Promise<ComposeReport> {
  const { sdk, fs, runtime } = c.host;
  const say = c.progress ?? (() => {});
  const ms: Record<string, number> = {};
  const lap = async <T>(name: string, f: () => Promise<T>): Promise<T> => {
    const t0 = Date.now();
    try {
      return await f();
    } finally {
      ms[name] = Date.now() - t0;
    }
  };
  const rs = { signal: c.signal, backoffMs: c.backoffMs };
  const tsx = c.tsx ?? SCENE_RUNTIME_TSX;
  const tsxSha = c.tsxSha256 ?? SCENE_RUNTIME_SHA256;
  const warnings: string[] = [];
  const sceneDir = (sid: string) => fs.join(c.dirs.compose, sid);

  const st = await readScript<{ fps: number; frameSize: { width: number; height: number }; mainEnd: number; wordsSig: string }>(sdk, "EO Shorts: read the EO draft", stateScript(c.projectId, c.draftId), rs);
  if (c.expect?.mainEnd != null && st.mainEnd !== c.expect.mainEnd) throw new Error("The EO draft's Main ends at frame " + st.mainEnd + "; the plan was made for " + c.expect.mainEnd + ".");
  if (c.expect?.wordsSig != null && st.wordsSig !== c.expect.wordsSig) throw new Error("The EO draft's words changed since the plan was made.");
  const guard: ComposeGuard = { projectId: c.projectId, draftId: c.draftId, fps: st.fps, frameSize: st.frameSize, mainEnd: st.mainEnd, wordsSig: st.wordsSig };

  const scenes = [...c.scenes].sort((a, b) => a.start - b.start);
  const compiled: { s: ComposeScene; execution: Execution; ms: number; warnings: string[] }[] = [];
  await lap("compile", async () => {
    for (const s of scenes) {
      say("Laying out scene " + s.sceneId + "…");
      const pictures: Record<string, Picture> = {};
      for (const [id, path] of Object.entries(s.pictures ?? {})) pictures[id] = { bytes: await readBytes(fs, path), semanticParts: null };
      const dir = (await ensureDir(fs, sceneDir(s.sceneId)));
      const r = await (c.compile ?? compileScene)({ plan: s.plan, style: c.style, pictures, sceneDir: dir, footageRoot: "" }, { readFont: c.readFont, doc: c.doc, join: (...p) => fs.join(...p) });
      await writeFileAtomic(fs, fs.join(dir, "execution.json"), r.text);
      await writeFileAtomic(fs, fs.join(dir, "compile-report.json"), reportText(r.report));
      compiled.push({ s, execution: r.execution, ms: r.ms, warnings: r.report.warnings });
    }
  });
  const footage: SceneFootage[] = compiled.map(({ s, execution }) => ({ sceneId: s.sceneId, start: s.start, end: s.end, execution: execution as unknown as FootageExecution, kinds: shotKinds(s.plan as { shots?: { source?: string }[] }) }));
  const plan = planComposition(footage, guard.mainEnd);
  warnings.push(...plan.warnings);

  let splitCheck: SplitCheck | null = null;
  if (plan.splits.length) {
    splitCheck = await readScript<SplitCheck>(sdk, "EO Shorts: check what the Main splits would cut", splitCheckScript(guard, { splits: plan.splits, footageRoot: c.dirs.footage, soundRoot: c.dirs.sound }), rs);
    if (splitCheck.refusal) throw new Error(splitCheck.refusal);
  }

  const bakes: ComposeReport["bakes"] = [];
  await lap("bake", async () => {
    await ensureDir(fs, c.dirs.footage);
    const probed = new Map<string, { size: { width: number; height: number }; durationSeconds: number | null }>();
    for (const o of plan.overlays) {
      const sf = footage.find((x) => x.sceneId === o.sceneId)!;
      const s = scenes.find((x) => x.sceneId === o.sceneId)!;
      const sources: Record<string, StockSource> = {};
      for (const shot of new Set(o.shots.map((x) => x.id))) {
        const src = s.stock?.[shot];
        if (!src) throw new Error("Scene " + o.sceneId + " has no stock clip for " + shot + ".");
        let p = probed.get(src.path);
        if (!p && !src.size) {
          const m = await probeMedia(runtime, src.path, { fs, tmpDir: c.dirs.tmp, signal: c.signal });
          if (!m.video) throw new Error("The stock clip " + src.path + " has no video.");
          p = { size: { width: m.video.width, height: m.video.height }, durationSeconds: m.video.durationSec ?? m.durationSec };
          probed.set(src.path, p);
        }
        sources[shot] = { ...src, size: src.size ?? p!.size, durationSeconds: src.durationSeconds ?? p?.durationSeconds ?? null };
      }
      say("Cutting the footage of scene " + o.sceneId + "…");
      const bp = bakePlan(sf.execution, o.sceneId, { kind: "stock", from: o.runFrom, to: o.runTo, shots: o.shots }, sources, { fps: guard.fps, out: guard.frameSize });
      const stem = o.sceneId + "-" + o.run + "-" + (await bakeKey(fs, bp)).slice(0, 10);
      const out = fs.join(c.dirs.footage, stem + ".mp4");
      const r = await bakeStockRun({ fs, runtime, signal: c.signal, tmpDir: c.dirs.tmp }, bp, out);
      await writeJsonAtomic(fs, fs.join(c.dirs.footage, stem + ".plan.json"), bp);
      bakes.push({ ...r, sceneId: o.sceneId, run: o.run, start: o.start, end: o.end });
    }
  });
  const overlayFiles = plan.overlays.map((o, i) => ({ ...o, path: bakes[i].path }));

  const pkgs: ScenePackage[] = await lap("package", async () => {
    say("Packaging the scene graphics…");
    const inputs: SceneInput[] = compiled.map(({ s, execution }) => ({ sceneId: s.sceneId, start: s.start, end: s.end, execution, ...(s.pictures && { pictures: s.pictures }), ...(s.stills && { stills: s.stills }) }));
    return (c.packageScenes ?? packageScenes)(inputs, { fs, runtime, signal: c.signal, subsetter: c.subsetter, readFont: c.readFont, rename: RESERVED_FONT_NAMES, guard, sceneDir, doc: c.doc, tsx, tsxSha256: tsxSha });
  });
  for (const p of pkgs) warnings.push(...p.warnings);

  let imports: ComposeReport["imports"] = null;
  if (overlayFiles.length) {
    imports = await lap("import", async () => {
      say("Adding the footage to the project…");
      const paths = overlayFiles.map((o) => o.path);
      const out = await runScript<{ imported: string[]; files: ResolvedFile[] }>(sdk, {
        ...rs,
        summary: "EO Shorts: add the scene footage to the project",
        script: importScript(c.projectId, paths),
        allowCommit: true,
        verify: async () => ((await readScript<ResolvedFile[]>(sdk, "EO Shorts: find the scene footage", resolveScript(c.projectId, paths), rs)).every((f) => f.resourceId) ? "done" : "retry"),
      });
      return out.result ?? { imported: [], files: await readScript<ResolvedFile[]>(sdk, "EO Shorts: find the scene footage", resolveScript(c.projectId, paths), rs) };
    });
  }

  const place = await lap("place", async () => {
    say("Placing the footage…");
    const input: PlaceInput = { splits: plan.splits, overlays: overlayFiles.map((o) => ({ path: o.path, start: o.start, end: o.end })), footageRoot: c.dirs.footage, soundRoot: c.dirs.sound };
    const out = await runScript<PlaceResult>(sdk, {
      ...rs,
      summary: "EO Shorts: place the scene footage",
      script: placeScript(guard, input),
      allowCommit: true,
      verify: async () => {
        const now = await readComposition(c, guard);
        const bounds = new Set(now.main.flatMap((m) => [m.start, m.end]));
        const placed = input.overlays.every((o) => now.overlays.filter((x) => samePath(x.path, o.path) && x.start === o.start && x.end === o.end).length === 1);
        return placed && input.splits.every((k) => bounds.has(k)) ? "done" : "retry";
      },
    });
    return out.result ?? { recoveredBy: out.recoveredBy };
  });
  warnings.push(...crossingWarnings("splits" in place ? place : splitCheck && { removedSound: splitCheck.sound, mainEffects: splitCheck.mainEffects }));

  const effects = await lap("effects", async () => {
    const now = await readComposition(c, guard);
    const main = mainLookTargets(footage, plan, now.main.map((m) => ({ start: m.start, end: m.end, transform: m.transform, source: m.source })), guard.frameSize);
    const targets: EffectTarget[] = [];
    for (const o of overlayFiles) if (o.look) targets.push({ kind: "overlay", path: o.path, start: o.start, end: o.end, label: await lookLabel(o.sceneId, tsxSha, o.look), params: o.look as unknown as Record<string, unknown> });
    for (const m of main) targets.push({ kind: "main", start: m.start, end: m.end, label: await lookLabel(m.sceneId, tsxSha, m.look), params: m.look as unknown as Record<string, unknown> });
    for (const t of targets) assertInstallable(tsx, t.params, t.label);
    const expected = targets.map(({ params: _p, ...t }) => t);
    const batches: unknown[] = [];
    const groups = targets.length ? batchTargets(guard, targets, expected, c.dirs.footage, tsx) : [[]];
    for (const [k, batch] of groups.entries()) {
      say("Adding the footage looks (" + (k + 1) + "/" + groups.length + ")…");
      const input = { targets: batch, expected, footageRoot: c.dirs.footage, tsx };
      const out = await runScript(sdk, {
        ...rs,
        summary: "EO Shorts: footage looks " + (k + 1) + "/" + groups.length,
        script: effectsScript(guard, input),
        allowCommit: true,
        verify: async () => {
          const s = await readScript<{ placed: number; of: number }>(sdk, "EO Shorts: check the footage looks", effectsStateScript(guard, input), rs);
          return s.placed === s.of ? "done" : "retry";
        },
      });
      batches.push(out.result ?? { recoveredBy: out.recoveredBy });
    }
    return { targets: targets.map((t) => ({ kind: t.kind, start: t.start, end: t.end, label: t.label })), batches };
  });

  const installed = await lap("install", async () => {
    const out: ComposeReport["installed"] = [];
    for (const p of pkgs) {
      say("Installing the graphic of scene " + p.sceneId + "…");
      const parts = await installScene(sdk, guard, p, rs);
      await writeSceneFiles(fs, sceneDir(p.sceneId), p, parts);
      out.push({ sceneId: p.sceneId, parts });
    }
    return out;
  });

  const coverage = await lap("check", async () => {
    const now = await readComposition(c, guard);
    return checkComposition(
      { mainEnd: now.mainEnd, main: now.main, overlays: now.overlays, graphics: now.graphics },
      {
        frameSize: guard.frameSize,
        parts: pkgs.flatMap((p) => p.parts.map((x) => ({ label: x.label, start: x.start, end: x.end, opaque: !x.parameters.nativeTransparent }))),
        overlays: overlayFiles.map((o) => ({ path: o.path, start: o.start, end: o.end })),
      },
    );
  });

  const report: ComposeReport = {
    schema: "eo-compose/1",
    guard,
    scenes: compiled.map(({ s, ms: cms, warnings: w }) => {
      const p = pkgs.find((x) => x.sceneId === s.sceneId)!;
      return { sceneId: s.sceneId, start: s.start, end: s.end, compileMs: cms, warnings: w, parts: p.parts.map((x) => ({ label: x.label, start: x.start, end: x.end, opaque: !x.parameters.nativeTransparent, scriptBytes: x.scriptBytes })) };
    }),
    bakes,
    imports,
    place,
    splitCheck,
    effects,
    installed,
    coverage,
    warnings,
    ms,
  };
  await writeJsonAtomic(fs, fs.join(c.dirs.compose, "compose.json"), { ...report, plan: { ...plan, overlays: plan.overlays.map(({ look, ...o }) => ({ ...o, look: !!look })) } });
  return report;
}

export type PlaceResult = {
  splits: number[];
  placed: number;
  kept: number;
  removedOverlays: number;
  removedGraphics: string[];
  removedSound: CrossingClip[];
  mainEffects: MainEffectCrossing[];
  overlays: number;
  commitId: string | null;
};

const samePath = (a: string | null, b: string | null) => a != null && b != null && a.replace(/\\/g, "/").toLowerCase() === b.replace(/\\/g, "/").toLowerCase();

export function batchTargets(g: ComposeGuard, targets: EffectTarget[], expected: EffectsInput["expected"], footageRoot: string, tsx: string, max = EFFECTS_PER_SCRIPT, budget = SCRIPT_BUDGET_BYTES): EffectTarget[][] {
  const out: EffectTarget[][] = [];
  let cur: EffectTarget[] = [];
  const fits = (b: EffectTarget[]) => scriptBytes(effectsScript(g, { targets: b, expected, footageRoot, tsx })) <= budget;
  for (const t of targets) {
    if (!fits([t])) throw new Error("The look of " + t.label + " does not fit one script (" + budget + " bytes).");
    if (cur.length < max && fits([...cur, t])) cur.push(t);
    else {
      out.push(cur);
      cur = [t];
    }
  }
  if (cur.length) out.push(cur);
  return out;
}

type CompositionRead = {
  mainEnd: number;
  main: { start: number; end: number; resourceId: string | null; path: string | null; source: { width: number; height: number } | null; transform: any; effects: string[] }[];
  overlays: { start: number; end: number; resourceId: string | null; path: string | null; trackId: string; ours: boolean; effects: string[] }[];
  graphics: { name: string; start: number; end: number; trackId: string }[];
};

export function readComposition(c: Pick<ComposeInput, "host" | "dirs" | "signal" | "backoffMs">, g: ComposeGuard): Promise<CompositionRead> {
  return readScript<CompositionRead>(c.host.sdk, "EO Shorts: read the composition", compositionScript(g, c.dirs.footage), { signal: c.signal, backoffMs: c.backoffMs });
}
