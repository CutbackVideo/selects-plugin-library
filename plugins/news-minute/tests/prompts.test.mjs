import test from 'node:test';
import assert from 'node:assert/strict';
import * as P from '../src/prompts/index.ts';

const body = '서울 월세가 164만1000원으로 올랐다. 2020년보다 20만1000원 높다.';
const art = {title: 't', source: 's', date: 'd', body};
const mk = (text, sourceQuote) => ({text, sourceQuote});

test('validateScript flags count, length, quote and invented numbers', () => {
  const v = P.validateScript(
    {headline: {line1: 'a', line2: 'b'}, sentences: [mk('월세가 99만원입니다.', 'nope')]},
    art,
  );
  assert.equal(v.ok, false);
  assert.ok(v.errors.some((e) => e.includes('sourceQuote')));
  assert.ok(v.errors.some((e) => e.includes('"99"')));
  assert.ok(v.errors.some((e) => e.includes('8-14')));
});

test('validatePlan enforces coverage, disclaimer and number tracing', () => {
  const sents = [{id: 's1', text: '164만1000원입니다.', startSec: 0, endSec: 5}];
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
