import type { HostFs } from "../../host/types.ts";
import { readJsonIfExists, readText } from "../../host/fs.ts";
import type { CreditEntry } from "../../broll/credits.ts";
import type { SoundCredit, SoundReport } from "../sound/soundReport.ts";
import type { ExportReceipt } from "../export/stage.ts";
import type { ComposedScene } from "../export/precheck.ts";
import type { CoverageReport } from "../compose/coverage.ts";
import type { MediaScene, MediaShot } from "./credits.ts";
import type { PlanGate } from "./gates.ts";

export type EditReport = {
  fps?: number;
  speakerRate?: { wpm: number; articulationWpm?: number; targetWpm: number };
  voice?: { path?: string; integrated?: number; seconds?: number };
  removed?: { audioPasses?: unknown[]; clauses?: unknown[]; fillers?: unknown[] };
  keep?: unknown;
};

export type ComposeRecord = {
  guard?: { projectId: string; draftId: string; fps: number; frameSize: { width: number; height: number }; mainEnd: number; wordsSig: string | null };
  scenes?: (ComposedScene & { warnings?: string[]; compileMs?: number })[];
  bakes?: { path: string; start: number; end: number; sceneId?: string }[];
  coverage?: CoverageReport;
  warnings?: string[];
  ms?: Record<string, number>;
};

export type MediaRecord = { scenes?: (MediaScene & { start?: number; end?: number; plan?: string; kind?: string; fallbacks?: string[] })[]; shots?: MediaShot[]; fallbacks?: string[] };

export type SourceRecord = { fps: number; mainEndFrame: number; words: { text: string; startFrame: number; endFrame: number; nonSpeech?: boolean; filler?: unknown }[] };

export type JobFiles = {
  source: SourceRecord | null;
  preflight: Record<string, unknown> | null;
  edit: EditReport | null;
  editWords: { fps?: number; mainEnd?: number } | null;
  plan: { gate?: PlanGate; scenes?: { id: string }[] } | null;
  planScenes: Record<string, { id: string; start: number; end: number }> | null;
  media: MediaRecord | null;
  mediaCredits: CreditEntry[];
  compose: ComposeRecord | null;
  sound: { report?: SoundReport } | null;
  soundCredits: SoundCredit[];
  exportReceipt: ExportReceipt | null;
  calls: Record<string, unknown>[];
};

export async function readJobFiles(fs: HostFs, path: (rel: string) => string): Promise<JobFiles> {
  const j = <T>(rel: string) => readJsonIfExists<T | null>(fs, path(rel), null).catch(() => null);
  const calls: Record<string, unknown>[] = [];
  if ((await fs.exists(path("calls.jsonl")))) {
    for (const line of (await readText(fs, path("calls.jsonl"))).split(/\r?\n/)) {
      if (!line.trim()) continue;
      try {
        calls.push(JSON.parse(line));
      } catch {
      }
    }
  }
  return {
    source: await j<SourceRecord>("source/source.json"),
    preflight: await j<Record<string, unknown>>("source/preflight.json"),
    edit: await j<EditReport>("edit/edit.json"),
    editWords: await j<{ fps?: number; mainEnd?: number }>("edit/words.json"),
    plan: await j<{ gate?: PlanGate }>("plan/plan.json"),
    planScenes: await j<Record<string, { id: string; start: number; end: number }>>("plan/scenes.json"),
    media: await j<MediaRecord>("media/media.json"),
    mediaCredits: (await j<{ entries?: CreditEntry[] }>("media/credits.json"))?.entries ?? [],
    compose: await j<ComposeRecord>("compose/compose.json"),
    sound: await j<{ report?: SoundReport }>("sound/sound.json"),
    soundCredits: (await j<{ credits?: SoundCredit[] }>("sound/credits.json"))?.credits ?? [],
    exportReceipt: await j<ExportReceipt>("export/receipt.json"),
    calls,
  };
}

export function callsSummary(calls: Record<string, unknown>[]) {
  const byRole = new Map<string, { calls: number; ok: number; cacheHits: number; latencyMs: number; inputTokens: number; outputTokens: number; answeredBy: Set<string> }>();
  for (const c of calls) {
    const role = String(c.role ?? "?");
    const r = byRole.get(role) ?? { calls: 0, ok: 0, cacheHits: 0, latencyMs: 0, inputTokens: 0, outputTokens: 0, answeredBy: new Set<string>() };
    r.calls += 1;
    if (c.status === "ok" || c.status === "cache") r.ok += 1;
    if (c.cacheHit) r.cacheHits += 1;
    r.latencyMs += Number(c.latencyMs ?? 0) || 0;
    r.inputTokens += Number(c.inputTokens ?? 0) || 0;
    r.outputTokens += Number(c.outputTokens ?? 0) || 0;
    if (c.status === "ok" || c.status === "cache") r.answeredBy.add(String(c.provider) + " " + String(c.servedModel ?? c.model));
    byRole.set(role, r);
  }
  return {
    roles: Object.fromEntries([...byRole].map(([k, v]) => [k, { ...v, answeredBy: [...v.answeredBy] }])),
  };
}

export function stageTimes(stages: Record<string, { startedAt?: number | null; finishedAt?: number | null; status?: string; runs?: number } | undefined>) {
  return Object.fromEntries(Object.entries(stages).map(([k, s]) => [k, { status: s?.status ?? "pending", runs: s?.runs ?? 0, seconds: s?.startedAt && s.finishedAt ? Math.round((s.finishedAt - s.startedAt) / 100) / 10 : null }]));
}
