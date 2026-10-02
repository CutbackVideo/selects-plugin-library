// @name Cinema Vlog Studio
// @name:de Cinema Vlog Studio
// @name:en Cinema Vlog Studio
// @name:es Estudio de vlog de cine
// @name:fr Studio de vlog cinéma
// @name:it Studio vlog cinema
// @name:ja シネマ・ブログ・スタジオ
// @name:pt Estúdio de vlog de cinema
// @name:tr Sinema Vlog Stüdyosu
// @name:zh 电影感 Vlog 工作室
// @collection visual-highlights
// @icon video
// Rebuilds a fixed 22-cut cinematic street rhythm as an editable Selects Draft.
import React, { useEffect, useRef, useState } from 'react';

const CUTS = [
  [1,5,11],[4,11,16],[3,16,21],[10,21,27],[4,27,33],
  [5,33,38],[7,38,43],[11,43,49],[9,49,54],
  [3,55,210],[12,210,240],[13,240,269],[14,269,288],
  [14,288,314],[13,314,389],[12,389,434],[10,434,463],
  [5,463,508],[6,508,536],[7,536,583],[8,583,611],[9,611,641],
];
// The alphabet generator and the paired top/bottom black masks are adapted from Postcard Cutout Studio.
// Their frame schedule below follows the downloaded Instagram reel (30 fps, 641 frames).
const TITLE = `import React from 'react';import{AbsoluteFill,useCurrentFrame,useVideoConfig}from'remotion';const G='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&?';export default function Title({data}){const f=useCurrentFrame(),{fps,width,height}=useVideoConfig(),r=Math.round(f*30/fps)+Number(data.referenceStartFrame||132),scale=Math.min(width/1920,height/1080),t=String(data.title||'LIVE YOUR LIFE'),small=String(data.smallColor||'#fff'),yellow=String(data.titleColor||'#eed65d'),font=String(data.fontFamily||'Georgia');let rank=0;const chars=Array.from(t).map((c,i)=>{if(c===' ')return '\u00a0';const start=146+rank++*2.2,age=r-start;if(age<0)return '\u00a0';if(age<2.2)return G[Math.floor(Math.abs(Math.sin((r+1)*(i+3)*12.9898))*G.length)%G.length];return c});if(r<132||r>=196)return null;return <AbsoluteFill style={{pointerEvents:'none',color:small,textShadow:'0 2px 10px #000b',fontFamily:font+', serif'}}><div style={{position:'absolute',top:'36%',left:'50%',transform:'translateX(-50%)',fontFamily:'Arial, sans-serif',fontWeight:600,fontSize:21*scale,letterSpacing:2.5*scale,whiteSpace:'nowrap'}}>{data.kicker}</div><div style={{position:'absolute',top:'42%',left:'50%',transform:'translateX(-50%)',fontSize:145*scale,fontWeight:400,lineHeight:1,color:yellow,whiteSpace:'nowrap',letterSpacing:-7*scale}}>{chars.map((c,i)=><span key={i}>{c}</span>)}</div><div style={{position:'absolute',top:'59%',left:'50%',transform:'translateX(-50%)',fontFamily:'Arial, sans-serif',fontSize:25*scale,maxWidth:'45%',width:'45%',textAlign:'center',lineHeight:1.12}}>{data.subtitle}</div></AbsoluteFill>}`;
const CURTAIN = `import React from 'react';import{AbsoluteFill,useCurrentFrame,useVideoConfig}from'remotion';export default function Curtain({data}){const f=useCurrentFrame(),{fps}=useVideoConfig(),r=Math.round(f*30/fps)+Number(data.referenceStartFrame||55),cl=v=>Math.max(0,Math.min(1,v));let h=0;if(r<83)h=50;else if(r<89)h=50-(50-32.5)*cl((r-82)/6);else if(r<98)h=32.5;else if(r<104)h=32.5-(32.5-15.5)*cl((r-97)/6);else if(r<113)h=15.5;else if(r<119)h=15.5*(1-cl((r-112)/6));else if(r<196)h=0;else h=50*cl((r-196)/5);if(h<=0)return null;return <AbsoluteFill style={{pointerEvents:'none'}}><div style={{position:'absolute',top:0,left:0,right:0,height:h+'%',background:'#000'}}/><div style={{position:'absolute',bottom:0,left:0,right:0,height:h+'%',background:'#000'}}/></AbsoluteFill>}`;
const GLITCH = `import React from 'react';import{AbsoluteFill,useCurrentFrame}from'remotion';export default function Glitch({Source,data}){const f=useCurrentFrame(),k=f-Number(data.triggerLocalFrame||0);if(k<0||k>=5)return <Source/>;const hard=k===0||k===2||k===4;return <AbsoluteFill style={{filter:hard?'grayscale(1) contrast(5) brightness(2.2)':'grayscale(1) contrast(2.5) brightness(1.3)',transform:'translateX('+((k%2?1:-1)*(6+k*3))+'px)'}}><Source/></AbsoluteFill>}`;
const FLASH = `import React from 'react';import{AbsoluteFill,useCurrentFrame}from'remotion';export default function Flash(){const f=useCurrentFrame();return f<3?<AbsoluteFill style={{backgroundColor:'#fff',opacity:1-f/3,pointerEvents:'none'}}/>:null}`;
const CARD = `import React from 'react';import{AbsoluteFill}from'remotion';export default function Card({Source,data}){return <AbsoluteFill style={{backgroundColor:'#000',justifyContent:'center',alignItems:'center'}}><div style={{position:'relative',width:(data.widthPct||50)+'%',aspectRatio:'16/9',overflow:'hidden',boxShadow:'0 0 35px #ffffff33'}}><Source/></div></AbsoluteFill>}`;
const CARD_FLASH = `import React from 'react';import{AbsoluteFill}from'remotion';export default function CardFlash({data}){return <AbsoluteFill style={{pointerEvents:'none',justifyContent:'center',alignItems:'center'}}><div style={{width:(data.widthPct||50)+'%',aspectRatio:'16/9',backgroundColor:'#fff'}}/></AbsoluteFill>}`;
// Source in-point each cut starts from; index matches CUTS.
const STARTS = [.65,3.82,3.69,3.8,1.9,2,6,7.2,3.5,3.69,.79,4.2,2.37,2.37+15*1001/24000,4.2+23*1001/24000,.79+24*1001/24000,4.8,5,6,7,8,9];
const ASSETS = ['cinema-vlog-intro-effects.m4a', '06-clear-waters-music-preview.mp3', 'cinema-vlog-camera-click.wav'];
const [INTRO_FX, MUSIC, CLICK] = ASSETS;
// Each sound's length in seconds (ffprobe), in ASSETS order, used when its Resource reports none: no overlay may run past it.
const ASSET_SECONDS = [6.798, 25.032, 0.33];
// Minimum source length each slot needs, derived from the longest cut that uses it.
// The glitch marker splits a cut at run time; its second half plays this slot.
const GLITCH_SLOT = CUTS.reduce((n, c) => Math.max(n, c[0]), 0) + 1;
const GLITCH_MIN = 5;
const SLOT_COUNT = GLITCH_SLOT;
// A slot's source must reach past the last frame any of its cuts reads, in-point included.
const MIN = (() => { const m = Array(SLOT_COUNT).fill(0); CUTS.forEach(([slot, a, b], i) => { m[slot - 1] = Math.max(m[slot - 1], STARTS[i] + (b - a) / 30 + 0.05); }); m[GLITCH_SLOT - 1] = GLITCH_MIN; return m; })();
const USED_SLOTS = CUTS.map(c => c[0]).concat([GLITCH_SLOT]).filter((s, i, all) => all.indexOf(s) === i).sort((a, b) => a - b);
// Slots the user picks: the clip the title sits on, then one per inset card.
const MANUAL_SLOTS = [3, 12, 13, 14];
const AUTO_SLOTS = USED_SLOTS.filter(s => !MANUAL_SLOTS.includes(s));

// The glitch marker is the one whose note says so, in English or in Korean.
const GLITCH_NOTE_KO = '\uc9c0\uc9c0\uc9c1';
const isGlitchNote = note => { const s = String(note || '').toLowerCase(); return s.includes('glitch') || s.includes(GLITCH_NOTE_KO); };

const LANG = {
  en: {"noProject":"Open a Selects Project first.","folderTitle":"1. Footage folder","folderLabel":"Project folder","refresh":"Refresh folder list","folderHint":"Only folders already in the project are listed. Import new footage in Selects first.","rootFolder":"(files outside any folder)","loadingFolders":"Reading project folders…","loadingVideos":"Reading the folder's videos…","noFolders":"No folder in this project holds video.","noVideos":"No video in this folder.","found":"","foundTail":" usable videos","pickTitle":"2. Clips you choose","pickHint":"Each card zooms into the same take, so one pick covers the card and the full-frame cut that follows it.","manualLabels":{"3":"Clip the title sits on","12":"Card 1 → full frame","13":"Card 2 → full frame","14":"Card 3 → full frame"},"restTitle":"3. The remaining slots","restAuto":"Filled at random from the folder.","reshuffle":"Shuffle again","restManual":"No clip in this folder is long enough for these slots. Choose them yourself.","restReuse":"There are fewer distinct clips than slots, so some slots reuse a clip used elsewhere. Build as is, or change them yourself.","showManual":"Choose them myself","hideManual":"Collapse","empty":"Empty","titleSection":"Title","title":"Main title","kicker":"Upper line","subtitle":"Lower line","font":"Title font","createSection":"Create","create":"Create Draft from markers","busy":"Building Draft…","ready":"Saved a new Draft.","needFolder":"Choose the footage folder first.","needAll":"Fill every slot.","sounds":"The intro effects, background music and camera click are fixed files shipped with the plugin.","names":["Sky / bird","Car card","European street · title","Road traffic","City intersection","Graffiti street","Square · pedestrians","Indoor walkway","Footbridge · final street","Tram","European pedestrians","Card 1 → full frame","Card 2 → full frame","Card 3 → full frame","After the glitch"]},
  de: {"noProject":"Öffnen Sie zuerst ein Selects-Projekt.","folderTitle":"1. Material-Ordner","folderLabel":"Projektordner","refresh":"Ordnerliste aktualisieren","folderHint":"Es werden nur Ordner angezeigt, die bereits im Projekt sind. Neues Material zuerst in Selects importieren.","rootFolder":"(Dateien außerhalb von Ordnern)","loadingFolders":"Projektordner werden gelesen…","loadingVideos":"Videos des Ordners werden gelesen…","noFolders":"Kein Ordner in diesem Projekt enthält Videos.","noVideos":"Keine Videos in diesem Ordner.","found":"","foundTail":" verwendbare Videos","pickTitle":"2. Clips Ihrer Wahl","pickHint":"Jede Karte zoomt in dieselbe Aufnahme, daher deckt eine Auswahl die Karte und den folgenden Vollbildschnitt ab.","manualLabels":{"3":"Clip für den Titel","12":"Karte 1 → Vollbild","13":"Karte 2 → Vollbild","14":"Karte 3 → Vollbild"},"restTitle":"3. Die übrigen Plätze","restAuto":"Zufällig aus dem Ordner gefüllt.","reshuffle":"Neu mischen","restManual":"Kein Clip in diesem Ordner ist lang genug für diese Plätze. Bitte selbst auswählen.","restReuse":"Es gibt weniger verschiedene Clips als Plätze, daher nutzen einige Plätze einen bereits verwendeten Clip. So erstellen oder selbst ändern.","showManual":"Selbst auswählen","hideManual":"Einklappen","empty":"Leer","titleSection":"Titel","title":"Haupttitel","kicker":"Obere Zeile","subtitle":"Untere Zeile","font":"Titelschrift","createSection":"Erstellen","create":"Draft aus Markern erstellen","busy":"Draft wird erstellt…","ready":"Neuer Draft gespeichert.","needFolder":"Wählen Sie zuerst den Material-Ordner.","needAll":"Füllen Sie jeden Platz.","sounds":"Intro-Effekte, Hintergrundmusik und Kameraklick sind feste Dateien aus dem Plugin.","names":["Himmel / Vogel","Auto-Karte","Europäische Straße · Titel","Straßenverkehr","Kreuzung","Graffiti-Straße","Platz · Passanten","Innenpassage","Fußgängerbrücke · letzte Straße","Straßenbahn","Passanten in Europa","Karte 1 → Vollbild","Karte 2 → Vollbild","Karte 3 → Vollbild","Nach dem Glitch"]},
  es: {"noProject":"Abre primero un proyecto de Selects.","folderTitle":"1. Carpeta de metraje","folderLabel":"Carpeta del proyecto","refresh":"Actualizar lista de carpetas","folderHint":"Solo aparecen las carpetas que ya están en el proyecto. Importa primero el metraje nuevo en Selects.","rootFolder":"(archivos fuera de cualquier carpeta)","loadingFolders":"Leyendo las carpetas del proyecto…","loadingVideos":"Leyendo los vídeos de la carpeta…","noFolders":"Ninguna carpeta de este proyecto contiene vídeo.","noVideos":"No hay vídeo en esta carpeta.","found":"","foundTail":" vídeos utilizables","pickTitle":"2. Clips que eliges","pickHint":"Cada tarjeta amplía la misma toma, así que una elección cubre la tarjeta y el corte a pantalla completa que la sigue.","manualLabels":{"3":"Clip sobre el que va el título","12":"Tarjeta 1 → pantalla completa","13":"Tarjeta 2 → pantalla completa","14":"Tarjeta 3 → pantalla completa"},"restTitle":"3. Los espacios restantes","restAuto":"Rellenados al azar desde la carpeta.","reshuffle":"Volver a barajar","restManual":"Ningún clip de esta carpeta es lo bastante largo para estos espacios. Elígelos tú mismo.","restReuse":"Hay menos clips distintos que espacios, así que algunos reutilizan un clip ya usado. Créalo así o cámbialos tú.","showManual":"Elegirlos yo","hideManual":"Contraer","empty":"Vacío","titleSection":"Título","title":"Título principal","kicker":"Línea superior","subtitle":"Línea inferior","font":"Fuente del título","createSection":"Crear","create":"Crear Draft desde los marcadores","busy":"Creando el Draft…","ready":"Se ha guardado un nuevo Draft.","needFolder":"Elige primero la carpeta de metraje.","needAll":"Rellena todos los espacios.","sounds":"Los efectos de intro, la música de fondo y el clic de cámara son archivos fijos incluidos en el plugin.","names":["Cielo / pájaro","Tarjeta de coche","Calle europea · título","Tráfico","Cruce urbano","Calle con grafitis","Plaza · peatones","Pasaje interior","Pasarela · calle final","Tranvía","Peatones en Europa","Tarjeta 1 → pantalla completa","Tarjeta 2 → pantalla completa","Tarjeta 3 → pantalla completa","Tras el glitch"]},
  fr: {"noProject":"Ouvrez d'abord un projet Selects.","folderTitle":"1. Dossier de rushes","folderLabel":"Dossier du projet","refresh":"Actualiser la liste des dossiers","folderHint":"Seuls les dossiers déjà présents dans le projet apparaissent. Importez d'abord les nouveaux rushes dans Selects.","rootFolder":"(fichiers hors dossier)","loadingFolders":"Lecture des dossiers du projet…","loadingVideos":"Lecture des vidéos du dossier…","noFolders":"Aucun dossier de ce projet ne contient de vidéo.","noVideos":"Aucune vidéo dans ce dossier.","found":"","foundTail":" vidéos utilisables","pickTitle":"2. Les plans que vous choisissez","pickHint":"Chaque carte zoome dans la même prise : un seul choix couvre la carte et le plan plein cadre qui suit.","manualLabels":{"3":"Plan qui porte le titre","12":"Carte 1 → plein cadre","13":"Carte 2 → plein cadre","14":"Carte 3 → plein cadre"},"restTitle":"3. Les emplacements restants","restAuto":"Remplis au hasard depuis le dossier.","reshuffle":"Mélanger à nouveau","restManual":"Aucun plan de ce dossier n'est assez long pour ces emplacements. Choisissez-les vous-même.","restReuse":"Il y a moins de plans distincts que d'emplacements : certains réutilisent un plan déjà employé. Gardez tel quel ou modifiez-les.","showManual":"Les choisir moi-même","hideManual":"Replier","empty":"Vide","titleSection":"Titre","title":"Titre principal","kicker":"Ligne du haut","subtitle":"Ligne du bas","font":"Police du titre","createSection":"Créer","create":"Créer le Draft depuis les marqueurs","busy":"Création du Draft…","ready":"Nouveau Draft enregistré.","needFolder":"Choisissez d'abord le dossier de rushes.","needAll":"Remplissez tous les emplacements.","sounds":"Les effets d'intro, la musique et le déclic d'appareil photo sont des fichiers fixes fournis avec le plugin.","names":["Ciel / oiseau","Carte voiture","Rue européenne · titre","Circulation","Carrefour urbain","Rue taguée","Place · piétons","Passage intérieur","Passerelle · dernière rue","Tramway","Piétons en Europe","Carte 1 → plein cadre","Carte 2 → plein cadre","Carte 3 → plein cadre","Après le glitch"]},
  it: {"noProject":"Apri prima un progetto Selects.","folderTitle":"1. Cartella dei girati","folderLabel":"Cartella del progetto","refresh":"Aggiorna elenco cartelle","folderHint":"Compaiono solo le cartelle già presenti nel progetto. Importa prima i nuovi girati in Selects.","rootFolder":"(file fuori da ogni cartella)","loadingFolders":"Lettura delle cartelle del progetto…","loadingVideos":"Lettura dei video della cartella…","noFolders":"Nessuna cartella di questo progetto contiene video.","noVideos":"Nessun video in questa cartella.","found":"","foundTail":" video utilizzabili","pickTitle":"2. Le clip che scegli","pickHint":"Ogni card zooma sulla stessa ripresa: una scelta copre la card e lo stacco a pieno schermo che segue.","manualLabels":{"3":"Clip su cui appare il titolo","12":"Card 1 → pieno schermo","13":"Card 2 → pieno schermo","14":"Card 3 → pieno schermo"},"restTitle":"3. Le posizioni restanti","restAuto":"Riempite a caso dalla cartella.","reshuffle":"Rimescola","restManual":"Nessuna clip di questa cartella è abbastanza lunga per queste posizioni. Scegliile tu.","restReuse":"Le clip distinte sono meno delle posizioni, quindi alcune riusano una clip già impiegata. Procedi così o cambiale.","showManual":"Scelgo io","hideManual":"Comprimi","empty":"Vuoto","titleSection":"Titolo","title":"Titolo principale","kicker":"Riga superiore","subtitle":"Riga inferiore","font":"Font del titolo","createSection":"Crea","create":"Crea Draft dai marker","busy":"Creazione del Draft…","ready":"Nuovo Draft salvato.","needFolder":"Scegli prima la cartella dei girati.","needAll":"Riempi tutte le posizioni.","sounds":"Gli effetti d'introduzione, la musica e il clic della fotocamera sono file fissi inclusi nel plugin.","names":["Cielo / uccello","Card auto","Strada europea · titolo","Traffico","Incrocio urbano","Strada con graffiti","Piazza · passanti","Passaggio interno","Passerella · ultima strada","Tram","Passanti in Europa","Card 1 → pieno schermo","Card 2 → pieno schermo","Card 3 → pieno schermo","Dopo il glitch"]},
  ja: {"noProject":"先に Selects のプロジェクトを開いてください。","folderTitle":"1. 素材フォルダ","folderLabel":"プロジェクトのフォルダ","refresh":"フォルダ一覧を更新","folderHint":"プロジェクトに取り込み済みのフォルダだけが表示されます。新しい素材はまず Selects で読み込んでください。","rootFolder":"(フォルダ外のファイル)","loadingFolders":"プロジェクトのフォルダを読み込み中…","loadingVideos":"フォルダ内の動画を読み込み中…","noFolders":"このプロジェクトに動画の入ったフォルダがありません。","noVideos":"このフォルダに動画がありません。","found":"","foundTail":" 本の動画が使えます","pickTitle":"2. 自分で選ぶクリップ","pickHint":"カードは同じ映像をそのまま拡大する演出なので、1 つの選択でカードと直後の全画面カットの両方が決まります。","manualLabels":{"3":"タイトルが乗るクリップ","12":"カード 1 → 全画面","13":"カード 2 → 全画面","14":"カード 3 → 全画面"},"restTitle":"3. 残りの枠","restAuto":"フォルダ内の動画からランダムに埋めました。","reshuffle":"シャッフルし直す","restManual":"この枠に足りる長さの動画がありません。手動で選んでください。","restReuse":"異なる動画が枠数より少ないため、一部の枠は同じ動画を使います。このままでも、自分で変更しても構いません。","showManual":"自分で選ぶ","hideManual":"折りたたむ","empty":"空","titleSection":"タイトル","title":"大きいタイトル","kicker":"上の文字","subtitle":"下の文字","font":"タイトルの書体","createSection":"作成","create":"マーカーに合わせて Draft を作成","busy":"Draft を作成中…","ready":"新しい Draft を保存しました。","needFolder":"先に素材フォルダを選んでください。","needAll":"すべての枠を埋めてください。","sounds":"イントロ効果音・BGM・シャッター音はプラグイン同梱の固定ファイルです。","names":["空 / 鳥","車のカード","ヨーロッパの街路 · タイトル","道路の車","街の交差点","グラフィティの通り","広場 · 歩行者","屋内の通路","歩道橋 · 最後の通り","トラム","ヨーロッパの歩行者","カード 1 → 全画面","カード 2 → 全画面","カード 3 → 全画面","グリッチの後"]},
  ko: {"noProject":"\uba3c\uc800 Selects\uc5d0\uc11c \ud504\ub85c\uc81d\ud2b8\ub97c \uc5ec\uc138\uc694.","folderTitle":"1. \ud478\ud2f0\uc9c0 \ud3f4\ub354","folderLabel":"\ud504\ub85c\uc81d\ud2b8 \ud3f4\ub354","refresh":"\ud3f4\ub354 \ubaa9\ub85d \uc0c8\ub85c\uace0\uce68","folderHint":"\ud504\ub85c\uc81d\ud2b8\uc5d0 \uc774\ubbf8 \ub4e4\uc5b4\uc640 \uc788\ub294 \ud3f4\ub354\ub9cc \ub098\uc635\ub2c8\ub2e4. \uc0c8 \ucd2c\uc601\ubcf8\uc740 Selects\uc5d0\uc11c \uba3c\uc800 \uac00\uc838\uc624\uc138\uc694.","rootFolder":"(\ud3f4\ub354 \uc5c6\ub294 \ud30c\uc77c)","loadingFolders":"\ud504\ub85c\uc81d\ud2b8 \ud3f4\ub354\ub97c \uc77d\ub294 \uc911\u2026","loadingVideos":"\ud3f4\ub354 \uc548 \uc601\uc0c1\uc744 \uc77d\ub294 \uc911\u2026","noFolders":"\uc774 \ud504\ub85c\uc81d\ud2b8\uc5d0 \uc601\uc0c1\uc774 \ub4e0 \ud3f4\ub354\uac00 \uc5c6\uc2b5\ub2c8\ub2e4.","noVideos":"\uc774 \ud3f4\ub354\uc5d0 \uc601\uc0c1\uc774 \uc5c6\uc2b5\ub2c8\ub2e4.","found":"\uc4f8 \uc218 \uc788\ub294 \uc601\uc0c1 ","foundTail":"\uac1c","pickTitle":"2. \uc9c1\uc811 \uace0\ub97c \ud074\ub9bd","pickHint":"\uce74\ub4dc\ub294 \uac19\uc740 \uc601\uc0c1\uc774 \uadf8\ub300\ub85c \ud655\ub300\ub418\ub294 \uc5f0\ucd9c\uc774\ub77c, \ud55c \uce78\uc774 \uce74\ub4dc\uc640 \ud655\ub300 \ucef7\uc744 \ud568\uaed8 \uc501\ub2c8\ub2e4.","manualLabels":{"3":"\uc81c\ubaa9\uc774 \uc62c\ub77c\uac00\ub294 \ud074\ub9bd","12":"\uce74\ub4dc 1 \u2192 \ud655\ub300","13":"\uce74\ub4dc 2 \u2192 \ud655\ub300","14":"\uce74\ub4dc 3 \u2192 \ud655\ub300"},"restTitle":"3. \ub098\uba38\uc9c0 \uce78","restAuto":"\ud3f4\ub354 \uc548 \uc601\uc0c1\uc5d0\uc11c \ubb34\uc791\uc704\ub85c \ucc44\uc6e0\uc2b5\ub2c8\ub2e4.","reshuffle":"\ub2e4\uc2dc \uc11e\uae30","restManual":"\uc774 \uce78\uc5d0 \ub123\uc744 \ub9cc\ud07c \uae34 \uc601\uc0c1\uc774 \uc5c6\uc2b5\ub2c8\ub2e4. \uc9c1\uc811 \uace8\ub77c\uc8fc\uc138\uc694.","restReuse":"\uc11c\ub85c \ub2e4\ub978 \uc601\uc0c1\uc774 \ubaa8\uc790\ub77c\uc11c \uc77c\ubd80 \uce78\uc740 \ub2e4\ub978 \uce78\uacfc \uac19\uc740 \uc601\uc0c1\uc744 \uc501\ub2c8\ub2e4. \uadf8\ub300\ub85c \ub9cc\ub4dc\uc154\ub3c4 \ub418\uace0, \uc9c1\uc811 \ubc14\uafb8\uc154\ub3c4 \ub429\ub2c8\ub2e4.","showManual":"\uc9c1\uc811 \uace0\ub974\uae30","hideManual":"\uc811\uae30","empty":"\ube44\uc5b4 \uc788\uc74c","titleSection":"\uc81c\ubaa9","title":"\ud070 \uc81c\ubaa9","kicker":"\uc717\ubb38\uad6c","subtitle":"\uc544\ub7ab\ubb38\uad6c","font":"\uc81c\ubaa9 \uae00\uaf34","createSection":"\ub9cc\ub4e4\uae30","create":"\ub9c8\ucee4\uc5d0 \ub9de\ucdb0 Draft \ub9cc\ub4e4\uae30","busy":"Draft \ub9cc\ub4dc\ub294 \uc911\u2026","ready":"\uc0c8 Draft\ub97c \uc800\uc7a5\ud588\uc2b5\ub2c8\ub2e4.","needFolder":"\uba3c\uc800 \ud478\ud2f0\uc9c0 \ud3f4\ub354\ub97c \uace0\ub974\uc138\uc694.","needAll":"\uc2ac\ub86f\uc744 \ubaa8\ub450 \ucc44\uc6cc\uc8fc\uc138\uc694.","sounds":"\ub3c4\uc785 \ud6a8\uacfc\uc74c \u00b7 \ubc30\uacbd\uc74c\uc545 \u00b7 \ucc30\uce75 \ud6a8\uacfc\uc74c\uc740 \ud50c\ub7ec\uadf8\uc778\uc5d0 \ud3ec\ud568\ub41c \ud30c\uc77c\ub85c \uace0\uc815\ub429\ub2c8\ub2e4.","names":["\ud558\ub298/\uc0c8","\uc790\ub3d9\ucc28 \uce74\ub4dc","\uc720\ub7fd \uac70\ub9ac\u00b7\uc81c\ubaa9","\ub3c4\ub85c \ucc28\ub7c9","\ub3c4\uc2ec \uad50\ucc28\ub85c","\uadf8\ub798\ud53c\ud2f0 \uac70\ub9ac","\uad11\uc7a5\u00b7\ubcf4\ud589\uc790","\uc2e4\ub0b4 \ubcf4\ud589\uc790","\ubcf4\ub3c4\uad50\u00b7\ub9c8\uc9c0\ub9c9 \uac70\ub9ac","\ud2b8\ub7a8","\uc720\ub7fd \ubcf4\ud589\uc790","\uce74\ub4dc1 \u2192 \ud655\ub300","\uce74\ub4dc2 \u2192 \ud655\ub300","\uce74\ub4dc3 \u2192 \ud655\ub300","\uc9c0\uc9c0\uc9c1 \ud6c4 \uc804\ud658"]},
  pt: {"noProject":"Abra primeiro um projeto do Selects.","folderTitle":"1. Pasta de material","folderLabel":"Pasta do projeto","refresh":"Atualizar lista de pastas","folderHint":"Só aparecem as pastas que já estão no projeto. Importe primeiro o material novo no Selects.","rootFolder":"(ficheiros fora de qualquer pasta)","loadingFolders":"A ler as pastas do projeto…","loadingVideos":"A ler os vídeos da pasta…","noFolders":"Nenhuma pasta deste projeto contém vídeo.","noVideos":"Não há vídeo nesta pasta.","found":"","foundTail":" vídeos utilizáveis","pickTitle":"2. Clipes que escolhe","pickHint":"Cada cartão amplia a mesma tomada, por isso uma escolha cobre o cartão e o corte em ecrã inteiro que vem depois.","manualLabels":{"3":"Clipe onde entra o título","12":"Cartão 1 → ecrã inteiro","13":"Cartão 2 → ecrã inteiro","14":"Cartão 3 → ecrã inteiro"},"restTitle":"3. Os espaços restantes","restAuto":"Preenchidos aleatoriamente a partir da pasta.","reshuffle":"Misturar de novo","restManual":"Nenhum clipe desta pasta é suficientemente longo para estes espaços. Escolha-os você mesmo.","restReuse":"Há menos clipes distintos do que espaços, por isso alguns reutilizam um clipe já usado. Crie assim ou altere-os.","showManual":"Escolher eu mesmo","hideManual":"Recolher","empty":"Vazio","titleSection":"Título","title":"Título principal","kicker":"Linha de cima","subtitle":"Linha de baixo","font":"Tipo de letra do título","createSection":"Criar","create":"Criar Draft a partir dos marcadores","busy":"A criar o Draft…","ready":"Novo Draft guardado.","needFolder":"Escolha primeiro a pasta de material.","needAll":"Preencha todos os espaços.","sounds":"Os efeitos de abertura, a música e o clique da câmara são ficheiros fixos incluídos no plugin.","names":["Céu / pássaro","Cartão de carro","Rua europeia · título","Trânsito","Cruzamento urbano","Rua com grafítis","Praça · peões","Passagem interior","Passarela · rua final","Elétrico","Peões na Europa","Cartão 1 → ecrã inteiro","Cartão 2 → ecrã inteiro","Cartão 3 → ecrã inteiro","Depois do glitch"]},
  tr: {"noProject":"Önce bir Selects projesi açın.","folderTitle":"1. Görüntü klasörü","folderLabel":"Proje klasörü","refresh":"Klasör listesini yenile","folderHint":"Yalnızca projede bulunan klasörler listelenir. Yeni çekimleri önce Selects'e aktarın.","rootFolder":"(klasör dışındaki dosyalar)","loadingFolders":"Proje klasörleri okunuyor…","loadingVideos":"Klasördeki videolar okunuyor…","noFolders":"Bu projede video içeren klasör yok.","noVideos":"Bu klasörde video yok.","found":"","foundTail":" kullanılabilir video","pickTitle":"2. Kendi seçtiğiniz klipler","pickHint":"Her kart aynı çekime yakınlaşır; tek bir seçim hem kartı hem de ardından gelen tam ekran kesmeyi kapsar.","manualLabels":{"3":"Başlığın üzerine geleceği klip","12":"Kart 1 → tam ekran","13":"Kart 2 → tam ekran","14":"Kart 3 → tam ekran"},"restTitle":"3. Kalan yuvalar","restAuto":"Klasörden rastgele dolduruldu.","reshuffle":"Yeniden karıştır","restManual":"Bu klasörde bu yuvalar için yeterince uzun klip yok. Kendiniz seçin.","restReuse":"Farklı klip sayısı yuvalardan az; bazı yuvalar aynı klibi yeniden kullanıyor. Böyle oluşturun ya da kendiniz değiştirin.","showManual":"Kendim seçeyim","hideManual":"Daralt","empty":"Boş","titleSection":"Başlık","title":"Ana başlık","kicker":"Üst satır","subtitle":"Alt satır","font":"Başlık yazı tipi","createSection":"Oluştur","create":"İşaretlere göre Draft oluştur","busy":"Draft oluşturuluyor…","ready":"Yeni Draft kaydedildi.","needFolder":"Önce görüntü klasörünü seçin.","needAll":"Tüm yuvaları doldurun.","sounds":"Giriş efektleri, fon müziği ve deklanşör sesi eklentiyle gelen sabit dosyalardır.","names":["Gökyüzü / kuş","Araba kartı","Avrupa sokağı · başlık","Yol trafiği","Şehir kavşağı","Grafitili sokak","Meydan · yayalar","İç geçit","Yaya köprüsü · son sokak","Tramvay","Avrupa'da yayalar","Kart 1 → tam ekran","Kart 2 → tam ekran","Kart 3 → tam ekran","Glitch sonrası"]},
  zh: {"noProject":"请先在 Selects 中打开一个项目。","folderTitle":"1. 素材文件夹","folderLabel":"项目文件夹","refresh":"刷新文件夹列表","folderHint":"只显示项目中已有的文件夹。新素材请先在 Selects 中导入。","rootFolder":"(不在任何文件夹中的文件)","loadingFolders":"正在读取项目文件夹…","loadingVideos":"正在读取文件夹中的视频…","noFolders":"该项目中没有包含视频的文件夹。","noVideos":"该文件夹中没有视频。","found":"","foundTail":" 个可用视频","pickTitle":"2. 自己挑选的片段","pickHint":"卡片会把同一段素材直接放大，所以一次选择同时决定卡片和紧接其后的全屏镜头。","manualLabels":{"3":"标题所在的片段","12":"卡片 1 → 全屏","13":"卡片 2 → 全屏","14":"卡片 3 → 全屏"},"restTitle":"3. 其余空位","restAuto":"已从文件夹中随机填充。","reshuffle":"重新随机","restManual":"该文件夹里没有足够长的片段填这些空位，请自行选择。","restReuse":"不同片段的数量少于空位，部分空位会重复使用同一段素材。可以就这样生成，也可以自己更换。","showManual":"自己选择","hideManual":"收起","empty":"空","titleSection":"标题","title":"主标题","kicker":"上方文字","subtitle":"下方文字","font":"标题字体","createSection":"生成","create":"按标记生成 Draft","busy":"正在生成 Draft…","ready":"已保存新的 Draft。","needFolder":"请先选择素材文件夹。","needAll":"请填满所有空位。","sounds":"片头音效、背景音乐和快门声是插件自带的固定文件。","names":["天空 / 飞鸟","汽车卡片","欧洲街道 · 标题","道路车流","城市路口","涂鸦街道","广场 · 行人","室内通道","人行天桥 · 最后一条街","有轨电车","欧洲行人","卡片 1 → 全屏","卡片 2 → 全屏","卡片 3 → 全屏","故障闪烁之后"]},
};
const clean = x => JSON.stringify(x);
async function call(sdk,script,summary,allowCommit=false){const r=await sdk.runScript({script,summary,allowCommit});if(r.isError||r.result==null)throw Error(r.output||'Selects returned no result');return r.result;}

const folderList = pid => `const p=selects.project(${clean(pid)});
const rows=await p.resources();
const videoById=new Map(rows.filter(x=>x.type==='Video').map(x=>[x.resourceId,x]));
const sf=await p.sourceFiles();
if('fileTree' in sf){
  const out=[];
  const walk=(ns,prefix)=>{
    const videos=[];
    for(const n of ns||[]){
      if(n.type==='dir')walk(n.children,prefix?prefix+'/'+n.name:n.name);
      else if(videoById.has(n.resourceId))videos.push({resourceId:n.resourceId,name:n.name,duration:videoById.get(n.resourceId).durationSeconds||n.durationSeconds||0});
    }
    if(videos.length)out.push({folder:prefix||'(root)',videoCount:videos.length,videos});
  };
  walk(sf.fileTree,'');
  return {folders:out};
}
return {folders:(sf.folders||[]).filter(f=>f.videoCount>0).map(f=>({folder:f.name,videoCount:f.videoCount,videos:null}))};`;

const folderVideos = (pid, folder) => `const p=selects.project(${clean(pid)});
const rows=await p.resources();
const videoById=new Map(rows.filter(x=>x.type==='Video').map(x=>[x.resourceId,x]));
const detail=await p.sourceFiles({folder:${clean(folder)}});
const tree='fileTree' in detail?detail.fileTree:[];
const videos=[];
const walk=ns=>{for(const n of ns||[]){if(n.type==='dir')walk(n.children);else if(videoById.has(n.resourceId))videos.push({resourceId:n.resourceId,name:n.name,duration:videoById.get(n.resourceId).durationSeconds||n.durationSeconds||0});}};
walk(tree);
return videos;`;

const ensureSounds = (pid, paths, names) => `const p=selects.project(${clean(pid)});
const paths=${clean(paths)},names=${clean(names)};
let rows=await p.resources();
const idsByName=()=>new Map(rows.filter(x=>x.type==='Audio').map(x=>[x.name,x.resourceId]));
let have=idsByName();
const missing=[];
for(let i=0;i<names.length;i++)if(!have.has(names[i]))missing.push(paths[i]);
if(missing.length){await p.importFiles({paths:missing});rows=await p.resources();have=idsByName();}
const out={};
for(const n of names){const id=have.get(n);if(!id)throw new Error('Template sound missing: '+n);out[n]=id;}
return out;`;

function assembly(c){return `const c=${clean(c)};const p=selects.project(c.projectId);const d=await p.createDraft({name:c.name});await d.setFrameSize({width:1920,height:1080});/* Cut frames are 30 fps reference frames, converted to the Draft's rate (a reported 29.97 snaps to 30000/1001). The rate is read again after each clip (a Draft can adopt its first clip's rate) and each cut ends on its converted frame measured from where the last clip really ended. */const rate=async()=>{const reported=(await d.meta()).fps,r=[24000/1001,24,25,30000/1001,30,48,50,60000/1001,60].find(x=>Math.abs(x-reported)<0.01)||reported;if(!(r>0))throw Error('Unsupported draft frame rate: '+reported);return r};let fps=await rate();const fr=n=>Math.round(n/30*fps);await d.insertGap({seconds:fr(5)/fps});let placed=fr(5);for(let i=0;i<c.cuts.length;i++){if(i===c.gapBeforeIndex){const g=fr(55)-placed;if(g>0){await d.insertGap({seconds:g/fps});placed+=g}}const [slot,a,b]=c.cuts[i],id=c.videoIds[slot-1],len=(fr(b)-placed)/fps,src=c.lengths[id]||0;if(src<len+.03)throw Error('Slot '+slot+' is shorter than '+len.toFixed(2)+' seconds');const starts=c.starts,proposed=starts[i],start=Math.min(Math.max(0,proposed),Math.max(0,src-len-.04));await d.insertResource({resourceId:id,sourceRange:{startSeconds:start,endSeconds:start+len}});fps=await rate();placed=(await d.clips({trackScope:'main'})).reduce((n,x)=>x.resourceId?Math.max(n,x.endFrame):n,0)}const main=await d.clips({trackScope:'main'}),end=main.reduce((n,x)=>Math.max(n,x.endFrame),0),at=n=>Math.min(end,fr(n));for(const original of main){const current=(await d.clips({trackScope:'main'})).find(x=>x.clipId===original.clipId);if(current&&current.resourceId)await d.setClipAudio({clip:current,volumeDb:-60});}for(const {i,widthPct} of c.cards)await d.addVideoEffect({clip:(await d.clips({trackScope:'main'}))[i],label:'Cinema Vlog · inset '+(i-9),tsxCode:${clean(CARD)},parameters:{widthPct}});for(const {i,widthPct} of c.cards){const edge=at(c.cuts[i][2]);await d.addMotionGraphic({label:'Cinema Vlog · inset flash '+(i-9),tsxCode:${clean(CARD_FLASH)},within:await d.rangeAtFrames(edge-fr(1),edge),parameters:{widthPct}})}const glitchFrame=at(c.glitchRefFrame),glitchClip=(await d.clips({trackScope:'main'})).find(x=>x.startFrame<=glitchFrame&&glitchFrame<x.endFrame);if(!glitchClip)throw Error('Glitch marker does not fall on footage');await d.addVideoEffect({clip:glitchClip,label:'Cinema Vlog · marker-triggered monochrome stutter',tsxCode:${clean(GLITCH)},parameters:{triggerLocalFrame:glitchFrame-glitchClip.startFrame}});await d.addMotionGraphic({label:'Cinema Vlog · three-step black curtain',tsxCode:${clean(CURTAIN)},within:await d.rangeAtFrames(at(55),at(210)),parameters:{referenceStartFrame:55}});await d.addMotionGraphic({label:'Cinema Vlog · alphabet swap title',tsxCode:${clean(TITLE)},within:await d.rangeAtFrames(at(132),at(196)),parameters:{referenceStartFrame:132,title:c.title,kicker:c.kicker,subtitle:c.subtitle,fontFamily:c.font,titleColor:'#eed65d',smallColor:'#ffffff'},editableParameters:[{key:'title',label:'Main title',type:'text',defaultValue:c.title},{key:'kicker',label:'Upper line',type:'text',defaultValue:c.kicker},{key:'subtitle',label:'Lower line',type:'text',defaultValue:c.subtitle},{key:'fontFamily',label:'Font',type:'text',defaultValue:c.font},{key:'titleColor',label:'Title color',type:'color',defaultValue:'#eed65d'},{key:'smallColor',label:'Small text color',type:'color',defaultValue:'#ffffff'}]});await d.addMotionGraphic({label:'Cinema Vlog · single-frame white flash',tsxCode:${clean(FLASH)},within:await d.rangeAtFrames(at(54),at(55))});/* A sound overlay may not run past its asset; its length is rounded to Draft frames, as Selects does (the intro runs 0.26 frame past its end at 29.97 and plays). */const lengths=new Map((await p.resources()).map(x=>[x.resourceId,x.durationSeconds])),fit=(id,seconds,from,to)=>Math.min(to,from+Math.round(Math.min(lengths.get(id)||Infinity,seconds)*fps));if(c.introFxId)await d.overlayResource({resource:p.resource(c.introFxId),over:await d.rangeAtFrames(0,fit(c.introFxId,${clean(ASSET_SECONDS[0])},0,at(204))),sourceStartSeconds:0});if(c.musicId){await d.overlayResource({resource:p.resource(c.musicId),over:await d.rangeAtFrames(at(204),fit(c.musicId,${clean(ASSET_SECONDS[1])},at(204),end)),sourceStartSeconds:0});const musicClip=(await d.clips({trackScope:'all'})).find(x=>x.trackKind==='audio'&&x.resourceId===c.musicId&&x.startFrame===at(204));if(!musicClip)throw Error('Music clip was not created');await d.setClipAudio({clip:musicClip,fadeInSeconds:0.18,fadeOutSeconds:0.5})}if(c.effectSoundId)await d.overlayResource({resource:p.resource(c.effectSoundId),over:await d.rangeAtFrames(at(c.glitchRefFrame),fit(c.effectSoundId,${clean(ASSET_SECONDS[2])},at(c.glitchRefFrame),Math.min(end,at(c.glitchRefFrame)+fr(7)))),sourceStartSeconds:0});const saved=await d.commitAll('Cinema Vlog Studio: user marker cuts, Postcard curtain and alphabet swap');if(!saved.createdDraftId)throw Error('Draft save did not return an id');const actual=selects.draft(saved.createdDraftId),clips=await actual.clips({trackScope:'all'});return{draftId:saved.createdDraftId,name:c.name,fps,endFrame:clips.reduce((n,x)=>Math.max(n,x.endFrame),0),mainClips:clips.filter(x=>x.trackKind==='main').length,audioClips:clips.filter(x=>x.trackKind==='audio').length,graphics:clips.filter(x=>x.resourceId===null).length};`}

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
// The bundled sounds, imported into the Project once and found by name after.
async function cinemaSounds(sdk, projectId) {
  if(!hostApi('FileSystem','join','homedir','existsSync'))throw Error('This Selects build cannot read the plugin files. Update Selects, then try again.');
  const roots = await hostRoots(sdk, 'cinema-vlog-studio', 'assets').catch(() => null);
  if (!roots) throw Error('Template assets directory is unavailable.');
  const assetPaths = ASSETS.map(n => hostJoin(roots.plugin, 'assets', n));
  return await call(sdk, ensureSounds(projectId, assetPaths, ASSETS), 'Import Cinema Vlog sounds', true);
}

// The cut table, moved to the open Draft's markers when it has them (null: the
// reference timing), with the glitch cut split out.
function cinemaCuts(markerData) {
  const cuts = CUTS.map(x => x.slice());
  const starts = STARTS.slice();
  let glitchRefFrame = 360, markerFps = 24000 / 1001;
  if (markerData?.markers?.length) {
    markerFps = markerData.fps;
    const special = markerData.markers.filter(x => isGlitchNote(x.note));
    const regular = markerData.markers.filter(x => !isGlitchNote(x.note)).sort((a, b) => a.frame - b.frame);
    if (regular.length !== 12 || special.length !== 1) throw Error(`This Draft needs 12 scene markers plus one marker whose note contains "glitch". Found ${regular.length} and ${special.length}.`);
    const boundaries = regular.map(x => Math.round(x.frame / markerFps * 30));
    if (boundaries.some((n, i) => n <= 55 || n >= 641 || (i > 0 && n <= boundaries[i - 1]))) throw Error('Markers must be in increasing order inside the music section.');
    boundaries.forEach((n, i) => { cuts[i + 9][2] = n; cuts[i + 10][1] = n });
    glitchRefFrame = Math.round(special[0].frame / markerFps * 30);
  }
  // Cut at the glitch so the click and the stutter reveal a different clip.
  const g = cuts.findIndex((c, i) => i >= 10 && c[1] < glitchRefFrame && glitchRefFrame < c[2]);
  if (g >= 0 && glitchRefFrame - cuts[g][1] >= 2 && cuts[g][2] - glitchRefFrame >= 2) {
    cuts.splice(g + 1, 0, [GLITCH_SLOT, glitchRefFrame, cuts[g][2]]);
    starts.splice(g + 1, 0, 0);
    cuts[g][2] = glitchRefFrame;
  }
  const cards = [[12, 19], [13, 51], [14, 79]].map(([slot, widthPct]) => ({ i: cuts.findIndex(c => c[0] === slot), widthPct }));
  if (cards.some(c => c.i < 0)) throw Error('An inset card cut is missing from the cut table.');
  const gapBeforeIndex = cuts.findIndex(c => c[1] === 55);
  if (gapBeforeIndex < 0) throw Error('The title cut is missing from the cut table.');
  return { cuts, starts, cards, gapBeforeIndex, glitchRefFrame };
}

// A template run (Clip highlights): the app hands over the clip the title sits
// on, the three card clips and the street clips; the cut table is the
// reference's (an open Draft's markers are not read), the text and name the
// panel's defaults. The longest street clips go to the slots that use the most
// footage, reused round the list when there are fewer clips than slots; a clip
// shorter than its slot's usual in-point is cut from earlier in it.
const TEMPLATE_TEXT = {
  kicker: 'DAILYCINEMA',
  title: 'LIVE YOUR LIFE',
  subtitle: 'Make every moment count, embrace every journey, follow your dreams, explore new places, and create a life filled with beautiful stories and unforgettable memories.',
  font: 'Georgia',
};
const TEMPLATE_FAILED = 'Cinema Vlog Studio could not make the timeline; try again.';
const templateIssue = message => Object.assign(Error(message), { publicMessage: message });
const videoLengths = pid => `const rows=await selects.project(${clean(pid)}).resources();return rows.filter(x=>x.type==='Video').map(x=>({resourceId:x.resourceId,name:x.name,duration:x.durationSeconds||0}));`;

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

export function templateSlotIds(title, cardIds, clips) {
  const ids = Array(SLOT_COUNT).fill('');
  ids[3 - 1] = title;
  [12, 13, 14].forEach((slot, i) => { ids[slot - 1] = cardIds[i]; });
  const longest = clips.slice().sort((a, b) => b.duration - a.duration);
  AUTO_SLOTS.slice().sort((a, b) => MIN[b - 1] - MIN[a - 1]).forEach((slot, i) => { ids[slot - 1] = longest[i % longest.length].resourceId; });
  return ids;
}

function CinemaTemplateRun({ sdk, context }) {
  const runId = context.template?.runId;
  const [status, setStatus] = useState('Making your cinema vlog…');
  const started = useRef(null), alive = useRef(true), latest = useRef(context);
  latest.current = context;
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => {
    if (!runId || started.current === runId) return;
    started.current = runId;
    const live = () => alive.current && latest.current.template?.runId === runId;
    let ended = false;
    const finish = result => { if (ended) return; ended = true; if (!live()) return; try { sdk.finishTemplate(result); } catch {} };
    const say = text => { if (live()) setStatus(text); };
    const projectId = context.projectId, inputs = context.template?.inputs || {};
    (async () => {
      try {
        if (!projectId) throw templateIssue('Open a project, then try again.');
        const picked = id => (inputs[id] || []).filter(x => x?.kind === 'video' && x.resourceId);
        let [title] = picked('title'), cardPicks = picked('cards'), clipPicks = picked('clips');
        if (!title) throw templateIssue('Pick the clip the title sits on, then try again.');
        if (cardPicks.length !== 3) throw templateIssue('Pick three card clips, then try again.');
        if (!clipPicks.length) throw templateIssue('Pick the street clips, then try again.');
        say('Finding your clips…');
        const scriptIds = await scriptResourceIds(sdk, projectId);
        const own = pick => pick && { ...pick, resourceId: scriptIds.get(pick.resourceId) ?? pick.resourceId };
        title = own(title); cardPicks = cardPicks.map(own); clipPicks = clipPicks.map(own);
        const videos = await call(sdk, videoLengths(projectId), 'List Cinema Vlog videos');
        const byId = new Map(videos.map(v => [v.resourceId, v]));
        for (const pick of [title, ...cardPicks, ...clipPicks]) if (!byId.has(pick.resourceId)) throw templateIssue((pick.name || 'A picked clip') + ' is no longer in this project.');
        const ids = templateSlotIds(title.resourceId, cardPicks.map(x => x.resourceId), clipPicks.map(x => byId.get(x.resourceId)));
        say('Adding the sounds…');
        const sounds = await cinemaSounds(sdk, projectId);
        if (!live()) return;
        const { cuts, starts, cards, gapBeforeIndex, glitchRefFrame } = cinemaCuts(null);
        say('Cutting your cinema vlog…');
        const name = 'Cinema Vlog · ' + new Date().toISOString().slice(0, 19).replace('T', ' ');
        const result = await call(sdk, assembly({
          projectId, name, cuts, starts, cards, gapBeforeIndex, glitchRefFrame,
          videoIds: ids, musicId: sounds[MUSIC], introFxId: sounds[INTRO_FX], effectSoundId: sounds[CLICK],
          lengths: Object.fromEntries(videos.map(v => [v.resourceId, v.duration])),
          ...TEMPLATE_TEXT,
        }), 'Create Cinema Vlog Draft', true);
        finish({ sequenceId: result.draftId });
      } catch (e) {
        console.warn('[cinema-vlog-studio] template run failed:', e?.message || String(e));
        const said = String(e?.message || '');
        finish({ error: e?.publicMessage || (/^Slot \d+ is shorter than/.test(said) ? 'A picked clip is too short for its cut; pick longer clips, then try again.' : TEMPLATE_FAILED) });
      } finally { finish({ error: TEMPLATE_FAILED }); }
    })();
  }, [runId]);
  return <p role="status" style={{ margin: 0, fontSize: 12 }}>{status}</p>;
}

export default function CinemaVlogStudio(props) {
  return props.context.template ? <CinemaTemplateRun {...props} /> : <CinemaVlogPanel {...props} />;
}

function CinemaVlogPanel({ sdk, context, ui }) {
  const t = LANG[context.language] || LANG.en;
  const [folders, setFolders] = useState([]);
  const [folderName, setFolderName] = useState(null);
  const [pool, setPool] = useState([]);
  const [ids, setIds] = useState(Array(SLOT_COUNT).fill(''));
  const [manual, setManual] = useState(false);
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [sectionError, setSectionError] = useState('');
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [kicker, setKicker] = useState('DAILYCINEMA');
  const [title, setTitle] = useState('LIVE YOUR LIFE');
  const [subtitle, setSubtitle] = useState('Make every moment count, embrace every journey, follow your dreams, explore new places, and create a life filled with beautiful stories and unforgettable memories.');
  const [font, setFont] = useState('Georgia');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const lock = useRef(false), pending = useRef(null);

  // Longest-first so a demanding slot is not starved by a lenient one taking the only long clip.
  function fillAuto(current, list) {
    const next = current.slice();
    const used = new Set(next.filter(Boolean));
    const bag = list.filter(x => !used.has(x.resourceId));
    for (let i = bag.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const tmp = bag[i]; bag[i] = bag[j]; bag[j] = tmp; }
    const order = AUTO_SLOTS.slice().sort((a, b) => MIN[b - 1] - MIN[a - 1]);
    for (const slot of order) {
      if (next[slot - 1]) continue;
      const k = bag.findIndex(x => x.duration >= MIN[slot - 1]);
      if (k < 0) continue;
      next[slot - 1] = bag[k].resourceId;
      bag.splice(k, 1);
    }
    // Fewer clips than slots: fill what is left by reusing the least-used clip
    // that is long enough, rather than leaving a hole in the edit.
    for (const slot of order) {
      if (next[slot - 1]) continue;
      const counts = new Map();
      for (const id of next) if (id) counts.set(id, (counts.get(id) || 0) + 1);
      const pool2 = list.filter(x => x.duration >= MIN[slot - 1]);
      for (let i = pool2.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const tmp = pool2[i]; pool2[i] = pool2[j]; pool2[j] = tmp; }
      pool2.sort((a, b) => (counts.get(a.resourceId) || 0) - (counts.get(b.resourceId) || 0));
      if (pool2.length) next[slot - 1] = pool2[0].resourceId;
    }
    return next;
  }

  function applyPool(list) {
    setPool(list);
    if (!list.length) { setIds(Array(SLOT_COUNT).fill('')); setManual(false); setSectionError(t.noVideos); return; }
    const longest = list.slice().sort((a, b) => b.duration - a.duration);
    const seeded = Array(SLOT_COUNT).fill('');
    for (const slot of MANUAL_SLOTS.slice().sort((a, b) => MIN[b - 1] - MIN[a - 1])) {
      const pick = longest.find(x => x.duration >= MIN[slot - 1] && !seeded.includes(x.resourceId));
      if (pick) seeded[slot - 1] = pick.resourceId;
    }
    const filled = fillAuto(seeded, list);
    setIds(filled);
    setManual(AUTO_SLOTS.some(s => !filled[s - 1]));
    setStatus('');
  }

  async function loadFolders() {
    if (!context.projectId) return;
    setLoadingFolders(true); setSectionError('');
    try {
      const r = await call(sdk, folderList(context.projectId), 'List Cinema Vlog folders');
      setFolders(r.folders || []);
    } catch (e) { setSectionError(String(e.message || e)); }
    finally { setLoadingFolders(false); }
  }

  useEffect(() => {
    setFolders([]); setFolderName(null); setPool([]); setIds(Array(SLOT_COUNT).fill(''));
    setManual(false); setStatus(''); setSectionError(''); pending.current = null;
    loadFolders();
  }, [context.projectId]);

  async function selectFolder(name) {
    setFolderName(name); setPool([]); setIds(Array(SLOT_COUNT).fill('')); setManual(false); setStatus(''); setSectionError('');
    const entry = folders.find(f => f.folder === name);
    if (entry && Array.isArray(entry.videos)) { applyPool(entry.videos); return; }
    setLoadingVideos(true); setSectionError('');
    try { applyPool(await call(sdk, folderVideos(context.projectId, name), 'List Cinema Vlog folder videos')); }
    catch (e) { setSectionError(String(e.message || e)); }
    finally { setLoadingVideos(false); }
  }

  function setSlot(slot, value) {
    setIds(old => {
      const next = old.map((x, i) => (i === slot - 1 ? value : x));
      // A clip moved into a hand-picked slot must leave whichever auto slot held it.
      if (MANUAL_SLOTS.includes(slot)) for (const s of AUTO_SLOTS) if (next[s - 1] === value) next[s - 1] = '';
      return fillAuto(next, pool);
    });
    setStatus('');
  }

  function reshuffle() {
    setIds(old => fillAuto(old.map((x, i) => (MANUAL_SLOTS.includes(i + 1) ? x : '')), pool));
    setStatus('');
  }

  function optionsFor(slot) {
    return pool.filter(x => x.duration >= MIN[slot - 1]).map(x => ({ value: x.resourceId, label: x.name + ' · ' + x.duration.toFixed(1) + 's' }));
  }

  async function create() {
    if (lock.current || !context.projectId) return;
    if (!folderName) { setStatus(t.needFolder); return; }
    if (USED_SLOTS.some(s => !ids[s - 1])) { setStatus(t.needAll); return; }
    lock.current = true; setBusy(true);
    try {
      const sounds = await cinemaSounds(sdk, context.projectId);

      let markerData = null;
      if (context.sequenceId) {
        markerData = await call(sdk, `const d=selects.draft(${clean(context.sequenceId)});return{fps:(await d.meta()).fps,markers:await d.markers()};`, 'Read Cinema Vlog markers');
      }
      const { cuts, starts, cards, gapBeforeIndex, glitchRefFrame } = cinemaCuts(markerData);
      // Reading every Draft's meta costs seconds each, so only look for a leftover
      // Draft when this is a retry of a name we already tried to create.
      const retry = Boolean(pending.current?.name);
      const name = pending.current?.name || ('Cinema Vlog · ' + new Date().toISOString().slice(0, 19).replace('T', ' '));
      pending.current = { name };
      if (retry) {
        const existing = await call(sdk, `const p=selects.project(${clean(context.projectId)});const ids=(await p.meta()).draftIds;for(let i=ids.length-1;i>=0;i--){const x=await selects.draft(ids[i]).meta();if(x.name===${clean(name)})return ids[i];}return '';`, 'Check Cinema Vlog Draft');
        if (existing) { setStatus(t.ready + ' ' + existing); pending.current = null; return }
      }
      const cfg = {
        projectId: context.projectId, name, cuts, starts, cards, gapBeforeIndex, glitchRefFrame,
        videoIds: ids, musicId: sounds[MUSIC], introFxId: sounds[INTRO_FX], effectSoundId: sounds[CLICK],
        lengths: Object.fromEntries(pool.map(x => [x.resourceId, x.duration])),
        kicker, title, subtitle, font,
      };
      const result = await call(sdk, assembly(cfg), 'Create Cinema Vlog Draft', true);
      pending.current = null;
      setStatus(t.ready + ' ' + result.name + ' · ' + result.mainClips + ' cuts · ' + result.draftId);
    } catch (e) { setStatus(String(e.message || e)) } finally { lock.current = false; setBusy(false) }
  }

  if (!context.projectId) return <ui.Message tone="error">{t.noProject}</ui.Message>;
  const folderOptions = folders.map(f => ({ value: f.folder, label: (f.folder === '(root)' ? t.rootFolder : f.folder) + ' · ' + f.videoCount + t.foundTail }));
  const nameById = new Map(pool.map(x => [x.resourceId, x.name]));
  const short = AUTO_SLOTS.some(s => !ids[s - 1]);
  const chosen = USED_SLOTS.map(s => ids[s - 1]).filter(Boolean);
  const reused = new Set(chosen).size < chosen.length;
  return <>
    <ui.Section title={t.folderTitle} actions={<ui.IconButton icon="refresh" label={t.refresh} disabled={busy} onClick={loadFolders} />}>
      <p>21.35s · {SLOT_COUNT} sources · {CUTS.length} cuts · 16:9</p>
      <ui.Select label={t.folderLabel} value={folderName} onChange={selectFolder} options={folderOptions} placeholder={t.empty} disabled={busy} />
      <p>{t.folderHint}</p>
      {loadingFolders && <ui.Message tone="muted">{t.loadingFolders}</ui.Message>}
      {loadingVideos && <ui.Message tone="muted">{t.loadingVideos}</ui.Message>}
      {!loadingFolders && folders.length === 0 && <ui.Message tone="error">{t.noFolders}</ui.Message>}
      {!loadingFolders && !loadingVideos && pool.length > 0 && <ui.Message tone="success">{t.found}{pool.length}{t.foundTail}</ui.Message>}
      {sectionError && <ui.Message tone="error">{sectionError}</ui.Message>}
    </ui.Section>

    {pool.length > 0 && <ui.Section title={t.pickTitle}>
      <p>{t.pickHint}</p>
      {MANUAL_SLOTS.map(slot => <ui.Select key={slot}
        label={`${t.manualLabels[slot]} · ${MIN[slot - 1].toFixed(1)}s+`}
        value={ids[slot - 1] || null} onChange={v => setSlot(slot, v)}
        options={optionsFor(slot)} placeholder={t.empty} disabled={busy} />)}
    </ui.Section>}

    {pool.length > 0 && <ui.Section title={t.restTitle} actions={<ui.IconButton icon="refresh" label={t.reshuffle} disabled={busy} onClick={reshuffle} />}>
      {short
        ? <ui.Message tone="error">{t.restManual}</ui.Message>
        : <ui.Message tone="muted">{reused ? t.restReuse : t.restAuto}</ui.Message>}
      {(short || manual) && AUTO_SLOTS.map(slot => <ui.Select key={slot}
        label={`${slot}. ${t.names[slot - 1]} · ${MIN[slot - 1].toFixed(1)}s+`}
        value={ids[slot - 1] || null} onChange={v => setSlot(slot, v)}
        options={optionsFor(slot)} placeholder={t.empty} disabled={busy} />)}
      {!short && !manual && <>
        <ol>{AUTO_SLOTS.map(slot => <li key={slot}>{t.names[slot - 1]} — {nameById.get(ids[slot - 1]) || t.empty}</li>)}</ol>
        <ui.Actions><ui.Button variant="ghost" onClick={() => setManual(true)}>{t.showManual}</ui.Button></ui.Actions>
      </>}
      {!short && manual && <ui.Actions><ui.Button variant="ghost" onClick={() => setManual(false)}>{t.hideManual}</ui.Button></ui.Actions>}
    </ui.Section>}

    <ui.Section title={t.titleSection}>
      <ui.TextField label={t.kicker} value={kicker} onChange={setKicker} disabled={busy} />
      <ui.TextField label={t.title} value={title} onChange={setTitle} disabled={busy} />
      <ui.TextField label={t.subtitle} value={subtitle} onChange={setSubtitle} disabled={busy} />
      <ui.TextField label={t.font} value={font} onChange={setFont} disabled={busy} />
    </ui.Section>

    <ui.Section title={t.createSection}>
      <p>{t.sounds}</p>
      <ui.Actions><ui.Button variant="primary" busy={busy} busyLabel={t.busy} disabled={loadingFolders || loadingVideos || USED_SLOTS.some(s => !ids[s - 1])} onClick={create}>{t.create}</ui.Button></ui.Actions>
      {status && <ui.Message>{status}</ui.Message>}
      <p>Music: "Clear Waters" Kevin MacLeod (incompetech.com) · CC BY 4.0</p>
      <p>Camera click: theplax · CC BY 4.0 · freesound.org/people/theplax/sounds/624936/</p>
    </ui.Section>
  </>;
}