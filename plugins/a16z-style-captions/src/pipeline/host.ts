// Host access for the panel: the app's native services (window.parent.__DI__), shell quoting, and small
// wrappers around the panel SDK's runScript / runShell.

export const PANEL_ID = "a16z-style-captions";

export type Sdk = {
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
  return di().FileSystem;
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
    return String(di().Runtime?.getHostingVersion?.() || "");
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
