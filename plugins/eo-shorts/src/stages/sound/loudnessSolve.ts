import { dipAt, dipLine, dipRuns, dippedFrames, lineValue, type Breakpoint, type DipRun } from "./gainCurve.ts";
import { fromDb, toDb } from "./loudnessMeter.ts";
import { mixLoudness, mixPeaks, type StemModel, type VoiceShape } from "./mixStems.ts";

export type LoudnessRules = {
  targetLufs: number;
  minTargetLufs: number;
  stepLu: number;
  ceilingDbtp: number;
  marginDb: number;
  maxDipDb: number;
  maxDipsPerMinute: number;
  voiceLufs: number;
  limitDbtp: number;
};

export const LOUDNESS: Readonly<LoudnessRules> = {
  targetLufs: -14.05,
  minTargetLufs: -14.4,
  stepLu: 0.05,
  ceilingDbtp: -1.25,
  marginDb: 0.02,
  maxDipDb: 1,
  maxDipsPerMinute: 8,
  voiceLufs: -14.1,
  limitDbtp: -1.0,
};

export type LoudnessTry = { targetLufs: number; voiceGainDb: number; dips: number; deepestDipDb: number; integrated: number; truePeak: number; ok: boolean; why: string | null };

export type HeldDips = {
  needed: { dips: number; deepestDipDb: number; why: string };
  kept: number;
  clamped: number;
  dropped: number;
  loweredDb: number;
};

export type LoudnessPlan = {
  targetLufs: number;
  voiceGainDb: number;
  musicGainDb: number;
  dips: DipRun[];
  dipLine: Breakpoint[];
  predicted: { integrated: number; truePeak: number };
  ok: boolean;
  problems: string[];
  tries: LoudnessTry[];
  held: HeldDips | null;
};

export function dipShape(runs: readonly DipRun[], sampleRate: number, fps: number): VoiceShape {
  const line = dipLine(runs);
  const frames = dippedFrames(runs);
  return {
    frames,
    at: (i: number) => {
      const t = (i * fps) / sampleRate;
      if (!frames.has(Math.floor(t))) return 1;
      return fromDb(lineValue(line, t));
    },
  };
}

export function allowedDips(m: Pick<StemModel, "frames" | "fps">, r: Pick<LoudnessRules, "maxDipsPerMinute">): number {
  return Math.max(1, Math.floor(r.maxDipsPerMinute * (m.frames / m.fps / 60) + 1e-9));
}

type Solved = Pick<LoudnessPlan, "voiceGainDb" | "dips" | "dipLine" | "predicted"> & { why: string | null };

function solveAt(m: StemModel, target: number, r: LoudnessRules): Solved {
  const ceiling = fromDb(r.ceilingDbtp);
  const depth = new Map<number, number>();
  let runs: DipRun[] = [];
  let dv = 0, I = -Infinity, tp = -Infinity;
  for (let outer = 0; outer < 6; outer += 1) {
    dv = target - mixLoudness(m, 1, dipShape(runs, m.sampleRate, m.fps));
    const a = fromDb(dv);
    let settled = false;
    for (let inner = 0; inner < 12; inner += 1) {
      const pk = mixPeaks(m, a, dipShape(runs, m.sampleRate, m.fps), ceiling);
      tp = toDb(pk.peak);
      if (!pk.over.length) {
        settled = true;
        break;
      }
      for (const o of pk.over) depth.set(o.frame, Math.max(depth.get(o.frame) ?? 0, dipAt(runs, o.frame)) + toDb(o.peak / ceiling) + r.marginDb);
      runs = dipRuns(depth);
    }
    I = dv + mixLoudness(m, 1, dipShape(runs, m.sampleRate, m.fps));
    if (settled && Math.abs(I - target) < 0.003) break;
  }
  const deepest = runs.reduce((x, d) => Math.max(x, d.depthDb), 0);
  const allowed = allowedDips(m, r);
  let why: string | null = null;
  if (tp > r.ceilingDbtp + 1e-6) why = "the true peak stays at " + tp.toFixed(2) + " dBTP";
  else if (deepest > r.maxDipDb + 1e-9) why = "a dip of " + deepest.toFixed(2) + " dB is deeper than " + r.maxDipDb + " dB";
  else if (runs.length > allowed) why = runs.length + " dips are more than " + r.maxDipsPerMinute + " a minute (" + allowed + " here)";
  return { voiceGainDb: dv, dips: runs, dipLine: dipLine(runs), predicted: { integrated: I, truePeak: tp }, why };
}

export function holdDips(m: StemModel, target: number, failed: Solved, r: LoudnessRules): Solved & { held: HeldDips } {
  const allowed = allowedDips(m, r);
  const byNeed = [...failed.dips].sort((a, b) => b.depthDb - a.depthDb || a.start - b.start);
  const kept = byNeed
    .slice(0, allowed)
    .map((d) => ({ start: d.start, end: d.end, depthDb: Math.min(d.depthDb, r.maxDipDb) }))
    .sort((a, b) => a.start - b.start);
  const shape = dipShape(kept, m.sampleRate, m.fps);
  const base = mixLoudness(m, 1, shape);
  const limitDb = Math.max(r.limitDbtp, r.ceilingDbtp);
  let dv = target - base;
  let tp = toDb(mixPeaks(m, fromDb(dv), shape, fromDb(limitDb)).peak);
  let lowered = 0;
  if (tp > limitDb) {
    lowered = tp - limitDb + r.marginDb;
    dv -= lowered;
    tp = toDb(mixPeaks(m, fromDb(dv), shape, fromDb(limitDb)).peak);
  }
  return {
    voiceGainDb: dv,
    dips: kept,
    dipLine: dipLine(kept),
    predicted: { integrated: dv + base, truePeak: tp },
    why: failed.why,
    held: {
      needed: { dips: failed.dips.length, deepestDipDb: failed.dips.reduce((x, d) => Math.max(x, d.depthDb), 0), why: failed.why ?? "" },
      kept: kept.length,
      clamped: byNeed.slice(0, allowed).filter((d) => d.depthDb > r.maxDipDb).length,
      dropped: Math.max(0, byNeed.length - allowed),
      loweredDb: lowered,
    },
  };
}

export function solveLoudness(m: StemModel, rules: Partial<LoudnessRules> = {}): LoudnessPlan {
  const r: LoudnessRules = { ...LOUDNESS, ...rules };
  const tries: LoudnessTry[] = [];
  let last: Solved | null = null;
  let used = r.targetLufs;
  for (let target = r.targetLufs; target >= r.minTargetLufs - 1e-9; target = Math.round((target - r.stepLu) * 1000) / 1000) {
    const s = solveAt(m, target, r);
    tries.push({ targetLufs: target, voiceGainDb: s.voiceGainDb, dips: s.dips.length, deepestDipDb: s.dips.reduce((x, d) => Math.max(x, d.depthDb), 0), integrated: s.predicted.integrated, truePeak: s.predicted.truePeak, ok: !s.why, why: s.why });
    last = s;
    used = target;
    if (!s.why) break;
  }
  const plan = (s: Solved, ok: boolean, problems: string[], held: HeldDips | null): LoudnessPlan => ({
    targetLufs: used,
    voiceGainDb: s.voiceGainDb,
    musicGainDb: s.voiceGainDb + toDb(m.c || 1),
    dips: s.dips,
    dipLine: s.dipLine,
    predicted: s.predicted,
    ok,
    problems,
    tries,
    held,
  });
  if (!last!.why) {
    const problems = used < r.targetLufs - 1e-9 ? ["Loudness: the target was lowered to " + used.toFixed(2) + " LUFS to keep the dips within " + r.maxDipDb + " dB and " + r.maxDipsPerMinute + " a minute."] : [];
    return plan(last!, true, problems, null);
  }
  const h = holdDips(m, used, last!, r);
  const problems = [
    "Loudness: from " + r.targetLufs.toFixed(2) + " down to " + used.toFixed(2) + " LUFS no level holds " + r.ceilingDbtp.toFixed(2) + " dBTP with dips of at most " + r.maxDipDb + " dB and " + r.maxDipsPerMinute + " a minute (at " + used.toFixed(2) + " " + last!.why + "); the voice needs a limiter (G4).",
    "Loudness: the dips are held to their limits (" + h.held.kept + " kept, " + h.held.clamped + " cut to " + r.maxDipDb + " dB, " + h.held.dropped + " dropped); the mix is planned at " + h.predicted.integrated.toFixed(2) + " LUFS / " + h.predicted.truePeak.toFixed(2) + " dBTP" + (h.held.loweredDb > 0 ? ", the voice " + h.held.loweredDb.toFixed(2) + " dB under the target so the true peak stays under " + Math.max(r.limitDbtp, r.ceilingDbtp).toFixed(2) + " dBTP" : "") + ".",
  ];
  return plan(h, false, problems, h.held);
}

export function predictMix(m: StemModel, voiceGainDb: number, runs: readonly DipRun[], ceilingDbtp = LOUDNESS.ceilingDbtp): { integrated: number; truePeak: number } {
  const shape = dipShape(runs, m.sampleRate, m.fps);
  const a = fromDb(voiceGainDb);
  return { integrated: voiceGainDb + mixLoudness(m, 1, shape), truePeak: toDb(mixPeaks(m, a, shape, fromDb(ceilingDbtp)).peak) };
}
