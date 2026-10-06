import { type ClipTransformValue, type Size, visibleSourceRect } from "../../speaker/framing.ts";

export type PlacedGraphic = { name: string; start: number; end: number };
export type PlacedOverlay = { start: number; end: number; resourceId: string | null; path: string | null };
export type MainPiece = { start: number; end: number; transform: ClipTransformValue | null; source: Size | null };

export type CompositionState = {
  mainEnd: number;
  main: MainPiece[];
  overlays: PlacedOverlay[];
  graphics: PlacedGraphic[];
};

export type ExpectedPart = { label: string; start: number; end: number; opaque: boolean };

export type CoverageExpect = {
  frameSize: Size;
  parts: ExpectedPart[];
  overlays: { start: number; end: number; path: string }[];
  isOwnGraphic?: (name: string) => boolean;
};

export type CoverageReport = {
  ok: boolean;
  frames: number;
  uncovered: { start: number; end: number }[];
  coveredBy: { opaqueGraphic: number; overlay: number; main: number };
  graphics: { expected: number; placed: number; missing: string[]; duplicates: string[]; misplaced: string[]; stale: string[] };
  overlays: { expected: number; placed: number; missing: string[]; unexpected: string[] };
  letterboxedMain: string[];
};

const EPS = 0.01;

export function fillsFrame(t: ClipTransformValue | null, src: Size | null, out: Size): boolean {
  if (!t || !src) return false;
  const r = visibleSourceRect(t, src, out);
  return r.x0 >= -EPS && r.y0 >= -EPS && r.x1 <= src.width + EPS && r.y1 <= src.height + EPS;
}

const norm = (p: string | null) => (p == null ? null : p.replace(/\\/g, "/").toLowerCase());

export function checkComposition(state: CompositionState, expect: CoverageExpect): CoverageReport {
  const own = expect.isOwnGraphic ?? ((name: string) => name.startsWith("EO "));
  const missing: string[] = [], duplicates: string[] = [], misplaced: string[] = [];
  for (const p of expect.parts) {
    const at = state.graphics.filter((g) => g.name === p.label);
    if (!at.length) missing.push(p.label);
    else if (at.length > 1) duplicates.push(p.label);
    else if (at[0].start !== p.start || at[0].end !== p.end) misplaced.push(p.label + " at " + at[0].start + "-" + at[0].end + ", planned " + p.start + "-" + p.end);
  }
  const labels = new Set(expect.parts.map((p) => p.label));
  const stale = state.graphics.filter((g) => own(g.name) && !labels.has(g.name)).map((g) => g.name + " " + g.start + "-" + g.end);
  const ovMissing: string[] = [];
  const wanted = new Set(expect.overlays.map((o) => norm(o.path)));
  for (const o of expect.overlays) {
    const n = state.overlays.filter((x) => norm(x.path) === norm(o.path) && x.start === o.start && x.end === o.end).length;
    if (n !== 1) ovMissing.push(o.path + " " + o.start + "-" + o.end + (n ? " (" + n + " times)" : ""));
  }
  const unexpected = state.overlays.filter((x) => wanted.has(norm(x.path)) && !expect.overlays.some((o) => norm(o.path) === norm(x.path) && o.start === x.start && o.end === x.end)).map((x) => x.path + " " + x.start + "-" + x.end);
  const opaque = expect.parts.filter((p) => p.opaque && state.graphics.some((g) => g.name === p.label && g.start === p.start && g.end === p.end));
  const overlays = state.overlays.filter((x) => wanted.has(norm(x.path)));
  const letterboxed = state.main.filter((m) => !fillsFrame(m.transform, m.source, expect.frameSize));
  const coveredBy = { opaqueGraphic: 0, overlay: 0, main: 0 };
  const uncovered: { start: number; end: number }[] = [];
  for (let f = 0; f < state.mainEnd; f += 1) {
    const inR = (r: { start: number; end: number }) => f >= r.start && f < r.end;
    if (opaque.some(inR)) coveredBy.opaqueGraphic += 1;
    else if (overlays.some(inR)) coveredBy.overlay += 1;
    else if (state.main.some((m) => inR(m) && !letterboxed.includes(m))) coveredBy.main += 1;
    else {
      const last = uncovered.at(-1);
      if (last && last.end === f) last.end = f + 1;
      else uncovered.push({ start: f, end: f + 1 });
    }
  }
  const ok = !uncovered.length && !missing.length && !duplicates.length && !misplaced.length && !stale.length && !ovMissing.length && !unexpected.length;
  return {
    ok,
    frames: state.mainEnd,
    uncovered,
    coveredBy,
    graphics: { expected: expect.parts.length, placed: state.graphics.filter((g) => labels.has(g.name)).length, missing, duplicates, misplaced, stale },
    overlays: { expected: expect.overlays.length, placed: overlays.length, missing: ovMissing, unexpected },
    letterboxedMain: letterboxed.map((m) => m.start + "-" + m.end),
  };
}
