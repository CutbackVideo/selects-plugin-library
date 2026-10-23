// The run, step by step: article -> script (+ fidelity pass) -> [human review] -> narration -> Draft.

import * as P from "../prompts/index.ts";
import type { Article as PromptArticle, PlanScene } from "../prompts/types.ts";
import { DEFAULT_VOICE, type Preset } from "../preset.ts";
import { decodeHtml, extractArticle, type Article } from "./article.ts";
import { ask, ffmpeg, load, readFileBase64, readFileBytes, run, save, scriptBytes, writeText, type PanelSdk } from "./host.ts";
import {
  alignmentScript, createProjectScript, downloadScript, envScript, existsScript, generateScript, importScript,
  narrationStatusScript, photoArgs, PHOTO_MAX_B64, plateArgs, plateSeconds, PLATE_MAX_SECONDS, removeScript, resumeImportScript,
} from "./scripts.ts";
import { captionTimes, joinScript, sentenceTimes, type AlignChar } from "./timing.ts";
import { applyStatus, canResumeImport, ttsKey, ttsNext, ttsRevision, type TtsRecord } from "./tts.ts";
import { fallbackPlan, hiddenCaptionSentences, isGraphic, sceneClips, settlePlan, type PhotoAsset } from "./plan.ts";
import { baseDraftScript, overlayTextScripts, sceneScripts } from "./assemble.ts";
import { loadEmbeddedFont, sceneFont, sceneText, type EmbeddedFont } from "../fonts/sceneFont.ts";

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
};
// One session per open Project (the panel follows the Project it is opened in).
export const sessionKey = (projectId: string | null) => "session:" + (projectId ?? "none");
export const emptySession = (presetId = "chosun"): Session => ({ presetId, voiceId: DEFAULT_VOICE, article: null, script: null, scriptErrors: [], approved: null, projectId: null, draftId: null });

export type Log = (key: string, vars?: Record<string, string | number>) => void;

const join = (env: Env, ...parts: string[]) => [env.dir, ...parts].join(env.sep);
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
export type RunRecord = { startedAt: string; preset: string; url: string; steps: StepStat[]; notes: string[] };
export const newRunRecord = (preset: string, url: string): RunRecord => ({ startedAt: new Date().toISOString(), preset, url, steps: [], notes: [] });

async function askValid<T>(sdk: PanelSdk, step: string, prompt: string, check: (json: any) => { ok: boolean; errors: string[] }, log: Log, rec: RunRecord, maxRepairs = 2): Promise<{ json: T | null; errors: string[] }> {
  const t0 = Date.now();
  const stat: StepStat = { step, ms: 0, turns: 1, parseFailures: 0, repairs: 0, errors: [], at: new Date().toISOString() };
  const retry = () => { stat.turns++; log("aiRetry"); };
  let reply = await ask(sdk, prompt, retry);
  let json: any = null, errors: string[] = [];
  try {
    for (let attempt = 0; ; attempt++) {
      try { json = P.parseJsonLoose(reply); const v = check(json); errors = v.errors; } catch (e: any) { json = null; stat.parseFailures++; errors = [String(e?.message || e)]; }
      if (!errors.length || attempt >= maxRepairs) return { json, errors };
      log("repairing");
      stat.repairs++;
      stat.turns++;
      reply = await ask(sdk, P.repairPrompt(prompt, json ?? reply, errors), retry);
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
    const read = async (rel: string) => new TextDecoder().decode(await readFileBytes(sdk, [env.skills, ...rel.split("/")].join(env.sep), 12 * 1024 * 1024));
    fontLoad = loadEmbeddedFont(read).catch((e) => { fontLoad = null; throw e; });
  }
  return fontLoad;
}

// --- Draft ---
async function prepPhotos(sdk: PanelSdk, env: Env, article: Article, log: Log): Promise<PhotoAsset[]> {
  if (!article.photos.length) return [];
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
    const check = (j: any) => P.validatePlan(j, sentences, assets);
    const r = await askValid<any>(sdk, "plan", P.plannerPrompt({ headline: script.headline, sentences, assets, language: preset.scriptLanguage }), check, log, rec, 1);
    const settled = settlePlan(r.json, r.errors, sentences, check);
    plan = settled.scenes;
    if (settled.demoted) { rec.notes.push("plan: " + settled.demoted + " number callout(s) without a number shown as text cards"); log("planDemoted", { n: settled.demoted }); }
    if (plan && settled.longScenes.length) rec.notes.push("plan: accepted with long scenes (" + settled.longScenes.join("; ") + ")");
    if (!plan && r.json) rec.notes.push("plan: rejected (" + settled.errors.slice(0, 5).join("; ") + ")");
  } catch { plan = null; }
  const usedFallback = !plan;
  if (!plan) { rec.notes.push("plan: fallback"); log("planFallback"); plan = fallbackPlan(sentences, times, photos.map((p) => p.ref)); }

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

  const scenes = sceneClips(plan, sentences, times, total, photos).map((sc) => ({ ...sc, params: decorate(sc.params) }));
  const hidden = hiddenCaptionSentences(plan, sentences);
  const captions = captionTimes(texts, times, chars).filter((c) => !hidden.has(c.sentence));

  const plateId = await plate(sdk, env, projectId, plateLen, preset.background, log);
  log("assembling");
  const x = { projectId, draftName: script.headline.line1 || article.title || "News short", plateId, plateSeconds: plateLen, narrationId: narration.resourceId, narrationSeconds: total, headline: script.headline, preset, scenes, captions, decorate };
  let draftId: string | null = null;
  try {
    const baseCall = baseDraftScript(x);
    rec.notes.push("script bytes: base " + scriptBytes(baseCall));
    const base = await run<{ draftId: string | null }>(sdk, baseCall);
    if (!base.draftId) throw new Error("the Draft was not created");
    draftId = base.draftId;
    // Stacking follows call order: scenes above the frame, then headline and captions above the scenes.
    const calls = [
      ...sceneScripts(draftId, scenes).map((c) => ({ c, what: "scene" })),
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
  return { draftId: draftId!, timing: source, fallbackPlan: usedFallback };
}
