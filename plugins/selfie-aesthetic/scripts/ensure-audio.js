const cfg: any = __CONFIG__;
const p = selects.project(cfg.projectId);
// Imports the music file (a bundled cue or the user's own music) once per Project and returns its resource id; an Audio
// resource with the same file is reused. importFiles is a Project write, so this call never commits a Draft.
// Paths are compared normalised: NFC, forward slashes, and case-folded when either side looks like a Windows path
// (a drive letter or a backslash), because the Project may store `C:/Music/A/...` for a cfg path `C:\Music\a\...`.
// Without a full-path match, an Audio resource with the same file name (same normalisation) is reused, unless
// cfg.matchByName is false (the user's own music: a different song may share its file name). When the caller passes
// cfg.durationSeconds (a bundled cue's length from the manifest), a same-named resource is the cue only at the cue's
// length (|durationSeconds - cfg.durationSeconds| <= 0.5 s): a user's file that merely shares the name is not taken for it.
const norm = s => String(s || '').normalize('NFC').replace(/\\/g, '/');
const isWin = s => /^[A-Za-z]:|\\/.test(String(s || ''));
const base = s => norm(s).split('/').pop();
// `name` compares only the file names; the case folding still follows the full paths.
const same = (a, b, name = false) => {
  const fold = isWin(a) || isWin(b);
  const x = name ? base(a) : norm(a), y = name ? base(b) : norm(b);
  return fold ? x.toLowerCase() === y.toLowerCase() : x === y;
};
const paths = {};
const walk = nodes => { for (const n of nodes || []) { if (n.type === 'dir') walk(n.children); else if (n.resourceId && n.path) paths[n.resourceId] = n.path; } };
const files = await p.sourceFiles();
if ('fileTree' in files) walk(files.fileTree);
else for (const f of files.folders || []) { const d = await p.sourceFiles({ folder: f.name }); if ('fileTree' in d) walk(d.fileTree); }
const audio = (await p.resources()).filter(r => r.type === 'Audio');
const sameLength = r => typeof cfg.durationSeconds !== 'number'
  || (typeof r.durationSeconds === 'number' && Math.abs(r.durationSeconds - cfg.durationSeconds) <= 0.5);
const existing = audio.find(r => paths[r.resourceId] && same(paths[r.resourceId], cfg.path))
  || (cfg.matchByName === false ? null : audio.find(r => paths[r.resourceId] && same(paths[r.resourceId], cfg.path, true) && sameLength(r)));
if (existing) return { resourceId: existing.resourceId, imported: false };
const r = await p.importFiles({ paths: [cfg.path] });
if (!r.addedResourceIds.length) throw Error('The music file was not imported.');
return { resourceId: r.addedResourceIds[0], imported: true };
