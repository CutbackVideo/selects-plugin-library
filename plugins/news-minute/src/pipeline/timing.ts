// Sentence and caption timing from the narration's character alignment.
//
// The narration is one TTS call over the approved sentences joined by single spaces. Measured on Selects
// Staging 2.0.763 (ElevenLabs v4 via selects.narration), speechAlignment() returns the submitted characters
// themselves (digits, %, units unchanged), so a sentence's time is read straight off its character range.
// When the provider text differs, characters are matched with whitespace removed; when that fails too, or
// alignment is null, time is shared out by character count.

export type AlignChar = { character: string; startSeconds: number; endSeconds: number };
export type Span = { startSec: number; endSec: number };
export type TimingSource = "alignment" | "normalized" | "ratio";

export const joinScript = (sentences: string[]) => sentences.map((s) => s.trim()).join(" ");

// Character offsets [start, end) of each sentence inside joinScript(sentences).
export function sentenceRanges(sentences: string[]): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  let at = 0;
  for (const s of sentences) {
    const len = [...s.trim()].length;
    out.push([at, at + len]);
    at += len + 1;
  }
  return out;
}

// Sentence ends inside one text: ., ? or ! followed by whitespace or the end. A decimal point (0.69) is not an end.
export function splitSentences(text: string): string[] {
  const out: string[] = [];
  const chars = [...String(text ?? "")];
  let cur = "";
  for (let i = 0; i < chars.length; i++) {
    cur += chars[i];
    if (/[.?!]/.test(chars[i]) && (i + 1 >= chars.length || /\s/.test(chars[i + 1]))) {
      if (cur.trim()) out.push(cur.trim());
      cur = "";
    }
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

// Index in `chars` for each character of `text`, or null when the two texts do not match.
function charIndex(text: string, chars: AlignChar[]): { map: number[]; source: TimingSource } | null {
  const t = [...text];
  const a = chars.map((c) => c.character);
  if (a.join("") === text) return { map: t.map((_, i) => i), source: "alignment" };
  // Same characters once whitespace is removed: map through the non-space positions.
  const tPos: number[] = [], aPos: number[] = [];
  t.forEach((c, i) => { if (!/\s/.test(c)) tPos.push(i); });
  a.forEach((c, i) => { if (!/\s/.test(c)) aPos.push(i); });
  if (tPos.length !== aPos.length || tPos.some((p, k) => t[p] !== a[aPos[k]])) return null;
  const map = new Array<number>(t.length).fill(-1);
  tPos.forEach((p, k) => { map[p] = aPos[k]; });
  // Spaces take the next non-space character's index (or the last one).
  for (let i = t.length - 1, next = aPos[aPos.length - 1] ?? 0; i >= 0; i--) {
    if (map[i] < 0) map[i] = next;
    else next = map[i];
  }
  return { map, source: "normalized" };
}

// Each sentence's [start, end] seconds. The last sentence ends at `totalSec` (the audio length).
export function sentenceTimes(sentences: string[], chars: AlignChar[] | null, totalSec: number): { times: Span[]; source: TimingSource } {
  const text = joinScript(sentences);
  const ranges = sentenceRanges(sentences);
  const idx = chars && chars.length ? charIndex(text, chars) : null;
  if (idx && chars) {
    const times = ranges.map(([a, b]) => ({ startSec: chars[idx.map[a]].startSeconds, endSec: chars[idx.map[b - 1]].endSeconds }));
    // A sentence owns the pause after it, up to the next sentence's first character.
    for (let i = 0; i < times.length; i++) times[i].endSec = i + 1 < times.length ? times[i + 1].startSec : Math.max(times[i].endSec, totalSec);
    if (times.length) times[0].startSec = 0;
    return { times, source: idx.source };
  }
  return { times: ratioTimes(sentences, totalSec), source: "ratio" };
}

// No usable alignment: share the audio out by character count (spaces included), sentences back to back.
export function ratioTimes(sentences: string[], totalSec: number): Span[] {
  const lens = sentences.map((s) => [...s.trim()].length + 1);
  const sum = lens.reduce((a, b) => a + b, 0) || 1;
  const out: Span[] = [];
  let t = 0;
  for (const n of lens) {
    const d = (totalSec * n) / sum;
    out.push({ startSec: t, endSec: t + d });
    t += d;
  }
  if (out.length) out[out.length - 1].endSec = totalSec;
  return out;
}

// Caption chunks of 2-4 words (eojeol) for one sentence, at most `maxChars` characters each when possible.
export function captionChunks(sentence: string, maxChars = 14): string[] {
  const words = sentence.trim().split(/\s+/).filter(Boolean);
  const out: string[] = [];
  let cur: string[] = [];
  const len = (ws: string[]) => [...ws.join(" ")].length;
  for (const w of words) {
    if (cur.length && (cur.length >= 4 || (cur.length >= 2 && len([...cur, w]) > maxChars))) {
      out.push(cur.join(" "));
      cur = [];
    }
    cur.push(w);
  }
  if (cur.length) {
    // A lone trailing word joins the previous chunk.
    if (cur.length === 1 && out.length && len([out[out.length - 1], cur[0]]) <= maxChars + 6) out[out.length - 1] += " " + cur[0];
    else out.push(cur.join(" "));
  }
  return out;
}

export type Caption = { text: string; startSec: number; endSec: number; sentence: number };

// Timed caption chunks for every sentence. With alignment each chunk starts at its first character; otherwise
// chunks share their sentence by character count. Chunks run back to back and end where the sentence ends.
export function captionTimes(sentences: string[], times: Span[], chars: AlignChar[] | null): Caption[] {
  const text = joinScript(sentences);
  const idx = chars && chars.length ? charIndex(text, chars) : null;
  const ranges = sentenceRanges(sentences);
  const out: Caption[] = [];
  sentences.forEach((s, si) => {
    const chunks = captionChunks(s);
    const span = times[si];
    let starts: number[];
    if (idx && chars) {
      const trimmed = s.trim();
      let from = 0;
      starts = chunks.map((c) => {
        const at = trimmed.indexOf(c, from);
        from = at + c.length;
        const offset = [...trimmed.slice(0, Math.max(0, at))].length;
        return chars[idx.map[ranges[si][0] + offset]].startSeconds;
      });
      starts[0] = span.startSec;
    } else {
      const lens = chunks.map((c) => [...c].length + 1);
      const sum = lens.reduce((a, b) => a + b, 0) || 1;
      let t = span.startSec;
      starts = lens.map((n) => { const v = t; t += ((span.endSec - span.startSec) * n) / sum; return v; });
    }
    chunks.forEach((c, k) => out.push({ text: c, startSec: starts[k], endSec: k + 1 < chunks.length ? starts[k + 1] : span.endSec, sentence: si }));
  });
  return out.filter((c) => c.endSec > c.startSec);
}

// Scene windows: a cut lands `lead` seconds before the scene's first sentence; the last scene runs to the end.
export function sceneWindows(firstSentence: number[], times: Span[], totalSec: number, lead = 0.05): Span[] {
  return firstSentence.map((si, k) => {
    const start = k === 0 ? 0 : Math.max(0, times[si].startSec - lead);
    const nextSi = firstSentence[k + 1];
    const end = nextSi === undefined ? totalSec : Math.max(start + 0.1, times[nextSi].startSec - lead);
    return { startSec: start, endSec: end };
  });
}
