import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadPanelModule, disposePanelModule } from './panel_module_fixture.mjs';

const source = fs.readFileSync(new URL('../plugins/card-news-maker/panel.tsx', import.meta.url), 'utf8');
const React = { useRef: value => ({ current: value }), useState: value => [value, () => {}], useEffect() {}, createElement: (type, props, ...children) => ({ type, props: { ...props, children } }) };
const measure = text => Array.from(text).length * 10;
const globals = { document: { createElement: () => ({ getContext: () => ({ measureText: text => ({ width: measure(text) }) }) }) } };
const b = loadPanelModule(source, { globals, names: ['layoutCardBody', 'validateGraphicBody', 'CardSupport', 'PreviewCard', 'CardEditor', 'cardParams', 'transformFor', 'SCRIPT_BUILD', 'STRINGS'], React });
process.on('exit', () => disposePanelModule(b));
const plain = value => JSON.parse(JSON.stringify(value));
const slots = widths => widths.map((width, i) => ({ left: 105, top: 943 + i * 82, width, height: 82, align: 'left' }));
const wrap = (text, widths = [100, 100, 100], tracking = 0) => plain(b.layoutCardBody(text, slots(widths), 'Test', 10, 400, tracking));
function nodes(value) { const out = []; function visit(v) { if (!v || typeof v !== 'object') return; if (v.type && v.props) out.push(v); for (const x of Object.values(v)) visit(x); } visit(value); return out; }
const pack = JSON.parse(fs.readFileSync(new URL('../plugins/card-news-maker/template-packs/chosun-basic/template.json', import.meta.url)));

test('body wrapping keeps manual breaks, uses each slot width and retains every non-space character', () => {
  assert.deepEqual(wrap('한글문장가나다라마바사아자차카타파하거너더러머버서어저'), { lines: ['한글문장가나다라마바', '사아자차카타파하거너', '더러머버서어저'], overflow: false });
  const text = 'alpha bravo charlie delta';
  const result = wrap(text, [120, 120, 120]);
  assert.deepEqual(result, { lines: ['alpha bravo', 'charlie', 'delta'], overflow: false });
  assert.equal(result.lines.join('').replaceAll(' ', ''), text.replaceAll(' ', ''));
  assert.deepEqual(wrap('first\n\nthird').lines, ['first', '', 'third']);
  assert.deepEqual(wrap('abcdefghijklmnop', [40, 60, 80]).lines, ['abcd', 'efghij', 'klmnop']);
  assert.deepEqual(wrap('abcdefghijkl', [100, 100, 100], -.2).lines, ['abcdefghijkl']);
  for (const unit of ['e\u0301', '가']) {
    assert.deepEqual(wrap(unit.repeat(6), [100,100,100], -.2).lines, [unit.repeat(5),unit]);
  }
});

test('overflow and an unfit grapheme are explicit errors rather than silent deletion', () => {
  const text = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const result = wrap(text);
  assert.equal(result.overflow, true);
  assert.equal(result.lines.join(''), text);
  assert.deepEqual(wrap('👨‍👩‍👧‍👦', [20, 20, 20]), { lines: ['👨‍👩‍👧‍👦'], overflow: true });
  const t = b.CardSupport.fromLayout(pack), card = { role: 'body', body: text.repeat(10) };
  const params = b.cardParams(t, card, 1, {}), tree = nodes(b.PreviewCard({ data: params }));
  assert.ok(tree.some(n => n.props.role === 'alert'));
  assert.throws(() => b.validateGraphicBody(params), /text area|텍스트 영역/);
  assert.equal(card.body, text.repeat(10));
});

test('preview and built Draft run the same wrapping code and keep Chosun geometry and typography', () => {
  const graphic = JSON.parse(b.SCRIPT_BUILD.match(/const CARD_TSX: string = ("(?:[^"\\]|\\.)*");/)[1]);
  const draft = loadPanelModule(graphic, { globals, names: ['CardNewsCard', 'layoutCardBody'], React, modules: { remotion: { Img: 'img' } } });
  try {
    const params = { role: 'body', body: 'alpha bravo charlie delta', textSlots: JSON.stringify(slots([120, 120, 120])), bodySize: 10, bodyWeight: 400, tracking: 0 };
    assert.deepEqual(plain(draft.CardNewsCard({ data: params })), plain(b.PreviewCard({ data: params })));
    const t = b.CardSupport.fromLayout(pack), p = b.cardParams(t, { role: 'body', body: 'Original\nmanual\nlines' }, 1, {});
    assert.deepEqual(JSON.parse(p.textSlots).map(s => [s.left, s.top, s.width, s.height]), [[105,943,880,82],[105,1025,880,82],[105,1107,880,82]]);
    assert.deepEqual([p.bodyWeight,p.bodySize,p.tracking], [400,54,-.0425]);
  } finally { disposePanelModule(draft); }
});

test('export checks live timeline parameters and refuses old graphics that require wrapping', () => {
  const p = { role: 'body', body: 'alpha bravo charlie delta', textSlots: JSON.stringify(slots([120,120,120])), bodySize: 10, bodyWeight: 400, tracking: 0 };
  assert.doesNotThrow(() => b.validateGraphicBody(p, true));
  assert.throws(() => b.validateGraphicBody(p, false), /Rebuild this Draft/);
  assert.doesNotThrow(() => b.validateGraphicBody({ ...p, body: 'alpha\nbravo' }, false));
  assert.throws(() => b.validateGraphicBody({ ...p, body: 'a'.repeat(100) }, true), /text area/);
});

test('photo contain and zoom-out share placement with the Draft, and legacy cover crops remain identical', () => {
  const t = b.CardSupport.fromLayout(pack), size = { width: 1080, height: 1350 };
  const legacy = { zoom: 1.6, x: -.25, y: .4 };
  const fit = Math.min(1080/1920,1350/1080), cover = Math.max(1080/1920,1350/1080);
  const old = b.CardSupport.photoPlacement(1920,1080,legacy,size);
  assert.ok(Math.abs(old.width-1920*cover*legacy.zoom)<1e-9);
  assert.ok(Math.abs(old.left-((1080-old.width)/2-legacy.x*(old.width-1080)/2))<1e-9);
  for (const dimensions of [[1920,1080],[1080,1920],[1000,1000]]) for (const zoom of [.25,.75,1,2]) {
    const crop = { fit: 'contain', zoom, x: -.3, y: .2 };
    const p = b.CardSupport.photoPlacement(...dimensions,crop,size), tr = b.transformFor(t,'body',...dimensions,crop);
    assert.ok(Math.abs(p.width/p.height-dimensions[0]/dimensions[1])<1e-9);
    assert.ok(Math.abs(tr.scale-p.transform.scale)<1e-9);
    assert.ok(Math.abs(tr.posX-p.transform.position.x)<1e-9);
    assert.ok(Math.abs(tr.posY-p.transform.position.y)<1e-9);
    if (zoom<=1) assert.ok(p.width<=1080+.001&&p.height<=1350+.001);
  }
  assert.deepEqual(plain(b.CardSupport.clampCrop(legacy)),legacy);
});

test('photo controls keep fit/crop per card and positive positions move the picture right and down', () => {
  const t = b.CardSupport.fromLayout(pack), original = { role: 'body', body: 'Text', picture: { kind: 'file', path: '/photo.jpg' }, crop: { zoom: 1.6, x: -.25, y: .4 } };
  let changed;
  const ui = new Proxy({}, { get: (_, name) => String(name) });
  const tree = nodes(b.CardEditor({ ui, S: b.STRINGS.en, t, card: original, index: 1, bodyIndex: 1, plan: { cards: [original], article: { images: [] } }, vars: {}, fs: {}, onChange: value => { changed = value; } }));
  tree.find(n=>n.type==='Select'&&n.props.label==='Photo fit').props.onChange('contain');
  assert.deepEqual(plain(changed.crop),{fit:'contain',zoom:1,x:-.25,y:.4});
  const zoom=tree.find(n=>n.type==='NumberField'&&n.props.label==='Zoom (%)');
  assert.equal(zoom.props.min,25);zoom.props.onChange(75);assert.equal(changed.crop.zoom,.75);
  tree.find(n=>n.type==='NumberField'&&n.props.label==='Left / right').props.onChange(30);assert.equal(changed.crop.x,-.3);
  tree.find(n=>n.type==='NumberField'&&n.props.label==='Up / down').props.onChange(20);assert.equal(changed.crop.y,-.2);
  assert.deepEqual(original.crop,{zoom:1.6,x:-.25,y:.4});
});
