// B-roll inserts (spec 9): full-bleed literal footage over the speaker for a phrase at a time. A run
// starts on a word onset, lasts 2-5.5 s and holds 1-4 shots of about 1.4 s; the first run waits for
// the opening line, the last 1.5 s stay on the speaker, and coverage stays under 60%.
import { fs, q, shell, type Sdk } from "./host";
import { FF } from "./sound";
import { stockClip, stockSearchAvailable, type StockClip } from "./stock";
import type { Word, Span } from "../captions/types";

export type Beat = { span: Span; query: string; alt?: string };
export type InsertShot = { a: number; b: number; query: string; alt: string; run: number; k: number };
export type InsertRun = { a: number; b: number; shots: InsertShot[] };

export function planInserts(words: Word[], beats: Beat[], duration: number, blocked: [number, number][], opts: { earliest: number }): InsertRun[] {
  const onsets = words.map((w) => w.s).sort((a, b) => a - b);
  const snap = (t: number) => onsets.reduce((best, o) => (Math.abs(o - t) < Math.abs(best - t) ? o : best), t);
  const at = (i: number) => words.find((w) => w.i === i);
  const runs: InsertRun[] = [];
  let covered = 0;
  const sorted = beats
    .map((b) => ({ b, w0: at(b.span[0]), w1: at(b.span[1]) }))
    .filter((x) => x.w0 && x.w1)
    .sort((x, y) => x.w0!.s - y.w0!.s);
  // the end of the sentence a word belongs to
  const sentenceEnd = (w: Word) => {
    const k = words.indexOf(w);
    for (let j = k; j < words.length; j += 1) if (/[.!?]["”’)]*$/.test(words[j].t)) return words[j].e;
    return words[words.length - 1].e;
  };
  for (const { b, w0, w1 } of sorted) {
    let a = Math.max(0, w0!.s - 0.04);
    // a run carries the rest of its sentence when that stays under 5.5 s
    let e = Math.max(w1!.e, Math.min(sentenceEnd(w1!), a + 5.5)) + 0.08;
    const next = onsets.find((o) => o > e - 0.08);
    if (next != null && next - e < 0.35) e = next - 0.04;
    if (e - a < 2.0) e = snap(a + 2.2) - 0.04;
    if (e - a > 5.5) e = snap(a + 5.0) - 0.04;
    if (a < opts.earliest) {
      if (e - opts.earliest < 1.5) continue;
      a = snap(opts.earliest) - 0.04;
    }
    if (e > duration - 1.5) e = snap(duration - 1.5) - 0.04;
    if (e - a < 1.2) continue;
    const card = blocked.find(([x, y]) => a < y + 0.3 && e > x - 0.3);
    if (card) {
      // keep the part after the card when it is long enough
      if (e - (card[1] + 0.6) < 1.5) continue;
      a = snap(card[1] + 0.6) - 0.04;
    }
    // a moment right after a run extends that run (up to 6.4 s) instead of being lost
    const prev = runs[runs.length - 1];
    if (prev && a < prev.b + 1.5) {
      const end = Math.min(e, prev.a + 6.4);
      if (end - prev.b >= 0.9) {
        const s0 = prev.b;
        prev.b = end;
        prev.shots.push({ a: s0, b: end, query: b.query, alt: b.alt || b.query, run: runs.length - 1, k: prev.shots.length });
        covered += end - s0;
      }
      continue;
    }
    if ((covered + (e - a)) / duration > 0.6) break;
    const n = Math.max(1, Math.min(4, Math.round((e - a) / 1.45)));
    const cuts = [a];
    for (let k = 1; k < n; k += 1) cuts.push(Math.max(cuts[k - 1] + 0.9, snap(a + ((e - a) * k) / n) - 0.04));
    cuts.push(e);
    const run: InsertRun = { a, b: e, shots: [] };
    for (let k = 0; k + 1 < cuts.length; k += 1) if (cuts[k + 1] - cuts[k] > 0.5) run.shots.push({ a: cuts[k], b: cuts[k + 1], query: b.query, alt: b.alt || b.query, run: runs.length, k });
    if (!run.shots.length) continue;
    runs.push(run);
    covered += e - a;
  }
  return runs;
}

export type FetchedShot = InsertShot & { clip: StockClip; luma?: number | null };

// One stock clip per shot: the beat's query, then its alternative; a run never repeats a clip.
export type InsertCache = Record<string, { clip: StockClip; luma?: number | null }>;
const cacheKey = (s: InsertShot) => s.query + "|" + s.alt + "|" + s.k + "|" + Math.round((s.b - s.a) * 10);

export async function fetchInserts(sdk: Sdk, runs: InsertRun[], dir: string, onTick: (s: string) => void, cache: InsertCache = {}): Promise<{ shots: FetchedShot[]; notes: string[] }> {
  const notes: string[] = [];
  if (!runs.length) return { shots: [], notes };
  if (!stockSearchAvailable()) return { shots: [], notes: ["No B-roll: this Selects version has no stock footage search. Update Selects."] };
  const out: FetchedShot[] = [];
  const used: string[] = [];
  let done = 0;
  const total = runs.reduce((n, r) => n + r.shots.length, 0);
  for (const r of runs) {
    for (const s of r.shots) {
      onTick("B-roll " + (done + 1) + " of " + total);
      // a rebuild keeps the footage it found before
      const hit = cache[cacheKey(s)];
      if (hit && fs().existsSync(hit.clip.path) && !used.includes(hit.clip.id)) {
        used.push(hit.clip.id);
        out.push({ ...s, clip: hit.clip, luma: hit.luma });
        done += 1;
        continue;
      }
      const qs = s.k % 2 ? [s.alt, s.query] : [s.query, s.alt];
      const seconds = s.b - s.a + 0.4;
      let clip = await stockClip(sdk, qs, "portrait", fs().join(dir, "stock"), seconds, used).catch(() => null);
      if (!clip) clip = await stockClip(sdk, qs, "landscape", fs().join(dir, "stock"), seconds, used).catch(() => null);
      done += 1;
      if (!clip) continue;
      used.push(clip.id);
      // a near-black clip (a fade or a night shot) reads as a broken frame
      const whole = await frameLuma(sdk, clip.path, (s.b - s.a) / 2).catch(() => null);
      if (whole != null && whole < 28) continue;
      const luma = await captionLuma(sdk, clip.path, (s.b - s.a) / 2).catch(() => null);
      cache[cacheKey(s)] = { clip, luma };
      out.push({ ...s, clip, luma });
    }
  }
  if (out.length < total) notes.push("B-roll: " + (total - out.length) + " of " + total + " shots found no stock clip and stay on the speaker.");
  return { shots: out, notes };
}

// The cover crop of a clip in the 9:16 frame, with an optional slow push for about one shot in six.
export function coverRect(sw: number, sh: number, W: number, H: number) {
  const k = Math.max(W / sw, H / sh);
  const w = sw * k;
  const h = sh * k;
  return { x: Math.round(((W - w) / 2) * 100) / 100, y: Math.round(((H - h) / 2) * 100) / 100, w: Math.round(w * 100) / 100, h: Math.round(h * 100) / 100 };
}

async function lumaOf(sdk: Sdk, path: string, at: number, crop: string): Promise<number | null> {
  const vf = "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920" + crop + ",signalstats,metadata=print:key=lavfi.signalstats.YAVG";
  const out = await shell(sdk, "Measure B-roll brightness", FF + '"$FF" -hide_banner -nostats -ss ' + at.toFixed(2) + " -i " + q(path) + " -vf " + q(vf) + " -frames:v 1 -f null - 2>&1 | grep -o 'YAVG=[0-9.]*' | head -n 1", 30000, 2000);
  const v = Number((out.match(/YAVG=([\d.]+)/) || [])[1]);
  return Number.isFinite(v) ? v : null;
}
export const frameLuma = (sdk: Sdk, path: string, at: number) => lumaOf(sdk, path, at, "");

// Mean luma (0-255) of the caption band of a clip's cover crop, at one moment. Over a bright band the
// captions turn charcoal, as the house style does.
export const captionLuma = (sdk: Sdk, path: string, at: number) => lumaOf(sdk, path, at, ",crop=864:230:108:880");
