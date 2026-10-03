const cfg = __CONFIG__;
// Selfie Aesthetic Edit — inventory (run_script, read only; adapted from the City Weekend Vlog inventory).
// The first config placeholder above is replaced by the panel/driver with JSON.parse("...") before running.
// cfg: { projectId, only: rid[] | null, known?: { [rid]: { width, height } }, measureMs?: number (default 8000) }
// Returns { resources: [video], photos: [photo], skipped: { unanalysed, missing, short }, counts: { analysed, unanalysed, analysing } }.
//   resources: every usable video, analysed or not: { rid, name, duration, width, height, recordedAt, kind: 'video',
//     path (its source file, null when sourceFiles() has none), analysed (hasAnalysis) }. An analysed video is usable
//     with a length of at least MIN_VIDEO_SECONDS (as before). An unanalysed one also needs its source file in
//     sourceFiles(): Selects builds from imported files without analysis (the panel scores them locally), and a clip
//     imported without startAnalysis stays status 'pending' forever, so the status says nothing about readiness.
//   skipped.unanalysed: unanalysed videos that cannot be used YET (no length or no source file: still importing).
//     skipped.missing: analysed videos without a length; skipped.short: videos under MIN_VIDEO_SECONDS (both kinds).
//   counts (informational): usable analysed / unanalysed videos, and how many of the unanalysed ones Selects is
//     analysing right now (status sampling / analyzing), so the panel can refresh when better picks become possible.
// Nothing here imports, commits or edits a saved Draft.
const MIN_VIDEO_SECONDS = 1.2;
const p = selects.project(cfg.projectId);
const all = await p.resources();
const page = Object(cfg).page;
const pageRows = page ? all.slice(page.offset, page.offset + page.size) : all;
const pageIds = new Set(pageRows.map(r => r.resourceId));
const inPage = r => pageIds.has(r.resourceId);
const sizes = {}, paths = {};
const walk = nodes => { for (const n of nodes || []) { if (n.type === 'dir') walk(n.children); else if (n.resourceId) { sizes[n.resourceId] = n.frameSize || null; paths[n.resourceId] = n.path || null; } } };
// Right after an app start the SDK's sourceFiles() can throw "Cannot read properties of undefined (reading 'reduce')"
// on a partly loaded file tree (seen live on Staging, 2026-10-01); it reads fine a moment later, so retry twice.
// run_script has no setTimeout: Atomics.waitAsync on a private buffer waits without blocking.
const pause = ms => {
  const atomics = Object(globalThis).Atomics;
  if (!atomics || typeof atomics.waitAsync !== 'function') return Promise.resolve();
  const w = atomics.waitAsync(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
  return w.async ? w.value : Promise.resolve();
};
const readTree = async (opts = null) => {
  for (let i = 0; ; i++) {
    try { return opts ? await p.sourceFiles(opts) : await p.sourceFiles(); }
    catch (e) { if (i >= 2 || !/reduce/.test(String((e && e.message) || e))) throw e; await pause(400 * (i + 1)); }
  }
};
const files = await readTree();
if ('fileTree' in files) walk(files.fileTree);
else for (const f of files.folders || []) { const d = await readTree({ folder: f.name }); if ('fileTree' in d) walk(d.fileTree); }
const wanted = r => !cfg.only || cfg.only.includes(r.resourceId);
const recordedAt = r => (r.recording && (r.recording.recordedAt || r.recording.filenameTimestamp || r.recording.creationAt)) || null;
const video = all.filter(r => r.type === 'Video' && wanted(r));
const ids = new Set(video.map(r => r.resourceId));
const resources = [];
let unanalysed = 0, missing = 0, short = 0;
const ANALYSING = ['sampling', 'samplingSucceeded', 'analyzing', 'analyzingSucceeded'];
const counts = { analysed: 0, unanalysed: 0, analysing: 0 };
for (const r of video.filter(inPage)) {
  if (r.owningSyncedSequenceResourceId && ids.has(r.owningSyncedSequenceResourceId)) continue;
  const analysed = !!r.hasAnalysis;
  const size = sizes[r.resourceId];
  const path = paths[r.resourceId] || null;
  if (!analysed && (!(r.durationSeconds > 0) || !path)) { unanalysed++; continue; }
  if (!(r.durationSeconds > 0)) { missing++; continue; }
  // A bar needs two 1-beat windows plus a tail; clips shorter than this cannot hold one.
  if (r.durationSeconds < MIN_VIDEO_SECONDS) { short++; continue; }
  if (analysed) counts.analysed++;
  else { counts.unanalysed++; if (ANALYSING.includes(r.status)) counts.analysing++; }
  resources.push({ rid: r.resourceId, name: r.name, duration: r.durationSeconds, width: size ? size.width : null, height: size ? size.height : null, recordedAt: recordedAt(r), kind: 'video', path, analysed });
}
// Photos (Image resources) have no analysis and no scene search; they are placed whole. sourceFiles() often reports no
// frameSize for them, so an unsaved scratch Draft measures each one: a new Draft adopts its first clip's frame size.
// Nothing is committed. Sizes the panel already knows (cfg.known) are reused, and measuring stops after
// cfg.measureMs (default 8 s) so the call stays well inside run_script's deadline; the rest stay null for now
// and assemble.js measures any photo it places without a size.
const known = cfg.known || {};
const budget = cfg.measureMs == null ? 8000 : cfg.measureMs;
const started = Date.now();
const photos = [];
for (const r of all.filter(r => r.type === 'Image' && wanted(r) && inPage(r))) {
  let size = sizes[r.resourceId] || known[r.resourceId] || null;
  if (!(size && size.width > 0 && size.height > 0) && Date.now() - started < budget) {
    try {
      const scratch = await p.createDraft({ name: 'Selfie Aesthetic Edit size check' });
      await scratch.insertResource({ resourceId: r.resourceId, sourceRange: { startSeconds: 0, endSeconds: 0.5 } });
      size = (await scratch.meta()).frameSize;
    } catch (e) { size = null; }
  }
  const ok = size && size.width > 0 && size.height > 0;
  photos.push({ rid: r.resourceId, name: r.name, width: ok ? size.width : null, height: ok ? size.height : null, recordedAt: recordedAt(r), kind: 'photo' });
}
return { ...(page ? { page: { total: all.length, elapsedMs: Date.now() - started } } : {}), resources, photos, skipped: { unanalysed, missing, short }, counts };
