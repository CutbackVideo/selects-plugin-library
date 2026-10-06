// @name Tang Poetry Explainer
// @name:de Tang Poetry Explainer
// @name:en Tang Poetry Explainer
// @name:es Tang Poetry Explainer
// @name:fr Tang Poetry Explainer
// @name:it Tang Poetry Explainer
// @name:ja Tang Poetry Explainer
// @name:ko Tang Poetry Explainer
// @name:pt Tang Poetry Explainer
// @name:tr Tang Poetry Explainer
// @name:zh Tang Poetry Explainer
// @icon video
// Creates a narrated 16:9 editable Selects Draft from a link or pasted source text.
// Uses Selects credits and bundled host services; no external runtime or provider key.
// Style source: https://github.com/Alisa0808/vox-director
import React from "react";

const APP_ID = "tang-poetry-explainer";
// The engine (voxEngine, in the operation section below) runs inside the panel on macOS and
// Windows: files through the canonical file SDK, ffmpeg through the host's bundled copy, no shell and no Python.
const TPL: Record<string, string> = {"headline": "import React from 'react';\nimport {useCurrentFrame,useVideoConfig,interpolate,spring} from 'remotion';\nexport default function Headline({data}) {\n const frame=useCurrentFrame(),{width,height,fps}=useVideoConfig(),k=width/1920;\n const tang=data?.style==='tang';\n const text=String(data?.text||'');\n const family=String(data?.fontFamily||'').trim()||\"'Arial Black','Arial','Malgun Gothic','Noto Sans CJK KR','Microsoft YaHei','Yu Gothic',sans-serif\";\n const progress=spring({frame,fps,config:{damping:20,stiffness:150}});\n const size=Math.min(Number(data?.fontSize||88),text.length>28?64:88)*k;\n const accent=String(data?.accentColor||(tang?'#A92D25':'#E04329'));\n return <div style={{position:'absolute',left:width*.045,top:height*.045,maxWidth:width*.89,pointerEvents:'none',opacity:interpolate(frame,[0,7],[0,1],{extrapolateRight:'clamp'}),transform:`translateY(${(1-progress)*-35*k}px)`}}>\n  <div style={{background:String(data?.barColor||(tang?'#F1E7CC':'#DAD9D5')),padding:`${12*k}px ${24*k}px`,borderLeft:`${8*k}px solid ${accent}`,boxShadow:tang?`${5*k}px ${6*k}px 0 #34251b55`:`${8*k}px ${9*k}px 0 ${accent}`,transform:tang?'rotate(-.4deg)':'rotate(-.8deg)'}}>\n   <div style={{fontFamily:family,fontWeight:900,fontSize:size,lineHeight:1.1,letterSpacing:-1*k,color:String(data?.textColor||'#1A1A1A'),overflowWrap:'anywhere'}}>{text}</div>\n  </div>\n  {!tang&&<div style={{height:5*k,marginTop:10*k,background:accent,transformOrigin:'left',transform:`scaleX(${Math.min(1,frame/18)})`}}/>}\n </div>;\n}\n", "caption": "import React from 'react';\nimport {useVideoConfig} from 'remotion';\nexport default function Caption({data}) {\n const {width,height}=useVideoConfig(),k=width/1920;\n const fontFamily=String(data?.fontFamily||'').trim()||\"Arial,'Malgun Gothic','Noto Sans CJK KR','Microsoft YaHei','Yu Gothic',sans-serif\";\n return <div style={{position:'absolute',left:width*.06,right:width*.06,bottom:height*.045,display:'flex',justifyContent:'center',pointerEvents:'none'}}>\n  <div style={{fontFamily,fontSize:Number(data?.fontSize||44)*k,fontWeight:700,lineHeight:1.35,color:'#FFF9ED',background:'rgba(19,18,15,.88)',padding:`${10*k}px ${22*k}px`,textAlign:'center',maxWidth:'100%',whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{String(data?.text||'')}</div>\n </div>;\n}\n", "credit": "import React from 'react';\nimport {useVideoConfig,useCurrentFrame,interpolate} from 'remotion';\nexport default function Credit({data}) {\n const {width,height}=useVideoConfig(),frame=useCurrentFrame(),k=width/1920;\n return <div style={{position:'absolute',left:width*.06,right:width*.06,bottom:height*.17,padding:`${18*k}px ${24*k}px`,background:'#F1EBDD',color:'#1A1A1A',borderLeft:`${7*k}px solid #E04329`,opacity:interpolate(frame,[0,8],[0,1],{extrapolateRight:'clamp'}),fontFamily:\"Arial,'Malgun Gothic','Microsoft YaHei','Yu Gothic',sans-serif\",overflowWrap:'anywhere'}}>\n <div style={{fontSize:30*k,fontWeight:700}}>{String(data?.source||'')}</div><div style={{fontSize:21*k,lineHeight:1.4}}>{String(data?.photos||'')}</div></div>;\n}\n", "editorial": "import React from 'react';\nimport {useCurrentFrame,useVideoConfig,interpolate,spring} from 'remotion';\n// Source-backed labels remain native editable graphics, never text painted by an image model.\nexport default function Editorial({data}) {\n const frame=useCurrentFrame(),{width,height,fps,durationInFrames}=useVideoConfig(),k=width/1920;\n const items=String(data?.text||'').split('\\n').filter(Boolean).slice(0,3);\n const kind=String(data?.kind||'document'),accent=String(data?.accentColor||'#E04329');\n const fontFamily=String(data?.fontFamily||'').trim()||\"Arial,'Noto Sans CJK KR','Malgun Gothic','Microsoft YaHei','Yu Gothic',sans-serif\";\n const end=Math.max(1,durationInFrames-1),stagger=Math.min(Math.round(fps*.3),Math.floor(end/8));\n return <div style={{position:'absolute',left:width*.18,right:width*.18,top:height*.32,bottom:height*.22,display:'flex',flexDirection:kind==='comparison'?'row':'column',justifyContent:'center',alignItems:kind==='comparison'?'center':'stretch',gap:22*k,pointerEvents:'none'}}>\n  {items.map((text,i)=>{const start=i*stagger,p=spring({frame:frame-start,fps,config:{damping:19,stiffness:120}}),reveal=interpolate(frame,[start,start+Math.max(1,stagger*2)],[0,1],{extrapolateLeft:'clamp',extrapolateRight:'clamp'});return <div key={i} style={{position:'relative',flex:kind==='comparison'?1:undefined,minWidth:0,background:'#EFECE2',padding:`${20*k}px ${28*k}px`,boxShadow:`${9*k}px ${10*k}px 0 ${accent}`,border:'1px solid #332b2130',opacity:reveal,transform:`translateY(${(1-p)*45*k}px) rotate(${i%2?.7:-.6}deg)`}}>\n   {kind==='timeline'&&<div style={{position:'absolute',left:-18*k,top:0,bottom:0,width:4*k,background:accent}}/>}\n   <div style={{fontFamily,fontSize:(kind==='stat'&&text.length<=18?80:kind==='comparison'?(text.length>40?30:43):(text.length>50?34:48))*k,fontWeight:kind==='stat'?900:600,lineHeight:1.25,color:'#16110D',whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{text}</div>\n   <div style={{height:4*k,marginTop:12*k,background:accent,transformOrigin:'left',transform:`scaleX(${reveal})`}}/>\n  </div>})}\n </div>;\n}\n"};
const CAPTION_BOTTOM = 1030;
const MUSIC_DB = -19;

type Strings = {
  sourceTitle: string; link: string; text: string; url: string; body: string; bodyPh: string; target: string;
  makePlan: string; planning: string; planTitle: string; redo: string;
  summary: (s: number, b: number, sh: number, lang: string) => string; people: string; warnings: string;
  produce: string; producing: string; steps: string[]; done: string; openHint: string; fallback: string;
  missing: string; rerolled: (n: number) => string; checkOk: string; checkSkipped: string; notReady: (names: string) => string; unverified: string; noProject: string;
  needUrl: string; needText: string; noHost: string; noGeneration: string; recent: string; resume: string;
  dismiss: string; retry: string; elapsed: string; noMusic: string;
  errors: Record<string, string>;
};

const STRINGS: Record<string, Strings> = {
  en: {
    sourceTitle: "Source", link: "Link", text: "Text", url: "Source link", body: "Source text",
    bodyPh: "Paste the title and body", target: "Target length", makePlan: "Draft the script",
    planning: "Drafting…", planTitle: "Script", redo: "Redo the script",
    summary: (s, b, sh, l) => `About ${s}s · ${b} beats · ${sh} shots · ${l}`, people: "People",
    warnings: "Auto-fixed", produce: "Make the video", producing: "Making…",
    steps: ["Read source", "Script", "Portraits & voice", "Keyframes", "Image check", "Motion", "Draft"],
    done: "The Draft is ready", openHint: "Open it from the Project's Draft list. Export with Handoff → Export.",
    fallback: "Shots that use a zoom instead of motion",
    missing: "People shown as silhouettes (no free-licence photo)",
    rerolled: (n) => `The image check remade ${n} shot(s).`, checkOk: "Image check: no problems", checkSkipped: "The image check was skipped (the contact sheet could not be made); worth a look before export.", notReady: (n) => `Selects has not finished adding some media to the Project yet (${n}). Wait a moment, then press Continue.`,
    unverified: "Shots the check still noted after remaking (worth a look)",
    noProject: "Open a Project first.", needUrl: "Enter a source link.",
    needText: "Paste at least 80 characters of source text.",
    noHost: "This Selects version cannot run this app. Update Selects.",
    noGeneration: "This Selects version cannot generate media from apps. Update Selects.",
    recent: "Unfinished jobs", resume: "Resume", dismiss: "Remove from list", retry: "Try again", elapsed: "Elapsed",
    noMusic: "The music could not be made; the Draft has no music.",
    errors: { FETCH_FAILED: "The link could not be opened.", NO_TEXT: "No text was found at the link. Paste the text instead.",
      TEXT_TOO_SHORT: "The source text is too short.", NO_JSON: "The script could not be read from the AI answer. Try again." },
  },
  ko: {
    sourceTitle: "\uc6d0\ubb38", link: "\ub9c1\ud06c", text: "\ud14d\uc2a4\ud2b8", url: "\uc6d0\ubb38 \ub9c1\ud06c", body: "\uc6d0\ubb38 \ud14d\uc2a4\ud2b8",
    bodyPh: "\uc81c\ubaa9\uacfc \ubcf8\ubb38\uc744 \ubd99\uc5ec\ub123\uc73c\uc138\uc694", target: "\ubaa9\ud45c \uae38\uc774", makePlan: "\uad6c\uc131\uc548 \ub9cc\ub4e4\uae30",
    planning: "\uad6c\uc131\uc548 \ub9cc\ub4dc\ub294 \uc911…", planTitle: "\uad6c\uc131\uc548", redo: "\uad6c\uc131\uc548 \ub2e4\uc2dc \ub9cc\ub4e4\uae30",
    summary: (s, b, sh, l) => `\uc57d ${s}\ucd08 · \uc7a5\uba74 ${b} · \uc0f7 ${sh} · ${l}`, people: "\uc778\ubb3c",
    warnings: "\uc790\ub3d9 \uc218\uc815", produce: "\uc601\uc0c1 \ub9cc\ub4e4\uae30", producing: "\ub9cc\ub4dc\ub294 \uc911…",
    steps: ["\uc6d0\ubb38 \uc77d\uae30", "\uad6c\uc131\uc548", "\uc778\ubb3c \uc0ac\uc9c4·\ub0b4\ub808\uc774\uc158", "\ud0a4\ud504\ub808\uc784", "\uc774\ubbf8\uc9c0 \uc810\uac80", "\uc6c0\uc9c1\uc784", "\ub4dc\ub798\ud504\ud2b8"],
    done: "\ub4dc\ub798\ud504\ud2b8\ub97c \ub9cc\ub4e4\uc5c8\uc2b5\ub2c8\ub2e4", openHint: "\ud504\ub85c\uc81d\ud2b8\uc758 \ub4dc\ub798\ud504\ud2b8 \ubaa9\ub85d\uc5d0\uc11c \uc5f4 \uc218 \uc788\uc2b5\ub2c8\ub2e4. \ub0b4\ubcf4\ub0b4\uae30\ub294 Handoff → Export\ub97c \uc4f0\uc138\uc694.",
    fallback: "\uc6c0\uc9c1\uc784 \ub300\uc2e0 \ud655\ub300 \ud6a8\uacfc\ub97c \uc4f4 \uc0f7", missing: "\uc790\uc720 \ub77c\uc774\uc120\uc2a4 \uc0ac\uc9c4\uc774 \uc5c6\uc5b4 \uc2e4\ub8e8\uc5e3\uc73c\ub85c \ubc14\uafbc \uc778\ubb3c",
    rerolled: (n) => `\uc774\ubbf8\uc9c0 \uc810\uac80\uc5d0\uc11c ${n}\uac1c \uc0f7\uc744 \ub2e4\uc2dc \ub9cc\ub4e4\uc5c8\uc2b5\ub2c8\ub2e4.`, checkOk: "\uc774\ubbf8\uc9c0 \uc810\uac80: \ubb38\uc81c \uc5c6\uc74c", checkSkipped: "\uc774\ubbf8\uc9c0 \uc810\uac80\uc744 \uac74\ub108\ub6f0\uc5c8\uc2b5\ub2c8\ub2e4(\ubbf8\ub9ac\ubcf4\uae30 \uc2dc\ud2b8\ub97c \ub9cc\ub4e4 \uc218 \uc5c6\uc5c8\uc74c). \ub0b4\ubcf4\ub0b4\uae30 \uc804\uc5d0 \ud55c\ubc88 \ud655\uc778\ud574 \uc8fc\uc138\uc694.", notReady: (n) => `Selects\uac00 \uc544\uc9c1 \uc77c\ubd80 \ubbf8\ub514\uc5b4\ub97c \ud504\ub85c\uc81d\ud2b8\uc5d0 \ucd94\uac00\ud558\ub294 \uc911\uc785\ub2c8\ub2e4(${n}). \uc7a0\uc2dc \ud6c4 \uacc4\uc18d\uc744 \ub20c\ub7ec \uc8fc\uc138\uc694.`,
    unverified: "\ub2e4\uc2dc \ub9cc\ub4e0 \ub4a4\uc5d0\ub3c4 \uc810\uac80\uc5d0\uc11c \uc9c0\uc801\ub41c \uc0f7(\ud655\uc778 \uad8c\uc7a5)",
    noProject: "\ud504\ub85c\uc81d\ud2b8\ub97c \uba3c\uc800 \uc5ec\uc138\uc694.", needUrl: "\uc6d0\ubb38 \ub9c1\ud06c\ub97c \ub123\uc73c\uc138\uc694.", needText: "\uc6d0\ubb38 \ud14d\uc2a4\ud2b8\ub97c 80\uc790 \uc774\uc0c1 \ub123\uc73c\uc138\uc694.",
    noHost: "\uc774 Selects \ubc84\uc804\uc5d0\uc11c\ub294 \uc774 \uc571\uc744 \uc2e4\ud589\ud560 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4. Selects\ub97c \uc5c5\ub370\uc774\ud2b8\ud558\uc138\uc694.",
    noGeneration: "\uc774 Selects \ubc84\uc804\uc740 \uc571\uc5d0\uc11c \ubbf8\ub514\uc5b4 \uc0dd\uc131\uc744 \uc9c0\uc6d0\ud558\uc9c0 \uc54a\uc2b5\ub2c8\ub2e4. Selects\ub97c \uc5c5\ub370\uc774\ud2b8\ud558\uc138\uc694.",
    recent: "\uc9c4\ud589 \uc911\uc778 \uc791\uc5c5", resume: "\uc774\uc5b4\uc11c \ub9cc\ub4e4\uae30", dismiss: "\ubaa9\ub85d\uc5d0\uc11c \uc9c0\uc6b0\uae30", retry: "\ub2e4\uc2dc \uc2dc\ub3c4", elapsed: "\uacbd\uacfc",
    noMusic: "\ubc30\uacbd\uc74c\uc545\uc744 \ub9cc\ub4e4\uc9c0 \ubabb\ud574 \uc74c\uc545 \uc5c6\uc774 \ub9cc\ub4e4\uc5c8\uc2b5\ub2c8\ub2e4.",
    errors: { FETCH_FAILED: "\ub9c1\ud06c\ub97c \uc5f4\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4.", NO_TEXT: "\ub9c1\ud06c\uc5d0\uc11c \ubcf8\ubb38\uc744 \ucc3e\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4. \ud14d\uc2a4\ud2b8\ub85c \ubd99\uc5ec\ub123\uc5b4 \uc8fc\uc138\uc694.",
      TEXT_TOO_SHORT: "\uc6d0\ubb38 \ud14d\uc2a4\ud2b8\uac00 \ub108\ubb34 \uc9e7\uc2b5\ub2c8\ub2e4.", NO_JSON: "AI \uc751\ub2f5\uc5d0\uc11c \uad6c\uc131\uc548\uc744 \uc77d\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4. \ub2e4\uc2dc \uc2dc\ub3c4\ud558\uc138\uc694." },
  },
  ja: {
    sourceTitle: "原文", link: "リンク", text: "テキスト", url: "原文のリンク", body: "原文テキスト",
    bodyPh: "タイトルと本文を貼り付けてください", target: "目標の長さ", makePlan: "構成案を作成",
    planning: "構成案を作成中…", planTitle: "構成案", redo: "構成案を作り直す",
    summary: (s, b, sh, l) => `約${s}秒 · ${b}場面 · ${sh}ショット · ${l}`, people: "人物",
    warnings: "自動修正", produce: "動画を作成", producing: "作成中…",
    steps: ["原文を読む", "構成案", "人物写真・ナレーション", "キーフレーム", "画像チェック", "モーション", "ドラフト"],
    done: "ドラフトを作成しました", openHint: "プロジェクトのドラフト一覧から開けます。書き出しは Handoff → Export を使ってください。",
    fallback: "モーションの代わりにズームを使ったショット", missing: "自由ライセンスの写真がなくシルエットにした人物",
    rerolled: (n) => `画像チェックで${n}ショットを作り直しました。`, checkOk: "画像チェック: 問題なし", checkSkipped: "画像チェックをスキップしました（コンタクトシートを作成できませんでした）。書き出し前に確認してください。", notReady: (n) => `Selects はまだ一部のメディアをプロジェクトに追加しています（${n}）。少し待ってから「続行」を押してください。`,
    unverified: "作り直した後もチェックで指摘されたショット(確認をおすすめします)",
    noProject: "先にプロジェクトを開いてください。", needUrl: "原文のリンクを入力してください。",
    needText: "原文テキストを80文字以上貼り付けてください。",
    noHost: "このバージョンの Selects ではこのアプリを実行できません。Selects をアップデートしてください。",
    noGeneration: "このバージョンのSelectsはアプリからのメディア生成に対応していません。Selectsを更新してください。",
    recent: "未完了のジョブ", resume: "続きから作成", dismiss: "一覧から削除", retry: "再試行", elapsed: "経過",
    noMusic: "BGMを作成できなかったため、音楽なしで作成しました。",
    errors: { FETCH_FAILED: "リンクを開けませんでした。", NO_TEXT: "リンクから本文が見つかりませんでした。テキストで貼り付けてください。",
      TEXT_TOO_SHORT: "原文テキストが短すぎます。", NO_JSON: "AIの回答から構成案を読み取れませんでした。再試行してください。" },
  },
  zh: {
    sourceTitle: "原文", link: "链接", text: "文本", url: "原文链接", body: "原文文本",
    bodyPh: "粘贴标题和正文", target: "目标时长", makePlan: "生成脚本",
    planning: "正在生成脚本…", planTitle: "脚本", redo: "重新生成脚本",
    summary: (s, b, sh, l) => `约${s}秒 · ${b}个场景 · ${sh}个镜头 · ${l}`, people: "人物",
    warnings: "已自动修正", produce: "生成视频", producing: "正在生成…",
    steps: ["读取原文", "脚本", "人物照片与旁白", "关键帧", "图像检查", "动态", "草稿"],
    done: "草稿已创建", openHint: "可在项目的草稿列表中打开。导出请使用 Handoff → Export。",
    fallback: "以缩放代替动态的镜头", missing: "因无自由许可照片而改为剪影的人物",
    rerolled: (n) => `图像检查后重新生成了${n}个镜头。`, checkOk: "图像检查：没有问题", checkSkipped: "已跳过图像检查（无法生成联系表）。导出前请检查一下。", notReady: (n) => `Selects 仍在将部分媒体添加到项目中（${n}）。请稍候，然后点击“继续”。`,
    unverified: "重新生成后检查仍有提示的镜头（建议确认）",
    noProject: "请先打开项目。", needUrl: "请输入原文链接。", needText: "请粘贴至少80个字符的原文文本。",
    noHost: "此版本的 Selects 无法运行此应用。请更新 Selects。",
    noGeneration: "此版本的 Selects 不支持在应用中生成媒体。请更新 Selects。",
    recent: "未完成的任务", resume: "继续生成", dismiss: "从列表中移除", retry: "重试", elapsed: "已用时",
    noMusic: "未能生成背景音乐，草稿中没有音乐。",
    errors: { FETCH_FAILED: "无法打开链接。", NO_TEXT: "未能从链接中找到正文，请粘贴文本。",
      TEXT_TOO_SHORT: "原文文本太短。", NO_JSON: "无法从 AI 回复中读取脚本，请重试。" },
  },
  de: {
    sourceTitle: "Quelle", link: "Link", text: "Text", url: "Link zur Quelle", body: "Quelltext",
    bodyPh: "Titel und Text einfügen", target: "Ziellänge", makePlan: "Skript erstellen",
    planning: "Skript wird erstellt…", planTitle: "Skript", redo: "Skript neu erstellen",
    summary: (s, b, sh, l) => `Etwa ${s} s · ${b} Szenen · ${sh} Einstellungen · ${l}`, people: "Personen",
    warnings: "Automatisch korrigiert", produce: "Video erstellen", producing: "Wird erstellt…",
    steps: ["Quelle lesen", "Skript", "Porträts & Sprecher", "Keyframes", "Bildprüfung", "Bewegung", "Entwurf"],
    done: "Der Entwurf ist fertig", openHint: "Öffne ihn in der Entwurfsliste des Projekts. Exportieren mit Handoff → Export.",
    fallback: "Einstellungen mit Zoom statt Bewegung", missing: "Als Silhouette gezeigte Personen (kein frei lizenziertes Foto)",
    rerolled: (n) => `Die Bildprüfung hat ${n} Einstellung(en) neu erstellt.`, checkOk: "Bildprüfung: keine Probleme", checkSkipped: "Die Bildprüfung wurde übersprungen (der Kontaktbogen ließ sich nicht erstellen); vor dem Export bitte ansehen.", notReady: (n) => `Selects fügt noch Medien zum Projekt hinzu (${n}). Warte kurz und tippe dann auf „Fortsetzen“.`,
    unverified: "Einstellungen, zu denen die Prüfung nach der Neuerstellung noch etwas anmerkt (bitte ansehen)",
    noProject: "Öffne zuerst ein Projekt.", needUrl: "Gib einen Link zur Quelle ein.",
    needText: "Füge mindestens 80 Zeichen Quelltext ein.",
    noHost: "Diese Selects-Version kann diese App nicht ausführen. Aktualisiere Selects.",
    noGeneration: "Diese Selects-Version kann in Apps keine Medien erzeugen. Aktualisiere Selects.",
    recent: "Unfertige Aufträge", resume: "Fortsetzen", dismiss: "Aus der Liste entfernen", retry: "Erneut versuchen", elapsed: "Vergangen",
    noMusic: "Die Musik konnte nicht erstellt werden; der Entwurf hat keine Musik.",
    errors: { FETCH_FAILED: "Der Link konnte nicht geöffnet werden.", NO_TEXT: "Unter dem Link wurde kein Text gefunden. Füge den Text ein.",
      TEXT_TOO_SHORT: "Der Quelltext ist zu kurz.", NO_JSON: "Das Skript konnte nicht aus der KI-Antwort gelesen werden. Versuche es erneut." },
  },
  es: {
    sourceTitle: "Fuente", link: "Enlace", text: "Texto", url: "Enlace a la fuente", body: "Texto de la fuente",
    bodyPh: "Pega el título y el cuerpo", target: "Duración objetivo", makePlan: "Crear guion",
    planning: "Creando guion…", planTitle: "Guion", redo: "Rehacer guion",
    summary: (s, b, sh, l) => `Unos ${s} s · ${b} escenas · ${sh} planos · ${l}`, people: "Personas",
    warnings: "Corregido automáticamente", produce: "Crear el vídeo", producing: "Creando…",
    steps: ["Leer la fuente", "Guion", "Retratos y voz", "Fotogramas clave", "Revisión de imágenes", "Movimiento", "Borrador"],
    done: "El borrador está listo", openHint: "Ábrelo desde la lista de borradores del proyecto. Exporta con Handoff → Export.",
    fallback: "Planos con zoom en lugar de movimiento", missing: "Personas mostradas como silueta (sin foto con licencia libre)",
    rerolled: (n) => `La revisión de imágenes rehízo ${n} plano(s).`, checkOk: "Revisión de imágenes: sin problemas", checkSkipped: "Se omitió la revisión de imágenes (no se pudo crear la hoja de contactos); conviene revisarlo antes de exportar.", notReady: (n) => `Selects aún está añadiendo medios al proyecto (${n}). Espera un momento y pulsa Continuar.`,
    unverified: "Planos que la revisión aún señala tras rehacerlos (conviene revisarlos)",
    noProject: "Abre primero un proyecto.", needUrl: "Introduce un enlace a la fuente.",
    needText: "Pega al menos 80 caracteres del texto de la fuente.",
    noHost: "Esta versión de Selects no puede ejecutar esta app. Actualiza Selects.",
    noGeneration: "Esta versión de Selects no puede generar contenido desde apps. Actualiza Selects.",
    recent: "Trabajos sin terminar", resume: "Continuar", dismiss: "Quitar de la lista", retry: "Reintentar", elapsed: "Transcurrido",
    noMusic: "No se pudo crear la música; el borrador no tiene música.",
    errors: { FETCH_FAILED: "No se pudo abrir el enlace.", NO_TEXT: "No se encontró texto en el enlace. Pega el texto.",
      TEXT_TOO_SHORT: "El texto de la fuente es demasiado corto.", NO_JSON: "No se pudo leer el guion en la respuesta de la IA. Vuelve a intentarlo." },
  },
  fr: {
    sourceTitle: "Source", link: "Lien", text: "Texte", url: "Lien de la source", body: "Texte de la source",
    bodyPh: "Collez le titre et le texte", target: "Durée cible", makePlan: "Créer le script",
    planning: "Création du script…", planTitle: "Script", redo: "Refaire le script",
    summary: (s, b, sh, l) => `Environ ${s} s · ${b} scènes · ${sh} plans · ${l}`, people: "Personnes",
    warnings: "Corrigé automatiquement", produce: "Créer la vidéo", producing: "Création…",
    steps: ["Lire la source", "Script", "Portraits et voix", "Images clés", "Vérification des images", "Mouvement", "Brouillon"],
    done: "Le brouillon est prêt", openHint: "Ouvrez-le depuis la liste des brouillons du projet. Exportez avec Handoff → Export.",
    fallback: "Plans avec un zoom au lieu du mouvement", missing: "Personnes montrées en silhouette (pas de photo sous licence libre)",
    rerolled: (n) => `La vérification a refait ${n} plan(s).`, checkOk: "Vérification des images : aucun problème", checkSkipped: "La vérification des images a été ignorée (la planche contact n'a pas pu être créée) ; à regarder avant l'export.", notReady: (n) => `Selects ajoute encore des médias au projet (${n}). Patientez un instant, puis appuyez sur Continuer.`,
    unverified: "Plans encore signalés après leur reprise (à regarder)",
    noProject: "Ouvrez d'abord un projet.", needUrl: "Saisissez un lien vers la source.",
    needText: "Collez au moins 80 caractères du texte source.",
    noHost: "Cette version de Selects ne peut pas exécuter cette app. Mettez Selects à jour.",
    noGeneration: "Cette version de Selects ne peut pas générer de médias depuis les apps. Mettez Selects à jour.",
    recent: "Tâches inachevées", resume: "Reprendre", dismiss: "Retirer de la liste", retry: "Réessayer", elapsed: "Écoulé",
    noMusic: "La musique n'a pas pu être créée ; le brouillon n'a pas de musique.",
    errors: { FETCH_FAILED: "Impossible d'ouvrir le lien.", NO_TEXT: "Aucun texte trouvé à ce lien. Collez le texte.",
      TEXT_TOO_SHORT: "Le texte source est trop court.", NO_JSON: "Impossible de lire le script dans la réponse de l'IA. Réessayez." },
  },
  it: {
    sourceTitle: "Fonte", link: "Link", text: "Testo", url: "Link della fonte", body: "Testo della fonte",
    bodyPh: "Incolla titolo e testo", target: "Durata obiettivo", makePlan: "Crea copione",
    planning: "Creazione del copione…", planTitle: "Copione", redo: "Rifai il copione",
    summary: (s, b, sh, l) => `Circa ${s} s · ${b} scene · ${sh} inquadrature · ${l}`, people: "Persone",
    warnings: "Corretto automaticamente", produce: "Crea il video", producing: "Creazione…",
    steps: ["Leggi la fonte", "Copione", "Ritratti e voce", "Fotogrammi chiave", "Controllo immagini", "Movimento", "Bozza"],
    done: "La bozza è pronta", openHint: "Aprila dall'elenco delle bozze del progetto. Esporta con Handoff → Export.",
    fallback: "Inquadrature con zoom invece del movimento", missing: "Persone mostrate come sagoma (nessuna foto a licenza libera)",
    rerolled: (n) => `Il controllo immagini ha rifatto ${n} inquadratura/e.`, checkOk: "Controllo immagini: nessun problema", checkSkipped: "Il controllo delle immagini è stato saltato (impossibile creare il provino); da controllare prima dell'esportazione.", notReady: (n) => `Selects sta ancora aggiungendo media al progetto (${n}). Attendi un momento, poi premi Continua.`,
    unverified: "Inquadrature ancora segnalate dopo il rifacimento (da controllare)",
    noProject: "Apri prima un progetto.", needUrl: "Inserisci un link alla fonte.",
    needText: "Incolla almeno 80 caratteri del testo della fonte.",
    noHost: "Questa versione di Selects non può eseguire questa app. Aggiorna Selects.",
    noGeneration: "Questa versione di Selects non può generare media dalle app. Aggiorna Selects.",
    recent: "Lavori non finiti", resume: "Riprendi", dismiss: "Rimuovi dall'elenco", retry: "Riprova", elapsed: "Trascorso",
    noMusic: "Non è stato possibile creare la musica; la bozza è senza musica.",
    errors: { FETCH_FAILED: "Impossibile aprire il link.", NO_TEXT: "Nessun testo trovato nel link. Incolla il testo.",
      TEXT_TOO_SHORT: "Il testo della fonte è troppo corto.", NO_JSON: "Impossibile leggere il copione dalla risposta dell'IA. Riprova." },
  },
  pt: {
    sourceTitle: "Fonte", link: "Link", text: "Texto", url: "Link da fonte", body: "Texto da fonte",
    bodyPh: "Cole o título e o corpo", target: "Duração alvo", makePlan: "Criar roteiro",
    planning: "Criando roteiro…", planTitle: "Roteiro", redo: "Refazer roteiro",
    summary: (s, b, sh, l) => `Cerca de ${s} s · ${b} cenas · ${sh} planos · ${l}`, people: "Pessoas",
    warnings: "Corrigido automaticamente", produce: "Criar o vídeo", producing: "Criando…",
    steps: ["Ler a fonte", "Roteiro", "Retratos e voz", "Quadros-chave", "Verificação de imagens", "Movimento", "Rascunho"],
    done: "O rascunho está pronto", openHint: "Abra-o na lista de rascunhos do projeto. Exporte com Handoff → Export.",
    fallback: "Planos com zoom em vez de movimento", missing: "Pessoas mostradas como silhueta (sem foto de licença livre)",
    rerolled: (n) => `A verificação refez ${n} plano(s).`, checkOk: "Verificação de imagens: sem problemas", checkSkipped: "A verificação de imagens foi ignorada (não foi possível criar a folha de contato); vale conferir antes de exportar.", notReady: (n) => `O Selects ainda está adicionando mídias ao projeto (${n}). Aguarde um pouco e toque em Continuar.`,
    unverified: "Planos ainda apontados pela verificação após refeitos (vale conferir)",
    noProject: "Abra um projeto primeiro.", needUrl: "Insira um link da fonte.",
    needText: "Cole pelo menos 80 caracteres do texto da fonte.",
    noHost: "Esta versão do Selects não consegue executar este app. Atualize o Selects.",
    noGeneration: "Esta versão do Selects não gera mídia a partir de apps. Atualize o Selects.",
    recent: "Trabalhos inacabados", resume: "Continuar", dismiss: "Remover da lista", retry: "Tentar de novo", elapsed: "Decorrido",
    noMusic: "Não foi possível criar a música; o rascunho está sem música.",
    errors: { FETCH_FAILED: "Não foi possível abrir o link.", NO_TEXT: "Nenhum texto encontrado no link. Cole o texto.",
      TEXT_TOO_SHORT: "O texto da fonte é curto demais.", NO_JSON: "Não foi possível ler o roteiro na resposta da IA. Tente de novo." },
  },
  tr: {
    sourceTitle: "Kaynak", link: "Bağlantı", text: "Metin", url: "Kaynak bağlantısı", body: "Kaynak metni",
    bodyPh: "Başlığı ve metni yapıştırın", target: "Hedef süre", makePlan: "Senaryo oluştur",
    planning: "Senaryo oluşturuluyor…", planTitle: "Senaryo", redo: "Senaryoyu yeniden oluştur",
    summary: (s, b, sh, l) => `Yaklaşık ${s} sn · ${b} sahne · ${sh} çekim · ${l}`, people: "Kişiler",
    warnings: "Otomatik düzeltildi", produce: "Videoyu oluştur", producing: "Oluşturuluyor…",
    steps: ["Kaynağı oku", "Senaryo", "Portreler ve seslendirme", "Anahtar kareler", "Görsel kontrolü", "Hareket", "Taslak"],
    done: "Taslak hazır", openHint: "Projenin taslak listesinden açabilirsiniz. Dışa aktarmak için Handoff → Export'u kullanın.",
    fallback: "Hareket yerine yakınlaştırma kullanılan çekimler", missing: "Silüet olarak gösterilen kişiler (serbest lisanslı fotoğraf yok)",
    rerolled: (n) => `Görsel kontrolü ${n} çekimi yeniden oluşturdu.`, checkOk: "Görsel kontrolü: sorun yok", checkSkipped: "Görüntü kontrolü atlandı (kontak sayfası oluşturulamadı); dışa aktarmadan önce göz atın.", notReady: (n) => `Selects bazı medyaları projeye eklemeyi henüz bitirmedi (${n}). Biraz bekleyip Devam'a basın.`,
    unverified: "Yeniden oluşturulduktan sonra kontrolün hâlâ not düştüğü çekimler (göz atmanızı öneririz)",
    noProject: "Önce bir proje açın.", needUrl: "Bir kaynak bağlantısı girin.",
    needText: "En az 80 karakterlik kaynak metni yapıştırın.",
    noHost: "Bu Selects sürümü bu uygulamayı çalıştıramıyor. Selects'i güncelleyin.",
    noGeneration: "Bu Selects sürümü uygulamalardan medya üretemiyor. Selects'i güncelleyin.",
    recent: "Tamamlanmamış işler", resume: "Devam et", dismiss: "Listeden kaldır", retry: "Tekrar dene", elapsed: "Geçen süre",
    noMusic: "Müzik oluşturulamadı; taslakta müzik yok.",
    errors: { FETCH_FAILED: "Bağlantı açılamadı.", NO_TEXT: "Bağlantıda metin bulunamadı. Metni yapıştırın.",
      TEXT_TOO_SHORT: "Kaynak metni çok kısa.", NO_JSON: "Yapay zekâ yanıtından senaryo okunamadı. Tekrar deneyin." },
  },
};

const enc = (s: string) => new TextEncoder().encode(s);
const dec = (b: any) => new TextDecoder().decode(b);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function bytesToB64(u: Uint8Array): string {
  let s = "";
  for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, Array.from(u.subarray(i, i + 0x8000)) as any);
  return btoa(s);
}
function extractJson(text: string): any {
  const s = String(text || "");
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fence ? fence[1] : s;
  const a = body.indexOf("{");
  const b = body.lastIndexOf("}");
  if (a < 0 || b <= a) throw new Error("NO_JSON");
  return JSON.parse(body.slice(a, b + 1));
}

function hostFs(): any {
  const fs = hostSdk.files;
  const need = ["readFile", "writeFile", "homedir", "exists", "mkdir", "readdir"];
  return fs && need.every((k) => typeof fs[k] === "function") ? fs : null;
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
// @operation-start
export const STYLE = {"name": "Tang Poetry Explainer", "style": "tang", "idiom": "Chinese historical mixed-media paper collage inspired by Tang mural and woodblock imagery, ink-wash mountains, cut-paper architecture and plum-blossom silhouettes", "palette": "imperial vermilion, warm ochre, aged cream, ink black and muted jade", "finish": "aged rice-paper fibres, woodblock print grain, torn-paper edges and soft physical paper shadows", "backgrounds": ["imperial deep-red paper", "warm ochre paper", "aged cream rice paper", "muted jade paper"], "music": "elegant Chinese historical documentary instrumental, gentle guqin plucks, breathy bamboo flute, soft restrained percussion, contemplative, no vocals", "story": "Explain the source through a clear historical or cultural narrative: establish the setting, show an exchange or change, then close on its meaning. Preserve quoted poetry exactly; never invent quotations, translations, names or dates. Do not insert Tang history when the supplied topic is different.", "pictures": "Use layered illustrated or woodblock cutouts with ink-wash landscape scraps, architecture, textile and paper objects appropriate to the source. Change the palette across imperial red, ochre, cream and muted jade. Anonymous historical crowds and stylized people are allowed when the source requires them; they must look illustrated, never like invented photographic evidence. Use one small blank red seal shape, no lettering. The headline is added once as editable type: never paint it into the illustration. Keep the top 23% and bottom 18% clear.", "summary": "Turn a link or text into a narrated historical collage film with ink-wash scenery, woodblock figures and editable titles.", "upstream": "https://github.com/Alisa0808/vox-director"};
// Windows engine port, step 1: engine.py's ffmpeg-only steps (media_duration, silences, sheet, ken_burns) as argv for
// the host's bundled ffmpeg (Runtime.runFFmpeg / runFFprobe): plain JS, no shell, nothing for the user to install.
// Each builder returns the argv engine.py passes (tests/vox_explainer.test.mjs compares them); the Ken Burns clip also
// gets -write_tmcd 0, so the mp4 has its one video stream only.
export const VOX_W = 1920, VOX_H = 1080, VOX_FPS = 24;
// The host's ffmpeg log (stderr) for one run, stopped after `timeoutMs`.
export async function voxFFmpegLog(args, timeoutMs = 180000) {
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), timeoutMs);
  let log = "";
  try {
    const r = await hostNeed("Runtime", "runFFmpeg").runFFmpeg(args, true, controller.signal, undefined, (text) => { log += text; });
    return String(r?.stderr || "") || log;
  } finally { clearTimeout(timer); }
}
// media_duration: a file's length in seconds; throws when ffprobe reports none.
export function voxDurationArgs(path) { return ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path]; }
export function voxParseDuration(stdout, path) {
  const t = String(stdout || "").trim(), v = Number(t);
  if (!t || !isFinite(v)) throw new Error("cannot read duration: " + path);
  return v;
}
export async function voxMediaDuration(path) {
  const r = await hostNeed("Runtime", "runFFprobe").runFFprobe(voxDurationArgs(path), true);
  return voxParseDuration(r?.stdout, path);
}
// silences: [start, end] pairs from silencedetect (end is null for a silence that runs to the end).
export function voxSilenceArgs(path) { return ["-hide_banner", "-nostats", "-i", path, "-af", "silencedetect=noise=-38dB:d=0.12", "-f", "null", "-"]; }
export function voxParseSilences(log) {
  const s = String(log || "");
  const starts = [...s.matchAll(/silence_start: ([\d.]+)/g)].map((m) => parseFloat(m[1]));
  const ends = [...s.matchAll(/silence_end: ([\d.]+)/g)].map((m) => parseFloat(m[1]));
  return starts.map((a, i) => [a, i < ends.length ? ends[i] : null]);
}
export async function voxSilences(path) { return voxParseSilences(await voxFFmpegLog(voxSilenceArgs(path))); }
// sheet: numbered contact sheets of up to 12 keyframes each. `fileOf(shot)` is the keyframe path, `destOf(n)` the
// n-th sheet's path, `font` a TTF for the shot labels (null: no labels, as engine.py does without its font).
export function voxSheetFont(windows) { return windows ? "C:\\Windows\\Fonts\\arial.ttf" : "/System/Library/Fonts/Supplemental/Arial.ttf"; }
// A path inside a filtergraph option: forward slashes, and the drive colon escaped.
export function voxFilterPath(p) { return String(p).replace(/\\/g, "/").replace(/:/g, "\\:"); }
// drawtext's fontfile value. An escaped colon (a Windows drive) is also quoted: the filtergraph parser removes one
// level of backslashes before drawtext reads its options, so C\:/... alone splits at the colon ("Invalid argument",
// found on Windows Staging). A path without a colon (macOS) stays as engine.py wrote it.
export function voxFontOption(font) { const p = voxFilterPath(font); return p.includes("\\:") ? `'${p}'` : p; }
export function voxSheetJobs(ids, fileOf, font, destOf) {
  const jobs = [];
  for (let part = 0; part < ids.length; part += 12) {
    const chunk = ids.slice(part, part + 12);
    const cols = chunk.length > 6 ? 4 : Math.max(1, Math.min(3, chunk.length));
    const args = [];
    let filt = "";
    chunk.forEach((sid, i) => {
      args.push("-i", fileOf(sid));
      const label = font ? `drawtext=fontfile=${voxFontOption(font)}:text='${sid}':x=8:y=8:fontsize=34:fontcolor=white:box=1:boxcolor=black@0.8:boxborderw=6,` : "";
      filt += `[${i}:v]scale=480:270,setsar=1,${label}pad=486:276:3:3:white[v${i}];`;
    });
    const layout = chunk.map((_, i) => `${(i % cols) * 486}_${Math.floor(i / cols) * 276}`).join("|");
    const stack = chunk.map((_, i) => `[v${i}]`).join("") + (chunk.length > 1 ? `xstack=inputs=${chunk.length}:layout=${layout}:fill=white` : "null");
    const dest = destOf(part / 12 + 1);
    jobs.push({ dest, shots: chunk, args: ["-loglevel", "error", "-y", ...args, "-filter_complex", filt + stack, "-frames:v", "1", "-q:v", "4", dest] });
  }
  return jobs;
}
// ken_burns: a pan-and-zoom clip of one keyframe over a blurred fill, `dur` seconds, 1080x1920 at 24 fps.
export function voxKenBurnsArgs(img, dest, dur, zoomIn = true) {
  const W = VOX_W, H = VOX_H, FPS = VOX_FPS, frames = Math.ceil(dur * FPS);
  const z = zoomIn ? "min(zoom+0.0009,1.18)" : "if(eq(on,1),1.18,max(zoom-0.0009,1.0))";
  const vf = `[0:v]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},boxblur=26:2,setsar=1[bg];` +
    `[0:v]scale=${W}:${H}:force_original_aspect_ratio=decrease,setsar=1[fg];` +
    `[bg][fg]overlay=(W-w)/2:(H-h)/2,setsar=1,scale=${W * 2}:${H * 2},` +
    `zoompan=z='${z}':d=${frames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${W}x${H}:fps=${FPS}[v]`;
  return ["-y", "-loglevel", "error", "-loop", "1", "-i", img, "-filter_complex", vf, "-map", "[v]", "-t", dur.toFixed(3), "-c:v", "libx264", "-pix_fmt", "yuv420p", "-write_tmcd", "0", dest];
}
// Windows engine port, step 2: the rest of engine.py (VERSION 2.1.0) in plain JS, so the build needs no Python and no
// shell on either OS. voxEngine(cmd, dir, args, io) answers what `engine.py <cmd> <dir> <args>` printed; `io` carries the
// file, ffmpeg and network access (voxHostIO in the panel, stubs in the tests). tests/vox_explainer_engine.test.mjs
// runs both engines on the same inputs and compares every answer and file. Python semantics kept on purpose: lengths
// and slices count code points, round() is half-even on exact ties, \d and \w are Unicode-aware, str.split() and
// truthiness follow Python.
export const VOX_VERSION = "2.1.0";
export const VOX_MODEL = {
  t2i: "model_v1_ZmFsLWFpL25hbm8tYmFuYW5hLTI",
  edit: "model_v1_ZmFsLWFpL25hbm8tYmFuYW5hLTIvZWRpdA",
  i2v: "model_v1_ZmFsLWFpL2tsaW5nLXZpZGVvL3YzL3Byby9pbWFnZS10by12aWRlbw",
  tts: "model_v1_ZmFsLWFpL2VsZXZlbmxhYnMvdHRzL2VsZXZlbi12Mw",
  music: "model_v1_ZmFsLWFpL2VsZXZlbmxhYnMvbXVzaWM",
};
const VOX_LEAD = 0.15, VOX_TAIL = 0.35, VOX_END_HOLD = 2.3;
const VOX_VOICE = "Alice";
const VOX_MUSIC_PROMPT = STYLE.music;
export const VOX_LANG = {
  ko: { name: "Korean", cjk: true, rate: 5.35, cap: 16, cap_max: 18, head: 12, head_max: 16, style: "formal \ud569\ub2c8\ub2e4\uccb4 news tone", photos: "\uc778\ubb3c \uc0ac\uc9c4", pd: "\ud37c\ube14\ub9ad \ub3c4\uba54\uc778", source: "\ucd9c\ucc98" },
  ja: { name: "Japanese", cjk: true, rate: 7.0, cap: 16, cap_max: 18, head: 12, head_max: 16, style: "polite \u3067\u3059\u30fb\u307e\u3059 news tone", photos: "\u4eba\u7269\u5199\u771f", pd: "\u30d1\u30d6\u30ea\u30c3\u30af\u30c9\u30e1\u30a4\u30f3", source: "\u51fa\u5178" },
  zh: { name: "Chinese (in the source's script)", cjk: true, rate: 4.5, cap: 14, cap_max: 16, head: 10, head_max: 14, style: "neutral news tone", photos: "\u4eba\u7269\u7167\u7247", pd: "\u516c\u6709\u9886\u57df", source: "\u6765\u6e90" },
  en: { name: "English", cjk: false, rate: 4.0, wps: 1.95, cap: 32, cap_max: 36, head: 24, head_max: 28, style: "neutral news tone", photos: "Photos", pd: "public domain", source: "Source" },
  de: { name: "German", cjk: false, rate: 3.8, wps: 1.65, cap: 32, cap_max: 36, head: 24, head_max: 28, style: "neutral news tone", photos: "Fotos", pd: "gemeinfrei", source: "Quelle" },
  es: { name: "Spanish", cjk: false, rate: 5.0, wps: 2.1, cap: 32, cap_max: 36, head: 24, head_max: 28, style: "neutral news tone", photos: "Fotos", pd: "dominio p\u00fablico", source: "Fuente" },
  fr: { name: "French", cjk: false, rate: 4.6, wps: 2.1, cap: 32, cap_max: 36, head: 24, head_max: 28, style: "neutral news tone", photos: "Photos", pd: "domaine public", source: "Source" },
  it: { name: "Italian", cjk: false, rate: 4.8, wps: 2.1, cap: 32, cap_max: 36, head: 24, head_max: 28, style: "neutral news tone", photos: "Foto", pd: "pubblico dominio", source: "Fonte" },
  pt: { name: "Portuguese", cjk: false, rate: 4.6, wps: 2.0, cap: 32, cap_max: 36, head: 24, head_max: 28, style: "neutral news tone", photos: "Fotos", pd: "dom\u00ednio p\u00fablico", source: "Fonte" },
  tr: { name: "Turkish", cjk: false, rate: 4.4, wps: 1.65, cap: 32, cap_max: 36, head: 24, head_max: 28, style: "neutral news tone", photos: "Foto\u011fraflar", pd: "kamu mal\u0131", source: "Kaynak" },
};
const VOX_STOPWORDS = {
  en: "the and of to in is that for on with as was by it from at are be this have has said",
  de: "der die und das ist nicht mit den von zu ein eine auf f\u00fcr sich dem des im auch wird",
  es: "el la de que y en los las del se por un una con para es su al lo como m\u00e1s",
  fr: "le la les de des et est une un du en dans que pour sur au par pas plus avec qui",
  it: "il la di che e \u00e8 un una per del della con non sono le gli nel alla anche pi\u00f9",
  pt: "o a de que e do da em um uma para com n\u00e3o os as dos das no na por mais",
  tr: "ve bir bu da de i\u00e7in ile olarak \u00e7ok daha gibi ama olan en ne de\u011fil kadar sonra",
};
const VOX_THEME = { idiom: STYLE.idiom, palette: STYLE.palette, finish: STYLE.finish };
const VOX_MECHANICS = "Clearly layered hand-cut paper cut-outs with visible torn and scissor-cut edges, tape " +
  "corners and soft real paper drop shadows, on a bold flat {bg} paper background. Halftone " +
  "print dots, unprinted paper scraps with no newspaper or printed lettering, paper-stencil shapes, aged paper texture, slight " +
  "print misregistration, scattered geometric paper accents (triangles, circles, zigzags, " +
  "washi tape). Figures are PRINTED / illustrated cut-outs, NOT CGI, NOT a 3D render \u2014 keep " +
  "print grain and paper imperfections. High-contrast, punchy, tactile, hand-assembled.";
const VOX_NO_PEOPLE = " NO people, NO faces, NO human figures and NO photographs of people anywhere " +
  "(a paper hand, or faceless paper silhouettes, only if the SCENE asks for them). A named " +
  "country, company or institution is shown by an unlabeled flag or object only \u2014 never add a " +
  "portrait, photo or drawing of a leader, politician or any other person for it.";
const VOX_FACE_GUARD = " Halftone dots and print textures live on the BACKGROUND and paper only, never on " +
  "faces. The ONLY people in the image are the attached ones \u2014 no extra people. Every " +
  "face gets the same photographic treatment at a similar scale; never draw any face " +
  "as a cartoon or caricature. Every label named next to a person sits right next to " +
  "that person.";
const VOX_TEXT_GUARD = " No readable text, letters, numbers, subtitles, logos or watermarks in the image. All meaningful words are added later as editable graphics.";
const VOX_LAYOUT_GUARD = " Leave the top 23% and bottom 18% calm and clear for separate titles and captions. Keep important objects and faces in the middle band. No title banner or duplicated headline.";
const VOX_FACE_LOCK = "The attached photos are real people ({who}). Cut each person's face and hair out as a " +
  "PHOTOGRAPHIC sticker with a torn white paper border and place them in the scene \u2014 keep " +
  "each facial identity, features and expression from their photo pixel-faithful; do not " +
  "redraw, repaint, swap or stylize any face; NO halftone dots, print texture or ink treatment " +
  "on faces or hair. All poses and gestures are expressed by the bodies only. From the neck " +
  "down each body is a hand-drawn paper-doll illustration jointed like a vintage paper puppet " +
  "with visible cut edges, FULLY CLOTHED ({clothes}). ";
const VOX_FREEZE = "FREEZE every photographic face sticker \u2014 frozen layers, pixel-identical to the still " +
  "for the entire duration; never redraw, warp, re-time or animate the faces; the " +
  "paper-doll bodies may shift slightly at their joints. ";
const VOX_CAMERA = {
  static: "a locked-off static camera (no camera move)",
  push_in: "one very slow smooth push-in (uniform scale-up, Ken-Burns)",
  pull_out: "one slow smooth pull-out (uniform scale-down) revealing the full scene",
  pan: "one slow horizontal pan across the frame (flat translate, no perspective shift)",
  parallax: "a gentle multi-layer parallax drift (paper layers moving at slightly different speeds), the camera otherwise steady",
};
const VOX_CAST_CAMERAS = ["push_in", "parallax", "static"];
const VOX_AMPLITUDE = { calm: "subtle, restrained amplitude", punchy: "lively, energetic amplitude with clear, bold movement" };
const VOX_PALETTE_BG = STYLE.backgrounds;
export const VOX_UA_BROWSER = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36";
export const VOX_UA_API = "SelectsVoxExplainer/2.0 (+https://tryselects.com)";

class VoxEngineError extends Error {}
const voxFail = (m) => new VoxEngineError(m);

// ---- Python semantics ----
// Code points, as Python's len() and slices count them.
const pyChars = (s) => Array.from(String(s));
const pyLen = (s) => pyChars(s).length;
const pySlice = (s, a, b) => pyChars(s).slice(a, b).join("");
// str.split() with no argument: runs of whitespace, no empty parts.
const pySplit = (s) => String(s).split(/[\s\x1c-\x1f\x85]+/u).filter(Boolean);
const pyStrip = (s) => String(s).replace(/^[\s\x1c-\x1f\x85]+|[\s\x1c-\x1f\x85]+$/gu, "");
const pyRstrip = (s, chars) => { const c = pyChars(s); while (c.length && chars.includes(c[c.length - 1])) c.pop(); return c.join(""); };
// Python truthiness and str() for the values JSON can carry.
const pyTrue = (v) => !(v === undefined || v === null || v === false || v === 0 || v === "" ||
  (Array.isArray(v) && !v.length) || (typeof v === "object" && !Array.isArray(v) && v && !Object.keys(v).length));
function pyStr(v) {
  if (v === undefined || v === null) return "None";
  if (v === true) return "True";
  if (v === false) return "False";
  if (typeof v === "number") return Number.isInteger(v) && !Object.is(v, -0) ? String(v) : String(v);
  if (typeof v === "string") return v;
  return JSON.stringify(v);
}
// Iterating a value as Python's `for x in v` would (a string yields its characters).
const pyIter = (v) => (typeof v === "string" ? pyChars(v) : Array.isArray(v) ? v : v && typeof v === "object" ? Object.keys(v) : []);
// round(x, n): correctly rounded, half to even on an exact tie (the double sits exactly halfway).
export function pyRound(x, n = 0) {
  const tie = x * 2 ** (n + 1);
  if (Number.isInteger(tie) && Math.abs(tie) % 2 === 1 && Math.abs(tie) < 2 ** 52) {
    const k = Math.floor(x * 10 ** n);
    return (k % 2 === 0 ? k : k + 1) / 10 ** n;
  }
  return Number(x.toFixed(n));
}
const reEscape = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// urllib.parse.quote (safe "/") and urlencode (quote_plus).
const pyQuote = (s, safe = "/") => Array.from(new TextEncoder().encode(String(s))).map((b) => {
  const c = String.fromCharCode(b);
  return /[A-Za-z0-9_.\-~]/.test(c) || safe.includes(c) ? c : "%" + b.toString(16).toUpperCase().padStart(2, "0");
}).join("");
const pyUrlencode = (o) => Object.entries(o).map(([k, v]) => pyQuote(k, "").replace(/%20/g, "+") + "=" + pyQuote(String(v), " ").replace(/ /g, "+")).join("&");

// ---- html.unescape: the panel's own HTML parser decodes every named entity; node tests use the common ones ----
const VOX_ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: "\u00a0", middot: "\u00b7", hellip: "\u2026",
  lsquo: "\u2018", rsquo: "\u2019", ldquo: "\u201c", rdquo: "\u201d", ndash: "\u2013", mdash: "\u2014", copy: "\u00a9" };
export function voxUnescape(s) {
  s = String(s || "");
  if (!s.includes("&")) return s;
  try {
    if (typeof document !== "undefined" && document.createElement) {
      const t = document.createElement("textarea");
      t.innerHTML = s;
      return t.value;
    }
  } catch { /* the small table below */ }
  return s.replace(/&(#[0-9]+|#[xX][0-9a-fA-F]+|[A-Za-z][A-Za-z0-9]*);?/g, (m, e) => {
    if (e[0] === "#") {
      const n = /^#[xX]/.test(e) ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return n > 0 && n <= 0x10ffff && !(n >= 0xd800 && n <= 0xdfff) ? String.fromCodePoint(n) : "\ufffd";
    }
    return Object.prototype.hasOwnProperty.call(VOX_ENTITIES, e) ? VOX_ENTITIES[e] : m;
  });
}

// ---- Small helpers ----
export const voxStripTags = (s) => pyStrip(voxUnescape(String(s || "").replace(/<[^>]+>/g, " ")).replace(/\s+/gu, " "));
export const voxNormWords = (text) => pySplit(text).map((w) => w.replace(/[.,!?'"\u201c\u201d\u2018\u2019\u00b7\u2026()\u3002\u3001\uff0c\uff01\uff1f\u300c\u300d]/gu, ""));

// ---- Language ----
export function voxDetectLang(text) {
  const t = pySlice(text, 0, 5000);
  const count = (re) => (t.match(re) || []).length;
  if (count(/[\uac00-\ud7a3]/gu) > 20) return "ko";
  if (count(/[\u3040-\u30ff]/gu) > 20) return "ja";
  if (count(/[\u4e00-\u9fff]/gu) > 40) return "zh";
  const words = t.toLowerCase().match(/[a-z\u00e0-\u00ff\u011f\u00fc\u015f\u0131\u00f6\u00e7]+/gu) || [];
  let best = null, top = -1;
  for (const [k, v] of Object.entries(VOX_STOPWORDS)) {
    const set = new Set(v.split(" "));
    const n = words.filter((w) => set.has(w)).length;
    if (n > top) { best = k; top = n; }
  }
  return top > 3 ? best : "en";
}
export function voxWordWeight(w, lang) {
  const digits = (w.match(/\p{Nd}/gu) || []).length;
  if (VOX_LANG[lang].cjk) {
    const cjk = (w.match(/[\uac00-\ud7a3\u3040-\u30ff\u4e00-\u9fff]/gu) || []).length;
    const latin = w.match(/[A-Za-z]+/g) || [];
    let lat = 0;
    for (const x of latin) lat += x.length * (/^[A-Z]+$/.test(x) ? 1.5 : 0.5);
    return Math.max(0.5, cjk + digits * 1.5 + lat);
  }
  const groups = (w.match(/[aeiouy\u00e0\u00e1\u00e2\u00e4\u00e3\u00e5\u00e8\u00e9\u00ea\u00eb\u00ec\u00ed\u00ee\u00ef\u00f2\u00f3\u00f4\u00f6\u00f5\u00f9\u00fa\u00fb\u00fc\u0131AEIOUY]+/gu) || []).length;
  const bare = w.replace(/[^\p{L}\p{N}_]/gu, "");
  const caps = /^[A-Z]{2,5}$/.test(bare) ? pyLen(w) : 0; // acronyms read letter by letter
  return Math.max(1.0, groups, caps) + digits * 1.2;
}
export function voxSpeechSeconds(text, lang) {
  let s = 0;
  for (const w of pySplit(text)) s += voxWordWeight(w, lang);
  return s / VOX_LANG[lang].rate;
}
export function voxBudget(target, lang) {
  const nb = Math.max(3, Math.min(10, pyRound(target / 8.0)));
  const speak = Math.max(8.0, target - VOX_END_HOLD - nb * (VOX_LEAD + VOX_TAIL));
  const L = VOX_LANG[lang];
  if (L.cjk) return { beats: nb, unit: lang !== "ko" ? "characters" : "syllables", count: pyRound(speak * L.rate) };
  return { beats: nb, unit: "words", count: pyRound(speak * L.wps) };
}

// ---- Job folder ----
// The job is the folder's job.json; `p(...parts)` is a path inside it with its folders made.
async function voxJob(io, dir) {
  const path = io.join(dir, "job.json");
  const data = await io.readJson(path, null);
  if (!pyTrue(data)) throw voxFail("job.json missing in " + dir);
  for (const parts of [[], ["portraits"], ["check"], ["gen", "kenburns"]]) await io.mkdir(io.join(dir, ...parts));
  const job = {
    dir, path, data, id: data.id,
    p: (...parts) => { const d = io.join(dir, ...parts.slice(0, -1)); return io.join(d, parts[parts.length - 1]); },
    save: async () => { data.updated = new Date(io.now() * 1000).toISOString().slice(0, 19) + "Z"; await io.writeJson(path, data); },
    plan: async () => { const p = await io.readJson(io.join(dir, "plan.json"), null); if (!pyTrue(p)) throw voxFail("plan.json missing"); return p; },
    gen: async () => (await io.readJson(io.join(dir, "gen.json"), {})) || {},
    file: async (key) => { const g = (await job.gen())[key] || {}; const p = g.path; return pyTrue(p) && await io.exists(p) ? p : null; },
  };
  return job;
}
const voxShots = (plan) => plan.beats.flatMap((b) => b.shots.map((s) => [b, s]));

// ---- fetch ----
function voxMeta(s, prop) {
  const p = reEscape(prop);
  const m = new RegExp(`<meta[^>]+(?:property|name)=["']${p}["'][^>]+content=["']([^"']*)`).exec(s) ||
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${p}["']`).exec(s);
  return m ? pyStrip(voxUnescape(m[1])) : "";
}
function voxKoreanName(n) {
  const m = /^([\uac00-\ud7a3]{1,3}) ([\uac00-\ud7a3]{1,2})$/.exec(pyStrip(n || ""));
  return m ? m[2] + m[1] : n;
}
const pyGet = (o, k) => (o && typeof o === "object" && !Array.isArray(o) ? o[k] : undefined);
export function voxExtractArticle(url, s) {
  const t = /<title>(.*?)<\/title>/s.exec(s);
  const title = voxMeta(s, "og:title") || voxStripTags(t ? t[1] : "");
  const art = { url, title, subtitle: "", description: voxMeta(s, "og:description"), source: voxMeta(s, "og:site_name"),
    date: voxMeta(s, "article:published_time"), byline: voxMeta(s, "author") || voxMeta(s, "dable:author"), body: "", method: "" };
  const m = /Fusion\.globalContent\s*=\s*(\{.*?\});\s*Fusion\./s.exec(s); // Arc XP (Chosun and others)
  if (m) {
    let d = null;
    try { d = JSON.parse(m[1]); } catch { d = null; }
    if (d !== null) {
      const paras = pyIter(pyGet(d, "content_elements") || []).filter((e) => pyGet(e, "type") === "text").map((e) => voxStripTags(pyGet(e, "content") || ""));
      if (paras.length) {
        art.body = paras.filter(Boolean).join("\n");
        art.title = pyGet(pyGet(d, "headlines") || {}, "basic") || art.title;
        art.subtitle = voxStripTags(String(pyGet(pyGet(d, "subheadlines") || {}, "basic") || "").replace(/<br\s*\/?>/g, " / "));
        const by = pyIter(pyGet(pyGet(d, "credits") || {}, "by") || []).filter((c) => pyTrue(pyGet(c, "name"))).map((c) => voxKoreanName(c.name));
        if (by.length) art.byline = by.join(", ");
        art.date = pyGet(d, "display_date") || pyGet(d, "first_publish_date") || art.date;
        art.method = "arc";
      }
    }
  }
  for (const bm of s.matchAll(/<script[^>]+application\/ld\+json[^>]*>(.*?)<\/script>/gs)) { // JSON-LD
    let d;
    try { d = JSON.parse(pyStrip(bm[1])); } catch { continue; }
    const items = Array.isArray(d) ? d : d && typeof d === "object" ? (d["@graph"] !== undefined ? d["@graph"] : [d]) : [];
    for (const it of pyIter(items)) {
      if (!(it && typeof it === "object" && !Array.isArray(it) && pyStr(it["@type"] !== undefined ? it["@type"] : "").includes("Article"))) continue;
      const pub = it.publisher;
      if (pub && typeof pub === "object" && !Array.isArray(pub) && pyTrue(pub.name) && !art.source) art.source = pub.name;
      art.date = art.date || it.datePublished || "";
      art.description = art.description || voxStripTags(it.description || "");
      const a = it.author;
      const names = (Array.isArray(a) ? a : [a]).filter((x) => x && typeof x === "object" && !Array.isArray(x)).map((x) => (x.name !== undefined ? x.name : ""));
      if (names.some(pyTrue) && !art.byline) art.byline = names.filter(pyTrue).join(", ");
      if (pyTrue(it.articleBody) && !art.body) {
        art.body = voxStripTags(it.articleBody);
        art.title = it.headline || art.title;
        art.method = "jsonld";
      }
    }
  }
  if (!art.body) {
    const sc = /<article[^>]*>(.*?)<\/article>/s.exec(s);
    const scope = sc ? sc[1] : s;
    const paras = [...scope.matchAll(/<p[^>]*>(.*?)<\/p>/gs)].map((x) => voxStripTags(x[1]));
    art.body = paras.filter((p) => pyLen(p) > 40 && !/^(Share|Save|Advertisement|Related)\b/.test(p)).join("\n");
    art.method = "paragraphs";
  }
  art.body = pySlice(art.body, 0, 20000);
  art.lang = voxDetectLang(art.title + " " + art.body);
  return art;
}
async function voxCmdFetch(io, job) {
  const inp = job.data.input;
  let art;
  if (pyGet(inp, "kind") === "text") {
    const text = pyStrip(inp.text !== undefined ? inp.text : "");
    if (pyLen(text) < 80) throw voxFail("TEXT_TOO_SHORT");
    const lines = text.split(/\r\n|[\n\r\v\f\x1c-\x1e\x85\u2028\u2029]/u).map(pyStrip).filter(Boolean);
    art = { url: "", title: pySlice(lines[0], 0, 120), subtitle: "", description: "", source: "", date: "", byline: "",
      body: pySlice(text, 0, 20000), method: "text", lang: voxDetectLang(text) };
  } else {
    const url = pyStrip(pyGet(inp, "url") !== undefined ? inp.url : "");
    const r = await voxHttp(io, url, VOX_UA_BROWSER, 30);
    if (r.code >= 300) throw voxFail("FETCH_FAILED");
    art = voxExtractArticle(url, r.text);
    if (pyLen(art.body) < 200) throw voxFail("NO_TEXT");
  }
  await io.writeJson(job.p("article.json"), art);
  Object.assign(job.data, { stage: "fetched", lang: art.lang });
  await job.save();
  const L = VOX_LANG[art.lang];
  return { ok: true, title: art.title, chars: pyLen(art.body), method: art.method, lang: art.lang, language: L.name, style: L.style,
    sourceLabel: L.source, budget: voxBudget(job.data.target !== undefined ? job.data.target : 55, art.lang), captionChars: L.cap, headlineChars: L.head };
}

// ---- validate ----
export function voxAutoCaptions(text, maxc) {
  const lines = [];
  let cur = [];
  for (const w of pySplit(text)) {
    if (cur.length && pyLen([...cur, w].join(" ")) > maxc) { lines.push(cur.join(" ")); cur = []; }
    cur.push(w);
    if (/[.,!?\u3002\u3001\uff0c\uff01\uff1f]$/u.test(w) && pyLen(cur.join(" ")) >= maxc * 0.4) { lines.push(cur.join(" ")); cur = []; }
  }
  if (cur.length) lines.push(cur.join(" "));
  return lines.map((l) => pyRstrip(l, ",."));
}
const voxKey = (v) => pyStr(v).toLowerCase().replace(/[^a-z0-9_]/g, "");
async function voxCmdValidate(io, job) {
  const plan = await job.plan();
  const lang = job.data.lang !== undefined ? job.data.lang : "en";
  const L = VOX_LANG[lang];
  const warn = [], err = [], cast = {};
  if (STYLE.style === "tang") plan.cast = [];
  for (const c of pyIter(pyTrue(plan.cast) ? plan.cast : [])) {
    const key = voxKey(pyGet(c, "key") !== undefined ? c.key : "");
    if (key && pyTrue(pyGet(c, "name"))) cast[key] = { key, name: pyStr(c.name), wiki: pyStr(pyTrue(c.wiki) ? c.wiki : c.name), wardrobe: pyStr(pyTrue(c.wardrobe) ? c.wardrobe : "a dark suit and white shirt") };
  }
  const beats = [];
  let prevCam = null;
  pyIter(pyTrue(plan.beats) ? plan.beats : []).forEach((b, bi) => {
    const narr = pyStrip(pyStr(pyGet(b, "narration") !== undefined ? b.narration : "").replace(/\s+/gu, " "));
    if (!narr) return;
    const head = [b.headline, b.title_ko, b.title].find(pyTrue);
    const title = pySlice(pyStrip(pyStr(head !== undefined ? head : "")), 0, L.head_max);
    let caps = pyIter(pyTrue(b.captions) ? b.captions : []).map((x) => pyStrip(pyStr(x))).filter(Boolean);
    // LESSON: automatic line breaks split names; the AI breaks lines, this checks them
    if (voxNormWords(caps.join(" ")).join("") !== voxNormWords(narr).join("") || caps.some((c) => pyLen(c) > L.cap_max)) {
      if (caps.length) warn.push(`beat ${bi + 1} captions re-broken`);
      caps = voxAutoCaptions(narr, L.cap);
    }
    let shots = [];
    for (const s of pyIter(pyTrue(b.shots) ? b.shots : []).slice(0, 2)) {
      const scene = pyStrip(pyStr(pyGet(s, "scene") !== undefined ? s.scene : ""));
      if (!scene) continue;
      const sc = pyIter(pyTrue(s.cast) ? s.cast : []).map(voxKey).filter((k) => Object.prototype.hasOwnProperty.call(cast, k)).slice(0, 4);
      let cam = pyStr([s.camera, s.camera_move].find(pyTrue) !== undefined ? [s.camera, s.camera_move].find(pyTrue) : "push_in");
      cam = Object.prototype.hasOwnProperty.call(VOX_CAMERA, cam) ? cam : "push_in";
      if (sc.length && !VOX_CAST_CAMERAS.includes(cam)) cam = "parallax";
      if (cam === prevCam) cam = (sc.length ? VOX_CAST_CAMERAS : ["push_in", "parallax", "pan", "pull_out"]).filter((c) => c !== prevCam)[0]; // LESSON: neighbouring shots never repeat a camera move
      prevCam = cam;
      const motion = [s.element_motion, s.motion].find(pyTrue);
      shots.push({ id: `${beats.length + 1}${"ab"[shots.length]}`, scene,
        motion: pyStr(motion !== undefined ? motion : "one or two paper elements slide gently; halftone dots pulse"),
        camera: cam, cast: sc, has_text: /['"\u201c\u2018]/.test(scene) });
    }
    if (!shots.length) { err.push(`beat ${bi + 1} has no usable shot`); return; }
    const words = voxNormWords(narr);
    let cut = null;
    if (shots.length === 2) {
      const cw = voxNormWords(pyStr(pyTrue(b.cut_word) ? b.cut_word : ""));
      const idx = words.map((w, i) => i).filter((i) => cw.length && words[i] === cw[0] && i > 0);
      cut = idx.length ? idx[0] : null;
      if (cut === null) { // the middle of the narration by speech length
        const total = voxSpeechSeconds(narr, lang);
        let acc = 0.0;
        const ws = pySplit(narr);
        for (let i = 0; i < ws.length; i++) {
          acc += voxWordWeight(ws[i], lang) / L.rate;
          if (acc >= total / 2 && 0 < i + 1 && i + 1 < words.length) { cut = i + 1; break; }
        }
      }
      const parts = pySplit(narr);
      if (cut === null || voxSpeechSeconds(parts.slice(0, cut).join(" "), lang) < 1.5 || voxSpeechSeconds(parts.slice(cut).join(" "), lang) < 1.5) {
        shots = shots.slice(0, 1);
        cut = null;
      }
    }
    beats.push({ n: beats.length + 1, title, narration: narr, captions: caps,
      graphic: ["document", "comparison", "timeline", "stat"].includes(b.graphic) ? b.graphic : "document",
      evidence: (Array.isArray(b.evidence) ? b.evidence : []).slice(0,3).map(x => pySlice(String(x),0,90)),
      bg: pyStr(pyTrue(b.bg) ? b.bg : VOX_PALETTE_BG[beats.length % VOX_PALETTE_BG.length]), shots, cut_index: cut });
  });
  if (!beats.length) err.push("no beats");
  else beats[beats.length - 1].shots[beats[beats.length - 1].shots.length - 1].camera = "static"; // the payoff lands on a still frame
  const used = new Set(beats.flatMap((b) => b.shots.flatMap((s) => s.cast)));
  const norm = { version: VOX_VERSION, lang, title: pySlice(pyStr(pyTrue(plan.title) ? plan.title : ""), 0, 60),
    source_line: pySlice(pyStr(pyTrue(plan.source_line) ? plan.source_line : ""), 0, 140),
    cast: Object.keys(cast).filter((k) => used.has(k)).map((k) => cast[k]), beats };
  await io.writeJson(job.p("plan.json"), norm);
  job.data.stage = !err.length ? "planned" : "plan_error";
  await job.save();
  let shotsN = 0, est = 0;
  for (const b of beats) shotsN += b.shots.length;
  for (const b of beats) est += VOX_LEAD + voxSpeechSeconds(b.narration, lang) + VOX_TAIL;
  est += VOX_END_HOLD;
  return { ok: !err.length, errors: err, warnings: warn, lang, seconds: pyRound(est, 1), beats: beats.length, shots: shotsN, people: norm.cast.map((c) => c.name) };
}

// ---- portraits ----
const VOX_LICENSE_OK = /public domain|^pd\b|cc0|cc[- ]by(-sa)?[- ]?\d/i;
const VOX_LICENSE_BAD = /\bnc\b|\bnd\b|non-?commercial|no ?deriv/i;
// http_get: {code, text} for any HTTP answer; a request that never got one is engine.py's NETWORK error.
async function voxHttp(io, url, ua, timeout) {
  try { return await io.http(url, ua, timeout); } catch (e) { throw voxFail("NETWORK " + ((e && e.message) || e)); }
}
async function voxDownload(io, url, dest, ua, timeout) {
  try { return await io.download(url, dest, ua, timeout); } catch (e) { throw voxFail("NETWORK " + ((e && e.message) || e)); }
}
async function voxGetJson(io, url) {
  const r = await voxHttp(io, url, VOX_UA_API, 40);
  try { return JSON.parse(r.text); } catch { return {}; }
}
const pyValues = (o) => (o && typeof o === "object" && !Array.isArray(o) ? Object.values(o) : []);
async function voxWikiPortrait(io, title, dest) {
  const d = await voxGetJson(io, "https://en.wikipedia.org/w/api.php?" + pyUrlencode({ action: "query", prop: "pageimages", piprop: "original|name", titles: title, format: "json", redirects: 1 }));
  const pages = pyValues(pyGet(pyGet(d || {}, "query") || {}, "pages") || {});
  const name = pages.length ? pyGet(pages[0], "pageimage") : null;
  if (!pyTrue(name)) return { ok: false, error: "no lead image" };
  const m = await voxGetJson(io, "https://commons.wikimedia.org/w/api.php?" + pyUrlencode({ action: "query", titles: "File:" + name, prop: "imageinfo", iiprop: "extmetadata", format: "json" }));
  const cp = pyValues(pyGet(pyGet(m || {}, "query") || {}, "pages") || {});
  const em = cp.length ? (pyGet((pyGet(cp[0], "imageinfo") || [{}])[0], "extmetadata") || {}) : {};
  const lic = pyGet(pyGet(em, "LicenseShortName") || {}, "value") || "";
  if (!VOX_LICENSE_OK.test(lic) || VOX_LICENSE_BAD.test(lic)) return { ok: false, file: name, license: lic };
  const artist = pySlice(voxStripTags(pyGet(pyGet(em, "Artist") || {}, "value") || "").replace(/^(Photographer|Photo|Author)\s*:\s*/i, ""), 0, 60);
  const code = await voxDownload(io, "https://commons.wikimedia.org/w/index.php?title=Special:Redirect/file/" + pyQuote(name) + "&width=900", dest, VOX_UA_API, 60);
  if (code >= 300) return { ok: false, file: name, error: "download " + code };
  return { ok: true, file: name, license: lic, artist };
}
async function voxCmdPortraits(io, job) {
  const plan = await job.plan();
  if (job.data.portraits === undefined) job.data.portraits = {};
  const portraits = job.data.portraits;
  for (const c of plan.cast) {
    if (!(c.key in portraits)) {
      let r;
      try { r = await voxWikiPortrait(io, c.wiki, job.p("portraits", `${c.key}.jpg`)); } catch (e) {
        if (!(e instanceof VoxEngineError)) throw e;
        r = { ok: false, error: e.message };
      }
      portraits[c.key] = { ...r, name: c.name };
    }
  }
  // A person without a free photo becomes a faceless paper silhouette with a name card; the image model must never
  // draw a real person's likeness from memory.
  const missing = new Set(Object.keys(portraits).filter((k) => !pyTrue(portraits[k].ok)));
  for (const [, s] of voxShots(plan)) {
    for (const k of s.cast.filter((k) => missing.has(k))) {
      const name = plan.cast.find((c) => c.key === k).name;
      const parts = pySplit(name);
      s.scene = s.scene.split(name).join(`a faceless paper silhouette with a name card '${parts[parts.length - 1].toUpperCase()}'`);
      s.cast.splice(s.cast.indexOf(k), 1);
    }
  }
  await io.writeJson(job.p("plan.json"), plan);
  job.data.stage = "portraits";
  await job.save();
  return { ok: true, found: Object.keys(portraits).filter((k) => !missing.has(k)).sort(), missing: [...missing].sort().map((k) => portraits[k].name) };
}

// ---- generation requests for the panel ----
const pyFormat = (tpl, vals) => tpl.replace(/\{(\w+)\}/g, (_, k) => vals[k]);
export function voxKeyframePrompt(plan, beat, shot) {
  const world = `${STYLE.pictures} ${VOX_THEME.idiom} Palette: ${VOX_THEME.palette}. ${pyFormat(VOX_MECHANICS, { bg: beat.bg })} Print finish: ${VOX_THEME.finish}. SCENE (as layered paper cut-outs): ${shot.scene}. No big headline in ` +
    "this shot (a small accent only); it is a cut-in detail. Aspect ratio 16:9.";
  if (shot.cast.length) {
    const cast = Object.fromEntries(plan.cast.map((c) => [c.key, c]));
    const who = shot.cast.map((k, i) => `image ${i + 1} is ${cast[k].name}`).join("; ");
    const clothes = shot.cast.map((k) => `${cast[k].name} wears ${cast[k].wardrobe}`).join("; ");
    return pyFormat(VOX_FACE_LOCK, { who, clothes }) + world + VOX_FACE_GUARD + VOX_TEXT_GUARD + VOX_LAYOUT_GUARD;
  }
  return world + (STYLE.style === "tang" ? " Illustrations are artistic reconstructions, not archival photographs." : VOX_NO_PEOPLE) + VOX_TEXT_GUARD + VOX_LAYOUT_GUARD;
}
export function voxMotionPrompt(beat, shot) {
  const amp = shot.has_text ? "calm" : "punchy"; // LESSON: busy motion garbled text and bent props
  const textLock = shot.has_text ? "Keep every printed word sharp, legible and stable \u2014 do not warp or wobble the lettering. " : "";
  const guard = (shot.cast.length ? VOX_FREEZE : "") + textLock +
    "Keep the layout stable. Stay flat 2D \u2014 no 3D rotation, no perspective change, camera parallel " +
    "to the poster. ONE continuous move that does not loop, retract or reset. Rigid paper \u2014 no " +
    "morph/melt; straight posts and poles stay straight and upright. Animate the motion only; don't " +
    "re-render the picture.";
  return pySlice("Animate this still into a mixed-media paper-collage MOTION GRAPHIC, printed cut-outs, not " +
    `photoreal.\nCAMERA (one move only): ${VOX_CAMERA[shot.camera]}.\nELEMENT MOTION (${VOX_AMPLITUDE[amp]}): ${shot.motion}. Elements move as paper cut-outs ` +
    "(slide, flap, hinge, pop).\nAESTHETIC: keep the torn-paper, tape, halftone, unprinted paper and " +
    `paper-stencil textures and the bold flat background.\nCOLOR: ${beat.bg}, high contrast.\nCONSTRAINTS: ${guard}`, 0, 2500);
}
// Shortest Kling length that covers the shot (it returns duration + 0.04 s; min 3, max 15).
export const voxKlingSeconds = (need) => Math.trunc(Math.min(15, Math.max(3, Math.ceil(need + 0.05))));
async function voxCmdRequests(io, job, kind, only, attempt) {
  const plan = await job.plan();
  const reqs = [];
  const spec = (k, sid, tool, model, inp, uploads = null, folder = kind) => ({
    key: sid ? `${job.id}-${k}-${sid}-${attempt}` : `${job.id}-${k}-${attempt}`,
    gen: sid ? `${k}:${sid}` : k, id: sid, attempt, tool, modelId: VOX_MODEL[model], input: inp, uploads: uploads || {},
    outputName: sid ? `${job.id}_${k}_${sid}_${attempt}` : `${job.id}_${k}_${attempt}`, folder: io.join(job.dir, "gen", folder),
  });
  if (kind === "narration") {
    const lang = plan.lang;
    for (const b of plan.beats) if (!only || only.has(String(b.n)))
      reqs.push(spec("narr", String(b.n), "audio", "tts", { text: b.narration, voice: VOX_VOICE, language_code: lang, stability: 0.5 }));
  } else if (kind === "keyframes") {
    for (const [b, s] of voxShots(plan)) {
      if (only && !only.has(s.id)) continue;
      const inp = { prompt: voxKeyframePrompt(plan, b, s), aspect_ratio: "16:9", resolution: "2K", num_images: 1, output_format: "png" };
      let uploads = {};
      if (s.cast.length) {
        const slots = s.cast.map((_, i) => `p${i + 1}`);
        inp.image_urls = slots.map((x) => "selects-input:" + x);
        uploads = Object.fromEntries(slots.map((slot, i) => [slot, io.join(job.dir, "portraits", `${s.cast[i]}.jpg`)]));
      }
      reqs.push(spec("kf", s.id, "image", s.cast.length ? "edit" : "t2i", inp, uploads));
    }
  } else if (kind === "clips") {
    const tl = await io.readJson(io.join(job.dir, "timeline.json"), null);
    const need = Object.fromEntries(tl.segments.map((x) => [x.shot, x]));
    for (const [b, s] of voxShots(plan)) {
      if (only && !only.has(s.id)) continue;
      const kf = await job.file("kf:" + s.id);
      if (!kf) throw voxFail("keyframe missing: " + s.id);
      const frameAttempt = (await job.gen())["kf:" + s.id]?.attempt || 1;
      const request = spec("clip", s.id, "video", "i2v", { prompt: voxMotionPrompt(b, s), start_image_url: "selects-input:start",
        duration: String(need[s.id].kling), generate_audio: false }, { start: kf });
      request.key += "-kf" + frameAttempt;
      request.outputName += "_kf" + frameAttempt;
      reqs.push(request);
    }
  } else if (kind === "music") {
    const tl = await io.readJson(io.join(job.dir, "timeline.json"), null);
    reqs.push(spec("music", "", "audio", "music", { prompt: VOX_MUSIC_PROMPT, force_instrumental: true, music_length_ms: tl.music_ms }));
  } else {
    throw voxFail("unknown request kind " + kind);
  }
  return { ok: true, requests: reqs };
}

// ---- timeline: narration timing from the audio itself ----
// Word start times without provider timestamps. Speech between the leading and trailing silence is shared out by
// each word's speech weight, and every internal pause is placed at the word boundary nearest its position,
// preferring boundaries after punctuation. Returns [[word, start, end]].
export function voxAlignWords(text, dur, sil, lang) {
  const words = pySplit(text);
  const wts = words.map((w) => voxWordWeight(w, lang));
  sil = sil.map(([a, b]) => [a, b !== null && b !== undefined ? b : dur]);
  const s0 = sil.length && sil[0][0] <= 0.05 ? sil[0][1] : 0.0;
  const s1 = sil.length && sil[sil.length - 1][1] >= dur - 0.05 && sil[sil.length - 1][0] > s0 ? sil[sil.length - 1][0] : dur;
  const inner = sil.filter(([a, b]) => a > s0 + 0.05 && b < s1 - 0.05);
  let gaps = 0;
  for (const [a, b] of inner) gaps += b - a;
  const speech = Math.max(0.1, (s1 - s0) - gaps);
  let total = 0;
  for (const w of wts) total += w;
  const cum = [];
  let acc = 0.0;
  for (const w of wts) { acc += w; cum.push(acc); } // cumulative weight after word i
  const pauseAfter = words.map(() => 0.0);
  const used = new Set();
  let removed = 0.0;
  const avg = total / Math.max(1, words.length);
  for (const [a, b] of inner) {
    const pos = (a - s0 - removed) / speech * total;
    let best = null, score = null;
    for (let j = 0; j < words.length - 1; j++) {
      if (used.has(j)) continue;
      const sc = Math.abs(cum[j] - pos) - (/[.,!?;:\u3002\u3001\uff0c\uff01\uff1f]$/u.test(words[j]) ? 0.8 * avg : 0);
      if (score === null || sc < score) { best = j; score = sc; }
    }
    if (best !== null) { used.add(best); pauseAfter[best] += b - a; }
    removed += b - a;
  }
  const out = [];
  let extra = 0.0;
  words.forEach((w, i) => {
    const start = s0 + (cum[i] - wts[i]) / total * speech + extra;
    const end = s0 + cum[i] / total * speech + extra;
    out.push([w, pyRound(start, 3), pyRound(end, 3)]);
    extra += pauseAfter[i];
  });
  return out;
}
async function voxCmdTimeline(io, job) {
  const plan = await job.plan();
  const lang = plan.lang;
  let t = 0.0;
  const segs = [], narr = [], heads = [], cues = [];
  for (const b of plan.beats) {
    const path = await job.file(`narr:${b.n}`);
    if (!path) throw voxFail(`narration missing: beat ${b.n}`);
    const nd = await io.duration(path);
    const ws = voxAlignWords(b.narration, nd, await io.silences(path), lang);
    const last = b.n === plan.beats.length;
    const length = VOX_LEAD + nd + VOX_TAIL + (last ? VOX_END_HOLD : 0);
    let cuts = [0.0];
    if (b.shots.length === 2 && pyTrue(b.cut_index) && b.cut_index < ws.length) cuts.push(pyRound(VOX_LEAD + ws[b.cut_index][1] - 0.05, 3));
    cuts.push(pyRound(length, 3));
    if (cuts.length === 3 && (cuts[1] < 1.5 || length - cuts[1] < 1.5)) { cuts = [0.0, cuts[2]]; b.shots = b.shots.slice(0, 1); }
    b.shots.forEach((s, i) => {
      const need = cuts[i + 1] - cuts[i];
      segs.push({ shot: s.id, start: pyRound(t + cuts[i], 3), need: pyRound(need, 3), kling: voxKlingSeconds(need) });
    });
    narr.push({ beat: b.n, file: path, start: pyRound(t + VOX_LEAD, 3), dur: pyRound(nd, 3) });
    heads.push({ beat: b.n, graphic: b.graphic, evidence: b.evidence, text: b.title, start: pyRound(t, 3), end: pyRound(t + length, 3) });
    let lines = b.captions;
    let nwords = 0;
    for (const l of lines) nwords += pySplit(l).length;
    if (nwords !== ws.length) lines = voxAutoCaptions(ws.map((w) => w[0]).join(" "), VOX_LANG[lang].cap);
    let idx = 0;
    const starts = [];
    for (const line of lines) { starts.push(ws[Math.min(idx, ws.length - 1)][1]); idx += pySplit(line).length; }
    lines.forEach((line, i) => {
      const a = t + VOX_LEAD + starts[i];
      const e = t + VOX_LEAD + (i + 1 < lines.length ? starts[i + 1] : nd + 0.15);
      cues.push({ text: pyRstrip(line, ",.\u3001\uff0c"), start: pyRound(a, 3), end: pyRound(e, 3) });
    });
    t += length;
  }
  await io.writeJson(job.p("plan.json"), plan);
  // LESSON: music bills by started minute; 60.03 s cost two. Stay under the boundary.
  const needS = t + 2;
  const musicS = Math.min(Math.ceil(needS), 60 * Math.ceil(needS / 60.0) - 1);
  await io.writeJson(job.p("timeline.json"), { total: pyRound(t, 3), segments: segs, narration: narr, headlines: heads, captions: cues, music_ms: Math.trunc(musicS * 1000) });
  job.data.stage = "timed";
  await job.save();
  let video = 0;
  for (const s of segs) video += s.kling;
  return { ok: true, seconds: pyRound(t, 3), shots: segs.length, videoSeconds: video };
}

// ---- sheet, Ken Burns, assembly ----
async function voxCmdSheet(io, job, only) {
  const plan = await job.plan();
  const ids = voxShots(plan).map(([, s]) => s.id).filter((id) => !only || only.has(id));
  const fileOf = {};
  for (const id of ids) fileOf[id] = await job.file("kf:" + id);
  const font = io.sheetFont();
  const stamp = Math.trunc(io.now());
  // A labelled sheet that ffmpeg refuses (e.g. a build whose drawtext cannot load the font) is made once more without
  // the shot labels: the check still sees the pictures in shot order. (engine.py failed here.)
  const make = async (withFont) => {
    const made = [];
    for (const j of voxSheetJobs(ids, (id) => fileOf[id], withFont, (n) => job.p("check", `sheet_${stamp}_${n}.jpg`))) {
      await io.ffmpeg(j.args);
      made.push({ path: j.dest, shots: j.shots });
    }
    return made;
  };
  const labelFont = await io.exists(font) ? font : null;
  let sheets, unlabelled = false;
  try { sheets = await make(labelFont); } catch (e) {
    if (!labelFont) throw voxFail("sheet: " + pySlice(String(e && e.message || e), -300));
    try { sheets = await make(null); unlabelled = true; } catch (e2) { throw voxFail("sheet: " + pySlice(String(e2 && e2.message || e2), -300)); }
  }
  const cast = Object.fromEntries(plan.cast.map((c) => [c.key, c.name]));
  const expect = voxShots(plan).filter(([, s]) => !only || only.has(s.id)).map(([b, s]) => ({
    narration: b.narration, shot: s.id, people: s.cast.map((k) => cast[k]),
    words: [...s.scene.matchAll(/['"\u201c\u2018]([^'"\u201d\u2019]{1,40})['"\u201d\u2019]/gu)].map((m) => m[1]), scene: pySlice(s.scene, 0, 300),
  }));
  return unlabelled ? { ok: true, sheets, expect, unlabelled } : { ok: true, sheets, expect };
}
async function voxCmdKenBurns(io, job, only) {
  const plan = await job.plan();
  const tl = await io.readJson(io.join(job.dir, "timeline.json"), null);
  const need = Object.fromEntries(tl.segments.map((x) => [x.shot, x]));
  const order = voxShots(plan).map(([, s]) => s.id);
  const made = {};
  for (const sid of only) {
    const dest = job.p("gen", "kenburns", `${job.id}_kb_${sid}.mp4`);
    const args = voxKenBurnsArgs(await job.file("kf:" + sid), dest, need[sid].need + 0.3, order.indexOf(sid) % 2 === 0);
    try { await io.ffmpeg(args); } catch (e) { throw voxFail("ken burns: " + pySlice(String(e && e.message || e), -300)); }
    made[sid] = dest;
  }
  return { ok: true, clips: made };
}
export function voxHeadlineSize(text) {
  let units = 0;
  for (const ch of pyChars(text)) units += /[\u3040-\u30ff\u3131-\ud7a3\u4e00-\u9fff]/u.test(ch) ? 1.0 : ch === " " ? 0.3 : 0.62;
  return Math.trunc(Math.min(100, 860 / Math.max(units, 1)));
}
export function voxCreditLine(portraits, lang) {
  const groups = new Map();
  for (const p of Object.values(portraits)) {
    if (pyTrue(p.ok)) {
      const lic = /public domain|^pd|cc0/i.test(p.license) ? VOX_LANG[lang].pd : p.license;
      if (!groups.has(lic)) groups.set(lic, new Set());
      groups.get(lic).add(p.artist || "");
    }
  }
  if (!groups.size) return "";
  const byCode = (a, b) => { const x = pyChars(a), y = pyChars(b); for (let i = 0; i < Math.min(x.length, y.length); i++) { const d = x[i].codePointAt(0) - y[i].codePointAt(0); if (d) return d; } return x.length - y.length; };
  const parts = [...groups].map(([lic, v]) => ([...v].some(Boolean) ? `${[...v].filter(Boolean).sort(byCode).join(", ")}(${lic})` : lic));
  return `${VOX_LANG[lang].photos} \u00b7 Wikimedia Commons: ${parts.join("; ")}`;
}
async function voxCmdAssembly(io, job) {
  const plan = await job.plan();
  const lang = plan.lang;
  const tl = await io.readJson(io.join(job.dir, "timeline.json"), null);
  const art = (await io.readJson(io.join(job.dir, "article.json"), {})) || {};
  const segs = [];
  for (const s of tl.segments) {
    const f = await job.file("clip:" + s.shot);
    if (!f) throw voxFail("clip missing: " + s.shot);
    segs.push({ shot: s.shot, file: f, dur: pyRound(Math.min(s.need, (await io.duration(f)) - 0.02), 3) });
  }
  const music = (await job.file("music")) || "";
  let source = plan.source_line || "";
  if (!source && pyTrue(art.url)) {
    const date = pySlice(art.date || "", 0, 10).split("-").join(".");
    source = `${VOX_LANG[lang].source} \u00b7 ${[art.source, date, art.byline].filter(pyTrue).join(" ")}`;
  }
  const files = [...segs.map((s) => s.file), ...tl.narration.map((n) => n.file), ...(music ? [music] : [])];
  const res = { draftName: `${pySlice(plan.title || art.title || "Explainer", 0, 60)} \u00b7 ${STYLE.name} \u00b7 ${job.id}`, files, segments: segs, narration: tl.narration, music,
    headlines: tl.headlines.map((h) => ({ ...h, size: voxHeadlineSize(h.text) })), captions: tl.captions,
    credit: { start: pyRound(tl.total - VOX_END_HOLD + 0.2, 3), source, photos: voxCreditLine(job.data.portraits || {}, lang) } };
  await io.writeJson(job.p("selects.json"), res);
  job.data.stage = "assembled";
  await job.save();
  return res;
}

// engine.py's command line: `cmd` with the job folder and the rest of argv (`args`: e.g. ["keyframes", "1a,2b",
// "--attempt", "2"]). Returns what engine.py printed: the command's answer, or {ok: false, error} on a failure.
export async function voxEngine(cmd, dir, args, io) {
  try {
    const rest = args || [];
    const at = rest.indexOf("--attempt");
    const attempt = at >= 0 ? parseInt(rest[at + 1], 10) : 1;
    const pos = rest.filter((x, i) => !x.startsWith("--") && (i === 0 || rest[i - 1] !== "--attempt"));
    const job = await voxJob(io, dir);
    if (cmd === "requests") return await voxCmdRequests(io, job, pos[0], pos.length > 1 && pos[1] ? new Set(pos[1].split(",")) : null, attempt);
    const only = pos.length && pos[0] ? new Set(pos[0].split(",")) : null;
    switch (cmd) {
      case "fetch": return await voxCmdFetch(io, job);
      case "validate": return await voxCmdValidate(io, job);
      case "portraits": return await voxCmdPortraits(io, job);
      case "timeline": return await voxCmdTimeline(io, job);
      case "sheet": return await voxCmdSheet(io, job, only);
      case "kenburns": return await voxCmdKenBurns(io, job, [...(only || [])].sort());
      case "assembly": return await voxCmdAssembly(io, job);
      default: throw voxFail("unknown command " + cmd);
    }
  } catch (e) {
    if (e instanceof VoxEngineError) return { ok: false, error: e.message };
    return { ok: false, error: `${(e && e.name) || "Error"}: ${(e && e.message) || e}` };
  }
}
// ---- Draft step: import the media, then wait until Selects can place it ----
// A host path's file name on either OS (Windows paths use backslashes: splitting on "/" alone kept the whole path,
// so no imported Resource ever matched and every Continue imported the files again).
export function voxBaseName(path) { return String(path).split(/[\\/]/).pop(); }
// run_script source: imports the files the Project does not have yet (by file name).
export function voxImportScript(projectId, files, windows = typeof hostIsWindows === "function" && hostIsWindows()) {
  const want = files.map((f) => ({ file: f, name: voxBaseName(f) }));
  return `const p = selects.project(${JSON.stringify(projectId)});
const want: { file: string; name: string }[] = ${JSON.stringify(want)};
const key = (name: string) => ${windows ? 'name.normalize("NFC").toLowerCase()' : 'name.normalize("NFC")'};
const have = new Set((await p.resources()).map((r: any) => key(String(r.name))));
const need = want.filter((w) => !have.has(key(w.name))).map((w) => w.file);
if (need.length) await p.importFiles({ paths: need });
return { imported: need.length };`;
}
// run_script source: each file's Resource id once it can be placed. Usable means a length is known
// (durationSeconds > 0); the status is not read, because an import that is never analysed stays "pending".
export function voxReadyScript(projectId, files, windows = typeof hostIsWindows === "function" && hostIsWindows()) {
  const want = files.map((f) => ({ file: f, name: voxBaseName(f) }));
  return `const rows = await selects.project(${JSON.stringify(projectId)}).resources();
const want: { file: string; name: string }[] = ${JSON.stringify(want)};
const key = (name: string) => ${windows ? 'name.normalize("NFC").toLowerCase()' : 'name.normalize("NFC")'};
const map: Record<string, string> = {};
const missing: string[] = [];
for (const w of want) {
  const r = rows.find((x: any) => key(String(x.name)) === key(w.name) && typeof x.durationSeconds === "number" && x.durationSeconds > 0);
  if (r) map[w.file] = String(r.resourceId);
  else missing.push(w.name);
}
return { map, missing };`;
}
export const VOX_READY_TRIES = 40;
export const VOX_READY_PAUSE_MS = 3000;
// @operation-end
// The engine's I/O on the host (see voxEngine): job files through FileSystem, ffmpeg and ffprobe through the host's
// bundled copies, and the network two ways. Wikipedia/Commons API answers come through fetch (they allow any origin
// with origin=*, and take Api-User-Agent for the agent engine.py sends). Article pages and portrait images are
// downloaded by selects.files.download, outside the panel's origin rules, into the job folder; a page that
// will not download counts as HTTP 599 (FETCH_FAILED: "paste the text instead").
function voxHostIO(dir: string, files: { readJson: (p: string) => Promise<any>; writeJson: (p: string, v: any) => Promise<void> }) {
  const fs = hostNeed("FileSystem", "join");
  const tmp = () => hostJoin(dir, "dl-" + Date.now() + "-" + Math.floor(Math.random() * 1e6) + ".tmp");
  return {
    join: (...p: string[]) => hostJoin(...p),
    exists: async (p: string) => { try { return !!p && !!(await fs.exists(p)); } catch (e) { return false; } },
    mkdir: async (p: string) => { if (!(await fs.exists(p))) (await fs.mkdir(p, { recursive: true })); },
    readJson: async (p: string, def: any) => { const v = await files.readJson(p); return v === null ? def : v; },
    writeJson: (p: string, v: any) => files.writeJson(p, v),
    now: () => Date.now() / 1000,
    sheetFont: () => voxSheetFont(hostIsWindows()),
    duration: (p: string) => voxMediaDuration(p),
    silences: (p: string) => voxSilences(p),
    ffmpeg: async (args: string[]) => {
      const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 280000);
      let log = "";
      try {
        await hostNeed("Runtime", "runFFmpeg").runFFmpeg(args, true, controller.signal, undefined, (t: string) => { log += t; });
      } catch (e: any) {
        throw new Error(log || String(e?.message || e));
      } finally { clearTimeout(timer); }
    },
    http: async (url: string, ua: string, timeout: number) => {
      if (/^https:\/\/(en\.wikipedia\.org|commons\.wikimedia\.org)\/w\/api\.php\?/.test(url)) {
        const controller = new AbortController(), timer = setTimeout(() => controller.abort(), timeout * 1000);
        try {
          const r = await fetch(url + "&origin=*", { headers: { "Api-User-Agent": ua }, signal: controller.signal });
          return { code: r.status, text: await r.text() };
        } finally { clearTimeout(timer); }
      }
      const dest = tmp();
      try {
        await hostNeed("FileSystem", "downloadFile").downloadFile(url, dest);
        return { code: 200, text: new TextDecoder().decode(await hostReadBytes(dest)) };
      } catch (e) {
        return { code: 599, text: "" };
      } finally { await hostRemove(dest); }
    },
    // A portrait: the host's download first; if that fails, the panel's fetch (Wikimedia's files allow any origin).
    download: async (url: string, dest: string) => {
      try {
        await hostNeed("FileSystem", "downloadFile").downloadFile(url, dest);
        if ((await fs.exists(dest))) return 200;
      } catch (e) { /* the panel's fetch */ }
      try {
        const r = await fetch(url);
        if (!r.ok) return r.status;
        await hostNeed("FileSystem", "writeFile").writeFile(dest, new Uint8Array(await r.arrayBuffer()));
        return 200;
      } catch (e) { return 599; }
    },
  };
}
// Selects' own media generation for plug-in panels: billed to the user's Selects credits, results
// saved into a folder under ~/.selects/plugin-data (Selects 2.0.512+).
function generation(): any {
  const m = sdkGeneration(hostSdk);
  if (!m || typeof m.submit !== "function" || typeof m.list !== "function") return null;
  if (typeof m.isAvailable === "function" && !m.isAvailable()) return null;
  if (typeof m.supportsPluginFiles === "function" && !m.supportsPluginFiles()) return null;
  return m;
}
function languageName(code: string, ui: string): string {
  try {
    return new (Intl as any).DisplayNames([ui, "en"], { type: "language" }).of(code) || code;
  } catch (e) {
    return code;
  }
}

// ---- The AI judgments: script, picture plan, keyframe check ----
// Selects prefixes every panel request with a note to build with Selects tools, and caps a panel turn
// at five minutes. These requests need no tools, so each one says so first and last, and the script
// is asked for in two short turns rather than one long one.
const NO_TOOLS =
  "This request needs no tools. Do not call run_script, run_shell, a browser or any other tool, do not open links, and do not change the project. Answer directly with the JSON described below and nothing else.";

function scriptPrompt(art: any, f: any, target: number): string {
  const b = f.budget;
  return [
    NO_TOOLS,
    `You write ${STYLE.name} videos. ${STYLE.story} From the source below, write the narration script for a horizontal (16:9) explainer of about ${target} seconds.`,
    `[Language]\n- Write every spoken and on-screen word (narration, captions, headline, title, source_line) in ${f.language}, the source's language, in a ${f.style}.`,
    `[Length]\n- About ${b.beats} beats and about ${b.count} ${b.unit} of narration in total. Beat 1 is a hook that promises the point within 3 seconds.\n- Each beat's narration is 1-2 sentences. Use only facts from the source; names and numbers exactly as the source writes them.\n- End on the source's key meaning or contrast.`,
    `[Captions and titles]\n- captions: split the narration into subtitle lines of at most ${f.captionChars} characters; keep a person's name, and a number with its unit, on one line. Joining the lines with spaces must give the narration exactly (end-of-line punctuation may be dropped).\n- headline: the beat's on-screen headline, at most ${f.headlineChars} characters.\n- cut_word: the narration word, exactly as written, where a second picture can start, near the middle; an empty string when the narration is under 3 seconds.\n- title: the video title (at most 40 characters). source_line: "${f.sourceLabel} · outlet, date, author" with the date written the usual way in ${f.language}; leave out anything the source information lacks, and use an empty string if the outlet is unknown.`,
    `[People]\n- ${STYLE.style === "tang" ? "Use an empty cast array: people are visibly illustrated historical reconstructions." : "Use real public figures only when a licensed portrait can support the scene."}\n- cast: real public figures from the source that the pictures will need (at most 8). key: lowercase English; name: full name in English; wiki: the English Wikipedia article title; wardrobe: their usual clothes, in English. Private individuals never go in cast.`,
    `For each beat also include graphic (document, comparison, timeline or stat) and evidence (one to three short labels or facts taken exactly from the source, in its language). Omit evidence when unsupported. Never invent statistics or quotations.\nJSON format:\n{"title": "...", "source_line": "...", "cast": [{"key": "...", "name": "...", "wiki": "...", "wardrobe": "..."}], "beats": [{"headline": "...", "narration": "...", "captions": ["..."], "cut_word": "..."}]}`,
    `Source information: title: ${art.title || ""} / standfirst: ${art.subtitle || art.description || ""} / outlet: ${art.source || ""} / date: ${art.date || ""} / author: ${art.byline || ""}`,
    `Text:\n${String(art.body || "").slice(0, 8000)}`,
    NO_TOOLS,
  ].join("\n\n");
}
function picturePrompt(script: any): string {
  const beats = (script.beats || []).map((b: any, i: number) => ({ beat: i + 1, headline: b.headline, narration: b.narration, twoShots: !!b.cut_word }));
  return [
    NO_TOOLS,
    `You design ${STYLE.name}. ${STYLE.pictures} The script is below. For each beat, in the same order, give the background colour and the shots (2 shots when twoShots is true, otherwise 1).`,
    "[Pictures]\n- scene: in English, the concrete paper-collage objects and their layout that show the narration. Include the main visible subject and action explicitly named in this beat (for example a boat crossing mist must actually show a boat). Use blank unprinted paper, never newspaper or pseudo-handwritten documents. Use only the listed cast for photographic portraits; for Tang style use illustrated, non-photographic historical figures appropriate to the source.\n- Do not request any letters, labels or readable text in the picture. Meaningful names, dates and numbers will be added as separate editable graphics.\n- Show relationships with position and objects; do not paint text labels next to people.\n- element_motion: in English, a simple movement of one or two elements; keep shots with words especially simple.\n- camera: one of push_in, pull_out, parallax, pan, static. Shots with people use only push_in, parallax or static. Neighbouring shots differ.\n- cast: keys from the cast list below, at most 4 per shot, only people the shot shows.\n- bg: the beat's background colour in English; neighbouring beats differ.",
    `Cast: ${JSON.stringify(script.cast || [])}`,
    `Script: ${JSON.stringify(beats)}`,
    'JSON format:\n{"beats": [{"bg": "...", "shots": [{"scene": "...", "element_motion": "...", "camera": "...", "cast": ["key"]}]}]}',
    NO_TOOLS,
  ].join("\n\n");
}
function shortenPrompt(raw: any, f: any, target: number, seconds: number): string {
  const cut = Math.round((1 - target / seconds) * 100);
  return `${NO_TOOLS}\n\nThis explainer script reads for about ${seconds} seconds but must fit ${target} seconds. Shorten the narration by about ${cut}% (fewer words per beat, or drop the weakest beat), keep it in ${f.language}, keep every other field and rule, and make each beat's captions match its new narration exactly. Answer with the whole JSON in the same format.\n\n${JSON.stringify(raw)}`;
}
function repairPrompt(raw: string, errors: string[]): string {
  return `${NO_TOOLS}\n\nThis script JSON has problems: ${errors.join("; ")}. Answer with the corrected JSON only, in the same format.\n\n${raw}`;
}
function checkPrompt(expect: any[]): string {
  return [
    NO_TOOLS,
    "These images are video keyframes; each tile's shot number (e.g. 1a) is at its top left. Compare them with the expectations below and pick only the shots that must be remade.",
    `Remake for these problems:\npeople: for ${STYLE.style === "tang" ? "Tang style, an inappropriate modern or photographic person, or a missing illustrated character required by the narration" : "editorial style, an unrequested person/head/profile or missing listed person; a red offset shadow must follow its object's outline and must never become a human silhouette"}.\ntext: any readable letters, numbers, words, map labels, newspaper print or fake handwriting in the generated image; all text is added later as editable graphics. Blank rules and abstract nonalphabetic marks are fine.\nsubject: the main visible subject or action explicitly required by the narration/scene is missing or contradicted. Do not penalize abstract ideas that cannot be literally pictured.`,
    `Expectations: ${JSON.stringify(expect)}`,
    'Answer with JSON only: {"reroll": [{"shot": "1a", "kind": "people, text or subject", "reason": "one sentence"}]}',
  ].join("\n\n");
}

const EDIT_HEAD = [
  { key: "text", label: "Headline", type: "text", defaultValue: "" },
  { key: "fontSize", label: "Size", type: "number", defaultValue: 92, min: 40, max: 140, step: 1 },
  { key: "fontFamily", label: "Font", type: "text", defaultValue: "" },
  { key: "barColor", label: "Bar color", type: "color", defaultValue: "#141414" },
  { key: "textColor", label: "Text color", type: "color", defaultValue: "#F4ECDD" },
  { key: "accentColor", label: "Accent color", type: "color", defaultValue: "#D7261E" },
];
const EDIT_CAP = [
  { key: "text", label: "Caption", type: "text", defaultValue: "" },
  { key: "fontSize", label: "Size", type: "number", defaultValue: 56, min: 30, max: 100, step: 1 },
  { key: "fontFamily", label: "Font", type: "text", defaultValue: "" },
];
const EDIT_CREDIT = [
  { key: "source", label: "Source", type: "text", defaultValue: "" },
  { key: "photos", label: "Photo credits", type: "text", defaultValue: "" },
];

function draftScript(projectId: string, sel: any, ids: Record<string, string>): string {
  const segs = sel.segments.map((s: any) => ({ rid: ids[s.file], dur: s.dur }));
  const narr = sel.narration.map((n: any) => ({ rid: ids[n.file], start: n.start, dur: n.dur }));
  const music = sel.music ? ids[sel.music] : null;
  return `
const p = selects.project(${JSON.stringify(projectId)});
const existing = await p.meta();
for (const id of existing.draftIds) {
 const saved = selects.draft(id);
 if ((await saved.meta()).name === ${JSON.stringify(sel.draftName)}) {
  const clips = await saved.clips({trackScope:"main"});
  const meta = await saved.meta();
  return {draftId:id,seconds:clips.reduce((n:any,c:any)=>Math.max(n,c.endFrame),0)/meta.fps,clips:clips.length,recovered:true};
 }
}
const d = await p.createDraft({ name: ${JSON.stringify(sel.draftName)} });
const segs = ${JSON.stringify(segs)};
for (const s of segs) await d.insertResource({ resourceId: s.rid, sourceRange: { startSeconds: 0, endSeconds: s.dur } });
await d.setFrameSize({ width: 1920, height: 1080 });
const meta = await d.meta();
const fps = meta.fps;
const F = (x: number) => Math.round(x * fps);
const main = await d.clips({ trackScope: "main" });
const total = main.reduce((a: number, c: any) => Math.max(a, c.endFrame), 0);
const narr = ${JSON.stringify(narr)};
for (const n of narr) {
  const a = F(n.start);
  await d.overlayResource({ resource: p.resource(n.rid), over: await d.rangeAtFrames(a, Math.min(total, a + Math.floor(n.dur * fps))) });
}
const music = ${JSON.stringify(music)};
if (music) {
  await d.overlayResource({ resource: p.resource(music), over: await d.rangeAtFrames(0, total) });
  const bc = (await d.clips({ trackScope: "all" })).find((c: any) => c.resourceId === music);
  if (bc) await d.setClipAudio({ clip: bc, volumeDb: ${MUSIC_DB}, fadeInSeconds: 0.4, fadeOutSeconds: 1.8 });
}
const TH = ${JSON.stringify(TPL.headline)};
const TC = ${JSON.stringify(TPL.caption)};
const TK = ${JSON.stringify(TPL.credit)};
for (const h of ${JSON.stringify(sel.headlines)}) {
  if (!h.text) continue;
  await d.addMotionGraphic({ label: "Headline " + h.beat, tsxCode: TH, parameters: { text: h.text, style: ${JSON.stringify(STYLE.style)}, fontSize: 88, fontFamily: "", barColor: ${JSON.stringify(STYLE.style === "tang" ? "#F1E7CC" : "#DAD9D5")}, textColor: "#1A1A1A", accentColor: ${JSON.stringify(STYLE.style === "tang" ? "#A92D25" : "#E04329")} }, editableParameters: ${JSON.stringify(EDIT_HEAD)} as any, within: await d.rangeAtFrames(F(h.start), Math.min(total, F(h.end))) });
}
const TE = ${JSON.stringify(TPL.editorial)};
if (${JSON.stringify(STYLE.style === "editorial")}) {
 for (const h of ${JSON.stringify(sel.headlines)}) {
  if (!h.evidence?.length) continue;
  await d.addMotionGraphic({label: "Evidence " + h.beat, tsxCode: TE,
   parameters: {text: h.evidence.join("\\n"),kind:h.graphic,accentColor:"#E04329",fontFamily:""},
   editableParameters:[{key:"text",label:"Evidence",type:"text",defaultValue:""},{key:"kind",label:"Layout",type:"text",defaultValue:"document"},{key:"accentColor",label:"Marker",type:"color",defaultValue:"#E04329"}],
   within:await d.rangeAtFrames(F(h.start),Math.min(total,F(h.end)))});
 }
}
let i = 0;
for (const c of ${JSON.stringify(sel.captions)}) {
  i += 1;
  const a = F(c.start), b = Math.min(total, F(c.end));
  if (b <= a) continue;
  await d.addMotionGraphic({ label: "Caption " + String(i).padStart(2, "0"), tsxCode: TC, parameters: { text: c.text, fontSize: 44, fontFamily: "", bottom: ${CAPTION_BOTTOM} }, editableParameters: ${JSON.stringify(EDIT_CAP)} as any, within: await d.rangeAtFrames(a, b) });
}
const cr = ${JSON.stringify(sel.credit)};
if (cr.source || cr.photos) {
  await d.addMotionGraphic({ label: "Source credit", tsxCode: TK, parameters: { source: cr.source, photos: cr.photos, top: 860 }, editableParameters: ${JSON.stringify(EDIT_CREDIT)} as any, within: await d.rangeAtFrames(Math.min(F(cr.start), total - 1), total) });
}
const out = await d.commitAll(${JSON.stringify(STYLE.name)});
return { draftId: (out as any).createdDraftId ?? null, seconds: total / fps, clips: main.length };
`;
}

function Panel({ sdk, context, ui }: any) {
  hostUseSdk(sdk);
  const uiLang = String(context?.language || "en").split("-")[0];
  const S: Strings = STRINGS[uiLang] ?? STRINGS.en;
  const creditNotice = {"de": "Kann Credits verbrauchen.", "en": "May use credits.", "es": "Puede usar cr\u00e9ditos.", "fr": "Peut utiliser des cr\u00e9dits.", "it": "Pu\u00f2 usare crediti.", "ja": "\u30af\u30ec\u30b8\u30c3\u30c8\u3092\u4f7f\u7528\u3059\u308b\u5834\u5408\u304c\u3042\u308a\u307e\u3059\u3002", "ko": "\ud06c\ub808\ub527\uc774 \uc0ac\uc6a9\ub420 \uc218 \uc788\uc2b5\ub2c8\ub2e4.", "pt": "Pode usar cr\u00e9ditos.", "tr": "Kredi kullanabilir.", "zh": "\u53ef\u80fd\u6d88\u8017\u79ef\u5206\u3002"}[uiLang] || "May use credits.";
  const projectId: string | null = context?.projectId ?? null;
  const fs = React.useMemo(() => hostFs(), []);

  const [mode, setMode] = React.useState<"link" | "text">("link");
  const [url, setUrl] = React.useState("");
  const [text, setText] = React.useState("");
  const [target, setTarget] = React.useState(55);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [error, setError] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [step, setStep] = React.useState(-1);
  const [job, setJob] = React.useState<any>(null); // { id, dir }
  const [plan, setPlan] = React.useState<any>(null);
  const [check, setCheck] = React.useState<any>(null); // validate result
  const [result, setResult] = React.useState<any>(null);
  const [jobs, setJobs] = React.useState<any[]>([]);
  const [t0, setT0] = React.useState(0);
  const [, tick] = React.useState(0);
  const env = React.useRef<any>(null);
  const runLock = React.useRef(false);

  React.useEffect(() => {
    if (!busy) return;
    const h = setInterval(() => tick((x) => x + 1), 1000);
    return () => clearInterval(h);
  }, [busy]);

  const errText = (e: any) => {
    const m = String(e?.message || e || "");
    if (m === "generation_disabled") return {"de": "Die Medienerzeugung ist f\u00fcr diese Selects-Sitzung nicht freigeschaltet. Pr\u00fcfe, ob Generate image im selben Projekt verf\u00fcgbar ist.", "en": "Media generation is not enabled for this Selects session. Check that Generate image is available in the same Project.", "es": "La generaci\u00f3n de medios no est\u00e1 habilitada en esta sesi\u00f3n de Selects. Comprueba que Generate image est\u00e9 disponible en el mismo proyecto.", "fr": "La g\u00e9n\u00e9ration de m\u00e9dias n\u2019est pas activ\u00e9e pour cette session Selects. V\u00e9rifiez que Generate image est disponible dans le m\u00eame projet.", "it": "La generazione multimediale non \u00e8 abilitata per questa sessione Selects. Verifica che Generate image sia disponibile nello stesso progetto.", "ja": "\u3053\u306eSelects\u30bb\u30c3\u30b7\u30e7\u30f3\u3067\u306f\u30e1\u30c7\u30a3\u30a2\u751f\u6210\u304c\u6709\u52b9\u306b\u306a\u3063\u3066\u3044\u307e\u305b\u3093\u3002\u540c\u3058\u30d7\u30ed\u30b8\u30a7\u30af\u30c8\u3067Generate image\u304c\u4f7f\u3048\u308b\u304b\u78ba\u8a8d\u3057\u3066\u304f\u3060\u3055\u3044\u3002", "ko": "\ud604\uc7ac Selects \uc138\uc158\uc5d0\uc11c \ubbf8\ub514\uc5b4 \uc0dd\uc131\uc774 \ud65c\uc131\ud654\ub418\uc5b4 \uc788\uc9c0 \uc54a\uc2b5\ub2c8\ub2e4. \uac19\uc740 \ud504\ub85c\uc81d\ud2b8\uc5d0\uc11c Generate image\ub97c \uc0ac\uc6a9\ud560 \uc218 \uc788\ub294\uc9c0 \ud655\uc778\ud574 \uc8fc\uc138\uc694.", "pt": "A gera\u00e7\u00e3o de m\u00eddia n\u00e3o est\u00e1 ativada nesta sess\u00e3o do Selects. Verifique se Generate image est\u00e1 dispon\u00edvel no mesmo projeto.", "tr": "Bu Selects oturumunda medya \u00fcretimi etkin de\u011fil. Ayn\u0131 projede Generate image \u00f6zelli\u011finin kullan\u0131labilir oldu\u011funu kontrol edin.", "zh": "\u5f53\u524d Selects \u4f1a\u8bdd\u5c1a\u672a\u542f\u7528\u5a92\u4f53\u751f\u6210\u3002\u8bf7\u786e\u8ba4\u540c\u4e00\u9879\u76ee\u4e2d\u53ef\u4ee5\u4f7f\u7528 Generate image\u3002"}[uiLang] || "Media generation is not enabled for this Selects session. Check that Generate image is available in the same Project.";
    return S.errors[m] || m;
  };

  // ---- Host helpers: files through the canonical file SDK, no shell ----
  async function readText(path: string): Promise<string | null> {
    try {
      return fs && (await fs.exists(path)) ? dec(await fs.readFile(path)) : null;
    } catch (e) {
      return null;
    }
  }
  async function writeBytes(path: string, bytes: Uint8Array) {
    if (!fs) throw new Error(S.noHost);
    const dir = path.slice(0, Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\")));
    if (!(await fs.exists(dir))) (await fs.mkdir(dir, { recursive: true }));
    await fs.writeFile(path, bytes);
  }
  async function readB64(path: string): Promise<string> {
    return bytesToB64(hostBytes(await fs.readFile(path)));
  }
  const readJson = async (path: string) => {
    const t = await readText(path);
    try {
      return t ? JSON.parse(t) : null;
    } catch (e) {
      return null;
    }
  };
  const writeJson = (path: string, v: any) => writeBytes(path, enc(JSON.stringify(v)));

  // Working files live in ~/.selects/plugin-data/vox-explainer. The engine uses SDK file and media services (files,
  // downloads and bundled ffmpeg/ffprobe); a build without them gets one "update Selects" message.
  async function ensureEnv() {
    if (env.current) return env.current;
    if (!fs || !hostApi("FileSystem", "join", "downloadFile") || !hostApi("Runtime", "runFFmpeg", "runFFprobe")) throw new Error(S.noHost);
    env.current = { root: hostJoin(fs.homedir(), ".selects", "plugin-data", APP_ID) };
    return env.current;
  }
  // engine.py's commands, run by the panel's port of it (voxEngine). `args` is the rest of engine.py's argv.
  async function run(cmd: string, dir: string, args: string[] = [], summary = "") {
    await ensureEnv();
    const j: any = await voxEngine(cmd, dir, args, voxHostIO(dir, { readJson, writeJson }));
    if (!j) throw new Error(summary || "engine failed");
    if (!j.ok && j.error) throw new Error(String(j.error));
    return j;
  }

  // A panel AI turn is capped at five minutes; the user chooses whether to retry.
  async function ask(prompt: string, images?: any[]) {
    for (let attempt = 0; ; attempt++) {
      try {
        const r = await sdk.askAI({ prompt, timeoutMs: 300000, ...(images ? { images } : {}) });
        return extractJson(r.text);
      } catch (err: any) {
        // Do not automatically repeat a billed AI turn after an ambiguous timeout.
        throw err;
      }
    }
  }

  // ---- Selects generation: submit the engine's requests, wait for the files ----
  async function scope() {
    const r: any = await sdk.runScript({ summary: "Read the open Project", script: "const s = await selects.editor.state(); return { libraryId: s.libraryId, projectId: s.projectId };" });
    if (r.isError || !r.result?.libraryId) throw new Error(String(r.output || "no library").slice(0, 400));
    if (r.result.projectId !== projectId) throw new Error(S.noProject);
    return { libraryId: r.result.libraryId, projectId: r.result.projectId };
  }
  // gen.json lists every request (by key) and the file Selects delivered for it; the engine reads it.
  // One in-memory copy per run; writes are queued so parallel generations never overwrite each other.
  type Store = { dir: string; gen: any; chain: Promise<void> };
  const persist = (st: Store) => (st.chain = st.chain.then(() => writeJson(hostJoin(st.dir, "gen.json"), st.gen)));
  async function generate(st: Store, sc: any, reqs: any[], label: string, onFail: "throw" | "keep" = "throw") {
    const m = generation();
    if (!m) throw new Error(S.noGeneration);
    const gen = st.gen;
    const pending: any[] = [];
    for (const q of reqs) {
      const cur = gen[q.gen];
      if (cur && (cur.attempt || 1) > (q.attempt || 1)) {
        if (!cur.path && !cur.failed) pending.push(q); // a newer remake is in flight; wait for that one
        continue;
      }
      if (cur && cur.key === q.key && cur.path) continue;
      if (!cur || cur.key !== q.key || !cur.jobId) {
        // The key makes a resubmit after a reload resolve to the same job instead of generating again.
        await scope();
        const res = await m.submit({
          origin: { tool: q.tool, tab: "plugin", recipeId: APP_ID }, scope: sc, key: q.key, modelId: q.modelId, input: q.input,
          uploads: Object.fromEntries(Object.entries(q.uploads || {}).map(([k, p]) => [k, { pluginFile: p }])),
          outputName: q.outputName, batch: 1, delivery: { pluginFolder: q.folder },
        });
        gen[q.gen] = { key: q.key, attempt: q.attempt, jobId: res.jobIds[0] };
        await persist(st);
      }
      pending.push(q);
    }
    const failed: any[] = [];
    const retried = new Set<string>();
    const deadline = Date.now() + 45 * 60 * 1000;
    let left = pending.slice();
    while (left.length) {
      if (Date.now() > deadline) {
        for (const q of left) {
          failed.push({ ...q, errorCode: "timeout" });
          gen[q.gen] = { ...gen[q.gen], failed: "timeout" };
        }
        break;
      }
      const list: any[] = (await m.list(sc)) || [];
      const byId = new Map(list.map((j: any) => [j.jobId, j]));
      const next: any[] = [];
      for (const q of left) {
        const entry = gen[q.gen];
        const j: any = byId.get(entry.jobId);
        const path = j?.outputs?.find((o: any) => o.path)?.path;
        if (j && j.deliveryStatus === "delivered" && path) {
          gen[q.gen] = { ...entry, path };
        } else if (j && j.deliveryStatus === "download_failed" && !retried.has(entry.jobId) && typeof m.retryDelivery === "function") {
          retried.add(entry.jobId);
          await m.retryDelivery(sc, entry.jobId);
          next.push(q);
        } else if (j && /fail|error|reject|cancel|refus|block/i.test(String(j.status)) && j.deliveryStatus !== "downloading") {
          failed.push({ ...q, errorCode: j.errorCode || j.status });
          gen[q.gen] = { ...entry, failed: j.errorCode || j.status };
        } else {
          next.push(q);
        }
      }
      await persist(st);
      if (label) setStatus(`${label} · ${pending.length - next.length - failed.length + (reqs.length - pending.length)}/${reqs.length}`);
      left = next;
      if (left.length) await sleep(4000);
    }
    await persist(st);
    if (failed.length && onFail === "throw") throw new Error(`${label}: ${failed.map((f) => `${f.id || f.gen} ${f.errorCode}`).join(", ")}`);
    return failed;
  }

  const loadJobs = React.useCallback(async () => {
    if (!projectId || !fs) return;
    try {
      const root = hostJoin(fs.homedir(), ".selects", "plugin-data", APP_ID, "jobs");
      if (!(await fs.exists(root))) return setJobs([]);
      const list: any[] = [];
      for (const n of (await fs.readdir(root))) {
        const j = await readJson(hostJoin(root, n, "job.json"));
        const pj = (await readJson(hostJoin(root, n, "panel.json"))) || {};
        if (j && j.projectId === projectId && pj.started && !pj.done && !pj.dismissed)
          list.push({ id: j.id, dir: hostJoin(root, n), title: pj.title || j.input?.url || j.id, updated: j.updated || "" });
      }
      setJobs(list.sort((a, b) => String(b.updated).localeCompare(String(a.updated))).slice(0, 5));
    } catch (e) {}
  }, [projectId, fs]);
  React.useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  async function savePanel(dir: string, patch: any) {
    const cur = (await readJson(hostJoin(dir, "panel.json"))) || {};
    const next = { ...cur, ...patch };
    await writeJson(hostJoin(dir, "panel.json"), next);
    return next;
  }

  // ---- 1. Script ----
  async function makePlan() {
    if (runLock.current) return;
    setError("");
    setResult(null);
    setPlan(null);
    if (!projectId) return setError(S.noProject);
    if (mode === "link" && !/^https?:\/\//.test(url.trim())) return setError(S.needUrl);
    if (mode === "text" && text.trim().length < 80) return setError(S.needText);
    runLock.current = true;
    setBusy("plan");
    setT0(Date.now());
    try {
      const e = await ensureEnv();
      const media = generation();
      if (!media) throw new Error(S.noGeneration);
      await media.list(await scope()); // Check access before any billed AI planning.
      const id = `vx${Date.now().toString(36)}`;
      const dir = hostJoin(e.root, "jobs", id);
      const input = mode === "link" ? { kind: "link", url: url.trim() } : { kind: "text", text: text.trim() };
      await writeJson(hostJoin(dir, "job.json"), { id, projectId, created: new Date().toISOString(), input, target, stage: "new" });
      setJob({ id, dir });
      setStep(0);
      setStatus(S.steps[0]);
      const f = await run("fetch", dir, [], "Read the source");
      const art = await readJson(hostJoin(dir, "article.json"));
      setStep(1);
      setStatus(`${S.steps[1]} · ${f.title || ""}`);
      const script = await ask(scriptPrompt(art, f, target));
      setStatus(`${S.steps[1]} · ${f.title || ""} · 2/2`);
      const pics = await ask(picturePrompt(script));
      let parsed: any = { ...script, beats: (script.beats || []).map((bt: any, i: number) => ({ ...bt, ...((pics.beats || [])[i] || {}) })) };
      await writeJson(hostJoin(dir, "plan.json"), parsed);
      let v = await run("validate", dir, [], "Check the script");
      if (!v.ok) {
        parsed = await ask(repairPrompt(JSON.stringify(parsed), v.errors || []));
        await writeJson(hostJoin(dir, "plan.json"), parsed);
        v = await run("validate", dir, [], "Check the script");
        if (!v.ok) throw new Error((v.errors || []).join("; "));
      }
      if (v.seconds > target * 1.15) {
        // LESSON: the first English run read 27% long; fix the length before any narration is paid for.
        setStatus(`${S.steps[1]} · ${v.seconds}s → ${target}s`);
        parsed = await ask(shortenPrompt(parsed, f, target, v.seconds));
        await writeJson(hostJoin(dir, "plan.json"), parsed);
        const v2 = await run("validate", dir, [], "Check the script");
        if (v2.ok) v = v2;
      }
      const p = await readJson(hostJoin(dir, "plan.json"));
      setPlan(p);
      setCheck(v);
      await savePanel(dir, { title: p?.title || f.title });
      setStep(-1);
      setStatus("");
    } catch (err: any) {
      setError(errText(err));
    } finally {
      runLock.current = false;
      setBusy(null);
    }
  }

  // ---- 2. Everything else, resumable ----
  async function produce(resume?: any) {
    if (runLock.current) return;
    setError("");
    const j0 = resume || job;
    if (!j0) return;
    if (!projectId) return setError(S.noProject);
    runLock.current = true;
    setBusy("make");
    setT0(Date.now());
    setJob(j0);
    const dir = j0.dir;
    try {
      if (!generation()) throw new Error(S.noGeneration);
      const savedJob = await readJson(hostJoin(dir,"job.json"));
      if (savedJob?.projectId !== projectId) throw new Error(S.noProject);
      let pj = await savePanel(dir, { started: true });
      if (!plan || resume) setPlan(await readJson(hostJoin(dir, "plan.json")));
      const sc = await scope();
      const st: Store = { dir, gen: (await readJson(hostJoin(dir, "gen.json"))) || {}, chain: Promise.resolve() };

      setStep(2);
      setStatus(S.steps[2]);
      if (!pj.portraits) pj = await savePanel(dir, { portraits: (await run("portraits", dir, [], "Find free-licence portraits")).missing || [] });
      await generate(st, sc, (await run("requests", dir, ["narration"], "Narration requests")).requests, S.steps[2]);
      if (!pj.timed) pj = await savePanel(dir, { timed: (await run("timeline", dir, [], "Narration timing")).seconds });
      const music = (await run("requests", dir, ["music"], "Music request")).requests;
      const musicDone = generate(st, sc, music, "", "keep").catch(() => [{ gen: "music" }]); // runs alongside

      setStep(3);
      await generate(st, sc, (await run("requests", dir, ["keyframes"], "Keyframe requests")).requests, S.steps[3], "keep");
      const gen = st.gen;
      const bad = Object.keys(gen).filter((k) => k.startsWith("kf:") && gen[k].failed).map((k) => k.slice(3));
      if (bad.length) {
        const attempt = Math.max(...bad.map((s) => gen["kf:" + s].attempt || 1)) + 1;
        await generate(st, sc, (await run("requests", dir, ["keyframes", bad.join(","), "--attempt", String(attempt)], "Keyframe retries")).requests, S.steps[3]);
      }

      if (!pj.checked) {
        // At most two remake rounds, followed by verification. Keep unresolved findings visible.
        setStep(4);
        setStatus(S.steps[4]);
        let only: string[] = [];
        const rerolled: string[] = [];
        const problems = new Map<string, any>();
        let checkSkipped = false;
        for (let round = 0; round < 3; round++) {
          // The sheet only feeds the advisory check: if it cannot be made, the check is skipped and the video goes on.
          let sh: any;
          try {
            sh = await run("sheet", dir, only.length ? [only.join(",")] : [], "Contact sheet");
          } catch (err: any) {
            console.warn("[vox-explainer] contact sheet failed; skipping the image check:", err?.message || err);
            checkSkipped = true;
            break;
          }
          const images: any[] = [];
          for (const s of sh.sheets.slice(0, 4)) images.push({ dataUrl: `data:image/jpeg;base64,${await readB64(s.path)}`, name: s.shots.join(",") });
          let flagged: any[] = [];
          try {
            const ids = new Set(sh.expect.map((x: any) => x.shot));
            flagged = ((await ask(checkPrompt(sh.expect), images)).reroll || []).filter((x: any) => ids.has(String(x.shot)));
          } catch (err) {
            flagged = []; // The check is advisory; a failed check is reported as skipped.
            checkSkipped = true;
            break;
          }
          for (const expected of sh.expect) problems.delete(String(expected.shot));
          for (const problem of flagged) problems.set(String(problem.shot), problem);
          // The second pass remakes serious subject/person errors; the third only verifies.
          const eligible = round === 0 ? flagged : round === 1 ? flagged.filter((x: any) => /people|subject/.test(String(x.kind || ""))) : [];
          const redo = eligible.map((x: any) => String(x.shot)).slice(0, Math.max(1, Math.ceil(sh.expect.length / 2)));
          if (!redo.length) break;
          const attempt = Math.max(...redo.map((s: string) => gen["kf:" + s]?.attempt || 1)) + 1;
          await generate(st, sc, (await run("requests", dir, ["keyframes", redo.join(","), "--attempt", String(attempt)], "Remake keyframes")).requests, S.steps[4], "keep");
          rerolled.push(...redo);
          only = redo;
        }
        pj = await savePanel(dir, { checked: true, checkSkipped, rerolled: Array.from(new Set(rerolled)),
          unverified: Array.from(problems.values()).map((x: any) => `${x.shot} (${x.reason || ""})`) });
      }

      setStep(5);
      const failedClips = STYLE.style === "editorial"
        ? ((await readJson(hostJoin(dir,"timeline.json"))).segments || []).map((x:any)=>({id:x.shot}))
        : await generate(st, sc, (await run("requests", dir, ["clips"], "Motion requests")).requests, S.steps[5], "keep");
      if (failedClips.length) {
        // LESSON: a refused clip is refused again on every retry; the pan-and-zoom fallback is immediate.
        const ids = failedClips.map((f) => f.id);
        const kb = await run("kenburns", dir, [ids.join(",")], "Zoom fallback");
        for (const [sid, path] of Object.entries(kb.clips || {})) gen["clip:" + sid] = { ...(gen["clip:" + sid] || {}), path, fallback: true };
        await persist(st);
        pj = await savePanel(dir, { fallback: STYLE.style === "editorial" ? [] : ids });
      }
      const musicFailed = await musicDone;
      if (musicFailed.length) pj = await savePanel(dir, { noMusic: true });

      setStep(6);
      setStatus(S.steps[6]);
      if (!pj.draftId) {
        await scope();
        const sel = await run("assembly", dir, [], "Plan the Draft");
        const imp: any = await sdk.runScript({ summary: "Import the explainer media", allowCommit: true, script: voxImportScript(projectId, sel.files) });
        if (imp.isError) throw new Error(String(imp.output || "import failed").slice(0, 800));
        // Wait (about two minutes at most) until every file has a length; unanalysed imports are fine.
        let ids: any = null, missing: string[] = [];
        for (let t = 0; t < VOX_READY_TRIES && !ids; t++) {
          const mres: any = await sdk.runScript({ summary: "Find the imported media", script: voxReadyScript(projectId, sel.files) });
          if (mres.isError) throw new Error(String(mres.output || "import failed").slice(0, 800));
          missing = mres.result?.missing || [];
          if (!missing.length && mres.result?.map) ids = mres.result.map;
          else {
            setStatus(`${S.steps[6]} · ${sel.files.length - missing.length}/${sel.files.length}`);
            await sleep(VOX_READY_PAUSE_MS);
          }
        }
        if (!ids) throw new Error(S.notReady(missing.slice(0, 4).join(", ") + (missing.length > 4 ? ", \u2026" : "")));
        const b: any = await sdk.runScript({ summary: "Build the explainer Draft", allowCommit: true, script: draftScript(projectId, sel, ids) });
        if (b.isError || !b.result?.draftId) throw new Error(String(b.output || "draft failed").slice(0, 800));
        pj = await savePanel(dir, { draftId: b.result.draftId, seconds: b.result.seconds, done: true });
      }
      const jd = (await readJson(hostJoin(dir, "job.json"))) || {};
      setResult({ seconds: pj.seconds, fallback: pj.fallback || [], rerolled: pj.rerolled || [], unverified: pj.unverified || [], checkSkipped: !!pj.checkSkipped,
        noMusic: !!pj.noMusic, missing: Object.values(jd.portraits || {}).filter((v: any) => !v.ok).map((v: any) => v.name) });
      setStep(7);
      setStatus("");
      loadJobs();
    } catch (err: any) {
      setError(errText(err));
    } finally {
      runLock.current = false;
      setBusy(null);
    }
  }

  async function dismiss(j: any) {
    await savePanel(j.dir, { dismissed: true });
    loadJobs();
  }

  const secs = busy && t0 ? Math.round((Date.now() - t0) / 1000) : 0;
  // A Selects build without the host file and ffmpeg services cannot run the engine; say so and keep the buttons off.
  const noHost = !fs || !hostApi("FileSystem", "join", "downloadFile") || !hostApi("Runtime", "runFFmpeg", "runFFprobe");

  return (
    <ui.Stack gap={16}>
      <style>{`html { scrollbar-gutter: stable; } body { min-width: 0; overflow-wrap: anywhere; }`}</style>
      {noHost && <ui.Message>{S.noHost}</ui.Message>}
      <ui.Section title={S.sourceTitle}>
        <ui.Tabs
          value={mode}
          onChange={(v: "link" | "text") => !busy && setMode(v)}
          tabs={[
            { value: "link", label: S.link, content: <ui.TextField label={S.url} value={url} onChange={setUrl} placeholder="https://…" disabled={!!busy} /> },
            { value: "text", label: S.text, content: <ui.TextField label={S.body} value={text} onChange={setText} placeholder={S.bodyPh} multiline disabled={!!busy} /> },
          ]}
        />
        <ui.NumberField label={S.target} value={target} onChange={(v: number) => setTarget(Math.max(20, Math.min(120, Math.round(v))))} min={20} max={120} step={5} unit="s" disabled={!!busy} />
        <><ui.Actions>
          <ui.Button variant={plan ? "secondary" : "primary"} busy={busy === "plan"} busyLabel={S.planning} disabled={!!busy || noHost} onClick={makePlan}>
            {plan ? S.redo : S.makePlan}
          </ui.Button>
        </ui.Actions>
        <ui.Message>{creditNotice}</ui.Message></>
      </ui.Section>

      {plan && (
        <ui.Section title={`${S.planTitle}${plan.title ? " · " + plan.title : ""}`}>
          {check && (
            <p>
              {S.summary(check.seconds, check.beats, check.shots, languageName(plan.lang, uiLang))}
              {check.people?.length ? ` · ${S.people}: ${check.people.join(", ")}` : ""}
            </p>
          )}
          <div style={{ overflowX: "auto", scrollbarGutter: "stable", minWidth: 0 }}>
            <table style={{ width: "100%", tableLayout: "fixed", overflowWrap: "anywhere" }}>
              <tbody>
                {plan.beats.map((b: any) => (
                  <tr key={b.n}>
                    <td style={{ verticalAlign: "top" }}>
                      <b>
                        {b.n}. {b.title}
                      </b>
                      <br />
                      <small>{b.narration}</small>
                    </td>
                    <td style={{ verticalAlign: "top" }}>
                      <small>{b.shots.map((s: any) => s.id).join(" · ")}</small>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {check?.warnings?.length > 0 && <ui.Message tone="muted">{S.warnings}: {check.warnings.join(" / ")}</ui.Message>}
          <><ui.Actions>
            <ui.Button variant="primary" busy={busy === "make"} busyLabel={S.producing} disabled={!!busy || !!result || noHost} onClick={() => produce()}>
              {S.produce}
            </ui.Button>
          </ui.Actions>
        <ui.Message>{creditNotice}</ui.Message></>
        </ui.Section>
      )}

      {(busy || (step >= 0 && !error)) && step < 7 && (
        <ui.Section title={S.producing}>
          <ui.Progress steps={S.steps} current={Math.max(0, step)} />
          {status && (
            <ui.Message tone="muted">
              {status}
              {busy ? ` · ${S.elapsed} ${secs}s` : ""}
            </ui.Message>
          )}
        </ui.Section>
      )}

      {result && (
        <ui.Section title={S.done}>
          {result.seconds ? <ui.Message tone="success">{Math.round(result.seconds * 10) / 10}s</ui.Message> : null}
          <small>{S.openHint}</small>
          <small>{result.checkSkipped ? S.checkSkipped : result.rerolled.length ? S.rerolled(result.rerolled.length) : S.checkOk}</small>
          {result.unverified.length > 0 && (
            <small>
              {S.unverified}: {result.unverified.join(" / ")}
            </small>
          )}
          {result.fallback.length > 0 && (
            <small>
              {S.fallback}: {result.fallback.join(", ")}
            </small>
          )}
          {result.missing.length > 0 && (
            <small>
              {S.missing}: {result.missing.join(", ")}
            </small>
          )}
          {result.noMusic && <small>{S.noMusic}</small>}
        </ui.Section>
      )}

      {error && (
        <ui.Section title="⚠">
          <ui.Message tone="error">{error}</ui.Message>
          {job && !busy && (
            <><ui.Actions>
              <ui.Button variant="secondary" disabled={noHost} onClick={() => (plan ? produce(job) : makePlan())}>
                {S.retry}
              </ui.Button>
            </ui.Actions>
        <ui.Message>{creditNotice}</ui.Message></>
          )}
        </ui.Section>
      )}

      {jobs.length > 0 && !busy && (
        <ui.Section title={S.recent}>
          {jobs.map((j) => (
            <ui.Row key={j.id} align="center">
              <small style={{ minWidth: 0, flex: 1 }}>{j.title}</small>
              <ui.Button variant="ghost" disabled={noHost} onClick={() => produce(j)}>
                {S.resume}
              </ui.Button>
              <ui.IconButton icon="close" label={S.dismiss} onClick={() => dismiss(j)} />
            </ui.Row>
          ))}
        </ui.Section>
      )}
    </ui.Stack>
  );
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
