import type { FilmStyle } from "../../../engine/compiler/core.mjs";
import { Transcript } from "../../lint/anchors.ts";
import { lintPlan } from "../../lint/lint.ts";
import type { Obj } from "../../lint/py.ts";
import { allFilmStyles } from "./filmStyles.ts";
import type { PlanJson, PlanShot } from "./planInput.ts";

export function podcastShot(shot: PlanShot): PlanShot {
  const out: PlanShot = { source: "podcast" };
  if (shot.from !== undefined) out.from = shot.from;
  if (shot.treatment) out.treatment = "none";
  if (shot.layout) out.layout = shot.layout;
  return out;
}

const without = <T>(xs: T[] | undefined | null, drop: (x: T) => boolean): T[] | undefined => (Array.isArray(xs) ? xs.filter((x) => !drop(x)) : undefined);

export function dropPictures(plan: PlanJson, ids: Iterable<string>): PlanJson {
  const gone = new Set(ids);
  const p = structuredClone(plan) as PlanJson & { entrances?: Record<string, unknown>; idle?: Record<string, unknown> };
  if (Array.isArray(p.assets)) {
    p.assets = p.assets.filter((a) => !gone.has(a.id));
    for (const a of p.assets) {
      const seq = (a as { sequence?: unknown }).sequence;
      if (Array.isArray(seq)) {
        const kept = seq.filter((x) => !gone.has(String(x)));
        if (kept.length) (a as { sequence?: unknown }).sequence = kept;
        else delete (a as { sequence?: unknown }).sequence;
      }
    }
    if (!p.assets.length) delete p.assets;
  }
  if (Array.isArray(p.pages)) {
    const keep = (x: unknown) => !gone.has(String(x));
    p.pages = p.pages
      .map((pg) => {
        const q: Record<string, unknown> = { ...pg };
        for (const key of ["items", "left", "right", "under"]) if (Array.isArray(q[key])) q[key] = (q[key] as unknown[]).filter(keep);
        if (typeof q.hero === "string" && gone.has(q.hero)) delete q.hero;
        if (Array.isArray(q.groups)) {
          q.groups = (q.groups as Record<string, unknown>[])
            .map((g) => (Array.isArray(g.items) ? { ...g, items: (g.items as unknown[]).filter(keep) } : g))
            .filter((g) => !Array.isArray(g.items) || (g.items as unknown[]).length > 0);
        }
        return q;
      })
      .filter((q) => ["items", "groups", "left", "right", "under"].some((k) => Array.isArray(q[k]) && (q[k] as unknown[]).length > 0));
  }
  for (const key of ["entrances", "idle"] as const) {
    const m = p[key];
    if (m && typeof m === "object") for (const id of gone) delete m[id];
  }
  return p;
}

export function captionWord(text: string): string {
  return String(text)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[^a-z0-9'%$&]/g, "");
}

export type CaptionChunking = { maxWords: number; maxChars: number; minSeconds: number };
export const CAPTION_CHUNKINGS: CaptionChunking[] = [
  { maxWords: 3, maxChars: 18, minSeconds: 0.45 },
  { maxWords: 4, maxChars: 22, minSeconds: 0.7 },
  { maxWords: 6, maxChars: 28, minSeconds: 1.0 },
];

export function captionScene(plan: PlanJson, style: FilmStyle, chunking: CaptionChunking = CAPTION_CHUNKINGS[0]): PlanJson {
  const spoken = new Transcript(plan as unknown as Obj, style.fps, null).spoken;
  const seen = new Map<string, number>();
  const words: { text: string; anchor: string; start: number; end: number; stop: boolean }[] = [];
  for (const w of spoken) {
    const n = (seen.get(w.n) ?? 0) + 1;
    seen.set(w.n, n);
    const text = captionWord(w.text);
    if (!w.n || !text) continue;
    words.push({ text, anchor: n > 1 ? w.text + "#" + n : w.text, start: w.start, end: w.end, stop: /[.,!?;:]["')\]]*$/.test(String(w.text)) });
  }
  const chunks: (typeof words)[] = [];
  let cur: typeof words = [];
  for (const w of words) {
    const chars = cur.map((x) => x.text).join(" ").length;
    if (cur.length && (cur.length >= chunking.maxWords || chars + 1 + w.text.length > chunking.maxChars)) {
      chunks.push(cur);
      cur = [];
    }
    cur.push(w);
    if (w.stop && w.end - cur[0].start >= chunking.minSeconds) {
      chunks.push(cur);
      cur = [];
    }
  }
  if (cur.length) {
    const last = chunks[chunks.length - 1];
    if (last && cur[cur.length - 1].end - cur[0].start < chunking.minSeconds && last.length + cur.length <= chunking.maxWords + 2) last.push(...cur);
    else chunks.push(cur);
  }
  const copy = chunks.map((c, i) => ({ id: "c" + (i + 1), role: "caption", lines: [c.map((x) => x.text).join(" ")], timing: { onWord: c[0].anchor, at: "start" } }));
  const out: PlanJson = {
    schema: plan.schema,
    sceneId: plan.sceneId,
    film: plan.film,
    durationFrames: plan.durationFrames,
    ...(plan.words ? { words: plan.words } : {}),
    ...(plan.context !== undefined ? { context: plan.context } : {}),
    ...(plan.craftIntent !== undefined ? { craftIntent: plan.craftIntent } : {}),
    copy,
    pages: copy.length ? [{ block: "captions", items: copy.map((c) => c.id), start: "scene-start", mode: "replace", band: "lower", align: "center" }] : [],
    shots: [{ source: "podcast", from: "scene-start", treatment: "none", layout: "full" }],
    ending: "hold",
  };
  return out;
}

export type LintResult = { ok: boolean; errors: string[] };
export const lintScene = (plan: PlanJson): LintResult => lintPlan(plan, { styles: allFilmStyles() as never });

export function lintedCaptionScene(plan: PlanJson, style: FilmStyle): { plan: PlanJson; lint: LintResult } {
  let last: { plan: PlanJson; lint: LintResult } | null = null;
  for (const c of CAPTION_CHUNKINGS) {
    const p = captionScene(plan, style, c);
    const l = lintScene(p);
    if (l.ok) return { plan: p, lint: l };
    last = { plan: p, lint: l };
  }
  return last!;
}

export type SceneOutcome = {
  missingShots: { k: number; why: string }[];
  missingPictures: { id: string; why: string }[];
};

export type EffectivePlan = {
  plan: PlanJson;
  changed: boolean;
  kind: "plan" | "fallback" | "caption-scene";
  fallbacks: string[];
  lint: LintResult | null;
};

export function effectivePlan(plan: PlanJson, style: FilmStyle, o: SceneOutcome): EffectivePlan {
  if (!o.missingShots.length && !o.missingPictures.length) return { plan, changed: false, kind: "plan", fallbacks: [], lint: null };
  const sid = plan.sceneId;
  const notes: string[] = [];
  let p = structuredClone(plan);
  if (o.missingShots.length && Array.isArray(p.shots)) {
    for (const m of o.missingShots) {
      const sh = p.shots[m.k];
      if (!sh) continue;
      p.shots[m.k] = podcastShot(sh);
      notes.push(sid + " shot " + m.k + " (" + sh.source + (sh.query ? ' "' + sh.query + '"' : sh.name ? ' "' + sh.name + '"' : "") + "): the speaker's footage instead (" + m.why + ")");
    }
  }
  if (o.missingPictures.length) {
    p = dropPictures(p, o.missingPictures.map((m) => m.id));
    for (const m of o.missingPictures) notes.push(sid + " picture " + m.id + ": taken out, the scene keeps its type (" + m.why + ")");
  }
  const l = lintScene(p);
  if (l.ok) return { plan: p, changed: true, kind: "fallback", fallbacks: notes, lint: l };
  const cap = lintedCaptionScene(plan, style);
  notes.push(sid + ": the changed plan fails the lint (" + l.errors.slice(0, 3).join("; ") + "); the speaker with captions instead" + (cap.lint.ok ? "" : " (the caption scene fails the lint too: " + cap.lint.errors.slice(0, 3).join("; ") + ")"));
  return { plan: cap.plan, changed: true, kind: "caption-scene", fallbacks: notes, lint: cap.lint };
}
