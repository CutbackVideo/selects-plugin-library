// Chris Williamson Style: host path keys, and the panel's port of engine.mjs (shots, faces, candidates, assets on
// the host's ffmpeg) checked against engine.mjs itself on the same inputs. The panel code runs in node:vm with a
// stand-in host (window.parent.__DI__) whose ffmpeg is the local one, so values cross realms as they do in Selects.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const PLUGIN = path.resolve(import.meta.dirname, '../plugins/chris-williamson-style');
const PANEL = fs.readFileSync(path.join(PLUGIN, 'panel.tsx'), 'utf8');

function line(prefix) {
  const at = PANEL.indexOf('\n' + prefix);
  assert.ok(at >= 0, prefix + ' is missing');
  return PANEL.slice(at + 1, PANEL.indexOf('\n', at + 1));
}
const keys = new Function(line('function pathKey(') + '\n' + line('function treePaths(') + '\nreturn {pathKey, treePaths};')();

test('path keys: macOS paths compare as before, Windows paths fold case and separators', () => {
  const {pathKey} = keys;
  assert.equal(pathKey('/Volumes/A/Chris/b001.mp4'), '/Volumes/A/Chris/b001.mp4');
  assert.notEqual(pathKey('/Volumes/A/B.mp4'), pathKey('/Volumes/A/b.mp4'));
  assert.equal(pathKey('C:\\Users\\\ud64d\\.selects\\B001.MP4'), pathKey('c:/users/\ud64d/.selects/b001.mp4'));
  assert.equal(pathKey('\\\\nas\\Share\\x.mp4'), '//nas/share/x.mp4');
  // NFD (as some macOS volumes report names) and NFC are one key.
  assert.equal(pathKey('/x/\u1112\u1169\u11bc.mp4'), pathKey('/x/\ud64d.mp4'));
});

test('path keys: the run_script prelude carries the same function', () => {
  const pk = new Function('return ' + keys.pathKey.toString())();
  assert.equal(pk('C:\\A\\b.MP4'), 'c:/a/b.mp4');
  assert.match(PANEL, /const RESOLVE_PATHS = `const __pk=\$\{pathKey\.toString\(\)\};/);
  assert.match(PANEL, /idByPath\[__pk\(n\.path\)\] = n\.resourceId/);
  assert.doesNotMatch(PANEL, /idByPath\[\$\{JSON\.stringify/);
  assert.doesNotMatch(PANEL, /JSON\.stringify\(imported\)\.includes/);
});

test('treePaths finds every path in a Project file tree', () => {
  const tree = {fileTree: [{type: 'dir', path: 'C:\\r\\Chris Williamson Style x', children: [{type: 'video', path: 'C:\\r\\Chris Williamson Style x\\b001.mp4', resourceId: 'r1'}]}]};
  const found = keys.treePaths(tree);
  assert.deepEqual(found, ['C:\\r\\Chris Williamson Style x', 'C:\\r\\Chris Williamson Style x\\b001.mp4']);
  assert.ok(found.some((p) => keys.pathKey(p).startsWith(keys.pathKey('c:/R/chris williamson style x'))));
});
