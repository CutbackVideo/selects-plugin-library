import { lintPlan, type Style } from "../../lint/lint.ts";
import { sha256Hex } from "../../host/util.ts";
import { ModelCallFailed, ModelError } from "../../models/errors.ts";
import type { ModelCall, ModelResult } from "../../models/types.ts";
import { fixAnchors, type AnchorChange } from "./anchorFix.ts";
import { plainSpeakerShots, type ShotChange } from "./speakerFootage.ts";
import { bundleProblems, exportScenes, planBody, repairProblems, type BundleScene, type Exported, type FilmBundle, type ScenePlan } from "./bundle.ts";
import { fallbackBundle, fallbackScene } from "./fallback.ts";
import { checkMusic, type MusicCatalog, type MusicChoice } from "./music.ts";
import { PLAN_POLICY, PLAN_ROLE, type PlanPolicy } from "./policy.ts";
import { buildRequest, planTemplate } from "./prompt.ts";
import { repairPrompt, type RepairItem } from "./repair.ts";
import type { PlanSource } from "./source.ts";

export type CallModelFn = (c: ModelCall) => Promise<ModelResult>;

export type CallRecord = Pick<ModelResult, "role" | "provider" | "model" | "effort" | "requestId" | "usage" | "latencyMs" | "attempt" | "cacheHit" | "reasked" | "fallbackFrom" | "servedModel" | "text">;

export type SceneOrigin = "plan" | "anchor-fix" | "repair" | "fallback";

export type SceneOutcome = {
  id: string;
  type: string;
  startWord: number;
  endWord: number;
  origin: SceneOrigin;
  lint: { first: string[]; afterFix: string[] | null; afterRepair: string[] | null; final: string[] };
  anchorChanges: AnchorChange[];
  shotChanges: ShotChange[];
  fixReverted: boolean;
  fallback: { captions: number; removed: string[]; speakerOnly: boolean } | null;
};

export type PlanFilmInput = {
  jobId: string;
  film: string;
  source: PlanSource;
  styles: Readonly<Record<string, Style>>;
  catalog: MusicCatalog | null;
  callModel: CallModelFn;
  policy?: Partial<PlanPolicy>;
  signal?: AbortSignal;
  resume?: { plan?: PendingRequest | null; repair?: PendingRequest | null };
  onRequestId?: (call: "plan" | "repair", requestId: string, promptSha: string) => void | Promise<void>;
  progress?: (note: string) => void;
};

export type PendingRequest = { id: string; promptSha: string | null };

export type PlanFilmResult = {
  request: string;
  template: string;
  call: CallRecord | null;
  rawBundle: FilmBundle | null;
  rawPlans: Record<string, ScenePlan>;
  bundle: FilmBundle;
  exported: Exported;
  scenes: SceneOutcome[];
  repair: { asked: string[]; prompt: string; call: CallRecord | null; accepted: string[]; problems: string[]; error: { kind: string; message: string } | null } | null;
  music: MusicChoice;
  wholeFilmFallback: { kind: string; message: string } | null;
  fallbacks: string[];
  warnings: string[];
};

const record = (r: ModelResult): CallRecord => ({
  role: r.role,
  provider: r.provider,
  model: r.model,
  effort: r.effort,
  requestId: r.requestId,
  usage: r.usage,
  latencyMs: r.latencyMs,
  attempt: r.attempt,
  cacheHit: r.cacheHit,
  reasked: r.reasked,
  fallbackFrom: r.fallbackFrom,
  servedModel: r.servedModel,
  text: r.text,
});

function modelFailure(e: unknown): { kind: string; message: string } | null {
  if (e instanceof ModelCallFailed) return { kind: e.kind, message: e.message };
  if (e instanceof ModelError && e.kind !== "aborted" && e.kind !== "config") return { kind: e.kind, message: e.message };
  return null;
}

export type NoPlan = { kind: string; message: string; setup: boolean };

export function isSetupFailure(f: ModelError): boolean {
  if (f.kind === "config" || f.kind === "auth") return true;
  return f.kind === "unavailable" && f.provider !== "app";
}

export function noPlan(e: unknown): NoPlan | null {
  if (e instanceof ModelCallFailed) return { kind: e.kind, message: e.message, setup: !e.failures.length || e.failures.some(isSetupFailure) };
  if (e instanceof ModelError && e.kind !== "aborted") return { kind: e.kind, message: e.message, setup: isSetupFailure(e) };
  return null;
}

export class PlanNotMade extends Error {
  kind: string;
  setup: boolean;
  constructor(why: NoPlan, cause: unknown) {
    super(
      why.setup
        ? "The plan model cannot run as configured (" + why.kind + "): " + why.message.slice(0, 500) + " Fix config/models.json or config/keys.local.json, then Resume."
        : "No plan came back (" + why.kind + "): " + why.message.slice(0, 500) + " Resume asks again.",
      { cause },
    );
    this.name = "PlanNotMade";
    this.kind = why.kind;
    this.setup = why.setup;
  }
}

const lintOf = (plan: unknown, styles: Readonly<Record<string, Style>>) => lintPlan(plan, { styles }).errors;

export async function planFilm(input: PlanFilmInput): Promise<PlanFilmResult> {
  const policy: PlanPolicy = { ...PLAN_POLICY, ...(input.policy ?? {}) };
  const { source, film, styles } = input;
  const say = input.progress ?? (() => {});
  const fallbacks: string[] = [];
  const warnings: string[] = [];
  const template = planTemplate(policy.promptVersion);
  const request = buildRequest(source, film, template);
  const spoken = source.words.length;
  if (spoken > policy.longSourceWords) warnings.push("The source has " + spoken + " spoken words; the plan call may reach Selects AI's 600 s or output limit.");

  say("Planning the scenes (this can take up to 10 minutes)…");
  let call: CallRecord | null = null;
  let rawBundle: FilmBundle | null = null;
  let whole: PlanFilmResult["wholeFilmFallback"] = null;
  const requestSha = await sha256Hex(request);
  const resumePlan = input.resume?.plan && input.resume.plan.promptSha === requestSha ? input.resume.plan.id : null;
  if (input.resume?.plan && !resumePlan) warnings.push("A saved background plan request (" + input.resume.plan.id + ") was for another request; it is not resumed.");
  try {
    const r = await input.callModel({
      role: PLAN_ROLE,
      jobId: input.jobId,
      prompt: request,
      json: true,
      validate: (v) => bundleProblems(v, source, film),
      signal: input.signal,
      ...(resumePlan ? { resumeRequestId: resumePlan } : {}),
      ...(input.onRequestId ? { onRequestId: (info: { requestId: string }) => input.onRequestId!("plan", info.requestId, requestSha) } : {}),
    });
    call = record(r);
    rawBundle = r.json as FilmBundle;
  } catch (e) {
    const why = noPlan(e);
    if (!why) throw e;
    if (why.setup || !policy.wholeFilmFallback) throw new PlanNotMade(why, e);
    whole = { kind: why.kind, message: why.message };
    fallbacks.push("No plan came back (" + why.kind + "); every scene is the speaker with captions, and the next run asks again. " + why.message.slice(0, 240));
  }

  const bundle: FilmBundle = rawBundle ? { ...rawBundle, scenes: rawBundle.scenes.map((s) => ({ ...s })) } : fallbackBundle(source, film);
  let exported = exportScenes(bundle, source);
  const rawPlans: Record<string, ScenePlan> = rawBundle ? exported.plans : {};
  const outcomes = new Map<string, SceneOutcome>();
  const current = new Map<string, ScenePlan>();

  const fixAndLint = (scene: BundleScene, planIn: ScenePlan, o: SceneOutcome, step: "first" | "repair") => {
    const plain = plainSpeakerShots(planIn, { sceneId: scene.id });
    const plan = plain.plan;
    if (step === "repair") o.shotChanges = [];
    o.shotChanges.push(...plain.changes);
    const before = lintOf(plan, styles);
    if (step === "first") o.lint.first = before;
    const { plan: fixed, changes } = fixAnchors(plan, { sceneId: scene.id, startWord: scene.startWord });
    let chosen = plan;
    let errors = before;
    if (changes.length) {
      const after = lintOf(fixed, styles);
      if (after.length && !before.length) {
        o.fixReverted = true;
        warnings.push(scene.id + ": the anchor fix would make a passing plan fail; the plan keeps its anchors as written.");
      } else {
        chosen = fixed;
        errors = after;
        o.anchorChanges.push(...changes);
        if (step === "first") o.origin = "anchor-fix";
      }
      if (step === "first") o.lint.afterFix = after;
    }
    if (step === "repair") o.lint.afterRepair = errors;
    current.set(scene.id, chosen);
    o.lint.final = errors;
  };
  if (rawBundle) {
    for (const scene of bundle.scenes) {
      const o: SceneOutcome = {
        id: scene.id, type: scene.type, startWord: scene.startWord, endWord: scene.endWord, origin: "plan",
        lint: { first: [], afterFix: null, afterRepair: null, final: [] }, anchorChanges: [], shotChanges: [], fixReverted: false, fallback: null,
      };
      outcomes.set(scene.id, o);
      fixAndLint(scene, exported.plans[scene.id], o, "first");
    }
  }

  let repair: PlanFilmResult["repair"] = null;
  const failing = () => bundle.scenes.filter((s) => (outcomes.get(s.id)?.lint.final.length ?? 0) > 0);
  if (rawBundle && call && policy.repair && failing().length) {
    const asked = failing();
    const items: RepairItem[] = asked.map((s) => ({ scene: { ...s, plan: planBody(current.get(s.id)!) }, text: exported.table[s.id].text, errors: outcomes.get(s.id)!.lint.final }));
    const prompt = repairPrompt(request, film, rawBundle.direction, items);
    repair = { asked: asked.map((s) => s.id), prompt, call: null, accepted: [], problems: [], error: null };
    say("Asking again for " + asked.length + " scene(s) that failed lint…");
    const promptSha = await sha256Hex(prompt);
    const resumeRepair = input.resume?.repair && input.resume.repair.promptSha === promptSha ? input.resume.repair.id : null;
    try {
      const r = await input.callModel({
        role: PLAN_ROLE,
        jobId: input.jobId,
        prompt,
        json: true,
        signal: input.signal,
        ...(resumeRepair ? { resumeRequestId: resumeRepair } : {}),
        ...(input.onRequestId ? { onRequestId: (info: { requestId: string }) => input.onRequestId!("repair", info.requestId, promptSha) } : {}),
      });
      repair.call = record(r);
      repair.problems = repairProblems(r.json, asked, film);
      const answered = Array.isArray((r.json as FilmBundle)?.scenes) ? (r.json as FilmBundle).scenes : [];
      for (const s of asked) {
        const got = answered.filter((x) => x && x.id === s.id);
        const one = got.length === 1 ? got[0] : null;
        if (!one || repairProblems({ schema: "eo-film-plan/1", film, scenes: [one] }, [s], film).length) continue;
        const i = bundle.scenes.findIndex((x) => x.id === s.id);
        bundle.scenes[i] = { ...s, type: one.type, plan: one.plan };
        repair.accepted.push(s.id);
      }
    } catch (e) {
      const failure = modelFailure(e);
      if (!failure) throw e;
      repair.error = failure;
      warnings.push("The lint repair call failed (" + failure.kind + "): " + failure.message.slice(0, 200));
    }
    if (repair.accepted.length) {
      exported = exportScenes(bundle, source);
      for (const id of repair.accepted) {
        const scene = bundle.scenes.find((s) => s.id === id)!;
        const o = outcomes.get(id)!;
        o.type = scene.type;
        fixAndLint(scene, exported.plans[id], o, "repair");
        if (!o.lint.final.length) o.origin = "repair";
      }
    }
  }

  for (const scene of bundle.scenes) {
    let o = outcomes.get(scene.id);
    if (o && !o.lint.final.length) continue;
    const plan = exported.plans[scene.id];
    const fb = fallbackScene({ id: scene.id, durationFrames: plan.durationFrames, words: plan.words }, film, styles);
    if (!o) {
      o = {
        id: scene.id, type: "speaker", startWord: scene.startWord, endWord: scene.endWord, origin: "fallback",
        lint: { first: [], afterFix: null, afterRepair: null, final: [] }, anchorChanges: [], shotChanges: [], fixReverted: false, fallback: null,
      };
      outcomes.set(scene.id, o);
    } else {
      fallbacks.push(scene.id + ": the plan failed lint" + (repair?.asked.includes(scene.id) ? " after one repair" : "") + "; the scene is the speaker with captions (" + o.lint.final.length + " lint error(s), first: " + o.lint.final[0].slice(0, 160) + ")");
    }
    o.origin = "fallback";
    o.type = "speaker";
    o.fallback = { captions: fb.captions, removed: fb.removed, speakerOnly: fb.speakerOnly };
    o.lint.final = fb.errors;
    if (fb.errors.length) warnings.push(scene.id + ": even the fallback scene fails lint: " + fb.errors[0].slice(0, 200));
    const i = bundle.scenes.findIndex((x) => x.id === scene.id);
    bundle.scenes[i] = { ...scene, type: "speaker", plan: fb.body };
    current.delete(scene.id);
  }

  for (let i = 0; i < bundle.scenes.length; i += 1) {
    const s = bundle.scenes[i];
    const chosen = current.get(s.id);
    if (chosen) bundle.scenes[i] = { ...s, plan: planBody(chosen) };
  }
  exported = exportScenes(bundle, source);

  const music = checkMusic(rawBundle ? (rawBundle as Record<string, unknown>).music : undefined, input.catalog);
  if (rawBundle) warnings.push(...music.warnings);
  const { scenes: finalScenes, music: _given, ...head } = bundle;
  const final: FilmBundle = { ...head, music: { mood: music.mood, energy: music.energy, reason: music.reason }, scenes: finalScenes } as FilmBundle;

  return {
    request,
    template,
    call,
    rawBundle,
    rawPlans,
    bundle: final,
    exported,
    scenes: bundle.scenes.map((s) => outcomes.get(s.id)!),
    repair,
    music,
    wholeFilmFallback: whole,
    fallbacks,
    warnings,
  };
}
