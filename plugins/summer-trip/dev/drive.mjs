#!/usr/bin/env node
// plugins/summer-trip/dev/drive.mjs
// Dev-only: headless, panel-equivalent Summer Trip builds from a matrix, with the Summer Trip readback checks.
// Uses the selects-app-kit MCP client and readback helpers ($SELECTS_APP_KIT, default ~/Workspaces/selects-app-kit)
// and dev/adapter.mjs for everything style-specific. See --help.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { createAdapter, expandEnv } from './adapter.mjs';
import { stCheck } from './expect.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PLUGIN = path.resolve(HERE, '..');
const KIT = path.resolve(process.env.SELECTS_APP_KIT || path.join(os.homedir(), 'Workspaces', 'selects-app-kit'));
const kit = rel => import(pathToFileURL(path.join(KIT, rel)).href);

const HELP = `drive.mjs - build Summer Trip Drafts headlessly (the panel's Build through run_script) and check them

Usage (from the repository root):
  node plugins/summer-trip/dev/drive.mjs --matrix <matrix.json> --check                  offline coverage check
  node plugins/summer-trip/dev/drive.mjs --matrix <m> --key <row> [--seed N] --plan-only  inventory + search + plan, no writes
  node plugins/summer-trip/dev/drive.mjs --matrix <m> --key <row> [--seed N] [--project <pid>] [--out <dir>]
  node plugins/summer-trip/dev/drive.mjs --matrix <m> --all [--out <dir>]                 every row x its seeds

Stages: inventory -> search (cached) -> plan -> ensure-audio -> assemble -> decorate -> readback + checks
[-> capture / export]. ensure-audio, assemble and decorate commit (they create a Draft and import audio).

Options:
  --matrix <file>        Rows (array or { rows }); keys in dev/adapter.mjs. \${ENV} placeholders are expanded.
  --project <pid>        Overrides every row's pid.
  --out <dir>            Records and caches (default $TMPDIR/selects-drive/summer-trip). Per build: rec-<key>-s<seed>.json
                         (inputs, plan, frame schedule, visible events, assemble/decorate returns, readback, checks),
                         cuts-<key>-s<seed>.json (eval-beat-sync.cjs --cuts), events-<key>-s<seed>.json.
                         Caches: inventory-<pid>.json, search-<pid>.json (failed rids retried), fps-<pid>.json.
  --installed-dir <d>    Installed plugin (bundled cues are imported from there, like the panel; default
                         ~/.selects/skills/summer-trip, env SELECTS_PLUGIN_INSTALLED_DIR). Dev cues fall back to this
                         checkout's assets/cues/dev-*.
  --work <dir>           Decoded sound effects and baked own-music muffles (default ~/.selects/plugin-data/summer-trip/drive,
                         env ST_DRIVE_WORK). Must be readable by the Selects app.
  --inventory/--search   Use these JSON files instead of reading/searching (offline --plan-only with both).
  --fps <n>              Planning fps guess (default: fps-<pid>.json from an earlier build, else 30).
  --rebuild-on-fps       When the Draft's real fps differs from the guess and a plan at the real fps picks other
                         shots, build again with that plan (the first Draft stays in the Project).
  --no-readback          Skip readback and checks.
  --capture              captureFrames at the grid states, the place title and the ending into <out>/cap-<key>-s<seed>/.
  --export               SD export to <out>/exp-<key>-s<seed>.mp4 (for eval-beat-sync.cjs and frame sheets).
  --timeout <s>          run_script timeout per stage (default 30, the panel's deadline).
  --app/--port           Selects app (default Staging, port 23101; see the kit's tools/README.md).
Env: SELECTS_APP_KIT (kit checkout), FFMPEG_DIR (ffmpeg/ffprobe for own music and the audio-stream probe).

Output: one JSON line per build on stdout ({ key, seed, seq, pass, checks, notes, timings }); progress on stderr.
Exit 1 when a build failed or did not pass; 2 on usage errors or when the app is not reachable.
`;

// The kit's argv parser, copied so --help and --check run without the kit: --k v, --k=v, boolean flags.
function parseArgs(argv, { flags = [] } = {}) {
  const o = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '-h') { o.help = true; continue; }
    if (!a.startsWith('--') || a === '--') { o._.push(a); continue; }
    let k = a.slice(2), v;
    const eq = k.indexOf('=');
    if (eq >= 0) { v = k.slice(eq + 1); k = k.slice(0, eq); } else if (flags.includes(k) || k === 'help') v = true; else v = argv[++i];
    o[k] = v;
  }
  return o;
}
const o = parseArgs(process.argv.slice(2), { flags: ['all', 'check', 'plan-only', 'no-readback', 'capture', 'export', 'rebuild-on-fps'] });
if (o.help || !o.matrix) { process.stdout.write(HELP); process.exit(o.help ? 0 : 2); }

const read = rel => fs.readFileSync(path.join(PLUGIN, rel), 'utf8');
const readJson = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const adapter = await createAdapter({ pluginDir: PLUGIN, installedDir: o['installed-dir'], read, workDir: o.work });
const m = readJson(o.matrix);
const MATRIX = (Array.isArray(m) ? m : m.rows).map(r => expandEnv(o.project ? { ...r, pid: o.project } : r));
const OUT = path.resolve(o.out || path.join(os.tmpdir(), 'selects-drive', adapter.id));
fs.mkdirSync(OUT, { recursive: true });
const TIMEOUT = Number(o.timeout) || 30;

if (o.check) {
  const bad = MATRIX.filter(r => !r.key || !r.pid).map(r => r.key || JSON.stringify(r).slice(0, 60));
  const dup = MATRIX.map(r => r.key).filter((k, i, a) => a.indexOf(k) !== i);
  const res = adapter.checkMatrix(MATRIX);
  console.log(JSON.stringify({ rows: MATRIX.length, builds: MATRIX.reduce((n, r) => n + (r.seeds || [1]).length, 0), missingKeyOrPid: bad, duplicateKeys: dup, ...res }, null, 1));
  const ok = res.ok && !bad.length && !dup.length;
  console.log('matrix', ok ? 'OK' : 'FAIL');
  process.exit(ok ? 0 : 1);
}

const { SelectsMcp, fillConfig, saveImages } = await kit('tools/selects-mcp/client.mjs');
let mcp = null;
const client = () => (mcp ||= new SelectsMcp({ port: o.port, app: o.app, clientName: 'summer-trip-drive' }));

async function run(step, ctx) {
  const source = typeof step.script === 'string' ? read(step.script) : step.script.source;
  const script = step.config === undefined ? source : fillConfig(source, step.config);
  const t0 = Date.now();
  const { payload, texts, images, isError } = await client().runScript({ script, summary: 'ST ' + ctx.row.key + ': ' + step.summary, allowCommit: !!step.allowCommit, timeoutSeconds: step.timeout || TIMEOUT });
  const wall = Date.now() - t0;
  ctx.timings.push({ step: step.summary, wall, server: payload ? payload.durationMs : null, error: !payload || isError || !!(payload && payload.error) });
  console.error(`[${ctx.row.key} ${step.summary}] wall ${wall} ms, server ${payload ? payload.durationMs : '-'} ms`);
  if (!payload || isError || payload.error || payload.result == null) throw Error(step.summary + ': ' + (payload ? JSON.stringify(payload).slice(0, 1200) : texts.join('\n').slice(0, 1200)));
  return { result: payload.result, images };
}

// Grid rows (effects, transform, routing) and every clip's level/fades; allowCommit false, nothing is saved.
// Pass 1: a no-op fade-in returns volumeDb and fadeOutSeconds (kit readback trick). Pass 2 (a fresh working copy):
// re-setting the fade-out it just read returns the fade-in.
const extraScript = (seq, pass, fadeOuts) => `const d = selects.draft(${JSON.stringify(seq)});
const all: any[] = await d.clips({ trackScope: "all" });
const video: any[] = [];
${pass === 1 ? `for (const c of all.filter((x: any) => x.trackKind === "video" && x.resourceId)) {
  const fx = (await d.videoEffects(c)).map((e: any) => e.name || e.effectName);
  let t: any = null; try { t = await d.clipTransform(c); } catch (e) { t = null; }
  video.push({ rid: c.resourceId, s: c.startFrame, e: c.endFrame, asi: c.audioSourceIndexes, fx, t });
}` : ''}
const ids = all.filter((c: any) => ["main", "video", "audio"].includes(c.trackKind) && c.resourceId).map((c: any) => c.clipId);
const fadeOuts: any = ${JSON.stringify(fadeOuts || {})};
const levels: any[] = [];
for (const id of ids) {
  const c: any = (await d.clips({ trackScope: "all" })).find((x: any) => x.clipId === id);
  let r: any = null;
  try { r = ${pass === 1 ? 'await d.setClipAudio({ clip: c, fadeInSeconds: 0 })' : 'await d.setClipAudio({ clip: c, fadeOutSeconds: Number(fadeOuts[id]) || 0 })'}; } catch (e) { r = { error: String(e) }; }
  levels.push({ id, kind: c.trackKind, rid: c.resourceId, s: c.startFrame, e: c.endFrame, db: r && r.volumeDb, keys: r && r.volumeKeys, fadeIn: r && r.fadeInSeconds, fadeOut: r && r.fadeOutSeconds, error: r && r.error });
}
return { video, levels };`;

async function readback(seq, row, ctx) {
  const { fetchReadback } = await kit('tools/drive/readback.mjs');
  const rb = await fetchReadback(client(), { sequenceId: seq, projectId: row.pid, volumes: false, summaryPrefix: 'ST ' + row.key + ': ' });
  const p1 = (await run({ summary: 'Read clip levels', script: { source: extraScript(seq, 1) } }, ctx)).result;
  const fadeOuts = Object.fromEntries(p1.levels.map(l => [l.id, l.fadeOut]));
  const p2 = (await run({ summary: 'Read clip fades', script: { source: extraScript(seq, 2, fadeOuts) } }, ctx)).result;
  const fadeIn = Object.fromEntries(p2.levels.map(l => [l.id, l.fadeIn]));
  rb.st = { video: p1.video, levels: p1.levels.map(l => ({ ...l, fadeIn: fadeIn[l.id] ?? null })) };
  // hasAudio (ffprobe) covers the Main rows' sources only; a grid panel whose source is not also on Main counts as
  // silent in the routing check.
  return rb;
}

async function build(row, seed) {
  const ctx = { row, seed, timings: [] };
  const t0 = Date.now();
  const fpsCache = path.join(OUT, 'fps-' + row.pid + '.json');
  const r = { ...row };
  if (o.fps) r.fps = Number(o.fps);
  else if (!r.fps && fs.existsSync(fpsCache)) r.fps = readJson(fpsCache).fps;

  const invCache = path.join(OUT, 'inventory-' + row.pid + '.json');
  let inv;
  if (o.inventory) inv = readJson(o.inventory);
  else if (o['plan-only'] && fs.existsSync(invCache)) inv = readJson(invCache);
  else { inv = (await run(adapter.inventory(row, { readOnly: !!o['plan-only'] }), ctx)).result; fs.writeFileSync(invCache, JSON.stringify(inv)); }

  const { rids, durations } = adapter.videoRids(inv);
  const searchCache = path.join(OUT, 'search-' + row.pid + '.json');
  const cached = o.search ? readJson(o.search) : fs.existsSync(searchCache) ? readJson(searchCache) : null;
  let found = cached;
  const searchCalls = [];
  const known = new Set(cached ? cached.list.map(c => c.rid).concat(cached.failed) : []);
  const fresh = rids.filter(x => !known.has(x));
  if (!o.search && !(o['plan-only'] && cached) && (!cached || cached.failed.length || fresh.length)) {
    const todo = (cached ? cached.failed : []).concat(cached ? fresh : rids), list = [], failed = [];
    for (let i = 0; i < todo.length; i += adapter.searchBatch) {
      const batch = todo.slice(i, i + adapter.searchBatch);
      const res = (await run(adapter.search(row, batch), ctx)).result;
      searchCalls.push({ rids: batch.length, hits: res.candidates.length, failed: res.failed.length, ...res.stats });
      list.push(...res.candidates); failed.push(...res.failed);
    }
    const retried = new Set(todo);
    found = { failed, list: [...(cached ? cached.list.filter(c => !retried.has(c.rid)) : []), ...list.map(c => ({ ...c, sourceDuration: durations[c.rid] || 0 }))] };
    fs.writeFileSync(searchCache, JSON.stringify(found));
  }

  // Clips without analysis: the panel's quick local score (node ffmpeg through the block's io seam), timed.
  const local = await adapter.localScores(row, inv);
  if (local.stats.clips) console.error('quick score', JSON.stringify(local.stats));
  const s = adapter.plan({ row: r, seed, inv, found, local });
  console.error('plan', JSON.stringify(s.planSummary));
  const planOut = { key: row.key, seed, plan: s.planSummary, picks: s.plan.picks, frames: s.plan.frames, visibleEvents: adapter.visibleEvents(s), music: { kind: s.music.kind, label: s.music.label, bpm: s.music.grid.bpm, sectionStart: s.music.sectionStart, notes: s.music.notes } };
  fs.writeFileSync(path.join(OUT, 'plan-' + row.key + '-s' + seed + '.json'), JSON.stringify(planOut, null, 1));
  if (o['plan-only']) return { key: row.key, seed, pass: true, planOnly: true, plan: s.planSummary };

  const audioStep = adapter.ensureAudio(s);
  const audio = audioStep ? (await run(audioStep, ctx)).result : null;
  if (audio && audio.missing && audio.missing.length) console.error('audio not imported: ' + audio.missing.join(', '));
  let a = (await run(adapter.assemble(s, audio), ctx)).result;
  if (!a.sequenceId) throw Error('assemble returned no sequenceId: ' + JSON.stringify(a).slice(0, 400));
  adapter.afterAssemble(s, a);
  fs.writeFileSync(fpsCache, JSON.stringify({ fps: a.fps }));
  const firstDraft = a.sequenceId;
  if (o['rebuild-on-fps'] && s.replan && s.replan.ok && !s.replan.samePicks) {
    console.error(`real fps ${a.fps} != planned ${s.fpsGuess}; the plan at ${a.fps} picks other shots: building again`);
    s.plan = s.replan.plan; s.fpsGuess = a.fps;
    a = (await run(adapter.assemble(s, audio), ctx)).result;
    adapter.afterAssemble(s, a);
  }
  const dec = (await run(adapter.decorate(s, a), ctx)).result;
  const buildMs = Date.now() - t0;

  let rb = null, chk = { checks: {}, notes: [], pass: true, facts: null };
  const exp = adapter.stExpected(s, a);
  if (!o['no-readback']) {
    rb = await readback(a.sequenceId, row, ctx);
    chk = stCheck(rb, exp);
  }
  chk.checks.deadline = ctx.timings.every(t => (t.server ?? t.wall) < TIMEOUT * 1000);
  chk.checks.plannerAgrees = !!(s.fpsCheck && s.fpsCheck.plannerAgrees);
  chk.pass = Object.values(chk.checks).every(Boolean);

  let captured = null, exported = null;
  if (o.capture || row.capture) {
    const frames = adapter.captureFrames(s);
    const CAP = `const d = selects.draft(${JSON.stringify(a.sequenceId)}); display(await d.captureFrames({ frames: ${JSON.stringify(frames)} })); return { frames: ${JSON.stringify(frames)} };`;
    const { images } = await run({ summary: 'Capture frames', script: { source: CAP } }, ctx);
    captured = { frames, files: await saveImages(images, path.join(OUT, 'cap-' + row.key + '-s' + seed), 'frame') };
  }
  if (o.export || row.export) {
    const { exportDraft } = await kit('tools/drive/readback.mjs');
    exported = await exportDraft(client(), { projectId: row.pid, sequenceId: a.sequenceId, outPath: path.join(OUT, 'exp-' + row.key + '-s' + seed + '.mp4'), resolution: row.exportResolution || 'SD', summary: 'ST ' + row.key + ': Export Draft' });
  }

  const extra = adapter.record(s, a);
  const rec = { key: row.key, seed, pid: row.pid, plugin: adapter.id, version: adapter.version, sequenceId: a.sequenceId, discardedDraft: firstDraft !== a.sequenceId ? firstDraft : null,
    fps: a.fps, ...extra.rec, searchCalls, searchFailed: found.failed, candidates: found.list.length, videos: rids.length, photos: (inv.photos || []).length,
    audio, assemble: a, decorate: dec, expected: exp, checks: chk.checks, pass: chk.pass, notes: chk.notes.concat(s.music.notes, a.notes || [], (dec && dec.notes) || []),
    timings: ctx.timings, buildMs, readback: rb, actualCuts: chk.facts && chk.facts.cuts, captured, exported };
  fs.writeFileSync(path.join(OUT, 'rec-' + row.key + '-s' + seed + '.json'), JSON.stringify(rec, null, 1));
  fs.writeFileSync(path.join(OUT, 'cuts-' + row.key + '-s' + seed + '.json'), JSON.stringify(extra.cuts));
  fs.writeFileSync(path.join(OUT, 'events-' + row.key + '-s' + seed + '.json'), JSON.stringify(extra.rec.visibleEvents, null, 1));
  return { key: row.key, seed, seq: a.sequenceId, pass: chk.pass, checks: chk.checks, notes: rec.notes,
    timings: ctx.timings.map(t => t.step.split(' ')[0] + ':' + (t.server ?? t.wall)).join(' ') };
}

const jobs = [];
if (o.all) for (const r of MATRIX) for (const sd of r.seeds || [1]) jobs.push([r, sd]);
else {
  const r = MATRIX.find(x => x.key === o.key);
  if (!r) { console.error('unknown --key ' + o.key + '; keys: ' + MATRIX.map(x => x.key).join(', ')); process.exit(2); }
  jobs.push([r, Number(o.seed || 1)]);
}
let failed = 0;
for (const [r, sd] of jobs) {
  try {
    const res = await build(r, sd);
    console.log(JSON.stringify(res));
    if (!res.pass) failed++;
  } catch (e) {
    failed++;
    console.log(JSON.stringify({ key: r.key, seed: sd, error: e.message }));
    if (/not reachable/.test(e.message)) process.exit(2);
  }
}
console.error('out: ' + OUT);
process.exit(failed ? 1 : 0);
