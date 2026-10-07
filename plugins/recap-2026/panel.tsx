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

// panel-storage:start
// Keep writes ordered even across a panel remount; failed writes remain visible to callers.
const panelStorageClients = new WeakMap();
function panelStorage(sdk) {
  const storage = sdk?.storage;
  if (!storage || typeof storage.getItem !== "function" || typeof storage.setItem !== "function" || typeof storage.removeItem !== "function") {
    throw new Error("Update Selects to use this plugin: sdk.storage is required.");
  }
  if (!panelStorageClients.has(storage)) {
    let tail = Promise.resolve();
    const enqueue = (operation) => {
      const pending = tail.then(operation);
      tail = pending.catch(() => {});
      return pending;
    };
    panelStorageClients.set(storage, {
      getItem: (key) => enqueue(() => storage.getItem(key)),
      setItem: (key, value) => enqueue(() => storage.setItem(key, value)),
      removeItem: (key) => enqueue(() => storage.removeItem(key)),
    });
  }
  return panelStorageClients.get(storage);
}
function withStoredPanel(Component, load) {
  return function StoredPanel(props) {
    const [state, setState] = React.useState(null);
    const [attempt, retry] = React.useState(0);
    React.useEffect(() => {
      let current = true;
      setState(null);
      Promise.resolve().then(() => load(panelStorage(props.sdk))).then(
        (saved) => { if (current) setState({sdk: props.sdk, saved}); },
        (error) => { if (current) setState({sdk: props.sdk, error: String(error?.message || error)}); },
      );
      return () => { current = false; };
    }, [props.sdk, attempt]);
    if (state?.error) return React.createElement("div", {role: "alert"}, state.error, React.createElement("button", {onClick: () => retry(n => n + 1)}, "Retry loading saved settings"));
    if (state?.sdk !== props.sdk) return React.createElement("div", {role: "status"}, "Loading saved settings…");
    return React.createElement(Component, {...props, saved: state.saved});
  };
}
// panel-storage:end


const SLUG = "recap-2026";
const AUDIO_NAME = "recap-2026-fixed-soundtrack.wav";
const AUDIO_SOURCE_NAME = "recap-preview-v3-beatmatched-61s.wav";
const TITLE_CODE = [
  "import React from 'react';",
  "export default function Graphic({data}) {",
  "return <div style={{width:'100%',height:'100%',display:'flex',flexDirection:'column',justifyContent:'center',alignItems:'center',color:'#fff',textAlign:'center',textShadow:'0 2px 14px rgba(0,0,0,.5)'}}>",
  "<div style={{fontFamily:'Georgia,serif',fontSize:56,fontStyle:'italic',lineHeight:1.2}}>{data.top}</div>",
  "<div style={{fontFamily:'Avenir Next,Segoe UI Black,Arial Black,sans-serif',fontSize:174,fontWeight:900,lineHeight:1}}>{data.year}</div>",
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
    exampleMissing: "\uc608\uc2dc \uc601\uc0c1\uc744 \ubd88\ub7ec\uc62c \uc218 \uc5c6\uc2b5\ub2c8\ub2e4.",
    hostTooOld: "\uc774 \uae30\ub2a5\uc740 \ub354 \ucd5c\uc2e0 \ubc84\uc804\uc758 Selects\uac00 \ud544\uc694\ud569\ub2c8\ub2e4. Selects\ub97c \uc5c5\ub370\uc774\ud2b8\ud55c \ub4a4 \ub2e4\uc2dc \uc2dc\ub3c4\ud558\uc138\uc694."
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
    exampleMissing: "The example video could not be loaded.",
    hostTooOld: "This needs a newer version of Selects. Update Selects and try again."
  }
};
const embedded = (value) => JSON.stringify(value);
const scriptResult = (r) => {
  if (r.isError) throw new Error(r.output || "Selects edit failed");
  if (r.result == null) throw new Error("Selects returned no result");
  return r.result;
};
// One message for a Selects build that lacks a host service (av-host 'host-missing').
const hostMessage = (e, t) => e?.code === "host-missing" ? t.hostTooOld : String(e?.message || e);
// The install and data folders (av-host hostRoots), found once and shared by the panel and template runs.
let recapRootsPromise = null;
const recapRoots = (sdk) => { hostUseSdk(sdk); return recapRootsPromise || (recapRootsPromise = hostRoots(sdk, SLUG, "timing.json").catch((e) => { recapRootsPromise = null; throw e; })); };
const readTiming = async (sdk) => JSON.parse(await hostReadText(hostJoin((await recapRoots(sdk)).plugin, "timing.json")));
// Host file names compare after NFC, \ to / and the basename (and case on Windows).
const normPath = (s) => { const v = String(s || "").normalize("NFC").replace(/\\/g, "/"); const b = v.slice(v.lastIndexOf("/") + 1); return hostIsWindows() ? b.toLowerCase() : b; };
const core = (cfg) => "const cfg=JSON.parse(" + embedded(JSON.stringify(cfg)) + ");const p=selects.project(cfg.projectId);";
const gallerySize = 8;
const thumbnailKey = (video, seconds) => video.resourceId + ":" + seconds.toFixed(2);
// Gallery files are not installed. Pin their published revision and cache them through the SDK.
const EXAMPLE_REVISION = "e8b2230019bad4090d0f6b6cf0c3a69e7a8ecea3";
const EXAMPLE_ASSETS = [
  {name: "preview.mp4", bytes: 6706153},
  {name: "poster.webp", bytes: 21664},
];
async function loadExampleMedia(sdk) {
  const {data} = await recapRoots(sdk);
  if (!data) throw new Error("The example cache is unavailable.");
  const files = panelLocalClient(sdk).files;
  const cachedUrl = async ({name, bytes}) => {
    const path = files.join(data, "example-" + EXAMPLE_REVISION.slice(0, 12) + "-" + name);
    if ((await files.stat(path))?.size !== bytes) {
      const url = "https://raw.githubusercontent.com/CutbackVideo/selects-plugin-library/" + EXAMPLE_REVISION + "/plugins/recap-2026/" + name;
      // The SDK owns temporary files, so a download survives the panel losing its reply.
      await files.downloadFile(url, path);
      if ((await files.stat(path))?.size !== bytes) {
        await files.removeFile({filePath: path}).catch(() => {});
        throw new Error("The example download is incomplete.");
      }
    }
    const url = await files.pathToLocalURL(path);
    if (typeof url !== "string" || !url) throw new Error("The example URL is unavailable.");
    return url;
  };
  const src = await cachedUrl(EXAMPLE_ASSETS[0]);
  // A missing poster must not prevent the video from playing.
  const poster = await cachedUrl(EXAMPLE_ASSETS[1]).catch(() => undefined);
  return {src, poster};
}
function FinishedExample({sdk,t,ui}) {
  const video=React.useRef<HTMLVideoElement | null>(null);
  const [media,setMedia]=React.useState<{src:string;poster?:string} | null>(null);
  const [error,setError]=React.useState("");
  React.useEffect(()=>{
    let active=true;
    const player=video.current;
    setMedia(null);
    setError("");
    loadExampleMedia(sdk).then((value)=>{if(active)setMedia(value);})
      .catch((e)=>{if(active)setError(e?.code==="host-missing"?t.hostTooOld:t.exampleMissing);});
    return ()=>{active=false;if(player){player.pause();player.removeAttribute("src");player.load();}};
  },[sdk,t.hostTooOld,t.exampleMissing]);
  return <ui.Section title={t.example}>
    <small>{t.exampleHint}</small>
    <div style={{marginTop:8,width:"100%",maxWidth:280}}>
      <video ref={video} src={media?.src} poster={media?.poster} controls preload="metadata" playsInline
        onError={()=>setError(t.exampleMissing)}
        style={{display:"block",width:"100%",maxHeight:420,background:"#111",borderRadius:8,aspectRatio:"9 / 16",objectFit:"contain"}}/>
    </div>
    {error&&<ui.Message tone="error">{error}</ui.Message>}
  </ui.Section>;
}
// One frame as a JPEG data URL: the host's ffmpeg writes an ASCII-named file in the data folder, read back and removed.
async function captureThumbnail(sdk, video, seconds) {
  hostUseSdk(sdk);
  if (!video.path) return null;
  const rt = hostApi("Runtime", "runFFmpeg");
  const {data} = await recapRoots(sdk);
  if (!rt || !data) return null;
  const time = Math.max(0, Math.min(video.durationSeconds - 0.1, seconds));
  const out = hostJoin(data, "thumb-" + Date.now() + "-" + Math.floor(Math.random() * 1e6) + ".jpg");
  const controller = typeof AbortController === "undefined" ? null : new AbortController();
  const timer = controller ? setTimeout(() => controller.abort(), 20000) : null;
  try {
    await rt.runFFmpeg(["-nostdin", "-v", "error", "-y", "-ss", time.toFixed(3), "-i", video.path, "-frames:v", "1", "-vf", "scale=240:-2", "-q:v", "12", out], true, controller ? controller.signal : undefined);
    const b = await hostReadBytes(out);
    if (!b.length) return null;
    let s = "";
    for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
    return "data:image/jpeg;base64," + btoa(s);
  } finally {
    if (timer) clearTimeout(timer);
    await hostRemove(out);
  }
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
  hostUseSdk(sdk);
  let r = await sdk.runScript({
    summary:"Find fixed soundtrack",
    script:core({projectId}) + "const r=await p.resources();return r.filter(x=>x.type==='Audio').map(x=>({id:x.resourceId,name:x.name,status:x.status}));"
  });
  let found = scriptResult(r).filter((x) => normPath(x.name) === normPath(AUDIO_NAME) || normPath(x.name) === normPath(AUDIO_SOURCE_NAME));
  if (found.length) return found.find((x) => normPath(x.name) === normPath(AUDIO_NAME))?.id || found[0].id;
  const {plugin, data} = await recapRoots(sdk);
  const path = hostJoin(plugin, "assets", AUDIO_NAME);
  r = await sdk.runScript({
    summary:"Import fixed soundtrack",allowCommit:true,
    script:core({projectId,path}) + "return await p.importFiles({paths:[cfg.path]});"
  });
  let imported = scriptResult(r).addedResourceIds;
  if (!imported?.length && data) {
    // Retry from a copy in the data folder (written through the host FileSystem, staged then renamed).
    const alternate = hostJoin(data, AUDIO_NAME), tmp = hostJoin(data, "soundtrack-" + Date.now() + ".part"), move = hostApi("FileSystem", "rename");
    await hostNeed("FileSystem", "writeFile").writeFile(move ? tmp : alternate, await hostReadBytes(path));
    if (move) { await hostRemove(alternate); (await move.rename(tmp, alternate)); }
    r = await sdk.runScript({
      summary:"Import fixed soundtrack",allowCommit:true,
      script:core({projectId,path:alternate}) + "return await p.importFiles({paths:[cfg.path]});"
    });
    imported = scriptResult(r).addedResourceIds;
  }
  if (!imported?.length) throw new Error("Could not import the bundled soundtrack");
  const id = imported[0];
  // Starting analysis only dispatches it, but on a busy host the call can pass the default 30 s deadline. A slow or
  // failed start is not fatal: the status poll below decides, and starts it once more if it never left "pending".
  const start = () => sdk.runScript({
    summary:"Analyze fixed soundtrack",allowCommit:true,timeoutSeconds:120,
    script:core({projectId,id}) + "return await p.startAnalysis({resourceIds:[cfg.id]});"
  }).then((x) => { if (x?.isError) console.warn("[recap-2026] soundtrack analysis start:", x.output); }, (e) => console.warn("[recap-2026] soundtrack analysis start:", e));
  await start();
  for (let attempt=0;attempt<60;attempt++) {
    await new Promise((resolve) => setTimeout(resolve,2000));
    r = await sdk.runScript({
      summary:"Check soundtrack analysis",
      script:core({projectId,id}) + "const x=(await p.resources()).find(v=>v.resourceId===cfg.id);return {status:x?.status};"
    });
    const status = scriptResult(r).status;
    if (status === "analyzingSucceeded" || status === "analysisMerged") return id;
    if (status === "pending" && attempt === 9) await start();
    if (status === "analyzingFailed" || status === "samplingFailed") throw new Error("Soundtrack analysis failed: " + status);
  }
  throw new Error("Soundtrack analysis is still running. Wait for it to finish, then create the Draft again.");
}


// Builds the recap Draft: the intro, the 242 fast cuts in batches, then the
// soundtrack and title. `slots` holds the intro and 159 cut sources; `byId`
// the videos they name. Resolves the new Draft's id, name and clip count.
async function buildRecap(sdk,{projectId,slots,byId,intro,mode,onProgress=(_count,_limit)=>{}}) {
  hostUseSdk(sdk);
  const manifest = await readTiming(sdk);
  if (manifest.placements?.length !== 243) throw new Error("Template timing is incomplete");
  const audioId = await ensureAudio(sdk, projectId);
  const name = "2026 Recap — " + (mode === "sample" ? "12s sample " : "") + new Date().toLocaleString();
  let r = await sdk.runScript({
    summary:"Create recap intro",allowCommit:true,timeoutSeconds:120,
    script:createScript({projectId,name,intro,introEnd:manifest.placements[1].startSeconds})
  });
  const draftId = scriptResult(r).draftId;
  if (!draftId) throw new Error("Created Draft ID missing");
  const limit = mode === "sample" ? 33 : manifest.placements.length;
  for (let end=25;end<limit+24;end+=24) {
    const to = Math.min(end,limit);
    if (to <= 1) break;
    r = await sdk.runScript({
      summary:"Add recap footage",allowCommit:true,timeoutSeconds:120,
      script:batchScript({projectId,draftId,start:1,end:to,placements:manifest.placements,slots,media:byId})
    });
    const out = scriptResult(r);
    onProgress(out.mainCount, limit);
    if (to === limit) break;
  }
  r = await sdk.runScript({
    summary:"Finish recap Draft",allowCommit:true,timeoutSeconds:120,
    script:finishScript({projectId,draftId,audioId,introEnd:manifest.placements[1].startSeconds,full:mode==="full",titleCode:TITLE_CODE,fadeCode:FADE_CODE})
  });
  const out = scriptResult(r);
  return {draftId,name,mainCount:out.mainCount};
}

// The length the Resource itself reports (the source-file tree keeps the length from when the tree was built,
// which can be missing or 0), keyed by script resource id. Prepended to a script that reads `dur`.
const RESOURCE_SECONDS = "const res=await p.resources();const dur={};for(const x of res)dur[x.resourceId]=x.durationSeconds;";
// Return only the picked videos across the script boundary, including Resources missing from the tree.
const selectedVideosScript = (projectId, resourceIds) => core({projectId,resourceIds}) + RESOURCE_SECONDS +
  "const items=[];const walk=(nodes)=>{for(const n of nodes||[]){if(n.type==='dir')walk(n.children);else if(n.type==='video'&&n.resourceId)items.push({resourceId:n.resourceId,name:n.name,path:n.path,durationSeconds:dur[n.resourceId]||n.durationSeconds,frameSize:n.frameSize});}};const r=await p.sourceFiles();if('fileTree' in r)walk(r.fileTree);else for(const f of r.folders){const page=await p.sourceFiles({folder:f.name});if('fileTree' in page)walk(page.fileTree);}const seen=new Set(items.map(x=>x.resourceId));for(const x of res)if(String(x.type).toLowerCase()==='video'&&!seen.has(x.resourceId))items.push({resourceId:x.resourceId,name:x.name,path:null,durationSeconds:x.durationSeconds});return items.filter(x=>cfg.resourceIds.includes(x.resourceId));";
// A clip with no length yet is measured with the host's ffprobe (av-host hostProbeSeconds) when it has a path.
async function withDurations(list) {
  for (const v of list) if (!(v.durationSeconds > 0) && v.path) v.durationSeconds = (await hostProbeSeconds(v.path)) || 0;
  return list;
}

const TEMPLATE_FAILED = "2026 Recap couldn't make the timeline. Try again.";

// The app hands a template its own Resource ids, but every run_script read
// (resources(), clips()) speaks the short ids the script SDK gives out (r0, r1…).
// The app's list (sdk.call) and the script's list are the Project's Resources in
// the same order. Return only the picked rows and compare their names and types
// before using their script ids.
async function scriptResourceIds(sdk, projectId, resourceIds) {
  const app = await sdk.call("listProjectResources", projectId);
  if (!Array.isArray(app)) throw new Error("Could not read the project resources.");
  const indices = [...new Set(resourceIds)].map(id => app.findIndex(r => r.resourceId === id));
  if (indices.includes(-1)) throw new Error("A picked clip is missing from this project.");
  const run = await sdk.runScript({ summary: "Match picked clips", allowCommit: false, script: `const rows=await selects.project(${JSON.stringify(projectId)}).resources();return {count:rows.length,rows:${JSON.stringify(indices)}.map(i=>{const r=rows[i];return r?{id:r.resourceId,name:r.name,type:r.type}:null;})};` });
  const result = scriptResult(run), rows = result.rows;
  if (result.count !== app.length || !Array.isArray(rows) || rows.length !== indices.length || indices.some((index, i) => app[index].name !== rows[i]?.name || app[index].type !== rows[i]?.type)) throw new Error("Could not match the picked clips to this project.");
  return new Map(indices.map((index, i) => [app[index].resourceId, rows[i].id]));
}

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
      const ids = await scriptResourceIds(sdk, projectId, [introPick, ...clipPicks].map(x => x.resourceId));
      const own = (id) => ids.get(id) ?? id;
      const found = scriptResult(await sdk.runScript({ script: selectedVideosScript(projectId, [...ids.values()]), summary: "Read footage" }));
      const byId = Object.fromEntries(found.map((v) => [v.resourceId, v]));
      const introVideo = byId[own(introPick.resourceId)];
      const videos = clipPicks.map((x) => byId[own(x.resourceId)]);
      await withDurations([introVideo, ...videos].filter(Boolean));
      if (!introVideo) throw new Error("The picked intro clip could not be read. Try again.");
      if (!(introVideo.durationSeconds >= 5)) throw new Error("Pick an intro clip at least 5 seconds long.");
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
      const said = e?.code === "host-missing" ? WORDS.en.hostTooOld : String(e?.message || "");
      finish({ error: said && said.length <= 160 && !/[\n{]/.test(said) ? said : TEMPLATE_FAILED });
    });
  }, [runId]);
  return <small>{status}</small>;
}

function Panel(props) {
  hostUseSdk(props.sdk);
  return props.context?.template ? <TemplateRun {...props} /> : <RecapPanel key={props.context?.projectId} {...props} />;
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
    sdk.runScript({script,summary:"List footage folders"}).then(async (r) => {
      if (!live) return;
      const found = scriptResult(r).filter((x) => x.count > 0);
      found.sort((a,b) => b.count-a.count);
      let initial=found[0]?[found[0].name]:[];
      const saved=JSON.parse((await panelStorage(sdk).getItem(SLUG+":"+projectId+":folders"))||"null");
      if (!live) return;
      if(Array.isArray(saved))initial=found.map((x)=>x.name).filter((name)=>saved.includes(name));
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
    const script = core({projectId,folders:folders.map((x)=>x.name)}) + RESOURCE_SECONDS +
      "const out=[];for(const name of cfg.folders){const r=await p.sourceFiles({folder:name});if(!('fileTree' in r))throw Error('Footage folder returned a summary');for(const x of r.fileTree){if(x.type!=='video')continue;const d=dur[x.resourceId]||x.durationSeconds;if(d>=1.7||!(d>0))out.push({resourceId:x.resourceId,name:x.name,path:x.path,durationSeconds:d,frameSize:x.frameSize,folderName:name});}}return out;";
    readMediaPages(sdk,{script,summary:"Read footage folders"}).then((r) => withDurations(scriptResult(r))).then(async (list) => {
      if (!live) return;
      const found = [...new Map(list.filter((v)=>v.durationSeconds>=1.7).map((v)=>[v.resourceId,v])).values()].sort((a,b) => a.name.localeCompare(b.name));
      const key=SLUG+":"+projectId+":"+selectedFolders.join("|");
      let intro=null;
      let excluded=[];
      let next=[];
      const storage = panelStorage(sdk);
      const [savedText, introText, oldIntroText, excludedText] = await Promise.all([
        storage.getItem(key), storage.getItem(SLUG+":"+projectId+":intro"),
        storage.getItem(key+":intro"), storage.getItem(SLUG+":"+projectId+":excluded"),
      ]);
      if (!live) return;
      {
        const saved = JSON.parse(savedText || "null");
        const savedIntro=JSON.parse(introText||"null")||JSON.parse(oldIntroText||"null")||(Array.isArray(saved)?saved[0]:null);
        const introMedia=found.find((v)=>v.resourceId===savedIntro?.resourceId&&v.durationSeconds>=5);
        if(introMedia)intro={resourceId:introMedia.resourceId,startSeconds:Math.max(0,Math.min(introMedia.durationSeconds-5,savedIntro.startSeconds||0))};
        const storedExcluded=JSON.parse(excludedText||"[]");
        if(Array.isArray(storedExcluded))excluded=storedExcluded.filter((id)=>found.some((v)=>v.resourceId===id));
        const available=found.filter((v)=>selectedFolders.includes(v.folderName)&&!excluded.includes(v.resourceId));
        if (Array.isArray(saved) && saved.length === 160 && saved.every((x,index) => index===0?x.resourceId===intro?.resourceId:available.some((v)=>v.resourceId===x.resourceId))) next = saved.map((slot,index)=>{
          const media=found.find((v)=>v.resourceId===slot.resourceId);
          const max=Math.max(0,(media?.durationSeconds||0)-(index===0?5:1.7));
          return {...slot,startSeconds:Math.max(0,Math.min(max,slot.startSeconds||0))};
        });
      }
      if(!intro){const first=found.find((v)=>v.durationSeconds>=5);intro=first?{resourceId:first.resourceId,startSeconds:0}:null;}
      if(!next.length)next=buildSlots(found.filter((v)=>selectedFolders.includes(v.folderName)&&!excluded.includes(v.resourceId)),intro);
      setVideos(found);
      setExcludedIds(excluded);
      setIntroChoice(intro);setSlots(next);setLoadedKey(projectId);setMessage(found.length ? t.ready : t.noVideo);
    }).catch((e) => {if(live){setError(String(e.message || e));setMessage("");}});
    return () => {live = false;};
  }, [projectId, folders.map((x)=>x.name).join("|")]);

  // Capture each complete selection before queueing writes, including the final edit.
  const saveSelection = () => {
    const storage = panelStorage(sdk);
    const key=SLUG+":"+projectId+":"+selectedFolders.join("|");
    const writes = [
      storage.setItem(SLUG+":"+projectId+":folders", JSON.stringify(selectedFolders)),
      storage.setItem(SLUG+":"+projectId+":excluded", JSON.stringify(excludedIds)),
      storage.setItem(SLUG+":"+projectId+":intro", JSON.stringify(introChoice)),
    ];
    if(slots.length===160) writes.push(storage.setItem(key, JSON.stringify(slots)));
    return Promise.all(writes);
  };
  React.useEffect(() => {
    if (!projectId || loadedKey!==projectId) return;
    let current = true;
    saveSelection().catch(e => { if(current) setError("Could not save recap selections: " + String(e?.message || e)); });
    return () => { current = false; };
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
    readTiming(sdk)
      .then((manifest)=>{
        if(!live)return;
        const bySlot={};
        for(const row of manifest.placements){
          if(row.slot<2)continue;
          const prior=bySlot[row.slot];
          if(!prior)bySlot[row.slot]={firstStart:row.startSeconds,maxDuration:row.endSeconds-row.startSeconds};
          else prior.maxDuration=Math.max(prior.maxDuration,row.endSeconds-row.startSeconds);
        }
        setSlotTiming(bySlot);setTimingError("");
      }).catch((error)=>{if(live)setTimingError(hostMessage(error,t));});
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
      await saveSelection();
      if (!introVideo || !selectedVideos.length) throw new Error(t.noVideo);
      const byId = Object.fromEntries(videos.map((v) => [v.resourceId,v]));
      const intro = {...slots[0],frameSize:byId[slots[0].resourceId]?.frameSize};
      if ((byId[intro.resourceId]?.durationSeconds || 0)-intro.startSeconds < 5) throw new Error(t.invalid);
      const {name,mainCount} = await buildRecap(sdk,{projectId,slots,byId,intro,mode,onProgress:(count,limit)=>setMessage(t.progress + " " + count + "/" + limit)});
      setMessage("Draft created: " + name + " (" + mainCount + " video clips)");
    } catch (e) {
      setError(hostMessage(e,t));
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
        <ui.Select label={t.intro} value={introChoice?.resourceId||null} onChange={(resourceId)=>changeIntro({resourceId,startSeconds:0})} options={videos.filter((x)=>x.durationSeconds>=5).map((x)=>({value:x.resourceId,label:x.name}))} disabled={busy || loadedKey!==projectId}/>
        {introVideo&&<SourceWindowPicker sdk={sdk} ui={ui} video={introVideo} startSeconds={introChoice?.startSeconds||0} windowSeconds={4.7} sourceMargin={0.3} onChange={(startSeconds)=>changeIntro({startSeconds})} disabled={busy || loadedKey!==projectId} label={t.preview} hint={t.previewHint} loading={t.loading} compact/>}
      </ui.Stack>
    </ui.Section>}
    <ui.Section title={t.folderPick}>
      <ui.Stack>
        <small>{t.folderGuide}</small>
        {folders.map((item)=><label key={item.name} style={{display:"flex",alignItems:"center",gap:8}}>
          <input type="checkbox" checked={selectedFolders.includes(item.name)} disabled={busy || loadedKey!==projectId} onChange={()=>toggleFolder(item.name)}/>
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
      {excludedIds.length>0&&<ui.Actions><ui.Button variant="secondary" disabled={busy || loadedKey!==projectId} onClick={clearExclusions}>{t.selectAll}</ui.Button></ui.Actions>}
      <div style={{display:"flex",flexDirection:"column",gap:6,marginTop:8}}>
        {folderVideos.slice(galleryPage*gallerySize,(galleryPage+1)*gallerySize).map((video) => {
          const at=Math.min(video.durationSeconds*0.35,video.durationSeconds-0.1);
          const url=thumbnails[thumbnailKey(video,at)];
          const active=excludedIds.includes(video.resourceId);
          return <label key={video.resourceId} style={{display:"flex",alignItems:"center",gap:8,padding:4,border:active?"2px solid var(--panel-accent)":"1px solid var(--panel-border)",borderRadius:6,minWidth:0}}>
              <input type="checkbox" checked={excludedIds.includes(video.resourceId)} disabled={busy || loadedKey!==projectId} onChange={()=>toggleExclusion(video.resourceId)}/>
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
          <ui.NumberField label={t.slot} value={editSlot-1} onChange={(v)=>setEditSlot(Math.max(2,Math.min(160,Math.round(v)+1)))} min={1} max={159} step={1} disabled={busy || loadedKey!==projectId}/>
          {slotTiming[editSlot]&&<small>{t.outputAt}: {slotTiming[editSlot].firstStart.toFixed(2)}s · {slotTiming[editSlot].maxDuration.toFixed(2)}s</small>}
          {editSlot>=61&&editSlot<=143&&<small>{t.repeatsLater}</small>}
          <ui.Select label={t.video} value={current?.resourceId||null} onChange={(resourceId)=>changeSlot({resourceId,startSeconds:0})} options={selectedVideos.map((x)=>({value:x.resourceId,label:x.name}))} disabled={busy || loadedKey!==projectId}/>
          {timingError&&<ui.Message tone="error">{timingError}</ui.Message>}
          {currentVideo&&slotTiming[editSlot]&&<SourceWindowPicker sdk={sdk} ui={ui} video={currentVideo} startSeconds={current?.startSeconds||0} windowSeconds={slotTiming[editSlot].maxDuration} sourceMargin={0.15} onChange={(startSeconds)=>changeSlot({startSeconds})} disabled={busy || loadedKey!==projectId} label={t.sourceWindow} hint={t.advancedSourceHint} loading={t.loading}/>}
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

export default withPanelLocalClient(withStoredPanel(Panel, async () => ({})));
// local-sdk:end
