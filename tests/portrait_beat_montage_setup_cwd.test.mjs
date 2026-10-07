import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const folder=new URL('../plugins/portrait-beat-montage/',import.meta.url);
test('the migrated package no longer starts a private Python setup in a disposable shell cwd',()=>{
 const source=fs.readFileSync(new URL('panel.tsx',folder),'utf8');
 const manifest=JSON.parse(fs.readFileSync(new URL('plugin.json',folder),'utf8'));
 assert.doesNotMatch(source,/runShell\(|setup\.sh|setsid|venv/);
 assert.ok(!manifest.files.some(f=>f.startsWith('rvm/')));
 assert.match(source,/importSharedAiVideo\(/);
});
