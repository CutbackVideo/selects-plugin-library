import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadPanelModule, disposePanelModule } from './panel_module_fixture.mjs';

const source = fs.readFileSync(new URL('../plugins/card-news-maker/panel.tsx', import.meta.url), 'utf8');
const React = { useRef: (value) => ({ current: value }), useState: (value) => [value, () => {}], useEffect() {}, createElement: (type, props, ...children) => ({ type, props: { ...props, children } }) };
const b = loadPanelModule(source, { globals: { URL, document: { createElement: () => ({ getContext: () => ({ measureText: () => ({ width: 1 }) }) }) } }, names: ['CardSupport', 'CardEditor', 'PreviewCard', 'CardPreview', 'BUILTIN_TEMPLATES', 'cardParams', 'editableDefs', 'normalizePlan', 'validatePlan', 'planPrompt', 'SCRIPT_BUILD', 'STRINGS', 'transformFor', 'makeStore', 'reorderPlan', 'resolveReusedPictures', 'swapCardPhotos', 'cropByDrag', 'validateCardText'], React });
process.on('exit', () => disposePanelModule(b));
const layout = () => ({ kind: 'layout', id: 'team-basic', name: 'Team Basic', version: 1, language: 'ko', size: { width: 1080, height: 1350 }, shade: { top: 830, bottom: 1350, color: '#000000', from: 0, to: .8 }, font: { family: 'Noto Sans KR', weight: 700, size: 72, tracking: -.04, color: '#FFFFFF', lineHeight: 88 }, lines: [{ left: 125, top: 942, width: 830, align: 'center' }, { left: 125, top: 1058, width: 830, align: 'center' }], logo: { top: 1219, width: 155, dataUrl: 'data:image/svg+xml;base64,PHN2Zy8+' } });
function nodes(tree) { const out = []; function visit(v) { if (!v || typeof v !== 'object') return; if ('type' in v && 'props' in v) out.push(v); for (const x of Object.values(v)) visit(x); } visit(tree); return out; }

test('photo dimensions use one host URL instead of transferring file chunks and release the decoder', async () => {
  const images = [], paths = [];
  class Image {
    naturalWidth = 1080; naturalHeight = 1920; src = '';
    constructor() { images.push(this); }
    async decode() { if (this.src.includes('broken')) throw Error('Invalid image'); }
  }
  const panel = loadPanelModule(source, { names: ['imageSize'], React, globals: { Image } });
  const files = { pathToLocalURL: async path => { paths.push(path); return 'local://' + encodeURIComponent(path); }, readFile() { assert.fail('Photo metadata must not transfer file bytes'); } };
  try {
    for (const name of ['C:\\Photos\\photo.jpg', '/photos/photo.png', '/photos/photo.webp']) {
      assert.deepEqual(JSON.parse(JSON.stringify(await panel.imageSize(files, name))), { w: 1080, h: 1920 });
    }
    await assert.rejects(panel.imageSize(files, '/photos/broken.jpg'), /Invalid image/);
    assert.equal(paths.length, 4);
    assert.ok(images.every(image => image.src === ''));
  } finally { disposePanelModule(panel); }
});

test('photo preview uses the host URL and ignores a reply after unmount', async () => {
  const values = []; let effect, resolveUrl;
  const hooks = { ...React, useState: () => ['', value => values.push(value)], useEffect: fn => { effect = fn; } };
  const panel = loadPanelModule(source, { names: ['useImageUrl'], React: hooks });
  const files = { pathToLocalURL: () => new Promise(resolve => { resolveUrl = resolve; }), readFile() { assert.fail('Photo preview must not transfer file bytes'); } };
  try {
    panel.useImageUrl('/photos/first.jpg', files);
    const cleanup = effect();
    resolveUrl('local://first.jpg');
    await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(values, ['', 'local://first.jpg']);
    cleanup();
    panel.useImageUrl('/photos/second.jpg', files);
    const unmount = effect();
    unmount(); resolveUrl('local://second.jpg');
    await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(values, ['', 'local://first.jpg', '']);
  } finally { disposePanelModule(panel); }
});

test('contact sheets load native photos with canvas CORS and preserve crops, numbering and JPEG fallback', async () => {
  const images = [], draws = [], labels = [], qualities = [];
  class Image {
    src = ''; naturalWidth = 398; naturalHeight = 600;
    constructor() { images.push(this); }
    async decode() { assert.equal(this.crossOrigin, 'anonymous'); if (this.src.includes('broken')) throw Error('Invalid image'); }
  }
  const context = { fillRect() {}, save() {}, beginPath() {}, rect() {}, clip() {}, restore() {},
    drawImage(image, ...bounds) { draws.push({ url: image.src, bounds }); }, fillText(value) { labels.push(value); } };
  const canvas = { getContext: () => context, toDataURL(type, quality) { qualities.push([type, quality]); return quality === .8 ? 'x'.repeat(1400001) : 'data:image/jpeg;base64,small'; } };
  const panel = loadPanelModule(source, { names: ['CardSupport'], React, globals: { Image, document: { createElement: () => canvas } } });
  const files = { pathToLocalURL: async path => 'local://' + encodeURI(path), readFile() { assert.fail('Contact sheets must not transfer photo bytes'); } };
  const size = { width: 1080, height: 1350 }, crop = { fit: 'contain', zoom: .75, x: .2, y: -.1 };
  try {
    const result = await panel.CardSupport.contactSheet([{ photo: { path: '/photos/\ud55c\uae00 #1?.jpg', width: 398, height: 600 }, crop }, {}], size, files);
    assert.equal(result, 'data:image/jpeg;base64,small');
    assert.deepEqual([canvas.width, canvas.height], [432, 270]);
    const p = panel.CardSupport.photoPlacement(398, 600, crop, size), k = 216 / 1080;
    assert.deepEqual(draws[0].bounds, [p.left * k, p.top * k, p.width * k, p.height * k]);
    assert.match(draws[0].url, /%23.*%3F/);
    assert.deepEqual(labels, ['1', '2']);
    assert.deepEqual(qualities, [['image/jpeg', .8], ['image/jpeg', .5]]);
    await assert.rejects(panel.CardSupport.contactSheet([{ photo: { path: '/broken.jpg', width: 398, height: 600 } }], size, files), /Invalid image/);
    await assert.rejects(panel.CardSupport.contactSheet([{ photo: { path: '/missing.jpg' } }], size, { pathToLocalURL() { throw Error('Missing file'); } }), /Missing file/);
    assert.ok(images.every(image => image.src === ''));
  } finally { disposePanelModule(panel); }
});

test('Chosun cover keeps line-break guidance without promising unsupported bracket highlights', () => {
  const raw = JSON.parse(fs.readFileSync(new URL('../plugins/card-news-maker/template-packs/chosun-basic/template.json', import.meta.url), 'utf8'));
  const fixed = b.CardSupport.fromLayout(raw), regular = b.BUILTIN_TEMPLATES[0];
  const ui = new Proxy({}, { get: (_, key) => String(key) });
  for (const [language, S] of Object.entries(b.STRINGS)) {
    for (const t of [fixed, regular]) {
      const card = { role: 'cover', headline: 'First\nSecond', picture: { kind: 'none' } };
      const tree = nodes(b.CardEditor({ ui, S, t, card, index: 0, bodyIndex: 0, plan: { cards: [card] }, vars: {} }));
      const hint = tree.find(n => n.type === 'small').props.children[0];
      assert.equal(hint, t === fixed ? S.headlineLinesHint : S.headlineHint, language);
      assert.ok(hint && (t === fixed ? !hint.includes('[') : hint.includes('[')), language);
      assert.equal(tree.find(n => n.type === 'TextField' && n.props.label === S.headline).props.value, card.headline);
    }
  }
});

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

test('one Chosun pack has its calibrated cover and separate three-line body in preview and planning', () => {
  const raw = JSON.parse(fs.readFileSync(new URL('../plugins/card-news-maker/template-packs/chosun-basic/template.json', import.meta.url)));
  const before = JSON.stringify(raw), t = b.CardSupport.templateFromFile(raw);
  const cover = b.cardParams(t, {role:'cover',headline:'Cover\nHeadline'}, 0, {});
  const body = b.cardParams(t, {role:'body',body:'First\nSecond\nThird'}, 1, {});
  assert.deepEqual(JSON.parse(cover.textSlots).map(x=>[x.left,x.top,x.width,x.height,x.align]), [[125,942,830,88,'center'],[125,1056,830,88,'center']]);
  assert.equal(cover.headlineSize,70.75); assert.equal(cover.headlineWeight,700); assert.ok(cover.logo);
  assert.deepEqual(JSON.parse(body.textSlots).map(x=>[x.left,x.top,x.width,x.height,x.align]), [[105,943,880,82,'left'],[105,1025,880,82,'left'],[105,1107,880,82,'left']]);
  assert.equal(body.tracking,-.0425); assert.equal(body.bodySize,54); assert.equal(body.bodyWeight,400); assert.equal(body.logo,null);
  const tree=nodes(b.PreviewCard({data:body}));
  assert.equal(tree.filter(n=>n.type==='span').length,3); assert.ok(tree.filter(n=>n.type==='span').every(n=>n.props.style.fontWeight===400)); assert.equal(tree.filter(n=>n.type==='img').length,0);
  assert.ok(tree.filter(n=>n.type==='div'&&n.props.style?.height===82).every(n=>n.props.style.justifyContent==='flex-start'));
  const prompt=b.planPrompt(t,{},'manual',4,'','Facts');
  assert.match(prompt,/cover headline[^\n]*1 to 2/); assert.match(prompt,/body[^\n]*1 to 3/);
  const plan=b.normalizePlan({cards:[{headline:'Cover\nHeadline'},{body:'First\nSecond\nThird'}]},t);
  assert.deepEqual(plan.cards.map(c=>c.role),['cover','body']); assert.doesNotThrow(()=>b.validatePlan(plan,t));
  assert.throws(()=>b.validatePlan({...plan,cards:[{role:'body',body:'One\nTwo\nThree\nFour'}]},t),/3/);
  assert.equal(JSON.stringify(raw),before);
});

test('body layout import validates every role and round-trips without changing legacy layout behavior',()=>{
  const raw=layout();raw.body={font:{...raw.font,size:54,weight:500,lineHeight:82},lines:[{left:105,top:942,width:880,align:'left'},{left:105,top:1024,width:880,align:'left'},{left:105,top:1106,width:880,align:'left'}],shade:raw.shade,logo:null};
  assert.equal(b.CardSupport.validateLayout(raw).length,0);
  const t=b.CardSupport.templateFromFile(raw);b.CardSupport.validateTemplate(t);
  assert.equal(JSON.stringify(b.CardSupport.templateFromFile({kind:'card-news-template',version:1,template:JSON.parse(JSON.stringify(t))})),JSON.stringify(t));
  const invalid=structuredClone(raw);invalid.body.lines[2].top=1340;assert.ok(b.CardSupport.validateLayout(invalid).length);
  assert.ok(b.CardSupport.validateLayout({...raw,body:{}}).length);
  const escaped=structuredClone(raw);escaped.body.size={width:1080,height:4000};escaped.body.lines[2].top=2000;assert.ok(b.CardSupport.validateLayout(escaped).length);
  const bad=structuredClone(t);bad.look.body.textSlots[2].width=2000;assert.throws(()=>b.CardSupport.validateTemplate(bad),/fit/);
  const legacy=b.CardSupport.fromLayout(layout());const old=b.cardParams(legacy,{role:'body',body:'One\nTwo'},1,{});
  assert.equal(JSON.parse(old.textSlots).length,2);assert.ok(old.logo);assert.equal(old.bodySize,72);
});

test('Chosun body planning uses news density without treating mixed text as sixteen total characters',()=>{
  const raw=JSON.parse(fs.readFileSync(new URL('../plugins/card-news-maker/template-packs/chosun-basic/template.json',import.meta.url))),t=b.CardSupport.fromLayout(raw);
  const prompt=b.planPrompt(t,{},'manual',2,'','Verified article facts');
  assert.match(t.prompt.role,/Chosun Ilbo news editor/);assert.match(t.prompt.body,/exactly 3 explicit lines/);
  assert.match(t.prompt.body,/85-100%/);assert.match(t.prompt.body,/Never invent facts or add filler/);
  assert.match(prompt,/16 full-width glyph equivalents/);assert.match(prompt,/NOT a limit on the total character count/);
  const imported=structuredClone(t);delete imported.importedLayoutId;assert.match(b.planPrompt(imported,{},'manual',2,'','Facts'),/glyph equivalents/);
  const ordinary=b.CardSupport.fromLayout(layout());assert.doesNotMatch(b.planPrompt(ordinary,{},'manual',2,'','Facts'),/glyph equivalents|85-100%/);
  const v1=JSON.parse(fs.readFileSync(new URL('./fixtures/card-news-chosun-v1.json',import.meta.url)));assert.deepEqual(JSON.parse(JSON.stringify(b.CardSupport.fromLayout(v1.raw).prompt)),v1.installed.prompt);
  assert.equal(t.body.size,54);assert.equal(t.look.body.textSlots[0].width,880);
});

test('adjacent photo swap keeps slot IDs, roles and all text fixed, moving only photo crop and credit', () => {
  const cards = [
    { id: 'cover', role: 'cover', headline: 'Keep cover', picture: { kind: 'file', path: 'a.jpg' }, crop: { zoom: 1.5, x: .2 }, credit: 'A' },
    { id: 'body', role: 'body', heading: 'Keep heading', body: 'Keep body', picture: { kind: 'article', index: 0, path: 'b.jpg' }, crop: { zoom: 2, y: -.2 }, credit: 'B' },
    { id: 'end', role: 'end', cta: 'Keep ending', picture: { kind: 'none' } },
  ];
  const before = JSON.stringify(cards), pictures = [{ path: 'a.jpg', resourceId: 'a' }, { path: 'b.jpg', resourceId: 'b' }];
  const result = b.swapCardPhotos(cards, pictures, 0, 1);
  assert.equal(JSON.stringify(cards), before);
  for (let i = 0; i < cards.length; i++) {
    const text = ({ id, role, headline, heading, body, cta }) => ({ id, role, headline, heading, body, cta });
    assert.deepEqual(text(result.cards[i]), text(cards[i]));
  }
  assert.equal(result.cards[0].picture.path, 'b.jpg'); assert.equal(result.cards[1].picture.path, 'a.jpg');
  assert.equal(result.cards[0].credit, 'B'); assert.equal(result.cards[0].crop.zoom, 2);
  assert.equal(result.pictures[0].resourceId, 'b');
  assert.deepEqual(b.swapCardPhotos(cards, pictures, 1, 1).cards, cards);
  const reused = [{ ...cards[0], picture: { kind: 'reuse', reuse: 1 } }, cards[1]];
  assert.equal(b.swapCardPhotos(reused, pictures, 0, 1).cards[1].picture.path, 'b.jpg');
});

test('drag translates photo in card pixels, clamps at frame edges and leaves a fitted axis fixed', () => {
  const t = b.CardSupport.fromLayout(layout());
  const photo = { w: 1920, h: 1080 };
  const crop = { fit: 'cover', zoom: 1, x: 0, y: 0 };
  const start = b.transformFor(t, 'cover', photo.w, photo.h, crop).draw;
  const moved = b.cropByDrag(t, 'cover', photo, crop, 100, 50);
  const after = b.transformFor(t, 'cover', photo.w, photo.h, moved).draw;
  assert.ok(Math.abs(after.left - start.left - 100) < .01);
  assert.equal(after.top, start.top);
  assert.equal(moved.y, 0);
  assert.equal(b.cropByDrag(t, 'cover', photo, crop, 100000, 0).x, -1);
});

test('ordinary templates permit photo drag before any crop settings are edited', () => {
  const t=b.BUILTIN_TEMPLATES.find(t=>t.id==='report-en');
  const tree=b.CardPreview({t,card:{role:'body',body:'Text',picture:{kind:'file',w:1920,h:1080}},bodyIndex:1,vars:{},S:b.STRINGS.en,image:'local://photo',onCrop(){}});
  const drag=nodes(tree).find(n=>n.props['aria-label']===b.STRINGS.en.dragPhoto);
  assert.ok(drag);assert.equal(drag.props.style.touchAction,'none');
});

test('duplicate Fusion photos retain a later caption and provided preview URL', () => {
  const image={type:'image',url:'https://example.test/original.jpg',caption:'Useful caption',resizedUrls:{article_lg:'https://example.test/preview.jpg'}};
  const html='Fusion.globalContent='+JSON.stringify({promo_items:{basic:{url:image.url}},content_elements:[{type:'text',content:'Verified facts. '.repeat(40)},image]})+';Fusion.x=1;';
  const article=b.CardSupport.extractArticle('https://example.test/article',html);
  assert.equal(article.images.length,1);assert.equal(article.images[0].caption,'Useful caption');assert.equal(article.images[0].previewUrl,'https://example.test/preview.jpg');
});

test('new generic cards persist the same crop used by preview and export without changing older records', () => {
  const t=b.BUILTIN_TEMPLATES.find(t=>t.id==='report-en'), raw={cards:[{headline:'Cover'},{body:'Body'}]};
  const cards=b.normalizePlan(raw,t).cards;
  assert.deepEqual(cards[1].crop,b.CardSupport.clampCrop());
  assert.ok(b.transformFor(t,'body',400,600,cards[1].crop).draw);
  assert.equal(raw.cards[1].crop,undefined);
});
