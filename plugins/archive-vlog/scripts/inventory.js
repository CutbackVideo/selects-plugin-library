const cfg = __CONFIG__;
const p = selects.project(cfg.projectId);
// A Project still loading (right after an app restart) can hand back missing lists and fields, and the SDK's own
// sourceFiles() formatting throws on a missing file tree. Every list read here defaults to [], every field is
// checked, and a read that fails or comes back malformed marks the inventory `incomplete` (the panel re-reads it)
// instead of failing the call. `loose` drops the SDK types so these checks stay legal TypeScript. Only resources()
// throwing still fails the call: with nothing read, the panel retries rather than show an empty Project.
const loose = v => v;
let incomplete = false;
const list = v => { if (Array.isArray(v)) return v; incomplete = true; return []; };
const all = list(loose(await p.resources())).filter(r => r && typeof r === 'object' && typeof r.resourceId === 'string' && r.resourceId);
const page = Object(cfg).page;
const pageRows = page ? all.slice(page.offset, page.offset + page.size) : all;
const pageIds = new Set(pageRows.map(r => r.resourceId));
const inPage = r => pageIds.has(r.resourceId);
const sizes = {}, paths = {};
const walk = nodes => {
  for (const n of Array.isArray(nodes) ? nodes : []) {
    if (!n || typeof n !== 'object') continue;
    if (n.type === 'dir') { walk(n.children); continue; }
    if (!n.resourceId) continue;
    sizes[n.resourceId] = n.frameSize || null;
    if (typeof n.path === 'string' && n.path) paths[n.resourceId] = n.path;
  }
};
const readFiles = async opts => { try { return loose(await (opts ? p.sourceFiles(opts) : p.sourceFiles())); } catch (e) { incomplete = true; return null; } };
const files = await readFiles(null);
if (!files || typeof files !== 'object') incomplete = true;
else if ('fileTree' in files) walk(files.fileTree);
else for (const f of list(files.folders)) {
  if (!f || typeof f.name !== 'string') continue;
  const d = await readFiles({ folder: f.name });
  if (d && typeof d === 'object' && 'fileTree' in d) walk(d.fileTree); else incomplete = true;
}
const wanted = r => !cfg.only || cfg.only.includes(r.resourceId);
const recordedAt = r => (r.recording && (r.recording.recordedAt || r.recording.filenameTimestamp || r.recording.creationAt)) || null;
const nameOf = r => (typeof r.name === 'string' && r.name) || r.resourceId;
const video = all.filter(r => r.type === 'Video' && wanted(r));
const ids = new Set(video.map(r => r.resourceId));
const resources = [];
// Videos are usable with or without Selects' analysis (no build waits for it): an analysed one needs its length, an
// unanalysed one its length and its source file (the panel scores it from the file with the host's ffmpeg; a template
// run places it on evenly spaced windows). Unanalysed imports stay status 'pending', so the status is never a gate.
// skipped: `unanalysed` = videos without analysis that cannot be used yet (no length or no file: still importing),
// `missing` = analysed videos without a length, `notAnalysed` = usable videos without analysis (in `resources` with
// analysed: false), `analysing` = those of them Selects is analysing now (sampling or analysing; informational: the
// panel re-reads the inventory until they finish, so later builds use their analysis).
const ANALYSING = ['sampling', 'samplingSucceeded', 'analyzing', 'analyzingSucceeded'];
let unanalysed = 0, missing = 0, notAnalysed = 0, analysing = 0;
for (const r of video.filter(inPage)) {
  if (r.owningSyncedSequenceResourceId && ids.has(r.owningSyncedSequenceResourceId)) continue;
  const size = sizes[r.resourceId];
  const hasLength = typeof r.durationSeconds === 'number' && r.durationSeconds > 0;
  const analysed = r.hasAnalysis === true;
  const path = paths[r.resourceId] || null;
  if (!analysed && !(hasLength && path)) { unanalysed++; continue; }
  if (!hasLength) { missing++; continue; }
  if (!analysed) { notAnalysed++; if (ANALYSING.includes(r.status)) analysing++; }
  resources.push({ rid: r.resourceId, name: nameOf(r), duration: r.durationSeconds, width: size ? size.width : null, height: size ? size.height : null, recordedAt: recordedAt(r),
    kind: 'video', analysed, path });
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
for (const r of all.filter(r => r.type === 'Image' && wanted(r) && inPage(r))) {
  let size = sizes[r.resourceId] || known[r.resourceId] || null;
  if (!(size && size.width > 0 && size.height > 0) && Date.now() - started < budget) {
    try {
      const scratch = await p.createDraft({ name: 'Archive Vlog size check' });
      await scratch.insertResource({ resourceId: r.resourceId, sourceRange: { startSeconds: 0, endSeconds: 0.5 } });
      size = ((await scratch.meta()) || {}).frameSize;
    } catch (e) { size = null; }
  }
  const ok = size && size.width > 0 && size.height > 0;
  photos.push({ rid: r.resourceId, name: nameOf(r), width: ok ? size.width : null, height: ok ? size.height : null, recordedAt: recordedAt(r), kind: 'photo' });
}
return { ...(page ? { page: { total: all.length, elapsedMs: Date.now() - started } } : {}), resources, photos, skipped: { unanalysed, missing, notAnalysed, analysing }, incomplete };
