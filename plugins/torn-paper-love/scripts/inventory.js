// Torn Paper Love: read the Project's pictures (read-only; nothing is committed).
// cfg (JSON): { projectId, only: string[] | null, known?: { [rid]: { width, height } }, measureMs?: number }
//   only       resource ids the user chose ("Choose clips"); null = every picture
//   known      photo sizes the panel already measured (reused, not measured again)
//   measureMs  time budget for measuring photo sizes (default 8000)
// returns { resources: Video[], photos: Photo[], counts: { unanalysed, missing, unmeasured } }
//   Video { rid, name, duration, width, height, recordedAt, order, kind: 'video' }
//   Photo { rid, name, width, height, recordedAt, order, kind: 'photo' }   (width/height null when unmeasured)
//   order = the resource's index in the Project's resource order (the planner's tie-break for missing dates).
const cfg = __CONFIG__;
const p = selects.project(cfg.projectId);
const all = await p.resources();
const sizes = {};
const walk = nodes => { for (const n of nodes || []) { if (n.type === 'dir') walk(n.children); else if (n.resourceId) sizes[n.resourceId] = n.frameSize || null; } };
const files = await p.sourceFiles();
if ('fileTree' in files) walk(files.fileTree);
else for (const f of files.folders || []) { const d = await p.sourceFiles({ folder: f.name }); if ('fileTree' in d) walk(d.fileTree); }
const wanted = r => !cfg.only || cfg.only.includes(r.resourceId);
const recordedAt = r => (r.recording && (r.recording.recordedAt || r.recording.filenameTimestamp || r.recording.creationAt)) || null;
const order = new Map(all.map((r, i) => [r.resourceId, i]));
const video = all.filter(r => r.type === 'Video' && wanted(r));
const ids = new Set(video.map(r => r.resourceId));
const resources = [];
let unanalysed = 0, missing = 0, unmeasured = 0;
for (const r of video) {
  if (!r.hasAnalysis) { unanalysed++; continue; }
  if (r.owningSyncedSequenceResourceId && ids.has(r.owningSyncedSequenceResourceId)) continue;
  const size = sizes[r.resourceId];
  if (!(r.durationSeconds > 0)) { missing++; continue; }
  resources.push({ rid: r.resourceId, name: r.name, duration: r.durationSeconds, width: size ? size.width : null, height: size ? size.height : null, recordedAt: recordedAt(r), order: order.get(r.resourceId), kind: 'video' });
}
// Photos (Image resources) have no analysis and no scene search; they are placed whole. sourceFiles() reports no
// frameSize for them, so an unsaved scratch Draft measures each one: a new Draft adopts its first clip's frame size.
// Nothing is committed. Sizes the panel already knows (cfg.known) are reused, and measuring stops after
// cfg.measureMs (default 8 s) so the call stays well inside run_script's deadline; the rest stay null (unmeasured)
// and the panel measures them in a later call.
const known = cfg.known || {};
const budget = cfg.measureMs == null ? 8000 : cfg.measureMs;
const started = Date.now();
const photos = [];
for (const r of all.filter(r => r.type === 'Image' && wanted(r))) {
  let size = sizes[r.resourceId] || known[r.resourceId] || null;
  if (!(size && size.width > 0 && size.height > 0) && Date.now() - started < budget) {
    try {
      const scratch = await p.createDraft({ name: 'Torn Paper Love size check' });
      await scratch.insertResource({ resourceId: r.resourceId, sourceRange: { startSeconds: 0, endSeconds: 0.5 } });
      size = (await scratch.meta()).frameSize;
    } catch (e) { size = null; }
  }
  const ok = size && size.width > 0 && size.height > 0;
  if (!ok) unmeasured++;
  photos.push({ rid: r.resourceId, name: r.name, width: ok ? size.width : null, height: ok ? size.height : null, recordedAt: recordedAt(r), order: order.get(r.resourceId), kind: 'photo' });
}
return { resources, photos, counts: { unanalysed, missing, unmeasured } };
