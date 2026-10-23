// The run, step by step: article -> script (+ fidelity pass) -> [human review] -> narration -> Draft.

import * as P from "../prompts/index.ts";
import type { Article as PromptArticle, PlanScene } from "../prompts/types.ts";
import { DEFAULT_VOICE, type Preset } from "../preset.ts";
import { decodeHtml, extractArticle, type Article } from "./article.ts";
import { ask, ffmpeg, load, readFileBase64, readFileBytes, run, save, writeText, type PanelSdk } from "./host.ts";
import {
  alignmentScript, createProjectScript, downloadScript, envScript, existsScript, generateScript, importScript,
  narrationStatusScript, photoArgs, plateArgs, plateSeconds, PLATE_MAX_SECONDS, removeScript, resumeImportScript,
} from "./scripts.ts";
import { captionTimes, joinScript, sentenceTimes, type AlignChar } from "./timing.ts";
import { applyStatus, canResumeImport, ttsKey, ttsNext, ttsRevision, type TtsRecord } from "./tts.ts";
import { fallbackPlan, hiddenCaptionSentences, sceneClips, type PhotoAsset } from "./plan.ts";
import { baseDraftScript, overlayTextScript, sceneScripts } from "./assemble.ts";

export type Env = { platform: string; sep: string; dir: string; projectId: string | null };
export type Line = { id: string; text: string; sourceQuote: string; issues: Array<{ kind: string; note: string }>; rewritten: boolean };
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
};
export const SESSION_KEY = "session";
export const emptySession = (presetId = "chosun"): Session => ({ presetId, voiceId: DEFAULT_VOICE, article: null, script: null, scriptErrors: [], approved: null, projectId: null, draftId: null });

export type Log = (key: string, vars?: Record<string, string | number>) => void;

const join = (env: Env, ...parts: string[]) => [env.dir, ...parts].join(env.sep);
const promptArticle = (a: Article): PromptArticle => ({ title: a.title, source: a.source, date: a.date, body: a.body });

export const getEnv = (sdk: PanelSdk) => run<Env>(sdk, envScript());

export async function fetchArticle(sdk: PanelSdk, env: Env, url: string): Promise<Article> {
  const path = join(env, "page-" + Date.now() + ".html");
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
export type RunRecord = { startedAt: string; preset: string; url: string; steps: StepStat[]; notes: string[] };
export const newRunRecord = (preset: string, url: string): RunRecord => ({ startedAt: new Date().toISOString(), preset, url, steps: [], notes: [] });

async function askValid<T>(sdk: PanelSdk, step: string, prompt: string, check: (json: any) => { ok: boolean; errors: string[] }, log: Log, rec: RunRecord, maxRepairs = 2): Promise<{ json: T | null; errors: string[] }> {
  const t0 = Date.now();
  const stat: StepStat = { step, ms: 0, turns: 1, parseFailures: 0, repairs: 0, errors: [], at: new Date().toISOString() };
  let reply = await ask(sdk, prompt);
  let json: any = null, errors: string[] = [];
  try {
    for (let attempt = 0; ; attempt++) {
      try { json = P.parseJsonLoose(reply); const v = check(json); errors = v.errors; } catch (e: any) { json = null; stat.parseFailures++; errors = [String(e?.message || e)]; }
      if (!errors.length || attempt >= maxRepairs) return { json, errors };
      log("repairing");
      stat.repairs++;
      stat.turns++;
      reply = await ask(sdk, P.repairPrompt(prompt, json ?? reply, errors));
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
  const fid = await askValid<any>(sdk, "fidelity", P.fidelityPrompt(pa, { ...prev, language: preset.scriptLanguage }), (j) => P.validateFidelity(j, pa, prev), log, rec);
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
  if (s.projectId) return s.projectId;
  if (env.projectId) return env.projectId;
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
  // Prefer the persistent Resource UUID over the session-short id.
  const result = r.result ? { resourceId: r.status?.resourceId || r.result.resourceId, durationSeconds: r.result.durationSeconds } : null;
  const next = applyStatus(rec, r.status, result);
  if (next.state !== rec.state || next.resourceId !== rec.resourceId) await save(sdk, ttsKey(rec.projectId), next);
  return next;
}
export { ttsNext };

// --- Draft ---
async function prepPhotos(sdk: PanelSdk, env: Env, article: Article, log: Log): Promise<PhotoAsset[]> {
  if (!article.photos.length) return [];
  log("photos");
  const out: PhotoAsset[] = [];
  for (const p of article.photos.slice(0, 6)) {
    const stamp = Date.now();
    const src = join(env, `photo-${stamp}-${p.ref}.img`), jpg = join(env, `photo-${stamp}-${p.ref}.jpg`);
    try {
      await run(sdk, downloadScript(p.url, src));
      await ffmpeg(sdk, "Prepare an article photo", photoArgs(src, jpg));
      out.push({ ref: p.ref, dataUrl: "data:image/jpeg;base64," + (await readFileBase64(sdk, jpg, 2 * 1024 * 1024)), credit: p.credit });
    } catch { /* a photo that cannot be read is skipped */ }
    finally {
      await run(sdk, removeScript(src)).catch(() => {});
      await run(sdk, removeScript(jpg)).catch(() => {});
    }
  }
  return out;
}

async function plate(sdk: PanelSdk, env: Env, projectId: string, seconds: number, color: string, log: Log): Promise<string> {
  log("plate");
  const path = join(env, `plate-${color.replace("#", "")}-${seconds.toFixed(1)}.mp4`);
  const st = await run<{ exists: boolean; size: number }>(sdk, existsScript(path));
  if (!st.exists || st.size < 1000) await ffmpeg(sdk, "Make the background", plateArgs(seconds, color, path));
  const r = await run<{ ids: string[] }>(sdk, importScript(projectId, [path]));
  if (!r.ids?.length) throw new Error("background was not added to the Project");
  return r.ids[0];
}

export async function buildDraft(sdk: PanelSdk, env: Env, s: Session, preset: Preset, narration: { resourceId: string; durationSeconds: number }, log: Log, rec: RunRecord): Promise<{ draftId: string; timing: string; fallbackPlan: boolean }> {
  const script = s.script!, article = s.article!, projectId = s.projectId!;
  const total = narration.durationSeconds;
  if (!(total > 0)) throw new Error("narration length unknown");
  const plateLen = plateSeconds(total);
  if (plateLen > PLATE_MAX_SECONDS) throw new Error("narration longer than " + PLATE_MAX_SECONDS + " s");

  log("timing");
  const chars = await run<AlignChar[] | null>(sdk, alignmentScript(projectId, narration.resourceId));
  const texts = script.sentences.map((x) => x.text);
  const { times, source } = sentenceTimes(texts, chars, total);
  rec.notes.push("timing: " + source + (chars ? ", " + chars.length + " aligned characters" : ", no alignment"));
  if (source === "ratio") log("timingRatio");

  const photos = await prepPhotos(sdk, env, article, log);
  const sentences = script.sentences.map((x, i) => ({ id: x.id, text: x.text, startSec: Number(times[i].startSec.toFixed(2)), endSec: Number(times[i].endSec.toFixed(2)) }));
  const assets = article.photos.filter((p) => photos.some((q) => q.ref === p.ref)).map((p) => ({ ref: p.ref, kind: "photo" as const, caption: p.caption, credit: p.credit, w: p.w, h: p.h }));

  log("planning");
  let plan: PlanScene[] | null = null;
  try {
    const r = await askValid<any>(sdk, "plan", P.plannerPrompt({ headline: script.headline, sentences, assets, language: preset.scriptLanguage }), (j) => P.validatePlan(j, sentences, assets), log, rec, 1);
    if (r.json && !r.errors.length) plan = r.json.scenes;
  } catch { plan = null; }
  const usedFallback = !plan;
  if (!plan) { rec.notes.push("plan: fallback"); log("planFallback"); plan = fallbackPlan(sentences, times, photos.map((p) => p.ref)); }

  const scenes = sceneClips(plan, sentences, times, total, photos);
  const hidden = hiddenCaptionSentences(plan, sentences);
  const captions = captionTimes(texts, times, chars).filter((c) => !hidden.has(c.sentence));

  const plateId = await plate(sdk, env, projectId, plateLen, preset.background, log);
  log("assembling");
  const x = { projectId, draftName: script.headline.line1 || article.title || "News short", plateId, plateSeconds: plateLen, narrationId: narration.resourceId, narrationSeconds: total, headline: script.headline, preset, scenes, captions };
  const base = await run<{ draftId: string | null }>(sdk, baseDraftScript(x));
  if (!base.draftId) throw new Error("the Draft was not created");
  for (const call of sceneScripts(base.draftId, scenes)) await run(sdk, call);
  await run(sdk, overlayTextScript(base.draftId, x));
  rec.notes.push("draft: " + base.draftId + ", " + scenes.length + " scenes, " + captions.length + " captions, " + photos.length + " photos");
  return { draftId: base.draftId, timing: source, fallbackPlan: usedFallback };
}
