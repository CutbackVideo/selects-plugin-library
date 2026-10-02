// thank-you-recap's montage Draft script at the frame rates a new Draft can take from its Project. The cut points
// are seconds on the template music; each clip must end on its cut at the Draft's rate (also after the Draft adopts
// its first clip's rate), the music overlay may not ask past the end of music.mp3 (Selects: "Resource overlay
// simulation covered only part of …"), and only the host's "not placeable yet" errors may come back as notReady.
// At 29.97 and 30 every Draft call must match origin/main's script exactly.
// THANK_YOU_RECAP_PANEL / THANK_YOU_RECAP_BASE override the panels.
import test from 'node:test';
import assert from 'node:assert/strict';
import cp from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = (p) => fs.readFileSync(p, 'utf8');
const panel = read(process.env.THANK_YOU_RECAP_PANEL || path.join(root, 'plugins/thank-you-recap/panel.tsx'));
const base = (() => {
  if (process.env.THANK_YOU_RECAP_BASE) return read(process.env.THANK_YOU_RECAP_BASE);
  try { return cp.execSync('git show origin/main:plugins/thank-you-recap/panel.tsx', {cwd: root, encoding: 'utf8', maxBuffer: 1 << 26}); } catch { return null; }
})();

const constant = (src, name) => { const m = new RegExp('^const ' + name + ' = (.*);$', 'm').exec(src); return m ? eval('(' + m[1] + ')') : undefined; };
// music.mp3's length (ffprobe of plugins/thank-you-recap/assets/music.mp3).
const MUSIC = 25.913469;
const NOT_LOCAL = /analyzed sequence not found|no local source timeline|placement_source_unavailable/i;

// The montage Draft script buildRecap sends, with a hero (h) and two clips (a, b) of 30 s each.
function scriptOf(src) {
  const roll = constant(src, 'ROLL');
  const starts = [...roll, constant(src, 'HERO'), constant(src, 'HOLD'), ...constant(src, 'CLOSING'), constant(src, 'PIANO_START'), ...constant(src, 'PIANO'), ...constant(src, 'GROOVE')];
  const pool = [{id: 'a', seconds: 30}, {id: 'b', seconds: 30}];
  const uses = new Map();
  const slots = starts.map((_, i) => {
    if (i === roll.length) return {id: 'h', seconds: 30, hero: true, use: 0, of: 1};
    const v = pool[(i < roll.length ? i : i - 1) % pool.length];
    const use = uses.get(v.id) ?? 0;
    uses.set(v.id, use + 1);
    return {id: v.id, seconds: v.seconds, hero: false, use, of: 0};
  });
  for (const s of slots) if (!s.hero) s.of = uses.get(s.id);
  const plan = {projectId: 'p', slots, starts, end: constant(src, 'END'), frame: {width: 1920, height: 1080}, name: 'n', musicId: 'm', musicSeconds: constant(src, 'MUSIC_SECONDS')};
  const body = src.slice(src.indexOf('async function buildRecap('));
  const start = body.indexOf('  const script = `') + '  const script = `'.length;
  const tpl = body.slice(start, body.indexOf('`;\n', start));
  return {script: new Function('plan', 'NOT_LOCAL', 'return `' + tpl + '`;')(plan, NOT_LOCAL), times: [...starts, plan.end]};
}

// A fake script SDK whose Draft counts frames at `fps` (inserts round to whole frames) and refuses an overlay longer
// than its audio, as Selects does. `adopt`: the rate the Draft switches to at its first insert. `musicRow`: the
// music Resource's fields. `fail`: {insert|overlay: message} thrown by that call. Only Draft edits are logged.
async function run(script, fps, {reported = fps, adopt = null, musicRow = {durationSeconds: MUSIC}, musicLength = MUSIC, fail = {}} = {}) {
  const calls = [], clips = [];
  let cursor = 0, next = 0;
  const log = (name, arg) => calls.push(name + ' ' + JSON.stringify(arg));
  const draft = {
    meta: async () => ({fps: reported}),
    insertResource: async (a) => {
      if (adopt && !clips.length) { fps = reported = adopt; }
      log('insertResource', a);
      if (fail.insert && clips.length === 3) throw new Error(fail.insert);
      const n = Math.round((a.sourceRange.endSeconds - a.sourceRange.startSeconds) * fps);
      clips.push({clipId: 'c' + next++, resourceId: a.resourceId, startFrame: cursor, endFrame: cursor + n, main: true});
      cursor += n;
    },
    clips: async ({trackScope}) => clips.filter((c) => trackScope === 'all' || c.main).map((c) => ({...c})),
    setFrameSize: async (a) => log('setFrameSize', a),
    rangeAtFrames: async (a, b) => [a, b],
    overlayResource: async ({resource, over}) => {
      log('overlayResource', {resource, over});
      if (fail.overlay) throw new Error(fail.overlay);
      if ((over[1] - over[0]) / fps > musicLength + 1e-3 / fps) throw new Error(`Resource overlay simulation covered only part of [${over[0]}, ${over[1]}) for resource <music.mp3>`);
      clips.push({clipId: 'c' + next++, resourceId: resource, startFrame: over[0], endFrame: over[1], main: false});
    },
    commitAll: async (m) => { log('commitAll', m); return {createdDraftId: 'd1'}; },
  };
  const rows = [{resourceId: 'h', type: 'Video'}, {resourceId: 'a', type: 'Video'}, {resourceId: 'b', type: 'Video'}, {resourceId: 'm', type: 'Audio', ...musicRow}];
  const project = {createDraft: async () => draft, resources: async () => rows, resource: (id) => id};
  const AsyncFunction = (async () => {}).constructor;
  const result = await new AsyncFunction('selects', script)({project: () => project});
  return {result, calls, clips, fps};
}

const RATES = [24000 / 1001, 24, 25, 30000 / 1001, 30, 60000 / 1001];
const music = (clips) => clips.find((c) => c.resourceId === 'm');

// Every clip after the first ends on its cut at the final rate; the music starts at 0, stays inside music.mp3,
// and the returned edges/fps (used by the titles run) are the real clip boundaries at that rate.
function assertBuilt({result, clips, fps}, times, from = 1) {
  assert.equal(result.notReady, undefined, String(result.reason));
  assert.equal(result.failed, undefined, String(result.failed));
  assert.equal(result.draftId, 'd1');
  assert.equal(result.cuts, times.length - 1);
  assert.equal(result.fps, fps);
  const main = clips.filter((c) => c.main);
  for (let i = from; i < main.length; i++) assert.equal(main[i].endFrame, Math.round(times[i + 1] * fps), 'clip ' + i);
  assert.deepEqual(result.edges, [...main.map((c) => c.startFrame), result.endFrame]);
  const bed = music(clips);
  assert.equal(bed.startFrame, 0);
  assert.ok(bed.endFrame <= result.endFrame);
  assert.ok(bed.endFrame / fps <= MUSIC + 1e-9, String(bed.endFrame));
}

for (const fps of RATES) {
  test(`builds at ${fps.toFixed(3)} fps with every cut on the music and the music inside music.mp3`, async () => {
    const {script, times} = scriptOf(panel);
    const out = await run(script, fps);
    assertBuilt(out, times, 0);
    assert.equal(music(out.clips).endFrame, out.result.endFrame, 'the music covers the whole montage');
  });
}

for (const [from, to] of [[30, 24000 / 1001], [30000 / 1001, 25], [24, 60000 / 1001]]) {
  test(`a Draft that adopts its first clip's rate (${from.toFixed(3)} -> ${to.toFixed(3)}) keeps every cut and the music`, async () => {
    const {script, times} = scriptOf(panel);
    assertBuilt(await run(script, from, {adopt: to}), times);
  });
}

test('a Draft reporting a rounded 29.97 builds like the exact rate', async () => {
  const {script} = scriptOf(panel);
  const exact = await run(script, 30000 / 1001);
  const rounded = await run(script, 30000 / 1001, {reported: 29.97});
  assert.deepEqual(rounded.result, exact.result);
  assert.deepEqual(rounded.calls, exact.calls);
});

test('the music is clamped to its own length: the Resource\'s, else the bundled file\'s', async () => {
  const {script, times} = scriptOf(panel);
  // A rate where the montage's last cut lands past the end of music.mp3 (25.917 s > 25.913 s).
  const fallback = await run(script, 12, {musicRow: {}});
  assertBuilt(fallback, times, 0);
  assert.equal(music(fallback.clips).endFrame, Math.floor(MUSIC * 12));
  // A Resource that reports a shorter track wins over the bundled length.
  const short = await run(script, 30, {musicRow: {durationSeconds: 25}, musicLength: 25});
  assert.equal(music(short.clips).endFrame, 750);
});

test('only "not placeable yet" errors come back as notReady; any other error as itself, with nothing committed', async () => {
  const {script} = scriptOf(panel);
  for (const [fail, want] of [
    [{overlay: 'Resource m is not ready'}, {notReady: 'm'}],
    [{insert: 'analyzed sequence not found'}, {notReady: 'b'}],
    [{insert: 'placement_source_unavailable'}, {notReady: 'b'}],
    [{overlay: 'Resource overlay simulation covered only part of [0, 777) for resource <music.mp3>'}, {failed: 'Resource overlay simulation covered only part of [0, 777) for resource <music.mp3>'}],
    [{insert: 'Source range out of bounds'}, {failed: 'Source range out of bounds'}],
  ]) {
    const {result, calls} = await run(script, 30, {fail});
    for (const [k, v] of Object.entries(want)) assert.equal(result[k], v, JSON.stringify(fail));
    assert.ok(!calls.some((c) => c.startsWith('commitAll')), 'nothing committed');
  }
});

for (const fps of [30000 / 1001, 30]) {
  test(`at ${fps.toFixed(3)} fps every Draft call matches origin/main`, {skip: base ? false : 'origin/main not available'}, async () => {
    const before = await run(scriptOf(base).script, fps);
    const after = await run(scriptOf(panel).script, fps);
    assert.deepEqual(after.result, before.result);
    assert.deepEqual(after.calls, before.calls);
  });
}
