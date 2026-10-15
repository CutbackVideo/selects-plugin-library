// SBS Radio Clips' speaker reframing on a real News Direct panel of four: faces from Selects' faces.detect
// every 0.1 s and the transcript's speakers, for 234.3-396 s of VuE82gQMENA (clip 2 of job mv9md6hb). The panellist
// on the right edge (x≈1658) talks through most of it; a match against each face's overall average missed him and
// the clip showed all four people with him cut in half. Also checks how a clip's faces are searched: short windows
// that keep each result under the runtime's 8 MiB file limit.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';

const root = path.resolve(import.meta.dirname, '..');
const panel = fs.readFileSync(process.env.SHORTFORM_CLIPS_PANEL || path.join(root, 'plugins/shortform-clips/panel.tsx'), 'utf8');
// The pure reframing helpers, each a top-level function ending at its first unindented closing brace, with
// their TypeScript types removed.
const NAMES = ['speakerTurns', 'planShots', 'faceRanges', 'faceWindows', 'keyHash', 'settleFaceJob'];
const code = NAMES.map((name) => {
  const start = panel.search(new RegExp('^(async )?function ' + name + '\\(', 'm'));
  assert.ok(start >= 0, 'not found: ' + name);
  return panel.slice(start, panel.indexOf('\n}\n', start) + 2);
}).join('\n');
const ctx = {};
vm.runInNewContext(stripTypeScriptTypes(code) + '\nObject.assign(globalThis, {' + NAMES.join(', ') + '});', ctx);
const {planShots, speakerTurns, faceRanges, faceWindows, keyHash, settleFaceJob} = ctx;
const fx = JSON.parse(fs.readFileSync(path.join(root, 'tests/fixtures/shortform-clips/newsdirect_reframe.json'), 'utf8'));

// The TikTok layout of the News Direct template: an 850 px window, the source's full height.
const windowW = 1080 / (850 / 1080);
// edgeMin 3.6: the template's narrowest close-up at the picture edge.
const plan = (log) => planShots(fx.samples, speakerTurns(fx.words, fx.range[0], fx.range[1]), fx.frameW, windowW, 4.5, 12, false, windowW, 2.8, log, 3.6);
const at = (shots, t) => shots.find((s) => t >= s.start && t < s.end);

test('each passage of the clip is framed on the panellist who talks', () => {
  const shots = plan();
  for (const [t, x] of [[265, 1658], [300, 1658], [320, 1658], [360, 735]]) {
    const s = at(shots, t);
    assert.ok(s && s.cy, `close-up at ${t} s`);
    assert.ok(Math.abs(s.cx - x) < 60, `${t} s: x ${s.cx}, expected about ${x}`);
  }
});

test('a close-up leaves the neighbours out whole', () => {
  const shots = plan();
  // Typical face centres and widths of the panel: each neighbour's face stays outside the window, with at least
  // half a face of room (the window's edge sits about 1.3 face widths from the neighbour's centre in the piece).
  const seats = [[270, 135], [735, 135], [1170, 143], [1658, 137]];
  for (const t of [300, 360]) {
    const s = at(shots, t);
    for (const [x, w] of seats) {
      if (Math.abs(x - s.cx) < 100) continue;
      assert.ok(Math.abs(x - s.cx) - s.w / 2 >= w, `${t} s: window ${s.cx}±${s.w / 2} reaches the face at ${x}`);
    }
  }
});

test('a close-up at the picture edge is no tighter than one in from it', () => {
  // The right edge panellist sits about 225 px (300 s) and 244 px (265 s) from the edge. Centring the face would
  // make the first view 450 px, visibly tighter than the second; both stay near 3.6 face widths instead.
  const shots = plan();
  const a = at(shots, 265), b = at(shots, 300);
  assert.ok(b.w >= 137 * 3.5, `300 s: ${b.w} px`);
  assert.ok(Math.abs(a.w - b.w) < 20, `265 s ${a.w} px vs 300 s ${b.w} px`);
  for (const s of [a, b]) assert.ok(s.cx + s.w / 2 <= fx.frameW - 12 + 1e-6, `window ${s.cx}±${s.w / 2} passes the edge`);  // Without edgeMin (the other templates) the face stays centred, as before.
  const centred = planShots(fx.samples, speakerTurns(fx.words, fx.range[0], fx.range[1]), fx.frameW, windowW, 4.5, 12, false, windowW, 2.8);
  assert.equal(at(centred, 300).w, 2 * (fx.frameW - 12 - at(centred, 300).cx));
});

test('the speaker matches and every decision are logged', () => {
  const log = {};
  plan(log);
  const byFace = Object.fromEntries(log.voice.filter((v) => v.face !== null).map((v) => [v.spk, v.face]));
  assert.ok(Math.abs(byFace[0] - 1658) < 100, `speaker 0 is the right edge panellist: ${JSON.stringify(log.voice)}`);
  assert.ok(Math.abs(byFace[1] - 735) < 100, `speaker 1 is the second from the left: ${JSON.stringify(log.voice)}`);
  assert.ok(log.pieces.length > 0 && log.pieces.every((p) => typeof p.how === 'string'));
});

test('faces in separate ranges continue across the gap', () => {
  // The passages alone, with a gap between them: the right edge panellist is still matched once for both.
  const ranges = [[254.3, 278], [286.2, 339.9], [345.6, 376]];
  const samples = fx.samples.filter(([t]) => ranges.some(([a, b]) => t >= a && t <= b));
  const words = fx.words.filter((w) => w[1] >= 254.3 && w[0] <= 376);
  const shots = planShots(samples, speakerTurns(words, 254.3, 376), fx.frameW, windowW, 4.5, 12, false, windowW, 2.8);
  assert.ok(Math.abs(at(shots, 300).cx - 1658) < 60, JSON.stringify(at(shots, 300)));
  assert.ok(Math.abs(at(shots, 360).cx - 735) < 60, JSON.stringify(at(shots, 360)));
});

test('a clip is searched over its whole stretch in windows under the size limit', () => {
  // Clip 1 of mv9md6hb: one search of 28.3-463 s failed with AI_ARTIFACT_TOO_LARGE (about 16 MiB).
  const ranges = faceRanges([[58.3, 80.2], [377, 394.7], [415.7, 433]], 694.66);
  assert.equal(ranges.length, 1);
  assert.ok(Math.abs(ranges[0][0] - 28.3) < 1e-6 && ranges[0][1] === 463);
  const windows = faceWindows(ranges[0][0], ranges[0][1], 0.1, 29.97);
  assert.ok(windows.every(([a, b]) => b - a <= 60 + 1e-6));
  assert.ok(Math.abs(windows[0][0] - 28.3) < 1e-6 && windows[windows.length - 1][1] === 463);
  for (let i = 1; i < windows.length; i++) assert.equal(windows[i][0], windows[i - 1][1]);
  // At 0.2 s a window may be twice as long, but never decodes more than the runtime's 20,000 frames.
  assert.ok(faceWindows(0, 1000, 0.2, 119.88).every(([a, b]) => (b - a) * 119.88 < 19000));
  // Passages far apart are searched separately; pad 0 searches the passages alone.
  // (JSON: the arrays come from the panel's own context.)
  assert.equal(JSON.stringify(faceRanges([[10, 40], [900, 930]], 2000)), '[[0,70],[870,960]]');
  assert.equal(JSON.stringify(faceRanges([[58.3, 80.2], [377, 394.7]], 694.66, 0)), '[[58.3,80.2],[377,394.7]]');
});

test('a face job request key changes with its inputs', () => {
  const k = (o) => keyHash(JSON.stringify(o));
  assert.equal(k({a: 1, b: 2, step: 0.1}), k({a: 1, b: 2, step: 0.1}));
  assert.notEqual(k({a: 1, b: 2, step: 0.1}), k({a: 1, b: 2, step: 0.2}));
  assert.notEqual(k({a: 1, b: 2, step: 0.1}), k({a: 1, b: 3, step: 0.1}));
});

// A pretend AI runtime for settleFaceJob: jobs are kept by request key, as Selects does, so sending the same key and
// input again returns the job already started.
function runtime() {
  const jobs = new Map();
  const rt = {jobs, sent: [], checks: 0, lostAcks: 0, lostCode: 'AI_SUBMIT_OUTCOME_UNKNOWN', failChecks: 0, stuck: false, runFor: 0, cancelled: [],
    submit(key) {
      rt.sent.push(key);
      if (!jobs.has(key)) jobs.set(key, {wf: 'wf-' + jobs.size, status: 'running', left: rt.runFor});
      if (rt.lostAcks > 0) { rt.lostAcks--; throw Object.assign(new Error('lost'), {code: rt.lostCode}); }
      return {wf: jobs.get(key).wf};
    },
    status(cancel) {
      rt.checks++;
      if (rt.failChecks > 0) { rt.failChecks--; throw new Error('status read failed'); }
      const j = [...jobs.values()].at(-1);
      if (cancel) { rt.cancelled.push(j.wf); if (j.status === 'running') j.status = rt.stuck ? 'canceling' : 'canceled'; }
      else if (j.status === 'running' && j.left-- <= 0) j.status = 'succeeded';
      return {status: j.status, code: '', error: ''};
    },
  };
  return rt;
}
class Stopped extends Error {}
const io = (rt, key, more = {}) => {
  let clock = 0;
  return {submit: async () => rt.submit(key), status: async (cancel) => rt.status(cancel), wait: async (ms) => { clock += ms; }, deadline: 60000, now: () => clock, stop: (e) => e instanceof Stopped, ...more};
};

test('a lost submission answer recovers the same job with the same key', async () => {
  const rt = runtime();
  rt.lostAcks = 1;
  const got = await settleFaceJob(io(rt, 'k1'));
  assert.deepEqual(rt.sent, ['k1', 'k1']);
  assert.equal(rt.jobs.size, 1);
  assert.equal(got.wf, 'wf-0');
  assert.equal(got.status.status, 'succeeded');
});

test('a submission script that timed out (no error code) is also recovered with the same key', async () => {
  const rt = runtime();
  rt.lostAcks = 1;
  rt.lostCode = '';
  const got = await settleFaceJob(io(rt, 'k1'));
  assert.deepEqual(rt.sent, ['k1', 'k1']);
  assert.equal(rt.jobs.size, 1);
  assert.equal(got.status.status, 'succeeded');
});

test('a submission whose outcome stays unknown is held, never sent under another key', async () => {
  const rt = runtime();
  rt.lostAcks = 99;
  await assert.rejects(settleFaceJob(io(rt, 'k1')), (e) => e.unsettled === true && e.code === 'AI_SUBMIT_OUTCOME_UNKNOWN');
  assert.ok(rt.sent.length > 1 && rt.sent.every((k) => k === 'k1'));
});

test('a submission the host refused is not retried here', async () => {
  const rt = runtime();
  const refuse = async () => { throw Object.assign(new Error('bad input'), {code: 'AI_INPUT_INVALID'}); };
  await assert.rejects(settleFaceJob(io(rt, 'k1', {submit: refuse})), (e) => !e.unsettled && e.code === 'AI_INPUT_INVALID');
});

test('a failed status check asks the same job again', async () => {
  const rt = runtime();
  rt.runFor = 2;
  rt.failChecks = 1;
  const got = await settleFaceJob(io(rt, 'k1'));
  assert.equal(rt.sent.length, 1);
  assert.equal(got.status.status, 'succeeded');
  assert.equal(rt.cancelled.length, 0);
});

test('status checks that keep failing hold the job instead of moving on', async () => {
  const rt = runtime();
  rt.failChecks = 99;
  await assert.rejects(settleFaceJob(io(rt, 'k1')), (e) => e.unsettled === true && e.wf === 'wf-0');
  assert.equal(rt.sent.length, 1);
});

test('a job past its time is cancelled and awaited; one that never stops is held', async () => {
  const rt = runtime();
  rt.runFor = 1e9;
  const got = await settleFaceJob(io(rt, 'k1'));
  assert.equal(got.status.status, 'canceled');
  assert.equal(got.status.code, 'TIMEOUT');
  assert.deepEqual(rt.cancelled, ['wf-0']);

  const stuck = runtime();
  stuck.runFor = 1e9;
  stuck.stuck = true;
  await assert.rejects(settleFaceJob(io(stuck, 'k1')), (e) => e.unsettled === true && e.code === 'TIMEOUT' && e.wf === 'wf-0');
  assert.equal(stuck.sent.length, 1);
});

test('a run the user stopped picks up its job again when resumed', async () => {
  const rt = runtime();
  rt.runFor = 1e9;
  let polls = 0;
  const first = io(rt, 'k1', {wait: async () => { if (++polls === 2) throw new Stopped(); }});
  await assert.rejects(settleFaceJob(first), Stopped);
  assert.equal(rt.cancelled.length, 0);
  rt.jobs.get('k1').left = 0;
  const got = await settleFaceJob(io(rt, 'k1'));
  assert.equal(rt.jobs.size, 1);
  assert.equal(got.wf, 'wf-0');
  assert.equal(got.status.status, 'succeeded');
});

// Exercise the panel's orchestration as well as the pure shot planner.
const nestedStart = panel.indexOf('  async function reframeClips(');
const nested = panel.slice(nestedStart, panel.indexOf('\n  }\n', nestedStart) + 4);
function pipeline(overrides = {}) {
  const sent = [], notes = [], saved = [];
  const context = {
    ...ctx, APP_ID: 'shortform-clips', AI_RUNTIME: 'selects-ai-runtime', projectId: 'p',
    SCRIPT_SOURCE_READER: '/* source reader */', RunCancelled: Stopped,
    guard: p => p, sleep: async () => {}, console: {warn() {}},
    script: async (body, label) => {
      if (overrides.script) { const result = await overrides.script(body, label); if (result !== undefined) return result; }
      if (label === 'Read the source') return {fps:30,duration:400,W:2560};
      if (label === 'Find faces') { sent.push(body); return {wf:'wf-'+sent.length}; }
      if (label === 'Check face finding') return {status:'succeeded'};
      if (label === 'Read faces') return {W:2560,H:1440,total:0,samples:[]};
      if (label === 'Read speakers') return [];
      throw Error('Unexpected operation: '+label);
    },
  };
  vm.runInNewContext(stripTypeScriptTypes(nested)+'\nglobalThis.run = reframeClips;', context);
  return {sent,notes,saved,run: clips => context.run(clips,{id:'test',resourceId:'r',resourceName:'source'},
    {layout:{windowTop:450,windowBottom:1300,sourceTop:0,sourceBottom:1080,edgeInset:12}},
    entry=>notes.push(entry),async()=>saved.push(structuredClone(clips)))};
}

test('empty face results retry progressively and save a source-sized fallback for each clip', async()=>{
  const p=pipeline(), clips=[{segments:[[40,45]]},{segments:[[100,105]]}];
  await p.run(clips);
  assert.equal(p.saved.length,2);
  assert.equal(p.notes.filter(n=>n.plan==='whole').length,2);
  assert.equal(p.notes.filter(n=>n.level===2 && n.range).length,2);
  assert.ok(p.sent.some(body=>body.includes('sampleEverySeconds: 0.2')));
  for(const c of clips) assert.deepEqual(JSON.parse(JSON.stringify(c.reframe)),[{start:0,end:1e9,cx:1280,w:2536}]);
  assert.equal(p.saved[0][1].reframe,undefined,'persist before moving to the next clip');
});

test('an unresolved submission prevents any subsequent clip from starting a competing job',async()=>{
  const keys=[];
  const p=pipeline({script:async(body,label)=>{
    if(label==='Find faces') {keys.push(body.match(/requestKey: ("[^"]+")/)[1]);throw Object.assign(Error('lost'),{code:'AI_SUBMIT_OUTCOME_UNKNOWN'});}
  }});
  await p.run([{segments:[[40,45]]},{segments:[[100,105]]}]);
  assert.equal(new Set(keys).size,1);
  assert.equal(keys.length,5);
  assert.equal(p.notes.filter(n=>n.held).length,2);
});

test('resuming preserves completed clips and only submits work for unfinished clips',async()=>{
  const existing=[{start:0,end:200,cx:800,w:700}], p=pipeline();
  const clips=[{segments:[[40,45]],reframe:existing},{segments:[[100,105]]}];
  await p.run(clips);
  assert.equal(clips[0].reframe,existing);
  assert.equal(p.saved.length,1);
  assert.ok(p.notes.every(n=>n.clip===1));
});

test('missing source metadata fails before starting or saving invented framing',async()=>{
  const p=pipeline({script:async(_body,label)=>{if(label==='Read the source')throw Error('Source frame size is unavailable.');}});
  await assert.rejects(p.run([{segments:[[40,45]]}]),/Source frame size/);
  assert.equal(p.sent.length,0);
  assert.equal(p.saved.length,0);
});

test('user cancellation propagates without saving a fallback',async()=>{
  const p=pipeline({script:async(_body,label)=>{if(label==='Find faces')throw new Stopped('cancelled');}});
  await assert.rejects(p.run([{segments:[[40,45]]}]),Stopped);
  assert.equal(p.saved.length,0);
});

const buildLiteral = panel.match(/^const RADIO_SCRIPT_BUILD: string = SCRIPT_SOURCE_READER \+ (".*");$/m);
assert.ok(buildLiteral);
const build = JSON.parse(buildLiteral[1]);
const framing = build.slice(build.indexOf('if (Array.isArray(P.reframe)'), build.indexOf('\nconst mainClips ='));
test('a wordless tail inherits the previous shot instead of reverting to the fixed crop',async()=>{
  const transforms = [];
  const clips = [{startFrame:0,endFrame:30},{startFrame:30,endFrame:60}];
  const context = {
    P: {transform:{scale:2,posX:0,posY:0},frame:{windowTop:450,windowBottom:1300},reframe:[{start:0,end:10,cx:1500,w:600}]},
    sm: {fps:30,frameSize:{width:1920,height:1080}},
    readV:async()=>clips,
    d:{words:async()=>[{startFrame:0,sourceStartFrame:0}],clips:async()=>clips,setClipTransform:async t=>transforms.push(t)},
  };
  await vm.runInNewContext(stripTypeScriptTypes('(async()=>{'+framing+'})()'), context);
  assert.equal(transforms.length,2);
  assert.deepEqual(transforms[0].scale,transforms[1].scale);
  assert.deepEqual(transforms[0].position,transforms[1].position);
  assert.notEqual(transforms[1].scale.x,2);
});
