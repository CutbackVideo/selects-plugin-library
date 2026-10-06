// B-roll inserts (spec 9): full-bleed literal footage over the speaker for a phrase at a time. A run
// starts on a word onset, lasts 2-5.5 s and holds 1-4 shots of about 1.4 s; the first run waits for
// the opening line, the last 1.5 s stay on the speaker, and coverage stays under 60%.
import { fs, hostFF, sleep, type Sdk } from "./host";
import { searchCandidates, cutCandidate, stockSearchAvailable, probeDuration, type StockClip, type Candidate } from "./stock";
import type { Word, Span } from "../captions/types";

export type Beat = { span: Span; query: string; alt?: string };
export type InsertShot = { a: number; b: number; query: string; alt: string; run: number; k: number };
export type InsertRun = { a: number; b: number; shots: InsertShot[] };

export function planInserts(words: Word[], beats: Beat[], duration: number, blocked: [number, number][], opts: { earliest: number; starts?: number[] }): InsertRun[] {
  // cuts land on caption-unit starts where one is near, else on a word onset
  const onsets = (opts.starts && opts.starts.length ? opts.starts : words.map((w) => w.s)).slice().sort((a, b) => a - b);
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
    let a = Math.max(0, snap(w0!.s) - 0.04);
    // a run covers the words that name the thing and ends on the next caption start
    let e = w1!.e + 0.08;
    const next = onsets.find((o) => o > e - 0.08);
    if (next != null && next - e < 0.6) e = next - 0.04;
    void sentenceEnd;
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
    // stock stays a minority of the Short: designed inserts and the speaker carry the rest
    const fits = (seconds: number) => (covered + seconds) / duration <= 0.32;
    // a moment right after a run continues it instead of being lost: the same footage extends that
    // run (up to 6.4 s), other footage starts its own run where that one ends
    const prev = runs[runs.length - 1];
    if (prev && a < prev.b + 1.5) {
      if (b.query !== prev.shots[0].query) {
        a = prev.b;
        if (e - a < 1.2) continue;
      } else {
        const end = Math.min(e, prev.a + 6.4);
        if (end - prev.b >= 0.9 && fits(end - prev.b)) {
          const s0 = prev.b;
          prev.b = end;
          prev.shots.push({ a: s0, b: end, query: b.query, alt: b.alt || b.query, run: runs.length - 1, k: prev.shots.length });
          covered += end - s0;
        }
        continue;
      }
    }
    if (!fits(e - a)) continue;
    const n = Math.max(1, Math.min(4, Math.ceil((e - a) / 1.8)));
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

// Per shot: the clip it shows (`b` when the shot was lengthened over the next ones), or null when it
// shows the clip of an earlier shot of its run or stays on the speaker.
export type InsertCache = Record<string, { clip: StockClip | null; luma?: number | null; b?: number }>;
const cacheKey = (s: InsertShot) => s.query + "|" + s.alt + "|" + s.k + "|" + Math.round((s.b - s.a) * 10);

// Stock for every run: up to six candidates per moment from the stock search, each shot taking the next
// one that is long enough and not near black. A run keeps what an earlier build found for it.
export async function fetchInserts(
  sdk: Sdk,
  runs: InsertRun[],
  dir: string,
  onTick: (s: string) => void,
  cache: InsertCache = {}
): Promise<{ shots: FetchedShot[]; notes: string[] }> {
  const notes: string[] = [];
  if (!runs.length) return { shots: [], notes };
  if (!stockSearchAvailable()) return { shots: [], notes: ["No B-roll: this Selects version has no stock footage search. Update Selects."] };
  const out: FetchedShot[] = [];
  const used = new Set<string>();
  const todo: InsertRun[] = [];
  for (const r of runs) {
    const hits = r.shots.map((s) => cache[cacheKey(s)]);
    if ((await Promise.all(hits.map(async (h) => h && (!h.clip || await fs().exists(h.clip.path))))).every(Boolean)) {
      for (let k = 0; k < hits.length; k += 1) {
        const h = hits[k]!;
        if (!h.clip) continue;
        if (!h.clip.dur) h.clip.dur = await probeDuration(sdk, h.clip.path);
        used.add(h.clip.id);
        out.push({ ...r.shots[k], b: h.b ?? r.shots[k].b, clip: h.clip, luma: h.luma });
      }
    } else todo.push(r);
  }
  if (!todo.length) return { shots: out, notes };

  // candidates. The search answers an empty list when the stock services fail, so a moment with nothing
  // is asked once more after a pause; one still empty is left for a later rebuild, not settled.
  const found: { run: InsertRun; cands: Candidate[] }[] = [];
  const empty: InsertRun[] = [];
  for (let k = 0; k < todo.length; k += 1) {
    onTick("Searching footage " + (k + 1) + " of " + todo.length);
    const s0 = todo[k].shots[0];
    let list = await searchCandidates([s0.query, s0.alt], 6, used).catch(() => [] as Candidate[]);
    if (!list.length) {
      await sleep(3000);
      list = await searchCandidates([s0.query, s0.alt], 6, used).catch(() => [] as Candidate[]);
    }
    if (list.length) found.push({ run: todo[k], cands: list });
    else empty.push(todo[k]);
  }
  if (empty.length) notes.push("B-roll: the stock search returned nothing for " + empty.length + " of " + todo.length + " moments (the service may be busy); rebuild to try them again.");
  todo.length = 0;
  todo.push(...found.map((f) => f.run));
  const cands = found.map((f) => f.cands);
  if (!todo.length) return { shots: out.sort((a, b) => a.a - b.a), notes };
  // cut the clips in search order (portrait first); a clip that is too short or whose middle is near
  // black gives way to the next one
  const cut = async (cand: Candidate, s: InsertShot) => {
    onTick("Cutting footage " + (out.length + 1));
    const clip = await cutCandidate(sdk, cand, fs().join(dir, "stock"), s.b - s.a + 0.4).catch(() => null);
    if (!clip) return null;
    const whole = await frameLuma(sdk, clip.path, (s.b - s.a) / 2).catch(() => null);
    if (whole != null && whole < 28) return null;
    return { clip, luma: await captionLuma(sdk, clip.path, (s.b - s.a) / 2).catch(() => null) };
  };
  for (let r = 0; r < todo.length; r += 1) {
    const run = todo[r];
    const pool = cands[r].filter((c) => !used.has(c.id));
    let next = 0;
    for (const s0 of run.shots) {
      let placed = false;
      while (!placed && next < pool.length) {
        const cand = pool[next++];
        if (used.has(cand.id) || cand.duration < s0.b - s0.a + 0.7) continue;
        const clip = await cut(cand, s0);
        if (!clip) continue;
        used.add(cand.id);
        cache[cacheKey(s0)] = { clip: clip.clip, luma: clip.luma };
        out.push({ ...s0, clip: clip.clip, luma: clip.luma });
        placed = true;
      }
      // the search had footage for this moment, so the answer is kept and a rebuild does not search again
      if (!placed) cache[cacheKey(s0)] = { clip: null };
    }
  }
  const wanted = runs.filter((r) => !empty.includes(r)).reduce((n, r) => n + (r.shots[r.shots.length - 1].b - r.a), 0);
  const got = out.reduce((n, x) => n + x.b - x.a, 0);
  if (got < wanted - 0.05) notes.push("B-roll: " + (wanted - got).toFixed(1) + " of " + wanted.toFixed(1) + " s had no fitting footage and stay on the speaker.");
  out.sort((a, b) => a.a - b.a);
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
  // metadata=print logs the value on stderr
  const r = await hostFF("runFFmpeg", ["-hide_banner", "-nostats", "-ss", at.toFixed(2), "-i", path, "-vf", vf, "-frames:v", "1", "-f", "null", "-"], 30000);
  const v = Number(((r.stderr + r.stdout).match(/YAVG=([\d.]+)/) || [])[1]);
  return Number.isFinite(v) ? v : null;
}
export const frameLuma = (sdk: Sdk, path: string, at: number) => lumaOf(sdk, path, at, "");

// Mean luma (0-255) of the caption band of a clip's cover crop, at one moment. Over a bright band the
// captions turn charcoal, as the house style does.
export const captionLuma = (sdk: Sdk, path: string, at: number) => lumaOf(sdk, path, at, ",crop=864:230:108:880");
