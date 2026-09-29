const cfg = __CONFIG__;
const p = selects.project(cfg.projectId);
// Imports only the audio files (cue, muffled cue, sound effects) this Project does not have yet, matched by path or
// file name, and returns every key's resource id. importFiles is a Project write, so this call never commits a Draft.
const base = s => String(s || '').split(/[\\/]/).pop();
const lookup = async () => {
  const paths = {};
  const walk = nodes => { for (const n of nodes || []) { if (n.type === 'dir') walk(n.children); else if (n.resourceId && n.path) paths[n.resourceId] = n.path; } };
  const files = await p.sourceFiles();
  if ('fileTree' in files) walk(files.fileTree);
  else for (const f of files.folders || []) { const d = await p.sourceFiles({ folder: f.name }); if ('fileTree' in d) walk(d.fileTree); }
  const audio = (await p.resources()).filter(r => r.type === 'Audio');
  return file => {
    const byPath = audio.find(r => paths[r.resourceId] === file.path);
    if (byPath) return byPath.resourceId;
    const byName = audio.find(r => base(paths[r.resourceId]) === base(file.path) || r.name === base(file.path));
    return byName ? byName.resourceId : null;
  };
};
const ids = {};
let find = await lookup();
const todo = [];
for (const f of cfg.files) { const id = find(f); if (id) ids[f.key] = id; else todo.push(f); }
const imported = [];
if (todo.length) {
  const r = await p.importFiles({ paths: todo.map(f => f.path) });
  // addedResourceIds is not guaranteed to follow the path order, so the new ids are matched by name again.
  find = await lookup();
  const added = r.addedResourceIds || [];
  for (const f of todo) {
    // A single import that the Project listing does not show yet is its only added id.
    const id = find(f) || (todo.length === 1 && added.length === 1 ? added[0] : null);
    if (id) { ids[f.key] = id; imported.push(f.key); }
  }
  if (!added.length && !imported.length) throw Error('The audio files were not imported.');
}
return { ids, imported, missing: cfg.files.filter(f => !ids[f.key]).map(f => f.key) };
