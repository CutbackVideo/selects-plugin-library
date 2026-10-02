// vox-explainer: the panel's JS engine (voxEngine) against engine.py, the Python engine it replaces. Both run the same
// scripted jobs (the commands the panel runs, in its order) on the same fixtures: article pages, Wikipedia/Commons
// answers, narration lengths and silencedetect logs. Every command's answer, every file it writes, every ffmpeg argv
// and every URL it asks for must match. engine.py runs with its ffmpeg, network and clock stubbed, and with sum() as
// plain left-to-right addition (Python 3.9, which macOS ships, adds that way; 3.12+ compensates).
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
const NOW = 1700000000;

// Pseudo-Korean text from Hangul code points (the repo keeps no Hangul literals): words of 2-4 syllables.
function ko(words, seed = 1) {
  const out = [];
  for (let i = 0; i < words; i++) {
    const n = 2 + ((i * 7 + seed) % 3);
    let w = '';
    for (let j = 0; j < n; j++) w += String.fromCharCode(0xac00 + ((seed * 131 + i * 37 + j * 911) % 11172));
    out.push(w + (i % 6 === 5 ? '.' : i % 4 === 3 ? ',' : ''));
  }
  return out.join(' ');
}
const KO_NAME = (s) => String.fromCharCode(0xac00 + s * 17, 0xac00 + s * 29) + ' ' + String.fromCharCode(0xbc15); // 'given family'

const ARC = `<html><head><meta property="og:title" content="Arc &amp; title"><meta property="og:site_name" content="Arc Daily">
<meta name="author" content="Meta Author"><title>Ignored</title></head><body><script>Fusion.globalContent=${JSON.stringify({
  headlines: {basic: 'Arc headline ' + ko(3, 9)}, subheadlines: {basic: 'First line<br/>second line'},
  credits: {by: [{name: KO_NAME(1)}, {name: 'Jane Roe'}, {name: ''}]}, display_date: '2026-09-30T08:00:00Z',
  content_elements: [{type: 'text', content: '<b>' + ko(40, 2) + '</b>'}, {type: 'image', content: 'x'}, {type: 'text', content: ko(35, 3) + ' &quot;quoted&quot;'}],
})};Fusion.globalContentConfig={};</script></body></html>`;
const LONG_EN = 'The committee said that the new rules for the city budget will be published on Monday, and that the ' +
  'mayor has asked for a review of the transit plan. It was the third time this year that the council has delayed ' +
  'the vote, and residents in the north of the city are waiting for an answer from the office.';
const JSONLD = `<html><head><meta property="og:description" content="Desc &#8217;quoted&#8217;"><title>T &amp; T</title>
<script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"WebPage","name":"x"},
{"@type":["NewsArticle"],"headline":"JSON-LD headline","datePublished":"2026-10-01T10:00:00Z","publisher":{"@type":"Organization","name":"Ledger"},
"author":[{"@type":"Person","name":"Ann Lee"},{"@type":"Person","name":"Bo Kim"}],"description":"<p>About &amp; more</p>",
"articleBody":${JSON.stringify(LONG_EN + ' NASA and the UN said 2026 would be decisive.')}}]}</script></head><body></body></html>`;
const PARAS = `<html><head><title>Para &amp; page</title></head><body><nav><p>Share this story with everyone you know today please</p></nav>
<article><p>Share this story with your friends on every network you use each day</p><p>Short.</p>
<p>${'Der Ausschuss hat die neuen Regeln für den Haushalt der Stadt veröffentlicht, und die Bürger sind mit dem Plan nicht einverstanden.'}</p>
<p>${'Die Stadt wird auch im nächsten Jahr die Mittel für den Verkehr erhöhen, sagte die Bürgermeisterin&nbsp;am Montag in der Sitzung.'}</p>
<p>Advertisement continues below with more words than forty characters total here.</p></article></body></html>`;
const SHORT = '<html><head><title>Tiny</title></head><body><article><p>Only a short paragraph that is just over forty chars.</p></article></body></html>';

const WIKI = {
  pages: {'Kim Free': 'Kim_Free.jpg', 'Lee Restricted': 'Lee_NC.jpg', [KO_NAME(1)]: 'Ko_PD.jpg', 'Ann Lee': 'Ann Lee (2020) été.jpg'},
  licenses: {'Kim_Free.jpg': ['CC BY-SA 4.0', 'Photographer: <a href="x">Kim &amp; Co</a>'], 'Lee_NC.jpg': ['CC BY-NC 2.0', 'X'],
    'Ko_PD.jpg': ['Public domain', ''], 'Ann Lee (2020) été.jpg': ['CC BY 2.0', 'Author: Zed']},
  broken: ['Ann Lee (2020) été.jpg'],
};
const PAGES = {'https://arc.example.com/a/1': [200, ARC], 'https://ld.example.com/story': [200, JSONLD], 'https://p.example.de/x': [200, PARAS],
  'https://short.example.com/': [200, SHORT], 'https://gone.example.com/': [404, 'nope']};

const silenceLog = (pairs) => pairs.map(([a, b]) => `[silencedetect @ 0x1] silence_start: ${a}` + (b == null ? '' : `\n[silencedetect @ 0x1] silence_end: ${b} | silence_duration: ${b - a}`)).join('\n');

// Korean job: Arc page, two people (one without a free photo), re-broken captions, two-shot beats, retries.
const koNarr = [ko(14, 21), ko(9, 22), ko(12, 23)];
const KO = {
  id: 'vxKO', job: {id: 'vxKO', projectId: 'p1', created: 'x', input: {kind: 'link', url: 'https://arc.example.com/a/1'}, target: 40, stage: 'new'},
  steps: [
    ['fetch'],
    ['write', 'plan.json', {title: 'K ' + ko(30, 4), source_line: '', cast: [
      {key: 'Kim-Free!', name: 'Kim Free', wiki: '', wardrobe: 'a grey suit'}, {key: 'lee', name: 'Lee Restricted'},
      {key: 'ko1', name: KO_NAME(1), wiki: KO_NAME(1)}, {key: 'unused', name: 'Nobody'}, {key: '', name: 'Blank'}],
      beats: [
        {narration: '  ' + koNarr[0] + '\n', headline: ko(9, 5), captions: [koNarr[0].split(' ').slice(0, 4).join(' '), koNarr[0].split(' ').slice(4).join(' ')],
          cut_word: koNarr[0].split(' ')[7], shots: [{scene: 'Kim Free speaks to "the panel"', cast: ['kim-free'], camera: 'pan'},
            {scene: 'A map of the city', camera: 'pan', element_motion: 'lines draw'}, {scene: 'third ignored'}], bg: 'olive green'},
        {narration: koNarr[1], title_ko: 'T2', captions: 'not a list', shots: [{scene: 'Lee Restricted and ' + KO_NAME(1) + ' shake hands', cast: ['lee', 'ko1', 'ghost'], camera: 'static'},
          {scene: 'A ledger', camera: 'static'}]},
        {narration: koNarr[2], title: 'Ending', captions: [koNarr[2]], cut_word: 'nope', shots: [{scene: "A 'Final' stamp", camera: 'pull_out'}, {scene: 'Second', camera: 'zoom'}]},
        {narration: '   ', shots: [{scene: 'empty narration beat'}]},
      ]}],
    ['validate'],
    ['portraits'],
    ['requests', 'narration'],
    ['gen', {'narr:1': 'gen/narration/n1.mp3', 'narr:2': 'gen/narration/n2.mp3', 'narr:3': 'gen/narration/n3.mp3'}],
    ['requests', 'narration', '2'],
    ['timeline'],
    ['requests', 'music'],
    ['requests', 'keyframes'],
    ['gen', {'kf:1a': 'gen/keyframes/1a.png', 'kf:1b': 'gen/keyframes/1b.png', 'kf:2a': 'gen/keyframes/2a.png', 'kf:2b': 'gen/keyframes/2b.png', 'kf:3a': 'gen/keyframes/3a.png', 'kf:3b': 'gen/keyframes/3b.png'}],
    ['requests', 'keyframes', '1a,2a', '--attempt', '2'],
    ['sheet'],
    ['sheet', '2a,3a'],
    ['requests', 'clips'],
    ['gen', {'clip:1a': 'gen/clips/1a.mp4', 'clip:2a': 'gen/clips/2a.mp4', 'clip:2b': 'gen/clips/2b.mp4', 'clip:3b': 'gen/clips/3b.mp4', 'music': 'gen/music/m.mp3'}],
    ['kenburns', '3a,1b'],
    ['gen', {'clip:1b': 'gen/kenburns/vxKO_kb_1b.mp4', 'clip:3a': 'gen/kenburns/vxKO_kb_3a.mp4'}],
    ['assembly'],
  ],
  files: ['gen/narration/n1.mp3', 'gen/narration/n2.mp3', 'gen/narration/n3.mp3', 'gen/keyframes/1a.png', 'gen/keyframes/1b.png', 'gen/keyframes/2a.png', 'gen/keyframes/2b.png',
    'gen/keyframes/3a.png', 'gen/keyframes/3b.png', 'gen/clips/2b.mp4', 'gen/clips/3b.mp4', 'gen/clips/1a.mp4', 'gen/clips/2a.mp4', 'gen/music/m.mp3', 'gen/kenburns/vxKO_kb_1b.mp4', 'gen/kenburns/vxKO_kb_3a.mp4'],
  durations: {'gen/narration/n1.mp3': '6.1234', 'gen/narration/n2.mp3': '3.0625', 'gen/narration/n3.mp3': '5.5', 'gen/clips/1a.mp4': '10.04',
    'gen/clips/2a.mp4': '3.04', 'gen/clips/2b.mp4': '0.5', 'gen/clips/3b.mp4': '6.04', 'gen/kenburns/vxKO_kb_1b.mp4': '1.2', 'gen/kenburns/vxKO_kb_3a.mp4': '4.0'},
  logs: {'gen/narration/n1.mp3': silenceLog([[0, 0.21], [1.734, 2.02], [3.5, 3.71], [5.9, null]]), 'gen/narration/n2.mp3': silenceLog([[0.5, 0.75]]),
    'gen/narration/n3.mp3': silenceLog([[0, 0.1], [2.25, 2.5], [5.31, 5.5]])},
};
// English job: JSON-LD page, no people, acronyms and digits, a beat whose cut leaves a short half.
const EN = {
  id: 'vxEN', job: {id: 'vxEN', projectId: 'p1', created: 'x', input: {kind: 'link', url: 'https://ld.example.com/story'}, stage: 'new'},
  steps: [
    ['fetch'],
    ['write', 'plan.json', {title: 'Budget', source_line: 'Source: Ledger, Oct 1', cast: [{key: 'ann', name: 'Ann Lee'}],
      beats: [
        {narration: 'NASA and the UN said 2026 would be decisive for the 3 cities, which spent $4.5 billion.', headline: 'A very long headline that will be cut at twenty-eight',
          captions: ['NASA and the UN said 2026', 'would be decisive for the 3 cities,', 'which spent $4.5 billion.'], shots: [{scene: 'Ann Lee at a desk', cast: ['ann'], camera: 'push_in'}, {scene: 'A rocket', camera: 'push_in'}]},
        {narration: 'Then it stopped. Done.', shots: [{scene: 'A stop sign'}, {scene: 'A clock'}]},
        {narration: 'Residents waited, and waited, for an answer that never came from the office on Main Street.', bg: 'red',
          shots: [{scene: 'Residents queue', camera: 'pan'}, {scene: 'An empty office', camera: 'pan', motion: 'door swings'}]},
      ]}],
    ['validate'],
    ['portraits'],
    ['requests', 'narration'],
    ['gen', {'narr:1': 'n/1.mp3', 'narr:2': 'n/2.mp3', 'narr:3': 'n/3.mp3'}],
    ['timeline'],
    ['requests', 'keyframes'],
    ['gen', {'kf:1a': 'k/1a.png', 'kf:1b': 'k/1b.png', 'kf:2a': 'k/2a.png', 'kf:3a': 'k/3a.png', 'kf:3b': 'k/3b.png'}],
    ['requests', 'clips', '3b'],
    ['gen', {'clip:1a': 'c/1a.mp4', 'clip:1b': 'c/1b.mp4', 'clip:2a': 'c/2a.mp4', 'clip:3a': 'c/3a.mp4'}],
    ['assembly'],
    ['gen', {'clip:3b': 'c/3b.mp4', 'music': 'missing/m.mp3'}],
    ['assembly'],
    ['requests', 'bogus'],
    ['frobnicate'],
  ],
  files: ['n/1.mp3', 'n/2.mp3', 'n/3.mp3', 'k/1a.png', 'k/1b.png', 'k/2a.png', 'k/3a.png', 'k/3b.png', 'c/1a.mp4', 'c/1b.mp4', 'c/2a.mp4', 'c/3a.mp4', 'c/3b.mp4'],
  durations: {'n/1.mp3': '7.83', 'n/2.mp3': '1.9', 'n/3.mp3': '6.4', 'c/1a.mp4': '5.04', 'c/1b.mp4': '4.04', 'c/2a.mp4': '5.04', 'c/3a.mp4': '4.04', 'c/3b.mp4': '9.04'},
  logs: {'n/1.mp3': silenceLog([[0, 0.12], [2.4, 2.71], [4.1, 4.25], [7.6, 7.83]]), 'n/2.mp3': '', 'n/3.mp3': silenceLog([[1.5, 1.9], [3.0, 3.2]])},
};
// Small jobs: pasted text, the paragraph fallback, refusals and errors.
const small = (id, input, steps, extra = {}) => ({id, job: {id, projectId: 'p1', created: 'x', input, stage: 'new', ...extra}, steps, files: [], durations: {}, logs: {}});
const JOBS = [KO, EN,
  small('vxTX', {kind: 'text', text: '\n  Ein Titel für den Text  \r\n\nDer Ausschuss hat die neuen Regeln für den Haushalt der Stadt veröffentlicht und die Bürger sind mit dem Plan nicht einverstanden.'}, [['fetch']], {target: 90}),
  small('vxTS', {kind: 'text', text: 'too short'}, [['fetch']]),
  small('vxPA', {kind: 'link', url: 'https://p.example.de/x'}, [['fetch'], ['write', 'plan.json', {beats: []}], ['validate'],
    ['write', 'plan.json', {beats: [{narration: 'x y', shots: []}], cast: [{key: 7, name: 'Seven'}, {name: 'No key'}]}], ['validate']], {target: 25}),
  small('vxSH', {kind: 'link', url: 'https://short.example.com/'}, [['fetch']]),
  small('vxGO', {kind: 'link', url: 'https://gone.example.com/'}, [['fetch']]),
  small('vxNW', {kind: 'link', url: 'https://offline.example.com/'}, [['fetch'], ['validate']]),
];

// ---- engine.py ----
const HARNESS = String.raw`
import builtins, importlib.util, json, os, shutil, sys, tempfile, urllib.parse
spec = importlib.util.spec_from_file_location("engine", sys.argv[1]); e = importlib.util.module_from_spec(spec); spec.loader.exec_module(e)
cfg = json.loads(sys.stdin.read())
def plain_sum(xs, start=0):
    for x in xs: start = start + x
    return start
e.sum = plain_sum
e.find_tool = lambda n: n
e.time.time = lambda: cfg["now"]
FONT = cfg["font"]; _exists = os.path.exists
os.path.exists = lambda p: True if p == FONT else _exists(p)
urls, calls = [], []
cur = {}
def route(url):
    urls.append(url)
    u = urllib.parse.urlsplit(url); q = dict(urllib.parse.parse_qsl(u.query))
    w = cfg["wiki"]
    if u.netloc == "en.wikipedia.org":
        name = w["pages"].get(q.get("titles"))
        page = {"pageid": 1, "title": q.get("titles")}
        if name: page["pageimage"] = name
        return 200, json.dumps({"query": {"pages": {"1": page}}})
    if u.netloc == "commons.wikimedia.org" and u.path.endswith("api.php"):
        lic, artist = w["licenses"].get(q["titles"][5:], ["", ""])
        return 200, json.dumps({"query": {"pages": {"-1": {"imageinfo": [{"extmetadata": {"LicenseShortName": {"value": lic}, "Artist": {"value": artist}}}]}}}})
    if u.netloc == "commons.wikimedia.org":
        name = urllib.parse.unquote(q["title"].split("/file/", 1)[1])
        return (500, "") if name in w["broken"] else (200, "JPEG:" + name)
    if url in cfg["pages"]:
        return tuple(cfg["pages"][url])
    raise e.EngineError("NETWORK offline")
def http_get(url, ua, timeout=40):
    code, text = route(url); return code, text.encode("utf-8")
e.http_get = http_get
class R:
    def __init__(self, rc, out, err): self.returncode, self.stdout, self.stderr = rc, out, err
def run(argv, **kw):
    rel = lambda p: os.path.relpath(p, cur["dir"])
    if argv[0] == "ffprobe": return R(0, cur["durations"].get(rel(argv[-1]), "N/A") + "\n", "")
    if "silencedetect=noise=-38dB:d=0.12" in argv: return R(0, "", cur["logs"].get(rel(argv[4]), ""))
    calls.append(argv); return R(0, "", "")
e.subprocess.run = run
result = []
for jb in cfg["jobs"]:
    d = tempfile.mkdtemp(); cur.update(dir=d, durations=jb["durations"], logs=jb["logs"])
    json.dump(jb["job"], open(os.path.join(d, "job.json"), "w"))
    for f in jb["files"]:
        os.makedirs(os.path.dirname(os.path.join(d, f)), exist_ok=True); open(os.path.join(d, f), "w").close()
    gen, outs = {}, []
    for step in jb["steps"]:
        if step[0] == "write": json.dump(step[2], open(os.path.join(d, step[1]), "w")); continue
        if step[0] == "gen":
            for k, v in step[1].items(): gen[k] = {"path": os.path.join(d, v)}
            json.dump(gen, open(os.path.join(d, "gen.json"), "w")); continue
        got = []; e.out = got.append
        try: e.main(["engine.py", step[0], d] + step[1:])
        except e.EngineError as x: got.append({"ok": False, "error": str(x)})
        except Exception as x: got.append({"ok": False, "error": "%s: %s" % (type(x).__name__, x)})
        outs.append(got[0] if got else None)
    files = {}
    for root, _, names in os.walk(d):
        for n in names:
            p = os.path.join(root, n); r = os.path.relpath(p, d)
            files[r] = json.load(open(p, encoding="utf-8")) if n.endswith(".json") else open(p, "rb").read().decode("utf-8", "replace")
    result.append({"dir": d, "outs": outs, "files": files})
    shutil.rmtree(d)
u = cfg["units"]
units = {"align": [e.align_words(c["text"], c["dur"], [tuple(x) for x in c["sil"]], c["lang"]) for c in u["align"]],
         "weight": [[e.word_weight(w, l) for w in ws] for l, ws in u["weight"]],
         "budget": [e.budget(t, l) for t, l in u["budget"]], "captions": [e.auto_captions(t, m) for t, m in u["captions"]],
         "lang": [e.detect_lang(t) for t in u["lang"]], "head": [e.headline_size(t) for t in u["head"]],
         "kling": [e.kling_seconds(x) for x in u["kling"]], "round": [round(x, 3) for x in u["round"]],
         "tables": {"LANG": e.LANG, "MODEL": e.MODEL, "VERSION": e.VERSION}}
print(json.dumps({"jobs": result, "urls": urls, "calls": calls, "units": units}))
`;
// Seeded direct cases for the timing and text helpers (many inputs, so a small drift shows).
let seed = 7;
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const EN_WORDS = ['the', 'city', 'NASA', 'budget,', 'waited.', 'UN', '2026', '$4.5', 'review;', 'answer:', 'a', 'transit', 'O\'Neil', 'well-known', 'Ok!'];
function sentence(n, lang) {
  const out = [];
  for (let i = 0; i < n; i++) out.push(lang === 'ko' ? ko(1, Math.floor(rnd() * 999)).replace(/[.,]$/, '') + (rnd() < 0.2 ? ',' : rnd() < 0.1 ? '.' : '') : EN_WORDS[Math.floor(rnd() * EN_WORDS.length)]);
  return out.join(' ');
}
const UNITS = {align: [], weight: [], budget: [], captions: [], lang: [], head: [], kling: [], round: []};
for (let i = 0; i < 400; i++) {
  const lang = i % 3 ? 'en' : 'ko', n = 3 + Math.floor(rnd() * 25), dur = 1 + rnd() * 12, sil = [];
  let t = rnd() < 0.5 ? 0 : rnd() * 0.3;
  while (t < dur) { const a = t, b = a + 0.12 + rnd() * 0.5; sil.push([Number(a.toFixed(4)), b >= dur && rnd() < 0.5 ? null : Number(Math.min(b, dur).toFixed(4))]); t = b + rnd() * 3; }
  UNITS.align.push({text: sentence(n, lang), dur: Number(dur.toFixed(4)), sil, lang});
}
for (const l of Object.keys(op.VOX_LANG)) UNITS.weight.push([l, ['NASA', 'Abc', 'abc', '123', 'x', 'U.N.', 'AIRBUS', 'r\u00e9sum\u00e9', ko(1, 3), ko(1, 4) + 'AI', '\u0663\u0664', '!!', '\u4e2d\u6587', '\u30c6\u30b9\u30c8']]);
for (const l of Object.keys(op.VOX_LANG)) for (const t of [10, 20, 28, 44, 55, 60, 75, 90, 120]) UNITS.budget.push([t, l]);
for (let i = 0; i < 60; i++) UNITS.captions.push([sentence(5 + Math.floor(rnd() * 30), i % 2 ? 'en' : 'ko'), i % 2 ? 32 : 16]);
UNITS.lang.push(LONG_EN, ko(30, 1), 'der die und das ist nicht mit den von zu', 'le la les de des et est une un du', 'short', '\u4e2d'.repeat(41), '\u30c6'.repeat(21) + ' x');
UNITS.head.push('Budget', ko(4, 2), 'A very long English headline here', '\u4e2d\u6587 mixed', '', 'x'.repeat(80));
for (let i = 0; i < 50; i++) UNITS.kling.push(rnd() * 16);
for (let i = 0; i < 400; i++) UNITS.round.push(Math.floor(rnd() * 64000) / 16000 - 2);
const CFG = {jobs: JOBS, wiki: WIKI, pages: PAGES, font: FONT, now: NOW, units: UNITS};
function python() {
  const r = spawnSync('python3', ['-c', HARNESS, ENGINE], {encoding: 'utf8', input: JSON.stringify(CFG), maxBuffer: 64 << 20});
  if (r.error) return null;
  assert.equal(r.status, 0, r.stderr);
  return JSON.parse(r.stdout);
}

// ---- the JS engine, on the same stubs ----
async function javascript() {
  const urls = [], calls = [], result = [];
  const route = (url) => {
    urls.push(url);
    const u = new URL(url), q = Object.fromEntries(new URLSearchParams(u.search));
    if (u.host === 'en.wikipedia.org') {
      const name = WIKI.pages[q.titles], page = {pageid: 1, title: q.titles};
      if (name) page.pageimage = name;
      return [200, JSON.stringify({query: {pages: {1: page}}})];
    }
    if (u.host === 'commons.wikimedia.org' && u.pathname.endsWith('api.php')) {
      const [lic, artist] = WIKI.licenses[q.titles.slice(5)] || ['', ''];
      return [200, JSON.stringify({query: {pages: {'-1': {imageinfo: [{extmetadata: {LicenseShortName: {value: lic}, Artist: {value: artist}}}]}}}})];
    }
    if (u.host === 'commons.wikimedia.org') {
      const name = decodeURIComponent(q.title.split('/file/')[1]);
      return WIKI.broken.includes(name) ? [500, ''] : [200, 'JPEG:' + name];
    }
    if (PAGES[url]) return PAGES[url];
    throw new Error('offline');
  };
  for (const jb of JOBS) {
    const d = fs.mkdtempSync(path.join(os.tmpdir(), 'vox-'));
    const rel = (p) => path.relative(d, p);
    const io = {
      join: (...p) => path.join(...p), exists: (p) => p === FONT || fs.existsSync(p), mkdir: (p) => fs.mkdirSync(p, {recursive: true}),
      readJson: async (p, def) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return def; } },
      writeJson: async (p, v) => fs.writeFileSync(p, JSON.stringify(v, null, 1)),
      now: () => NOW, sheetFont: () => FONT,
      duration: async (p) => op.voxParseDuration((jb.durations[rel(p)] ?? 'N/A') + '\n', p),
      silences: async (p) => op.voxParseSilences(jb.logs[rel(p)] ?? ''),
      ffmpeg: async (args) => { calls.push(['ffmpeg', ...args]); },
      http: async (url) => { const [code, text] = route(url); return {code, text}; },
      download: async (url, dest) => { const [code, text] = route(url); if (code < 300) fs.writeFileSync(dest, text); return code; },
    };
    fs.writeFileSync(path.join(d, 'job.json'), JSON.stringify(jb.job));
    for (const f of jb.files) { fs.mkdirSync(path.dirname(path.join(d, f)), {recursive: true}); fs.writeFileSync(path.join(d, f), ''); }
    const gen = {}, outs = [];
    for (const step of jb.steps) {
      if (step[0] === 'write') { fs.writeFileSync(path.join(d, step[1]), JSON.stringify(step[2])); continue; }
      if (step[0] === 'gen') { for (const [k, v] of Object.entries(step[1])) gen[k] = {path: path.join(d, v)}; fs.writeFileSync(path.join(d, 'gen.json'), JSON.stringify(gen)); continue; }
      outs.push(await op.voxEngine(step[0], d, step.slice(1), io));
    }
    const files = {};
    const walk = (dir) => { for (const n of fs.readdirSync(dir)) { const p = path.join(dir, n); if (fs.statSync(p).isDirectory()) walk(p); else files[rel(p)] = n.endsWith('.json') ? JSON.parse(fs.readFileSync(p, 'utf8')) : fs.readFileSync(p, 'utf8'); } };
    walk(d);
    result.push({dir: d, outs, files});
    fs.rmSync(d, {recursive: true, force: true});
  }
  return {jobs: result, urls, calls};
}

// Job folders differ between the two runs; so does job.json's "updated" (a wall-clock time).
function normal(run) {
  const text = JSON.stringify(run.jobs.map((j) => JSON.parse(JSON.stringify({outs: j.outs, files: j.files}).split(j.dir).join('<JOB>'))));
  const jobs = JSON.parse(text);
  for (const j of jobs) if (j.files['job.json']) delete j.files['job.json'].updated;
  let calls = JSON.stringify(run.calls);
  for (const j of run.jobs) calls = calls.split(j.dir).join('<JOB>');
  return {jobs, urls: run.urls, calls: JSON.parse(calls)};
}

const ref = python();
const skip = ref ? false : 'python3 is not available';

test('the JS engine answers every command as engine.py does', {skip}, async () => {
  const py = normal(ref), js = normal(await javascript());
  assert.equal(js.jobs.length, py.jobs.length);
  py.jobs.forEach((p, i) => {
    const id = JOBS[i].id;
    assert.equal(js.jobs[i].outs.length, p.outs.length, id);
    p.outs.forEach((o, k) => assert.deepEqual(js.jobs[i].outs[k], o, `${id} step ${k}: ${JSON.stringify(JOBS[i].steps.filter((s) => s[0] !== 'write' && s[0] !== 'gen')[k])}`));
    assert.deepEqual(Object.keys(js.jobs[i].files).sort(), Object.keys(p.files).sort(), id + ' files');
    for (const f of Object.keys(p.files)) assert.deepEqual(js.jobs[i].files[f], p.files[f], `${id} ${f}`);
  });
  assert.deepEqual(js.urls, py.urls);
  // ffmpeg: the same argv, except that the JS Ken Burns clip adds -write_tmcd 0 (one video stream only).
  const strip = (argv) => { const i = argv.indexOf('-write_tmcd'); return i < 0 ? argv : [...argv.slice(0, i), ...argv.slice(i + 2)]; };
  assert.deepEqual(js.calls.map(strip), py.calls);
});

test('the scripted jobs reach every command and the interesting branches', {skip}, () => {
  const outs = ref.jobs.flatMap((j) => j.outs);
  const errors = outs.filter((o) => o && o.ok === false).map((o) => o.error || (o.errors || []).join(';'));
  for (const e of ['TEXT_TOO_SHORT', 'NO_TEXT', 'FETCH_FAILED', 'NETWORK offline', 'no beats', 'unknown request kind bogus', 'unknown command frobnicate', 'clip missing: 3b'])
    assert.ok(errors.some((x) => x.includes(e)), e);
  const ko = ref.jobs[0].outs;
  assert.ok(ko[1].warnings.length && ko[2].missing.length && ko[2].found.length, 'captions re-broken, a free and a missing portrait');
  assert.ok(ref.calls.some((c) => c.join(' ').includes('drawtext')) && ref.calls.some((c) => c.join(' ').includes('zoompan')), 'sheet and Ken Burns ran');
  assert.ok(ref.jobs[0].files['selects.json'].credit.photos.includes('Wikimedia Commons'));
});

test('the timing and text helpers match engine.py on seeded inputs', {skip}, () => {
  const u = ref.units;
  assert.deepEqual(UNITS.align.map((c) => op.voxAlignWords(c.text, c.dur, c.sil, c.lang)), u.align);
  assert.deepEqual(UNITS.weight.map(([l, ws]) => ws.map((w) => op.voxWordWeight(w, l))), u.weight);
  assert.deepEqual(UNITS.budget.map(([t, l]) => op.voxBudget(t, l)), u.budget);
  assert.deepEqual(UNITS.captions.map(([t, m]) => op.voxAutoCaptions(t, m)), u.captions);
  assert.deepEqual(UNITS.lang.map(op.voxDetectLang), u.lang);
  assert.deepEqual(UNITS.head.map(op.voxHeadlineSize), u.head);
  assert.deepEqual(UNITS.kling.map(op.voxKlingSeconds), u.kling);
  assert.deepEqual(UNITS.round.map((x) => op.pyRound(x, 3)), u.round);
  assert.deepEqual({LANG: op.VOX_LANG, MODEL: op.VOX_MODEL, VERSION: op.VOX_VERSION}, u.tables);
});

test('round() and the Python string helpers', () => {
  assert.equal(op.pyRound(0.0625, 3), 0.062);
  assert.equal(op.pyRound(0.1875, 3), 0.188);
  assert.equal(op.pyRound(2.5), 2);
  assert.equal(op.pyRound(3.5), 4);
  assert.equal(op.pyRound(-0.0625, 3), -0.062);
  assert.equal(op.pyRound(1.2345, 3), 1.234);
  assert.equal(op.voxUnescape('a &amp; b &#8217; &#x41; &nbsp; &bogus;'), 'a & b ’ A   &bogus;');
});
