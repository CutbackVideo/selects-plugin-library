// Thin wrappers over the panel SDK: run_script, askAI, storage, and the bundled FFmpeg.

import type { ScriptCall } from "./scripts.ts";
import { ffmpegScript, mediaJobScript, readChunksScript } from "./scripts.ts";

export type PanelSdk = {
  runScript(input: { summary: string; script: string; allowCommit?: boolean }): Promise<{ isError?: boolean; output?: string; result?: any }>;
  askAI?(input: { prompt: string; timeoutMs?: number }): Promise<{ text: string }>;
  storage?: { getItem(k: string): Promise<string | null>; setItem(k: string, v: string): Promise<void>; removeItem(k: string): Promise<void> };
  updates?: unknown;
};

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function run<T = any>(sdk: PanelSdk, call: ScriptCall): Promise<T> {
  const r = await sdk.runScript({ summary: call.summary, script: call.script, allowCommit: !!call.allowCommit });
  if (r.isError) throw new Error(String(r.output || "script failed"));
  return r.result as T;
}

// A panel AI turn is capped at five minutes; a timed-out turn is tried once more.
export async function ask(sdk: PanelSdk, prompt: string): Promise<string> {
  if (typeof sdk.askAI !== "function") throw new Error("askAI unavailable");
  for (let attempt = 0; ; attempt++) {
    try {
      const r = await sdk.askAI({ prompt, timeoutMs: 300000 });
      return String(r?.text ?? "");
    } catch (err: any) {
      if (attempt === 0 && /did not finish|timed? ?out/i.test(String(err?.message || err))) continue;
      throw err;
    }
  }
}

export async function load<T>(sdk: PanelSdk, key: string): Promise<T | null> {
  if (!sdk.storage) throw new Error("storage unavailable");
  const raw = await sdk.storage.getItem(key);
  return raw === null ? null : (JSON.parse(raw) as T);
}
export async function save(sdk: PanelSdk, key: string, value: unknown): Promise<void> {
  if (!sdk.storage) throw new Error("storage unavailable");
  await sdk.storage.setItem(key, JSON.stringify(value));
}

// Run the bundled FFmpeg and wait for it (2 minutes at most).
export async function ffmpeg(sdk: PanelSdk, summary: string, args: string[]): Promise<void> {
  const { jobId } = await run<{ jobId: string }>(sdk, ffmpegScript(summary, args));
  let cursor = 0, log = "";
  for (let i = 0; i < 480; i++) {
    const s = await run<{ state: string; events: Array<{ cursor: number; text: string }> }>(sdk, mediaJobScript(jobId, cursor));
    for (const e of s.events) { cursor = Math.max(cursor, e.cursor); log = (log + e.text).slice(-800); }
    if (s.state === "succeeded") return;
    if (s.state === "failed" || s.state === "cancelled") throw new Error("ffmpeg " + s.state + ": " + log.slice(-300));
    await sleep(250);
  }
  throw new Error("ffmpeg timed out");
}

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// Whole file as bytes (bounded), read 16 chunks per call.
export async function readFileBytes(sdk: PanelSdk, path: string, maxBytes = 8 * 1024 * 1024): Promise<Uint8Array> {
  const parts: Uint8Array[] = [];
  let offset = 0, total = 0;
  for (;;) {
    const r = await run<{ chunks: string[]; offset: number }>(sdk, readChunksScript(path, offset, 16));
    for (const c of r.chunks) { const b = b64ToBytes(c); parts.push(b); total += b.length; }
    if (total > maxBytes) throw new Error("file too large: " + path);
    if (r.offset === offset || r.chunks.length < 16) break;
    offset = r.offset;
  }
  const out = new Uint8Array(total);
  let at = 0;
  for (const p of parts) { out.set(p, at); at += p.length; }
  return out;
}

export async function readFileBase64(sdk: PanelSdk, path: string, maxBytes?: number): Promise<string> {
  const bytes = await readFileBytes(sdk, path, maxBytes);
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
