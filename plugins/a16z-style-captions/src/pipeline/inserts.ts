// B-roll inserts (spec 9): full-bleed literal footage over the speaker for a phrase at a time. A run
// starts on a word onset, lasts 2-5.5 s and holds 1-4 shots of about 1.4 s; the first run waits for
// the opening line, the last 1.5 s stay on the speaker, and coverage stays under 60%.
import { fs, q, shell, type Sdk } from "./host";
import { FF } from "./sound";
import { searchCandidates, cutCandidate, stockSearchAvailable, probeDuration, hash, type StockClip, type Candidate } from "./stock";
import { ask, parseLoose } from "./semantic";
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
void hash;

// Per shot: the clip it shows (`b` when the shot was lengthened over the next ones), or null when it
// shows the clip of an earlier shot of its run or stays on the speaker.
export type InsertCache = Record<string, { clip: StockClip | null; luma?: number | null; b?: number }>;
const cacheKey = (s: InsertShot) => s.query + "|" + s.alt + "|" + s.k + "|" + Math.round((s.b - s.a) * 10);

// Stock for every run: up to six candidates per moment, shown to the assistant as contact sheets (four
// moments per sheet, one row each), which picks only candidates that show the very thing the words name.
// A run keeps what an earlier build found for it.
export async function fetchInserts(
  sdk: Sdk,
  runs: InsertRun[],
  dir: string,
  onTick: (s: string) => void,
  cache: InsertCache = {},
  words: Word[] = []
): Promise<{ shots: FetchedShot[]; notes: string[] }> {
  const notes: string[] = [];
  if (!runs.length) return { shots: [], notes };
  if (!stockSearchAvailable()) return { shots: [], notes: ["No B-roll: this Selects version has no stock footage search. Update Selects."] };
  const out: FetchedShot[] = [];
  const used = new Set<string>();
  const todo: InsertRun[] = [];
  for (const r of runs) {
    const hits = r.shots.map((s) => cache[cacheKey(s)]);
    if (hits.every((h) => h && (!h.clip || fs().existsSync(h.clip.path)))) {
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

  // candidates
  const cands: Candidate[][] = [];
  for (let k = 0; k < todo.length; k += 1) {
    onTick("Searching footage " + (k + 1) + " of " + todo.length);
    const s0 = todo[k].shots[0];
    cands.push(await searchCandidates([s0.query, s0.alt], 6, used).catch(() => []));
  }
  // previews and contact sheets
  const pdir = fs().join(dir, "previews");
  fs().mkdirSync(pdir, { recursive: true });
  const file = (c: Candidate) => fs().join(pdir, "p" + Math.abs(hash(c.id)) + ".jpg");
  const all = cands.flat().filter((c) => !fs().existsSync(file(c)));
  if (all.length) {
    onTick("Fetching previews");
    await shell(sdk, "Fetch footage previews", all.map((c) => "curl -sfL --max-time 20 -o " + q(file(c)) + " " + q(c.preview) + " || true").join("; "), 180000, 4000).catch(() => "");
  }
  const sheets: { path: string; rows: number[] }[] = [];
  for (let s = 0; s * 4 < todo.length && s < 4; s += 1) {
    const rows = [];
    for (let r = s * 4; r < Math.min(todo.length, s * 4 + 4); r += 1) rows.push(r);
    const sd = fs().join(dir, "sheet-" + s);
    const tiles: string[] = [];
    rows.forEach((r, ri) => {
      for (let c = 0; c < 6; c += 1) {
        const cand = cands[r][c];
        tiles.push(cand && fs().existsSync(file(cand)) ? file(cand) : "");
        void ri;
      }
    });
    const cmd =
      FF +
      "set -e; rm -rf " + q(sd) + "; mkdir -p " + q(sd) + "; " +
      tiles
        .map((t, i) => {
          const name = q(fs().join(sd, String(i + 1).padStart(3, "0") + ".jpg"));
          return t
            ? '"$FF" -v error -y -i ' + q(t) + " -vf " + q("scale=180:320:force_original_aspect_ratio=decrease,pad=180:320:(ow-iw)/2:(oh-ih)/2:color=0x202020,format=yuvj420p") + " -frames:v 1 " + name
            : '"$FF" -v error -y -f lavfi -i color=c=0x202020:s=180x320 -vf format=yuvj420p -frames:v 1 ' + name;
        })
        .join("; ") +
      '; "$FF" -v error -y -framerate 1 -i ' + q(fs().join(sd, "%03d.jpg")) + " -vf " + q("tile=6x" + rows.length + ":padding=6:margin=6:color=white") + " -frames:v 1 -q:v 5 " + q(fs().join(dir, "sheet-" + s + ".jpg"));
    try {
      await shell(sdk, "Lay out footage candidates", cmd, 120000, 4000);
      sheets.push({ path: fs().join(dir, "sheet-" + s + ".jpg"), rows });
    } catch {}
  }

  // the assistant's choice
  let choice: Record<string, number[]> = {};
  let checked = false;
  if (sheets.length) {
    onTick("Checking the footage against the words");
    const said = (r: InsertRun) => words.filter((w) => w.s >= r.a - 0.05 && w.s < r.b).map((w) => w.t).join(" ");
    const lines: string[] = [];
    sheets.forEach((sh, si) =>
      sh.rows.forEach((r, ri) => {
        const run = todo[r];
        lines.push("Sheet " + (si + 1) + ", row " + (ri + 1) + " = moment M" + (r + 1) + ": the speaker says \"" + said(run) + "\" (footage wanted: " + run.shots[0].query + "). Needs " + run.shots.length + " shot" + (run.shots.length > 1 ? "s" : "") + ".");
      })
    );
    const prompt =
      "Pure image task: do NOT use any tools. You pick stock B-roll for an a16z-style Short. Each attached sheet has one row per moment; each row shows up to six candidate clips (columns 1-6, left to right; dark grey tiles are empty).\n\n" +
      lines.join("\n") +
      "\n\nFor each moment choose, in order of preference, the columns whose clip a documentary editor would cut to: it must show the exact object, place, action or era the whole phrase names (coffee is not tea, a treadmill is not a running track). Never choose: a person or people as the main subject (faces, actors, posing, business people, models), 3D renders, CG animations, particles, glowing orbs, illustrations or motion graphics, anything that looks AI-generated (glossy, uncanny food or objects), neon or club lighting, strong colour casts, visible text, logos or watermarks, charts, graphs, dashboards or any screen showing data, fog or near-empty frames, or a visual pun. Hands doing the named action are fine. Return an empty list when nothing fits; staying on the speaker is better than a wrong or generic clip. "+ "Reply with ONLY a JSON object like {\"M1\": [3, 1], \"M2\": []}.";
    const images: { dataUrl: string; name: string }[] = [];
    for (let si = 0; si < sheets.length; si += 1) {
      try {
        const buf: any = await fs().readFile(sheets[si].path);
        const bytes: Uint8Array = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
        let bin = "";
        for (let k = 0; k < bytes.length; k += 1) bin += String.fromCharCode(bytes[k]);
        images.push({ dataUrl: "data:image/jpeg;base64," + btoa(bin), name: "Sheet " + (si + 1) });
      } catch {}
    }
    try {
      const o = parseLoose(await ask(sdk, prompt, images));
      for (const [k, v] of Object.entries(o || {})) if (Array.isArray(v)) choice[k] = (v as any[]).map(Number).filter((n) => n >= 1 && n <= 6);
      checked = true;
    } catch (e: any) {
      notes.push("B-roll check failed (" + String(e?.message || e).slice(0, 100) + "); B-roll was left out.");
      choice = {};
    }
  }

  // cut the chosen clips; a clip whose middle is near black is dropped
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
    // a candidate must be long enough for the shot it fills
    const need = Math.max(...run.shots.map((s) => s.b - s.a)) + 0.7;
    const picks = (choice["M" + (r + 1)] || []).map((c) => cands[r][c - 1]).filter((c) => c && !used.has(c.id) && c.duration >= need);
    // fewer clips than shots: each clip holds one longer shot rather than cutting to itself
    const per = Math.ceil(run.shots.length / Math.max(1, Math.min(run.shots.length, picks.length)));
    for (let g = 0, k = 0; g < run.shots.length; g += per, k += 1) {
      const part = run.shots.slice(g, g + per);
      const cand = picks[k];
      // a clip too short for the longer shot fills its first part only
      const long = cand && cand.duration >= part[part.length - 1].b - part[0].a + 0.7;
      const s = { ...part[0], b: long ? part[part.length - 1].b : part[0].b };
      const clip = cand ? await cut(cand, s) : null;
      if (clip) {
        used.add(cand!.id);
        cache[cacheKey(part[0])] = { clip: clip.clip, luma: clip.luma, b: s.b };
        out.push({ ...s, clip: clip.clip, luma: clip.luma });
      }
      // a settled answer is kept, so a rebuild does not search again
      if (clip || checked) part.slice(clip ? 1 : 0).forEach((x) => (cache[cacheKey(x)] = { clip: null }));
    }
  }
  const wanted = runs.reduce((n, r) => n + (r.shots[r.shots.length - 1].b - r.a), 0);
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
  const out = await shell(sdk, "Measure B-roll brightness", FF + '"$FF" -hide_banner -nostats -ss ' + at.toFixed(2) + " -i " + q(path) + " -vf " + q(vf) + " -frames:v 1 -f null - 2>&1 | grep -o 'YAVG=[0-9.]*' | head -n 1", 30000, 2000);
  const v = Number((out.match(/YAVG=([\d.]+)/) || [])[1]);
  return Number.isFinite(v) ? v : null;
}
export const frameLuma = (sdk: Sdk, path: string, at: number) => lumaOf(sdk, path, at, "");

// Mean luma (0-255) of the caption band of a clip's cover crop, at one moment. Over a bright band the
// captions turn charcoal, as the house style does.
export const captionLuma = (sdk: Sdk, path: string, at: number) => lumaOf(sdk, path, at, ",crop=864:230:108:880");
