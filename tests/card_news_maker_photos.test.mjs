import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadPanelModule, disposePanelModule } from './panel_module_fixture.mjs';

const source = fs.readFileSync(new URL('../plugins/card-news-maker/panel.tsx', import.meta.url), 'utf8');
const React = { useRef: (value) => ({ current: value }), useState: (value) => [value, () => {}], useEffect() {}, createElement: (type, props, ...children) => ({ type, props: { ...props, children } }) };
const b = loadPanelModule(source, { globals: { document: { createElement: () => ({ getContext: () => ({ measureText: () => ({ width: 1 }) }) }) } }, names: ['CardSupport', 'PreviewCard', 'CardPreview', 'BUILTIN_TEMPLATES', 'cardParams', 'editableDefs', 'normalizePlan', 'validatePlan', 'planPrompt', 'SCRIPT_BUILD', 'STRINGS', 'transformFor', 'makeStore', 'reorderPlan', 'resolveReusedPictures', 'validateCardText'], React });
process.on('exit', () => disposePanelModule(b));
const layout = () => ({ kind: 'layout', id: 'team-basic', name: 'Team Basic', version: 1, language: 'ko', size: { width: 1080, height: 1350 }, shade: { top: 830, bottom: 1350, color: '#000000', from: 0, to: .8 }, font: { family: 'Noto Sans KR', weight: 700, size: 72, tracking: -.04, color: '#FFFFFF', lineHeight: 88 }, lines: [{ left: 125, top: 942, width: 830, align: 'center' }, { left: 125, top: 1058, width: 830, align: 'center' }], logo: { top: 1219, width: 155, dataUrl: 'data:image/svg+xml;base64,PHN2Zy8+' } });
function nodes(tree) { const out = []; function visit(v) { if (!v || typeof v !== 'object') return; if ('type' in v && 'props' in v) out.push(v); for (const x of Object.values(v)) visit(x); } visit(tree); return out; }

test('layout JSON becomes a real common template without changing its source', () => {
  const raw = layout(), before = JSON.stringify(raw), t = b.CardSupport.fromLayout(raw);
  b.CardSupport.validateTemplate(t);
  assert.equal(t.id, 'layout-team-basic'); assert.ok(t.prompt && t.body && t.headline && t.look && t.end);
  assert.deepEqual(t.look.textSlots.map(({ left, top, width, height }) => [left, top, width, height]), [[125, 942, 830, 88], [125, 1058, 830, 88]]);
  assert.equal(t.wordmark.logo.dataUrl, raw.logo.dataUrl);
  assert.equal(JSON.stringify(raw), before);
  assert.deepEqual(b.CardSupport.templateFromFile({ kind: 'card-news-template', version: 1, template: t }), t);
  assert.equal(b.CardSupport.templateFromFile(raw).id, t.id);
});

test('the shared renderer draws exact slots, tracking, gradient and original logo on cover and body', () => {
  const t = b.CardSupport.fromLayout(layout());
  for (const role of ['cover', 'body']) {
    const params = b.cardParams(t, { role, headline: 'First\nSecond', body: 'First\nSecond' }, 1, {});
    const tree = nodes(b.PreviewCard({ data: params }));
    const boxes = tree.filter((n) => n.type === 'div' && n.props.style?.height === 88);
    assert.deepEqual(boxes.map((n) => [n.props.style.left, n.props.style.top, n.props.style.width]), [[125, 942, 830], [125, 1058, 830]]);
    const spans = tree.filter((n) => n.type === 'span');
    assert.deepEqual(spans.map((n) => n.props.children[0]), ['First', 'Second']);
    assert.equal(spans[0].props.style.fontWeight, 700); assert.equal(spans[0].props.style.fontSize, 72);
    assert.equal(spans[0].props.style.letterSpacing, '-0.04em'); assert.equal(spans[0].props.style.marginRight, '0.04em');
    const shade = tree.find((n) => n.props.style?.top === 830);
    assert.equal(shade.props.style.height, 520); assert.equal(shade.props.style.background, 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.8) 100%)');
    const logo = tree.find((n) => n.type === 'img');
    assert.equal(logo.props.src, layout().logo.dataUrl); assert.deepEqual([logo.props.style.left, logo.props.style.top, logo.props.style.width], [462.5, 1219, 155]);
    const editable = b.editableDefs(b.STRINGS.en, role, t);
    assert.ok(editable.some((e) => e.key === (role === 'cover' ? 'headline' : 'body')));
    assert.ok(!editable.some((e) => e.key === 'line1'));
    for (const definition of editable) if (definition.type === 'number') assert.ok(typeof definition.step === 'number' && definition.step > 0);
  }
  const cardSource = JSON.parse(b.SCRIPT_BUILD.match(/const CARD_TSX: string = ("(?:[^"\\]|\\.)*");/)[1]);
  const start = source.indexOf('const PreviewCard:');
  const preview = source.slice(source.indexOf('const SANS', start), source.indexOf('return CardNewsCard;', start));
  assert.ok(cardSource.includes(preview));
  assert.match(cardSource, /imageComponent=\{Img\}/);
  assert.ok(!source.includes('function PhotoCardsPanel'));
});

test('legacy photo work opens as common cards and keeps original text, crops, format and template snapshot', () => {
  const work = { id: 'w', name: 'Work', template: layout(), articleUrl: 'https://example.test/article', requirements: 'Keep it factual', format: 'jpeg', cards: [0, 1].map((i) => ({ lines: ['Line ' + i, 'Second'], crop: { zoom: 1.6, x: -.25, y: .4 }, photo: { path: '/memory/' + i + '.png', name: i + '.png', width: 1920, height: 1080 } })) };
  const before = JSON.stringify(work), j = b.CardSupport.legacyJob(work, 'p');
  assert.equal(j.id, 'photo-p-w'); assert.equal(j.format, 'jpeg'); assert.equal(j.note, 'Keep it factual');
  assert.deepEqual(j.plan.cards.map((c) => c.role), ['cover', 'body']);
  assert.equal(j.plan.cards[0].headline, 'Line 0\nSecond'); assert.equal(j.plan.cards[1].body, 'Line 1\nSecond');
  assert.equal(j.plan.cards[1].crop.zoom, 1.6); assert.equal(j.plan.cards[1].picture.kind, 'file');
  assert.equal(j.templateSnapshot.look.textSlots[1].top, 1058); assert.equal(j.draftId, undefined);
  assert.equal(JSON.stringify(work), before);
});

test('fixed text boxes leave CTA and brand end cards in the shared end renderer and controls', () => {
  const t = b.CardSupport.fromLayout(layout());
  for (const kind of ['cta', 'outro']) {
    t.end = { ...t.end, kind, background: 'solid', solidBg: '#123456', monogram: 'TEAM', tagline: 'Brand ending' };
    const params = b.cardParams(t, { role: 'end', cta: 'VISIBLE_END_CTA' }, 1, {});
    assert.equal(params.textSlots, undefined);
    const tree = nodes(b.PreviewCard({ data: { ...params, textSlots: JSON.stringify(t.look.textSlots) } }));
    assert.ok(tree.some((n) => n.props.style?.background === '#123456'));
    if (kind === 'cta') assert.ok(tree.some((n) => n.props.text === 'VISIBLE_END_CTA'));
    else assert.ok(tree.some((n) => n.props.children?.includes('TEAM')));
    assert.ok(b.editableDefs(b.STRINGS.en, 'end', t).some((d) => d.key === 'cta'));
  }
});

test('one model contract supplies photos as file pictures for standard and fixed-box templates', () => {
  const photos = [{ path: '/a.png', name: 'a.png', w: 1920, h: 1080 }, { path: '/b.png', name: 'b.png', w: 1080, h: 1350 }];
  const raw = { cards: [{ headline: 'Cover', image: { source: 'generate' } }, { body: 'Body', image: { source: 'generate' } }] };
  for (const t of [b.BUILTIN_TEMPLATES.find((t) => t.id === 'report-en'), b.CardSupport.fromLayout(layout())]) {
    const p = b.validatePlan(b.normalizePlan(raw, t, photos), t, photos);
    assert.deepEqual(p.cards.map((c) => c.picture.path), ['/a.png', '/b.png']);
    assert.ok(p.cards.every((c) => c.picture.kind === 'file'));
    const prompt = b.planPrompt(t, { ownPhotos: true, photos }, 'manual', 2, 'Focus on commuters', 'ARTICLE FACTS');
    assert.match(prompt, /Focus on commuters/); assert.match(prompt, /ARTICLE FACTS/); assert.match(prompt, /one per photo/);
    assert.match(prompt, /headline/); assert.match(prompt, /body/); assert.doesNotMatch(prompt, /"lines":/);
  }
  const t = b.CardSupport.fromLayout(layout());
  assert.throws(() => b.validatePlan(b.normalizePlan({ cards: [{ headline: 'One' }] }, t, photos), t, photos), /Expected 2/);
  assert.throws(() => b.validatePlan(b.normalizePlan({ cards: [{ headline: 'One\nTwo\nThree' }] }, t), t), /at most 2/);
});

test('template file boundaries reject invalid boxes, typography and oversized logo data', () => {
  const raw = layout();
  assert.equal(b.CardSupport.validateLayout(raw).length, 0);
  assert.ok(b.CardSupport.validateLayout({ ...raw, version: 0 }).length);
  assert.ok(b.CardSupport.validateLayout({ ...raw, lines: [{ left: 1000, top: 0, width: 830, align: 'center' }] }).length);
  const t = b.CardSupport.fromLayout(raw);
  assert.throws(() => b.CardSupport.validateTemplate({ ...t, look: { ...t.look, textSlots: [{ left: 0, top: 1300, width: 100, height: 88, align: 'center' }] } }), /inside/);
  assert.throws(() => b.CardSupport.validateTemplate({ ...t, headline: { ...t.headline, tracking: 1 } }), /typography/);
  assert.throws(() => b.CardSupport.templateFromFile({ kind: 'unknown' }), /Not a card news/);
});

test('photo crop covers all supported frame sizes and the shared transform agrees with placement', () => {
  for (const size of [{ width: 1080, height: 1350 }, { width: 1080, height: 1080 }, { width: 1080, height: 1920 }]) {
    const t = b.CardSupport.fromLayout({ ...layout(), size, shade: null, lines: [{ left: 0, top: 0, width: 500, align: 'center' }], logo: null });
    for (const [w, h] of [[1920, 1080], [1080, 1620], [1000, 1000]]) for (const crop of [{ zoom: 1, x: 0, y: 0 }, { zoom: 2, x: -.25, y: .4 }]) {
      const p = b.CardSupport.photoPlacement(w, h, crop, size), tr = b.transformFor(t, 'body', w, h, crop);
      assert.ok(p.left <= 1e-9 && p.top <= 1e-9 && p.left + p.width >= size.width - 1e-9 && p.top + p.height >= size.height - 1e-9);
      assert.ok(Math.abs(tr.scale - p.transform.scale) < 1e-9); assert.ok(Math.abs(tr.posX - p.transform.position.x) < 1e-9); assert.ok(Math.abs(tr.posY - p.transform.position.y) < 1e-9);
    }
  }
});

test('article text is accepted only from actual article markup and preserves factual text', () => {
  const body = 'Reported article facts. '.repeat(50);
  assert.equal(b.CardSupport.extractArticle('u', `<meta property="og:type" content="article"><article><p>${body}</p></article>`).body, body.trim());
  assert.equal(b.CardSupport.extractArticle('u', `<p>${body}</p>`).body, '');
  assert.equal(b.CardSupport.articleFromText('Title\nFacts').title, 'Title');
});

test('common stores serialize writes and remount reads wait for the latest queued snapshot', async () => {
  let disk = new TextEncoder().encode('{}'), release;
  const gate = new Promise((r) => { release = r; });
  const files = { join: path.posix.join, homedir: () => '/memory', exists: async () => true, mkdir: async () => {}, readdir: async () => ['j.json'], readFile: async () => disk, writeFile: async (_, data) => { await gate; disk = data; }, rm: async () => {} };
  const h = loadPanelModule(source, { names: ['makeStore'], React, overrides: { hostSdk: { files } } });
  try {
    const first = h.makeStore().put('jobs', 'j', { id: 'j', name: 'older' });
    const second = h.makeStore().put('jobs', 'j', { id: 'j', name: 'latest' });
    let finished = false; const reading = h.makeStore().list('jobs').then((x) => { finished = true; return x; });
    await new Promise((r) => setImmediate(r)); assert.equal(finished, false);
    release(); await Promise.all([first, second]); assert.equal((await reading)[0].name, 'latest');
  } finally { disposePanelModule(h); }
});


test('reordering and deleting cards preserve reuse targets, including forward references', () => {
  const cards = [{ role: 'cover', headline: 'A', picture: { kind: 'file', path: '/a.png' } }, { role: 'body', body: 'B', picture: { kind: 'file', path: '/b.png' } }, { role: 'body', body: 'C', picture: { kind: 'reuse', reuse: 1 } }];
  const pictures = [{ resourceId: 'a', kind: 'file' }, { resourceId: 'b', kind: 'file' }, { resourceId: 'b', kind: 'reuse' }];
  const moved = b.reorderPlan(cards, pictures, 2, -1);
  assert.equal(moved.cards[1].picture.reuse, 2);
  assert.equal(b.resolveReusedPictures(moved.cards, moved.pictures)[1].resourceId, 'b');
  const removed = b.reorderPlan(cards, pictures, 1, null);
  assert.equal(removed.cards[1].picture.kind, 'file'); assert.equal(removed.cards[1].picture.path, '/b.png');
  assert.equal(removed.pictures[1].resourceId, 'b');
  assert.throws(() => b.resolveReusedPictures([{ picture: { kind: 'reuse', reuse: 0 } }], []), /cycle/);
  const ending = [...cards.slice(0, 2), { role: 'end', cta: 'VISIBLE_END_CTA', picture: { kind: 'reuse', reuse: 0 } }];
  const stable = b.reorderPlan(ending, [], 2, -1);
  assert.equal(stable.cards[2].role, 'end'); assert.equal(stable.cards[2].cta, 'VISIBLE_END_CTA');
  assert.equal(b.reorderPlan(ending, [], 1, 1).cards[2].role, 'end');
  const pair = [cards[0], ending[2]];
  assert.deepEqual(b.reorderPlan(pair, [], 0, null).cards, pair);
  assert.equal(JSON.stringify(b.reorderPlan(pair, [], 1, null).cards), JSON.stringify([cards[0]]));
});

test('custom frame and gradient survive switching fixed text boxes off', () => {
  const raw = { ...layout(), size: { width: 1080, height: 1080 }, logo: null, shade: { top: 630, bottom: 1080, color: '#000000', from: 0, to: .8 }, lines: [{ left: 125, top: 776, width: 830, align: 'center' }] };
  const t = b.CardSupport.fromLayout(raw); t.look.textSlots = null;
  const params = b.cardParams(t, { role: 'cover', headline: 'Text' }, 1, {});
  assert.equal(params.cardHeight, 1080); assert.equal(params.cardWidth, 1080);
  const tree = nodes(b.PreviewCard({ data: params }));
  assert.equal(tree[0].props.style.height, 1080);
  assert.equal(tree.find((n) => n.props.style?.top === 630).props.style.height, 450);
  assert.ok(t.look.cover.textBottom <= 1080);
  const tr = b.transformFor(t, 'cover', 1920, 1080);
  assert.equal(tr.scale, 1.7778);
  const wide = b.CardSupport.fromLayout({ ...layout(), size: { width: 2000, height: 1350 }, logo: null });
  wide.look.textSlots = null;
  const wideTransform = b.transformFor(wide, 'cover', 1000, 1000);
  assert.ok(1350 * wideTransform.scale >= 2000 - .1);
});


test('shared preview keeps enlarged photo width instead of inheriting the host max-width clamp', () => {
  const t = b.CardSupport.fromLayout(layout());
  const card = { role: 'cover', headline: 'Text', crop: { zoom: 1.6, x: -.25, y: .4 }, picture: { kind: 'file' } };
  const tree = nodes(b.CardPreview({ t, card, made: { w: 2000, h: 1500 }, vars: {}, S: b.STRINGS.en, image: 'data:image/png;base64,YQ==' }));
  const image = tree.find((n) => n.type === 'img');
  assert.ok(image.props.style.width > 1080);
  assert.equal(image.props.style.maxWidth, 'none');
});
