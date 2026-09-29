// plugins/city-weekend-vlog/tests/panel.test.cjs
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const panel = fs.readFileSync(path.join(root, 'panel.tsx'), 'utf8');
const planner = fs.readFileSync(path.join(root, 'planner.js'), 'utf8');
assert.ok(panel.includes(planner.trim()), 'panel.tsx must embed planner.js verbatim');
assert.match(panel.split('\n').slice(0, 24).join('\n'), /\/\/ @name City Weekend Vlog/);
assert.match(panel, /\/\/ @icon \w+/);
assert.ok(!/^import .* from "(?!react")/m.test(panel), 'only react may be imported');
for (const name of ['inventory.js', 'search.js', 'ensure-audio.js', 'assemble.js', 'decorate.js', 'title-graphic.tsx', 'warm-look.tsx', 'manifest.json', 'presets.json', 'beat-detect.cjs']) assert.ok(panel.includes(name), 'panel reads ' + name);
for (const phrase of ['Create another version', 'Keep original clip sound', 'Silent video', 'cuts use the original rhythm', 'selects.editor.openDraft', 'Finish title and look', 'cwvProgress(', 'steps={CWV_BUILD_STEPS', 'Stopped at step', 'Install ffmpeg and Node.js', 'linkToDraftFrame', 'FontFace', 'Draft created; adding title and look', 'projectRef', 'ffprobe', 'aria-pressed']) assert.ok(panel.includes(phrase), phrase);
// Hangul audit across the plugin, as place-count does.
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
for (const f of walk(root).filter(f => /\.(tsx|js|cjs|json|md|sh)$/.test(f))) assert.ok(!/[\uac00-\ud7a3]/.test(fs.readFileSync(f, 'utf8')), 'Korean text in ' + f);
// User paths go to the shell single-quoted; dq() is only for the $HOME / $SELECTS_USER_SKILLS_ROOT constants.
assert.ok(!/dq\((file|ownMusic|roots)/.test(panel), 'user paths must not be double-quoted into the shell');
// Commit calls are never resent silently.
assert.match(panel, /No valid session ID/);
assert.ok(!/Streamable HTTP error/.test(panel), 'only the session-id failure is resent');
console.log(JSON.stringify({ panel: 'ok' }));
