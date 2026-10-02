const cfg = __CONFIG__;
const p = selects.project(cfg.projectId);
const all = await p.resources();
const page = Object(cfg).page;
const pageRows = page ? all.slice(page.offset, page.offset + page.size) : all;
const pageIds = new Set(pageRows.map(r => r.resourceId));
const inPage = r => pageIds.has(r.resourceId);
const sizes = {}, paths = {};
// The source file's frame size and path (the panel scores unanalysed clips and measures in-shot motion from the file).
const walk = nodes => { for (const n of nodes || []) { if (n.type === 'dir') walk(n.children); else if (n.resourceId) { sizes[n.resourceId] = n.frameSize || null; if (n.path) paths[n.resourceId] = n.path; } } };
const files = await p.sourceFiles();
if ('fileTree' in files) walk(files.fileTree);
else for (const f of files.folders || []) { const d = await p.sourceFiles({ folder: f.name }); if ('fileTree' in d) walk(d.fileTree); }
const wanted = r => !cfg.only || cfg.only.includes(r.resourceId);
const recordedAt = r => (r.recording && (r.recording.recordedAt || r.recording.filenameTimestamp || r.recording.creationAt)) || null;
// Width / height, or null when the size is unknown. The window and the cover transform are computed from it.
const aspectOf = (w, h) => (w > 0 && h > 0 ? w / h : null);
const video = all.filter(r => r.type === 'Video' && wanted(r));
const ids = new Set(video.map(r => r.resourceId));
const resources = [];
// Analysis is never required: draft.insertResource places imported, unanalysed sources. A video is usable once it is
// imported: it has a length and its source file resolves. Imports that were never analysed stay status 'pending' for
// good, so status is informational only. analysed: false clips are scored locally by the panel (quick score) instead
// of by scene search.
// skipped.unanalysed: videos that cannot be used yet (no length or no source file: still importing). It keeps its old
// name because a Clip highlights template run reads it for its "could not be used" note. skipped.notAnalysed: usable
// videos without analysis (counted, not skipped); skipped.analysing: those Selects is analysing now (the panel only
// refreshes its note for them). missing: analysed videos without a length (as before).
const ANALYSING = ['sampling', 'samplingSucceeded', 'analyzing', 'analyzingSucceeded'];
let unanalysed = 0, missing = 0, notAnalysed = 0, analysing = 0;
for (const r of video.filter(inPage)) {
  if (r.owningSyncedSequenceResourceId && ids.has(r.owningSyncedSequenceResourceId)) continue;
  const analysed = !!r.hasAnalysis;
  if (!analysed && !(r.durationSeconds > 0 && paths[r.resourceId])) { unanalysed++; continue; }
  if (!(r.durationSeconds > 0)) { missing++; continue; }
  if (!analysed) { notAnalysed++; if (ANALYSING.includes(r.status)) analysing++; }
  const size = sizes[r.resourceId];
  const width = size ? size.width : null, height = size ? size.height : null;
  resources.push({ rid: r.resourceId, name: r.name, duration: r.durationSeconds, width, height, aspect: aspectOf(width, height), recordedAt: recordedAt(r), kind: 'video',
    path: paths[r.resourceId] || null, analysed });
}
// Photos (Image resources) have no analysis and no scene search; they are placed whole. sourceFiles() reports no
// frameSize for them, so an unsaved scratch Draft measures each one: a new Draft adopts its first clip's frame size.
// Nothing is committed. Sizes the panel already knows (cfg.known) are reused, and measuring stops after
// cfg.measureMs (default 8 s) so the call stays well inside run_script's deadline; the rest stay null for now.
const known = cfg.known || {};
const budget = cfg.measureMs == null ? 8000 : cfg.measureMs;
const started = Date.now();
const photos = [];
for (const r of all.filter(r => r.type === 'Image' && wanted(r) && inPage(r))) {
  let size = sizes[r.resourceId] || known[r.resourceId] || null;
  if (!(size && size.width > 0 && size.height > 0) && Date.now() - started < budget) {
    try {
      const scratch = await p.createDraft({ name: 'THE END Credits size check' });
      await scratch.insertResource({ resourceId: r.resourceId, sourceRange: { startSeconds: 0, endSeconds: 0.5 } });
      size = (await scratch.meta()).frameSize;
    } catch (e) { size = null; }
  }
  const ok = size && size.width > 0 && size.height > 0;
  const width = ok ? size.width : null, height = ok ? size.height : null;
  photos.push({ rid: r.resourceId, name: r.name, width, height, aspect: aspectOf(width, height), recordedAt: recordedAt(r), kind: 'photo' });
}
return { ...(page ? { page: { total: all.length, elapsedMs: Date.now() - started } } : {}), resources, photos, skipped: { unanalysed, missing, notAnalysed, analysing } };
