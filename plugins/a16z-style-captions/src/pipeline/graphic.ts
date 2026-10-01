// Everything the Short's graphic draws, from the job and a fresh read of the Short: caption units,
// keyword cards, the name tag and the brand mark.
import { fs } from "./host";
import { resolveSemantic, sentences, parseLoose } from "./semantic";
import { compileCaptions, unitText } from "../captions/compile";
import { wordClass } from "../captions/lexicon";
import { chooseStyle } from "../captions/style";
import { packCaptions } from "../captions/pack";
import type { Word, Span, Shot } from "../captions/types";
import type { DraftInfo } from "./source";
import type { Job } from "./make";
import type { Card, GraphicData, NameTag } from "../motion/data";

const norm = (s: string) => String(s || "").toLowerCase().replace(/[’]/g, "'").replace(/[^\p{L}\p{N}']+/gu, "");

export type Look = { data: GraphicData; notes: string[]; summary: string };

// The Short's words carry the source word indices the semantic pass used: the Short keeps the source's
// words in order (only pauses and fillers go), so a forward match by text finds each one.
export function alignWords(short: { t: string; s: number; e: number }[], src: { i: number; t: string }[], fps: number): Word[] {
  const out: Word[] = [];
  let j = 0;
  for (const w of short) {
    let found = -1;
    for (let k = j; k < Math.min(src.length, j + 12); k += 1)
      if (norm(src[k].t) === norm(w.t)) {
        found = k;
        break;
      }
    const i = found >= 0 ? src[found].i : -1 - out.length;
    if (found >= 0) j = found + 1;
    out.push({ i, t: w.t, s: w.s / fps, e: w.e / fps });
  }
  return out;
}

export type Prepared = {
  fps: number;
  duration: number;
  words: Word[];
  semantic: Job["semantic"];
  cuts: number[];
  cards: Card[];
  suppress: [number, number][];
  windows: { from: number; to: number }[];
  title: { a: number; b: number; words: { text: string; at: number; line: number }[] } | null;
};

// The Short's words (with source indices), the semantic tags, picture cuts and keyword cards.
export function prepareShort(job: Job, short: DraftInfo): Prepared {
  const fps = short.fps;
  const duration = short.endFrame / fps;
  const words = alignWords(short.words, job.srcWords, fps);
  // the assistant's answer is resolved again, so a rebuild picks up resolver fixes
  let semantic = job.semantic;
  if (semantic?.raw)
    try {
      semantic = resolveSemantic(parseLoose(semantic.raw), job.srcWords, sentences(job.srcWords), semantic.raw);
    } catch {}
  const tags = semantic?.tags || {};
  const at = (i: number) => words.find((w) => w.i === i);

  // picture cuts: the Short's clip changes plus shot changes inside clips
  const cutSet = new Set<number>();
  short.clips.forEach((c, k) => k > 0 && cutSet.add(Math.round((c.s / fps) * 1000) / 1000));
  for (const c of job.framing.cuts) cutSet.add(c);
  const cuts = [...cutSet].sort((a, b) => a - b);

  // keyword cards and designed inserts. A card spells a concept for about 1.5 s; a design carries the
  // words themselves (list, quote, bubbles...). None in the first 3 s or the last 1.5 s, at least 4 s
  // apart, no captions while one is up.
  const cards: Card[] = [];
  const suppress: [number, number][] = [];
  const caseWord = (w: string) => (/[A-Z].*[A-Z]/.test(w) || properNoun(w, words) ? w : w.toLowerCase());
  const free = (a: number, b: number) => a / fps >= 3 && b / fps <= duration - 1.5 && !cards.some((x) => a < x.b + 4 * fps && b > x.a - 4 * fps);
  const place = (c: Card) => {
    cards.push(c);
    const inside = words.filter((w) => w.s * fps >= c.a - 1 && w.s * fps < c.b && w.i >= 0).map((w) => w.i);
    if (inside.length) suppress.push([Math.min(...inside), Math.max(...inside)] as Span);
  };
  const onset = (sp: Span | null) => (sp ? at(sp[0]) : undefined);
  if (job.opts.cards !== false) {
    for (const c of semantic?.cards || []) {
      if (cards.filter((x) => x.kind === "keyword").length >= 2) break;
      const first = at(c.span[0]);
      const last = at(c.span[1]);
      if (!first || !last) continue;
      // the card cuts in four frames before the word it spells (the house build: empty, specks, word)
      const textWord = words.find((w) => w.s >= first.s - 0.01 && w.e <= last.e + 0.01 && norm(w.t) === norm(c.text.split(/\s+/)[0])) || first;
      const a = Math.round((textWord.s - 4 / 24) * fps);
      const b = Math.min(Math.round((textWord.s + 2.2) * fps), Math.max(Math.round((textWord.s + 1.4) * fps), Math.round((last.e + 0.2) * fps)));
      if (a / fps > 0.7 * duration || !free(a, b)) continue;
      // the spoken words just before the concept ride above it as a small lead-in ("it's called the")
      const lead = words.filter((w) => w.s >= first.s - 0.01 && w.s < textWord.s - 0.01 && w.i >= 0).slice(-4).map((w) => caseWord(w.t.replace(/[.,!?;:"]+$/g, "")));
      const items: Card["items"] = [];
      if (lead.length) items.push({ text: lead.join(" "), at: Math.max(0, Math.round((first.s - 1 / fps) * fps)), role: "label" });
      items.push({ text: c.text.split(/\s+/).map(caseWord).join(" "), at: a, role: "key" });
      place({ a: Math.min(a, items[0].at), b, kind: "keyword", items });
    }
    for (const dz of semantic?.designs || []) {
      const spoken = dz.parts.filter((p) => p.span);
      const first = onset(spoken[0]?.span || null);
      const lastPart = spoken[spoken.length - 1]?.span;
      const last = lastPart ? at(lastPart[1]) : undefined;
      if (!first || !last) continue;
      const lead = dz.kind === "chapter" ? 0.1 : 0.12;
      const a = Math.round((first.s - lead) * fps);
      const minDur = dz.kind === "chapter" || dz.kind === "window" ? 1.6 : 1.4;
      const maxDur = dz.kind === "list" || dz.kind === "bubbles" ? 5.5 : dz.kind === "versus" ? 2.5 : dz.kind === "window" || dz.kind === "document" ? 4 : 3.2;
      const b = Math.round(Math.min(first.s + maxDur, Math.max(first.s + minDur, last.e + 0.35)) * fps);
      if (!free(a, b)) continue;
      const items = dz.parts.map((p, k) => {
        const w = onset(p.span);
        const prev = dz.parts[k - 1]?.span ? at(dz.parts[k - 1].span![1]) : undefined;
        const t = w ? w.s : prev ? prev.e : first.s;
        const text = p.role === "key" && dz.kind === "number" ? p.text : p.text.replace(/["“”]/g, "").split(/\s+/).map(caseWord).join(" ");
        return { text, at: Math.max(a, Math.round((t - 1 / fps) * fps)), role: p.role };
      });
      const src = short.clips[0];
      place({ a, b, kind: dz.kind, items, numeral: dz.numeral, aspect: src && src.sw && src.sh ? src.sw / src.sh : 16 / 9 });
    }
  }
  cards.sort((x, y) => x.a - y.a);
  // a card never shows an empty field for more than four frames
  for (const c of cards) if (c.items.length) c.items[0].at = Math.min(c.items[0].at, c.a + Math.round((4 * fps) / 24));
  // one card palette per video: cream as soon as any designed card is light
  const light = cards.some((c) => c.kind !== "keyword" && c.kind !== "window");
  for (const c of cards) if (c.kind === "keyword") c.palette = light ? "cream" : "burgundy";
  // window cards are drawn by the frame effect on the Main clips
  const windows = cards.filter((c) => c.kind === "window").map((c) => ({ from: c.a, to: c.b }));

  // the hook title: when the Short opens on a set-up line, that spoken line itself is typed onto a
  // white plate in time with the voice (two balanced lines), and its captions are left out
  let title: Prepared["title"] = null;
  const hookType = semantic?.tags.hook?.type;
  const firstIdx = words.findIndex((w) => /[.!?]["”’)]*$/.test(w.t));
  const opener = firstIdx >= 0 ? words.slice(0, firstIdx + 1).filter((w) => w.i >= 0) : [];
  if (opener.length >= 4 && opener.length <= 10 && (hookType === "H4" || hookType === "H2" || semantic?.tags.format === "story") && !cards.some((c) => c.a < (opener[opener.length - 1].e + 0.5) * fps)) {
    const texts = opener.map((w, k) => {
      const t = w.t.replace(/[.,!;:"“”]+$/g, "").replace(/^["“]/, "");
      return k === 0 ? t.charAt(0).toUpperCase() + t.slice(1) : caseWord(t);
    });
    let cut = 1;
    let best = 1e9;
    for (let k = 1; k < texts.length; k += 1) {
      const a = texts.slice(0, k).join(" ").length;
      const b = texts.slice(k).join(" ").length;
      if (Math.max(a, b) < best && texts.length - k >= 2) {
        best = Math.max(a, b);
        cut = k;
      }
    }
    const one = texts.join(" ").length <= 18;
    const last = opener[opener.length - 1];
    const b = Math.round(Math.max(1.5, last.e + 0.35) * fps);
    title = { a: 0, b, words: opener.map((w, k) => ({ text: texts[k], at: Math.max(0, Math.round((w.s - 1 / fps) * fps)), line: one || k < cut ? 0 : 1 })) };
    suppress.push([opener[0].i, last.i] as Span);
  }
  // the picture changes at a card's edges
  for (const c of cards) cuts.push(c.a / fps, c.b / fps);
  cuts.sort((a, b) => a - b);
  return { fps, duration, words, semantic, cuts, cards, suppress, windows, title };
}

// Insert coverage (spec 9.1): full-frame inserts cover 40-65% of the Short, the first lands early and
// no speaker-only stretch runs past 6 s before the last fifth. Where stock and the planned designs leave
// gaps, designed cards fill them from the transcript itself: a key term becomes a thesis card, a short
// sentence a quote card, any other line a window card with the speaker inset. Mutates `prep`.
export function fillCoverage(prep: Prepared, inserts: { a: number; b: number }[], starts: number[], hasTag: boolean, aspect: number): number {
  const { fps, duration, words } = prep;
  const tags = prep.semantic?.tags || {};
  const covered = (): [number, number][] =>
    [...inserts.map((x) => [x.a, x.b] as [number, number]), ...prep.cards.map((c) => [c.a / fps, c.b / fps] as [number, number]), ...(prep.title ? [[0, prep.title.b / fps] as [number, number]] : [])].sort((a, b) => a[0] - b[0]);
  const coverage = () => covered().reduce((n, [a, b]) => n + (b - a), 0) / duration;
  const caseWord = (w: string) => (/[A-Z].*[A-Z]/.test(w) || properNoun(w, words) ? w : w.toLowerCase());
  const clean = (t: string) => t.replace(/[.,!?;:"“”]+$/g, "").replace(/^["“]/, "");
  const free = (a: number, b: number) => covered().every(([x, y]) => b <= x - 1.4 || a >= y + 1.4);
  let added = 0;
  let lastKind = "";
  const sentenceFirst = words.filter((w, k) => k === 0 || /[.!?]["”’)]*$/.test(words[k - 1].t));
  const startsSentence = (t: number) => sentenceFirst.find((w) => Math.abs(w.s - t) < 0.15);
  const count = (kind: string) => prep.cards.filter((c) => c.kind === kind).length;
  const place = (t: number): boolean => {
    const a = Math.round((t - 0.04) * fps);
    const inWin = (end: number) => words.filter((w) => w.s >= t - 0.01 && w.s < end && w.i >= 0);
    // a key term spoken inside the next 2.2 s
    const key = (tags.keyTerms || []).filter((k) => k.priority >= 3 && ["T", "P", "I", "N", "K"].includes(k.kind)).find((k) => {
      const w = words.find((x) => x.i === k.head);
      return w && w.s >= t && w.s < t + 1.6;
    });
    const options: (() => boolean)[] = [];
    if (key) options.push(() => {
      const ws = words.filter((w) => w.i >= key.span[0] && w.i <= key.span[1]);
      if (!ws.length) return false;
      const lead = words.filter((w) => w.s >= t - 0.01 && w.s < ws[0].s - 0.01 && w.i >= 0).slice(-3);
      const b = Math.round(Math.max(ws[0].s + 1.5, ws[ws.length - 1].e + 0.35) * fps);
      if (!free(a / fps, b / fps)) return false;
      const items: Card["items"] = [];
      if (lead.length) items.push({ text: lead.map((w) => caseWord(clean(w.t))).join(" "), at: a, role: "label" });
      items.push({ text: ws.map((w) => caseWord(clean(w.t))).join(" "), at: Math.max(a, Math.round((ws[0].s - 1 / fps) * fps)), role: "key" });
      prep.cards.push({ a, b, kind: "keyword", items });
      lastKind = "keyword";
      return true;
    });
    const sw = startsSentence(t);
    if (sw) options.push(() => {
      const k0 = words.indexOf(sw);
      let k1 = k0;
      while (k1 < words.length - 1 && !/[.!?]["”’)]*$/.test(words[k1].t)) k1 += 1;
      const ws = words.slice(k0, k1 + 1).filter((w) => w.i >= 0);
      if (ws.length < 4 || ws.length > 10 || ws[ws.length - 1].e - t > 3.4) return false;
      const b = Math.round((ws[ws.length - 1].e + 0.35) * fps);
      if (!free(a / fps, b / fps)) return false;
      const keyIdx = ws.findIndex((w) => (tags.keyTerms || []).some((k) => k.head === w.i));
      prep.cards.push({ a, b, kind: "quote", items: ws.map((w, j) => ({ text: (j === 0 ? clean(w.t).charAt(0).toUpperCase() + clean(w.t).slice(1) : caseWord(clean(w.t))), at: Math.max(a, Math.round((w.s - 1 / fps) * fps)), role: j === keyIdx ? "key" : "item" })) });
      lastKind = "quote";
      return true;
    });
    options.push(() => {
      // the window card is the rarest device: two at most
      if (count("window") >= 2) return false;
      const ws = inWin(t + 2.2).slice(0, 10);
      if (ws.length < 3) return false;
      const b = Math.round(Math.max(t + 1.6, ws[ws.length - 1].e + 0.3) * fps);
      if (!free(a / fps, b / fps)) return false;
      prep.cards.push({ a, b, kind: "window", items: ws.map((w) => ({ text: caseWord(clean(w.t)), at: Math.max(a, Math.round((w.s - 1 / fps) * fps)), role: "item" })), aspect });
      lastKind = "window";
      return true;
    });
    // variety: the kind used last goes to the back of the queue
    const kinds = options.map((o) => (o === options[0] && key ? "keyword" : o === options[options.length - 1] ? "window" : "quote"));
    const order = options.map((o, i) => ({ o, k: kinds[i] })).sort((x, y) => Number(x.k === lastKind) - Number(y.k === lastKind));
    for (const { o } of order) if (o()) return true;
    return false;
  };
  const limitFirst = prep.title || hasTag ? 4 : 2.5;
  // the first insert lands early
  if (!covered().some(([a]) => a <= limitFirst)) {
    for (const t of starts) if (t >= 1.2 && t <= limitFirst && place(t)) {
      added += 1;
      break;
    }
  }
  // no long speaker-only stretch, and coverage up to 40%
  for (let guard = 0; guard < 12; guard += 1) {
    const cov = covered();
    const gaps: [number, number][] = [];
    let at = 0;
    for (const [a, b] of cov) {
      if (a > at) gaps.push([at, a]);
      at = Math.max(at, b);
    }
    if (at < duration) gaps.push([at, duration]);
    const long = gaps
      .filter(([a, b]) => a < 0.8 * duration && b - a > (coverage() < 0.4 ? 4.5 : 6))
      .sort((x, y) => y[1] - y[0] - (x[1] - x[0]))[0];
    if (!long) break;
    const mid = long[0] + Math.min(3, (long[1] - long[0]) / 2);
    const cands = starts.filter((t) => t >= long[0] + 1.6 && t <= long[1] - 2.2).sort((x, y) => Math.abs(x - mid) - Math.abs(y - mid));
    let ok = false;
    for (const t of cands) if (place(t)) {
      ok = true;
      break;
    }
    if (!ok) break;
    added += 1;
  }
  prep.cards.sort((x, y) => x.a - y.a);
  // captions under the new cards, windows for the frame effect, a cut at each edge
  for (const c of prep.cards) {
    const inside = words.filter((w) => w.s * fps >= c.a - 1 && w.s * fps < c.b && w.i >= 0).map((w) => w.i);
    if (inside.length) prep.suppress.push([Math.min(...inside), Math.max(...inside)] as Span);
    prep.cuts.push(c.a / fps, c.b / fps);
  }
  prep.cuts = [...new Set(prep.cuts)].sort((a, b) => a - b);
  const light = prep.cards.some((c) => c.kind !== "keyword" && c.kind !== "window");
  for (const c of prep.cards) if (c.kind === "keyword") c.palette = light ? "cream" : "burgundy";
  prep.windows = prep.cards.filter((c) => c.kind === "window").map((c) => ({ from: c.a, to: c.b }));
  return added;
}

// Caption unit starts before any B-roll is placed, so B-roll cuts can land on them.
export function unitStarts(job: Job, prep: Prepared): number[] {
  const tags = prep.semantic?.tags || {};
  const style = chooseStyle(prep.words, tags, prep.fps);
  const track = compileCaptions({ words: prep.words, tags, style, cuts: prep.cuts, shots: job.framing.shots, duration: prep.duration, suppress: prep.suppress });
  return track.units.map((u) => u.start);
}

export async function buildGraphic(o: {
  job: Job;
  prep: Prepared;
  fonts: { sans: string; serif: string; roman: string; light: string };
  logo: string;
  inserts: { a: number; b: number; bright?: boolean }[]; // seconds
}): Promise<Look> {
  const { job, prep } = o;
  const { fps, duration, words, semantic, cards, suppress } = prep;
  const tags = semantic?.tags || {};
  const notes: string[] = [];
  const cuts = [...prep.cuts, ...o.inserts.flatMap((x) => [x.a, x.b])].sort((a, b) => a - b);
  // B-roll first, so a caption over B-roll is placed by the B-roll rule (face-independent)
  const shots: Shot[] = [
    ...o.inserts.map((x) => ({ from: x.a, to: x.b, kind: "broll" as const, face: null })),
    ...job.framing.shots.map((s) => ({ ...s })),
  ];
  const style = chooseStyle(words, tags, fps);
  const track = compileCaptions({ words, tags, style, cuts, shots, duration, suppress });
  // captions never sit on a card; over a bright B-roll shot they turn charcoal
  const units = packCaptions(track, fps).filter((u) => !cards.some((c) => u.a >= c.a && u.a < c.b));
  for (const u of units) for (const c of cards) if (u.a < c.a && u.b > c.a) u.b = c.a;
  for (const u of units) {
    const ins = o.inserts.find((x) => u.a / fps >= x.a - 0.01 && u.a / fps < x.b);
    if (ins?.bright) u.d = 1;
  }

  // name tag on the opening speaker run, under the captions
  let nameTag: NameTag | null = null;
  const said = semantic?.speaker;
  const nm = (job.opts.name || "").trim() || (said?.name || "");
  const roleLine = (job.opts.name || "").trim() ? (job.opts.role || "").trim() : said?.role || "";
  if (nm) {
    const parts = nm.split(/\s+/);
    const last = parts.length > 1 ? parts.pop()! : "";
    const firstCard = cards.length ? cards[0].a : Infinity;
    const firstInsert = o.inserts.length ? Math.round(o.inserts[0].a * fps) : Infinity;
    const a = prep.title ? prep.title.b : Math.round(0.1 * fps);
    const b = Math.min(firstCard, firstInsert, a + Math.round(2.6 * fps));
    // under the opening caption block (a hook lockup grows about 0.08 H below its first line)
    const y = Math.min(0.8, (track.units[0]?.y || 0.55) + 0.12);
    if (b - a >= Math.round(1.2 * fps)) nameTag = { a, b, first: parts.join(" "), last, role: roleLine, x: 0.1, y, cap: 0.042 };
  }

  // the user's own mark, top right
  let mark: GraphicData["mark"] = null;
  if (o.logo) {
    try {
      const path = o.logo.replace(/^~(?=\/)/, fs().homedir());
      const buf: any = await fs().readFile(path);
      const bytes: Uint8Array = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
      if (bytes.length > 160000) notes.push("The logo file is over 160 KB; it was left out.");
      else {
        let bin = "";
        for (let k = 0; k < bytes.length; k += 1) bin += String.fromCharCode(bytes[k]);
        const type = /\.svg$/i.test(path) ? "image/svg+xml" : /\.jpe?g$/i.test(path) ? "image/jpeg" : "image/png";
        mark = { src: "data:" + type + ";base64," + btoa(bin), w: 0, h: 0, opacity: 0.88 };
      }
    } catch {
      notes.push("The logo file could not be read; it was left out.");
    }
  }

  // a quote glyph over a block of three or more captions of reported or imagined speech that a
  // quotative ("she was like", "I asked") introduces
  const q0 = (x: { span: Span }) => x.span[0];
  const quoteBlocks: [number, number, number][] = [];
  // consecutive quoted sentences (a few words apart at most) are one block
  const spans: Span[] = [];
  const quotativeEnds = (tags.quotatives || []).map((q) => q[1]);
  for (const q of (tags.quotes || []).filter((x) => (x.kind === "reported" || x.kind === "imagined") && quotativeEnds.some((e) => q0(x) - e >= 0 && q0(x) - e <= 3)).sort((x, y) => x.span[0] - y.span[0])) {
    const last = spans[spans.length - 1];
    if (last && q.span[0] - last[1] <= 4) last[1] = Math.max(last[1], q.span[1]);
    else spans.push([q.span[0], q.span[1]]);
  }
  for (const span of spans) {
    const q = { span };
    const inside = track.units.filter((u) => u.tokens.some((t) => t.src.some((i) => i >= q.span[0] && i <= q.span[1])));
    if (inside.length < 3) continue;
    const a = Math.round(inside[0].start * fps);
    const b = Math.round(inside[inside.length - 1].end * fps);
    if (cards.some((c) => a < c.b && b > c.a)) continue;
    quoteBlocks.push([a, b, inside[0].y]);
  }

  const data: GraphicData = {
    W: 1080,
    H: 1920,
    fps,
    uid: job.shortId.slice(0, 8) + Date.now().toString(36),
    xh: style.xh,
    units,
    nameTag,
    cards,
    mark,
    quoteBlocks,
    title: prep.title,
    fonts: o.fonts,
  };
  // a readable record of the captions next to the job, for checking a build
  try {
    const rows = track.units.map((u) => u.start.toFixed(2) + "-" + u.end.toFixed(2) + " " + u.role + (u.build ? "*" : "") + (u.emphasis ? ":" + u.emphasis : "") + " " + u.entrance.kind + " y" + u.y.toFixed(3) + "  " + unitText(u));
    const dir = fs().join(fs().homedir(), ".selects", "plugin-data", "a16z-style-captions", "shorts", job.shortId);
    await fs().writeFile(fs().join(dir, "captions.txt"), rows.join("\n"));
    await fs().writeFile(fs().join(dir, "inputs.json"), JSON.stringify({ words, tags, cuts, shots, duration, suppress, cards, fps, inserts: o.inserts }));
  } catch {}
  try {
    const dir = fs().join(fs().homedir(), ".selects", "plugin-data", "a16z-style-captions", "shorts", job.shortId);
    await fs().writeFile(fs().join(dir, "graphic.json"), JSON.stringify({ ...data, fonts: undefined }));
  } catch {}
  const lockups = track.units.filter((u) => u.lines.length > 1).length;
  const summary = units.length + " captions, " + lockups + " lockups, " + cards.length + " card" + (cards.length === 1 ? "" : "s") + (nameTag ? ", name tag" : "");
  return { data, notes: [...notes, ...track.notes.filter((n) => /^No /.test(n))], summary };
}

// A word the transcript capitalises in mid-sentence (and never writes lowercase) is a name.
function properNoun(w: string, words: Word[]): boolean {
  const n = norm(w);
  // closed-class words and question words are never names, whatever the transcript's capitals say
  if (wordClass(n) !== "CONT" || /^(what|who|why|how|when|where|which|yeah|okay|hey|well|so|now|then)$/.test(n)) return false;
  let caps = 0;
  let lower = 0;
  words.forEach((x, k) => {
    if (norm(x.t) !== n || k === 0 || /[.!?]["”’)]*$/.test(words[k - 1].t)) return;
    if (/^[“"']?[A-Z]/.test(x.t)) caps += 1;
    else lower += 1;
  });
  return caps > 0 && lower === 0;
}
