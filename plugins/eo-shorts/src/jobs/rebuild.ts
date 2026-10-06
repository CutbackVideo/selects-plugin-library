import type { StageContext, RebuildRequest } from "./runner.ts";
import { RebuildRefusedError } from "./runner.ts";
import type { Job, StageId } from "./store.ts";
import { STAGE_IDS } from "./store.ts";
import { readJsonIfExists } from "../host/fs.ts";
import { lit, readScript, runScript } from "../host/runScript.ts";
import { SOURCE_FILES_JS } from "../stages/compose/scripts.ts";
import { GUARD_WORDS_JS, guardWordsSig, type SignedWord } from "../stages/compose/wordsGuard.ts";
import { t } from "../ui/messages.ts";

export const REBUILD_FROM: StageId = "compose";

export const OWNED_GRAPHIC_PREFIX = "EO ";

export type OwnedClip = { kind: "graphic" | "video" | "audio"; name: string; start: number; end: number; why: "graphic" | "job-file" };

export type ClearReport = {
  refused?: RebuildRefusal | null;
  removed: OwnedClip[];
  kept: number;
  commitId: string | null;
};

export const GUARD_FILES = { words: "edit/words.json", media: "media/media.json", compose: "compose/compose.json" };

export function rebuildBlocker(job: Job | null): string | null {
  if (!job) return t("rebuild.noJob");
  if (!job.draftId) return t("rebuild.noDraft");
  const composeRuns = job.stages.compose?.runs ?? 0;
  const later = STAGE_IDS.slice(STAGE_IDS.indexOf(REBUILD_FROM)).some((id) => job.stages[id]?.status === "done");
  if (!composeRuns && !later) return t("rebuild.notBuilt");
  for (const id of STAGE_IDS.slice(0, STAGE_IDS.indexOf(REBUILD_FROM))) {
    if (job.stages[id]?.status !== "done") return t("rebuild.notFinished", { stage: t(("stage." + id) as "stage.plan") });
  }
  return null;
}

export type RebuildExpect = { mainEnd: number; wordsSig: string | null; fps: number | null; frameSize: { width: number; height: number } | null };

export type RebuildRefusal = { code: "gone" | "format" | "main" | "retimed" | "words"; now?: string | number; planned?: string | number; at?: string };

export function rebuildRefusalText(r: RebuildRefusal): string {
  switch (r.code) {
    case "gone":
      return t("rebuild.gone");
    case "format":
      return t("rebuild.changedFormat", { now: r.now, planned: r.planned });
    case "main":
      return t("rebuild.changedMain", { now: r.now, planned: r.planned });
    case "retimed":
      return t("rebuild.retimed", { at: r.at });
    default:
      return t("rebuild.changedWords");
  }
}

export async function rebuildExpect(ctx: Pick<StageContext, "host" | "path">): Promise<{ expect: RebuildExpect } | { refusal: string }> {
  const fs = ctx.host.fs;
  const read = <T>(rel: string) => readJsonIfExists<T | null>(fs, ctx.path(rel), null).catch(() => null);
  const edited = await read<{ mainEnd?: number; words?: SignedWord[] }>(GUARD_FILES.words);
  const media = await read<{ durationFrames?: number }>(GUARD_FILES.media);
  const composed = await read<{ guard?: { fps?: number; frameSize?: { width: number; height: number }; mainEnd?: number } }>(GUARD_FILES.compose);
  const mainEnd = edited?.mainEnd ?? media?.durationFrames ?? null;
  if (mainEnd == null) return { refusal: t("rebuild.noRecord") };
  if (media?.durationFrames != null && media.durationFrames !== mainEnd) return { refusal: t("rebuild.planMismatch", { plan: media.durationFrames, main: mainEnd }) };
  const g = composed?.guard;
  return {
    expect: {
      mainEnd,
      wordsSig: Array.isArray(edited?.words) ? guardWordsSig(edited!.words!) : null,
      fps: typeof g?.fps === "number" ? g.fps : null,
      frameSize: g?.frameSize && g.frameSize.width > 0 && g.frameSize.height > 0 ? { width: g.frameSize.width, height: g.frameSize.height } : null,
    },
  };
}

const OWNED_JS = `const ownedClips = async () => {
  const graphicOf = new Map((await d.motionGraphics()).map((x) => [x.clip.clipId, x.name]));
  const owned = [], others = [];
  for (const c of await d.clips({ trackScope: "all" })) {
    if (c.trackKind !== "video" && c.trackKind !== "audio") continue;
    const g = graphicOf.get(c.clipId);
    const f = c.resourceId ? files.find((x) => x.resourceId === c.resourceId) || null : null;
    const name = g != null ? g : f ? String(f.path).split(/[\\\\/]/).pop() : c.resourceId ? "resource " + c.resourceId : "clip " + c.clipId;
    const row = { kind: g != null ? "graphic" : c.trackKind, name, start: c.startFrame, end: c.endFrame };
    if (g != null && String(g).startsWith(${lit(OWNED_GRAPHIC_PREFIX)})) owned.push({ clip: c, row: { ...row, why: "graphic" } });
    else if (g == null && f && under(f.path, P.jobDir)) owned.push({ clip: c, row: { ...row, why: "job-file" } });
    else others.push(row);
  }
  return { owned, others };
};`;

export type ClearInput = { projectId: string; draftId: string; jobDir: string; expect?: RebuildExpect | null };

const GUARD_JS = `${GUARD_WORDS_JS}
const draftRefusal = async () => {
  const pm = await p.meta();
  if (!pm.draftIds.includes(P.draftId)) return { code: "gone" };
  const G = P.expect;
  if (!G) return null;
  const meta = await d.meta();
  if (G.fps != null && G.frameSize && (Math.abs(meta.fps - G.fps) > 1e-6 || meta.frameSize.width !== G.frameSize.width || meta.frameSize.height !== G.frameSize.height)) {
    return { code: "format", now: meta.frameSize.width + "x" + meta.frameSize.height + " at " + meta.fps + " fps", planned: G.frameSize.width + "x" + G.frameSize.height + " at " + G.fps + " fps" };
  }
  const main = (await d.clips({ trackScope: "main" })).filter((c) => c.trackKind === "main");
  const mainEnd = main.reduce((m, c) => Math.max(m, c.endFrame), 0);
  if (mainEnd !== G.mainEnd) return { code: "main", now: mainEnd, planned: G.mainEnd };
  for (const c of main) { const sp = c.playbackSpeed; if (sp && sp.numerator !== sp.denominator) return { code: "retimed", at: c.startFrame + "-" + c.endFrame }; }
  if (G.wordsSig !== null && guardWordsSig(await d.words()) !== G.wordsSig) return { code: "words" };
  return null;
};`;

function prelude(i: ClearInput, owned = true): string {
  return `const P = ${lit({ ...i, expect: i.expect ?? null })};
const p = selects.project(P.projectId);
const d = selects.draft(P.draftId);
${GUARD_JS}${owned ? "\n" + SOURCE_FILES_JS + "\n" + OWNED_JS : ""}`;
}

export function ownedClipsScript(i: ClearInput): string {
  return `${prelude({ ...i, expect: null })}
if (await draftRefusal()) throw new Error("guard: the EO short is no longer in its project");
const files = await sourceFiles(p);
const x = await ownedClips();
return { owned: x.owned.map((o) => o.row), kept: x.others.length };`;
}

export function checkScript(i: ClearInput): string {
  return `${prelude(i, false)}
return { refused: await draftRefusal() };`;
}

export function clearOwnedScript(i: ClearInput): string {
  return `${prelude(i)}
const refused = await draftRefusal();
if (refused) return { refused, removed: [], kept: 0, commitId: null };
const files = await sourceFiles(p);
const before = await ownedClips();
if (!before.owned.length) return { removed: [], kept: before.others.length, commitId: null };
await d.removeClips(before.owned.map((o) => o.clip));
const after = await ownedClips();
if (after.owned.length) throw new Error("clear: " + after.owned.length + " clip(s) of EO Shorts are still on the draft");
if (after.others.length !== before.others.length) throw new Error("clear: the draft's other clips changed (" + before.others.length + " -> " + after.others.length + ")");
const commit = await d.commitAll("EO Shorts: clear the short for Rebuild");
return { removed: before.owned.map((o) => o.row), kept: after.others.length, commitId: commit.commitId || null };`;
}

export async function checkRebuild(ctx: Pick<StageContext, "host" | "job" | "dir" | "signal" | "path">): Promise<string | null> {
  const { job } = ctx;
  if (!job.draftId) return t("rebuild.noDraft");
  const e = await rebuildExpect(ctx);
  if ("refusal" in e) return e.refusal;
  const input: ClearInput = { projectId: job.projectId, draftId: job.draftId, jobDir: ctx.dir, expect: e.expect };
  const r = await readScript<{ refused: RebuildRefusal | null }>(ctx.host.sdk, "EO Shorts: check the short before Rebuild", checkScript(input), { signal: ctx.signal });
  return r.refused ? rebuildRefusalText(r.refused) : null;
}

export async function clearOwnedClips(ctx: Pick<StageContext, "host" | "job" | "dir" | "signal">, expect: RebuildExpect | null = null): Promise<ClearReport> {
  const { job } = ctx;
  if (!job.draftId) throw new Error("This job has no EO short to rebuild.");
  const input: ClearInput = { projectId: job.projectId, draftId: job.draftId, jobDir: ctx.dir, expect };
  const read: ClearInput = { ...input, expect: null };
  const out = await runScript<ClearReport>(ctx.host.sdk, {
    summary: "EO Shorts: clear the short for Rebuild",
    script: clearOwnedScript(input),
    allowCommit: true,
    signal: ctx.signal,
    verify: async () => {
      const left = await readScript<{ owned: OwnedClip[] }>(ctx.host.sdk, "EO Shorts: check the cleared short", ownedClipsScript(read), { signal: ctx.signal });
      return left.owned.length ? "retry" : "done";
    },
  });
  if (out.recoveredBy === "verify") {
    const now = await readScript<{ owned: OwnedClip[]; kept: number }>(ctx.host.sdk, "EO Shorts: check the cleared short", ownedClipsScript(read), { signal: ctx.signal });
    return { removed: [], kept: now.kept, commitId: out.committed[0]?.commitId ?? null };
  }
  if (out.result.refused) throw new RebuildRefusedError(rebuildRefusalText(out.result.refused));
  return out.result;
}

export function rebuildRequest(clear: typeof clearOwnedClips = clearOwnedClips, check: typeof checkRebuild = checkRebuild): RebuildRequest {
  return {
    from: REBUILD_FROM,
    check: async (ctx) => {
      ctx.note(t("rebuild.checking"));
      return await check(ctx);
    },
    prepare: async (ctx) => {
      ctx.note(t("rebuild.clearing"));
      const e = await rebuildExpect(ctx);
      if ("refusal" in e) throw new RebuildRefusedError(e.refusal);
      const r = await clear(ctx, e.expect);
      await ctx.event("rebuild-cleared", { removed: r.removed.length, kept: r.kept, commitId: r.commitId, clips: r.removed.slice(0, 80) });
      ctx.note(r.removed.length ? t("rebuild.cleared", { count: r.removed.length }) : t("rebuild.nothing"));
      return { removed: r.removed.length, kept: r.kept, commitId: r.commitId };
    },
  };
}
