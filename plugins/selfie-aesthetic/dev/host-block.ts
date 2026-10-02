// Source of the panel's host block. panel.tsx carries the text between the markers verbatim
// (tests/host.test.cjs evaluates it as plain JS in node:vm with a mocked window.parent.__DI__; the panel test checks
// that the copy is identical). Keep it plain JS: no imports, no type annotations.
// sae-host:start
// Host I/O through the renderer's own services, the same on macOS and Windows: no host shell, no node, no user
// installed tools. ffmpeg/ffprobe are the host's bundled binaries (Runtime.runFFmpeg/runFFprobe take an argv array,
// so paths need no quoting), and every path is built by FileSystem.join. __DI__ is internal host wiring that a newer
// or older Selects may lack, so each member is checked at call time.
// Error codes (Error.message): 'host_tools' = a needed __DI__ member is missing (show "needs a newer Selects";
// bundled cues keep working), 'timeout' = ffmpeg/ffprobe ran past timeoutMs, 'media_failed' = ffmpeg/ffprobe failed
// or produced no usable output (err.detail holds the host's message, truncated).
function saeDI() {
  let di = null;
  try { di = window.parent && window.parent.__DI__; } catch (e) { di = null; }
  if (!di) { try { di = window.__DI__; } catch (e) { di = null; } }
  const fs = di && di.FileSystem ? di.FileSystem : null;
  const rt = di && di.Runtime ? di.Runtime : null;
  return { fs, rt };
}

// names: ['fs.join', 'rt.runFFmpeg', ...]. Returns { ok, missing }.
function saeHas(names) {
  const di = saeDI();
  const missing = [];
  for (const name of names || []) {
    const dot = String(name).indexOf('.');
    const svc = di[String(name).slice(0, dot)];
    if (!svc || typeof svc[String(name).slice(dot + 1)] !== 'function') missing.push(String(name));
  }
  return { ok: missing.length === 0, missing };
}

function saeNeed(names) {
  const has = saeHas(names);
  if (!has.ok) {
    const err = new Error('host_tools');
    err.missing = has.missing;
    throw err;
  }
  return saeDI();
}

function saePlatform() {
  let p = '';
  try { const rt = saeDI().rt; if (rt && typeof rt.getPlatform === 'function') p = String(rt.getPlatform() || ''); } catch (e) { p = ''; }
  if (/^win/i.test(p)) return 'win32';
  if (/darwin|mac/i.test(p)) return 'darwin';
  if (/linux/i.test(p)) return 'linux';
  let ua = '';
  try { ua = String(navigator.userAgent || ''); } catch (e) { ua = ''; }
  if (/Windows NT/i.test(ua)) return 'win32';
  if (/Mac/i.test(ua)) return 'darwin';
  return 'linux';
}

// The installed skill folder, or null when no candidate holds the plugin's planner.js. The host's skills root
// (SELECTS_USER_SKILLS_ROOT) is the home folder joined with .selects and skills (cutback-client electron/user-skills.ts resolveUserSkillsRoot),
// so that comes first. Archive Vlog falls back to the variable through the host shell; this panel uses no shell, so
// the fallbacks are shell-free host values, each guarded and tried in order:
//   1. FileSystem.homedir() joined with .selects, skills and the plugin id
//   2. SELECTS_USER_SKILLS_ROOT in Runtime.getHostEnvironment(), joined with the plugin id
//   3. SELECTS_USER_SKILLS_ROOT in the renderer's process environment (window.parent.process, then window.process), joined with the plugin id
//   4. Runtime.getOS().homedir() joined the same way (a second view of the home folder)
// A missing member or a throwing call only skips that candidate. FileSystem.join and existsSync are required
// (host_tools without them); every candidate is verified by existsSync(join(dir, 'planner.js')).
const SAE_SKILLS_ENV = 'SELECTS_USER_SKILLS_ROOT';
function saeSkillsCandidates(id) {
  const { fs, rt } = saeDI();
  const out = [];
  const add = (fn) => { try { const v = fn(); if (typeof v === 'string' && v) out.push(v); } catch (e) { /* skip this candidate */ } };
  const envOf = (w) => { try { const p = w && w.process; const v = p && p.env && p.env[SAE_SKILLS_ENV]; return typeof v === 'string' ? v.trim() : ''; } catch (e) { return ''; } };
  add(() => (typeof fs.homedir === 'function' ? String(fs.join(fs.homedir(), '.selects', 'skills', id)) : ''));
  add(() => {
    const env = rt && typeof rt.getHostEnvironment === 'function' ? rt.getHostEnvironment() : null;
    const v = env && typeof env[SAE_SKILLS_ENV] === 'string' ? env[SAE_SKILLS_ENV].trim() : '';
    return v ? String(fs.join(v, id)) : '';
  });
  add(() => {
    let w = null;
    try { w = window.parent; } catch (e) { w = null; }
    const v = envOf(w) || envOf(typeof window === 'undefined' ? null : window);
    return v ? String(fs.join(v, id)) : '';
  });
  add(() => {
    const os = rt && typeof rt.getOS === 'function' ? rt.getOS() : null;
    return os && typeof os.homedir === 'function' ? String(fs.join(os.homedir(), '.selects', 'skills', id)) : '';
  });
  return out.filter((d, i) => out.indexOf(d) === i);
}
function saeSkillsDir(id) {
  const { fs } = saeNeed(['fs.join', 'fs.existsSync']);
  for (const dir of saeSkillsCandidates(id)) {
    try { if (fs.existsSync(fs.join(dir, 'planner.js'))) return dir; } catch (e) { /* the next candidate */ }
  }
  return null;
}

// The plugin's persistent data folder, created when missing.
function saeDataDir(id) {
  const { fs } = saeNeed(['fs.join', 'fs.homedir', 'fs.mkdirSync']);
  const dir = fs.join(fs.homedir(), '.selects', 'plugin-data', id);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function saeFail(code, cause) {
  const err = new Error(code);
  const msg = cause && (cause.stderr || cause.message) ? String(cause.stderr || cause.message) : String(cause || '');
  err.detail = msg.slice(-600);
  return err;
}

async function saeRunTool(member, args, opts) {
  const { rt } = saeNeed(['rt.' + member]);
  const timeoutMs = (opts && opts.timeoutMs) || 120000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const r = await rt[member](args.map(String), true, controller.signal);
    return { stdout: String((r && r.stdout) || ''), stderr: String((r && r.stderr) || '') };
  } catch (e) {
    throw saeFail(controller.signal.aborted ? 'timeout' : 'media_failed', e);
  } finally {
    clearTimeout(timer);
  }
}

function saeFFmpeg(args, opts) { return saeRunTool('runFFmpeg', args, opts); }
function saeFFprobe(args, opts) { return saeRunTool('runFFprobe', args, opts); }

async function saeProbeDuration(file, opts) {
  const r = await saeFFprobe(['-v', 'error', '-show_entries', 'format=duration', '-of', 'json', file], opts || { timeoutMs: 30000 });
  let seconds = NaN;
  try { seconds = Number(JSON.parse(r.stdout).format.duration); } catch (e) { seconds = NaN; }
  if (!(seconds > 0)) throw saeFail('media_failed', r.stderr || 'no duration');
  return seconds;
}

// Bytes as a fresh, 0-offset Uint8Array, whatever the host returned (Buffer from another realm, Uint8Array,
// ArrayBuffer, an IPC-serialized { type: 'Buffer', data: [...] } or a plain array).
// FileSystem results come from window.parent, another JS realm: `instanceof ArrayBuffer/Uint8Array` is false for them,
// so only realm-free checks are used here (ArrayBuffer.isView and the toString tag read internal slots, Array.isArray
// works across realms), with an array-like fallback for objects a bridge serialised by index.
function saeBytes(raw) {
  if (raw == null) return new Uint8Array(0);
  const tag = Object.prototype.toString.call(raw);
  if (ArrayBuffer.isView(raw)) {
    const out = new Uint8Array(raw.byteLength);
    out.set(new Uint8Array(raw.buffer, raw.byteOffset, raw.byteLength));
    return out;
  }
  if (tag === '[object ArrayBuffer]' || tag === '[object SharedArrayBuffer]') {
    const out = new Uint8Array(raw.byteLength);
    out.set(new Uint8Array(raw));
    return out;
  }
  if (Array.isArray(raw.data)) return Uint8Array.from(raw.data);
  if (Array.isArray(raw)) return Uint8Array.from(raw);
  if (typeof raw === 'object' && typeof raw.length === 'number' && raw.length >= 0) return Uint8Array.from({ length: raw.length }, (_, i) => Number(raw[i]) & 255);
  return new Uint8Array(0);
}

async function saeReadBytes(fs, file) {
  if (typeof fs.readFileSync === 'function') return saeBytes(fs.readFileSync(file));
  return saeBytes(await fs.readFile(file));
}

// An ffmpeg output file: missing or empty (ffmpeg resolved without writing it) is media_failed, not a raw read error.
async function saeReadOutput(fs, file, what) {
  let bytes;
  try {
    bytes = await saeReadBytes(fs, file);
  } catch (e) {
    throw saeFail('media_failed', what + ' missing: ' + String((e && e.message) || e));
  }
  if (!bytes.byteLength) throw saeFail('media_failed', 'empty ' + what);
  return bytes;
}

// Best effort; a leftover file in the data folder is harmless.
async function saeRemove(fs, file) {
  try {
    if (typeof fs.unlinkSync === 'function') return fs.unlinkSync(file);
    if (typeof fs.removeFile === 'function') return await fs.removeFile({ filePath: file });
    if (typeof fs.rmSync === 'function') return fs.rmSync(file, { force: true });
  } catch (e) { /* ignored */ }
}

function saeToken() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function saeNeedReader() {
  const di = saeDI();
  if (!di.fs || (typeof di.fs.readFileSync !== 'function' && typeof di.fs.readFile !== 'function')) {
    const err = new Error('host_tools');
    err.missing = ['fs.readFileSync'];
    throw err;
  }
}

// Mono 22050 Hz float samples of the first maxSeconds of `file` (the beat detector's input).
async function saeDecodePcm(file, dataDir, maxSeconds) {
  const { fs } = saeNeed(['rt.runFFmpeg', 'fs.join']);
  saeNeedReader();
  const out = fs.join(dataDir, 'pcm-' + saeToken() + '.f32');
  try {
    await saeFFmpeg(['-hide_banner', '-loglevel', 'error', '-nostdin', '-y', '-i', file, '-t', String(maxSeconds || 360),
      '-vn', '-ac', '1', '-ar', '22050', '-f', 'f32le', out], { timeoutMs: 120000 });
    const bytes = await saeReadOutput(fs, out, 'samples');
    if (bytes.byteLength < 4) throw saeFail('media_failed', 'no samples');
    return new Float32Array(bytes.buffer, 0, Math.floor(bytes.byteLength / 4));
  } finally {
    await saeRemove(fs, out);
  }
}

// Motion curve of a video for the stillness picker (planner SAE_STILL_WEIGHT): SAE_MOTION_FPS gray frames per second
// at a fixed SAE_MOTION_W x SAE_MOTION_H (any aspect squeezes to it; only frame-to-frame change matters), the first
// maxSeconds. saeMotionArgs and saeMotionValues are pure, so the headless driver runs the same ffmpeg argv and the
// same arithmetic in node.
const SAE_MOTION_FPS = 8;
const SAE_MOTION_W = 32;
const SAE_MOTION_H = 56;
function saeMotionArgs(file, out, maxSeconds) {
  return ['-hide_banner', '-loglevel', 'error', '-nostdin', '-y', '-i', file, '-t', String(maxSeconds || 120), '-an',
    '-vf', 'fps=' + SAE_MOTION_FPS + ',scale=' + SAE_MOTION_W + ':' + SAE_MOTION_H + ',setsar=1,format=gray', '-f', 'rawvideo', out];
}
// values[i] = mean absolute difference (0-255) between frames i and i + 1, or null when the bytes are not at least two
// whole frames.
function saeMotionValues(bytes) {
  const size = SAE_MOTION_W * SAE_MOTION_H;
  const frames = bytes && bytes.byteLength % size === 0 ? bytes.byteLength / size : 0;
  if (frames < 2) return null;
  const values = new Float32Array(frames - 1);
  for (let i = 0; i < frames - 1; i++) {
    let sum = 0;
    const a = i * size, b = a + size;
    for (let k = 0; k < size; k++) sum += Math.abs(bytes[b + k] - bytes[a + k]);
    values[i] = sum / size;
  }
  return values;
}
// { fps, values } for `file` (opts: { maxSeconds (default 120), timeoutMs (default 90000) }). Errors as above; the
// caller treats any failure as "motion unknown".
async function saeMotionCurve(file, dataDir, opts) {
  const { fs } = saeNeed(['rt.runFFmpeg', 'fs.join']);
  saeNeedReader();
  const o = opts || {};
  const out = fs.join(dataDir, 'motion-' + saeToken() + '.gray');
  try {
    await saeFFmpeg(saeMotionArgs(file, out, o.maxSeconds), { timeoutMs: o.timeoutMs || 90000 });
    const values = saeMotionValues(await saeReadOutput(fs, out, 'frames'));
    if (!values) throw saeFail('media_failed', 'too few frames');
    return { fps: SAE_MOTION_FPS, values };
  } finally {
    await saeRemove(fs, out);
  }
}

// A blob: URL of `duration` seconds from `start` (mp3 128k; WAV when the host ffmpeg has no mp3 encoder).
// The caller revokes it with URL.revokeObjectURL.
async function saePreviewUrl(file, start, duration, dataDir) {
  const { fs } = saeNeed(['rt.runFFmpeg', 'fs.join']);
  saeNeedReader();
  const token = saeToken();
  const cut = ['-hide_banner', '-loglevel', 'error', '-nostdin', '-y', '-ss', Number(start || 0).toFixed(3), '-t',
    Number(duration).toFixed(3), '-i', file, '-vn'];
  const tries = [
    { out: fs.join(dataDir, 'preview-' + token + '.mp3'), args: ['-c:a', 'libmp3lame', '-b:a', '128k', '-f', 'mp3'], type: 'audio/mpeg' },
    { out: fs.join(dataDir, 'preview-' + token + '.wav'), args: ['-ac', '2', '-ar', '44100', '-c:a', 'pcm_s16le', '-f', 'wav'], type: 'audio/wav' },
  ];
  let lastErr = null;
  for (const t of tries) {
    try {
      await saeFFmpeg(cut.concat(t.args, [t.out]), { timeoutMs: 60000 });
      const bytes = await saeReadOutput(fs, t.out, 'preview');
      return URL.createObjectURL(new Blob([bytes], { type: t.type }));
    } catch (e) {
      lastErr = e;
      if (e && (e.message === 'host_tools' || e.message === 'timeout')) break;
    } finally {
      await saeRemove(fs, t.out);
    }
  }
  throw lastErr || saeFail('media_failed', 'preview');
}

function saeLooksWindows(p) {
  return /^[A-Za-z]:([\\/]|$)/.test(p) || p.indexOf('\\') >= 0;
}

// Host paths compared NFC-normalized; when either side looks like a Windows path, also separator-normalized and
// case-folded. POSIX paths stay case-sensitive.
function saeSamePath(a, b) {
  if (a == null || b == null) return false;
  let x = String(a).normalize('NFC'), y = String(b).normalize('NFC');
  if (x === y) return true;
  if (!saeLooksWindows(x) && !saeLooksWindows(y)) return false;
  const fold = (p) => {
    let s = p.replace(/\\/g, '/');
    if (s.length > 1 && !/^[A-Za-z]:\/$/.test(s)) s = s.replace(/\/+$/, '');
    return s.toLowerCase();
  };
  return fold(x) === fold(y);
}

function saeBaseName(p) {
  const parts = String(p == null ? '' : p).split(/[\\/]+/).filter(Boolean);
  return (parts.length ? parts[parts.length - 1] : '').normalize('NFC');
}

// Lets the panel paint (a busy state) before a long synchronous step such as beat detection.
function saeYield() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}
// sae-host:end
