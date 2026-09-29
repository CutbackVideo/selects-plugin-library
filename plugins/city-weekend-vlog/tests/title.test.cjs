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
// Component contract.
for (const key of ['line1', 'connector', 'place', 'fontFamily', 'ink', 'shadow', 'size', 'rotation', 'position']) assert.ok(src.includes('data.' + key) || src.includes('"' + key + '"'), key);
assert.ok(src.includes('delayRender') && src.includes('continueRender'), 'waits for fonts');
console.log(JSON.stringify({ title: 'ok' }));
