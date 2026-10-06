// @name Portrait Beat Montage
// @name:de Portrait Beat Montage
// @name:en Portrait Beat Montage
// @name:es Portrait Beat Montage
// @name:fr Portrait Beat Montage
// @name:it Portrait Beat Montage
// @name:ja Portrait Beat Montage
// @name:ko Portrait Beat Montage
// @name:pt Portrait Beat Montage
// @name:tr Portrait Beat Montage
// @name:zh Portrait Beat Montage
// @collection visual-highlights
// @icon video
// Builds a 3:4 portrait montage: a monochrome strobe, fifteen beat-cut shots that
// enter on a person-only zigzag smear with a warm flash, and a white glow ending.
import React from "react";

const PLUGIN = "portrait-beat-montage";
const SHOTS = 10;
const MIN_SECONDS = 1.1;
const json = JSON.stringify;

// av-host:start
// Local files and media tools use the public async SDK. Paths remain host-native.
let hostSdk = null;
function hostUseSdk(sdk) { hostSdk = panelLocalClient(sdk); }
function hostError(code, message, member = "") { return Object.assign(new Error(message), { code, member }); }
// A host service when it has every named method, else null.
function hostApi(name, ...methods) {
  const s = name === "FileSystem" ? hostSdk?.files : name === "Runtime" ? hostSdk?.media : null;
  return s && methods.every((m) => typeof s[m] === "function") ? s : null;
}
// A host service that must have `method`; throws a 'host-missing' error when this build lacks it.
function hostNeed(name, method) {
  const s = hostApi(name, method);
  if (!s) throw hostError("host-missing", "Update Selects to use this plugin: missing SDK " + name + "." + method, name + "." + method);
  return s;
}
// The host initializes the environment before mounting the panel.
function hostIsWindows() { return /^win/i.test(String(hostSdk?.environment?.platform || "")); }
// Joins path parts with the host's join (the OS separator), or by hand with the OS separator.
function hostJoin(...parts) {
  const fs = hostApi("FileSystem", "join");
  if (fs) { try { return String(fs.join(...parts)); } catch { /* join by hand */ } }
  const sep = hostIsWindows() ? "\\" : "/";
  return parts.filter((x) => x !== "").map((x, i) => (i === 0 ? x.replace(/[\\/]+$/, "") : x.replace(/^[\\/]+|[\\/]+$/g, ""))).join(sep);
}
// A Buffer, ArrayBuffer or typed array as bytes (a Buffer may be a view into a larger pool). The value comes from the
// host window (window.parent), another JavaScript realm, so `instanceof ArrayBuffer` is false for it: the checks use
// the internal [[Class]] tag and array-likeness instead.
function hostBytes(v) {
  const tag = (x) => Object.prototype.toString.call(x);
  if (tag(v) === "[object ArrayBuffer]") return new Uint8Array(v);
  if (v && typeof v.byteLength === "number" && v.buffer && tag(v.buffer) === "[object ArrayBuffer]") {
    return new Uint8Array(v.buffer, v.byteOffset || 0, v.byteLength);
  }
  if (v && typeof v === "object" && typeof v.length === "number") return Uint8Array.from(v);
  throw hostError("read-failed", "the file could not be read");
}
// A file's bytes (FileSystem.readFile without an encoding).
async function hostReadBytes(path) {
  const v = await hostNeed("FileSystem", "readFile").readFile(path);
  if (typeof v === "string") throw hostError("read-failed", "the file came back as text");
  return hostBytes(v);
}
// A text file (some host builds return text directly, others bytes).
async function hostReadText(path) {
  const v = await hostNeed("FileSystem", "readFile").readFile(path);
  return typeof v === "string" ? v : new TextDecoder().decode(hostBytes(v));
}
// Cleanup is best effort; all disk operations cross the async SDK bridge.
async function hostRemove(path) {
  try { await hostNeed("FileSystem", "removeFile").removeFile({ filePath: path }); } catch { /* leftover temporary file */ }
}
async function hostRoots(sdk, id, marker) {
  hostUseSdk(sdk);
  const fs = hostNeed("FileSystem", "exists");
  const plugin = fs.join(fs.homedir(), ".selects", "skills", id);
  if (!await fs.exists(fs.join(plugin, marker))) throw hostError("not-found", "the plugin folder could not be found");
  let data = fs.join(fs.homedir(), ".selects", "plugin-data", id);
  try { await fs.mkdir(data, { recursive: true }); } catch { data = null; }
  return { plugin, data };
}
// Mono 32-bit float samples of an audio file at `rate`, at most `maxSeconds`, decoded by the host's ffmpeg into a
// temporary file in `dataDir` and read back (the file is removed). null when this host has no ffmpeg or no data folder;
// throws when ffmpeg fails or `signal` (optional) aborts it.
async function hostDecodePcm(path, dataDir, rate, maxSeconds, signal, timeoutMs = 120000) {
  const rt = hostApi("Runtime", "runFFmpeg");
  if (!rt || !dataDir || !hostApi("FileSystem", "readFile")) return null;
  const tmp = hostJoin(dataDir, "pcm-" + Date.now() + "-" + Math.floor(Math.random() * 1e6) + ".f32");
  const controller = typeof AbortController === "undefined" ? null : new AbortController();
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  const relay = () => { if (controller) controller.abort(); };
  if (signal) { if (signal.aborted) relay(); else signal.addEventListener("abort", relay); }
  try {
    await rt.runFFmpeg(["-nostdin", "-v", "error", "-y", "-t", String(maxSeconds), "-i", path, "-ac", "1", "-ar", String(rate), "-f", "f32le", tmp], true, controller ? controller.signal : undefined);
    const bytes = await hostReadBytes(tmp);
    // A copy, so the samples sit on a 4-byte boundary.
    const samples = new Float32Array(bytes.slice(0, Math.floor(bytes.byteLength / 4) * 4).buffer);
    if (!samples.length) throw hostError("decode-failed", "ffmpeg returned no audio");
    return samples;
  } finally {
    if (timer) clearTimeout(timer);
    if (signal) signal.removeEventListener("abort", relay);
    await hostRemove(tmp);
  }
}
// An audio or video file's length in seconds from the host's ffprobe, or null.
async function hostProbeSeconds(path) {
  try {
    const rt = hostApi("Runtime", "runFFprobe");
    if (!rt) return null;
    const r = await rt.runFFprobe(["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", path], true);
    const v = parseFloat(String(r?.stdout || "").trim());
    return v > 0 ? v : null;
  } catch { return null; }
}
// av-host:end

// The macOS pipeline (pipeline.py: numpy, Pillow, RVM on onnxruntime) runs on a private Python that rvm/setup.sh
// installs for macOS arm64 only, through POSIX shell; it sits in mac-only regions whose entries refuse Windows with
// this line. Windows builds with the in-panel engine (pbm-engine) instead.
const MAC_ONLY_TEXT = { en: "Available on macOS for now.", de: "Vorerst nur auf macOS verfügbar.", es: "Disponible solo en macOS por ahora.", fr: "Disponible sur macOS pour le moment.", it: "Per ora disponibile solo su macOS.", ja: "現在はmacOSでのみ利用できます。", ko: "\uc9c0\uae08\uc740 macOS\uc5d0\uc11c\ub9cc \uc0ac\uc6a9\ud560 \uc218 \uc788\uc2b5\ub2c8\ub2e4.", pt: "Disponível no macOS por enquanto.", tr: "Şimdilik yalnızca macOS’ta kullanılabilir.", zh: "目前仅在 macOS 上可用。" };
const macOnlyText = (language) => MAC_ONLY_TEXT[String(language || "").slice(0, 2).toLowerCase()] || MAC_ONLY_TEXT.en;
const macOnlyError = (language) => Object.assign(new Error(macOnlyText(language)), { code: "mac-only" });
// Windows person mattes spend Selects generation credits, so the panel asks first (no cost estimate API exists: the
// notice says what is sent). A Clip highlights run has no panel to ask in: starting the template counts as consent
// (product decision 2026-10-06), and plugin.json declares usesCredits.
const PLAIN_TEXT = {en: "{n} shots could not use a person cutout, so they use the plain footage.", de: "Bei {n} Einstellungen war kein Personen-Freisteller möglich. Sie verwenden das Originalvideo.", es: "En {n} planos no se pudo recortar a una persona, por lo que se usa el vídeo original.", fr: "Le détourage d’une personne était impossible dans {n} plans. Ils utilisent la vidéo d’origine.", it: "In {n} inquadrature non è stato possibile ritagliare una persona, quindi viene usato il video originale.", ja: "{n}ショットで人物を切り抜けなかったため、元の映像を使用しています。", ko: "{n}\uac1c \uc0f7\uc5d0\uc11c \uc778\ubb3c\uc744 \ubd84\ub9ac\ud560 \uc218 \uc5c6\uc5b4 \uc6d0\ubcf8 \uc601\uc0c1\uc744 \uc0ac\uc6a9\ud588\uc2b5\ub2c8\ub2e4.", pt: "Não foi possível recortar uma pessoa em {n} planos, por isso usam o vídeo original.", tr: "{n} çekimde kişi ayrıştırılamadığı için orijinal görüntü kullanıldı.", zh: "{n} 个镜头无法进行人物抠像，因此使用原始画面。"};
const plainText = (language, count) => count ? pick(PLAIN_TEXT, language).replace("{n}", String(count)) : "";
const COST_TEXT = {en: "This sends about {s} s of video ({n} shots) to Selects background removal, which uses generation credits. A rebuild reuses the result.", de: "Dabei werden etwa {s} s Video ({n} Einstellungen) an die Hintergrundentfernung von Selects gesendet, die Generierungs-Credits verbraucht. Ein erneuter Aufbau verwendet das Ergebnis wieder.", es: "Se envían unos {s} s de vídeo ({n} planos) a la eliminación de fondo de Selects, que usa créditos de generación. Al volver a crearlo se reutiliza el resultado.", fr: "Environ {s} s de vidéo ({n} plans) seront envoyées à la suppression d’arrière-plan de Selects, qui utilise des crédits de génération. Une nouvelle création réutilise le résultat.", it: "Vengono inviati circa {s} s di video ({n} inquadrature) alla rimozione dello sfondo di Selects, che usa crediti di generazione. Ricreando il montaggio il risultato viene riutilizzato.", ja: "約{s}秒の動画（{n}ショット）をSelectsの背景除去に送信します。生成クレジットを使用します。作り直す場合は結果を再利用します。", ko: "\uc57d {s}\ucd08 \ubd84\ub7c9\uc758 \uc601\uc0c1({n}\uac1c \uc0f7)\uc744 Selects \ubc30\uacbd \uc81c\uac70\ub85c \ubcf4\ub0c5\ub2c8\ub2e4. \uc0dd\uc131 \ud06c\ub808\ub527\uc774 \uc0ac\uc6a9\ub429\ub2c8\ub2e4. \ub2e4\uc2dc \ub9cc\ub4e4 \ub54c\ub294 \uacb0\uacfc\ub97c \uc7ac\uc0ac\uc6a9\ud569\ub2c8\ub2e4.", pt: "Isto envia cerca de {s} s de vídeo ({n} planos) para a remoção de fundo do Selects, que usa créditos de geração. Ao recriar, o resultado é reutilizado.", tr: "Bu işlem yaklaşık {s} sn videoyu ({n} çekim) Selects arka plan kaldırmaya gönderir ve üretim kredisi kullanır. Yeniden oluşturmada sonuç tekrar kullanılır.", zh: "这会将约 {s} 秒视频（{n} 个镜头）发送到 Selects 背景移除，并消耗生成额度。重新生成时会复用结果。"};
const COST_GO = {en: "Use credits and continue", de: "Credits verwenden und fortfahren", es: "Usar créditos y continuar", fr: "Utiliser des crédits et continuer", it: "Usa i crediti e continua", ja: "クレジットを使って続行", ko: "\ud06c\ub808\ub527 \uc0ac\uc6a9\ud558\uace0 \uacc4\uc18d", pt: "Usar créditos e continuar", tr: "Kredi kullan ve devam et", zh: "使用额度并继续"};
const COST_STOP = {en: "Cancel", de: "Abbrechen", es: "Cancelar", fr: "Annuler", it: "Annulla", ja: "キャンセル", ko: "\ucde8\uc18c", pt: "Cancelar", tr: "İptal", zh: "取消"};
const pick = (table, language) => table[String(language || "").slice(0, 2).toLowerCase()] || table.en;
const costText = (language, seconds, shots) => pick(COST_TEXT, language).replace("{s}", String(Math.round(seconds * 10) / 10)).replace("{n}", String(shots));

// @operation-start
// The in-panel port of pipeline.py (Windows has no Python): its timeline, the ffmpeg argv it runs, as
// Runtime.runFFmpeg argv (no "ffmpeg" argv[0], no shell), and its pixel functions (pbmKernels). The Windows engine
// (pbm-engine) runs them; macOS keeps pipeline.py with RVM. tests/portrait_beat_montage*.test.mjs check them against
// pipeline.py. Where pipeline.py reads ffmpeg's stdout or writes its stdin ("-"), these name a file in the run folder.
export const W = 540;
export const H = 720;
export const FPS = 60;
export const DRAFT_FPS = 30000 / 1001;
export const BLACK = 370;
export const PERIOD = .6445104895;
export const TAIL = 30;
export const RISER_START = 300;
export const SRC_FRAMES = 60;
export const MATTE_FRAMES = 30;
export const POST = 21;
// Python's round() (half to even), so a beat that lands on .5 rounds as pipeline.py does.
const pyRound = (x) => { const f = Math.floor(x), d = x - f; return d > .5 || (d === .5 && f % 2 !== 0) ? f + 1 : f; };
export const BEATS = Array.from({ length: 16 }, (_, i) => pyRound(i * PERIOD * FPS));
export const LENGTHS = BEATS.slice(1).map((b, i) => b - BEATS[i]);
export const SLOTS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 1, 2, 3, 4, 5];
export const REPEAT_FROM = 10;
export const TOTAL = BLACK + BEATS[BEATS.length - 1] + TAIL;
export const BOUNDARIES = BEATS.slice(0, -1).map((b) => BLACK + b);
export const STROBE = [139, 139, 224, 224, 224, 253, 253, 224, 224, 224, 0, 0, 139, 139, 139, 224, 224, 253, 253, 253, 224, 224, 0, 0, 0, 139, 139, 224, 224, 224, 253, 253, 139, 139, 139, 0, 0, 139, 139, 139, 224, 224, 224, 224, 224, 139, 139, 0, 0, 0, 139, 139, 253, 253, 253, 195, 195, 139, 139, 139, 167, 167, 0, 0, 0, 253, 253, 0, 0, 0, 253, 253, 0, 0, 0, 253, 253, 0, 0, 0, 253, 253, 83, 83, 83, 167, 167, 167, 167, 167, 0, 0, 167, 167, 167, 83, 83, 83, 83, 83, 167, 167, 167, 167, 167, 0, 0, 84, 84, 84, 253, 253, 167, 167, 167, 0, 0, 167, 167, 167];
export const STROBE_START = BLACK - STROBE.length;
export const GLOW = [240, 233, 226, 219, 210, 210, 186, 186, 186, 162, 162, 139, 139, 139, 116, 116, 91, 91, 91, 68, 68, 45, 45, 45, 22, 22];
// A number as Python's str() writes it (3.0, not 3), so argv text matches pipeline.py.
export const pyStr = (x) => Number.isInteger(x) ? x.toFixed(1) : String(x);
export const draftFrame = (masterFrame) => Math.floor(masterFrame / FPS * DRAFT_FPS + .5);
// Draft-rate pieces: strobe, 15 shots, glow. Black before the strobe is a Draft gap.
export function segments() {
  const marks = [STROBE_START, ...BOUNDARIES, BLACK + BEATS[BEATS.length - 1], TOTAL];
  const names = ["strobe", ...Array.from({ length: 15 }, (_, n) => "shot" + String(n + 1).padStart(2, "0")), "glow"];
  return names.map((name, i) => ({ name, start: draftFrame(marks[i]), end: draftFrame(marks[i + 1]) }));
}
// 3:4 crop. Tall footage keeps the top of the frame (headroom), wide footage is centred.
export function cropFilter(w, h) {
  const even = (x) => Math.floor(Math.trunc(x) / 2) * 2;
  if (h * 3 >= w * 4) { const ch = even(w * 4 / 3); return `crop=${w}:${ch}:0:${even((h - ch) * .125)}`; }
  const cw = even(h * 3 / 4);
  return `crop=${cw}:${h}:${Math.floor(Math.floor((w - cw) / 2) / 2) * 2}:0`;
}
export const probeArgs = (path) => ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height,r_frame_rate:stream_side_data=rotation:format=duration", "-of", "json", path];
// Grey 135x180 frames at 24 fps of the first 30 s, for the motion score of each window start.
export const motionArgs = (path, info, out) => ["-v", "error", "-t", "30", "-i", path, "-vf", cropFilter(info.width, info.height) + ",fps=24,scale=135:180,format=gray", "-f", "rawvideo", out];
// One shot window: 1 s of source cropped to 3:4, motion-interpolated to 60 fps. setsar=1: footage with non-square pixels
// (e.g. SAR 853:854) would otherwise carry its SAR into the clip, and the matte request's concat refuses mixed SARs.
export const unitSourceArgs = (unit, out) => ["-y", "-v", "error", "-ss", pyStr(unit.start), "-i", unit.path, "-vf", cropFilter(unit.width, unit.height) + `,scale=${W}:${H},setsar=1,minterpolate=fps=${FPS}:mi_mode=mci`, "-frames:v", String(SRC_FRAMES), "-an", "-c:v", "libx264", "-crf", "15", "-pix_fmt", "yuv420p", "-write_tmcd", "0", out];
export const decodeArgs = (path, count, out, vf = "format=rgb24") => ["-v", "error", "-i", path, "-vf", vf, "-frames:v", String(count), "-f", "rawvideo", "-pix_fmt", "rgb24", out];
// RVM's VP9-with-alpha cutout to one grey PNG per frame (001.png...); `pattern` is hostJoin(masks, "%03d.png").
export const matteArgs = (webm, pattern) => ["-y", "-v", "error", "-c:v", "libvpx-vp9", "-i", webm, "-vf", "alphaextract", "-frames:v", String(MATTE_FRAMES), pattern];
// One Draft piece from raw rgb24 frames (pipeline.py's Encoder, fed from a file instead of stdin).
export const encodeArgs = (raw, fps, out) => ["-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", `${W}x${H}`, "-r", String(fps), "-i", raw, "-an", "-c:v", "libx264", "-preset", "medium", "-crf", "16", "-pix_fmt", "yuv420p", "-movflags", "+faststart", out];
// ffprobe's JSON (probeArgs) as pipeline.py reads it: display size (a 90/270 rotation swaps it; the last side data wins).
export function parseProbe(text) {
  const info = JSON.parse(text), s = info.streams[0];
  let w = parseInt(s.width, 10), h = parseInt(s.height, 10), rot = 0;
  for (const side of s.side_data_list || []) rot = Math.trunc(Number(side.rotation || 0) || 0);
  if (Math.abs(rot) === 90 || Math.abs(rot) === 270) [w, h] = [h, w];
  return { width: w, height: h, duration: parseFloat(info.format.duration) };
}
// The 60 fps master frame a Draft frame shows (op_assemble's `wanted`).
export const draftMaster = (n) => Math.floor(n / DRAFT_FPS * FPS + 1e-6);
// One matte request for the whole montage: each unit's first MATTE_FRAMES source frames after MATTE_PAD copies of its
// first frame (a temporal matting model then starts every shot settled), concatenated into one 60 fps clip. Each chain
// also sets square pixels, so unit sources cached before 0.1.8 (which kept a source's SAR) still concat.
export const MATTE_PAD = 6;
export function matteConcatArgs(sources, out) {
  const chains = sources.map((_, k) => `[${k}:v]trim=end_frame=${MATTE_FRAMES},loop=loop=${MATTE_PAD}:size=1:start=0,setpts=N/(${FPS}*TB),setsar=1[v${k}]`);
  return ["-y", "-v", "error", ...sources.flatMap((s) => ["-i", s]), "-filter_complex", chains.join(";") + ";" + sources.map((_, k) => `[v${k}]`).join("") + `concat=n=${sources.length}:v=1:a=0[out]`,
    "-map", "[out]", "-an", "-c:v", "libx264", "-crf", "15", "-pix_fmt", "yuv420p", "-write_tmcd", "0", out];
}
// The returned alpha video (luma = alpha) as raw grey W x H frames at 60 fps; `invert` when white is the background.
export const matteSplitArgs = (video, out, invert = false) => ["-y", "-v", "error", "-i", video, "-vf", `fps=${FPS},scale=${W}:${H},format=gray${invert ? ",negate" : ""}`, "-f", "rawvideo", "-pix_fmt", "gray", out];
// Grey bytes of the whole clip -> one MATTE_FRAMES x W x H matte per unit (lead-ins dropped); throws on a short clip.
export function splitMattes(bytes, units) {
  const frame = W * H, per = MATTE_PAD + MATTE_FRAMES, have = Math.floor(bytes.length / frame);
  if (have < units * per) throw new Error("The person mattes came back with " + have + " frames; " + units * per + " were expected.");
  return Array.from({ length: units }, (_, u) => bytes.slice((u * per + MATTE_PAD) * frame, (u + 1) * per * frame));
}
// The pixel half of pipeline.py (window choice, background plate, the "C" smear transition, punch-in, flash, glow) as
// one self-contained function, so the panel can run it on its own thread or send its source to a Web Worker
// (`"(" + pbmKernels + ")()"`). It reproduces the shipped macOS pipeline (numpy 1.26 float32 arithmetic, Pillow 11
// GaussianBlur/MaxFilter/composite/BICUBIC) on interleaved RGB bytes; every uint8 cast sits where pipeline.py has one.
// ffmpeg filters cannot stand in for these: the smear is per-row sub-pixel shifts and trail-scaled box blurs, and
// ffmpeg's gblur is not Pillow's three-pass box blur, so the frames would drift far past the golden-frame tolerance.
export function pbmKernels() {
  const W = 540, H = 720, POST = 21, f = Math.fround, F04 = f(.04), F002 = f(.002);
  const ROUGH_B64 = "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";
  const unb64 = (s) => { const t = atob(s), b = new Uint8Array(t.length); for (let i = 0; i < t.length; i++) b[i] = t.charCodeAt(i); return b; };
  const rough = new Float64Array(unb64(ROUGH_B64).buffer);
  // numpy.interp on scalars (x inside or clamped to [xp0, xpN]).
  const interp = (x, xp, fp) => {
    if (x <= xp[0]) return fp[0];
    const n = xp.length;
    if (x >= xp[n - 1]) return fp[n - 1];
    let j = 0;
    while (xp[j + 1] <= x) j++;
    return x === xp[j] ? fp[j] : (fp[j + 1] - fp[j]) / (xp[j + 1] - xp[j]) * (x - xp[j]) + fp[j];
  };
  // numpy's pairwise sum (8 accumulators per 128-block), in float32 (`f32`) or float64.
  const pairwise = (a, lo, n, f32) => {
    const r = f32 ? f : (x) => x;
    if (n < 8) { let s = 0; for (let i = 0; i < n; i++) s = r(s + a[lo + i]); return s; }
    if (n <= 128) {
      const q = [];
      for (let j = 0; j < 8; j++) q[j] = a[lo + j];
      let i = 8;
      for (; i < n - (n % 8); i += 8) for (let j = 0; j < 8; j++) q[j] = r(q[j] + a[lo + i + j]);
      let s = r(r(r(q[0] + q[1]) + r(q[2] + q[3])) + r(r(q[4] + q[5]) + r(q[6] + q[7])));
      for (; i < n; i++) s = r(s + a[lo + i]);
      return s;
    }
    let n2 = Math.floor(n / 2); n2 -= n2 % 8;
    return r(pairwise(a, lo, n2, f32) + pairwise(a, lo + n2, n - n2, f32));
  };
  const pyRound = (x) => { const fl = Math.floor(x), d = x - fl; return d > .5 || (d === .5 && fl % 2 !== 0) ? fl + 1 : fl; };
  const smooth = (t) => { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); };
  const u8 = (v) => (v <= 0 ? 0 : v >= 255 ? 255 : Math.trunc(v));
  // Shot motion: 35 speeds, cumulative positions scaled to 38 frames (pipeline.py `positions`).
  const speeds = Array.from({ length: 35 }, (_, i) => interp(i / 34, [0, .12, .35, .68, 1], [2.25, 1.9, 1.18, .73, .55]));
  const positions = [0];
  for (const s of speeds) positions.push(positions[positions.length - 1] + s);
  const scaleTo = 38 / positions[positions.length - 1];
  for (let i = 0; i < positions.length; i++) positions[i] *= scaleTo;

  // ---- Window choice (motion_scores + choose) ----
  // `gray`: 135x180 grey frames at 24 fps; returns the start times and their scores (float32 means, as numpy).
  function motionScores(gray, duration) {
    const size = 135 * 180, n = Math.floor(gray.length / size);
    const lastStart = Math.min(n - 20, Math.trunc((duration - 1.05) * 24));
    const count = Math.max(1, lastStart + 1), starts = [], scores = [];
    for (let s = 0; s < count; s++) {
      starts.push(s / 24);
      if (s + 19 >= n) { scores.push(0); continue; }
      let sum = 0;
      const a = (s + 19) * size, b = (s + 8) * size;
      for (let i = 0; i < size; i++) sum += Math.abs(gray[a + i] - gray[b + i]);   // integers: exact in float32 too
      scores.push(f(f(sum) / size));
    }
    return { starts, scores };
  }
  const argmax = (xs) => { let k = 0; for (let i = 1; i < xs.length; i++) if (xs[i] > xs[k]) k = i; return k; };
  function choose(starts, scores, avoid) {
    if (avoid === undefined || avoid === null) return starts[argmax(scores)];
    for (const gap of [.9, .5]) {
      const ok = starts.map((s) => Math.abs(s - avoid) >= gap);
      if (ok.some(Boolean)) { const s2 = starts.filter((_, i) => ok[i]), c2 = scores.filter((_, i) => ok[i]); return s2[argmax(c2)]; }
    }
    return avoid;
  }

  // ---- Pillow kernels ----
  // ImageFilter.GaussianBlur(radius): the box radius of BoxBlur.c's _gaussian_blur_radius (C float arithmetic).
  function boxRadius(radius) {
    const r = f(radius), s2 = f(f(r * r) / 3), L = f(Math.sqrt(12 * s2 + 1)), l = f(Math.floor((L - 1) / 2));
    let a = f(f(f(2 * l) + 1) * f(f(l * f(l + 1)) - f(3 * s2)));
    a = f(a / f(6 * f(s2 - f(f(l + 1) * f(l + 1)))));
    return f(l + a);
  }
  // One ImagingLineBoxBlur line: `src` read at o + x*s for x in [0, n), written to `out` (a scratch line).
  function boxLine(src, o, s, n, rad, ww, fw, out) {
    const lastx = n - 1, edgeA = Math.min(rad + 1, n), edgeB = Math.max(n - rad - 1, 0), at = (x) => src[o + x * s];
    let acc = at(0) * (rad + 1);
    for (let x = 0; x < edgeA - 1; x++) acc += at(x);
    acc += at(lastx) * (rad - edgeA + 1);
    const save = (x, bulk) => { out[x] = Math.floor((bulk + 8388608) / 16777216); };
    if (edgeA <= edgeB) {
      for (let x = 0; x < edgeA; x++) { acc += at(x + rad) - at(0); save(x, acc * ww + (at(0) + at(x + rad + 1)) * fw); }
      for (let x = edgeA; x < edgeB; x++) { acc += at(x + rad) - at(x - rad - 1); save(x, acc * ww + (at(x - rad - 1) + at(x + rad + 1)) * fw); }
      for (let x = edgeB; x <= lastx; x++) { acc += at(lastx) - at(x - rad - 1); save(x, acc * ww + (at(x - rad - 1) + at(lastx)) * fw); }
    } else {
      for (let x = 0; x < edgeB; x++) { acc += at(x + rad) - at(0); save(x, acc * ww + (at(0) + at(x + rad + 1)) * fw); }
      for (let x = edgeB; x < edgeA; x++) { acc += at(lastx) - at(0); save(x, acc * ww + (at(0) + at(lastx)) * fw); }
      for (let x = edgeA; x <= lastx; x++) { acc += at(lastx) - at(x - rad - 1); save(x, acc * ww + (at(x - rad - 1) + at(lastx)) * fw); }
    }
  }
  // GaussianBlur on uint8 bytes, `c` interleaved channels (1 for "L", 3 for "RGB"), in place: three horizontal box
  // passes, then three vertical ones (Pillow transposes; the arithmetic is the same).
  function gaussianBlur(img, w, h, c, radius) {
    if (!(radius > 0)) return img;
    const fr = boxRadius(radius), rad = Math.trunc(fr), ww = Math.trunc(f(16777216 / f(f(fr * 2) + 1))), fw = Math.floor((16777216 - (rad * 2 + 1) * ww) / 2);
    const line = new Uint8Array(Math.max(w, h));
    for (let p = 0; p < 3; p++) for (let y = 0; y < h; y++) for (let k = 0; k < c; k++) {
      const o = y * w * c + k;
      boxLine(img, o, c, w, rad, ww, fw, line);
      for (let x = 0; x < w; x++) img[o + x * c] = line[x];
    }
    for (let p = 0; p < 3; p++) for (let x = 0; x < w; x++) for (let k = 0; k < c; k++) {
      const o = x * c + k;
      boxLine(img, o, w * c, h, rad, ww, fw, line);
      for (let y = 0; y < h; y++) img[o + y * w * c] = line[y];
    }
    return img;
  }
  // MaxFilter(size) on grey bytes (edges repeat), as two sliding-max passes (van Herk / Gil-Werman).
  function maxFilter(img, w, h, size) {
    const r = size >> 1, out = new Uint8Array(img.length);
    const pass = (src, dst, n, lines, step, lineStep) => {
      const padded = new Uint8Array(n + 2 * r), g = new Uint8Array(n + 2 * r), hh = new Uint8Array(n + 2 * r), m = n + 2 * r;
      for (let l = 0; l < lines; l++) {
        const o = l * lineStep;
        for (let i = 0; i < m; i++) padded[i] = src[o + Math.min(n - 1, Math.max(0, i - r)) * step];
        for (let i = 0; i < m; i++) g[i] = i % size === 0 ? padded[i] : Math.max(g[i - 1], padded[i]);
        for (let i = m - 1; i >= 0; i--) hh[i] = i === m - 1 || (i + 1) % size === 0 ? padded[i] : Math.max(hh[i + 1], padded[i]);
        for (let x = 0; x < n; x++) dst[o + x * step] = Math.max(hh[x], g[x + size - 1]);
      }
    };
    const tmp = new Uint8Array(img.length);
    pass(img, tmp, w, h, 1, w);
    pass(tmp, out, h, w, w, 1);
    return out;
  }
  // Image.composite(a, b, mask) = b pasted over by a through mask (Paste.c BLEND + DIV255), RGB bytes, grey mask.
  function composite(a, b, mask) {
    const out = new Uint8Array(b.length);
    for (let i = 0, p = 0; p < mask.length; p++) {
      const m = mask[p];
      for (let k = 0; k < 3; k++, i++) { const t = b[i] * (255 - m) + a[i] * m + 128; out[i] = ((t >> 8) + t) >> 8; }
    }
    return out;
  }
  // Image.resize((w2, h2), BICUBIC) of RGB bytes, cropped to W x H at (left, top) (Resample.c, 8 bpc fixed point).
  function resizeCrop(img, w, h, w2, h2, left, top) {
    const PB = 22;
    const coeffs = (inSize, outSize) => {
      const scale = inSize / outSize, fs = Math.max(scale, 1), support = 2 * fs, ksize = Math.ceil(support) * 2 + 1, out = [];
      const cubic = (x) => { const a = -.5; x = Math.abs(x); return x < 1 ? ((a + 2) * x - (a + 3)) * x * x + 1 : x < 2 ? (((x - 5) * x + 8) * x - 4) * a : 0; };
      for (let xx = 0; xx < outSize; xx++) {
        const center = (xx + .5) * scale, ss = 1 / fs;
        let xmin = Math.trunc(center - support + .5); if (xmin < 0) xmin = 0;
        let xmax = Math.trunc(center + support + .5); if (xmax > inSize) xmax = inSize; xmax -= xmin;
        const k = []; let ww = 0;
        for (let x = 0; x < xmax; x++) { const v = cubic((x + xmin - center + .5) * ss); k.push(v); ww += v; }
        out.push({ xmin, k: k.map((v) => { const n = ww === 0 ? v : v / ww; return Math.trunc(n < 0 ? -.5 + n * (1 << PB) : .5 + n * (1 << PB)); }) });
        void ksize;
      }
      return out;
    };
    const clip8 = (v) => { const x = Math.floor(v / (1 << PB)); return x < 0 ? 0 : x > 255 ? 255 : x; };
    const hx = coeffs(w, w2), vy = coeffs(h, h2);
    // Rows the kept output rows read, horizontally resampled first (as Pillow does), then the vertical pass.
    const r0 = vy[top].xmin, r1 = vy[top + H - 1].xmin + vy[top + H - 1].k.length;
    const tmp = new Uint8Array((r1 - r0) * W * 3);
    for (let y = r0; y < r1; y++) for (let x = 0; x < W; x++) {
      const { xmin, k } = hx[left + x];
      for (let c = 0; c < 3; c++) {
        let s = 1 << (PB - 1);
        for (let j = 0; j < k.length; j++) s += img[(y * w + xmin + j) * 3 + c] * k[j];
        tmp[((y - r0) * W + x) * 3 + c] = clip8(s);
      }
    }
    const out = new Uint8Array(W * H * 3);
    for (let y = 0; y < H; y++) {
      const { xmin, k } = vy[top + y];
      for (let x = 0; x < W * 3; x++) {
        let s = 1 << (PB - 1);
        for (let j = 0; j < k.length; j++) s += tmp[(xmin + j - r0) * W * 3 + x] * k[j];
        out[y * W * 3 + x] = clip8(s);
      }
    }
    return out;
  }

  // ---- background_plate ----
  // `frame` RGB bytes, `alpha0` float32 matte; returns the plate as bytes (its float32 copy holds the same integers).
  function backgroundPlate(frame, alpha0) {
    const plate = new Uint8Array(W * H * 3);
    let last = -1, median = null;
    for (let y = 0; y < H; y++) {
      const valid = [];
      for (let x = 0; x < W; x++) if (alpha0[y * W + x] < F04) valid.push(x);
      if (valid.length >= 8) {
        for (let c = 0; c < 3; c++) {
          const fp = valid.map((x) => frame[(y * W + x) * 3 + c]);
          let j = 0;
          for (let x = 0; x < W; x++) {
            let v;
            if (x <= valid[0]) v = fp[0];
            else if (x >= valid[valid.length - 1]) v = fp[fp.length - 1];
            else { while (valid[j + 1] <= x) j++; v = x === valid[j] ? fp[j] : (fp[j + 1] - fp[j]) / (valid[j + 1] - valid[j]) * (x - valid[j]) + fp[j]; }
            plate[(y * W + x) * 3 + c] = Math.trunc(v);
          }
        }
        last = y;
      } else if (last >= 0) {
        plate.copyWithin(y * W * 3, last * W * 3, (last + 1) * W * 3);
        last = y;
      } else {
        if (!median) {
          median = [0, 1, 2].map((c) => {
            const hist = new Uint32Array(256), n = W * H;
            for (let p = 0; p < n; p++) hist[frame[p * 3 + c]]++;
            const nth = (k) => { let s = 0; for (let v = 0; v < 256; v++) { s += hist[v]; if (s > k) return v; } return 255; };
            return Math.trunc((nth(n / 2 - 1) + nth(n / 2)) / 2);
          });
        }
        for (let x = 0; x < W; x++) for (let c = 0; c < 3; c++) plate[(y * W + x) * 3 + c] = median[c];
      }
    }
    const mask = new Uint8Array(W * H);
    for (let p = 0; p < mask.length; p++) mask[p] = u8(f(alpha0[p] * 255));
    const broad = gaussianBlur(maxFilter(mask, W, H, 41), W, H, 1, 18);
    return composite(gaussianBlur(plate.slice(), W, H, 3, 28), plate, broad);
  }

  // ---- transition_frames ----
  // interp_frame in float32 (numpy 1.26 casts the float64 weight to float32 first). `c` channels per pixel.
  function interpFrame(frames, count, size, pos, out) {
    const lo = Math.min(Math.trunc(pos), count - 2), t = Math.min(pos - lo, 1), a = f(1 - t), b = f(t), o0 = lo * size, o1 = o0 + size;
    for (let i = 0; i < size; i++) out[i] = f(f(frames[o0 + i] * a) + f(frames[o1 + i] * b));
    return out;
  }
  const triangle = (phase) => (2 / Math.PI) * Math.asin(Math.sin(phase));
  // shift_x then blur_x (radius >= 1) of one layer (c channels), into float32 `dst` (numpy's cumsum dtype).
  function shiftBlur(src, c, shifted, radius, dst, row, cum) {
    const n = W * c;
    for (let y = 0; y < H; y++) {
      const dx = shifted[y], o = y * n;
      for (let x = 0; x < W; x++) {
        let sx = x - dx; sx = sx < 0 ? 0 : sx > W - 1 ? W - 1 : sx;
        const x0 = Math.floor(sx), x1 = Math.min(x0 + 1, W - 1), fr = sx - x0;
        for (let k = 0; k < c; k++) row[x * c + k] = src[o + x0 * c + k] * (1 - fr) + src[o + x1 * c + k] * fr;
      }
      // np.pad(edge) + cumsum(dtype=float32) + window difference / (2r+1).
      const d = 2 * radius + 1;
      for (let k = 0; k < c; k++) {
        let s = 0; cum[k] = 0;
        for (let x = 0; x < W + 2 * radius; x++) {
          const xs = x < radius ? 0 : x >= W + radius ? W - 1 : x - radius;
          s = f(s + f(row[xs * c + k]));
          cum[(x + 1) * c + k] = s;
        }
      }
      for (let x = 0; x < W; x++) for (let k = 0; k < c; k++) dst[o + x * c + k] = f(f(cum[(x + d) * c + k] - cum[x * c + k]) / d);
    }
  }
  // horizontal_gaussian of float32 RGB.
  function horizontalGaussian(a, sigma) {
    const radius = pyRound(3 * sigma), n = 2 * radius + 1, w = new Float32Array(n), fs = f(sigma);
    for (let i = 0; i < n; i++) { const q = f(f(i - radius) / fs); w[i] = f(Math.exp(f(-.5 * f(q * q)))); }
    const total = pairwise(w, 0, n, true);
    for (let i = 0; i < n; i++) w[i] = f(w[i] / total);
    const out = new Float32Array(a.length);
    for (let y = 0; y < H; y++) {
      const o = y * W * 3;
      for (let x = 0; x < W; x++) for (let c = 0; c < 3; c++) {
        let s = 0;
        for (let k = 0; k < n; k++) { let xs = x + k - radius; xs = xs < 0 ? 0 : xs > W - 1 ? W - 1 : xs; s = f(s + f(w[k] * a[o + xs * 3 + c])); }
        out[o + x * 3 + c] = s;
      }
    }
    return out;
  }
  const LAYERS = [[-42, 24, 8.7, .1, 17, .28], [-12, 23, 11.5, 1.2, 11, .30], [18, 28, 9.7, 2.4, 14, .25], [49, 20, 15.0, 3.4, 18, .17]];
  // The 21 transition frames of one shot: `frames` 30 RGB frames (bytes), `masks` 30 float32 mattes, `plate` bytes.
  // Returns POST frames of RGB bytes, one after another. `onFrame(i)` reports progress.
  function transitionFrames(frames, masks, plate, onFrame) {
    const N = W * H, size = N * 3, out = new Uint8Array(POST * size);
    const clean = new Float32Array(size), alpha = new Float32Array(N), baseP = new Float32Array(size);
    const lp = new Float32Array(size), la = new Float32Array(N), row = new Float64Array(W * 3), cum = new Float64Array((W + 200) * 3 + 3);
    const wp = new Float32Array(size), wa = new Float32Array(N), au = new Float32Array(N), shifted = new Float64Array(H);
    for (let i = 0; i < POST; i++) {
      const pos = positions[i];
      interpFrame(frames, 30, size, pos, clean);
      interpFrame(masks, 30, N, pos, alpha);
      const wave = interp(i, [0, 2, 4, 6, 8, 10], [1, .95, .81, .48, .16, 0]);
      const trail = interp(i, [0, 2, 4, 6, 8, 10, 12, 16, 20, 24], [1, .96, .87, .73, .57, .45, .32, .17, .05, 0]);
      const direct = interp(i, [0, 2, 4, 6, 8, 10, 12, 16, 20, 24], [.02, .07, .16, .29, .42, .53, .66, .84, .95, 1]);
      const fd = f(direct);
      for (let p = 0; p < N; p++) {
        const a = alpha[p];
        for (let k = 0; k < 3; k++) { const v = f(clean[p * 3 + k] * a); baseP[p * 3 + k] = v; wp[p * 3 + k] = f(fd * v); }
        const da = f(fd * a); wa[p] = da; au[p] = da;
      }
      for (const [offset, amp, wavelength, p0, radius, weight] of LAYERS) {
        const fwl = f(wavelength), fi = f(.32 * i), fp0 = f(p0);
        for (let y = 0; y < H; y++) {
          const phase = f(f(f(y / fwl) + fi) + fp0) + .25 * rough[y];
          shifted[y] = offset * trail + amp * wave * triangle(phase) + 5 * wave * rough[y];
        }
        const r = pyRound(radius * trail), fw = f((1 - direct) * weight);
        shiftBlur(baseP, 3, shifted, r, lp, row, cum);
        shiftBlur(alpha, 1, shifted, r, la, row, cum);
        for (let q = 0; q < size; q++) wp[q] = f(wp[q] + f(fw * lp[q]));
        for (let p = 0; p < N; p++) { wa[p] = f(wa[p] + f(fw * la[p])); if (la[p] > au[p]) au[p] = la[p]; }
      }
      // color, alpha_out (float32: every layer is blurred, so the union is float32 too), premult; soften_premult
      // blurs their uint8 copies. For i < POST the schedule always blurs (layer radius >= 1, soften radius >= .4).
      const radius = interp(i, [0, 4, 6, 8, 10, 12, 16, 20, 24], [1.35, 1.05, 1.2, 1.5, 1.5, 1.1, .55, .4, 0]);
      const pm = new Uint8Array(size), am = new Uint8Array(N), F88 = f(.88);
      for (let p = 0; p < N; p++) {
        const ao = Math.max(wa[p], f(F88 * au[p])), den = Math.max(wa[p], F002);
        for (let k = 0; k < 3; k++) pm[p * 3 + k] = u8(f(f(wp[p * 3 + k] / den) * ao));
        am[p] = u8(f(ao * 255));
      }
      gaussianBlur(pm, W, H, 3, radius);
      gaussianBlur(am, W, H, 1, radius);
      const finish = smooth((i - 19) / 5), keep = f(1 - finish), ff = f(finish), comp = new Float32Array(size), aSoft = new Float32Array(N);
      for (let p = 0; p < N; p++) {
        const a = f(am[p] / 255), one = f(1 - a);
        aSoft[p] = a;
        for (let k = 0; k < 3; k++) {
          const q = p * 3 + k;
          let v = f(pm[q] + f(one * plate[q]));
          if (finish > 0) v = f(f(keep * v) + f(ff * clean[q]));
          comp[q] = v;
        }
      }
      const sigma = interp(i, [0, 8, 10, 12, 16, 20, 24], [16, 16, 12, 8, 4, 1.5, 0]);
      let result = comp;
      if (sigma > .1) {
        const m8 = new Uint8Array(N);
        for (let p = 0; p < N; p++) m8[p] = u8(f(aSoft[p] * 255));
        const strength = gaussianBlur(maxFilter(m8, W, H, 81), W, H, 1, 12), hg = horizontalGaussian(comp, sigma);
        result = new Float32Array(size);
        for (let p = 0; p < N; p++) {
          const s = f(strength[p] / 255), one = f(1 - s);
          for (let k = 0; k < 3; k++) { const q = p * 3 + k; result[q] = f(f(one * comp[q]) + f(s * hg[q])); }
        }
      }
      const o = i * size;
      for (let q = 0; q < size; q++) out[o + q] = u8(result[q]);
      if (onFrame) onFrame(i);
    }
    return out;
  }

  // ---- Assembly (emit: punch-in, flash; the glow) ----
  function settledPos(i) {
    const k = i - 20, ramp = new Float64Array(k);
    for (let j = 0; j < k; j++) ramp[j] = interp(j + 1, [1, 4], [.9, 1.0]);
    return positions[20] + pairwise(ramp, 0, k, false);
  }
  const punchScale = (offset) => (0 <= offset && offset <= 5 ? 1.11 : 5 < offset && offset <= 23 ? 1 + .11 * (1 - smooth((offset - 5) / 18)) : 1.0);
  const envelope = (offset) => (offset < 0 ? 0 : interp(offset, [0, 2, 4, 8, 12, 16, 20, 24], [1, 1, .95, .72, .47, .24, .07, 0]));
  const warmEnvelope = (offset) => (offset < 0 ? 0 : interp(offset, [0, 2, 4, 8, 12], [1, 1, .55, .10, 0]));
  // scale_center: uint8 copy (truncated), BICUBIC resize, centre crop; returns bytes (pipeline.py's float32 holds integers).
  function scaleCenter(frame, scale) {
    const src = frame instanceof Uint8Array ? frame : Uint8Array.from(frame, u8);
    const w2 = pyRound(W * scale), h2 = pyRound(H * scale);
    return resizeCrop(src, W, H, w2, h2, (w2 - W) >> 1, (h2 - H) >> 1);
  }
  // flash() in float32: exposure/saturation lift, warm tint, a soft highlight glow.
  function flash(frame, amount, warm) {
    const n = W * H * 3, rgb = new Float32Array(n);
    for (let q = 0; q < n; q++) rgb[q] = f(f(frame[q]) / 255);
    const kr = f(.2126), kg = f(.7152), kb = f(.0722), sat = f(1 + .38 * amount), gain = f(2 ** (.46 * amount));
    const tint = [f(1 + .055 * warm), f(1 + .018 * warm), f(1 - .070 * warm)];
    for (let p = 0; p < W * H; p++) {
      const o = p * 3, light = f(f(f(kr * rgb[o]) + f(kg * rgb[o + 1])) + f(kb * rgb[o + 2]));
      for (let k = 0; k < 3; k++) {
        let v = f(light + f(f(rgb[o + k] - light) * sat));
        v = f(f(v * gain) * tint[k]);
        rgb[o + k] = v < 0 ? 0 : v > 1 ? 1 : v;
      }
    }
    const glow = new Uint8Array(n);
    for (let q = 0; q < n; q++) glow[q] = u8(f(rgb[q] * 255));
    gaussianBlur(glow, W, H, 3, 11);
    const amt = f(.10 * amount), F58 = f(.58), out = new Uint8Array(n);
    for (let q = 0; q < n; q++) {
      let hl = f(f(f(glow[q] / 255) - F58) * 2); hl = hl < 0 ? 0 : hl > 1 ? 1 : hl;
      const v = f(1 - f(f(1 - rgb[q]) * f(1 - f(amt * hl))));
      out[q] = u8(f(v * 255));
    }
    return out;
  }
  // emit(): the frame as written (punch-in when scaled, then the flash), as RGB bytes.
  function emitFrame(frame, offset) {
    const scale = punchScale(offset);
    if (scale > 1.0005) frame = scaleCenter(frame, scale);
    const amount = envelope(offset);
    if (amount > 0) return flash(frame, amount, warmEnvelope(offset));
    return frame instanceof Uint8Array ? frame : Uint8Array.from(frame, u8);
  }
  // The glow frame `level` (0-255 peak).
  function glowFrame(level) {
    const out = new Uint8Array(W * H * 3);
    if (!level) return out;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const fx = f(f(x - f((W - 1) / 2)) / f(.337 * W)), fy = f(f(y - f((H - 1) / 2)) / f(.336 * H));
      const r = f(Math.sqrt(f(f(fx * fx) + f(fy * fy))));
      const g = interp(r, [0, .5, .8, 1, 1.2, 1.5, 2], [1, .91, .69, .5, .32, .09, 0]);
      const v = u8(g * level);
      out.fill(v, (y * W + x) * 3, (y * W + x) * 3 + 3);
    }
    return out;
  }
  // Master frame `m` as op_assemble's emit() writes it. `tl`: { BLACK, STROBE_START, STROBE, BOUNDARIES, END, GLOW };
  // `slot(k)`: { frames: 60 source frames, post: POST transition frames } of shot k (RGB bytes).
  function masterFrame(m, tl, slot) {
    let b = -1;
    while (b + 1 < tl.BOUNDARIES.length && m >= tl.BOUNDARIES[b + 1]) b++;
    const offset = b >= 0 ? m - tl.BOUNDARIES[b] : -1, size = W * H * 3;
    let frame;
    if (m < tl.BLACK) { frame = new Uint8Array(size); const k = m - tl.STROBE_START; if (k >= 0) frame.fill(tl.STROBE[k]); }
    else if (m < tl.END) {
      const i = m - tl.BOUNDARIES[b], s = slot(b);
      if (!s) throw new Error("shot " + (b + 1) + " is not loaded");
      frame = i < POST ? s.post.subarray(i * size, (i + 1) * size) : interpFrame(s.frames, Math.floor(s.frames.length / size), size, settledPos(i), new Float32Array(size));
    } else { const k = m - tl.END; frame = glowFrame(k < tl.GLOW.length ? tl.GLOW[k] : 0); }
    return emitFrame(frame, offset);
  }
  // The Worker's three requests (tests run the same handler on their own thread):
  //   unit  { frames: 30 RGB frames, mattes: 30 grey mattes } -> POST transition frames (progress 0-1 per frame)
  //   slot  { k, frames, post, keep: [k...] } -> keeps shot k's data for emit, drops shots not in `keep`
  //   emit  { masters: [m...], tl } -> the emitted frames, one after another
  function handle(state, op, data, progress) {
    const N = W * H;
    if (op === "unit") {
      if (data.plain) {
        const size = N * 3, post = new Uint8Array(POST * size), scratch = new Float32Array(size);
        for (let i = 0; i < POST; i++) post.set(Uint8Array.from(interpFrame(data.frames, Math.floor(data.frames.length / size), size, positions[i], scratch), u8), i * size);
        return post;
      }
      const alpha = new Float32Array(data.mattes.length);
      for (let p = 0; p < alpha.length; p++) alpha[p] = f(data.mattes[p] / 255);
      const plate = backgroundPlate(data.frames.subarray(0, N * 3), alpha.subarray(0, N));
      return transitionFrames(data.frames, alpha, plate, (i) => progress && progress((i + 1) / POST));
    }
    if (op === "slot") {
      state.slots = state.slots || new Map();
      for (const k of [...state.slots.keys()]) if (!data.keep.includes(k)) state.slots.delete(k);
      state.slots.set(data.k, { frames: data.frames, post: data.post });
      return true;
    }
    if (op === "emit") {
      const size = N * 3, out = new Uint8Array(data.masters.length * size), slots = state.slots || new Map();
      data.masters.forEach((m, j) => { out.set(masterFrame(m, data.tl, (k) => slots.get(k)), j * size); if (progress) progress((j + 1) / data.masters.length); });
      return out;
    }
    throw new Error("unknown request " + op);
  }
  return { W, H, POST, rough, masterFrame, handle, positions, interp, pyRound, motionScores, choose, boxRadius, gaussianBlur, maxFilter, composite, resizeCrop,
    backgroundPlate, interpFrame, transitionFrames, settledPos, punchScale, envelope, warmEnvelope, scaleCenter, flash, emitFrame, glowFrame };
}
// @operation-end

// mac-only:start
const quote = (value) => "'" + String(value).replace(/'/g, "'\\''") + "'";
// The pipeline runs on the RVM runtime's Python (it already has numpy and Pillow). Before setup there is no usable
// Python on a stock Mac (/usr/bin/python3 only offers to install the Xcode tools), so a step reports setup instead.
const PYTHON = `S="$SELECTS_USER_SKILLS_ROOT/portrait-beat-montage"; P="$S/rvm/.local/venv/bin/python"; [ -x "$P" ] || { echo '{"error":"RVM runtime is not set up"}'; exit 2; };`;
// The running Selects app's own ffmpeg/ffprobe (app.asar.unpacked/dist/bin), so no PATH or Homebrew ffmpeg is needed:
// the app whose Info.plist matches sdk.environment.version, otherwise the first installed. Exported to pipeline.py, which hands them to rvm/runtime.py and its detached workers; with none
// found pipeline.py looks in /Applications and then on PATH itself. Found once per panel session, by FileSystem.
const MAC_APPS = ["Selects", "Selects Staging", "Selects Alpha"];
let macToolsFound = null;
async function macTools() {
  if (macToolsFound) return macToolsFound;
  const fs = hostApi("FileSystem", "join", "exists");
  if (!fs) return "";
  const app = (name, ...rest) => fs.join("/Applications", name + ".app", "Contents", ...rest);
  const bin = (name, tool) => app(name, "Resources", "app.asar.unpacked", "dist", "bin", tool);
  const has = async (name) => { try { return !!(await fs.exists(bin(name, "ffmpeg"))) && !!(await fs.exists(bin(name, "ffprobe"))); } catch { return false; } };
  const plistVersion = async (name) => {
    try {
      const v = (await hostApi("FileSystem", "readFile").readFile(app(name, "Info.plist"), "utf8"));
      const text = typeof v === "string" ? v : new TextDecoder().decode(hostBytes(v));
      return (text.match(/<key>CFBundleShortVersionString<\/key>\s*<string>([^<]*)<\/string>/) || [])[1] || "";
    } catch { return ""; }
  };
  const installed = [];
  for (const name of MAC_APPS) if (await has(name)) installed.push(name);
  const version = hostSdk?.environment?.version;
  let pick = installed[0];
  for (const name of installed) if (version && await plistVersion(name) === version) { pick = name; break; }
  if (!pick) return "";
  macToolsFound = `export POSTCARD_CUTOUT_RVM_FFMPEG=${quote(bin(pick, "ffmpeg"))} POSTCARD_CUTOUT_RVM_FFPROBE=${quote(bin(pick, "ffprobe"))}; `;
  return macToolsFound;
}
// mac-only:end

const T = {
  title: "Portrait Beat Montage",
  intro: "3:4 portrait · about 16.3 seconds · 10 clips, the first 5 return after the 10th",
  folder: "Footage folder",
  currentProject: "Current project",
  noProject: "Open a project first.",
  loading: "Checking project media…",
  pickFolder: "Choose a footage folder first.",
  needMore: "This folder has {have} usable clips; {need} are needed. (Videos under 1.1 s do not count.)",
  clips: "Clips, in filename order",
  build: "Create new draft",
  working: "Rendering…",
  setupTitle: "One-time setup",
  setupHelp: "Person mattes use RVM on this Mac's CPU. Setup downloads a private Python runtime and the RVM model into the plugin folder (a few hundred MB).",
  setupButton: "Set up RVM",
  settingUp: "Setting up…",
  rights: "Use footage of people who agreed to be filmed. The plugin includes its soundtrack (Pixabay Content License).",
  time: "Rendering takes about 3 minutes on Apple silicon (seconds when the same clips are used again).",
  timeWindows: "Rendering takes a few minutes in this panel; keep it open (seconds when the same clips are used again). Person mattes use Selects generation credits; you confirm first.",
  done: "New draft created. It is open in the editor.",
  steps: ["Choose shot windows", "Mattes and transitions", "Render shots", "Build draft"],
  cancel: "Cancel",
};

function mediaScript(projectId, resourceIds = null) {
  return `const selected = ${JSON.stringify(resourceIds)};const p=selects.project(${json(projectId)}); const [meta,overview]=await Promise.all([p.meta(),p.sourceFiles()]); const items=[]; function walk(nodes,parts){ for(const node of nodes){ if(node.type==="dir") walk(node.children,parts.concat(node.name)); else items.push({name:node.name,type:node.type,resourceId:node.resourceId,path:node.path,durationSeconds:node.durationSeconds,folder:parts.join("/")||"(root)"}); }} if("fileTree" in overview) walk(overview.fileTree,[]); else { for(const folder of overview.folders){ const page=await p.sourceFiles({folder:folder.name}); if("fileTree" in page) walk(page.fileTree,folder.name==="(root)"?[]:[folder.name]); }} return {projectTitle:meta.title,videos:items.filter(x=>x.type==="video"&&(!selected||selected.includes(x.resourceId))),audios:items.filter(x=>x.type==="audio")};`;
}

// mac-only:start
async function pipeline(sdk, op, args, timeoutMs = 300000) {
  if (hostIsWindows()) throw macOnlyError();
  const reply = await sdk.runShell({
    summary: "Portrait montage: " + op,
    command: `${await macTools()}${PYTHON} "$P" "$S/pipeline.py" ${op} ${quote(json(args))}`,
    timeoutMs,
    maxOutputBytes: 49152,
  });
  const last = (reply.stdout || "").trim().split("\n").pop() || "{}";
  let parsed = null;
  try { parsed = JSON.parse(last); } catch {}
  if (reply.isError || reply.exitCode !== 0 || !parsed || parsed.error) {
    throw new Error(parsed?.error || reply.stderr || reply.output || `${op} failed`);
  }
  return parsed;
}

// One-time setup (rvm/setup.sh) downloads a few hundred MB, which can outlast one shell call: Selects ends each call
// after five minutes and stops the processes it started. So setup runs in a session of its own (perl's setsid, part
// of stock macOS), records its pid and exit status under plugin-data, and the panel polls. A setup that is already
// running (its lock is held and it has not exited) is joined instead of started twice.
const SETUP_DIR = `"$HOME/.selects/plugin-data/${PLUGIN}/setup"`;
const SETUP_WAIT_MS = 30 * 60 * 1000;
async function runSetup(sdk) {
  if (hostIsWindows()) throw macOnlyError();
  const start = await sdk.runShell({
    summary: "Portrait montage: start one-time setup",
    command: `${await macTools()}S="$SELECTS_USER_SKILLS_ROOT/portrait-beat-montage"; D=${SETUP_DIR}; mkdir -p "$D" || exit 1; `
      + `if [ -d "$S/rvm/.local/setup.lock" ] && [ ! -f "$D/exit" ] && kill -0 "$(cat "$D/pid" 2>/dev/null)" 2>/dev/null; then echo joined; exit 0; fi; `
      + `rm -f "$D/exit" "$D/pid" "$D/stderr.log"; `
      + `/usr/bin/perl -MPOSIX -e 'POSIX::setsid() or die "setsid: $!"; exec @ARGV or die "exec: $!"' /bin/sh -c 'echo $$ > "$2/pid"; sh "$1/rvm/setup.sh" 2>"$2/stderr.log"; echo $? > "$2/exit"' setup "$S" "$D" </dev/null >/dev/null 2>&1 & `
      // Return only once setup has its own session (its pid is written after setsid), or this call's end would stop it.
      + `i=0; while [ ! -s "$D/pid" ] && [ $i -lt 100 ]; do sleep 0.1; i=$((i+1)); done; [ -s "$D/pid" ] && echo started`,
    timeoutMs: 30000,
    maxOutputBytes: 4096,
  });
  if (start.isError || start.exitCode !== 0) throw new Error(start.stderr || "Could not start the setup.");
  const until = Date.now() + SETUP_WAIT_MS;
  for (;;) {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    const reply = await sdk.runShell({
      summary: "Portrait montage: check setup",
      command: `D=${SETUP_DIR}; if [ -f "$D/exit" ]; then cat "$D/exit"; elif kill -0 "$(cat "$D/pid" 2>/dev/null)" 2>/dev/null; then echo running; else echo stopped; fi`,
      timeoutMs: 15000,
      maxOutputBytes: 4096,
    });
    const state = (reply.stdout || "").trim().split("\n").pop() || "";
    if (state === "0") return;
    if (state === "running" && Date.now() < until) continue;
    if (state === "running") throw new Error("Setup is still running after 30 minutes. Check the connection, then try again.");
    // The last line setup wrote (its own log, else its stderr) says why it stopped.
    const log = await sdk.runShell({
      summary: "Portrait montage: read setup errors",
      command: `S="$SELECTS_USER_SKILLS_ROOT/portrait-beat-montage"; D=${SETUP_DIR}; { cat "$D/stderr.log"; tail -n 5 "$S/rvm/.local/setup.log"; } 2>/dev/null | grep -v '^SETUP ' | grep . | tail -n 1`,
      timeoutMs: 15000,
      maxOutputBytes: 4096,
    });
    const said = (log.stdout || "").trim();
    throw new Error(said || (state === "stopped" ? "Setup stopped before it finished. Try again." : `Setup failed (exit ${state}). See rvm/.local/setup.log in the plugin folder.`));
  }
}

// Mattes and transitions run detached, three shot windows at a time, so they keep
// going if the panel closes or the project changes. The panel polls for finished
// units; reopening it resumes the same run (pipeline.py plan reuses it).
async function renderUnits(sdk, runId, keys, onProgress) {
  if (hostIsWindows()) throw macOnlyError();
  const dir = `"$HOME/.selects/plugin-data/${PLUGIN}/runs/${runId}"`;
  const started = await sdk.runShell({
    summary: "Portrait montage: start mattes and transitions",
    command: `${await macTools()}${PYTHON} "$P" "$S/pipeline.py" spawn ${quote(json({ runId }))}`,
    timeoutMs: 30000,
    maxOutputBytes: 4096,
  });
  if (started.isError || started.exitCode !== 0) throw new Error(started.stderr || "Could not start the render");
  for (;;) {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    const reply = await sdk.runShell({
      summary: "Portrait montage: check progress",
      command: `cd ${dir} && n=0; for k in ${keys.join(" ")}; do test -f "$k/post-held.npy" && n=$((n+1)); done; f=false; test -f units.exit && f=true; a=false; kill -0 "$(cat units.pid 2>/dev/null)" 2>/dev/null && a=true; printf '{"done":%s,"finished":%s,"alive":%s}\\n' "$n" "$f" "$a"`,
      timeoutMs: 15000,
      maxOutputBytes: 4096,
    });
    const state = JSON.parse((reply.stdout || "{}").trim().split("\n").pop() || "{}");
    onProgress((state.done || 0) / keys.length);
    if (state.done === keys.length) return;
    if (!state.finished && state.alive === false) throw new Error("The render stopped. Press Create new draft again to continue where it left off.");
    if (state.finished) {
      const log = await sdk.runShell({ summary: "Portrait montage: read errors", command: `grep -h '"error"' ${dir}/units.log | tail -1`, timeoutMs: 15000, maxOutputBytes: 4096 });
      let said = null;
      try { said = JSON.parse((log.stdout || "").trim()).error; } catch {}
      throw new Error(said || "Some shots could not be prepared. Is there a person in every clip?");
    }
  }
}
// The macOS build: pipeline.py plan, the detached units, assemble.
async function macMontage(sdk, files, setStep, setProgress) {
  if (hostIsWindows()) throw macOnlyError();
  setStep(0);
  const plan = await pipeline(sdk, "plan", { clips: files.map((file) => file.path) });
  setStep(1);
  await renderUnits(sdk, plan.runId, plan.units, setProgress);
  setStep(2);
  return pipeline(sdk, "assemble", { runId: plan.runId, master: false }, 600000);
}
// mac-only:end

// pbm-engine:start
// The Windows engine: pipeline.py's plan, unit and assemble steps with no Python and no shell. ffmpeg/ffprobe run
// through the host's Runtime.runFFmpeg/runFFprobe (argv; a file in the run folder wherever pipeline.py reads ffmpeg's
// stdout or writes its stdin), files go through FileSystem, and the pixels run in pbmKernels on a Web Worker. Run state
// lives in <data>/runs/<runId> as pipeline.py keeps it, so reopening the panel resumes the same run; nothing keeps
// running after the panel stops (each step is awaited, and Cancel aborts ffmpeg and terminates the Worker). The person
// mattes come from `mattes(units, signal, progress)`, which writes <unit>/matte.gray (MATTE_FRAMES grey W x H frames).
// Every failure throws before the panel imports anything or makes a Draft.
const PBM_CACHE = "cache-w1";
const pbmCancelled = () => Object.assign(new Error("Cancelled."), { code: "cancelled" });
const pbmUpdate = "This Selects build can't make this montage. Update Selects, then try again.";
// FileSystem with every method the engine uses, the plugin folder and the data folder.
async function pbmHostIO(sdk) {
  hostUseSdk(sdk);
  const fs = hostApi("FileSystem", "join", "exists", "mkdir", "readdir", "readFile", "writeFile", "stat", "rename", "copyFile", "basename");
  if (!fs || !hostApi("Runtime", "runFFmpeg", "runFFprobe")) throw hostError("host-missing", pbmUpdate, "FileSystem/Runtime");
  const { plugin, data } = await hostRoots(sdk, PLUGIN, "SKILL.md");
  if (!data) throw hostError("host-missing", pbmUpdate, "FileSystem.mkdir");
  return { fs, plugin, data };
}
// ffmpeg with argv (-nostdin first), aborted by `signal` or after `timeoutMs`; checks `out` exists afterwards.
async function pbmFFmpeg(args, out, signal, timeoutMs = 600000) {
  if (signal?.aborted) throw pbmCancelled();
  const rt = hostNeed("Runtime", "runFFmpeg"), c = new AbortController(), timer = setTimeout(() => c.abort(), timeoutMs), relay = () => c.abort();
  signal?.addEventListener("abort", relay);
  try {
    await rt.runFFmpeg(["-nostdin", ...args], true, c.signal);
  } catch (e) {
    if (signal?.aborted) throw pbmCancelled();
    throw new Error("ffmpeg: " + (String(e?.message || e || "failed").trim().split("\n").pop() || "failed"));
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", relay);
  }
  if (out && !(await hostNeed("FileSystem", "exists").exists(out))) throw new Error("ffmpeg wrote no " + hostNeed("FileSystem", "basename").basename(out));
}
// ffmpeg into a temporary raw file, read back as bytes (the file is removed).
async function pbmFFmpegBytes(args, tmp, signal, timeoutMs) {
  await hostRemove(tmp);
  try { await pbmFFmpeg(args, tmp, signal, timeoutMs); return (await hostReadBytes(tmp)).slice(); } finally { await hostRemove(tmp); }
}
async function pbmSha1(text) {
  const d = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(d), (b) => b.toString(16).padStart(2, "0")).join("");
}
const pbmWrite = (io, path, data) => io.fs.writeFile(path, data);
// Writes through a temporary name, then renames: a file is either whole or absent.
async function pbmWriteWhole(io, path, data) {
  const tmp = path + ".partial";
  await pbmWrite(io, tmp, data);
  await hostRemove(path);
  (await io.fs.rename(tmp, path));
}
const pbmStamp = (d) => d.getFullYear() + [d.getMonth() + 1, d.getDate()].map((n) => String(n).padStart(2, "0")).join("") + "-" + [d.getHours(), d.getMinutes(), d.getSeconds()].map((n) => String(n).padStart(2, "0")).join("");

// pipeline.py op_plan: probe the 10 clips, choose each shot window, write plan.json (or resume an unfinished run).
async function pbmPlan(io, K, clips, signal, progress) {
  if (clips.length !== 10) throw new Error("Exactly 10 clips are required.");
  const digest = (await pbmSha1(clips.join("|") + "{}")).slice(0, 6), runs = hostJoin(io.data, "runs");
  (await io.fs.mkdir(runs, { recursive: true }));
  for (const name of (await io.fs.readdir(runs)).map(String).filter((n) => n.endsWith("-" + digest)).sort().reverse()) {
    const root = hostJoin(runs, name);
    if ((await io.fs.exists(hostJoin(root, "plan.json"))) && !(await io.fs.exists(hostJoin(root, "manifest.json")))) {
      return { root, plan: JSON.parse(await hostReadText(hostJoin(root, "plan.json"))), resumed: true };
    }
  }
  const units = {}, rt = hostNeed("Runtime", "runFFprobe");
  for (let i = 1; i <= clips.length; i++) {
    if (signal?.aborted) throw pbmCancelled();
    const path = clips[i - 1], name = io.fs.basename(path);
    let info;
    try { info = parseProbe(String((await rt.runFFprobe(probeArgs(path), true))?.stdout || "")); } catch { throw new Error("Couldn't read " + name + "."); }
    if (!(info.duration >= 1.1)) throw new Error(name + " is shorter than 1.1 seconds.");
    const tmp = hostJoin(io.data, "motion-" + i + ".gray"), gray = await pbmFFmpegBytes(motionArgs(path, info, tmp), tmp, signal);
    const { starts, scores } = K.motionScores(gray, info.duration), first = K.choose(starts, scores);
    units["c" + String(i).padStart(2, "0") + "a"] = { clip: i, path, start: first, ...info };
    if (i <= 5) units["c" + String(i).padStart(2, "0") + "b"] = { clip: i, path, start: K.choose(starts, scores, first), ...info };
    progress?.(i / clips.length);
  }
  const runId = pbmStamp(new Date()) + "-" + digest, root = hostJoin(runs, runId);
  const plan = { runId, units, slots: SLOTS.map((clip, slot) => "c" + String(clip).padStart(2, "0") + (slot >= REPEAT_FROM ? "b" : "a")), created: Date.now() / 1000 };
  (await io.fs.mkdir(root, { recursive: true }));
  await pbmWriteWhole(io, hostJoin(root, "plan.json"), JSON.stringify(plan, null, 2));
  return { root, plan, resumed: false };
}
// The cache folder of a shot window (same clip file, size, modification time and start = same shot).
async function pbmCacheDir(io, unit) {
  const st = (await io.fs.stat(unit.path));
  return hostJoin(io.data, PBM_CACHE, (await pbmSha1(unit.path + "|" + Number(st?.size) + "|" + Number(st?.mtimeMs) + "|" + unit.start.toFixed(4) + "|w1")).slice(0, 16));
}
async function pbmDecodeSource(io, folder, count, signal) {
  const bytes = await pbmFFmpegBytes(decodeArgs(hostJoin(folder, "source.mp4"), count, hostJoin(folder, "frames.rgb")), hostJoin(folder, "frames.rgb"), signal);
  if (bytes.byteLength < count * W * H * 3) throw new Error(hostNeed("FileSystem", "basename").basename(folder) + ": expected " + count + " frames, got " + Math.floor(bytes.byteLength / (W * H * 3)));
  return bytes;
}
// pipeline.py op_unit for every shot window still missing: sources, then one matte request for all of them, then the
// transitions. Windows with the same cache folder are rendered once.
async function pbmCopyUnit(io, from, to) {
  for (const name of ["source.mp4", "plain.json", "post.rgb"]) {
    if ((await io.fs.exists(hostJoin(from, name)))) await io.fs.copyFile(hostJoin(from, name), hostJoin(to, name));
  }
}
async function pbmPlainCount(io, run) {
  let count = 0;
  for (const key of run.plan.slots) if (await io.fs.exists(hostJoin(run.root, key, "plain.json"))) count++;
  return count;
}
async function pbmUnits(io, kernels, run, mattes, signal, progress) {
  const keys = Object.keys(run.plan.units).sort(), N = W * H, todo = [], copies = [];
  const done = async (folder) => (await io.fs.exists(hostJoin(folder, "post.rgb"))) && (await io.fs.exists(hostJoin(folder, "source.mp4")));
  const byCache = new Map();
  for (const key of keys) {
    const unit = run.plan.units[key], folder = hostJoin(run.root, key);
    if ((await done(folder))) continue;
    (await io.fs.mkdir(folder, { recursive: true }));
    const cache = await pbmCacheDir(io, unit);
    if ((await done(cache))) { await pbmCopyUnit(io, cache, folder); continue; }
    if (byCache.has(cache)) { copies.push({ from: byCache.get(cache), folder }); continue; }
    // Mattes paid for in an earlier run of this window are reused (a rebuild never asks twice).
    if ((await io.fs.exists(hostJoin(cache, "matte.gray"))) && !(await io.fs.exists(hostJoin(folder, "matte.gray")))) await io.fs.copyFile(hostJoin(cache, "matte.gray"), hostJoin(folder, "matte.gray"));
    byCache.set(cache, folder);
    todo.push({ key, unit, folder, cache });
  }
  const steps = todo.length * 2 + 1;
  let step = 0;
  for (const t of todo) {
    if (!(await io.fs.exists(hostJoin(t.folder, "source.mp4")))) {
      const partial = hostJoin(t.folder, "source-partial.mp4");
      await pbmFFmpeg(unitSourceArgs(t.unit, partial), partial, signal);
      (await io.fs.rename(partial, hostJoin(t.folder, "source.mp4")));
    }
    progress?.(++step / steps);
  }
  const need = [];
  for (const t of todo) if (!await io.fs.exists(hostJoin(t.folder, "matte.gray"))) need.push(t);
  if (need.length) {
    await mattes(io, need.map((t) => ({ key: t.key, folder: t.folder, source: hostJoin(t.folder, "source.mp4") })), signal, (p) => progress?.((step + p) / steps), run);
    for (const t of need) { (await io.fs.mkdir(t.cache, { recursive: true })); await io.fs.copyFile(hostJoin(t.folder, "matte.gray"), hostJoin(t.cache, "matte.gray")); }
  }
  progress?.(++step / steps);
  for (const t of todo) {
    const frames = (await pbmDecodeSource(io, t.folder, SRC_FRAMES, signal)).slice(0, MATTE_FRAMES * N * 3);
    const matte = await hostReadBytes(hostJoin(t.folder, "matte.gray"));
    const incomplete = matte.byteLength !== MATTE_FRAMES * N;
    let cover = 0;
    for (let p = 0; p < N; p++) cover += Math.fround(matte[p] / 255);
    const plain = incomplete || !(cover / N > .03 && cover / N < .95);
    const base = step;
    const post = await kernels("unit", { frames, mattes: matte.slice(), ...(plain ? { plain: true } : {}) }, (p) => progress?.((base + p) / steps), signal);
    if (plain) await pbmWriteWhole(io, hostJoin(t.folder, "plain.json"), JSON.stringify({ reason: "person-matte-unavailable" }));
    await pbmWriteWhole(io, hostJoin(t.folder, "post.rgb"), post);
    (await io.fs.mkdir(t.cache, { recursive: true }));
    await pbmCopyUnit(io, t.folder, t.cache);
    progress?.(++step / steps);
  }
  for (const c of copies) await pbmCopyUnit(io, c.from, c.folder);
}
// pipeline.py op_assemble (without the 60 fps master): every Draft frame of every piece from its master frame, each
// piece written raw and encoded by ffmpeg into render/<piece>.mp4; returns pipeline.py's manifest.
async function pbmAssemble(io, kernels, run, signal, progress) {
  const out = hostJoin(run.root, "render"), segs = segments(), N = W * H, size = N * 3;
  (await io.fs.mkdir(out, { recursive: true }));
  const tl = { BLACK, STROBE_START, STROBE, BOUNDARIES, END: BLACK + BEATS[BEATS.length - 1], GLOW };
  const loaded = new Set();
  for (let s = 0; s < segs.length; s++) {
    const seg = segs[s], masters = [];
    for (let n = seg.start; n < seg.end; n++) masters.push(draftMaster(n));
    // Shots these frames read (a piece starts on its own shot, or the last frames of the one before).
    const shots = [...new Set(masters.filter((m) => m >= BLACK && m < tl.END).map((m) => BOUNDARIES.filter((b) => b <= m).length - 1))];
    for (const k of shots) {
      if (loaded.has(k)) continue;
      const folder = hostJoin(run.root, run.plan.slots[k]);
      const frames = await pbmDecodeSource(io, folder, SRC_FRAMES, signal), post = (await hostReadBytes(hostJoin(folder, "post.rgb"))).slice();
      if (post.byteLength !== POST * size) throw new Error("Shot " + (k + 1) + " is incomplete. Press Create new draft again.");
      await kernels("slot", { k, frames, post, keep: shots }, null, signal);
      for (const old of [...loaded]) if (!shots.includes(old)) loaded.delete(old);
      loaded.add(k);
    }
    const raw = await kernels("emit", { masters, tl }, null, signal);
    if (raw.byteLength !== masters.length * size) throw new Error(seg.name + ": " + raw.byteLength / size + " frames, expected " + masters.length);
    const rawPath = hostJoin(out, seg.name + ".rgb"), mp4 = hostJoin(out, seg.name + ".mp4");
    try {
      await pbmWrite(io, rawPath, raw);
      await hostRemove(mp4);
      await pbmFFmpeg(encodeArgs(rawPath, "30000/1001", mp4), mp4, signal);
    } finally { await hostRemove(rawPath); }
    progress?.((s + 1) / segs.length);
  }
  const total = segs[segs.length - 1].end, asset = (name) => hostJoin(io.plugin, "assets", name);
  const manifest = { runId: run.plan.runId, fps: DRAFT_FPS, width: W, height: H, durationFrames: total, gapFrames: segs[0].start,
    clips: segs.map((s) => ({ ...s, frames: s.end - s.start, path: hostJoin(out, s.name + ".mp4") })),
    audio: [{ name: "music-bed.wav", path: asset("music-bed.wav"), start: 0, end: total },
      { name: "shutter.wav", path: asset("shutter.wav"), start: draftFrame(STROBE_START), end: draftFrame(BLACK) },
      { name: "riser.wav", path: asset("riser.wav"), start: draftFrame(RISER_START), end: draftFrame(BLACK) }], master: null };
  const plainShots = await pbmPlainCount(io, run);
  if (plainShots) manifest.plainShots = plainShots;
  await pbmWriteWhole(io, hostJoin(run.root, "manifest.json"), JSON.stringify(manifest, null, 2));
  return manifest;
}
// The pixel kernels on a Web Worker (blob URL; the panel CSP allows blob: workers, as archive-vlog's beat Worker
// uses). Returns `call(op, data, progress, signal)`, and `close()`. Abort terminates the Worker.
function pbmWorkerKernels() {
  const source = "const K = (" + pbmKernels + ")(); const state = {};\n"
    + "onmessage = (e) => { const { id, op, data } = e.data; try { const r = K.handle(state, op, data, (p) => postMessage({ id, progress: p }));"
    + " postMessage({ id, ok: r }, r && r.buffer ? [r.buffer] : []); } catch (err) { postMessage({ id, error: String((err && err.message) || err) }); } };";
  let worker = null, url = null, seq = 0;
  const waiting = new Map();
  const fail = (message) => { for (const w of waiting.values()) w.reject(new Error(message)); waiting.clear(); };
  const start = () => {
    if (worker) return worker;
    url = URL.createObjectURL(new Blob([source], { type: "text/javascript" }));
    worker = new Worker(url);
    worker.onmessage = (e) => {
      const w = waiting.get(e.data.id);
      if (!w) return;
      if ("progress" in e.data) { w.progress?.(e.data.progress); return; }
      waiting.delete(e.data.id);
      if (e.data.error) w.reject(new Error(e.data.error)); else w.resolve(e.data.ok);
    };
    worker.onerror = (e) => { try { e?.preventDefault?.(); } catch { /* nothing */ } fail("The montage renderer stopped: " + String(e?.message || "worker error")); close(); };
    return worker;
  };
  const close = () => { try { worker?.terminate(); } catch { /* gone */ } if (url) { try { URL.revokeObjectURL(url); } catch { /* gone */ } } worker = null; url = null; };
  const call = (op, data, progress, signal) => new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(pbmCancelled()); return; }
    const id = ++seq, onAbort = () => { fail("Cancelled."); close(); };
    signal?.addEventListener("abort", onAbort, { once: true });
    const done = (fn) => (v) => { signal?.removeEventListener("abort", onAbort); fn(v); };
    waiting.set(id, { resolve: done(resolve), reject: done((e) => reject(signal?.aborted ? pbmCancelled() : e)), progress });
    const transfer = Object.values(data).filter((v) => v && v.buffer instanceof ArrayBuffer).map((v) => v.buffer);
    try { start().postMessage({ id, op, data }, transfer); } catch (e) { waiting.delete(id); reject(new Error("The montage renderer could not start: " + String(e?.message || e))); }
  });
  return { call, close };
}
// The person mattes from an alpha video of the concatenated unit sources (luma = alpha, white = person unless
// `invert`): split back per unit, dropping each unit's MATTE_PAD lead-in, as <unit>/matte.gray.
async function pbmMattesFromAlpha(io, units, alphaVideo, signal, invert = false) {
  const tmp = hostJoin(io.data, "mattes-" + Date.now() + ".gray");
  const bytes = await pbmFFmpegBytes(matteSplitArgs(alphaVideo, tmp, invert), tmp, signal);
  const parts = splitMattes(bytes, units.length);
  for (let i = 0; i < units.length; i++) await pbmWriteWhole(io, hostJoin(units[i].folder, "matte.gray"), parts[i]);
}
// The sources of `units` as one clip for one matte request (MATTE_PAD lead-in frames before each).
async function pbmMatteSource(io, units, out, signal) {
  await hostRemove(out);
  await pbmFFmpeg(matteConcatArgs(units.map((u) => u.source), out), out, signal);
  return { path: out, seconds: units.length * (MATTE_PAD + MATTE_FRAMES) / FPS };
}
// Person mattes on Windows: ONE Selects generation request for the whole montage (video background removal, people
// only, H.264 that carries the alpha alone, as depth-type-captions makes its speaker masks). `confirm({ seconds,
// shots })` must resolve true before anything is sent: nothing is spent without that click. The request key follows the
// run and its windows, so sending it again (a reload, a retry) admits nothing new, and the delivered video is recorded
// in cloud/result.json, so a rebuild or a resumed run reuses it without asking. Cancel cancels the request.
const PBM_CLOUD_MODEL = "model_v1_dmVlZC92aWRlby1iYWNrZ3JvdW5kLXJlbW92YWwvZmFzdA";
const PBM_CLOUD_FAILED = new Set(["failed", "cancelled", "input_failed", "submission_rejected", "upload_failed", "handoff_failed"]);
function pbmCloudMessage(code) {
  if (code === "insufficient_credits") return "Not enough Selects credits to make the person mattes.";
  if (code === "generation_disabled") return "Person mattes on Windows use Selects generation, which this account cannot use yet.";
  if (code === "generation_update_required") return "Update Selects to use person mattes on Windows, then try again.";
  return "Person mattes failed" + (code ? " (" + code + ")" : "") + ". Try again.";
}
async function pbmCloudMattes(io, units, signal, progress, { run, projectId, confirm }) {
  const dir = hostJoin(run.root, "cloud"), record = hostJoin(dir, "result.json");
  (await io.fs.mkdir(dir, { recursive: true }));
  const key = "pbm-" + (await pbmSha1(run.plan.runId + "|" + units.map((u) => u.key).join(","))).slice(0, 24);
  let alpha = null;
  try { const r = JSON.parse(await hostReadText(record)); if (r.key === key && r.alpha && (await io.fs.exists(r.alpha))) alpha = r.alpha; } catch { alpha = null; }
  if (!alpha) {
    const mg = generationApi("submit", "list", "cancel", "supportsPluginFiles");
    if (!mg || !mg.supportsPluginFiles()) throw new Error(pbmCloudMessage("generation_update_required"));
    if (!projectId) throw new Error("Open a project in Selects, then try again.");
    const source = await pbmMatteSource(io, units, hostJoin(dir, "source.mp4"), signal);
    // The credits notice: an explicit yes, or the build stops here with nothing sent.
    const aborted = new Promise((resolve) => { if (signal?.aborted) resolve(false); else signal?.addEventListener("abort", () => resolve(false), { once: true }); });
    const yes = (await Promise.race([Promise.resolve().then(() => confirm({ seconds: source.seconds, shots: units.length })), aborted])) === true;
    if (!yes || signal?.aborted) throw pbmCancelled();
    const scope = { projectId };
    let jobId;
    try {
      jobId = (await mg.submit({
        scope, key, modelId: PBM_CLOUD_MODEL,
        input: { video_url: "selects-input:source", output_codec: "h264", refine_foreground_edges: false, subject_is_person: true },
        inputMediaSeconds: { video: source.seconds },
        uploads: { source: { pluginFile: source.path } },
        delivery: { pluginFolder: hostJoin(dir, "result") },
        outputName: "person-mattes", batch: 1,
        origin: { tool: "video", tab: PLUGIN, recipeId: "person-mattes" },
      })).jobIds[0];
    } catch (e) {
      throw new Error(pbmCloudMessage(e?.code || e?.message));
    }
    const started = Date.now();
    for (;;) {
      if (signal?.aborted) { await mg.cancel(scope, jobId).catch(() => {}); throw pbmCancelled(); }
      await new Promise((r) => setTimeout(r, 1000));
      const j = (await mg.list(scope)).find((x) => x.jobId === jobId);
      if (j?.deliveryStatus === "delivered") { alpha = (j.outputs || []).find((o) => o.path)?.path || null; break; }
      if (j && (PBM_CLOUD_FAILED.has(j.status) || ["download_failed", "result_collection_failed"].includes(j.deliveryStatus))) throw new Error(pbmCloudMessage(j.errorCode));
      progress?.(Math.min(.9, (Date.now() - started) / 180000));
      if (Date.now() - started > 20 * 60000) { await mg.cancel(scope, jobId).catch(() => {}); throw new Error("The person mattes took too long. Try again."); }
    }
    if (!alpha) throw new Error("No person mattes came back. Try again.");
    await pbmWriteWhole(io, record, JSON.stringify({ key, jobId, alpha }));
  }
  await pbmMattesFromAlpha(io, units, alpha, signal);
}
// The whole Windows build up to the manifest buildMontage imports.
async function pbmWindowsMontage(sdk, { projectId, files, setStep, setProgress, signal, confirm, mattes = null, kernels = null }) {
  mattes = mattes || ((io, units, s, p, run) => pbmCloudMattes(io, units, s, p, { run, projectId, confirm }));
  const io = await pbmHostIO(sdk), K = pbmKernels(), worker = kernels ? null : pbmWorkerKernels(), call = kernels || worker.call;
  try {
    setStep(0); setProgress(0);
    const run = await pbmPlan(io, K, files.map((file) => file.path), signal, setProgress);
    setStep(1); setProgress(0);
    await pbmUnits(io, call, run, mattes, signal, setProgress);
    setStep(2); setProgress(0);
    return await pbmAssemble(io, call, run, signal, setProgress);
  } finally { worker?.close(); }
}
// pbm-engine:end

// Each bundled sound's length in seconds (ffprobe), used when its Resource reports none: no overlay may run past it.
const ASSET_SECONDS = { "music-bed.wav": 16.333333, "shutter.wav": 2, "riser.wav": 1.166667 };

async function buildMontage(sdk, { projectId, language, files, audios, setStep, setProgress, signal, confirm, onNote }) {
  // Windows renders in the panel (person mattes from Selects generation, after `confirm`); macOS runs pipeline.py.
  const manifest = hostIsWindows() ? await pbmWindowsMontage(sdk, { projectId, files, setStep, setProgress, signal, confirm }) : await macMontage(sdk, files, setStep, setProgress);
  setStep(3);

  // Reuse the bundled sounds when this project already has them.
  const byName = new Map();
  for (const audio of manifest.audio) {
    const found = (audios || []).find((item) => item.path && item.path.replace(/\\/g, "/").endsWith(`/${PLUGIN}/assets/${audio.name}`));
    if (found) byName.set(audio.name, found.resourceId);
  }
  const toImport = [...manifest.clips.map((clip) => clip.path), ...manifest.audio.filter((a) => !byName.has(a.name)).map((a) => a.path)];
  const imported = await sdk.runScript({
    summary: "Import montage shots",
    script: `return await selects.project(${json(projectId)}).importFiles({paths:${json(toImport)}});`,
    allowCommit: true,
  });
  const ids = imported.result?.addedResourceIds;
  if (imported.isError || !Array.isArray(ids) || ids.length !== toImport.length) throw new Error(imported.output || "Could not import the rendered shots");
  const clipIds = ids.slice(0, manifest.clips.length);
  let next = manifest.clips.length;
  for (const audio of manifest.audio) if (!byName.has(audio.name)) byName.set(audio.name, ids[next++]);

  const draftName = `${T.title} — ${new Date().toLocaleString(language || undefined)}`;
  const cfg = {
    projectId, name: draftName, gap: manifest.gapFrames, end: manifest.durationFrames,
    clips: manifest.clips.map((clip, i) => ({ id: clipIds[i], frames: clip.frames, start: clip.start, name: clip.name })),
    audio: manifest.audio.map((a) => ({ id: byName.get(a.name), start: a.start, end: a.end, name: a.name, seconds: ASSET_SECONDS[a.name] })),
  };
  // The manifest's frames are 30000/1001 fps frames (the rendered pieces are encoded at that rate); a new Draft takes
  // the Project's frame rate, so they are converted to the Draft's frames (unchanged at 29.97 and 30). Cuts round down;
  // the rate is read again after each insert (a Draft can adopt its first clip's rate), and each piece ends on its cut
  // measured from where the last one really ended, but never past its own length, which Selects counts in whole Project
  // frames (so off 29.97/30 a cut can land a few frames early). A sound never asks past its asset: Selects counts an
  // audio asset as round(seconds*fps) Project frames, so that is the bound while the Draft keeps the Project's rate (at
  // 29.97 the bed, shutter and riser need exactly that: 490, 60 and 35 frames), and floor once the Draft has switched.
  const script = `const cfg=${json(cfg)}; const p=selects.project(cfg.projectId); const d=await p.createDraft({name:cfg.name}); await d.setFrameSize({width:1080,height:1440});
const rate=async()=>{const reported=(await d.meta()).fps;const r=[24000/1001,24,25,30000/1001,30,48,50,60000/1001,60].find(x=>Math.abs(x-reported)<0.01)||reported;if(!(r>0))throw new Error("Unsupported draft frame rate: "+reported);return r;};
let fps=await rate(); const projectFps=fps; const cut=(f)=>Math.floor(f*1001/30000*fps+1e-6);
const placedEnd=async()=>Math.max(0,...(await d.clips({trackScope:"main"})).map(c=>c.endFrame));
await d.insertGap({seconds:cut(cfg.gap)/fps}); fps=await rate(); let placed=Math.max(cut(cfg.gap),await placedEnd());
for(const c of cfg.clips){ await d.insertResource({resourceId:c.id,sourceRange:{startSeconds:0,endSeconds:Math.min((cut(c.start+c.frames)-placed)/fps,Math.round(c.frames*1001/30000*projectFps)/projectFps)}}); fps=await rate(); placed=await placedEnd(); }
const main=(await d.clips({trackScope:"main"})).filter(c=>c.resourceId).sort((a,b)=>a.startFrame-b.startFrame);
if(main.length!==cfg.clips.length) throw new Error("Expected "+cfg.clips.length+" shots, found "+main.length);
const end=Math.max(...main.map(c=>c.endFrame));
const at=(f)=>{const i=cfg.clips.findIndex(c=>c.start===f);return i>=0?main[i].startFrame:f===cfg.end?end:Math.round(f*1001/30000*fps);};
const lengths=new Map((await p.resources()).map(x=>[x.resourceId,x.durationSeconds]));
for(const a of cfg.audio){ const start=at(a.start), s=Math.min(lengths.get(a.id)||Infinity,a.seconds||Infinity); let stop=Math.min(end,at(a.end)); if(s<Infinity) stop=Math.min(stop,start+(fps===projectFps?Math.round(s*fps):Math.floor(s*fps+1e-3))); if(stop>start) await d.overlayResource({resource:p.resource(a.id),over:await d.rangeAtFrames(start,stop)}); }
const saved=await d.commitAll("Create portrait beat montage"); return {draftId:saved.createdDraftId,end,shots:main.length};`;
  const built = await sdk.runScript({ summary: "Build portrait montage draft", script, allowCommit: true });
  if (built.isError || !built.result?.draftId) throw new Error(built.output || "Draft creation failed");
  try { await sdk.runScript({ summary: "Open montage draft", script: `await selects.editor.openDraft(${json(built.result.draftId)}); return true;` }); } catch {}
  onNote?.(plainText(language, manifest.plainShots));
  return built.result.draftId;
}

function eligible(videos, folder) {
  return videos.filter((item) => item.folder === folder && item.path && item.durationSeconds >= MIN_SECONDS)
    .sort((a, b) => a.name.localeCompare(b.name));
}

const FAILED = "Portrait Beat Montage couldn't make the timeline. Try again.";

// The app hands a template its own Resource ids, but every run_script read
// (resources(), clips()) speaks the short ids the script SDK gives out (r0, r1…).
// The app's list (sdk.call) and the script's list are the Project's Resources in
// the same order, so they pair up row by row; names and types are compared so a
// list that changed in between is refused rather than mismatched.
async function scriptResourceIds(sdk, projectId, resourceIds) {
  const app = await sdk.call("listProjectResources", projectId);
  if (!Array.isArray(app)) throw new Error("Could not read the project resources.");
  const indices = [...new Set(resourceIds)].map(id => app.findIndex(r => r.resourceId === id));
  if (indices.includes(-1)) throw new Error("A picked file is missing from this project.");
  const run = await readMediaPages(sdk, { summary: "Match picked files", script: `const rows=await selects.project(${JSON.stringify(projectId)}).resources();return {count:rows.length,rows:${JSON.stringify(indices)}.map(i=>{const r=rows[i];return r?{id:r.resourceId,name:r.name,type:r.type}:null;})};` });
  const result = run.result, rows = result.rows;
  if (result.count !== app.length || rows.length !== indices.length || indices.some((index, i) => app[index].name !== rows[i]?.name || app[index].type !== rows[i]?.type)) throw new Error("Could not match the picked files to this project.");
  return new Map(indices.map((index, i) => [app[index].resourceId, rows[i].id]));
}

// A Clip highlights run (`context.template`): the 10 clips picked in the app.
function TemplateRun({ sdk, context }) {
  const runId = context.template?.runId;
  const [status, setStatus] = React.useState("Making your montage…");
  const started = React.useRef(null);
  React.useEffect(() => {
    if (!runId || started.current === runId) return;
    started.current = runId;
    let ended = false;
    const finish = (result) => { if (ended) return; ended = true; try { sdk.finishTemplate(result); } catch {} };
    (async () => {
      const projectId = context.projectId;
      if (!projectId) throw new Error("Open a project, then try again.");
      const picks = (context.template.inputs?.clips || []).filter((pick) => pick?.resourceId);
      if (picks.length !== SHOTS) throw new Error(`Pick ${SHOTS} videos, then try again.`);
      // The first run on a Mac sets up RVM itself (a few minutes, once); later runs find it ready. Windows needs no setup.
      let doctor = hostIsWindows() ? { ready: true } : await pipeline(sdk, "doctor", {}).catch(() => null);
      if (!doctor?.ready) {
        setStatus("Setting up person mattes (first run only, a few minutes)…");
        await runSetup(sdk);
        doctor = await pipeline(sdk, "doctor", {});
        if (!doctor.ready) throw new Error(doctor.problems?.[0] || "Setup finished, but the montage tools are not ready.");
        setStatus("Making your montage…");
      }
      const ids = await scriptResourceIds(sdk, projectId, picks.map(x => x.resourceId));
      const reply = await readMediaPages(sdk, { summary: "Find montage media", script: mediaScript(projectId, [...ids.values()]) });
      if (reply.isError || !reply.result) throw new Error("Couldn't read this project's files. Try again.");
      const byId = new Map((reply.result.videos || []).map((item) => [item.resourceId, item]));
      const files = picks.map((pick) => byId.get(ids.get(pick.resourceId) ?? pick.resourceId));
      const missing = picks.find((pick, i) => !files[i]?.path);
      if (missing) throw new Error(`Couldn't find ${missing.name || "a picked video"} in this project.`);
      let note = "";
      const draftId = await buildMontage(sdk, {
        projectId, language: context.language, files, audios: reply.result.audios || [],
        setStep: (n) => setStatus(T.steps[n] + "…"), setProgress: () => {},
        // No panel to click in: starting the template is the consent to the Windows mattes' credits.
        confirm: () => true, onNote: (text) => { note = text; },
      });
      if (note) setStatus(note);
      finish({ sequenceId: draftId });
    })().catch((error) => {
      const said = String(error?.message || "");
      finish({ error: said && said.length <= 160 && !/[\n{]/.test(said) ? said : FAILED });
    });
  }, [runId]);
  return <small>{status}</small>;
}

function Panel(props) {
  hostUseSdk(props.sdk);
  return props.context?.template ? <TemplateRun {...props} /> : <MontagePanel {...props} />;
}

function MontagePanel({ sdk, context, ui }) {
  const [videos, setVideos] = React.useState([]);
  const [audios, setAudios] = React.useState([]);
  const [projectTitle, setProjectTitle] = React.useState("");
  const [folder, setFolder] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [doctor, setDoctor] = React.useState(null);
  const [settingUp, setSettingUp] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [step, setStep] = React.useState(-1);
  const [progress, setProgress] = React.useState(0);
  const [status, setStatus] = React.useState(null);
  const windows = hostIsWindows();
  // Windows renders in this panel (no background job): Cancel, or closing the panel, stops it.
  const cancel = React.useRef(null);
  React.useEffect(() => () => cancel.current?.abort(), []);
  // The credits notice before the Windows matte request: { text, resolve } while it waits for a click.
  const [costAsk, setCostAsk] = React.useState(null);
  const confirmCost = ({ seconds, shots }) => new Promise((resolve) => setCostAsk({ text: costText(context.language, seconds, shots), resolve }));
  const answerCost = (yes) => { costAsk?.resolve(yes); setCostAsk(null); };

  // Windows: no setup check (RVM setup is shell and Python; Windows needs none).
  const checkSetup = React.useCallback(() => windows ? Promise.resolve() : pipeline(sdk, "doctor", {}, 60000)
    .then(setDoctor)
    .catch((error) => setDoctor({ ready: false, problems: [String(error.message || error)] })), [sdk, windows]);
  React.useEffect(() => { if (!windows) checkSetup(); }, []);

  // Re-read the media list whenever files join or leave the project.
  const [mediaVersion, setMediaVersion] = React.useState(0);
  React.useEffect(() => sdk.on("resourcesChanged", (event) => {
    if (event.projectId === context.projectId) setMediaVersion((n) => n + 1);
  }), [context.projectId]);

  React.useEffect(() => {
    if (!context.projectId) return;
    let cancelled = false;
    setLoading(true);
    readMediaPages(sdk, { summary: "Find montage media", script: mediaScript(context.projectId) }).then((reply) => {
      if (cancelled) return;
      if (reply.isError || !reply.result) throw new Error(reply.output || "Could not read project files");
      const found = reply.result;
      setVideos(found.videos || []);
      setAudios(found.audios || []);
      setProjectTitle(found.projectTitle || "");
      const names = [...new Set((found.videos || []).map((item) => item.folder))];
      setFolder((current) => names.includes(current) ? current : names.find((name) => eligible(found.videos, name).length >= SHOTS) || null);
      setLoading(false);
    }).catch((error) => {
      if (cancelled) return;
      setLoading(false);
      setStatus({ type: "error", message: String(error.message || error) });
    });
    return () => { cancelled = true; };
  }, [context.projectId, mediaVersion]);

  async function setup() {
    if (windows) return;
    setSettingUp(true);
    setStatus(null);
    try {
      await runSetup(sdk);
      await checkSetup();
    } catch (error) {
      setStatus({ type: "error", message: String(error.message || error) });
    } finally {
      setSettingUp(false);
    }
  }

  const folderNames = [...new Set(videos.map((item) => item.folder))];
  const folderOptions = folderNames
    .map((name) => ({ name, usable: eligible(videos, name).length }))
    .sort((a, b) => b.usable - a.usable)
    .map(({ name, usable }) => ({ value: name, label: name.normalize("NFC") + "  ·  " + usable + (usable >= SHOTS ? "" : " ✕") }));
  const chosen = folder ? eligible(videos, folder).slice(0, SHOTS) : [];

  async function build() {
    if (busy || chosen.length < SHOTS) return;
    setBusy(true);
    setStatus(null);
    setProgress(0);
    try {
      cancel.current = new AbortController();
      let note = "";
      await buildMontage(sdk, { onNote: (text) => { note = text; }, projectId: context.projectId, language: context.language, files: chosen, audios, setStep, setProgress, signal: cancel.current.signal, confirm: confirmCost });
      setStatus({ type: "success", message: note ? T.done + " " + note : T.done });
    } catch (error) {
      setStatus(error?.code === "cancelled" ? { type: "muted", message: String(error.message) } : { type: "error", message: String(error.message || error) });
    } finally {
      setBusy(false);
      setStep(-1);
      cancel.current = null;
      setCostAsk((ask) => { ask?.resolve(false); return null; });
    }
  }

  if (!context.projectId) return <ui.Message tone="muted">{T.noProject}</ui.Message>;
  return <ui.Section title={T.title}>
    <ui.Stack>
      <p>{T.intro}</p>
      {doctor && !doctor.ready ? <ui.Stack>
        <strong>{T.setupTitle}</strong>
        <small>{T.setupHelp}</small>
        {(doctor.problems || []).map((problem) => <ui.Message key={problem} tone="error">{problem}</ui.Message>)}
        <ui.Actions><ui.Button variant="secondary" busy={settingUp} busyLabel={T.settingUp} onClick={setup}>{T.setupButton}</ui.Button></ui.Actions>
      </ui.Stack> : null}
      <p>{T.currentProject}: <strong>{projectTitle || "…"}</strong></p>
      {loading ? <ui.Message>{T.loading}</ui.Message> : null}
      <ui.Select label={T.folder} value={folder} onChange={setFolder} options={folderOptions} disabled={busy || loading} />
      {folder && chosen.length < SHOTS
        ? <ui.Message tone="error">{T.needMore.replace("{have}", String(eligible(videos, folder).length)).replace("{need}", String(SHOTS))}</ui.Message>
        : null}
      {chosen.length === SHOTS ? <small>{T.clips}: {chosen.map((file) => file.name).join(", ")}</small> : null}
      {!loading && !folder ? <ui.Message tone="error">{T.pickFolder}</ui.Message> : null}
      <small>{windows ? T.timeWindows : T.time}</small>
      <small>{T.rights}</small>
      {busy ? <ui.Progress steps={T.steps} current={step} value={step === 1 ? progress : undefined} label={T.steps[step] || ""} /> : null}
      <ui.Actions><ui.Button variant="primary" busy={busy} busyLabel={T.working} disabled={loading || (!windows && !doctor?.ready) || chosen.length < SHOTS} onClick={build}>{T.build}</ui.Button>
        {busy && windows && !costAsk ? <ui.Button variant="secondary" onClick={() => cancel.current?.abort()}>{T.cancel}</ui.Button> : null}</ui.Actions>
      {costAsk ? <ui.Stack>
        <ui.Message tone="muted">{costAsk.text}</ui.Message>
        <ui.Actions><ui.Button variant="primary" onClick={() => answerCost(true)}>{pick(COST_GO, context.language)}</ui.Button><ui.Button variant="secondary" onClick={() => answerCost(false)}>{pick(COST_STOP, context.language)}</ui.Button></ui.Actions>
      </ui.Stack> : null}
      {status ? <ui.Message tone={status.type}>{status.message}</ui.Message> : null}
    </ui.Stack>
  </ui.Section>;
}

// Only read-only media queries use this: keep every row without exceeding run_script's response limit.
async function readMediaPages(sdk, args) {
  let result, total;
  for (let offset = 0; ; offset += 32) {
    const script = `const value=await(async()=>{${args.script}\n})();const array=Array.isArray(value);const data=array?{rows:value}:value;const page={};let total=0;for(const key of Object.keys(data)){const rows=data[key];page[key]=Array.isArray(rows)?rows.slice(${offset},${offset + 32}):rows;if(Array.isArray(rows))total=Math.max(total,rows.length);}return {array,page,total};`;
    const reply = await sdk.runScript({ ...args, script, allowCommit: false });
    if (reply.isError || !reply.result?.page) throw new Error(reply.output || 'Could not read the Project media.');
    const batch = reply.result;
    if (total !== undefined && total !== batch.total) throw new Error('Project media changed while loading. Try again.');
    total = batch.total;
    if (offset === 0) result = batch.page;
    else for (const key of Object.keys(batch.page)) if (Array.isArray(batch.page[key])) result[key].push(...batch.page[key]);
    if (offset + 32 >= total) return { ...reply, result: batch.array ? result.rows : result };
  }
}

// Generation uses the canonical SDK; the host owns job scope and delivery.
function generationApi(...methods) {
  let service = null;
  service = sdkGeneration(hostSdk);
  return service && methods.every(method => typeof service[method] === 'function') ? service : null;
}

// generation-sdk:start
// Paid jobs always cross the canonical run_script boundary. This panel-local
// adapter preserves old saved job IDs while the host owns scope and delivery.
function sdkGeneration(sdk) {
  if (typeof sdk?.runScript !== "function") return null;
  const run = async (script, summary, allowCommit = false) => {
    const response = await sdk.runScript({ script, summary, allowCommit });
    if (response?.isError) throw new Error(String(response.output || "Generation request failed"));
    return response?.result;
  };
  const job = (scope, id) => `selects.generation.job(${JSON.stringify(id)},${JSON.stringify(scope.projectId)})`;
  return {
    isAvailable: () => true,
    supportsPluginFiles: () => true,
    async submit(request) {
      if (request.batch != null && request.batch !== 1) throw new Error("Submit one generation at a time.");
      const input = {
        projectId: request.scope.projectId, requestKey: request.key,
        modelId: request.modelId, input: request.input, uploads: request.uploads || {},
        outputName: request.outputName, mediaType: request.origin?.tool || "video",
        ...(request.inputMediaSeconds ? { inputMediaSeconds: request.inputMediaSeconds } : {}),
        ...(request.delivery ? { delivery: { folder: request.delivery.pluginFolder } } : {}),
      };
      const result = await run(`const job = await selects.generation.submit(${JSON.stringify(input)}); return {jobId: job.jobId};`, "Start media generation", true);
      if (!result?.jobId) throw new Error("Generation submission is unknown. Resume with the same request key.");
      return { jobIds: [result.jobId] };
    },
    list: scope => run(`return await selects.generation.jobs(${JSON.stringify(scope.projectId)});`, "Read generation progress"),
    cancel: (scope, id) => run(`await ${job(scope, id)}.cancel(); return {requested:true};`, "Cancel generation", true),
    retryDelivery: (scope, id) => run(`await ${job(scope, id)}.retryDelivery(); return {requested:true};`, "Recover generated files", true),
  };
}
// generation-sdk:end

// local-sdk:start
/** Pure host-platform path operations; no filesystem or renderer globals. */
function panelLocalPaths(platform: string) {
  const windows = platform === "win32";
  const slash = (path: string) => {
    if (typeof path !== "string")
      throw new TypeError("A path must be a string.");
    return windows ? path.replace(/\\/g, "/") : path;
  };
  const rootOf = (path: string) => {
    if (windows) {
      const unc = path.match(/^\/\/[^/]+\/[^/]+\/?/);
      if (unc) return unc[0].replace(/\/?$/, "/");
      const drive = path.match(/^[a-z]:\/?/i);
      if (drive) return drive[0];
    }
    return path.startsWith("/") ? "/" : "";
  };
  const native = (value: string) =>
    windows ? value.replace(/\//g, "\\") : value;
  const normalize = (value: string) => {
    const path = slash(value),
      root = rootOf(path),
      absolute = root.endsWith("/");
    const segments: string[] = [];
    for (const segment of path
      .slice(Math.min(root.length, path.length))
      .split("/")) {
      if (!segment || segment === ".") continue;
      if (segment === ".." && segments.length && segments.at(-1) !== "..")
        segments.pop();
      else if (segment !== ".." || !absolute) segments.push(segment);
    }
    let result = root + segments.join("/");
    if (!result || (windows && /^[a-z]:$/i.test(result))) result += ".";
    if (path.endsWith("/") && !result.endsWith("/")) result += "/";
    return native(result);
  };
  const basename = (value: string, extension?: string) => {
    const path = slash(value).replace(/\/+$/, "");
    const withoutDrive = windows ? path.replace(/^[a-z]:/i, "") : path;
    const name = withoutDrive.slice(withoutDrive.lastIndexOf("/") + 1);
    return extension && name.endsWith(extension)
      ? name.slice(0, -extension.length)
      : name;
  };
  return {
    normalize,
    join: (...paths: string[]) => {
      const parts = paths.map(slash).filter(Boolean);
      let joined = parts.join("/");
      if (windows && !/^\/\/[^/]/.test(parts[0] || ""))
        joined = joined.replace(/^\/{2,}/, "/");
      return normalize(joined);
    },
    dirname(value: string) {
      const path = slash(value),
        root = rootOf(path);
      const end = path.replace(/\/+$/, "").lastIndexOf("/");
      if (end < root.length) return value.slice(0, root.length) || ".";
      return value.slice(0, end);
    },
    basename,
    extname(value: string) {
      const name = basename(value),
        dot = name.lastIndexOf(".");
      return dot <= 0 || name === ".." ? "" : name.slice(dot);
    },
    isAbsolute: (value: string) => rootOf(slash(value)).endsWith("/"),
  };
}


/** Plugin-private composition of canonical SDK methods, not a public SDK surface. */
async function createPanelLocalClient(sdk: any) {
  const run = async (method: string, args: unknown[], write = false) => {
    // method names below are fixed implementation constants; values always use JSON encoding.
    // Direct arguments keep object literals contextually typed by the SDK signature.
    const response = await sdk.runScript({
      summary: "Use local media workspace",
      allowCommit: write,
      script: "return await selects." + method + "(" + JSON.stringify(args).slice(1, -1) + ");",
    });
    if (response.isError) throw new Error(response.output || "Local SDK operation failed.");
    // A clipped report has no result. Every read returning data rejects that case below.
    return response.result;
  };
  const environment = await run("files.environment", []);
  if (!environment || typeof environment.platform !== "string" || !environment.homedir)
    throw new Error("Update Selects to use this plugin's local media workspace.");
  const paths = panelLocalPaths(environment.platform);
  const CHUNK_BYTES = 48 * 1024;
  const readRange = async (path: string, offset: number, length: number) => {
    const parts: Uint8Array[] = [];
    let total = 0;
    while (total < length) {
      const result = await run("files.readRange", [{ path, offset: offset + total, length: Math.min(CHUNK_BYTES, length - total) }]);
      if (!result || typeof result.base64 !== "string" || !Number.isInteger(result.bytesRead)) throw new Error("The file read returned an incomplete result.");
      const bytes = Uint8Array.from(atob(result.base64), (character) => character.charCodeAt(0));
      if (bytes.length !== result.bytesRead) throw new Error("The file read returned invalid bytes.");
      parts.push(bytes); total += bytes.length;
      if (bytes.length < Math.min(CHUNK_BYTES, length - (total - bytes.length))) break;
    }
    const output = new Uint8Array(total);
    let position = 0;
    for (const bytes of parts) { output.set(bytes, position); position += bytes.length; }
    return output;
  };
  const files = {
    ...paths,
    homedir: () => environment.homedir,
    getOrCreateTmpDirPath: async () => environment.tempDirectory,
    exists: (path: string) => run("files.exists", [path]),
    stat: (path: string) => run("files.stat", [path]),
    readdir: (path: string) => run("files.readdir", [path]),
    readRange,
    async readFile(path: string, encoding?: string) {
      const stat = await run("files.stat", [path]);
      if (!stat || !Number.isSafeInteger(stat.size) || stat.size < 0) throw new Error("The file is unavailable.");
      const bytes = await readRange(path, 0, stat.size);
      if (bytes.length !== stat.size) throw new Error("The file changed while it was being read.");
      if (encoding !== undefined && encoding !== "utf8") throw new Error("Only utf8 text encoding is supported.");
      return encoding === "utf8" ? new TextDecoder().decode(bytes) : bytes;
    },
    async writeFile(path: string, data: string | Uint8Array, options?: string | { encoding?: string; flag?: "w" | "a" | "wx" }) {
      const encoding = typeof options === "string" ? options : options?.encoding;
      const flag = typeof options === "object" ? options.flag : undefined;
      if (flag !== undefined && !["w", "a", "wx"].includes(flag)) throw new Error("Unsupported file write flag.");
      if (encoding !== undefined && encoding !== "utf8") throw new Error("Only utf8 text encoding is supported.");
      const bytes = typeof data === "string" ? new TextEncoder().encode(data) : new Uint8Array(data);
      if ((flag === "a" || flag === "wx") && bytes.length > CHUNK_BYTES) throw new Error("Atomic append and exclusive creation are limited to 48 KiB.");
      // Each complete replacement has its own sibling file. Other panels cannot
      // overwrite one of its chunks before the final atomic rename publishes it.
      const replacement = flag !== "a" && flag !== "wx";
      const destination = replacement ? path + ".tmp-" + crypto.randomUUID() : path;
      let published = false;
      try {
        for (let offset = 0; offset < bytes.length || offset === 0; offset += CHUNK_BYTES) {
          const chunk = bytes.subarray(offset, offset + CHUNK_BYTES);
          let binary = "";
          for (const byte of chunk) binary += String.fromCharCode(byte);
          const mode = offset === 0 ? (flag === "a" ? "append" : "exclusive") : undefined;
          const result = await run("files.writeChunk", [{ path: destination, offset, base64: btoa(binary), ...(mode ? { mode } : {}) }], true);
          if (result?.bytesWritten !== chunk.length) throw new Error("The file write returned an incomplete result. Check the file before retrying.");
        }
        if (replacement) await run("files.rename", [destination, path], true);
        published = true;
      } finally {
        if (replacement && !published) await run("files.remove", [destination, { force: true }], true).catch(() => {});
      }
    },
    async compareAndReplace(path: string, expectedText: string | null, text: string) {
      const encode = (value: string) => {
        const bytes = new TextEncoder().encode(value);
        if (bytes.length > CHUNK_BYTES) throw new Error("Atomic file values are limited to 48 KiB.");
        let binary = "";
        for (const byte of bytes) binary += String.fromCharCode(byte);
        return btoa(binary);
      };
      const result = await run("files.compareAndReplace", [{path, expectedBase64: expectedText === null ? null : encode(expectedText), base64: encode(text)}], true);
      if (typeof result?.replaced !== "boolean") throw new Error("The atomic file update returned an incomplete result. Read the file before retrying.");
      return result.replaced;
    },
    mkdir: (path: string, options?: { recursive?: boolean }) => run("files.mkdir", [path, options ?? {}], true),
    rm: (path: string, options?: { recursive?: boolean; force?: boolean }) => run("files.remove", [path, options ?? {}], true),
    removeFile: ({ filePath }: { filePath: string }) => run("files.remove", [filePath, { force: true }], true),
    rename: (from: string, to: string) => run("files.rename", [from, to], true),
    copyFile: (from: string, to: string) => run("files.copy", [from, to], true),
    downloadFile: (url: string, path: string) => run("files.download", [url, path], true),
    pathToLocalURL: (path: string) => run("files.localUrl", [path]),
    localURLToPath: (url: string) => run("files.pathFromLocalUrl", [url]),
  };
  const activeJobs = new Set<string>();
  let disposed = false;
  const cancel = async (jobId: string) => {
    const response = await sdk.runScript({ summary: "Cancel local media processing", allowCommit: true, script: "await selects.media.job(" + JSON.stringify(jobId) + ").cancel();" });
    if (response.isError) throw new Error(response.output || "Media cancellation failed.");
  };
  const process = async (executable: "FFmpeg" | "FFprobe", args: string[], _withoutLog?: boolean, signal?: AbortSignal, onStdout?: (text: string) => void, onStderr?: (text: string) => void) => {
    if (disposed || signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const started = await run("media.start" + executable, [{ args }], true);
    if (!started?.jobId) throw new Error("The media process did not return a job id.");
    const jobId = started.jobId;
    activeJobs.add(jobId);
    let cancellation: Promise<void> | null = null;
    const abort = () => { cancellation ??= cancel(jobId); void cancellation.catch(() => {}); };
    signal?.addEventListener("abort", abort, { once: true });
    if (disposed || signal?.aborted) abort();
    let cursor = 0, stdout = "", stderr = "";
    try {
      while (true) {
        if (cancellation) await cancellation;
        const status = await sdk.call("getLocalMediaJobStatus", jobId, { cursor });
        if (!status || !Array.isArray(status.events)) throw new Error("Media status is unavailable.");
        if (status.truncated) throw new Error("Media output was truncated; no incomplete result was accepted.");
        for (const event of status.events) {
          if (event.stream === "stdout") { stdout += event.text; onStdout?.(event.text); }
          else { stderr += event.text; onStderr?.(event.text); }
        }
        cursor = status.nextCursor;
        if (status.state !== "running" && status.events.length === 0) {
          if (status.state === "cancelled" || signal?.aborted) throw new DOMException("Aborted", "AbortError");
          if (status.state === "failed") throw new Error(status.error || stderr || "Media processing failed.");
          return { stdout, stderr };
        }
        if (status.state === "running") await new Promise((resolve) => setTimeout(resolve, 150));
      }
    } catch (error) {
      await cancel(jobId).catch(() => {});
      throw error;
    } finally {
      signal?.removeEventListener("abort", abort);
      activeJobs.delete(jobId);
    }
  };
  return {
    files,
    environment,
    media: {
      runFFmpeg: (args: string[], quiet?: boolean, signal?: AbortSignal, stdout?: (text: string) => void, stderr?: (text: string) => void) => process("FFmpeg", args, quiet, signal, stdout, stderr),
      runFFprobe: (args: string[], quiet?: boolean, signal?: AbortSignal) => process("FFprobe", args, quiet, signal),
    },
    dialogs: {
      pickFilePath: (filters?: Array<{ name: string; extensions: string[] }>) => run("editor.pickFile", [{ filters }]),
      pickDirectoryPath: () => run("editor.pickDirectory", []),
      pickSavePath: (defaultPath: string) => run("editor.pickSavePath", [{ defaultPath }]),
    },
    dispose() { disposed = true; for (const jobId of activeJobs) void cancel(jobId).catch(() => {}); },
  };
}

const panelLocalClients = new WeakMap<object, any>();
function panelLocalClient(sdk: any): any {
  const client = panelLocalClients.get(sdk);
  if (!client) throw new Error("Local SDK has not initialized.");
  return client;
}
function withPanelLocalClient(Component: any) {
  return function LocalSdkPanel(props: any) {
    const [state, setState] = React.useState<any>(null);
    React.useEffect(() => {
      let active = true;
      let client: any;
      createPanelLocalClient(props.sdk).then(value => {
        client = {...props.sdk, ...value};
        if (!active) { value.dispose(); return; }
        panelLocalClients.set(props.sdk, client);
        setState({sdk: props.sdk});
      }).catch(error => { if (active) setState({error: String(error?.message || error)}); });
      return () => {
        active = false;
        if (client) {
          if (panelLocalClients.get(props.sdk) === client) panelLocalClients.delete(props.sdk);
          client.dispose();
        }
      };
    }, [props.sdk]);
    if (state?.error) return React.createElement("div", {role: "alert"}, state.error);
    if (state?.sdk !== props.sdk) return React.createElement("div", {role: "status"}, "Connecting to Selects…");
    return React.createElement(Component, props);
  };
}

export default withPanelLocalClient(Panel);
// local-sdk:end
