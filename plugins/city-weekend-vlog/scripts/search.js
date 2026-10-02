const cfg = __CONFIG__;
const p = selects.project(cfg.projectId);
const roles = Object.keys(cfg.queries);
// Scene search needs analysis. Clips without it are not searched: they come back in `local` (rid, source path,
// length) for the panel's quick local check. When the resource list cannot be read, every clip is searched as before.
let local = [];
try {
  const info = {};
  for (const r of await p.resources()) info[r.resourceId] = r;
  const bare = cfg.rids.filter(rid => info[rid] && !info[rid].hasAnalysis);
  if (bare.length) {
    const paths = {};
    const walk = nodes => { for (const n of nodes || []) { if (n.type === 'dir') walk(n.children); else if (n.resourceId) paths[n.resourceId] = n.path || null; } };
    const files = await p.sourceFiles();
    if ('fileTree' in files) walk(files.fileTree);
    else for (const f of files.folders || []) { const d = await p.sourceFiles({ folder: f.name }); if ('fileTree' in d) walk(d.fileTree); }
    local = bare.map(rid => ({ rid, path: paths[rid] || null, duration: info[rid].durationSeconds || 0 }));
  }
} catch (e) { local = []; }
const skip = new Set(local.map(x => x.rid));
const jobs = [];
for (const rid of cfg.rids) if (!skip.has(rid)) for (const role of roles) jobs.push({ rid, role });
const candidates = [];
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
const width = cfg.parallel || 4;
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
        const page = await p.resource(job.rid).searchScenes(cfg.queries[job.role], { pageSize: cfg.pageSize });
        if (!page || page.error) { if (page && /rate_limited/.test(String(page.error))) rateLimited++; failed.push(job); continue; }
        for (const h of page.results) candidates.push({ rid: job.rid, role: job.role, t: h.timeSeconds, score: h.score });
      } catch (e) {
        if (/rate_limited/.test(String(e && e.message || e))) rateLimited++;
        failed.push(job);
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(width, queue.length) }, worker));
  pending = failed;
}
return { candidates, failed: [...new Set(pending.map(j => j.rid))], local, stats: { ms: Date.now() - started, waitedMs: waited, rateLimited } };
