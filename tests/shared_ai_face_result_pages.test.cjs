const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const {stripTypeScriptTypes} = require('node:module');
const {faceResultFixture} = require('./face_result_fixture.cjs');
const {faceResultPage, readFaceResultPages} = require('../shared/face-result-pages.cjs');
const plain = value => JSON.parse(JSON.stringify(value));
const options = {offset: 0, maxSamples: 128, maxBytes: 65536};
function reader(data, change) {
  const pages = [];
  return {pages, read: async script => {
    const value = plain(await vm.runInNewContext(stripTypeScriptTypes('(async()=>{' + script + '})()'), {selects: {ai: {readJSON: async () => data}}}));
    pages.push(value); return change ? change(value, pages.length) : value;
  }};
}
const projected = data => data.samples.map(s => ({index: s.index, sourceTimeSeconds: s.sourceTimeSeconds, faces: s.faces.map(f => ({box: f.box, score: f.score}))}));

test('719 complete samples and881 faces cross the real cap without dropping67 empty frames or changing coordinates', async () => {
  const raw = faceResultFixture(), r = reader(raw);
  assert.ok(Buffer.byteLength(JSON.stringify(raw)) > 262144);
  const result = await readFaceResultPages(r.read, {id: 'owned-artifact'}, 'project');
  assert.deepEqual(result.samples, projected(raw));
  assert.equal(result.samples.length, 719);
  assert.equal(result.samples.reduce((n, s) => n + s.faces.length, 0), 881);
  assert.equal(result.samples.filter(s => !s.faces.length).length, 67);
  assert.ok(r.pages.length > 1);
  assert.ok(r.pages.every(p => p.samples.length <= 128 && Buffer.byteLength(JSON.stringify(p)) <= 65536));
});
test('byte budget can split a page before its128-frame limit without splitting any frame', async () => {
  const raw = faceResultFixture(), r = reader(raw);
  const result = await readFaceResultPages(r.read, {id: 'owned'}, 'project', {maxBytes: 4096});
  assert.deepEqual(result.samples, projected(raw));
  assert.ok(r.pages.some(p => p.samples.length < 128 && !p.done));
  assert.ok(r.pages.every(p => Buffer.byteLength(JSON.stringify(p)) <= 4096));
});
test('a complete single frame that exceeds the budget fails explicitly rather than truncating faces', () => {
  const raw = faceResultFixture(1);
  raw.samples[0].faces = Array.from({length: 2000}, () => ({score: .95, box: {xmin: 1, ymin: 1, xmax: 2, ymax: 2}}));
  assert.throws(() => faceResultPage(raw, options), /FRAME_TOO_LARGE/);
  assert.equal(raw.samples[0].faces.length, 2000);
});
test('a previous v1 payload without optional sourceKind or parameter details remains readable without inventing them', async () => {
  const raw = faceResultFixture(3); delete raw.sourceKind; raw.parameters = {};
  const result = await readFaceResultPages(reader(raw).read, {id: 'owned'}, 'project');
  assert.equal(result.contractVersion, 1); assert.equal(result.sourceKind, undefined);
  assert.deepEqual(result.parameters, {}); assert.deepEqual(result.samples, projected(raw));
});
test('empty observations stay empty, not a fabricated detected or verified face', async () => {
  const raw = faceResultFixture(1); raw.samples[0].faces = [];
  const result = await readFaceResultPages(reader(raw).read, {id: 'owned'}, 'project');
  assert.deepEqual(result.samples[0].faces, []);
  raw.samples = [];
  assert.deepEqual((await readFaceResultPages(reader(raw).read, {id: 'owned'}, 'project')).samples, []);
});
test('artifact header changes between pages fail before returning partially collected observations', async () => {
  const raw = faceResultFixture(), r = reader(raw, (page, n) => {if (n === 2) page.header.frameSize.width++; return page;});
  await assert.rejects(readFaceResultPages(r.read, {id: 'owned'}, 'project'), /artifact changed/);
});
test('missing, duplicated and skipped page boundaries are rejected', async () => {
  for (const change of [page => undefined, page => ({...page, offset: page.offset + 1}), page => ({...page, nextOffset: page.nextOffset + 1}), page => ({...page, done: true})]) {
    await assert.rejects(readFaceResultPages(reader(faceResultFixture(), change).read, {id: 'owned'}, 'project'), /PAGE_INVALID/);
  }
});
test('frame indices and source PTS cannot repeat or move backward across page boundaries', async () => {
  for (const key of ['index', 'sourceTimeSeconds']) {
    const raw = faceResultFixture(); raw.samples[128][key] = raw.samples[127][key];
    await assert.rejects(readFaceResultPages(reader(raw).read, {id: 'owned'}, 'project'), /frame clock/);
  }
});
test('invalid display boxes, NaN scores and unsupported coordinate contracts fail without dropping bad faces', () => {
  for (const mutate of [d => {d.coordinateSpace = 'tensor-pixels';}, d => {d.samples[67].faces[0].box.xmax = 2000;}, d => {d.samples[67].faces[0].score = NaN;}, d => {d.samples[67].sourceTimeSeconds = -1;}]) {
    const raw = faceResultFixture(); mutate(raw);
    assert.throws(() => faceResultPage(raw, options), /PAGE_INVALID/);
  }
});
test('read errors propagate and unsupported budgets are not silently raised', async () => {
  const failure = Error('Artifact unavailable');
  await assert.rejects(readFaceResultPages(async () => {throw failure;}, {id: 'owned'}, 'project'), e => e === failure);
  for (const bad of [{maxBytes: 65537}, {maxSamples: 129}, {maxSamples: 0}]) await assert.rejects(readFaceResultPages(async () => null, {id: 'owned'}, 'project', bad), /PAGE_INVALID/);
});
test('a second-page abort propagates the same object without a third read or partial result', async () => {
  const r = reader(faceResultFixture()), abort = new DOMException('Owned read canceled', 'AbortError');
  let calls = 0, partialResultReturned = false;
  const operation = readFaceResultPages(async script => {
    if (++calls === 2) throw abort;
    return r.read(script);
  }, {id: 'owned'}, 'project').then(value => {partialResultReturned = true; return value;});
  await assert.rejects(operation, error => error === abort);
  assert.equal(calls, 2);
  assert.equal(r.pages.length, 1);
  assert.equal(partialResultReturned, false);
});
test('the serialized projector uses only the existing readJSON capability and never requests a bigger result cap', async () => {
  const r = reader(faceResultFixture(1)); let code;
  await readFaceResultPages(async script => {code = script; return r.read(script);}, {id: 'owned'}, 'project');
  assert.match(code, /selects\.ai\.readJSON/);
  assert.doesNotMatch(code, /maxResultBytes|submit\(|runShell|require\(/);
});
