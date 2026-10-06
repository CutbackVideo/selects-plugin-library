import type { JsonSchema, ModelCall, ModelResult } from "../../models/types.ts";
import { ModelCallFailed, ModelError } from "../../models/errors.ts";
import { EDIT_POLICY, KEEP_ROLE } from "./policy.ts";
import { contentEnds, type Clause } from "./clauses.ts";

export const DROP_REASONS = ["repeat", "restatement", "false-start", "tangent", "filler"] as const;
export type DropReason = (typeof DROP_REASONS)[number];

export type KeepAnswer = { keep: string[]; drop: { id: string; reason: DropReason; note?: string }[] };

export const KEEP_SCHEMA: JsonSchema = {
  type: "object",
  required: ["keep", "drop"],
  properties: {
    keep: { type: "array", items: { type: "string" } },
    drop: {
      type: "array",
      items: {
        type: "object",
        required: ["id", "reason"],
        properties: { id: { type: "string" }, reason: { enum: [...DROP_REASONS] }, note: { type: "string" } },
      },
    },
  },
};

export const KEEP_SYSTEM = "Pure text task. Return only JSON.";

export function maxDropWords(clauses: Clause[], share: number = EDIT_POLICY.maxDropShare): number {
  const total = clauses.reduce((n, c) => n + c.words, 0);
  return Math.floor(total * share);
}

export function buildKeepPrompt(clauses: Clause[], share: number = EDIT_POLICY.maxDropShare): string {
  const total = clauses.reduce((n, c) => n + c.words, 0);
  const cap = maxDropWords(clauses, share);
  const pct = Math.round(share * 100);
  const lines = clauses.map((c) => c.id + " (" + c.words + ") " + c.text);
  return [
    "You are tightening the transcript of a short talking-head clip (one speaker) for a vertical short. The clip is already chosen. Mark only the clauses an experienced short-form editor would cut because they add nothing.",
    "",
    "Cut a clause only when it is one of:",
    "- repeat: says again what an earlier clause already said, in the same or nearly the same words",
    "- restatement: explains a point already made again without adding a new fact, example or step",
    "- false-start: an abandoned or restarted phrase (the speaker starts, stops and says it again)",
    "- tangent: an aside that leaves the argument and that nothing later depends on",
    "- filler: a clause that is only verbal filler with no content",
    "",
    "Always keep:",
    "- the hook: the first clause with content",
    "- the structure of the argument: claims, reasons, examples and the steps between them",
    "- every condition, contrast and negation (if, but, unless, not, never) together with what it qualifies",
    "- the conclusion: the last clause with content",
    "- anything a kept clause later refers back to",
    "",
    "Rules:",
    "- Choose whole clauses by id. Never rewrite words.",
    "- The clauses you cut may hold at most " + cap + " of the " + total + " spoken words (" + pct + "%). Cutting nothing is a good answer for a clip that is already tight.",
    "- The kept clauses, in order, must still read as fluent speech.",
    "- When unsure, keep.",
    "",
    'Return only JSON in exactly this shape: {"keep":["c01","c02"],"drop":[{"id":"c03","reason":"restatement"}]}',
    "Every clause id appears exactly once, in keep or in drop. reason is one of: " + DROP_REASONS.join(", ") + ".",
    "",
    "Clauses (id, spoken word count, text):",
    ...lines,
  ].join("\n");
}

export function keepProblems(value: unknown, clauses: Clause[], share: number = EDIT_POLICY.maxDropShare): string[] {
  const v = value as Partial<KeepAnswer> | null;
  const problems: string[] = [];
  if (!v || !Array.isArray(v.keep) || !Array.isArray(v.drop)) return ["the answer needs a keep list and a drop list"];
  const known = new Map(clauses.map((c) => [c.id, c]));
  const seen = new Map<string, number>();
  const ids = [...v.keep.map(String), ...v.drop.map((d) => String((d as { id?: unknown })?.id))];
  for (const id of ids) seen.set(id, (seen.get(id) ?? 0) + 1);
  const unknown = [...seen.keys()].filter((id) => !known.has(id));
  if (unknown.length) problems.push("unknown clause ids " + unknown.slice(0, 8).join(", "));
  const twice = [...seen.entries()].filter(([id, n]) => n > 1 && known.has(id)).map(([id]) => id);
  if (twice.length) problems.push("clause ids listed more than once: " + twice.slice(0, 8).join(", "));
  const missing = clauses.filter((c) => !seen.has(c.id)).map((c) => c.id);
  if (missing.length) problems.push("clause ids missing from both lists: " + missing.slice(0, 8).join(", "));
  for (const d of v.drop) {
    const reason = (d as { reason?: unknown })?.reason;
    if (!DROP_REASONS.includes(reason as DropReason)) problems.push("drop " + String((d as { id?: unknown })?.id) + " has reason " + JSON.stringify(reason));
  }
  const dropped = v.drop.map((d) => known.get(String((d as { id?: unknown })?.id))).filter((c): c is Clause => !!c);
  const droppedWords = dropped.reduce((n, c) => n + c.words, 0);
  const cap = maxDropWords(clauses, share);
  if (droppedWords > cap) problems.push("the dropped clauses hold " + droppedWords + " spoken words; at most " + cap + " may go");
  const ends = contentEnds(clauses);
  if (ends.first && dropped.some((c) => c.id === ends.first)) problems.push(ends.first + " is the hook (first clause with content) and must be kept");
  if (ends.last && ends.last !== ends.first && dropped.some((c) => c.id === ends.last)) problems.push(ends.last + " is the conclusion (last clause with content) and must be kept");
  return problems;
}

export type KeepDecision = {
  drop: { id: string; reason: DropReason; note?: string }[];
  accepted: boolean;
  skipped: string | null;
  prompt: string | null;
  result: Pick<ModelResult, "provider" | "model" | "effort" | "latencyMs" | "cacheHit" | "reasked" | "attempt" | "text" | "fallbackFrom" | "servedModel"> | null;
  error: { kind: string; message: string } | null;
};

export type CallModelFn = (c: ModelCall) => Promise<ModelResult>;

export async function decideKeep(
  callModel: CallModelFn,
  input: { jobId: string; clauses: Clause[]; signal?: AbortSignal; share?: number },
): Promise<KeepDecision> {
  const { clauses } = input;
  const share = input.share ?? EDIT_POLICY.maxDropShare;
  const ends = contentEnds(clauses);
  const droppable = clauses.filter((c) => c.words > 0 && c.id !== ends.first && c.id !== ends.last);
  if (!droppable.length || maxDropWords(clauses, share) < Math.min(...droppable.map((c) => c.words))) {
    return { drop: [], accepted: false, skipped: "nothing could be cut: only the hook and the conclusion, or every clause is over the 30% cap", prompt: null, result: null, error: null };
  }
  const prompt = buildKeepPrompt(clauses, share);
  try {
    const r = await callModel({
      role: KEEP_ROLE,
      jobId: input.jobId,
      system: KEEP_SYSTEM,
      prompt,
      json: true,
      schema: KEEP_SCHEMA,
      schemaName: "eo_edit_keep",
      validate: (value) => keepProblems(value, clauses, share),
      signal: input.signal,
    });
    const answer = r.json as KeepAnswer;
    const drop = answer.drop.map((d) => ({ id: d.id, reason: d.reason, ...(d.note ? { note: String(d.note).slice(0, 200) } : {}) }));
    const result = {
      provider: r.provider,
      model: r.model,
      effort: r.effort,
      latencyMs: r.latencyMs,
      cacheHit: r.cacheHit,
      reasked: r.reasked,
      attempt: r.attempt,
      text: r.text,
      fallbackFrom: r.fallbackFrom,
      servedModel: r.servedModel,
    };
    return { drop, accepted: true, skipped: null, prompt, result, error: null };
  } catch (e) {
    if (e instanceof ModelError && (e.kind === "aborted" || e.kind === "config")) throw e;
    if (input.signal?.aborted) throw e;
    const kind = e instanceof ModelCallFailed ? e.kind : e instanceof ModelError ? e.kind : "failed";
    const message = String((e as Error)?.message ?? e).slice(0, 600);
    if (e instanceof ModelCallFailed && e.failures.some((f) => f.kind === "config")) throw e;
    return { drop: [], accepted: false, skipped: "the keep list could not be used (" + kind + ")", prompt, result: null, error: { kind, message } };
  }
}
