import type { HostFs, PanelSdk } from "../../host/types.ts";
import { lit, readScript } from "../../host/runScript.ts";
import { readJsonIfExists, readText } from "../../host/fs.ts";

export type ExportDraftState = {
  inProject: boolean;
  name: string | null;
  fps: number;
  frameSize: { width: number; height: number };
  durationFrames: number;
  mainEnd: number;
  clips: number;
  retimed: { trackKind: string; start: number; end: number; speed: string }[];
  speedKnown: boolean;
  graphics: number;
};

export function exportCheckScript(projectId: string, draftId: string): string {
  return `const p = selects.project(${lit(projectId)});
const pm = await p.meta();
if (!pm.draftIds.includes(${lit(draftId)})) return { inProject: false };
const d = selects.draft(${lit(draftId)});
const meta = await d.meta();
const all = (await d.clips({ trackScope: "all" })).filter((c) => c.trackKind === "main" || c.trackKind === "video" || c.trackKind === "audio");
const sp = (c) => c.playbackSpeed;
const retimed = all.filter((c) => sp(c) && sp(c).numerator !== sp(c).denominator).map((c) => ({ trackKind: c.trackKind, start: c.startFrame, end: c.endFrame, speed: sp(c).numerator + "/" + sp(c).denominator }));
return { inProject: true, name: meta.name, fps: meta.fps, frameSize: meta.frameSize, durationFrames: meta.durationFrames,
  mainEnd: all.filter((c) => c.trackKind === "main").reduce((m, c) => Math.max(m, c.endFrame), 0), clips: all.length,
  retimed, speedKnown: all.some((c) => sp(c) != null), graphics: (await d.motionGraphics()).length };`;
}

export type PictureRef = { sceneId: string; part: string; url: string; path: string | null };

export type ComposedScene = { sceneId: string; start: number; end: number; parts: { label: string; start: number; end: number; opaque: boolean; scriptBytes?: number }[] };

type PartReceipt = { label?: string; pictures?: { id?: string; file?: string; url?: string; inline?: boolean }[] };

export const partScriptName = (index: number, count: number): string => "mg-script" + (count > 1 ? "." + (index + 1) : "") + ".js";

const LOCAL_URL = /"(local:\/\/[^"\\\s]+)/g;
const URL_END = /["\\\s]/;

export function localUrlsIn(text: string, known: Iterable<string> = []): string[] {
  const found: { at: number; url: string }[] = [];
  let rest = text;
  for (const url of [...new Set(known)].filter((u) => u.startsWith("local://")).sort((a, b) => b.length - a.length)) {
    for (let at = rest.indexOf(url); at >= 0; at = rest.indexOf(url, at + url.length)) {
      const next = rest[at + url.length];
      if (next !== undefined && !URL_END.test(next)) continue;
      found.push({ at, url });
      rest = rest.slice(0, at) + " ".repeat(url.length) + rest.slice(at + url.length);
    }
  }
  for (const m of rest.matchAll(LOCAL_URL)) found.push({ at: (m.index ?? 0) + 1, url: m[1] });
  return [...new Set(found.sort((a, b) => a.at - b.at).map((f) => f.url))];
}

export async function pictureRefs(fs: HostFs, composeDir: string, scenes: ComposedScene[], toPath: ((url: string) => string | null) | null): Promise<{ refs: PictureRef[]; unreadable: string[] }> {
  const refs: PictureRef[] = [];
  const unreadable: string[] = [];
  const known = new Map<string, string>();
  for (const s of scenes) {
    const pkg = await readJsonIfExists<{ parts?: PartReceipt[] } | null>(fs, fs.join(composeDir, s.sceneId, "mg-package.json"), null).catch(() => null);
    for (const part of pkg?.parts ?? []) for (const p of part.pictures ?? []) if (!p.inline && p.url && p.file) known.set(p.url, p.file);
  }
  for (const s of scenes) {
    const dir = fs.join(composeDir, s.sceneId);
    for (const [i, part] of s.parts.entries()) {
      const file = fs.join(dir, partScriptName(i, s.parts.length));
      if (!(await fs.exists(file))) {
        unreadable.push(s.sceneId + " " + partScriptName(i, s.parts.length));
        continue;
      }
      for (const url of localUrlsIn(await readText(fs, file), known.keys())) {
        let path = known.get(url) ?? null;
        if (path == null && toPath) {
          try {
            path = toPath(url) || null;
          } catch {
            path = null;
          }
        }
        refs.push({ sceneId: s.sceneId, part: part.label, url, path });
      }
    }
  }
  return { refs, unreadable };
}

export function localUrlMapper(fs: HostFs): ((url: string) => string | null) | null {
  const f = (fs as HostFs & { localURLToPath?: (url: string) => string }).localURLToPath;
  return typeof f === "function" ? (url) => f.call(fs, url) : null;
}

export type PictureCheck = { checked: number; files: number; missing: PictureRef[]; unresolved: PictureRef[]; unreadable: string[] };

export async function checkPictureFiles(fs: HostFs, refs: PictureRef[], unreadable: string[] = []): Promise<PictureCheck> {
  const missing: PictureRef[] = [];
  const unresolved: PictureRef[] = [];
  const files = new Set<string>();
  for (const r of refs) {
    if (r.path == null) unresolved.push(r);
    else if (!(await fs.exists(r.path))) missing.push(r);
    else files.add(r.path);
  }
  return { checked: refs.length, files: files.size, missing, unresolved, unreadable };
}

export type ExportCheck = { ok: boolean; problems: string[]; warnings: string[]; draft: ExportDraftState; pictures: PictureCheck };

export function judgeExportCheck(draft: ExportDraftState, pictures: PictureCheck, expect: { mainEnd?: number | null; frameSize?: { width: number; height: number } }): ExportCheck {
  const problems: string[] = [];
  const warnings: string[] = [];
  if (!draft.inProject) problems.push("The EO draft is no longer in its project.");
  else {
    if (expect.mainEnd != null && draft.mainEnd !== expect.mainEnd) problems.push("The EO draft's Main now ends at frame " + draft.mainEnd + "; it was composed for " + expect.mainEnd + ". Undo the change, or build the scenes again before exporting.");
    const size = expect.frameSize ?? { width: 1080, height: 1920 };
    if (draft.frameSize?.width !== size.width || draft.frameSize?.height !== size.height) problems.push("The EO draft is " + draft.frameSize?.width + "x" + draft.frameSize?.height + ", not " + size.width + "x" + size.height + ".");
    if (draft.retimed.length) {
      const list = draft.retimed.slice(0, 4).map((c) => c.trackKind + " clip " + c.start + "-" + c.end + " at " + c.speed).join(", ");
      problems.push(draft.retimed.length + " clip(s) are not at 1x speed (" + list + (draft.retimed.length > 4 ? ", …" : "") + "). Reset their speed: with any retimed clip the export draws the graphics' pictures broken.");
    }
    if (!draft.speedKnown && draft.clips) warnings.push("This Selects build does not report clip speed; 1x is assumed for the export.");
  }
  if (pictures.missing.length) {
    const files = [...new Set(pictures.missing.map((m) => m.path))];
    problems.push(files.length + " picture file(s) the graphics draw are missing (" + files.slice(0, 3).join(", ") + (files.length > 3 ? ", …" : "") + "); the export would draw them as broken icons. Build the scenes again before exporting.");
  }
  if (pictures.unresolved.length) problems.push(pictures.unresolved.length + " picture URL(s) in the graphics cannot be matched to a file (" + pictures.unresolved.slice(0, 2).map((r) => r.sceneId + " " + r.url).join(", ") + ").");
  if (pictures.unreadable.length) problems.push("The install record of " + pictures.unreadable.join(", ") + " is missing, so its pictures cannot be checked. Build the scenes again before exporting.");
  return { ok: problems.length === 0, problems, warnings, draft, pictures };
}

const EMPTY_DRAFT: ExportDraftState = { inProject: false, name: null, fps: 0, frameSize: { width: 0, height: 0 }, durationFrames: 0, mainEnd: 0, clips: 0, retimed: [], speedKnown: true, graphics: 0 };

export async function precheckExport(
  sdk: PanelSdk,
  fs: HostFs,
  input: { projectId: string; draftId: string; composeDir: string; scenes: ComposedScene[]; expectMainEnd?: number | null; signal?: AbortSignal | null; backoffMs?: number[] },
): Promise<ExportCheck> {
  const read = await readScript<Partial<ExportDraftState>>(sdk, "EO Shorts: check the draft before export", exportCheckScript(input.projectId, input.draftId), { signal: input.signal, backoffMs: input.backoffMs });
  const draft: ExportDraftState = { ...EMPTY_DRAFT, ...read, inProject: read.inProject === true };
  const { refs, unreadable } = await pictureRefs(fs, input.composeDir, input.scenes, localUrlMapper(fs));
  const pictures = (await checkPictureFiles(fs, refs, unreadable));
  return judgeExportCheck(draft, pictures, { mainEnd: input.expectMainEnd });
}
