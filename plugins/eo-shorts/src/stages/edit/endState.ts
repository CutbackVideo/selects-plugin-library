import { guardWordsSig, joinSplitWords } from "../compose/wordsGuard.ts";
import { wordsSig, type EditWord } from "./words.ts";

export type ReadState = { mainEnd: number; durationFrames: number; sig: string; words: EditWord[] | null };

export type RecordedWords = { mainEnd?: number; durationFrames?: number; sig?: string; words?: EditWord[] };

export type EndState = {
  mainEnd: number;
  durationFrames: number;
  sig: string;
  words: EditWord[];
  from: "draft" | "recorded" | "joined";
};

export function editEndState(read: ReadState, expected: { mainEnd: number; sig: string }, recorded: RecordedWords | null): EndState | null {
  if (read.mainEnd !== expected.mainEnd) return null;
  const words = read.words ?? [];
  if (
    recorded &&
    recorded.sig === expected.sig &&
    recorded.mainEnd === expected.mainEnd &&
    Array.isArray(recorded.words) &&
    typeof recorded.durationFrames === "number" &&
    guardWordsSig(recorded.words) === guardWordsSig(words)
  ) {
    return { mainEnd: expected.mainEnd, durationFrames: recorded.durationFrames, sig: expected.sig, words: recorded.words, from: "recorded" };
  }
  if (read.sig === expected.sig) return { mainEnd: read.mainEnd, durationFrames: read.durationFrames, sig: read.sig, words, from: "draft" };
  const joined = joinSplitWords(words);
  if (wordsSig(joined) === expected.sig) return { mainEnd: read.mainEnd, durationFrames: read.durationFrames, sig: expected.sig, words: joined, from: "joined" };
  return null;
}
