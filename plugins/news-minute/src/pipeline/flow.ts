// The run, step by step: article -> script (+ fidelity pass) -> [human review] -> narration -> scene plan and its
// preview Draft -> [human review] -> the same Draft renamed as the video.

import * as P from "../prompts/index.ts";
import { selectedAi, type AiProvider } from "./providers.ts";
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
import { resolveNarration, resolvePlanNarration, type NarrationReference } from "./narration-reference.ts";
import { changedScenes, fallbackPlan, isGraphic, placements, planWindows, retainPlanPrograms, sceneClips, settlePlan, type AssetSummary, type PhotoAsset } from "./plan.ts";
import { bandsScript, baseDraftScript, fitControls, fitEditableControls, overlayTextScripts, sceneScripts } from "./assemble.ts";
import { applySceneEdits, readSceneSnapshots, supportsSceneEditing } from "./scene-edits.ts";
import { TEMPLATES } from "../templates/generated.ts";
import { loadEmbeddedFont, sceneFont, sceneText, type EmbeddedFont } from "../fonts/sceneFont.ts";
import { findHeadlineFont, headlineFontNote } from "../fonts/headlineFont.ts";
import { clearPreviewCache, entranceSec, FPS, openPreview, renameDraft, sceneFrames, sceneStill, seekScene } from "./preview.ts";

export type Env = { platform: string; sep: string; dir: string; tmp: string; skills: string; projectId: string | null };
export type Line = { id: string; text: string; sourceQuote: string; issues: Array<{ kind: string; note: string }>; rewritten: boolean; edited?: boolean };
export type Script = { headline: { line1: string; line2: string; accent?: string }; sentences: Line[] };
export type Session = {
  // Explicit or last-used provider for all LLM stages. Keep the storage key for existing sessions.
  scriptProvider?: AiProvider;
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
  // The Draft built from the plan for review; "build the video" renames it instead of making another.
  preview?: PreviewDraft | null;
  // Drafts that became the video; a preview is never refilled into one of them.
  videos?: string[];
  // Where the scenes sit on the Draft that became the video (draftId), so its rows still go to each scene.
  video?: PreviewDraft | null;
  // Older and incomplete candidates remain accessible; never delete user work.
  retainedDrafts?: RetainedDraft[];
};
export type RetainedDraft = Pick<PreviewDraft, "draftId" | "projectId" | "name" | "at"> & { status: "previous" | "incomplete"; error?: string };

// What the preview Draft was built from. planRev differs from previewRev(...) once the plan changes (an outdated
// preview); the rest says whether the Draft can be refilled in place and where each scene sits on it.
export type PreviewDraft = {
  draftId: string;
  name: string;
  projectId: string;
  planRev: string; // "" for a Draft whose build stopped part way
  presetId: string;
  narrationId: string;
  plateSeconds: number;
  plateId: string;
  plateImage: boolean;
  bandsId: string | null;
  frames: number; // Main length in frames at 30000/1001
  structureRev?: string;
  // The scene graphics as placed, in plan order; enterSec is when each card has come in (seeking lands there).
  scenes: Array<{ startSec: number; endSec: number; enterSec?: number; clipId?: number; revision?: string; params?: Record<string, any>; type?: string; assetRef?: string; programRev?: string }>;
  at: string;
};

// One "rebuild with feedback" round: what the user asked and how many scenes came back different.
export type PlanRound = { round: number; feedback: string; changed: number; scenes: number; ms: number; fallback: boolean; at: string };
export type ScenePlan = {
  narrationId: string;
  narrationWorkflowId?: string; // stable identity; rN is reassigned after app restart
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

export async function writeScript(sdk: PanelSdk, article: Article, preset: Preset, log: Log, rec: RunRecord, provider: AiProvider): Promise<{ script: Script; errors: string[] }> {
  sdk = await selectedAi(sdk, provider);
  rec.notes.push("script and fidelity provider: " + provider);
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

export async function prepPhotos(sdk: PanelSdk, env: Env, article: Article, log: Log): Promise<PhotoAsset[]> {
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
    const preserve = (j: any) => revision ? retainPlanPrograms(j, revision.previous.scenes) : j;
    const check = (j: any) => P.validatePlan(preserve(j), base.sentences, base.assets);
    const prompt = P.plannerPrompt({ headline: script.headline, sentences: base.sentences, assets: base.assets, language: preset.scriptLanguage, feedback: revision?.feedback, previous: revision?.previous });
    const r = await askValid<any>(sdk, revision ? "plan revision" : "plan", prompt, check, log, rec, 1, images);
    const settled = settlePlan(preserve(r.json), r.errors, base.sentences, check);
    scenes = settled.scenes;
    if (scenes && Array.isArray(r.json?.assetSummaries)) summaries = r.json.assetSummaries.map((a: any) => ({ ref: String(a?.ref ?? ""), summary: String(a?.summary ?? "") }));
    if (settled.demoted) { rec.notes.push("plan: " + settled.demoted + " number callout(s) without a number shown as text cards"); log("planDemoted", { n: settled.demoted }); }
    if (scenes && settled.longScenes.length) rec.notes.push("plan: accepted with long scenes (" + settled.longScenes.join("; ") + ")");
    if (!scenes && r.json) rec.notes.push("plan: rejected (" + settled.errors.slice(0, 5).join("; ") + ")");
  } catch (e: any) { scenes = null; rec.notes.push("plan: failed (" + String(e?.message || e) + ")"); }
  return { scenes, summaries, images };
}

// Timing, photos and the first scene plan. Nothing is added to the Project here; the panel builds the preview
// Draft from the plan next.
export async function planScenes(sdk: PanelSdk, env: Env, s: Session, preset: Preset, narration: NarrationReference, log: Log, rec: RunRecord, provider: AiProvider, thumb?: (dataUrl: string) => Promise<string>): Promise<ScenePlan> {
  sdk = await selectedAi(sdk, provider);
  rec.notes.push("scene planning provider: " + provider);
  const script = s.script!, article = s.article!, projectId = s.projectId!;
  narration = await resolveNarration(sdk, projectId, narration);
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
  const base = { narrationId: narration.resourceId, narrationWorkflowId: narration.workflowId, durationSeconds: total, sentences, times, timing: source, chars, assets, thumbs };

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
export async function revisePlan(sdk: PanelSdk, env: Env, s: Session, preset: Preset, feedback: string, log: Log, rec: RunRecord, provider: AiProvider): Promise<{ plan: ScenePlan; kept: boolean }> {
  sdk = await selectedAi(sdk, provider);
  rec.notes.push("scene revision provider: " + provider);
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

// Where each scene's graphic sits on the Draft, snapped to frames the way assemble places it (the times on the
// scene rows); null while the plan names a sentence the script no longer has.
export function sceneSpans(sp: Pick<ScenePlan, "scenes" | "sentences" | "times" | "durationSeconds">): Span[] | null {
  try {
    return planWindows(sp.scenes, sp.sentences, sp.times, sp.durationSeconds)
      .map((w) => ({ startSec: Math.round(w.startSec * FPS) / FPS, endSec: Math.round(w.endSec * FPS) / FPS }));
  } catch { return null; }
}

// The plan as the preview shows it: scenes, look, headline and narration.
export const previewRev = (s: Pick<Session, "presetId" | "script" | "plan">) =>
  ttsRevision(JSON.stringify([s.presetId, s.script?.headline ?? null, s.plan?.narrationId ?? null, s.plan?.scenes ?? null]), "preview");
export const sceneRevision = (sc: PlanScene) => ttsRevision(JSON.stringify(sc), "scene");
export const programRevision = (sc: PlanScene) => ttsRevision(JSON.stringify(sc.program ?? null), "program");
export const previewStructureRev = (s: Session) => ttsRevision(JSON.stringify([s.presetId, s.script?.headline, s.plan?.narrationId, s.plan?.durationSeconds, s.plan?.times, s.plan?.scenes.map(sc => [sc.sentenceIds, sc.disclaimer])]), "structure");
export const previewFresh = (s: Session) => !!(s.preview && s.plan && s.preview.planRev && s.preview.planRev === previewRev(s) && !s.videos?.includes(s.preview.draftId));
// The Draft the scene rows show and go to: a placed preview, else the confirmed video while it still shows this plan.
export function rowsDraft(s: Session): PreviewDraft | null {
  if (s.preview) return s.preview.planRev ? s.preview : null;
  const v = s.video;
  return v && s.plan && s.draftId === v.draftId && v.planRev === previewRev(s) ? v : null;
}
// The Draft the scene thumbnails are rendered from: the rows' Draft, else the confirmed edit Draft after the plan
// changed (shown "before edit"; it is kept, so its frames can be rendered again after the panel reopens).
export function stillsDraft(s: Session): PreviewDraft | null {
  const rows = rowsDraft(s);
  if (rows || s.preview) return rows;
  const v = s.video;
  return v && s.draftId === v.draftId && v.planRev && v.frames > 0 && v.scenes.length ? v : null;
}
export const finalName = (s: Session) => s.script?.headline.line1 || s.article?.title || "News short";
export const previewName = (s: Session, prefix: string) => prefix + " \u00b7 " + (s.article?.title || finalName(s));
// A confirmed edit Draft's name when other Drafts already use it: "name (2)", "name (3)", ... (Drafts are never
// renamed for it; the earlier ones keep theirs).
export function uniqueName(name: string, taken: string[]): string {
  const used = new Set(taken.map((x) => x.trim()));
  let out = name;
  for (let n = 2; used.has(out.trim()); n++) out = name + " (" + n + ")";
  return out;
}
// The names of the Project's other Drafts (not `except`, the Draft about to take the name).
export async function draftNames(sdk: PanelSdk, projectId: string, except: string | null): Promise<string[]> {
  const names = await run<string[]>(sdk, { summary: "Read the Project's Draft names", script: `const out = [];
for (const id of (await selects.project(${JSON.stringify(projectId)}).meta()).draftIds ?? []) {
  if (id === ${JSON.stringify(except ?? "")}) continue;
  try { out.push(String((await selects.draft(id).meta()).name ?? "")); } catch {}
}
return out;` });
  return Array.isArray(names) ? names : [];
}

type DraftView = { projectId: string; draftId: string };
// A build that stopped after the Draft was saved; keep the candidate and the
// complete Draft that was on screen immediately before candidate creation.
export class PartialDraftError extends Error {
  draft: Omit<PreviewDraft, "name" | "planRev" | "at">;
  preview: PreviewDraft | null = null;
  previousView: DraftView | null = null;
  constructor(message: string, draft: Omit<PreviewDraft, "name" | "planRev" | "at">) { super(message); this.draft = draft; }
}

async function completeDraftOnScreen(sdk: PanelSdk, s: Session): Promise<DraftView | null> {
  try {
    const state = await run(sdk, { summary: "Remember the visible complete news Draft", script: "return await selects.editor.state();" });
    const id = state?.onScreenTab?.kind === "draft" ? state.onScreenTab.sequenceId : null;
    if (!id || state.projectId !== s.projectId || !state.draftIds?.includes(id)) return null;
    const complete = [s.preview, s.video].some(d => d?.projectId === s.projectId && d.draftId === id && d.planRev) ||
      s.retainedDrafts?.some(d => d.projectId === s.projectId && d.draftId === id && d.status === "previous");
    return complete ? { projectId: s.projectId!, draftId: id } : null;
  } catch { return null; } // Unavailable presentation state must not block building or guess a target.
}

export function retainDraft(s: Session, draft: PreviewDraft, status: RetainedDraft["status"], error?: string): Session {
  const record: RetainedDraft = { draftId: draft.draftId, projectId: draft.projectId, name: draft.name, at: draft.at, status, ...(error ? { error } : {}) };
  return { ...s, retainedDrafts: [...(s.retainedDrafts ?? []).filter(d => d.draftId !== draft.draftId), record] };
}

export function acceptPreview(s: Session, preview: PreviewDraft): Session {
  let next = s;
  if (s.preview && s.preview.draftId !== preview.draftId) next = retainDraft(s, s.preview, s.preview.planRev ? "previous" : "incomplete");
  return { ...next, preview };
}

export function retainPartialDraft(s: Session, error: PartialDraftError): Session {
  if (!error.preview) return s;
  // Even on a first failure, the incomplete candidate belongs only in the
  // recovery list. It must not become the preview or enable scene navigation.
  return retainDraft(s, error.preview, "incomplete", error.message);
}

// Mutations (build, refill, rename) wait for all earlier work. Navigation and stills each
// keep their own order, but a thumbnail must not delay a seek until after playback starts.
// Both wait for earlier mutations, and later mutations wait for both. Failures release the queue.
export function draftQueue() {
  let mutation: Promise<unknown> = Promise.resolve();
  let navigation: Promise<unknown> = mutation, still: Promise<unknown> = mutation;
  return <T>(fn: () => Promise<T>, kind: "mutation" | "navigation" | "still" = "mutation"): Promise<T> => {
    const ahead = kind === "navigation" ? [mutation, navigation] : kind === "still" ? [mutation, still] : [mutation, navigation, still];
    const p = Promise.all(ahead).then(fn);
    const done = p.catch(() => {});
    if (kind === "navigation") navigation = done;
    else if (kind === "still") still = done;
    else mutation = done;
    return p;
  };
}

// Thumbnail keys per build: a refill with the same plan still records a new time, so its stills render again.
export const stillBuild = (p: PreviewDraft) => p.draftId + ":" + p.planRev + ":" + p.at + "#";
export const stillKey = (p: PreviewDraft, scene: number) => stillBuild(p) + scene;

// Navigation can run during thumbnail rendering; both remain ordered against builds and refills.
// A still for a replaced preview is dropped when its turn comes instead of rendering.
export function previewViewer(sdk: PanelSdk, env: () => Env | null, queue: ReturnType<typeof draftQueue>, current: () => PreviewDraft | null | undefined) {
  return {
    open: (projectId: string, draftId: string) => queue(() => openPreview(sdk, { projectId, draftId }), "navigation"),
    rename: (projectId: string, draftId: string, name: string) => queue(() => renameDraft(sdk, { projectId, draftId, name })),
    seek: (p: PreviewDraft, scene: number) => queue(() => seekScene(sdk, { projectId: p.projectId, draftId: p.draftId, frames: p.frames, scene: p.scenes[scene] }), "navigation"),
    still: (p: PreviewDraft, scene: number) => queue(async () => {
      const cur = current(), e = env();
      if (!cur || cur.draftId !== p.draftId || cur.at !== p.at) throw new Error("the preview Draft changed");
      if (!e) throw new Error("no environment");
      return sceneStill(sdk, { tmp: e.tmp, sep: e.sep }, { projectId: p.projectId, draftId: p.draftId, frames: p.frames, scene: p.scenes[scene], key: stillKey(p, scene) });
    }, "still"),
  };
}

export type AssembleTarget = { name: string; reuse?: PreviewDraft | null };
export type Assembled = { draftId: string; timing: string; fallbackPlan: boolean; refilled: boolean; draft: Omit<PreviewDraft, "name" | "planRev" | "at"> };

// A full build always uses a new candidate. Resolve media for this app process.
export async function assemble(sdk: PanelSdk, env: Env, s: Session, preset: Preset, log: Log, rec: RunRecord, target?: AssembleTarget): Promise<Assembled> {
  const script = s.script!, article = s.article!, projectId = s.projectId!, sp = s.plan!;
  const narration = await resolvePlanNarration(sdk, s);
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

  // Every sentence keeps its caption, number scenes included (style spec 1); a plan's hideCaption is ignored.
  const captions = captionTimes(texts, times, chars);

  // Cached files are safe to import again; persisted rN Resource aliases are
  // not. They may now name an unrelated file after a complete app restart.
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
  const x = { projectId, draftName: target?.name || finalName(s), plateId, plateSeconds: plateLen, narrationId: narration.resourceId, narrationSeconds: total, bandsId, headline: script.headline, preset, scenes, captions, decorate,
    headlineFont: headFont?.kind === "installed" ? headFont.params : undefined };
  let draftId: string | null = null, frames = 0;
  const placed: Array<{ clipId: number }> = [];
  // A scene whose entrance cannot be worked out (or that has no graphic) is entered at its first frame.
  const enterSec = (sc: (typeof scenes)[number]) => {
    try { const f = sceneFrames(frames, sc); return Number(entranceSec(sc.type, fitControls(sc.type, sc.params), f.end - f.start).toFixed(3)); }
    catch { return 0; }
  };
  const record = () => ({ draftId: draftId!, projectId, presetId: preset.id, narrationId: narration.resourceId, plateSeconds: plateLen, plateId, plateImage: bg.image, bandsId: bandsId ?? null, frames, structureRev: previewStructureRev(s),
    scenes: scenes.map((sc, i) => ({ startSec: sc.startSec, endSec: sc.endSec, enterSec: enterSec(sc), clipId: placed[i]?.clipId, revision: sceneRevision(plan[i]), params: plan[i].params, type: plan[i].type, assetRef: plan[i].assetRef, programRev: programRevision(plan[i]) })) });
  const previousView = await completeDraftOnScreen(sdk, s);
  try {
    if (target?.reuse) rec.notes.push("preview: kept previous Draft " + target.reuse.draftId + "; building a new candidate");
    if (!draftId) {
      const baseCall = baseDraftScript(x);
      rec.notes.push("script bytes: base " + scriptBytes(baseCall));
      const base = await run<{ draftId: string | null; frames: number; narrationFrames: number }>(sdk, baseCall);
      if (!base.draftId) throw new Error("the Draft was not created");
      draftId = base.draftId;
      frames = base.frames;
      // The imported source grid can differ from the job's seconds by a
      // frame. End the final scene/caption at the actual placed audio, while
      // frame/bands/headline use the full Draft including its 0.5 s gap.
      const audioEnd = base.narrationFrames / FPS;
      if (scenes.length) scenes[scenes.length - 1].endSec = audioEnd;
      if (captions.length) captions[captions.length - 1].endSec = audioEnd;
    }
    // Stacking follows call order: scenes above the frame, the bands above the scenes, then headline and captions.
    const calls = [
      ...sceneScripts(draftId, scenes).map((c) => ({ c, what: "scene" })),
      ...(bandsId ? [{ c: bandsScript(draftId, projectId, bandsId), what: "bands" }] : []),
      ...overlayTextScripts(draftId, x).map((c) => ({ c, what: "headline and captions" })),
    ];
    rec.notes.push("script bytes: " + calls.map((k) => k.what.split(" ")[0] + " " + Math.round(scriptBytes(k.c) / 1024) + " KB").join(", "));
    for (let i = 0; i < calls.length; i++) {
      log("assemblingStep", { n: i + 1, of: calls.length });
      try {
        const out = await run(sdk, calls[i].c);
        if (calls[i].what === "scene" && out?.placed) placed.push(...out.placed);
      }
      catch (e: any) { throw new PartialDraftError(`stopped at step ${i + 1} of ${calls.length} (${calls[i].what}; Draft ${draftId} kept): ${String(e?.message || e)}`, record()); }
    }
  } catch (e) {
    if (draftId) {
      const partial = e instanceof PartialDraftError ? e : new PartialDraftError(String((e as any)?.message || e), record());
      partial.previousView = previousView;
      throw partial;
    }
    throw e;
  } finally {
    rec.notes.push(`font subsets: ${fontStats.count} graphics, ${Math.round(fontStats.bytes / 1024)} KB` + (fontStats.failed ? `, ${fontStats.failed} failed` : "") + (fontStats.missing.size ? ", no glyph for " + [...fontStats.missing].join("") : ""));
  }
  rec.notes.push("draft: " + draftId + ", " + scenes.length + " scenes, " + captions.length + " captions, " + photos.length + " photos");
  return { draftId: draftId!, timing: sp.timing, fallbackPlan: sp.fallback, refilled: false, draft: record() };
}

// The preview Draft for the current plan: built (or refilled) and named "Preview \u00b7 <article title>".
export async function buildPreview(sdk: PanelSdk, env: Env, s: Session, preset: Preset, prefix: string, log: Log, rec: RunRecord, options: { candidateOnly?: boolean; incompleteLabel?: string } = {}): Promise<{ preview: PreviewDraft; refilled: boolean }> {
  let name = previewName(s, prefix);
  const planRev = previewRev(s);
  log("previewBuilding");
  const t0 = Date.now();
  const p = s.preview;
  if (!options.candidateOnly && p?.planRev && p.projectId === s.projectId && p.structureRev === previewStructureRev(s) && p.scenes.every(sc => sc.clipId != null && sc.revision && sc.params) && !s.videos?.includes(p.draftId) && await supportsSceneEditing(sdk, p.draftId)) {
    const changed = s.plan!.scenes.map((sc, i) => sceneRevision(sc) !== p.scenes[i]?.revision ? i : -1).filter(i => i >= 0);
    if (changed.length) {
      const photos = await prepPhotos(sdk, env, s.article!, log);
      const clips = sceneClips(s.plan!.scenes, s.plan!.sentences, s.plan!.times, s.plan!.durationSeconds, photos);
      const snapshots = await readSceneSnapshots(sdk, p, s.plan!);
      await applySceneEdits(sdk, p.draftId, snapshots, changed.map(index => {
        const sc = s.plan!.scenes[index], before = p.scenes[index], template = (TEMPLATES as any)[sc.type];
        const parameters: Record<string, any> = {};
        for (const key of new Set([...Object.keys(before.params!), ...Object.keys(sc.params)])) {
          if (JSON.stringify(before.params![key]) !== JSON.stringify(sc.params[key])) parameters[key] = sc.params[key] ?? (sc.program?.editableParameters ?? template.editableParameters).find((d: any) => d.key === key)?.defaultValue ?? null;
        }
        if (before.assetRef !== sc.assetRef) {
          const imageKey = sc.type === "quote_card" ? "headshot" : "image";
          parameters[imageKey] = clips[index].params[imageKey] ?? "";
          if (sc.type === "news_photo") parameters.credit = clips[index].params.credit ?? "";
        }
        const program = before.type !== sc.type ? (sc.program ?? template) : before.programRev !== programRevision(sc) ? sc.program : undefined;
        const controls = program?.editableParameters ?? snapshots[index].program.editableParameters;
        return { index, parameters: fitEditableControls(controls, parameters), ...(program ? { tsxCode: program.tsxCode, editableParameters: program.editableParameters } : {}) };
      }));
      clearPreviewCache(sdk);
    }
    return { preview: { ...p, planRev, at: new Date().toISOString(), scenes: p.scenes.map((sc, i) => ({ ...sc, revision: sceneRevision(s.plan!.scenes[i]), params: s.plan!.scenes[i].params, type: s.plan!.scenes[i].type, assetRef: s.plan!.scenes[i].assetRef, programRev: programRevision(s.plan!.scenes[i]) })) }, refilled: true };
  }
  // Give every retained candidate a distinct visible name, even when the last
  // one failed. Never rename or delete older drafts to make room for a new one.
  try { name = uniqueName(name, await draftNames(sdk, s.projectId!, null)); }
  catch { name += " · " + new Date().toISOString(); }
  try {
    const r = await assemble(sdk, env, s, preset, log, rec, { name, reuse: s.preview });
    rec.notes.push("preview: " + (r.refilled ? "refilled" : "built") + " in " + ((Date.now() - t0) / 1000).toFixed(1) + " s");
    return { preview: { ...r.draft, name, planRev, at: new Date().toISOString() }, refilled: r.refilled };
  } catch (e) {
    if (e instanceof PartialDraftError) {
      let incomplete = name + " · " + (options.incompleteLabel ?? "Incomplete");
      try { incomplete = uniqueName(incomplete, await draftNames(sdk, s.projectId!, e.draft.draftId)); }
      catch { incomplete += " · " + new Date().toISOString(); }
      try { await renameDraft(sdk, { projectId: s.projectId!, draftId: e.draft.draftId, name: incomplete }); name = incomplete; }
      catch { rec.notes.push("incomplete candidate: could not rename " + e.draft.draftId); }
      e.preview = { ...e.draft, name, planRev: "", at: new Date().toISOString() };
    }
    throw e;
  }
}
