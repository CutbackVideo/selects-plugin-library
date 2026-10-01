// @name Six Clip Velocity
// @name:de Six Clip Velocity
// @name:en Six Clip Velocity
// @name:es Six Clip Velocity
// @name:fr Six Clip Velocity
// @name:it Six Clip Velocity
// @name:ja Six Clip Velocity
// @name:ko Six Clip Velocity
// @name:pt Six Clip Velocity
// @name:tr Six Clip Velocity
// @name:zh Six Clip Velocity
// @icon video
import React from 'react';

const SLOTS=6;
const BUILDER='node "$SELECTS_USER_SKILLS_ROOT/six-clip-velocity/build-script.mjs" ';
const INVENTORY=`const p=selects.project(PROJECT_ID);const resources=await p.resources();const types=new Map(resources.map(r=>[r.resourceId,r.type]));const nodes=[];const walk=tree=>{for(const n of tree||[])n.type==='dir'?walk(n.children):nodes.push(n)};const view=await p.sourceFiles();if('fileTree' in view)walk(view.fileTree);else if('folders' in view)for(const folder of view.folders){const detail=await p.sourceFiles({folder:folder.name});if('fileTree' in detail)walk(detail.fileTree)}return nodes.filter(n=>n.path&&types.has(n.resourceId)).map(n=>({resourceId:n.resourceId,type:types.get(n.resourceId),name:n.name,path:n.path,seconds:n.durationSeconds??null}));`;
const encode=value=>{
 const bytes=new TextEncoder().encode(JSON.stringify(value));let binary='';
 for(const b of bytes)binary+=String.fromCharCode(b);
 return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
};
async function inventory(sdk,projectId,summary){
 const r=await sdk.runScript({script:INVENTORY.replace('PROJECT_ID',JSON.stringify(projectId)),summary,allowCommit:false});
 if(r.isError||!Array.isArray(r.result))throw Error(r.output||'Could not read the Project files.');
 return r.result;
}
async function builder(sdk,request,summary,maxOutputBytes=49152){
 const r=await sdk.runShell({summary,command:BUILDER+encode(request),timeoutMs:30000,maxOutputBytes});
 if(r.isError||r.exitCode!==0||!r.stdout)throw Error(r.stderr||r.output||summary+' failed.');
 return r.stdout;
}

// The public panel SDK cannot retime clips or place a clip from a chosen source point, so
// this uses the editor's existing timeline service, as Four Photo Reveal does for Images.
// It validates every selected path and rejects unknown hosts. No client code is changed.
export async function prepareVideos(app,projectId,videos){
 const match=app.location.pathname.match(/libraries\/([^/]+)\/projects\/([^/]+)/);
 if(!match||match[2]!==projectId)throw Error('Open the selected Project before creating the Draft.');
 const [libraryId]=match.slice(1),di=app.__DI__;
 if(typeof di?.ProjectRepository?.findById!=='function'||typeof di?.ResourceRepository?.findById!=='function'||typeof di?.SequenceRepository?.findById!=='function'||typeof di?.TimelineMutation?.run!=='function')throw Error('This Selects version does not support this plugin\'s video placement.');
 const project=await di.ProjectRepository.findById(libraryId,projectId);
 if(!project)throw Error('The selected Project was not found.');
 const members=await Promise.all(project.getResources().map(id=>di.ResourceRepository.findById(libraryId,id)));
 const sources=[];
 for(const v of videos){
  const matches=members.filter(r=>r?.getType()==='Video'&&(r.getMedia()?.originalPath??r.getMedia()?.path)===v.path);
  if(matches.length!==1)throw Error('A selected video is missing or ambiguous in the Project: '+v.name);
  const resource=matches[0],media=resource.getMedia(),analyzed=await resource.getAnalyzedSequence();
  const main=analyzed?.getMainTrack(),primary=main?.getClips().find(clip=>!clip.isGap());
  if(!analyzed||!main||!primary||!Number.isSafeInteger(media?.width)||!Number.isSafeInteger(media?.height))throw Error('A selected video is not ready for editing: '+v.name);
  sources.push({analyzed,main,primary,width:media.width,height:media.height});
 }
 return {di,libraryId,projectId,sources};
}

// Place one piece: `frames` Draft frames at `at`, playing the video from `inSec` seconds
// at `speed`. The editor places a clip from its source start, so the piece is retimed,
// trimmed at the start to its source point (which moves it right), trimmed to length and
// shifted back to `at`.
export function placePiece(c,src,fps,at,inSec,speed,frames){
 const ids=c.place({working:src.analyzed,primaryTrack:src.main,primaryOffset:0,primaryClipId:src.primary.getId()},at,{kind:'overlay'});
 if(ids.length!==1)throw Error('Video placement did not create one clip.');
 const id=ids[0];let pos=c.getClipPositionById(id);
 const Rate=pos.clip.requireTiming().getPlaybackSpeed().constructor;
 if(speed!==1)pos.clip.retimeByRequestedRate({requestedRate:Rate.from({numerator:Math.round(speed*100),denominator:100}),preserveAudioPitch:true});
 const cut=Math.round(inSec*fps/speed);
 if(cut>0){pos=c.getClipPositionById(id);const r=c.trimClipBoundary({trackId:pos.trackId,clipId:id,position:'start',delta:cut});if(Math.abs(r.effectiveDelta)!==cut)throw Error('A video is too short for the format.');} // start trims report a negative delta
 pos=c.getClipPositionById(id);
 const d=frames-pos.clip.getDuration();
 if(d>0)throw Error('A video is too short for the format.');
 if(d<0)c.trimClipBoundary({trackId:pos.trackId,clipId:id,position:'end',delta:d});
 pos=c.getClipPositionById(id);
 if(pos.resolvedOffset!==at)c.shiftClipsInPlace({[pos.trackId]:[pos]},at-pos.resolvedOffset);
 pos=c.getClipPositionById(id);
 if(!pos||pos.resolvedOffset!==at||pos.clip.getDuration()!==frames)throw Error('A video piece moved during placement.');
 return {clipId:id,trackId:pos.trackId};
}

export async function placeVideos(prepared,draftId,plan){
 const {di,libraryId,projectId,sources}=prepared;
 const project=await di.ProjectRepository.findById(libraryId,projectId);
 if(!project?.getEditedSequences().includes(draftId))throw Error('The new Draft is not owned by the selected Project.');
 const sequence=await di.SequenceRepository.findById(libraryId,draftId);
 if(!sequence||sequence.getFrameRate()!==plan.fps||sequence.getDuration('resolved')!==plan.durationFrames||JSON.stringify(sequence.getFrameSize())!==JSON.stringify(plan.canvas))throw Error('The Draft frame grid differs from the plan.');
 const placements=[];
 const outcome=await di.TimelineMutation.run(sequence,'six-clip-velocity:placeVideos',current=>{
  const c=current.clone();
  for(const s of plan.segments)for(const p of s.pieces){
   const r=placePiece(c,sources[s.video],plan.fps,p.startFrame,p.inSec,p.speed,p.frames);
   placements.push({video:s.video,clipId:r.clipId,trackId:r.trackId,startFrame:p.startFrame,endFrame:p.startFrame+p.frames});
  }
  const over=c.getDuration('resolved')-plan.durationFrames;
  if(over>0)c.slice([{startFrame:plan.durationFrames,endFrame:plan.durationFrames+over}],{coordinate:'resolved'});
  if(c.getDuration('resolved')!==plan.durationFrames)throw Error('Video placement changed the Draft duration.');
  return c;
 });
 if(outcome.status!=='committed')throw Error('Video placement was not confirmed.');
 for(const p of placements){const row=outcome.sequence?.getClipPositionById(p.clipId);if(!row||row.trackId!==p.trackId||row.resolvedOffset!==p.startFrame||row.clip.getDuration()!==p.endFrame-p.startFrame)throw Error('Saved video placement could not be read back.');}
 return {placements,videos:sources.map(s=>({width:s.width,height:s.height}))};
}

async function ensureMusic(sdk,projectId){
 const file=JSON.parse(await builder(sdk,{mode:'music'},'Locate bundled music',15000));
 let rows=await inventory(sdk,projectId,'Find bundled music');
 if(!rows.some(r=>r.path===file.path&&r.type==='Audio')){
  const r=await sdk.runScript({script:`return await selects.project(${JSON.stringify(projectId)}).importFiles({paths:${JSON.stringify([file.path])}});`,summary:'Import velocity music',allowCommit:true});
  if(r.isError)throw Error(r.output||'Could not import the music.');
  rows=await inventory(sdk,projectId,'Confirm bundled music');
 }
 const m=rows.find(r=>r.path===file.path&&r.type==='Audio');
 if(!m)throw Error('The music is not ready in the Project yet. Try again in a moment.');
 return m.resourceId;
}

// The shell command is limited to 16 KB, so each piece travels as [clipId, trackIndex].
const compactPlacements=placements=>{const tracks=[...new Set(placements.map(p=>p.trackId))];return {tracks,clips:placements.map(p=>[p.clipId,tracks.indexOf(p.trackId)])};};
const DEFAULT_TEXT={line1:['MOVE','WITH','ME','TONIGHT'],line2:'SLOW',phrase2:['SLOW','DOWN']};
const ROLE=['Opening shot, 8 s or longer (subtitles play over it)','Second shot','Shot 3','Shot 4','Shot 5','Shot 6'];
const STRINGS={"en":{"intro":"Six videos become a 23-second 3:4 velocity edit with speed ramps, vertical blur cuts, a white flash, kinetic subtitles, a repeated block and a fade to black. Music is included.","noProject":"Open a Project first.","load":"Load Project videos","loading":"Loading project videos\u2026","ready":"Check the order and length of videos 1\u20136.","some":"This Project has {n} videos. The format needs 6; import more or choose one twice on purpose.","none":"This Project has no videos. Import videos first.","checking":"Checking videos\u2026","addingMusic":"Adding music to the Project\u2026","creating":"Creating the Draft\u2026","placing":"Placing and retiming {n} video pieces\u2026","finishing":"Adding blur cuts, subtitles, flash, fade and music\u2026","saved":"Saved. Each velocity piece is an editable clip; adjust framing in clip effects and the font in the subtitle graphic.","partial":" The partial Draft will be checked before continuing.","choose":"Choose video","needs":"Needs at least {s} s of footage.","subtitle":"Subtitle words (optional)","lineWord":"Line 1, word {n}","line2":"Line 2","phraseWord":"Second phrase, word {n}","draftName":"Draft name","continue":"Inspect and continue partial Draft","another":"Create another Draft","create":"Create Draft","open":"Open saved Draft","roles":["Opening shot, 8 s or longer (with subtitles)","Second shot","Shot 3","Shot 4","Shot 5","Shot 6"],"summary":"Turn six videos into an editable 23-second velocity edit with speed ramps, vertical blur cuts, a white flash, kinetic subtitles, a fade to black and bundled music."},"de":{"intro":"Sechs Videos werden zu einem 23-sek\u00fcndigen 3:4-Velocity-Schnitt mit Speed Ramps, vertikalen Blur-\u00dcberg\u00e4ngen, wei\u00dfem Blitz, kinetischen Untertiteln, Wiederholung und Schwarzblende. Musik ist enthalten.","noProject":"\u00d6ffne zuerst ein Projekt.","load":"Projektvideos laden","loading":"Projektvideos werden geladen\u2026","ready":"Pr\u00fcfe Reihenfolge und L\u00e4nge der Videos 1\u20136.","some":"Dieses Projekt enth\u00e4lt {n} Videos. Das Format ben\u00f6tigt 6; importiere weitere oder w\u00e4hle bewusst eines doppelt.","none":"Dieses Projekt enth\u00e4lt keine Videos. Importiere zuerst Videos.","checking":"Videos werden gepr\u00fcft\u2026","addingMusic":"Musik wird dem Projekt hinzugef\u00fcgt\u2026","creating":"Entwurf wird erstellt\u2026","placing":"{n} Videoteile werden platziert und retimed\u2026","finishing":"Blur-\u00dcberg\u00e4nge, Untertitel, Blitz, Blende und Musik werden hinzugef\u00fcgt\u2026","saved":"Gespeichert. Jeder Velocity-Abschnitt ist ein editierbarer Clip; passe Bildausschnitt und Untertitelschrift an.","partial":" Der teilweise erstellte Entwurf wird vor dem Fortsetzen gepr\u00fcft.","choose":"Video ausw\u00e4hlen","needs":"Mindestens {s} s Material erforderlich.","subtitle":"Untertitelw\u00f6rter (optional)","lineWord":"Zeile 1, Wort {n}","line2":"Zeile 2","phraseWord":"Zweite Phrase, Wort {n}","draftName":"Entwurfsname","continue":"Teilweisen Entwurf pr\u00fcfen und fortsetzen","another":"Weiteren Entwurf erstellen","create":"Entwurf erstellen","open":"Gespeicherten Entwurf \u00f6ffnen","roles":["Er\u00f6ffnung, mindestens 8 s (mit Untertiteln)","Zweite Einstellung","Einstellung 3","Einstellung 4","Einstellung 5","Einstellung 6"],"summary":"Verwandelt sechs Videos in einen editierbaren 23-Sekunden-Velocity-Schnitt mit Speed Ramps, vertikalen Blur-\u00dcberg\u00e4ngen, wei\u00dfem Blitz, kinetischen Untertiteln, Schwarzblende und Musik."},"es":{"intro":"Seis v\u00eddeos se convierten en un montaje de velocidad 3:4 de 23 segundos con rampas, cortes de desenfoque vertical, destello blanco, subt\u00edtulos cin\u00e9ticos, repetici\u00f3n y fundido a negro. Incluye m\u00fasica.","noProject":"Abre primero un proyecto.","load":"Cargar v\u00eddeos del proyecto","loading":"Cargando v\u00eddeos del proyecto\u2026","ready":"Comprueba el orden y la duraci\u00f3n de los v\u00eddeos 1\u20136.","some":"Este proyecto tiene {n} v\u00eddeos. El formato necesita 6; importa m\u00e1s o elige uno dos veces a prop\u00f3sito.","none":"Este proyecto no tiene v\u00eddeos. Importa v\u00eddeos primero.","checking":"Comprobando v\u00eddeos\u2026","addingMusic":"A\u00f1adiendo m\u00fasica al proyecto\u2026","creating":"Creando el borrador\u2026","placing":"Colocando y ajustando {n} fragmentos\u2026","finishing":"A\u00f1adiendo cortes desenfocados, subt\u00edtulos, destello, fundido y m\u00fasica\u2026","saved":"Guardado. Cada fragmento es un clip editable; ajusta el encuadre y la fuente de los subt\u00edtulos.","partial":" El borrador parcial se comprobar\u00e1 antes de continuar.","choose":"Elegir v\u00eddeo","needs":"Necesita al menos {s} s de material.","subtitle":"Palabras de subt\u00edtulos (opcional)","lineWord":"L\u00ednea 1, palabra {n}","line2":"L\u00ednea 2","phraseWord":"Segunda frase, palabra {n}","draftName":"Nombre del borrador","continue":"Revisar y continuar el borrador parcial","another":"Crear otro borrador","create":"Crear borrador","open":"Abrir borrador guardado","roles":["Toma inicial, 8 s o m\u00e1s (con subt\u00edtulos)","Segunda toma","Toma 3","Toma 4","Toma 5","Toma 6"],"summary":"Convierte seis v\u00eddeos en un montaje de velocidad editable de 23 segundos con rampas, cortes de desenfoque vertical, destello blanco, subt\u00edtulos cin\u00e9ticos, fundido a negro y m\u00fasica."},"fr":{"intro":"Six vid\u00e9os deviennent un montage de vitesse 3:4 de 23 secondes avec acc\u00e9l\u00e9rations, coupes en flou vertical, flash blanc, sous-titres cin\u00e9tiques, r\u00e9p\u00e9tition et fondu au noir. Musique incluse.","noProject":"Ouvrez d\u2019abord un projet.","load":"Charger les vid\u00e9os du projet","loading":"Chargement des vid\u00e9os du projet\u2026","ready":"V\u00e9rifiez l\u2019ordre et la dur\u00e9e des vid\u00e9os 1 \u00e0 6.","some":"Ce projet contient {n} vid\u00e9os. Le format en demande 6 ; importez-en d\u2019autres ou choisissez-en une deux fois.","none":"Ce projet ne contient aucune vid\u00e9o. Importez d\u2019abord des vid\u00e9os.","checking":"V\u00e9rification des vid\u00e9os\u2026","addingMusic":"Ajout de la musique au projet\u2026","creating":"Cr\u00e9ation du brouillon\u2026","placing":"Placement et changement de vitesse de {n} segments\u2026","finishing":"Ajout des coupes floues, sous-titres, flash, fondu et musique\u2026","saved":"Enregistr\u00e9. Chaque segment est un clip modifiable ; ajustez le cadrage et la police des sous-titres.","partial":" Le brouillon partiel sera v\u00e9rifi\u00e9 avant de continuer.","choose":"Choisir une vid\u00e9o","needs":"N\u00e9cessite au moins {s} s de vid\u00e9o.","subtitle":"Mots des sous-titres (facultatif)","lineWord":"Ligne 1, mot {n}","line2":"Ligne 2","phraseWord":"Deuxi\u00e8me phrase, mot {n}","draftName":"Nom du brouillon","continue":"V\u00e9rifier et continuer le brouillon partiel","another":"Cr\u00e9er un autre brouillon","create":"Cr\u00e9er un brouillon","open":"Ouvrir le brouillon enregistr\u00e9","roles":["Plan d\u2019ouverture, 8 s ou plus (avec sous-titres)","Deuxi\u00e8me plan","Plan 3","Plan 4","Plan 5","Plan 6"],"summary":"Transforme six vid\u00e9os en un montage de vitesse modifiable de 23 secondes avec acc\u00e9l\u00e9rations, flou vertical, flash blanc, sous-titres cin\u00e9tiques, fondu au noir et musique."},"it":{"intro":"Sei video diventano un montaggio velocity 3:4 di 23 secondi con rampe di velocit\u00e0, stacchi sfocati verticali, flash bianco, sottotitoli cinetici, ripetizione e dissolvenza al nero. Musica inclusa.","noProject":"Apri prima un progetto.","load":"Carica i video del progetto","loading":"Caricamento dei video del progetto\u2026","ready":"Controlla ordine e durata dei video 1\u20136.","some":"Questo progetto contiene {n} video. Il formato ne richiede 6; importane altri o scegline uno due volte.","none":"Questo progetto non contiene video. Importa prima dei video.","checking":"Controllo dei video\u2026","addingMusic":"Aggiunta della musica al progetto\u2026","creating":"Creazione della bozza\u2026","placing":"Posizionamento e cambio velocit\u00e0 di {n} segmenti\u2026","finishing":"Aggiunta di stacchi sfocati, sottotitoli, flash, dissolvenza e musica\u2026","saved":"Salvato. Ogni segmento \u00e8 una clip modificabile; regola inquadratura e carattere dei sottotitoli.","partial":" La bozza parziale verr\u00e0 controllata prima di continuare.","choose":"Scegli video","needs":"Servono almeno {s} s di ripresa.","subtitle":"Parole dei sottotitoli (facoltative)","lineWord":"Riga 1, parola {n}","line2":"Riga 2","phraseWord":"Seconda frase, parola {n}","draftName":"Nome bozza","continue":"Controlla e continua la bozza parziale","another":"Crea un\u2019altra bozza","create":"Crea bozza","open":"Apri la bozza salvata","roles":["Inquadratura iniziale, almeno 8 s (con sottotitoli)","Seconda inquadratura","Inquadratura 3","Inquadratura 4","Inquadratura 5","Inquadratura 6"],"summary":"Trasforma sei video in un montaggio velocity modificabile di 23 secondi con rampe di velocit\u00e0, sfocature verticali, flash bianco, sottotitoli cinetici, dissolvenza al nero e musica."},"ja":{"intro":"6\u672c\u306e\u52d5\u753b\u309223\u79d2\u306e3:4\u30d9\u30ed\u30b7\u30c6\u30a3\u7de8\u96c6\u306b\u3057\u307e\u3059\u3002\u30b9\u30d4\u30fc\u30c9\u30e9\u30f3\u30d7\u3001\u7e26\u65b9\u5411\u306e\u30d6\u30e9\u30fc\u5207\u308a\u66ff\u3048\u3001\u767d\u30d5\u30e9\u30c3\u30b7\u30e5\u3001\u52d5\u304f\u5b57\u5e55\u3001\u53cd\u5fa9\u3001\u9ed2\u3078\u306e\u30d5\u30a7\u30fc\u30c9\u3001\u97f3\u697d\u3092\u542b\u307f\u307e\u3059\u3002","noProject":"\u5148\u306b\u30d7\u30ed\u30b8\u30a7\u30af\u30c8\u3092\u958b\u3044\u3066\u304f\u3060\u3055\u3044\u3002","load":"\u30d7\u30ed\u30b8\u30a7\u30af\u30c8\u52d5\u753b\u3092\u8aad\u307f\u8fbc\u3080","loading":"\u30d7\u30ed\u30b8\u30a7\u30af\u30c8\u52d5\u753b\u3092\u8aad\u307f\u8fbc\u307f\u4e2d\u2026","ready":"\u52d5\u753b1\u301c6\u306e\u9806\u756a\u3068\u9577\u3055\u3092\u78ba\u8a8d\u3057\u3066\u304f\u3060\u3055\u3044\u3002","some":"\u3053\u306e\u30d7\u30ed\u30b8\u30a7\u30af\u30c8\u306b\u306f\u52d5\u753b\u304c{n}\u672c\u3042\u308a\u307e\u3059\u30026\u672c\u5fc5\u8981\u3067\u3059\u3002\u8ffd\u52a0\u3059\u308b\u304b\u3001\u610f\u56f3\u7684\u306b\u540c\u3058\u52d5\u753b\u30922\u56de\u9078\u3093\u3067\u304f\u3060\u3055\u3044\u3002","none":"\u3053\u306e\u30d7\u30ed\u30b8\u30a7\u30af\u30c8\u306b\u306f\u52d5\u753b\u304c\u3042\u308a\u307e\u305b\u3093\u3002\u5148\u306b\u8aad\u307f\u8fbc\u3093\u3067\u304f\u3060\u3055\u3044\u3002","checking":"\u52d5\u753b\u3092\u78ba\u8a8d\u4e2d\u2026","addingMusic":"\u30d7\u30ed\u30b8\u30a7\u30af\u30c8\u306b\u97f3\u697d\u3092\u8ffd\u52a0\u4e2d\u2026","creating":"\u30c9\u30e9\u30d5\u30c8\u3092\u4f5c\u6210\u4e2d\u2026","placing":"{n}\u500b\u306e\u52d5\u753b\u30d1\u30fc\u30c4\u3092\u914d\u7f6e\u3057\u3066\u901f\u5ea6\u3092\u8abf\u6574\u4e2d\u2026","finishing":"\u30d6\u30e9\u30fc\u3001\u5b57\u5e55\u3001\u30d5\u30e9\u30c3\u30b7\u30e5\u3001\u30d5\u30a7\u30fc\u30c9\u3001\u97f3\u697d\u3092\u8ffd\u52a0\u4e2d\u2026","saved":"\u4fdd\u5b58\u3057\u307e\u3057\u305f\u3002\u5404\u533a\u9593\u306f\u7de8\u96c6\u53ef\u80fd\u306a\u30af\u30ea\u30c3\u30d7\u3067\u3059\u3002\u753b\u89d2\u3068\u5b57\u5e55\u30d5\u30a9\u30f3\u30c8\u3092\u8abf\u6574\u3067\u304d\u307e\u3059\u3002","partial":" \u7d9a\u884c\u524d\u306b\u9014\u4e2d\u306e\u30c9\u30e9\u30d5\u30c8\u3092\u78ba\u8a8d\u3057\u307e\u3059\u3002","choose":"\u52d5\u753b\u3092\u9078\u629e","needs":"\u5c11\u306a\u304f\u3068\u3082{s}\u79d2\u306e\u6620\u50cf\u304c\u5fc5\u8981\u3067\u3059\u3002","subtitle":"\u5b57\u5e55\u306e\u5358\u8a9e\uff08\u4efb\u610f\uff09","lineWord":"1\u884c\u76ee\u3001\u5358\u8a9e{n}","line2":"2\u884c\u76ee","phraseWord":"2\u3064\u76ee\u306e\u30d5\u30ec\u30fc\u30ba\u3001\u5358\u8a9e{n}","draftName":"\u30c9\u30e9\u30d5\u30c8\u540d","continue":"\u9014\u4e2d\u306e\u30c9\u30e9\u30d5\u30c8\u3092\u78ba\u8a8d\u3057\u3066\u7d9a\u884c","another":"\u5225\u306e\u30c9\u30e9\u30d5\u30c8\u3092\u4f5c\u6210","create":"\u30c9\u30e9\u30d5\u30c8\u3092\u4f5c\u6210","open":"\u4fdd\u5b58\u3057\u305f\u30c9\u30e9\u30d5\u30c8\u3092\u958b\u304f","roles":["\u5192\u982d\u30b7\u30e7\u30c3\u30c8\u30018\u79d2\u4ee5\u4e0a\uff08\u5b57\u5e55\u3042\u308a\uff09","2\u756a\u76ee\u306e\u30b7\u30e7\u30c3\u30c8","\u30b7\u30e7\u30c3\u30c83","\u30b7\u30e7\u30c3\u30c84","\u30b7\u30e7\u30c3\u30c85","\u30b7\u30e7\u30c3\u30c86"],"summary":"6\u672c\u306e\u52d5\u753b\u3092\u3001\u30b9\u30d4\u30fc\u30c9\u30e9\u30f3\u30d7\u3001\u7e26\u30d6\u30e9\u30fc\u3001\u767d\u30d5\u30e9\u30c3\u30b7\u30e5\u3001\u52d5\u304f\u5b57\u5e55\u3001\u9ed2\u3078\u306e\u30d5\u30a7\u30fc\u30c9\u3001\u97f3\u697d\u3092\u5099\u3048\u305f\u7de8\u96c6\u53ef\u80fd\u306a23\u79d2\u306e\u30d9\u30ed\u30b7\u30c6\u30a3\u7de8\u96c6\u306b\u3057\u307e\u3059\u3002"},"ko":{"intro":"6\uac1c \uc601\uc0c1\uc744 23\ucd08 \uae38\uc774\uc758 3:4 \ubca8\ub85c\uc2dc\ud2f0 \ud3b8\uc9d1\uc73c\ub85c \ub9cc\ub4ed\ub2c8\ub2e4. \uc2a4\ud53c\ub4dc \ub7a8\ud504, \uc138\ub85c \ube14\ub7ec \ucef7, \ud770\uc0c9 \ud50c\ub798\uc2dc, \ud0a4\ub124\ud2f1 \uc790\ub9c9, \ubc18\ubcf5, \uac80\uc740\uc0c9 \ud398\uc774\ub4dc\uc640 \uc74c\uc545\uc774 \ud3ec\ud568\ub429\ub2c8\ub2e4.","noProject":"\uba3c\uc800 \ud504\ub85c\uc81d\ud2b8\ub97c \uc5ec\uc138\uc694.","load":"\ud504\ub85c\uc81d\ud2b8 \uc601\uc0c1 \ubd88\ub7ec\uc624\uae30","loading":"\ud504\ub85c\uc81d\ud2b8 \uc601\uc0c1\uc744 \ubd88\ub7ec\uc624\ub294 \uc911\u2026","ready":"\uc601\uc0c1 1\u20136\uc758 \uc21c\uc11c\uc640 \uae38\uc774\ub97c \ud655\uc778\ud558\uc138\uc694.","some":"\uc774 \ud504\ub85c\uc81d\ud2b8\uc5d0\ub294 \uc601\uc0c1\uc774 {n}\uac1c \uc788\uc2b5\ub2c8\ub2e4. 6\uac1c\uac00 \ud544\uc694\ud569\ub2c8\ub2e4. \uc601\uc0c1\uc744 \ub354 \uac00\uc838\uc624\uac70\ub098 \uac19\uc740 \uc601\uc0c1\uc744 \uc758\ub3c4\uc801\uc73c\ub85c \ub450 \ubc88 \uc120\ud0dd\ud558\uc138\uc694.","none":"\uc774 \ud504\ub85c\uc81d\ud2b8\uc5d0 \uc601\uc0c1\uc774 \uc5c6\uc2b5\ub2c8\ub2e4. \uba3c\uc800 \uc601\uc0c1\uc744 \uac00\uc838\uc624\uc138\uc694.","checking":"\uc601\uc0c1\uc744 \ud655\uc778\ud558\ub294 \uc911\u2026","addingMusic":"\ud504\ub85c\uc81d\ud2b8\uc5d0 \uc74c\uc545\uc744 \ucd94\uac00\ud558\ub294 \uc911\u2026","creating":"Draft\ub97c \ub9cc\ub4dc\ub294 \uc911\u2026","placing":"\uc601\uc0c1 \uc870\uac01 {n}\uac1c\ub97c \ubc30\uce58\ud558\uace0 \uc18d\ub3c4\ub97c \uc870\uc815\ud558\ub294 \uc911\u2026","finishing":"\ube14\ub7ec \ucef7, \uc790\ub9c9, \ud50c\ub798\uc2dc, \ud398\uc774\ub4dc\uc640 \uc74c\uc545\uc744 \ucd94\uac00\ud558\ub294 \uc911\u2026","saved":"\uc800\uc7a5\ud588\uc2b5\ub2c8\ub2e4. \uac01 \uad6c\uac04\uc740 \ud3b8\uc9d1 \uac00\ub2a5\ud55c \ud074\ub9bd\uc774\uba70 \ud654\uba74 \uad6c\ub3c4\uc640 \uc790\ub9c9 \uae00\uaf34\uc744 \uc870\uc815\ud560 \uc218 \uc788\uc2b5\ub2c8\ub2e4.","partial":" \uacc4\uc18d\ud558\uae30 \uc804\uc5d0 \uc77c\ubd80 \uc0dd\uc131\ub41c Draft\ub97c \ud655\uc778\ud569\ub2c8\ub2e4.","choose":"\uc601\uc0c1 \uc120\ud0dd","needs":"\ucd5c\uc18c {s}\ucd08 \ubd84\ub7c9\uc774 \ud544\uc694\ud569\ub2c8\ub2e4.","subtitle":"\uc790\ub9c9 \ub2e8\uc5b4(\uc120\ud0dd \uc0ac\ud56d)","lineWord":"\uccab\uc9f8 \uc904, {n}\ubc88\uc9f8 \ub2e8\uc5b4","line2":"\ub458\uc9f8 \uc904","phraseWord":"\ub450 \ubc88\uc9f8 \ubb38\uad6c, {n}\ubc88\uc9f8 \ub2e8\uc5b4","draftName":"Draft \uc774\ub984","continue":"\uc77c\ubd80 Draft \ud655\uc778 \ud6c4 \uacc4\uc18d","another":"Draft \ud558\ub098 \ub354 \ub9cc\ub4e4\uae30","create":"Draft \ub9cc\ub4e4\uae30","open":"\uc800\uc7a5\ub41c Draft \uc5f4\uae30","roles":["\uccab \uc7a5\uba74, 8\ucd08 \uc774\uc0c1(\uc790\ub9c9 \ud3ec\ud568)","\ub450 \ubc88\uc9f8 \uc7a5\uba74","\uc7a5\uba74 3","\uc7a5\uba74 4","\uc7a5\uba74 5","\uc7a5\uba74 6"],"summary":"6\uac1c \uc601\uc0c1\uc744 \uc2a4\ud53c\ub4dc \ub7a8\ud504, \uc138\ub85c \ube14\ub7ec \ucef7, \ud770\uc0c9 \ud50c\ub798\uc2dc, \ud0a4\ub124\ud2f1 \uc790\ub9c9, \uac80\uc740\uc0c9 \ud398\uc774\ub4dc\uc640 \uc74c\uc545\uc774 \ud3ec\ud568\ub41c \ud3b8\uc9d1 \uac00\ub2a5\ud55c 23\ucd08 \ubca8\ub85c\uc2dc\ud2f0 \uc601\uc0c1\uc73c\ub85c \ub9cc\ub4ed\ub2c8\ub2e4."},"pt":{"intro":"Seis v\u00eddeos viram uma edi\u00e7\u00e3o de velocidade 3:4 de 23 segundos com rampas, cortes de desfoque vertical, flash branco, legendas cin\u00e9ticas, repeti\u00e7\u00e3o e fade para preto. M\u00fasica inclu\u00edda.","noProject":"Abra primeiro um projeto.","load":"Carregar v\u00eddeos do projeto","loading":"Carregando v\u00eddeos do projeto\u2026","ready":"Confira a ordem e a dura\u00e7\u00e3o dos v\u00eddeos 1\u20136.","some":"Este projeto tem {n} v\u00eddeos. O formato precisa de 6; importe mais ou escolha um duas vezes de prop\u00f3sito.","none":"Este projeto n\u00e3o tem v\u00eddeos. Importe v\u00eddeos primeiro.","checking":"Verificando v\u00eddeos\u2026","addingMusic":"Adicionando m\u00fasica ao projeto\u2026","creating":"Criando o rascunho\u2026","placing":"Posicionando e ajustando {n} trechos\u2026","finishing":"Adicionando cortes desfocados, legendas, flash, fade e m\u00fasica\u2026","saved":"Salvo. Cada trecho \u00e9 um clipe edit\u00e1vel; ajuste o enquadramento e a fonte das legendas.","partial":" O rascunho parcial ser\u00e1 verificado antes de continuar.","choose":"Escolher v\u00eddeo","needs":"Precisa de pelo menos {s} s de v\u00eddeo.","subtitle":"Palavras das legendas (opcional)","lineWord":"Linha 1, palavra {n}","line2":"Linha 2","phraseWord":"Segunda frase, palavra {n}","draftName":"Nome do rascunho","continue":"Verificar e continuar rascunho parcial","another":"Criar outro rascunho","create":"Criar rascunho","open":"Abrir rascunho salvo","roles":["Cena inicial, 8 s ou mais (com legendas)","Segunda cena","Cena 3","Cena 4","Cena 5","Cena 6"],"summary":"Transforma seis v\u00eddeos em uma edi\u00e7\u00e3o de velocidade edit\u00e1vel de 23 segundos com rampas, desfoque vertical, flash branco, legendas cin\u00e9ticas, fade para preto e m\u00fasica."},"tr":{"intro":"Alt\u0131 video; h\u0131z rampalar\u0131, dikey bulan\u0131kl\u0131k ge\u00e7i\u015fleri, beyaz fla\u015f, hareketli altyaz\u0131lar, tekrar, siyaha ge\u00e7i\u015f ve m\u00fczik i\u00e7eren 23 saniyelik 3:4 h\u0131z kurgusuna d\u00f6n\u00fc\u015f\u00fcr.","noProject":"\u00d6nce bir proje a\u00e7\u0131n.","load":"Proje videolar\u0131n\u0131 y\u00fckle","loading":"Proje videolar\u0131 y\u00fckleniyor\u2026","ready":"1\u20136 numaral\u0131 videolar\u0131n s\u0131ras\u0131n\u0131 ve s\u00fcrelerini kontrol edin.","some":"Bu projede {n} video var. Format i\u00e7in 6 video gerekir; daha fazla i\u00e7e aktar\u0131n veya birini bilerek iki kez se\u00e7in.","none":"Bu projede video yok. \u00d6nce video i\u00e7e aktar\u0131n.","checking":"Videolar kontrol ediliyor\u2026","addingMusic":"M\u00fczik projeye ekleniyor\u2026","creating":"Taslak olu\u015fturuluyor\u2026","placing":"{n} video par\u00e7as\u0131 yerle\u015ftirilip h\u0131zland\u0131r\u0131l\u0131yor\u2026","finishing":"Bulan\u0131kl\u0131k, altyaz\u0131, fla\u015f, kararma ve m\u00fczik ekleniyor\u2026","saved":"Kaydedildi. Her b\u00f6l\u00fcm d\u00fczenlenebilir bir kliptir; kadraj\u0131 ve altyaz\u0131 yaz\u0131 tipini ayarlayabilirsiniz.","partial":" Devam etmeden \u00f6nce k\u0131smi taslak kontrol edilecek.","choose":"Video se\u00e7","needs":"En az {s} sn g\u00f6r\u00fcnt\u00fc gerekir.","subtitle":"Altyaz\u0131 kelimeleri (iste\u011fe ba\u011fl\u0131)","lineWord":"1. sat\u0131r, {n}. kelime","line2":"2. sat\u0131r","phraseWord":"\u0130kinci ifade, {n}. kelime","draftName":"Taslak ad\u0131","continue":"K\u0131smi tasla\u011f\u0131 kontrol et ve devam et","another":"Ba\u015fka taslak olu\u015ftur","create":"Taslak olu\u015ftur","open":"Kaydedilen tasla\u011f\u0131 a\u00e7","roles":["A\u00e7\u0131l\u0131\u015f plan\u0131, en az 8 sn (altyaz\u0131l\u0131)","\u0130kinci plan","Plan 3","Plan 4","Plan 5","Plan 6"],"summary":"Alt\u0131 videoyu h\u0131z rampalar\u0131, dikey bulan\u0131kl\u0131k ge\u00e7i\u015fleri, beyaz fla\u015f, hareketli altyaz\u0131lar, siyaha ge\u00e7i\u015f ve m\u00fczik i\u00e7eren d\u00fczenlenebilir 23 saniyelik bir kurguya d\u00f6n\u00fc\u015ft\u00fcr\u00fcr."},"zh":{"intro":"\u5c06\u516d\u6bb5\u89c6\u9891\u5236\u4f5c\u621023\u79d2\u76843:4\u901f\u5ea6\u611f\u526a\u8f91\uff0c\u5305\u542b\u53d8\u901f\u3001\u7eb5\u5411\u6a21\u7cca\u5207\u6362\u3001\u767d\u8272\u95ea\u5149\u3001\u52a8\u6001\u5b57\u5e55\u3001\u91cd\u590d\u6bb5\u843d\u3001\u6de1\u51fa\u81f3\u9ed1\u8272\u548c\u97f3\u4e50\u3002","noProject":"\u8bf7\u5148\u6253\u5f00\u4e00\u4e2a\u9879\u76ee\u3002","load":"\u52a0\u8f7d\u9879\u76ee\u89c6\u9891","loading":"\u6b63\u5728\u52a0\u8f7d\u9879\u76ee\u89c6\u9891\u2026","ready":"\u8bf7\u68c0\u67e5\u89c6\u98911\u20136\u7684\u987a\u5e8f\u548c\u65f6\u957f\u3002","some":"\u6b64\u9879\u76ee\u6709{n}\u6bb5\u89c6\u9891\u3002\u8be5\u683c\u5f0f\u9700\u89816\u6bb5\uff1b\u8bf7\u5bfc\u5165\u66f4\u591a\u89c6\u9891\uff0c\u6216\u6709\u610f\u91cd\u590d\u9009\u62e9\u4e00\u6bb5\u3002","none":"\u6b64\u9879\u76ee\u6ca1\u6709\u89c6\u9891\u3002\u8bf7\u5148\u5bfc\u5165\u89c6\u9891\u3002","checking":"\u6b63\u5728\u68c0\u67e5\u89c6\u9891\u2026","addingMusic":"\u6b63\u5728\u5411\u9879\u76ee\u6dfb\u52a0\u97f3\u4e50\u2026","creating":"\u6b63\u5728\u521b\u5efa\u8349\u7a3f\u2026","placing":"\u6b63\u5728\u653e\u7f6e\u5e76\u8c03\u6574{n}\u4e2a\u89c6\u9891\u7247\u6bb5\u7684\u901f\u5ea6\u2026","finishing":"\u6b63\u5728\u6dfb\u52a0\u6a21\u7cca\u5207\u6362\u3001\u5b57\u5e55\u3001\u95ea\u5149\u3001\u6de1\u51fa\u548c\u97f3\u4e50\u2026","saved":"\u5df2\u4fdd\u5b58\u3002\u6bcf\u4e2a\u533a\u6bb5\u90fd\u662f\u53ef\u7f16\u8f91\u526a\u8f91\uff1b\u53ef\u8c03\u6574\u753b\u9762\u6784\u56fe\u548c\u5b57\u5e55\u5b57\u4f53\u3002","partial":" \u7ee7\u7eed\u524d\u4f1a\u5148\u68c0\u67e5\u672a\u5b8c\u6210\u7684\u8349\u7a3f\u3002","choose":"\u9009\u62e9\u89c6\u9891","needs":"\u81f3\u5c11\u9700\u8981{s}\u79d2\u7d20\u6750\u3002","subtitle":"\u5b57\u5e55\u6587\u5b57\uff08\u53ef\u9009\uff09","lineWord":"\u7b2c1\u884c\uff0c\u7b2c{n}\u4e2a\u8bcd","line2":"\u7b2c2\u884c","phraseWord":"\u7b2c\u4e8c\u4e2a\u77ed\u8bed\uff0c\u7b2c{n}\u4e2a\u8bcd","draftName":"\u8349\u7a3f\u540d\u79f0","continue":"\u68c0\u67e5\u5e76\u7ee7\u7eed\u672a\u5b8c\u6210\u7684\u8349\u7a3f","another":"\u518d\u521b\u5efa\u4e00\u4e2a\u8349\u7a3f","create":"\u521b\u5efa\u8349\u7a3f","open":"\u6253\u5f00\u5df2\u4fdd\u5b58\u7684\u8349\u7a3f","roles":["\u5f00\u573a\u955c\u5934\uff0c\u81f3\u5c118\u79d2\uff08\u542b\u5b57\u5e55\uff09","\u7b2c\u4e8c\u4e2a\u955c\u5934","\u955c\u59343","\u955c\u59344","\u955c\u59345","\u955c\u59346"],"summary":"\u5c06\u516d\u6bb5\u89c6\u9891\u5236\u4f5c\u6210\u53ef\u7f16\u8f91\u768423\u79d2\u901f\u5ea6\u611f\u526a\u8f91\uff0c\u5305\u542b\u53d8\u901f\u3001\u7eb5\u5411\u6a21\u7cca\u3001\u767d\u8272\u95ea\u5149\u3001\u52a8\u6001\u5b57\u5e55\u3001\u6de1\u51fa\u81f3\u9ed1\u8272\u548c\u97f3\u4e50\u3002"}};
const fmt=(value,key,replacement)=>value.replace('{'+key+'}',String(replacement));

export default function Panel({sdk,context,ui}){
 const t=STRINGS[String(context.language||'en').toLowerCase().split(/[-_]/)[0]]||STRINGS.en;
 const empty=()=>Array(SLOTS).fill('');
 const [videos,setVideos]=React.useState([]),[slots,setSlots]=React.useState(empty),[loadedProject,setLoadedProject]=React.useState(null);
 const [need,setNeed]=React.useState(null),[text,setText]=React.useState(DEFAULT_TEXT);
 const [name,setName]=React.useState('Six clip velocity');
 const [busy,setBusy]=React.useState(false),[status,setStatus]=React.useState(''),[saved,setSaved]=React.useState(null),[partialDraftId,setPartialDraftId]=React.useState(null);
 const running=React.useRef(false),currentProject=React.useRef(context.projectId);currentProject.current=context.projectId;
 React.useEffect(()=>{setVideos([]);setSlots(empty());setLoadedProject(null);setSaved(null);setPartialDraftId(null);setStatus('');},[context.projectId]);
 async function load(){
  if(!context.projectId||running.current)return;running.current=true;setBusy(true);setStatus(t.loading);
  try{
   const projectId=context.projectId,rows=(await inventory(sdk,projectId,'List project videos')).filter(r=>r.type==='Video');
   const plan=JSON.parse(await builder(sdk,{mode:'plan',fps:30},'Read velocity plan',49152));
   if(currentProject.current!==projectId)return;
   setVideos(rows);setNeed(plan.requiredSeconds);setLoadedProject(projectId);
   setSlots(old=>old.map((x,i)=>x||rows[i]?.resourceId||''));
   setStatus(rows.length>=SLOTS?t.ready:rows.length?fmt(t.some,'n',rows.length):t.none);
  }catch(error){setStatus(String(error?.message||error));}finally{running.current=false;setBusy(false);}
 }
 const short=slots.map((id,i)=>{const v=videos.find(x=>x.resourceId===id);return v&&need&&v.seconds!=null&&v.seconds<need[i];});
 async function create(){
  const projectId=context.projectId;
  if(running.current||!projectId||loadedProject!==projectId||slots.some(x=>!x)||short.some(Boolean)||!name.trim())return;
  running.current=true;setBusy(true);setStatus(t.checking);
  let createdDraftId=null;
  try{
   const selected=slots.map(id=>{const m=videos.filter(v=>v.resourceId===id);if(m.length!==1)throw Error('Check the selected videos again.');return m[0];});
   const fresh=await inventory(sdk,projectId,'Confirm selected videos');
   if(selected.some(v=>fresh.filter(r=>r.resourceId===v.resourceId&&r.path===v.path&&r.type==='Video').length!==1))throw Error('The selected videos changed. Reload the Project videos.');
   const prepared=await prepareVideos(window.parent,projectId,selected);
   setStatus(t.addingMusic);
   const musicResourceId=await ensureMusic(sdk,projectId);
   if(currentProject.current!==projectId)throw Error('The Project changed. Start again in the selected Project.');
   setStatus(t.creating);
   const grid=`const m=await d.meta(),want=Math.round(699*m.fps/30);if(m.durationFrames!==want||m.frameSize?.width!==1080||m.frameSize?.height!==1440)throw Error('Draft frame grid differs from the plan.');`;
   let draftId,fps;
   if(partialDraftId){
    const check=await sdk.runScript({script:`const p=selects.project(${JSON.stringify(projectId)}),id=${JSON.stringify(partialDraftId)};if(!(await p.meta()).draftIds.includes(id))throw Error('Partial Draft is not in this Project.');const d=selects.draft(id);${grid}if((await d.clips({trackScope:'all'})).some(x=>x.resourceId))throw Error('Partial Draft is not empty; inspect it before retrying.');return {draftId:id,fps:m.fps};`,summary:'Inspect partial Draft',allowCommit:false});
    if(check.isError||check.result?.draftId!==partialDraftId)throw Error(check.output||'The partial Draft cannot be safely continued.');
    ({draftId,fps}=check.result);
   }else{
    const seed=await sdk.runScript({script:`const p=selects.project(${JSON.stringify(projectId)});const d=await p.createDraft({name:${JSON.stringify(name.trim())}});await d.insertGap({seconds:699/30});await d.setFrameSize({width:1080,height:1440});${grid}const saved=await d.commitAll('Start Six Clip Velocity Draft');return {draftId:saved.createdDraftId,fps:m.fps};`,summary:'Create velocity Draft',allowCommit:true});
    if(seed.isError||!seed.result?.draftId)throw Error(seed.output||'Could not create the Draft. Check the Project before retrying.');
    ({draftId,fps}=seed.result);
   }
   const plan=JSON.parse(await builder(sdk,{mode:'plan',fps},'Read velocity plan',49152));
   createdDraftId=draftId;
   setStatus(fmt(t.placing,'n',plan.segments.reduce((a,s)=>a+s.pieces.length,0)));
   const native=await placeVideos(prepared,draftId,plan);
   const request={mode:'finish',projectId,draftId,fps,videos:selected.map((v,i)=>({resourceId:v.resourceId,width:native.videos[i].width,height:native.videos[i].height})),...compactPlacements(native.placements),musicResourceId,text};
   const script=await builder(sdk,request,'Build velocity finishing step',49152);
   setStatus(t.finishing);
   const result=await sdk.runScript({script,summary:'Finish velocity Draft',allowCommit:true,timeoutSeconds:120});
   if(result.isError||!result.result)throw Error(result.output||'Could not confirm the save. Check the Project before retrying.');
   if(result.result.status==='outcomeUnknown')throw Error('Save outcome is unknown. Check the Project Draft list before retrying.');
   if(result.result.status!=='saved')throw Error(result.result.message||'Could not save the Draft.');
   setPartialDraftId(null);setSaved(result.result);setStatus(t.saved);
  }catch(error){if(createdDraftId)setPartialDraftId(createdDraftId);setStatus(String(error?.message||error)+(createdDraftId?t.partial:''));}finally{running.current=false;setBusy(false);}
 }
 const ready=!busy&&loadedProject===context.projectId;
 const setWord=(key,i,v)=>setText(old=>{const n={...old,line1:[...old.line1],phrase2:[...old.phrase2]};if(key==='line2')n.line2=v;else n[key][i]=v;return n;});
 return <ui.Stack gap={16}><ui.Section title={t.title}>
  <ui.Message>{t.intro}</ui.Message>
  {!context.projectId&&<ui.Message>{t.noProject}</ui.Message>}
  <ui.Button variant="secondary" onClick={load} disabled={!context.projectId||busy} busy={busy}>{t.load}</ui.Button>
  {slots.map((value,i)=><div key={i}><ui.Select label={'Video '+(i+1)+' — '+t.roles[i]} value={value} onChange={v=>setSlots(old=>old.map((x,j)=>j===i?v:x))} options={videos.map(v=>({value:v.resourceId,label:v.name+(v.seconds!=null?' ('+v.seconds.toFixed(1)+' s)':'')}))} placeholder={t.choose} disabled={!ready}/>{short[i]&&<ui.Message>{fmt(t.needs,'s',need[i].toFixed(1))}</ui.Message>}</div>)}
  <details><summary>{t.subtitle}</summary>
   {text.line1.map((w,i)=><ui.TextField key={i} label={fmt(t.lineWord,'n',i+1)} value={w} onChange={v=>setWord('line1',i,v)} disabled={busy}/>)}
   <ui.TextField label={t.line2} value={text.line2} onChange={v=>setWord('line2',0,v)} disabled={busy}/>
   {text.phrase2.map((w,i)=><ui.TextField key={'p'+i} label={fmt(t.phraseWord,'n',i+1)} value={w} onChange={v=>setWord('phrase2',i,v)} disabled={busy}/>)}
  </details>
  <ui.TextField label={t.draftName} value={name} onChange={setName} disabled={busy}/>
  <ui.Actions><ui.Button variant="primary" onClick={create} disabled={!ready||slots.some(x=>!x)||short.some(Boolean)||!name.trim()} busy={busy}>{partialDraftId?t.continue:saved?t.another:t.create}</ui.Button></ui.Actions>
  {status&&<ui.Message>{status}</ui.Message>}
  {saved&&<ui.Button variant="secondary" onClick={()=>sdk.runScript({script:'return await selects.editor.openDraft('+JSON.stringify(saved.draftId)+');',summary:'Open saved Draft',allowCommit:false})}>{t.open}</ui.Button>}
 </ui.Section></ui.Stack>;
}
