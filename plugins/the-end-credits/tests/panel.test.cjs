// plugins/the-end-credits/tests/panel.test.cjs
// Static checks of panel.tsx (the CWV panel guards, adapted) plus the decorate payload size and the section maths
// the panel relies on for every bundled cue.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const panel = fs.readFileSync(path.join(root, 'panel.tsx'), 'utf8');
const planner = fs.readFileSync(path.join(root, 'planner.js'), 'utf8');
const early = panel.indexOf('if (!projectId) return <ui');
assert.ok(early > 0, 'the no-Project early return exists');

// The planner is embedded verbatim, between its markers.
assert.ok(panel.includes(planner.trim()), 'panel.tsx must embed planner.js verbatim');
assert.equal((panel.match(/\/\/ tec-planner:start/g) || []).length, 1);
assert.equal((panel.match(/\/\/ tec-planner:end/g) || []).length, 1);
// The graphic's own maths is not pasted in (its tecTyping / tecCreditLayout have other signatures).
assert.ok(!panel.includes('// tec-graphic:start'), 'no graphic maths in the panel');

// Header: @name in 10 languages within the first 24 lines, the Korean one in Latin, and an icon from the kit's set.
const head = panel.split('\n').slice(0, 24).join('\n');
assert.match(head, /^\/\/ @name THE END Credits$/m);
for (const lang of ['de', 'en', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'tr', 'zh']) assert.match(head, new RegExp('^// @name:' + lang + ' \\S.*$', 'm'), '@name:' + lang);
assert.match(head, /^\/\/ @name:ko THE END Credits$/m);
assert.match(head, /^\/\/ @icon (panel|search|wand|scissors|captions|chapters|image|palette|speaker|audio|translate|chart|clock|sparkles|upload|download|tag|list|eye|mic|video)$/m);
assert.ok(!/^import .* from "(?!react")/m.test(panel), 'only react may be imported');
assert.equal((panel.match(/^import /gm) || []).length, 1, 'one import');

// It reads every script and asset it sends (and runs beat-detect.cjs for own music).
for (const name of ['assets/cues/manifest.json', 'scripts/inventory.js', 'scripts/search.js', 'scripts/ensure-audio.js', 'scripts/assemble.js', 'scripts/decorate.js',
  'assets/credits-graphic.tsx', 'assets/shot-frame.tsx', 'assets/cinematic-look.tsx', 'assets/fonts/tec-title-serif.woff2.b64', 'assets/fonts/tec-credits-sans.woff2.b64', 'beat-detect.cjs']) {
  assert.ok(panel.includes(name.includes('/') && !name.startsWith('beat') ? '"' + name + '"' : name), 'panel reads ' + name);
  assert.ok(fs.existsSync(path.join(root, name)), name + ' exists');
}
assert.ok(!panel.includes('opening.tsx'), 'the Opening generator was dropped (probe P1)');

// CWV guards.
for (const phrase of ['projectRef', 'No valid session ID', 'visibilitychange', 'addEventListener("focus"', '10000', '>Refresh<', 'Stop preview', 'Cancel preview',
  'role="slider"', 'aria-valuenow', 'aria-valuetext', 'ResizeObserver', 'devicePixelRatio', 'setPointerCapture', '"ArrowLeft"', '"Home"', '"End"', '"Escape"',
  'requestAnimationFrame', 'cancelAnimationFrame', 'previewTokenRef', 'URL.createObjectURL', 'URL.revokeObjectURL', 'onended', 'preview-*.mp3', 'readText(roots.data',
  'loadInventory(', 'still being analysed', 'this updates automatically', 'setCandidates(null)', 'invSigRef', 'known: photoSizesRef.current',
  'selects.editor.openDraft', 'linkToDraftFrame', 'Finish title and look', 'Create another version', 'Stopped at step', 'Install ffmpeg and Node.js',
  'FontFace', 'Draft created; adding credits and look', '--panel-accent', '--panel-muted-fg', 'drag to choose', 'fmtTime(total)', 'Starts at ', 'ffprobe']) assert.ok(panel.includes(phrase), phrase);
assert.ok(!/--text-tertiary/.test(panel), '--text-tertiary is not a panel token');
assert.ok(!/var\(--accent\b/.test(panel), '--accent is not a panel token');
assert.ok(!/#[0-9a-f]{3,8}\b/i.test(panel.slice(early).replace(/var\(--panel-[a-z-]+, [^)]*\)+/g, "")), "the JSX colours are --panel-* tokens (literal colours only as their fallbacks)");
// Only a lost session is resent, and never a committing call.
assert.ok(panel.includes('if (r.isError && !allowCommit && /No valid session ID/.test(r.output || ""))'), 'no auto-resend of commits');
assert.ok(!/Streamable HTTP error/.test(panel), 'only the session-id failure is resent');
// Finder-launched apps lack Homebrew/nvm: every shell step that runs ffmpeg, ffprobe, node or rm extends PATH.
assert.ok(panel.includes('/opt/homebrew/bin:/usr/local/bin') && panel.includes('.nvm/versions/node/*/bin'), 'Homebrew and nvm paths');
for (const re of [/command: TOOL_PATH \+ "command -v ffmpeg/, /cmd = TOOL_PATH \+ "ffmpeg -nostdin -v error -y -t 360/, /command: TOOL_PATH \+ "ffprobe /, /cmd = TOOL_PATH \+ "rm -f "/, /cmd = TOOL_PATH \+ "ffmpeg -nostdin -v error -y -i "/]) assert.ok(re.test(panel), String(re));
const shells = panel.match(/sdk\.runShell\(\{[^\n]*/g) || [];
assert.equal(shells.length, 8, 'folder lookup, tool check, waveform + cleanup, beat detection, ffprobe, preview + cleanup');
for (const s of shells) if (!/Locate plugin folders/.test(s)) assert.ok(/TOOL_PATH/.test(s) || /command: cmd/.test(s), 'shell step without TOOL_PATH: ' + s);
// User paths go to the shell single-quoted; dq() is only for the $HOME / $SELECTS_USER_SKILLS_ROOT constants.
assert.ok(!/dq\((file|ownMusic|roots|cue|base|pcm)/.test(panel), 'user paths must not be double-quoted into the shell');
assert.equal((panel.match(/dq\(/g) || []).length, 4, 'dq only for the two folder constants (plus its definition)');
for (const p of ['sq(file.path)', 'sq(pcm)', 'sq(file)', 'sq(base + ".mp3")', 'sq(roots.plugin + "/assets/cues/" + cue.file)']) assert.ok(panel.includes(p), p);
// Temporary files go through the data folder and are removed.
assert.ok(panel.includes('"; s=$?; rm -f " + sq(pcm) + "; exit $s"') && panel.includes('" && rm -f " + sq(base + ".mp3")') && panel.includes('rm -f " + sq(base + ".u8")'), 'temporary audio files are removed');
assert.ok(panel.includes('" 22050 " + sq(roots.data + "/own-music.json")') && panel.includes('JSON.parse(await readText(roots.data, "own-music.json"))') && panel.includes('!done.ok'), 'own-music analysis via a file');
// Script configs arrive as JSON.parse(...) so the SDK type check sees `any`.
assert.ok(panel.includes('"JSON.parse(" + JSON.stringify(JSON.stringify(cfg)) + ")"'), 'fill passes the config through JSON.parse');
assert.ok(!/\.(captureFrames|captureVisualFrames)\(/.test(panel), 'no frame capture in the panel');

// Hooks stay before the early return.
for (const hook of ['addEventListener("visibilitychange"', '[cueId, ownMusic?.path, section, length]', 'React.useMemo(', 'const [usePhotos', 'const [clipSound',
  'const [customRows', 'const autoRef = React.useRef', 'const [previewTime', 'const [fontsReady', 'setInterval(() => { loadInventory(pid); }, 10000)']) {
  const at = panel.indexOf(hook);
  assert.ok(at > 0 && at < early, 'hook before the early return: ' + hook);
}
const tail = panel.slice(early);
assert.ok(!/React\.use(State|Effect|Memo|Ref|Callback)\(/.test(tail), 'no hook after the early return');

// Build: stops the preview, progress over the 5 UI steps (never backwards), one call per script, commits only where allowed.
const buildBody = panel.slice(panel.indexOf('async function build('), panel.indexOf('function buildAnother()'));
assert.ok(buildBody.includes('stopPreview()'), 'Build stops the preview');
assert.ok(buildBody.indexOf('check();') < buildBody.indexOf('applyInventory(raw)'), 'the fresh inventory is applied only after the Project check');
for (const m of buildBody.matchAll(/= await run\([^\n]*\);\n\s*(\S[^\n]*)/g)) assert.ok(m[1].startsWith('check();'), 'check() right after: ' + m[0].slice(0, 60));
assert.ok(buildBody.includes('sources }), true);\n      check();'), 'check() right after assemble');
assert.ok(panel.slice(panel.indexOf('async function finishTitle('), panel.indexOf('async function decorate(')).includes('stopPreview()'), 'Finish stops the preview');
assert.ok(panel.includes('const p = tecProgress(id, fraction, detail);') && panel.includes('if (progressRef.current && p.value < progressRef.current.value - 1e-9) return;'), 'progress never goes backwards');
assert.ok(panel.includes('steps={TEC_BUILD_STEPS.map('), 'the progress lists the build steps');
for (const id of ['"prepare"', '"plan"', '"music"', '"assemble"', '"decorate"']) assert.ok(panel.includes('advance(' + id), 'advance ' + id);
const order = ['fill(assets.scripts.inventoryJs', 'findCandidates(todo', 'tecPlanBuild({ layout: inputs.layout', 'fill(assets.scripts.ensureJs', 'fill(assets.scripts.assembleJs', 'await decorate(record'];
order.reduce((at, s) => { const i = buildBody.indexOf(s); assert.ok(i > at, 'build order: ' + s); return i; }, -1);
assert.ok(/fill\(assets\.scripts\.searchJs, \{ projectId: pid, rids: rids\.slice\(i, i \+ 4\), queries: TEC_SEARCH_QUERIES, pageSize: 4 \}\)/.test(panel), 'search in batches of 4, pageSize 4');
assert.ok(/fill\(assets\.scripts\.ensureJs, \{ projectId: pid, path: inputs\.musicPath \}\), true\)/.test(buildBody), 'ensure-audio commits in its own call');
assert.ok(/fill\(assets\.scripts\.assembleJs, \{[\s\S]*?\}\), true\)/.test(buildBody), 'assemble commits');
assert.ok(/fill\(assets\.scripts\.decorateJs, \{[\s\S]*?\}\), true\)/.test(panel), 'decorate commits');
assert.ok(/run\("Open the new Draft", [^)]*\)/.test(panel) && !/run\("Open the new Draft"[\s\S]{0,600}, true\)/.test(panel), 'opening the Draft does not commit');
assert.ok(!/run\("Search scenic shots"[^;]*, true\)/.test(panel) && !/run\("Read footage"[^;]*, true\)/.test(panel), 'reads never commit');
// Assemble cfg: from the plan (layout, picks, video-start boundaries, music {resourceId, sectionStart}, clip sound, sources).
const asm = buildBody.slice(buildBody.indexOf('fill(assets.scripts.assembleJs'), buildBody.indexOf('}), true)', buildBody.indexOf('fill(assets.scripts.assembleJs')));
for (const k of ['projectId: pid', 'draftName: name', 'layout: inputs.layout', 'picks: plan.picks', 'boundaries: plan.timeline.boundaries', 'L: plan.timeline.L',
  'music: musicRes ? { resourceId: musicRes.resourceId, sectionStart: inputs.sectionStart } : null', 'clipSound: inputs.clipSound', 'ambientDb: AMBIENT_DB', 'musicFadeOut: MUSIC_FADE_OUT', 'sources']) assert.ok(asm.includes(k), 'assemble cfg ' + k);
assert.ok(panel.includes('const AMBIENT_DB = -18;'));
// The frozen record (plan.md shape) and the decorate cfg built from it; the retry reuses the record.
for (const k of ['layout: inputs.layout, sequenceId: a.sequenceId, fps: a.fps, frames, titleText: inputs.title, rows: inputs.rows',
  'speedPxPerSec: speed.pxPerSec, window: WINDOWS[inputs.layout], look: { on: inputs.lookOn, strength: LOOK_STRENGTH }, clipSound: inputs.clipSound',
  'photos, sources, fades: FADES, musicFadeOut: MUSIC_FADE_OUT']) assert.ok(buildBody.includes(k), 'record ' + k);
assert.ok(buildBody.includes('tecRollSpeed({ endSec, L: revealSec, H: 1080, lastRoleStartY: model.lastRoleTop, rowTops: model.rowTops })')
  && buildBody.includes('const endSec = frames[frames.length - 1] / a.fps, revealSec = frames[1] / a.fps;'), 'the roll speed comes from the assembled frames at the real fps');
assert.ok(buildBody.includes('tecPhotoMotions(plan.picks, String(nextSeed), sizes)'), 'photo motions from the planner');
assert.ok(panel.includes('await decorate(result.record, result.photoMotion, check)'), 'Finish title and look retries decorate with the frozen record');
assert.ok(panel.includes('graphic: graphicFor(record), frame: { tsx: assets.frameTsx },') && panel.includes('look: { tsx: assets.lookTsx, strength: record.look.strength, on: record.look.on }, photoMotion }'), 'decorate cfg');
assert.ok(panel.includes('const LOOK_STRENGTH = 0.3;'));
const anotherBody = panel.slice(panel.indexOf('function buildAnother()'), panel.indexOf('async function finishTitle('));
assert.ok(anotherBody.indexOf('setResult(null)') >= 0 && anotherBody.indexOf('setResult(null)') < anotherBody.indexOf('build(s)') && /const s = seed \+ 1;/.test(anotherBody), 'another version: a new seed');
assert.ok(panel.includes('candidates.key === key') && panel.includes('const key = pid + "|" + JSON.stringify(inputs.only);'), 'another version reuses the scene search');
// Graphic parameters and Adjust fields.
const gfx = panel.slice(panel.indexOf('function graphicFor('), panel.indexOf('async function build('));
for (const k of ['layout: record.layout', 'fps: record.fps', 'revealFrame: record.frames[1]', 'endFrame: record.frames[record.frames.length - 1]', 'title: record.titleText',
  'titleColor: TITLE_COLOR', 'creditColor: CREDIT_COLOR', 'rows: record.rows', '...scalars', 'rowCount: K', 'speedPxPerSec: record.speedPxPerSec', 'speed: 1', 'showTitle: true', 'fonts',
  'scalars["role" + (i + 1)]', 'scalars["name" + (i + 1)]', 'label: "Role " + (i + 1)', 'label: "Name " + (i + 1)',
  '{ key: "title", label: "Title", type: "text"', '{ key: "titleColor", label: "Title color", type: "color"', '{ key: "creditColor", label: "Credits color", type: "color"',
  '{ key: "speed", label: "Roll speed", type: "number", defaultValue: 1, min: 0.5, max: 2, step: 0.05 }', '{ key: "showTitle", label: "Show title", type: "boolean", defaultValue: true }',
  'family: f.family, b64: assets.fontsB64[f.file], weight: f.weight, style: f.style']) assert.ok(gfx.includes(k), 'graphic ' + k);
assert.ok(panel.includes('const editableParameters: any = ['), 'editableParameters cast to any');

// UI sections.
for (const title of ['Layout', 'Title', 'Credits', 'Length', 'Music', 'Advanced', 'Preview']) assert.ok(panel.includes('<ui.Section title="' + title + '">'), 'section ' + title);
assert.ok(panel.indexOf('<ui.Section title="Layout">') < panel.indexOf('<ui.Section title="Title">') && panel.indexOf('<ui.Section title="Credits">') < panel.indexOf('<ui.Section title="Length">')
  && panel.indexOf('<ui.Section title="Length">') < panel.indexOf('<ui.Section title="Music">') && panel.indexOf('<ui.Section title="Music">') < panel.indexOf('<ui.Section title="Advanced">'), 'section order');
// Layout: two schematic buttons with aria-pressed; Classic is the default.
assert.ok(panel.includes('aria-pressed={on}') && panel.includes('<LayoutIcon kind={value} />') && panel.includes('React.useState<"classic" | "full">("classic")'), 'layout buttons');
assert.ok(panel.includes('const DEFAULT_TITLE = "THE END";') && panel.includes('React.useState(DEFAULT_TITLE)'), 'default title');
// Credits: preset select, row editor with labelled inputs and buttons, reset, blank-row drop, key guard.
for (const phrase of ['label="Preset"', 'TEC_PRESET_ORDER.map(', 'React.useState(TEC_DEFAULT_PRESET)', 'tecPresetRows(preset, creditInfo)', 'aria-label={"Role " + (i + 1)}', 'aria-label={"Name " + (i + 1)}',
  'placeholder="Role (e.g. Director)"', 'placeholder="Name"', '>Up</ui.Button>', '>Down</ui.Button>', '>Remove</ui.Button>', '>Add row</ui.Button>', '>Reset to preset</ui.Button>',
  'onKeyDown={(e) => e.stopPropagation()}', 'onKeyDown={guardKeys}', 'Rows with both fields empty are left out', 'tecCleanRows(rows)', 'still have placeholders', 'Some characters use a system font',
  'minWidth: 0, boxSizing: "border-box"']) assert.ok(panel.includes(phrase), phrase);
const guard = panel.slice(panel.indexOf('function guardKeys('), panel.indexOf('export default function Panel('));
assert.ok(guard.includes('e.stopPropagation()') && guard.includes('"Delete"') && guard.includes('"Backspace"') && guard.includes('" "') && guard.includes('e.preventDefault()'), 'Delete/Space never reach the app');
// Edits survive music, inventory and length changes; unedited auto values follow; No music drops the Music credit.
assert.ok(panel.includes('const rows: EditRow[] = customRows ?? presetRows;') && panel.includes('r.name === prev[k]') && panel.includes('if (next[kind] !== "") out.push'), 'auto values follow only while unedited');
assert.ok(panel.includes('cueTitle: cueId !== "none" && cueId !== "own" && cue ? cue.title : ""'), 'No music removes the Music credit');
assert.ok(panel.includes('music: ["Music", "Music by"]'), 'Personal and Travel music roles');
// Length.
assert.ok(panel.includes('TEC_LENGTH_ORDER.map(') && panel.includes('<ui.Segmented label="Length"') && panel.includes('TEC_LENGTHS[length]'), 'length from TEC_LENGTHS');
// Music: the five cues (default from the manifest), own music, No music; section via tecSection; fit offer; fixed-timing notice.
for (const phrase of ['{ label: "Your own music", value: "own" }', '{ label: "No music", value: "none" }', '(parsed.cues || []).find((c: any) => c.default)', 'React.useState("post-rock")',
  'swell: cue.swell ?? cue.swellFallback', 'P: (beats * 60) / cue.bpm', 'tecSection({ ...sectionOpts, value', 'tecFitLength({', 'This track is too short (needs ≥ ', '"Use " + LENGTH_LABELS[fit.key]',
  'No steady beat found: shots are 3.9 s.', 'tecPhrase({ bpm: ownGrid.bpm, accepted: true })', 'usableEnd: ownDuration - TEC_MUSIC_END_MARGIN', 'reveal on the loudest part', 'reveal on the swell',
  '<ui.FileDrop accept={["audio"]}', '-t " + dur.toFixed(2)', 'const dur = videoSeconds']) assert.ok(panel.includes(phrase), phrase);
assert.ok(panel.includes('[cueId, ownMusic?.path, section, length]'), 'a stale preview stops');
// Advanced: clip sound Ambient (default) / Full / Off, Cinematic look, Use photos, Choose clips.
assert.ok(/React\.useState<"off" \| "ambient" \| "full">\("ambient"\)/.test(panel), 'Ambient is the default');
for (const phrase of ['label="Clip sound"', '{ label: "Ambient", value: "ambient" }', '{ label: "Full", value: "full" }', '{ label: "Off", value: "off" }', 'label="Cinematic look"', 'label="Use photos"',
  'Choose clips', 'type="checkbox"', 'chooseClips(allRids)', 'chooseClips([])', 'clips selected', 'No clips selected', 'photos selected', 'Silent video']) assert.ok(panel.includes(phrase), phrase);
const chooseBody = panel.slice(panel.indexOf('const chooseClips ='), panel.indexOf('const toggleClip ='));
assert.ok(chooseBody.includes('setCandidates(null)') && chooseBody.includes('ordered.length === allRids.length ? null : ordered'), 'a new selection drops the cache');
// Preview: fixed-height canvas, planner layout at the computed speed, 3 scrub points, bundled fonts.
for (const phrase of ['const PREVIEW_HEIGHT = ', 'height: PREVIEW_HEIGHT', 'tecCreditLayout({ rows: cleanRows, layout, H: 1080', 'pxPerSec={roll.pxPerSec}', '>First row</ui.Button>', '>Last row</ui.Button>',
  '>End</ui.Button>', 'label="Preview at"', 'tecTypedCount(typing, t)', 'destination-in', 'scale(0.78, 1)', '"TEC Title Serif"', '"TEC Credits Sans"', 'document as any).fonts.add(face)']) assert.ok(panel.includes(phrase), phrase);
// Roll-fit notice before Build: hidden rows are named, few rows end early.
for (const phrase of ['tecRollSpeed({ endSec: videoSeconds, L: TEC_LEAD_IN, H: 1080, lastRoleStartY: creditModel.lastRoleTop, rowTops: creditModel.rowTops })', 'roll.hiddenRows',
  '" won\'t appear in " + LENGTH_LABELS[length]', 'hidden.map((i: number) => cleanRows[i].role || cleanRows[i].name)', 'Choose Long or remove ', 'Credits finish before the end', '{rollNotice ?']) assert.ok(panel.includes(phrase), phrase);
assert.ok(panel.indexOf('{rollNotice ?') < panel.indexOf('<ui.Actions>'), 'the roll-fit notice shows before Build');
// Readiness: "Ready: N clips · N photos · about N s"; Full frame counts N + 1 shots; footage shrink and the minimum.
for (const phrase of ['"Ready: " + clipCount', '" shots"', '" · about " + Math.round(tecVideoSeconds(', 'const extra = layout === "full" ? 1 : 0;', '(shotsFit + extra)', 'Needs at least ', 'Your footage fits ']) assert.ok(panel.includes(phrase), phrase);
assert.ok(/needsPoll = [^\n]*inventory\.photos/.test(panel), 'a photos-only Project does not poll');

// Hangul audit across the plugin.
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
for (const f of walk(root).filter(f => /\.(tsx|js|cjs|json|md|sh|py)$/.test(f))) assert.ok(!/[\uac00-\ud7a3]/.test(fs.readFileSync(f, 'utf8')), 'Korean text in ' + f);
assert.ok(!panel.includes('/Users/'), 'no absolute user paths');

// Payload: the decorate call (script + frozen record + graphic TSX, fonts, frame and look) stays under the ~260 KB
// run_script limit with the longest default preset. Built the way fill() builds it.
const fill = (script, cfg) => script.replace('__CONFIG__', () => 'JSON.parse(' + JSON.stringify(JSON.stringify(cfg)) + ')');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const ctx = { Math, Date, Array, Object, JSON, Number, String, isFinite, Error };
vm.createContext(ctx);
vm.runInContext(planner + '\nthis.api = { tecPresetRows, tecSection, tecFitLength, tecVideoSeconds, TEC_LENGTHS, TEC_LENGTH_ORDER };', ctx);
const api = ctx.api;
const rows = api.tecPresetRows('filmCrew').concat([{ role: 'Visual Effects Supervisor and Colourist', name: 'A Rather Long Name Here' }]);
const scalars = {}, editable = [];
rows.forEach((r, i) => { scalars['role' + (i + 1)] = r.role; scalars['name' + (i + 1)] = r.name; editable.push({ key: 'role' + (i + 1), label: 'Role ' + (i + 1), type: 'text', defaultValue: r.role }, { key: 'name' + (i + 1), label: 'Name ' + (i + 1), type: 'text', defaultValue: r.name }); });
const fonts = [['tec-title-serif.woff2.b64', 'TEC Title Serif', 800], ['tec-credits-sans.woff2.b64', 'TEC Credits Sans', 600]].map(([f, family, weight]) => ({ family, b64: read('assets/fonts/' + f).replace(/\s+/g, ''), weight, style: 'normal' }));
const frames = Array.from({ length: 12 }, (_, i) => i * 120);
const photos = {}, sources = {};
for (let i = 0; i < 11; i++) { sources['00000000-0000-4000-8000-0000000000' + String(i).padStart(2, '0')] = { aspect: 1.7777777777777777 }; }
const record = { layout: 'classic', sequenceId: '00000000-0000-4000-8000-000000000000', fps: 29.97, frames, titleText: 'THE END', rows, speedPxPerSec: 66.6, window: { x: 50.73, y: 12.69, w: 42.6 },
  look: { on: true, strength: 0.3 }, clipSound: 'ambient', photos, sources, fades: { inSec: 0.5, outSec: 1.13 }, musicFadeOut: 1.5 };
const graphic = { tsx: read('assets/credits-graphic.tsx'), parameters: { layout: 'classic', fps: 29.97, revealFrame: frames[1], endFrame: frames[11], title: 'THE END', titleColor: '#FBE4BB', creditColor: '#F0EBDD',
  rows, ...scalars, rowCount: rows.length, speedPxPerSec: 66.6, speed: 1, showTitle: true, fonts }, editableParameters: [{ key: 'title', label: 'Title', type: 'text', defaultValue: 'THE END' }, ...editable] };
const payload = fill(read('scripts/decorate.js'), { ...record, graphic, frame: { tsx: read('assets/shot-frame.tsx') }, look: { tsx: read('assets/cinematic-look.tsx'), strength: 0.3, on: true }, photoMotion: { byRid: {} } });
assert.ok(payload.length < 250000, 'decorate payload ' + payload.length + ' chars (limit ~260 KB)');

// Every bundled cue gives a feasible section with the reveal on its swell at Standard, and the fit offer is consistent.
const manifest = JSON.parse(read('assets/cues/manifest.json'));
assert.equal(manifest.cues.filter(c => c.default).length, 1, 'one default cue');
for (const cue of manifest.cues) {
  const P = cue.phraseBeats * 60 / cue.bpm, swell = cue.swell ?? cue.swellFallback;
  for (const key of api.TEC_LENGTH_ORDER) {
    const sec = api.tecSection({ firstBeat: cue.firstBeat, P, L: 5.1, videoSeconds: api.tecVideoSeconds(api.TEC_LENGTHS[key], P), usableEnd: cue.usableEnd, swell });
    const fit = api.tecFitLength({ firstBeat: cue.firstBeat, P, usableEnd: cue.usableEnd, requested: key });
    assert.equal(fit.key === key, !!sec, cue.id + ' ' + key + ': the fit offer matches the section');
    if (!sec) continue;
    assert.ok(sec.start >= 0 && sec.start + api.tecVideoSeconds(api.TEC_LENGTHS[key], P) <= cue.usableEnd + 1e-9, cue.id + ' ' + key + ' in bounds');
    if (key === 'standard') assert.ok(sec.start + 5.1 >= swell - 1e-6 || sec.j === sec.jMax, cue.id + ': the reveal is on or after the swell');
  }
}
console.log(JSON.stringify({ panel: 'ok', decoratePayload: payload.length }));
