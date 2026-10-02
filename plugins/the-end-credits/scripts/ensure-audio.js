const cfg = __CONFIG__;
const p = selects.project(cfg.projectId);
// Reuses the Audio resource of cfg.path when this Project has it, else imports the file once. Host paths are compared
// normalised, never as raw strings: Unicode NFC (macOS may store a Korean file name decomposed) and, when either side
// looks like a Windows path (a drive letter or a backslash), separators as "/" and case-folded, so the host's own
// spelling of the same file matches (without this every Build re-imports the cue on Windows). POSIX paths stay
// case-sensitive. cfg.durationSeconds (optional; a bundled cue's length from the manifest): the matching resource is
// reused only when its length is within 0.5 s of it, so a different file now at that path is imported instead.
const looksWindows = s => /^[A-Za-z]:([\\/]|$)/.test(s) || s.indexOf('\\') >= 0;
const samePath = (a, b) => {
  if (a == null || b == null) return false;
  const x = String(a).normalize('NFC'), y = String(b).normalize('NFC');
  if (x === y) return true;
  if (!looksWindows(x) && !looksWindows(y)) return false;
  const fold = s => s.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();
  return fold(x) === fold(y);
};
const sameLength = r => !(typeof cfg.durationSeconds === 'number' && typeof r.durationSeconds === 'number' && r.durationSeconds > 0)
  || Math.abs(r.durationSeconds - cfg.durationSeconds) <= 0.5;
const paths = {};
const walk = nodes => { for (const n of nodes || []) { if (n.type === 'dir') walk(n.children); else if (n.resourceId && n.path) paths[n.resourceId] = n.path; } };
const files = await p.sourceFiles();
if ('fileTree' in files) walk(files.fileTree);
else for (const f of files.folders || []) { const d = await p.sourceFiles({ folder: f.name }); if ('fileTree' in d) walk(d.fileTree); }
const existing = (await p.resources()).find(r => r.type === 'Audio' && samePath(paths[r.resourceId], cfg.path) && sameLength(r));
if (existing) return { resourceId: existing.resourceId, imported: false };
const r = await p.importFiles({ paths: [cfg.path] });
if (!r.addedResourceIds.length) throw Error('The music file was not imported.');
return { resourceId: r.addedResourceIds[0], imported: true };
