import { WORD_SIG_JS, wordsSig } from "../edit/words.ts";

export type SignedWord = { text: string; s: number; e: number; wordId?: string | null };

export function continuesWord(prev: SignedWord, w: SignedWord): boolean {
  return prev.text === w.text && prev.e === w.s && !(prev.wordId != null && w.wordId != null && prev.wordId !== w.wordId);
}

export function joinSplitWords<T extends SignedWord>(words: readonly T[]): T[] {
  const out: T[] = [];
  for (const w of words) {
    const prev = out[out.length - 1];
    if (prev && continuesWord(prev, w)) {
      const joined: Record<string, unknown> = { ...prev, e: w.e };
      if ("se" in w) joined.se = (w as { se?: unknown }).se ?? (prev as { se?: unknown }).se ?? null;
      if ("semanticEnd" in prev || "semanticEnd" in w) joined.semanticEnd = !!((prev as { semanticEnd?: boolean }).semanticEnd || (w as { semanticEnd?: boolean }).semanticEnd);
      if (prev.wordId == null && w.wordId != null) joined.wordId = w.wordId;
      out[out.length - 1] = joined as T;
    } else out.push({ ...w });
  }
  return out;
}

export function guardWordsSig(words: readonly SignedWord[]): string {
  return wordsSig(joinSplitWords(words));
}

export const GUARD_WORDS_JS = `${WORD_SIG_JS}
const joinSplitRows = (ws) => { const out = []; for (const w of ws) { const p = out[out.length - 1]; const id = w.wordId ?? null; if (p && p.text === w.text && p.endFrame === w.startFrame && !(p.wordId != null && id != null && p.wordId !== id)) { p.endFrame = w.endFrame; if (p.wordId == null) p.wordId = id; } else out.push({ text: w.text, startFrame: w.startFrame, endFrame: w.endFrame, wordId: id }); } return out; };
const guardWordsSig = (ws) => wordsSig(joinSplitRows(ws));`;
