const cfg = __CONFIG__;
const p = selects.project(cfg.projectId);
// Imports only the audio files (cue, muffled cue, sound effects, own music) this Project does not have yet and returns
// every key's resource id. importFiles is a Project write, so this call never commits a Draft.
// Matching: by path first. Paths are compared normalised, so the same file always matches: Unicode NFC (macOS may store
// a Korean file name decomposed), and when either side looks like a Windows path (a drive letter or a backslash)
// backslashes as slashes and case-folded (the Project may store `C:/Music/A/...` for a cfg path `C:\Music\a\...`); POSIX
// paths stay case-sensitive. A plugin-owned file (bundled cue, its muffled copy, a sound effect, the hash-named muffled
// copy of own music) also matches an Audio resource with the same file name (same normalisation), but when the file
// gives its `duration` (seconds) only a resource whose durationSeconds is within 0.5 s of it: a user's file that merely
// shares the name is never taken for it (a resource this call's import just added may not know its length yet, so it
// is exempt). A file with `matchByName: false` (the user's own music) matches by path only,
// so a different song that happens to share its file name is never reused; right after the import it may match by name
// among the resources that import added.
const isWin = s => /^[A-Za-z]:|\\/.test(String(s || ''));
const norm = s => String(s || '').normalize('NFC').replace(/\\/g, '/');
const base = s => norm(s).split('/').pop();
// `name`: compare only the file names; the case folding follows the full paths.
const same = (a, b, name = false) => {
  const fold = isWin(a) || isWin(b);
  const x = name ? base(a) : norm(a), y = name ? base(b) : norm(b);
  return fold ? x.toLowerCase() === y.toLowerCase() : x === y;
};
const sameLength = (r, file, fresh) => fresh || typeof file.duration !== 'number' || (typeof r.durationSeconds === 'number' && Math.abs(r.durationSeconds - file.duration) <= 0.5);
const lookup = async before => {
  const paths = {};
  const walk = nodes => { for (const n of nodes || []) { if (n.type === 'dir') walk(n.children); else if (n.resourceId && n.path) paths[n.resourceId] = n.path; } };
  const files = await p.sourceFiles();
  if ('fileTree' in files) walk(files.fileTree);
  else for (const f of files.folders || []) { const d = await p.sourceFiles({ folder: f.name }); if ('fileTree' in d) walk(d.fileTree); }
  const audio = (await p.resources()).filter(r => r.type === 'Audio');
  const find = file => {
    const byPath = audio.find(r => paths[r.resourceId] && same(paths[r.resourceId], file.path));
    if (byPath) return byPath.resourceId;
    const pool = file.matchByName === false ? (before ? audio.filter(r => !before.has(r.resourceId)) : []) : audio;
    const byName = pool.find(r => ((paths[r.resourceId] && same(paths[r.resourceId], file.path, true)) || same(r.name, file.path, true)) && sameLength(r, file, !!before && !before.has(r.resourceId)));
    return byName ? byName.resourceId : null;
  };
  return { find, ids: new Set(audio.map(r => r.resourceId)) };
};
const ids = {};
let seen = await lookup(null);
const todo = [];
for (const f of cfg.files) { const id = seen.find(f); if (id) ids[f.key] = id; else todo.push(f); }
const imported = [];
if (todo.length) {
  const r = await p.importFiles({ paths: todo.map(f => f.path) });
  // addedResourceIds is not guaranteed to follow the path order, so the new ids are matched by path or name again.
  seen = await lookup(seen.ids);
  const added = r.addedResourceIds || [];
  for (const f of todo) {
    // A single import that the Project listing does not show yet is its only added id.
    const id = seen.find(f) || (todo.length === 1 && added.length === 1 ? added[0] : null);
    if (id) { ids[f.key] = id; imported.push(f.key); }
  }
  if (!added.length && !imported.length) throw Error('The audio files were not imported.');
}
return { ids, imported, missing: cfg.files.filter(f => !ids[f.key]).map(f => f.key) };
