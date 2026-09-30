// plugins/city-weekend-vlog/tests/panel.test.cjs
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const panel = fs.readFileSync(path.join(root, 'panel.tsx'), 'utf8');
const planner = fs.readFileSync(path.join(root, 'planner.js'), 'utf8');
assert.ok(panel.includes(planner.trim()), 'panel.tsx must embed planner.js verbatim');
assert.match(panel.split('\n').slice(0, 24).join('\n'), /\/\/ @name City Weekend Vlog/);
assert.match(panel, /\/\/ @icon \w+/);
assert.ok(!/^import .* from "(?!react")/m.test(panel), 'only react may be imported');
for (const name of ['inventory.js', 'search.js', 'ensure-audio.js', 'assemble.js', 'decorate.js', 'title-graphic.tsx', 'warm-look.tsx', 'photo-motion.tsx', 'manifest.json', 'presets.json', 'beat-detect.cjs']) assert.ok(panel.includes(name), 'panel reads ' + name);
for (const phrase of ['Create another version', 'label="Clip sound"', 'Silent video', 'cuts use the original rhythm', 'selects.editor.openDraft', 'Finish title and look', 'cwvProgress(', 'steps={CWV_BUILD_STEPS', 'Stopped at step', 'Install ffmpeg and Node.js', 'linkToDraftFrame', 'FontFace', 'Draft created; adding title and look', 'projectRef', 'ffprobe', 'aria-pressed', 'loadInventory(', 'still being analysed', 'this updates automatically', '>Refresh<', 'visibilitychange', 'addEventListener("focus"', '10000', 'setCandidates(null)', 'invSigRef']) assert.ok(panel.includes(phrase), phrase);
// Hangul audit across the plugin, as place-count does.
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
for (const f of walk(root).filter(f => /\.(tsx|js|cjs|json|md|sh)$/.test(f))) assert.ok(!/[\uac00-\ud7a3]/.test(fs.readFileSync(f, 'utf8')), 'Korean text in ' + f);
// User paths go to the shell single-quoted; dq() is only for the $HOME / $SELECTS_USER_SKILLS_ROOT constants.
assert.ok(!/dq\((file|ownMusic|roots)/.test(panel), 'user paths must not be double-quoted into the shell');
// Commit calls are never resent silently.
assert.match(panel, /No valid session ID/);
assert.ok(!/reopen this panel/.test(panel), 'reopening the panel does not re-read the inventory');
assert.ok(panel.indexOf('addEventListener("visibilitychange"') < panel.indexOf('if (!projectId) return <ui'), 'hooks stay before the early return');
assert.ok(!/Streamable HTTP error/.test(panel), 'only the session-id failure is resent');
// Music section slider: a canvas waveform with a draggable, keyboard-operable window, drawn in theme colours.
for (const phrase of ['role="slider"', 'aria-valuenow', 'aria-valuetext', '--panel-accent', '--panel-muted-fg', 'ResizeObserver', 'devicePixelRatio', 'setPointerCapture', '"grabbing"', '"ArrowLeft"', '"Home"', '"End"', 'drag to choose', 'fmtTime(total)', 'Starts at ']) assert.ok(panel.includes(phrase), phrase);
assert.ok(!/--text-tertiary/.test(panel), '--text-tertiary is not a panel token');
assert.ok(!/var\(--accent\b/.test(panel), '--accent is not a panel token');
// Title preview keeps one height: fixed slots sized for the largest scale, clipped by the box.
for (const phrase of ['height: previewBox', 'slotStyle(bigSlot)', 'slotStyle(smallSlot)', 'maxScale']) assert.ok(panel.includes(phrase), phrase);
// Section preview: play/stop toggle, cancellable preparation, playhead, auto-stop and a full-length clip read from a file.
for (const phrase of ['Stop preview', 'Cancel preview', 'requestAnimationFrame', 'cancelAnimationFrame', '"Escape"', 'previewTokenRef', 'stopPreview()', 'URL.createObjectURL', 'URL.revokeObjectURL', 'onended', 'preview-*.mp3', 'readText(roots.data', '[cueId, ownMusic?.path, section, length]']) assert.ok(panel.includes(phrase), phrase);
assert.ok(!/-t 6 -i/.test(panel), 'the preview plays the whole section, not 6 s');
assert.ok(!/-f mp3 - \| base64/.test(panel), 'the preview no longer pipes audio through stdout');
assert.ok(/-t " \+ dur\.toFixed\(2\)/.test(panel), 'the preview length is videoSeconds');
assert.ok(panel.indexOf('[cueId, ownMusic?.path, section, length]') < panel.indexOf('if (!projectId) return <ui'), 'preview auto-stop hook stays before the early return');
const buildBody = panel.slice(panel.indexOf('async function build('), panel.indexOf('async function finishTitle('));
assert.ok(buildBody.includes('stopPreview()'), 'Build stops the preview');
assert.ok(panel.slice(panel.indexOf('async function finishTitle('), panel.indexOf('async function decorate(')).includes('stopPreview()'), 'Finish stops the preview');
// Finder-launched apps lack Homebrew/nvm on PATH: every shell step that runs ffmpeg, ffprobe or node extends it.
for (const re of [/command: TOOL_PATH \+ "command -v ffmpeg/, /cmd = TOOL_PATH \+ "ffmpeg -nostdin -v error -y -t 360/, /command: TOOL_PATH \+ "ffprobe /, /cmd = TOOL_PATH \+ "rm -f "/]) assert.ok(re.test(panel), String(re));
assert.equal((panel.match(/runShell\(/g) || []).length, 6, 'one folder lookup, four tool steps and the preview cleanup');
assert.ok(panel.includes('/opt/homebrew/bin:/usr/local/bin') && panel.includes('.nvm/versions/node/*/bin'), 'Homebrew and nvm paths');
// Script configs arrive as JSON.parse(...) so the SDK type check sees `any`, not widened literal types.
assert.ok(panel.includes('"JSON.parse(" + JSON.stringify(JSON.stringify(cfg)) + ")"'), 'fill passes the config through JSON.parse');
assert.ok(/decorateJs, \{ sequenceId, mute,/.test(panel) && panel.includes('result.mute !== false'), 'decorate mutes, also on retry');
// Shortened montage note, "Create another version" flow and the clip checklist.
for (const phrase of ['montage shots, so this video is about', 'Add more clips for the full length', 'plan.montageShots < fitted', 'footage fits ', 'function buildAnother()', 'onClick={buildAnother}', 'Choose clips', 'type="checkbox"', 'textOverflow: "ellipsis"', 'setOnly(null)', 'chooseClips(allRids)', 'chooseClips([])', 'clips selected', 'No clips selected']) assert.ok(panel.includes(phrase), phrase);
const anotherBody = panel.slice(panel.indexOf('function buildAnother()'), panel.indexOf('async function finishTitle('));
assert.ok(anotherBody.indexOf('setResult(null)') >= 0 && anotherBody.indexOf('setResult(null)') < anotherBody.indexOf('build(s)'), 'another version clears the old result before building');
assert.ok(/const s = seed \+ 1;/.test(anotherBody), 'another version changes the seed');
const chooseBody = panel.slice(panel.indexOf('const chooseClips ='), panel.indexOf('const toggleClip ='));
assert.ok(chooseBody.includes('setCandidates(null)') && chooseBody.includes('ordered.length === allRids.length ? null : ordered'), 'a new selection drops the cache; all clips means only = null');
assert.ok(panel.includes('const candKey = projectId + "|" + JSON.stringify(only);') && panel.includes('const key = pid + "|" + JSON.stringify(only);'), 'readiness and build share the pid|only cache key');
assert.ok(panel.indexOf('React.useMemo(') < panel.indexOf('if (!projectId) return <ui'), 'the fitted-count hook stays before the early return');
// Photos: a Use photos toggle, photos in the clip list and the readiness line, photo-only builds, photo effects gated.
for (const phrase of ['label="Use photos"', 'photos selected', '" photos"', '"Photo"', 'photoCandsOf(inventory, onlyPhotos, usePhotos)', 'of them photos', 'known: photoSizesRef.current',
  'cwvPhotoMotions(plan.picks, String(usedSeed), sizes, sched.titleSlots)', 'photoEffects: PHOTO_EFFECTS', 'const PHOTO_EFFECTS = true;', 'usedPhotoCount >= minShots', 'disabled={busy || !canBuild}', 'choosePhotos(allPhotoRids)']) assert.ok(panel.includes(phrase), phrase);
assert.ok(/const \[usePhotos, setUsePhotos\] = React\.useState\(true\)/.test(panel), 'Use photos is on by default');
for (const m of ['push-in', 'pull-out', 'drift-left', 'drift-right', 'drift-up', 'drift-down', 'tilt', 'push-drift']) assert.ok(panel.includes('value: "' + m + '"'), 'motion option ' + m);
const chooseP = panel.slice(panel.indexOf('const choosePhotos ='), panel.indexOf('const togglePhoto ='));
assert.ok(!chooseP.includes('setCandidates(null)'), 'choosing photos keeps the scene search');
assert.ok(panel.indexOf('const [usePhotos') < panel.indexOf('if (!projectId) return <ui'), 'photo hooks stay before the early return');
assert.ok(/needsPoll = [^\n]*inventory\.photos/.test(panel), 'a photos-only Project does not poll');
// Talking avoidance is gone: six scene-search queries per clip, no talking query and no relax note.
assert.ok(!/talking/i.test(panel), 'no talking query or note');
assert.equal((panel.slice(panel.indexOf('const CWV_QUERIES'), panel.indexOf('};', panel.indexOf('const CWV_QUERIES'))).match(/^  \w+: "/gm) || []).length, 6, 'six queries');
// Clip sound: a three-way Off / Ambient / Full control, Ambient by default; Off mutes in decorate, Ambient lowers in assemble.
assert.ok(!panel.includes('Keep original clip sound'), 'the old toggle is gone');
assert.ok(/React\.useState<"off" \| "ambient" \| "full">\("ambient"\)/.test(panel), 'Ambient is the default');
for (const v of ['"off"', '"ambient"', '"full"']) assert.ok(panel.includes('value: ' + v), 'clip sound option ' + v);
assert.ok(panel.includes('const AMBIENT_DB = -18;') && panel.includes('clipSound, ambientDb: AMBIENT_DB'), 'assemble gets the mode and level');
assert.ok(panel.includes('const silent = cueId === "none" && !ownMusic && clipSound === "off";'), 'Silent video only for No music + Off');
assert.ok(panel.includes('mute: clipSound === "off"') && panel.includes('clipSound === "off", look, check)'), 'Off mutes');
assert.ok(panel.indexOf('const [clipSound') < panel.indexOf('if (!projectId) return <ui'), 'clip sound hook stays before the early return');
// Title burst per cue: the grid's 16th-onset ratio picks 'sixteenth' or 'eighth'; plans, schedules and the shot minimum follow it.
assert.ok(panel.includes('const burst = grid.accepted ? cwvBurstFor(grid.sixteenthRatio) : "eighth";'), 'burst from the cue');
assert.ok(panel.includes('sixteenthRatio: cue.sixteenthRatio') && panel.includes('sixteenthRatio: own.sixteenthRatio'), 'bundled and own music ratios');
const ui = panel.slice(panel.indexOf('// cwv-planner:end'));
assert.equal((ui.match(/cwvPlanBuild\(/g) || []).length, 3);
assert.equal((ui.match(/cwvPlanBuild\([^;]*burst, sectionStart: musicStart, \.\.\.snapCuts \}\)/g) || []).length, 3, 'every plan uses the burst, the music start and onset snapping');
// Cuts shift with the music's frame-snapped start: the build plan and both Draft-rate schedules get the section start.
assert.ok(panel.includes('const musicStart = cueId === "none" ? null : (start ?? 0);'));
assert.equal((ui.match(/sectionStart: musicStart/g) || []).length, 5, 'build plan, readiness plans and schedules use the music start');
// Onset-anchored cuts: every plan snaps with the music's onsets (bundled cue, own music, also without a reliable beat);
// assemble.js gets the planned cut seconds and the Draft-rate schedule reuses them, so font switches stay on their cuts.
assert.ok(panel.includes('const snapCuts = { onsets: grid.onsets, onsetThresholds: grid.onsetThresholds, lowConfidence: !grid.accepted };'), 'snap options');
assert.ok(panel.includes('onsets: cue.onsets || NO_ONSETS, onsetThresholds: cue.onsetThresholds') && panel.includes('const grid = ownMusic ? cwvOwnGrid(ownGrid, ownDuration, NO_ONSETS)'), 'bundled and own-music onsets');
assert.ok(panel.includes('const boundaries: number[] = plan.schedule.cuts;') && panel.includes('picks: plan.picks, boundaries, crops,'), 'assemble gets the snapped cuts');
assert.ok(/cwvSchedule\(\{ bpm: grid\.bpm, fps: a\.fps, montageShots: plan\.montageShots, burst, sectionStart: musicStart, cuts: boundaries \}\)/.test(panel), 'the Draft-rate schedule reuses the cut seconds');
assert.ok(panel.includes('grid.onsets, grid.accepted]);'), 'the readiness plan follows the onsets');
// Own music: beat-detect.cjs writes its result to a file (the shell output is capped at 48 KB) and prints {"ok":true}.
assert.ok(panel.includes('" 22050 " + sq(roots.data + "/own-music.json")') && panel.includes('JSON.parse(await readText(roots.data, "own-music.json"))') && panel.includes('!done.ok'), 'own-music analysis via a file');
// Finish title and look retries with the inputs of the build, and clips whose scene search failed are reported.
assert.ok(panel.includes('result.mute !== false, result.look, check)') && panel.includes('const { line1, connector, place, preset, warm, clipSound } = look;'), 'retry uses the build-time look');
assert.ok(panel.includes('unchecked: found.failed.length') && panel.includes('Build again to retry '), 'unchecked clips are reported');
// The own-music PCM is removed after beat detection, keeping the exit status; the preview mp3 once encoded.
assert.ok(panel.includes('"; s=$?; rm -f " + sq(pcm) + "; exit $s"') && panel.includes('" && rm -f " + sq(base + ".mp3")'), 'temporary audio files are removed');
assert.equal((ui.match(/cwvSchedule\(/g) || []).length, 2);
assert.equal((ui.match(/cwvSchedule\(\{[^}]*burst/g) || []).length, 2, 'every schedule uses the burst');
assert.ok(panel.includes('const minShots = cwvMinWindows(burst);') && !ui.includes('CWV_MIN_WINDOWS'), 'the shot minimum follows the burst');
assert.ok(!panel.includes('beatsAt'), 'boundaries come from the schedule cuts, not beat positions');
assert.ok(!/i < 13/.test(panel), 'no fixed title slot count');
// Same-source neighbours only when nothing else fits, and then the result says so.
assert.ok(panel.includes('result?.plan?.adjacentRepeats') && panel.includes('from the same clip because there'), 'adjacent repeat note');
// Photo effects are on; captureFrames breaks on image clips with effects, so the panel never uses it.
assert.ok(!/\.(captureFrames|captureVisualFrames)\(/.test(panel) && !/\.(captureFrames|captureVisualFrames)\(/.test(fs.readFileSync(path.join(root, "scripts", "decorate.js"), "utf8")), 'no frame capture in the panel');
// Own music's grid (cwvOwnGrid) from beat-detect.cjs's grid state. accepted: its tempo, first beat and bars. 'approximate'
// (tempo and first beat tight, beat faint): the detected tempo and first beat with bar-snapped sections, but the 8th
// burst, low-confidence snapping and the "Approximate timing on the detected tempo" line. 'none', an approximate tempo
// out of the 70-180 BPM range, or only the length: fixed 99.2 BPM timing from 0 in 0.1 s steps, as before.
{
  const vm = require('node:vm');
  const between = (s, a, b) => s.slice(s.indexOf(a), s.indexOf(b) + b.length);
  const box = { Math, Number, Object, Array, String, Set, Map, Infinity, NaN, Error, JSON, isFinite }; vm.createContext(box);
  vm.runInContext(planner + '\n' + between(panel, '// cwv-own-grid:start', '// cwv-own-grid:end') + '\n;globalThis.X = { cwvOwnGrid, cwvFaintText, cwvSnapSection, cwvDefaultSection, CWV_REFERENCE_BPM };', box);
  const X = box.X, NO = [];
  const near = (a, b) => Math.abs(a - b) < 1e-9;
  const base = { bpm: 100, firstBeat: 0.37, durationSeconds: 90, beatEnergy: [1, 5, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], peaks: [0.1], sixteenthRatio: 0.6, onsets: [[1, 'l', 3]], onsetThresholds: { l: 2 } };
  const acc = X.cwvOwnGrid({ ...base, accepted: true, grid: 'accepted' }, 90, NO);
  assert.deepEqual([acc.bpm, acc.firstBeat, acc.usableEnd, acc.accepted, acc.faint, acc.sixteenthRatio], [100, 0.37, 89.5, true, false, 0.6]);
  // An analysis from before the grid field (accepted only) is still accepted.
  assert.equal(X.cwvOwnGrid({ ...base, accepted: true }, 90, NO).accepted, true);
  const faint = X.cwvOwnGrid({ ...base, accepted: false, grid: 'approximate' }, 90, NO);
  assert.deepEqual([faint.bpm, faint.firstBeat, faint.usableEnd, faint.accepted, faint.faint], [100, 0.37, 89.5, false, true]);
  assert.ok(faint.onsets.length === 1 && faint.onsetThresholds.l === 2 && faint.peaks.length === 1, 'approximate keeps onsets and peaks');
  // Bars of 2.4 s from 0.37 s: 10 s snaps to 0.37 + 4 bars = 9.97 s, as for an accepted grid.
  const videoSeconds = 20;
  assert.ok(near(X.cwvSnapSection({ value: 10, firstBeat: faint.firstBeat, bpm: faint.bpm, usableEnd: faint.usableEnd, videoSeconds, gridAccepted: faint.accepted || faint.faint }), 9.97));
  const d = X.cwvDefaultSection({ firstBeat: faint.firstBeat, bpm: faint.bpm, beatEnergy: faint.beatEnergy, usableEnd: faint.usableEnd, videoSeconds });
  assert.ok(d != null && near((d - 0.37) / 2.4, Math.round((d - 0.37) / 2.4)), 'default section on a bar of the detected grid: ' + d);
  assert.equal(X.cwvFaintText(faint.bpm), 'Approximate timing on the detected tempo (100 BPM): the tempo was found but the beat is faint, so the cuts may miss it.');
  assert.equal(X.cwvFaintText(119.6), 'Approximate timing on the detected tempo (120 BPM): the tempo was found but the beat is faint, so the cuts may miss it.');
  const fixed = g => [g.bpm, g.firstBeat, g.accepted, g.faint, g.sixteenthRatio];
  const FIXED = [X.CWV_REFERENCE_BPM, 0, false, false, null];
  for (const own of [{ ...base, accepted: false, grid: 'none' }, { ...base, accepted: false }, { ...base, accepted: false, grid: 'approximate', bpm: 60 },
    { ...base, accepted: false, grid: 'approximate', bpm: 190 }, { accepted: false, durationSeconds: 60, peaks: [] }]) {
    const g = X.cwvOwnGrid(own, 60, NO);
    assert.deepEqual(fixed(g), FIXED, JSON.stringify(own).slice(0, 80));
    assert.equal(g.usableEnd, 59.5);
  }
  assert.ok(near(X.cwvSnapSection({ value: 12.34, firstBeat: 0, bpm: X.CWV_REFERENCE_BPM, usableEnd: 59.5, videoSeconds, gridAccepted: false }), 12.3), '0.1 s steps without a grid');
  const none = X.cwvOwnGrid({ ...base, accepted: false, grid: 'none' }, 90, NO);
  assert.ok(none.onsets.length === 1 && none.peaks.length === 1, "'none' keeps onsets and peaks for bass snapping");
  const nothing = X.cwvOwnGrid(null, null, NO);
  assert.deepEqual([...fixed(nothing), nothing.usableEnd, nothing.onsets, nothing.peaks.length], [...FIXED, 0, NO, 0]);
  // Wiring: the section snaps to an approximate grid's bars; burst and low-confidence snapping follow `accepted`; the
  // detection status and a note under the file say "Approximate timing on the detected tempo"; 'none' keeps its text.
  for (const phrase of ['const onBars = grid.accepted || !!grid.faint;', 'gridAccepted: onBars });', 'const start = onBars ? snap(section || 0) : (section || 0);', 'if (!onBars) { setSection(snap(0)); return; }',
    'og.faint ? { tone: "info", text: cwvFaintText(og.bpm) }', '{ownMusic && grid.faint ? <ui.Message tone="muted">{cwvFaintText(grid.bpm)}</ui.Message> : null}']) assert.ok(panel.includes(phrase), phrase);
  assert.ok(!/ownGrid\.accepted \?/.test(panel), 'own music is read through cwvOwnGrid');
}
console.log(JSON.stringify({ panel: 'ok' }));
