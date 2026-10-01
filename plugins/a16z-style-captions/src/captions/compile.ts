// The caption compiler: transcript words + semantic tags + the edit (cuts, shots) -> caption units with
// text, lines, timing, emphasis, entrance and position. Everything here is deterministic.
import { makeTokens, type Token } from "./tokens";
import { segment } from "./segment";
import { lockups, type Group } from "./lockups";
import { shownText } from "./text";
import { norm, wordClass, isNumberWord, IMPERATIVE } from "./lexicon";
import type { Word, Tags, Style, Shot, CapUnit, CapLine, CapToken, Entrance, EmphasisKind, CaptionTrack, Span } from "./types";

const inSpan = (i: number, sp: Span) => i >= sp[0] && i <= sp[1];
const BURGUNDY = "#A8495C";
const GOLD = "#DFBB88";

type Timed = Group & { start: number; end: number };

// ---- timing (spec 4) -------------------------------------------------------------------------------
function timing(gs: Group[], cuts: number[], duration: number, fps: number): Timed[] {
  const f1 = 1 / fps;
  const units: Timed[] = gs.map((g) => ({ ...g, start: Math.max(0, g.toks[0].s - f1), end: 0 }));
  // snap in-points to picture cuts; each cut snaps at most one unit, the nearest onset
  const claimed = new Set<number>();
  for (const c of cuts) {
    let best = -1;
    let bestD = 1e9;
    units.forEach((u, k) => {
      const onset = u.toks[0].s;
      const firstEnd = u.toks[0].e;
      const next = units[k + 1];
      if (next && Math.abs(next.toks[0].s - c) <= 0.05 && k !== units.length - 1) return;
      const r1 = c >= onset - 0.1 && c <= Math.min(onset + 0.25, firstEnd);
      const prevEnd = k > 0 ? units[k - 1].toks[units[k - 1].toks.length - 1].e : -1;
      const r2 = c >= onset - 0.3 && c < onset - 0.1 && prevEnd <= c;
      if (!r1 && !r2) return;
      const d = Math.abs(onset - c);
      if (d < bestD || (d === bestD && k > best)) {
        bestD = d;
        best = k;
      }
    });
    if (best >= 0 && !claimed.has(best)) {
      claimed.add(best);
      units[best].start = c;
    }
  }
  units.forEach((u, k) => {
    const next = units[k + 1];
    const lastEnd = u.toks[u.toks.length - 1].e;
    if (!next) {
      u.end = duration;
      return;
    }
    let out = next.start;
    const c = cuts.find((x) => x > lastEnd + 0.02 && x < next.start - 0.02);
    const pause = next.toks[0].s - lastEnd;
    if (c != null) {
      if (next.start - c <= 0.45 && !cuts.some((x) => x > c && x < next.start)) {
        next.start = c;
        out = c;
      } else if (pause >= 0.4 && u.toks.length >= 2) out = c;
    } else if (pause >= 0.8) {
      const discourse = u.toks.length === 1 && /,$/.test(u.toks[0].t);
      out = discourse ? Math.min(next.start, lastEnd + 2.0) : Math.min(next.start, lastEnd + 0.15);
    }
    u.end = Math.max(u.start + f1, out);
  });
  return units;
}

// Units shorter than 5 frames merge with their shorter neighbour (plain units only).
function mergeShort(us: Timed[], fps: number): Timed[] {
  const min = 5 / fps - 1e-6;
  for (let guard = 0; guard < 50; guard += 1) {
    const k = us.findIndex((u) => u.kind === "plain" && u.end - u.start < min);
    if (k < 0) break;
    const prev = us[k - 1];
    const next = us[k + 1];
    const into = prev && prev.kind === "plain" && (!next || next.kind !== "plain" || prev.toks.length <= next.toks.length) ? k - 1 : next && next.kind === "plain" ? k + 1 : -1;
    if (into < 0) {
      // nothing to merge into: borrow time from the next unit
      if (next) next.start = Math.min(next.end - min, us[k].start + min);
      us[k].end = us[k].start + min;
      if (next && next.start < us[k].end) next.start = us[k].end;
      break;
    }
    const a = us[Math.min(k, into)];
    const b = us[Math.max(k, into)];
    const m: Timed = { ...a, toks: [...a.toks, ...b.toks], lines: [0], end: b.end, sentenceEnd: b.sentenceEnd, phraseEnd: b.phraseEnd };
    us.splice(Math.min(k, into), 2, m);
  }
  return us;
}

// ---- emphasis (spec 6) -----------------------------------------------------------------------------
type Em = { kind: EmphasisKind; score: number; tok?: number };

function emphasisOf(u: Timed, k: number, us: Timed[], tags: Tags): Em | null {
  const hit = (i: number) => u.toks.findIndex((t) => t.src.includes(i));
  let best: Em | null = null;
  const take = (e: Em) => {
    if (!best || e.score > best.score) best = e;
  };
  for (const kt of tags.keyTerms || []) {
    const j = hit(kt.head);
    if (j >= 0) take({ kind: kt.kind, score: kt.priority + (kt.kind === "P" ? 1 : 0), tok: j });
  }
  for (const p of tags.punchlines || []) if (u.toks.some((t) => t.src.includes(p[1]))) take({ kind: "P", score: 4.5 });
  if (!tags.keyTerms) {
    const prev = us[k - 1];
    if ((!prev || prev.sentenceEnd) && IMPERATIVE.has(norm(u.toks[0].t))) take({ kind: "D", score: 3 });
    const j = u.toks.findIndex((t) => /\d/.test(t.t) && /[x%]$|\d{3}/.test(t.t));
    if (j >= 0) take({ kind: "N", score: 3.5, tok: j });
    if (k === us.length - 1) take({ kind: "P", score: 3 });
  }
  return best;
}

// ---- assembly --------------------------------------------------------------------------------------
export type CompileInput = {
  words: Word[];
  tags?: Tags;
  style: Style;
  cuts?: number[]; // picture cuts, seconds
  shots?: Shot[];
  duration: number;
  suppress?: [number, number][]; // transcript index ranges carried by a card (no caption)
};

export function compileCaptions(inp: CompileInput): CaptionTrack {
  const tags = inp.tags || {};
  const style = inp.style;
  const cuts = (inp.cuts || []).slice().sort((a, b) => a - b);
  const shots = inp.shots || [];
  const fps = style.fps;
  const notes: string[] = [];
  const toks = makeTokens(inp.words, tags);
  for (const t of toks) if (!t.drop && (inp.suppress || []).some((r) => t.src.some((i) => i >= r[0] && i <= r[1]))) t.drop = "card";
  const chunks = segment(toks, inp.words, tags, style, cuts);
  if (!chunks.length) return { units: [], style, notes: ["No words to caption."] };
  let groups = lockups(chunks, tags, style, inp.duration);
  shownText(groups, tags, style);
  let us = mergeShort(timing(groups, cuts, inp.duration, fps), fps);
  groups = us;

  // emphasis budget: about one event per 5 s, clustered, no gap over 9 s
  const ems = us.map((u, k) => (u.kind === "plain" ? emphasisOf(u, k, us, tags) : null));
  const chosen = new Set<number>();
  const target = Math.max(1, Math.round(inp.duration / 5));
  const already = us.filter((u) => u.kind !== "plain").length;
  const order = ems.map((e, k) => ({ e, k })).filter((x) => x.e).sort((a, b) => b.e!.score - a.e!.score);
  const near = (k: number) => {
    // at most 3 events in any window of 6 units, so emphasis clusters and then rests
    let n = 0;
    for (let j = Math.max(0, k - 5); j <= Math.min(us.length - 1, k + 5); j += 1) if (chosen.has(j) || us[j].kind !== "plain") n += 1;
    return n;
  };
  for (const { k } of order) {
    if (chosen.size + already >= target) break;
    if (near(k) >= 3) continue;
    if (k > 0 && us[k - 1].kind !== "plain") continue;
    chosen.add(k);
  }
  // fill long gaps (> 9 s) with the best available unit
  for (let guard = 0; guard < 20; guard += 1) {
    const ev = us.map((u, k) => (chosen.has(k) || u.kind !== "plain" ? u.start : -1)).filter((x) => x >= 0);
    const pts = [0, ...ev, inp.duration];
    let gapAt = -1;
    for (let j = 0; j + 1 < pts.length; j += 1) if (pts[j + 1] - pts[j] > 9) gapAt = j;
    if (gapAt < 0) break;
    const a = pts[gapAt];
    const b = pts[gapAt + 1];
    // only a unit that carries a real trigger; an invented emphasis reads as random
    const mid = us
      .map((u, k) => ({ u, k }))
      .filter((x) => x.u.kind === "plain" && ems[x.k] && x.u.start > a + 2 && x.u.start < b - 2 && !chosen.has(x.k))
      .sort((x, y) => ems[y.k]!.score - ems[x.k]!.score || Math.abs(x.u.start - (a + b) / 2) - Math.abs(y.u.start - (a + b) / 2));
    if (!mid.length) break;
    chosen.add(mid[0].k);
  }
  // HUGE for the strongest payoff (at most 2), and only on short units
  const huge = new Set(
    [...chosen]
      .filter((k) => ems[k] && ems[k]!.kind === "P" && us[k].toks.length <= 2)
      .sort((a, b) => ems[b]!.score - ems[a]!.score)
      .slice(0, 1)
  );

  // ---- positions -----------------------------------------------------------------------------------
  const shotAt = (t: number) => shots.find((s) => t >= s.from - 1e-6 && t < s.to) || shots[shots.length - 1];
  // speaker shots: the caption sits just under the chin (its top about 0.035 H below it), clamped to
  // 0.50-0.80; the values are pooled into at most three levels so the line does not wander between
  // shots of one angle
  const raw = shots.filter((s) => s.kind === "speaker").map((s) => (s.face ? Math.min(0.8, Math.max(0.5, s.face.chin + 0.046)) : 0.52));
  const levels: number[] = [];
  for (const v of [...raw].sort((a, b) => a - b)) {
    const last = levels[levels.length - 1];
    if (last != null && v - last < 0.04) levels[levels.length - 1] = Math.max(last, v);
    else levels.push(v);
  }
  while (levels.length > 3) {
    // merge the closest pair, keeping the lower position (further from the face)
    let k = 0;
    for (let j = 1; j + 1 < levels.length; j += 1) if (levels[j + 1] - levels[j] < levels[k + 1] - levels[k]) k = j;
    levels.splice(k, 2, Math.max(levels[k], levels[k + 1]));
  }
  const level = (v: number) => levels.find((l) => l >= v - 1e-6) ?? levels[levels.length - 1] ?? v;
  const yFor = (t: number): number => {
    const s = shotAt(t);
    if (!s) return 0.5;
    if (s.kind !== "speaker") return 0.52;
    if (style.yAnchor === "fixed_050") return 0.5;
    return level(s.face ? Math.min(0.8, Math.max(0.5, s.face.chin + 0.046)) : 0.52);
  };

  // ---- build (word by word) ranking (spec 7.4) ----------------------------------------------------
  const rapid = (k: number) => {
    const one = (j: number) => us[j] && us[j].toks.length === 1 && us[j].end - us[j].start < 0.4;
    return (one(k) && one(k + 1) && one(k + 2)) || (one(k - 1) && one(k) && one(k + 1)) || (one(k - 2) && one(k - 1) && one(k));
  };
  const eligible: { k: number; score: number }[] = [];
  const build = new Set<number>();
  us.forEach((u, k) => {
    if (u.kind !== "plain") {
      build.add(k);
      return;
    }
    const n = u.toks.length;
    const sp = u.toks[n - 1].s - u.toks[0].s;
    if (n === 1 || n >= 5 || rapid(k) || sp < 0.25) return;
    const isQuotative = (tags.quotatives || []).some((q) => u.toks.some((t) => t.src.some((i) => inSpan(i, q))));
    if (isQuotative) return;
    let score = 0;
    const prev = us[k - 1];
    if (!prev || (prev.sentenceEnd && u.toks[0].s - prev.toks[prev.toks.length - 1].e > 0.25)) score += 1.0;
    if (chosen.has(k)) score += 0.8;
    if (u.toks.some((t) => isNumberWord(t.t) || /\d/.test(t.t))) score += 0.5;
    const s = shotAt(u.start);
    if (s && s.to - s.from >= 1 && us.filter((x) => x.start >= s.from && x.start < s.to).length > 1) score += 0.4;
    eligible.push({ k, score });
  });
  eligible.sort((a, b) => b.score - a.score || a.k - b.k);
  eligible.slice(0, Math.round(style.buildShare * eligible.length)).forEach((x) => build.add(x.k));

  // ---- entrances (spec 7.1-7.3) --------------------------------------------------------------------
  const body: Entrance = { kind: "blur", sigma: style.sigma0, frames: style.blurFrames, curve: "quad" };
  const big: Entrance = { kind: "blur", sigma: 8, frames: 8, curve: "quad" };
  const cut: Entrance = { kind: "cut", sigma: 0, frames: 0, curve: "quad" };
  let punchCuts = 0;
  let flashes = 0;
  const serifVariant = style.typeVariant === "serif_sparse" || style.typeVariant === "serif_dense";
  let lastSerif = -1e9;

  const out: CapUnit[] = us.map((u, k) => {
    const em = u.kind === "plain" && chosen.has(k) ? ems[k] : null;
    const n = u.toks.length;
    // lines and tiers
    const lines: CapLine[] = [];
    const bounds = [...u.lines, n];
    for (let j = 0; j + 1 < bounds.length; j += 1) {
      const isBig = j === u.big;
      lines.push({ from: bounds[j], to: bounds[j + 1], tier: u.kind === "plain" ? "normal" : isBig ? "big" : "small", scale: u.kind === "plain" ? 1 : isBig ? 2 : 0.85, face: "sans" });
    }
    if (u.kind === "hook" && lines.length === 1) {
      lines[0].tier = "large";
      lines[0].scale = 1.5;
    }
    let role: CapUnit["role"] = u.kind === "hook" ? "hook" : u.kind === "lockup" ? "lockup" : "body";
    const tokens: CapToken[] = u.toks.map((t: Token) => ({ text: t.t, src: t.src, s: t.s, e: t.e, reveal: 0 }));
    if (em) {
      const kind = em.kind;
      if (huge.has(k)) {
        lines[0].tier = "huge";
        lines[0].scale = 2.2;
        role = "large";
      } else if (serifVariant && (kind === "C" || (kind === "T" && n > 1)) && em.tok != null && u.start - lastSerif >= 6) {
        tokens[em.tok].face = "serif";
        lastSerif = u.start;
      } else if (serifVariant && kind === "Q" && n <= 6 && u.start - lastSerif >= 6) {
        lines.forEach((l) => (l.face = "serif"));
        lastSerif = u.start;
      } else {
        lines[0].tier = "large";
        lines[0].scale = n <= 2 ? 1.6 : 1.37;
        role = "large";
      }
    }
    // lockup big lines stay in the sans (as the corpus sets them); only a quoted punch line goes serif
    if (u.kind !== "plain" && u.big >= 0 && serifVariant && u.why === "quote") lines[u.big].face = "serif";
    // entrance
    let entrance = u.kind === "plain" && !em ? body : big;
    if (style.dialect === "CUT") {
      const keep = k === 0 || k === us.length - 1 || u.kind !== "plain";
      entrance = keep ? { ...body, sigma: k === 0 || k === us.length - 1 ? 9 : 5, frames: k === 0 || k === us.length - 1 ? 9 : 4 } : cut;
    } else if (style.dialect === "RISE") entrance = { kind: "rise", sigma: 0, frames: 3, curve: "cubic" };
    if (rapid(k) && u.kind === "plain" && !(us[k - 1] && norm(us[k - 1].toks.map((t) => t.t).join(" ")) === norm(u.toks.map((t) => t.t).join(" ")))) entrance = cut;
    // a punch word landing on its own picture cut hard-cuts (at most 2 per video)
    if (em && n === 1 && punchCuts < 2 && cuts.some((c) => Math.abs(c - u.start) < 0.5 / fps)) {
      entrance = cut;
      punchCuts += 1;
    }
    // reveal times
    const f1 = 1 / fps;
    let last = -1;
    tokens.forEach((t) => {
      let r = Math.max(u.start, Math.round((t.s - f1) * fps) / fps);
      if (last >= 0 && r - last < 2 / fps) r = last;
      t.reveal = build.has(k) ? r : u.start;
      last = r;
    });
    // colour flash: the hook's big word in the first 1.5 s, or the setup noun of the thesis reveal
    if (flashes < 1 && u.kind === "hook" && u.start < 1.5) {
      const bl = lines[Math.max(0, u.big)];
      const tok = tokens.slice(bl.from, bl.to).reduce((a, t, j) => (wordClass(t.text) === "CONT" && t.text.length > (a >= 0 ? tokens[bl.from + a].text.length : 0) ? j : a), -1);
      if (tok >= 0) {
        tokens[bl.from + tok].accent = BURGUNDY;
        flashes += 1;
      }
    }
    for (const r of tags.reveals || [])
      if (flashes < 2) {
        const j = tokens.findIndex((t) => t.src.some((i) => inSpan(i, r.setup)) && wordClass(t.text) === "CONT");
        if (j >= 0 && k > 0) {
          tokens[j].accent = GOLD;
          flashes += 1;
        }
      }
    const unit: CapUnit = {
      tokens,
      lines,
      template: lines.length === 1 ? "single" : u.template,
      start: u.start,
      end: u.end,
      build: build.has(k),
      entrance,
      role,
      emphasis: em ? em.kind : u.kind !== "plain" ? "T" : undefined,
      y: yFor(u.start),
    };
    return unit;
  });
  // the caption keeps its height through a sentence on the speaker: a punch-in jump cut mid-sentence
  // does not move it
  let held: { sentence: number; y: number } | null = null;
  out.forEach((unit, k) => {
    const s = shotAt(unit.start);
    const onSpeaker = !s || s.kind === "speaker";
    if (onSpeaker && held && held.sentence === us[k].sentence) unit.y = held.y;
    else if (onSpeaker) held = { sentence: us[k].sentence, y: unit.y };
    else held = null;
  });

  // slot swaps and repetition grow (spec 7.6)
  for (let k = 1; k < out.length; k += 1) {
    const a = out[k - 1];
    const b = out[k];
    if (a.lines.length !== 1 || b.lines.length !== 1) continue;
    const same = (x: CapToken, y: CapToken) => norm(x.text) === norm(y.text);
    if (a.tokens.length === 1 && b.tokens.length === 1 && same(a.tokens[0], b.tokens[0])) {
      a.grow = a.grow || 1;
      b.grow = Math.min(1.35, (a.grow || 1) === 1 ? 1.15 : 1.35);
      b.entrance = a.entrance.kind === "cut" ? body : a.entrance;
      continue;
    }
    let p = 0;
    while (p < a.tokens.length - 1 && p < b.tokens.length - 1 && same(a.tokens[p], b.tokens[p])) p += 1;
    if (p >= 1 && b.tokens.length - p <= 2 && !cuts.some((c) => Math.abs(c - b.start) < 0.06) && Math.abs(a.end - b.start) < 0.05) b.swapFrom = p;
  }
  notes.push(out.length + " captions, " + out.filter((u) => u.role === "lockup" || u.role === "hook").length + " lockups, " + chosen.size + " emphasised");
  return { units: out, style, notes };
}

export function unitText(u: CapUnit) {
  return u.lines.map((l) => u.tokens.slice(l.from, l.to).map((t) => t.text).join(" ")).join(" / ");
}
