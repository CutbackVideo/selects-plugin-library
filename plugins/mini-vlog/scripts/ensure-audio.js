const cfg = __CONFIG__;
const p = selects.project(cfg.projectId);
// Imports the music file (cfg.path: a bundled cue, built by the panel with FileSystem.join, or your own track) unless
// this Project has it already. Paths are compared normalised, so the same file always matches: Unicode NFC (macOS may
// store a Korean file name decomposed), backslashes as slashes and, on Windows, case-folded (drive letters and the
// host's own spelling). A bundled cue's file name is plugin-owned, so an Audio resource with the same file name (or
// resource name) also matches, but only when cfg.duration (the cue's length in seconds, from the manifest) is given
// and the resource's durationSeconds is within DURATION_TOLERANCE of it: a user's own file that merely shares the name
// is never taken for the cue (and gets no cue grid).
const DURATION_TOLERANCE = 0.25;
const win = /^[a-z]:[\\/]/i.test(String(cfg.path || '')) || String(cfg.path || '').startsWith('\\\\');
const norm = s => { const v = String(s || '').normalize('NFC').replace(/\\/g, '/'); return win ? v.toLowerCase() : v; };
const base = s => norm(s).split('/').pop();
const paths = {};
const walk = nodes => { for (const n of nodes || []) { if (n.type === 'dir') walk(n.children); else if (n.resourceId && n.path) paths[n.resourceId] = n.path; } };
const files = await p.sourceFiles();
if ('fileTree' in files) walk(files.fileTree);
else for (const f of files.folders || []) { const d = await p.sourceFiles({ folder: f.name }); if ('fileTree' in d) walk(d.fileTree); }
const audio = (await p.resources()).filter(r => r.type === 'Audio');
const want = norm(cfg.path), wantName = base(cfg.path);
const sameLength = r => typeof cfg.duration === 'number' && typeof r.durationSeconds === 'number' && Math.abs(r.durationSeconds - cfg.duration) <= DURATION_TOLERANCE;
const existing = audio.find(r => paths[r.resourceId] && norm(paths[r.resourceId]) === want)
  || audio.find(r => ((paths[r.resourceId] && base(paths[r.resourceId]) === wantName) || norm(r.name) === wantName) && sameLength(r));
if (existing) return { resourceId: existing.resourceId, imported: false };
const r = await p.importFiles({ paths: [cfg.path] });
if (!r.addedResourceIds.length) throw Error('The music file was not imported.');
return { resourceId: r.addedResourceIds[0], imported: true };
