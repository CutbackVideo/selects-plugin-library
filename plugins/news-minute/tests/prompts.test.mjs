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
  // three lines that fit: a warning only. The review's six-word input takes two lines at Pretendard's drawn Hangul width
  // (0.864 em, not the old 0.95 estimate); one more word takes the third.
  assert.deepEqual(fit('text-three'), {errors: [], warnings: []});
  const three = fitProblems('text_card', {...cases['text-three'].data, text: cases['text-three'].data.text + ' ' + cases['text-three'].data.text.split(' ')[0]});
  assert.deepEqual(three.errors, []);
  assert.match(three.warnings[0], /takes 3 lines at 72 px/);
  // eight quote lines at the spec's 92 px spacing, nine text lines: past the source line
  assert.match(fit('quote-wrapped-eight').errors[0], /^quote ".*" does not fit: 8 lines at 66 px run past its room/);
  assert.match(fit('text-nine').errors[0], /^text ".*" does not fit: 9 lines at 72 px/);
  // Card names two by two: at Pretendard's drawn Hangul width (0.864 em) "\uC11C\uC6B8 \uB3D9\uBD81\uBD80 \uC2E0\uCD95 \uC544\uD30C\uD2B8" (396 px) takes one line of
  // its 438 px band, so the cards fit; the old 0.95 estimate (458 px) broke it onto two and ran the cards past the
  // source line. A name that does take two lines still grows every card (stat-grid-one-long-header below).
  assert.deepEqual(fit('stat-grid-long-header'), {errors: [], warnings: []});
  // ba63f5a re-review inputs (RESEARCH/T1M_UI_REREVIEW_BA63F5A_2026_10_24/CASES.json): one long card name grows every
  // card; the error names that card, not only the cards at the bottom. The shortened variant and the customer's own
  // cards fit. Its long name now takes one line (as above), so the name gets one more word to take two.
  const more = Object.fromEntries(JSON.parse(readFileSync(new URL('./fixtures/layout-cases-ba63f5a.json', import.meta.url), 'utf8')).map((c) => [c.id, c]));
  const long1 = more['stat-grid-one-long-header'].data;
  assert.deepEqual(fitProblems('stat_cards', long1), {errors: [], warnings: []});
  const longer = {...long1, cards: long1.cards.map((c, i) => (i ? c : {...c, header: c.header + ' \uBCF4\uC99D\uAE08'}))};
  const one = fitProblems('stat_cards', longer).errors;
  assert.equal(one.length, 1, one.join('\n'));
  assert.match(one[0], new RegExp('^card "' + longer.cards[0].header + '" does not fit: its text takes more lines'));
  for (const id of ['stat-grid-shortened', 'customer-wolse-three', 'customer-quote']) assert.deepEqual(fitProblems(more[id].type, more[id].data).errors, [], id);
  assert.ok([...Object.keys(cases).flatMap((id) => fit(id).errors)].every((e) => LAYOUT_ERROR.test(e)));
  // a number wider than a quarter card even on a line of its own (one card has two rows, so no 2x2)
  const card = {header: 'a', rows: [{label: 'b', value: '1\uC5B55000\uB9CC', unit: '\uC6D0'}]};
  assert.deepEqual(fitProblems('stat_cards', {cards: [card, card, card, card]}), {errors: [], warnings: []});
  assert.match(fitProblems('stat_cards', {cards: [card, card, card, {header: 'a', rows: [card.rows[0], card.rows[0]]}]}).errors[0], /card number "1\uC5B5 5000\uB9CC" does not fit: wider than its room/);
  // validatePlan carries them with the scene prefix: overflow as an error, the third line as a warning
  const plan = (params) => P.validatePlan({assetSummaries: [], scenes: [{sentenceIds: ['s1'], type: 'text_card', params, hideCaption: false, disclaimer: false}]}, [{id: 's1', text: 'x', startSec: 0, endSec: 3}], []);
  assert.ok(plan({...cases['text-three'].data, text: cases['text-three'].data.text + ' ' + cases['text-three'].data.text.split(' ')[0]}).warnings.some((w) => /^scene 1: text ".*" takes 3 lines/.test(w)));
  assert.ok(plan(cases['text-nine'].data).errors.some((e) => /^scene 1: text ".*" does not fit/.test(e)));
});

test('the layout check measures a value and its unit as drawn: the final count-up text in Pretendard widths', async () => {
  const { fitProblems } = await import('../src/prompts/fit.ts');
  const { layoutReports } = await import('../src/templates/entrance.generated.ts');
  const { readFileSync } = await import('node:fs');
  // f106b06 review inputs (RESEARCH/T1M_UI_REVIEW_F106B06_2026_10_24/BLOCKING_CASES.json, CASES.json): both blocking
  // inputs ran out of their card in Chrome with no error.
  const cases = Object.fromEntries(JSON.parse(readFileSync(new URL('./fixtures/layout-cases-f106b06.json', import.meta.url), 'utf8')).map((c) => [c.id, c]));
  const reps = (type, data) => layoutReports(type, data);
  // The finished frame's reports; the same text a moment larger as it comes in is reported apart (`entrance`).
  const one = (list, what) => list.filter((r) => r.what === what && !r.entrance);
  const width = (r) => r.box[2] - r.box[0];
  const WON = '\uC6D0';
  // 1000000 counts up to 1,000,000 (752.8 px at 150 px in Chrome): with its unit it is wider than the card's room
  // (760 px), so the unit takes a line of its own and the value stays inside the card.
  const million = cases['highlight-million-won'];
  assert.deepEqual(fitProblems(million.type, million.data), { errors: [], warnings: [] });
  const [value] = one(reps(million.type, million.data), 'value');
  assert.equal(value.text, '1,000,000');
  assert.ok(Math.abs(width(value) - 752.83) < 0.5, String(width(value)));
  assert.ok(value.box[0] >= 160 && value.box[2] <= 920, value.box.join());
  assert.equal(one(reps(million.type, million.data), 'unit').length, 1);
  // 9,999,999 is as wide in tabular digits; 10,000,000 does not fit even on a line of its own.
  for (const v of [9999999, '9999999']) assert.deepEqual(fitProblems('highlight_card', { ...million.data, value: v }).errors, [], String(v));
  assert.match(fitProblems('highlight_card', { ...million.data, value: 10000000 }).errors[0], /^value "10,000,000" does not fit: wider than its room/);
  // A value that fits with its unit keeps it beside, measured together.
  const beside = reps('highlight_card', { ...million.data, value: 3592 });
  assert.deepEqual(one(beside, 'unit'), []);
  assert.equal(one(beside, 'value')[0].text, '3592' + WON);
  // Number cards: "10000" MW was 302.72 px drawn in a 296 px card (MW alone 67.75 px); the unit now goes under the
  // number, and a number wider than the card even alone is an error.
  const mw = cases['stat-string-mw'];
  assert.deepEqual(fitProblems(mw.type, mw.data), { errors: [], warnings: [] });
  const mwReps = reps(mw.type, mw.data);
  assert.equal(one(mwReps, 'card unit').length, 3);
  for (const r of one(mwReps, 'card number')) assert.ok(Math.abs(width(r) - 232.97) < 0.5, String(width(r)));
  assert.ok(Math.abs(width(one(mwReps, 'card unit')[0]) - 67.75) < 0.5);
  const wide = { ...mw.data, cards: mw.data.cards.map((c) => ({ ...c, rows: [{ ...c.rows[0], value: '100000' }] })) };
  assert.match(fitProblems('stat_cards', wide).errors[0], /^card number "100000" does not fit: wider than its room/);
  // The same final text in the other count-ups: a string value with no commas counts up to one with them.
  assert.equal(one(reps('number_callout', { title: 't', from: '3592', to: '1000000', unit: '' }), 'new value')[0].text, '1,000,000');
  assert.equal(one(reps('line_trend_callout', { title: 't', points: [{ x: 'a', y: 1 }, { x: 'b', y: 2 }], endLabel: '1000000' }), 'end value')[0].text, '1,000,000');
  // number_callout values measure against the graphic area x 60..1020: 199\uC5B55000\uB9CC stays on one line (924.6 px)
  // with the unit under it, as reviewed.
  const two = cases['number-two-lines'];
  assert.deepEqual(fitProblems(two.type, two.data), { errors: [], warnings: [] });
  const twoReps = reps(two.type, two.data);
  assert.equal(one(twoReps, 'new value')[0].lines, 1);
  assert.equal(one(twoReps, 'new value unit').length, 1);
});

test('the layout check measures names and labels as drawn and values at their size while they come in', async () => {
  const { fitProblems } = await import('../src/prompts/fit.ts');
  const { layoutReports } = await import('../src/templates/entrance.generated.ts');
  const { readFileSync } = await import('node:fs');
  // 72d73e5 review inputs (RESEARCH/T1M_UI_REVIEW_72D73E5_2026_10_24/BLOCKING_CASES.json): in Chrome WALMART is 220.52 px
  // at 44/800/-1 in a 213 px card and SAMSUNG runs past x 1020, both with no error when names were measured by ems.
  const cases = Object.fromEntries(JSON.parse(readFileSync(new URL('./fixtures/layout-cases-72d73e5.json', import.meta.url), 'utf8')).map((c) => [c.id, c]));
  const names = (id) => layoutReports(cases[id].type, cases[id].data).filter((r) => r.what === 'card name');
  const walmart = names('stat-retail-names')[0];
  // Kerning is left out, so the measure is a little wider than drawn, never narrower.
  assert.ok(walmart.box[2] - walmart.box[0] >= 220.52 && walmart.box[2] - walmart.box[0] < 220.52 * 1.02, walmart.box.join());
  const retail = fitProblems(cases['stat-retail-names'].type, cases['stat-retail-names'].data).errors;
  assert.ok(retail.some((e) => /^card name "WALMART" does not fit: wider than its room at 44 px/.test(e)), retail.join('\n'));
  const chip = fitProblems(cases['stat-chip-names'].type, cases['stat-chip-names'].data).errors;
  assert.deepEqual(chip.map((e) => e.split(' does not fit')[0]), ['card name "SAMSUNG"']);
  // highlight_card pops its value in 3 % wide: 10,000,000 (849.2 px) reaches x 102.9..977.1 and leaves the 860 px card
  // (x 110..970) for a moment. 1,000,000 keeps the 50 px padding when finished and stays in the card as it grows.
  const f = Object.fromEntries(JSON.parse(readFileSync(new URL('./fixtures/layout-cases-f106b06.json', import.meta.url), 'utf8')).map((c) => [c.id, c]));
  const million = f['highlight-million-won'];
  const grown = (data) => layoutReports('highlight_card', data).filter((r) => r.what === 'value' && r.entrance);
  const [ten] = grown({ ...million.data, value: 10000000 });
  assert.ok(Math.abs(ten.box[0] - 102.89) < 0.5 && Math.abs(ten.box[2] - 977.11) < 0.5, ten.box.join());
  // 10,000,000 is already wider than its room when finished: that is its one error. The entrance error alone is for
  // text that fits when finished, e.g. the same value in a card without the 50 px padding check.
  assert.deepEqual(fitProblems('highlight_card', { ...million.data, value: 10000000 }).errors.filter((e) => e.startsWith('value ')), ['value "10,000,000" does not fit: wider than its room at 150 px even on a line of its own (text is never made smaller), so it would be cut off; shorten it']);
  for (const v of [1000000, 9999999]) assert.deepEqual(fitProblems('highlight_card', { ...million.data, value: v }), { errors: [], warnings: [] }, String(v));
  // The entrance message, for text that fits when finished (none of the review inputs: every template's padding is
  // wider than 3 % of its text), has its Korean text.
  const { issueText } = await import('../src/issues.ts');
  const grownMsg = 'value "1" does not fit: it runs out of its card while it comes in (3 % larger for a moment) at 150 px, so it would show outside it; shorten it';
  assert.match(issueText('ko', grownMsg), /3% /);
  // number_callout's new value pops in too: 199\uC5B55000\uB9CC reaches x 63.8..1016.2, inside the window.
  const two = f['number-two-lines'];
  const [to] = layoutReports(two.type, two.data).filter((r) => r.what === 'new value' && r.entrance);
  assert.ok(Math.abs(to.box[0] - 63.81) < 0.5 && Math.abs(to.box[2] - 1016.19) < 0.5, to.box.join());
  assert.deepEqual(fitProblems(two.type, two.data), { errors: [], warnings: [] });
});

test('text outside a card stays inside x 60..1020 while it comes in; the trend end value grows from its right edge', async () => {
  const { fitProblems } = await import('../src/prompts/fit.ts');
  const { layoutReports } = await import('../src/templates/entrance.generated.ts');
  const { readFileSync } = await import('node:fs');
  // 3199cee review inputs (RESEARCH/T1M_UI_REVIEW_3199CEE_2026_10_24/BLOCKING_CASES.json): in Chrome, with no error,
  // 100,000,000 (945.4 px finished) reached x 53.22..1026.78 at frame 70, "199\uC5B5 5000\uB9CC" x 48.52..1031.48, and the text
  // end value x 1024.44 at frame 123. Style spec 1 keeps large text inside x 60..1020 with no exception for entrances.
  const cases = Object.fromEntries(JSON.parse(readFileSync(new URL('./fixtures/layout-cases-3199cee.json', import.meta.url), 'utf8')).map((c) => [c.id, c]));
  const fit = (id) => fitProblems(cases[id].type, cases[id].data);
  const grown = (id, what) => layoutReports(cases[id].type, cases[id].data).filter((r) => r.what === what && r.entrance);
  const [hundred] = grown('number-safe-boundary', 'new value');
  assert.ok(Math.abs(hundred.box[0] - 53.22) < 0.5 && Math.abs(hundred.box[2] - 1026.78) < 0.5, hundred.box.join());
  assert.deepEqual(fit('number-safe-boundary').errors, ['new value "100,000,000" does not fit: it runs out of its safe area while it comes in (3 % larger for a moment) at 150 px, so it would show outside it; shorten it']);
  // The new value's lines and its unit's place are chosen at the popped size: with the space it may break there, and
  // the two lines then run past the source line.
  const spaced = layoutReports(cases['number-spaced-boundary'].type, cases['number-spaced-boundary'].data).filter((r) => r.what === 'new value' && !r.entrance);
  assert.equal(spaced[0].lines, 2);
  assert.match(fit('number-spaced-boundary').errors[0], /^new value ".*" does not fit: 2 lines at 150 px run past its room/);
  // The reviewed one-line 199\uC5B55000\uB9CC (924.6 px, x 63.8..1016.2 at its largest) keeps its layout.
  const f = Object.fromEntries(JSON.parse(readFileSync(new URL('./fixtures/layout-cases-f106b06.json', import.meta.url), 'utf8')).map((c) => [c.id, c]));
  assert.deepEqual(fitProblems(f['number-two-lines'].type, f['number-two-lines'].data), { errors: [], warnings: [] });
  // The end value is anchored at x 1020 and now grows leftwards from it.
  const [end] = grown('trend-safe-boundary', 'end value');
  assert.equal(end.box[2], 1020);
  assert.deepEqual(fit('trend-safe-boundary'), { errors: [], warnings: [] });
  // A text end value 957 px wide fits when finished but would reach left of x 60 as it grows: an error.
  const wide = { ...cases['trend-safe-boundary'].data, endLabel: '\uC0AC\uC0C1 \uCD5C\uACE0 '.repeat(3).trim() + '!' };
  const wideEnd = layoutReports('line_trend_callout', wide).filter((r) => r.what === 'end value');
  assert.ok(wideEnd[0].box[0] >= 60 && wideEnd[1].box[0] < 59, wideEnd.map((r) => r.box.join()).join(' / '));
  assert.match(fitProblems('line_trend_callout', wide).errors[0], /^end value ".*" does not fit: it runs out of its safe area while it comes in/);
});

test('a count down is centred on what it shows; a count that would leave x 60..1020 does not run', async () => {
  const { fitProblems } = await import('../src/prompts/fit.ts');
  const { layoutReports } = await import('../src/templates/entrance.generated.ts');
  const { issueText } = await import('../src/issues.ts');
  const { readFileSync } = await import('node:fs');
  // 0641a86 review inputs (RESEARCH/T1M_UI_REVIEW_0641A86_2026_10_24/BLOCKING_CASES.json): with no error, the count
  // right-aligned in the final value's slot drew 1,000,000 at x 13.73..789.14 (1,000,000 -> 999,999\uC6D0) and 526028274 at
  // x -370.75..520.98 (1000000000 -> 1\uC6D0) at frame 70.
  const cases = Object.fromEntries(JSON.parse(readFileSync(new URL('./fixtures/layout-cases-0641a86.json', import.meta.url), 'utf8')).map((c) => [c.id, c]));
  const reps = (id) => layoutReports(cases[id].type, cases[id].data).filter((r) => r.what === cases[id].type.replace(/^number_callout$/, 'new value').replace(/^line_trend_callout$/, 'end value'));
  // Counting down, the line is centred on what the count shows: 1,000,000 with its unit and triangle fits x 60..1020 at
  // the popped size, so it counts; its left edge at the peak is where Chrome draws 1,000,000 (x 83.73 at frame 70), and
  // the finished 999,999 is centred.
  const [won, wonGrown] = reps('number-down-one-won');
  assert.equal(won.text, '999,999\uC6D0');
  assert.ok(Math.abs((won.box[0] + won.box[2]) / 2 - 540) < 0.01, won.box.join());
  assert.equal(wonGrown.text, '1,000,000\uC6D0');
  assert.ok(Math.abs(wonGrown.box[0] - 83.73) < 0.5, wonGrown.box.join());
  assert.deepEqual(fitProblems(cases['number-down-one-won'].type, cases['number-down-one-won'].data), { errors: [], warnings: [] });
  // 1000000000 is wider than x 60..1020 allows at 150 px: the value pops in as 1\uC6D0, centred, without counting.
  const [one] = reps('number-down-wide');
  assert.ok(Math.abs((one.box[0] + one.box[2]) / 2 - 540) < 0.01, one.box.join());
  assert.deepEqual(fitProblems(cases['number-down-wide'].type, cases['number-down-wide'].data), { errors: [], warnings: [] });
  // The trend end value counts in place at x 1020; counting down from a longer previous point it reaches further left
  // (Chrome: x 2.27 from frame 0), an error.
  const trend = reps('trend-down-wide');
  assert.ok(Math.abs(trend[1].box[0] - 2.27) < 0.5, trend[1].box.join());
  const [err] = fitProblems(cases['trend-down-wide'].type, cases['trend-down-wide'].data).errors;
  assert.equal(err, 'end value "100000000000000000" does not fit: it runs out of its safe area while it counts at 84 px, so it would show outside it; shorten it');
  assert.match(issueText('ko', err), /\uC22B\uC790\uAC00 \uBC14\uB00C\uB294 \uB3D9\uC548 \uC548\uC804 \uC601\uC5ED\(x60~1020\) \uBC16\uC73C\uB85C/);
});

test('trend point values are placed and checked at their drawn width', async () => {
  const { fitProblems } = await import('../src/prompts/fit.ts');
  const { layoutReports } = await import('../src/templates/entrance.generated.ts');
  const { issueText } = await import('../src/issues.ts');
  // F106B06 review input trend-cards-long: placed by an estimate, the first point's "1440" was drawn at x 58.43 with no
  // error (Chrome, finished frame). Measured, it starts at x 60.
  const data = { title: '\uD604\uAE08 \uBCF4\uC720\uC561', source: '\uD68C\uC0AC \uC790\uB8CC', unit: '\uC5B5 \uB2EC\uB7EC', points: [{ x: '2021', y: 1440 }, { x: '2022', y: 1289 }, { x: '2023', y: 1676 }, { x: '2024', y: 3252 }], endLabel: 3252, accentFrom: 2 };
  const points = layoutReports('line_trend_callout', data).filter((r) => r.what === 'point value');
  assert.deepEqual(points.map((r) => r.text), ['1440', '1289', '1676']);
  assert.ok(Math.abs(points[0].box[0] - 60) < 0.01, points[0].box.join());
  assert.deepEqual(fitProblems('line_trend_callout', data), { errors: [], warnings: [] });
  // A point value wider than x 60..1020 is an error.
  const wide = { ...data, points: [{ x: 'a', y: 1 }, { x: 'b', y: 1e33 }, { x: 'c', y: 2 }, { x: 'd', y: 3 }], endLabel: 3 };
  const [err] = fitProblems('line_trend_callout', wide).errors;
  assert.match(err, /^point value ".*" does not fit: wider than its room at 40 px/);
  assert.match(issueText('ko', err), /^\uC810 \uAC12 /);
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
    [sc('highlight_card', {title: 't', value: 10000000, unit: '\uC6D0'})],
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

    ...JSON.parse(readFileSync(new URL('./fixtures/layout-cases-ba63f5a.json', import.meta.url), 'utf8')).map((c) => [sc(c.type, c.data)]),
    [sc('verdict_card', {title: 't', cards: [{text: '\uC11C\uC6B8 \uAC15\uB0A83\uAD6C\uC640 \uC6A9\uC0B0\uAD6C\uC5D0\uC11C \uC804\uC6A9 84\uC81C\uACF1\uBBF8\uD130 \uC774\uC0C1 \uC544\uD30C\uD2B8\uB97C \uB450 \uCC44 \uB118\uAC8C \uAC00\uC9C4 \uC0AC\uB78C\uC740 \uBAA8\uB450 [\uC911\uACFC\uC138] \uB300\uC0C1\uC785\uB2C8\uB2E4', tone: 'accent'}, {text: '1\uC8FC\uD0DD\uC790', tone: 'contrast'}]})],
    [sc('donut_ratio', {title: 't', unit: '%', slices: [{label: 'a', value: 1234567.5, tone: 'accent'}, {label: 'b', value: 3}]})],
    [sc('number_callout', {label: '\uC2DC\uAC00\uCD1D\uC561', from: '1234\uC870 5678\uC5B5 9012\uB9CC', to: '2345\uC870 6789\uC5B5 1234\uB9CC', unit: '\uC6D0'})],
    [sc('flow_cause_effect', {title: 't', cause: {word: '\uAC00\uB098\uB2E4\uB77C\uB9C8\uBC14\uC0AC \uAC00\uB098\uB2E4\uB77C\uB9C8\uBC14\uC0AC \uAC00\uB098\uB2E4\uB77C\uB9C8\uBC14\uC0AC \uAC00\uB098\uB2E4\uB77C\uB9C8\uBC14\uC0AC \uAC00\uB098\uB2E4\uB77C\uB9C8\uBC14\uC0AC'}, effect: {word: 'b'}})],
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
