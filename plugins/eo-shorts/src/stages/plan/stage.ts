import type { StageContext, StageImpl, StageResult } from "../../jobs/runner.ts";
import type { SourceSnapshot } from "../../host/preflight.ts";
import { decodeText, ensureDir, readJsonIfExists, writeFileAtomic, writeJsonAtomic } from "../../host/fs.ts";
import { hashJson, sha256Hex } from "../../host/util.ts";
import { readReceipt } from "../../jobs/receipts.ts";
import { modelRecord } from "../../models/jobFields.ts";
import type { ModelClient } from "../../models/callModel.ts";
import { APP_PREAMBLE_TEXT, checkAppSize } from "../../models/adapters/app.ts";
import type { Style } from "../../lint/lint.ts";
import STYLE_A from "../../../engine/styles/A.json" with { type: "json" };
import STYLE_B from "../../../engine/styles/B.json" with { type: "json" };
import { stageModelClient } from "../edit/modelClient.ts";
import type { EditWord } from "../edit/words.ts";
import { FILM_FLOATS, PLAN_FLOATS, SCENES_FLOATS, SOURCE_FLOATS, pyJsonFile } from "./pyJson.ts";
import { planSourceFrom, sourceProblems, type FootageObservations, type PlanSource } from "./source.ts";
import { GUIDE_SHA256, PLANNER_SHA256, SCHEMA_SHA256, buildRequest, planTemplate } from "./prompt.ts";
import { PlanNotMade, planFilm, type CallRecord, type PendingRequest, type PlanFilmResult } from "./film.ts";
import type { MusicCatalog } from "./music.ts";
import { PLAN_POLICY, PLAN_ROLE, PLAN_STAGE_VERSION, type PlanPolicy } from "./policy.ts";

export const FILM_STYLES: Readonly<Record<string, Style>> = { A: STYLE_A as unknown as Style, B: STYLE_B as unknown as Style };

export const REL = {
  editWords: "edit/words.json",
  sourceSnapshot: "source/source.json",
  observations: "speaker/observations.json",
  source: "plan/source.json",
  request: "plan/request.md",
  provenance: "plan/provenance.json",
  response: "plan/response.raw.json",
  bundleRaw: "plan/bundle.raw.json",
  anchorFix: "plan/anchor-fix.json",
  repairRequest: "plan/repair.request.md",
  repairResponse: "plan/repair.response.raw.json",
  bundle: "plan/bundle.json",
  scenes: "plan/scenes.json",
  music: "plan/music.json",
  summary: "plan/plan.json",
  attempts: "plan/attempts.json",
  film: (f: string) => "plan/film-" + f + ".json",
  direction: (f: string) => "plan/direction-" + f + ".md",
  scenePlan: (sid: string) => "plan/scenes/" + sid + "/plan.json",
  scenePlanRaw: (sid: string) => "plan/scenes/" + sid + "/plan.raw.json",
  lint: (sid: string) => "plan/lint/" + sid + ".json",
};

export type PlanStageOptions = {
  models?: (ctx: StageContext) => Pick<ModelClient, "callModel">;
  policy?: Partial<PlanPolicy>;
  version?: string;
  catalog?: MusicCatalog | null;
  styles?: Readonly<Record<string, Style>>;
};

type EditWordsFile = { schema: string; draftId: string; fps: number; mainEnd: number; durationFrames: number; sig: string; words: EditWord[] };

type Inputs = {
  from: "edit" | "source";
  draftId: string | null;
  fps: number;
  mainEnd: number;
  wordsSig: string | null;
  words: Pick<EditWord, "text" | "s" | "e" | "speakerId" | "nonSpeech">[];
  observations: (FootageObservations & { schema?: string }) | null;
  wordsSha: string;
  observationsSha: string | null;
};

async function readText(ctx: StageContext, rel: string): Promise<string | null> {
  const path = ctx.path(rel);
  if (!ctx.host.fs.existsSync(path)) return null;
  return decodeText(await ctx.host.fs.readFile(path));
}

async function readInputs(ctx: StageContext): Promise<Inputs> {
  const editText = await readText(ctx, REL.editWords);
  const obsText = await readText(ctx, REL.observations);
  const observations = obsText ? (JSON.parse(obsText) as Inputs["observations"]) : null;
  const observationsSha = obsText ? await sha256Hex(obsText) : null;
  if (editText) {
    const w = JSON.parse(editText) as EditWordsFile;
    return { from: "edit", draftId: w.draftId, fps: w.fps, mainEnd: w.mainEnd, wordsSig: w.sig ?? null, words: w.words, observations, wordsSha: await sha256Hex(editText), observationsSha };
  }
  const srcText = await readText(ctx, REL.sourceSnapshot);
  if (!srcText) throw new Error("The plan needs the edited words (edit/words.json) or the source snapshot; run the earlier steps first.");
  const s = JSON.parse(srcText) as SourceSnapshot;
  const words = s.words.map((w) => ({ text: w.text, s: w.startFrame, e: w.endFrame, speakerId: w.speakerId, nonSpeech: w.nonSpeech }));
  return { from: "source", draftId: s.draftId, fps: s.fps, mainEnd: s.mainEndFrame, wordsSig: null, words, observations, wordsSha: await sha256Hex(srcText), observationsSha };
}

async function readCatalog(ctx: StageContext): Promise<MusicCatalog | null> {
  const fs = ctx.host.fs;
  const path = fs.join(ctx.roots.skills, "assets", "music", "catalog.json");
  try {
    if (!fs.existsSync(path)) return null;
    return JSON.parse(decodeText(await fs.readFile(path))) as MusicCatalog;
  } catch {
    return null;
  }
}

export type PlanAttempts = {
  schema: "eo-plan-attempts/1";
  fallbackFilms: number;
  noPlan: { at: string; outcome: "failed" | "fallback-film"; kind: string; setup: boolean; message: string }[];
};

async function readAttempts(ctx: Pick<StageContext, "host" | "path">): Promise<PlanAttempts> {
  const a = await readJsonIfExists<PlanAttempts | null>(ctx.host.fs, ctx.path(REL.attempts), null).catch(() => null);
  return a && typeof a.fallbackFilms === "number" && Array.isArray(a.noPlan) ? a : { schema: "eo-plan-attempts/1", fallbackFilms: 0, noPlan: [] };
}

async function recordNoPlan(ctx: StageContext, a: Omit<PlanAttempts["noPlan"][number], "at">): Promise<void> {
  const cur = await readAttempts(ctx);
  cur.noPlan = [...cur.noPlan, { at: new Date(ctx.host.now()).toISOString(), ...a, message: a.message.slice(0, 600) }].slice(-20);
  if (a.outcome === "fallback-film") cur.fallbackFilms += 1;
  await writeJsonAtomic(ctx.host.fs, ctx.path(REL.attempts), cur);
}

const RUN_FILES = [REL.source, REL.request, REL.provenance, REL.response, REL.bundleRaw, REL.anchorFix, REL.repairRequest, REL.repairResponse, REL.bundle, REL.scenes, REL.music, REL.summary];

function clearPlan(ctx: StageContext): void {
  const fs = ctx.host.fs;
  for (const rel of RUN_FILES) fs.rmSync(ctx.path(rel), { force: true });
  for (const name of fs.readdirSync(ctx.path("plan"))) if (/^film-.+\.json$|^direction-.+\.md$/.test(name)) fs.rmSync(ctx.path("plan/" + name), { force: true });
  for (const dir of ["plan/scenes", "plan/lint"]) {
    fs.rmSync(ctx.path(dir), { recursive: true, force: true });
    ensureDir(fs, ctx.path(dir));
  }
}

export function forgetPreviousRun(job: Pick<StageContext["job"], "fallbacks" | "warnings">, last: { warnings?: readonly string[] } | null): void {
  const kept = job.fallbacks.filter((f) => !f.startsWith("plan: "));
  job.fallbacks.splice(0, job.fallbacks.length, ...kept);
  const stale = new Set(last?.warnings ?? []);
  if (stale.size) job.warnings.splice(0, job.warnings.length, ...job.warnings.filter((w) => !stale.has(w)));
}

const pending = (id: string | null | undefined, promptSha: string | null | undefined): PendingRequest | null => (id ? { id, promptSha: promptSha ?? null } : null);

export function createPlanStage(opts: PlanStageOptions = {}): StageImpl {
  const version = opts.version ?? PLAN_STAGE_VERSION;
  const policy: PlanPolicy = { ...PLAN_POLICY, ...(opts.policy ?? {}) };
  return {
    id: "plan",
    inputSha: async (ctx) => {
      const editText = await readText(ctx, REL.editWords);
      const words = editText ?? (await readText(ctx, REL.sourceSnapshot));
      const obs = await readText(ctx, REL.observations);
      return hashJson({
        version,
        policy,
        film: ctx.job.film,
        template: await sha256Hex(planTemplate(policy.promptVersion)),
        words: words == null ? null : await sha256Hex(words),
        observations: obs == null ? null : await sha256Hex(obs),
        fallbackFilms: (await readAttempts(ctx)).fallbackFilms,
      });
    },
    run: (ctx) => runPlan(ctx, { ...opts, policy, version }),
  };
}

export const planStage: StageImpl = createPlanStage();

const callSummary = (c: CallRecord | null) =>
  c && {
    provider: c.provider,
    model: c.model,
    servedModel: c.servedModel ?? null,
    effort: c.effort ?? null,
    latencyMs: c.latencyMs,
    usage: c.usage ?? null,
    attempt: c.attempt,
    cacheHit: c.cacheHit,
    reasked: c.reasked,
    fallbackFrom: c.fallbackFrom,
    requestId: c.requestId ?? null,
  };

async function runPlan(ctx: StageContext, opts: PlanStageOptions & { policy: PlanPolicy; version: string }): Promise<StageResult> {
  const { job } = ctx;
  const fs = ctx.host.fs;
  const t0 = ctx.host.now();
  for (const dir of ["plan", "plan/scenes", "plan/lint"]) ensureDir(fs, ctx.path(dir));
  const styles = opts.styles ?? FILM_STYLES;
  const film = job.film;

  forgetPreviousRun(job, await readReceipt(fs, ctx.dir, "plan"));
  clearPlan(ctx);
  delete job.models[PLAN_ROLE];

  const inputs = await readInputs(ctx);
  if (inputs.from === "source") ctx.warn("The plan uses the source draft's words: there is no edit to plan from.");
  if (!inputs.observations) ctx.warn("No speaker observations: the planner is not told whether the speaker is on camera.");
  const built = planSourceFrom({ words: inputs.words, mainEnd: inputs.mainEnd, fps: inputs.fps, observations: inputs.observations });
  const source: PlanSource = built.source;
  const problems = sourceProblems(source);
  if (problems.length) throw new Error("The words cannot be planned: " + problems.join("; "));
  if (!built.clock.r8) ctx.warn("The draft runs at " + built.clock.fpsRational + " fps; the plan is checked only for 23.976 fps drafts.");
  const sourceText = pyJsonFile(source, SOURCE_FLOATS);
  await writeFileAtomic(fs, ctx.path(REL.source), sourceText);

  const template = planTemplate(opts.policy.promptVersion);
  const request = buildRequest(source, film, template);
  const requestSha = await sha256Hex(request);
  await writeFileAtomic(fs, ctx.path(REL.request), request);
  let size: { chars: number; appChars: number; estTokens: number | null; overAppLimit: string | null };
  {
    const appPrompt = APP_PREAMBLE_TEXT + "\n\n" + request;
    try {
      size = { chars: request.length, appChars: appPrompt.length, estTokens: checkAppSize(appPrompt, []).estTokens, overAppLimit: null };
    } catch (e) {
      size = { chars: request.length, appChars: appPrompt.length, estTokens: null, overAppLimit: String((e as Error).message) };
    }
  }
  const provenance = {
    schema: "eo-single-pass-request/1",
    film,
    sourceSha256: await sha256Hex(sourceText),
    templateSha256: await sha256Hex(template),
    requestSha256: requestSha,
    originalGuideSha256: GUIDE_SHA256,
    originalSchemaSha256: SCHEMA_SHA256,
    modelGenerationPassesExpected: 1,
    assetProduction: "later",
    prompt: { version: opts.policy.promptVersion, baseTemplate: "planner-1", baseTemplateSha256: PLANNER_SHA256 },
    from: inputs.from,
    draft: { draftId: inputs.draftId, mainEnd: inputs.mainEnd, fps: inputs.fps, wordsSig: inputs.wordsSig },
    clock: built.clock,
    words: { planned: source.words.length, leftOut: built.left },
    inputs: { words: inputs.wordsSha, observations: inputs.observationsSha },
    size,
    stage: opts.version,
  };
  await writeJsonAtomic(fs, ctx.path(REL.provenance), provenance);

  const client = opts.models ? opts.models(ctx) : stageModelClient(ctx);
  const catalog = opts.catalog !== undefined ? opts.catalog : await readCatalog(ctx);
  const pendingKey = { plan: ["planRequestId", "planRequestFor"], repair: ["planRepairRequestId", "planRepairRequestFor"] } as const;
  let r: PlanFilmResult;
  try {
    r = await planFilm({
      jobId: job.jobId,
      film,
      source,
      styles,
      catalog,
      callModel: (c) => client.callModel(c),
      policy: opts.policy,
      signal: ctx.signal,
      resume: { plan: pending(job.pending.planRequestId, job.pending.planRequestFor), repair: pending(job.pending.planRepairRequestId, job.pending.planRepairRequestFor) },
      onRequestId: async (call, id, promptSha) => {
        job.pending[pendingKey[call][0]] = id;
        job.pending[pendingKey[call][1]] = promptSha;
        await ctx.saveJob();
      },
      progress: (n) => ctx.note(n),
    });
  } catch (e) {
    if (e instanceof PlanNotMade) await recordNoPlan(ctx, { outcome: "failed", kind: e.kind, setup: e.setup, message: e.message });
    throw e;
  }
  for (const k of [...pendingKey.plan, ...pendingKey.repair]) job.pending[k] = null;
  if (r.call) job.models[PLAN_ROLE] = modelRecord(r.call);
  if (r.wholeFilmFallback) await recordNoPlan(ctx, { outcome: "fallback-film", kind: r.wholeFilmFallback.kind, setup: false, message: r.wholeFilmFallback.message });
  await ctx.saveJob();

  const outputs: string[] = [REL.source, REL.request, REL.provenance];
  if (r.wholeFilmFallback) outputs.push(REL.attempts);
  if (r.call) {
    await writeJsonAtomic(fs, ctx.path(REL.response), { schema: "eo-plan-response/1", role: PLAN_ROLE, ...callSummary(r.call), text: r.call.text });
    outputs.push(REL.response);
  }
  if (r.rawBundle) {
    await writeFileAtomic(fs, ctx.path(REL.bundleRaw), pyJsonFile(r.rawBundle));
    outputs.push(REL.bundleRaw);
  }
  const changes = r.scenes.flatMap((s) => s.anchorChanges);
  await writeJsonAtomic(fs, ctx.path(REL.anchorFix), { schema: "eo-plan-anchor-fix/1", changes, reverted: r.scenes.filter((s) => s.fixReverted).map((s) => s.id) });
  outputs.push(REL.anchorFix);
  if (r.repair) {
    await writeFileAtomic(fs, ctx.path(REL.repairRequest), r.repair.prompt);
    await writeJsonAtomic(fs, ctx.path(REL.repairResponse), {
      schema: "eo-plan-repair/1",
      asked: r.repair.asked,
      accepted: r.repair.accepted,
      problems: r.repair.problems,
      error: r.repair.error,
      ...(r.repair.call ? { ...callSummary(r.repair.call), text: r.repair.call.text } : {}),
    });
    outputs.push(REL.repairRequest, REL.repairResponse);
  }

  const ex = r.exported;
  await writeFileAtomic(fs, ctx.path(REL.bundle), pyJsonFile(r.bundle));
  await writeFileAtomic(fs, ctx.path(REL.scenes), pyJsonFile(ex.table, SCENES_FLOATS));
  await writeFileAtomic(fs, ctx.path(REL.film(film)), pyJsonFile(ex.rows, FILM_FLOATS));
  await writeFileAtomic(fs, ctx.path(REL.direction(film)), r.bundle.direction + "\n");
  outputs.push(REL.bundle, REL.scenes, REL.film(film), REL.direction(film));
  for (const s of r.scenes) {
    ensureDir(fs, ctx.path("plan/scenes/" + s.id));
    await writeFileAtomic(fs, ctx.path(REL.scenePlan(s.id)), pyJsonFile(ex.plans[s.id], PLAN_FLOATS));
    outputs.push(REL.scenePlan(s.id));
    const raw = r.rawPlans[s.id];
    if (raw) await writeFileAtomic(fs, ctx.path(REL.scenePlanRaw(s.id)), pyJsonFile(raw, PLAN_FLOATS));
    await writeJsonAtomic(fs, ctx.path(REL.lint(s.id)), { schema: "eo-plan-lint/1", sceneId: s.id, passed: s.lint.final.length === 0, origin: s.origin, errors: s.lint.final, history: s.lint, anchorChanges: s.anchorChanges, shotChanges: s.shotChanges, fixReverted: s.fixReverted, fallback: s.fallback });
  }
  await writeJsonAtomic(fs, ctx.path(REL.music), r.music);
  outputs.push(REL.music);

  for (const w of r.warnings) ctx.warn(w);
  for (const f of r.fallbacks) ctx.fallback(f);
  const count = (o: string) => r.scenes.filter((s) => s.origin === o).length;
  const types = (["speaker", "broll", "graphic"] as const).map((t) => [t, r.bundle.scenes.filter((s) => s.type === t).length] as const);
  const lintFirst = r.rawBundle ? r.scenes.filter((s) => !s.lint.first.length).length : 0;
  const lintErrors = r.scenes.reduce((n, s) => n + s.lint.final.length, 0);
  const gateFailed: string[] = [];
  if (r.wholeFilmFallback) gateFailed.push("no AI plan (" + r.wholeFilmFallback.kind + "): every scene is the speaker with captions");
  if (lintErrors) gateFailed.push(lintErrors + " lint error(s) after fallbacks");
  const summary = {
    schema: "eo-plan-stage/1",
    jobId: job.jobId,
    film,
    stage: opts.version,
    prompt: provenance.prompt,
    requestSha256: provenance.requestSha256,
    draft: provenance.draft,
    model: callSummary(r.call),
    repairModel: r.repair ? callSummary(r.repair.call) : null,
    scenes: r.bundle.scenes.map((s) => {
      const o = r.scenes.find((x) => x.id === s.id)!;
      const row = ex.table[s.id];
      return { id: s.id, type: s.type, startWord: s.startWord, endWord: s.endWord, start: row.start, end: row.end, origin: o.origin, lintPassed: !o.lint.final.length, anchorChanges: o.anchorChanges.length, shotChanges: o.shotChanges.length };
    }),
    gate: {
      passed: gateFailed.length === 0,
      failed: gateFailed,
      lintErrors,
      lintFirstPass: lintFirst + "/" + (r.rawBundle ? r.scenes.length : 0),
      anchorFixed: count("anchor-fix"),
      repaired: count("repair"),
      fallbackScenes: r.scenes.filter((s) => s.origin === "fallback").map((s) => s.id),
      wholeFilmFallback: r.wholeFilmFallback,
    },
    music: { mood: r.music.mood, energy: r.music.energy, from: r.music.from },
    fallbacks: r.fallbacks,
    warnings: r.warnings,
    ms: ctx.host.now() - t0,
  };
  await writeJsonAtomic(fs, ctx.path(REL.summary), summary);
  outputs.push(REL.summary);

  const parts = [
    r.bundle.scenes.length + " scenes (" + types.filter(([, n]) => n).map(([t, n]) => n + " " + t).join(", ") + ")",
    r.wholeFilmFallback ? "no AI plan (" + r.wholeFilmFallback.kind + "): speaker with captions, asked again next run" : "lint " + lintFirst + "/" + r.scenes.length + " first time",
  ];
  if (count("anchor-fix")) parts.push(count("anchor-fix") + " anchor-fixed");
  if (count("repair")) parts.push(count("repair") + " repaired");
  if (!r.wholeFilmFallback && count("fallback")) parts.push(count("fallback") + " fallback");
  parts.push("music " + r.music.mood);
  return {
    outputs,
    calls: r.call ? [PLAN_ROLE] : [],
    note: parts.join(", "),
    data: { gate: summary.gate, music: summary.music, latencyMs: r.call?.latencyMs ?? null },
  };
}

export async function readPlannedScenes(ctx: Pick<StageContext, "host" | "path">): Promise<{ sceneId: string; type: string; start: number; end: number; plan: Record<string, unknown> }[]> {
  const fs = ctx.host.fs;
  const table = await readJsonIfExists<Record<string, { id: string; type: string; start: number; end: number }> | null>(fs, ctx.path(REL.scenes), null);
  if (!table) throw new Error("The plan has not been made yet (plan/scenes.json is missing).");
  const out = [];
  for (const row of Object.values(table)) {
    const plan = JSON.parse(decodeText(await fs.readFile(ctx.path(REL.scenePlan(row.id))))) as Record<string, unknown>;
    out.push({ sceneId: row.id, type: row.type, start: row.start, end: row.end, plan });
  }
  return out.sort((a, b) => a.start - b.start);
}
