// The run, step by step: article -> script (+ fidelity pass) -> [human review] -> narration -> Draft.

import * as P from "../prompts/index.ts";
import type { Article as PromptArticle, PlanAsset, PlanScene, TimedSentence } from "../prompts/types.ts";
import { DEFAULT_VOICE, type Preset } from "../preset.ts";
import { decodeHtml, extractArticle, type Article } from "./article.ts";
import { ask, ASK_MAX_IMAGE_CHARS, ASK_MAX_IMAGES, ASK_MAX_TOTAL_CHARS, ffmpeg, type AskImage, load, readFileBase64, readFileBytes, run, save, scriptBytes, writeText, type PanelSdk } from "./host.ts";
import {
  alignmentScript, createProjectScript, downloadScript, envScript, existsScript, generateScript, importScript,
  imagePlateArgs, narrationStatusScript, photoArgs, PHOTO_MAX_B64, plateArgs, plateSeconds, PLATE_MAX_SECONDS, removeScript, resumeImportScript,
} from "./scripts.ts";
import { captionTimes, joinScript, sentenceTimes, type AlignChar, type Span } from "./timing.ts";
import { applyStatus, canResumeImport, ttsKey, ttsNext, ttsRevision, type TtsRecord } from "./tts.ts";
import { changedScenes, fallbackPlan, hiddenCaptionSentences, isGraphic, placements, sceneClips, settlePlan, type AssetSummary, type PhotoAsset } from "./plan.ts";
import { bandsScript, baseDraftScript, overlayTextScripts, sceneScripts } from "./assemble.ts";
import { loadEmbeddedFont, sceneFont, sceneText, type EmbeddedFont } from "../fonts/sceneFont.ts";
import { findHeadlineFont, headlineFontNote } from "../fonts/headlineFont.ts";

export type Env = { platform: string; sep: string; dir: string; tmp: string; skills: string; projectId: string | null };
export type Line = { id: string; text: string; sourceQuote: string; issues: Array<{ kind: string; note: string }>; rewritten: boolean; edited?: boolean };
export type Script = { headline: { line1: string; line2: string; accent?: string }; sentences: Line[] };
export type Session = {
  presetId: string;
  voiceId: string;
  article: Article | null;
  script: Script | null;
  scriptErrors: string[];
  approved: string | null; // ttsRevision of the approved script, or null
  projectId: string | null;
  draftId: string | null;
  // The scene plan the user reviews after the narration and before the Draft is built.
  plan?: ScenePlan | null;
};

// One "rebuild with feedback" round: what the user asked and how many scenes came back different.
export type PlanRound = { round: number; feedback: string; changed: number; scenes: number; ms: number; fallback: boolean; at: string };
export type ScenePlan = {
  narrationId: string;
  durationSeconds: number;
  sentences: TimedSentence[];
  times: Span[];
  timing: string;
  chars: AlignChar[] | null;
  assets: PlanAsset[];
  thumbs: Record<string, string>;
  assetSummaries: AssetSummary[];
  scenes: PlanScene[];
  fallback: boolean;
  rounds: PlanRound[];
  // Scene indexes that differ from the plan before the last rebuild, and scenes the user changed by hand.
  changed: number[];
  edited: number[];
};
// One session per open Project (the panel follows the Project it is opened in).
export const sessionKey = (projectId: string | null) => "session:" + (projectId ?? "none");
export const emptySession = (presetId = "chosun"): Session => ({ presetId, voiceId: DEFAULT_VOICE, article: null, script: null, scriptErrors: [], approved: null, projectId: null, draftId: null });

export type Log = (key: string, vars?: Record<string, string | number>) => void;

const join = (env: Env, ...parts: string[]) => [env.dir, ...parts].join(env.sep);
// A file the plug-in ships, by its path in the plug-in folder ("fonts/x.b64").
const bundled = (env: Env, rel: string) => [env.skills, ...rel.split("/")].join(env.sep);
// Downloads and intermediate files go to the system temp folder (the host only removes files there).
const tmpPath = (env: Env, name: string) => [env.tmp.replace(/[\\/]+$/, ""), "news-minute-" + name].join(env.sep);
const promptArticle = (a: Article): PromptArticle => ({ title: a.title, source: a.source, date: a.date, body: a.body });

export const getEnv = (sdk: PanelSdk) => run<Env>(sdk, envScript());

export async function fetchArticle(sdk: PanelSdk, env: Env, url: string): Promise<Article> {
  const path = tmpPath(env, "page-" + Date.now() + ".html");
  await run(sdk, downloadScript(url, path));
  try {
    const bytes = await readFileBytes(sdk, path);
    return extractArticle(url, decodeHtml(bytes));
  } finally {
    await run(sdk, removeScript(path)).catch(() => {});
  }
}

// Per-step diagnostics for the run record: time, AI turns, JSON parse failures, repairs, remaining errors.
export type StepStat = { step: string; ms: number; turns: number; parseFailures: number; repairs: number; errors: string[]; at: string };
// plan: what the planner saw and where each asset went (asset summaries, scenes per asset, images sent).
export type PlanRecord = { images: { count: number; chars: number; refs: string[] } | null; assetSummaries: Record<string, string>; placements: Record<string, number[]>; unused: string[]; fallback: boolean; rounds: PlanRound[]; edited: number };
export type RunRecord = { startedAt: string; preset: string; url: string; steps: StepStat[]; notes: string[]; plan?: PlanRecord };
export const newRunRecord = (preset: string, url: string): RunRecord => ({ startedAt: new Date().toISOString(), preset, url, steps: [], notes: [] });

async function askValid<T>(sdk: PanelSdk, step: string, prompt: string, check: (json: any) => { ok: boolean; errors: string[] }, log: Log, rec: RunRecord, maxRepairs = 2, images?: AskImage[]): Promise<{ json: T | null; errors: string[] }> {
  const t0 = Date.now();
  const stat: StepStat = { step, ms: 0, turns: 1, parseFailures: 0, repairs: 0, errors: [], at: new Date().toISOString() };
  const retry = () => { stat.turns++; log("aiRetry"); };
  let reply = await ask(sdk, prompt, retry, images);
  let json: any = null, errors: string[] = [];
  try {
    for (let attempt = 0; ; attempt++) {
      try { json = P.parseJsonLoose(reply); const v = check(json); errors = v.errors; } catch (e: any) { json = null; stat.parseFailures++; errors = [String(e?.message || e)]; }
      if (!errors.length || attempt >= maxRepairs) return { json, errors };
      log("repairing");
      stat.repairs++;
      stat.turns++;
      // The repair turn sees the same images, so it does not rewrite the asset summaries blind.
      reply = await ask(sdk, P.repairPrompt(prompt, json ?? reply, errors), retry, images);
    }
  } finally {
    stat.ms = Date.now() - t0;
    stat.errors = errors.slice(0, 20);
    rec.steps.push(stat);
    log("stepDone", { step, sec: (stat.ms / 1000).toFixed(1), repairs: stat.repairs, parse: stat.parseFailures });
  }
}

// The run record goes to ~/.selects/plugin-data/news-minute/runs/<time>.json (best effort).
export async function saveRunRecord(sdk: PanelSdk, env: Env, rec: RunRecord): Promise<string | null> {
  const name = "run-" + rec.startedAt.replace(/[:.]/g, "-") + ".json";
  const path = join(env, name);
  try { await writeText(sdk, path, JSON.stringify(rec, null, 1)); return path; } catch { return null; }
}

export async function writeScript(sdk: PanelSdk, article: Article, preset: Preset, log: Log, rec: RunRecord): Promise<{ script: Script; errors: string[] }> {
  const pa = promptArticle(article);
  log("writing");
  const first = await askValid<any>(sdk, "script", P.scriptPrompt(pa, { language: preset.scriptLanguage }), (j) => P.validateScript(j, pa), log, rec);
  if (!first.json || !Array.isArray(first.json.sentences)) throw new Error(first.errors.join("; ") || "no script");
  const draft = {
    headline: { line1: String(first.json.headline?.line1 ?? ""), line2: String(first.json.headline?.line2 ?? "") },
    sentences: first.json.sentences.map((s: any, i: number) => ({ id: "s" + (i + 1), text: String(s.text ?? "").trim(), sourceQuote: String(s.sourceQuote ?? "") })),
  };
  log("checking");
  const prev = { headline: draft.headline, sentences: draft.sentences.map((s: any) => ({ id: s.id, text: s.text })) };
  let fid: { json: any; errors: string[] };
  try { fid = await askValid<any>(sdk, "fidelity", P.fidelityPrompt(pa, { ...prev, language: preset.scriptLanguage }), (j) => P.validateFidelity(j, pa, prev), log, rec); }
  catch (e: any) { fid = { json: null, errors: ["fidelity check failed: " + String(e?.message || e)] }; rec.notes.push(fid.errors[0]); }
  if (fid.json && Array.isArray(fid.json.sentences) && fid.json.sentences.length === draft.sentences.length) {
    const script: Script = {
      headline: { line1: String(fid.json.headline?.line1 ?? draft.headline.line1), line2: String(fid.json.headline?.line2 ?? draft.headline.line2) },
      sentences: fid.json.sentences.map((s: any, i: number) => ({
        id: draft.sentences[i].id,
        text: String(s.text ?? draft.sentences[i].text).trim(),
        sourceQuote: String(s.sourceQuote ?? draft.sentences[i].sourceQuote),
        issues: Array.isArray(s.issues) ? s.issues.map((x: any) => ({ kind: String(x?.kind ?? ""), note: String(x?.note ?? "") })) : [],
        rewritten: !!s.rewritten,
      })),
    };
    return { script, errors: fid.errors };
  }
  // The fidelity pass gave nothing usable: show the first draft with both lists of problems.
  return { script: { headline: draft.headline, sentences: draft.sentences.map((s: any) => ({ ...s, issues: [], rewritten: false })) }, errors: [...first.errors, ...fid.errors] };
}

export function checkEdited(script: Script, article: Article) {
  return P.validateScript({ headline: script.headline, sentences: script.sentences.map((s) => ({ text: s.text, sourceQuote: s.sourceQuote })) }, promptArticle(article));
}

export const scriptText = (script: Script) => joinScript(script.sentences.map((s) => s.text));
export const revisionOf = (script: Script, voiceId: string) => ttsRevision(script.headline.line1 + "\n" + script.headline.line2 + "\n" + scriptText(script), voiceId);

export async function ensureProject(sdk: PanelSdk, env: Env, s: Session): Promise<string> {
  if (env.projectId) return env.projectId;
  if (s.projectId) return s.projectId;
  const r = await run<{ projectId: string }>(sdk, createProjectScript());
  return r.projectId;
}

// --- narration ---
export const readTts = (sdk: PanelSdk, projectId: string) => load<TtsRecord>(sdk, ttsKey(projectId));

// Saves "submitting" BEFORE the paid call and the workflowId right after it. Never called automatically.
export async function startNarration(sdk: PanelSdk, projectId: string, script: Script, voiceId: string, language: string): Promise<TtsRecord> {
  const text = scriptText(script);
  const rec: TtsRecord = { revision: revisionOf(script, voiceId), projectId, voiceId, text, state: "submitting", at: Date.now() };
  await save(sdk, ttsKey(projectId), rec);
  const r = await run<{ workflowId: string }>(sdk, generateScript(projectId, "News narration", text, voiceId, language));
  const next: TtsRecord = { ...rec, state: "submitted", workflowId: r.workflowId, at: Date.now() };
  await save(sdk, ttsKey(projectId), next);
  return next;
}

// One status read; resumes a failed import from the saved audio (never a new paid request).
export async function pollNarration(sdk: PanelSdk, rec: TtsRecord): Promise<TtsRecord> {
  if (!rec.workflowId) return rec;
  const r = await run<{ status: any; result: { resourceId: string; durationSeconds: number } | null }>(sdk, narrationStatusScript(rec.workflowId));
  if (!r.result && r.status?.status === "failed" && canResumeImport(r.status)) {
    await run(sdk, resumeImportScript(rec.workflowId));
    return rec;
  }
  const result = r.result ? { resourceId: r.result.resourceId, durationSeconds: r.result.durationSeconds } : null;
  const next = applyStatus(rec, r.status, result);
  if (next.state !== rec.state || next.resourceId !== rec.resourceId) await save(sdk, ttsKey(rec.projectId), next);
  return next;
}
export { ttsNext };

// --- embedded font (Pretendard as "NM Sans", subset per graphic) ---
let fontLoad: Promise<EmbeddedFont> | null = null;
async function embeddedFont(sdk: PanelSdk, env: Env): Promise<EmbeddedFont> {
  if (!fontLoad) {
    const read = async (rel: string) => new TextDecoder().decode(await readFileBytes(sdk, bundled(env, rel), 12 * 1024 * 1024));
    fontLoad = loadEmbeddedFont(read).catch((e) => { fontLoad = null; throw e; });
  }
  return fontLoad;
}

// --- scene plan and Draft ---
// Prepared photos stay in memory for the open panel (storage is too small for them); a reopened panel
// prepares them again when the Draft is built.
const photoCache = new Map<string, PhotoAsset[]>();
const photoKey = (article: Article) => article.url + "|" + article.photos.map((p) => p.url).join("|");

async function prepPhotos(sdk: PanelSdk, env: Env, article: Article, log: Log): Promise<PhotoAsset[]> {
  if (!article.photos.length) return [];
  const cached = photoCache.get(photoKey(article));
  if (cached) return cached;
  log("photos");
  const out: PhotoAsset[] = [];
  for (const p of article.photos.slice(0, 6)) {
    const stamp = Date.now();
    const src = tmpPath(env, `photo-${stamp}-${p.ref}.img`), jpg = tmpPath(env, `photo-${stamp}-${p.ref}.jpg`);
    try {
      await run(sdk, downloadScript(p.url, src));
      let b64 = "";
      for (const [w, q] of [[1080, 6], [720, 8]] as const) {
        await ffmpeg(sdk, "Prepare an article photo", photoArgs(src, jpg, w, q));
        b64 = await readFileBase64(sdk, jpg, 2 * 1024 * 1024);
        if (b64.length <= PHOTO_MAX_B64) break;
      }
      if (b64.length > PHOTO_MAX_B64) continue;
      out.push({ ref: p.ref, dataUrl: "data:image/jpeg;base64," + b64, credit: p.credit, graphic: isGraphic(p.caption, p.w, p.h) });
    } catch { /* a photo that cannot be read is skipped */ }
    finally {
      await run(sdk, removeScript(src)).catch(() => {});
      await run(sdk, removeScript(jpg)).catch(() => {});
    }
  }
  photoCache.set(photoKey(article), out);
  return out;
}

// The images the planner looks at, named by ref. The host takes at most 4: graphics go first, since their
// captions often hold only a credit and say nothing about what they plot.
export function plannerImages(photos: PhotoAsset[]): AskImage[] {
  const ordered = [...photos.filter((p) => p.graphic), ...photos.filter((p) => !p.graphic)];
  const out: AskImage[] = [];
  let total = 0;
  for (const p of ordered) {
    if (out.length >= ASK_MAX_IMAGES) break;
    if (p.dataUrl.length > ASK_MAX_IMAGE_CHARS || total + p.dataUrl.length > ASK_MAX_TOTAL_CHARS) continue;
    out.push({ dataUrl: p.dataUrl, name: p.ref });
    total += p.dataUrl.length;
  }
  return out;
}

// Scene window fill over a background image: the heritage templates leave a zero-alpha colour clear.
export const CLEAR_PAPER = "#F6F1E400";

// A layout image the plug-in ships, or null when the preset names none or the file is not there.
async function layoutImage(sdk: PanelSdk, env: Env, name: string | undefined): Promise<string | null> {
  if (!name) return null;
  const path = bundled(env, name);
  const st = await run<{ exists: boolean; size: number }>(sdk, existsScript(path));
  return st.exists && st.size > 1000 ? path : null;
}

// The Main plate: the preset's background image held still, else its flat colour. image says which.
async function plate(sdk: PanelSdk, env: Env, projectId: string, seconds: number, preset: Preset, log: Log, rec: RunRecord): Promise<{ id: string; image: boolean }> {
  log("plate");
  const image = await layoutImage(sdk, env, preset.layout.backgroundImage);
  const name = image ? preset.layout.backgroundImage!.split("/").pop()!.replace(/\.[^.]+$/, "") : preset.background.replace("#", "");
  const path = join(env, `plate-${name}-${seconds.toFixed(1)}.mp4`);
  rec.notes.push("plate: " + (image ? "image " + preset.layout.backgroundImage : "colour " + preset.background));
  const st = await run<{ exists: boolean; size: number }>(sdk, existsScript(path));
  if (!st.exists || st.size < 1000) await ffmpeg(sdk, "Make the background", image ? imagePlateArgs(seconds, image, path) : plateArgs(seconds, preset.background, path));
  const r = await run<{ ids: string[] }>(sdk, importScript(projectId, [path]));
  if (!r.ids?.length) throw new Error("background was not added to the Project");
  return { id: r.ids[0], image: !!image };
}

// The bands image as a Project Resource, or undefined (the frame graphic draws the bands instead).
async function bands(sdk: PanelSdk, env: Env, projectId: string, preset: Preset, rec: RunRecord): Promise<string | undefined> {
  const image = await layoutImage(sdk, env, preset.layout.bandsImage);
  rec.notes.push("bands: " + (image ? "image " + preset.layout.bandsImage : "frame graphic"));
  if (!image) return undefined;
  const r = await run<{ ids: string[] }>(sdk, importScript(projectId, [image]));
  if (!r.ids?.length) throw new Error("bands image was not added to the Project");
  return r.ids[0];
}

// The validator over a plan the user may have edited (also used to show errors on each row).
export const checkPlan = (plan: Pick<ScenePlan, "assetSummaries" | "scenes" | "sentences" | "assets">) =>
  P.validatePlan({ assetSummaries: plan.assetSummaries, scenes: plan.scenes }, plan.sentences, plan.assets);

// Errors the Draft cannot be built with (scene order and sentence coverage); other errors only warn.
export const BLOCKING_PLAN_ERROR = /unknown sentence id|cover every sentence|sentenceIds is required|must be an object|type must be one of|reply must be/;

// images is null for a record that made no planner call (building the Draft).
function recordPlan(rec: RunRecord, plan: ScenePlan, images: AskImage[] | null) {
  const placed = placements(plan.scenes);
  rec.plan = {
    images: images && { count: images.length, chars: images.reduce((n, im) => n + im.dataUrl.length, 0), refs: images.map((im) => im.name ?? "") },
    assetSummaries: Object.fromEntries(plan.assetSummaries.map((a) => [a.ref, a.summary])),
    placements: placed,
    unused: plan.assets.map((a) => a.ref).filter((r) => !placed[r]),
    fallback: plan.fallback,
    rounds: plan.rounds,
    edited: plan.edited.length,
  };
}

// One planner turn (with the images); a plan that still fails after one repair falls back.
async function askPlan(sdk: PanelSdk, base: Omit<ScenePlan, "assetSummaries" | "scenes" | "fallback" | "rounds" | "changed" | "edited">, script: Script, preset: Preset, photos: PhotoAsset[], log: Log, rec: RunRecord, revision?: { feedback: string; previous: { assetSummaries: AssetSummary[]; scenes: PlanScene[] } }) {
  const images = plannerImages(photos);
  const imageChars = images.reduce((n, im) => n + im.dataUrl.length, 0);
  rec.notes.push("plan images: " + images.length + " of " + photos.length + " (" + images.map((im) => im.name).join(", ") + "), " + Math.round(imageChars / 1024) + " KB base64");
  log("planning");
  let scenes: PlanScene[] | null = null;
  let summaries: AssetSummary[] = [];
  try {
    const check = (j: any) => P.validatePlan(j, base.sentences, base.assets);
    const prompt = P.plannerPrompt({ headline: script.headline, sentences: base.sentences, assets: base.assets, language: preset.scriptLanguage, feedback: revision?.feedback, previous: revision?.previous });
    const r = await askValid<any>(sdk, revision ? "plan revision" : "plan", prompt, check, log, rec, 1, images);
    const settled = settlePlan(r.json, r.errors, base.sentences, check);
    scenes = settled.scenes;
    if (scenes && Array.isArray(r.json?.assetSummaries)) summaries = r.json.assetSummaries.map((a: any) => ({ ref: String(a?.ref ?? ""), summary: String(a?.summary ?? "") }));
    if (settled.demoted) { rec.notes.push("plan: " + settled.demoted + " number callout(s) without a number shown as text cards"); log("planDemoted", { n: settled.demoted }); }
    if (scenes && settled.longScenes.length) rec.notes.push("plan: accepted with long scenes (" + settled.longScenes.join("; ") + ")");
    if (!scenes && r.json) rec.notes.push("plan: rejected (" + settled.errors.slice(0, 5).join("; ") + ")");
  } catch (e: any) { scenes = null; rec.notes.push("plan: failed (" + String(e?.message || e) + ")"); }
  return { scenes, summaries, images };
}

// Timing, photos and the first scene plan. Nothing is added to the Project.
export async function planScenes(sdk: PanelSdk, env: Env, s: Session, preset: Preset, narration: { resourceId: string; durationSeconds: number }, log: Log, rec: RunRecord, thumb?: (dataUrl: string) => Promise<string>): Promise<ScenePlan> {
  const script = s.script!, article = s.article!, projectId = s.projectId!;
  const total = narration.durationSeconds;
  if (!(total > 0)) throw new Error("narration length unknown");
  if (plateSeconds(total) > PLATE_MAX_SECONDS) throw new Error("narration longer than " + PLATE_MAX_SECONDS + " s");

  log("timing");
  const chars = await run<AlignChar[] | null>(sdk, alignmentScript(projectId, narration.resourceId));
  const texts = script.sentences.map((x) => x.text);
  const { times, source } = sentenceTimes(texts, chars, total);
  rec.notes.push("timing: " + source + (chars ? ", " + chars.length + " aligned characters" : ", no alignment"));
  if (source === "ratio") log("timingRatio");

  const photos = await prepPhotos(sdk, env, article, log);
  const sentences = script.sentences.map((x, i) => ({ id: x.id, text: x.text, startSec: Number(times[i].startSec.toFixed(2)), endSec: Number(times[i].endSec.toFixed(2)) }));
  const assets: PlanAsset[] = article.photos.filter((p) => photos.some((q) => q.ref === p.ref)).map((p) => ({ ref: p.ref, kind: "photo" as const, caption: p.caption, credit: p.credit, context: p.context, w: p.w, h: p.h }));
  const thumbs: Record<string, string> = {};
  if (thumb) for (const p of photos) { try { thumbs[p.ref] = await thumb(p.dataUrl); } catch { /* no thumbnail */ } }
  const base = { narrationId: narration.resourceId, durationSeconds: total, sentences, times, timing: source, chars, assets, thumbs };

  const r = await askPlan(sdk, base, script, preset, photos, log, rec);
  let plan: ScenePlan;
  if (r.scenes) plan = { ...base, assetSummaries: r.summaries, scenes: r.scenes, fallback: false, rounds: [], changed: [], edited: [] };
  else {
    rec.notes.push("plan: fallback");
    log("planFallback");
    const fb = fallbackPlan(sentences, times, assets);
    plan = { ...base, assetSummaries: fb.assetSummaries, scenes: fb.scenes, fallback: true, rounds: [], changed: [], edited: [] };
  }
  recordPlan(rec, plan, r.images);
  return plan;
}

// Rebuild the plan from the user's feedback. previous is the plan as the user sees it (their edits included);
// a revision that fails its check keeps that plan.
export async function revisePlan(sdk: PanelSdk, env: Env, s: Session, preset: Preset, feedback: string, log: Log, rec: RunRecord): Promise<{ plan: ScenePlan; kept: boolean }> {
  const cur = s.plan!;
  const photos = await prepPhotos(sdk, env, s.article!, log);
  const t0 = Date.now();
  const r = await askPlan(sdk, cur, s.script!, preset, photos, log, rec, { feedback, previous: { assetSummaries: cur.assetSummaries, scenes: cur.scenes } });
  const ms = Date.now() - t0;
  const round = cur.rounds.length + 1;
  if (!r.scenes) {
    const rounds = [...cur.rounds, { round, feedback, changed: 0, scenes: cur.scenes.length, ms, fallback: true, at: new Date().toISOString() }];
    const plan = { ...cur, rounds, changed: [] };
    recordPlan(rec, plan, r.images);
    return { plan, kept: true };
  }
  const changed = changedScenes(cur.scenes, r.scenes);
  const rounds = [...cur.rounds, { round, feedback, changed: changed.length, scenes: r.scenes.length, ms, fallback: false, at: new Date().toISOString() }];
  rec.notes.push(`plan revision ${round}: ${changed.length} of ${r.scenes.length} scenes changed`);
  const summaries = r.summaries.length ? r.summaries : cur.assetSummaries;
  const plan: ScenePlan = { ...cur, assetSummaries: summaries, scenes: r.scenes, fallback: false, rounds, changed, edited: [] };
  recordPlan(rec, plan, r.images);
  return { plan, kept: false };
}

// Builds the Draft from the reviewed plan.
export async function assemble(sdk: PanelSdk, env: Env, s: Session, preset: Preset, log: Log, rec: RunRecord): Promise<{ draftId: string; timing: string; fallbackPlan: boolean }> {
  const script = s.script!, article = s.article!, projectId = s.projectId!, sp = s.plan!;
  const total = sp.durationSeconds, times = sp.times, chars = sp.chars, sentences = sp.sentences;
  const texts = sentences.map((x) => x.text);
  const plateLen = plateSeconds(total);
  const photos = await prepPhotos(sdk, env, article, log);
  const missing = sp.scenes.filter((sc) => sc.assetRef && !photos.some((p) => p.ref === sc.assetRef)).length;
  if (missing) rec.notes.push("photos: " + missing + " scene(s) lost their photo when it was prepared again");
  recordPlan(rec, sp, null);
  const plan = sp.scenes;
  // The embedded face is best effort: without it the templates use the installed fonts. Each graphic gets its
  // own subset: graphics keep separate parameters, so a shared subset would be copied into every caption
  // (measured on one article: 2.1 MB in 14 scripts shared vs 660 KB in 4 scripts per graphic).
  const fontStats = { count: 0, bytes: 0, missing: new Set<string>(), failed: 0 };
  let font: EmbeddedFont | null = null;
  try {
    log("fonts");
    const t0 = Date.now();
    font = await embeddedFont(sdk, env);
    rec.notes.push("font: embedded (load " + ((Date.now() - t0) / 1000).toFixed(1) + " s)");
  } catch (e: any) {
    rec.notes.push("font: not embedded (" + String(e?.message || e) + ")");
    log("fontFallback");
  }
  // "NM Sans" without the embedded face still selects the templates' installed-font fallback; an empty
  // fontFamily would be filled by the host with the user's last font pick.
  const decorate = (p: Record<string, unknown>): Record<string, unknown> => {
    if (!font) return { ...p, fontFamily: "NM Sans" };
    try {
      const f = sceneFont(font, sceneText(p));
      for (const c of f.missing) fontStats.missing.add(c);
      fontStats.bytes += f.subsetBytes;
      fontStats.count++;
      return { ...p, fontFamily: f.fontFamily, fontCss: f.fontCss, fontLoads: f.fontLoads };
    } catch {
      fontStats.failed++;
      return { ...p, fontFamily: "NM Sans" };
    }
  };

  const hidden = hiddenCaptionSentences(plan, sentences);
  const captions = captionTimes(texts, times, chars).filter((c) => !hidden.has(c.sentence));

  const bg = await plate(sdk, env, projectId, plateLen, preset, log, rec);
  const plateId = bg.id;
  // Scenes draw in the layout's window; over a background image they leave their own fill off so it shows.
  // "transparent" fails the colour control's check (addMotionGraphic rejects it); a zero-alpha hex passes.
  const win: Record<string, unknown> = { windowTop: preset.layout.windowTop, windowHeight: preset.layout.windowHeight, ...(bg.image ? { background: CLEAR_PAPER } : {}) };
  const scenes = sceneClips(plan, sentences, times, total, photos).map((sc) => ({ ...sc, params: decorate({ ...win, ...sc.params }) }));
  const bandsId = await bands(sdk, env, projectId, preset, rec);
  const headFont = await findHeadlineFont(preset.headlineFonts);
  rec.notes.push(headlineFontNote(headFont));
  log("assembling");
  const x = { projectId, draftName: script.headline.line1 || article.title || "News short", plateId, plateSeconds: plateLen, narrationId: sp.narrationId, narrationSeconds: total, bandsId, headline: script.headline, preset, scenes, captions, decorate,
    headlineFont: headFont?.kind === "installed" ? headFont.params : undefined };
  let draftId: string | null = null;
  try {
    const baseCall = baseDraftScript(x);
    rec.notes.push("script bytes: base " + scriptBytes(baseCall));
    const base = await run<{ draftId: string | null }>(sdk, baseCall);
    if (!base.draftId) throw new Error("the Draft was not created");
    draftId = base.draftId;
    // Stacking follows call order: scenes above the frame, the bands above the scenes, then headline and captions.
    const calls = [
      ...sceneScripts(draftId, scenes).map((c) => ({ c, what: "scene" })),
      ...(bandsId ? [{ c: bandsScript(draftId, projectId, bandsId), what: "bands" }] : []),
      ...overlayTextScripts(draftId, x).map((c) => ({ c, what: "headline and captions" })),
    ];
    rec.notes.push("script bytes: " + calls.map((k) => k.what.split(" ")[0] + " " + Math.round(scriptBytes(k.c) / 1024) + " KB").join(", "));
    for (let i = 0; i < calls.length; i++) {
      log("assemblingStep", { n: i + 1, of: calls.length });
      try { await run(sdk, calls[i].c); }
      catch (e: any) { throw new Error(`stopped at step ${i + 1} of ${calls.length} (${calls[i].what}; Draft ${draftId} kept): ${String(e?.message || e)}`); }
    }
  } finally {
    rec.notes.push(`font subsets: ${fontStats.count} graphics, ${Math.round(fontStats.bytes / 1024)} KB` + (fontStats.failed ? `, ${fontStats.failed} failed` : "") + (fontStats.missing.size ? ", no glyph for " + [...fontStats.missing].join("") : ""));
  }
  rec.notes.push("draft: " + draftId + ", " + scenes.length + " scenes, " + captions.length + " captions, " + photos.length + " photos");
  return { draftId: draftId!, timing: sp.timing, fallbackPlan: sp.fallback };
}
