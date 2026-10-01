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

const shq = (v: string) => `'${v.replace(/'/g, `'\\''`)}'`;

// One motion value per frame: difference to the previous frame.
async function motionSeries(sdk, path: string): Promise<number[]> {
  const r = await sdk.runShell({
    summary: "Measure motion",
    command: `ffmpeg -v error -i ${shq(path)} -vf "scale=64:-2,format=gray,tblend=all_mode=difference,signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=-" -f null - | grep -o 'YAVG=[0-9.]*' | cut -d= -f2 | tr '\\n' ' '`,
    timeoutMs: 60000,
  });
  if (r.isError || r.exitCode !== 0) throw new Error(r.stderr || r.output);
  return r.stdout.trim().split(/\s+/).map(Number).filter((x) => Number.isFinite(x));
}

// Candidate window starts (seconds): the take is split into CANDIDATES equal
// parts and each part offers the usable window nearest its middle.
function shortlist(series: number[], fps: number, cut: number, seconds: number) {
  const len = Math.max(1, Math.round(cut * fps));
  const sorted = [...series].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)] ?? 0;
  const usable: number[] = [];
  for (let s = 1; s + len <= series.length; s++) {
    const w = series.slice(s, s + len);
    const mean = w.reduce((a, b) => a + b, 0) / len;
    const start = (s - 1) / fps;
    if (Math.max(...w) > BLUR_YAVG || mean < median * STILL_RATIO) continue;
    if (start + cut > seconds - 0.05) continue;
    usable.push(start);
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
async function contactSheet(sdk, rows: { path: string; starts: number[] }[], cut: number): Promise<string> {
  const cols = Math.max(...rows.map((r) => r.starts.length));
  const inputs: string[] = [];
  const cells: string[] = [];
  let i = 0;
  rows.forEach((row, r) => {
    for (let c = 0; c < cols; c++) {
      const t = row.starts[Math.min(c, row.starts.length - 1)] + cut / 2;
      inputs.push(`-ss ${t.toFixed(3)} -i ${shq(row.path)}`);
      cells.push(`[${i}:v]scale=150:266:force_original_aspect_ratio=decrease,pad=150:266,trim=end_frame=1,setsar=1[c${i}]`);
      i++;
    }
  });
  const rowsF = rows.map((_, r) => `${Array.from({ length: cols }, (_, c) => `[c${r * cols + c}]`).join("")}hstack=${cols}[r${r}]`);
  const graph = [...cells, ...rowsF, `${rows.map((_, r) => `[r${r}]`).join("")}vstack=${rows.length}[out]`].join(";");
  // Shell output is capped (48KB), so write the sheet to a file and read its
  // base64 back in chunks. Each shell call gets its own temp dir, so the file
  // lives in this panel's asset folder instead.
  const dataDir = `"$HOME/.selects/plugin-data/${PLUGIN_ID}"`;
  const file = `"$HOME/.selects/plugin-data/${PLUGIN_ID}/sheet.jpg"`;
  const made = await sdk.runShell({
    summary: "Build moment contact sheet",
    command: `mkdir -p ${dataDir} && ffmpeg -v error -y ${inputs.join(" ")} -filter_complex "${graph}" -map "[out]" -frames:v 1 -q:v 7 ${file} && base64 < ${file} | tr -d '\\n' | wc -c`,
    timeoutMs: 60000,
  });
  if (made.isError || made.exitCode !== 0) throw new Error(made.stderr || made.output);
  const total = Number(made.stdout.trim());
  const CHUNK = 45000;
  let b64 = "";
  for (let at = 0; at < total; at += CHUNK) {
    const part = await sdk.runShell({
      summary: "Read contact sheet",
      command: `base64 < ${file} | tr -d '\\n' | cut -c ${at + 1}-${Math.min(at + CHUNK, total)}`,
      maxOutputBytes: 48 * 1024,
    });
    if (part.isError || part.exitCode !== 0) throw new Error(part.stderr || part.output);
    b64 += part.stdout.trim();
  }
  if (b64.length !== total) throw new Error(`contact sheet read ${b64.length}/${total}`);
  return `data:image/jpeg;base64,${b64}`;
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
function mediaScript(projectId: string) {
  return `const project = selects.project(${JSON.stringify(projectId)});
const files = {};
const walk = (nodes) => { for (const n of nodes ?? []) { if (n.resourceId) files[n.resourceId] = n; walk(n.children); } };
// Past 200 files sourceFiles() returns per-folder counts; read each folder then.
const tree = await project.sourceFiles();
if ("fileTree" in tree) walk(tree.fileTree);
else for (const f of tree.folders) { const sub = await project.sourceFiles({ folder: f.name }); if ("fileTree" in sub) walk(sub.fileTree); }
return (await project.resources())
  .filter(r => r.type === "Video" || r.type === "Audio")
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
  // 1. Find moments: motion shortlist per video, then an AI pick of two.
  onStep(0);
  const cut = CUT_SECONDS;
  const rows = [];
  for (const v of chosen) {
    if (!v.path) throw new Error(`No file path for ${v.name}`);
    const starts = shortlist(await motionSeries(sdk, v.path), v.fps ?? 30, cut, v.seconds);
    rows.push({ name: v.name, path: v.path, starts: starts.length ? starts : [Math.min(1, v.seconds / 4)] });
  }
  let moments: number[][] | null = null;
  let aiError = "";
  try {
    moments = await aiPick(sdk, await contactSheet(sdk, rows, cut), rows);
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
  const root = await sdk.runShell({ summary: "Locate template music", command: 'printf %s "${SELECTS_USER_SKILLS_ROOT:-$HOME/.selects/skills}"' });
  if (root.isError || !root.stdout) throw new Error(root.stderr || root.output);
  const musicPath = `${root.stdout.trim()}/${PLUGIN_ID}/${MUSIC_FILE}`;
  // Importing is a Project edit, so it runs in its own call before the
  // Draft edit (one run_script cannot commit both).
  const imported = await sdk.runScript({
    summary: "Add template music",
    allowCommit: true,
    script: `
const project = selects.project(${JSON.stringify(projectId)});
const musicPath = ${JSON.stringify(musicPath)};
const files = {};
const walk = (nodes) => { for (const n of nodes ?? []) { if (n.path) files[n.path] = n.resourceId; walk(n.children); } };
const tree = await project.sourceFiles();
if ("fileTree" in tree) walk(tree.fileTree);
const existing = files[musicPath];
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
async function scriptResourceIds(sdk, projectId) {
  const [app, run] = await Promise.all([
    sdk.call("listProjectResources", projectId),
    sdk.runScript({ summary: "Match picked clips", allowCommit: false, script: `return (await selects.project(${JSON.stringify(projectId)}).resources()).map(r=>({id:r.resourceId,name:r.name,type:r.type}));` }),
  ]);
  const rows = run?.result;
  if (!Array.isArray(app) || run.isError || !Array.isArray(rows) || app.length !== rows.length || app.some((a, i) => a.name !== rows[i].name || a.type !== rows[i].type)) throw new Error(run?.output || "Could not match the picked clips to this project.");
  return new Map(app.map((a, i) => [a.resourceId, rows[i].id]));
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
      const r = await sdk.runScript({ summary: "Read project media", script: mediaScript(projectId) });
      if (r.isError || !Array.isArray(r.result)) throw new Error("Couldn't read this project's videos. Try again.");
      const byId = new Map((r.result as Media[]).filter((m) => m.type === "Video").map((m) => [m.id, m]));
      const ids = await scriptResourceIds(sdk, projectId);
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
      const said = String(e?.message ?? "");
      finish({ error: said && said.length <= 160 && !/[\n{]/.test(said) ? said : TEMPLATE_FAILED });
    });
  }, [runId]);
  return <small>{status}</small>;
}

export default function Panel(props) {
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

    // Full read: names, durations, file paths and frame rates.
    async function load() {
      const r = await sdk.runScript({
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
      if (!live || busyRef.current || document.visibilityState !== "visible") return;
      try {
        const rows = await sdk.call("listProjectResources", projectId);
        const next = (rows ?? []).map((r) => `${r.resourceId}:${r.type}:${r.status}`).sort().join("|");
        // Remember the list only once it loaded, so a failed read retries.
        if (next !== signature && (await load())) signature = next;
      } catch (e) {
        if (live && first) setStatus({ tone: "error", text: String(e) });
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
      setStatus({ tone: "error", text: `${t.failed} ${String(e)}` });
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
