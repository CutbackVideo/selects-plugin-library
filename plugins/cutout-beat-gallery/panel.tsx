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
  en: { title:'Beat Cutout Gallery', intro:'Your portrait photos are checked for clean cutouts, then cut to the beat as an editable Draft.', folder:'Photo folder', all:'All project photos', refresh:'Refresh photos', analyze:'Analyze photos', build:'Make video', busy:'Checking photos…', noProject:'Open a Selects project first.', noPhotos:'Add at least 15 portrait photos to the project.', done:'Created an editable Draft. Photos, stickers, and music remain separate timeline clips.', exactDone:'Created an editable Draft with 24 scenes, four entrance stickers, and a separate music track. Later composites remain inside their scene clips.', missing:'Add more photos.', error:'Could not create video: ', export:'Export with Handoff → Export after review.', selected:'Selected photos', fixed:'Review the photos and leave only the ones you want to use. Scene and sticker slots are assigned after analysis.', macOnly:'Available on macOS for now.', cancel:'Cancel', framing:'Checking photos… {k}/{n}', masking:'Checking the cutouts…', making:'Making the stickers and scene clips…' },
  de: { title:'Beat-Cutout-Galerie', intro:'Deine Hochformat-Fotos werden auf saubere Freisteller geprüft und dann beatgenau zu einem bearbeitbaren Draft geschnitten.', folder:'Fotoordner', all:'Alle Projektfotos', refresh:'Fotos neu laden', analyze:'Fotos analysieren', build:'Video erstellen', busy:'Fotos werden geprüft…', noProject:'Öffne zuerst ein Selects-Projekt.', noPhotos:'Füge dem Projekt mindestens 15 Hochformat-Fotos hinzu.', done:'Bearbeitbarer Draft erstellt. Fotos, Sticker und Musik bleiben getrennte Timeline-Clips.', exactDone:'Bearbeitbarer Draft mit 24 Szenen, vier Eingangs-Stickern und einer separaten Musikspur erstellt. Spätere Composites bleiben in ihren Szenen-Clips.', missing:'Füge weitere Fotos hinzu.', error:'Video konnte nicht erstellt werden: ', export:'Nach der Prüfung mit Handoff → Export ausgeben.', selected:'Ausgewählte Fotos', fixed:'Sieh die Fotos durch und behalte nur die, die du verwenden willst. Szenen- und Sticker-Plätze werden nach der Analyse vergeben.', macOnly:'Vorerst nur auf macOS verfügbar.', cancel:'Abbrechen', framing:'Fotos werden geprüft… {k}/{n}', masking:'Freisteller werden geprüft…', making:'Sticker und Szenenclips werden erstellt…' },
  es: { title:'Galería de recortes al ritmo', intro:'Tus fotos verticales se comprueban para obtener recortes limpios y luego se cortan al ritmo en un Draft editable.', folder:'Carpeta de fotos', all:'Todas las fotos del proyecto', refresh:'Actualizar fotos', analyze:'Analizar fotos', build:'Crear vídeo', busy:'Comprobando fotos…', noProject:'Abre primero un proyecto de Selects.', noPhotos:'Añade al menos 15 fotos verticales al proyecto.', done:'Draft editable creado. Las fotos, los recortes y la música siguen siendo clips independientes.', exactDone:'Draft editable creado con 24 escenas, cuatro recortes de entrada y una pista de música aparte. Los composites posteriores quedan dentro de sus clips de escena.', missing:'Añade más fotos.', error:'No se pudo crear el vídeo: ', export:'Exporta con Handoff → Export después de revisar.', selected:'Fotos seleccionadas', fixed:'Revisa las fotos y deja solo las que quieras usar. Los huecos de escena y recorte se asignan tras el análisis.', macOnly:'Disponible solo en macOS por ahora.', cancel:'Cancelar', framing:'Comprobando fotos… {k}/{n}', masking:'Comprobando los recortes…', making:'Creando los recortes y los clips de escena…' },
  fr: { title:'Galerie découpée au rythme', intro:'Vos photos verticales sont vérifiées pour des découpes nettes, puis montées sur le rythme dans un Draft modifiable.', folder:'Dossier de photos', all:'Toutes les photos du projet', refresh:'Actualiser les photos', analyze:'Analyser les photos', build:'Créer la vidéo', busy:'Vérification des photos…', noProject:'Ouvrez d’abord un projet Selects.', noPhotos:'Ajoutez au moins 15 photos verticales au projet.', done:'Draft modifiable créé. Photos, découpes et musique restent des clips distincts.', exactDone:'Draft modifiable créé avec 24 scènes, quatre découpes d’entrée et une piste musicale séparée. Les composites suivants restent dans leurs clips de scène.', missing:'Ajoutez d’autres photos.', error:'Impossible de créer la vidéo : ', export:'Exportez avec Handoff → Export après relecture.', selected:'Photos sélectionnées', fixed:'Passez les photos en revue et ne gardez que celles à utiliser. Les emplacements de scène et de découpe sont attribués après l’analyse.', macOnly:'Disponible sur macOS pour le moment.', cancel:'Annuler', framing:'Vérification des photos… {k}/{n}', masking:'Vérification des détourages…', making:'Création des découpes et des clips de scène…' },
  it: { title:'Galleria cutout a ritmo', intro:'Le tue foto verticali vengono controllate per ottenere scontorni puliti, poi tagliate a ritmo in un Draft modificabile.', folder:'Cartella foto', all:'Tutte le foto del progetto', refresh:'Aggiorna foto', analyze:'Analizza foto', build:'Crea video', busy:'Controllo delle foto…', noProject:'Apri prima un progetto Selects.', noPhotos:'Aggiungi al progetto almeno 15 foto verticali.', done:'Draft modificabile creato. Foto, scontorni e musica restano clip separate.', exactDone:'Draft modificabile creato con 24 scene, quattro scontorni d’ingresso e una traccia musicale separata. I composite successivi restano nelle loro clip di scena.', missing:'Aggiungi altre foto.', error:'Impossibile creare il video: ', export:'Esporta con Handoff → Export dopo la revisione.', selected:'Foto selezionate', fixed:'Controlla le foto e lascia solo quelle da usare. Gli slot di scena e scontorno vengono assegnati dopo l’analisi.', macOnly:'Per ora disponibile solo su macOS.', cancel:'Annulla', framing:'Controllo delle foto… {k}/{n}', masking:'Controllo degli scontorni…', making:'Creazione degli scontorni e delle clip di scena…' },
  ja: { title:'ビートカットアウトギャラリー', intro:'縦向きの写真をきれいに切り抜けるか確認し、ビートに合わせて編集できるDraftに仕上げます。', folder:'写真フォルダー', all:'プロジェクトのすべての写真', refresh:'写真を再読み込み', analyze:'写真を解析', build:'動画を作成', busy:'写真を確認中…', noProject:'先にSelectsのプロジェクトを開いてください。', noPhotos:'縦向きの写真を15枚以上プロジェクトに追加してください。', done:'編集できるDraftを作成しました。写真、ステッカー、音楽はそれぞれ別のクリップのままです。', exactDone:'24シーン、4つの登場ステッカー、独立した音楽トラックを持つ編集できるDraftを作成しました。以降の合成は各シーンのクリップ内に残ります。', missing:'写真を追加してください。', error:'動画を作成できませんでした: ', export:'確認後、Handoff → Export で書き出してください。', selected:'選択した写真', fixed:'写真を見直して、使うものだけを残してください。シーンとステッカーの枠は解析後に割り当てられます。', macOnly:'現在はmacOSでのみ利用できます。', cancel:'キャンセル', framing:'写真を確認中… {k}/{n}', masking:'切り抜きを確認中…', making:'ステッカーとシーンクリップを作成中…' },
  ko: { title:'\ube44\ud2b8 \ucef7\uc544\uc6c3 \uac24\ub7ec\ub9ac', intro:'\uc138\ub85c \uc0ac\uc9c4\uc774 \uae68\ub057\ud558\uac8c \ub204\ub07c\uac00 \ub530\uc9c0\ub294\uc9c0 \ud655\uc778\ud55c \ub4a4, \ube44\ud2b8\uc5d0 \ub9de\ucdb0 \uc218\uc815 \uac00\ub2a5\ud55c Draft\ub85c \ub9cc\ub4ed\ub2c8\ub2e4.', folder:'\uc0ac\uc9c4 \ud3f4\ub354', all:'\ud504\ub85c\uc81d\ud2b8\uc758 \ubaa8\ub4e0 \uc0ac\uc9c4', refresh:'\uc0ac\uc9c4 \uc0c8\ub85c \uc77d\uae30', analyze:'\uc0ac\uc9c4 \ubd84\uc11d', build:'\uc601\uc0c1 \ub9cc\ub4e4\uae30', busy:'\uc0ac\uc9c4 \ud655\uc778 \uc911…', noProject:'\uba3c\uc800 Selects \ud504\ub85c\uc81d\ud2b8\ub97c \uc5f4\uc5b4\uc8fc\uc138\uc694.', noPhotos:'\uc138\ub85c \uc0ac\uc9c4\uc744 15\uc7a5 \uc774\uc0c1 \ud504\ub85c\uc81d\ud2b8\uc5d0 \ucd94\uac00\ud558\uc138\uc694.', done:'\uc218\uc815 \uac00\ub2a5\ud55c Draft\ub97c \ub9cc\ub4e4\uc5c8\uc2b5\ub2c8\ub2e4. \uc0ac\uc9c4, \uc2a4\ud2f0\ucee4, \uc74c\uc545\uc740 \uac01\uac01 \ubcc4\ub3c4\uc758 \ud074\ub9bd\uc73c\ub85c \ub0a8\uc2b5\ub2c8\ub2e4.', exactDone:'24\uac1c \uc7a5\uba74, \ub4f1\uc7a5 \uc2a4\ud2f0\ucee4 4\uac1c, \ubcc4\ub3c4 \uc74c\uc545 \ud2b8\ub799\uc774 \uc788\ub294 \uc218\uc815 \uac00\ub2a5\ud55c Draft\ub97c \ub9cc\ub4e4\uc5c8\uc2b5\ub2c8\ub2e4. \uc774\ud6c4 \ud569\uc131\uc740 \uac01 \uc7a5\uba74 \ud074\ub9bd \uc548\uc5d0 \ub0a8\uc2b5\ub2c8\ub2e4.', missing:'\uc0ac\uc9c4\uc744 \ub354 \ucd94\uac00\ud558\uc138\uc694.', error:'\uc601\uc0c1\uc744 \ub9cc\ub4e4 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4: ', export:'\uac80\ud1a0 \ud6c4 Handoff → Export\ub85c \ub0b4\ubcf4\ub0b4\uc138\uc694.', selected:'\uc120\ud0dd\ud55c \uc0ac\uc9c4', fixed:'\uc0ac\uc9c4\uc744 \ud655\uc778\ud558\uace0 \uc0ac\uc6a9\ud560 \uac83\ub9cc \ub0a8\uae30\uc138\uc694. \uc7a5\uba74\uacfc \uc2a4\ud2f0\ucee4 \uc790\ub9ac\ub294 \ubd84\uc11d \ud6c4\uc5d0 \ubc30\uc815\ub429\ub2c8\ub2e4.', macOnly:'\uc9c0\uae08\uc740 macOS\uc5d0\uc11c\ub9cc \uc0ac\uc6a9\ud560 \uc218 \uc788\uc2b5\ub2c8\ub2e4.', cancel:'\ucde8\uc18c', framing:'\uc0ac\uc9c4 \ud655\uc778 \uc911… {k}/{n}', masking:'\ub204\ub07c \ud655\uc778 \uc911…', making:'\uc2a4\ud2f0\ucee4\uc640 \uc7a5\uba74 \ud074\ub9bd\uc744 \ub9cc\ub4dc\ub294 \uc911…' },
  pt: { title:'Galeria de recortes no ritmo', intro:'Suas fotos na vertical são verificadas para recortes limpos e depois cortadas no ritmo em um Draft editável.', folder:'Pasta de fotos', all:'Todas as fotos do projeto', refresh:'Atualizar fotos', analyze:'Analisar fotos', build:'Criar vídeo', busy:'Verificando fotos…', noProject:'Abra primeiro um projeto do Selects.', noPhotos:'Adicione ao projeto pelo menos 15 fotos na vertical.', done:'Draft editável criado. Fotos, recortes e música continuam clipes separados.', exactDone:'Draft editável criado com 24 cenas, quatro recortes de entrada e uma faixa de música separada. Os composites seguintes ficam dentro dos clipes de cena.', missing:'Adicione mais fotos.', error:'Não foi possível criar o vídeo: ', export:'Exporte com Handoff → Export após revisar.', selected:'Fotos selecionadas', fixed:'Revise as fotos e deixe apenas as que quiser usar. Os espaços de cena e recorte são atribuídos após a análise.', macOnly:'Disponível no macOS por enquanto.', cancel:'Cancelar', framing:'Verificando fotos… {k}/{n}', masking:'Verificando os recortes…', making:'Criando os recortes e os clipes de cena…' },
  tr: { title:'Ritimli Kesit Galerisi', intro:'Dikey fotoğraflarınız temiz kesim için denetlenir, ardından ritme göre düzenlenebilir bir Draft olarak kesilir.', folder:'Fotoğraf klasörü', all:'Projedeki tüm fotoğraflar', refresh:'Fotoğrafları yenile', analyze:'Fotoğrafları incele', build:'Video oluştur', busy:'Fotoğraflar denetleniyor…', noProject:'Önce bir Selects projesi açın.', noPhotos:'Projeye en az 15 dikey fotoğraf ekleyin.', done:'Düzenlenebilir Draft oluşturuldu. Fotoğraflar, kesitler ve müzik ayrı klipler olarak kalır.', exactDone:'24 sahne, dört giriş kesiti ve ayrı bir müzik parçası olan düzenlenebilir bir Draft oluşturuldu. Sonraki birleşimler kendi sahne kliplerinde kalır.', missing:'Daha fazla fotoğraf ekleyin.', error:'Video oluşturulamadı: ', export:'İnceledikten sonra Handoff → Export ile dışa aktarın.', selected:'Seçilen fotoğraflar', fixed:'Fotoğrafları gözden geçirip yalnızca kullanmak istediklerinizi bırakın. Sahne ve kesit yerleri incelemeden sonra atanır.', macOnly:'Şimdilik yalnızca macOS’ta kullanılabilir.', cancel:'İptal', framing:'Fotoğraflar denetleniyor… {k}/{n}', masking:'Kesitler denetleniyor…', making:'Kesitler ve sahne klipleri oluşturuluyor…' },
  zh: { title:'节拍抠像画廊', intro:'先检查竖版照片能否干净抠出人物，再按节拍剪成一个可编辑的 Draft。', folder:'照片文件夹', all:'项目中的全部照片', refresh:'重新载入照片', analyze:'分析照片', build:'生成视频', busy:'正在检查照片…', noProject:'请先打开一个 Selects 项目。', noPhotos:'请向项目中添加至少 15 张竖版照片。', done:'已创建可编辑的 Draft。照片、贴纸和音乐仍是各自独立的时间线片段。', exactDone:'已创建包含 24 个场景、四个入场贴纸和一条独立音乐轨的可编辑 Draft。后续合成保留在各自的场景片段内。', missing:'请添加更多照片。', error:'无法生成视频：', export:'审看后用 Handoff → Export 导出。', selected:'已选照片', fixed:'请检查照片，只保留想用的。场景与贴纸的位置在分析后分配。', macOnly:'目前仅在 macOS 上可用。', cancel:'取消', framing:'正在检查照片… {k}/{n}', masking:'正在检查抠像…', making:'正在制作贴纸和场景片段…' },
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
// Supplied private reference assets retain their existing macOS reconstruction path (no inference).
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

function isPhoto(x) {
  return x.type==='video' && /\.(jpe?g|png|webp)$/i.test(x.name)
    && !/-(base|sticker|cutout)\./i.test(x.name);
}

// The same photo preparation and sticker engine runs on both operating systems.
const WIN_MIN_PHOTOS=22;
const FRAME_SIZE='1080x1920';
// cutout-engine.js in a blob Web Worker: call(op, args, transfer) resolves with the worker's answer.
function startEngine(source) {
  const url=URL.createObjectURL(new Blob([source],{type:'text/javascript'}));
  let worker=null,next=0;
  const waiting=new Map();
  const fail=err=>{for(const w of waiting.values())w.reject(err);waiting.clear()};
  try {worker=new Worker(url)} catch(e) {URL.revokeObjectURL(url);throw Error('The photo engine could not start: '+String(e?.message||e))}
  worker.onmessage=e=>{const {id,ok,error}=e.data||{},w=waiting.get(id);if(!w)return;waiting.delete(id);if(error)w.reject(Error(error));else w.resolve(ok)};
  worker.onerror=e=>{try{e?.preventDefault?.()}catch{}fail(Error('The photo engine stopped: '+String(e?.message||'worker error')))};
  return {
    call:(op,args,transfer=[])=>new Promise((resolve,reject)=>{const id=++next;waiting.set(id,{resolve,reject});worker.postMessage({id,op,args},transfer)}),
    stop:()=>{try{worker.terminate()}catch{}URL.revokeObjectURL(url);fail(Error('Canceled.'))},
  };
}
// The host's ffmpeg with an argv array; `control.abort` (set while it runs) stops it.
async function hostFFmpeg(args,control) {
  const rt=hostNeed('Runtime','runFFmpeg'),ac=typeof AbortController==='undefined'?null:new AbortController();
  if(control) control.abort=()=>ac?.abort();
  try {return await rt.runFFmpeg(['-nostdin','-v','error','-y',...args],true,ac?ac.signal:undefined)}
  catch(e) {if(control?.canceled)throw Error('Canceled.');throw Error(String(e?.message||e||'ffmpeg failed').trim().slice(0,300))}
  finally {if(control)control.abort=null}
}
// Which of the encoders prepare.py uses this ffmpeg has, with fallbacks that keep the same sizes and frame counts:
// stickers ProRes 4444 (Selects shows its alpha), else QuickTime Animation, else PNG in .mov; scenes H.264, else MPEG-4.
const encoderCache={choice:null};
async function encoders() {
  if(encoderCache.choice) return encoderCache.choice;
  let list='';
  try {const r=await hostNeed('Runtime','runFFmpeg').runFFmpeg(['-hide_banner','-encoders'],true);list=String(r?.stdout||'')+String(r?.stderr||'')} catch {list=''}
  const has=n=>new RegExp('^\\s*V\\S*\\s+'+n+'\\s','m').test(list);
  encoderCache.choice={
    alpha:has('prores_ks')||!list?['-c:v','prores_ks','-profile:v','4444','-pix_fmt','yuva444p10le','-alpha_bits','16']
      :has('qtrle')?['-c:v','qtrle','-pix_fmt','argb']:['-c:v','png','-pix_fmt','rgba'],
    base:has('libx264')||!list?['-c:v','libx264','-preset','veryfast','-crf','18','-pix_fmt','yuv420p']:['-c:v','mpeg4','-q:v','2','-pix_fmt','yuv420p'],
    clip:has('libx264')||!list?['-c:v','libx264','-preset','veryfast','-crf','12','-pix_fmt','yuv420p']:['-c:v','mpeg4','-q:v','1','-pix_fmt','yuv420p'],
  };
  return encoderCache.choice;
}
const pad2=i=>String(i).padStart(2,'0');
const fileName=p=>String(p).split(/[\\/]/).pop();
// prepare.py's first loop: duplicates, landscape, small and near-duplicate photos are skipped; the rest become
// 1080x1920 frames (raw RGB in `work`). Free: nothing leaves the computer.
async function winFrames({engine,work,photos,onStatus,control}) {
  const fs=hostNeed('FileSystem','writeFile'),seen=[],previous=[],frames=[],rejected=[];
  for(const [k,photo] of photos.entries()) {
    if(control?.canceled) throw Error('Canceled.');
    const name=fileName(photo.path);
    onStatus?.(k+1,photos.length);
    let bytes;
    try {bytes=new Uint8Array(await hostReadBytes(photo.path))} catch(e) {rejected.push({name,reason:String(e?.message||e).slice(0,120)});continue}
    // The worker hashes the file (SHA-256, as prepare.py does) before it decodes it.
    const r=await engine.call('frame',{bytes:bytes.buffer,previous,seen},[bytes.buffer]);
    if(r.reason!=='duplicate photo'&&r.digest) seen.push(r.digest);
    if(r.reason) {rejected.push({name,reason:r.reason});continue}
    previous.push({bits:r.bits,tiny:r.tiny});
    const raw=hostJoin(work,pad2(frames.length+1)+'.rgb');
    await fs.writeFile(raw,r.frame);
    frames.push({name,raw,resourceId:photo.resourceId,path:photo.path});
  }
  return {frames,rejected};
}
// Shared RVM masks, then the existing quality checks, outlines and editable scene clips.
async function winCutouts({sdk,engine,plugin,data,work,name,pid,frames,rejected,onStatus,control}) {
  const enc=await encoders(),check=()=>{if(control?.canceled)throw Error('Canceled.')};
  const client=photoAiClient(sdk,pid,'cutout-beat-gallery'),rows=[],good=[];
  for(const [k,f] of frames.entries()){
    check();
    const i=k+1,gray=hostJoin(work,pad2(i)+'.gray');
    onStatus?.('masks',i,frames.length);
    // Model/transport failures stop the analysis; a low-quality mask remains a normal photo rejection.
    const matte=await photoAiMatte(sdk,pid,f,{client,control});
    check();
    try{
      await hostFFmpeg(['-i',matte.path,'-frames:v','1','-f','rawvideo','-pix_fmt','gray',gray],control);
      const bytes=new Uint8Array(await hostReadBytes(gray)),{width,height}=matte.frameSize;
      if(bytes.length!==width*height)throw Error('Mask error: incomplete image raster');
      const q=await engine.call('mask',{gray:bytes.buffer,w:width,h:height,cover:true},[bytes.buffer]);
      if(q.ok){good.push(i);await hostNeed('FileSystem','writeFile').writeFile(hostJoin(work,pad2(i)+'.mask'),q.mask)}
      rows.push({index:i,name:f.name,stickerReady:q.ok,...q.metrics});
    }finally{await hostRemove(gray)}
  }
  // 4. prepare.py's choices, then the layers and clips it would write.
  const plan=await engine.call('plan',{rows,good,photoCount:frames.length,rejected});
  if(!plan.ready) return plan;
  onStatus?.('render');
  const out=hostJoin(data,'runs',name);
  (await hostNeed('FileSystem','mkdir').mkdir(out,{recursive:true}));
  const boxes={},still=['-f','rawvideo','-video_size',FRAME_SIZE,'-framerate','30'],hold=['-vf','loop=loop=-1:size=1:start=0','-an'];
  for(const l of plan.layers) {
    check();
    const frame=new Uint8Array(await hostReadBytes(frames[l.index-1].raw)),mask=new Uint8Array(await hostReadBytes(hostJoin(work,pad2(l.index)+'.mask')));
    const r=await engine.call('layer',{frame:frame.buffer,mask:mask.buffer,style:l.style,outline:l.outline},[frame.buffer,mask.buffer]);
    boxes[l.file]=r.box;
    // The revealed photo keeps the outline its sticker arrived with.
    if(r.shown) await hostNeed('FileSystem','writeFile').writeFile(frames[l.index-1].raw,r.shown);
    const raw=hostJoin(work,'layer.rgba');
    await hostNeed('FileSystem','writeFile').writeFile(raw,r.layer);
    await hostFFmpeg([...still,'-pix_fmt','rgba','-i',raw,...hold,'-frames:v','60',...enc.alpha,'-write_tmcd','0',hostJoin(out,l.file)],control);
  }
  for(const b of plan.bases) {
    check();
    await hostFFmpeg([...still,'-pix_fmt','rgb24','-i',frames[b.index-1].raw,...hold,'-frames:v',String(b.frames),...enc.base,'-movflags','+faststart','-f','mp4',hostJoin(out,b.file)],control);
  }
  await hostNeed('FileSystem','copyFile').copyFile(hostJoin(plugin,'fixed-bgm.mp3'),hostJoin(out,'fixed-bgm.mp3'));
  return engine.call('finish',{plan,rows,boxes,rejected,extra:{outputDir:out,folder:name}});
}
async function removeWork(work) {
  try {await hostSdk.files.rm(work,{recursive:true,force:true})} catch { /* left for the next run */ }
}

function Panel({sdk,context,ui}) {
  hostUseSdk(sdk);
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

  const control=React.useRef(null);
  const say=(text,values)=>text.replace(/\{(\w+)\}/g,(m,k)=>k in values?String(values[k]):m);
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
    (async()=>{
      const next={};
      for(const x of chosen){if(!active)return;try{next[x.path]=await canvasThumb(x.path)}catch{next[x.path]=null}}
      if(active)setThumbs(next);
    })();
    return()=>{active=false};
  },[sdk,folder,rows]);

  const refresh=React.useCallback(async()=>{
    if(!context.projectId) return;
    try {
      const pid=context.projectId;
      const code="const p=selects.project("+JSON.stringify(pid)+");const o=await p.sourceFiles();const rows=[];const walk=(arr,folder)=>{for(const x of arr){if(x.type==='dir')walk(x.children,x.name);else rows.push({name:x.name,path:x.path,resourceId:x.resourceId,type:x.type,folder})}};if('fileTree'in o)walk(o.fileTree,'(root)');else for(const f of o.folders){const v=await p.sourceFiles({folder:f.name});if('fileTree'in v)walk(v.fileTree,f.name)}return rows.sort((a,b)=>a.name.localeCompare(b.name));";
      const nextRows=(await readMediaPages(sdk,{summary:'Read project photos',script:code})).result;
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
  // Closing detaches observation; an accepted shared AI job continues in Main and can be recovered.
  React.useEffect(()=>()=>{const ctl=control.current;if(ctl){ctl.observer?.abort();ctl.abort?.();ctl.engine?.stop()}},[]);

  const showResult=(result,name,pid)=>{
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
  };
  React.useEffect(()=>sdk.on('resourcesChanged',e=>{if(e.projectId===context.projectId)refresh()}),[sdk,context.projectId,refresh]);

  const analyze=async()=>{
    if(guard.current) return;
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
      const name='beat-cutout-'+Date.now()+'-'+Math.random().toString(36).slice(2,6);
      let result;
      if(approved.length){
        // Existing exact-reference reconstruction uses supplied stickers, with no inference.
        // mac-only:start
        const root='SK="$SELECTS_USER_SKILLS_ROOT/cutout-beat-gallery"; DATA="$HOME/.selects/plugin-data/cutout-beat-gallery"; ';
        await runShell(sdk,root+'mkdir -p "$DATA/runs"','Prepare approved reference');
        const inputs=selectedPhotos.map(x=>'--input '+q(x.path)).join(' '),stickers=approved.map(x=>'--sticker '+q(x.path)).join(' ');
        const command=root+'python3 "$SK/prepare.py" --output "$DATA/runs/'+name+'" --masker unused --bgm "$SK/fixed-bgm.mp3" '+inputs+' '+stickers+' --reference-master "$SK/approved-master.mp4" --reference-manifest "$SK/reference-manifest.json"';
        if(hostIsWindows())throw Error(t.macOnly);
        result=JSON.parse(await runShell(sdk,command,'Prepare approved reference photos'));
        // mac-only:end
      }else{
        const {plugin,data}=await hostRoots(sdk,'cutout-beat-gallery','cutout-engine.js');
        if(!data)throw Error('The plugin data folder could not be made.');
        const engine=startEngine(await hostReadText(hostJoin(plugin,'cutout-engine.js')));
        const work=hostJoin(data,'work',name),ctl={canceled:false,engine,observer:new AbortController()};
        control.current=ctl;
        try{
          await hostNeed('FileSystem','mkdir').mkdir(work,{recursive:true});
          const {frames,rejected}=await winFrames({engine,work,photos:selectedPhotos,control:ctl,onStatus:(k,n)=>setStatus(say(t.framing,{k,n}))});
          result=frames.length<WIN_MIN_PHOTOS?{ready:false,base:frames.length,stickers:0,needBase:WIN_MIN_PHOTOS,needStickers:13,rejected}
            :await winCutouts({sdk,engine,plugin,data,work,name,pid,frames,rejected,control:ctl,onStatus:(step,k,n)=>setStatus(step==='masks'?t.masking+' '+k+'/'+n:t.making)});
        }finally{control.current=null;engine.stop();await removeWork(work)}
      }
      showResult(result,name,pid);
    } catch(e) {setStatus(t.error+String(e.message||e));setFailed(true)}
    finally {guard.current=false;setBusy(false)}
  };

  const cancelWindows=()=>{
    const ctl=control.current;
    if(!ctl)return;
    ctl.canceled=true;ctl.abort?.();ctl.engine?.stop();
    // Persist and send explicit cancellation before detaching this observer.
    if(ctl.ai)void ctl.ai.cancel({identity:ctl.aiIdentity}).catch(e=>{setStatus(t.error+String(e.message||e));setFailed(true)}).finally(()=>ctl.observer?.abort());
    else ctl.observer?.abort();
  };

  const build=async()=>{
    if(guard.current||!analysis||(!analysis.result.exactReference&&!confirmed)) return;
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
    {busy&&<ui.Actions><ui.Button variant="secondary" onClick={cancelWindows}>{t.cancel}</ui.Button></ui.Actions>}
    <ui.Actions><ui.Button variant="secondary" busy={busy} busyLabel={t.busy} disabled={busy} onClick={analyze}>{t.analyze}</ui.Button><ui.Button variant="primary" disabled={busy||!analysis||(!analysis.result.exactReference&&!confirmed)} onClick={build}>{t.build}</ui.Button></ui.Actions>
  </div>;
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
        if (replacement && !published) await run("files.remove", [destination, { recursive: false, force: true }], true).catch(() => {});
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
    rm: (path: string, options?: { recursive?: boolean; force?: boolean }) => run("files.remove", [path, { recursive: options?.recursive ?? false, force: options?.force ?? false }], true),
    removeFile: ({ filePath }: { filePath: string }) => run("files.remove", [filePath, { recursive: false, force: true }], true),
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

// photo-ai:start
// Inference lives in the installed shared runtime; this adapter retains only photo/output plumbing.
async function photoAiScript(sdk,code,summary,allowCommit=false){
 const response=await sdk.runScript({script:code,summary,allowCommit,timeoutSeconds:120});
 if(response.isError||response.result==null)throw Error(response.output||'Shared photo analysis returned no result.');
 return response.result;
}
async function photoAiCanonicalId(sdk,projectId,resourceId){
 const ids=await sharedAiResources.resolveSharedAiResources(sdk,projectId,[resourceId],(code,summary,write)=>photoAiScript(sdk,code,summary,write));
 const id=ids.get(resourceId);
 if(!id)throw Error('The selected photo changed. Refresh project photos and try again.');
 return id;
}
function photoAiClient(sdk,projectId,scope){
 if(!sdk.storage?.getItem||!sdk.storage?.setItem)throw Error('Update Selects to use persistent shared AI jobs.');
 const key='shared-ai:'+scope+':'+projectId;
 return sharedAiJobs.createSharedAiJobClient({projectId,scope,
  runScript:(code,summary,write)=>photoAiScript(sdk,code,summary,write),
  load:async()=>{const value=await sdk.storage.getItem(key);return value===null?null:JSON.parse(value)},
  save:journal=>sdk.storage.setItem(key,JSON.stringify(journal))});
}
async function photoAiMatte(sdk,projectId,photo,{scope,client,control,onStatus}={}){
 const resourceId=await photoAiCanonicalId(sdk,projectId,photo.resourceId);
 const jobs=client||photoAiClient(sdk,projectId,scope),identity='image:'+resourceId;
 if(control){control.ai=jobs;control.aiIdentity=identity;}
 const observed=await jobs.run({task:'person.matte',resourceId,options:{provider:'auto',outputMode:'alpha-frames',alphaEncoding:'grayscale-png-8bit'}},
  {identity,retryTerminal:true,signal:control?.observer?.signal,onProgress:status=>onStatus?.(status)});
 if(control?.canceled)throw Error('Canceled.');
 const manifest=observed.result?.files?.manifest;
 if(!manifest)throw Error('Shared photo analysis returned no mask manifest.');
 const prepared=await photoAiScript(sdk,`return await selects.ai.prepareMatte(${JSON.stringify(manifest)},${JSON.stringify(projectId)},{sourceKind:'image'});`,'Keep the shared photo mask',true);
 if(prepared.sourceKind!=='image'||prepared.sourceResourceId!==resourceId||!Number.isSafeInteger(prepared.frameSize?.width)||prepared.frameSize.width<1||!Number.isSafeInteger(prepared.frameSize?.height)||prepared.frameSize.height<1)throw Error('The shared photo mask does not match the selected photo.');
 const path=await photoAiScript(sdk,`return selects.files.pathFromLocalUrl(${JSON.stringify(prepared.maskUrl)});`,'Read the shared mask path');
 return {...prepared,path,workflowId:observed.workflowId};
}
// photo-ai:end

//shared-ai-jobs:start
const sharedAiJobs = (()=>{const module={exports:{}};
// Plugin-private durable orchestration of the existing public AI SDK.
// This module is bundled into panels; it has no Node or renderer-global dependencies.
const STATUS = new Set(['queued', 'running', 'canceling', 'succeeded', 'failed', 'canceled']);
const terminal = status => ['succeeded', 'failed', 'canceled'].includes(status);
const UUID = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;
const writes = new Map();
const error = (code, message) => Object.assign(new Error(message), { code });
const invalid = () => error('SHARED_AI_INVALID', 'Saved AI analysis does not match this source or task.');
const clone = value => JSON.parse(JSON.stringify(value));
function stable(value) {
  if (Array.isArray(value)) return '[' + value.map(stable).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + stable(value[k])).join(',') + '}';
  if (value === undefined || typeof value === 'function' || typeof value === 'symbol' || typeof value === 'bigint' || typeof value === 'number' && !Number.isFinite(value)) throw invalid();
  return JSON.stringify(value);
}
function attached(signal) {
  if (signal?.aborted) throw error('SHARED_AI_DETACHED', 'AI observation stopped. Reopen to recover the saved job.');
}
function inputFor(projectId, request) {
  if (!request || !['faces.detect', 'person.matte'].includes(request.task) || !UUID.test(request.resourceId)) throw invalid();
  const input = { runtimeId: 'selects-ai-runtime', projectId, resourceId: request.resourceId, task: request.task };
  if (request.sourceRange !== undefined) {
    const { startSeconds, endSeconds } = request.sourceRange || {};
    if (!Number.isFinite(startSeconds) || startSeconds < 0 || !Number.isFinite(endSeconds) || endSeconds <= startSeconds) throw invalid();
    input.sourceRange = { startSeconds, endSeconds };
  }
  if (request.options !== undefined) {
    if (!request.options || Array.isArray(request.options) || typeof request.options !== 'object') throw invalid();
    stable(request.options); input.options = clone(request.options);
  }
  return input;
}
async function requestKey(scope, identity, input, attempt) {
  const withoutKey = { ...input }; delete withoutKey.requestKey;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(stable({ scope, identity, input: withoutKey, attempt })));
  return 'shared-ai-' + Array.from(new Uint8Array(digest), n => n.toString(16).padStart(2, '0')).join('');
}
function createSharedAiJobClient(env) {
  const { projectId, scope, runScript, load, save } = env || {};
  if (typeof projectId !== 'string' || !projectId || typeof scope !== 'string' || !scope ||
      ![runScript, load, save].every(f => typeof f === 'function')) throw invalid();
  const storageKey = stable({ projectId, scope });
  const fresh = () => ({ version: 1, projectId, scope, records: [] });
  async function read() {
    let journal;
    try { journal = await load(); }
    catch (cause) {
      if (String(cause?.message || cause).trim() === 'The file is unavailable.' || /ENOENT|not found|does not exist/i.test(String(cause?.message || cause))) journal = null;
      else throw cause;
    }
    if (journal == null) return fresh();
    if (typeof journal === 'string') { try { journal = JSON.parse(journal); } catch { throw invalid(); } }
    if (journal.version !== 1 || journal.projectId !== projectId || journal.scope !== scope || !Array.isArray(journal.records) || journal.records.length > 10000) throw invalid();
    const keys = new Set();
    for (const r of journal.records) {
      if (!r || typeof r.identity !== 'string' || !Number.isSafeInteger(r.attempt) || r.attempt < 0 || r.attempt > 255 ||
          !/^shared-ai-[\da-f]{64}$/.test(r.input?.requestKey) || keys.has(r.input.requestKey) ||
          (r.workflowId !== undefined && (typeof r.workflowId !== 'string' || !r.workflowId)) ||
          (r.status !== undefined && !STATUS.has(r.status)) || (r.cancelRequested !== undefined && typeof r.cancelRequested !== 'boolean')) throw invalid();
      const input = inputFor(projectId, r.input);
      if (stable({ ...input, requestKey: r.input.requestKey }) !== stable(r.input)) throw invalid();
      keys.add(r.input.requestKey);
    }
    return clone(journal);
  }
  async function update(record) {
    const prior = writes.get(storageKey) || Promise.resolve();
    const pending = prior.catch(() => {}).then(async () => {
      const journal = await read(), i = journal.records.findIndex(r => r.input.requestKey === record.input.requestKey), old = journal.records[i];
      if (old?.workflowId && record.workflowId && old.workflowId !== record.workflowId) throw invalid();
      const next = { ...old, ...record, cancelRequested: Boolean(old?.cancelRequested || record.cancelRequested) };
      if (old?.workflowId) next.workflowId = old.workflowId;
      if (old && terminal(old.status)) next.status = old.status;
      if (i < 0) journal.records.push(next); else journal.records[i] = next;
      await save(clone(journal)); Object.assign(record, next);
    });
    writes.set(storageKey, pending);
    try { await pending; } finally { if (writes.get(storageKey) === pending) writes.delete(storageKey); }
  }
  async function ack(record, signal) {
    if (record.workflowId) return;
    attached(signal);
    const value = await runScript(`if(typeof selects.ai?.submit!=='function')throw new Error('AI_UPDATE_REQUIRED');const j=await selects.ai.submit(${JSON.stringify(record.input)});return {workflowId:j.workflowId};`, 'Start shared AI analysis', true);
    if (typeof value?.workflowId !== 'string' || !value.workflowId) throw invalid();
    record.workflowId = value.workflowId;
    // Preserve an acknowledgment even when a panel detached during submit.
    await update(record); attached(signal);
  }
  async function status(record, cancel = false) {
    const value = await runScript(`return await selects.ai.job(${JSON.stringify(record.workflowId)},${JSON.stringify(projectId)}).${cancel ? 'cancel' : 'status'}();`, cancel ? 'Cancel shared AI analysis' : 'Read shared AI progress', cancel);
    if (value?.workflowId !== record.workflowId || value.projectId !== projectId || value.runtimeId !== 'selects-ai-runtime' || value.task !== record.input.task || !STATUS.has(value.status)) throw invalid();
    record.status = value.status; await update(record); return value;
  }
  async function stop(record, options = {}) {
    record.cancelRequested = true; await update(record); await ack(record, options.signal);
    if (!terminal(record.status)) await status(record, true);
    const deadline = Date.now() + (options.maxWaitMs ?? 60000);
    while (!terminal(record.status)) {
      attached(options.signal);
      if (Date.now() >= deadline) throw error('SHARED_AI_CANCEL_PENDING', 'AI is still stopping. Cancellation is saved; reopen to recover it.');
      await new Promise(resolve => setTimeout(resolve, options.pollMs ?? env.pollMs ?? 500));
      await status(record);
    }
  }
  async function run(request, options = {}) {
    attached(options.signal);
    const input = inputFor(projectId, request), identity = options.identity ?? '';
    if (typeof identity !== 'string') throw invalid();
    const journal = await read();
    let record = journal.records.filter(r => r.identity === identity && stable(inputFor(projectId, r.input)) === stable(input)).sort((a, b) => b.attempt - a.attempt)[0];
    if (record && record.input.requestKey !== await requestKey(scope, identity, input, record.attempt)) throw invalid();
    // A detached panel can have saved 'running' while Main has since stopped.
    // Refresh only during recovery; failure of a newly submitted job is not retried.
    if (record?.workflowId && options.retryTerminal) {
      attached(options.signal); await status(record); attached(options.signal);
    }
    if (record && options.retryTerminal && record.cancelRequested && !terminal(record.status)) await stop(record, options);
    if (!record || options.retryTerminal && (['failed', 'canceled'].includes(record.status) || record.cancelRequested && terminal(record.status))) {
      const attempt = record ? record.attempt + 1 : 0;
      if (attempt > 255) throw invalid();
      record = { identity, attempt, input: { ...input, requestKey: await requestKey(scope, identity, input, attempt) } };
      await update(record);
    }
    await ack(record, options.signal);
    for (;;) {
      attached(options.signal);
      const latest = (await read()).records.find(r => r.input.requestKey === record.input.requestKey);
      if (!latest) throw invalid(); Object.assign(record, latest);
      const value = await status(record, record.cancelRequested && !terminal(record.status));
      attached(options.signal);
      if (record.cancelRequested || record.status === 'canceled') throw error('SHARED_AI_CANCELED', 'AI analysis was canceled. Start again to retry.');
      if (record.status === 'failed') throw error('SHARED_AI_FAILED', 'AI analysis failed. ' + String(value.lastErrorMessage || '').slice(0, 300));
      if (record.status === 'succeeded') {
        const result = await runScript(`return await selects.ai.job(${JSON.stringify(record.workflowId)},${JSON.stringify(projectId)}).result();`, 'Read shared AI result');
        attached(options.signal);
        if (result?.workflowId !== record.workflowId || result.task !== record.input.task || !result.files || typeof result.files !== 'object') throw invalid();
        return { workflowId: record.workflowId, input: clone(record.input), result };
      }
      options.onProgress?.(value);
      await new Promise(resolve => setTimeout(resolve, options.pollMs ?? env.pollMs ?? 500));
    }
  }
  async function cancel(options = {}) {
    const journal = await read();
    for (const record of journal.records) {
      if (options.identity !== undefined && record.identity !== options.identity || terminal(record.status)) continue;
      if (record.input.requestKey !== await requestKey(scope, record.identity, record.input, record.attempt)) throw invalid();
      await stop(record, options);
    }
  }
  return { run, cancel };
}
module.exports = { createSharedAiJobClient };

return module.exports;})();
//shared-ai-jobs:end

//shared-ai-resources:start
const sharedAiResources = (()=>{const module={exports:{}};
// Private joins between short run_script ids and persistent Project Resource ids.
const UUID = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;
const fingerprint = rows => JSON.stringify(rows.map(r => [r.resourceId, r.name, r.type]));
function canonicalResourceBindings(core, { projectId, draftId, trackKinds = ['Main'] } = {}) {
  if (!core?.owner?.projectId || projectId && core.owner.projectId !== projectId || draftId && core.sequenceJson?.id !== draftId) throw new Error('The Draft belongs to another Project.');
  const bindings = new Map();
  function walk(rows) {
    for (const row of rows || []) {
      const id = row.mediaReferences?.defaultMedia?.id;
      if (Number.isSafeInteger(row.id) && UUID.test(id)) {
        if (bindings.has(row.id) && bindings.get(row.id) !== id) throw new Error('Ambiguous clip source binding.');
        bindings.set(row.id, id);
      }
      if (Array.isArray(row.children)) walk(row.children);
    }
  }
  for (const track of core.sequenceJson?.tracks?.children || []) if (trackKinds.includes(track.kind)) walk(track.children);
  return bindings;
}
function pathKey(value) {
  const path = String(value).normalize('NFC'), windows = /^[a-z]:[\\/]|^\\\\/i.test(path);
  const normalized = path.replace(/\\/g, '/'); return windows ? normalized.toLowerCase() : normalized;
}
function runner(sdk, runScript) {
  return runScript || (async (script, summary, allowCommit = false) => {
    const value = await sdk.runScript({ script, summary, allowCommit });
    if (value?.isError || value?.result === undefined) throw new Error(value?.output || 'The Project read returned an incomplete result.');
    return value.result;
  });
}
async function joinRows(sdk, projectId, runScript, script) {
  const before = await sdk.call('listProjectResources', projectId);
  if (!Array.isArray(before)) throw new Error('Could not read Project Resources.');
  const observed = await runner(sdk, runScript)(script, 'Resolve persistent AI source');
  const after = await sdk.call('listProjectResources', projectId);
  if (!Array.isArray(after) || fingerprint(before) !== fingerprint(after) || observed?.count !== before.length || !Array.isArray(observed.rows)) throw new Error('Project Resources changed while resolving the AI source.');
  const out = new Map();
  for (const row of observed.rows) {
    const raw = before[row?.index];
    if (!Number.isSafeInteger(row?.index) || !raw || raw.name !== row.name || raw.type !== row.type || !UUID.test(raw.resourceId) || typeof row.id !== 'string') throw new Error('The persistent AI source could not be matched.');
    out.set(row.id, raw.resourceId);
  }
  return out;
}
async function resolveSharedAiResources(sdk, projectId, aliases, runScript) {
  if (!Array.isArray(aliases) || aliases.some(id => typeof id !== 'string' || !id)) throw new Error('Invalid AI source ids.');
  const wanted = [...new Set(aliases)];
  const mappings = await joinRows(sdk, projectId, runScript, `const p=selects.project(${JSON.stringify(projectId)});const all=await p.resources();const wanted=${JSON.stringify(wanted)};return {count:all.length,rows:all.flatMap((r,index)=>wanted.includes(r.resourceId)?[{index,id:r.resourceId,name:r.name,type:r.type}]:[])};`);
  for (const id of wanted) if (UUID.test(id)) {
    const raw = await sdk.call('listProjectResources', projectId);
    if (!raw.some(r => r.resourceId === id)) throw new Error('The AI source is no longer in this Project.');
    mappings.set(id, id);
  }
  if (wanted.some(id => !mappings.has(id))) throw new Error('The AI source id is unavailable.');
  return mappings;
}
async function importSharedAiResource(sdk, projectId, path, runScript) {
  if (typeof path !== 'string' || !path || !(/^(?:[a-z]:[\\/]|\\\\|\/)/i.test(path))) throw new Error('An absolute AI source path is required.');
  const run = runner(sdk, runScript);
  const script = `const p=selects.project(${JSON.stringify(projectId)});const all=await p.resources();const key=${pathKey.toString()};const aliases=new Set<string>();const visit=(rows:any[])=>{for(const n of rows||[]){if(n.type==='dir')visit(n.children);else if(n.path&&key(n.path)===key(${JSON.stringify(path)}))aliases.add(n.resourceId);}};const tree=await p.sourceFiles();if('fileTree' in tree)visit(tree.fileTree);else for(const f of tree.folders||[]){const part=await p.sourceFiles({folder:f.name});if('fileTree' in part)visit(part.fileTree);}return {count:all.length,rows:all.flatMap((r,index)=>aliases.has(r.resourceId)?[{index,id:r.resourceId,name:r.name,type:r.type}]:[])};`;
  let map = await joinRows(sdk, projectId, run, script);
  if (!map.size) {
    await run(`return await selects.project(${JSON.stringify(projectId)}).importFiles({paths:[${JSON.stringify(path)}]});`, 'Register AI source media', true);
    map = await joinRows(sdk, projectId, run, script);
  }
  const ids = [...new Set(map.values())];
  if (ids.length !== 1) throw new Error('The imported AI source path is missing or ambiguous.');
  return ids[0];
}
module.exports = { canonicalResourceBindings, resolveSharedAiResources, importSharedAiResource, importSharedAiVideo: importSharedAiResource };

return module.exports;})();
//shared-ai-resources:end
