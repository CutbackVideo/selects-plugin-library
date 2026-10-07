import type { HostFs } from "../host/types.ts";
import { readBytes, readJsonIfExists, statFile, writeJsonAtomic } from "../host/fs.ts";
import type { StageState } from "./store.ts";
import { hashJson, sha256Hex } from "../host/util.ts";

export const RECEIPT_SCHEMA = "eo-receipt/1";
export const HASH_LIMIT_BYTES = 8 * 1024 * 1024;

export type OutputFile = { path: string; bytes: number; sha256?: string; mtimeMs?: number };

export type Receipt = {
  schema: typeof RECEIPT_SCHEMA;
  jobId: string;
  stage: string;
  inputSha: string;
  outputSha: string;
  outputs: OutputFile[];
  calls: string[];
  startedAt: number;
  finishedAt: number;
  durationMs: number;
  warnings: string[];
  fallbacks: string[];
  note?: string | null;
  data?: unknown;
};

export function receiptRel(stage: string): string {
  return "receipts/" + stage + ".json";
}

export function receiptPath(fs: HostFs, jobDir: string, stage: string): string {
  return fs.join(jobDir, "receipts", stage + ".json");
}

export async function describeOutputs(fs: HostFs, jobDir: string, relPaths: string[]): Promise<OutputFile[]> {
  const out: OutputFile[] = [];
  for (const rel of relPaths) {
    const abs = fs.join(jobDir, ...rel.split("/"));
    const st = (await statFile(fs, abs));
    if (!st) throw new Error("The stage reported an output that does not exist: " + rel);
    if (st.size <= HASH_LIMIT_BYTES) out.push({ path: rel, bytes: st.size, sha256: await sha256Hex(await readBytes(fs, abs)) });
    else out.push({ path: rel, bytes: st.size, mtimeMs: st.mtimeMs });
  }
  return out;
}

export async function writeReceipt(fs: HostFs, jobDir: string, r: Omit<Receipt, "schema" | "outputSha"> & { outputSha?: string }): Promise<Receipt> {
  const receipt: Receipt = { schema: RECEIPT_SCHEMA, ...r, outputSha: r.outputSha ?? (await hashJson(r.outputs)) };
  await writeJsonAtomic(fs, receiptPath(fs, jobDir, r.stage), receipt);
  return receipt;
}

export async function readReceipt(fs: HostFs, jobDir: string, stage: string): Promise<Receipt | null> {
  const r = await readJsonIfExists<Receipt | null>(fs, receiptPath(fs, jobDir, stage), null);
  return r && r.schema === RECEIPT_SCHEMA ? r : null;
}

export async function inputShaFrom(fs: HostFs, jobDir: string, upstream: string[], extra: unknown = null): Promise<string> {
  const parts: Record<string, string | null> = {};
  for (const s of upstream) parts[s] = (await readReceipt(fs, jobDir, s))?.outputSha ?? null;
  return hashJson({ upstream: parts, extra });
}

export async function interruptedReceipt(fs: HostFs, jobDir: string, state: StageState | null | undefined, stage: string, inputSha: string): Promise<Receipt | null> {
  if (!state || state.status !== "running" || state.startedAt == null) return null;
  const r = await readReceipt(fs, jobDir, stage);
  if (!r || r.inputSha !== inputSha || r.startedAt !== state.startedAt || !Array.isArray(r.outputs)) return null;
  let now: OutputFile[];
  try {
    now = await describeOutputs(fs, jobDir, r.outputs.map((o) => o.path));
  } catch {
    return null;
  }
  return (await hashJson(now)) === r.outputSha ? r : null;
}
