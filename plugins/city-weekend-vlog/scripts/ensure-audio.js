const cfg = __CONFIG__;
const p = selects.project(cfg.projectId);
const paths = {};
const walk = nodes => { for (const n of nodes || []) { if (n.type === 'dir') walk(n.children); else if (n.resourceId && n.path) paths[n.resourceId] = n.path; } };
const files = await p.sourceFiles();
if ('fileTree' in files) walk(files.fileTree);
else for (const f of files.folders || []) { const d = await p.sourceFiles({ folder: f.name }); if ('fileTree' in d) walk(d.fileTree); }
const existing = (await p.resources()).find(r => r.type === 'Audio' && paths[r.resourceId] === cfg.path);
if (existing) return { resourceId: existing.resourceId, imported: false };
const r = await p.importFiles({ paths: [cfg.path] });
if (!r.addedResourceIds.length) throw Error('The music file was not imported.');
return { resourceId: r.addedResourceIds[0], imported: true };
