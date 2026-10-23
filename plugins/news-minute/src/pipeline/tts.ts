// Narration job record and its recovery rules.
//
// selects.narration.generate() starts a paid job and returns a workflowId. The record is saved BEFORE the call
// (state "submitting") and the id is added right after. A record still "submitting" without an id means the
// answer was lost: the panel never regenerates on its own and never guesses a job from the project's list;
// only the user's explicit "new narration" action starts another one. A known admission failure
// (insufficient_credits) is saved as "failed" so reopening does not report a lost result.

export type TtsState = "submitting" | "submitted" | "imported" | "failed" | "lost";
export type TtsRecord = {
  revision: string; // hash of the approved script and voice
  projectId: string;
  voiceId: string;
  text: string;
  state: TtsState;
  workflowId?: string;
  resourceId?: string;
  durationSeconds?: number;
  error?: string;
  at: number;
};

export const ttsKey = (projectId: string) => `tts:${projectId}`;

// Stable revision of what was narrated: the text and voice. Any change to either needs a new narration.
export function ttsRevision(text: string, voiceId: string): string {
  let h1 = 0x811c9dc5, h2 = 0x01000193;
  const s = voiceId + "\u0000" + text;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 16777619) >>> 0;
    h2 = Math.imul(h2 ^ c, 2246822519) >>> 0;
  }
  return h1.toString(16).padStart(8, "0") + h2.toString(16).padStart(8, "0");
}

// What the panel should do with a saved record for the current approved script.
export type TtsNext =
  | { kind: "none" } // nothing saved for this script: offer "Generate narration"
  | { kind: "stale" } // saved for another script or voice: offer "Generate narration" again
  | { kind: "poll"; workflowId: string } // submitted: read job status/result
  | { kind: "ready"; resourceId: string; durationSeconds: number }
  | { kind: "lost" } // submitted without a saved id: explain, offer an explicit new narration only
  | { kind: "failed"; error: string };

export function ttsNext(rec: TtsRecord | null, revision: string): TtsNext {
  if (!rec) return { kind: "none" };
  if (rec.revision !== revision) {
    // An unresolved job for an older script still blocks: its result is unknown and may be charged.
    if (rec.state === "submitting" && !rec.workflowId) return { kind: "lost" };
    return { kind: "stale" };
  }
  if (rec.state === "imported" && rec.resourceId) return { kind: "ready", resourceId: rec.resourceId, durationSeconds: rec.durationSeconds ?? 0 };
  if (rec.state === "failed") return { kind: "failed", error: rec.error || "failed" };
  if (rec.workflowId) return { kind: "poll", workflowId: rec.workflowId };
  return { kind: "lost" };
}

// Job status from selects.narration.job(id).status() folded into the record.
export function applyStatus(rec: TtsRecord, status: { status?: string; step?: string; lastErrorMessage?: string | null }, result: { resourceId: string; durationSeconds: number } | null): TtsRecord {
  if (result && result.resourceId) return { ...rec, state: "imported", resourceId: result.resourceId, durationSeconds: result.durationSeconds, error: undefined, at: Date.now() };
  const s = String(status?.status ?? "");
  if (s === "failed" || s === "canceled") return { ...rec, state: "failed", error: String(status?.lastErrorMessage || s), at: Date.now() };
  return { ...rec, state: "submitted", at: Date.now() };
}

// "import_failed" can be resumed from the saved audio (no new paid request); anything else that failed is final.
export const canResumeImport = (status: { step?: string; lastErrorMessage?: string | null }) =>
  status?.step === "import_failed" || status?.lastErrorMessage === "narration_import_failed";

// Credits shown before the user starts narration: ElevenLabs v4 public rate at 180 credits/USD, as estimated by
// the host (narration/estimate). Measured 2026-10-23: 256 characters -> 3.6864 estimated, 4.05504 held.
export const CREDITS_PER_CHAR = 3.6864 / 256;
export const HOLD_FACTOR = 1.1;
export function creditQuote(chars: number): { estimated: number; held: number } {
  const estimated = chars * CREDITS_PER_CHAR;
  return { estimated: Math.round(estimated * 100) / 100, held: Math.round(estimated * HOLD_FACTOR * 100) / 100 };
}
