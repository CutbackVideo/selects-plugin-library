// @name Beat Cutout Gallery
// @name:de Beat-Cutout-Galerie
// @name:en Beat Cutout Gallery
// @name:es Galeria de recortes al ritmo
// @name:fr Galerie decoupee au rythme
// @name:it Galleria cutout a ritmo
// @name:ja ビートカットアウトギャラリー
// @name:ko Beat Cutout Gallery
// @name:pt Galeria de recortes no ritmo
// @name:tr Ritimli Kesit Galerisi
// @name:zh 节拍抠像画廊
// @icon image
// Checks project portraits, then creates an editable beat-synced Selects Draft.
import React from 'react';

const WORDS = {
  en: { title:'Beat Cutout Gallery', intro:'Your portrait photos are checked for clean cutouts, then cut to the beat as an editable Draft.', folder:'Photo folder', all:'All project photos', refresh:'Refresh photos', analyze:'Analyze photos', build:'Make video', busy:'Checking photos…', noProject:'Open a Selects project first.', noPhotos:'Add at least 15 portrait photos to the project.', done:'Created an editable Draft. Photos, stickers, and music remain separate timeline clips.', exactDone:'Created an editable Draft with 24 scenes, four entrance stickers, and a separate music track. Later composites remain inside their scene clips.', missing:'Add more photos.', error:'Could not create video: ', export:'Export with Handoff → Export after review.', selected:'Selected photos', fixed:'Review the photos and leave only the ones you want to use. Scene and sticker slots are assigned after analysis.', macOnly:'Available on macOS for now.' },
  de: { title:'Beat-Cutout-Galerie', intro:'Deine Hochformat-Fotos werden auf saubere Freisteller geprüft und dann beatgenau zu einem bearbeitbaren Draft geschnitten.', folder:'Fotoordner', all:'Alle Projektfotos', refresh:'Fotos neu laden', analyze:'Fotos analysieren', build:'Video erstellen', busy:'Fotos werden geprüft…', noProject:'Öffne zuerst ein Selects-Projekt.', noPhotos:'Füge dem Projekt mindestens 15 Hochformat-Fotos hinzu.', done:'Bearbeitbarer Draft erstellt. Fotos, Sticker und Musik bleiben getrennte Timeline-Clips.', exactDone:'Bearbeitbarer Draft mit 24 Szenen, vier Eingangs-Stickern und einer separaten Musikspur erstellt. Spätere Composites bleiben in ihren Szenen-Clips.', missing:'Füge weitere Fotos hinzu.', error:'Video konnte nicht erstellt werden: ', export:'Nach der Prüfung mit Handoff → Export ausgeben.', selected:'Ausgewählte Fotos', fixed:'Sieh die Fotos durch und behalte nur die, die du verwenden willst. Szenen- und Sticker-Plätze werden nach der Analyse vergeben.', macOnly:'Vorerst nur auf macOS verfügbar.' },
  es: { title:'Galería de recortes al ritmo', intro:'Tus fotos verticales se comprueban para obtener recortes limpios y luego se cortan al ritmo en un Draft editable.', folder:'Carpeta de fotos', all:'Todas las fotos del proyecto', refresh:'Actualizar fotos', analyze:'Analizar fotos', build:'Crear vídeo', busy:'Comprobando fotos…', noProject:'Abre primero un proyecto de Selects.', noPhotos:'Añade al menos 15 fotos verticales al proyecto.', done:'Draft editable creado. Las fotos, los recortes y la música siguen siendo clips independientes.', exactDone:'Draft editable creado con 24 escenas, cuatro recortes de entrada y una pista de música aparte. Los composites posteriores quedan dentro de sus clips de escena.', missing:'Añade más fotos.', error:'No se pudo crear el vídeo: ', export:'Exporta con Handoff → Export después de revisar.', selected:'Fotos seleccionadas', fixed:'Revisa las fotos y deja solo las que quieras usar. Los huecos de escena y recorte se asignan tras el análisis.', macOnly:'Disponible solo en macOS por ahora.' },
  fr: { title:'Galerie découpée au rythme', intro:'Vos photos verticales sont vérifiées pour des découpes nettes, puis montées sur le rythme dans un Draft modifiable.', folder:'Dossier de photos', all:'Toutes les photos du projet', refresh:'Actualiser les photos', analyze:'Analyser les photos', build:'Créer la vidéo', busy:'Vérification des photos…', noProject:'Ouvrez d’abord un projet Selects.', noPhotos:'Ajoutez au moins 15 photos verticales au projet.', done:'Draft modifiable créé. Photos, découpes et musique restent des clips distincts.', exactDone:'Draft modifiable créé avec 24 scènes, quatre découpes d’entrée et une piste musicale séparée. Les composites suivants restent dans leurs clips de scène.', missing:'Ajoutez d’autres photos.', error:'Impossible de créer la vidéo : ', export:'Exportez avec Handoff → Export après relecture.', selected:'Photos sélectionnées', fixed:'Passez les photos en revue et ne gardez que celles à utiliser. Les emplacements de scène et de découpe sont attribués après l’analyse.', macOnly:'Disponible sur macOS pour le moment.' },
  it: { title:'Galleria cutout a ritmo', intro:'Le tue foto verticali vengono controllate per ottenere scontorni puliti, poi tagliate a ritmo in un Draft modificabile.', folder:'Cartella foto', all:'Tutte le foto del progetto', refresh:'Aggiorna foto', analyze:'Analizza foto', build:'Crea video', busy:'Controllo delle foto…', noProject:'Apri prima un progetto Selects.', noPhotos:'Aggiungi al progetto almeno 15 foto verticali.', done:'Draft modificabile creato. Foto, scontorni e musica restano clip separate.', exactDone:'Draft modificabile creato con 24 scene, quattro scontorni d’ingresso e una traccia musicale separata. I composite successivi restano nelle loro clip di scena.', missing:'Aggiungi altre foto.', error:'Impossibile creare il video: ', export:'Esporta con Handoff → Export dopo la revisione.', selected:'Foto selezionate', fixed:'Controlla le foto e lascia solo quelle da usare. Gli slot di scena e scontorno vengono assegnati dopo l’analisi.', macOnly:'Per ora disponibile solo su macOS.' },
  ja: { title:'ビートカットアウトギャラリー', intro:'縦向きの写真をきれいに切り抜けるか確認し、ビートに合わせて編集できるDraftに仕上げます。', folder:'写真フォルダー', all:'プロジェクトのすべての写真', refresh:'写真を再読み込み', analyze:'写真を解析', build:'動画を作成', busy:'写真を確認中…', noProject:'先にSelectsのプロジェクトを開いてください。', noPhotos:'縦向きの写真を15枚以上プロジェクトに追加してください。', done:'編集できるDraftを作成しました。写真、ステッカー、音楽はそれぞれ別のクリップのままです。', exactDone:'24シーン、4つの登場ステッカー、独立した音楽トラックを持つ編集できるDraftを作成しました。以降の合成は各シーンのクリップ内に残ります。', missing:'写真を追加してください。', error:'動画を作成できませんでした: ', export:'確認後、Handoff → Export で書き出してください。', selected:'選択した写真', fixed:'写真を見直して、使うものだけを残してください。シーンとステッカーの枠は解析後に割り当てられます。', macOnly:'現在はmacOSでのみ利用できます。' },
  ko: { title:'\ube44\ud2b8 \ucef7\uc544\uc6c3 \uac24\ub7ec\ub9ac', intro:'\uc138\ub85c \uc0ac\uc9c4\uc774 \uae68\ub057\ud558\uac8c \ub204\ub07c\uac00 \ub530\uc9c0\ub294\uc9c0 \ud655\uc778\ud55c \ub4a4, \ube44\ud2b8\uc5d0 \ub9de\ucdb0 \uc218\uc815 \uac00\ub2a5\ud55c Draft\ub85c \ub9cc\ub4ed\ub2c8\ub2e4.', folder:'\uc0ac\uc9c4 \ud3f4\ub354', all:'\ud504\ub85c\uc81d\ud2b8\uc758 \ubaa8\ub4e0 \uc0ac\uc9c4', refresh:'\uc0ac\uc9c4 \uc0c8\ub85c \uc77d\uae30', analyze:'\uc0ac\uc9c4 \ubd84\uc11d', build:'\uc601\uc0c1 \ub9cc\ub4e4\uae30', busy:'\uc0ac\uc9c4 \ud655\uc778 \uc911…', noProject:'\uba3c\uc800 Selects \ud504\ub85c\uc81d\ud2b8\ub97c \uc5f4\uc5b4\uc8fc\uc138\uc694.', noPhotos:'\uc138\ub85c \uc0ac\uc9c4\uc744 15\uc7a5 \uc774\uc0c1 \ud504\ub85c\uc81d\ud2b8\uc5d0 \ucd94\uac00\ud558\uc138\uc694.', done:'\uc218\uc815 \uac00\ub2a5\ud55c Draft\ub97c \ub9cc\ub4e4\uc5c8\uc2b5\ub2c8\ub2e4. \uc0ac\uc9c4, \uc2a4\ud2f0\ucee4, \uc74c\uc545\uc740 \uac01\uac01 \ubcc4\ub3c4\uc758 \ud074\ub9bd\uc73c\ub85c \ub0a8\uc2b5\ub2c8\ub2e4.', exactDone:'24\uac1c \uc7a5\uba74, \ub4f1\uc7a5 \uc2a4\ud2f0\ucee4 4\uac1c, \ubcc4\ub3c4 \uc74c\uc545 \ud2b8\ub799\uc774 \uc788\ub294 \uc218\uc815 \uac00\ub2a5\ud55c Draft\ub97c \ub9cc\ub4e4\uc5c8\uc2b5\ub2c8\ub2e4. \uc774\ud6c4 \ud569\uc131\uc740 \uac01 \uc7a5\uba74 \ud074\ub9bd \uc548\uc5d0 \ub0a8\uc2b5\ub2c8\ub2e4.', missing:'\uc0ac\uc9c4\uc744 \ub354 \ucd94\uac00\ud558\uc138\uc694.', error:'\uc601\uc0c1\uc744 \ub9cc\ub4e4 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4: ', export:'\uac80\ud1a0 \ud6c4 Handoff → Export\ub85c \ub0b4\ubcf4\ub0b4\uc138\uc694.', selected:'\uc120\ud0dd\ud55c \uc0ac\uc9c4', fixed:'\uc0ac\uc9c4\uc744 \ud655\uc778\ud558\uace0 \uc0ac\uc6a9\ud560 \uac83\ub9cc \ub0a8\uae30\uc138\uc694. \uc7a5\uba74\uacfc \uc2a4\ud2f0\ucee4 \uc790\ub9ac\ub294 \ubd84\uc11d \ud6c4\uc5d0 \ubc30\uc815\ub429\ub2c8\ub2e4.', macOnly:'\uc9c0\uae08\uc740 macOS\uc5d0\uc11c\ub9cc \uc0ac\uc6a9\ud560 \uc218 \uc788\uc2b5\ub2c8\ub2e4.' },
  pt: { title:'Galeria de recortes no ritmo', intro:'Suas fotos na vertical são verificadas para recortes limpos e depois cortadas no ritmo em um Draft editável.', folder:'Pasta de fotos', all:'Todas as fotos do projeto', refresh:'Atualizar fotos', analyze:'Analisar fotos', build:'Criar vídeo', busy:'Verificando fotos…', noProject:'Abra primeiro um projeto do Selects.', noPhotos:'Adicione ao projeto pelo menos 15 fotos na vertical.', done:'Draft editável criado. Fotos, recortes e música continuam clipes separados.', exactDone:'Draft editável criado com 24 cenas, quatro recortes de entrada e uma faixa de música separada. Os composites seguintes ficam dentro dos clipes de cena.', missing:'Adicione mais fotos.', error:'Não foi possível criar o vídeo: ', export:'Exporte com Handoff → Export após revisar.', selected:'Fotos selecionadas', fixed:'Revise as fotos e deixe apenas as que quiser usar. Os espaços de cena e recorte são atribuídos após a análise.', macOnly:'Disponível no macOS por enquanto.' },
  tr: { title:'Ritimli Kesit Galerisi', intro:'Dikey fotoğraflarınız temiz kesim için denetlenir, ardından ritme göre düzenlenebilir bir Draft olarak kesilir.', folder:'Fotoğraf klasörü', all:'Projedeki tüm fotoğraflar', refresh:'Fotoğrafları yenile', analyze:'Fotoğrafları incele', build:'Video oluştur', busy:'Fotoğraflar denetleniyor…', noProject:'Önce bir Selects projesi açın.', noPhotos:'Projeye en az 15 dikey fotoğraf ekleyin.', done:'Düzenlenebilir Draft oluşturuldu. Fotoğraflar, kesitler ve müzik ayrı klipler olarak kalır.', exactDone:'24 sahne, dört giriş kesiti ve ayrı bir müzik parçası olan düzenlenebilir bir Draft oluşturuldu. Sonraki birleşimler kendi sahne kliplerinde kalır.', missing:'Daha fazla fotoğraf ekleyin.', error:'Video oluşturulamadı: ', export:'İnceledikten sonra Handoff → Export ile dışa aktarın.', selected:'Seçilen fotoğraflar', fixed:'Fotoğrafları gözden geçirip yalnızca kullanmak istediklerinizi bırakın. Sahne ve kesit yerleri incelemeden sonra atanır.', macOnly:'Şimdilik yalnızca macOS’ta kullanılabilir.' },
  zh: { title:'节拍抠像画廊', intro:'先检查竖版照片能否干净抠出人物，再按节拍剪成一个可编辑的 Draft。', folder:'照片文件夹', all:'项目中的全部照片', refresh:'重新载入照片', analyze:'分析照片', build:'生成视频', busy:'正在检查照片…', noProject:'请先打开一个 Selects 项目。', noPhotos:'请向项目中添加至少 15 张竖版照片。', done:'已创建可编辑的 Draft。照片、贴纸和音乐仍是各自独立的时间线片段。', exactDone:'已创建包含 24 个场景、四个入场贴纸和一条独立音乐轨的可编辑 Draft。后续合成保留在各自的场景片段内。', missing:'请添加更多照片。', error:'无法生成视频：', export:'审看后用 Handoff → Export 导出。', selected:'已选照片', fixed:'请检查照片，只保留想用的。场景与贴纸的位置在分析后分配。', macOnly:'目前仅在 macOS 上可用。' },
};
const CUES=[
  {start:29,end:40,dir:'up',x:0,y:0,s:1},
  {start:61,end:72,dir:'right',x:0,y:0,s:1},
  {start:93,end:104,dir:'left',x:0,y:0,s:1},
  {start:132,end:140,dir:'down',x:0,y:0,s:1},
  {start:156,end:196,dir:'instant',x:210,y:-205,s:.62},
  {start:166,end:196,dir:'instant',x:-200,y:-120,s:.69},
  {start:180,end:196,dir:'instant',x:80,y:270,s:.76},
  {start:267,end:283,dir:'right',x:-110,y:260,s:.62},
  {start:324,end:337,dir:'left',x:105,y:285,s:.68},
  {start:401,end:411,dir:'down',x:-80,y:250,s:.68},
  {start:436,end:478,dir:'up',x:30,y:290,s:.78},
  {start:457,end:478,dir:'instant',x:0,y:0,s:1}
];
const SCENE_EDGES=[0,40,72,104,140,196,220,235,243,283,307,337,347,371,411,478];
const MOTION = "import React from 'react';import{AbsoluteFill,useCurrentFrame}from'remotion';export default function Sticker({Source,data}){const f=useCurrentFrame();const d=data.dir||'instant';const u=Math.max(0,Math.min(1,f/6));const e=u*u*(3-2*u);const travel=(1-e);const dx=d==='right'?-1250*travel:d==='left'?1250*travel:0;const dy=d==='up'?2100*travel:d==='down'?-2100*travel:0;const x=(data.x||0)+(d==='fade'?0:dx),y=(data.y||0)+(d==='fade'?0:dy);return <AbsoluteFill style={{opacity:d==='fade'?e:1,transform:'translate('+x+'px,'+y+'px) scale('+(data.s||1)+')'}}><Source/></AbsoluteFill>}";
// Reference 211-219: the scene darkens to teal while a circle around the faces stays lit and grows, then a dark red wash before the cut.
const SPOT = "import React from 'react';import{AbsoluteFill,useCurrentFrame}from'remotion';export default function Spot({Source,data}){const t=useCurrentFrame()-(data.at||0);let o=null;if(t>=0&&t<6){const r=70+75*t;o=<AbsoluteFill style={{background:'radial-gradient(circle at '+(data.x*100)+'% '+(data.y*100)+'%, rgba(0,0,0,0) '+r+'px, rgba(8,40,44,0.64) '+(r+3)+'px)'}}/>}else if(t>=6&&t<9){o=<AbsoluteFill style={{background:'rgba(112,18,30,0.4)'}}/>}return <AbsoluteFill><Source/>{o}</AbsoluteFill>}";
// Reference 438-441: a short colour split, blue on the left and orange on the right.
const SPLIT = "import React from 'react';import{AbsoluteFill,useCurrentFrame}from'remotion';export default function Split({Source,data}){const t=useCurrentFrame()-(data.at||0);const on=t>=0&&t<4;return <AbsoluteFill><Source/>{on&&<AbsoluteFill style={{background:'linear-gradient(90deg, rgba(60,100,255,0.5) 0%, rgba(60,100,255,0.5) '+(46+t*3)+'%, rgba(255,150,105,0.38) '+(46+t*3)+'%, rgba(255,150,105,0.38) 100%)',mixBlendMode:'color'}}/>}</AbsoluteFill>}";
const GRADE = "import React from 'react';import{AbsoluteFill,useCurrentFrame}from'remotion';export default function Vintage({Source,data}){const f=useCurrentFrame();const on=f>=(data.at||0);return <AbsoluteFill style={{filter:on?'sepia(0.14) saturate(0.82) contrast(1.07) brightness(0.97)':'none'}}><Source/></AbsoluteFill>}";
async function runScript(sdk,script,summary,commit) {
  const r=await sdk.runScript({script,summary,allowCommit:!!commit});
  if(r.isError||r.result==null) throw Error(r.output||'Selects returned no result.');
  return r.result;
}
// mac-only:start
// Analysis compiles Apple Vision (swiftc) and runs Python with Pillow through the macOS shell; the panel reaches these
// only when hostIsWindows() is false.
const q = s => "'" + String(s).replace(/'/g, "'\\''") + "'";
async function runShell(sdk,command,summary) {
  const r=await sdk.runShell({command,summary,timeoutMs:300000,maxOutputBytes:49152});
  if(r.isError||r.exitCode!==0) throw Error(r.stderr||r.output||'Preparation failed.');
  return r.stdout.trim();
}
// mac-only:end
// A 64x96 JPEG (base64, cover-cropped like preview.py) drawn in the panel from the photo's bytes; null when this host
// cannot decode it.
async function canvasThumb(path) {
  if(typeof createImageBitmap!=='function'||typeof document==='undefined') return null;
  const bitmap=await createImageBitmap(new Blob([await hostReadBytes(path)]));
  try {
    const canvas=document.createElement('canvas');canvas.width=64;canvas.height=96;
    const k=Math.max(64/bitmap.width,96/bitmap.height),w=bitmap.width*k,h=bitmap.height*k;
    canvas.getContext('2d').drawImage(bitmap,(64-w)/2,(96-h)/2,w,h);
    return canvas.toDataURL('image/jpeg',0.25).split(',')[1]||null;
  } finally {bitmap.close?.()}
}
// av-host:start
// Host I/O for a style-app panel: plain JS and self-contained (no app names, no UI text), so it can move to a shared
// kit file and tests can run it in node:vm. Guarded access to the host's renderer services (window.parent.__DI__,
// documented as internal, so every member is checked before use), the platform, path joins, file reads and removal,
// the install and data folders, and the host's bundled ffmpeg (Runtime.runFFmpeg / runFFprobe: argv arrays, no shell,
// nothing for the user to install). Paths are built with FileSystem.join and never pass through a console; generated
// file names are ASCII. There is no shell call at all (kit windows.md). Errors carry `code`: 'host-missing' (with `member`, a service method this Selects
// build lacks: the caller shows one "needs a newer Selects" message) or 'not-found' (no install folder).
function hostError(code, message, member = "") { return Object.assign(new Error(message), { code, member }); }
function hostDI() { try { return (window.parent && window.parent["__DI__"]) || null; } catch { return null; } }
// A host service when it has every named method, else null.
function hostApi(name, ...methods) {
  const s = hostDI()?.[name];
  return s && methods.every((m) => typeof s[m] === "function") ? s : null;
}
// A host service that must have `method`; throws a 'host-missing' error when this build lacks it.
function hostNeed(name, method) {
  const s = hostApi(name, method);
  if (!s) throw hostError("host-missing", "this Selects build has no " + name + "." + method, name + "." + method);
  return s;
}
// Windows or not: the host's own answer (Runtime.getPlatform: "win32", "darwin"), else the browser's.
function hostIsWindows() {
  try {
    const rt = hostApi("Runtime", "getPlatform");
    const p = rt ? String(rt.getPlatform() || "") : "";
    if (p) return /^win/i.test(p);
  } catch { /* the browser decides */ }
  try {
    const n = navigator;
    return /^win/i.test(String(n.platform || "")) || /Windows NT/i.test(String(n.userAgent || ""));
  } catch { return false; }
}
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
// Removes a file with the first of the host's FileSystem removers that works (removeFile, remove, rm, unlink,
// unlinkSync: host builds differ); each is tried only when present, and a failure only leaves the file behind.
async function hostRemove(path) {
  let fs = null;
  try { fs = hostDI()?.FileSystem; } catch { fs = null; }
  if (!fs) return;
  const tries = [["removeFile", () => fs.removeFile({ filePath: path })], ["remove", () => fs.remove(path)], ["rm", () => fs.rm(path)],
    ["unlink", () => fs.unlink(path)], ["unlinkSync", () => fs.unlinkSync(path)]];
  for (const [name, call] of tries) {
    if (typeof fs[name] !== "function") continue;
    try { await call(); return; } catch { /* the next one */ }
  }
}
// The plugin's install folder and its data folder. The install folder is the host's skills folder (the home folder
// joined with .selects, skills and <id>, the same place SELECTS_USER_SKILLS_ROOT names on macOS and Windows) when it
// holds `marker` (a file every install has). `sdk` is unused (kept so callers do not change). The data folder (<home>/.selects/plugin-data/<id>) is created when missing;
// null when this host cannot make it (callers then avoid temporary files). Throws 'not-found' without an install folder.
async function hostRoots(sdk, id, marker) {
  const fs = hostApi("FileSystem", "join", "homedir", "existsSync");
  const holds = (dir) => { try { return !!dir && (!fs || !!fs.existsSync(fs.join(dir, marker))); } catch { return false; } };
  let plugin = null;
  try { if (fs) { const dir = String(fs.join(fs.homedir(), ".selects", "skills", id)); if (holds(dir)) plugin = dir; } } catch { plugin = null; }
  if (!plugin) throw hostError("not-found", "the plugin folder could not be found");
  let data = null;
  try {
    const dfs = hostApi("FileSystem", "join", "homedir", "mkdirSync");
    if (dfs) { data = String(dfs.join(dfs.homedir(), ".selects", "plugin-data", id)); dfs.mkdirSync(data, { recursive: true }); }
  } catch { data = null; }
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

function isPhoto(x) {
  return x.type==='video' && /\.(jpe?g|png|webp)$/i.test(x.name)
    && !/-(base|sticker|cutout)\./i.test(x.name);
}

export default function Panel({sdk,context,ui}) {
  const t=WORDS[context.language]??WORDS.en;
  const [rows,setRows]=React.useState([]);
  const [folder,setFolder]=React.useState('*');
  const [busy,setBusy]=React.useState(false);
  const [status,setStatus]=React.useState('');
  const [failed,setFailed]=React.useState(false);
  const [analysis,setAnalysis]=React.useState(null);
  const [confirmed,setConfirmed]=React.useState(false);
  const [excluded,setExcluded]=React.useState([]);
  const [thumbs,setThumbs]=React.useState({});
  const guard=React.useRef(false);
  // Analysis and the Draft need Apple Vision and Python: Windows shows why and stops before anything is made.
  const macOnly=hostIsWindows();
  const photos=rows.filter(isPhoto).filter(x=>folder==='*'||x.folder===folder);
  const selected=photos.filter(x=>!excluded.includes(x.path));
  const folders=[...new Set(rows.filter(isPhoto).map(x=>x.folder))].sort();
  const reviewPairs=analysis&&!analysis.result.exactReference
    ? (analysis.result.cues||[]).filter((cue,i,all)=>all.findIndex(c=>c.file===cue.file)===i).map((cue,i)=>{
        const baseIndex=SCENE_EDGES.findIndex((edge,j)=>j<SCENE_EDGES.length-1&&cue.start>=edge&&cue.start<SCENE_EDGES[j+1])+1;
        const baseName=analysis.result.rows?.find(r=>(r.baseSlot??r.index)===baseIndex)?.name;
        const stickerName=analysis.result.rows?.find(r=>r.stickerNumber===i+1)?.name;
        return {baseIndex,baseName,stickerName,number:i+1};
      }) : [];

  React.useEffect(()=>{
    const chosen=photos.slice(0,80);
    if(!chosen.length){setThumbs({});return}
    let active=true;
    if(hostIsWindows()) {
      (async()=>{
        const next={};
        for(const x of chosen) {
          if(!active) return;
          try {next[x.path]=await canvasThumb(x.path)} catch {next[x.path]=null}
        }
        if(active) setThumbs(next);
      })();
      return()=>{active=false};
    }
    // mac-only:start
    const batches=[];for(let i=0;i<chosen.length;i+=20)batches.push(chosen.slice(i,i+20));
    Promise.all(batches.map(batch=>{
      const command='python3 "$SELECTS_USER_SKILLS_ROOT/cutout-beat-gallery/preview.py" '+batch.map(x=>'--photo '+q(x.path)).join(' ');
      return sdk.runShell({command,summary:'Preview photo choices',timeoutMs:30000,maxOutputBytes:49152});
    })).then(replies=>{if(!active)return;const result=replies.flatMap(r=>r.isError||r.exitCode!==0?[]:JSON.parse(r.stdout.trim()));setThumbs(Object.fromEntries(result.map(x=>[x.path,x.jpeg])));})
      .catch(()=>{});
    // mac-only:end
    return()=>{active=false};
  },[sdk,folder,rows]);

  const refresh=React.useCallback(async()=>{
    if(!context.projectId) return;
    try {
      const pid=context.projectId;
      const code="const p=selects.project("+JSON.stringify(pid)+");const o=await p.sourceFiles();const rows=[];const walk=(arr,folder)=>{for(const x of arr){if(x.type==='dir')walk(x.children,x.name);else rows.push({name:x.name,path:x.path,resourceId:x.resourceId,type:x.type,folder})}};if('fileTree'in o)walk(o.fileTree,'(root)');else for(const f of o.folders){const v=await p.sourceFiles({folder:f.name});if('fileTree'in v)walk(v.fileTree,f.name)}return rows.sort((a,b)=>a.name.localeCompare(b.name));";
      const nextRows=await runScript(sdk,code,'Read project photos',false);
      setRows(nextRows);
      setAnalysis(null);
      setConfirmed(false);
      setFolder(prev=>{
        if(prev!=='*'&&nextRows.some(x=>x.folder===prev)) return prev;
        return nextRows.some(x=>x.folder==='beat-cutout-reference-v2')?'beat-cutout-reference-v2':'*';
      });
      setStatus('');
      setFailed(false);
      return nextRows;
    } catch(e) {setStatus(String(e.message||e));setFailed(true);return null}
  },[sdk,context.projectId]);
  React.useEffect(()=>{refresh();},[refresh]);
  React.useEffect(()=>sdk.on('resourcesChanged',e=>{if(e.projectId===context.projectId)refresh()}),[sdk,context.projectId,refresh]);

  const analyze=async()=>{
    if(guard.current) return;
    if(macOnly) {setStatus(t.macOnly);setFailed(true);return}
    if(!context.projectId) {setStatus(t.noProject);setFailed(true);return}
    if(folder==='*') {setStatus('Choose a photo folder first.');setFailed(true);return}
    guard.current=true;setBusy(true);setFailed(false);setStatus(t.busy);setConfirmed(false);
    try {
      const pid=context.projectId;
      const latest=await refresh();
      if(!latest) throw Error('Could not refresh project photos.');
      const chosenFolder=latest.some(x=>x.folder===folder)?folder:'';
      if(!chosenFolder) throw Error('Selected photo folder is no longer available. Refresh and choose a folder.');
      const selectedPhotos=latest.filter(isPhoto).filter(x=>x.folder===chosenFolder&&!excluded.includes(x.path));
      const approved=latest.filter(x=>x.folder===chosenFolder&&/^\d{2}-sticker\.png$/i.test(x.name)).sort((a,b)=>a.name.localeCompare(b.name));
      if(approved.length&&approved.length!==12) throw Error('The approved reference set needs all 12 sticker layers.');
      if(selectedPhotos.length<15) {
        const missing=15-selectedPhotos.length;
        setStatus(`${selectedPhotos.length} portrait photos found. Add ${missing} more to continue.`);
        setFailed(true);return;
      }
      // mac-only:start
      const root='SK="$SELECTS_USER_SKILLS_ROOT/cutout-beat-gallery"; DATA="$HOME/.selects/plugin-data/cutout-beat-gallery"; ';
      if(!approved.length) await runShell(sdk,root+'mkdir -p "$DATA/bin" "$DATA/cache" "$DATA/runs"; if [ ! -x "$DATA/bin/foreground-mask" ] || [ "$SK/foreground-mask.swift" -nt "$DATA/bin/foreground-mask" ]; then CLANG_MODULE_CACHE_PATH="$DATA/cache" SWIFT_MODULE_CACHE_PATH="$DATA/cache" swiftc -module-cache-path "$DATA/cache" "$SK/foreground-mask.swift" -o "$DATA/bin/foreground-mask"; fi','Prepare person mask model');
      else await runShell(sdk,root+'mkdir -p "$DATA/runs"','Prepare approved reference');
      const name='beat-cutout-'+Date.now()+'-'+Math.random().toString(36).slice(2,6);
      const inputs=selectedPhotos.map(x=>'--input '+q(x.path)).join(' ');
      const stickers=approved.map(x=>'--sticker '+q(x.path)).join(' ');
      const reference=approved.length?' --reference-master "$SK/approved-master.mp4" --reference-manifest "$SK/reference-manifest.json"':'';
      const command=root+'python3 "$SK/prepare.py" --output "$DATA/runs/'+name+'" --masker "$DATA/bin/foreground-mask" --bgm "$SK/fixed-bgm.mp3" '+inputs+' '+stickers+reference;
      const result=JSON.parse(await runShell(sdk,command,'Analyze and prepare photos'));
      // mac-only:end
      if(!result.ready) {
        const modelFailure=(result.rows||[]).find(x=>/Mask error|inference plan|model/i.test(x.reason||''));
        if(modelFailure) {setStatus(t.error+'The person segmentation model could not run. Check the setup and try again.');setFailed(true);return}
        const base=Math.max(0,result.needBase-result.base),stickers=Math.max(0,result.needStickers-result.stickers);
                if(base>0) setStatus(`${result.base} portrait photos found. Add ${base} more to continue.`);
        else setStatus(`${result.stickers} separate photos can make stickers. Add ${stickers} more portrait photos with people fully inside the frame.`);
        setFailed(true);return;
      }
      setAnalysis({result,name,pid});
      setStatus(result.exactReference
        ? ('Approved photos and stickers match the reference. You can create the reference Draft.')
        : (`Photo check passed: ${result.base} scenes and ${result.stickers} stickers. Review the placement before making the video.`));
      setFailed(false);
    } catch(e) {setStatus(t.error+String(e.message||e));setFailed(true)}
    finally {guard.current=false;setBusy(false)}
  };

  const build=async()=>{
    if(guard.current||!analysis||(!analysis.result.exactReference&&!confirmed)) return;
    if(macOnly) {setStatus(t.macOnly);setFailed(true);return}
    guard.current=true;setBusy(true);setFailed(false);setStatus('Creating video…');
    try {
      const {result,name,pid}=analysis;
      if(result.exactReference) {
        const imported=await runScript(sdk,'return await selects.project('+JSON.stringify(pid)+').importFiles({paths: '+JSON.stringify([result.editableDir])+'});','Import editable scene layers',true);
        if((imported.addedResourceIds||[]).length!==29) throw Error('Some editable scene layers could not be imported.');
        const exactCode="const p=selects.project("+JSON.stringify(pid)+");const files=(await p.sourceFiles({folder:"+JSON.stringify(result.editableFolder)+"})).fileTree;const ids=new Map(files.filter(x=>x.type!=='dir').map(x=>[x.name,x.resourceId]));const d=await p.createDraft({name:"+JSON.stringify('Beat Cutout Gallery · Editable · '+name)+"});await d.setFrameSize({width:1080,height:1920});for(let i=1;i<=24;i++){const id=ids.get(String(i).padStart(2,'0')+'-scene.mp4');if(!id)throw Error('Missing scene '+i);await d.insertResource({resourceId:id})}if((await d.meta()).durationFrames!==478)throw Error('Scene duration mismatch');for(const [i,a,b] of [[1,29,40],[2,61,72],[3,93,104],[4,132,140]]){const id=ids.get(String(i).padStart(2,'0')+'-entrance.mov');if(!id)throw Error('Missing entrance '+i);await d.overlayResource({resource:await p.resource(id),over:await d.rangeAtFrames(a,b)})}const music=ids.get('reference-audio.m4a');if(!music)throw Error('Missing audio');await d.overlayResource({resource:await p.resource(music),over:await d.rangeAtFrames(0,478)});const saved=await d.commitAll('Create editable approved reference draft');if(!saved.createdDraftId)throw Error('Draft did not save');await selects.editor.openDraft(saved.createdDraftId);return {draftId:saved.createdDraftId,frames:(await d.meta()).durationFrames,scenes:24,entrances:4,audio:1};";
        await runScript(sdk,exactCode,'Create editable approved draft',true);
        setStatus(t.exactDone+' '+result.outputVideo);setFailed(false);return;
      }
      const imported=await runScript(sdk,'return await selects.project('+JSON.stringify(pid)+').importFiles({paths: '+JSON.stringify([result.outputDir])+'});','Import editable layers',true);
      if((imported.addedResourceIds||[]).length<result.base+result.stickers+1) throw Error('Some prepared layers were not imported.');
      const cues=JSON.stringify(result.cues||CUES.slice(0,result.stickers).map((c,i)=>({...c,file:String(i+1).padStart(2,'0')+'-sticker.mov',...(result.approvedStickers?{x:0,y:0,s:1}:{})})));
      const code="const p=selects.project("+JSON.stringify(pid)+");const f=(await p.sourceFiles({folder:"+JSON.stringify(name)+"})).fileTree;const ids=new Map(f.filter(x=>x.type!=='dir').map(x=>[x.name,x.resourceId]));const d=await p.createDraft({name:"+JSON.stringify('Beat Cutout Gallery · '+name)+"});await d.setFrameSize({width:1080,height:1920});const fps=(await d.meta()).fps;for(let i=0;i<"+result.base+";i++){const id=ids.get(String(i+1).padStart(2,'0')+'-base.mp4');if(!id)throw Error('Missing base '+i);await d.insertResource({resourceId:id})}const before=(await d.meta()).durationFrames;const expected=Math.round(478*fps/30);if(before!==expected)await d.trimBoundary({frame:before,side:'before',byFrames:expected-before});const total=(await d.meta()).durationFrames;const at=n=>Math.min(total,Math.round(n*fps/30));const cues=("+cues+").map(c=>({...c,start:at(c.start),end:at(c.end)}));for(let i=0;i<cues.length;i++){const c=cues[i],id=ids.get(c.file);if(!id)throw Error('Missing sticker '+c.file);await d.overlayResource({resource:await p.resource(id),over:await d.rangeAtFrames(c.start,c.end)});const clip=(await d.clips({trackScope:'all'})).find(x=>x.trackKind==='video'&&x.resourceId===id&&x.startFrame===c.start);if(clip)await d.addVideoEffect({clip,label:'Sticker entrance',tsxCode:"+JSON.stringify(MOTION)+",parameters:{dir:c.dir,x:c.x,y:c.y,s:c.s},editableParameters:[{key:'x',label:'Horizontal position',type:'number',defaultValue:c.x,min:-600,max:600,step:5},{key:'y',label:'Vertical position',type:'number',defaultValue:c.y,min:-900,max:900,step:5},{key:'s',label:'Size',type:'number',defaultValue:c.s,min:.3,max:1.3,step:.01}]})}const music=ids.get('fixed-bgm.mp3');if(!music)throw Error('Fixed music missing');await d.overlayResource({resource:await p.resource(music),over:await d.rangeAtFrames(0,total)});for(let i=0;i<"+result.base+";i++){const id=ids.get(String(i+1).padStart(2,'0')+'-base.mp4');const all=await d.clips({trackScope:'all'});const clip=all.find(x=>x.trackKind==='main'&&x.resourceId===id);if(!clip)continue;const cue=cues.find(x=>x.start>=clip.startFrame&&x.start<clip.endFrame);if(cue)await d.addVideoEffect({clip,label:'Warm vintage after sticker',tsxCode:"+JSON.stringify(GRADE)+",parameters:{at:cue.start-clip.startFrame}})}const fx=async(slot,label,code,params)=>{const id=ids.get(String(slot).padStart(2,'0')+'-base.mp4');const clip=(await d.clips({trackScope:'all'})).find(x=>x.trackKind==='main'&&x.resourceId===id);if(clip)await d.addVideoEffect({clip,label,tsxCode:code,parameters:{...params,at:params.at-clip.startFrame}})};const spot="+JSON.stringify(result.spot||null)+";if(spot){await fx(6,'Spotlight and tint',"+JSON.stringify(SPOT)+",{at:at(211),x:spot.x,y:spot.y});await fx(15,'Colour split',"+JSON.stringify(SPLIT)+",{at:at(438)})}const saved=await d.commitAll('Create fixed beat cutout template');if(!saved.createdDraftId)throw Error('Draft did not save');await selects.editor.openDraft(saved.createdDraftId);return {draftId:saved.createdDraftId,bases:"+result.base+",stickers:"+result.stickers+",audio:1,frames:total};";
      await runScript(sdk,code,'Create editable beat draft',true);
      setStatus(t.done+' '+t.export);setFailed(false);
    } catch(e) {setStatus(t.error+String(e.message||e));setFailed(true)}
    finally {guard.current=false;setBusy(false)}
  };
  if(!context.projectId) return <ui.Message tone="muted">{t.noProject}</ui.Message>;
  return <div><h2>{t.title}</h2><p>{t.intro}</p>
    {macOnly&&<ui.Message tone="muted">{t.macOnly}</ui.Message>}
    {status&&<ui.Message tone={failed?'error':'success'}>{status}</ui.Message>}
    <ui.Section title={t.selected}>
      <ui.Select label={t.folder} value={folder} options={[{value:'*',label:'Choose photo folder'},...folders.map(f=>({value:f,label:f}))]} onChange={v=>{setFolder(v);setExcluded([]);setAnalysis(null);setConfirmed(false);setStatus('');setFailed(false)}} disabled={busy}/>
      <p>{selected.length}/{photos.length} · {t.fixed}</p>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:6,maxHeight:430,overflowY:'auto',scrollbarGutter:'stable'}}>
        {photos.slice(0,80).map(x=>{const on=!excluded.includes(x.path);const check=analysis?.result?.rows?.find(r=>r.name===x.name);const rejected=analysis?.result?.rejected?.find(r=>r.name===x.name);const rank=check?.baseSlot||0;return <button key={x.path} type="button" disabled={busy||folder==='beat-cutout-reference-v2'} onClick={()=>{setExcluded(prev=>on?[...prev,x.path]:prev.filter(p=>p!==x.path));setAnalysis(null);setConfirmed(false);setStatus('');setFailed(false)}} style={{padding:3,background:on?'#264638':'#252525',color:'#fff',border:on?'2px solid #75d39a':'2px solid #555',borderRadius:5,textAlign:'left',cursor:'pointer'}} aria-pressed={on} title={x.name}>
          {thumbs[x.path]?<img src={'data:image/jpeg;base64,'+thumbs[x.path]} alt={x.name} style={{display:'block',width:'100%',height:110,objectFit:'cover',opacity:on?1:.35}}/>:<div style={{height:110,background:'#333'}}/>}
          <span style={{display:'block',fontSize:10,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{on?'✓ ':'○ '}{x.name}{on&&rank>0&&rank<=15?' · B'+rank:''}{check?.stickerNumber?' · S'+check.stickerNumber:''}{rejected?' · ×':''}</span>
        </button>})}
      </div>
      {photos.length>80&&<p>{'Only the first 80 are previewed. Split this folder into smaller groups.'}</p>}
      <ui.Actions><ui.Button variant="secondary" disabled={busy} onClick={refresh}>{t.refresh}</ui.Button></ui.Actions>
    </ui.Section>
    {reviewPairs.length>0&&<ui.Section title={'Scene and sticker pairs'}>
      <p>{'These pairs follow the actual beat order. Change the photo selection and analyze again if a pair looks unrelated.'}</p>
      <div style={{maxHeight:400,overflowY:'auto',scrollbarGutter:'stable',display:'grid',gap:6}}>
        {reviewPairs.map(pair=>{
          const base=photos.find(x=>x.name===pair.baseName),sticker=photos.find(x=>x.name===pair.stickerName);
          return <div key={pair.number} style={{display:'grid',gridTemplateColumns:'38px 1fr 1fr',gap:6,alignItems:'center',border:'1px solid #555',borderRadius:5,padding:4,fontSize:10}}>
            <strong>#{pair.number}</strong>
            {[base,sticker].map((photo,k)=><div key={k} style={{minWidth:0}}>{photo&&thumbs[photo.path]?<img src={'data:image/jpeg;base64,'+thumbs[photo.path]} alt={photo.name} style={{width:'100%',height:68,objectFit:'cover'}}/>:<div style={{height:68,background:'#333'}}/>}<div style={{overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis'}}>{k===0?'B'+pair.baseIndex:'S'+pair.number} · {photo?.name||'?'}</div></div>)}
          </div>;
        })}
      </div>
    </ui.Section>}
    {analysis&&!analysis.result.exactReference&&<label style={{display:'flex',gap:8,alignItems:'flex-start',fontSize:12,margin:'12px 0'}}><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>{'I reviewed the photo order, subjects, and background combinations.'}</label>}
    <ui.Actions><ui.Button variant="secondary" busy={busy} busyLabel={t.busy} disabled={busy||macOnly} onClick={analyze}>{t.analyze}</ui.Button><ui.Button variant="primary" disabled={busy||macOnly||!analysis||(!analysis.result.exactReference&&!confirmed)} onClick={build}>{t.build}</ui.Button></ui.Actions>
  </div>;
}
