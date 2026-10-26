// Visual plan -> timed scene clips. A plan that fails validation after one repair falls back to a simple
// photo / text-card plan so the run never stops at scene selection.

import type { PlanAsset, PlanScene, TimedSentence } from "../prompts/types.ts";
import { demoteNumberlessCallouts, sceneMaxSec } from "../prompts/validate.ts";
import { LAYOUT_ERROR } from "../prompts/fit.ts";
import { captionChunks, sceneWindows, type Span } from "./timing.ts";
import type { SceneClip } from "./assemble.ts";
import { TEMPLATES } from "../templates/generated.ts";

export type Sentence = { id: string; text: string };
export type PhotoAsset = { ref: string; dataUrl: string; credit: string; graphic?: boolean };

// Charts and infographics (caption "graphic=" credit, or taller than the 1080x920 window) are shown whole
// ("contain") so axes and titles are not cropped; photos fill the window ("cover").
export function isGraphic(caption: string, w: number, h: number): boolean {
  if (/\uADF8\uB798\uD53D\s*=|graphic\s*=|infographic/i.test(caption)) return true;
  return w > 0 && h > 0 && w / h < 1080 / 920 * 0.85;
}

const MAX_SCENE_SEC = 10;

// How far past its type's limit a scene may run before the plan falls back.
export const PLAN_LENGTH_GRACE_SEC = 2;

// The planner owns grouping, assets and template parameters, not custom code.
// Keep a program only for an unambiguous scene with the same type and sentences;
// a type/group change must not carry a different scene's custom renderer over.
export function retainPlanPrograms(json: any, previous: PlanScene[]): any {
  if (!json || !Array.isArray(json.scenes)) return json;
  return { ...json, scenes: json.scenes.map((scene: any) => {
    if (!scene || typeof scene !== "object" || Array.isArray(scene)) return scene;
    const matches = previous.filter(p => p.type === scene.type && JSON.stringify(p.sentenceIds) === JSON.stringify(scene.sentenceIds));
    const { program: _ignored, ...planned } = scene;
    return matches.length === 1 && matches[0].program ? { ...planned, program: matches[0].program } : planned;
  }) };
}

// Settles a plan that still has errors after repair: number callouts without a number become text cards
// (then the plan is checked again), and a plan whose only remaining errors are scenes at most
// PLAN_LENGTH_GRACE_SEC over their type's limit, or text that does not fit (LAYOUT_ERROR: the reviewer shortens
// it on the scene's row, which keeps "Use this layout" off until then), is kept. scenes is null when the plan
// should fall back.
export function settlePlan(json: any, errors: string[], sentences: TimedSentence[], check: (json: any) => { errors: string[] }): { scenes: PlanScene[] | null; demoted: number; longScenes: string[]; errors: string[] } {
  if (!json) return { scenes: null, demoted: 0, longScenes: [], errors };
  if (!errors.length) return { scenes: json.scenes, demoted: 0, longScenes: [], errors };
  const d = demoteNumberlessCallouts(json, sentences);
  if (d.demoted) { json = d.plan; errors = check(json).errors; }
  const long = errors.filter((e) => !LAYOUT_ERROR.test(e)).map((e) => /^scene (\d+): lasts ([\d.]+) s/.exec(e));
  const onlyLength = long.every((m) => m && Number(m[2]) <= sceneMaxSec(String(json.scenes[Number(m[1]) - 1]?.type)) + PLAN_LENGTH_GRACE_SEC);
  return { scenes: onlyLength ? json.scenes : null, demoted: d.demoted, longScenes: onlyLength ? errors.filter((e) => !LAYOUT_ERROR.test(e)) : [], errors };
}

// A caption without its credit: "/Yonhap"-style trailers and "graphic=..." credit lines are dropped, so a
// caption that is only a credit (Chosun graphics: "/\uADF8\uB798\uD53D=..." ) comes back empty.
export function captionText(caption: string | undefined): string {
  return String(caption ?? "")
    .replace(/\/\s*[^/]{0,40}$/, "")
    .replace(/(?:^|\s)[^\s=]{1,6}\s*=\s*\S+(?:\s+\S+)?\s*$/, "")
    .replace(/^[\s\-\u2013\u2014\u00b7|/]+|[\s\-\u2013\u2014\u00b7|/]+$/g, "")
    .trim();
}

export type AssetSummary = { ref: string; summary: string };

// What the fallback knows about an asset without looking at it: its caption, else the paragraph before it.
export function fallbackSummary(a: PlanAsset): string {
  const cap = captionText(a.caption);
  if (cap) return cap;
  if (a.context) return [...a.context].slice(0, 120).join("");
  return a.kind === "illustration" ? "generated illustration" : "article photo";
}

// The fallback never sees the images, so a graphic it cannot describe (credit-only caption, no context) is
// left out: showing an unknown chart over an unrelated sentence misinforms.
export const fallbackCanPlace = (a: PlanAsset) => !isGraphic(a.caption ?? "", a.w ?? 0, a.h ?? 0) || !!captionText(a.caption) || !!a.context;

// One scene per sentence (two short ones merged while under 6 s); each placeable article photo once, text
// cards between.
export function fallbackPlan(sentences: Sentence[], times: Span[], assets: PlanAsset[]): { assetSummaries: AssetSummary[]; scenes: PlanScene[] } {
  const assetSummaries = assets.map((a) => ({ ref: a.ref, summary: fallbackSummary(a) }));
  const photoRefs = assets.filter((a) => a.kind === "photo" && fallbackCanPlace(a)).map((a) => a.ref);
  const groups: number[][] = [];
  for (let i = 0; i < sentences.length; i++) {
    const last = groups[groups.length - 1];
    const dur = (k: number) => times[k].endSec - times[k].startSec;
    if (last && last.length === 1 && dur(last[0]) + dur(i) < 6) last.push(i);
    else groups.push([i]);
  }
  let photo = 0;
  const scenes = groups.map((g, k) => {
    // Each photo once: a photo of one person must not illustrate sentences about someone else.
    const usePhoto = photo < photoRefs.length && k % 2 === 0;
    if (usePhoto) {
      const ref = photoRefs[photo];
      photo++;
      return { sentenceIds: g.map((i) => sentences[i].id), type: "news_photo", params: { motion: k % 2 ? "pull_out" : "push_in" }, hideCaption: false, disclaimer: false, assetRef: ref };
    }
    const chunks = captionChunks(sentences[g[0]].text, 12);
    return { sentenceIds: g.map((i) => sentences[i].id), type: "text_card", params: { text: chunks.slice(0, 2).join("\n") }, hideCaption: false, disclaimer: false };
  });
  return { assetSummaries, scenes };
}

// Which scenes (1-based) show each asset, for the run record.
export function placements(scenes: PlanScene[]): Record<string, number[]> {
  const out: Record<string, number[]> = {};
  scenes.forEach((sc, i) => { if (sc.assetRef) (out[sc.assetRef] ??= []).push(i + 1); });
  return out;
}

// Timed clips for the plan. Photos become data URLs on the scene's own params.
// Where each scene's graphic goes, in seconds: from just before its first sentence to the next scene's cut.
export function planWindows(plan: PlanScene[], sentences: Sentence[], times: Span[], totalSec: number): Span[] {
  const index = new Map(sentences.map((s, i) => [s.id, i]));
  const first = plan.map((sc) => Math.min(...sc.sentenceIds.map((id) => index.get(id) ?? Infinity)));
  if (first.some((i) => !Number.isFinite(i))) throw new Error("plan refers to an unknown sentence");
  return sceneWindows(first, times, totalSec);
}

export function sceneClips(plan: PlanScene[], sentences: Sentence[], times: Span[], totalSec: number, photos: PhotoAsset[]): SceneClip[] {
  const index = new Map(sentences.map((s, i) => [s.id, i]));
  const first = plan.map((sc) => Math.min(...sc.sentenceIds.map((id) => index.get(id) ?? Infinity)));
  const wins = planWindows(plan, sentences, times, totalSec);
  const byRef = new Map(photos.map((p) => [p.ref, p]));
  const labels = TEMPLATES as Record<string, { label: string }>;
  return plan.map((sc, k) => {
    const params: Record<string, unknown> = { ...(sc.params || {}), fontFamily: "" };
    const asset = sc.assetRef ? byRef.get(sc.assetRef) : undefined;
    if (asset) {
      if (sc.type === "quote_card") params.headshot = asset.dataUrl;
      else params.image = asset.dataUrl;
      if (sc.type === "news_photo" && asset.credit && !params.credit) params.credit = asset.credit;
      if (sc.type === "news_photo" && asset.graphic && params.fit === undefined) params.fit = "contain";
    }
    const type = sc.type === "news_photo" && !asset ? "text_card" : sc.type;
    if (type === "text_card" && !params.text) params.text = captionChunks(sentences[first[k]].text, 12).slice(0, 2).join("\n");
    return { type, label: `${labels[type]?.label ?? type} ${String(k + 1).padStart(2, "0")}`, params, startSec: wins[k].startSec, endSec: wins[k].endSec, disclaimer: !!sc.disclaimer, program: sc.program };
  });
}

export const sceneTooLong = (w: Span) => w.endSec - w.startSec > MAX_SCENE_SEC + 0.5;

// JSON with object keys sorted, so the same params in a different key order compare equal.
export function stableJson(v: unknown): string {
  if (Array.isArray(v)) return "[" + v.map(stableJson).join(",") + "]";
  if (v && typeof v === "object") return "{" + Object.keys(v as object).sort().map((k) => JSON.stringify(k) + ":" + stableJson((v as any)[k])).join(",") + "}";
  return JSON.stringify(v ?? null);
}

const sceneKey = (sc: PlanScene) => (sc.sentenceIds || []).join(",");
const sceneLook = (sc: PlanScene) => stableJson({ type: sc.type, params: sc.params ?? {}, program: sc.program, assetRef: sc.assetRef ?? null, hideCaption: !!sc.hideCaption });

// Indexes of scenes in next that differ from previous: no scene over the same sentences before, or a different
// type, params, assetRef or hideCaption.
export function changedScenes(previous: PlanScene[], next: PlanScene[]): number[] {
  const before = new Map(previous.map((sc) => [sceneKey(sc), sceneLook(sc)]));
  const out: number[] = [];
  next.forEach((sc, i) => { if (before.get(sceneKey(sc)) !== sceneLook(sc)) out.push(i); });
  return out;
}

// A user-chosen scene type starts from params that fit it; text a viewer reads comes from the first sentence.
export function retypeScene(sc: PlanScene, type: string, firstSentence: string, photoRefs: string[]): PlanScene {
  const keepsAsset = type === "news_photo" || type === "number_callout" || type === "quote_card";
  const assetRef = keepsAsset ? sc.assetRef ?? (type === "news_photo" ? photoRefs[0] : undefined) : undefined;
  const params: Record<string, any> =
    type === "text_card" ? { text: captionChunks(firstSentence, 12).slice(0, 2).join("\n") }
    : type === "number_callout" ? { label: "", from: "", to: "", unit: "" }
    : type === "news_photo" ? {}
    : { ...(sc.params ?? {}) };
  const out: PlanScene = { sentenceIds: sc.sentenceIds, type, params, hideCaption: false, disclaimer: false };
  if (assetRef) out.assetRef = assetRef;
  return out;
}
