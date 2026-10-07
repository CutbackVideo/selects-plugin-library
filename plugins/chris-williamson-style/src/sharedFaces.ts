// Shared inference only. The pipeline keeps its three-point median and style-specific framing.
export type CwFaceSample = {
  key: string; groupKey?: string; resourceId: string; seconds: number;
  sourceFps: number; sourceDurationSeconds: number;
  frameSize?: { width: number; height: number };
};
export type CwFaceEnvironment = {
  runScript(script: string, summary: string, allowCommit?: boolean): Promise<any>;
  readText(path: string): Promise<string>;
  writeText(path: string, text: string): Promise<void>;
};
type CwFaceInput = {
  runtimeId: "selects-ai-runtime"; task: "faces.detect"; projectId: string; resourceId: string;
  requestKey: string; sourceRange: { startSeconds: number; endSeconds: number };
  options: { sampleEverySeconds: number; scoreThreshold: 0.8; provider: "cpu" };
};
type CwFaceRecord = {
  samples: CwFaceSample[]; input: CwFaceInput; attempt: number;
  workflowId?: string; status?: string; cancelRequested?: boolean;
};
type CwFaceJournal = { version: 1; projectId: string; records: CwFaceRecord[] };
export type CwFaceObservation = { w: number; h: number; faces: number[][] };
const CW_FACE_STATUSES = ["queued", "running", "canceling", "succeeded", "failed", "canceled"];
const cwFaceTerminal = (status?: string) => ["succeeded", "failed", "canceled"].includes(status || "");
const cwFaceWrites = new Map<string, Promise<CwFaceJournal>>();
const cwFaceError = (code: string, message: string) => Object.assign(new Error(message), { code });
const cwFaceInvalid = () => cwFaceError("CW_FACE_CONTRACT_INVALID", "The saved face analysis or its result does not match this source. Make a new run.");
function cwFaceAttached(signal?: AbortSignal) {
  if (signal?.aborted) throw cwFaceError("CW_FACE_DETACHED", "Face observation stopped. Reopen the panel to recover the saved analysis.");
}
function cwValidateFaceSample(sample: CwFaceSample): void {
  if (!sample || typeof sample.key !== "string" || !sample.key || ["__proto__", "constructor", "prototype"].includes(sample.key) ||
      (sample.groupKey !== undefined && (typeof sample.groupKey !== "string" || !sample.groupKey)) ||
      !/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(sample.resourceId) ||
      !Number.isFinite(sample.seconds) || sample.seconds < 0 ||
      !Number.isFinite(sample.sourceFps) || sample.sourceFps <= 0 ||
      !Number.isFinite(sample.sourceDurationSeconds) || sample.seconds >= sample.sourceDurationSeconds ||
      (sample.frameSize !== undefined && (!sample.frameSize || !Number.isSafeInteger(sample.frameSize.width) || sample.frameSize.width <= 0 ||
        !Number.isSafeInteger(sample.frameSize.height) || sample.frameSize.height <= 0))) throw cwFaceInvalid();
}
function cwFaceInput(projectId: string, samples: CwFaceSample[]): CwFaceInput {
  if (!projectId || !Array.isArray(samples) || ![1, 3].includes(samples.length)) throw cwFaceInvalid();
  samples.forEach(cwValidateFaceSample);
  const first = samples[0], last = samples[samples.length - 1];
  const step = samples.length === 3 ? samples[1].seconds - first.seconds : 0;
  if (samples.some(s => s.resourceId !== first.resourceId || s.sourceFps !== first.sourceFps ||
      s.sourceDurationSeconds !== first.sourceDurationSeconds || JSON.stringify(s.frameSize) !== JSON.stringify(first.frameSize)) ||
      (samples.length === 3 && (step < 2 / first.sourceFps || Math.abs(last.seconds - samples[1].seconds - step) > 1e-8))) throw cwFaceInvalid();
  const endSeconds = Math.min(first.sourceDurationSeconds, last.seconds + (samples.length === 3 ? 1.5 : 2) / first.sourceFps);
  if (!Number.isFinite(endSeconds) || endSeconds <= last.seconds) throw cwFaceInvalid();
  return { runtimeId: "selects-ai-runtime", task: "faces.detect", projectId, resourceId: first.resourceId, requestKey: "",
    sourceRange: { startSeconds: first.seconds, endSeconds },
    options: { sampleEverySeconds: step || endSeconds - first.seconds + 1 / first.sourceFps, scoreThreshold: 0.8, provider: "cpu" } };
}
function cwFaceGroups(projectId: string, samples: CwFaceSample[]): CwFaceSample[][] {
  if (samples.length > 3000 || new Set(samples.map(s => s.key)).size !== samples.length) throw cwFaceInvalid();
  samples.forEach(cwValidateFaceSample);
  const groups = new Map<string, CwFaceSample[]>();
  for (const sample of samples) {
    const key = sample.groupKey || sample.key;
    groups.set(key, [...(groups.get(key) || []), sample]);
  }
  return [...groups.values()].flatMap(group => {
    if (group.length === 3) {
      try { cwFaceInput(projectId, group); return [group]; } catch { /* Very short/nonuniform clips use separate observations. */ }
    }
    return group.map(sample => [sample]);
  });
}
async function cwFaceRequestKey(path: string, projectId: string, samples: CwFaceSample[], attempt: number): Promise<string> {
  const identity = JSON.stringify({ path, projectId, samples, attempt, input: cwFaceInput(projectId, samples) });
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(identity));
  return "cw-faces-" + Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, "0")).join("");
}
async function cwReadFaceJournal(env: CwFaceEnvironment, path: string, projectId: string): Promise<CwFaceJournal> {
  let text: string;
  try { text = await env.readText(path); }
  catch (error: any) {
    if (/ENOENT|not found|does not exist/i.test(String(error?.message || error))) return { version: 1, projectId, records: [] };
    throw error;
  }
  let journal: CwFaceJournal;
  try { journal = JSON.parse(text); } catch { throw cwFaceInvalid(); }
  if (journal?.version !== 1 || journal.projectId !== projectId || !Array.isArray(journal.records) || journal.records.length > 6000) throw cwFaceInvalid();
  const keys = new Set<string>();
  for (const record of journal.records) {
    if (!record || !Number.isSafeInteger(record.attempt) || record.attempt < 0 || record.attempt > 255 ||
        !/^cw-faces-[\da-f]{64}$/.test(record.input?.requestKey) || keys.has(record.input.requestKey) ||
        (record.workflowId !== undefined && (typeof record.workflowId !== "string" || !record.workflowId)) ||
        (record.status !== undefined && !CW_FACE_STATUSES.includes(record.status)) ||
        (record.cancelRequested !== undefined && typeof record.cancelRequested !== "boolean")) throw cwFaceInvalid();
    const expected = cwFaceInput(projectId, record.samples);
    if (JSON.stringify({ ...record.input, requestKey: "" }) !== JSON.stringify(expected)) throw cwFaceInvalid();
    keys.add(record.input.requestKey);
  }
  return journal;
}
// Serialize the panel's observer/cancel writes; reread before each write so cancel intent cannot be overwritten.
async function cwWriteFaceJournal(env: CwFaceEnvironment, path: string, projectId: string, update: (j: CwFaceJournal) => void): Promise<CwFaceJournal> {
  const previous = cwFaceWrites.get(path) || Promise.resolve();
  const write = previous.catch(() => {}).then(async () => {
    const journal = await cwReadFaceJournal(env, path, projectId);
    update(journal);
    await env.writeText(path, JSON.stringify(journal));
    return journal;
  });
  cwFaceWrites.set(path, write);
  try { return await write; } finally { if (cwFaceWrites.get(path) === write) cwFaceWrites.delete(path); }
}
async function cwSaveFaceRecord(env: CwFaceEnvironment, path: string, record: CwFaceRecord): Promise<void> {
  const journal = await cwWriteFaceJournal(env, path, record.input.projectId, j => {
    const index = j.records.findIndex(r => r.input.requestKey === record.input.requestKey), old = j.records[index];
    if (old?.workflowId && record.workflowId && old.workflowId !== record.workflowId) throw cwFaceInvalid();
    const saved = { ...old, ...record, cancelRequested: old?.cancelRequested || record.cancelRequested || false };
    if (old?.workflowId && !saved.workflowId) saved.workflowId = old.workflowId;
    if (old && cwFaceTerminal(old.status)) saved.status = old.status;
    if (index < 0) j.records.push(saved); else j.records[index] = saved;
  });
  Object.assign(record, journal.records.find(r => r.input.requestKey === record.input.requestKey));
}
async function cwFaceCall(env: CwFaceEnvironment, script: string, summary: string, effect = false): Promise<any> {
  try { return await env.runScript(script, summary, effect); }
  catch (error: any) {
    if (error?.code === "CW_AI_UNAVAILABLE" || /\b(?:AI_UNAVAILABLE|AI_UPDATE_REQUIRED|CW_AI_UNAVAILABLE)\b/.test(String(error?.message || error)))
      throw cwFaceError("CW_AI_UNAVAILABLE", "Update Selects to use shared face analysis.");
    if (error?.code === "CW_FACE_CONTRACT_INVALID" || /\bCW_FACE_CONTRACT_INVALID\b/.test(String(error?.message || error))) throw cwFaceInvalid();
    throw error;
  }
}
function cwFaceSubmitScript(input: CwFaceInput): string {
  return `if (typeof selects.ai?.submit !== "function") throw new Error("CW_AI_UNAVAILABLE");
const job = await selects.ai.submit(${JSON.stringify(input)}); return { workflowId: job.workflowId };`;
}
function cwFaceJobScript(record: CwFaceRecord, method: "status" | "cancel"): string {
  return `return await selects.ai.job(${JSON.stringify(record.workflowId)}, ${JSON.stringify(record.input.projectId)}).${method}();`;
}
function cwCheckFaceStatus(value: any, record: CwFaceRecord): string {
  // status.resourceId is shortened by the SDK; the canonical input and job ownership remain Main's responsibility.
  if (value?.workflowId !== record.workflowId || value.projectId !== record.input.projectId || value.runtimeId !== record.input.runtimeId ||
      value.task !== "faces.detect" || !CW_FACE_STATUSES.includes(value.status)) throw cwFaceInvalid();
  return value.status;
}
async function cwFaceAck(env: CwFaceEnvironment, path: string, record: CwFaceRecord, signal?: AbortSignal): Promise<void> {
  if (record.workflowId) return;
  cwFaceAttached(signal);
  const ack = await cwFaceCall(env, cwFaceSubmitScript(record.input), "Measure speaker framing", true);
  cwFaceAttached(signal);
  if (typeof ack?.workflowId !== "string" || !ack.workflowId) throw cwFaceInvalid();
  record.workflowId = ack.workflowId;
  await cwSaveFaceRecord(env, path, record);
}
async function cwWaitFaceCancellation(env: CwFaceEnvironment, path: string, record: CwFaceRecord, signal?: AbortSignal): Promise<void> {
  const deadline = Date.now() + 60_000;
  while (!cwFaceTerminal(record.status)) {
    cwFaceAttached(signal);
    const current = await cwFaceCall(env, cwFaceJobScript(record, "status"), "Wait for face analysis to stop");
    cwFaceAttached(signal);
    record.status = cwCheckFaceStatus(current, record);
    await cwSaveFaceRecord(env, path, record);
    if (cwFaceTerminal(record.status)) return;
    if (Date.now() >= deadline) throw cwFaceError("CW_FACE_CANCEL_PENDING", "Face analysis is still stopping. Its cancellation is saved; reopen the panel to recover it.");
    await new Promise(resolve => setTimeout(resolve, 250));
  }
}
function cwFaceResultScript(record: CwFaceRecord): string {
  return `const r = await selects.ai.job(${JSON.stringify(record.workflowId)}, ${JSON.stringify(record.input.projectId)}).result();
if (r.task !== "faces.detect" || !r.files.detections) throw new Error("CW_FACE_CONTRACT_INVALID");
const raw = await selects.ai.readJSON(r.files.detections, ${JSON.stringify(record.input.projectId)});
const d = raw as {contractVersion?:number;task?:string;sourceKind?:string;coordinateSpace?:string;boxFormat?:string;frameSize?:{width:number;height:number};parameters?:unknown;samples?:Array<{index:number;sourceTimeSeconds:number;faces:Array<{box:unknown;score:number}>}>};
if (!Array.isArray(d.samples) || d.samples.length !== ${record.samples.length} || d.samples.some(s => !Array.isArray(s.faces) || s.faces.length > 64)) throw new Error("CW_FACE_CONTRACT_INVALID");
return { contractVersion:d.contractVersion,task:d.task,sourceKind:d.sourceKind,coordinateSpace:d.coordinateSpace,boxFormat:d.boxFormat,frameSize:d.frameSize,parameters:d.parameters,
 samples:d.samples.map(s => ({index:s.index,sourceTimeSeconds:s.sourceTimeSeconds,faces:s.faces.map(f => ({box:f.box,score:f.score}))})) };`;
}
export function cwAdaptFaceResult(value: any, input: CwFaceInput, samples: CwFaceSample[]): Record<string, CwFaceObservation> {
  const w = value?.frameSize?.width, h = value?.frameSize?.height, expected = samples[0].frameSize;
  if (value?.contractVersion !== 1 || value.task !== "faces.detect" || (value.sourceKind !== undefined && value.sourceKind !== "video") ||
      value.coordinateSpace !== "display-pixels" || value.boxFormat !== "xyxy" || !Number.isSafeInteger(w) || !Number.isSafeInteger(h) || w <= 0 || h <= 0 ||
      (expected && (expected.width !== w || expected.height !== h)) || !Array.isArray(value.samples) || value.samples.length !== samples.length ||
      value.parameters?.sourceRange?.startSeconds !== input.sourceRange.startSeconds || value.parameters?.sourceRange?.endSeconds !== input.sourceRange.endSeconds ||
      value.parameters?.scoreThreshold !== input.options.scoreThreshold || value.parameters?.sampleEverySeconds !== input.options.sampleEverySeconds) throw cwFaceInvalid();
  const out: Record<string, CwFaceObservation> = {};
  let previous = -Infinity, previousIndex = -1;
  for (let i = 0; i < samples.length; i++) {
    const row = value.samples[i], t = row?.sourceTimeSeconds;
    if (!Number.isSafeInteger(row?.index) || row.index <= previousIndex || !Number.isFinite(t) || t <= previous ||
        t < samples[i].seconds - 1e-6 || t >= input.sourceRange.endSeconds ||
        t >= samples[i].seconds + 2 / samples[i].sourceFps + 1e-6 || !Array.isArray(row.faces) || row.faces.length > 64) throw cwFaceInvalid();
    previous = t; previousIndex = row.index;
    const faces = row.faces.map((face: any) => {
      const b = face?.box;
      if (!b || ![b.xmin, b.ymin, b.xmax, b.ymax, face.score].every(Number.isFinite) || b.xmin < 0 || b.ymin < 0 ||
          b.xmax > w || b.ymax > h || b.xmax <= b.xmin || b.ymax <= b.ymin || face.score < input.options.scoreThreshold || face.score > 1) throw cwFaceInvalid();
      return [b.xmin / w, b.ymin / h, (b.xmax - b.xmin) / w, (b.ymax - b.ymin) / h];
    });
    faces.sort((a: number[], b: number[]) => b[2] * b[3] - a[2] * a[3]);
    out[samples[i].key] = { w, h, faces };
  }
  return out;
}
async function cwObserveFaceRecord(env: CwFaceEnvironment, path: string, record: CwFaceRecord,
  options: { signal?: AbortSignal; pollMs?: number; onProgress?: (message: string) => void }): Promise<Record<string, CwFaceObservation>> {
  await cwFaceAck(env, path, record, options.signal);
  while (true) {
    cwFaceAttached(options.signal);
    const latest = (await cwReadFaceJournal(env, path, record.input.projectId)).records.find(r => r.input.requestKey === record.input.requestKey);
    if (!latest) throw cwFaceInvalid();
    Object.assign(record, latest);
    const value = await cwFaceCall(env, cwFaceJobScript(record, record.cancelRequested && !cwFaceTerminal(record.status) ? "cancel" : "status"), "Read shared face analysis", !!record.cancelRequested);
    cwFaceAttached(options.signal);
    record.status = cwCheckFaceStatus(value, record);
    await cwSaveFaceRecord(env, path, record);
    if (record.cancelRequested || record.status === "canceled") throw cwFaceError("CW_FACE_CANCELED", "Face analysis was canceled. Start again to request a new analysis.");
    if (record.status === "failed") throw cwFaceError("CW_FACE_FAILED", "Face analysis failed. Start again to retry. " + String(value.lastErrorMessage || "").slice(0, 300));
    if (record.status === "succeeded") {
      const result = await cwFaceCall(env, cwFaceResultScript(record), "Read measured speaker faces");
      cwFaceAttached(options.signal);
      return cwAdaptFaceResult(result, record.input, record.samples);
    }
    options.onProgress?.("Measuring speaker framing" + (value.progress != null ? " · " + Math.round(value.progress * 100) + "%" : ""));
    await new Promise(resolve => setTimeout(resolve, options.pollMs ?? 500));
  }
}
export async function cwSharedFaces(env: CwFaceEnvironment, projectId: string, journalPath: string, samples: CwFaceSample[],
  options: { signal?: AbortSignal; retryTerminal?: boolean; pollMs?: number; onProgress?: (message: string) => void } = {}
): Promise<{ detected: Record<string, CwFaceObservation>; sampled: number; readable: number }> {
  if (!journalPath || typeof journalPath !== "string" || !projectId || typeof projectId !== "string") throw cwFaceInvalid();
  const detected: Record<string, CwFaceObservation> = {};
  for (const group of cwFaceGroups(projectId, samples)) {
    cwFaceAttached(options.signal);
    const journal = await cwReadFaceJournal(env, journalPath, projectId);
    let record = journal.records.filter(r => JSON.stringify(r.samples) === JSON.stringify(group)).sort((a, b) => b.attempt - a.attempt)[0];
    if (record && record.input.requestKey !== await cwFaceRequestKey(journalPath, projectId, group, record.attempt)) throw cwFaceInvalid();
    if (record && options.retryTerminal && record.cancelRequested && !cwFaceTerminal(record.status)) {
      // Intent can have been saved before cancel() reached Main. Replay it on
      // the same workflow (recovering a missing ACK with its original key).
      await cwFaceAck(env, journalPath, record, options.signal);
      const stopped = await cwFaceCall(env, cwFaceJobScript(record, "cancel"), "Resume cancellation of face analysis", true);
      cwFaceAttached(options.signal);
      record.status = cwCheckFaceStatus(stopped, record);
      await cwSaveFaceRecord(env, journalPath, record);
      await cwWaitFaceCancellation(env, journalPath, record, options.signal);
    }
    // A retry is only an explicit new attempt after a terminal failure/cancel, never an ACK-loss recovery.
    if (record && options.retryTerminal && (["failed", "canceled"].includes(record.status || "") || (record.cancelRequested && cwFaceTerminal(record.status)))) {
      record = { samples: group, attempt: record.attempt + 1, input: cwFaceInput(projectId, group) };
    } else if (!record) record = { samples: group, attempt: 0, input: cwFaceInput(projectId, group) };
    if (record.attempt > 255) throw cwFaceInvalid();
    const key = await cwFaceRequestKey(journalPath, projectId, group, record.attempt);
    if (record.input.requestKey && record.input.requestKey !== key) throw cwFaceInvalid();
    record.input.requestKey = key;
    cwFaceAttached(options.signal);
    await cwSaveFaceRecord(env, journalPath, record); // Stable input/key precede the first possible submission.
    Object.assign(detected, await cwObserveFaceRecord(env, journalPath, record, options));
  }
  return { detected, sampled: samples.length, readable: Object.keys(detected).length };
}
export async function cwCancelSharedFaces(env: CwFaceEnvironment, projectId: string, journalPath: string): Promise<{ canceled: number }> {
  if (!journalPath || typeof journalPath !== "string" || !projectId || typeof projectId !== "string") throw cwFaceInvalid();
  const journal = await cwWriteFaceJournal(env, journalPath, projectId, j => {
    for (const record of j.records) if (!cwFaceTerminal(record.status)) record.cancelRequested = true;
  });
  let canceled = 0;
  for (const record of journal.records.filter(r => r.cancelRequested && !cwFaceTerminal(r.status))) {
    if (record.input.requestKey !== await cwFaceRequestKey(journalPath, projectId, record.samples, record.attempt)) throw cwFaceInvalid();
    // Missing ACK has one safe recovery: replay the saved key, then cancel that same accepted job.
    await cwFaceAck(env, journalPath, record);
    const value = await cwFaceCall(env, cwFaceJobScript(record, "cancel"), "Cancel shared face analysis", true);
    record.status = cwCheckFaceStatus(value, record);
    await cwSaveFaceRecord(env, journalPath, record);
    await cwWaitFaceCancellation(env, journalPath, record);
    canceled++;
  }
  return { canceled };
}
