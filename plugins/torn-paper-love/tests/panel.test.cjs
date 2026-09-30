// plugins/torn-paper-love/tests/panel.test.cjs
// The panel: embedded copies equal their sources, publishing rules, UI contracts, and the build orchestration
// (frozen inputs, single flight, stale-Project guard, no resent commits) run in node:vm with a mocked host.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const panel = read('panel.tsx');

// ---- Embedded blocks equal their source files byte for byte.
const between = (src, name, inclusive) => {
  // Markers are whole lines (a source's header comment may mention them inline).
  const open = '\n// ' + name + ':start\n', close = '\n// ' + name + ':end\n';
  const a = src.indexOf(open), b = src.indexOf(close);
  assert.ok(a >= 0 && b > a, name + ' markers');
  assert.equal(src.indexOf(open, a + 1), -1, name + ' start marker appears once');
  return inclusive ? src.slice(a + 1, b + close.length - 1) : src.slice(a + open.length, b + 1);
};
const planner = read('planner.js'), config = read('build-config.js'), letters = read('assets/ransom-letters.tsx');
assert.equal(between(panel, 'tpl-planner', false).trim(), planner.trim(), 'panel.tsx embeds planner.js verbatim');
assert.equal(between(panel, 'tpl-config', true), between(config, 'tpl-config', true), 'panel.tsx embeds the build-config block verbatim');
assert.equal(between(panel, 'tpl-letters', true), between(letters, 'tpl-letters', true), 'panel.tsx embeds the letters helpers verbatim');
assert.ok(!panel.includes('// tpl-torn:start'), 'the torn helpers are not embedded (the effect ships as a file)');

// ---- Publishing rules.
assert.ok(!/[\uAC00-\uD7A3\u3131-\u318E]/.test(panel), 'no literal Hangul in panel.tsx');
assert.ok(!panel.includes('/Users/'), 'no local paths in panel.tsx');
const header = panel.split('\n').slice(0, 16).join('\n');
assert.match(header, /^\/\/ @name Torn Paper Love$/m);
for (const lang of ['de', 'en', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'tr', 'zh']) assert.match(header, new RegExp('^// @name:' + lang + ' [\\x20-\\x7E]+$', 'm'), '@name:' + lang + ' (Latin)');
assert.match(header, /^\/\/ @name:ko Torn Paper Love$/m);
assert.match(header, /^\/\/ @icon \w+$/m);
assert.ok(!/^import .* from "(?!react")/m.test(panel), 'only react may be imported');
assert.ok(!/--text-tertiary/.test(panel), '--text-tertiary is not a panel token');
assert.ok(!/--accent\b/.test(panel), '--accent is not a panel token');
assert.ok(!/var\(--(?!panel-)/.test(panel), 'only --panel-* tokens');
// plugin.json ships the panel (installed to the panels root; everything else to the skills root).
assert.ok(JSON.parse(read('plugin.json')).files.includes('panel.tsx'), 'plugin.json lists panel.tsx');

// ---- Installed roots: every script and asset the panel reads, from the skills folder.
assert.ok(panel.includes('const PLUGIN_ID = "torn-paper-love";'));
assert.ok(panel.includes('"$SELECTS_USER_SKILLS_ROOT/" + PLUGIN_ID') && panel.includes('"$HOME/.selects/plugin-data/" + PLUGIN_ID'), 'skills and data roots');
for (const rel of ['scripts/inventory.js', 'scripts/search.js', 'scripts/ensure-audio.js', 'scripts/assemble.js', 'scripts/decorate.js', 'assets/torn-photo.tsx',
  'assets/ransom-letters.tsx', 'assets/fonts/looks.json', 'assets/cues/manifest.json']) {
  assert.ok(panel.includes('read("' + rel + '")'), 'panel reads ' + rel);
  assert.ok(fs.existsSync(path.join(root, rel)), rel + ' exists');
}
assert.ok(panel.includes('"assets/fonts/tpl-" + face + ".woff2.b64"'), 'fonts from the installed folder');
assert.ok(panel.includes('roots.plugin + "/beat-detect.cjs"') && panel.includes('roots.plugin + "/assets/cues/" + '), 'beat detection and cues from the installed folder');

// ---- Host helpers copied from City Weekend Vlog.
assert.ok(panel.includes('/opt/homebrew/bin:/usr/local/bin') && panel.includes('.nvm/versions/node/*/bin'), 'Finder PATH prefix');
for (const re of [/command: TOOL_PATH \+ "command -v ffmpeg/, /cmd = TOOL_PATH \+ "ffmpeg -nostdin -v error -y -t 360/, /command: TOOL_PATH \+ "ffprobe /, /cmd = TOOL_PATH \+ "rm -f "/]) assert.ok(re.test(panel), String(re));
assert.ok(!/dq\((file|ownMusic|roots|musicPath)/.test(panel), 'user paths are single-quoted');
assert.ok(panel.includes('" 22050 " + sq(roots.data + "/own-music.json")') && panel.includes('JSON.parse(await readText(roots.data, "own-music.json"))'), 'own-music analysis via a file (48 KB stdout)');
// Own music with a faint beat (beat-detect grid 'approximate'): the cue carries approxBpm (through tplApproxTempo, so a
// tempo without a unit falls back to the fixed 0.35 s) and the detected first beat; the section slider snaps to the
// bars of that tempo like the plan (tplSectionTempo); the status says the cuts follow its tempo.
assert.ok(panel.includes('tplApproxTempo({ accepted, approxBpm: ownGrid.grid === "approximate" && ownGrid.bpm > 0 ? ownGrid.bpm : null })'), 'ownCue approxBpm');
assert.ok(panel.includes('firstBeat: accepted || approxBpm ? ownGrid.firstBeat || 0 : 0'), 'ownCue first beat for an approximate tempo');
assert.ok(panel.includes('const sectionTempo = tplSectionTempo(grid);') && panel.includes('gridAccepted: sectionTempo != null })') && panel.includes('barSeconds={sectionTempo != null ? (tplBarBeats(sectionTempo) * 60) / sectionTempo : 1}'), 'section snaps to the cut tempo');
assert.ok(panel.includes('"Music added; its beat is faint, so cuts follow its tempo (" + Math.round(approx) + " BPM) without locking to every beat."'), 'faint-beat status');
assert.ok(!/grid\.accepted \? \(tplBarBeats/.test(panel) && !/gridAccepted: grid\.accepted \}\);\n/.test(panel.slice(panel.indexOf('// tpl-config:end'))), 'no accepted-only section snap left in the panel');
assert.ok(panel.includes('preview-*.mp3') && panel.includes('readText(roots.data, "preview-"'), 'preview audio via a file');
assert.match(panel, /No valid session ID/);
assert.ok(/!allowCommit && \/No valid session ID\//.test(panel), 'only non-committing calls are resent');
// Inventory refresh: poll while analysing, focus/visibility, Refresh button; hooks before the early return.
for (const phrase of ['10000', 'visibilitychange', 'addEventListener("focus"', '>Refresh<', 'still analysing']) assert.ok(panel.includes(phrase), phrase);
const early = panel.indexOf('if (!projectId) return <ui');
assert.ok(early > 0);
for (const hook of ['addEventListener("visibilitychange"', 'React.useMemo(', '[track, ownMusic?.path, sectionShown, length, pace]', 'setInterval(() => setTick']) assert.ok(panel.indexOf(hook) > 0 && panel.indexOf(hook) < early, hook + ' before the early return');
// Waveform slider and preview.
for (const phrase of ['role="slider"', 'aria-valuenow', 'ResizeObserver', 'devicePixelRatio', 'setPointerCapture', '"ArrowLeft"', '"Home"', '"End"', 'drag to choose',
  '--panel-accent', '--panel-muted-fg', 'icon={playState === "playing" ? "pause"', '"Stop preview"', 'requestAnimationFrame', 'URL.revokeObjectURL', 'previewTokenRef']) assert.ok(panel.includes(phrase), phrase);
assert.ok(panel.includes('tplSnapSection('), 'the slider snaps to bars');
// UI sections and copy (spec 8, 15.7).
for (const phrase of ['title="Words"', 'label="Word 1"', 'label="Word 2"', 'title="Style"', 'title="Music"', 'title="Length"', 'title="Advanced"', 'label="Pace"',
  'label="Use videos"', 'label="Clip sound"', 'label="Faded film"', 'label="Tilt"', 'Choose clips', 'Your own music', 'No music', 'Creates a new 4:3 Draft',
  'Create another version', 'Finish letters and look', 'New tears and letters', 'different photos when you have more than ', 'Ready: ', ' shots · about ',
  'couldn', 'aria-pressed', 'steps={TPL_BUILD_STEPS', 'Stopped at step', 'selects.editor.openDraft', 'FontFace', 'tplLayout(', 'tplAssignLooks(', 'tplLooksAt(',
  'PREVIEW_H', 'Silent video']) assert.ok(panel.includes(phrase), phrase);
assert.ok(/setInterval\(\(\) => setTick\(\(n\) => n \+ 1\), 350\)/.test(panel), 'letters re-style every 350 ms in the preview');
{
  // The 350 ms clock lives in LettersPreview, so only the preview re-renders on each tick.
  const lp = panel.slice(panel.indexOf('function LettersPreview('), panel.indexOf('export default function Panel('));
  assert.ok(lp.includes('setInterval(() => setTick'), 'the preview tick is local to LettersPreview');
  assert.ok(!panel.slice(panel.indexOf('export default function Panel(')).includes('setTick'), 'the panel has no tick state');
}
assert.ok(!panel.includes('(dev)') && !panel.includes('DEV_CUES'), 'the bundled cues are not marked as development cues');
// Frozen defaults (spec 15.7).
for (const re of [/React\.useState\("MY"\)/, /React\.useState\("LOVE"\)/, /React\.useState<string>\("night"\)/, /React\.useState<"short" \| "standard" \| "long">\("standard"\)/,
  /React\.useState<"quick" \| "relaxed">\("quick"\)/, /React\.useState<"off" \| "ambient" \| "full">\("ambient"\)/, /\[useVideos, setUseVideos\] = React\.useState\(true\)/,
  /\[faded, setFaded\] = React\.useState\(true\)/, /\[tilt, setTilt\] = React\.useState\(false\)/, /setCueId\(\(c\) => c \?\? m\.defaultCue/]) assert.ok(re.test(panel), String(re));
// Every backdrop is offered, Photo included.
for (const b of ['night', 'red', 'kraft', 'photo']) assert.ok(new RegExp('\\b' + b + ': ').test(between(panel, 'tpl-config', true)), 'backdrop ' + b);
assert.ok(panel.includes('Object.keys(TPL_BACKDROPS)'), 'the tiles come from TPL_BACKDROPS');
// The panel builds only through the shared config (identical to the headless driver).
const ui = panel.slice(panel.indexOf('// tpl-panel-logic:end'));
assert.ok(!/tplAssembleConfig\(|tplDecorateConfig\(/.test(ui), 'the UI never builds script configs itself');
assert.ok(!/\.(captureFrames|captureVisualFrames)\(/.test(panel), 'no frame capture');

// ---- Build orchestration in node:vm (planner + config + letters + panel logic).
const logic = between(panel, 'tpl-panel-logic', true);
assert.ok(!/:\s*(string|number|boolean|any)\b[^'"]/.test(logic.replace(/\/\/.*$/gm, '')), 'the logic block is plain JS');
const source = planner + '\n' + between(config, 'tpl-config', true) + '\n' + between(letters, 'tpl-letters', true) + '\n' + logic;
const names = [...source.matchAll(/^(?:async\s+)?(?:function\s+(tpl\w+)|const\s+(TPL_\w+)|var\s+(TPL_\w+))/gm)].map(m => m[1] || m[2] || m[3]);
const box = { Math, Number, Object, Array, String, Set, Map, Infinity, Error, JSON, Date, isFinite, isNaN, Intl, Promise };
vm.createContext(box);
vm.runInContext(source + '\n;globalThis.P={' + names.join(',') + '};', box);
const P = box.P;
const j = v => JSON.parse(JSON.stringify(v));
for (const n of ['tplFreezeBuild', 'tplExclusive', 'tplStaleCheck', 'tplFill', 'tplClampWord', 'tplForward', 'tplRunBuild', 'tplFinish', 'TPL_STALE']) assert.ok(P[n], n + ' in the logic block');

// tplClampWord: at most 8 graphemes, leading space dropped.
assert.equal(P.tplClampWord('ABCDEFGHIJ'), 'ABCDEFGH');
assert.equal(P.tplClampWord('  LOVE'), 'LOVE');
assert.equal(P.tplClampWord('MY '), 'MY ', 'a trailing space survives while typing');
assert.equal([...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(P.tplClampWord('\u{1F469}‍❤️‍\u{1F468}ABCDEFGHI'))].length, 8, 'an emoji counts once');

// tplFill: the config arrives as JSON.parse of a string.
assert.equal(P.tplFill('const cfg = __CONFIG__;', { a: 'x"y' }), 'const cfg = JSON.parse("{\\"a\\":\\"x\\\\\\"y\\"}");');
const cfgOf = script => JSON.parse(JSON.parse(script.match(/JSON\.parse\(("(?:[^"\\]|\\.)*")\)/)[1]));

// tplFreezeBuild copies the inputs and freezes the copy.
{
  const inputs = { projectId: 'p', options: { words: ['MY', 'LOVE'], seed: 1 }, inventory: { photos: [{ rid: 'a', width: 1 }] } };
  const f = P.tplFreezeBuild(inputs);
  inputs.options.words[1] = 'HATE'; inputs.options.seed = 9; inputs.inventory.photos.push({ rid: 'b' }); inputs.projectId = 'q';
  assert.deepEqual(j(f), { projectId: 'p', options: { words: ['MY', 'LOVE'], seed: 1 }, inventory: { photos: [{ rid: 'a', width: 1 }] } });
  assert.ok(Object.isFrozen(f) && Object.isFrozen(f.options.words) && Object.isFrozen(f.inventory.photos[0]), 'deeply frozen');
}

// tplForward: progress never goes backwards.
{
  const a = P.tplProgress('place', 0.5), b = P.tplProgress('plan', 1);
  assert.equal(P.tplForward(a, b), a);
  const c = P.tplProgress('decorate', 0);
  assert.equal(P.tplForward(a, c), c);
  assert.equal(P.tplForward(null, b), b);
}

const tick = () => new Promise(r => setImmediate(r));
(async () => {
  // tplExclusive: a second call while the first runs is ignored; a stale run cannot release a newer hold.
  {
    const busyRef = { current: null };
    let calls = 0, release;
    const first = P.tplExclusive(busyRef, () => { calls++; return new Promise(r => { release = r; }); });
    const second = await P.tplExclusive(busyRef, async () => { calls++; });
    assert.deepEqual(j(second), { skipped: true });
    assert.equal(calls, 1, 'the second build is ignored while busy');
    assert.ok(busyRef.current, 'busy while running');
    release('done');
    assert.equal(await first, 'done');
    assert.equal(busyRef.current, null, 'released');
    // Project switch clears the ref; a new run starts; the old run finishing must not release it.
    let releaseOld;
    const old = P.tplExclusive(busyRef, () => new Promise(r => { releaseOld = r; }));
    busyRef.current = null; // the Project switch
    let releaseNew;
    const fresh = P.tplExclusive(busyRef, () => new Promise(r => { releaseNew = r; }));
    const held = busyRef.current;
    releaseOld(); await old;
    assert.equal(busyRef.current, held, 'a stale run keeps its hands off the newer hold');
    releaseNew(); await fresh;
    assert.equal(busyRef.current, null);
  }

  // A mocked host for tplRunBuild.
  const manifest = JSON.parse(read('assets/cues/manifest.json'));
  const cue = manifest.cues.find(c => c.id === manifest.defaultCue);
  const looks = JSON.parse(read('assets/fonts/looks.json'));
  const day = d => new Date(Date.UTC(2026, 0, d, 12)).toISOString();
  const photo = (rid, w, h, d, order) => ({ rid, name: rid + '.jpg', width: w, height: h, recordedAt: d ? day(d) : null, order, kind: 'photo' });
  const video = (rid, dur, w, h, d, order) => ({ rid, name: rid + '.mov', duration: dur, width: w, height: h, recordedAt: d ? day(d) : null, order, kind: 'video' });
  const photos7 = [photo('p1', 3000, 4000, 1, 0), photo('p2', 4000, 3000, 2, 1), photo('p3', 3024, 4032, 3, 2), photo('p4', 1440, 1080, 4, 3),
    photo('p5', 4032, 3024, 5, 4), photo('p6', 1080, 1920, 6, 5), photo('p7', 1920, 1080, null, 6)];
  const videos = [video('v1', 20, 1920, 1080, 9, 8), video('v2', 12, 1080, 1920, 10, 9), video('v3', 6, 1920, 1080, 11, 10)];
  const options = { words: ['MY', 'LOVE'], backdrop: 'night', length: 'standard', pace: 'quick', clipSound: 'ambient', look: 0.6, tilt: false, useVideos: true, only: null, seed: 1, section: 'default' };
  const assets = { tornTsx: '/* torn */', lettersTsx: '/* letters */', looks, fonts: { 'TPL Serif': 'data:font/woff2;base64,AAAA' } };
  const scripts = { inventoryJs: 'INVENTORY __CONFIG__', searchJs: 'SEARCH __CONFIG__', ensureJs: 'ENSURE __CONFIG__', assembleJs: 'ASSEMBLE __CONFIG__', decorateJs: 'DECORATE __CONFIG__' };
  const frozen = over => P.tplFreezeBuild(Object.assign({ projectId: 'proj', inventory: { photos: photos7, resources: videos }, found: null, cue, musicPath: '/installed/assets/cues/' + cue.file,
    options, now: new Date(2026, 8, 30, 9, 5).getTime(), clock: P.TPL_EFFECT_CLOCK }, over || {}));
  const assembledFor = (cfg, fps) => {
    const off = P.tplMusicOffset(cfg.music ? cfg.music.sectionStart : null, fps);
    const frames = cfg.targets.map((t, k) => (k === 0 ? 0 : Math.round((t + off) * fps)));
    return { sequenceId: 'seq-1', fps, frames, totalFrames: frames[frames.length - 1], placed: cfg.slots.length, notes: [] };
  };
  // host({ fail: { kind: error }, draftsBefore, landed, idless }) records every call; `kind` = the script's first word.
  // landed: a failed assemble still saved its Draft (true = 'seq-landed', or an array of new ids); idless: assemble
  // saves and replies without the Draft id (true = 'seq-landed', or an array of new ids).
  const host = (opts = {}) => {
    const calls = [], projectRef = { current: 'proj' }, progress = [];
    let drafts = opts.draftsBefore || [];
    const d = {
      calls, projectRef, progress,
      scripts,
      check: P.tplStaleCheck(projectRef, 'proj'),
      advance: (id, f, detail) => progress.push(P.tplProgress(id, f, detail)),
      readAssets: async () => assets,
      run: async (summary, script, allowCommit) => {
        await tick();
        const kind = /^[A-Z]+\b/.test(script) ? script.match(/^[A-Z]+/)[0] : /readFootage/.test(script) ? 'DRAFTS' : /linkToDraftFrame/.test(script) ? 'OPEN'
          : /meta\(\)/.test(script) ? 'READBACK' : /importFiles|resources\(\)/.test(script) ? 'FINDAUDIO' : 'OTHER';
        calls.push({ kind, summary, allowCommit: !!allowCommit, cfg: /^[A-Z]+ JSON\.parse/.test(script) ? cfgOf(script) : null, script });
        if (opts.onCall) opts.onCall(kind, projectRef);
        if (opts.fail && opts.fail[kind]) {
          const e = opts.fail[kind];
          if (kind === 'ASSEMBLE' && opts.landed) drafts = drafts.concat(Array.isArray(opts.landed) ? opts.landed : ['seq-landed']);
          throw e;
        }
        if (kind === 'SEARCH') { const c = cfgOf(script); return { best: Object.fromEntries(c.rids.map(r => [r, 2.5])), failed: [], stats: {} }; }
        if (kind === 'ENSURE') return { resourceId: 'music-1', imported: true };
        if (kind === 'FINDAUDIO') return { resourceId: opts.audioFound ? 'music-1' : null };
        if (kind === 'DRAFTS') return { ids: drafts.slice() };
        if (kind === 'ASSEMBLE' && opts.idless) {
          drafts = drafts.concat(Array.isArray(opts.idless) ? opts.idless : ['seq-landed']);
          const a = assembledFor(calls[calls.length - 1].cfg, opts.fps || 29.97);
          delete a.sequenceId;
          return a;
        }
        if (kind === 'ASSEMBLE') { const a = assembledFor(calls[calls.length - 1].cfg, opts.fps || 29.97); drafts = drafts.concat([a.sequenceId]); return a; }
        if (kind === 'READBACK') { const a = assembledFor(calls.find(c => c.kind === 'ASSEMBLE').cfg, opts.fps || 29.97); return Object.assign(a, { sequenceId: 'seq-landed' }); }
        if (kind === 'DECORATE') return { effects: 14, committed: true };
        if (kind === 'OPEN') return { link: 'selects://draft', openError: null };
        throw Error('unexpected call ' + kind);
      },
    };
    return d;
  };
  const kinds = h => h.calls.map(c => c.kind);

  // Photos cover N: no search; configs equal the shared build config of the same plan (the headless driver's).
  {
    const f = frozen();
    const h = host();
    let onA = null, onD = 0;
    h.onAssembled = (s, a) => { onA = { s, a }; };
    h.onDecorated = () => { onD++; };
    const out = await P.tplRunBuild(f, h);
    assert.deepEqual(kinds(h), ['ENSURE', 'DRAFTS', 'ASSEMBLE', 'DECORATE', 'OPEN'], 'photos only: no inventory re-read, no search');
    const state = P.tplPlanState({ projectId: 'proj', inv: f.inventory, found: { best: {} }, cue, options, now: f.now });
    assert.deepEqual(h.calls[0].cfg, { projectId: 'proj', path: '/installed/assets/cues/' + cue.file });
    assert.ok(h.calls[0].allowCommit && h.calls[2].allowCommit && h.calls[3].allowCommit, 'commit calls allow commits');
    assert.ok(!h.calls[1].allowCommit && !h.calls[4].allowCommit, 'reads do not');
    assert.deepEqual(h.calls[2].cfg, j(P.tplAssembleConfig(state, { resourceId: 'music-1' })), 'assemble config = tplAssembleConfig');
    const a = assembledFor(h.calls[2].cfg, 29.97);
    assert.deepEqual(h.calls[3].cfg, j(P.tplDecorateConfig(state, a, assets)), 'decorate config = tplDecorateConfig');
    assert.equal(h.calls[2].cfg.draftName, 'Torn Paper Love Night Standard 2026-09-30 09:05:00', 'the Draft name is frozen at click');
    assert.ok(h.calls[1].script.includes(JSON.stringify(h.calls[2].cfg.draftName)), 'the Drafts lookup uses the frozen name');
    assert.equal(out.state.N, 7);
    assert.equal(out.link, 'selects://draft');
    assert.ok(onA && onA.a.sequenceId === 'seq-1' && onD === 1, 'callbacks');
    // Progress: the five steps in order, never backwards.
    const values = h.progress.map(p => p.value);
    for (let i = 1; i < values.length; i++) assert.ok(values[i] >= values[i - 1] - 1e-12, 'progress never goes backwards');
    assert.match(h.progress[h.progress.length - 1].label, /^Step 5\/5 · Adding letters and paper · 100%$/);
    assert.ok(h.progress.some(p => /^Step 2\/5 · Finding moments/.test(p.label)), 'the search step is shown as done');
  }

  // Fewer photos than N: only the picked videos are searched (batches of 4), then the plan uses the hits.
  {
    const f = frozen({ inventory: { photos: photos7.slice(0, 5), resources: videos } });
    const h = host();
    const out = await P.tplRunBuild(f, h);
    assert.deepEqual(kinds(h), ['SEARCH', 'ENSURE', 'DRAFTS', 'ASSEMBLE', 'DECORATE', 'OPEN']);
    const searched = h.calls[0].cfg.rids;
    assert.deepEqual(j(searched).sort(), j(out.state.picks.filter(p => p.kind === 'video').map(p => p.rid)).sort(), 'only the picked videos are searched');
    assert.equal(searched.length, 2);
    for (const p of out.state.picks.filter(p => p.kind === 'video')) assert.equal(p.startSeconds, Math.floor(2.5 * 30 + 1e-6) / 30, 'the plan uses the search hit');
    // A cached search is reused: no search call the second time.
    const h2 = host();
    await P.tplRunBuild(frozen({ inventory: { photos: photos7.slice(0, 5), resources: videos }, found: { best: { v1: 2.5, v2: 2.5, v3: 2.5 }, failed: [] } }), h2);
    assert.ok(!kinds(h2).includes('SEARCH'), 'cached search');
    // Use videos off: no search, photos only.
    const h3 = host();
    const out3 = await P.tplRunBuild(frozen({ inventory: { photos: photos7.slice(0, 5), resources: videos }, options: Object.assign({}, options, { useVideos: false }) }), h3);
    assert.ok(!kinds(h3).includes('SEARCH') && out3.state.N === 5);
  }

  // No music: no ensure-audio call, and the assemble config has no music.
  {
    const h = host();
    await P.tplRunBuild(frozen({ cue: null, musicPath: null }), h);
    assert.deepEqual(kinds(h), ['DRAFTS', 'ASSEMBLE', 'DECORATE', 'OPEN']);
    assert.equal(h.calls[1].cfg.music, null);
  }

  // Not buildable: nothing runs.
  {
    const h = host();
    await assert.rejects(P.tplRunBuild(frozen({ inventory: { photos: photos7.slice(0, 2), resources: [] } }), h), /Add at least 3 photos or clips/);
    assert.equal(h.calls.length, 0);
  }

  // A stale Project aborts after the next await and nothing else runs.
  {
    const h = host({ onCall: (kind, ref) => { if (kind === 'ENSURE') ref.current = 'other'; } });
    await assert.rejects(P.tplRunBuild(frozen(), h), e => e === P.TPL_STALE);
    assert.deepEqual(kinds(h), ['ENSURE'], 'no write after the Project changed');
    const h2 = host({ onCall: (kind, ref) => { if (kind === 'SEARCH') ref.current = 'other'; } });
    await assert.rejects(P.tplRunBuild(frozen({ inventory: { photos: photos7.slice(0, 5), resources: videos } }), h2), e => e === P.TPL_STALE);
    assert.deepEqual(kinds(h2), ['SEARCH']);
    // Stale during an ambiguous commit error: no recovery reads either.
    const h3 = host({ fail: { ASSEMBLE: Error('Streamable HTTP error') }, onCall: (kind, ref) => { if (kind === 'ASSEMBLE') ref.current = 'other'; } });
    await assert.rejects(P.tplRunBuild(frozen(), h3), e => e === P.TPL_STALE);
    assert.deepEqual(kinds(h3), ['ENSURE', 'DRAFTS', 'ASSEMBLE']);
  }

  // Ambiguous assemble error, the commit landed: the Drafts are re-read by the frozen name, the new one is read back,
  // and the build continues. The assemble call is never resent.
  {
    const h = host({ fail: { ASSEMBLE: Error('Streamable HTTP error: timeout') }, landed: true, draftsBefore: ['seq-old'] });
    const out = await P.tplRunBuild(frozen(), h);
    assert.deepEqual(kinds(h), ['ENSURE', 'DRAFTS', 'ASSEMBLE', 'DRAFTS', 'READBACK', 'DECORATE', 'OPEN']);
    assert.equal(kinds(h).filter(k => k === 'ASSEMBLE').length, 1, 'assemble is never resent');
    assert.ok(h.calls[4].script.includes('"seq-landed"'), 'reads back the Draft that appeared');
    assert.equal(out.assembled.sequenceId, 'seq-landed');
    assert.equal(h.calls[5].cfg.sequenceId, 'seq-landed');
  }
  // ... the commit did not land: the error surfaces, still without a resend.
  {
    const h = host({ fail: { ASSEMBLE: Error('Streamable HTTP error: timeout') }, draftsBefore: ['seq-old'] });
    await assert.rejects(P.tplRunBuild(frozen(), h), /Streamable HTTP error/);
    assert.deepEqual(kinds(h), ['ENSURE', 'DRAFTS', 'ASSEMBLE', 'DRAFTS']);
  }
  // ... the recovery itself fails more specifically (two new Drafts with the name): both messages surface.
  {
    const h = host({ fail: { ASSEMBLE: Error('Streamable HTTP error: timeout') }, landed: ['seq-a', 'seq-b'], draftsBefore: ['seq-old'] });
    await assert.rejects(P.tplRunBuild(frozen(), h), e => /Streamable HTTP error/.test(e.message) && /several new Drafts are named/.test(e.message));
    assert.deepEqual(kinds(h), ['ENSURE', 'DRAFTS', 'ASSEMBLE', 'DRAFTS']);
  }
  // Assemble replies without the new Draft's id: the same read-only recovery (fresh name match -> read back), then
  // decorate continues. Assemble is never resent.
  {
    const h = host({ idless: true, draftsBefore: ['seq-old'] });
    let onA = null;
    h.onAssembled = (s, a) => { onA = a; };
    const out = await P.tplRunBuild(frozen(), h);
    assert.deepEqual(kinds(h), ['ENSURE', 'DRAFTS', 'ASSEMBLE', 'DRAFTS', 'READBACK', 'DECORATE', 'OPEN']);
    assert.equal(kinds(h).filter(k => k === 'ASSEMBLE').length, 1, 'assemble is never resent');
    assert.ok(!h.calls[3].allowCommit && !h.calls[4].allowCommit, 'the recovery only reads');
    assert.ok(h.calls[4].script.includes('"seq-landed"'), 'reads back the Draft that appeared');
    assert.equal(out.assembled.sequenceId, 'seq-landed');
    assert.equal(onA && onA.sequenceId, 'seq-landed', '"Finish letters and look" gets the recovered Draft');
    assert.equal(h.calls[5].cfg.sequenceId, 'seq-landed');
    assert.equal(out.link, 'selects://draft');
    // No new Draft found: the id error, still without a resend or a decorate.
    const h2 = host({ idless: [], draftsBefore: ['seq-old'] });
    await assert.rejects(P.tplRunBuild(frozen(), h2), /did not report its id/);
    assert.deepEqual(kinds(h2), ['ENSURE', 'DRAFTS', 'ASSEMBLE', 'DRAFTS']);
    // Two new Drafts with the name: the id error says why.
    const h3 = host({ idless: ['seq-a', 'seq-b'], draftsBefore: [] });
    await assert.rejects(P.tplRunBuild(frozen(), h3), e => /did not report its id/.test(e.message) && /several new Drafts are named/.test(e.message));
    assert.deepEqual(kinds(h3), ['ENSURE', 'DRAFTS', 'ASSEMBLE', 'DRAFTS']);
  }
  // Ambiguous ensure-audio error: a read-only lookup finds the import and the build continues; not found -> error.
  {
    const h = host({ fail: { ENSURE: Error('socket hang up') }, audioFound: true });
    await P.tplRunBuild(frozen(), h);
    assert.deepEqual(kinds(h), ['ENSURE', 'FINDAUDIO', 'DRAFTS', 'ASSEMBLE', 'DECORATE', 'OPEN']);
    assert.ok(!h.calls[1].allowCommit && !/importFiles/.test(h.calls[1].script), 'the lookup never imports');
    const h2 = host({ fail: { ENSURE: Error('socket hang up') } });
    await assert.rejects(P.tplRunBuild(frozen(), h2), /socket hang up/);
    assert.deepEqual(kinds(h2), ['ENSURE', 'FINDAUDIO']);
  }
  // Decorate fails: the error asks for "Finish letters and look"; tplFinish re-runs only decorate with the frozen state.
  {
    let assembled = null, state = null;
    const h = host({ fail: { DECORATE: Error('deadline') } });
    h.onAssembled = (s, a) => { state = s; assembled = a; };
    await assert.rejects(P.tplRunBuild(frozen(), h), /Finish letters and look/);
    assert.deepEqual(kinds(h), ['ENSURE', 'DRAFTS', 'ASSEMBLE', 'DECORATE']);
    const h2 = host();
    const out = await P.tplFinish(P.tplFreezeBuild(state), assembled, h2);
    assert.deepEqual(kinds(h2), ['DECORATE', 'OPEN']);
    assert.deepEqual(h2.calls[0].cfg, h.calls[3].cfg, 'the retry sends the same decorate config');
    assert.equal(out.link, 'selects://draft');
  }
  // Decorate refuses a Draft whose pictures no longer match the plan: permanent, so the advice is to build again.
  {
    const h = host({ fail: { DECORATE: Error("decorate: the Draft's 13 pictures don't match the 14 planned ones") } });
    await assert.rejects(P.tplRunBuild(frozen(), h), e => /press Build to make a new Draft/.test(e.message) && !/Finish letters and look/.test(e.message));
  }
  // Another version: a new seed changes the tear seeds and the letter seed, same pictures when N covers them all.
  {
    const h1 = host(), h2 = host();
    await P.tplRunBuild(frozen(), h1);
    await P.tplRunBuild(frozen({ options: Object.assign({}, options, { seed: 2 }) }), h2);
    const d1 = h1.calls.find(c => c.kind === 'DECORATE').cfg, d2 = h2.calls.find(c => c.kind === 'DECORATE').cfg;
    assert.notDeepEqual(d1.torn.clips.map(c => c.data.seed), d2.torn.clips.map(c => c.data.seed));
    assert.equal(d2.letters.parameters.seed, 2);
    assert.deepEqual(d1.torn.clips.map(c => c.rid), d2.torn.clips.map(c => c.rid));
  }
  console.log(JSON.stringify({ panel: 'ok' }));
})().catch(e => { console.error(e); process.exit(1); });
