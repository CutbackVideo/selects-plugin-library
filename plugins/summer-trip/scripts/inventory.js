const cfg = __CONFIG__;
const p = selects.project(cfg.projectId);
const all = await p.resources();
const sizes = {}, paths = {};
const walk = nodes => { for (const n of nodes || []) { if (n.type === 'dir') walk(n.children); else if (n.resourceId) { sizes[n.resourceId] = n.frameSize || null; if (n.path) paths[n.resourceId] = n.path; } } };
const files = await p.sourceFiles();
if ('fileTree' in files) walk(files.fileTree);
else for (const f of files.folders || []) { const d = await p.sourceFiles({ folder: f.name }); if ('fileTree' in d) walk(d.fileTree); }
const wanted = r => !cfg.only || cfg.only.includes(r.resourceId);
const recordedAt = r => (r.recording && (r.recording.recordedAt || r.recording.creationAt || r.recording.filenameTimestamp)) || null;
// Capture month (1-12) read from the date text itself ("2026-07-14T…" or EXIF "2026:07:14 …"), so a time zone never
// moves a date across a month boundary.
const monthOf = s => {
  const m = /^(\d{4})[-:](\d{2})/.exec(String(s || ''));
  const n = m ? Number(m[2]) : NaN;
  return n >= 1 && n <= 12 ? n : null;
};
const started = Date.now();

// Capture dates for the season word (spec 15.8): the Resource's recording dates first; for the rest (photos report
// none today), selects.media.probe on the files, within cfg.probeMs (default 4 s). Counted over the whole Project,
// whatever `only` narrows.
const captured = {};
for (const r of all) if (r.type === 'Video' || r.type === 'Image') captured[r.resourceId] = recordedAt(r);
const toProbe = Object.keys(captured).filter(id => !captured[id] && paths[id]).slice(0, cfg.probeMax || 200);
const probeBudget = cfg.probeMs == null ? 4000 : cfg.probeMs;
let probed = 0;
const media = Object(selects).media;
if (toProbe.length && probeBudget > 0 && media && typeof media.probe === 'function') {
  try {
    const out = await media.probe({ filePaths: toProbe.map(id => paths[id]) });
    const byPath = {};
    for (const f of (out && out.files) || []) byPath[f.path] = f;
    for (const id of toProbe) {
      const f = byPath[paths[id]];
      if (!f || !f.dates) continue;
      // recorded is the most reliable; an encoded date is a transcode date when encodedBy is set.
      const keys = ['recorded', 'creation', 'filenameTimestamp'].concat(f.encodedBy ? [] : ['encoded']);
      const k = keys.find(x => monthOf(f.dates[x]));
      if (k) { captured[id] = f.dates[k]; probed++; }
    }
  } catch (e) { /* capture dates stay unknown; the season falls back to SUMMER */ }
}
const months = Array(12).fill(0);
for (const id of Object.keys(captured)) { const m = monthOf(captured[id]); if (m) months[m - 1]++; }

const video = all.filter(r => r.type === 'Video' && wanted(r));
const ids = new Set(video.map(r => r.resourceId));
const resources = [];
// Every video is usable once imported, whatever its analysis state (a clip without analysis gets local candidates in
// the panel instead of scene search). Imported without analysis, a clip reads status 'pending' (the SDK's startAnalysis
// target), so status never decides: an analysed video needs a length, as before; one without analysis needs a length
// and a source file path (the panel's quick score decodes the file). Each resource reports hasAnalysis and status.
// skipped.unanalysed: videos without analysis that cannot be used yet (no length or no file path; the Clip highlights
// template's wording reads this field). skipped.withoutAnalysis: usable videos without analysis. skipped.missing:
// analysed videos without a length.
let unanalysed = 0, missing = 0, withoutAnalysis = 0;
// Analysis status of every video without analysis (usable or not), for information only: being analysed now, never
// started (the panel never starts analysis itself) or failed. Resources queued by startAnalysis can still read status
// 'pending', so a queued or running workflow for the clip (or a running project:create fan-out) counts it as being
// analysed. One workflows() read; if it fails, a pending clip is counted as not analysed and statusKnown is false.
// Members of a Synced Timeline in the set are left out (the timeline itself is used).
const own = video.filter(r => !(r.owningSyncedSequenceResourceId && ids.has(r.owningSyncedSequenceResourceId)));
const waiting = own.filter(r => !r.hasAnalysis);
const busyRids = new Set();
let fanout = false, statusKnown = true;
if (waiting.some(r => r.status === 'pending')) {
  try {
    for (const w of await p.workflows()) {
      if (w.status !== 'queued' && w.status !== 'running') continue;
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
for (const r of own) {
  const analysed = !!r.hasAnalysis;
  const size = sizes[r.resourceId];
  if (!(r.durationSeconds > 0) || (!analysed && !paths[r.resourceId])) { if (analysed) missing++; else unanalysed++; continue; }
  if (!analysed) withoutAnalysis++;
  resources.push({ rid: r.resourceId, name: r.name, duration: r.durationSeconds, width: size ? size.width : null, height: size ? size.height : null,
    recordedAt: recordedAt(r), capturedAt: captured[r.resourceId] || null, month: monthOf(captured[r.resourceId]), kind: 'video',
    hasAnalysis: analysed, status: r.status || null, path: paths[r.resourceId] || null });
}
// Photos (Image resources) have no analysis and no scene search; they are placed whole. sourceFiles() reports no
// frameSize for them, so an unsaved scratch Draft measures each one: a new Draft adopts its first clip's frame size.
// Nothing is committed. Sizes the panel already knows (cfg.known) are reused, and measuring stops after
// cfg.measureMs (default 8 s) so the call stays inside run_script's deadline; assemble.js measures any photo it
// places without a size.
const known = cfg.known || {};
const budget = cfg.measureMs == null ? 8000 : cfg.measureMs;
const photos = [];
for (const r of all.filter(r => r.type === 'Image' && wanted(r))) {
  let size = sizes[r.resourceId] || known[r.resourceId] || null;
  if (!(size && size.width > 0 && size.height > 0) && Date.now() - started < budget) {
    try {
      const scratch = await p.createDraft({ name: 'Summer Trip size check' });
      await scratch.insertResource({ resourceId: r.resourceId, sourceRange: { startSeconds: 0, endSeconds: 0.5 } });
      size = (await scratch.meta()).frameSize;
    } catch (e) { size = null; }
  }
  const ok = size && size.width > 0 && size.height > 0;
  photos.push({ rid: r.resourceId, name: r.name, width: ok ? size.width : null, height: ok ? size.height : null,
    recordedAt: recordedAt(r), capturedAt: captured[r.resourceId] || null, month: monthOf(captured[r.resourceId]), kind: 'photo' });
}
return { resources, photos, months, skipped: { unanalysed, withoutAnalysis, missing, analysing, notAnalysed, failed, statusKnown }, captureDates: { known: months.reduce((a, n) => a + n, 0), probed } };
