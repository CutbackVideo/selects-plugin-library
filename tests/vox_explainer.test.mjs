// vox-explainer: the panel's ports of engine.py's ffmpeg-only steps match engine.py's argv apart from SAR normalization/timecode suppression, and parse
// ffmpeg's output the same way. engine.py is loaded with subprocess.run stubbed (a dev check; skipped without python3).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {loadPanelOperation} from './panel_operation.mjs';

const op = loadPanelOperation('vox-explainer');
const ENGINE = path.resolve(import.meta.dirname, '../plugins/vox-explainer/engine.py');
const FONT = '/System/Library/Fonts/Supplemental/Arial.ttf';
const LOG = [
  '[silencedetect @ 0x1] silence_start: 0',
  '[silencedetect @ 0x1] silence_end: 0.214 | silence_duration: 0.214',
  '[silencedetect @ 0x1] silence_start: 1.5012',
  '[silencedetect @ 0x1] silence_end: 1.80 | silence_duration: 0.2988',
  '[silencedetect @ 0x1] silence_start: 3.25',
].join('\n');
const SHOTS = Array.from({length: 14}, (_, i) => `${Math.floor(i / 2) + 1}${'ab'[i % 2]}`);

const HARNESS = String.raw`
import importlib.util, json, os, sys, tempfile
spec = importlib.util.spec_from_file_location("engine", sys.argv[1]); e = importlib.util.module_from_spec(spec); spec.loader.exec_module(e)
cfg = json.loads(sys.argv[2]); calls = []; outs = []
class R:
    returncode = 0
    def __init__(self, stdout, stderr): self.stdout, self.stderr = stdout, stderr
def run(argv, **kw):
    calls.append(argv); return R(cfg["stdout"], cfg["log"])
e.subprocess.run = run
e.find_tool = lambda n: n
e.out = lambda o: outs.append(o)
e.time.time = lambda: 1700000000
res = {"duration": e.media_duration("/m e/narr 1.wav"), "silences": e.silences("/m e/narr 1.wav")}
for zoom in (True, False):
    e.ken_burns("/k/kf 1a.png", "/k/out.mp4", 3.417, zoom_in=zoom)
d = tempfile.mkdtemp()
shots = cfg["shots"]
json.dump({"id": "vxT"}, open(os.path.join(d, "job.json"), "w"))
json.dump({"cast": [], "beats": [{"n": 1, "shots": [{"id": s, "cast": [], "scene": ""} for s in shots]}]}, open(os.path.join(d, "plan.json"), "w"))
gen = {}
for s in shots:
    p = os.path.join(d, "kf_%s.png" % s); open(p, "w").close(); gen["kf:" + s] = {"path": p}
json.dump(gen, open(os.path.join(d, "gen.json"), "w"))
exists = os.path.exists
for font in (True, False):
    os.path.exists = lambda p, font=font: font if p == cfg["font"] else exists(p)
    e.cmd_sheet(e.Job(d)); e.cmd_sheet(e.Job(d), {shots[3]})
os.path.exists = exists
print(json.dumps({"res": res, "calls": calls, "outs": outs, "dir": d}))
`;

function engine() {
  const r = spawnSync('python3', ['-c', HARNESS, ENGINE, JSON.stringify({stdout: '12.345\n', log: LOG, shots: SHOTS, font: FONT})], {encoding: 'utf8'});
  if (r.error) return null;
  assert.equal(r.status, 0, r.stderr);
  return JSON.parse(r.stdout);
}
const ref = engine();
const skip = ref ? false : 'python3 is not available';

test('media_duration and silences match engine.py', {skip}, () => {
  const [probe, detect] = ref.calls;
  assert.deepEqual(['ffprobe', ...op.voxDurationArgs('/m e/narr 1.wav')], probe);
  assert.equal(op.voxParseDuration('12.345\n', 'x'), ref.res.duration);
  assert.throws(() => op.voxParseDuration('N/A\n', 'x'), /cannot read duration/);
  assert.throws(() => op.voxParseDuration('', 'x'), /cannot read duration/);
  assert.deepEqual(['ffmpeg', ...op.voxSilenceArgs('/m e/narr 1.wav')], detect);
  assert.deepEqual(op.voxParseSilences(LOG), ref.res.silences);
  assert.deepEqual(op.voxParseSilences(''), []);
});

// The panel adds -write_tmcd 0 before the output, so the mp4 holds its one video stream only.
// The shipped panel additionally normalizes every combining input; engine.py is a non-shipped legacy oracle.
const squarePixelInputs = argv => argv.map(arg => arg
  .replaceAll('scale=270:480,', 'scale=270:480,setsar=1,')
  .replaceAll('crop=1080:1920,boxblur', 'crop=1080:1920,setsar=1,boxblur')
  .replaceAll('force_original_aspect_ratio=decrease[fg]', 'force_original_aspect_ratio=decrease,setsar=1[fg]'));
const withTmcd = (argv) => [...argv.slice(0, -1), '-write_tmcd', '0', argv[argv.length - 1]];
test('ken_burns argv matches engine.py plus square pixels and -write_tmcd 0', {skip}, () => {
  assert.deepEqual(['ffmpeg', ...op.voxKenBurnsArgs('/k/kf 1a.png', '/k/out.mp4', 3.417, true)], withTmcd(squarePixelInputs(ref.calls[2])));
  assert.deepEqual(['ffmpeg', ...op.voxKenBurnsArgs('/k/kf 1a.png', '/k/out.mp4', 3.417, false)], withTmcd(squarePixelInputs(ref.calls[3])));
});

test('sheet argv and sheet list match engine.py plus square pixels', {skip}, () => {
  const fileOf = (s) => path.join(ref.dir, `kf_${s}.png`);
  const destOf = (n) => path.join(ref.dir, 'check', `sheet_1700000000_${n}.jpg`);
  const sheets = ref.calls.slice(4);
  assert.equal(sheets.length, 6);
  assert.ok(sheets[0].join(' ').includes('drawtext') && !sheets[3].join(' ').includes('drawtext'));
  const mine = [
    ...op.voxSheetJobs(SHOTS, fileOf, FONT, destOf), ...op.voxSheetJobs([SHOTS[3]], fileOf, FONT, destOf),
    ...op.voxSheetJobs(SHOTS, fileOf, null, destOf), ...op.voxSheetJobs([SHOTS[3]], fileOf, null, destOf),
  ];
  assert.equal(mine.length, 6);
  assert.deepEqual(mine.map((j) => ['ffmpeg', ...j.args]), sheets.map(squarePixelInputs));
  assert.deepEqual(mine.slice(0, 3).map(({dest, shots}) => ({path: dest, shots})), [...ref.outs[0].sheets, ...ref.outs[1].sheets]);
  fs.rmSync(ref.dir, {recursive: true, force: true});
});

test('a Windows font path is escaped for the filtergraph', () => {
  assert.equal(op.voxFilterPath(op.voxSheetFont(true)), 'C\\:/Windows/Fonts/arial.ttf');
  assert.equal(op.voxFilterPath(op.voxSheetFont(false)), FONT);
});

// Windows Staging: "sheet: ...drawtext=... Error : Invalid argument". The filtergraph parser removes one level of
// backslashes, so fontfile=C\:/Windows/... splits at the colon; the value is quoted when it has an escaped colon.
test('a Windows font path is quoted for drawtext; a macOS path is written as engine.py did', () => {
  assert.equal(op.voxFontOption(op.voxSheetFont(true)), "'C\\:/Windows/Fonts/arial.ttf'");
  assert.equal(op.voxFontOption(op.voxSheetFont(false)), FONT);
  const [job] = op.voxSheetJobs(['1a'], () => 'C:\\kf\\1a.png', op.voxSheetFont(true), () => 'C:\\out\\s.jpg');
  assert.ok(job.args.join(' ').includes("drawtext=fontfile='C\\:/Windows/Fonts/arial.ttf':text='1a'"));
});

const ffmpeg = spawnSync('ffmpeg', ['-version']).status === 0;
const anyFont = [FONT, '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', '/Library/Fonts/Arial Unicode.ttf'].find((f) => fs.existsSync(f));
test('ffmpeg accepts the sheet with a font under a drive-letter path', {skip: !(ffmpeg && anyFont) && 'ffmpeg and a TTF required'}, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vox-sheet-'));
  const fontDir = path.join(dir, 'C:', 'Windows', 'Fonts');
  fs.mkdirSync(fontDir, {recursive: true});
  const font = path.join(fontDir, 'arial.ttf');
  fs.copyFileSync(anyFont, font);
  const kf = path.join(dir, 'kf.png');
  spawnSync('ffmpeg', ['-nostdin', '-v', 'error', '-y', '-f', 'lavfi', '-i', 'testsrc2=size=540x960:rate=1:duration=1', '-frames:v', '1', kf]);
  const jobs = op.voxSheetJobs(['1a', '1b', '2a'], () => kf, font, (n) => path.join(dir, `sheet_${n}.jpg`));
  for (const j of jobs) {
    const r = spawnSync('ffmpeg', j.args, {encoding: 'utf8'});
    assert.equal(r.status, 0, r.stderr);
    assert.ok(fs.statSync(j.dest).size > 1000);
  }
  // The old form (unquoted) is what failed.
  const old = jobs[0].args.map((a) => a.split(`fontfile=${op.voxFontOption(font)}`).join(`fontfile=${op.voxFilterPath(font)}`));
  assert.notEqual(spawnSync('ffmpeg', old, {encoding: 'utf8'}).status, 0);
  fs.rmSync(dir, {recursive: true, force: true});
});

test('a sheet ffmpeg refuses with labels is made once more without them', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vox-sheet-'));
  fs.writeFileSync(path.join(dir, 'job.json'), JSON.stringify({id: 'vxS'}));
  fs.writeFileSync(path.join(dir, 'plan.json'), JSON.stringify({cast: [], beats: [{n: 1, shots: [{id: '1a', cast: [], scene: "A 'sign'"}]}]}));
  fs.writeFileSync(path.join(dir, 'kf.png'), '');
  fs.writeFileSync(path.join(dir, 'gen.json'), JSON.stringify({'kf:1a': {path: path.join(dir, 'kf.png')}}));
  const calls = [];
  const io = {
    join: (...p) => path.join(...p), exists: (p) => p === FONT || fs.existsSync(p), mkdir: (p) => fs.mkdirSync(p, {recursive: true}),
    readJson: async (p, def) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return def; } },
    writeJson: async (p, v) => fs.writeFileSync(p, JSON.stringify(v)), now: () => 1700000000, sheetFont: () => FONT,
    ffmpeg: async (args) => { calls.push(args); if (args.join(' ').includes('drawtext')) throw new Error('Error : Invalid argument'); },
  };
  const out = await op.voxEngine('sheet', dir, [], io);
  assert.equal(out.ok, true);
  assert.equal(out.unlabelled, true);
  assert.equal(calls.length, 2);
  assert.ok(!calls[1].join(' ').includes('drawtext'));
  assert.deepEqual(out.expect[0].words, ['sign']);
  const fail = await op.voxEngine('sheet', dir, [], {...io, ffmpeg: async () => { throw new Error('no xstack'); }});
  assert.deepEqual(fail, {ok: false, error: 'sheet: no xstack'});
  fs.rmSync(dir, {recursive: true, force: true});
});

test('a failed contact sheet skips the image check instead of stopping the video', () => {
  const panel = fs.readFileSync(path.resolve(import.meta.dirname, '../plugins/vox-explainer/panel.tsx'), 'utf8');
  const loop = panel.slice(panel.indexOf('let checkSkipped = false;'), panel.indexOf('setStep(5);'));
  assert.match(loop, /try \{\s*sh = await run\("sheet"[^]*?\} catch \(err: any\) \{[^]*?checkSkipped = true;\s*break;/);
  assert.match(loop, /savePanel\(dir, \{ checked: true, checkSkipped,/);
  assert.match(panel, /result\.checkSkipped \? S\.checkSkipped :/);
  assert.equal((panel.match(/\bcheckSkipped: "/g) || []).length, (panel.match(/^  (\w\w): \{$/gm) || []).length);
});

// Windows Staging: the Draft step stopped with "imported media did not become ready". The file names were taken with
// split("/"), which keeps a whole Windows path, so no Resource matched (and every Continue imported again). A Resource
// is ready once it has a length; an unanalysed import stays "pending" and is still placeable.
const untyped = (src) => src.replace(/: \{ file: string; name: string \}\[\]/g, '').replace(/: Record<string, string>/g, '')
  .replace(/: string\[\]/g, '').replace(/\((\w+): any\)/g, '($1)');
const runScript = (src, selects) => new Function('selects', `return (async () => {${untyped(src)}})();`)(selects);
const WIN = ['C:\\Users\\x\\.selects\\plugin-data\\vox-explainer\\jobs\\vx1\\gen\\clips\\vx1_clip_1a_1.mp4',
  'C:\\Users\\x\\.selects\\plugin-data\\vox-explainer\\jobs\\vx1\\gen\\narration\\vx1_narr_1_1.mp3'];

test('the Draft step imports and finds Windows paths by file name; pending Resources with a length are ready', async () => {
  assert.equal(op.voxBaseName(WIN[0]), 'vx1_clip_1a_1.mp4');
  assert.equal(op.voxBaseName('/home-x/a b/c.mp3'), 'c.mp3');
  const rows = [{resourceId: 'r0', name: 'vx1_clip_1a_1.mp4', status: 'pending', durationSeconds: 5.04}];
  const imported = [];
  const selects = {project: () => ({resources: async () => rows, importFiles: async ({paths}) => { imported.push(...paths); }})};
  assert.deepEqual(await runScript(op.voxImportScript('p1', WIN), selects), {imported: 1});
  assert.deepEqual(imported, [WIN[1]], 'only the file the Project lacks');
  // The narration import has no length yet: not ready, and named.
  rows.push({resourceId: 'r1', name: 'vx1_narr_1_1.mp3', status: 'pending', durationSeconds: null});
  let r = await runScript(op.voxReadyScript('p1', WIN), selects);
  assert.deepEqual(r.missing, ['vx1_narr_1_1.mp3']);
  rows[1].durationSeconds = 6.12;
  r = await runScript(op.voxReadyScript('p1', WIN), selects);
  assert.deepEqual({...r.map}, {[WIN[0]]: 'r0', [WIN[1]]: 'r1'});
  assert.deepEqual([...r.missing], []);
  assert.deepEqual(await runScript(op.voxImportScript('p1', WIN), selects), {imported: 0}, 'a Continue imports nothing again');
});

test('the Draft step waits about two minutes, then names what is missing', () => {
  assert.ok(op.VOX_READY_TRIES * op.VOX_READY_PAUSE_MS >= 90000 && op.VOX_READY_TRIES * op.VOX_READY_PAUSE_MS <= 180000);
  const panel = fs.readFileSync(path.resolve(import.meta.dirname, '../plugins/vox-explainer/panel.tsx'), 'utf8');
  assert.ok(panel.includes('script: voxImportScript(projectId, sel.files)') && panel.includes('script: voxReadyScript(projectId, sel.files)'));
  assert.ok(!panel.includes('imported media did not become ready') && !panel.includes('.split("/").pop()'));
  assert.equal((panel.match(/\bnotReady: \(n\) => `/g) || []).length, (panel.match(/^  (\w\w): \{$/gm) || []).length);
  assert.ok(!/status/.test(op.voxReadyScript('p', WIN).replace('the status', '')), 'readiness never reads the status');
});


test('every sheet and Ken Burns combining input has square pixels after scaling', () => {
  for (const font of [null, FONT]) {
    for (const job of op.voxSheetJobs(SHOTS, s => s + '.png', font, n => n + '.jpg')) {
      const graph = job.args[job.args.indexOf('-filter_complex') + 1];
      for (let i = 0; i < job.shots.length; i++) {
        assert.ok(graph.includes(`[${i}:v]scale=270:480,setsar=1,`));
      }
    }
  }
  const args = op.voxKenBurnsArgs('in.png', 'out.mp4', 0.1);
  const graph = args[args.indexOf('-filter_complex') + 1];
  assert.ok(graph.includes('crop=1080:1920,setsar=1,boxblur=26:2[bg]'));
  assert.ok(graph.includes('force_original_aspect_ratio=decrease,setsar=1[fg]'));
});

test('real sheet builder combines SAR 853:854 and 1:1 sources', {skip: !ffmpeg && 'ffmpeg is unavailable'}, () => {
  const job = op.voxSheetJobs(['a', 'b'], s => s, null, () => 'unused.jpg')[0];
  const graph = job.args[job.args.indexOf('-filter_complex') + 1];
  const r = spawnSync('ffmpeg', ['-v', 'error', '-f', 'lavfi', '-i',
    'testsrc2=size=320x240:rate=1,setsar=853/854', '-f', 'lavfi', '-i',
    'testsrc2=size=640x360:rate=1,setsar=1', '-filter_complex', graph,
    '-frames:v', '1', '-f', 'null', '-'], {encoding: 'utf8', timeout: 30000});
  assert.equal(r.status, 0, r.stderr);
});
