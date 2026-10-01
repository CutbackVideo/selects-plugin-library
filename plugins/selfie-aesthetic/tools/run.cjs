'use strict';
// Selfie Aesthetic Edit host helper. Usage: node run.cjs <job.json>
// Runs on macOS and Windows alike: no shell is ever involved. ffmpeg/ffprobe are spawned with execFile, paths are
// built with path.join, and every output goes to job.dataDir (never the system temp folder). User file paths travel
// inside the job JSON, never on the command line.
// stdout: exactly one JSON line (<= 2 KB). Exit status 0 on success; 1 with {"ok":false,"error":...} on failure.
// Jobs ({ job, dataDir, ... }):
//   tools      -> { ok, ffmpeg, ffprobe, node, platform }        (ffmpeg/ffprobe: absolute path or null)
//   ensureDir  -> { ok, dataDir }
//   probe      { file }                       -> { ok, duration }
//   beat       { file, maxSeconds = 360 }     -> { ok, out, bpm, firstBeat, grid, accepted, durationSeconds }
//              (the full detector result is written to <dataDir>/own-music.json)
//   preview    { file, start, duration }     -> { ok, out, bytes }  (out: a text file holding the base64 mp3)
//   cleanup    { files: [...] }               -> { ok, removed }     (refuses any path outside dataDir)
const fs = require('node:fs');
const path = require('node:path');
const { execFile } = require('node:child_process');

const MAX_LINE = 2048;
const SAMPLE_RATE = 22050;
const WIN = process.platform === 'win32';

function fail(message) { const e = new Error(message); e.expected = true; return e; }

function emit(obj) {
  let line = JSON.stringify(obj);
  if (Buffer.byteLength(line) > MAX_LINE) {
    line = JSON.stringify(obj.ok === false
      ? { ok: false, error: String(obj.error).slice(0, 1500) }
      : { ok: obj.ok, note: 'result truncated' });
  }
  process.stdout.write(line + '\n');
}

// Directories where ffmpeg lives when the host app was launched without the user's shell PATH
// (Finder-launched apps on macOS miss Homebrew; Windows package managers each use their own shim folder).
function extraToolDirs() {
  const env = process.env;
  if (WIN) {
    const dirs = [];
    if (env.ProgramFiles) dirs.push(path.join(env.ProgramFiles, 'ffmpeg', 'bin'));
    if (env.LOCALAPPDATA) dirs.push(path.join(env.LOCALAPPDATA, 'Microsoft', 'WinGet', 'Links'));
    dirs.push(path.join(env.ProgramData || 'C:\\ProgramData', 'chocolatey', 'bin'));
    if (env.USERPROFILE) dirs.push(path.join(env.USERPROFILE, 'scoop', 'shims'));
    return dirs;
  }
  if (process.platform === 'darwin') return ['/opt/homebrew/bin', '/usr/local/bin'];
  return ['/usr/local/bin', '/usr/bin'];
}

function isFile(p) { try { return fs.statSync(p).isFile(); } catch { return false; } }

function findTool(name) {
  const override = process.env['SAE_' + name.toUpperCase()];
  if (override) return isFile(override) ? override : null;
  const dirs = String(process.env.PATH || process.env.Path || '').split(path.delimiter).filter(Boolean).concat(extraToolDirs());
  const file = WIN ? name + '.exe' : name;
  for (const dir of dirs) {
    const p = path.join(dir, file);
    if (isFile(p)) return p;
  }
  return null;
}

function run(cmd, args, opts) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, Object.assign({ windowsHide: true, maxBuffer: 16 * 1024 * 1024, timeout: 10 * 60 * 1000 }, opts),
      (err, stdout, stderr) => {
        if (err) {
          const detail = String(stderr || err.message || err).trim().split(/\r?\n/).slice(-3).join(' | ');
          reject(fail(path.basename(cmd) + ' failed: ' + detail.slice(0, 600)));
        } else resolve(String(stdout));
      });
  });
}

async function toolWorks(p) {
  if (!p) return null;
  try { await run(p, ['-version'], { timeout: 15000 }); return p; } catch { return null; }
}

function needTool(name) {
  const p = findTool(name);
  if (!p) throw fail(name + ' not found. Install ffmpeg (it includes ffprobe) to analyse your own music.');
  return p;
}

function needDataDir(job) {
  if (typeof job.dataDir !== 'string' || !job.dataDir || !path.isAbsolute(job.dataDir)) throw fail('dataDir must be an absolute path');
  const dir = path.resolve(job.dataDir);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function needFile(job) {
  if (typeof job.file !== 'string' || !path.isAbsolute(job.file)) throw fail('file must be an absolute path');
  if (!isFile(job.file)) throw fail('file not found: ' + path.basename(job.file));
  return job.file;
}

function finite(v, name, min) {
  const n = Number(v);
  if (!Number.isFinite(n) || n < min) throw fail(name + ' must be a number >= ' + min);
  return n;
}

function insideDir(dir, p) {
  const norm = s => (WIN ? s.toLowerCase() : s);
  const rel = path.relative(norm(dir), norm(path.resolve(dir, p)));
  return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel);
}

function stamp() { return process.pid + '-' + Date.now().toString(36); }

function tryUnlink(p) { try { fs.unlinkSync(p); } catch { /* already gone */ } }

function loadDetector() {
  const p = process.env.SAE_BEAT_DETECT || path.join(__dirname, '..', 'beat-detect.cjs');
  if (!isFile(p)) throw fail('beat detector missing: ' + path.basename(p));
  const mod = require(p);
  if (typeof mod.analyze !== 'function') throw fail('beat detector has no analyze()');
  return mod;
}

const jobs = {
  async tools() {
    const [ffmpeg, ffprobe] = await Promise.all([toolWorks(findTool('ffmpeg')), toolWorks(findTool('ffprobe'))]);
    return { ok: true, ffmpeg, ffprobe, node: process.version, platform: process.platform };
  },

  async ensureDir(job) {
    return { ok: true, dataDir: needDataDir(job) };
  },

  async probe(job) {
    const file = needFile(job);
    const out = await run(needTool('ffprobe'), ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', file]);
    const duration = parseFloat(out.trim());
    if (!Number.isFinite(duration)) throw fail('could not read the duration');
    return { ok: true, duration: Math.round(duration * 1000) / 1000 };
  },

  async beat(job) {
    const dir = needDataDir(job);
    const file = needFile(job);
    const maxSeconds = job.maxSeconds == null ? 360 : finite(job.maxSeconds, 'maxSeconds', 1);
    const detector = loadDetector();
    const ffmpeg = needTool('ffmpeg');
    const raw = path.join(dir, 'own-music-' + stamp() + '.f32');
    try {
      await run(ffmpeg, ['-v', 'error', '-nostdin', '-y', '-t', String(maxSeconds), '-i', file,
        '-vn', '-ac', '1', '-ar', String(SAMPLE_RATE), '-f', 'f32le', raw]);
      const buf = fs.readFileSync(raw);
      if (buf.byteLength < 4 * SAMPLE_RATE) throw fail('the audio is shorter than one second');
      const samples = new Float32Array(buf.buffer, buf.byteOffset, Math.floor(buf.byteLength / 4));
      const result = detector.analyze(samples, SAMPLE_RATE);
      const out = path.join(dir, 'own-music.json');
      fs.writeFileSync(out, JSON.stringify(Object.assign({ source: file, sampleRate: SAMPLE_RATE, maxSeconds }, result)) + '\n');
      return { ok: true, out, bpm: result.bpm, firstBeat: result.firstBeat, grid: result.grid, accepted: result.accepted,
        durationSeconds: result.durationSeconds };
    } finally {
      tryUnlink(raw);
    }
  },

  async preview(job) {
    const dir = needDataDir(job);
    const file = needFile(job);
    const start = finite(job.start == null ? 0 : job.start, 'start', 0);
    const duration = finite(job.duration, 'duration', 0.05);
    const ffmpeg = needTool('ffmpeg');
    const id = stamp();
    const mp3 = path.join(dir, 'preview-' + id + '.mp3');
    const out = path.join(dir, 'preview-' + id + '.b64.txt');
    try {
      await run(ffmpeg, ['-v', 'error', '-nostdin', '-y', '-ss', String(start), '-t', String(duration), '-i', file,
        '-vn', '-ac', '2', '-ar', '44100', '-c:a', 'libmp3lame', '-b:a', '128k', '-f', 'mp3', mp3]);
      const data = fs.readFileSync(mp3);
      if (!data.byteLength) throw fail('the preview is empty');
      fs.writeFileSync(out, data.toString('base64'));
      return { ok: true, out, bytes: data.byteLength };
    } finally {
      tryUnlink(mp3);
    }
  },

  async cleanup(job) {
    const dir = needDataDir(job);
    if (!Array.isArray(job.files)) throw fail('files must be an array');
    for (const f of job.files) {
      if (typeof f !== 'string' || !f || !insideDir(dir, f)) throw fail('refusing to delete outside dataDir: ' + String(f).slice(0, 200));
    }
    let removed = 0;
    for (const f of job.files) {
      const p = path.resolve(dir, f);
      if (isFile(p)) { fs.unlinkSync(p); removed++; }
    }
    return { ok: true, removed };
  },
};

async function main() {
  const jobPath = process.argv[2];
  if (!jobPath) throw fail('usage: node run.cjs <job.json>');
  let job;
  try { job = JSON.parse(fs.readFileSync(jobPath, 'utf8')); } catch (e) { throw fail('cannot read job: ' + (e && e.message || e)); }
  if (!job || typeof job !== 'object' || !Object.prototype.hasOwnProperty.call(jobs, job.job)) throw fail('unknown job: ' + String(job && job.job).slice(0, 100));
  return jobs[job.job](job);
}

main().then(emit, e => {
  emit({ ok: false, error: String(e && e.message || e) });
  process.exitCode = 1;
});
