const cfg = __CONFIG__;
// Selfie Aesthetic Edit — scene search (run_script, read only; adapted from the City Weekend Vlog search).
// The first config placeholder above is replaced by the panel/driver with JSON.parse("...") before running.
// cfg: { projectId, rids: rid[], queries: { [role]: text }, pageSize, parallel? (default 4), budgetMs? (default 22000) }
// Default roles and queries (they live in the panel config):
//   selfie     "close-up selfie of a person's face looking at the camera"
//   hand       "person touching their face or hair with a hand, close-up"
//   expression "person making a face, pouting or smiling at the camera, close-up"
//   glance     "person glancing away and back to the camera, close-up portrait"
//   control    "a landscape, street, room, food or object with no person"
// Scene search always returns hits, even for clips without a face; the planner compares each clip's face scores
// with its best control score (FACE_MARGIN) to decide what counts as a face hit.
// Returns { candidates: [{ rid, role, t, score }], failed: [rid], unanalysed: [rid], stats: { ms, waitedMs, rateLimited } };
// t and score are rounded to 3 decimals to keep the result small (run_script results are capped).
// Scene search needs analysis: clips that resources() reports without it are not searched and come back in
// `unanalysed` (not `failed`; the panel plans them from its quick local score). When resources() cannot be read,
// every clip is searched as before.
const p = selects.project(cfg.projectId);
const roles = Object.keys(cfg.queries);
let unanalysedSet = new Set();
try {
  const known = new Map((await p.resources()).map(r => [r.resourceId, r]));
  unanalysedSet = new Set(cfg.rids.filter(rid => known.has(rid) && !known.get(rid).hasAnalysis));
} catch (e) { unanalysedSet = new Set(); }
const jobs = [];
for (const rid of cfg.rids) if (!unanalysedSet.has(rid)) for (const role of roles) jobs.push({ rid, role });
const candidates = [];
const r3 = x => Math.round(x * 1000) / 1000;
// run_script has no setTimeout; Atomics.waitAsync on a private buffer waits without blocking. Without it, no wait.
const sleep = ms => {
  const atomics = Object(globalThis).Atomics;
  if (!(ms > 0) || !atomics || typeof atomics.waitAsync !== 'function') return Promise.resolve();
  const w = atomics.waitAsync(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
  return w.async ? w.value : Promise.resolve();
};
const started = Date.now();
// Stop starting new work after this long so the call returns inside run_script's 30 s deadline;
// what is left is reported as failed and retried by the next Build.
const budget = cfg.budgetMs == null ? 22000 : cfg.budgetMs;
// The backend answers rate_limited after roughly 28 parallel calls, so never more than 4 in flight.
const width = Math.max(1, Math.min(cfg.parallel || 4, 4));
const pageSize = Math.max(1, cfg.pageSize || 8); // the panel passes the bound
const backoff = [1000, 2000, 4000];
let pending = jobs, waited = 0, rateLimited = 0;
// The scene-search backend drops requests when the app is busy and answers rate_limited under load.
// Failed jobs are retried in later passes, after a 1 s, 2 s, then 4 s pause.
for (let pass = 0; pass < 4 && pending.length; pass++) {
  if (pass > 0) {
    const wait = backoff[pass - 1];
    if (Date.now() - started + wait > budget) break;
    await sleep(wait);
    waited += wait;
  }
  const failed = [], queue = pending.slice();
  const worker = async () => {
    for (let job = queue.shift(); job; job = queue.shift()) {
      if (Date.now() - started > budget) { failed.push(job); continue; }
      try {
        const page = await p.resource(job.rid).searchScenes(cfg.queries[job.role], { pageSize });
        if (!page || page.error) { if (page && /rate_limited/.test(String(page.error))) rateLimited++; failed.push(job); continue; }
        for (const h of page.results || []) candidates.push({ rid: job.rid, role: job.role, t: r3(h.timeSeconds), score: r3(h.score) });
      } catch (e) {
        if (/rate_limited/.test(String(e && e.message || e))) rateLimited++;
        failed.push(job);
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(width, queue.length) }, worker));
  pending = failed;
}
return { candidates, failed: [...new Set(pending.map(j => j.rid))], unanalysed: [...unanalysedSet], stats: { ms: Date.now() - started, waitedMs: waited, rateLimited } };
