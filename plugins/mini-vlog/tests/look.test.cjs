// plugins/mini-vlog/tests/look.test.cjs
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const src = fs.readFileSync(path.resolve(__dirname, '..', 'assets', 'soft-look.tsx'), 'utf8');
const block = src.slice(src.indexOf('// mv-warm:start'), src.indexOf('// mv-warm:end'));
const box = { Math, Number }; vm.createContext(box);
vm.runInContext(block + ';globalThis.W=mvWarmFilter;', box);
assert.equal(box.W(0), 'none');
assert.equal(box.W(-1), 'none');
assert.match(box.W(0.35), /^sepia\(0\.077\) saturate\(1\.105\) hue-rotate\(-2\.10deg\) brightness\(1\.010\) contrast\(1\.018\)$/);
assert.equal(box.W(5), box.W(1));
assert.ok(src.includes('<Source />'), 'renders the clip');
console.log(JSON.stringify({ warm: 'ok' }));
