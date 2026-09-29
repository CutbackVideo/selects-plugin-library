const cfg = __CONFIG__;
const p = selects.project(cfg.projectId);
// Imports only the audio files (cue, muffled cue, sound effects, own music) this Project does not have yet and returns
// every key's resource id. importFiles is a Project write, so this call never commits a Draft.
// Matching: by path first. A plugin-owned file (bundled cue, its muffled copy, a sound effect, the hash-named muffled
// copy of own music) also matches an Audio resource with the same file name. A file with `matchByName: false` (the
// user's own music) matches by path only, so a different song that happens to share its file name is never reused;
// right after the import it may match by name among the resources that import added.
const base = s => String(s || '').split(/[\\/]/).pop();
const lookup = async before => {
  const paths = {};
  const walk = nodes => { for (const n of nodes || []) { if (n.type === 'dir') walk(n.children); else if (n.resourceId && n.path) paths[n.resourceId] = n.path; } };
  const files = await p.sourceFiles();
  if ('fileTree' in files) walk(files.fileTree);
  else for (const f of files.folders || []) { const d = await p.sourceFiles({ folder: f.name }); if ('fileTree' in d) walk(d.fileTree); }
  const audio = (await p.resources()).filter(r => r.type === 'Audio');
  const find = file => {
    const byPath = audio.find(r => paths[r.resourceId] === file.path);
    if (byPath) return byPath.resourceId;
    const pool = file.matchByName === false ? (before ? audio.filter(r => !before.has(r.resourceId)) : []) : audio;
    const byName = pool.find(r => base(paths[r.resourceId]) === base(file.path) || r.name === base(file.path));
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
