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

test('the layout check reads the lines the template draws: overflow is an error, a third line a warning', async () => {
  const { fitProblems, LAYOUT_ERROR } = await import('../src/prompts/fit.ts');
  const { readFileSync } = await import('node:fs');
  // The 14b3d80 re-review inputs, unchanged (RESEARCH/T1M_UI_REREVIEW_14B3D80_2026_10_24/CASES.json).
  const cases = Object.fromEntries(JSON.parse(readFileSync(new URL('./fixtures/layout-cases-14b3d80.json', import.meta.url), 'utf8')).map((c) => [c.id, c]));
  const fit = (id) => fitProblems(cases[id].type, cases[id].data);
  for (const id of ['text-long', 'quote-long', 'stat-four', 'highlight-long']) assert.deepEqual(fit(id), {errors: [], warnings: []}, id);
  // a { } mark wider than a line breaks at its spaces and stays marked on each line, inside x 60..1020
  assert.deepEqual(fit('text-marked'), {errors: [], warnings: []});
  // three lines that fit: a warning only
  assert.deepEqual(fit('text-three').errors, []);
  assert.match(fit('text-three').warnings[0], /takes 3 lines at 72 px/);
  // eight quote lines at the spec's 92 px spacing, nine text lines: past the source line
  assert.match(fit('quote-wrapped-eight').errors[0], /^quote ".*" does not fit: 8 lines at 66 px run past its room/);
  assert.match(fit('text-nine').errors[0], /^text ".*" does not fit: 9 lines at 72 px/);
  // two-line card names: the cards hold their numbers and run past the source line instead
  const grid = fit('stat-grid-long-header').errors;
  assert.ok(grid.length && grid.every((e) => /^card ".*" does not fit: the cards run below their room/.test(e)), grid.join('\n'));
  assert.ok([...Object.keys(cases).flatMap((id) => fit(id).errors)].every((e) => LAYOUT_ERROR.test(e)));
  // a number wider than a quarter card even on a line of its own (one card has two rows, so no 2x2)
  const card = {header: 'a', rows: [{label: 'b', value: '1\uC5B55000\uB9CC', unit: '\uC6D0'}]};
  assert.deepEqual(fitProblems('stat_cards', {cards: [card, card, card, card]}), {errors: [], warnings: []});
  assert.match(fitProblems('stat_cards', {cards: [card, card, card, {header: 'a', rows: [card.rows[0], card.rows[0]]}]}).errors[0], /card number "1\uC5B5 5000\uB9CC" does not fit: wider than its room/);
  // validatePlan carries them with the scene prefix: overflow as an error, the third line as a warning
  const plan = (params) => P.validatePlan({assetSummaries: [], scenes: [{sentenceIds: ['s1'], type: 'text_card', params, hideCaption: false, disclaimer: false}]}, [{id: 's1', text: 'x', startSec: 0, endSec: 3}], []);
  assert.ok(plan(cases['text-three'].data).warnings.some((w) => /^scene 1: text ".*" takes 3 lines/.test(w)));
  assert.ok(plan(cases['text-nine'].data).errors.some((e) => /^scene 1: text ".*" does not fit/.test(e)));
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
  // every scene keeps its caption (style spec 1)
  assert.ok(t.includes('hideCaption is always false') && !t.includes('hideCaption=true'));
});

test('number_callout must not carry an assetRef', () => {
  const sents = [{id: 's1', text: '6.0 to 7.0', startSec: 0, endSec: 6}];
  const assets = [{ref: 'photo-1', kind: 'photo'}];
  const plan = {assetSummaries: [{ref: 'photo-1', summary: 'x'}], scenes: [{sentenceIds: ['s1'], type: 'number_callout', params: {title: 't', label: 'l', from: 6.0, to: 7.0}, hideCaption: true, disclaimer: false, assetRef: 'photo-1'}]};
  assert.ok(P.validatePlan(plan, sents, assets).errors.some((e) => e.includes('must not carry an assetRef')));
  delete plan.scenes[0].assetRef;
  assert.equal(P.validatePlan(plan, sents, assets).ok, true);
});

test('every plan check message has a Korean text for the panel; English panels keep the message', async () => {
  const { issueText } = await import('../src/issues.ts');
  const { readFileSync } = await import('node:fs');
  const cases = JSON.parse(readFileSync(new URL('./fixtures/layout-cases-14b3d80.json', import.meta.url), 'utf8'));
  const sents = [{id: 's1', text: '3592 and 46 of 105.', startSec: 0, endSec: 14}, {id: 's2', text: 'b', startSec: 14, endSec: 16}];
  const assets = [{ref: 'photo-1', kind: 'photo'}, {ref: 'photo-2', kind: 'photo'}, {ref: 'ill-1', kind: 'illustration'}];
  const sc = (type, params, extra = {}) => ({sentenceIds: ['s1'], type, params, hideCaption: false, disclaimer: false, ...extra});
  const plans = [
    ...cases.map((c) => [sc(c.type, c.data)]),
    ...P.SCENE_TYPES.map((type) => [sc(type, {})]),
    [sc('highlight_card', {title: 'x'.repeat(30), subtitle: 'y'.repeat(40), value: 35920})],
    [sc('number_callout', {label: 'a', from: 'about', to: 'twice'})],
    [sc('number_callout', {label: 'a', from: 1, to: 3592})],
    [sc('donut_ratio', {title: 't', slices: [{label: 'a', value: 7, tone: 'red'}]})],
    [sc('verdict_card', {title: 't', cards: [{text: 'a', tone: 'accent'}, {text: 'b', tone: 'accent'}, {text: 'c', tone: 'x'}]})],
    [sc('bar_compare_h', {title: 't', source: 's', unit: '%', bars: [{label: 'a', value: 1, tone: 'accent'}, {label: 'b', value: 2, tone: 'accent'}, {}]})],
    [sc('line_trend_callout', {title: 't', source: 's', unit: 'u', points: [{x: 1}], endLabel: 9, accentFrom: 5})],
    [sc('stat_cards', {title: 't', cards: [{header: 'a', rows: [{}]}]})],
    [sc('quote_card', {name: 'n', affiliation: 'a', lines: ['one'], accentLines: [3]})],
    [sc('news_photo', {focus: 'middle'}, {assetRef: 'ill-1'})],
    [sc('news_photo', {}, {assetRef: 'photo-9'})],
    [sc('text_card', {text: '{a} {b} [c] [d] [e]', sub: 'Reuters'}, {assetRef: 'photo-1', disclaimer: true, hideCaption: 'no'})],
    [sc('text_card', {text: 'a'}), {...sc('news_photo', {}, {assetRef: 'photo-1'}), sentenceIds: ['s2']}],
    [1, sc('mystery', {}), {...sc('news_photo', {}, {assetRef: 'photo-1'}), sentenceIds: ['s9']}],
    Array.from({length: 6}, (_, i) => ({...sc(i ? 'text_card' : 'news_photo', {text: 'a'}, {assetRef: 'photo-1'}), sentenceIds: [i ? 's2' : 's1']})),
  ];
  const seen = new Set();
  for (const scenes of plans) {
    const v = P.validatePlan({assetSummaries: [{ref: 'photo-1', summary: 'x'}], scenes}, sents, assets);
    for (const m of [...v.errors, ...v.warnings]) seen.add(m);
  }
  assert.ok(seen.size > 40, String(seen.size));
  for (const m of seen) {
    const ko = issueText('ko', m);
    assert.notEqual(ko, m, 'no Korean text for: ' + m);
    assert.match(ko, /[\uAC00-\uD7A3]/);
    // what a row shows after its "scene N" reads the same way
    const row = /^scene \d+\b:? ?(.*)$/.exec(m);
    if (row) assert.notEqual(issueText('ko', row[1]), row[1], 'no Korean text for the row part of: ' + m);
    assert.equal(issueText('en', m), m);
  }
  // the Staging case (value 35920 and a long title on a highlight card) says what to change
  assert.equal(issueText('ko', '.value: number "35920" is not in this scene\'s narration; use only numbers from the article'),
    '\uAC12 \u2013 \uC22B\uC790 \u201C35920\u201D: \uC774 \uC7A5\uBA74 \uB098\uB808\uC774\uC158\uC5D0 \uC5C6\uB294 \uC22B\uC790\uC608\uC694. \uC774 \uC7A5\uBA74\uC5D0\uC11C \uC77D\uB294 \uAE30\uC0AC \uC22B\uC790\uB85C \uBC14\uAFD4 \uC8FC\uC138\uC694.');
});
