// Local files, media and environment use the public SDK; timeline services retain their host adapters.
// Shell quoting and small
// wrappers around the panel SDK's runScript / runShell (runShell is cmd.exe on Windows: only the macOS-only
// speaker framing uses it), plus the host's bundled ffmpeg (hostFF).

export const PANEL_ID = "a16z-style-captions";

export type Sdk = {
  files: any; media: any; environment: {platform: string; version: string};
  runScript: (o: { script: string; summary: string; allowCommit?: boolean }) => Promise<{ isError: boolean; output: string; result?: any }>;
  runShell: (o: { command: string; summary: string; timeoutMs?: number; maxOutputBytes?: number; cwd?: string }) => Promise<any>;
  askAI: (o: { prompt: string; timeoutMs?: number }) => Promise<{ text: string }>;
};

export function app(): any {
  const parent: any = window.parent;
  if (!parent?.__DI__) throw new Error("This Selects version does not expose native panel services.");
  return parent;
}
export function di(): any {
  return app().__DI__;
}
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
export function envRoot(): string {
  const f = fs();
  return f.join(f.homedir(), ".selects", "python-envs", PANEL_ID);
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

export const q = (v: string) => "'" + String(v).replace(/'/g, "'\\''") + "'";
export const J = (v: any) => JSON.stringify(v);
export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// A run_script helper that lists every file of a Project. Over 200 files the plain listing is only a
// per-folder summary, so each folder is read in turn.
export const LIST_FILES = `const listFiles = async (p: any): Promise<any[]> => {
  const files: any[] = [];
  const walk = (nodes: any[]) => { for (const n of nodes || []) { if (n.type === "dir") walk(n.children); else files.push(n); } };
  const top: any = await p.sourceFiles();
  if (Array.isArray(top)) walk(top);
  else if ("fileTree" in top) walk(top.fileTree);
  else for (const f of top.folders || []) { const one: any = await p.sourceFiles({ folder: String(f.name) }); walk(one.fileTree); }
  return files;
};`;

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

export async function shell(sdk: Sdk, summary: string, command: string, timeoutMs = 120000, maxOutputBytes = 16000): Promise<string> {
  const r = await sdk.runShell({ summary, command, timeoutMs, maxOutputBytes });
  const code = r?.exitCode ?? (r?.isError ? 1 : 0);
  if (r?.isError || code !== 0) {
    const text = String(r?.stderr || r?.output || r?.stdout || "").trim();
    throw new Error(summary + " failed" + (text ? ": " + text.slice(-700) : "."));
  }
  return String(r?.stdout ?? r?.output ?? "");
}

// av-host:start (copied from plugins/archive-vlog/panel.tsx with TypeScript types; only the helpers this panel uses)
// Guarded SDK access for paths, media tools and the install folder.
function hostError(code: string, message: string, member = ""): any { return Object.assign(new Error(message), { code, member }); }
// A host service when it has every named method, else null.
export function hostApi(name: string, ...methods: string[]): any {
  const s = name === "FileSystem" ? hostSdk?.files : name === "Runtime" ? hostSdk?.media : null;
  return s && methods.every((m) => typeof s[m] === "function") ? s : null;
}
// The host initializes the platform before mounting the panel.
export function hostIsWindows(): boolean { return /^win/i.test(hostSdk?.environment?.platform || ""); }
// The plugin's install folder and its data folder. The install folder is the host's skills folder (the home folder
// joined with .selects, skills and <id>, the same place SELECTS_USER_SKILLS_ROOT names on macOS and Windows) when it
// holds `marker` (a file every install has). `sdk` supplies the public file bridge. The data folder (<home>/.selects/plugin-data/<id>) is created when missing;
// null when this host cannot make it (callers then avoid temporary files). Throws 'not-found' without an install folder.
export async function hostRoots(sdk: any, id: string, marker: string): Promise<{ plugin: string; data: string | null }> {
  hostUseSdk(sdk);
  const fs = hostApi("FileSystem", "join", "homedir", "exists");
  const holds = async (dir: string | null) => { try { return !!dir && (!fs || !!(await fs.exists(fs.join(dir, marker)))); } catch { return false; } };
  let plugin: string | null = null;
  try { if (fs) { const dir = String(fs.join(fs.homedir(), ".selects", "skills", id)); if ((await holds(dir))) plugin = dir; } } catch { plugin = null; }
  if (!plugin) throw hostError("not-found", "the plugin folder could not be found");
  let data: string | null = null;
  try {
    const dfs = hostApi("FileSystem", "join", "homedir", "mkdir");
    if (dfs) { data = String(dfs.join(dfs.homedir(), ".selects", "plugin-data", id)); (await dfs.mkdir(data, { recursive: true })); }
  } catch { data = null; }
  return { plugin, data };
}
// av-host:end

// The host's bundled ffmpeg / ffprobe (Runtime.runFFmpeg / runFFprobe): an argv array, no shell, nothing to install.
// Throws when this Selects build lacks the method (callers already treat a failure as "skip this step"), when the
// tool fails, or after `timeoutMs`.
export async function hostFF(tool: "runFFmpeg" | "runFFprobe", args: string[], timeoutMs = 120000): Promise<{ stdout: string; stderr: string }> {
  const rt = hostApi("Runtime", tool);
  if (!rt) throw hostError("host-missing", "this Selects build has no Runtime." + tool + "; update Selects", "Runtime." + tool);
  const controller = typeof AbortController === "undefined" ? null : new AbortController();
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  try {
    // runFFmpeg also streams stderr to a callback: kept in case a host build returns it empty with withoutLog.
    const chunks: string[] = [];
    const extra = tool === "runFFmpeg" ? [undefined, (x: string) => { chunks.push(String(x)); }] : [];
    const r = await rt[tool](args, true, controller ? controller.signal : undefined, ...extra);
    return { stdout: String(r?.stdout ?? ""), stderr: String(r?.stderr || chunks.join("")) };
  } finally {
    if (timer) clearTimeout(timer);
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

let hostSdk: Sdk;
export function hostUseSdk(sdk: Sdk) { hostSdk = sdk; if (!sdk?.files || !sdk?.media || !sdk?.environment) throw new Error("Update Selects to use this plugin."); }
export function media(): any { return hostSdk.media; }
