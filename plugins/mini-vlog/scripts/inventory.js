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
const sizes = {};
const walk = nodes => { for (const n of Array.isArray(nodes) ? nodes : []) { if (!n || typeof n !== 'object') continue; if (n.type === 'dir') walk(n.children); else if (n.resourceId) sizes[n.resourceId] = n.frameSize || null; } };
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
let unanalysed = 0, missing = 0;
// Videos without analysis, by why: being analysed now, never started (the panel never starts analysis itself), or
// failed. Resources queued by startAnalysis can still read status 'pending', so a queued or running workflow for the
// clip (or a running project:create fan-out) counts it as being analysed. One workflows() read; if it fails, a
// pending clip is counted as not analysed and statusKnown is false, so the panel words it neutrally.
// A workflows() list that is not an array counts as a failed read too; it never marks the inventory incomplete.
const waiting = video.filter(r => !r.hasAnalysis);
const busyRids = new Set();
let fanout = false, statusKnown = true;
if (waiting.some(r => r.status === 'pending')) {
  try {
    const flows = loose(await p.workflows());
    if (!Array.isArray(flows)) statusKnown = false;
    else for (const w of flows) {
      if (!w || typeof w !== 'object' || (w.status !== 'queued' && w.status !== 'running')) continue;
      if (w.type === 'project:create') fanout = true;
      else if (w.type === 'project:analyze-resource' && w.resourceId) busyRids.add(w.resourceId);
    }
  } catch (e) { statusKnown = false; }
}
const ANALYSING = ['sampling', 'samplingSucceeded', 'analyzing', 'analyzingSucceeded'];
let analysing = 0, notAnalysed = 0, failed = 0;
for (const r of waiting) {
  if (ANALYSING.includes(r.status) || (r.status === 'pending' && statusKnown && (fanout || busyRids.has(r.resourceId)))) analysing++;
  else if (r.status === 'samplingFailed' || r.status === 'analyzingFailed') failed++;
  else notAnalysed++;
}
for (const r of video) {
  if (!r.hasAnalysis) { unanalysed++; continue; }
  if (r.owningSyncedSequenceResourceId && ids.has(r.owningSyncedSequenceResourceId)) continue;
  const size = sizes[r.resourceId];
  if (!(typeof r.durationSeconds === 'number' && r.durationSeconds > 0)) { missing++; continue; }
  resources.push({ rid: r.resourceId, name: nameOf(r), duration: r.durationSeconds, width: size ? size.width : null, height: size ? size.height : null, recordedAt: recordedAt(r), kind: 'video' });
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
      const scratch = await p.createDraft({ name: 'Mini Vlog size check' });
      await scratch.insertResource({ resourceId: r.resourceId, sourceRange: { startSeconds: 0, endSeconds: 0.5 } });
      size = ((await scratch.meta()) || {}).frameSize;
    } catch (e) { size = null; }
  }
  const ok = size && size.width > 0 && size.height > 0;
  photos.push({ rid: r.resourceId, name: nameOf(r), width: ok ? size.width : null, height: ok ? size.height : null, recordedAt: recordedAt(r), kind: 'photo' });
}
return { resources, photos, skipped: { unanalysed, missing, analysing, notAnalysed, failed, statusKnown }, incomplete };
