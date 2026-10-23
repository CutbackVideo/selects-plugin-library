// Visual plan -> timed scene clips. A plan that fails validation after one repair falls back to a simple
// photo / text-card plan so the run never stops at scene selection.

import type { PlanScene, TimedSentence } from "../prompts/types.ts";
import { demoteNumberlessCallouts, sceneMaxSec } from "../prompts/validate.ts";
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

// Settles a plan that still has errors after repair: number callouts without a number become text cards
// (then the plan is checked again), and a plan whose only remaining errors are scenes at most
// PLAN_LENGTH_GRACE_SEC over their type's limit is kept. scenes is null when the plan should fall back.
export function settlePlan(json: any, errors: string[], sentences: TimedSentence[], check: (json: any) => { errors: string[] }): { scenes: PlanScene[] | null; demoted: number; longScenes: string[]; errors: string[] } {
  if (!json) return { scenes: null, demoted: 0, longScenes: [], errors };
  if (!errors.length) return { scenes: json.scenes, demoted: 0, longScenes: [], errors };
  const d = demoteNumberlessCallouts(json, sentences);
  if (d.demoted) { json = d.plan; errors = check(json).errors; }
  const long = errors.map((e) => /^scene (\d+): lasts ([\d.]+) s/.exec(e));
  const onlyLength = long.every((m) => m && Number(m[2]) <= sceneMaxSec(String(json.scenes[Number(m[1]) - 1]?.type)) + PLAN_LENGTH_GRACE_SEC);
  return { scenes: onlyLength ? json.scenes : null, demoted: d.demoted, longScenes: onlyLength ? errors : [], errors };
}

// One scene per sentence (two short ones merged while under 6 s); each article photo once, text cards between.
export function fallbackPlan(sentences: Sentence[], times: Span[], photoRefs: string[]): PlanScene[] {
  const groups: number[][] = [];
  for (let i = 0; i < sentences.length; i++) {
    const last = groups[groups.length - 1];
    const dur = (k: number) => times[k].endSec - times[k].startSec;
    if (last && last.length === 1 && dur(last[0]) + dur(i) < 6) last.push(i);
    else groups.push([i]);
  }
  let photo = 0;
  return groups.map((g, k) => {
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
}

// Timed clips for the plan. Photos become data URLs on the scene's own params.
export function sceneClips(plan: PlanScene[], sentences: Sentence[], times: Span[], totalSec: number, photos: PhotoAsset[]): SceneClip[] {
  const index = new Map(sentences.map((s, i) => [s.id, i]));
  const first = plan.map((sc) => Math.min(...sc.sentenceIds.map((id) => index.get(id) ?? Infinity)));
  if (first.some((i) => !Number.isFinite(i))) throw new Error("plan refers to an unknown sentence");
  const wins = sceneWindows(first, times, totalSec);
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
    return { type, label: `${labels[type]?.label ?? type} ${String(k + 1).padStart(2, "0")}`, params, startSec: wins[k].startSec, endSec: wins[k].endSec, disclaimer: !!sc.disclaimer };
  });
}

// Sentences whose captions are hidden (number_callout scenes).
export function hiddenCaptionSentences(plan: PlanScene[], sentences: Sentence[]): Set<number> {
  const index = new Map(sentences.map((s, i) => [s.id, i]));
  const out = new Set<number>();
  for (const sc of plan) if (sc.hideCaption) for (const id of sc.sentenceIds) { const i = index.get(id); if (i !== undefined) out.add(i); }
  return out;
}

export const sceneTooLong = (w: Span) => w.endSec - w.startSec > MAX_SCENE_SEC + 0.5;
