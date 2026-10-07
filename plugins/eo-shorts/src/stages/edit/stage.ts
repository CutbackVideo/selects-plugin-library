import type { StageContext, StageImpl, StageResult } from "../../jobs/runner.ts";
import { eoDraftName } from "../../jobs/store.ts";
import type { SourceSnapshot } from "../../host/preflight.ts";
import { ensureDir, readJson, readJsonIfExists, removeFile, renameWithRetry, writeFileAtomic, writeJsonAtomic } from "../../host/fs.ts";
import { modelRecord } from "../../models/jobFields.ts";
import type { ModelClient } from "../../models/callModel.ts";
import { EDIT_POLICY, EDIT_STAGE_VERSION, KEEP_ROLE, type EditPolicy } from "./policy.ts";
import { editInputSha, jobRules, PROGRESS_SCHEMA, resumeDecision, runPolicy, sourceSha, type EditRules, type ProgressHead } from "./inputs.ts";
import { buildClauses, type Clause, type Segment } from "./clauses.ts";
import { decideKeep, type KeepDecision } from "./keep.ts";
import { planRemovals } from "./removals.ts";
import { planAudioCuts, type AudioCutPlan } from "./audioCuts.ts";
import { checkWords } from "./consistency.ts";
import { editGates, editSummary, gateWarnings } from "./report.ts";
import { measureVoice, renderVoice, type VoiceMeasure } from "./voice.ts";
import { cutPauses, makeEoDraft, readDraftState, removeFrames, type DraftState, type LightState, type ScriptOpts } from "./draftEdits.ts";
import { stageModelClient } from "./modelClient.ts";
import { editEndState, type RecordedWords } from "./endState.ts";
import { rangesFrames, type EditWord } from "./words.ts";

export type EditStageOptions = {
  models?: (ctx: StageContext) => Pick<ModelClient, "callModel">;
  policy?: Partial<EditPolicy>;
  version?: string;
  script?: Pick<ScriptOpts, "backoffMs" | "sleepFn">;
};

type Before = { fps: number; mainEnd: number; durationFrames: number; sig: string; textSig: string; words: EditWord[]; segments: Segment[] | null };

type AudioPass = {
  pass: number;
  wav: string;
  seconds: number;
  integrated: number;
  truePeak: number | null;
  lra: number | null;
  cutNoiseDb: number;
  gateNoiseDb: number;
  gateSilences: { start: number; end: number | null }[];
  cutSilences: { start: number; end: number | null }[];
  plan: AudioCutPlan;
  guard: { mainEnd: number; sig: string };
  expect?: { mainEnd: number; textSig: string };
  status: "pending" | "applied" | "final";
  after?: LightState;
  commitId?: string | null;
};

type Progress = {
  schema: typeof PROGRESS_SCHEMA;
  sourceSha: string;
  rules: EditRules;
  draft?: { draftId: string; name: string; existed: boolean; removedClips?: number; resetTransforms?: number; copiedBy?: "duplicate" | "insert" };
  before?: { mainEnd: number; sig: string; textSig: string; count: number };
  keep?: { accepted: boolean; drop: string[]; skipped: string | null };
  remove?: { skipped: boolean; already?: boolean; commitId?: string | null; frames: number; after: LightState };
  silence?: { already: boolean; rows: number; cutFrames: number; restoreRows: number; commitId?: string | null; after: LightState };
  audio: AudioPass[];
};

const REL = {
  progress: "edit/progress.json",
  before: "edit/words.before.json",
  clauses: "edit/clauses.json",
  keepRequest: "edit/keep.request.md",
  keepResponse: "edit/keep.response.json",
  removals: "edit/removals.json",
  audioCuts: "edit/audio-cuts.json",
  words: "edit/words.json",
  edit: "edit/edit.json",
  voice: "sound/voice-only.wav",
};

export function createEditStage(opts: EditStageOptions = {}): StageImpl {
  const current: EditRules = { version: opts.version ?? EDIT_STAGE_VERSION, policy: { ...EDIT_POLICY, ...(opts.policy ?? {}) } };
  return {
    id: "edit",
    inputSha: async (ctx) => {
      const fs = ctx.host.fs;
      const path = ctx.path("source/source.json");
      const source = (await fs.exists(path)) ? await readJson<SourceSnapshot>(fs, path) : null;
      const progress = await readJsonIfExists<ProgressHead | null>(fs, ctx.path(REL.progress), null).catch(() => null);
      return editInputSha(await sourceSha(source), jobRules(progress, ctx.job.draftId, current));
    },
    run: (ctx) => runEdit(ctx, current, opts),
  };
}

export const editStage: StageImpl = createEditStage();

async function runEdit(ctx: StageContext, buildRules: EditRules, opts: EditStageOptions): Promise<StageResult> {
  const { host, job } = ctx;
  const fs = host.fs;
  const sdk = host.sdk;
  const so: ScriptOpts = { signal: ctx.signal, ...(opts.script ?? {}) };
  await ensureDir(fs, ctx.path("edit/audio"));
  await ensureDir(fs, ctx.path("sound"));
  const source = await readJson<SourceSnapshot>(fs, ctx.path("source/source.json"));
  const srcSha = await sourceSha(source);

  const prog = await readJsonIfExists<Progress | null>(fs, ctx.path(REL.progress), null);
  const decision = resumeDecision(prog, { draftId: job.draftId, sourceSha: srcSha, current: buildRules });
  if (decision.kind === "refuse") throw new Error(decision.message);
  const rules = decision.kind === "continue" ? decision.rules : buildRules;
  const policy = runPolicy(rules, buildRules);
  if (decision.kind === "continue" && decision.differs.length) {
    ctx.warn("This job's edit keeps the rules it started with; this plugin build differs in " + decision.differs.join(", ") + ". Make a new short to use them.");
  }
  const p: Progress = decision.kind === "continue" ? prog! : { schema: PROGRESS_SCHEMA, sourceSha: srcSha, rules: buildRules, audio: [] };
  const save = () => writeJsonAtomic(fs, ctx.path(REL.progress), p);

  const name = eoDraftName(job.sourceName ?? source.name, job.jobId);
  if (!job.draftId) {
    ctx.note("Making the EO draft…");
    const made = await makeEoDraft(sdk, { projectId: job.projectId, sourceDraftId: job.sourceDraftId, name, sourceMainEnd: source.mainEndFrame }, so);
    job.draftId = made.draftId;
    await ctx.saveJob();
    await ctx.event("eo-draft", { draftId: made.draftId, name, existed: made.existed, copiedBy: made.copiedBy ?? null });
    p.draft = { draftId: made.draftId, name, existed: made.existed, removedClips: made.removedClips, resetTransforms: made.resetTransforms, copiedBy: made.copiedBy };
    if (made.copiedBy === "insert") {
      ctx.warn("This Selects cannot duplicate drafts (that needs 2.0.541 or later), so the EO draft got a copy of the source's Main instead; the source's retake links are not carried over.");
    }
    await save();
  }
  const draftId = job.draftId!;

  let before: Before;
  if (p.before && (await fs.exists(ctx.path(REL.before)))) {
    before = await readJson<Before>(fs, ctx.path(REL.before));
  } else {
    ctx.note("Reading the EO draft…");
    const st = await readDraftState(sdk, draftId, { words: true, segments: true }, so);
    const src = source.words.map((w) => w.text);
    const same = st.mainEnd === source.mainEndFrame && st.count === src.length && (st.words ?? []).every((w, i) => w.text === src[i]);
    if (!same) {
      throw new Error("The EO draft “" + (st.name ?? draftId) + "” does not match its source any more (it was edited). Make a new short from the source.");
    }
    if (st.retimed) throw new Error("The EO draft has clips that are not at 1x speed; export needs every clip at 1x.");
    if (st.frameSize.width !== 1080 || st.frameSize.height !== 1920) throw new Error("The EO draft is " + st.frameSize.width + "x" + st.frameSize.height + ", not 1080x1920.");
    before = { fps: st.fps, mainEnd: st.mainEnd, durationFrames: st.durationFrames, sig: st.sig, textSig: st.textSig, words: st.words ?? [], segments: st.segments };
    await writeJsonAtomic(fs, ctx.path(REL.before), before);
    p.before = { mainEnd: st.mainEnd, sig: st.sig, textSig: st.textSig, count: st.count };
    await save();
  }
  const fps = before.fps;
  if (!before.segments?.length) ctx.warn("This Selects build gives no semantic cut segments; clauses were split at sentence ends.");

  const clauses = buildClauses(before.words, before.segments, policy.maxClauseWords);
  await writeJsonAtomic(fs, ctx.path(REL.clauses), { fps, from: before.segments?.length ? "semanticCutSegments" : "sentences", clauses });
  let keep: KeepDecision;
  if (p.keep && (await fs.exists(ctx.path(REL.keepResponse)))) {
    keep = await readJson<KeepDecision>(fs, ctx.path(REL.keepResponse));
  } else {
    ctx.note("Choosing what to keep…");
    const client = opts.models ? opts.models(ctx) : stageModelClient(ctx);
    keep = await decideKeep((c) => client.callModel(c), { jobId: job.jobId, clauses, signal: ctx.signal, share: policy.maxDropShare });
    if (keep.prompt) await writeFileAtomic(fs, ctx.path(REL.keepRequest), keep.prompt + "\n");
    await writeJsonAtomic(fs, ctx.path(REL.keepResponse), keep);
    if (keep.accepted && keep.result) {
      job.models[KEEP_ROLE] = modelRecord(keep.result);
      await ctx.saveJob();
    }
    if (keep.error) ctx.fallback("No AI cuts (" + keep.error.kind + "): " + keep.error.message.slice(0, 240));
    p.keep = { accepted: keep.accepted, drop: keep.drop.map((d) => d.id), skipped: keep.skipped };
    await save();
  }

  const plan = planRemovals(before.words, clauses, keep.drop, before.mainEnd, policy.fillerTrimFrames);
  await writeJsonAtomic(fs, ctx.path(REL.removals), plan);
  if (!p.remove) {
    if (!plan.ranges.length) {
      p.remove = { skipped: true, frames: 0, after: { mainEnd: before.mainEnd, durationFrames: before.durationFrames, fps, sig: before.sig, textSig: before.textSig, count: before.words.length } };
    } else {
      const nc = plan.removals.filter((r) => r.kind === "clause").length;
      const nf = plan.removals.length - nc;
      ctx.note("Cutting " + nc + " clause(s) and " + nf + " filler(s)…");
      const r = await removeFrames(
        sdk,
        { draftId, ranges: plan.ranges, guard: { mainEnd: before.mainEnd, sig: before.sig }, expect: { mainEnd: plan.expect.mainEnd, textSig: plan.expect.textSig }, label: "EO Shorts: cut " + nc + " clause(s), " + nf + " filler(s)" },
        "Cut clauses and fillers",
        so,
      );
      if (r.after.mainEnd !== plan.expect.mainEnd || r.after.textSig !== plan.expect.textSig) {
        throw new Error("The clause and filler cut left Main at " + r.after.mainEnd + " frames (expected " + plan.expect.mainEnd + ").");
      }
      p.remove = { skipped: false, already: r.already, commitId: r.commitId ?? null, frames: plan.frames, after: r.after };
    }
    await save();
  }

  if (!p.silence) {
    ctx.note("Tightening the pauses…");
    const g = p.remove.after;
    const r = await cutPauses(
      sdk,
      { draftId, guard: { mainEnd: g.mainEnd, sig: g.sig, textSig: g.textSig }, minSeconds: policy.silenceMinSeconds, padSeconds: policy.silencePadSeconds, label: "EO Shorts: tighten pauses" },
      so,
    );
    if (r.after.textSig !== g.textSig) throw new Error("Tightening the pauses changed the words; the EO draft was edited meanwhile.");
    p.silence = { already: r.already, rows: r.rows, cutFrames: rangesFrames(r.cutFrames ?? []), restoreRows: r.restoreRows ?? 0, commitId: r.commitId ?? null, after: r.after };
    await save();
  }

  const voicePath = ctx.path(REL.voice);
  let state: LightState = p.silence.after;
  for (const a of p.audio) if (a.status === "applied" && a.after) state = a.after;
  let final = p.audio.find((a) => a.status === "final") ?? null;
  if (final && !(await fs.exists(voicePath))) {
    p.audio = p.audio.filter((a) => a !== final);
    final = null;
  }
  let current: DraftState | null = null;
  if (!final) for (const f of (await fs.readdir(ctx.path("edit/audio")))) if (/^pass-.*\.wav$/.test(f) && !p.audio.some((a) => a.wav.endsWith("/" + f))) (await removeFile(fs, ctx.path("edit/audio/" + f)));
  while (!final) {
    const pending = p.audio.find((a) => a.status === "pending");
    if (pending) {
      const r = await removeFrames(sdk, audioCutInput(draftId, pending), "Cut the pauses the transcript misses", so);
      pending.status = "applied";
      pending.after = r.after;
      pending.commitId = r.commitId ?? null;
      await removeFile(fs, ctx.path(pending.wav));
      state = r.after;
      await save();
      continue;
    }
    const n = p.audio.length + 1;
    current = await readDraftState(sdk, draftId, { words: true, segments: false }, so);
    if (current.mainEnd !== state.mainEnd || current.sig !== state.sig) {
      throw new Error("The EO draft changed during the edit (Main ends at " + current.mainEnd + ", expected " + state.mainEnd + ").");
    }
    const wavRel = "edit/audio/pass-" + n + "-" + host.now().toString(36) + ".wav";
    ctx.note("Rendering the voice (" + n + ")…");
    const render = await renderVoice(host, {
      projectId: job.projectId,
      draftId,
      outPath: ctx.path(wavRel),
      mainEndFrame: current.mainEnd,
      fps,
      tmpDir: ctx.path("edit/audio"),
      signal: ctx.signal,
      onProgress: (t) => ctx.note(t),
    });
    const seconds = render.done.probe?.durationSec ?? render.seconds;
    ctx.note("Measuring the voice (" + n + ")…");
    const m: VoiceMeasure = await measureVoice(
      host,
      render.path,
      seconds,
      [
        { offsetDb: policy.audioCutNoiseOffsetDb, minSeconds: policy.audioCutMinSeconds },
        { offsetDb: policy.pauseGateNoiseOffsetDb, minSeconds: policy.pauseGateSeconds },
      ],
      ctx.signal,
    );
    const words = current.words ?? [];
    const cutPlan = planAudioCuts({
      silences: m.silences[0].list,
      words,
      fps,
      fileSeconds: seconds,
      mainEndFrame: current.mainEnd,
      noiseDb: m.silences[0].noiseDb,
      minSeconds: policy.audioCutMinSeconds,
      padSeconds: policy.audioCutPadSeconds,
      maxShare: policy.audioCutMaxShare,
    });
    const pass: AudioPass = {
      pass: n,
      wav: wavRel,
      seconds,
      integrated: m.integrated,
      truePeak: m.truePeak,
      lra: m.lra,
      cutNoiseDb: m.silences[0].noiseDb,
      gateNoiseDb: m.silences[1].noiseDb,
      cutSilences: m.silences[0].list.map((s) => ({ start: s.start, end: s.end })),
      gateSilences: m.silences[1].list.map((s) => ({ start: s.start, end: s.end })),
      plan: cutPlan,
      guard: { mainEnd: current.mainEnd, sig: current.sig },
      status: "pending",
    };
    const noMorePasses = n > policy.audioCutMaxPasses;
    if (!cutPlan.cuts.length || cutPlan.capped || noMorePasses) {
      if (cutPlan.capped) ctx.warn("The audio pause cut would remove " + cutPlan.frames + " frames, over the " + cutPlan.capFrames + "-frame cap; it was skipped.");
      else if (cutPlan.cuts.length) ctx.warn(cutPlan.cuts.length + " short pause(s) remain after " + policy.audioCutMaxPasses + " audio cut passes.");
      await removeFile(fs, voicePath);
      await renameWithRetry(fs, render.path, voicePath);
      pass.wav = REL.voice;
      pass.status = "final";
      p.audio.push(pass);
      await save();
      final = pass;
      break;
    }
    const ranges = cutPlan.cuts.map((c) => c.frames);
    pass.expect = { mainEnd: current.mainEnd - rangesFrames(ranges), textSig: current.textSig };
    p.audio.push(pass);
    await save();
    ctx.note("Cutting " + ranges.length + " pause(s) found in the audio…");
    const r = await removeFrames(sdk, audioCutInput(draftId, pass), "Cut the pauses the transcript misses", so);
    pass.status = "applied";
    pass.after = r.after;
    pass.commitId = r.commitId ?? null;
    await removeFile(fs, render.path);
    state = r.after;
    await save();
  }
  if (!final) throw new Error("The voice render was not made.");
  await writeJsonAtomic(fs, ctx.path(REL.audioCuts), { fps, policy: pickAudioPolicy(policy), passes: p.audio });

  const read = current && current.mainEnd === state.mainEnd && current.sig === state.sig ? current : await readDraftState(sdk, draftId, { words: true, segments: false }, so);
  const recorded = await readJsonIfExists<RecordedWords | null>(fs, ctx.path(REL.words), null).catch(() => null);
  const fin = editEndState(read, state, recorded);
  if (!fin) throw new Error("The EO draft changed at the end of the edit (Main ends at " + read.mainEnd + ").");
  const after = fin.words;
  await writeJsonAtomic(fs, ctx.path(REL.words), { schema: "eo-edit-words/1", draftId, fps, mainEnd: fin.mainEnd, durationFrames: fin.durationFrames, sig: fin.sig, words: after });
  const consistency = checkWords(before.words, plan.removedIdx, after);
  const measured = editGates({
    policy,
    before: before.words,
    after,
    fps,
    mainEnd: fin.mainEnd,
    durationFrames: fin.durationFrames,
    fileSeconds: final.seconds,
    gateSilences: final.gateSilences.map((s) => ({ start: s.start, end: s.end, duration: s.end != null ? s.end - s.start : null, channel: null })),
    consistency,
  });
  for (const w of gateWarnings(measured.gates)) ctx.warn(w);
  const summary = editSummary({
    rules: { version: rules.version, policy },
    jobId: job.jobId,
    draftId,
    fps,
    before: { mainEnd: before.mainEnd, words: before.words.length },
    after: { mainEnd: fin.mainEnd, durationFrames: fin.durationFrames, words: after.length },
    removals: plan.removals,
    keep: { accepted: keep.accepted, skipped: keep.skipped, provider: keep.result?.provider, model: keep.result?.model, dropped: keep.drop.length },
    silence: { rows: p.silence.rows, cutFrames: p.silence.cutFrames, restoreRows: p.silence.restoreRows },
    audioPasses: p.audio.map((a) => ({ pass: a.pass, status: a.status, integrated: a.integrated, cutNoiseDb: a.cutNoiseDb, cuts: a.plan.cuts, capped: a.plan.capped, dropped: a.plan.dropped })),
    voice: { path: REL.voice, integrated: final.integrated, truePeak: final.truePeak, lra: final.lra, seconds: final.seconds },
    measured,
    consistency,
  });
  await writeJsonAtomic(fs, ctx.path(REL.edit), summary);
  const g = measured.gates;
  return {
    outputs: [REL.edit, REL.words, REL.before, REL.clauses, REL.removals, REL.audioCuts, REL.keepResponse, REL.voice, ...(keep.prompt ? [REL.keepRequest] : [])],
    calls: keep.result ? [KEEP_ROLE] : [],
    note:
      (fin.mainEnd / fps).toFixed(1) + " s, " + g.rate.value + " wpm (target " + g.rate.limit + "), longest gap " + g.wordGaps.value.toFixed(2) + " s" +
      (keep.drop.length ? ", " + keep.drop.length + " clause(s) cut" : ""),
    data: { gates: g, beforeFrames: before.mainEnd, afterFrames: fin.mainEnd, draftId },
  };
}

function audioCutInput(draftId: string, pass: AudioPass) {
  return {
    draftId,
    ranges: pass.plan.cuts.map((c) => c.frames),
    guard: pass.guard,
    expect: pass.expect!,
    label: "EO Shorts: cut " + pass.plan.cuts.length + " pause(s) found in the audio",
  };
}

function pickAudioPolicy(p: EditPolicy) {
  return {
    cutNoiseOffsetDb: p.audioCutNoiseOffsetDb,
    cutMinSeconds: p.audioCutMinSeconds,
    cutPadSeconds: p.audioCutPadSeconds,
    maxShare: p.audioCutMaxShare,
    maxPasses: p.audioCutMaxPasses,
    gateNoiseOffsetDb: p.pauseGateNoiseOffsetDb,
    gateSeconds: p.pauseGateSeconds,
  };
}

export type { Clause };
