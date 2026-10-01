// @name 2026 Recap
// @name:de 2026 Rückblick
// @name:en 2026 Recap
// @name:es Resumen de 2026
// @name:fr Rétrospective 2026
// @name:it Recap 2026
// @name:ja 2026 まとめ
// @name:pt Retrospectiva de 2026
// @name:tr 2026 Özeti
// @name:zh 2026 年度回顾
// @collection visual-highlights
// @icon clock
// Build a beat-timed, editable recap Draft from footage in the current project.
import React from "react";

const SLUG = "recap-2026";
const AUDIO_NAME = "recap-2026-fixed-soundtrack.wav";
const AUDIO_SOURCE_NAME = "recap-preview-v3-beatmatched-61s.wav";
const TITLE_CODE = [
  "import React from 'react';",
  "export default function Graphic({data}) {",
  "return <div style={{width:'100%',height:'100%',display:'flex',flexDirection:'column',justifyContent:'center',alignItems:'center',color:'#fff',textAlign:'center',textShadow:'0 2px 14px rgba(0,0,0,.5)'}}>",
  "<div style={{fontFamily:'Georgia,serif',fontSize:56,fontStyle:'italic',lineHeight:1.2}}>{data.top}</div>",
  "<div style={{fontFamily:'Avenir Next,sans-serif',fontSize:174,fontWeight:900,lineHeight:1}}>{data.year}</div>",
  "</div>;}"
].join("");
const FADE_CODE = [
  "import React from 'react';import {useCurrentFrame,useVideoConfig} from 'remotion';",
  "export default function Graphic(){const f=useCurrentFrame(),fps=useVideoConfig().fps;",
  "const a=Math.max(0,Math.min(1,f/(fps*0.75)));",
  "return <div style={{width:'100%',height:'100%',backgroundColor:'rgba(0,0,0,'+a+')'}}/>;}"
].join("");
const WORDS = {
  ko: {
    folder: "\ud478\ud2f0\uc9c0 \ud3f4\ub354", intro: "\uc778\ud2b8\ub85c \uc601\uc0c1", slot: "\ube60\ub978 \ucef7 \ubc88\ud638 (1–159)",
    video: "\uc774 \ucef7\uc5d0 \uc0ac\uc6a9\ud560 \uc601\uc0c1", start: "\uc6d0\ubcf8 \uc601\uc0c1 \uc2dc\uc791\uc810", sample: "12\ucd08 \uc0d8\ud50c \ub9cc\ub4e4\uae30",
    full: "\uc804\uccb4 Draft \ub9cc\ub4e4\uae30", loading: "\ud478\ud2f0\uc9c0 \ubd88\ub7ec\uc624\ub294 \uc911…",
    noProject: "Selects \ud504\ub85c\uc81d\ud2b8\ub97c \uba3c\uc800 \uc5f4\uc5b4\uc8fc\uc138\uc694.",
    noVideo: "\uc0ac\uc6a9\ud560 \uc601\uc0c1\uc744 \ud558\ub098 \uc774\uc0c1 \uc120\ud0dd\ud558\uc138\uc694.",
    summary: "\uc601\uc0c1 \ud480", ready: "\uc778\ud2b8\ub85c", progress: "Draft \uc0dd\uc131 \uc911",
    audio: "\uace0\uc815 \uc74c\uc545\uacfc 2026 \ub0b4\ub808\uc774\uc158 \ud3ec\ud568", introTip: "\uae34 \uc778\ud2b8\ub85c \ub4a4\uc5d0 \ube60\ub978 \ucef7\uc774 \uc790\ub3d9\uc73c\ub85c \uc774\uc5b4\uc9d1\ub2c8\ub2e4.",
    choose: "\uc778\ud2b8\ub85c\ub97c \uace0\ub974\uace0 \ube60\ub978 \ucef7\uc6a9 \ud3f4\ub354\ub97c \uc120\ud0dd\ud558\uba74 \ub098\uba38\uc9c0\ub294 \uc790\ub3d9\uc73c\ub85c \ubc30\uce58\ub429\ub2c8\ub2e4.",
    invalid: "\uc778\ud2b8\ub85c \uc601\uc0c1\uc740 \uc120\ud0dd\ud55c \uc2dc\uc791\uc810\ubd80\ud130 5\ucd08 \uc774\uc0c1 \ud544\uc694\ud569\ub2c8\ub2e4.",
    gallery: "\ud2b9\uc815 \uc601\uc0c1 \uc81c\uc678 (\uc120\ud0dd \uc0ac\ud56d)", preview: "\uc778\ud2b8\ub85c \uad6c\uac04 \uc120\ud0dd", previous: "\uc774\uc804", next: "\ub2e4\uc74c",
    previewHint: "\uc544\ub798 \ud0c0\uc784\ub77c\uc778\uc5d0\uc11c \ub178\ub780 \uad6c\uac04\uc744 \uc6c0\uc9c1\uc5ec \uc0ac\uc6a9\ud560 4.7\ucd08\ub97c \uace0\ub974\uc138\uc694.",
    galleryHint: "\uc120\ud0dd\ud55c \ud3f4\ub354\uc758 \uc601\uc0c1\uc740 \ubaa8\ub450 \uc790\ub3d9 \uc0ac\uc6a9\ub429\ub2c8\ub2e4. \ube7c\uace0 \uc2f6\uc740 \uc601\uc0c1\ub9cc \uccb4\ud06c\ud558\uc138\uc694.",
    folderGuide: "\uc601\uc0c1 \ud30c\uc77c\uc744 \ud55c \ud3f4\ub354\uc5d0 \ubaa8\uc73c\uba74 \ud3b8\ub9ac\ud569\ub2c8\ub2e4. \uc5ec\ub7ec \ud3f4\ub354\ub97c \uc120\ud0dd\ud574\ub3c4 \ub429\ub2c8\ub2e4.",
    folderPick: "\ube60\ub978 \ucef7\uc6a9 \ud3f4\ub354", include: "\uc774 \uc601\uc0c1 \uc81c\uc678", poolRule: "\uc120\ud0dd\ud55c \ud3f4\ub354\uc758 \uc601\uc0c1\uc740 \uae30\ubcf8\uc801\uc73c\ub85c \ubaa8\ub450 \uc0ac\uc6a9\ud569\ub2c8\ub2e4. \ubd80\uc871\ud558\uba74 \ud30c\uc77c\uba85 \uc21c\uc11c\ub300\ub85c \ubc18\ubcf5\ud558\uba70, \uacb0\uacfc \uae38\uc774\ub294 \uc74c\uc545\uc5d0 \ub9de\ucdb0 \uc57d 61.5\ucd08\ub85c \uace0\uc815\ub429\ub2c8\ub2e4.",
    footageCount: "\ube60\ub978 \ucef7\uc6a9 \uc601\uc0c1", repeatNote: "160\uac1c \uc2ac\ub86f\uc744 \ucc44\uc6b0\uae30 \uc704\ud574 \uc601\uc0c1\uc774 \ubc18\ubcf5\ub429\ub2c8\ub2e4.",
    selectAll: "\uc81c\uc678 \ubaa9\ub85d \ucd08\uae30\ud654", selectNone: "\uc804\uccb4 \ud574\uc81c", rebuildHint: "\uc81c\uc678 \uc124\uc815\uc744 \ubc14\uafb8\uba74 \ube60\ub978 \ucef7\uc774 \ub2e4\uc2dc \uc790\ub3d9\uc73c\ub85c \ubc30\uce58\ub429\ub2c8\ub2e4.",
    advanced: "\ube60\ub978 \ucef7 \ud558\ub098 \uc870\uc815 (\uc120\ud0dd \uc0ac\ud56d)", introStart: "\uc778\ud2b8\ub85c \uc2dc\uc791\uc810",
    advancedHint: "1\ubc88\uc740 \uc778\ud2b8\ub85c \uc9c1\ud6c4\uc758 \uccab \ucef7\uc785\ub2c8\ub2e4. \uac19\uc740 \uc601\uc0c1 \uc790\ub9ac\uc758 \ud6c4\ubc18 \ubc18\ubcf5\ubd84\ub3c4 \ud568\uaed8 \ubc14\ub01d\ub2c8\ub2e4.",
    outputAt: "\uc644\uc131 \uc601\uc0c1\uc5d0\uc11c", sourceWindow: "\uc774 \ucef7\uc5d0 \uc0ac\uc6a9\ud560 \uc6d0\ubcf8 \uad6c\uac04",
    advancedSourceHint: "\uc6d0\ubcf8 \ud0c0\uc784\ub77c\uc778\uc758 \ub178\ub780 \uad6c\uac04\uc744 \uc62e\uaca8 \uc774 \ucef7\uc5d0 \uc0ac\uc6a9\ud560 \uc7a5\uba74\uc744 \uace0\ub974\uc138\uc694.",
    repeatsLater: "\uc774 \ucef7\uc740 \ud6c4\ubc18 \ubc18\ubcf5 \uad6c\uac04\uc5d0\ub3c4 \ub2e4\uc2dc \ub098\uc624\uba70 \ud568\uaed8 \ubcc0\uacbd\ub429\ub2c8\ub2e4.",
    rules: "\uc790\ub3d9 \ubc30\uce58 \uaddc\uce59", quickRule: "\ud544\uc694\ud558\uba74 \ubc18\ubcf5 · \uc57d 61.5\ucd08 \uace0\uc815",
    noneIncluded: "\uc0ac\uc6a9\ud560 \uc601\uc0c1\uc774 \uc5c6\uc2b5\ub2c8\ub2e4. \ube60\ub978 \ucef7\uc6a9 \ud3f4\ub354\ub97c \uc120\ud0dd\ud558\uac70\ub098 \uc81c\uc678 \ubaa9\ub85d\uc744 \ucd08\uae30\ud654\ud558\uc138\uc694.",
    shortNotice: "1.7\ucd08 \ubbf8\ub9cc \uc601\uc0c1\uc740 \uae34 \ucef7\uc744 \ucc44\uc6b8 \uc218 \uc5c6\uc5b4 \uc81c\uc678\ub429\ub2c8\ub2e4. \uc778\ud2b8\ub85c\uc5d0\ub294 5\ucd08 \uc774\uc0c1 \uc601\uc0c1\uc774 \ud544\uc694\ud569\ub2c8\ub2e4.",
    example: "\uc644\uc131 \uc608\uc2dc", exampleHint: "61.5\ucd08 \uc644\uc131\ubcf8. \uc7ac\uc0dd\ud574\uc11c \uc601\uc0c1\uacfc \ube44\ud2b8\uc758 \ud750\ub984\uc744 \ud655\uc778\ud558\uc138\uc694.",
    exampleMissing: "\uc608\uc2dc \uc601\uc0c1\uc744 \ubd88\ub7ec\uc62c \uc218 \uc5c6\uc2b5\ub2c8\ub2e4."
  },
  en: {
    folder: "Footage folder", intro: "Intro video", slot: "Fast-cut number (1–159)",
    video: "Video for this cut", start: "Source video start", sample: "Create 12s sample",
    full: "Create full Draft", loading: "Loading footage…",
    noProject: "Open a Selects project first.",
    noVideo: "Choose at least one video.",
    summary: "Footage pool", ready: "Intro", progress: "Building Draft",
    audio: "Fixed music with 2026 narration", introTip: "Fast cuts follow the long intro automatically.",
    choose: "Choose the intro and folders for fast cuts. The rest is arranged automatically.",
    invalid: "The intro needs at least five seconds after its source start.",
    gallery: "Exclude specific videos (optional)", preview: "Select the intro segment", previous: "Previous", next: "Next",
    previewHint: "Move the yellow window on the timeline to choose the 4.7 seconds to use.",
    galleryHint: "All videos in the selected folders are used automatically. Check only the videos you want to leave out.",
    folderGuide: "Putting videos in one folder is easiest. You can also select multiple folders.",
    folderPick: "Folders for fast cuts", include: "Exclude this video", poolRule: "All videos in selected folders are used by default. When there are fewer videos than slots, footage repeats in filename order. Runtime stays fixed at about 61.5 seconds to match the music.",
    footageCount: "Fast-cut videos", repeatNote: "Videos will repeat to fill the 160 slots.",
    selectAll: "Reset exclusions", selectNone: "Clear all", rebuildHint: "Changing exclusions rearranges the fast cuts automatically.",
    advanced: "Adjust one fast cut (optional)", introStart: "Intro source start",
    advancedHint: "Number 1 is the first cut after the intro. If this position repeats later, both copies change together.",
    outputAt: "In finished video", sourceWindow: "Source segment for this cut",
    advancedSourceHint: "Move the yellow window on the source timeline to choose the moment used for this cut.",
    repeatsLater: "This cut also appears in the later repeat; both copies change together.",
    rules: "How auto-fill works", quickRule: "Repeats if needed · fixed ~61.5s",
    noneIncluded: "No footage is available. Choose a fast-cut folder or reset exclusions.",
    shortNotice: "Clips under 1.7 seconds are excluded. The intro needs a video of at least 5 seconds.",
    example: "Finished example", exampleHint: "Play the 61.5s example to see the footage and beat timing.",
    exampleMissing: "The example video could not be loaded."
  }
};
const embedded = (value) => JSON.stringify(value);
const scriptResult = (r) => {
  if (r.isError) throw new Error(r.output || "Selects edit failed");
  if (r.result == null) throw new Error("Selects returned no result");
  return r.result;
};
const shellResult = (r) => {
  if (r.isError || r.exitCode !== 0) throw new Error(r.stderr || r.output || "Host action failed");
  return r.stdout.trim();
};
const core = (cfg) => "const cfg=JSON.parse(" + embedded(JSON.stringify(cfg)) + ");const p=selects.project(cfg.projectId);";
const shellQuote = (value) => "'" + String(value).replace(/'/g, "'\"'\"'") + "'";
const gallerySize = 8;
const thumbnailKey = (video, seconds) => video.resourceId + ":" + seconds.toFixed(2);
function FinishedExample({sdk,t,ui}) {
  const mount=React.useRef<HTMLDivElement | null>(null);
  const [error,setError]=React.useState("");
  React.useEffect(()=>{
    let active=true;
    let player: HTMLVideoElement | null=null;
    (async()=>{
      const result=await sdk.runShell({
        summary:"Locate bundled recap example",
        command:'printf "%s" "$SELECTS_USER_SKILLS_ROOT/'+SLUG+'/assets/preview.mp4"',
        maxOutputBytes:1024
      });
      const path=shellResult(result);
      const host=window.parent as any;
      const fileSystem=host?.__DI__?.FileSystem;
      if(typeof fileSystem?.pathToLocalURL!=="function")throw new Error(t.exampleMissing);
      const src=fileSystem.pathToLocalURL(path);
      player=host.document.createElement("video");
      player.controls=true;
      player.preload="metadata";
      player.playsInline=true;
      player.style.display="block";
      player.style.width="100%";
      player.style.maxHeight="420px";
      player.style.background="#111";
      player.style.borderRadius="8px";
      player.style.aspectRatio="9 / 16";
      player.style.objectFit="contain";
      player.addEventListener("error",()=>{if(active)setError(t.exampleMissing);});
      player.poster=fileSystem.pathToLocalURL(path.replace(/preview\.mp4$/, "preview.jpg"));
      player.src=src;
      if(active&&mount.current)mount.current.appendChild(player);
    })().catch(()=>{if(active)setError(t.exampleMissing);});
    return ()=>{active=false;if(player){player.pause();player.removeAttribute("src");player.load();player.remove();}};
  },[]);
  return <ui.Section title={t.example}><small>{t.exampleHint}</small><div ref={mount} style={{marginTop:8,width:"100%",maxWidth:280}}/>{error&&<ui.Message tone="error">{error}</ui.Message>}</ui.Section>;
}
async function captureThumbnail(sdk, video, seconds) {
  if (!video.path) return null;
  const time = Math.max(0, Math.min(video.durationSeconds - 0.1, seconds));
  const command = "ffmpeg -nostdin -loglevel error -ss " + time.toFixed(3) +
    " -i " + shellQuote(video.path) +
    " -frames:v 1 -vf scale=240:-2 -q:v 12 -f image2pipe -vcodec mjpeg - 2>/dev/null | base64 | tr -d '\\n'";
  const result = await sdk.runShell({summary:"Preview footage frame",command,maxOutputBytes:48000,timeoutMs:20000});
  if (result.isError || result.exitCode !== 0 || result.truncated || !result.stdout.trim()) return null;
  return "data:image/jpeg;base64," + result.stdout.trim();
}

function SourceWindowPicker({sdk,ui,video,startSeconds,windowSeconds,sourceMargin,onChange,disabled,label,hint,loading,compact=false}) {
  const [frames,setFrames]=React.useState({});
  const cache=React.useRef({});
  const duration=video?.durationSeconds||0;
  const maxStart=Math.max(0,duration-windowSeconds-sourceMargin);
  const stripTimes=video?Array.from({length:6},(_,i)=>Math.round(duration*(i+0.5)/6*100)/100):[];
  const previewAt=Math.round(Math.min(duration-0.1,startSeconds+windowSeconds/2)*10)/10;
  const closest=stripTimes.length?stripTimes.reduce((best,at)=>Math.abs(at-previewAt)<Math.abs(best-previewAt)?at:best,stripTimes[0]):0;
  const previewUrl=video?(frames[thumbnailKey(video,previewAt)]||frames[thumbnailKey(video,closest)]):null;

  React.useEffect(()=>{cache.current={};setFrames({});},[video?.resourceId]);
  React.useEffect(()=>{
    if(!video)return;
    let live=true;
    (async()=>{
      for(const at of stripTimes){
        const key=thumbnailKey(video,at);
        if(cache.current[key]!==undefined)continue;
        cache.current[key]=null;
        let url=null;
        try{url=await captureThumbnail(sdk,video,at);}catch(_){}
        cache.current[key]=url;
        if(live)setFrames((old)=>({...old,[key]:url}));
      }
    })();
    return ()=>{live=false;};
  },[video?.resourceId]);
  React.useEffect(()=>{
    if(!video||compact)return;
    const key=thumbnailKey(video,previewAt);
    if(cache.current[key]!==undefined)return;
    let live=true;
    const timer=setTimeout(async()=>{
      cache.current[key]=null;
      let url=null;
      try{url=await captureThumbnail(sdk,video,previewAt);}catch(_){}
      cache.current[key]=url;
      if(live)setFrames((old)=>({...old,[key]:url}));
    },180);
    return ()=>{live=false;clearTimeout(timer);};
  },[video?.resourceId,previewAt,compact]);

  if(!video)return null;
  const move=(event)=>{
    if(disabled)return;
    const box=event.currentTarget.getBoundingClientRect();
    if(!box.width)return;
    const second=Math.max(0,Math.min(1,(event.clientX-box.left)/box.width))*duration;
    onChange(Math.min(maxStart,Math.round(Math.max(0,Math.min(maxStart,second-windowSeconds/2))*10)/10));
  };
  return <div>
    {!compact&&<><h3>{label}</h3><small>{hint}</small>
      <div style={{width:"100%",height:220,maxHeight:"45vw",background:"#111",display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",marginTop:8,borderRadius:6}}>
        {previewUrl?<img src={previewUrl} alt={video.name+" preview"} style={{width:"100%",height:"100%",objectFit:"contain",display:"block"}}/>:<small>{loading}</small>}
      </div></>}
    <div onPointerDown={(event)=>{if(disabled)return;event.currentTarget.setPointerCapture(event.pointerId);move(event);}}
      onPointerMove={(event)=>{if(event.currentTarget.hasPointerCapture(event.pointerId))move(event);}}
      onPointerUp={(event)=>{if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);}}
      style={{display:"flex",position:"relative",width:"100%",height:64,overflow:"hidden",borderRadius:6,background:"#111",cursor:disabled?"default":"ew-resize",touchAction:"none",marginTop:8}}>
      {stripTimes.map((at,index)=>{
        const url=frames[thumbnailKey(video,at)];
        return <div key={index} style={{flex:"1 1 0",minWidth:0,height:"100%",borderRight:"1px solid var(--panel-border)",pointerEvents:"none"}}>
          {url&&<img src={url} alt="" style={{width:"100%",height:"100%",objectFit:"contain",display:"block",pointerEvents:"none"}}/>}
        </div>;
      })}
      <div style={{position:"absolute",top:0,bottom:0,left:(startSeconds/duration*100)+"%",width:(windowSeconds/duration*100)+"%",boxSizing:"border-box",border:"3px solid #eed65d",background:"rgba(238,214,93,0.12)",pointerEvents:"none"}}/>
    </div>
    <small>{startSeconds.toFixed(1)}s – {(startSeconds+windowSeconds).toFixed(1)}s / {duration.toFixed(1)}s</small>
    {!compact&&<ui.Slider label={label} value={Math.max(0,Math.min(maxStart,startSeconds))} onChange={(value)=>onChange(Math.max(0,Math.min(maxStart,value)))} min={0} max={maxStart} step={0.1} unit="s" disabled={disabled}/>}
  </div>;
}

function buildSlots(videos, intro) {
  if (!videos.length || !intro?.resourceId) return [];
  const slots = [{...intro}];
  for (let i = 0; i < 159; i++) {
    const v = videos[i % videos.length];
    const pass = Math.floor(i / videos.length);
    const fraction = pass === 0 ? 0.35 : Math.min(0.8, 0.35 + pass * 0.25);
    const start = Math.max(0, Math.min(v.durationSeconds - 1.7, v.durationSeconds * fraction));
    slots.push({ resourceId: v.resourceId, startSeconds: Math.round(start * 1000) / 1000 });
  }
  return slots;
}

function createScript(cfg) {
  return [
    core(cfg),
    "const d=await p.createDraft({name:cfg.name});",
    "await d.insertResource({resourceId:cfg.intro.resourceId,sourceRange:{startSeconds:cfg.intro.startSeconds,endSeconds:cfg.intro.startSeconds+5}});",
    "await d.setFrameSize({width:1080,height:1920});",
    "const fps=(await d.meta()).fps,target=Math.round(cfg.introEnd*fps);",
    "const clips=await d.clips({trackScope:'main'}),end=Math.max(...clips.map(c=>c.endFrame));",
    "if(end<target)throw Error('Intro shorter than target');",
    "if(end>target)await d.remove(await d.rangeAtFrames(target,end),{tracks:'main'});",
    "const cur=(await d.clips({trackScope:'main'}))[0];",
    "const sz=cfg.intro.frameSize;if(cur&&sz?.width&&sz?.height){const fit=Math.min(1080/sz.width,1920/sz.height),cover=Math.max(1080/sz.width,1920/sz.height)/fit;if(cover>1.001)await d.setClipTransform({clip:cur,scale:{x:cover,y:cover}});}",
    "const commit=await d.commitAll('2026 Recap: create intro');",
    "return {draftId:commit.createdDraftId,fps,mainCount:1};"
  ].join("\n");
}

function batchScript(cfg) {
  return [
    core(cfg),
    "const d=selects.draft(cfg.draftId);const fps=(await d.meta()).fps;",
    "let cs=await d.clips({trackScope:'main'}),count=cs.length;",
    "if(count>cfg.end)throw Error('Draft contains more clips than expected');",
    "for(let i=Math.max(count,cfg.start);i<cfg.end;i++){",
    "const row=cfg.placements[i],slot=cfg.slots[row.slot-1],media=cfg.media[slot.resourceId];",
    "if(!media)throw Error('Missing footage for slot '+row.slot);",
    "cs=await d.clips({trackScope:'main'});const before=Math.max(...cs.map(c=>c.endFrame));",
    "const wanted=Math.round(row.endSeconds*fps),n=wanted-before;",
    "if(n<1)throw Error('Invalid timing at placement '+i);",
    "const start=slot.startSeconds,sourceEnd=start+(n+3)/fps;",
    "if(sourceEnd>media.durationSeconds)throw Error('Source too short for slot '+row.slot);",
    "await d.insertResource({resourceId:slot.resourceId,sourceRange:{startSeconds:start,endSeconds:sourceEnd}});",
    "cs=await d.clips({trackScope:'main'});const actual=Math.max(...cs.map(c=>c.endFrame));",
    "if(actual<wanted)throw Error('Clip short after conform at slot '+row.slot);",
    "if(actual>wanted)await d.remove(await d.rangeAtFrames(wanted,actual),{tracks:'main'});",
    "cs=await d.clips({trackScope:'main'});const c=[...cs].reverse().find(x=>x.resourceId===slot.resourceId);",
    "const sz=media.frameSize;if(c&&sz?.width&&sz?.height){const fit=Math.min(1080/sz.width,1920/sz.height),cover=Math.max(1080/sz.width,1920/sz.height)/fit;if(cover>1.001)await d.setClipTransform({clip:c,scale:{x:cover,y:cover}});}",
    "}",
    "if((await d.clips({trackScope:'main'})).length===count)return {draftId:cfg.draftId,mainCount:count,unchanged:true};",
    "const commit=await d.commitAll('2026 Recap: add footage batch');",
    "return {draftId:cfg.draftId,mainCount:(await d.clips({trackScope:'main'})).length,commitId:commit.commitId};"
  ].join("\n");
}

function finishScript(cfg) {
  return [
    core(cfg),
    "const d=selects.draft(cfg.draftId),fps=(await d.meta()).fps;",
    "const main=await d.clips({trackScope:'main'}),end=Math.max(...main.map(c=>c.endFrame));",
    "await d.setAudioTracks({target:await d.rangeAtFrames(0,end),audioSourceIndexes:[]});",
    "const all=await d.clips({trackScope:'all'});",
    "if(!all.some(c=>c.resourceId===cfg.audioId))await d.overlayResource({resource:p.resource(cfg.audioId),over:await d.rangeAtFrames(0,end)});",
    "const graphics=await d.motionGraphics();",
    "if(!graphics.some(g=>g.name==='2026 Recap title'))await d.addMotionGraphic({label:'2026 Recap title',tsxCode:cfg.titleCode,parameters:{top:'thank you',year:'2026'},editableParameters:[{key:'top',label:'Top line',type:'text',defaultValue:'thank you'},{key:'year',label:'Year',type:'text',defaultValue:'2026'}],within:await d.rangeAtFrames(0,Math.round(cfg.introEnd*fps))});",
    "if(cfg.full&&!graphics.some(g=>g.name==='2026 Recap fade')){const a=Math.min(end-2,Math.round(60.55*fps));await d.addMotionGraphic({label:'2026 Recap fade',tsxCode:cfg.fadeCode,within:await d.rangeAtFrames(a,end)});}",
    "const commit=await d.commitAll('2026 Recap: add fixed soundtrack and title');",
    "return {draftId:cfg.draftId,endFrames:end,mainCount:main.length,commitId:commit.commitId};"
  ].join("\n");
}

async function ensureAudio(sdk, projectId) {
  let r = await sdk.runScript({
    summary:"Find fixed soundtrack",
    script:core({projectId}) + "const r=await p.resources();return r.filter(x=>x.type==='Audio'&&(x.name===cfg.fixed||x.name===cfg.original)).map(x=>({id:x.resourceId,name:x.name,status:x.status}));".replace("cfg.fixed",embedded(AUDIO_NAME)).replace("cfg.original",embedded(AUDIO_SOURCE_NAME))
  });
  let found = scriptResult(r);
  if (found.length) return found.find((x) => x.name === AUDIO_NAME)?.id || found[0].id;
  const path = shellResult(await sdk.runShell({
    summary:"Locate fixed soundtrack",
    command:'printf "%s" "$SELECTS_USER_SKILLS_ROOT/' + SLUG + '/assets/' + AUDIO_NAME + '"'
  }));
  r = await sdk.runScript({
    summary:"Import fixed soundtrack",allowCommit:true,
    script:core({projectId,path}) + "return await p.importFiles({paths:[cfg.path]});"
  });
  let imported = scriptResult(r).addedResourceIds;
  if (!imported?.length) {
    const alternate = shellResult(await sdk.runShell({
      summary:"Prepare fixed soundtrack",
      command:'cp "$SELECTS_USER_SKILLS_ROOT/' + SLUG + '/assets/' + AUDIO_NAME + '" "$HOME/Downloads/' + AUDIO_NAME + '" && printf "%s" "$HOME/Downloads/' + AUDIO_NAME + '"'
    }));
    r = await sdk.runScript({
      summary:"Import fixed soundtrack",allowCommit:true,
      script:core({projectId,path:alternate}) + "return await p.importFiles({paths:[cfg.path]});"
    });
    imported = scriptResult(r).addedResourceIds;
  }
  if (!imported?.length) throw new Error("Could not import the bundled soundtrack");
  const id = imported[0];
  r = await sdk.runScript({
    summary:"Analyze fixed soundtrack",allowCommit:true,
    script:core({projectId,id}) + "return await p.startAnalysis({resourceIds:[cfg.id]});"
  });
  scriptResult(r);
  for (let attempt=0;attempt<60;attempt++) {
    await new Promise((resolve) => setTimeout(resolve,2000));
    r = await sdk.runScript({
      summary:"Check soundtrack analysis",
      script:core({projectId,id}) + "const x=(await p.resources()).find(v=>v.resourceId===cfg.id);return {status:x?.status};"
    });
    const status = scriptResult(r).status;
    if (status === "analyzingSucceeded") return id;
    if (status === "analyzingFailed" || status === "samplingFailed") throw new Error("Soundtrack analysis failed: " + status);
  }
  throw new Error("Soundtrack analysis is still running. Wait for it to finish, then create the Draft again.");
}


// Builds the recap Draft: the intro, the 242 fast cuts in batches, then the
// soundtrack and title. `slots` holds the intro and 159 cut sources; `byId`
// the videos they name. Resolves the new Draft's id, name and clip count.
async function buildRecap(sdk,{projectId,slots,byId,intro,mode,onProgress=(_count,_limit)=>{}}) {
  const manifestText = shellResult(await sdk.runShell({
    summary:"Read recap timing",
    command:'cat "$SELECTS_USER_SKILLS_ROOT/' + SLUG + '/timing.json"',
    maxOutputBytes:48000
  }));
  const manifest = JSON.parse(manifestText);
  if (manifest.placements?.length !== 243) throw new Error("Template timing is incomplete");
  const audioId = await ensureAudio(sdk, projectId);
  const name = "2026 Recap — " + (mode === "sample" ? "12s sample " : "") + new Date().toLocaleString();
  let r = await sdk.runScript({
    summary:"Create recap intro",allowCommit:true,
    script:createScript({projectId,name,intro,introEnd:manifest.placements[1].startSeconds})
  });
  const draftId = scriptResult(r).draftId;
  if (!draftId) throw new Error("Created Draft ID missing");
  const limit = mode === "sample" ? 33 : manifest.placements.length;
  for (let end=25;end<limit+24;end+=24) {
    const to = Math.min(end,limit);
    if (to <= 1) break;
    r = await sdk.runScript({
      summary:"Add recap footage",allowCommit:true,
      script:batchScript({projectId,draftId,start:1,end:to,placements:manifest.placements,slots,media:byId})
    });
    const out = scriptResult(r);
    onProgress(out.mainCount, limit);
    if (to === limit) break;
  }
  r = await sdk.runScript({
    summary:"Finish recap Draft",allowCommit:true,
    script:finishScript({projectId,draftId,audioId,introEnd:manifest.placements[1].startSeconds,full:mode==="full",titleCode:TITLE_CODE,fadeCode:FADE_CODE})
  });
  const out = scriptResult(r);
  return {draftId,name,mainCount:out.mainCount};
}

// Every video of the project at least 1.7 s long, with its path, length and size.
const allVideosScript = (projectId) => core({projectId}) +
  "const items=[];const walk=(nodes)=>{for(const n of nodes||[]){if(n.type==='dir')walk(n.children);else if(n.type==='video'&&n.resourceId)items.push({resourceId:n.resourceId,name:n.name,path:n.path,durationSeconds:n.durationSeconds,frameSize:n.frameSize});}};const r=await p.sourceFiles();if('fileTree' in r)walk(r.fileTree);else for(const f of r.folders){const page=await p.sourceFiles({folder:f.name});if('fileTree' in page)walk(page.fileTree);}return items;";

const TEMPLATE_FAILED = "2026 Recap couldn't make the timeline. Try again.";

// A Clip highlights run (`context.template`): the intro and clips picked in
// the app, cut in full to the soundtrack, built out of sight, reported once.
function TemplateRun({ sdk, context }) {
  const runId = context.template?.runId;
  const [status, setStatus] = React.useState("Making your recap\u2026");
  const started = React.useRef(null), alive = React.useRef(true), latest = React.useRef(context);
  latest.current = context;
  React.useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  React.useEffect(() => {
    if (!runId || started.current === runId) return;
    started.current = runId;
    const live = () => alive.current && latest.current.template?.runId === runId;
    let ended = false;
    const finish = (result) => { if (ended) return; ended = true; if (!live()) return; try { sdk.finishTemplate(result); } catch (_) {} };
    (async () => {
      const template = context.template, projectId = context.projectId;
      if (!projectId) throw new Error("Open a project, then try again.");
      const introPick = (template.inputs?.intro || []).find((x) => x?.resourceId);
      const clipPicks = (template.inputs?.clips || []).filter((x) => x?.resourceId);
      if (!introPick || !clipPicks.length) throw new Error("Pick an intro and at least one clip, then try again.");
      const found = scriptResult(await sdk.runScript({ script: allVideosScript(projectId), summary: "Read footage" }));
      const byId = Object.fromEntries(found.map((v) => [v.resourceId, v]));
      const introVideo = byId[introPick.resourceId];
      if (!introVideo || !(introVideo.durationSeconds >= 5)) throw new Error("Pick an intro clip at least 5 seconds long.");
      const videos = clipPicks.map((x) => byId[x.resourceId]);
      const short = clipPicks.find((x, i) => !(videos[i]?.durationSeconds >= 1.7));
      if (short) throw new Error((short.name || "A picked clip") + " is shorter than 1.7 seconds. Pick longer clips.");
      const intro = { resourceId: introVideo.resourceId, startSeconds: 0 };
      const slots = buildSlots(videos, intro);
      if (!live()) return;
      setStatus("Cutting your clips to the beat\u2026");
      // Only the picked videos go into each batch script.
      const media = Object.fromEntries([introVideo, ...videos].map((v) => [v.resourceId, v]));
      const made = await buildRecap(sdk, { projectId, slots, byId: media, intro: { ...intro, frameSize: introVideo.frameSize }, mode: "full" });
      finish({ sequenceId: made.draftId });
    })().catch((e) => {
      console.warn("[recap-2026] template run failed:", e);
      const said = String(e?.message || "");
      finish({ error: said && said.length <= 160 && !/[\n{]/.test(said) ? said : TEMPLATE_FAILED });
    });
  }, [runId]);
  return <small>{status}</small>;
}

export default function Panel(props) {
  return props.context?.template ? <TemplateRun {...props} /> : <RecapPanel {...props} />;
}

function RecapPanel({ sdk, context, ui }) {
  const t = WORDS[context.language] || WORDS.en;
  const projectId = context.projectId;
  const [folders, setFolders] = React.useState([]);
  const [selectedFolders, setSelectedFolders] = React.useState([]);
  const [videos, setVideos] = React.useState([]);
  const [excludedIds, setExcludedIds] = React.useState([]);
  const [introChoice, setIntroChoice] = React.useState(null);
  const [loadedKey, setLoadedKey] = React.useState(null);
  const [slots, setSlots] = React.useState([]);
  const [editSlot, setEditSlot] = React.useState(2);
  const [advancedOpen, setAdvancedOpen] = React.useState(false);
  const [excludeOpen, setExcludeOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const [error, setError] = React.useState("");
  const [galleryPage, setGalleryPage] = React.useState(0);
  const [thumbnails, setThumbnails] = React.useState({});
  const thumbnailCache = React.useRef({});

  React.useEffect(() => {
    if (!projectId) return;
    let live = true;
    setVideos([]);setSlots([]);setSelectedFolders([]);setExcludedIds([]);setIntroChoice(null);setLoadedKey(null);setMessage(t.loading);setError("");
    setGalleryPage(0);setThumbnails({});thumbnailCache.current={};
    const script = core({projectId}) +
      "const r=await p.sourceFiles();if(!('fileTree' in r))return r.folders.map(x=>({name:x.name,count:x.videoCount}));const out=[];const rootCount=r.fileTree.filter(x=>x.type==='video').length;if(rootCount)out.push({name:'(root)',count:rootCount});for(const x of r.fileTree){if(x.type==='dir')out.push({name:x.name,count:x.children.filter(y=>y.type==='video').length});}return out;";
    sdk.runScript({script,summary:"List footage folders"}).then((r) => {
      if (!live) return;
      const found = scriptResult(r).filter((x) => x.count > 0);
      found.sort((a,b) => b.count-a.count);
      let initial=found[0]?[found[0].name]:[];
      try {
        const saved=JSON.parse(localStorage.getItem(SLUG+":"+projectId+":folders")||"null");
        if(Array.isArray(saved))initial=found.map((x)=>x.name).filter((name)=>saved.includes(name));
      }catch(_){}
      setFolders(found);setSelectedFolders(initial);setMessage("");
    }).catch((e) => {if(live){setError(String(e.message || e));setMessage("");}});
    return () => {live = false;};
  }, [projectId]);

  React.useEffect(() => {
    if (!projectId || !folders.length) return;
    let live = true;
    setLoadedKey(null);
    setMessage(t.loading);setError("");setGalleryPage(0);
    setThumbnails({});thumbnailCache.current={};
    const script = core({projectId,folders:folders.map((x)=>x.name)}) +
      "const out=[];for(const name of cfg.folders){const r=await p.sourceFiles({folder:name});if(!('fileTree' in r))throw Error('Footage folder returned a summary');for(const x of r.fileTree){if(x.type==='video'&&x.durationSeconds>=1.7)out.push({resourceId:x.resourceId,name:x.name,path:x.path,durationSeconds:x.durationSeconds,frameSize:x.frameSize,folderName:name});}}return out;";
    sdk.runScript({script,summary:"Read footage folders"}).then((r) => {
      if (!live) return;
      const found = [...new Map(scriptResult(r).map((v)=>[v.resourceId,v])).values()].sort((a,b) => a.name.localeCompare(b.name));
      setVideos(found);
      const key=SLUG+":"+projectId+":"+selectedFolders.join("|");
      let intro=null;
      let excluded=[];
      let next=[];
      try {
        const saved = JSON.parse(localStorage.getItem(key) || "null");
        const savedIntro=JSON.parse(localStorage.getItem(SLUG+":"+projectId+":intro")||"null")||JSON.parse(localStorage.getItem(key+":intro")||"null")||(Array.isArray(saved)?saved[0]:null);
        const introMedia=found.find((v)=>v.resourceId===savedIntro?.resourceId&&v.durationSeconds>=5);
        if(introMedia)intro={resourceId:introMedia.resourceId,startSeconds:Math.max(0,Math.min(introMedia.durationSeconds-5,savedIntro.startSeconds||0))};
        const storedExcluded=JSON.parse(localStorage.getItem(SLUG+":"+projectId+":excluded")||"[]");
        if(Array.isArray(storedExcluded))excluded=storedExcluded.filter((id)=>found.some((v)=>v.resourceId===id));
        const available=found.filter((v)=>selectedFolders.includes(v.folderName)&&!excluded.includes(v.resourceId));
        if (Array.isArray(saved) && saved.length === 160 && saved.every((x,index) => index===0?x.resourceId===intro?.resourceId:available.some((v)=>v.resourceId===x.resourceId))) next = saved.map((slot,index)=>{
          const media=found.find((v)=>v.resourceId===slot.resourceId);
          const max=Math.max(0,(media?.durationSeconds||0)-(index===0?5:1.7));
          return {...slot,startSeconds:Math.max(0,Math.min(max,slot.startSeconds||0))};
        });
      } catch (_) {}
      if(!intro){const first=found.find((v)=>v.durationSeconds>=5);intro=first?{resourceId:first.resourceId,startSeconds:0}:null;}
      if(!next.length)next=buildSlots(found.filter((v)=>selectedFolders.includes(v.folderName)&&!excluded.includes(v.resourceId)),intro);
      setExcludedIds(excluded);
      setIntroChoice(intro);setSlots(next);setLoadedKey(projectId);setMessage(found.length ? t.ready : t.noVideo);
    }).catch((e) => {if(live){setError(String(e.message || e));setMessage("");}});
    return () => {live = false;};
  }, [projectId, folders.map((x)=>x.name).join("|")]);

  React.useEffect(() => {
    if (!projectId || loadedKey!==projectId) return;
    const key=SLUG+":"+projectId+":"+selectedFolders.join("|");
    try {
      localStorage.setItem(SLUG+":"+projectId+":excluded",JSON.stringify(excludedIds));
      localStorage.setItem(SLUG+":"+projectId+":intro",JSON.stringify(introChoice));
      if(slots.length===160)localStorage.setItem(key,JSON.stringify(slots));
    } catch (_) {}
  }, [projectId, selectedFolders.join("|"), loadedKey, introChoice, excludedIds, slots]);

  const current = slots[editSlot-1];
  const currentVideo = videos.find((v) => v.resourceId === current?.resourceId);
  const introVideo=videos.find((v)=>v.resourceId===introChoice?.resourceId);
  const folderVideos=videos.filter((v)=>selectedFolders.includes(v.folderName));
  const selectedVideos=folderVideos.filter((v)=>!excludedIds.includes(v.resourceId));
  const changeSlot = (patch) => setSlots((old) => old.map((x,i) => i === editSlot-1 ? {...x,...patch} : x));
  const changeIntro=(patch)=>{
    const next={...introChoice,...patch};
    setIntroChoice(next);
    setSlots((old)=>old.length===160?[next,...old.slice(1)]:buildSlots(selectedVideos,next));
  };
  const toggleFolder=(name)=>{
    const next=selectedFolders.includes(name)?selectedFolders.filter((x)=>x!==name):folders.map((x)=>x.name).filter((x)=>selectedFolders.includes(x)||x===name);
    try{localStorage.setItem(SLUG+":"+projectId+":folders",JSON.stringify(next));}catch(_){}
    setSelectedFolders(next);
    setGalleryPage(0);
    setSlots(buildSlots(videos.filter((v)=>next.includes(v.folderName)&&!excludedIds.includes(v.resourceId)),introChoice));
  };
  const toggleExclusion=(id)=>{
    const next=excludedIds.includes(id)?excludedIds.filter((x)=>x!==id):[...excludedIds,id];
    setExcludedIds(next);
    setSlots(buildSlots(videos.filter((v)=>selectedFolders.includes(v.folderName)&&!next.includes(v.resourceId)),introChoice));
  };
  const clearExclusions=()=>{
    setExcludedIds([]);
    setSlots(buildSlots(folderVideos,introChoice));
  };
  const [slotTiming,setSlotTiming]=React.useState({});
  const [timingError,setTimingError]=React.useState("");
  React.useEffect(()=>{
    if(!advancedOpen||Object.keys(slotTiming).length)return;
    let live=true;
    sdk.runShell({summary:"Read fast-cut timings",command:'cat "$SELECTS_USER_SKILLS_ROOT/'+SLUG+'/timing.json"',maxOutputBytes:48000})
      .then((result)=>{
        if(!live)return;
        const manifest=JSON.parse(shellResult(result));
        const bySlot={};
        for(const row of manifest.placements){
          if(row.slot<2)continue;
          const prior=bySlot[row.slot];
          if(!prior)bySlot[row.slot]={firstStart:row.startSeconds,maxDuration:row.endSeconds-row.startSeconds};
          else prior.maxDuration=Math.max(prior.maxDuration,row.endSeconds-row.startSeconds);
        }
        setSlotTiming(bySlot);setTimingError("");
      }).catch((error)=>{if(live)setTimingError(String(error.message||error));});
    return ()=>{live=false;};
  },[advancedOpen]);

  React.useEffect(() => {
    if(!excludeOpen)return;
    let live=true;
    const pageVideos=folderVideos.slice(galleryPage*gallerySize,(galleryPage+1)*gallerySize);
    (async () => {
      for(let i=0;i<pageVideos.length;i+=4){
        await Promise.all(pageVideos.slice(i,i+4).map(async (video) => {
          const at=Math.min(video.durationSeconds*0.35,video.durationSeconds-0.1);
          const key=thumbnailKey(video,at);
          if(thumbnailCache.current[key]!==undefined)return;
          thumbnailCache.current[key]=null;
          let url=null;
          try{url=await captureThumbnail(sdk,video,at);}catch(_){}
          thumbnailCache.current[key]=url;
          if(live)setThumbnails((old)=>({...old,[key]:url}));
        }));
      }
    })();
    return ()=>{live=false;};
  },[excludeOpen,videos,selectedFolders.join("|"),galleryPage]);

  async function make(mode) {
    if (!projectId || slots.length !== 160 || busy || loadedKey!==projectId) return;
    setBusy(true);setError("");setMessage(t.progress);
    try {
      if (!introVideo || !selectedVideos.length) throw new Error(t.noVideo);
      const byId = Object.fromEntries(videos.map((v) => [v.resourceId,v]));
      const intro = {...slots[0],frameSize:byId[slots[0].resourceId]?.frameSize};
      if ((byId[intro.resourceId]?.durationSeconds || 0)-intro.startSeconds < 5) throw new Error(t.invalid);
      const {name,mainCount} = await buildRecap(sdk,{projectId,slots,byId,intro,mode,onProgress:(count,limit)=>setMessage(t.progress + " " + count + "/" + limit)});
      setMessage("Draft created: " + name + " (" + mainCount + " video clips)");
    } catch (e) {
      setError(String(e.message || e));
    } finally {setBusy(false);}
  }

  if (!projectId) return <ui.Message tone="error">{t.noProject}</ui.Message>;
  return <div>
    <ui.Section title="2026 Recap">
      <ui.Stack>
        <p>{t.audio}</p>
        <p>{t.choose}</p>
      </ui.Stack>
    </ui.Section>
    <FinishedExample sdk={sdk} t={t} ui={ui}/>
    {videos.length>0 && <ui.Section title={t.ready}>
      <ui.Stack>
        <ui.Select label={t.intro} value={introChoice?.resourceId||null} onChange={(resourceId)=>changeIntro({resourceId,startSeconds:0})} options={videos.filter((x)=>x.durationSeconds>=5).map((x)=>({value:x.resourceId,label:x.name}))} disabled={busy}/>
        {introVideo&&<SourceWindowPicker sdk={sdk} ui={ui} video={introVideo} startSeconds={introChoice?.startSeconds||0} windowSeconds={4.7} sourceMargin={0.3} onChange={(startSeconds)=>changeIntro({startSeconds})} disabled={busy} label={t.preview} hint={t.previewHint} loading={t.loading} compact/>}
      </ui.Stack>
    </ui.Section>}
    <ui.Section title={t.folderPick}>
      <ui.Stack>
        <small>{t.folderGuide}</small>
        {folders.map((item)=><label key={item.name} style={{display:"flex",alignItems:"center",gap:8}}>
          <input type="checkbox" checked={selectedFolders.includes(item.name)} disabled={busy} onChange={()=>toggleFolder(item.name)}/>
          <span>{item.name} ({item.count})</span>
        </label>)}
        <small>{t.footageCount}: {selectedVideos.length} · {t.quickRule}</small>
        {selectedVideos.length===0&&loadedKey===projectId&&<ui.Message tone="muted">{t.noneIncluded}</ui.Message>}
        <details><summary>{t.rules}</summary><p>{t.poolRule}</p><p>{t.shortNotice}</p></details>
      </ui.Stack>
    </ui.Section>
    {folderVideos.length>0 && <details onToggle={(event)=>setExcludeOpen(event.currentTarget.open)}>
      <summary>{t.gallery} {excludedIds.filter((id)=>folderVideos.some((v)=>v.resourceId===id)).length>0?"("+excludedIds.filter((id)=>folderVideos.some((v)=>v.resourceId===id)).length+")":""}</summary>
      <ui.Section title={t.gallery}>
      <small>{t.galleryHint}</small>
      <small>{t.rebuildHint}</small>
      {excludedIds.length>0&&<ui.Actions><ui.Button variant="secondary" disabled={busy} onClick={clearExclusions}>{t.selectAll}</ui.Button></ui.Actions>}
      <div style={{display:"flex",flexDirection:"column",gap:6,marginTop:8}}>
        {folderVideos.slice(galleryPage*gallerySize,(galleryPage+1)*gallerySize).map((video) => {
          const at=Math.min(video.durationSeconds*0.35,video.durationSeconds-0.1);
          const url=thumbnails[thumbnailKey(video,at)];
          const active=excludedIds.includes(video.resourceId);
          return <label key={video.resourceId} style={{display:"flex",alignItems:"center",gap:8,padding:4,border:active?"2px solid var(--panel-accent)":"1px solid var(--panel-border)",borderRadius:6,minWidth:0}}>
              <input type="checkbox" checked={excludedIds.includes(video.resourceId)} disabled={busy} onChange={()=>toggleExclusion(video.resourceId)}/>
              {url?<img src={url} alt="" style={{width:84,height:52,objectFit:"contain",background:"#111",display:"block",flexShrink:0}}/>:<div style={{width:84,height:52,background:"#111",flexShrink:0}}/>}
              <span style={{minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{video.name}</span>
          </label>;
        })}
      </div>
      <ui.Actions>
        <ui.Button variant="secondary" disabled={busy || galleryPage===0} onClick={()=>setGalleryPage((p)=>p-1)}>{t.previous}</ui.Button>
        <small>{galleryPage+1}/{Math.max(1,Math.ceil(folderVideos.length/gallerySize))}</small>
        <ui.Button variant="secondary" disabled={busy || (galleryPage+1)*gallerySize>=folderVideos.length} onClick={()=>setGalleryPage((p)=>p+1)}>{t.next}</ui.Button>
      </ui.Actions>
      </ui.Section>
    </details>}
    <details onToggle={(event)=>setAdvancedOpen(event.currentTarget.open)}>
      <summary>{t.advanced}</summary>
      {advancedOpen&&slots.length===160&&<ui.Section title={t.advanced}>
        <ui.Stack>
          <small>{t.advancedHint}</small>
          <ui.NumberField label={t.slot} value={editSlot-1} onChange={(v)=>setEditSlot(Math.max(2,Math.min(160,Math.round(v)+1)))} min={1} max={159} step={1} disabled={busy}/>
          {slotTiming[editSlot]&&<small>{t.outputAt}: {slotTiming[editSlot].firstStart.toFixed(2)}s · {slotTiming[editSlot].maxDuration.toFixed(2)}s</small>}
          {editSlot>=61&&editSlot<=143&&<small>{t.repeatsLater}</small>}
          <ui.Select label={t.video} value={current?.resourceId||null} onChange={(resourceId)=>changeSlot({resourceId,startSeconds:0})} options={selectedVideos.map((x)=>({value:x.resourceId,label:x.name}))} disabled={busy}/>
          {timingError&&<ui.Message tone="error">{timingError}</ui.Message>}
          {currentVideo&&slotTiming[editSlot]&&<SourceWindowPicker sdk={sdk} ui={ui} video={currentVideo} startSeconds={current?.startSeconds||0} windowSeconds={slotTiming[editSlot].maxDuration} sourceMargin={0.15} onChange={(startSeconds)=>changeSlot({startSeconds})} disabled={busy} label={t.sourceWindow} hint={t.advancedSourceHint} loading={t.loading}/>}
        </ui.Stack>
      </ui.Section>}
    </details>
    <ui.Section title="Draft">
      <ui.Actions>
        <ui.Button variant="secondary" busy={busy} busyLabel={t.progress} disabled={slots.length !== 160 || loadedKey!==projectId} onClick={() => make("sample")}>{t.sample}</ui.Button>
        <ui.Button variant="primary" busy={busy} busyLabel={t.progress} disabled={slots.length !== 160 || loadedKey!==projectId} onClick={() => make("full")}>{t.full}</ui.Button>
      </ui.Actions>
      {message && <ui.Message tone="muted">{message}</ui.Message>}
      {error && <ui.Message tone="error">{error}</ui.Message>}
    </ui.Section>
  </div>;
}
