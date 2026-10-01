// plugins/city-weekend-vlog/tests/title.test.cjs
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const src = fs.readFileSync(path.resolve(__dirname, '..', 'assets', 'title-graphic.tsx'), 'utf8');
const block = src.slice(src.indexOf('// cwv-title-state:start'), src.indexOf('// cwv-title-state:end'));
assert.ok(block.length > 50, 'pure block present');
const box = {}; vm.createContext(box);
vm.runInContext(block + ';globalThis.S=cwvTitleState;', box);
const ev = { line1Frame: 5, connectorFrame: 32, placeFrame: 59, endFrame: 163, fontSwitches: [{ frame: 59, state: 'A' }, { frame: 77, state: 'B' }, { frame: 82, state: 'C' }] };
const s = (f, p = true) => JSON.parse(JSON.stringify(box.S(f, ev, p)));
assert.deepEqual(s(0), { line1: false, connector: false, place: false, state: 'A' });
assert.deepEqual(s(5), { line1: true, connector: false, place: false, state: 'A' });
assert.deepEqual(s(32), { line1: true, connector: true, place: false, state: 'A' });
assert.deepEqual(s(59), { line1: true, connector: true, place: true, state: 'A' });
assert.equal(s(77).state, 'B');
assert.equal(s(81).state, 'B');
assert.equal(s(82).state, 'C');
assert.deepEqual(s(163), { line1: false, connector: false, place: false, state: 'C' });
// Empty place: connector hidden, line 1 carries the switches.
assert.deepEqual(s(40, false), { line1: true, connector: false, place: false, state: 'A' });
assert.equal(s(78, false).state, 'B');
// Fit-to-box: the pure size math shrinks only when the measured width overflows the box.
const fitBlock = src.slice(src.indexOf('// cwv-fit:start'), src.indexOf('// cwv-fit:end'));
assert.ok(fitBlock.length > 50, 'fit block present');
const fbox = {}; vm.createContext(fbox);
vm.runInContext(fitBlock + ';globalThis.F=cwvFitSize;', fbox);
// "SAN FRANCISCO" in classic state B at size 150: target 165 px measures ~1400 px against a ~717 px box.
const shrunk = fbox.F(165, 1400, 717);
assert.ok(shrunk < 165 && shrunk > 0, 'wide line shrinks');
assert.ok(Math.abs(1400 * (shrunk / 165) - 717) < 1e-6, 'shrunk line exactly fits the box');
assert.equal(fbox.F(150, 500, 717), 150, 'narrow line keeps the target size');
assert.equal(fbox.F(150, 717, 717), 150, 'exact fit keeps the target size');
assert.equal(fbox.F(150, 0, 717), 150, 'unmeasurable line keeps the target size');
assert.ok(src.includes('measureText'), 'measures real glyph advances');
// Korean titles: wide characters count as 1 em in the no-canvas estimate, Hangul is detected for the no-uppercase rule,
// and every stack ends with the state's Korean system face before the generic family.
const koBlock = src.slice(src.indexOf('// cwv-hangul:start'), src.indexOf('// cwv-hangul:end'));
assert.ok(koBlock.length > 50, 'hangul block present');
const kbox = {}; vm.createContext(kbox);
vm.runInContext(koBlock + ';globalThis.K={cwvHasHangul,cwvEstimateEm,cwvFontStack};', kbox);
const SEOUL = '\uc11c\uc6b8', WEEKEND = '\uc8fc\ub9d0 \ub098\ub4e4\uc774';
assert.equal(kbox.K.cwvHasHangul(SEOUL), true);
assert.equal(kbox.K.cwvHasHangul('Seoul'), false);
assert.equal(kbox.K.cwvHasHangul('in ' + SEOUL), true);
assert.ok(Math.abs(kbox.K.cwvEstimateEm('Seoul') - 3) < 1e-9, 'Latin 0.6 em each');
assert.ok(Math.abs(kbox.K.cwvEstimateEm(SEOUL) - 2) < 1e-9, 'Hangul 1 em each');
assert.ok(Math.abs(kbox.K.cwvEstimateEm(WEEKEND) - 5.6) < 1e-9, 'five syllables and a space');
assert.ok(Math.abs(kbox.K.cwvEstimateEm('\u6771\u4eac\uff01') - 3) < 1e-9, 'CJK and fullwidth count as wide');
assert.equal(kbox.K.cwvFontStack({ family: 'CWV Yellowtail', koFamily: 'Apple SD Gothic Neo' }, ''), '"CWV Yellowtail", "Snell Roundhand", "Brush Script MT", "Apple SD Gothic Neo", cursive');
assert.equal(kbox.K.cwvFontStack({ family: 'CWV Instrument Serif', koFamily: 'AppleMyungjo' }, ''), '"CWV Instrument Serif", "Snell Roundhand", "Brush Script MT", "AppleMyungjo", cursive');
assert.equal(kbox.K.cwvFontStack({ family: 'CWV Yellowtail' }, 'Futura'), '"Futura", "CWV Yellowtail", "Snell Roundhand", "Brush Script MT", "Apple SD Gothic Neo", cursive', 'a Draft built before koFamily, with a font override');
for (const phrase of ['s.case === "upper" && !cwvHasHangul(text) ? "uppercase" : "none"', 'wordBreak: "keep-all", letterSpacing: 0', 'cwvEstimateEm(shown) * px', 'cwvFontStack(s, key === "A" ? override : "")']) assert.ok(src.includes(phrase), phrase);
// Component contract.
for (const key of ['line1', 'connector', 'place', 'fontFamily', 'ink', 'shadow', 'size', 'rotation', 'position']) assert.ok(src.includes('data.' + key) || src.includes('"' + key + '"'), key);
assert.ok(src.includes('delayRender') && src.includes('continueRender'), 'waits for fonts');
console.log(JSON.stringify({ title: 'ok' }));
