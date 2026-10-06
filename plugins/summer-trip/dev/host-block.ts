// st-host:start
// Local files, media tools and environment use the public SDK.
// Missing capabilities report the existing host-tools error to the panel UI.
let hostSdk = null;
function hostUseSdk(sdk) { hostSdk = sdk; }
function hostDI() { return { fs: hostSdk?.files, rt: hostSdk?.media }; }

// names: ['fs.join', 'rt.runFFmpeg', ...]. Returns { ok, missing }.
function hostHas(names) {
  const di = hostDI();
  const missing = [];
  for (const name of names || []) {
    const dot = String(name).indexOf('.');
    const svc = di[String(name).slice(0, dot)];
    if (!svc || typeof svc[String(name).slice(dot + 1)] !== 'function') missing.push(String(name));
  }
  return { ok: missing.length === 0, missing };
}

function hostError(code, message, extra) {
  return Object.assign(new Error(message), { code }, extra || {});
}

function hostNeed(names) {
  const has = hostHas(names);
  if (!has.ok) throw hostError('host_tools', 'this Selects build has no ' + has.missing.join(', '), { missing: has.missing });
  return hostDI();
}

function hostPlatform() { return hostSdk?.environment?.platform || ""; }

// Joins path parts with the host's join (the OS separator).
function hostJoin(...parts) {
  const { fs } = hostNeed(['fs.join']);
  return String(fs.join(...parts.map(String)));
}

// The installed plugin folder (the host's SELECTS_USER_SKILLS_ROOT is the user's .selects/skills), or null when the
// folder lacks `marker` (a file every install has).
async function hostSkillsDir(id, marker) {
  const { fs } = hostNeed(['fs.join', 'fs.homedir', 'fs.exists']);
  const dir = String(fs.join(fs.homedir(), '.selects', 'skills', id));
  try { return (await fs.exists(fs.join(dir, marker))) ? dir : null; } catch (e) { return null; }
}

// The plugin's persistent data folder, created when missing.
async function hostDataDir(id) {
  const { fs } = hostNeed(['fs.join', 'fs.homedir', 'fs.mkdir']);
  const dir = String(fs.join(fs.homedir(), '.selects', 'plugin-data', id));
  (await fs.mkdir(dir, { recursive: true }));
  return dir;
}

// A folder, created with its parents when missing.
async function hostMkdir(dir) {
  const { fs } = hostNeed(['fs.mkdir']);
  (await fs.mkdir(dir, { recursive: true }));
  return dir;
}

function hostFail(code, cause, what) {
  const msg = cause && (cause.stderr || cause.message) ? String(cause.stderr || cause.message) : String(cause || '');
  const detail = msg.trim().slice(-600);
  const text = code === 'timeout' ? (what || 'ffmpeg') + ' took too long' : code === 'cancelled' ? 'cancelled' : (what || 'ffmpeg') + ' failed' + (detail ? ': ' + detail : '');
  return hostError(code, text, { detail });
}

// One ffmpeg/ffprobe run. opts: { timeoutMs (default 120000), signal (the caller's AbortSignal, optional) }.
async function hostRunTool(member, args, opts) {
  const { rt } = hostNeed(['rt.' + member]);
  const o = opts || {};
  const what = member === 'runFFprobe' ? 'ffprobe' : 'ffmpeg';
  if (o.signal && o.signal.aborted) throw hostFail('cancelled', null, what);
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, o.timeoutMs || 120000);
  const relay = () => controller.abort();
  if (o.signal) o.signal.addEventListener('abort', relay);
  try {
    const r = await rt[member](args.map(String), true, controller.signal);
    return { stdout: String((r && r.stdout) || ''), stderr: String((r && r.stderr) || '') };
  } catch (e) {
    throw hostFail(timedOut ? 'timeout' : controller.signal.aborted ? 'cancelled' : 'media_failed', e, what);
  } finally {
    clearTimeout(timer);
    if (o.signal) o.signal.removeEventListener('abort', relay);
  }
}

function hostFFmpeg(args, opts) { return hostRunTool('runFFmpeg', args, opts); }
function hostFFprobe(args, opts) { return hostRunTool('runFFprobe', args, opts); }

// A media file's length in seconds (ffprobe's container duration).
async function hostProbeDuration(file, opts) {
  const r = await hostFFprobe(['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', file], opts || { timeoutMs: 20000 });
  const seconds = parseFloat(r.stdout.trim());
  if (!(seconds > 0)) throw hostFail('media_failed', r.stderr || 'no duration', 'ffprobe');
  return seconds;
}

// Bytes as a fresh, 0-offset Uint8Array, whatever the host returned (a Buffer from another realm, Uint8Array,
// ArrayBuffer, an IPC-serialized { type: 'Buffer', data: [...] } or a plain array). FileSystem results come from
// the bridge, possibly another JS realm: `instanceof ArrayBuffer/Uint8Array` is false for them, so only realm-free checks are
// used (ArrayBuffer.isView and the toString tag read internal slots, Array.isArray works across realms), with an
// array-like fallback for objects a bridge serialised by index.
function hostBytes(raw) {
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

// Require the asynchronous SDK reader.
function hostNeedReader() {
  const { fs } = hostDI();
  if (!fs || typeof fs.readFile !== 'function') {
    throw hostError('host_tools', 'this Selects build has no FileSystem.readFile', { missing: ['fs.readFile'] });
  }
  return fs;
}

async function hostReadRaw(file) {
  const fs = hostNeedReader();
  return await fs.readFile(file);
}

// Read a file's bytes through the SDK.
async function hostReadBytes(file) {
  const raw = await hostReadRaw(file);
  if (typeof raw === 'string') throw hostError('media_failed', 'the file came back as text');
  return hostBytes(raw);
}

// A text file as UTF-8 (some host builds return text directly, others bytes).
async function hostReadText(file) {
  const raw = await hostReadRaw(file);
  return typeof raw === 'string' ? raw : new TextDecoder().decode(hostBytes(raw));
}

// An ffmpeg output file: missing or empty (ffmpeg resolved without writing it) is media_failed, not a raw read error.
async function hostReadOutput(file, what) {
  let bytes;
  try {
    bytes = await hostReadBytes(file);
  } catch (e) {
    if (e && e.code === 'host_tools') throw e;
    throw hostFail('media_failed', what + ' missing: ' + String((e && e.message) || e));
  }
  if (!bytes.byteLength) throw hostFail('media_failed', 'empty ' + what);
  return bytes;
}

// Write bytes through the SDK.
async function hostWriteBytes(file, bytes) {
  const { fs } = hostDI();
  if (fs && typeof fs.writeFile === 'function') return await fs.writeFile(file, bytes);
  throw hostError('host_tools', 'this Selects build has no FileSystem.writeFile', { missing: ['fs.writeFile'] });
}

// A file's size in bytes, 0 when it is missing (stat; without it, exists says 1 for "there").
async function hostFileSize(file) {
  const { fs } = hostDI();
  try {
    if (fs && typeof fs.stat === 'function') { const s = (await fs.stat(file)); return s && s.size > 0 ? Number(s.size) : 0; }
    if (fs && typeof fs.exists === 'function') return (await fs.exists(file)) ? 1 : 0;
  } catch (e) { return 0; }
  return 0;
}

// Moves a finished file into place (FileSystem.rename).
async function hostRename(from, to) {
  const { fs } = hostNeed(['fs.rename']);
  (await fs.rename(from, to));
}

// The names in a folder, [] when it cannot be listed.
async function hostList(dir) {
  const { fs } = hostDI();
  try { return fs && typeof fs.readdir === 'function' ? Array.from((await fs.readdir(dir)) || [], String) : []; } catch (e) { return []; }
}

// Best effort; a leftover file in the data folder is harmless.
async function hostRemove(file) {
  const { fs } = hostDI();
  if (!fs) return;
  try {
    if (typeof fs.removeFile === 'function') return await fs.removeFile({ filePath: file });
  } catch (e) { /* ignored */ }
}

// An ASCII token for temporary file names.
function hostToken() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// Mono 32-bit float samples of `file` at `rate`, at most `maxSeconds`: the host's ffmpeg decodes into a temporary file
// in `dataDir`, which is read back and removed. The arguments are the ones the beat-detect CLI path always used
// (`ffmpeg -nostdin -v error -y -t <max> -i <file> -ac 1 -ar <rate> -f f32le <out>`), so the panel analyses the same
// samples. opts: { signal, timeoutMs (default 120000) }.
async function hostDecodePcm(file, dataDir, rate, maxSeconds, opts) {
  hostNeed(['rt.runFFmpeg', 'fs.join']);
  hostNeedReader();
  const out = hostJoin(dataDir, 'pcm-' + hostToken() + '.f32');
  try {
    await hostFFmpeg(['-nostdin', '-v', 'error', '-y', '-t', String(maxSeconds), '-i', file, '-ac', '1', '-ar', String(rate), '-f', 'f32le', out],
      { timeoutMs: (opts && opts.timeoutMs) || 120000, signal: opts && opts.signal });
    const bytes = await hostReadOutput(out, 'samples');
    if (bytes.byteLength < 4) throw hostFail('media_failed', 'no samples');
    return new Float32Array(bytes.buffer, 0, Math.floor(bytes.byteLength / 4));
  } finally {
    await hostRemove(out);
  }
}

// A blob: URL that plays `seconds` of `file` from `start`, mono 22.05 kHz with a `fade`-second fade-out: mp3 48k, or WAV
// when the host's ffmpeg has no mp3 encoder. Leftover preview-* files in `dataDir` (an earlier panel that closed
// mid-preview) are removed first; the new file is removed once read. The caller revokes the URL.
async function hostPreviewUrl(file, start, seconds, dataDir, fade) {
  hostNeed(['rt.runFFmpeg', 'fs.join']);
  hostNeedReader();
  for (const name of (await hostList(dataDir))) if (/^preview-.*\.(mp3|wav|b64)$/.test(name)) await hostRemove(hostJoin(dataDir, name));
  const token = hostToken();
  const f = fade > 0 ? fade : 0;
  const cut = ['-nostdin', '-v', 'error', '-y', '-ss', Number(start || 0).toFixed(2), '-t', Number(seconds).toFixed(2), '-i', file, '-ac', '1', '-ar', '22050'];
  const af = ['-af', 'afade=t=out:st=' + Math.max(0, Number(seconds) - f).toFixed(2) + ':d=' + f];
  const tries = [
    { out: hostJoin(dataDir, 'preview-' + token + '.mp3'), args: ['-b:a', '48k'].concat(af, ['-f', 'mp3']), type: 'audio/mpeg' },
    { out: hostJoin(dataDir, 'preview-' + token + '.wav'), args: af.concat(['-c:a', 'pcm_s16le', '-f', 'wav']), type: 'audio/wav' },
  ];
  let lastErr = null;
  for (const t of tries) {
    try {
      await hostFFmpeg(cut.concat(t.args, [t.out]), { timeoutMs: 60000 });
      const bytes = await hostReadOutput(t.out, 'preview');
      return URL.createObjectURL(new Blob([bytes], { type: t.type }));
    } catch (e) {
      lastErr = e;
      if (e && (e.code === 'host_tools' || e.code === 'timeout')) break;
    } finally {
      await hostRemove(t.out);
    }
  }
  throw lastErr || hostFail('media_failed', 'preview');
}

function hostLooksWindows(p) {
  return /^[A-Za-z]:([\\/]|$)/.test(p) || p.indexOf('\\') >= 0;
}

// Host paths compared NFC-normalized; when either side looks like a Windows path, also separator-normalized and
// case-folded. POSIX paths stay case-sensitive.
function hostSamePath(a, b) {
  if (a == null || b == null) return false;
  let x = String(a).normalize('NFC'), y = String(b).normalize('NFC');
  if (x === y) return true;
  if (!hostLooksWindows(x) && !hostLooksWindows(y)) return false;
  const fold = (p) => {
    let s = p.replace(/\\/g, '/');
    if (s.length > 1 && !/^[A-Za-z]:\/$/.test(s)) s = s.replace(/\/+$/, '');
    return s.toLowerCase();
  };
  return fold(x) === fold(y);
}

function hostBaseName(p) {
  const parts = String(p == null ? '' : p).split(/[\\/]+/).filter(Boolean);
  return (parts.length ? parts[parts.length - 1] : '').normalize('NFC');
}

// SHA-256 of bytes as lowercase hex, in plain JS (the panel's origin may have no crypto.subtle). Same digest as
// `shasum -a 256`, so file names keyed on it stay the same as before.
function hostSha256Hex(bytes) {
  const K = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01,
    0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f,
    0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70,
    0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
    0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
  const H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  const n = bytes.length;
  // The message, a 0x80 byte, zeros, and the bit length (big-endian, 64 bits) to a multiple of 64 bytes.
  const total = Math.ceil((n + 9) / 64) * 64;
  const tail = new Uint8Array(total - Math.floor(n / 64) * 64);
  const full = Math.floor(n / 64) * 64;
  tail.set(bytes.subarray(full));
  tail[n - full] = 0x80;
  const bits = n * 8;
  const t = tail.length;
  tail[t - 1] = bits & 255; tail[t - 2] = (bits >>> 8) & 255; tail[t - 3] = (bits >>> 16) & 255; tail[t - 4] = (bits >>> 24) & 255;
  const hi = Math.floor(bits / 4294967296);
  tail[t - 5] = hi & 255; tail[t - 6] = (hi >>> 8) & 255; tail[t - 7] = (hi >>> 16) & 255; tail[t - 8] = (hi >>> 24) & 255;
  const w = new Int32Array(64);
  const block = (src, at) => {
    for (let i = 0; i < 16; i++) w[i] = (src[at + 4 * i] << 24) | (src[at + 4 * i + 1] << 16) | (src[at + 4 * i + 2] << 8) | src[at + 4 * i + 3];
    for (let i = 16; i < 64; i++) {
      const a = w[i - 15], b = w[i - 2];
      const s0 = ((a >>> 7) | (a << 25)) ^ ((a >>> 18) | (a << 14)) ^ (a >>> 3);
      const s1 = ((b >>> 17) | (b << 15)) ^ ((b >>> 19) | (b << 13)) ^ (b >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
    }
    let a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
    for (let i = 0; i < 64; i++) {
      const S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
      const t1 = (h + S1 + ((e & f) ^ (~e & g)) + K[i] + w[i]) | 0;
      const S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
      const t2 = (S0 + ((a & b) ^ (a & c) ^ (b & c))) | 0;
      h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
    }
    H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0;
    H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
  };
  for (let at = 0; at < full; at += 64) block(bytes, at);
  for (let at = 0; at < t; at += 64) block(tail, at);
  return H.map((x) => (x >>> 0).toString(16).padStart(8, '0')).join('');
}
// st-host:end
