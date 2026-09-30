#!/usr/bin/env node
// THE END Credits readback: the kit's tools/drive/readback.mjs plus the rules this style needs. See --help.
//   - Main may start after a leading gap (Classic lead-in): contiguity from exp.mainStartFrame, not frame 0.
//   - Effect stack order per main clip (exp.stack, e.g. ["Cinematic look", "Shot frame"]; the frame must be last).
//   - Clip sound levels skip photos (exp.photoRids): assemble.js never sets a photo's level.
//   - Cover transforms (exp.transforms: { rid: scale }) read with draft.clipTransform(), which the kit readback lacks.
// build-driver.mjs picks this module up through dev/readback-hook.mjs (it imports ./readback.mjs from its own folder).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// The kit readback: passed by the hook as ?kit=<url>, else --kit <dir> / SELECTS_APP_KIT / ~/Workspaces/selects-app-kit.
const argKit = (() => { const i = process.argv.indexOf('--kit'); return i > 0 ? process.argv[i + 1] : null; })();
const KIT_URL = new URL(import.meta.url).searchParams.get('kit')
  || pathToFileURL(path.join(argKit || process.env.SELECTS_APP_KIT || path.join(os.homedir(), 'Workspaces', 'selects-app-kit'), 'tools', 'drive', 'readback.mjs')).href;
const kit = await import(KIT_URL);
const { SelectsMcp, APP_PORTS, DEFAULT_APP, parseArgs } = await import(new URL('../selects-mcp/client.mjs', KIT_URL).href);

export const { readbackScript, volumeScript, exportDraft } = kit;

export function transformScript(sequenceId) {
  return `const d = selects.draft(${JSON.stringify(sequenceId)});
const main = (await d.clips({ trackScope: "main" })).filter((c: any) => c.resourceId !== null);
const out: any[] = [];
for (const c of main) { try { const t: any = await d.clipTransform(c); out.push({ rid: c.resourceId, s: c.startFrame, scale: t && t.scale, position: t && t.position }); } catch (e) { out.push({ rid: c.resourceId, s: c.startFrame, error: String((e && e.message) || e) }); } }
return out;`;
}

export async function fetchReadback(mcp, opts) {
  const rb = await kit.fetchReadback(mcp, opts);
  const { payload, texts, isError } = await mcp.runScript({ script: transformScript(opts.sequenceId), summary: (opts.summaryPrefix || '') + 'Read clip transforms', allowCommit: false, timeoutSeconds: 30 });
  if (!payload || isError || payload.error || payload.result == null) rb.transformsError = payload ? JSON.stringify(payload).slice(0, 600) : texts.join('\n').slice(0, 600);
  else rb.transforms = payload.result;
  return rb;
}

const TOL_SCALE = 1e-3;
export function checkReadback(rb, exp = {}) {
  const kitExp = { ...exp };
  for (const k of ['clipSound', 'stack', 'mainStartFrame', 'photoRids', 'transforms']) delete kitExp[k];
  const res = kit.checkReadback(rb, kitExp);
  const C = res.checks, notes = res.notes;
  const rows = [...rb.rows].sort((x, y) => x.s - y.s);
  const start = exp.mainStartFrame ?? 0;
  C.contiguous = rows.length > 0 && rows[0].s === start && rows.every((r, i) => i === 0 || r.s === rows[i - 1].e);
  if (!C.contiguous) notes.push('main clips ' + JSON.stringify(rows.map(r => [r.s, r.e])) + ', expected contiguous from ' + start);
  if (exp.stack) {
    const bad = rows.map((r, i) => [i, r.fx]).filter(([, fx]) => JSON.stringify(fx) !== JSON.stringify(exp.stack));
    C.stack = bad.length === 0;
    if (bad.length) notes.push('effect stacks (slot, names) ' + JSON.stringify(bad) + ', expected ' + JSON.stringify(exp.stack));
  }
  if (exp.clipSound) {
    // The kit rule, except that photos (no sound, never levelled by assemble.js) are left out of the level check.
    const has = rb.hasAudio || {}, photo = new Set(exp.photoRids || []);
    const audioSlots = rows.filter(r => has[r.rid]).length;
    if (exp.clipSound.mode === 'off') {
      C.clipSound = rows.every(r => (has[r.rid] ? Array.isArray(r.asi) && r.asi.length === 0 : r.asi == null || (Array.isArray(r.asi) && r.asi.length === 0)));
      if (!audioSlots) notes.push('clip sound off: no used clip has an audio stream, so the mute is vacuous');
    } else if (rb.volumes) {
      const vMain = rb.volumes.filter(v => v.kind === 'main' && !photo.has(v.rid));
      const vids = rows.filter(r => !photo.has(r.rid));
      C.clipSound = vMain.length === vids.length && vMain.every(v => v.db === exp.clipSound.db) && vids.every(r => !(Array.isArray(r.asi) && r.asi.length === 0));
      if (!C.clipSound) notes.push('video clip volumes ' + JSON.stringify(vMain.map(v => v.db)) + ', expected ' + exp.clipSound.db);
      if (!audioSlots) notes.push('clip sound ' + exp.clipSound.db + ' dB: no used clip has an audio stream');
    }
  }
  if (exp.transforms) {
    if (!rb.transforms) { C.transforms = false; notes.push('no clip transforms read back' + (rb.transformsError ? ': ' + rb.transformsError : '')); }
    else {
      const bad = [];
      for (const r of rows) {
        const want = exp.transforms[r.rid];
        if (want == null) continue;
        const t = rb.transforms.find(x => x.s === r.s && x.rid === r.rid);
        const sx = t && t.scale ? t.scale.x : 1, sy = t && t.scale ? t.scale.y : 1;
        const px = t && t.position ? t.position.x || 0 : 0, py = t && t.position ? t.position.y || 0 : 0;
        if (!t || t.error || Math.abs(sx - want) > TOL_SCALE || Math.abs(sy - want) > TOL_SCALE || Math.abs(px) > 1e-6 || Math.abs(py) > 1e-6)
          bad.push({ slot: rows.indexOf(r), rid: r.rid, want, scale: t && t.scale, position: t && t.position, error: t && t.error });
      }
      C.transforms = bad.length === 0;
      if (bad.length) notes.push('clip transforms ' + JSON.stringify(bad));
    }
  }
  res.facts.mainStartFrame = rows.length ? rows[0].s : null;
  res.pass = Object.values(C).every(Boolean);
  return res;
}

const HELP = `readback-tec.mjs - verify a THE END Credits Draft (read-only): the kit readback + gap, stack order, photo-aware
clip levels and cover transforms.

Usage:
  node readback-tec.mjs --draft <sequenceId> --project <pid> --expect expected.json [--save-readback rb.json] [--json out.json]
  node readback-tec.mjs --from rb.json --expect expected.json         offline re-check of a saved readback
  node readback-tec.mjs --rec <out>/rec-<key>-s<seed>.json             offline re-check of a build-driver record
                                                                       (its readback + the adapter's expected)
Expectations: the kit's (readback.mjs --help) plus
  "mainStartFrame": 123,                       Main's first clip starts here (Classic: frames[1]; Full frame: 0)
  "stack": ["Cinematic look", "Shot frame"],   every main clip's video-effect names, in order
  "photoRids": ["r27"],                        left out of the clip-sound level check
  "transforms": { "r27": 2.3704, "r3": 1 }     clipTransform scale (x and y) per resource, position 0
Options: --kit <selects-app-kit dir> (default $SELECTS_APP_KIT or ~/Workspaces/selects-app-kit), --no-volumes,
  --app/--port (${Object.entries(APP_PORTS).map(([k, v]) => k + ' ' + v).join(', ')}; default ${DEFAULT_APP}).
Exit codes: 0 pass, 1 a check failed, 2 usage or app not reachable.
`;

async function main() {
  const o = parseArgs(process.argv.slice(2), { flags: ['no-volumes'] });
  if (o.help || (!o.draft && !o.from && !o.rec)) { process.stdout.write(HELP); process.exit(o.help ? 0 : 2); }
  const readJson = f => JSON.parse(fs.readFileSync(f, 'utf8'));
  let rb, exp = o.expect ? readJson(o.expect) : {};
  if (o.rec) {
    const rec = readJson(o.rec);
    if (!rec.readback) { console.error(o.rec + ' has no readback (built with --no-readback?)'); process.exit(2); }
    rb = rec.readback; exp = o.expect ? exp : rec.expected || {};
  } else if (o.from) rb = readJson(o.from);
  else rb = await fetchReadback(new SelectsMcp({ port: o.port, app: o.app, clientName: 'tec-readback' }), { sequenceId: o.draft, projectId: o.project, volumes: !o['no-volumes'] });
  if (o['save-readback']) fs.writeFileSync(o['save-readback'], JSON.stringify(rb, null, 1));
  const res = checkReadback(rb, exp);
  console.log(JSON.stringify({ draft: rb.sequenceId, name: rb.name, ...res.facts, cuts: undefined, checks: res.checks, pass: res.pass, notes: res.notes }, null, 1));
  if (o.json) fs.writeFileSync(o.json, JSON.stringify({ readback: rb, ...res }, null, 1));
  process.exit(res.pass ? 0 : 1);
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  main().catch(e => { console.error(e.message); process.exit(/not reachable/.test(e.message) ? 2 : 1); });
}
