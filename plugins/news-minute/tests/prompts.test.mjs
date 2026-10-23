import test from 'node:test';
import assert from 'node:assert/strict';
import * as P from '../src/prompts/index.ts';

const body = '\uC11C\uC6B8 \uC6D4\uC138\uAC00 164\uB9CC1000\uC6D0\uC73C\uB85C \uC62C\uB790\uB2E4. 2020\uB144\uBCF4\uB2E4 20\uB9CC1000\uC6D0 \uB192\uB2E4.';
const art = {title: 't', source: 's', date: 'd', body};
const mk = (text, sourceQuote) => ({text, sourceQuote});

test('validateScript flags count, length, quote and invented numbers', () => {
  const v = P.validateScript(
    {headline: {line1: 'a', line2: 'b'}, sentences: [mk('\uC6D4\uC138\uAC00 99\uB9CC\uC6D0\uC785\uB2C8\uB2E4.', 'nope')]},
    art,
  );
  assert.equal(v.ok, false);
  assert.ok(v.errors.some((e) => e.includes('sourceQuote')));
  assert.ok(v.errors.some((e) => e.includes('"990000"')));
  assert.ok(v.errors.some((e) => e.includes('8-14')));
});

test('validatePlan enforces coverage, disclaimer and number tracing', () => {
  const sents = [{id: 's1', text: '164\uB9CC1000\uC6D0\uC785\uB2C8\uB2E4.', startSec: 0, endSec: 5}];
  const assets = [{ref: 'photo-1', kind: 'photo'}, {ref: 'ill-1', kind: 'illustration'}];
  const ok = {scenes: [{sentenceIds: ['s1'], type: 'news_photo', params: {}, hideCaption: false, disclaimer: false, assetRef: 'photo-1'}]};
  assert.equal(P.validatePlan(ok, sents, assets).ok, true);
  const bad = {scenes: [{sentenceIds: ['s1'], type: 'number_callout', params: {label: 'x', from: 100, to: 164}, hideCaption: true, disclaimer: false}]};
  assert.ok(P.validatePlan(bad, sents, assets).errors.some((e) => e.includes('"100"')));
  const ill = {scenes: [{sentenceIds: ['s1'], type: 'news_photo', params: {}, hideCaption: false, disclaimer: false, assetRef: 'ill-1'}]};
  assert.ok(P.validatePlan(ill, sents, assets).errors.some((e) => e.includes('disclaimer=true')));
});

test('parseJsonLoose unwraps fences and trailing commas', () => {
  assert.deepEqual(P.parseJsonLoose('x\n```json\n{"a":1,}\n```'), {a: 1});
});

test('numberTokens compares by value across commas and units', () => {
  const v = (s) => P.numberTokens(s).join();
  assert.equal(v('201,000\uC6D0'), v('20\uB9CC1000\uC6D0'));
  assert.equal(v('1\uC870 2000\uC5B5'), '1200000000000');
  assert.equal(v('52.3%'), '52.3');
  assert.equal(v('2020\uB144 3\uC6D4'), '2020,3');
  assert.notEqual(v('164\uB9CC\uC6D0'), v('164\uB9CC1000\uC6D0'));
});
