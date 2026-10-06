import type { MusicPick, MusicTrack } from "./musicPick.ts";
import type { MusicLevels } from "./ducking.ts";
import type { SfxCatalog, SfxCue, SfxEvent } from "./sfxPlacement.ts";
import type { Loudness } from "./ebur128Measure.ts";
import type { LoudnessPlan, LoudnessRules } from "./loudnessSolve.ts";
import type { DipRun } from "./gainCurve.ts";
import type { ClipAudio, SoundGuard } from "./scripts.ts";

export const G4 = { lufs: -14, toleranceLu: 0.5, maxTruePeak: -1.0 } as const;

export const meetsG4 = (l: { integrated: number; truePeak: number }): boolean => Math.abs(l.integrated - G4.lufs) <= G4.toleranceLu && l.truePeak <= G4.maxTruePeak;

export type G4Verdict = {
  integrated: number;
  truePeak: number;
  ok: boolean;
  inRange: boolean;
  failure: string | null;
};

export function g4Verdict(measured: { integrated: number; truePeak: number }, plan: Pick<LoudnessPlan, "ok" | "held">, rules: Pick<LoudnessRules, "maxDipDb" | "maxDipsPerMinute" | "ceilingDbtp" | "minTargetLufs">): G4Verdict {
  const inRange = meetsG4(measured);
  const numbers = measured.integrated.toFixed(2) + " LUFS / " + measured.truePeak.toFixed(2) + " dBTP";
  let failure: string | null = null;
  if (!plan.ok) {
    const h = plan.held;
    failure =
      "the voice's peaks need dips past " + rules.maxDipDb + " dB or " + rules.maxDipsPerMinute + " a minute to stay under " + rules.ceilingDbtp.toFixed(2) + " dBTP even at " + rules.minTargetLufs.toFixed(2) + " LUFS" +
      (h ? " (" + h.needed.why + ")" : "") + "; with the dips held to their limits the mix measures " + numbers + "; it needs a limiter";
  } else if (!inRange) failure = "the mix measures " + numbers + ", outside " + G4.lufs + " +/- " + G4.toleranceLu + " LUFS or over " + G4.maxTruePeak.toFixed(1) + " dBTP";
  return { integrated: measured.integrated, truePeak: measured.truePeak, ok: inRange && plan.ok, inRange, failure };
}

export type SoundCredit = { kind: "music" | "sfx"; text: string; license: string; url: string | null };

export type SoundReport = {
  schema: "eo-sound/1";
  guard: SoundGuard;
  music: {
    trackId: string;
    title: string;
    artist: string;
    file: string;
    path: string;
    license: string;
    source: string | null;
    startSeconds: number;
    catalogStartSeconds: number;
    playedLufs: number;
    reason: string;
    asked: MusicPick["asked"];
    used: MusicPick["used"];
    passLevels: MusicLevels;
    offsetDb: number;
    audio: ClipAudio;
    stats: { duckFrames: number; swellFrames: number; rampFrames: number; swells: number };
  } | null;
  sfx: {
    events: number;
    kept: SfxEvent[];
    dropped: { event: SfxEvent; why: string }[];
    skipped: { event: SfxEvent; why: string }[];
    placed: { cue: string; file: string; kind: string; frame: number; start: number; end: number; gainDb: number }[];
  };
  speech: { spans: number; frames: number };
  voice: { passGainDb: number; render: Loudness; gainDb: number; dips: DipRun[] };
  loudness: {
    rules: LoudnessRules;
    plan: Omit<LoudnessPlan, "dipLine"> & { dipLine?: undefined };
    modelCheck: { predicted: { integrated: number; truePeak: number }; measured: Loudness } | null;
    passes: { pass: number; plan: { voiceGainDb: number; musicGainDb: number; dips: number; targetLufs: number }; predicted: { integrated: number; truePeak: number }; measured: Loudness; file: string }[];
    final: G4Verdict;
  };
  credits: SoundCredit[];
  commits: number;
  warnings: string[];
  ms: number;
  skipped: boolean;
};

const host = (url: string | undefined | null): string | null => {
  if (!url) return null;
  const m = /^https?:\/\/([^/]+)/i.exec(url);
  return m ? m[1].replace(/^www\./, "") : null;
};

export function soundCredits(pick: { track: MusicTrack } | null, cues: readonly SfxCue[], catalog: SfxCatalog | null): SoundCredit[] {
  const out: SoundCredit[] = [];
  if (pick) {
    const t = pick.track;
    const site = host(t.source);
    out.push({ kind: "music", text: '"' + t.title + '" by ' + t.artist + " (" + (t.license === "CC0-1.0" ? "CC0 1.0" : t.license) + (site === "freemusicarchive.org" ? ", via Free Music Archive" : site ? ", " + site : "") + ")", license: t.license, url: t.source ?? null });
  }
  const packs = new Map<string, SfxCue[]>();
  for (const c of cues) {
    const k = c.provider ?? c.pack ?? "sfx";
    packs.set(k, [...(packs.get(k) ?? []), c]);
  }
  for (const [k, list] of packs) {
    const p = catalog?.providers?.find((x) => x.id === k);
    const name = p ? p.name + " " + p.pack : list[0].pack ?? k;
    out.push({ kind: "sfx", text: "Sound effects: " + name + " (" + (p?.license === "CC0-1.0" || list[0].license === "CC0-1.0" ? "CC0 1.0" : p?.license ?? list[0].license ?? "") + ")", license: p?.license ?? list[0].license ?? "", url: p?.sourcePageUrl ?? list[0].sourcePageUrl ?? null });
  }
  return out;
}
