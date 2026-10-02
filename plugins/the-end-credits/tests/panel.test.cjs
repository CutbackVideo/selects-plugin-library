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
// UI text lives in the STRINGS block (10 languages, tests/i18n.test.cjs). `says` checks the English wording of a key
// and that the code reads the key with t(); `code` is the panel without the STRINGS block.
const { extractStrings } = require(path.join(root, 'dev', 'i18n-check.cjs'));
const block = extractStrings(panel), en = block.strings.en;
const code = panel.slice(0, block.begin) + panel.slice(block.end);
const textOf = key => (typeof en[key] === 'string' ? en[key] : Object.values(en[key] || {}).join('\n'));
const says = (key, text) => {
  assert.ok(textOf(key).includes(text), 'STRINGS.en.' + key + ' says "' + text + '": ' + textOf(key));
  // A dotted key may be read through its prefix (t(L, "length." + k)).
  const prefix = key.includes('.') ? key.slice(0, key.lastIndexOf('.') + 1) : null;
  assert.ok(['L', 'l', 'lang', 'bl'].some(v => ['t(', 'tOr('].some(f => code.includes(f + v + ', "' + key + '"') || (prefix && code.includes(f + v + ', "' + prefix + '" + ')))), 't() reads ' + key);
};
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
  'assets/credits-graphic.tsx', 'assets/shot-frame.tsx', 'assets/cinematic-look.tsx', 'assets/fonts/tec-title-serif.woff2.b64', 'assets/fonts/tec-credits-sans.woff2.b64', 'kit-beat-detect.cjs']) {
  assert.ok(panel.includes('"' + name + '"'), 'panel reads ' + name);
  assert.ok(fs.existsSync(path.join(root, name)), name + ' exists');
}
assert.ok(!panel.includes('opening.tsx') && !fs.existsSync(path.join(root, 'assets', 'opening.tsx')), 'the Opening generator was dropped (probe P1): the Classic lead-in is a gap');

// CWV guards.
for (const phrase of ['projectRef', 'No valid session ID', 'visibilitychange', 'addEventListener("focus"', '10000', '>{t(L, "refresh")}<',
  'role="slider"', 'aria-valuenow', 'aria-valuetext', 'ResizeObserver', 'devicePixelRatio', 'setPointerCapture', '"ArrowLeft"', '"Home"', '"End"', '"Escape"',
  'requestAnimationFrame', 'cancelAnimationFrame', 'previewTokenRef', 'URL.createObjectURL', 'URL.revokeObjectURL', 'onended', 'tecHostPreviewUrl(file, start, videoSeconds, MUSIC_FADE_OUT, roots.data)',
  'loadInventory(', 'setCandidates(null)', 'invSigRef', 'known: photoSizesRef.current', 'selects.editor.openDraft', 'linkToDraftFrame',
  'FontFace', '--panel-accent', '--panel-muted-fg', 'fmtTime(total)', 'ffprobe']) assert.ok(code.includes(phrase), phrase);
for (const [key, text] of [['refresh', 'Refresh'], ['stopPreview', 'Stop preview'], ['cancelPreview', 'Cancel preview'],
  ['noFootage', 'this updates automatically'], ['finishTitle', 'Finish title and look'], ['anotherVersion', 'Try other shots'],
  ['stoppedAt', 'Stopped at step {step}/{total} ({name}): {detail}'], ['needsNewerSelects', 'newer version of Selects'], ['draftCreatedAdding', 'Draft created; adding credits and look'],
  ['sectionHint', 'drag to choose'], ['sectionLabel', 'Music section'], ['startsAt', 'Starts at {seconds} s'], ['musicTooShort', 'too short for this length'],
  ['progress', 'Step {step}/{total} · {name} · {percent}%'], ['progressDetail', '({detail})']]) says(key, text);
assert.deepEqual(['prepare', 'plan', 'music', 'assemble', 'decorate'].map(id => en['step.' + id]), ['Finding shots', 'Planning the edit', 'Preparing music', 'Creating Draft', 'Adding credits and look']);
assert.ok(code.includes('aria-valuetext={section == null ? t(lang, "musicTooShort") : t(lang, "startsAt", { seconds: Math.round(section * 10) / 10 })}'), 'aria-valuetext follows the language');
// No UI sentence is left outside STRINGS: JSX text and string props are t() calls.
const jsx = code.slice(code.indexOf('if (!projectId) return <ui'));
assert.ok(!/<(ui\.\w+|small|span|a|button)\b[^>]*>[A-Za-z][a-z]+[^<{]*</.test(jsx), 'no literal JSX text');
assert.ok(!/\b(label|title|busyLabel|placeholder|unit|aria-label|aria-valuetext)="[A-Za-z]/.test(code), 'no literal label props');
assert.ok(!/text: "/.test(code) && !/setStatus\(\{ tone: "\w+", text:/.test(code), 'status messages are t() closures (say), not text');
assert.ok(!/throw new Error\("[A-Z]/.test(code.slice(code.indexOf('// tec-planner:end'))), 'panel errors that reach the UI are uiError closures');
// The language is read on every render, and messages kept in state follow a language switch.
assert.ok(code.includes('const L = uiLang(context);') && code.indexOf('const L = uiLang(context);') < early, 'uiLang(context) in the component body');
assert.ok(code.includes('{status.say(L)}') && code.includes('invError.say(L)') && code.includes('progress.detail(L)'), 'state messages are rendered with the current language');
assert.ok(code.includes('<SectionSlider lang={L}') && code.includes('<CreditsPreview lang={L}'), 'child components get the language');
assert.ok(code.includes('setStep("checking")') && code.includes('setStep("listening")'), 'the spinner text is a key');
// Draft name, run/shell summaries and the panel's own build note stay English.
assert.ok(code.includes('const name = "THE END Credits " + new Date()'), 'English Draft name');
assert.ok(!/--text-tertiary/.test(panel), '--text-tertiary is not a panel token');
assert.ok(!/var\(--accent\b/.test(panel), '--accent is not a panel token');
assert.ok(!/#[0-9a-f]{3,8}\b/i.test(panel.slice(early).replace(/var\(--panel-[a-z-]+, [^)]*\)+/g, "")), "the JSX colours are --panel-* tokens (literal colours only as their fallbacks)");
// Only a lost session is resent, and never a committing call.
assert.ok(panel.includes('if (r.isError && !allowCommit && /No valid session ID/.test(r.output || ""))'), 'no auto-resend of commits');
assert.ok(!/Streamable HTTP error/.test(panel), 'only the session-id failure is resent');
// Windows: no shell at runtime (tests/windows.test.cjs scans every runtime file). Host I/O goes through the tec-host
// block (FileSystem + Runtime.runFFmpeg/runFFprobe with argv arrays); paths are joined by the host.
assert.ok(!panel.includes('runShell'), 'no runShell in the panel');
assert.ok(!/\bdq\(|\bsq\(|TOOL_PATH|ensureNode|runtime\.sh/.test(panel), 'no shell quoting helpers, PATH tricks or Node.js runtime');
assert.ok(!/\bnew Worker\(/.test(panel.slice(0, panel.indexOf('// tec-beat-worker:start'))) && (panel.match(/new Worker\(/g) || []).length === 1, 'one Worker: the beat detector');
for (const k of ['async function locateRoots(_sdk: any)', 'tecHostSkillsDir(PLUGIN_ID, "planner.js")', 'tecHostDataDir(PLUGIN_ID)', 'tecHostReadText(tecHostJoin(root, ...rel.split("/")))',
  'tecHostPeaks(tecHostJoin(roots.plugin, "assets", "cues", cue.file), roots.data, 400)', 'tecHostDecodePcm(file.path, roots.data, TEC_PCM_RATE, TEC_PCM_SECONDS)',
  'analyseBeat(assets.beatWorker, samples, ac.signal)', 'tecHostProbeSeconds(file.path)', 'beatWorker: beatDetect ? tecBeatWorkerSource(beatDetect) : ""',
  'tecHostJoin(roots.plugin, "assets", "cues", cue.file)', 'setTools({ ffmpeg: !!data && tecHostCanRead() && tecHostHas(["rt.runFFmpeg", "rt.runFFprobe", "fs.join"]).ok })',
  'if (String(e?.message) === "host_tools") return t(lang, "needsNewerSelects");', '{!canOwnMusic ? <ui.Message tone="muted">{t(L, "needsNewerSelects")}</ui.Message> : null}',
  'ownAbortRef.current?.abort()', 'worker.postMessage({ id: 1, buf, rate: TEC_PCM_RATE }, [buf])', 'TEC_BEAT_TIMEOUT_MS']) assert.ok(panel.includes(k), k);
// A template run and the panel share locateRoots; the template keeps reading through readText(roots.plugin, "a/b").
assert.ok(panel.includes('const roots = await locateRoots(sdk);') && panel.includes('const read = (rel: string) => readText(roots.plugin, rel);'), 'template roots unchanged');
// In-shot motion: the host ffmpeg once per clip into the data folder (planner tecMotionArgs; no filtergraph path),
// read back, removed and turned into a curve; cached per Project + clip; any failure leaves the clip unmeasured.
const mm = panel.slice(panel.indexOf('async function measureMotion('), panel.indexOf('// The Motion Graphic\'s data'));
for (const k of ['tecHostFFmpegBytes((file: string) => tecMotionArgs(r.path, file), roots.data, "gray", { timeoutMs: 120000 })', 'curve = tecMotionCurve(bytes);', 'pid + "|" + r.rid',
  'in motionRef.current', '!tools.ffmpeg || !r.path', 'if (e === STALE) throw e;', 'check();']) assert.ok(mm.includes(k), 'motion: ' + k);
assert.ok(panel.indexOf('const motionRef = React.useRef') > 0 && panel.indexOf('const motionRef = React.useRef') < early, 'the motion cache is a hook before the early return');
assert.ok(panel.indexOf('const ownAbortRef = React.useRef') > 0 && panel.indexOf('const ownAbortRef = React.useRef') < early, 'the own-music abort is a hook before the early return');
// Temporary files: every ffmpeg output goes through tecHostFFmpegBytes (an ASCII name in the data folder, removed).
const hostBlock = panel.slice(panel.indexOf('// tec-host:start'), panel.indexOf('// tec-host:end'));
assert.ok(hostBlock.includes("const out = tecHostJoin(dataDir, 'tmp-' + tecHostToken() + '.' + ext);") && hostBlock.includes('await tecHostRemove(out);'), 'temporary files are removed');
assert.equal((panel.match(/tecHostFFmpeg\(/g) || []).length, 2, 'ffmpeg runs only inside tecHostFFmpegBytes (plus its definition)');
// Bundled cues tell ensure-audio their length (the duration check); own music does not.
assert.ok(panel.includes('musicSeconds: musicOn && cueId !== "own" && cue?.durationSeconds > 0 ? cue.durationSeconds : null'), 'cue length for ensure-audio');
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
assert.ok(panel.includes('const p = { ...tecProgress(id, fraction), detail: detail || null };') && panel.includes('if (progressRef.current && p.value < progressRef.current.value - 1e-9) return;'), 'progress never goes backwards');
assert.ok(code.includes('steps={TEC_BUILD_STEPS.map((s: any) => t(L, "step." + s.id))}'), 'the progress lists the build steps in the UI language');
for (const id of ['"prepare"', '"plan"', '"music"', '"assemble"', '"decorate"']) assert.ok(panel.includes('advance(' + id), 'advance ' + id);
const order = ['fill(assets.scripts.inventoryJs', 'findCandidates(todo', 'await measureMotion(', 'tecPlanBuild({ layout: inputs.layout', 'fill(assets.scripts.ensureJs', 'fill(assets.scripts.assembleJs', 'await decorate(record'];
order.reduce((at, s) => { const i = buildBody.indexOf(s); assert.ok(i > at, 'build order: ' + s); return i; }, -1);
assert.ok(/fill\(assets\.scripts\.searchJs, \{ projectId: pid, rids: rids\.slice\(i, i \+ 4\), queries: TEC_SEARCH_QUERIES, pageSize: 4 \}\)/.test(panel), 'search in batches of 4, pageSize 4');
assert.ok(buildBody.includes('fill(assets.scripts.ensureJs, { projectId: pid, path: inputs.musicPath, ...(inputs.musicSeconds ? { durationSeconds: inputs.musicSeconds } : {}) }), true)'), 'ensure-audio commits in its own call');
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
assert.ok(buildBody.includes('tecRollSpeed({ endSec, L: revealSec, H: 1080, lastLineBottom: model.lastLineBottom, rowTops: model.rowTops, rowBottoms: model.rowBottoms })')
  && buildBody.includes('const endSec = frames[frames.length - 1] / a.fps, revealSec = frames[1] / a.fps;'), 'the roll speed comes from the assembled frames at the real fps');
assert.ok(buildBody.includes('candidates: found.list.concat(photoCands), seed: String(nextSeed), motion })'), 'the plan scores in-shot motion');
assert.ok(buildBody.includes('tecShotMotions(plan.picks, String(nextSeed), sizes, { pool: plan.motionPool })'), 'shot motions (photos and still videos) from the planner');
assert.ok(buildBody.includes('for (const r of inv.resources) if (r.width > 0 && r.height > 0) sizes[r.rid]'), 'video sizes for the motion axis');
assert.ok(buildBody.includes('photoMotion: { byRid, byShot }') && buildBody.includes('await decorate(record, { byRid, byShot }, check)'), 'per-shot motions reach decorate');
assert.ok(panel.includes('await decorate(result.record, result.photoMotion, check)'), 'Finish title and look retries decorate with the frozen record');
assert.ok(panel.includes('graphic: graphicFor(record, bl), frame: { tsx: assets.frameTsx },') && panel.includes('look: { tsx: assets.lookTsx, strength: record.look.strength, on: record.look.on }, photoMotion, labels: inspectorLabels(bl) }'), 'decorate cfg');
assert.ok(panel.includes('const LOOK_STRENGTH = 0.5;'));
const anotherBody = panel.slice(panel.indexOf('function buildAnother()'), panel.indexOf('async function finishTitle('));
assert.ok(anotherBody.indexOf('setResult(null)') >= 0 && anotherBody.indexOf('setResult(null)') < anotherBody.indexOf('build(s)') && /const s = seed \+ 1;/.test(anotherBody), 'another version: a new seed');
assert.ok(panel.includes('candidates.key === key') && panel.includes('const key = pid + "|" + JSON.stringify(inputs.only);'), 'another version reuses the scene search');
// Graphic parameters and Adjust fields.
const gfx = panel.slice(panel.indexOf('function graphicFor('), panel.indexOf('async function build('));
for (const k of ['layout: record.layout', 'fps: record.fps', 'revealFrame: record.frames[1]', 'endFrame: record.frames[record.frames.length - 1]', 'title: record.titleText',
  'titleColor: TITLE_COLOR', 'creditColor: CREDIT_COLOR', 'rows: record.rows', '...scalars', 'rowCount: K', 'speedPxPerSec: record.speedPxPerSec', 'speed: 1', 'showTitle: true', 'fonts',
  'scalars["role" + (i + 1)]', 'scalars["name" + (i + 1)]', 'label: t(bl, "roleN", { n: i + 1 })', 'label: t(bl, "nameN", { n: i + 1 })',
  '{ key: "title", label: t(bl, "title"), type: "text"', '{ key: "titleColor", label: t(bl, "param.titleColor"), type: "color"', '{ key: "creditColor", label: t(bl, "param.creditColor"), type: "color"',
  '{ key: "speed", label: t(bl, "param.rollSpeed"), type: "number", defaultValue: 1, min: 0.5, max: 2, step: 0.05 }', '{ key: "showTitle", label: t(bl, "param.showTitle"), type: "boolean", defaultValue: true }',
  'family: f.family, b64: assets.fontsB64[f.file], weight: f.weight, style: f.style']) assert.ok(gfx.includes(k), 'graphic ' + k);
assert.ok(panel.includes('const editableParameters: any = ['), 'editableParameters cast to any');
// Inspector labels use the UI language at build time (langRef, also for Finish title and look); decorate.js gets its
// Shot frame / Motion / look labels in cfg.labels.
for (const [key, text] of [['title', 'Title'], ['param.titleColor', 'Title color'], ['param.creditColor', 'Credits color'], ['param.rollSpeed', 'Roll speed'], ['param.showTitle', 'Show title'],
  ['roleN', 'Role {n}'], ['nameN', 'Name {n}'], ['param.windowX', 'Window X (%)'], ['param.fadeIn', 'Fade in (s)'], ['param.motion', 'Motion'], ['param.motionStrength', 'Motion strength'],
  ['param.lookStrength', 'Look strength']]) says(key, text);
assert.ok(code.includes('const bl = langRef.current;') && code.includes('graphic: graphicFor(record, bl)') && code.includes('photoMotion, labels: inspectorLabels(bl) }), true)'), 'build-time labels');
assert.ok(code.includes('["none", ...TEC_PHOTO_MOTIONS].map((v) => [v, t(bl, "motion." + v)])'), 'motion choice labels');
assert.deepEqual(['none', 'push-in', 'pull-out', 'drift-left', 'drift-right', 'drift-up', 'drift-down', 'tilt', 'push-drift'].map(v => en['motion.' + v]),
  ['None', 'Push in', 'Pull out', 'Drift left', 'Drift right', 'Drift up', 'Drift down', 'Tilt', 'Push and drift'], 'the English motion labels match decorate.js');

// UI sections.
const sectionAt = key => code.indexOf('<ui.Section title={t(L, "' + key + '")}>');
for (const [key, text] of [['layout', 'Layout'], ['title', 'Title'], ['credits', 'Credits'], ['length', 'Length'], ['music', 'Music'], ['advanced', 'Advanced'], ['preview', 'Preview']]) {
  assert.ok(sectionAt(key) > 0, 'section ' + key); says(key, text);
}
assert.ok(sectionAt('layout') < sectionAt('preview') && sectionAt('preview') < sectionAt('title') && sectionAt('title') < sectionAt('credits') && sectionAt('credits') < sectionAt('length') && sectionAt('length') < sectionAt('music') && sectionAt('music') < sectionAt('advanced'), 'section order');
// Preview sits right below Layout (status / Refresh, Layout, Preview, Title, Credits, ...) and draws from the same state.
{
  const pv = code.slice(sectionAt('preview'), code.indexOf('</ui.Section>', sectionAt('preview')));
  assert.equal(code.indexOf('<ui.Section', code.indexOf('</ui.Section>', sectionAt('layout'))), sectionAt('preview'), 'Preview is the section after Layout');
  assert.ok(pv.includes('<CreditsPreview lang={L} layout={layout} title={title} model={creditModel} pxPerSec={roll.pxPerSec} endSec={videoSeconds} time={previewTime} fontsReady={fontsReady} />'), 'the Preview follows Layout, Title and the credit rows');
  assert.ok(code.includes('const creditModel = React.useMemo(() => tecCreditLayout({ rows: cleanRows, layout,'), 'the credit model follows the rows and the layout');
}
says('layout.classic', 'Classic (window)'); says('layout.full', 'Full frame');
// Layout: two schematic buttons with aria-pressed; Classic is the default.
assert.ok(panel.includes('aria-pressed={on}') && panel.includes('<LayoutIcon kind={value} />') && panel.includes('React.useState<"classic" | "full">("classic")'), 'layout buttons');
assert.ok(panel.includes('const DEFAULT_TITLE = "THE END";') && panel.includes('React.useState(DEFAULT_TITLE)'), 'default title');
// Credits: preset select, the CreditRows editor (drag & drop, kit panel-ui.md §1) with labelled inputs, reset, blank-row drop, key guard.
for (const phrase of ['label={t(L, "preset")}', 'TEC_PRESET_ORDER.map(', 'tOr(L, "preset." + id, (TEC_PRESETS as any)[id].label)', 'React.useState(TEC_DEFAULT_PRESET)', 'tecPresetRows(preset, creditInfo)',
  'aria-label={t(lang, "roleN", { n: i + 1 })}', 'aria-label={t(lang, "nameN", { n: i + 1 })}', 'placeholder={t(lang, "rolePlaceholder")}', 'placeholder={t(lang, "namePlaceholder")}',
  '>{t(lang, "list.addRow")}</ui.Button>', '>{t(lang, "resetPreset")}</ui.Button>',
  'onKeyDown={(e) => e.stopPropagation()}', 'onKeyDown={guardKeys}', 'tecCleanRows(rows)', 'minWidth: 0, width: "auto", maxWidth: "none", boxSizing: "border-box"']) assert.ok(code.includes(phrase), phrase);
for (const [key, text] of [['rolePlaceholder', 'Role (e.g. Director)'], ['namePlaceholder', 'Name'], ['list.addRow', 'Add row'], ['resetPreset', 'Reset to preset'],
  ['list.reorderHandle', 'Reorder row {n}: {label}'], ['list.removeRow', 'Remove row {n}'], ['list.moved', '{label} moved to position {pos} of {total}'],
  ['rowsHint', 'Rows with both fields empty are left out'], ['placeholdersLeft', 'still have placeholders'], ['systemFont', 'Some characters use a system font'], ['creditN', 'Credit {n}'],
  ['preset.filmCrew', 'Film crew'], ['preset.personal', 'Personal'], ['preset.travel', 'Travel']]) says(key, text);
for (const key of ['up', 'down', 'remove', 'addRow']) assert.equal(en[key], undefined, 'the Up / Down / Remove / old Add row strings are gone: ' + key);
const guard = panel.slice(panel.indexOf('function guardKeys('), panel.indexOf('export default function Panel('));
assert.ok(guard.includes('e.stopPropagation()') && guard.includes('"Delete"') && guard.includes('"Backspace"') && guard.includes('" "') && guard.includes('e.preventDefault()'), 'Delete/Space never reach the app');
// Edits survive music, inventory and length changes; unedited auto values follow; No music drops the Music credit.
assert.ok(panel.includes('const rows: EditRow[] = customRows ?? presetRows;') && panel.includes('r.name === prev[k]') && panel.includes('if (next[kind] !== "") out.push'), 'auto values follow only while unedited');
assert.ok(panel.includes('cueTitle: cueId !== "none" && cueId !== "own" && cue ? cue.title : ""'), 'No music removes the Music credit');
assert.ok(panel.includes('music: ["Music", "Music by"]'), 'Personal and Travel music roles');
// Length.
assert.ok(code.includes('TEC_LENGTH_ORDER.map((k: string) => ({ label: t(L, "length." + k), value: k }))') && code.includes('<ui.Segmented label={t(L, "length")}') && code.includes('TEC_LENGTHS[length]'), 'length from TEC_LENGTHS');
assert.deepEqual(['short', 'standard', 'long'].map(k => en['length.' + k]), ['Short', 'Standard', 'Long']);
// Music: the five cues (default from the manifest), own music, No music; section via tecSection; fit offer; fixed-timing notice.
for (const phrase of ['{ label: t(L, "ownMusic"), value: "own" }', '{ label: t(L, "noMusic"), value: "none" }', '(parsed.cues || []).find((c: any) => c.default)', 'React.useState("")', 'setCueId((cur) => (cur === "" ? def.id : cur))',
  'swell: cue.swell ?? cue.swellFallback', 'P: (beats * 60) / cue.bpm', 'tecSection({ ...sectionOpts, value', 'tecFitLength({', 't(L, "tooShortNeeds", { seconds: fit.needSeconds })', 't(L, "useLength", { length: t(L, "length." + fit.key) })',
  't(L, "noSteadyBeat", { seconds: TEC_FIXED_PHRASE })', 'const ph = tecOwnPhrase(ownGrid);', 'approximate: ph.approximate', 't(L, "beatApprox", { seconds: Math.round(music.P * 100) / 100 })', 'usableEnd: ownDuration - TEC_MUSIC_END_MARGIN',
  '<ui.FileDrop accept={["audio"]}', "'-t', Number(duration).toFixed(2)", 'tecHostPreviewUrl(file, start, videoSeconds, MUSIC_FADE_OUT, roots.data)']) assert.ok(code.includes(phrase), phrase);
for (const [key, text] of [['ownMusic', 'Your own music'], ['noMusic', 'No music'], ['tooShortNeeds', 'This track is too short (needs ≥ {seconds} s).'], ['useLength', 'Use {length}'], ['tooShortFor', 'This track is too short for {length}.'],
  ['noSteadyBeat', 'No steady beat found: shots are {seconds} s.'], ['beatApprox', 'Beat found (approximate): shots follow it at {seconds} s.'], ['startsAtLoudest', 'reveal on the loudest part'], ['startsAtSwell', 'reveal on the swell'],
  ['trackTooShort', 'This track is too short for this Length.'], ['dropMusic', 'Drop a music file']]) says(key, text);
assert.ok(panel.includes('[cueId, ownMusic?.path, section, length]'), 'a stale preview stops');
// Own music: the approximate notice only for an approximate grid on a phrase; hitRate is never read (it can be 1 on
// noise or a single onset), only grid / accepted through tecOwnPhrase.
assert.ok(panel.includes('ownGrid && !music.fixed && "approximate" in music && music.approximate ?'), 'approximate notice condition');
assert.ok(!/hitRate/.test(panel.slice(panel.indexOf('// tec-planner:end'))), 'the panel does not read hitRate');
// The default cue is only the manifest's `default: true` flag: no bundled cue id is hard-coded in the panel.
for (const id of ['piano-strings', 'rhodes-soul', 'post-rock', 'orchestral', 'dream-synth']) assert.ok(!panel.includes('"' + id + '"'), 'panel hard-codes cue ' + id);
// Advanced: clip sound Ambient (default) / Full / Off, Cinematic look, Use photos, Choose clips.
assert.ok(/React\.useState<"off" \| "ambient" \| "full">\("ambient"\)/.test(panel), 'Ambient is the default');
for (const phrase of ['label={t(L, "clipSound")}', '(["ambient", "full", "off"] as const).map((v) => ({ label: t(L, "sound." + v), value: v }))', 'label={t(L, "cinematicLook")}', 'label={t(L, "usePhotos")}',
  'type="checkbox"', 'chooseClips(allRids)', 'chooseClips([])']) assert.ok(code.includes(phrase), phrase);
assert.deepEqual(['ambient', 'full', 'off'].map(v => en['sound.' + v]), ['Ambient', 'Full', 'Off']);
for (const [key, text] of [['clipSound', 'Clip sound'], ['cinematicLook', 'Cinematic look'], ['usePhotos', 'Use photos'], ['chooseClips', 'Choose clips'], ['chooseClipsCount', 'Choose clips ({selected}/{total})'],
  ['clipsSelected', '{selected} of {count} clips selected'], ['noClipsSelected', 'No clips selected'], ['photosSelected', '{selected} of {count} photos selected'], ['silentVideo', 'Silent video'],
  ['photo', 'Photo'], ['usePhotosOff', 'Use photos is off']]) says(key, text);
assert.ok(code.includes('t(L, "shape." + hint)') && ['tall', 'wide', 'square'].every(k => en['shape.' + k]), 'shape hints are keys');
// A sentence with two numbers takes its plural form from {count}, so the noun must sit next to {count}, not next to the
// other number ({selected}, {found}); checked in every language that has plural nouns.
{
  const all = block.strings, forms = v => (typeof v === 'string' ? [v] : Object.values(v));
  for (const lang of ['de', 'en', 'es', 'fr', 'it', 'pt']) for (const key of ['clipsSelected', 'photosSelected']) for (const f of forms(all[lang][key]))
    assert.ok(/\{selected\} \S+ \{count\}/.test(f), lang + '.' + key + ': {selected} must come before {count} and its noun: ' + f);
  for (const lang of ['es', 'fr', 'it', 'pt']) for (const f of forms(all[lang].needsShots))
    assert.ok(/: \{found\}\)/.test(f), lang + '.needsShots: no noun or participle agreeing with {found}: ' + f);
}
const chooseBody = panel.slice(panel.indexOf('const chooseClips ='), panel.indexOf('const toggleClip ='));
assert.ok(chooseBody.includes('setCandidates(null)') && chooseBody.includes('ordered.length === allRids.length ? null : ordered'), 'a new selection drops the cache');
// Preview: fixed-height canvas, planner layout at the computed speed, 3 scrub points, bundled fonts.
for (const phrase of ['const PREVIEW_HEIGHT = ', 'height: PREVIEW_HEIGHT', 'tecCreditLayout({ rows: cleanRows, layout, H: 1080', 'pxPerSec={roll.pxPerSec}', '>{t(L, "firstRow")}</ui.Button>', '>{t(L, "lastRow")}</ui.Button>',
  'onClick={() => setPreviewTime(endScrubSec)}>{t(L, "end")}</ui.Button>', '(videoSeconds - TEC_CREDIT_METRICS.exitLead)', 'label={t(L, "previewAt")}', 'tecTypedCount(typing, t)', 'destination-in', 'lc.scale(sx, 1)',
  'const sx = titleScaleX(title);', '"TEC Title Serif"', '"TEC Credits Sans"', 'document as any).fonts.add(face)']) assert.ok(code.includes(phrase), phrase);
for (const [key, text] of [['firstRow', 'First row'], ['lastRow', 'Last row'], ['end', 'End'], ['previewAt', 'Preview at'], ['creditsPreview', 'Credits preview']]) says(key, text);
// Hangul (v1): the system face of each role ends the stacks, wide characters count 1 em without a canvas, and a title
// holding Hangul is never squeezed (the preview mirrors the graphic's tecTitleScaleX).
assert.ok(code.includes(`const TITLE_STACK = '"TEC Title Serif", Georgia, "Times New Roman", "AppleMyungjo", serif';`), 'serif title stack ends in AppleMyungjo');
assert.ok(code.includes(`const CREDITS_STACK = '"TEC Credits Sans", "Helvetica Neue", Arial, "Apple SD Gothic Neo", sans-serif';`), 'sans credits stack ends in Apple SD Gothic Neo');
assert.ok(code.includes('function titleScaleX(text: string) { return HANGUL_RE.test(text) ? 1 : TITLE_SCALE_X; }') && code.includes('const TITLE_SCALE_X = 0.78;'), 'no scaleX squeeze on Hangul');
assert.ok(code.includes('* sx) / colTarget'), 'the preview fit uses the same scaleX');
assert.ok(code.includes('a + (WIDE_RE.test(ch) ? 1 : 0.6)'), 'wide characters 1 em in the measurement fallback');
assert.ok(!/letterSpacing|textTransform|toUpperCase/.test(code), 'no tracking or uppercase');
// Roll-fit notice before Build: hidden rows are named, rows that can't roll off the top before the end say so
// (never silently left on screen), few rows end early.
for (const phrase of ['tecRollSpeed({ endSec: videoSeconds, L: TEC_LEAD_IN, H: 1080, lastLineBottom: creditModel.lastLineBottom, rowTops: creditModel.rowTops, rowBottoms: creditModel.rowBottoms })', 'roll.hiddenRows',
  'hidden.map((i: number) => cleanRows[i].role || cleanRows[i].name).join(t(L, "listSep"))', 'const longLabel = t(L, "length.long"), lengthLabel = t(L, "length." + length);',
  'roll.exitsLate ? (length !== "long" ? t(L, "tooManyRowsOrLong", { count: dropRows, long: longLabel }) : t(L, "tooManyRows", { count: dropRows }))',
  't(L, "dropRowsOrLong", { count: dropRows, long: longLabel })', '{rollNotice ?']) assert.ok(code.includes(phrase), phrase);
for (const [key, text] of [['rowsHidden', "Rows {from}–{to} won't appear in {length}: {names}."], ['rowHidden', "Row {from} won't appear in {length}: {names}."], ['dropRows', 'To roll every row off before the end, remove {count} rows.'],
  ['dropRowsOrLong', 'remove {count} rows or choose {long}.'], ['tooManyRows', 'Too many rows to roll off before the end'], ['tooManyRowsOrLong', 'or choose {long}.'], ['creditsEndEarly', 'Credits finish before the end'],
  ['noCreditRows', 'No credit rows'], ['listSep', ', ']]) says(key, text);
assert.ok(!panel.includes('the last rows end lower on screen'), 'no notice that accepts text left on screen');
assert.ok(code.indexOf('{rollNotice ?') < code.indexOf('<ui.Actions>'), 'the roll-fit notice shows before Build');
// Readiness: "Ready: N clips · N photos · about N s"; Full frame counts N + 1 shots; footage shrink and the minimum.
for (const phrase of ['t(L, "ready", { summary: [clipCount', 't(L, "aboutSeconds", { seconds: Math.round(tecVideoSeconds(', 'const extra = layout === "full" ? 1 : 0;', 't(L, "shots", { count: shotsFit + extra })',
  't(L, "shotsFitted", { count: shotsFit + extra })']) assert.ok(code.includes(phrase), phrase);
for (const [key, text] of [['ready', 'Ready: {summary}'], ['shots', '{count} shots'], ['aboutSeconds', 'about {seconds} s'], ['needsShots', 'Needs at least {count} usable clips or photos (found {found}).'],
  ['shortened', 'Your footage fits {count} shots'], ['addFootagePhotos', 'Add more varied footage or photos.'], ['addFootagePhotosSelect', 'or photos, or select more clips.'], ['retryUnchecked', 'press Build to retry them.'],
  ['turnOnPhotos', 'Turn on Use photos in Advanced']]) says(key, text);
assert.ok(/needsPoll = [^\n]*inventory\.photos/.test(panel), 'a photos-only Project does not poll');

// Readiness never blocks on analysis: unanalysed clips are usable (scored locally), so the old blocker wording is gone
// and at most one small muted note says analysed clips give better picks. Videos still importing are counted.
for (const gone of ['analysing', 'notAnalysed', 'notAnalysedAnalyse', 'notAnalysedMaybe', 'analysisFailed', 'noteAnalysing', 'noteFailed']) {
  for (const lang of Object.keys(block.strings)) assert.ok(!(gone in block.strings[lang]), lang + '.' + gone + ' is gone');
}
assert.ok(!/analy[sz]/i.test(textOf('noFootage')), 'noFootage asks for no analysis: ' + textOf('noFootage'));
for (const lang of Object.keys(block.strings)) {
  const all = JSON.stringify(block.strings[lang]);
  assert.ok(!/Analyse (it|them) in Selects|still being analysed|being analysed|analyse them|not analysed yet/i.test(all), lang + ': no analysis blocker wording');
  assert.ok(typeof block.strings[lang].analysedBetter === 'string' && block.strings[lang].analysedBetter.length > 4, lang + '.analysedBetter');
  for (const key of ['clipsChecking', 'stillImporting']) assert.ok(block.strings[lang][key] && block.strings[lang][key].other, lang + '.' + key + ' has plural forms');
}
says('analysedBetter', 'Analysed clips give better picks.');
says('clipsChecking', 'Checking clips {done}/{count}');
says('stillImporting', 'still being imported');
says('noFootage', 'Add video clips or photos');
// (The beat worker's module.exports.analyze( is the kit beat detector, not Selects analysis.)
const noWorker = panel.slice(0, panel.indexOf('// tec-beat-worker:start')) + panel.slice(panel.indexOf('// tec-beat-worker:end'));
assert.ok(!/startAnalysis|analyzeResources|\.analyze\(/.test(noWorker), 'the panel does not start analysis');
{
  const start = panel.indexOf('function tecFootageNotes('), end = panel.indexOf('// Layout thumbnails:');
  assert.ok(start > 0 && end > start, 'the footage-note helper exists');
  const js = panel.slice(start, end).replace(/(\w)\??: (?:any|number|string|Lang)\b/g, '$1');
  const tt = (lang, key, vars = {}) => {
    let msg = block.strings[lang][key] ?? en[key];
    if (typeof msg !== 'string') msg = msg[new Intl.PluralRules(lang).select(vars.count)] ?? msg.other;
    return msg.replace(/\{(\w+)\}/g, (w, n) => (vars[n] === undefined ? w : String(vars[n])));
  };
  const box = { t: tt };
  vm.runInNewContext(js + '\nthis.api = { tecFootageNotes };', box);
  const notes = (inv, lang = 'en') => JSON.parse(JSON.stringify(box.api.tecFootageNotes(lang, inv)));
  const res = (...flags) => flags.map((analysed, i) => ({ rid: 'r' + i, analysed }));
  assert.deepEqual(notes({ resources: res(true, true), skipped: { unanalysed: 0 } }), { better: '', importing: '' }, 'all analysed: nothing to say');
  assert.deepEqual(notes({ resources: res(true, false), skipped: { unanalysed: 0 } }), { better: 'Analysed clips give better picks.', importing: '' });
  assert.deepEqual(notes({ resources: res(false), skipped: { unanalysed: 2 } }), { better: 'Analysed clips give better picks.', importing: '2 clips are still being imported; this updates automatically.' });
  assert.equal(notes({ resources: [], skipped: { unanalysed: 1 } }).importing, '1 clip is still being imported; this updates automatically.');
  assert.deepEqual(notes(null), { better: '', importing: '' });
  assert.ok(!/undefined|\{\w+\}/.test(Object.keys(block.strings).map(l => Object.values(notes({ resources: res(false), skipped: { unanalysed: 3 } }, l)).join()).join()), 'every language fills the counts');
  // Every readiness branch uses the notes; the muted note sits under the readiness line.
  for (const phrase of ['const footNotes = tecFootageNotes(L, inventory);', '(footNotes.importing || t(L, "noFootage"))', 'sentences([footNotes.importing, t(L, "turnOnPhotos")])',
    't(L, "addFootagePhotos"), footNotes.importing])', '{inventory && footNotes.better ? <ui.Message tone="muted">{footNotes.better}</ui.Message> : null}',
    'r.rid + (r.analysed === false ? "~" : "")']) assert.ok(panel.includes(phrase), phrase);
  // Polling: while videos import, while Selects analyses some (a note refresh only), or while the Project is empty.
  const poll = (panel.match(/const needsPoll = ([^\n]*);/) || [])[1];
  assert.ok(poll, 'needsPoll');
  const needsPoll = (inventory) => vm.runInNewContext(poll, { inventory, invSkipped: (inventory && inventory.skipped) || {} });
  const inv = (skipped, resources = 0, photos = 0) => ({ skipped, resources: Array.from({ length: resources }, (_, i) => ({ rid: 'r' + i, analysed: false })), photos: Array.from({ length: photos }, (_, i) => ({ rid: 'p' + i })) });
  assert.equal(needsPoll(inv({ unanalysed: 2, analysing: 0 }, 5)), true, 'importing clips poll');
  assert.equal(needsPoll(inv({ unanalysed: 0, analysing: 2 }, 5)), true, 'clips being analysed refresh the note');
  assert.equal(needsPoll(inv({ unanalysed: 0, analysing: 0, notAnalysed: 5 }, 5)), false, 'usable unanalysed clips do not poll');
  assert.equal(needsPoll(inv({ unanalysed: 0 })), true, 'an empty Project polls');
  assert.equal(needsPoll(inv({ unanalysed: 0 }, 0, 3)), false, 'photos only: no poll');
  assert.equal(needsPoll(null), false);
}

// Build: unanalysed clips are scored with the kit quick-score block (never scene search), inside Prepare with a
// "Checking clips N/M" detail, and the run is cancelled when the Project switches or the panel closes.
for (const phrase of ['scoreAll: quickScoreAll, candidatesOf: qsCandidates', 't(l, "clipsChecking", { done, count })', 'chosen.filter((r: any) => r.analysed === false)',
  'const rids: string[] = chosen.filter((r: any) => r.analysed !== false)', 'buildAbortRef.current?.abort()', 'abort.signal', 'e?.name !== "AbortError"',
  'measureMotion(chosen.filter((r: any) => r.analysed !== false)']) assert.ok(code.includes(phrase), phrase);

// Layout buttons: the button holds the thumbnail and the label (a column that grows with the label, no fixed height),
// the label wraps inside it, and the two buttons share the row equally.
{
  const sec = panel.indexOf('<ui.Section title={t(L, "layout")}>');
  assert.ok(panel.slice(sec, panel.indexOf('</ui.Section>', sec)).includes('<LayoutTiles '), 'the Layout section draws LayoutTiles');
  const at = panel.indexOf('function LayoutTiles(');
  const block = panel.slice(at, panel.indexOf('\n}\n', at));
  const button = block.slice(block.indexOf('<button '), block.indexOf('</button>') + '</button>'.length);
  const style = button.slice(button.indexOf('style={{'), button.indexOf('}}>') + 2);
  assert.ok(button.includes('<LayoutIcon kind={value} />') && button.includes('>{label}</span>'), 'the thumbnail and the label are inside the button');
  for (const phrase of ['flex: "1 1 0"', 'minWidth: 0', 'height: "auto"', 'display: "flex"', 'flexDirection: "column"', 'whiteSpace: "normal"', 'maxWidth: "none"', 'maxHeight: "none"', 'boxSizing: "border-box"']) assert.ok(style.includes(phrase), 'layout button ' + phrase);
  assert.ok(!/(?:^|[^a-zA-Z])(?:min|max)?[hH]eight: (?:[1-9]|"\d)/.test(style), 'no fixed pixel height on the layout button');
  assert.ok(button.includes('overflowWrap: "anywhere"') && !button.includes('nowrap') && !button.includes('textOverflow'), 'the label wraps inside the button');
  assert.ok(block.includes('alignItems: "stretch"') && !block.includes('flexWrap: "wrap"'), 'one row; the buttons grow to the tallest');
  assert.ok(!/#[0-9a-f]{3,8}\b/i.test(button.replace(/var\(--panel-[a-z-]+, [^)]*\)+/g, '')), 'only --panel-* colours');
}

// Credit rows: drag & drop reordering (kit panel-ui.md §1).
{
  const sec = panel.indexOf('<ui.Section title={t(L, "credits")}>');
  const secBody = panel.slice(sec, panel.indexOf('</ui.Section>', sec));
  assert.ok(secBody.includes('<CreditRows lang={L} rows={rows} busy={busy} ui={ui} onEdit={editRows} onKeyDown={guardKeys}'), 'the Credits section draws CreditRows, edits go through editRows');
  assert.ok(secBody.includes('canReset={!!customRows}') && secBody.includes('setCustomRows(null)') && secBody.includes('newRowId()'), 'Add and Reset keep their behaviour');
  assert.ok(!/ArrowUp|"up"|"down"/.test(secBody) && !/<ui\.Button[^>]*>\{t\(L, "(up|down|remove)"\)\}/.test(code), 'no Up / Down buttons');
  const at = code.indexOf('function CreditRows(');
  assert.ok(at > 0 && at < code.indexOf('export default function Panel('), 'CreditRows is a module-level component');
  const comp = code.slice(at, code.indexOf('\n}\n', at));
  // The handle: a focusable <button> with the reorder label, an inline SVG grip, >= 24 px, grab / grabbing cursors,
  // and the host <button> defaults (fill, width 100%, fixed height) overridden inline.
  const handle = comp.slice(comp.indexOf('<button type="button"'), comp.indexOf('</button>') + 9);
  assert.ok(handle.includes('aria-label={t(lang, "list.reorderHandle", { n: i + 1, label: labelOf(r, i) })}') && handle.includes('<GripIcon />'), 'labelled grip handle');
  assert.ok(handle.includes('{...handleProps(i)}') && handle.includes('disabled={busy}'), 'the handle carries the drag handlers and is disabled while busy');
  for (const phrase of ['width: 24', 'height: 24', 'maxWidth: "none"', 'padding: 0', 'border: 0', 'touchAction: "none"', 'cursor: busy ? "default" : lifted ? "grabbing" : "grab"', 'background: lifted ?']) assert.ok(handle.includes(phrase), 'handle ' + phrase);
  assert.ok(code.includes('function GripIcon()') && /stroke="currentColor"/.test(code.slice(code.indexOf('function GripIcon()'), at)), 'the grip is an inline currentColor SVG');
  // Pointer handlers live only on the handle: never on the row, the fields or the list.
  const pointerUses = (comp.match(/onPointer\w+|onLostPointerCapture|draggable|onDrag\w*/g) || []);
  assert.deepEqual([...new Set(pointerUses)].sort(), ['onLostPointerCapture', 'onPointerCancel', 'onPointerDown', 'onPointerMove', 'onPointerUp'], 'pointer handlers only in handleProps');
  const handlePropsBody = comp.slice(comp.indexOf('const handleProps = '), comp.indexOf('const g = geo.current;\n  const held'));
  assert.equal((comp.match(/onPointer\w+:/g) || []).length, (handlePropsBody.match(/onPointer\w+:/g) || []).length, 'every pointer handler is in handleProps');
  assert.equal((comp.match(/\{\.\.\.handleProps\(i\)\}/g) || []).length, 1, 'handleProps spread once, on the handle');
  assert.ok(!/draggable[=:]|onDragStart/.test(code), 'no HTML5 drag and drop');
  for (const phrase of ['setPointerCapture(e.pointerId)', 'releasePointerCapture', 'e.button !== 0', 'Math.abs(g.y - g.y0) < 4', 'requestAnimationFrame(autoScroll)', 'cancelAnimationFrame', 'const EDGE = 32;',
    'scrollParent(listRef.current)', 'g.scroller.scrollTop - g.s0', 'k.key === "Escape"', 'window.addEventListener("keydown", g.onKey, true)', 'onEdit((l) => arrayMove(l, from, to))',
    'prefers-reduced-motion: reduce', '"transform 140ms ease"', 'opacity: lifted ? 0.9 : 1', 'height: 2', 'var(--panel-accent', 'e.altKey', 'reorderStep(i, dir, n)', 'h.focus()', 'useLayoutEffect']) assert.ok(comp.includes(phrase) || code.includes(phrase), 'reorder ' + phrase);
  // Look: no card per row, 1 px dividers, 5 px vertical padding, fields side by side or stacked.
  assert.ok(comp.includes('padding: "5px 0"') && comp.includes('borderBottom: ROW_DIVIDER') && code.includes('const ROW_DIVIDER = "1px solid var(--panel-border, rgba(128, 128, 128, 0.35))";'), 'divided compact rows');
  assert.ok(!/border: "1px solid/.test(comp), 'no card border per row');
  assert.ok(comp.includes('flexWrap: "wrap"') && comp.includes('flex: "1 1 140px", minWidth: 0'), 'fields wrap');
  // Accessibility: list roles, the × IconButton, Add with the shared key, the polite live region with the moved text.
  assert.ok(comp.includes('role="list"') && comp.includes('role="listitem"'), 'list roles');
  assert.ok(comp.includes('<ui.IconButton icon="close" label={t(lang, "list.removeRow", { n: i + 1 })} disabled={busy || !!drag}'), '× remove');
  assert.ok(comp.includes('<ui.Button variant="ghost" icon="plus" disabled={busy} onClick={onAdd}>{t(lang, "list.addRow")}</ui.Button>'), '+ Add row');
  assert.ok(comp.includes('<div aria-live="polite" style={VISUALLY_HIDDEN}>{said}</div>') && comp.includes('t(lang, "list.moved", { label: labelOf(r, idx), pos: pos + 1, total: n })'), 'announcements');
  assert.ok(comp.slice(comp.indexOf('role="list"'), comp.indexOf('aria-live')).split('role="listitem"').length === 2, 'only rows (and the drop line) inside the list');
  // The fields keep text selection: they stop key propagation and nothing else.
  for (const m of comp.matchAll(/<input [^]*?\/>/g)) assert.ok(m[0].includes('onKeyDown={(e) => e.stopPropagation()}') && !/onPointer|onMouse/.test(m[0]), 'plain field');
  // The reorder maths, loaded from the panel.
  const s0 = panel.indexOf('// tec-reorder:start'), s1 = panel.indexOf('// tec-reorder:end');
  assert.ok(s0 > 0 && s1 > s0, 'reorder maths markers');
  const box = {};
  vm.runInNewContext(panel.slice(s0, s1).replace(/(\w)\??: (?:any|number)\b/g, '$1') + '\nthis.api = { arrayMove, reorderTarget, reorderStep, reorderShift, reorderSlotTop, reorderLineY };', box);
  const R = box.api, L5 = ['a', 'b', 'c', 'd', 'e'];
  const am = (...a) => Array.from(R.arrayMove(...a));
  assert.deepEqual(am(L5, 0, 4), ['b', 'c', 'd', 'e', 'a'], 'first to last');
  assert.deepEqual(am(L5, 4, 0), ['e', 'a', 'b', 'c', 'd'], 'last to first');
  assert.deepEqual(am(L5, 2, 2), L5, 'no-op');
  assert.deepEqual(am(L5, 1, 3), ['a', 'c', 'd', 'b', 'e']);
  assert.deepEqual(am(L5, 3, 1), ['a', 'd', 'b', 'c', 'e']);
  assert.deepEqual(am(L5, 0, 9), L5, 'out of range: unchanged');
  assert.notEqual(R.arrayMove(L5, 0, 1), L5, 'a copy');
  assert.deepEqual(L5, ['a', 'b', 'c', 'd', 'e'], 'the input is untouched');
  // Five 40 px rows: mid-points 20, 60, 100, 140, 180.
  const tops = [0, 40, 80, 120, 160], hs = [40, 40, 40, 40, 40], mids = tops.map((t, k) => t + hs[k] / 2);
  assert.equal(R.reorderTarget(mids, 0, 20), 0, 'no movement: no-op');
  assert.equal(R.reorderTarget(mids, 0, 59), 0, 'not past the next mid-point');
  assert.equal(R.reorderTarget(mids, 0, 61), 1);
  assert.equal(R.reorderTarget(mids, 0, 180 + 1), 4, 'first to last');
  assert.equal(R.reorderTarget(mids, 0, 9999), 4, 'clamped');
  assert.equal(R.reorderTarget(mids, 4, 19), 0, 'last to first');
  assert.equal(R.reorderTarget(mids, 4, -9999), 0, 'clamped');
  assert.equal(R.reorderTarget(mids, 2, 100), 2, 'dropped in place');
  assert.equal(R.reorderTarget(mids, 2, 61), 2, 'still nearer its own slot');
  assert.equal(R.reorderTarget(mids, 2, 59), 1);
  // Cancel: the drag state is dropped without a move, so the list is the one the drag began with (the component's
  // finish(false) never calls onEdit); the committed path is arrayMove(from, to) of the measured target.
  assert.ok(comp.includes('if (commit && d.started && d.to !== d.from) move(d.from, d.to);') && /onPointerCancel: \(\) => \{[^}]*finish\(false\)/.test(comp), 'cancel restores');
  assert.deepEqual(am(L5, 2, R.reorderTarget(mids, 2, 100)), L5, 'a drop in place changes nothing');
  assert.deepEqual([R.reorderStep(0, -1, 5), R.reorderStep(0, 1, 5), R.reorderStep(4, 1, 5), R.reorderStep(3, -1, 5)], [0, 1, 4, 2], 'keyboard steps stay in the list');
  assert.deepEqual([0, 1, 2, 3, 4].map(k => R.reorderShift(k, 0, 3, 40)), [0, -40, -40, -40, 0], 'rows slide up under a row moving down');
  assert.deepEqual([0, 1, 2, 3, 4].map(k => R.reorderShift(k, 4, 1, 40)), [0, 40, 40, 40, 0], 'rows slide down under a row moving up');
  assert.deepEqual([R.reorderSlotTop(tops, hs, 0, 3), R.reorderSlotTop(tops, hs, 4, 1), R.reorderSlotTop(tops, hs, 2, 2)], [120, 40, 80]);
  assert.deepEqual([R.reorderLineY(tops, hs, 0, 3), R.reorderLineY(tops, hs, 4, 1), R.reorderLineY(tops, hs, 2, 2)], [160, 40, null], 'drop line below / above the target, none in place');
  // The build reads the edited order: CreditRows edits the list through editRows (customRows), rows is that list, and
  // the Build inputs are tecCleanRows(rows), which keeps the order.
  assert.ok(panel.includes('const editRows = (fn: (list: EditRow[]) => EditRow[]) => { if (!busyRef.current) setCustomRows(fn((customRows ?? presetRows).slice())); };'), 'editRows marks the list customised');
  assert.ok(panel.includes('const rows: EditRow[] = customRows ?? presetRows;') && panel.includes('const inputs = { layout, title, rows: tecCleanRows(rows),'), 'the build reads rows');
  const pctx = { Math, Array, Object, JSON, Number, String, isFinite, Error };
  vm.createContext(pctx);
  vm.runInContext(planner + '\nthis.api = { tecPresetRows, tecCleanRows };', pctx);
  const crew = pctx.api.tecPresetRows('filmCrew').map((r, i) => ({ id: 'p' + i, role: r.role, name: r.name }));
  let custom = null;
  const editRows = fn => { custom = fn((custom ?? crew).slice()); };
  editRows(l => R.arrayMove(l, 0, crew.length - 1));
  editRows(l => R.arrayMove(l, crew.length - 1, 0));
  editRows(l => R.arrayMove(l, 1, 3));
  const built = Array.from(pctx.api.tecCleanRows(custom ?? crew)).map(r => r.role);
  const expect = R.arrayMove(crew.map(r => r.role), 1, 3);
  assert.deepEqual(built, Array.from(expect), 'the build reads the edited order');
  assert.notDeepEqual(built, crew.map(r => r.role));
}

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
  look: { on: true, strength: 0.5 }, clipSound: 'ambient', photos, sources, fades: { inSec: 0.5, outSec: 1.13 }, musicFadeOut: 1.5 };
const graphic = { tsx: read('assets/credits-graphic.tsx'), parameters: { layout: 'classic', fps: 29.97, revealFrame: frames[1], endFrame: frames[11], title: 'THE END', titleColor: '#FBE4BB', creditColor: '#F0EBDD',
  rows, ...scalars, rowCount: rows.length, speedPxPerSec: 66.6, speed: 1, showTitle: true, fonts }, editableParameters: [{ key: 'title', label: 'Title', type: 'text', defaultValue: 'THE END' }, ...editable] };
const payload = fill(read('scripts/decorate.js'), { ...record, graphic, frame: { tsx: read('assets/shot-frame.tsx') }, look: { tsx: read('assets/cinematic-look.tsx'), strength: 0.5, on: true },
  photoMotion: { byRid: {}, byShot: Array.from({ length: 11 }, () => ({ motion: 'push-in', direction: 1, axis: 'y', frameStrength: 0.5 })) } });
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
    // On the swell's own downbeat (the manifest's ms rounding can put the swell a fraction of a ms after it), unless clamped.
    if (key === 'standard') assert.ok(Math.abs(sec.start + 5.1 - swell) <= 1e-3 || sec.j === sec.jMax || sec.j === sec.jMin, cue.id + ': the reveal is on the swell');
  }
}
// Progress counts only videos (photos are not searched or measured), so the wording says videos, not clips.
for (const [key, text] of [['videosChecked', '{done}/{count} videos checked'], ['videosMeasured', '{done}/{count} videos measured'], ['unchecked', 'Could not check {count} videos; they were skipped']]) says(key, text);
assert.ok(!/clips checked|clips measured/.test(JSON.stringify(en)), 'progress wording says videos');
console.log(JSON.stringify({ panel: 'ok', decoratePayload: payload.length }));
