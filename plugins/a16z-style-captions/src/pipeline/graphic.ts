// Everything the Short's graphic draws, from the job and a fresh read of the Short: caption units,
// keyword cards, the name tag and the brand mark.
import { fs } from "./host";
import { resolveSemantic, sentences, parseLoose } from "./semantic";
import { compileCaptions, unitText } from "../captions/compile";
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
      place({ a, b, kind: "keyword", items: [{ text: c.text.split(/\s+/).map(caseWord).join(" "), at: a, role: "key" }] });
    }
    for (const dz of semantic?.designs || []) {
      const spoken = dz.parts.filter((p) => p.span);
      const first = onset(spoken[0]?.span || null);
      const lastPart = spoken[spoken.length - 1]?.span;
      const last = lastPart ? at(lastPart[1]) : undefined;
      if (!first || !last) continue;
      const lead = dz.kind === "chapter" ? 0.1 : 0.12;
      const a = Math.round((first.s - lead) * fps);
      const minDur = dz.kind === "chapter" ? 1.6 : 1.4;
      const maxDur = dz.kind === "list" || dz.kind === "bubbles" ? 5.5 : 3.2;
      const b = Math.round(Math.min(first.s + maxDur, Math.max(first.s + minDur, last.e + 0.35)) * fps);
      if (!free(a, b)) continue;
      const items = dz.parts.map((p, k) => {
        const w = onset(p.span);
        const prev = dz.parts[k - 1]?.span ? at(dz.parts[k - 1].span![1]) : undefined;
        const t = w ? w.s : prev ? prev.e : first.s;
        const text = p.role === "key" && dz.kind === "number" ? p.text : p.text.replace(/["“”]/g, "").split(/\s+/).map(caseWord).join(" ");
        return { text, at: Math.max(a, Math.round((t - 1 / fps) * fps)), role: p.role };
      });
      place({ a, b, kind: dz.kind, items, numeral: dz.numeral });
    }
  }
  cards.sort((x, y) => x.a - y.a);
  // the picture changes at a card's edges
  for (const c of cards) cuts.push(c.a / fps, c.b / fps);
  cuts.sort((a, b) => a - b);
  return { fps, duration, words, semantic, cuts, cards, suppress };
}

export async function buildGraphic(o: {
  job: Job;
  prep: Prepared;
  fonts: { sans: string; serif: string; roman: string };
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
  const nm = (job.opts.name || "").trim();
  if (nm) {
    const parts = nm.split(/\s+/);
    const last = parts.length > 1 ? parts.pop()! : "";
    const firstCard = cards.length ? cards[0].a : Infinity;
    const firstInsert = o.inserts.length ? Math.round(o.inserts[0].a * fps) : Infinity;
    const a = Math.round(0.1 * fps);
    const b = Math.min(firstCard, firstInsert, a + Math.round(2.6 * fps));
    // under the opening caption block (a hook lockup grows about 0.08 H below its first line)
    const y = Math.min(0.8, (track.units[0]?.y || 0.55) + 0.12);
    nameTag = { a, b, first: parts.join(" "), last, role: (job.opts.role || "").trim(), x: 0.1, y, cap: 0.042 };
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

  // a quote glyph over a block of three or more captions of reported or imagined speech
  const quoteBlocks: [number, number, number][] = [];
  // consecutive quoted sentences (a few words apart at most) are one block
  const spans: Span[] = [];
  for (const q of (tags.quotes || []).filter((x) => x.kind === "reported" || x.kind === "imagined").sort((x, y) => x.span[0] - y.span[0])) {
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
    fonts: o.fonts,
  };
  // a readable record of the captions next to the job, for checking a build
  try {
    const rows = track.units.map((u) => u.start.toFixed(2) + "-" + u.end.toFixed(2) + " " + u.role + (u.build ? "*" : "") + (u.emphasis ? ":" + u.emphasis : "") + " " + u.entrance.kind + " y" + u.y.toFixed(3) + "  " + unitText(u));
    const dir = fs().join(fs().homedir(), ".selects", "plugin-data", "a16z-style-captions", "shorts", job.shortId);
    await fs().writeFile(fs().join(dir, "captions.txt"), rows.join("\n"));
    await fs().writeFile(fs().join(dir, "inputs.json"), JSON.stringify({ words, tags, cuts, shots, duration, suppress, cards, fps, inserts: o.inserts }));
  } catch {}
  const lockups = track.units.filter((u) => u.lines.length > 1).length;
  const summary = units.length + " captions, " + lockups + " lockups, " + cards.length + " card" + (cards.length === 1 ? "" : "s") + (nameTag ? ", name tag" : "");
  return { data, notes: [...notes, ...track.notes.filter((n) => /^No /.test(n))], summary };
}

// A word the transcript capitalises in mid-sentence (and never writes lowercase) is a name.
function properNoun(w: string, words: Word[]): boolean {
  const n = norm(w);
  let caps = 0;
  let lower = 0;
  words.forEach((x, k) => {
    if (norm(x.t) !== n || k === 0 || /[.!?]["”’)]*$/.test(words[k - 1].t)) return;
    if (/^[“"']?[A-Z]/.test(x.t)) caps += 1;
    else lower += 1;
  });
  return caps > 0 && lower === 0;
}
