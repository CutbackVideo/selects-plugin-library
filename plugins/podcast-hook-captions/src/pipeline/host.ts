import {panelLocalClient} from "../../../../shared/local-client";
// Timeline services retain host adapters; local files and ffmpeg/ffprobe use the public SDK and the
// app's own runner, file helpers, and a wrapper around the panel SDK's runScript. Nothing here goes through a
// shell, so the same code runs on macOS and Windows.

export const PANEL_ID = "podcast-hook-captions";

export type Sdk = {
  runScript: (o: { script: string; summary: string; allowCommit?: boolean }) => Promise<{ isError: boolean; output: string; result?: any }>;
  call: (method: string, ...args: any[]) => Promise<any>;
  askAI: (o: { prompt: string; timeoutMs?: number }) => Promise<{ text: string }>;
};

export function app(): any {
  return window;
}
export function getSdk(): Sdk { return hostSdk; }
export function libraryId(): string {
  const id = app().location.pathname.match(/libraries\/([^/]+)/)?.[1];
  if (!id) throw new Error("Open a Draft in Selects first.");
  return id;
}
export function fs(): any {
  return hostSdk.files;
}
export function dataRoot(): string {
  const f = fs();
  return f.join(f.homedir(), ".selects", "plugin-data", PANEL_ID);
}
// The plugin's own files (fonts, notes), installed beside the other Selects skills on every OS.
export function skillRoot(): string {
  const f = fs();
  return f.join(f.homedir(), ".selects", "skills", PANEL_ID);
}
export function platform(): string {
  try {
    return String(hostSdk?.environment?.platform || "");
  } catch {
    return "";
  }
}
export function hostVersion(): string {
  try {
    return String(hostSdk?.environment?.version || "");
  } catch {
    return "";
  }
}
export function versionBelow(version: string, minimum: string): boolean {
  const a = String(version || "0").split(".").map((n) => parseInt(n, 10) || 0);
  const b = minimum.split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i += 1) if ((a[i] || 0) !== (b[i] || 0)) return (a[i] || 0) < (b[i] || 0);
  return false;
}

export function requireSharedAiHost(): void {
  const version = hostVersion();
  if (!/^\d+\.\d+\.\d+$/.test(version) || versionBelow(version, "2.0.560")) {
    throw new Error("Shared face tracking needs Selects 2.0.560 or later" + (version ? " (this is " + version + ")" : "") + ".");
  }
}

export const J = (v: any) => JSON.stringify(v);
export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function script(sdk: Sdk, summary: string, body: string, allowCommit = false): Promise<any> {
  const r = await sdk.runScript({ summary, script: body, allowCommit });
  if (r.isError) {
    let msg = String(r.output || "The edit script failed.");
    try {
      const o = JSON.parse(msg);
      msg = o.error ? String(o.error) + (o.diagnostics ? " " + JSON.stringify(o.diagnostics).slice(0, 600) : "") : msg;
    } catch {}
    throw new Error(summary + ": " + msg.slice(0, 900));
  }
  return r.result;
}

// ffmpeg / ffprobe through the app's own runner: an argument list spawned without a shell, using the
// binaries bundled with Selects, so quoting and %-signs never matter and macOS and Windows behave alike.
// Output arrives in chunks; they are joined exactly as written (the runner's own result inserts newlines
// between chunks, which can split a number). `timeoutMs` cancels the process.
export async function ffmpeg(label: string, args: string[], timeoutMs = 300000, captureLog = false): Promise<{ stdout: string; stderr: string }> {
  const rt = hostSdk.media;
  if (typeof rt?.runFFmpeg !== "function") throw new Error("This Selects version cannot run ffmpeg for plug-ins. Update Selects.");
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  let out = "";
  let err = "";
  try {
    // The app keeps stream listeners for the window's lifetime, so they are attached only when the log
    // itself is the result.
    if (!captureLog) {
      const r = await rt.runFFmpeg(["-hide_banner", "-nostdin", ...args], true, ac.signal);
      return { stdout: String(r?.stdout ?? ""), stderr: String(r?.stderr ?? "") };
    }
    await rt.runFFmpeg(["-hide_banner", "-nostdin", ...args], true, ac.signal, (c: string) => (out += c), (c: string) => (err += c));
    return { stdout: out, stderr: err };
  } catch (e: any) {
    if (ac.signal.aborted) throw new Error(label + " took too long.");
    throw new Error(label + " failed" + toolError(e, err));
  } finally {
    clearTimeout(timer);
  }
}
export async function ffprobe(label: string, args: string[], timeoutMs = 60000): Promise<string> {
  const rt = hostSdk.media;
  if (typeof rt?.runFFprobe !== "function") throw new Error("This Selects version cannot run ffprobe for plug-ins. Update Selects.");
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const r = await rt.runFFprobe(["-hide_banner", ...args], true, ac.signal);
    return String(r?.stdout ?? "");
  } catch (e: any) {
    if (ac.signal.aborted) throw new Error(label + " took too long.");
    throw new Error(label + " failed" + toolError(e, ""));
  } finally {
    clearTimeout(timer);
  }
}
function toolError(e: any, streamed: string): string {
  let text = streamed;
  if (!text) {
    if (e && typeof e === "object" && e.stderr) text = String(e.stderr);
    else {
      const raw = String(e?.message ?? e ?? "");
      try {
        const o = JSON.parse(raw);
        text = String(o.stderr || o.message || raw);
      } catch {
        text = raw;
      }
    }
  }
  text = text.trim();
  return text ? ": " + text.slice(-600) : ".";
}

// File helpers on the app's FileSystem (never a shell).
export async function removeFile(path: string) {
  try {
    if ((await fs().exists(path))) (await fs().rm(path));
  } catch {}
}
export async function filesIn(dir: string, pattern: RegExp): Promise<string[]> {
  try {
    return (await fs().readdir(dir)).map(String).filter((n: string) => pattern.test(n));
  } catch {
    return [];
  }
}

// The last JSON object in a block of text (the assistant sometimes wraps it in prose or a code fence).
export function lastJsonObject(text: string): any {
  const s = String(text || "");
  const end = s.lastIndexOf("}");
  if (end < 0) throw new Error("The assistant did not return JSON.");
  let depth = 0;
  for (let i = end; i >= 0; i -= 1) {
    if (s[i] === "}") depth += 1;
    else if (s[i] === "{") {
      depth -= 1;
      if (depth === 0) return JSON.parse(s.slice(i, end + 1));
    }
  }
  throw new Error("The assistant's JSON could not be read.");
}

let hostSdk: ReturnType<typeof panelLocalClient>;
export function hostUseSdk(sdk: Sdk) { hostSdk = panelLocalClient(sdk); if (!hostSdk?.files || !hostSdk?.media || !hostSdk?.environment) throw new Error("Update Selects to use this plugin."); }
export function media(): any { return hostSdk.media; }
