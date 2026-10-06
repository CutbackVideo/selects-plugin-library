import { DIRECTING, DIRECTING_SHA256, PROMPT, PROMPT_SHA256, SCHEMA, SCHEMA_SHA256 } from "./promptSource.ts";
import { MUSIC_SKELETON_LINE, musicSection } from "./music.ts";
import { pyJson, SOURCE_FLOATS } from "./pyJson.ts";
import type { PlanSource } from "./source.ts";

let texts: { prompt: string; directing: string; schema: string } | null = null;
export function promptTexts(): { prompt: string; directing: string; schema: string } {
  texts ??= { prompt: PROMPT, directing: DIRECTING, schema: SCHEMA };
  return texts;
}

export const PLANNER_SHA256 = PROMPT_SHA256;
export const GUIDE_SHA256 = DIRECTING_SHA256;
export { SCHEMA_SHA256 };

export const ONE_OUTPUT_HEADING = "## One output\n";
export const SKELETON_DIRECTION_LINE =
  '  "direction": "A concise whole-film directing note in English explaining the argument, material choices, rhythm and handoffs.",\n';

export type PromptVersion = "planner-1-music" | "planner-1";

export function planTemplate(version: PromptVersion = "planner-1-music"): string {
  const base = promptTexts().prompt;
  if (version === "planner-1") return base;
  const heading = base.indexOf(ONE_OUTPUT_HEADING);
  const direction = base.indexOf(SKELETON_DIRECTION_LINE);
  if (heading < 0 || base.indexOf(ONE_OUTPUT_HEADING, heading + 1) >= 0 || direction < heading || base.indexOf(SKELETON_DIRECTION_LINE, direction + 1) >= 0) {
    throw new Error("engine/prompt/PROMPT.md changed: the music insertion points are gone");
  }
  const at = direction + SKELETON_DIRECTION_LINE.length;
  return base.slice(0, heading) + musicSection() + base.slice(heading, at) + MUSIC_SKELETON_LINE + base.slice(at);
}

const replaceAll = (s: string, token: string, by: string): string => s.split(token).join(by);

export function indexedSource(source: PlanSource): Record<string, unknown> {
  return { ...source, wordCount: source.words.length, words: source.words.map((w, index) => ({ index, ...w })) };
}

export function buildRequest(source: PlanSource, film: string, template: string = planTemplate()): string {
  const t = promptTexts();
  let request = replaceAll(template, "{{FILM}}", film);
  request = replaceAll(request, "{{SOURCE}}", pyJson(indexedSource(source), SOURCE_FLOATS));
  request = replaceAll(request, "{{DIRECTING}}", t.directing);
  return replaceAll(request, "{{SCHEMA}}", t.schema);
}
