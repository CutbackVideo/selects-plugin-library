const cfg = __CONFIG__;
const p = selects.project(cfg.projectId);
// Imports the bundled cue (cfg.path, built by the panel with FileSystem.join) unless this Project has it already.
// Paths are compared normalised, so the same file always matches: Unicode NFC (macOS may store a Korean file name
// decomposed), backslashes as slashes and case-folded (Windows paths, drive letters and the host's own spelling).
// A cue's file name is plugin-owned, so an Audio resource with the same file name (or resource name) also matches.
const norm = s => String(s || '').normalize('NFC').replace(/\\/g, '/').toLowerCase();
const base = s => norm(s).split('/').pop();
const paths = {};
const walk = nodes => { for (const n of nodes || []) { if (n.type === 'dir') walk(n.children); else if (n.resourceId && n.path) paths[n.resourceId] = n.path; } };
const files = await p.sourceFiles();
if ('fileTree' in files) walk(files.fileTree);
else for (const f of files.folders || []) { const d = await p.sourceFiles({ folder: f.name }); if ('fileTree' in d) walk(d.fileTree); }
const audio = (await p.resources()).filter(r => r.type === 'Audio');
const want = norm(cfg.path), wantName = base(cfg.path);
const existing = audio.find(r => norm(paths[r.resourceId]) === want)
  || audio.find(r => (paths[r.resourceId] && base(paths[r.resourceId]) === wantName) || norm(r.name) === wantName);
if (existing) return { resourceId: existing.resourceId, imported: false };
const r = await p.importFiles({ paths: [cfg.path] });
if (!r.addedResourceIds.length) throw Error('The music file was not imported.');
return { resourceId: r.addedResourceIds[0], imported: true };
