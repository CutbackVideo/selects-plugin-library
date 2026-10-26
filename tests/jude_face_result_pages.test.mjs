import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';
import {loadPanelModule} from './panel_module_fixture.mjs';
import fixture from './face_result_fixture.cjs';

test('the actual Jude caption-face consumer reads every frame across the existing result cap', async () => {
  const data = fixture.faceResultFixture(), pages = [], captures = [];
  assert.ok(JSON.stringify(data).length > 262144, 'fixture crosses the real SDK result cap');
  const source = fs.readFileSync(new URL('../plugins/jude-kinetic-style/panel.tsx', import.meta.url), 'utf8');
  const {judeSharedCaptionFaces} = loadPanelModule(source, {names: ['judeSharedCaptionFaces'], overrides: {
    videoAiClient: () => ({run: async () => ({result: {files: {detections: {id: 'owned-artifact'}}, metrics: {decodedFrames: 719}}})}),
    judeCaptionFaceSamples: value => {captures.push(JSON.parse(JSON.stringify(value))); return {observedFrames: value.samples.length};},
  }});
  const env = {sdk: {}, status: () => {}, writeText: async () => {}, runScript: async script => {
    const result = await vm.runInNewContext(stripTypeScriptTypes('(async()=>{' + script + '})()'), {selects: {ai: {readJSON: async () => data}}});
    const bytes = Buffer.byteLength(JSON.stringify(result));
    if (bytes > 262144) throw Error('The existing SDK result was clipped; result is undefined');
    pages.push(bytes); return result;
  }};
  const result = await judeSharedCaptionFaces(env, 'owned-project', {fps: 24000 / 1001}, [{aiResourceId: 'owned-resource', sourceStartSeconds: data.parameters.sourceRange.startSeconds, sourceFps: 24000 / 1001, startFrame: 0, endFrame: 719, playbackRate: 1}], '/owned-run');
  assert.equal(result.observedFrames, 719);
  assert.equal(captures.length, 1);
  assert.equal(captures[0].samples.length, 719);
  assert.equal(captures[0].samples.reduce((n, sample) => n + sample.faces.length, 0), 881);
  assert.equal(captures[0].samples.filter(sample => sample.faces.length === 0).length, 67);
  assert.ok(pages.length > 1);
  assert.ok(pages.every(bytes => bytes <= 65536));
});

test('the actual clearance adapter still leaves a segment with missing detected faces unknown after paging succeeds', async () => {
  const data = fixture.faceResultFixture();
  const source = fs.readFileSync(new URL('../plugins/jude-kinetic-style/panel.tsx', import.meta.url), 'utf8');
  const {judeSharedCaptionFaces} = loadPanelModule(source, {names: ['judeSharedCaptionFaces'], overrides: {
    videoAiClient: () => ({run: async () => ({result: {files: {detections: {id: 'owned-artifact'}}, metrics: {decodedFrames: 719}}})}),
  }});
  const env = {sdk: {}, status: () => {}, writeText: async () => {}, runScript: script => vm.runInNewContext(stripTypeScriptTypes('(async()=>{' + script + '})()'), {selects: {ai: {readJSON: async () => data}}})};
  const result = await judeSharedCaptionFaces(env, 'owned-project', {fps: 24000 / 1001}, [{aiResourceId: 'owned-resource', sourceStartSeconds: data.parameters.sourceRange.startSeconds, sourceFps: 24000 / 1001, startFrame: 0, endFrame: 719, playbackRate: 1}], '/owned-run');
  assert.deepEqual(JSON.parse(JSON.stringify(result)), {});
});

test('the framing consumer retains its existing single-sample normalized geometry', async () => {
  const data = fixture.faceResultFixture(1);
  data.samples[0].faces = [{score: .95, box: {xmin: 192, ymin: 108, xmax: 576, ymax: 432}, landmarks: []}];
  const source = fs.readFileSync(new URL('../plugins/jude-kinetic-style/panel.tsx', import.meta.url), 'utf8');
  const {judeSharedFaces} = loadPanelModule(source, {names: ['judeSharedFaces'], overrides: {
    videoAiClient: () => ({run: async () => ({result: {files: {detections: {id: 'owned-artifact'}}}})}),
  }});
  const env = {sdk: {}, status: () => {}, writeText: async () => {}, runScript: script => vm.runInNewContext(stripTypeScriptTypes('(async()=>{' + script + '})()'), {selects: {ai: {readJSON: async () => data}}})};
  const result = await judeSharedFaces(env, 'owned-project', {fps: 24000 / 1001}, [{aiResourceId: 'owned-resource', sourceStartSeconds: data.parameters.sourceRange.startSeconds, sourceFps: 24000 / 1001, sourceDurationSeconds: 307}], [{key: '0', seconds: data.parameters.sourceRange.startSeconds}], '/owned-run');
  assert.deepEqual(JSON.parse(JSON.stringify(result)), {'0': {w: 1920, h: 1080, faces: [[.1, .1, .2, .3]]}});
});
