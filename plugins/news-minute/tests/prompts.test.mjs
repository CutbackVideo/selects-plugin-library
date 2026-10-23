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
  const sums = [{ref: 'photo-1', summary: 'a photo'}, {ref: 'ill-1', summary: 'an illustration'}];
  const ok = {assetSummaries: sums, scenes: [{sentenceIds: ['s1'], type: 'news_photo', params: {}, hideCaption: false, disclaimer: false, assetRef: 'photo-1'}]};
  assert.equal(P.validatePlan(ok, sents, assets).ok, true);
  const bad = {assetSummaries: sums, scenes: [{sentenceIds: ['s1'], type: 'number_callout', params: {label: 'x', from: 100, to: 164}, hideCaption: true, disclaimer: false}]};
  assert.ok(P.validatePlan(bad, sents, assets).errors.some((e) => e.includes('"100"')));
  const ill = {assetSummaries: sums, scenes: [{sentenceIds: ['s1'], type: 'news_photo', params: {}, hideCaption: false, disclaimer: false, assetRef: 'ill-1'}]};
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

test('repairPrompt adds a target range for length errors only', () => {
  const prev = {sentences: [{text: 'x'.repeat(420)}]};
  const withLen = P.repairPrompt('BASE', prev, ['narration is 420 chars (spaces included); the hard cap is 370']);
  assert.ok(withLen.startsWith('BASE'));
  assert.ok(withLen.includes('between 340 and 360'));
  assert.ok(!P.repairPrompt('BASE', prev, ['sentence 1: number "5" does not appear in the article']).includes('LENGTH FIX'));
  assert.ok(P.repairPrompt('BASE', {scenes: []}, ['scene 1: x']).includes('scene 1: x'));
});

test('parseJsonLoose survives chatty app-agent replies', () => {
  const obj = {a: 1, b: {c: 'x}y'}};
  const raw = JSON.stringify(obj);
  const cases = [
    `  \n${raw}\n  `,
    `Sure, here is the script:\n${raw}`,
    `Here you go.\n\`\`\`json\n${raw}\n\`\`\`\nLet me know if you want changes.`,
    `${raw}\n\nNote: I kept {every} number as written.`,
    `Result: {not json} then\n${raw}`,
    '```\n{"a":1,"b":{"c":"x}y"},}\n```',
    `\uFEFF${raw}`,
  ];
  for (const c of cases) assert.deepEqual(P.parseJsonLoose(c), obj, c);
  assert.throws(() => P.parseJsonLoose('no json here'));
});

test('every prompt ends with the JSON-only instruction', () => {
  const art = {title: 't', source: 's', date: 'd', body: 'b'};
  const sent = [{id: 's1', text: 'x', startSec: 0, endSec: 1}];
  for (const p of [
    P.scriptPrompt(art),
    P.fidelityPrompt(art, {headline: {line1: 'a', line2: 'b'}, sentences: [{id: 's1', text: 'x'}]}),
    P.plannerPrompt({headline: {line1: 'a', line2: 'b'}, sentences: sent, assets: []}),
    P.repairPrompt('BASE', {}, ['e']),
  ]) assert.ok(p.includes('no code fence'));
});

test('number_callout needs digits in from/to and demotes to text_card', () => {
  const sents = [{id: 's1', text: '\uC218\uC775\uC774 \uB450 \uBC30 \uAC00\uAE5D\uAC8C \uB298\uC5C8\uB2E4. 6.0%\uC600\uB2E4.', startSec: 0, endSec: 6}];
  const plan = {scenes: [{sentenceIds: ['s1'], type: 'number_callout', params: {label: '\uC218\uC775', from: '6.0%', to: '\uB450 \uBC30 \uAC00\uAE5D\uAC8C'}, hideCaption: true, disclaimer: false}]};
  assert.ok(P.validatePlan(plan, sents, []).errors.some((e) => e.includes('must each contain a digit')));
  const {plan: fixed, demoted} = P.demoteNumberlessCallouts(plan, sents);
  assert.equal(demoted, 1);
  assert.equal(fixed.scenes[0].type, 'text_card');
  assert.equal(fixed.scenes[0].hideCaption, false);
  assert.equal(P.validatePlan(fixed, sents, []).ok, true);
});

test('scene length limit is 12 s for data scenes and 10.5 s otherwise', () => {
  const sents = [{id: 's1', text: '6.0%', startSec: 0, endSec: 11.5}];
  const mkPlan = (type, params) => ({scenes: [{sentenceIds: ['s1'], type, params, hideCaption: false, disclaimer: false}]});
  const stat = mkPlan('stat_cards', {title: 't', cards: [{header: 'h', rows: [{label: 'l', value: 6.0}]}, {header: 'h2', rows: [{label: 'l', value: 6.0}]}]});
  assert.ok(!P.validatePlan(stat, sents, []).errors.some((e) => e.includes('lasts')));
  assert.ok(P.validatePlan(mkPlan('text_card', {text: '6.0%'}), sents, []).errors.some((e) => e.includes('lasts 11.5 s')));
  const plannerText = P.plannerPrompt({headline: {line1: 'a', line2: 'b'}, sentences: sents, assets: []});
  assert.ok(plannerText.includes('up to 12 s'));
});

test('fidelity prompt asks for issue notes in the output language', () => {
  const text = P.fidelityPrompt(art, {headline: {line1: 'a', line2: 'b'}, sentences: [{id: 's1', text: 'x', sourceQuote: 'y'}]});
  assert.ok(text.includes('note written in Korean'));
});

test('plan requires asset summaries and warns on source-like text_card sub', () => {
  const sents = [{id: 's1', text: '164 won.', startSec: 0, endSec: 5}];
  const assets = [{ref: 'photo-1', kind: 'photo', caption: '/credit', context: 'before'}];
  const card = (sub) => ({scenes: [{sentenceIds: ['s1'], type: 'text_card', params: {text: 't', sub}, hideCaption: false, disclaimer: false}]});
  const missing = P.validatePlan(card('x'), sents, assets);
  assert.ok(missing.errors.some((e) => e.includes('assetSummaries')));
  const withSum = {...card('Yahoo Finance'), assetSummaries: [{ref: 'photo-1', summary: 'graph of prices'}]};
  const v = P.validatePlan(withSum, sents, assets);
  assert.equal(v.ok, true);
  assert.ok(v.warnings.some((w) => w.includes('looks like a source')));
  assert.equal(v.stats.assetSummaries['photo-1'], 'graph of prices');
  const prompt = P.plannerPrompt({headline: {line1: 'a', line2: 'b'}, sentences: sents, assets});
  assert.ok(prompt.includes('assetSummaries') && prompt.includes('"context": "before"'));
});

test('plannerPrompt adds a revision block only when feedback and previous plan are given', () => {
  const base = {headline: {line1: 'a', line2: 'b'}, sentences: [{id: 's1', text: 'x', startSec: 0, endSec: 3}], assets: []};
  assert.ok(!P.plannerPrompt(base).includes('REVISION'));
  assert.ok(!P.plannerPrompt({...base, feedback: 'fix'}).includes('REVISION'));
  const prev = {assetSummaries: [], scenes: [{sentenceIds: ['s1'], type: 'text_card'}]};
  const text = P.plannerPrompt({...base, feedback: 'make scene 1 a photo', previous: prev});
  assert.ok(text.includes('REVISION') && text.includes('make scene 1 a photo') && text.includes('"type":"text_card"'));
  assert.ok(text.includes('Never move an asset'));
  assert.ok(text.indexOf('REVISION') < text.indexOf('RULES'));
});

test('an asset used in a third scene only produces a warning', () => {
  const sents = [1, 2, 3].map((n) => ({id: 's' + n, text: 'x', startSec: n * 3, endSec: n * 3 + 3}));
  const assets = [{ref: 'photo-1', kind: 'photo'}];
  const sc = (id) => ({sentenceIds: [id], type: 'news_photo', params: {}, hideCaption: false, disclaimer: false, assetRef: 'photo-1'});
  const plan = {assetSummaries: [{ref: 'photo-1', summary: 'a graph'}], scenes: [sc('s1'), sc('s2'), sc('s3')]};
  const v = P.validatePlan(plan, sents, assets);
  assert.equal(v.ok, true);
  assert.ok(v.warnings.some((w) => w.includes('photo-1 is used in 3 scenes')));
  const two = P.validatePlan({...plan, scenes: plan.scenes.slice(0, 2)}, sents.slice(0, 2), assets);
  assert.ok(!two.warnings.some((w) => w.includes('is used in')));
  assert.ok(P.plannerPrompt({headline: {line1: 'a', line2: 'b'}, sentences: sents, assets}).includes('at most 2 times'));
});

test('a single value goes to highlight_card; number_callout needs from and to again', () => {
  const sents = [{id: 's1', text: '3,592 done.', startSec: 0, endSec: 6}];
  const mk = (type, params) => ({assetSummaries: [], scenes: [{sentenceIds: ['s1'], type, params, hideCaption: type === 'number_callout', disclaimer: false}]});
  assert.equal(P.validatePlan(mk('highlight_card', {title: 'cash', value: '3,592', unit: 'x'}), sents, []).ok, true);
  assert.ok(!P.validatePlan(mk('highlight_card', {title: 'cash', value: 'many'}), sents, []).ok);
  assert.ok(!P.validatePlan(mk('highlight_card', {title: 'cash', value: 9999}), sents, []).ok);
  assert.ok(!P.validatePlan(mk('number_callout', {title: 't', label: 'cash', to: 3592}), sents, []).ok);
});

test('heritage scene types validate and allow one hero only', () => {
  const sents = [{id: 's1', text: '46 of 105, 43.8 percent.', startSec: 0, endSec: 6}];
  const mk = (type, params) => ({assetSummaries: [], scenes: [{sentenceIds: ['s1'], type, params, hideCaption: false, disclaimer: false}]});
  const donut = (tones) => mk('donut_ratio', {title: 'old', slices: [{label: 'a', value: 46, tone: tones[0]}, {label: 'b', value: 105, tone: tones[1]}]});
  assert.equal(P.validatePlan(donut(['accent', 'grey']), sents, []).ok, true);
  assert.ok(P.validatePlan(donut(['accent', 'accent']), sents, []).errors.some((e) => e.includes('exactly one slice')));
  assert.equal(P.validatePlan(mk('verdict_card', {title: 'target', cards: [{text: 'a [b]', tone: 'accent'}, {text: 'c', tone: 'contrast'}]}), sents, []).ok, true);
  assert.ok(!P.validatePlan(mk('verdict_card', {title: 'target', cards: [{text: 'a', tone: 'red'}]}), sents, []).ok);
  assert.equal(P.validatePlan(mk('flow_cause_effect', {title: 't', cause: {word: 'a'}, effect: {word: 'b'}}), sents, []).ok, true);
  assert.ok(!P.validatePlan(mk('flow_cause_effect', {title: 't', cause: {word: 'a'}}), sents, []).ok);
  const mixed = P.validatePlan(mk('text_card', {text: 'only [a] and {b c}'}), sents, []);
  assert.equal(mixed.ok, true);
  assert.ok(!mixed.warnings.some((w) => w.includes('emphasis')));
  const many = P.validatePlan(mk('text_card', {text: '{a} {b} [c] [d] [e]'}), sents, []);
  assert.equal(many.ok, true);
  assert.ok(many.warnings.some((w) => w.includes('emphasis marks')));
  const long = P.validatePlan(mk('text_card', {text: 't', title: 'x'.repeat(P.TITLE_MAX_CHARS + 1)}), sents, []);
  assert.ok(long.warnings.some((w) => w.includes('title')));
  const bars = mk('bar_compare_h', {title: 't', source: 's', unit: 'u', bars: [{label: 'a', value: 46, tone: 'accent'}, {label: 'b', value: 105, tone: 'accent'}]});
  assert.ok(P.validatePlan(bars, sents, []).errors.some((e) => e.includes('only one bar')));
});

test('planner prompt lists the heritage types and the no-calculation rule', () => {
  const t = P.plannerPrompt({headline: {line1: 'a', line2: 'b'}, sentences: [{id: 's1', text: 'x', startSec: 0, endSec: 3}], assets: []});
  for (const type of ['highlight_card', 'donut_ratio', 'verdict_card', 'flow_cause_effect']) assert.ok(t.includes(type));
  assert.ok(t.includes('calculated') && t.includes('order the narration says'));
});
