// @name Fast Switching Stop Motion
// @name:de Schneller Wechsel Stop-Motion
// @name:en Fast Switching Stop Motion
// @name:es Stop motion de cambio rápido
// @name:fr Stop motion à changement rapide
// @name:it Stop motion a cambio rapido
// @name:ja 高速切り替えストップモーション
// @name:ko Fast Switching Stop Motion
// @name:pt Stop motion de troca rápida
// @name:tr Hızlı Geçişli Stop Motion
// @name:zh 快速切换定格动画
// @collection visual-highlights
// @icon video
// Builds a fast-switching stop-motion Draft: short ~0.14s moments from each
// chosen video, interleaved round-robin and looped to a fixed ~5.6s, with the
// source sound muted and the template's own music track underneath. Every cut stays an editable clip.
// Moments are chosen per video: ffmpeg motion only rules out frozen or blurred
// windows, candidates are spread evenly across the take, and the Selects AI
// picks the two best-posed ones.
import React, { useEffect, useRef, useState } from "react";

const STRINGS = {
  en: {
    title: "Fast Switching Stop Motion",
    noProject: "Open a project to use this template.",
    loading: "Reading project media…",
    videos: "Videos",
    videosHint: "Each checked video becomes one beat of the loop, in this order.",
    noVideos: "This project has no videos yet.",
    keepSound: "Keep original sound",
    create: "Create Draft",
    creating: "Creating…",
    needTwo: "Choose at least two videos.",
    steps: ["Find moments", "Cut moments", "Sound", "Open Draft"],
    aiFallback: "AI pick unavailable; used motion-only moments.",
    done: (n: number, s: string) => `Created a Draft with ${n} cuts (${s}s).`,
    failed: "Could not create the Draft.",
    needsNewer: "This template needs a newer version of Selects. Update Selects and try again.",
  },
  ko: {
    title: "\ube60\ub978 \uc804\ud658 \uc2a4\ud1b1\ubaa8\uc158",
    noProject: "\uc774 \ud15c\ud50c\ub9bf\uc744 \uc4f0\ub824\uba74 \ud504\ub85c\uc81d\ud2b8\ub97c \uc5ec\uc138\uc694.",
    loading: "\ud504\ub85c\uc81d\ud2b8 \ubbf8\ub514\uc5b4\ub97c \uc77d\ub294 \uc911…",
    videos: "\uc601\uc0c1",
    videosHint: "\uc120\ud0dd\ud55c \uc601\uc0c1\uc774 \uc774 \uc21c\uc11c\ub300\ub85c \ub8e8\ud504\uc758 \ud55c \ubc15\uc790\uc529\uc774 \ub429\ub2c8\ub2e4.",
    noVideos: "\uc774 \ud504\ub85c\uc81d\ud2b8\uc5d0 \uc544\uc9c1 \uc601\uc0c1\uc774 \uc5c6\uc2b5\ub2c8\ub2e4.",
    keepSound: "\uc6d0\ubcf8 \uc18c\ub9ac \uc720\uc9c0",
    create: "Draft \ub9cc\ub4e4\uae30",
    creating: "\ub9cc\ub4dc\ub294 \uc911…",
    needTwo: "\uc601\uc0c1\uc744 \ub450 \uac1c \uc774\uc0c1 \uace0\ub974\uc138\uc694.",
    steps: ["\uc88b\uc740 \uad6c\uac04 \ucc3e\uae30", "\uad6c\uac04 \uc790\ub974\uae30", "\uc0ac\uc6b4\ub4dc", "Draft \uc5f4\uae30"],
    aiFallback: "AI \uc120\ud0dd\uc744 \uc4f8 \uc218 \uc5c6\uc5b4 \uc6c0\uc9c1\uc784 \uae30\uc900\uc73c\ub85c\ub9cc \uace8\ub790\uc2b5\ub2c8\ub2e4.",
    done: (n: number, s: string) => `\ucef7 ${n}\uac1c(${s}\ucd08)\ub85c Draft\ub97c \ub9cc\ub4e4\uc5c8\uc2b5\ub2c8\ub2e4.`,
    failed: "Draft\ub97c \ub9cc\ub4e4\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4.",
    needsNewer: "\uc774 \ud15c\ud50c\ub9bf\uc744 \uc4f0\ub824\uba74 \ub354 \ucd5c\uc2e0 \ubc84\uc804\uc758 Selects\uac00 \ud544\uc694\ud569\ub2c8\ub2e4. Selects\ub97c \uc5c5\ub370\uc774\ud2b8\ud55c \ub4a4 \ub2e4\uc2dc \uc2dc\ub3c4\ud558\uc138\uc694.",
  },
  ja: {
    title: "高速切り替えストップモーション",
    noProject: "このテンプレートを使うにはプロジェクトを開いてください。",
    loading: "プロジェクトのメディアを読み込み中…",
    videos: "動画",
    videosHint: "チェックした動画がこの順番でループの1拍ずつになります。",
    noVideos: "このプロジェクトにはまだ動画がありません。",
    keepSound: "元の音声を残す",
    create: "ドラフトを作成",
    creating: "作成中…",
    needTwo: "動画を2本以上選んでください。",
    steps: ["良い瞬間を探す", "瞬間をカット", "サウンド", "ドラフトを開く"],
    aiFallback: "AI選択を使えなかったため、動きだけで選びました。",
    done: (n: number, s: string) => `${n}カット（${s}秒）のドラフトを作成しました。`,
    failed: "ドラフトを作成できませんでした。",
    needsNewer: "このテンプレートには新しいバージョンの Selects が必要です。Selects をアップデートしてもう一度お試しください。",
  },
  zh: {
    title: "快速切换定格动画",
    noProject: "请打开一个项目以使用此模板。",
    loading: "正在读取项目媒体…",
    videos: "视频",
    videosHint: "勾选的每个视频按此顺序成为循环中的一拍。",
    noVideos: "此项目中还没有视频。",
    keepSound: "保留原声",
    create: "创建草稿",
    creating: "正在创建…",
    needTwo: "请至少选择两个视频。",
    steps: ["寻找瞬间", "剪切瞬间", "声音", "打开草稿"],
    aiFallback: "无法使用 AI 选择，已仅按动作挑选。",
    done: (n: number, s: string) => `已创建包含 ${n} 个剪辑（${s} 秒）的草稿。`,
    failed: "无法创建草稿。",
    needsNewer: "此模板需要更新版本的 Selects。请更新 Selects 后重试。",
  },
  de: {
    title: "Schneller Wechsel Stop-Motion",
    noProject: "Öffne ein Projekt, um diese Vorlage zu verwenden.",
    loading: "Projektmedien werden gelesen…",
    videos: "Videos",
    videosHint: "Jedes ausgewählte Video wird in dieser Reihenfolge zu einem Schlag der Schleife.",
    noVideos: "Dieses Projekt enthält noch keine Videos.",
    keepSound: "Originalton behalten",
    create: "Entwurf erstellen",
    creating: "Wird erstellt…",
    needTwo: "Wähle mindestens zwei Videos aus.",
    steps: ["Momente finden", "Momente schneiden", "Ton", "Entwurf öffnen"],
    aiFallback: "KI-Auswahl nicht verfügbar; Momente nur nach Bewegung gewählt.",
    done: (n: number, s: string) => `Entwurf mit ${n} Schnitten (${s} s) erstellt.`,
    failed: "Der Entwurf konnte nicht erstellt werden.",
    needsNewer: "Diese Vorlage benötigt eine neuere Version von Selects. Aktualisiere Selects und versuche es erneut.",
  },
  es: {
    title: "Stop motion de cambio rápido",
    noProject: "Abre un proyecto para usar esta plantilla.",
    loading: "Leyendo los medios del proyecto…",
    videos: "Vídeos",
    videosHint: "Cada vídeo marcado se convierte en un tiempo del bucle, en este orden.",
    noVideos: "Este proyecto aún no tiene vídeos.",
    keepSound: "Mantener el sonido original",
    create: "Crear borrador",
    creating: "Creando…",
    needTwo: "Elige al menos dos vídeos.",
    steps: ["Buscar momentos", "Cortar momentos", "Sonido", "Abrir borrador"],
    aiFallback: "La selección con IA no está disponible; se usaron solo momentos por movimiento.",
    done: (n: number, s: string) => `Borrador creado con ${n} cortes (${s} s).`,
    failed: "No se pudo crear el borrador.",
    needsNewer: "Esta plantilla necesita una versión más reciente de Selects. Actualiza Selects y vuelve a intentarlo.",
  },
  fr: {
    title: "Stop motion à changement rapide",
    noProject: "Ouvrez un projet pour utiliser ce modèle.",
    loading: "Lecture des médias du projet…",
    videos: "Vidéos",
    videosHint: "Chaque vidéo cochée devient un temps de la boucle, dans cet ordre.",
    noVideos: "Ce projet ne contient pas encore de vidéos.",
    keepSound: "Garder le son d'origine",
    create: "Créer un brouillon",
    creating: "Création…",
    needTwo: "Choisissez au moins deux vidéos.",
    steps: ["Trouver les moments", "Couper les moments", "Son", "Ouvrir le brouillon"],
    aiFallback: "Sélection par IA indisponible ; moments choisis selon le mouvement uniquement.",
    done: (n: number, s: string) => `Brouillon créé avec ${n} plans (${s} s).`,
    failed: "Impossible de créer le brouillon.",
    needsNewer: "Ce modèle nécessite une version plus récente de Selects. Mettez Selects à jour et réessayez.",
  },
  it: {
    title: "Stop motion a cambio rapido",
    noProject: "Apri un progetto per usare questo modello.",
    loading: "Lettura dei media del progetto…",
    videos: "Video",
    videosHint: "Ogni video selezionato diventa un battito del loop, in quest'ordine.",
    noVideos: "Questo progetto non ha ancora video.",
    keepSound: "Mantieni l'audio originale",
    create: "Crea bozza",
    creating: "Creazione…",
    needTwo: "Scegli almeno due video.",
    steps: ["Trova i momenti", "Taglia i momenti", "Audio", "Apri bozza"],
    aiFallback: "Selezione IA non disponibile; momenti scelti solo in base al movimento.",
    done: (n: number, s: string) => `Bozza creata con ${n} tagli (${s} s).`,
    failed: "Impossibile creare la bozza.",
    needsNewer: "Questo modello richiede una versione più recente di Selects. Aggiorna Selects e riprova.",
  },
  pt: {
    title: "Stop motion de troca rápida",
    noProject: "Abra um projeto para usar este modelo.",
    loading: "Lendo a mídia do projeto…",
    videos: "Vídeos",
    videosHint: "Cada vídeo marcado vira uma batida do loop, nesta ordem.",
    noVideos: "Este projeto ainda não tem vídeos.",
    keepSound: "Manter o som original",
    create: "Criar rascunho",
    creating: "Criando…",
    needTwo: "Escolha pelo menos dois vídeos.",
    steps: ["Encontrar momentos", "Cortar momentos", "Som", "Abrir rascunho"],
    aiFallback: "Seleção por IA indisponível; momentos escolhidos só pelo movimento.",
    done: (n: number, s: string) => `Rascunho criado com ${n} cortes (${s} s).`,
    failed: "Não foi possível criar o rascunho.",
    needsNewer: "Este modelo precisa de uma versão mais recente do Selects. Atualize o Selects e tente novamente.",
  },
  tr: {
    title: "Hızlı Geçişli Stop Motion",
    noProject: "Bu şablonu kullanmak için bir proje açın.",
    loading: "Proje medyası okunuyor…",
    videos: "Videolar",
    videosHint: "İşaretlenen her video bu sırayla döngünün bir vuruşu olur.",
    noVideos: "Bu projede henüz video yok.",
    keepSound: "Orijinal sesi koru",
    create: "Taslak oluştur",
    creating: "Oluşturuluyor…",
    needTwo: "En az iki video seçin.",
    steps: ["Anları bul", "Anları kes", "Ses", "Taslağı aç"],
    aiFallback: "Yapay zekâ seçimi kullanılamadı; anlar yalnızca harekete göre seçildi.",
    done: (n: number, s: string) => `${n} kesimli (${s} sn) bir taslak oluşturuldu.`,
    failed: "Taslak oluşturulamadı.",
    needsNewer: "Bu şablon Selects'in daha yeni bir sürümünü gerektiriyor. Selects'i güncelleyip tekrar deneyin.",
  },
};

type Media = { id: string; name: string; type: string; seconds: number; path: string | null; fps: number | null };

// Matches the reference TikTok: ~5.6s total, ~138ms per cut (7.1 cuts/s).
const TOTAL_SECONDS = 5.6;
// Fixed to fit the template music; the user does not tune it.
const CUT_SECONDS = 0.138;
// Frame-to-frame change is ffmpeg YAVG at 64px wide. Motion never ranks moments;
// it only drops windows that are frozen (below STILL_RATIO of the take's own
// median) or smeared (any frame above BLUR_YAVG; the reference TikTok's cuts
// stay under ~11). Judging the pose is left to the AI.
const STILL_RATIO = 0.25;
const BLUR_YAVG = 12;
// The template's own music, relative to the user's home directory.
const PLUGIN_ID = "fast-switching-stopmotion";
// Installed with the plugin beneath SELECTS_USER_SKILLS_ROOT/fast-switching-stopmotion/.
const MUSIC_FILE = "assets/music.mp3";
const CANDIDATES = 6;
// Takes up to FULL_SCAN_SECONDS are scanned whole. Longer takes are scanned only
// in one SCAN_WINDOW_SECONDS window at the middle of each candidate part, so a
// 27-minute take costs six short decodes instead of the whole file.
const FULL_SCAN_SECONDS = 120;
const SCAN_WINDOW_SECONDS = 3;

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

// The host's bundled ffmpeg with an argv array (no shell), stopped after `timeoutMs`.
async function ffmpeg(args: string[], timeoutMs: number) {
  const rt = hostNeed("Runtime", "runFFmpeg");
  const controller = typeof AbortController === "undefined" ? null : new AbortController();
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  try {
    const r = await rt.runFFmpeg(["-nostdin", "-v", "error", "-y", ...args], true, controller ? controller.signal : undefined);
    return { stdout: String(r?.stdout || ""), stderr: String(r?.stderr || "") };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

// A path as a filter option value inside a filtergraph: escaped once for the
// option (\ ' :) and once for the graph (\ ' [ ] , ;), so a Windows path such
// as C:\Users\... reaches the filter intact.
const filterPath = (p: string) => p.replace(/[\\':]/g, (c) => "\\" + c).replace(/[\\'\[\],;]/g, (c) => "\\" + c);

// A unique ASCII file name for a temporary file in the data folder.
const tempName = (prefix: string, ext: string) => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}.${ext}`;

// The YAVG values in ffmpeg's metadata=print output, in frame order.
function parseYavg(text: string): number[] {
  return Array.from(String(text).matchAll(/YAVG=([0-9.]+)/g), (m) => Number(m[1])).filter((x) => Number.isFinite(x));
}

// One motion value per frame: difference to the previous frame. The values go
// to a temporary file in the data folder (or to stdout without one). With
// `span`, only that part of the take is decoded (input seek, then -t).
async function motionSeries(path: string, dataDir: string | null, span?: { start: number; seconds: number }): Promise<number[]> {
  const tmp = dataDir ? hostJoin(dataDir, tempName("motion", "txt")) : null;
  const graph = "scale=64:-2,format=gray,tblend=all_mode=difference,signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=" + (tmp ? filterPath(tmp) : "-");
  const seek = span ? ["-ss", span.start.toFixed(3), "-t", span.seconds.toFixed(3)] : [];
  try {
    const r = await ffmpeg([...seek, "-i", path, "-an", "-sn", "-dn", "-vf", graph, "-f", "null", "-"], 60000);
    return parseYavg(tmp ? await hostReadText(tmp) : r.stdout);
  } finally {
    if (tmp) await hostRemove(tmp);
  }
}

// The parts of a take to scan: the whole take when it is short, otherwise one
// window centred on the middle of each candidate part (where shortlist looks).
function scanSpans(seconds: number): { start: number; seconds: number }[] | null {
  if (!(seconds > FULL_SCAN_SECONDS)) return null;
  return Array.from({ length: CANDIDATES }, (_, i) => {
    const mid = ((i + 0.5) * seconds) / CANDIDATES;
    const start = Math.max(0, Math.min(seconds - SCAN_WINDOW_SECONDS, mid - SCAN_WINDOW_SECONDS / 2));
    return { start, seconds: SCAN_WINDOW_SECONDS };
  });
}

// Motion segments of a take: [{ offset: 0, series }] for a whole-take scan.
async function motionSegments(path: string, seconds: number, dataDir: string | null): Promise<{ offset: number; series: number[] }[]> {
  const spans = scanSpans(seconds);
  if (!spans) return [{ offset: 0, series: await motionSeries(path, dataDir) }];
  const out = [];
  for (const span of spans) out.push({ offset: span.start, series: await motionSeries(path, dataDir, span) });
  return out;
}

// Bytes as base64, in slices so a large image never overflows the argument list.
function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  for (let at = 0; at < bytes.length; at += 0x8000) bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(at, at + 0x8000)));
  return btoa(bin);
}

// Candidate window starts (seconds): the take is split into CANDIDATES equal
// parts and each part offers the usable window nearest its middle. `segments`
// are scanned parts of the take ({ offset: 0, series } for the whole take); the
// still threshold uses the median over every scanned frame.
function shortlist(segments: { offset: number; series: number[] }[], fps: number, cut: number, seconds: number) {
  const len = Math.max(1, Math.round(cut * fps));
  const sorted = segments.flatMap((g) => g.series).sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)] ?? 0;
  const usable: number[] = [];
  for (const { offset, series } of segments) {
    for (let s = 1; s + len <= series.length; s++) {
      const w = series.slice(s, s + len);
      const mean = w.reduce((a, b) => a + b, 0) / len;
      const start = offset + (s - 1) / fps;
      if (Math.max(...w) > BLUR_YAVG || mean < median * STILL_RATIO) continue;
      if (start + cut > seconds - 0.05) continue;
      usable.push(start);
    }
  }
  const out: number[] = [];
  for (let i = 0; i < CANDIDATES; i++) {
    const mid = ((i + 0.5) * seconds) / CANDIDATES;
    const best = usable.reduce((a, b) => (Math.abs(b - mid) < Math.abs(a - mid) ? b : a), usable[0]);
    if (best != null && !out.includes(best)) out.push(best);
  }
  return out;
}

// A grid image: one row per video, one column per candidate moment.
async function contactSheet(rows: { path: string; starts: number[] }[], cut: number, dataDir: string | null): Promise<string> {
  const cols = Math.max(...rows.map((r) => r.starts.length));
  const inputs: string[] = [];
  const cells: string[] = [];
  let i = 0;
  rows.forEach((row, r) => {
    for (let c = 0; c < cols; c++) {
      const t = row.starts[Math.min(c, row.starts.length - 1)] + cut / 2;
      inputs.push("-ss", t.toFixed(3), "-i", row.path);
      cells.push(`[${i}:v]scale=150:266:force_original_aspect_ratio=decrease,pad=150:266,trim=end_frame=1,setsar=1[c${i}]`);
      i++;
    }
  });
  const rowsF = rows.map((_, r) => `${Array.from({ length: cols }, (_, c) => `[c${r * cols + c}]`).join("")}hstack=${cols}[r${r}]`);
  const graph = [...cells, ...rowsF, `${rows.map((_, r) => `[r${r}]`).join("")}vstack=${rows.length}[out]`].join(";");
  // The sheet is written to a temporary file in the plugin's data folder and
  // read back as bytes.
  if (!dataDir) throw new Error("no data folder for the contact sheet");
  const file = hostJoin(dataDir, tempName("sheet", "jpg"));
  try {
    await ffmpeg([...inputs, "-filter_complex", graph, "-map", "[out]", "-frames:v", "1", "-q:v", "7", file], 60000);
    const bytes = await hostReadBytes(file);
    if (!bytes.length) throw new Error("empty contact sheet");
    return `data:image/jpeg;base64,${bytesToBase64(bytes)}`;
  } finally {
    await hostRemove(file);
  }
}

// Ask the Selects AI which two columns per row are the best moments.
async function aiPick(sdk, image: string, rows: { name: string; starts: number[] }[]) {
  const prompt = [
    `The image is a grid of ${rows.length} rows by ${rows[0].starts.length} columns.`,
    `Each row is one selfie video (top to bottom: ${rows.map((r) => r.name).join(", ")}); each column is a candidate moment in that video (left to right, 0-based).`,
    `For a fast outfit-switch stop-motion edit, choose the 2 best columns in every row: face clearly visible and sharp, eyes open, posing to the camera,`,
    `no phone or hand covering the face, not looking down at a screen. Prefer two columns with visibly different poses.`,
    `Reply with JSON only, like {"picks":[[0,2],[1,3]]} with one pair per row in row order.`,
  ].join(" ");
  const answer = await sdk.askAI({ prompt, images: [{ dataUrl: image, name: "Moment candidates" }], timeoutMs: 120000 });
  const json = answer.text.match(/\{[\s\S]*\}/);
  if (!json) return null;
  const picks = JSON.parse(json[0]).picks;
  if (!Array.isArray(picks) || picks.length !== rows.length) return null;
  return picks.map((pair, r) =>
    (Array.isArray(pair) ? pair : []).map((c) => rows[r].starts[c]).filter((x) => typeof x === "number").slice(0, 2)
  );
}

// The project's videos and audio: names, durations, file paths and frame rates.
function mediaScript(projectId: string, resourceIds: string[] | null = null) {
  return `const selected = ${JSON.stringify(resourceIds)};const project = selects.project(${JSON.stringify(projectId)});
const files = {};
const walk = (nodes) => { for (const n of nodes ?? []) { if (n.resourceId) files[n.resourceId] = n; walk(n.children); } };
// Past 200 files sourceFiles() returns per-folder counts; read each folder then.
const tree = await project.sourceFiles();
if ("fileTree" in tree) walk(tree.fileTree);
else for (const f of tree.folders) { const sub = await project.sourceFiles({ folder: f.name }); if ("fileTree" in sub) walk(sub.fileTree); }
return (await project.resources())
  .filter(r => (r.type === "Video" || r.type === "Audio") && (!selected || selected.includes(r.resourceId)))
  .map(r => ({ id: r.resourceId, name: r.name, type: r.type, seconds: r.durationSeconds ?? 0,
    path: files[r.resourceId]?.path ?? null, fps: files[r.resourceId]?.frameRate ?? null }));`;
}

// Finds the moments, cuts them into a new Draft and sets its sound. Resolves
// the new Draft, or throws with what went wrong. `onStep` follows `steps`.
async function buildStopMotion(
  sdk,
  { projectId, chosen, keepSound, name, onStep = (_: number) => {} }:
    { projectId: string; chosen: Media[]; keepSound: boolean; name: string; onStep?: (step: number) => void }
) {
  hostUseSdk(sdk);
  // The host tools and the install folder are checked before anything is
  // created, so a missing piece never leaves a half-made Draft behind.
  hostNeed("Runtime", "runFFmpeg");
  hostNeed("FileSystem", "readFile");
  const { plugin, data } = await hostRoots(sdk, PLUGIN_ID, MUSIC_FILE);
  const musicPath = hostJoin(plugin, ...MUSIC_FILE.split("/"));

  // 1. Find moments: motion shortlist per video, then an AI pick of two.
  onStep(0);
  const cut = CUT_SECONDS;
  const rows = [];
  for (const v of chosen) {
    if (!v.path) throw new Error(`No file path for ${v.name}`);
    // Motion unknown (ffmpeg failed) falls back to the fixed moment below.
    let segments: { offset: number; series: number[] }[] = [];
    try { segments = await motionSegments(v.path, v.seconds, data); } catch (e) { console.warn("[fast-switching-stopmotion] motion:", e); }
    const starts = shortlist(segments, v.fps ?? 30, cut, v.seconds);
    rows.push({ name: v.name, path: v.path, starts: starts.length ? starts : [Math.min(1, v.seconds / 4)] });
  }
  let moments: number[][] | null = null;
  let aiError = "";
  try {
    moments = await aiPick(sdk, await contactSheet(rows, cut, data), rows);
    if (!moments) aiError = "unreadable AI answer";
  } catch (e) {
    aiError = String(e?.message ?? e).slice(0, 200);
  }
  const usedFallback = !moments || moments.some((m) => m.length === 0);
  if (usedFallback) moments = rows.map((r) => r.starts.slice(0, 2));

  // 2. Cut moments. Cut boundaries follow the Draft's own fps so the
  //    rhythm holds at 24, 30 or 60 fps (e.g. 3-3-4-3… frames at 24).
  onStep(1);
  const plan = {
    projectId,
    clips: chosen.map((v, i) => ({ id: v.id, seconds: v.seconds, moments: moments[i] })),
    cut,
    total: TOTAL_SECONDS,
    name,
  };
  const built = await sdk.runScript({
    summary: "Cut stop-motion moments",
    allowCommit: true,
    script: `
const plan = ${JSON.stringify(plan)};
const project = selects.project(plan.projectId);
const draft = await project.createDraft({ name: plan.name });
const fps = (await draft.meta()).fps;
const edge = (k) => Math.round(k * plan.cut * fps);
// Fixed total length: the cut count follows from it, whatever the video count.
const cuts = Math.max(plan.clips.length, Math.round(plan.total / plan.cut));
for (let k = 0; k < cuts; k++) {
  const clip = plan.clips[k % plan.clips.length];
  const loop = Math.floor(k / plan.clips.length);
  const frames = Math.max(1, edge(k + 1) - edge(k));
  const len = frames / fps;
  const latest = Math.max(0, clip.seconds - len - 0.05);
  const start = Math.min(clip.moments[loop % clip.moments.length], latest);
  await draft.insertResource({ resourceId: clip.id, sourceRange: { startSeconds: start, endSeconds: start + len } });
}
const saved = await draft.commitAll("Cut stop-motion moments");
const main = await draft.clips({ trackScope: "main" });
return { draftId: saved.createdDraftId, cuts: main.length, endFrame: main.reduce((a, c) => Math.max(a, c.endFrame), 0), fps };`,
  });
  const made = built.result as { draftId?: string; cuts: number; endFrame: number; fps: number } | undefined;
  if (built.isError || !made?.draftId) throw new Error(built.output);

  // 3. Sound: mute the moments and lay the template's fixed music under the
  //    whole Draft. The track ships in this panel's asset folder and is
  //    imported into the Project once.
  onStep(2);
  // Importing is a Project edit, so it runs in its own call before the
  // Draft edit (one run_script cannot commit both).
  const imported = await sdk.runScript({
    summary: "Add template music",
    allowCommit: true,
    script: `
const project = selects.project(${JSON.stringify(projectId)});
const musicPath = ${JSON.stringify(musicPath)};
// Host paths are compared normalised (NFC, / separators, case-folded on
// Windows); the fallback matches the install's own folder/assets/file tail.
const norm = (p) => { const s = String(p).normalize("NFC").replace(/\\\\/g, "/"); return ${JSON.stringify(hostIsWindows())} ? s.toLowerCase() : s; };
const tail = (p) => norm(p).split("/").slice(-3).join("/");
const files = {};
const tails = {};
const walk = (nodes) => { for (const n of nodes ?? []) { if (n.path) { files[norm(n.path)] = n.resourceId; const k = tail(n.path); if (!(k in tails)) tails[k] = n.resourceId; } walk(n.children); } };
const tree = await project.sourceFiles();
if ("fileTree" in tree) walk(tree.fileTree);
const existing = files[norm(musicPath)] ?? tails[tail(musicPath)];
if (existing) return existing;
const added = (await project.importFiles({ paths: [musicPath] })).addedResourceIds[0];
if (!added) throw new Error("Template music could not be imported: " + musicPath);
return added;`,
  });
  const musicId = imported.result as string | undefined;
  if (imported.isError || !musicId) throw new Error(imported.output);
  const sound = await sdk.runScript({
    summary: "Set stop-motion sound",
    allowCommit: true,
    script: `
const draft = selects.draft(${JSON.stringify(made.draftId)});
const whole = await draft.rangeAtFrames(0, ${made.endFrame});
if (!${JSON.stringify(keepSound)}) await draft.setAudioTracks({ target: whole, audioSourceIndexes: [] });
await draft.overlayResource({ resource: selects.project(${JSON.stringify(projectId)}).resource(${JSON.stringify(musicId)}), over: whole });
await draft.commitAll("Set stop-motion sound");
return true;`,
  });
  if (sound.isError) throw new Error(sound.output);
  return { ...made, draftId: made.draftId, usedFallback, aiError };
}

const TEMPLATE_FAILED = "Fast Switching Stop Motion couldn't make the timeline. Try again.";

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

// A Clip highlights run (`context.template`): the videos picked in the app,
// in their order, with the panel's defaults (original sound off unless the
// run's option says keep), built out of sight and reported once.
function TemplateRun({ sdk, context }) {
  const t = STRINGS[context.language] ?? STRINGS.en;
  const runId = context.template?.runId;
  const [status, setStatus] = useState("Making your stop motion…");
  const started = useRef<string | null>(null), alive = useRef(true), latest = useRef(context);
  latest.current = context;
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => {
    if (!runId || started.current === runId) return;
    started.current = runId;
    const live = () => alive.current && latest.current.template?.runId === runId;
    let ended = false;
    const finish = (result) => { if (ended) return; ended = true; if (!live()) return; try { sdk.finishTemplate(result); } catch {} };
    (async () => {
      const template = context.template, projectId = context.projectId;
      if (!projectId) throw new Error("Open a project, then try again.");
      const picks = (template.inputs?.looks ?? []).filter((pick) => pick?.resourceId);
      if (picks.length < 2) throw new Error(t.needTwo);
      const ids = await scriptResourceIds(sdk, projectId, picks.map(x => x.resourceId));
      const r = await readMediaPages(sdk, { summary: "Read project media", script: mediaScript(projectId, [...ids.values()]) });
      if (r.isError || !Array.isArray(r.result)) throw new Error("Couldn't read this project's videos. Try again.");
      const byId = new Map((r.result as Media[]).filter((m) => m.type === "Video").map((m) => [m.id, m]));
      const chosen = picks.map((pick) => byId.get(ids.get(pick.resourceId) ?? pick.resourceId));
      const missing = picks.find((pick, i) => !chosen[i]?.path);
      if (missing) throw new Error(`Couldn't find ${missing.name || "a picked video"} in this project. Try again.`);
      if (!live()) return;
      setStatus("Finding the best moments…");
      const made = await buildStopMotion(sdk, {
        projectId, chosen: chosen as Media[], keepSound: template.options?.sound === "keep", name: t.title,
      });
      finish({ sequenceId: made.draftId });
    })().catch((e) => {
      console.warn("[fast-switching-stopmotion] template run failed:", e);
      const said = e?.code === "host-missing" ? t.needsNewer : String(e?.message ?? "");
      finish({ error: said && said.length <= 160 && !/[\n{]/.test(said) ? said : TEMPLATE_FAILED });
    });
  }, [runId]);
  return <small>{status}</small>;
}

function Panel(props) {
  hostUseSdk(props.sdk);
  return props.context?.template ? <TemplateRun {...props} /> : <StopMotionPanel {...props} />;
}

function StopMotionPanel({ sdk, context, ui }) {
  const t = STRINGS[context.language] ?? STRINGS.en;
  const projectId: string | null = context.projectId;
  const [media, setMedia] = useState<Media[] | null>(null);
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const [keepSound, setKeepSound] = useState(false);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(-1);
  const [status, setStatus] = useState<{ tone: "error" | "success"; text: string } | null>(null);

  // Keep polling quiet while a Draft is being built.
  const busyRef = useRef(false);
  busyRef.current = busy;

  useEffect(() => {
    setMedia(null);
    setStatus(null);
    if (!projectId) return;
    let live = true;
    let signature = "";
    let first = true;
    let reading = false;

    // Full read: names, durations, file paths and frame rates.
    async function load() {
      const r = await readMediaPages(sdk, {
        summary: "Read project media",
        script: mediaScript(projectId),
      });
      if (!live) return;
      if (r.isError || !Array.isArray(r.result)) {
        setStatus({ tone: "error", text: r.output });
        setMedia((m) => m ?? []);
        return false;
      }
      setStatus(null);
      const list = r.result as Media[];
      const videos = list.filter((m) => m.type === "Video");
      setMedia(list);
      // First load checks the first five; later loads keep the user's choices
      // and check videos that were just added.
      setPicked((prev) =>
        Object.fromEntries(videos.map((v, i) => [v.id, first ? i < 5 : v.id in prev ? prev[v.id] : true]))
      );
      first = false;
      return true;
    }

    // Cheap check: re-read everything only when the resource list changed,
    // so videos added or removed after the panel opened show up by themselves.
    async function check() {
      if (!live || reading || busyRef.current || document.visibilityState !== "visible") return;
      reading = true;
      try {
        const rows = await sdk.call("listProjectResources", projectId);
        const next = (rows ?? []).map((r) => `${r.resourceId}:${r.type}:${r.status}`).sort().join("|");
        // Remember the list only once it loaded, so a failed read retries.
        if (next !== signature && (await load())) signature = next;
      } catch (e) {
        if (live && first) setStatus({ tone: "error", text: String(e) });
      } finally {
        reading = false;
      }
    }

    check();
    const timer = setInterval(check, 3000);
    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", check);
    return () => {
      live = false;
      clearInterval(timer);
      window.removeEventListener("focus", check);
      document.removeEventListener("visibilitychange", check);
    };
  }, [projectId]);

  if (!projectId) return <ui.Message>{t.noProject}</ui.Message>;
  if (media == null) return <ui.Progress label={t.loading} />;

  const videos = media.filter((m) => m.type === "Video");
  const chosen = videos.filter((v) => picked[v.id]);

  async function create() {
    if (chosen.length < 2) {
      setStatus({ tone: "error", text: t.needTwo });
      return;
    }
    setBusy(true);
    setStatus(null);
    try {
      const made = await buildStopMotion(sdk, { projectId, chosen, keepSound, name: t.title, onStep: setStep });
      const { usedFallback, aiError } = made;

      // 4. Bring the new Draft forward.
      setStep(3);
      await sdk.runScript({
        summary: "Open stop-motion Draft",
        script: `return await selects.editor.openDraft(${JSON.stringify(made.draftId)});`,
      });
      setStatus({
        tone: "success",
        text: t.done(made.cuts, (made.endFrame / made.fps).toFixed(1)) + (usedFallback ? ` ${t.aiFallback} (${aiError})` : ""),
      });
    } catch (e) {
      setStatus({ tone: "error", text: e?.code === "host-missing" ? t.needsNewer : `${t.failed} ${String(e)}` });
    } finally {
      setBusy(false);
      setStep(-1);
    }
  }

  return (
    <ui.Stack gap={16}>
      <ui.Section title={t.videos}>
        {videos.length === 0 ? (
          <ui.Message>{t.noVideos}</ui.Message>
        ) : (
          <ui.Stack gap={4}>
            <small>{t.videosHint}</small>
            {videos.map((v) => (
              <ui.Toggle
                key={v.id}
                label={v.name}
                value={!!picked[v.id]}
                disabled={busy}
                onChange={(on) => setPicked((p) => ({ ...p, [v.id]: on }))}
              />
            ))}
          </ui.Stack>
        )}
      </ui.Section>
      <ui.Section title={t.title}>
        <ui.Toggle label={t.keepSound} value={keepSound} disabled={busy} onChange={setKeepSound} />
      </ui.Section>
      {busy && <ui.Progress steps={t.steps} current={step} />}
      <ui.Actions>
        <ui.Button variant="primary" busy={busy} busyLabel={t.creating} disabled={videos.length === 0} onClick={create}>
          {t.create}
        </ui.Button>
      </ui.Actions>
      {status && <ui.Message tone={status.tone}>{status.text}</ui.Message>}
    </ui.Stack>
  );
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
    const response = await sdk.runScript({
      summary: "Use local media workspace",
      allowCommit: write,
      script: "return await selects." + method + "(..." + JSON.stringify(args) + ");",
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
