// run_script sources the panel sends through sdk.runScript. Each returns { summary, script, allowCommit }.
// Values are embedded with JSON.stringify; nothing user-typed is spliced into code unquoted.

export type ScriptCall = { summary: string; script: string; allowCommit?: boolean };
const J = (v: unknown) => JSON.stringify(v);

export const PLATE_FPS = "30000/1001";
export const PLATE_MAX_SECONDS = 90;
export const READ_CHUNK = 49152;

export const envScript = (): ScriptCall => ({
  summary: "Read the plug-in data folder",
  allowCommit: true,
  script: `const env = await selects.files.environment();
const sep = /^win/i.test(env.platform) ? "\\\\" : "/";
const dir = [env.homedir, ".selects", "plugin-data", "news-minute"].join(sep);
await selects.files.mkdir(dir, { recursive: true });
let projectId: string | null = null;
try { const s = await selects.editor.state(); projectId = s && s.projectId ? s.projectId : null; } catch (e) { projectId = null; }
const tmp = env.tempDirectory;
const skills = [env.homedir, ".selects", "skills", "news-minute"].join(sep);
return { platform: env.platform, sep, dir, tmp, skills, projectId };`,
});

export const createProjectScript = (): ScriptCall => ({
  summary: "Create a Project for the news short",
  allowCommit: true,
  script: `const p = await selects.createProject(); return { projectId: p.id };`,
});

export const downloadScript = (url: string, path: string): ScriptCall => ({
  summary: "Download the article page",
  allowCommit: true,
  script: `await selects.files.download(${J(url)}, ${J(path)});
const st = await selects.files.stat(${J(path)});
return { size: st ? st.size : 0 };`,
});

// Up to `count` chunks from `offset`, base64 each.
export const readChunksScript = (path: string, offset: number, count: number): ScriptCall => ({
  summary: "Read a downloaded file",
  script: `const out: string[] = [];
let offset = ${J(offset)};
for (let i = 0; i < ${J(count)}; i++) {
  const r = await selects.files.readRange({ path: ${J(path)}, offset, length: ${READ_CHUNK} });
  if (!r.bytesRead) break;
  out.push(r.base64);
  offset += r.bytesRead;
  if (r.bytesRead < ${READ_CHUNK}) break;
}
return { chunks: out, offset };`,
});

export const writeChunkScript = (path: string, offset: number, base64: string): ScriptCall => ({
  summary: "Save the run record",
  allowCommit: true,
  script: `const r = await selects.files.writeChunk({ path: ${J(path)}, offset: ${J(offset)}, base64: ${J(base64)} }); return r.bytesWritten;`,
});

export const removeScript = (path: string): ScriptCall => ({
  summary: "Remove a temporary file",
  allowCommit: true,
  script: `await selects.files.remove(${J(path)}, { force: true }); return true;`,
});

// Bundled FFmpeg (the app's own, no install needed). Paths each in their own argument.
export const ffmpegScript = (summary: string, args: string[]): ScriptCall => ({
  summary,
  allowCommit: true,
  script: `const { jobId } = await selects.media.startFFmpeg({ args: ${J(args)} }); return { jobId };`,
});

export const mediaJobScript = (jobId: string, cursor: number): ScriptCall => ({
  summary: "Check a media job",
  script: `const s = await selects.media.job(${J(jobId)}).status({ cursor: ${J(cursor)} });
return { state: s.state, events: (s.events || []).map((e: any) => ({ cursor: e.cursor, text: String(e.text || "").slice(-400) })), truncated: !!s.truncated };`,
});

export const existsScript = (path: string): ScriptCall => ({
  summary: "Check a file",
  script: `const st = await selects.files.stat(${J(path)}); return { exists: !!st, size: st ? st.size : 0 };`,
});

// A plain brand-colour 1080x1920 plate for Main (a Draft needs video on Main to export).
export function plateArgs(seconds: number, color: string, out: string): string[] {
  return ["-y", "-f", "lavfi", "-i", `color=c=0x${color.replace(/^#/, "")}:s=1080x1920:r=${PLATE_FPS}`, "-t", seconds.toFixed(2),
    "-c:v", "libx264", "-preset", "veryfast", "-tune", "stillimage", "-pix_fmt", "yuv420p", "-an", out];
}
// The same plate from an opaque 1080x1920 background image held still.
export function imagePlateArgs(seconds: number, image: string, out: string): string[] {
  return ["-y", "-loop", "1", "-framerate", PLATE_FPS, "-i", image, "-t", seconds.toFixed(2), "-vf", "scale=1080:1920,format=yuv420p",
    "-c:v", "libx264", "-preset", "veryfast", "-tune", "stillimage", "-pix_fmt", "yuv420p", "-an", out];
}
export const plateSeconds = (narrationSeconds: number) => Math.ceil((narrationSeconds + 0.5) * 2) / 2 + 0.1;

// Scenes travel inside run_script (262,144-byte cap), so photos stay around 100 KB: 1080 px, then 720 px if needed.
export function photoArgs(src: string, out: string, width = 1080, quality = 6): string[] {
  return ["-y", "-i", src, "-frames:v", "1", "-vf", `scale='min(${width},iw)':-2`, "-q:v", String(quality), out];
}
export const PHOTO_MAX_B64 = 180_000;

export const importScript = (projectId: string, paths: string[]): ScriptCall => ({
  summary: "Add media to the Project",
  allowCommit: true,
  script: `const p = selects.project(${J(projectId)});
const r = await p.importFiles({ paths: ${J(paths)} });
return { ids: r.addedResourceIds };`,
});

// --- narration ---
export const voicesScript = (): ScriptCall => ({
  summary: "List narration voices",
  script: `const r = await selects.narration.voices({ limit: 50 }); return r.items.map((v) => ({ voiceId: v.voiceId, name: v.name }));`,
});

// One paid step per call: this script only submits.
export const generateScript = (projectId: string, name: string, text: string, voiceId: string, language: string): ScriptCall => ({
  summary: "Generate the narration",
  allowCommit: true,
  script: `const job = await selects.narration.generate({ projectId: ${J(projectId)}, name: ${J(name)}, text: ${J(text)}, voiceId: ${J(voiceId)}, language: ${J(language)} });
return { workflowId: job.workflowId };`,
});

export const narrationStatusScript = (workflowId: string): ScriptCall => ({
  summary: "Check the narration",
  script: `const j = selects.narration.job(${J(workflowId)});
const s = await j.status();
const r = await j.result();
return { status: { status: s.status, step: s.step, lastErrorMessage: s.lastErrorMessage, importErrorCode: s.importErrorCode || null }, result: r };`,
});

export const resumeImportScript = (workflowId: string): ScriptCall => ({
  summary: "Finish importing the narration",
  allowCommit: true,
  script: `await selects.narration.job(${J(workflowId)}).resumeImport(); return true;`,
});

// Every page of the alignment; null when the provider gave none.
export const alignmentScript = (projectId: string, resourceId: string): ScriptCall => ({
  summary: "Read the narration timing",
  script: `const h = selects.project(${J(projectId)}).resource(${J(resourceId)});
const chars: any[] = [];
let cursor: string | undefined;
for (let i = 0; i < 100; i++) {
  const a = await h.speechAlignment({ cursor, limit: 1000 });
  if (!a) return null;
  for (const c of a.characters) chars.push(c);
  if (!a.nextCursor) break;
  cursor = a.nextCursor;
}
return chars;`,
});

export const openDraftScript = (draftId: string): ScriptCall => ({
  summary: "Open the Draft",
  script: `return await selects.editor.openDraft(${J(draftId)});`,
});

// Until the preview helpers land: the Draft's name, saved by commitAll (Draft.setName).
export const renameDraftScript = (draftId: string, name: string): ScriptCall => ({
  summary: "Rename the Draft",
  allowCommit: true,
  script: `const d = selects.draft(${J(draftId)});
await d.setName(${J(name)});
await d.commitAll("News short: name");
return true;`,
});
