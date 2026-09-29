// plugins/mini-vlog/tests/title.test.cjs
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const src = fs.readFileSync(path.resolve(__dirname, '..', 'assets', 'title-lockup.tsx'), 'utf8');
const block = src.slice(src.indexOf('// mv-title-state:start'), src.indexOf('// mv-title-state:end'));
assert.ok(block.length > 50, 'pure block present');
const box = {}; vm.createContext(box);
vm.runInContext(block + ';globalThis.S=mvTitleState;', box);
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
const fitBlock = src.slice(src.indexOf('// mv-fit:start'), src.indexOf('// mv-fit:end'));
assert.ok(fitBlock.length > 50, 'fit block present');
const fbox = {}; vm.createContext(fbox);
vm.runInContext(fitBlock + ';globalThis.F=mvFitSize;', fbox);
// "SAN FRANCISCO" in classic state B at size 150: target 165 px measures ~1400 px against a ~717 px box.
const shrunk = fbox.F(165, 1400, 717);
assert.ok(shrunk < 165 && shrunk > 0, 'wide line shrinks');
assert.ok(Math.abs(1400 * (shrunk / 165) - 717) < 1e-6, 'shrunk line exactly fits the box');
assert.equal(fbox.F(150, 500, 717), 150, 'narrow line keeps the target size');
assert.equal(fbox.F(150, 717, 717), 150, 'exact fit keeps the target size');
assert.equal(fbox.F(150, 0, 717), 150, 'unmeasurable line keeps the target size');
assert.ok(src.includes('measureText'), 'measures real glyph advances');
// Component contract.
for (const key of ['line1', 'connector', 'place', 'fontFamily', 'ink', 'shadow', 'size', 'rotation', 'position']) assert.ok(src.includes('data.' + key) || src.includes('"' + key + '"'), key);
assert.ok(src.includes('delayRender') && src.includes('continueRender'), 'waits for fonts');
console.log(JSON.stringify({ title: 'ok' }));
