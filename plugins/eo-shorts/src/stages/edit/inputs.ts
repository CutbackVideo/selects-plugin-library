import { hashJson } from "../../host/util.ts";
import type { SourceSnapshot } from "../../host/preflight.ts";
import type { EditPolicy } from "./policy.ts";

export const PROGRESS_SCHEMA = "eo-edit-progress/2";

export type EditRules = { version: string; policy: EditPolicy };

export type ProgressHead = { schema?: string; sourceSha?: string; rules?: EditRules };

export function sourceContent(s: SourceSnapshot | null) {
  return (
    s && {
      draftId: s.draftId,
      fps: s.fps,
      mainEndFrame: s.mainEndFrame,
      mainClips: s.mainClips,
      words: s.words.map((w) => [w.text, w.startFrame, w.endFrame, w.sourceStartFrame, w.nonSpeech, w.filler]),
    }
  );
}

export const sourceSha = (s: SourceSnapshot | null): Promise<string> => hashJson(sourceContent(s));

export async function editInputSha(source: string, rules: EditRules): Promise<string> {
  return hashJson({ source, rules: await hashJson(rules) });
}

const pinnedRules = (p: ProgressHead | null): EditRules | null => (p?.schema === PROGRESS_SCHEMA && p.rules && p.sourceSha ? p.rules : null);

export function jobRules(progress: ProgressHead | null, draftId: string | null, current: EditRules): EditRules {
  return (draftId && pinnedRules(progress)) || current;
}

export function runPolicy(rules: EditRules, current: EditRules): EditPolicy {
  return { ...current.policy, ...rules.policy };
}

export function rulesDiff(pinned: EditRules, current: EditRules): string[] {
  const out: string[] = [];
  if (pinned.version !== current.version) out.push("version " + pinned.version + " (this build: " + current.version + ")");
  const now = current.policy as Record<string, unknown>;
  for (const [k, v] of Object.entries(pinned.policy)) {
    if (JSON.stringify(v) !== JSON.stringify(now[k])) out.push(k + " " + JSON.stringify(v) + " (this build: " + (k in now ? JSON.stringify(now[k]) : "none") + ")");
  }
  return out;
}

export const SOURCE_CHANGED =
  "The source draft changed after this job made its EO draft. Make a new short from the source; the EO draft of this job is left as it is.";
export const UNKNOWN_PROGRESS =
  "This job's edit record (edit/progress.json) was written by an earlier version of EO Shorts and cannot be continued. Make a new short from the source; the EO draft of this job is left as it is.";

export type ResumeDecision =
  | { kind: "fresh" }
  | { kind: "continue"; rules: EditRules; differs: string[] }
  | { kind: "refuse"; reason: "source" | "format"; message: string };

export function resumeDecision(progress: ProgressHead | null, input: { draftId: string | null; sourceSha: string; current: EditRules }): ResumeDecision {
  if (!input.draftId || !progress) return { kind: "fresh" };
  const rules = pinnedRules(progress);
  if (!rules) return { kind: "refuse", reason: "format", message: UNKNOWN_PROGRESS };
  if (progress.sourceSha !== input.sourceSha) return { kind: "refuse", reason: "source", message: SOURCE_CHANGED };
  return { kind: "continue", rules, differs: rulesDiff(rules, input.current) };
}
