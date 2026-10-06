import { lintPlan, bannedPattern, type Style } from "../../lint/lint.ts";
import { SCENE_PLAN_SCHEMA, type BundleScene, type FilmBundle, type LocalWord, type ScenePlanBody } from "./bundle.ts";
import type { PlanSource } from "./source.ts";

export const FALLBACK_RULES = { maxWords: 3, maxChars: 20, minHoldSeconds: 0.5, maxMergedWords: 5, maxMergedChars: 30, minSceneSeconds: 2.5, maxSceneSeconds: 10 } as const;
export const FALLBACK_INTENT = "Fallback scene: the speaker on camera with spoken-word captions.";
export const FALLBACK_DIRECTION = "Fallback film: no usable plan came back, so every scene shows the speaker on camera with spoken-word captions.";

const SENTENCE_END = /[.!?]["')\]]*$/;
const CLAUSE_END = /[,;:]["')\]]*$/;

export function captionWord(text: string): string {
  return text
    .replace(/[[\]*]/g, "")
    .replace(/^[^\p{L}\p{N}$#@&]+/u, "")
    .replace(/[^\p{L}\p{N}%$]+$/u, "");
}

type Token = { text: string; start: number; end: number; breakAfter: "sentence" | "clause" | null };
type Group = { tokens: Token[] };

const groupText = (g: Group) => g.tokens.map((t) => t.text).join(" ");

export function captionGroups(words: LocalWord[], banned: RegExp | null = null): string[] {
  const tokens: Token[] = [];
  for (const w of words) {
    const text = captionWord(w.text);
    const breakAfter = SENTENCE_END.test(w.text) ? "sentence" : CLAUSE_END.test(w.text) ? "clause" : null;
    if (text) tokens.push({ text, start: w.start, end: w.end, breakAfter });
    else if (tokens.length && breakAfter) tokens[tokens.length - 1].breakAfter ??= breakAfter;
  }
  const R = FALLBACK_RULES;
  const groups: Group[] = [];
  let cur: Group | null = null;
  for (const t of tokens) {
    const prev: Token | undefined = cur?.tokens[cur.tokens.length - 1];
    const full = !!cur && (cur.tokens.length >= R.maxWords || (groupText(cur) + " " + t.text).length > R.maxChars);
    if (!cur || full || prev?.breakAfter) {
      cur = { tokens: [] };
      groups.push(cur);
    }
    cur.tokens.push(t);
  }
  const shows = (i: number) => (i + 1 < groups.length ? groups[i + 1].tokens[0].start : groups[i].tokens[groups[i].tokens.length - 1].end) - groups[i].tokens[0].start;
  const fits = (a: Group, b: Group) => a.tokens.length + b.tokens.length <= R.maxMergedWords && (groupText(a) + " " + groupText(b)).length <= R.maxMergedChars;
  const endsSentence = (g: Group) => g.tokens[g.tokens.length - 1].breakAfter === "sentence";
  for (let i = 0; i < groups.length; ) {
    if (groups.length > 1 && shows(i) < R.minHoldSeconds) {
      const back = i > 0 && fits(groups[i - 1], groups[i]);
      const forward = i + 1 < groups.length && fits(groups[i], groups[i + 1]);
      const goBack = back && (!endsSentence(groups[i - 1]) || !forward || endsSentence(groups[i]));
      if (goBack) {
        groups[i - 1].tokens.push(...groups.splice(i, 1)[0].tokens);
        i = Math.max(0, i - 1);
        continue;
      }
      if (forward) {
        groups[i].tokens.push(...groups.splice(i + 1, 1)[0].tokens);
        continue;
      }
    }
    i += 1;
  }
  const lines = groups.map(groupText);
  return banned ? lines.map((l) => withoutBanned(l, banned)).filter((l) => l.length > 0) : lines;
}

export function withoutBanned(line: string, banned: RegExp): string {
  let words = line.split(" ").filter(Boolean);
  for (let guard = 0; guard < 20; guard += 1) {
    const text = words.join(" ");
    const m = banned.exec(text);
    if (!m) break;
    const from = m.index, to = m.index + m[0].length;
    let at = 0;
    const kept: string[] = [];
    for (const w of words) {
      const a = at, b = at + w.length;
      at = b + 1;
      if (b <= from || a >= to || (m[0].length === 0 && a !== from)) kept.push(w);
    }
    if (kept.length === words.length) words = words.slice(1);
    else words = kept;
  }
  return words.join(" ");
}

export type FallbackScene = { body: ScenePlanBody; captions: number; removed: string[]; speakerOnly: boolean; errors: string[] };

export function fallbackScene(scene: { id: string; durationFrames: number; words: LocalWord[] }, film: string, styles: Readonly<Record<string, Style>>): FallbackScene {
  const banned = bannedPattern(styles);
  const lines = captionGroups(scene.words, banned);
  const size = film === "B" ? { size: "large" } : {};
  let copy = lines.map((line, i) => ({ id: "c" + (i + 1), role: "caption", lines: [line], ...size }));
  const removed: string[] = [];
  const bodyOf = (items: typeof copy): ScenePlanBody => ({
    craftIntent: FALLBACK_INTENT,
    copy: items,
    pages: items.length ? [{ block: "captions", items: items.map((c) => c.id), start: "scene-start", mode: "replace", band: "lower", align: "center" }] : [],
    shots: [{ source: "podcast", from: "scene-start", treatment: "none", layout: "full" }],
    ending: "hold",
  });
  const lintBody = (body: ScenePlanBody) =>
    lintPlan({ ...body, schema: SCENE_PLAN_SCHEMA, sceneId: scene.id, film, durationFrames: scene.durationFrames, words: scene.words }, { styles });
  for (let round = 0; round <= lines.length; round += 1) {
    const body = bodyOf(copy);
    const r = lintBody(body);
    if (r.ok) return { body, captions: copy.length, removed, speakerOnly: copy.length === 0, errors: [] };
    const named = new Set(copy.filter((c) => r.errors.some((e) => e.includes("copy." + c.id + ":") || e.includes("copy." + c.id + ".") || e.includes("copy[" + copy.indexOf(c) + "]"))).map((c) => c.id));
    if (!named.size || !copy.length) {
      const alone = bodyOf([]);
      const last = lintBody(alone);
      return { body: alone, captions: 0, removed: [...removed, ...copy.map((c) => c.lines[0])], speakerOnly: true, errors: last.ok ? [] : last.errors };
    }
    removed.push(...copy.filter((c) => named.has(c.id)).map((c) => c.lines[0]));
    copy = copy.filter((c) => !named.has(c.id));
  }
  const alone = bodyOf([]);
  const last = lintBody(alone);
  return { body: alone, captions: 0, removed, speakerOnly: true, errors: last.ok ? [] : last.errors };
}

export function fallbackRanges(source: PlanSource): [number, number][] {
  const w = source.words, n = w.length, fps = source.fps, R = FALLBACK_RULES;
  const startOf = (a: number) => (a === 0 ? 0 : w[a].start);
  const clean = (b: number) => b === n || w[b - 1].end <= w[b].start;
  const ranges: [number, number][] = [];
  let a = 0;
  for (let b = 1; b <= n; b += 1) {
    if (b === n) break;
    const len = (w[b].start - startOf(a)) / fps;
    const sentence = SENTENCE_END.test(w[b - 1].text);
    if (clean(b) && ((sentence && len >= R.minSceneSeconds) || len >= R.maxSceneSeconds)) {
      ranges.push([a, b]);
      a = b;
    }
  }
  ranges.push([a, n]);
  if (ranges.length > 1) {
    const [la, lb] = ranges[ranges.length - 1];
    if ((source.durationFrames - startOf(la)) / fps < R.minSceneSeconds) {
      ranges.pop();
      ranges[ranges.length - 1][1] = lb;
    }
  }
  return ranges;
}

export function fallbackBundle(source: PlanSource, film: string): FilmBundle {
  const scenes: BundleScene[] = fallbackRanges(source).map(([a, b], i) => ({
    id: "S" + String(i + 1).padStart(2, "0"),
    startWord: a,
    endWord: b,
    type: "speaker",
    plan: { craftIntent: FALLBACK_INTENT, copy: [], pages: [], shots: [{ source: "podcast", from: "scene-start", treatment: "none", layout: "full" }], ending: "hold" },
  }));
  return { schema: "eo-film-plan/1", film, direction: FALLBACK_DIRECTION, scenes };
}
