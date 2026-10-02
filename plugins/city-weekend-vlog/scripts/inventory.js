const cfg = __CONFIG__;
const p = selects.project(cfg.projectId);
const all = await p.resources();
const sizes = {}, paths = {};
const walk = nodes => { for (const n of nodes || []) { if (n.type === 'dir') walk(n.children); else if (n.resourceId) { sizes[n.resourceId] = n.frameSize || null; paths[n.resourceId] = n.path || null; } } };
const files = await p.sourceFiles();
if ('fileTree' in files) walk(files.fileTree);
else for (const f of files.folders || []) { const d = await p.sourceFiles({ folder: f.name }); if ('fileTree' in d) walk(d.fileTree); }
const wanted = r => !cfg.only || cfg.only.includes(r.resourceId);
const recordedAt = r => (r.recording && (r.recording.recordedAt || r.recording.filenameTimestamp || r.recording.creationAt)) || null;
const video = all.filter(r => r.type === 'Video' && wanted(r));
const ids = new Set(video.map(r => r.resourceId));
const resources = [];
// Analysis is optional: a video is usable once it has a length and a source file on disk, whatever its status (clips
// imported without analysis stay 'pending'). Analysed videos get the scene search; the others a quick local check of
// their frames in the panel (`analysed: false`, with `path` for the host's ffmpeg). skipped.unanalysed counts only
// videos that cannot be used yet (no length or no file); skipped.notAnalysed the usable ones without analysis.
let unanalysed = 0, missing = 0, notAnalysed = 0;
for (const r of video) {
  if (r.owningSyncedSequenceResourceId && ids.has(r.owningSyncedSequenceResourceId)) continue;
  const size = sizes[r.resourceId];
  if (!(r.durationSeconds > 0)) { if (r.hasAnalysis) missing++; else unanalysed++; continue; }
  if (!r.hasAnalysis && !paths[r.resourceId]) { unanalysed++; continue; }
  if (!r.hasAnalysis) notAnalysed++;
  resources.push({ rid: r.resourceId, name: r.name, duration: r.durationSeconds, width: size ? size.width : null, height: size ? size.height : null, recordedAt: recordedAt(r), kind: 'video',
    analysed: !!r.hasAnalysis, path: paths[r.resourceId] || null });
}
// Photos (Image resources) have no analysis and no scene search; they are placed whole. sourceFiles() reports no
// frameSize for them, so an unsaved scratch Draft measures each one: a new Draft adopts its first clip's frame size.
// Nothing is committed. Sizes the panel already knows (cfg.known) are reused, and measuring stops after
// cfg.measureMs (default 8 s) so the call stays well inside run_script's deadline; the rest stay null for now
// and assemble.js measures any photo it places without a size.
const known = cfg.known || {};
const budget = cfg.measureMs == null ? 8000 : cfg.measureMs;
const started = Date.now();
const photos = [];
for (const r of all.filter(r => r.type === 'Image' && wanted(r))) {
  let size = sizes[r.resourceId] || known[r.resourceId] || null;
  if (!(size && size.width > 0 && size.height > 0) && Date.now() - started < budget) {
    try {
      const scratch = await p.createDraft({ name: 'City Weekend Vlog size check' });
      await scratch.insertResource({ resourceId: r.resourceId, sourceRange: { startSeconds: 0, endSeconds: 0.5 } });
      size = (await scratch.meta()).frameSize;
    } catch (e) { size = null; }
  }
  const ok = size && size.width > 0 && size.height > 0;
  photos.push({ rid: r.resourceId, name: r.name, width: ok ? size.width : null, height: ok ? size.height : null, recordedAt: recordedAt(r), kind: 'photo' });
}
return { resources, photos, skipped: { unanalysed, missing, notAnalysed } };
