import type { ConditionJudgment, ExecutionStatus, Prediction, Preference, Verdict } from "./types.ts";

export class SchemaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SchemaError";
  }
}

export interface JudgeCandidate {
  id: string;
  kind: "video" | "image";
  request: { text: string; conditions: { id: string; text: string }[]; minimumSeconds: number | null };
  durationSeconds: number | null;
  timestamps: number[];
  sheets: number;
}

export interface CandidateContext {
  id: string;
  conditionIds: string[];
  minimum: number | null;
  kind: "video" | "image";
  duration: number | null;
  sampled: number[];
}

const STATUS: Record<string, ConditionJudgment["status"]> = { m: "matched", x: "mismatched", "?": "uncertain" };
const PREFERENCE: Record<string, Preference> = { e: "excellent", u: "usable", w: "weak" };
const PREFERENCES = new Set<string>(["excellent", "usable", "weak"]);
const CONDITION_STATUSES = new Set<string>(["matched", "mismatched", "uncertain"]);

function check(ok: unknown, message: string): asserts ok {
  if (!ok) throw new SchemaError(message);
}

const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const isNumber = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isText = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;

function exactKeys(v: unknown, keys: string[], name: string, optional: string[] = []): Record<string, unknown> {
  check(isObject(v), name + " must be an object");
  const have = Object.keys(v);
  const ok = keys.every((k) => k in v) && have.every((k) => keys.includes(k) || optional.includes(k));
  check(ok, name + " must have exactly " + keys.join(","));
  return v;
}

export function candidateContext(c: JudgeCandidate): CandidateContext {
  check(isText(c?.id), "candidate id must be nonempty text");
  check(isText(c.request?.text), "request.text must be nonempty text");
  const conditions = c.request.conditions;
  check(Array.isArray(conditions) && conditions.length > 0, "request.conditions must be a nonempty list");
  const conditionIds = conditions.map((x) => {
    check(isText(x?.id), "condition_id must be nonempty text");
    check(isText(x?.text), "condition.text must be nonempty text");
    return x.id;
  });
  check(new Set(conditionIds).size === conditionIds.length, "Request condition IDs must be unique");
  const minimum = c.request.minimumSeconds;
  if (minimum != null) check(isNumber(minimum) && minimum > 0, "minimum_usable_seconds must be positive");
  check(c.kind === "video" || c.kind === "image", "media.kind must be image or video");
  check(Number.isInteger(c.sheets) && c.sheets >= 1, "evidence must have at least one attachment");
  const sampled = c.timestamps;
  check(Array.isArray(sampled), "evidence timestamps must be a list");
  let duration: number | null = null;
  if (c.kind === "video") {
    check(isNumber(c.durationSeconds), "media.duration_seconds must be a finite number");
    duration = c.durationSeconds;
    check(duration > 0 && duration <= 30, "Ready video duration must be within 30 seconds");
    check(sampled.length > 0, "Video evidence must contain sampled timestamps");
    for (const t of sampled) check(isNumber(t) && t >= 0 && t <= duration, "Sampled timestamp is outside the source");
    check(new Set(sampled).size === sampled.length, "Sampled timestamps must be unique");
    check(sampled.every((t, i) => i === 0 || sampled[i - 1] <= t), "Sampled timestamps must be chronological");
  } else {
    check(sampled.length === 0, "Still-image evidence has no timestamps");
  }
  return { id: c.id, conditionIds, minimum: minimum ?? null, kind: c.kind, duration, sampled };
}

export function deriveVerdict(statuses: string[]): Verdict {
  if (statuses.includes("mismatched")) return "unfit";
  return statuses.includes("uncertain") ? "unverified" : "fit";
}

function checkInterval(p: Prediction, ctx: CandidateContext): void {
  const iv = p.proposed_interval;
  if (p.status === "unfit" || ctx.kind === "image") {
    check(iv === null, "Unfit candidates and still images must have null proposed_interval");
    return;
  }
  if (iv === null) {
    check(p.status !== "fit", "Fit video requires a proposed_interval");
    return;
  }
  const o = exactKeys(iv, ["start_sec", "end_sec"], "proposed_interval");
  check(isNumber(o.start_sec), "proposed_interval.start_sec must be a finite number");
  check(isNumber(o.end_sec), "proposed_interval.end_sec must be a finite number");
  const start = o.start_sec as number;
  const end = o.end_sec as number;
  check(0 <= start && start < end && end <= (ctx.duration as number), "Proposed interval must be positive and within observed/source duration");
  if (ctx.minimum != null) {
    const length = end - start;
    check(length >= ctx.minimum || Math.abs(length - ctx.minimum) <= 1e-9, "Proposed interval is shorter than minimum_usable_seconds");
  }
}

export function validatePrediction(p: Prediction, ctx: CandidateContext): ExecutionStatus {
  try {
    check(p.candidate_id === ctx.id, "Prediction candidate_id does not match prepared candidate");
    check(Array.isArray(p.conditions), "prediction.conditions must be a list");
    const seen = new Set<string>();
    for (const c of p.conditions) {
      exactKeys(c, ["condition_id", "status", "reason", "evidence_timestamps_sec"], "prediction condition");
      check(ctx.conditionIds.includes(c.condition_id), "Unknown condition ID " + c.condition_id);
      check(!seen.has(c.condition_id), "Conflicting duplicate condition ID " + c.condition_id);
      seen.add(c.condition_id);
      check(CONDITION_STATUSES.has(c.status), "Invalid condition status");
      check(isText(c.reason), "Condition " + c.condition_id + " reason must be nonempty text");
      check(Array.isArray(c.evidence_timestamps_sec), "Condition evidence timestamps must be a list");
      for (const t of c.evidence_timestamps_sec) check(isNumber(t) && ctx.sampled.includes(t), "Evidence timestamp " + t + " was not sampled");
      check(new Set(c.evidence_timestamps_sec).size === c.evidence_timestamps_sec.length, "Condition evidence timestamps must be unique");
      if (ctx.kind === "video" && c.status !== "uncertain") check(c.evidence_timestamps_sec.length > 0, "Condition " + c.condition_id + " needs a sampled evidence timestamp");
    }
    check(seen.size === ctx.conditionIds.length, "Prediction must judge every request condition exactly once");
    const status = deriveVerdict(p.conditions.map((c) => c.status));
    check(p.status === status, "Condition judgments derive " + status + ", not the supplied status");
    if (status === "fit") check(typeof p.preference === "string" && PREFERENCES.has(p.preference), "Fit candidate requires excellent, usable, or weak preference");
    else check(p.preference === null, "Preference must be null for unfit or unverified");
    check(isText(p.reason), "Prediction reason must be nonempty text");
    check(p.evidence_scope === "sampled_prediction", "evidence_scope must be sampled_prediction");
    checkInterval(p, ctx);
  } catch (e) {
    if (e instanceof SchemaError) return { status: "error", code: "schema_error", reason: e.message };
    throw e;
  }
  return { status: "ok", code: "validated", reason: "Prediction matches the candidate contract." };
}

export function expandRecord(record: unknown, ctx: CandidateContext): Prediction {
  const r = exactKeys(record, ["id", "p", "c", "why", "iv"], "compact record", ["cx"]);
  check(isText(r.why), "why must be nonempty text");
  const summary = r.why as string;
  check(Array.isArray(r.c), "c must be a list");
  const conditions: ConditionJudgment[] = [];
  const seen = new Set<string>();
  for (const raw of r.c as unknown[]) {
    const c = exactKeys(raw, ["id", "s", "f"], "compact condition");
    check(isText(c.id), "condition id must be nonempty text");
    const id = c.id as string;
    check(ctx.conditionIds.includes(id) && !seen.has(id), "Unknown or duplicate condition id");
    seen.add(id);
    check(typeof c.s === "string" && c.s in STATUS, "Invalid compact condition status");
    check(Array.isArray(c.f), "f must be a list");
    const f = c.f as unknown[];
    for (const i of f) {
      check(typeof i === "number" && Number.isInteger(i), "Frame index must be an integer");
      check((i as number) >= 0 && (i as number) < ctx.sampled.length, "Frame index is outside sampled evidence");
    }
    check(new Set(f).size === f.length, "Duplicate frame evidence index");
    conditions.push({ condition_id: id, status: STATUS[c.s as string], reason: summary, evidence_timestamps_sec: (f as number[]).map((i) => ctx.sampled[i]) });
  }
  check(seen.size === ctx.conditionIds.length, "Missing condition decision");
  const status = deriveVerdict(conditions.map((c) => c.status));
  check(typeof r.p === "string" && r.p in PREFERENCE, "Invalid compact provisional preference");
  let interval: Prediction["proposed_interval"] = null;
  if (r.iv !== null) {
    check(Array.isArray(r.iv) && r.iv.length === 2, "iv must be null or [start,end]");
    interval = { start_sec: (r.iv as number[])[0], end_sec: (r.iv as number[])[1] };
  }
  const prediction: Prediction = {
    candidate_id: ctx.id,
    status,
    preference: status === "fit" ? PREFERENCE[r.p as string] : null,
    conditions,
    reason: summary,
    proposed_interval: interval,
    evidence_scope: "sampled_prediction",
  };
  const v = validatePrediction(prediction, ctx);
  check(v.status === "ok", v.reason);
  if (status === "fit" && ctx.kind === "video" && isNumber(r.cx) && r.cx >= 0 && r.cx <= 1) prediction.cx = r.cx;
  return prediction;
}

export type ExpandedRecord = { id: string; prediction: Prediction } | { id: string; error: string };

export function expandCompactRecords(raw: unknown, batch: JudgeCandidate[]): ExpandedRecord[] {
  check(Array.isArray(batch) && batch.length > 0, "batch must be a nonempty list");
  const contexts = batch.map(candidateContext);
  const ids = contexts.map((c) => c.id);
  check(new Set(ids).size === ids.length, "Batch candidate IDs must be unique");
  const envelope = exactKeys(raw, ["r"], "compact output");
  check(Array.isArray(envelope.r), "r must be a list");
  const records = envelope.r as unknown[];
  check(records.length === batch.length, "Compact output must include every candidate exactly once");
  const byId = new Map<string, unknown>();
  for (const rec of records) {
    check(isObject(rec), "Compact record must be an object");
    check(isText(rec.id), "candidate id must be nonempty text");
    check(ids.includes(rec.id as string) && !byId.has(rec.id as string), "Unknown or duplicate candidate id");
    byId.set(rec.id as string, rec);
  }
  check(byId.size === ids.length, "Missing candidate prediction");
  return contexts.map((ctx) => {
    try {
      return { id: ctx.id, prediction: expandRecord(byId.get(ctx.id), ctx) };
    } catch (e) {
      if (e instanceof SchemaError) return { id: ctx.id, error: e.message };
      throw e;
    }
  });
}

export function envelopeProblems(raw: unknown, batch: JudgeCandidate[]): string[] {
  try {
    expandCompactRecords(raw, batch);
    return [];
  } catch (e) {
    if (e instanceof SchemaError) return [e.message];
    throw e;
  }
}

const PREFERENCE_ORDER: Record<Preference, number> = { excellent: 0, usable: 1, weak: 2 };

export interface ShortlistItem {
  candidateId: string;
  preference: Preference;
  interval: Prediction["proposed_interval"];
  reason: string;
}

export interface Shortlist {
  status: "found" | "weak_only" | "unverified" | "no_match_in_candidates";
  recommended: ShortlistItem[];
  weakAlternatives: ShortlistItem[];
  unresolved: { candidateId: string; code: string }[];
  rejectedCount: number;
  checkedCount: number;
}

export function selectCandidates(records: { candidateId: string; execution: ExecutionStatus; prediction: Prediction | null }[], limit = 3): Shortlist {
  if (!Number.isInteger(limit) || limit < 1) throw new RangeError("Shortlist limit must be a positive integer");
  const accepted: ShortlistItem[] = [];
  const weak: ShortlistItem[] = [];
  const unresolved: Shortlist["unresolved"] = [];
  let rejected = 0;
  for (const row of records) {
    const p = row.prediction;
    if (row.execution.status !== "ok" || !p) {
      unresolved.push({ candidateId: row.candidateId, code: row.execution.code });
      continue;
    }
    if (p.status === "unfit") rejected += 1;
    else if (p.status === "unverified") unresolved.push({ candidateId: row.candidateId, code: "insufficient_visual_evidence" });
    else {
      const item = { candidateId: row.candidateId, preference: p.preference as Preference, interval: p.proposed_interval, reason: p.reason };
      (item.preference === "weak" ? weak : accepted).push(item);
    }
  }
  const ranked = accepted.map((x, i) => [x, i] as const).sort((a, b) => PREFERENCE_ORDER[a[0].preference] - PREFERENCE_ORDER[b[0].preference] || a[1] - b[1]).map((x) => x[0]);
  const status: Shortlist["status"] = ranked.length ? "found" : weak.length ? "weak_only" : unresolved.length || !records.length ? "unverified" : "no_match_in_candidates";
  return { status, recommended: ranked.slice(0, limit), weakAlternatives: weak.slice(0, limit), unresolved, rejectedCount: rejected, checkedCount: records.length };
}
