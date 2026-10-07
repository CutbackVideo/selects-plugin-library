// @name Depth Type Captions
// @collection visual-highlights
// @name:de Depth-Type-Untertitel
// @name:en Depth Type Captions
// @name:es Subtítulos Depth Type
// @name:fr Sous-titres Depth Type
// @name:it Sottotitoli Depth Type
// @name:ja Depth Type 字幕
// @name:pt Legendas Depth Type
// @name:tr Depth Type Altyazılar
// @name:zh Depth Type 字幕
// @icon captions
// Independent phrase typography with subject-aware depth, native graphics, and editable layers.
import React,{useState,useEffect,useRef} from 'react';
const h=React.createElement;
// Independent phrase-layer model. No Editorial Blur runtime or state dependency.
const DEPTH_DEFAULTS = {
  red: "#EB0706",
  white: "#FFFDF7",
  blockFont: "Impact",
  serifFont: "Bodoni 72",
  scriptFont: "Snell Roundhand",
  connectorFont: "Didot",
  depth: true,
  // "foreground": everything the subject detector treats as in front (people,
  // hands, mics, glasses, desks); "person": people only, so desks and props
  // never hide supporting lines, but props in front of a person get text over them.
  subject: "foreground",
  maskGrow: 1,
  maxCoveredLetters: 2,
  wordBuildShare: 80,
  background: "footage",
  contrast: "subtle",
  rowSpacing: -1.5,
};
const depthCopy = (v) => JSON.parse(JSON.stringify(v));
function depthValidate(plan) {
  if (!Array.isArray(plan) || !plan.length)
    throw new Error("Choose Make depth captions first.");
  const ids = new Set();
  for (const p of plan) {
    if (!p.id || ids.has(p.id))
      throw new Error("Phrase identities must be unique.");
    ids.add(p.id);
    if (
      !Number.isFinite(p.start) ||
      !Number.isFinite(p.end) ||
      p.start < 0 ||
      p.end <= p.start
    )
      throw new Error("Each phrase needs a valid start and end time.");
    if (!p.layers?.length)
      throw new Error("Each phrase needs at least one layer.");
    for (const l of p.layers) {
      if (!String(l.text || "").trim()) throw new Error("A layer has no text.");
      if (
        !Number.isFinite(l.start) ||
        !Number.isFinite(l.end) ||
        l.start < p.start - 1e-6 ||
        l.end > p.end + 1e-6 ||
        l.end <= l.start
      )
        throw new Error("Layer times must be inside their phrase.");
      for (const k of ["x", "y", "width", "height", "z"])
        if (!Number.isFinite(l[k])) throw new Error("Invalid layer " + k);
      if (l.width <= 0 || l.height <= 0)
        throw new Error("Layer width and size must be positive.");
    }
  }
  return plan;
}
// Intersect caption intervals with the current picture; never stretch the footage.
function depthBoundPlan(plan, duration) {
  if (!Number.isFinite(duration) || duration <= 0) throw new Error("This draft has no video to caption.");
  let clippedLayers=0,droppedLayers=0,droppedPhrases=0,clippedPhrases=0;
  const bounded=[];
  for (const original of plan) {
    const p=JSON.parse(JSON.stringify(original));
    p.end=Math.min(p.end,duration);
    if(p.end<original.end-1e-9)clippedPhrases++;
    p.layers=p.layers.flatMap(l=>{
      const end=Math.min(l.end,p.end);
      if(l.start>=end-1e-9){droppedLayers++;return [];}
      if(end<l.end-1e-9)clippedLayers++;
      return [{...l,end}];
    });
    if(p.start>=p.end-1e-9 || !p.layers.length){droppedPhrases++;continue;}
    bounded.push(p);
  }
  if(!bounded.length)throw new Error("All captions fall outside this draft. Choose Redo.");
  return {plan:bounded,clippedLayers,droppedLayers,droppedPhrases,clippedPhrases,changed:clippedLayers+droppedLayers+droppedPhrases+clippedPhrases>0};
}
function depthLayer(id, text, start, end, role, x, y, width, height, z = 0) {
  return {
    id,
    text,
    start,
    end,
    role,
    x,
    y,
    width,
    height,
    z,
    color: "",
    font: "",
  };
}
// Shared lexical/timing emphasis: explicit selection always wins. No semantic AI claim.
function depthEmphasisIndex(words){
  const weak=new Set('a an the this that these those i you he she it we they my your our their is are was were be been being have has had do does did can could would should will shall may might to of in on at for from with and or but so if as than then very really just also everybody everyone somebody something'.split(' '));
  let best=0,score=-Infinity;
  words.forEach((w,i)=>{const token=String(w.text).toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
    const value=(weak.has(token)?-10:0)+Math.min(.8,Math.max(0,(w.e||0)-(w.s||0)))*2+(/[!?]/.test(w.text)?.5:0);
    if(value>score){score=value;best=i;}
  });return best;
}
function depthReadingGroups(tokens,maxChars=32){
  const groups=[];let group=[];
  for(const token of tokens){
    const text=String(token.text),prior=group.at(-1);
    const chars=group.reduce((n,t)=>n+String(t.text).length+1,0);
    const boundary=prior&&(/[,:;.!?]$/.test(prior.text)||/^(and|but|because|while|although|which|who|when|if)$/i.test(text));
    if(group.length&&(boundary||chars+text.length>maxChars)){groups.push(group);group=[];}
    group.push(token);
  }if(group.length)groups.push(group);return groups;
}
function depthCompose(p, preset) {
  const words = p.words?.length
    ? p.words
    : String(p.text || "")
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((text, i, a) => ({
          text,
          s: p.start + ((p.end - p.start) * i) / a.length,
          e: p.start + ((p.end - p.start) * (i + 1)) / a.length,
        }));
  const hero=Number.isInteger(p.emphasisIndex)&&p.emphasisIndex>=0&&p.emphasisIndex<words.length?p.emphasisIndex:depthEmphasisIndex(words);
  const layers = [],
    end = p.end,
    role =
      preset === "impact" ? "block" : preset === "script" ? "script" : "serif";
  if (words.length <= 2) {
    layers.push(
      depthLayer(
        p.id + "-hero",
        words.map((w) => w.text).join(" "),
        p.start,
        end,
        role,
        50,
        42,
        94,
        40,
        1,
      ),
    );
  } else {
    const before = words.slice(0, hero),
      after = words.slice(hero + 1);
    if (before.length)
      layers.push(
        depthLayer(
          p.id + "-lead",
          before.map((w) => w.text).join(" "),
          p.start,
          end,
          preset === "impact" ? "script-white" : "connector",
          50,
          14,
          94,
          14,
          0,
        ),
      );
    layers.push(
      depthLayer(
        p.id + "-hero",
        words[hero].text,
        Math.max(p.start, words[hero].s),
        end,
        role,
        50,
        34,
        96,
        34,
        1,
      ),
    );
    if (after.length)
      layers.push(
        depthLayer(
          p.id + "-tail",
          after.map((w) => w.text).join(" "),
          Math.max(p.start, after[0].s),
          end,
          preset === "script" ? "serif" : "connector",
          50,
          69,
          90,
          15,
          2,
        ),
      );
  }
  return { ...p, preset, layers };
}
function depthPlanWords(words, fps, duration) {
  const groups = [];
  let g = [];
  for (const raw of words) {
    const w = {
      text: raw.text.trim(),
      s: raw.s / fps,
      e: raw.e / fps,
      source: raw.source,
      wordId: raw.wordId,
      speaker: raw.speaker,
      resource: raw.resource,
      utterance: raw.utterance,
    };
    if (!w.text) continue;
    const prev = g.at(-1);
    if (
      prev &&
      (g.length >= 9 ||
        w.s - prev.e > 0.42 ||
        prev.speaker !== w.speaker ||
        prev.resource !== w.resource ||
        prev.utterance !== w.utterance ||
        /[.!?]$/.test(prev.text))
    ) {
      groups.push(g);
      g = [];
    }
    g.push(w);
  }
  if (g.length) groups.push(g);
  return depthValidate(
    groups.map((g, i) => {
      const start = g[0].s,
        end = Math.min(
          duration,
          groups[i + 1]?.[0].s ?? duration,
          g.at(-1).e + 0.16,
        );
      return depthCompose(
        {
          id: "phrase-" + i,
          start,
          end,
          text: g.map((w) => w.text).join(" "),
          words: g,
        },
        "impact",
      );
    }),
  );
}
// Word cues use Caption-shaped JSON; no font/layout changes during a reveal.
function depthLayerWordCues(phrase, layer) {
  const tokens=String(layer.text).match(/\S+/g)||[];
  const words=phrase.words||[];
  const norm=t=>String(t).normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]/gu,"");
  const candidates=[];
  for(let i=0;i+tokens.length<=words.length;i++){
    if(tokens.every((t,j)=>norm(t)===norm(words[i+j].text)) && words.slice(i,i+tokens.length).every(w=>Number.isFinite(w.s)&&Number.isFinite(w.e)))candidates.push(i);
  }
  if(!tokens.length||!candidates.length)return null;
  const offset=candidates.sort((a,b)=>Math.abs(words[a].s-layer.start)-Math.abs(words[b].s-layer.start))[0];
  return tokens.map((text,j)=>({text,startMs:Math.max(layer.start,words[offset+j].s)*1000,endMs:layer.end*1000,timestampMs:words[offset+j].s*1000,confidence:null}));
}
function depthRevealModes(plan,settings) {
  const automatic=plan.filter(p=>!p.revealMode||p.revealMode==="auto");
  const share=Math.max(0,Math.min(100,Number(settings.wordBuildShare??80)));
  const wholeCount=Math.round(automatic.length*(100-share)/100);
  // Short statements/reactions get whole-phrase entrances first.
  const ranked=automatic.map((p,i)=>({p,i,count:String(p.text||p.layers.map(l=>l.text).join(" ")).trim().split(/\s+/).length})).sort((a,b)=>a.count-b.count||a.i-b.i);
  const whole=new Set(ranked.slice(0,wholeCount).map(x=>x.p.id));
  return new Map(plan.map(p=>[p.id,p.revealMode&&p.revealMode!=="auto"?p.revealMode:whole.has(p.id)?"phrase":"words"]));
}
// Measure complete lines once. Reveal opacity never participates in font sizing.
const depthTypeCache=new Map();
function depthTypeSpec(l,settings,W,H) {
  const font=l.font||({block:settings.blockFont,serif:settings.serifFont,"serif-red":settings.serifFont,script:settings.scriptFont,"script-white":settings.scriptFont,connector:settings.connectorFont}[l.role])||"serif";
  const text=l.role.startsWith("script")?l.text:l.text.toUpperCase();
  const family=font.split(",").map(n=>{n=n.trim().replace(/^[\"']|[\"']$/g,"");return /^(serif|sans-serif|monospace|cursive|fantasy|system-ui)$/.test(n)?n:JSON.stringify(n);}).join(",");
  const key=font+"\n"+text;
  let m=depthTypeCache.get(key);
  if(!m){
    if(typeof document!=="undefined"){
      const ns="http://www.w3.org/2000/svg",svg=document.createElementNS(ns,"svg"),node=document.createElementNS(ns,"text");
      svg.setAttribute("style","position:fixed;left:-10000px;top:0;width:10000px;height:1000px;visibility:hidden;pointer-events:none");
      node.setAttribute("font-family",family);node.setAttribute("font-size","100");node.setAttribute("font-weight","400");node.setAttribute("xml:space","preserve");node.textContent=text;
      svg.appendChild(node);document.body.appendChild(svg);
      try{
        const advance=node.getComputedTextLength()/100;
        const ctx=document.createElement("canvas").getContext("2d");ctx.font="400 100px "+family;
        const ink=ctx.measureText(text),cap=ctx.measureText("H");
        m={advance,cap:(cap.actualBoundingBoxAscent||72)/100,ascent:(ink.actualBoundingBoxAscent||72)/100,descent:(ink.actualBoundingBoxDescent||0)/100};
      }finally{svg.remove();}
    }else m={advance:Math.max(1,[...text].length*.65),cap:.72,ascent:.72,descent:0};
    depthTypeCache.set(key,m);
  }
  const fontSize=Math.min(l.height*H/100/m.cap,l.width*W/100/Math.max(.01,m.advance));
  return {font:family,text,fontSize,advance:m.advance*fontSize,ascent:m.ascent*fontSize,inkHeight:(m.ascent+m.descent)*fontSize};
}
function depthRowGap(previous,current,settings){
  const requested=Math.max(-3,Math.min(4,Number(settings.rowSpacing??-1.5)));
  // Decorative script may interlock. Reading lines below a headline need separation.
  return previous.role.startsWith('script')?Math.max(requested,-1.5):Math.max(requested,.7);
}
function depthReferenceComposition(plan,width,height,settings=DEPTH_DEFAULTS){
  return depthCopy(plan).map(p=>{
    if(!p.layers.length||p.layers.some(l=>Object.keys(l.wordEdits||{}).length))return p;
    const hero=p.layers.find(l=>l.id.endsWith('-hero'))||p.layers.reduce((a,b)=>a.height>=b.height?a:b);
    const hi=p.layers.indexOf(hero),H=1000*height/width;
    // Headline placement and size limits remain editorial decisions, including overscan.
    const head={...hero,role:'block',font:settings.blockFont,color:settings.red};
    const makeRows=(layers,lead)=>{
      const rows=[];
      for(const l of layers){
        const cues=depthLayerWordCues(p,l),tokens=String(l.text).trim().split(/\s+/).map((text,i)=>({text,cue:cues?.[i]}));
        // Edited text without reliable cues keeps its original layer timing.
        for(const [j,g] of depthReadingGroups(tokens,width>height?36:22).entries()){
          const role=lead?'script-white':'serif';
          rows.push({...l,id:j===0?l.id:l.id+'-part-'+j,text:g.map(t=>t.text).join(' '),role,font:lead?settings.scriptFont:settings.serifFont,color:settings.white,
            start:g[0].cue?Math.max(p.start,g[0].cue.startMs/1000):l.start,anchor:'ink',height:lead?17:12,typeBase:undefined});
        }
      }return rows;
    };
    const before=makeRows(p.layers.slice(0,hi),true),after=makeRows(p.layers.slice(hi+1),false);
    const ink=l=>depthTypeSpec(l,settings,1000,H).inkHeight/H*100;
    let y=head.y;
    for(let i=before.length-1;i>=0;i--){const l=before[i];y-=ink(l)+depthRowGap(l,i===before.length-1?head:before[i+1],settings);l.y=y;}
    let previous=head;
    for(const l of after){l.y=previous.y+ink(previous)+depthRowGap(previous,l,settings);previous=l;}
    return {...p,preset:'impact',layers:[...before,head,...after]};
  });
}
function depthRestoreTypography(plan,width,height,settings=DEPTH_DEFAULTS) {
  return depthCopy(plan).map(p=>{
    const heroIndex=Math.max(0,p.layers.findIndex(l=>l.id.endsWith("-hero")));
    const layers=p.layers.map((l,i)=>({...l,x:50,y:0,width:i===heroIndex?98:94,height:i===heroIndex?(p.preset==="script"?30:38):17,anchor:"ink"}));
    // Negative spacing deliberately interlocks the edges of neighboring rows.
    let bottom=0;
    layers.forEach((l,i)=>{
      const spec=depthTypeSpec(l,settings,1000,1000*height/width);
      l.y=bottom+(i?depthRowGap(layers[i-1],l,settings):0);
      bottom=l.y+spec.inkHeight/(10*height/width);
    });
    const offset=(100-bottom)/2;
    layers.forEach(l=>{
      l.y+=offset;
      l.typeBase={x:l.x,y:l.y,width:l.width,height:l.height,canvasWidth:width,canvasHeight:height};
    });
    return {...p,layoutMode:"compact",layers};
  });
}

function depthMaskAt(mask, time) {
  if (!mask?.frames?.length) return null;
  let lo = 0,
    hi = mask.frames.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (mask.frames[mid].t <= time + 1e-6) lo = mid + 1;
    else hi = mid - 1;
  }
  return hi >= 0 ? { ...mask.frames[hi], index: hi } : null;
}
function depthMaskFits(mask, width, height) {
  if (!mask || ![mask.width, mask.height, width, height].every(v => Number.isFinite(v) && v > 0)) return false;
  // Allow one mask pixel of rounding, never reshape a portrait mask to landscape.
  return Math.abs(mask.width / mask.height - width / height) <= 2 / mask.height;
}
// Draws the phrase layers active at `time` as one SVG. `pass` picks the words
// behind the speaker ("behind"), in front of it ("front"), or both ("all").
// The editor masks behind-speaker words with its layout mask here; the saved
// graphic draws the "behind" pass under a full-resolution mask file instead.
function depthSvg(
  plan,
  settings,
  time,
  width,
  height,
  mask = null,
  showMask = false,
  namespace = "depth-type",
  pass = "all",
) {
  if (settings.depth && mask && !depthMaskFits(mask, width, height)) {
    return '<svg style="display:block;width:100%;height:100%;max-width:none;max-height:none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%"></svg>';
  }
  const esc = (s) =>
    String(s).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  const maskId =
    String(namespace).replace(/[^a-zA-Z0-9_-]/g, "") +
    "-" +
    Math.round(time * 1000000) +
    "-subject";
  const W = 1000,
    H = (1000 * height) / width;
  const modes=depthRevealModes(plan,settings);
  const active = plan
    .flatMap((p) => p.layers.map((l) => ({ ...l, start:modes.get(p.id)==="phrase"&&Number.isFinite(p.start)?p.start:l.start, phraseId: p.id, cues:modes.get(p.id)==="words"?depthLayerWordCues(p,l):null })))
    .filter((l) => time >= l.start && time < l.end)
    .sort((a, b) => a.z - b.z);
  const sample = depthMaskAt(mask, time);
  const maskSrc = sample?.png ? "data:image/png;base64," + sample.png : "";
  const masked = !!(settings.depth && maskSrc);
  let body = "";
  // The layout mask already carries the speaker edge margin.
  const defs = masked
    ? '<defs><mask id="' + maskId + '" maskUnits="userSpaceOnUse" x="0" y="0" width="' + W + '" height="' + H +
      '" style="mask-type:luminance"><image width="' + W + '" height="' + H + '" preserveAspectRatio="none" href="' + esc(maskSrc) + '"/></mask></defs>'
    : "";
  if (showMask && sample)
    return (
      '<svg style="display:block;width:100%;height:100%;max-width:none;max-height:none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' +
      W +
      " " +
      H +
      '"><image width="' +
      W +
      '" height="' +
      H +
      '" preserveAspectRatio="none" href="' +
      esc(maskSrc) +
      '"/></svg>'
    );
  for (const l of active) {
    const role=l.role,red=["block","script","serif-red"].includes(role);
    const {font,text,fontSize,ascent}=depthTypeSpec(l,settings,W,H);
    const color=l.color||(red?settings.red:settings.white);
    const normalizedColor=String(color).trim().toLowerCase();
    const rgb=/^#([0-9a-f]{6})$/i.exec(normalizedColor);
    const channels=rgb?[0,2,4].map(i=>parseInt(rgb[1].slice(i,i+2),16)):[];
    // Include the reference's warm white (#FFFDF7), but not other pale colors.
    const isWhite=['white','#fff'].includes(normalizedColor)||(channels.length===3&&Math.min(...channels)>=245);
    const contrast=settings.contrast||"subtle";
    const edgeWidth=Math.max(.35,Math.min(contrast==="strong"?2:1.1,fontSize*(contrast==="strong"?.045:.022)));
    const protection=isWhite&&contrast!=="off"?' stroke="#151515" stroke-width="'+edgeWidth+'" stroke-linejoin="round" paint-order="stroke fill"':' stroke="none"';
    const tokens=text.split(/(\s+)/);
    const count=tokens.filter(t=>t&&!/^\s+$/.test(t)).length;
    const edited=Object.keys(l.wordEdits||{}).length>0;
    const render=(only,edit={})=>{
      const front=edit.depth?edit.depth==="front":l.depth==="front";
      if(pass==="behind"&&front||pass==="front"&&!front)return "";
      // Depth on, but no mask for this moment: never draw behind-speaker words unmasked.
      if(pass==="all"&&settings.depth&&mask&&!sample&&!front)return "";
      let wi=0;
      const content=tokens.map(token=>{
        if(!token||/^\s+$/.test(token))return esc(token);
        const index=wi++,visible=(!l.cues||time*1000+1e-6>=l.cues[index].startMs)&&(only===null||index===only);
        return '<tspan data-word="'+index+'" opacity="'+(visible?1:0)+'" style="pointer-events:'+(visible?'auto':'none')+'">'+esc(token)+'</tspan>';
      }).join("");
      return (masked&&!front?'<g mask="url(#'+maskId+')">':'<g>')+
        '<text xml:space="preserve" data-layer="'+esc(l.id)+'" data-phrase="'+esc(l.phraseId)+
        '" x="'+((l.x+(Number(edit.dx)||0))/100*W)+'" y="'+((l.y+(Number(edit.dy)||0))/100*H+(l.anchor==="ink"?ascent:0))+
        '" dominant-baseline="'+(l.anchor==="ink"?'alphabetic':'hanging')+'" text-anchor="middle" font-family="'+esc(font)+
        '" font-size="'+fontSize+'" font-weight="400" fill="'+esc(color)+'"'+protection+'>'+content+'</text></g>';
    };
    if(edited){for(let wi=0;wi<count;wi++)body+=render(wi,l.wordEdits?.[wi]||{});}
    else body+=render(null);
  }
  // "Black behind speaker" replaces the footage behind the person, never the person.
  const rect='<rect width="100%" height="100%" fill="black"/>';
  const bg = settings.background === "black" && pass !== "front"
    ? masked ? '<g mask="url(#'+maskId+')">'+rect+'</g>' : rect
    : "";
  return (
    '<svg style="display:block;width:100%;height:100%;max-width:none;max-height:none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 ' +
    W +
    " " +
    H +
    '">' +
    defs +
    "<g>" +
    bg +
    body +
    "</g></svg>"
  );
}

// The saved graphic runs the editor's own renderer (copied from the functions
// above), so the timeline and the export draw exactly what the preview drew.
// Behind-speaker words sit under the draft's mask file for the current frame:
// white shows text, black is the speaker.
const DEPTH_GRAPHIC_VIEW = `
export default function DepthType({data}){
  const f=useCurrentFrame(),c=useVideoConfig(),time=f/c.fps;
  const settings={...DEPTH_DEFAULTS,...data.settings,depth:false};
  // Cutaways placed by earlier versions of this panel cover the picture; captions step aside.
  if((data.cutaways||[]).some(r=>time>=r.start&&time<r.end))return null;
  const fill={position:'absolute',inset:0,overflow:'hidden',lineHeight:0};
  const svg=(pass)=>({__html:depthSvg(data.plan,settings,time,c.width,c.height,null,false,'depth-type-'+pass,pass)});
  const masks=data.settings.depth?data.masks:null;
  if(!masks)return React.createElement('div',{style:fill,dangerouslySetInnerHTML:svg('all')});
  const url=masks.base+'/matte_'+String(Math.min(masks.count,Math.max(1,f+1))).padStart(6,'0')+'.png';
  const mask={maskImage:'url("'+url+'")',maskMode:'luminance',maskSize:'100% 100%',maskRepeat:'no-repeat',maskPosition:'0 0'};
  return React.createElement(AbsoluteFill,null,
    React.createElement('div',{style:{...fill,...mask},dangerouslySetInnerHTML:svg('behind')}),
    React.createElement('div',{style:fill,dangerouslySetInnerHTML:svg('front')}));
}`;
const DEPTH_GRAPHIC = [
  "import React from 'react';",
  "import {AbsoluteFill,useCurrentFrame,useVideoConfig} from 'remotion';",
  "const DEPTH_DEFAULTS=" + JSON.stringify(DEPTH_DEFAULTS) + ";",
  "const depthTypeCache=new Map();",
  ...[depthLayerWordCues, depthRevealModes, depthTypeSpec, depthMaskAt, depthMaskFits, depthSvg].map(String),
  DEPTH_GRAPHIC_VIEW,
].join("\n");
// Native host adapter. UI workflow inspired by Editorial Blur; independent ownership.
const DEPTH_TAG = "depth-type-captions-v1";
function depthOwner(pid, sid) {
  return (
    "const pid=" +
    JSON.stringify(pid) +
    ",sid=" +
    JSON.stringify(sid) +
    ';const owner=(await selects.listProjects()).find(p=>p.id===pid);if(!owner?.draftIds.includes(sid))throw new Error("Open a Draft first.");const d=selects.draft(sid);'
  );
}
function depthReadScript(pid, sid) {
  return (
    depthOwner(pid, sid) +
    'const m=await d.meta();const clips=await d.clips({trackScope:"main"});const words=(await d.words({view:"playback"})).filter(w=>!w.nonSpeech&&!w.cut&&!w.unanalyzed&&w.text.trim());if(words.length>1500)throw new Error("Use a draft with fewer than 1500 words.");return {name:m.name,fps:m.fps,width:m.frameSize.width,height:m.frameSize.height,duration:clips.reduce((n,c)=>Math.max(n,c.endFrame),0)/m.fps,words:words.map(w=>({text:w.text,s:w.startFrame,e:w.endFrame,source:w.sourceStartFrame,wordId:w.wordId,speaker:w.speakerId,resource:w.resourceId,utterance:w.utteranceId}))};'
  );
}
// The panel's own clips (captions, and b-roll or cards from earlier versions) never
// feed the speaker render, and placing or moving them does not make the masks stale.
// Caption clips are also recognised by label, so a lost link cannot put old captions
// into the render the speaker is found in.
async function depthSdkScript(script, summary, allowCommit = false) {
  const reply = await hostSdk.runScript({script, summary, allowCommit});
  if (reply?.isError) throw new Error(reply.output || summary);
  return reply?.result;
}
async function depthInspectComposition(pid, sid, excluded) {
  return depthSdkScript(`
    const d = selects.draft(${JSON.stringify(sid)});
    const meta = await d.meta();
    const clips = await d.clips({trackScope:"all"});
    const named = (await d.motionGraphics()).filter(x => x.name === "Depth Type Captions").map(x => ({trackId:x.clip.trackId,clipId:x.clip.clipId}));
    const requested = [...${JSON.stringify(excluded || [])}, ...named].filter(Boolean);
    const excludeClips = clips.filter(c => requested.some(r => String(r.trackId) === String(c.trackId) && Number(r.clipId) === c.clipId)).map(c => ({trackId:c.trackId,clipId:c.clipId}));
    const main = clips.filter(c => c.trackKind === "main");
    const endFrame = main.length ? Math.max(...main.map(c => c.endFrame)) : meta.durationFrames;
    const composition = {includeCaptions:false,excludeClips,endFrame,frameSize:meta.frameSize};
    const inspected = await selects.export.inspectComposition({projectId:${JSON.stringify(pid)},draftSequenceId:${JSON.stringify(sid)},composition});
    return {...inspected,composition};`, "Inspect speaker render composition");
}
async function depthCurrentKey(pid, sid, excluded) {
  return (await depthInspectComposition(pid, sid, excluded)).key;
}
async function depthCancelWorkflow(workflowId) {
  return depthSdkScript(`await selects.workflow(${JSON.stringify(workflowId)}).cancel();return {requested:true};`, "Cancel speaker render", true);
}
// Selects 2.0.508 lets procedural renders read plug-in mask files; older hosts
// would silently drop every behind-speaker word.
const DEPTH_MIN_HOST = "2.0.508";
const DEPTH_CLOUD_MASKS = false;
const DEPTH_CLOUD_MIN_HOST = "2.0.512";
// Both saved choices run through the same shared RVM model; neither input is gated.
const depthSubject = (settings) => (settings.subject === "person" ? "person" : "foreground");
function depthHostVersion() {
  try {
    return String(hostSdk?.environment?.version || "") || null;
  } catch {
    return null;
  }
}
function depthVersionBelow(version, minimum) {
  const a = String(version || "0").split(".").map((n) => parseInt(n, 10) || 0),
    b = minimum.split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) if ((a[i] || 0) !== (b[i] || 0)) return (a[i] || 0) < (b[i] || 0);
  return false;
}
function depthHostProblem() {
  const version = depthHostVersion(), minimum = DEPTH_CLOUD_MASKS ? DEPTH_CLOUD_MIN_HOST : DEPTH_MIN_HOST;
  return !version || depthVersionBelow(version, minimum)
    ? "Behind speaker needs Selects " + minimum + " or later (this app is " + (version || "unknown") + "). Update Selects, or turn off Behind speaker under Fine-tune."
    : "";
}
function depthRequireHost() {
  const problem = depthHostProblem();
  if (problem) throw new Error(problem);
}
// The smallest export preset that holds the canvas without shrinking it, so the
// masks are made at (at least) the size the draft is shown at.
function depthRenderPreset(geometry) {
  const long = Math.max(geometry.width, geometry.height), short = Math.min(geometry.width, geometry.height);
  for (const [name, w, h] of [["SD", 854, 480], ["HD", 1280, 720], ["FHD", 1920, 1080], ["4K", 3840, 2160]])
    if (long <= w && short <= h) return name;
  return "4K";
}
function depthPluginRoot() {
  const fs = hostSdk.files;
  return fs.join(fs.homedir(), ".selects", "plugin-data", "depth-type-captions");
}
function depthMaskDraftDir(pid, sid) {
  const fs = hostSdk.files;
  return fs.join(depthPluginRoot(), "masks", String(pid), String(sid));
}
async function depthPrepareVideo(pid, sid, excluded, control, progress, geometry, outputPath) {
  const base = await depthInspectComposition(pid, sid, excluded);
  if (base.durationFrames / base.fps > 90) throw new Error("Depth preview currently supports drafts up to 90 seconds.");
  if (control.canceled) throw new Error("Canceled.");
  progress("Rendering the draft at full size…");
  const request = {projectId:pid,draftSequenceId:sid,outPath:outputPath,resolution:depthRenderPreset(geometry),composition:base.composition};
  const accepted = await depthSdkScript(`const job=await selects.export.video(${JSON.stringify(request)});return {workflowId:job.workflowId};`, "Render the speaker composition", true);
  control.workflowId = accepted.workflowId;
  try {
    for (;;) {
      if (control.canceled) { await depthCancelWorkflow(accepted.workflowId); throw new Error("Canceled."); }
      const status = await depthSdkScript(`return await selects.workflow(${JSON.stringify(accepted.workflowId)}).status();`, "Read speaker render progress");
      if (status.status === "succeeded") break;
      if (["failed","canceled"].includes(status.status)) throw new Error(status.lastErrorMessage || status.status);
      progress("Preparing video · " + (status.step || status.status));
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    if ((await depthCurrentKey(pid, sid, excluded)) !== base.key) throw new Error("The draft changed during rendering. Try again with its current edit.");
    return {path:outputPath,url:await hostSdk.files.pathToLocalURL(outputPath),sourceKey:base.key,duration:base.durationFrames/base.fps,fps:base.fps,width:geometry.width,height:geometry.height};
  } finally { control.workflowId = null; }
}

const depthQuote = (v) => "'" + String(v).replace(/'/g, "'\\''") + "'";
async function depthReadText(fs, path) {
  return (await fs.exists(path)) ? String(await fs.readFile(path, "utf8")) : "";
}
// The shared Main AI job produces one full-resolution PNG alpha frame per draft frame
// on either platform. Its durable workflow can outlast the panel and resume after reopening.
// Full-resolution mattes keep the model's soft edge; growing it leaves a band of background
// around hair and hands. (maskGrow still spaces lines from the speaker in the layout.)
const DEPTH_MATTE_GROW = 0;
// Version 5 replaces the earlier platform-specific masks with shared RVM PNG frames.
const DEPTH_MATTE_VERSION = 5;
async function depthPrepareMasks(sdk, preview, settings, job, progress, control, pid) {
  hostUseSdk(sdk);
  const controller = new AbortController();
  control.stop = () => controller.abort();
  if (control.canceled) controller.abort();
  try {
    const resourceId = await importSharedAiVideo(sdk, pid, preview.path);
    const client = videoAiClient(sdk, pid, "depth-type-captions:" + job.dir);
    control.cancelAi=()=>client.cancel({identity:preview.sourceKey+":"+depthSubject(settings)});
    const result = await client.run({task:"person.matte",resourceId,
      sourceRange:{startSeconds:0,endSeconds:preview.duration},
      options:{downsampleRatio:0.25,alphaEncoding:"grayscale-png-8bit",outputMode:"alpha-frames"}},
      {identity:preview.sourceKey+":"+depthSubject(settings),signal:controller.signal,
       retryTerminal:control.retryAi===true,onProgress:status=>progress("Speaker masks · "+String(status.step||status.status))});
    const prepared = await prepareSharedAiVideoFrames(sdk,pid,result.result.files.manifest,
      hostSdk.files.join(job.dir,"alpha"),{resourceId,width:preview.width,height:preview.height,fps:preview.fps,
      frames:Math.round(preview.duration*preview.fps)});
    return await depthWriteSharedMasks(sdk,preview,settings,job,progress,control,prepared);
  } finally { control.stop = null; control.cancelAi=null; }
}
// What either mask maker leaves in the job folder: one matte per frame beside
// layout.json, which carries the small frames the layout reads.
async function depthMaskResult(fs, preview, job) {
  const layout = JSON.parse(await depthReadText(fs, fs.join(job.dir, "layout.json")));
  const frames = Math.round(preview.duration * preview.fps);
  if (!layout.frames?.length || !layout.count) throw new Error("No speaker masks were produced.");
  if (Math.abs(layout.count - frames) > 1)
    throw new Error("The speaker masks cover " + layout.count + " frames but the draft has " + frames + ". Choose Redo.");
  if (!depthMaskFits(layout, preview.width, preview.height)) throw new Error("The render does not match the draft canvas.");
  const mask = { width: layout.width, height: layout.height, fps: layout.fps, frames: layout.frames, misses: layout.misses || 0, canvasWidth: preview.width, canvasHeight: preview.height, sourceKey: preview.sourceKey };
  const files = {
    dir: job.dir,
    base: (await fs.pathToLocalURL(job.dir)).replace(/\/+$/, ""),
    count: layout.count,
    width: layout.matteWidth,
    height: layout.matteHeight,
    subject: layout.mode,
    grow: layout.grow,
    version: layout.version || 0,
    misses: layout.misses || 0,
    sourceKey: preview.sourceKey,
    canvasWidth: preview.width,
    canvasHeight: preview.height,
    render: preview.path,
    duration: preview.duration,
    fps: preview.fps,
  };
  return { mask, files };
}
// A frame whose speaker covers under about 0.2% of the picture has none, as the
// Mac tool decides: its matte is black, so no word meant to sit behind a person
// covers one it missed.
async function depthLayoutHasSpeaker(bytes, width, height) {
  const bitmap = await createImageBitmap(new Blob([new Uint8Array(bytes)], { type: "image/png" }));
  const canvas = new OffscreenCanvas(width, height), ctx = canvas.getContext("2d");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();
  const data = ctx.getImageData(0, 0, width, height).data;
  let cover = 0;
  for (let i = 0; i < data.length; i += 4) cover += 255 - data[i];
  return cover * 2 >= width * height;
}
// The panel frame has no Buffer; bytes may come from the host's file reads.
function depthBase64(bytes) {
  const view = new Uint8Array(bytes);
  let text = "";
  for (let i = 0; i < view.length; i += 0x8000) text += String.fromCharCode.apply(null, view.subarray(i, i + 0x8000));
  return btoa(text);
}
async function depthBlackPng(width, height) {
  const canvas = new OffscreenCanvas(width, height), ctx = canvas.getContext("2d");
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, width, height);
  return new Uint8Array(await (await canvas.convertToBlob({ type: "image/png" })).arrayBuffer());
}
async function depthWriteSharedMasks(sdk, preview, settings, job, progress, control, prepared) {
  if(control.canceled)throw new Error("Canceled.");
  hostUseSdk(sdk);
  const fs = hostSdk.files;
  // Full-size mattes, white where words show, and the 384-wide frames the layout
  // reads, in one pass, by the host's bundled ffmpeg: an argv array, so no shell
  // quoting, and cmd.exe never expands the %06d patterns.
  progress("Writing speaker mask files…");
  const lw = 384, lh = Math.max(1, Math.round((lw * preview.height) / preview.width)), small = fs.join(job.dir, "layout");
  (await fs.mkdir(small, { recursive: true }));
  const runtime = hostSdk.media;
  if (typeof runtime?.runFFmpeg !== "function") throw new Error("This Selects build cannot write speaker mask files. Update Selects, then try again.");
  const writing = new AbortController(), timer = setTimeout(() => writing.abort(), 600000);
  control.stop = () => writing.abort();
  try {
    await runtime.runFFmpeg(
      ["-v", "error", "-y", "-framerate", String(preview.fps), "-start_number", "1", "-i", prepared.pattern, "-filter_complex", "[0:v]format=gray,negate,split=2[a][b];[b]scale=" + lw + ":" + lh + ":flags=area[c]",
        "-map", "[a]", fs.join(job.dir, "matte_%06d.png"), "-map", "[c]", fs.join(small, "l_%06d.png")],
      true,
      writing.signal,
    );
  } catch (e) {
    if (control.canceled) throw new Error("Canceled.");
    throw new Error(String(e?.message || "").trim() || "The speaker mask files could not be written.");
  } finally {
    clearTimeout(timer);
    control.stop = null;
  }
  const names = (await fs.readdir(small)).map(String).filter((n) => /^l_\d{6}\.png$/.test(n)).sort();
  if (!names.length) throw new Error("No speaker masks came back. Try again.");
  const black = depthBase64(await depthBlackPng(lw, lh));
  let blackMatte = null, misses = 0;
  const frames = new Array(names.length);
  for (let i = 0; i < names.length; i += 16)
    await Promise.all(
      names.slice(i, i + 16).map(async (name, k) => {
        const index = i + k, bytes = await fs.readFile(fs.join(small, name));
        if (await depthLayoutHasSpeaker(bytes, lw, lh)) {
          frames[index] = { t: index / preview.fps, png: depthBase64(bytes) };
          return;
        }
        misses++;
        blackMatte ??= await depthBlackPng(preview.width, preview.height);
        await fs.writeFile(fs.join(job.dir, "matte_" + String(index + 1).padStart(6, "0") + ".png"), blackMatte);
        frames[index] = { t: index / preview.fps, png: black };
      }),
    );
  (await fs.rm(small, { recursive: true, force: true }));
  const layout = { version: DEPTH_MATTE_VERSION, width: lw, height: lh, fps: preview.fps, frames, misses, filled: 0, matteWidth: preview.width, matteHeight: preview.height, count: frames.length, mode: depthSubject(settings), grow: 0, source: "selects-ai-runtime" };
  await fs.writeFile(fs.join(job.dir, "layout.json"), JSON.stringify(layout));
  return depthMaskResult(fs, preview, job);
}
async function depthLoadLayoutMask(files) {
  const fs = hostSdk.files;
  const layout = JSON.parse(await depthReadText(fs, fs.join(files.dir, "layout.json")));
  if (!layout.frames?.length) throw new Error("The speaker mask files are gone. Choose Redo.");
  return { width: layout.width, height: layout.height, fps: layout.fps, frames: layout.frames, misses: layout.misses || 0, canvasWidth: files.canvasWidth, canvasHeight: files.canvasHeight, sourceKey: files.sourceKey };
}
// Mask folders take ~3 MB per second of 1080p video. Keep the saved one and the
// one before it (for Undo); drop the rest of this draft's folders.
async function depthPruneMasks(sdk, pid, sid, keep) {
  hostUseSdk(sdk);
  const fs = hostSdk.files, dir = depthMaskDraftDir(pid, sid);
  let names = [];
  try {
    names = (await fs.readdir(dir)).map(String);
  } catch {
    return;
  }
  const kept = new Set(keep.filter(Boolean).map((d) => fs.basename(d)));
  for (const n of names.filter((n) => !kept.has(n))) (await fs.rm(fs.join(dir, n), { recursive: true, force: true }));
}
// Clip refs of b-roll and cards placed by earlier versions of this panel; captions
// keep stepping aside for them.
function depthStorage() {
  if (!hostSdk.storage?.getItem || !hostSdk.storage?.setItem) throw new Error("Update Selects to restore and save captions, then reopen this panel.");
  return hostSdk.storage;
}
const depthWrites = new Map();
function depthSave(key, value) {
  const snapshot = JSON.stringify(value);
  const pending = (depthWrites.get(key) || Promise.resolve()).catch(() => {}).then(() => depthStorage().setItem(key, snapshot));
  depthWrites.set(key, pending);
  return pending;
}
async function depthCutawayRefs(pid, sid) {
  const placed = JSON.parse(await depthStorage().getItem(DEPTH_TAG + ":broll:" + pid + ":" + sid) || "{}")?.placed;
  return Array.isArray(placed) ? placed.map(({ clipId, trackId }) => ({ clipId, trackId })) : [];
}
const DEPTH_SCRIPT_LIMIT = 262144, DEPTH_SCRIPT_MARGIN = 2048;
function depthScriptBytes(script) {
  let bytes = 0;
  for (let i = 0; i < script.length; i++) {
    const c = script.charCodeAt(i);
    if (c < 0x80) bytes += 1;
    else if (c < 0x800) bytes += 2;
    else if (c >= 0xd800 && c <= 0xdbff) { bytes += 4; i++; }
    else bytes += 3;
  }
  return bytes;
}
// Only what the renderer reads: word timing without source identities or the
// layout history the editor keeps for Reset.
function depthGraphicPlan(plan) {
  return plan.map(({ designOriginal, ...p }) => ({
    ...p,
    words: Array.isArray(p.words) ? p.words.map((w) => ({ text: w.text, s: w.s, e: w.e })) : p.words,
  }));
}
function depthApplyScript(pid, sid, plan, settings, files, owned, cutRefs = []) {
  depthValidate(plan);
  if (settings.depth && !files) throw new Error("Choose Make depth captions first, or turn off Behind speaker.");
  const payload = { plan: depthGraphicPlan(plan), settings, masks: settings.depth ? { base: files.base, count: files.count } : null, cutaways: [], panelId: DEPTH_TAG };
  const script = depthApplyScriptSource(pid, sid, payload, owned, cutRefs);
  const bytes = depthScriptBytes(script);
  if (bytes > DEPTH_SCRIPT_LIMIT - DEPTH_SCRIPT_MARGIN)
    throw new Error("These captions need " + Math.ceil(bytes / 1024) + " KB but Selects accepts at most 256 KB per save. Use a shorter draft or fewer phrases.");
  return { script, bytes };
}
function depthApplyScriptSource(pid, sid, payload, owned, cutRefs = []) {
  return depthOwner(pid,sid)+`
const oldRef=${JSON.stringify(owned)};
const all=await d.clips({trackScope:"all"});
const same=(a,b)=>a.clipId===b.clipId&&a.trackId===b.trackId;
// Replace this panel's caption clip wherever the edit left it: the saved link, and any
// other clip it made (a lost link, a copy), found by label. Older hosts cannot list graphics.
if(typeof (d as any).motionGraphics!=="function")throw new Error("Update Selects to safely recover and replace Depth Type captions.");
const listed=(await (d as any).motionGraphics()).filter((g:any)=>g.name==="Depth Type Captions").map((g:any)=>g.clip);
const old=[...(oldRef?all.filter(c=>same(c,oldRef)):[]),...listed.map((g:any)=>all.find(c=>same(c,g))).filter(Boolean)].filter((c,i,a)=>a.findIndex(x=>same(x,c))===i);
const recovered=!!oldRef&&!old.length;
const m=await d.meta();
const main=(await d.clips({trackScope:"main"})).reduce((n,c)=>Math.max(n,c.endFrame),0);
const payload=${JSON.stringify(payload)};
// Captions step aside wherever this panel's cutaways cover the picture now.
payload.cutaways=${JSON.stringify(cutRefs)}.map(r=>all.find(c=>c.clipId===r.clipId&&c.trackId===r.trackId)).filter(Boolean).map(c=>({start:c.startFrame/m.fps,end:c.endFrame/m.fps}));
const bounded=(${depthBoundPlan.toString()})(payload.plan,main/m.fps);
payload.plan=bounded.plan;
const end=Math.min(main,Math.ceil(Math.max(...payload.plan.map(p=>p.end))*m.fps-1e-6));
if(old.length)await d.removeClips(old);
const clip=await d.addMotionGraphic({label:"Depth Type Captions",tsxCode:${JSON.stringify(DEPTH_GRAPHIC)},parameters:payload,within:await d.rangeAtFrames(0,end)});
const placed=(await d.clips({trackScope:"all"})).find(c=>c.clipId===clip.clipId);
if(!placed||placed.startFrame!==0||placed.endFrame!==end)throw new Error("Could not verify caption placement on the current draft.");
const result=await d.commitAll("Apply Depth Type Captions");
return {recovered,replaced:old.length,duration:main/m.fps,cutaways:payload.cutaways.length,trimmed:bounded.changed,clippedLayers:bounded.clippedLayers,droppedLayers:bounded.droppedLayers,droppedPhrases:bounded.droppedPhrases,owned:{clipId:placed.clipId,trackId:placed.trackId,startFrame:placed.startFrame,endFrame:placed.endFrame},commitId:result.commitId};`;
}

// Static silhouette-aware layout. This module is editor-only; exports store geometry.
function depthIntegral(values, width, height) {
  const sum = new Float64Array((width + 1) * (height + 1));
  for (let y = 0; y < height; y++) {
    let row = 0;
    for (let x = 0; x < width; x++) {
      row += values[y * width + x];
      sum[(y + 1) * (width + 1) + x + 1] = sum[y * (width + 1) + x + 1] + row;
    }
  }
  return {sum, width, height};
}
function depthRectCoverage(field, rect) {
  const {sum, width:w, height:h} = field;
  const x1 = Math.max(0, Math.floor(rect.x * w / 100));
  const y1 = Math.max(0, Math.floor(rect.y * h / 100));
  const x2 = Math.min(w, Math.ceil((rect.x + rect.w) * w / 100));
  const y2 = Math.min(h, Math.ceil((rect.y + rect.h) * h / 100));
  if (x2 <= x1 || y2 <= y1) return 1;
  return (sum[y2*(w+1)+x2]-sum[y1*(w+1)+x2]-sum[y2*(w+1)+x1]+sum[y1*(w+1)+x1])/((x2-x1)*(y2-y1));
}
function depthLayoutScore(layer, glyphs, field, occupied, maxLetters) {
  const boxes = glyphs.map(g => ({...g, x:layer.x+g.x*layer.width, y:layer.y+g.y*layer.height, w:g.w*layer.width, h:g.h*layer.height}));
  if (!boxes.length) return {ok:false, penalty:1e6,reason:"missing letter bounds"};
  const bounds = {x:Math.min(...boxes.map(g=>g.x)), y:Math.min(...boxes.map(g=>g.y))};
  bounds.w = Math.max(...boxes.map(g=>g.x+g.w))-bounds.x;
  bounds.h = Math.max(...boxes.map(g=>g.y+g.h))-bounds.y;
  const outside=bounds.x<1 || bounds.y<1 || bounds.x+bounds.w>99 || bounds.y+bounds.h>99;
  let collision = 0;
  for (const b of occupied) {
    if (layer.end<=b.start || layer.start>=b.end) continue;
    collision += Math.max(0,Math.min(bounds.x+bounds.w,b.x+b.w+1)-Math.max(bounds.x,b.x-1))*Math.max(0,Math.min(bounds.y+bounds.h,b.y+b.h+1)-Math.max(bounds.y,b.y-1));
  }
  const words = new Map();
  for (const b of boxes) {
    const v = depthRectCoverage(field,b);
    const a = words.get(b.word) || {n:0,hidden:0,total:0};
    a.n++; a.hidden += v>=0.35?1:0; a.total += v;
    words.set(b.word,a);
  }
  let excess=0,total=0,hidden=0;
  for (const a of words.values()) {
    // Short words get a stricter budget. Several partially hidden letters also count.
    const budget = Math.min(maxLetters, Math.floor(a.n/4));
    excess += Math.max(0,a.hidden-budget)+Math.max(0,a.total-Math.min(maxLetters,a.n*0.2));
    total += a.total; hidden=Math.max(hidden,a.hidden);
  }
  return {ok:!outside&&excess<1e-6&&collision===0,penalty:(outside?1e6:0)+excess*100+collision*10,total,hidden,bounds,reason:[outside?"frame margins":"",excess>=1e-6?"subject coverage":"",collision?"text collision":""].filter(Boolean).join(", ")};
}
function depthMeasureGlyphs(layer, settings, width, height) {
  const svgText = depthSvg([{id:'measure',layers:[{...layer,start:0,end:1}]}],{...settings,depth:false,background:'footage'},0,width,height);
  const holder=document.createElement('div');
  holder.style.cssText='position:fixed;left:-10000px;top:0;width:1000px;visibility:hidden;pointer-events:none';
  holder.innerHTML=svgText;
  document.body.appendChild(holder);
  try {
    const text=holder.querySelector('text'), content=text.textContent, result=[];
    let word=0;
    for(let i=0;i<text.getNumberOfChars();i++) {
      if (/\s/.test(content[i])) {word++;continue;}
      const b=text.getExtentOfChar(i);
      result.push({word,x:(b.x/10-layer.x)/layer.width,y:(b.y/(10*height/width)-layer.y)/layer.height,w:b.width/10/layer.width,h:b.height/(10*height/width)/layer.height});
    }

    return result;
  } finally {holder.remove();}
}

// Speaker-aware composition: one automatic layout that keeps the headline behind the person
// and places supporting lines in open space around the moving silhouette. Editor-only.
function depthSpeakerGroups(tokens,maxChars){
  const total=tokens.reduce((n,t)=>n+t.text.length+1,0)-1;
  const count=Math.min(tokens.length,Math.max(1,Math.ceil(total/maxChars))),target=total/count,memo=new Map();
  const solve=(at,left)=>{
    if(!left)return at===tokens.length?{cost:0,groups:[]}:null;
    const key=at+':'+left;if(memo.has(key))return memo.get(key);
    let best=null;
    for(let end=at+1;end<=tokens.length-left+1;end++){
      const group=tokens.slice(at,end),chars=group.reduce((n,t)=>n+t.text.length+1,0)-1,tail=solve(end,left-1);if(!tail)continue;
      const weakEnd=/^(a|an|the|to|of|in|with|that)$/i.test(group.at(-1).text);
      const cost=tail.cost+(chars-target)**2+(weakEnd&&end<tokens.length?30:0)+(group.length===1&&tokens.length>count*2?20:0);
      if(!best||cost<best.cost)best={cost,groups:[group,...tail.groups]};
    }
    memo.set(key,best);return best;
  };
  return solve(0,count)?.groups||[tokens];
}
function depthSpeakerCandidates(phrase,settings,width,height,union,mw,mh,fieldFor){
  if(phrase.layers.some(l=>Object.keys(l.wordEdits||{}).length))return [];
  const base=depthReferenceComposition([depthDesignOriginal(phrase)],width,height,settings)[0];
  const hero=base.layers.find(l=>l.id.endsWith('-hero'))||base.layers.reduce((a,b)=>a.height>=b.height?a:b);
  base.layers.forEach(l=>{delete l.front;});
  const hi=base.layers.indexOf(hero),H=1000*height/width,heroBottom=hero.y+depthTypeSpec(hero,settings,1000,H).inkHeight/H*100;
  const out=[],minInk=Math.min(1000,H)*.032,measureCache=new Map();
  // A lane can exist on only one side. Unlike older templates, a narrow opposite
  // side never invalidates the useful open side of an off-centre speaker.
  const lanesAt=(top,bottom)=>{
    let left=mw,right=-1;
    for(let y=Math.max(0,Math.floor(top*mh/100));y<Math.min(mh,Math.ceil(bottom*mh/100));y++)for(let x=0;x<mw;x++)if(union[y*mw+x]>.15){left=Math.min(left,x);right=Math.max(right,x);}
    if(right<left)return [{x:50,width:96}];
    const a=left/mw*100-2,b=(right+1)/mw*100+2,lanes=[];
    if(a-2>=8)lanes.push({x:(2+a)/2,width:a-2});
    if(98-b>=8)lanes.push({x:(b+98)/2,width:98-b});
    return lanes;
  };
  for(const maxChars of [32,24,20,18,16,12]){
    const groups=[];
    const appendSupport=(layers,lead)=>{
      if(!layers.length)return;
      const seed=layers[0],tokens=layers.flatMap(l=>{
        const cues=depthLayerWordCues(base,l);
        return l.text.trim().split(/\s+/).map((text,k)=>({text,cue:cues?.[k]}));
      });
      depthSpeakerGroups(tokens,maxChars).forEach((g,k)=>groups.push({lead,layer:{...seed,id:seed.id+'-speaker-'+k,text:g.map(t=>t.text).join(' '),start:g[0].cue?Math.max(base.start,g[0].cue.startMs/1000):seed.start,typeBase:undefined}}));
    };
    appendSupport(base.layers.slice(0,hi),true);
    groups.push({hero:true,layer:depthCopy(hero)});
    appendSupport(base.layers.slice(hi+1),false);
    // Multiple script groups need a hierarchy appropriate to the available lead
    // band; only support cap height changes, never the headline geometry.
    const leadCount=groups.filter(g=>g.lead).length;
    if(leadCount>1)for(const g of groups)if(g.lead)g.layer.height=Math.min(g.layer.height,12);
    const supportCount=groups.filter(g=>!g.hero&&!g.lead).length;
    // Reserve coherent body scale before placement: post-layout normalization
    // alone cannot rescue a three-line variant rejected at a 12% cap limit.
    if(supportCount>2)for(const g of groups)if(!g.hero&&!g.lead)g.layer.height=Math.min(g.layer.height,6);
    // Beam search retains whole-word order and several feasible arrangements.
    let beam=[{layers:[],occupied:[],cost:0,lastBefore:null,lastAfter:null}];
    for(const g of groups){
      if(g.hero){beam=beam.map(b=>({...b,layers:[...b.layers,g.layer]}));continue;}
      const next=[];
      for(const b of beam){
        const prior=g.lead?b.lastBefore:b.lastAfter;
        const start=g.lead?Math.max(2,hero.y-35):heroBottom+.8;
        const end=g.lead?hero.y+1.5:96;
        for(let y=start;y<end;y+=3){
          if(prior&&y<prior.y-.01)continue;
          if(prior&&y>prior.y+.1&&y<prior.y+prior.ink+1.2)continue;
          // Use full requested cap band initially, then score actual font metrics.
          for(const lane of lanesAt(y,Math.min(end,y+g.layer.height*1.35))){
            if(prior&&Math.abs(y-prior.y)<.1&&lane.x<=prior.x)continue;
            // Once reading reaches the right lane, continuation stays there.
            // Returning to the left on the next row creates a zigzag sentence.
            if(prior&&prior.x>50&&lane.x<50)continue;
            const l={...g.layer,x:lane.x,y,width:lane.width,anchor:'ink'};
            const spec=depthTypeSpec(l,settings,1000,H),ink=spec.inkHeight/H*100;
            if(spec.inkHeight<minInk||y+ink>end)continue;
            const key=JSON.stringify([l.text,l.role,l.font,l.width,l.height]);
            if(!measureCache.has(key))measureCache.set(key,depthMeasureGlyphs(l,settings,width,height));
            const glyphs=measureCache.get(key),r=depthLayoutScore(l,glyphs,fieldFor(l),b.occupied,settings.maxCoveredLetters??2);
            if(!r.ok)continue;
            const target=g.lead?(leadCount>1?start:hero.y-ink):heroBottom+.8;
            const cost=b.cost+Math.abs(y-target)*.35+(g.layer.height-ink)*.2+r.total*10+Math.max(0,6-ink)*30+(prior&&y>prior.y+.1?1:0)+(prior&&y>prior.y+.1&&((l.x<50)!==(prior.x<50))?25:0);
            next.push({...b,layers:[...b.layers,l],occupied:[...b.occupied,{...r.bounds,start:base.start,end:base.end}],cost,[g.lead?'lastBefore':'lastAfter']:{x:l.x,y:l.y,ink}});
          }
        }
      }
      beam=next.sort((a,b)=>a.cost-b.cost).slice(0,8);
      if(!beam.length)break;
    }
    for(const b of beam.slice(0,4)){
      const sizes=new Map();
      for(const l of b.layers)if(l.id!==hero.id){
        const key=JSON.stringify([l.role,l.font]),size=depthTypeSpec(l,settings,1000,H).fontSize;
        sizes.set(key,Math.min(sizes.get(key)??Infinity,size));
      }
      // Equal roles share an actual font size, not a nominal height limit: a
      // short word must not balloon just because its lane has unused width.
      const layers=b.layers.map(l=>{
        if(l.id===hero.id)return l;
        const target=sizes.get(JSON.stringify([l.role,l.font]));
        let low=0,high=l.height;
        for(let i=0;i<18;i++){const mid=(low+high)/2;if(depthTypeSpec({...l,height:mid},settings,1000,H).fontSize<=target)low=mid;else high=mid;}
        return {...l,height:low};
      });
      // Normalize first, then close obsolete gaps using the resulting ink size.
      // Move a shared-baseline pair together; every move is mask/collision checked.
      let lastRowBottom=null;const compactOccupied=[];
      for(let i=0;i<layers.length;){
        if(layers[i].id===hero.id){lastRowBottom=null;i++;continue;}
        const row=[layers[i]],oldY=layers[i].y;let j=i+1;
        while(j<layers.length&&layers[j].id!==hero.id&&Math.abs(layers[j].y-oldY)<.1)row.push(layers[j++]);
        const assess=ls=>ls.map(l=>depthLayoutScore(l,depthMeasureGlyphs(l,settings,width,height),fieldFor(l),compactOccupied,settings.maxCoveredLetters??2));
        const current=assess(row),topOffset=Math.min(...current.map(r=>r.bounds.y-oldY));
        const target=lastRowBottom===null?oldY:Math.min(oldY,lastRowBottom+1.2-topOffset);
        const proposed=row.map(l=>({...l,y:target}));
        let reports=assess(proposed);
        if(target<oldY&&reports.every(r=>r.ok))for(let k=0;k<row.length;k++)layers[i+k]=proposed[k];
        else reports=current;
        lastRowBottom=Math.max(...reports.map(r=>r.bounds.y+r.bounds.h));
        reports.forEach(r=>compactOccupied.push({...r.bounds,start:base.start,end:base.end}));
        i=j;
      }
      const minSupportInk=Math.min(...layers.filter(l=>l.id!==hero.id).map(l=>depthTypeSpec(l,settings,1000,H).inkHeight/H*100));
      // Six percent of landscape height is a preference, not a forced fit.
      // Prefer shorter balanced reading groups over tiny full-sentence lanes.
      const sizeCost=Math.max(0,6-minSupportInk)*50;
      out.push({family:'speaker',name:'Compose with speaker',phrase:{...base,layers,layoutMode:'compact',designName:'Compose with speaker'},referenceCost:b.cost+sizeCost,heroId:hero.id,minSupportInk});
    }
  }
  return out;
}
function depthDesignOriginal(phrase){
  const snapshot=phrase.layers.some(l=>Object.keys(l.wordEdits||{}).length)?null:phrase.designOriginal;
  const signature=p=>JSON.stringify([p.start,p.end,p.words,p.layers.map(l=>l.text).join(' ').trim().split(/\s+/)]);
  const valid=snapshot&&Array.isArray(snapshot.layers)&&signature(snapshot)===signature(phrase);
  const original=depthCopy(valid?snapshot:phrase);
  delete original.designOriginal;
  return original;
}
// Returns the composed phrase, or null when no arrangement passes the coverage checks.
function depthPortraitFallback(phrase,settings,width,height,union,mw,mh){
  const base=depthReferenceComposition([depthDesignOriginal(phrase)],width,height,settings)[0];
  const hero=base.layers.find(l=>l.id.endsWith('-hero'))||base.layers.reduce((a,b)=>a.height>=b.height?a:b);
  const support=base.layers.filter(l=>l!==hero);
  const H0=1000*height/width;
  // How much of the headline's ink box the subject covers; behind-the-speaker
  // only works when most of the word still shows past the silhouette.
  const heroInk=depthTypeSpec(hero,settings,1000,H0).inkHeight/H0*100;
  const bx0=Math.max(0,Math.floor((hero.x-hero.width/2)/100*mw)),bx1=Math.min(mw,Math.ceil((hero.x+hero.width/2)/100*mw)),by0=Math.max(0,Math.floor(hero.y/100*mh)),by1=Math.min(mh,Math.ceil((hero.y+heroInk)/100*mh));
  let covered=0,cells=0;for(let y=by0;y<by1;y++)for(let x=bx0;x<bx1;x++){cells++;if(union[y*mw+x]>.15)covered++;}
  const heroHidden=cells>0&&covered/cells>0.5;
  if(!support.length&&!heroHidden)return null;
  // Silhouette extent in % of height (rows with any subject pixel).
  let top=mh,bottom=-1;
  for(let y=0;y<mh;y++){let hit=false;for(let x=0;x<mw&&!hit;x++)if(union[y*mw+x]>.15)hit=true;if(hit){top=Math.min(top,y);bottom=Math.max(bottom,y);}}
  if(bottom<0)return null;
  const topPct=top/mh*100,bottomPct=(bottom+1)/mh*100;
  const H=1000*height/width,ink=l=>depthTypeSpec(l,settings,1000,H).inkHeight/H*100;
  const gap=1.2,margin=3;
  const above=topPct-margin-3,below=100-bottomPct-margin-3;
  const useAbove=above>=Math.max(below,9);
  if(!useAbove&&below<9)return null;
  const room=useAbove?above:below;
  // Everything placed in the band renders in front of the speaker. When the
  // headline is mostly covered it joins the stack (in reading order) instead
  // of hiding behind the person.
  const stackSrc=heroHidden?base.layers:support;
  let scale=1,rows=[];
  for(let attempt=0;attempt<8;attempt++){
    rows=stackSrc.map(l=>({...l,x:50,width:94,height:Math.max(l===hero?8:5,l.height*scale),anchor:'ink',depth:'front'}));
    const total=rows.reduce((n,l)=>n+ink(l),0)+gap*(rows.length-1);
    if(total<=room)break;
    scale*=0.82;
  }
  const total=rows.reduce((n,l)=>n+ink(l),0)+gap*(rows.length-1);
  if(total>room)rows=rows.slice(0,Math.max(1,Math.floor(rows.length*room/total)));
  let y=useAbove?Math.max(2,topPct-margin-rows.reduce((n,l)=>n+ink(l),0)-gap*(rows.length-1)):bottomPct+margin;
  for(const l of rows){l.y=y;y+=ink(l)+gap;}
  const order=id=>base.layers.findIndex(l=>l.id===id);
  const layers=heroHidden?rows.sort((a,b)=>order(a.id)-order(b.id)):[...rows.filter(l=>order(l.id)<order(hero.id)),depthCopy(hero),...rows.filter(l=>order(l.id)>order(hero.id))];
  return {...base,layers,layoutMode:'compact',designName:(useAbove?'Portrait · above the head':'Portrait · below the shoulders')+(heroHidden?' · headline in front':'')};
}
async function depthComposeWithSpeaker(phrase,plan,settings,mask,width,height,progress){
  if(!depthMaskFits(mask,width,height))throw new Error('Prepare a matching subject mask before composing.');
  if(phrase.layers.some(l=>Object.keys(l.wordEdits||{}).length))return null;
  await document.fonts.ready;
  const frames=mask.frames.filter((f,i)=>f.t<phrase.end&&(mask.frames[i+1]?.t??f.t+1/mask.fps)>phrase.start);
  if(!frames.length)throw new Error('No mask frames cover this phrase. Choose Redo.');
  const canvas=document.createElement('canvas');canvas.width=mask.width;canvas.height=mask.height;
  const ctx=canvas.getContext('2d',{willReadFrequently:true}),size=mask.width*mask.height;
  const loaded=[];
  for(let i=0;i<frames.length;i++){
    const f=frames[i],im=new Image();im.crossOrigin='anonymous';
    await new Promise((resolve,reject)=>{im.onload=resolve;im.onerror=()=>reject(new Error('Mask frame could not load. Choose Redo.'));im.src=f.png?'data:image/png;base64,'+f.png:f.url;});
    ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(im,0,0,canvas.width,canvas.height);
    const bytes=ctx.getImageData(0,0,canvas.width,canvas.height).data,values=new Float32Array(size);
    let available=0;for(let k=0;k<size;k++){available+=bytes[k*4];values[k]=1-bytes[k*4]/255;}
    if(!available)throw new Error('Subject detection is missing during this phrase.');
    loaded.push({t:f.t,end:frames[i+1]?.t??f.t+1/mask.fps,values});
  }
  const mode=depthRevealModes(plan,settings).get(phrase.id),fieldCache=new Map(),glyphCache=new Map();
  const fieldFor=l=>{
    const start=mode==='phrase'?phrase.start:l.start,key=start+':'+l.end;
    if(fieldCache.has(key))return fieldCache.get(key);
    const values=new Float32Array(size);
    for(const f of loaded)if(f.end>start&&f.t<l.end)for(let i=0;i<size;i++)values[i]=Math.max(values[i],f.values[i]);
    const grown=new Float32Array(size),radius=Math.ceil((Number(settings.maskGrow)||0)*mask.width/1000)+1;
    for(let y=0;y<mask.height;y++)for(let x=0;x<mask.width;x++){
      let v=0;for(let yy=Math.max(0,y-radius);yy<=Math.min(mask.height-1,y+radius);yy++)for(let xx=Math.max(0,x-radius);xx<=Math.min(mask.width-1,x+radius);xx++)v=Math.max(v,values[yy*mask.width+xx]);grown[y*mask.width+x]=v;
    }
    const field=depthIntegral(grown,mask.width,mask.height);fieldCache.set(key,field);return field;
  };
  const union=new Float32Array(size);for(const f of loaded)for(let i=0;i<size;i++)union[i]=Math.max(union[i],f.values[i]);
  progress('Placing lines around the silhouette…');
  const candidates=depthSpeakerCandidates(phrase,settings,width,height,union,mask.width,mask.height,fieldFor);
  let best=null;
  for(let ci=0;ci<candidates.length;ci++){
    const c=candidates[ci];let ok=true,coverage=0;
    for(const l of c.phrase.layers){
      if(l.id===c.heroId)continue; // The headline is meant to sit behind the person.
      const key=JSON.stringify([l.text,l.role,l.font,l.width,l.height]);
      if(!glyphCache.has(key))glyphCache.set(key,depthMeasureGlyphs(l,settings,width,height));
      const r=depthLayoutScore(l,glyphCache.get(key),fieldFor(l),[],settings.maxCoveredLetters??2);
      ok=ok&&r.ok;coverage+=r.total||0;
    }
    if(!ok)continue;
    const score=c.referenceCost+coverage*8;
    if(!best||score<best.score)best={score,phrase:c.phrase};
    if(ci%20===0)await new Promise(r=>setTimeout(r,0));
  }
  if(!best&&height>width){
    const fallback=depthPortraitFallback(phrase,settings,width,height,union,mask.width,mask.height);
    if(fallback)best={score:Infinity,phrase:fallback};
  }
  if(!best)return null;
  const original=depthDesignOriginal(phrase),result=depthCopy(best.phrase);
  result.designOriginal=depthCopy(original);
  result.layers.forEach(l=>{l.typeBase={x:l.x,y:l.y,width:l.width,height:l.height,canvasWidth:width,canvasHeight:height};});
  return result;
}
// A phrase with no open space around the speaker keeps its reference stack, moved up or
// down as one block so every supporting line sits inside the frame and covers as little
// of the speaker as it can; the lines get smaller when the stack is taller than the frame.
async function depthFallbackPlacement(phrase,settings,width,height,mask){
  const hi=phrase.layers.findIndex(l=>l.id.endsWith('-hero'));
  if(hi<0||phrase.layers.some(l=>Object.keys(l.wordEdits||{}).length))return phrase;
  if(typeof document!=='undefined'&&document.fonts)await document.fonts.ready;
  const H=1000*height/width,ink=l=>depthTypeSpec(l,settings,1000,H).inkHeight/H*100,wide=l=>depthTypeSpec(l,settings,1000,H).advance/10;
  let field=null;
  if(mask&&depthMaskFits(mask,width,height)){
    const frames=mask.frames.filter((f,i)=>f.t<phrase.end&&(mask.frames[i+1]?.t??f.t+1/mask.fps)>phrase.start);
    if(frames.length){
      const canvas=document.createElement('canvas');canvas.width=mask.width;canvas.height=mask.height;
      const ctx=canvas.getContext('2d',{willReadFrequently:true}),size=mask.width*mask.height,union=new Float32Array(size);
      for(const f of frames){
        const im=new Image();
        await new Promise((resolve,reject)=>{im.onload=resolve;im.onerror=reject;im.src=f.png?'data:image/png;base64,'+f.png:f.url;});
        ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(im,0,0,canvas.width,canvas.height);
        const px=ctx.getImageData(0,0,canvas.width,canvas.height).data;
        for(let k=0;k<size;k++)union[k]=Math.max(union[k],1-px[k*4]/255);
      }
      field=depthIntegral(union,mask.width,mask.height);
    }
  }
  for(let scale=1;scale>0.5;scale*=0.85){
    const layers=phrase.layers.map((l,i)=>({...l,height:i===hi?l.height:l.height*scale}));
    for(let i=hi-1;i>=0;i--)layers[i].y=layers[i+1].y-ink(layers[i])-depthRowGap(layers[i],layers[i+1],settings);
    for(let i=hi+1;i<layers.length;i++)layers[i].y=layers[i-1].y+ink(layers[i-1])+depthRowGap(layers[i-1],layers[i],settings);
    const rows=layers.map((l,i)=>({i,top:l.y,h:ink(l),w:Math.min(l.width,wide(l)),x:l.x})).filter(r=>r.i!==hi);
    const heroMid=layers[hi].y+ink(layers[hi])/2;
    let best=null;
    for(let dy=-70;dy<=70;dy++){
      if(rows.some(r=>r.top+dy<2||r.top+r.h+dy>98)||heroMid+dy<10||heroMid+dy>90)continue;
      let cost=0.02*Math.abs(dy);
      if(field)for(const r of rows)cost+=depthRectCoverage(field,{x:r.x-r.w/2,y:r.top+dy,w:r.w,h:r.h})*r.w;
      if(!best||cost<best.cost)best={dy,cost};
    }
    if(best)return {...phrase,layers:layers.map(l=>({...l,y:l.y+best.dy,typeBase:{x:l.x,y:l.y+best.dy,width:l.width,height:l.height,canvasWidth:width,canvasHeight:height}}))};
  }
  return phrase;
}

// --- Make depth captions: the steps shared by the panel and the template run ---
// A cleared line is left out when saving; a phrase with no lines left is dropped.
function depthCleanPlan(ps) {
  return ps.map((p) => ({ ...p, layers: p.layers.filter((l) => String(l.text || "").trim()).map(({ front, ...l }) => l) })).filter((p) => p.layers.length);
}
function depthComposeFromWords(words, meta, settings, fallbackWidth, fallbackHeight) {
  const next = depthPlanWords(words, meta.fps, meta.duration),
    w = meta.width || fallbackWidth,
    hh = meta.height || fallbackHeight;
  return depthReferenceComposition(depthRestoreTypography(next, w, hh, settings), w, hh, settings);
}
async function depthNewMaskJob(sdk, pid, sid, identity) {
  hostUseSdk(sdk);
  const fs = hostSdk.files,
    root = depthPluginRoot(),
    dir = fs.join(depthMaskDraftDir(pid, sid), identity || Date.now().toString(36) + Math.random().toString(36).slice(2, 6));
  try {
    (await fs.mkdir(dir, { recursive: true }));
  } catch (e) {
    throw new Error("Could not create the mask folder: " + (e?.message || e));
  }
  return { root, dir };
}
// Full-size render of the draft, then speaker masks from it. `onRender` gets the
// render as soon as it exists.
async function depthMakeSpeakerMasks(sdk, pid, sid, meta, settings, excluded, control, progress, onRender) {
  hostUseSdk(sdk);
  depthRequireHost();
  const fs=hostSdk.files,sourceKey=await depthCurrentKey(pid,sid,excluded);
  const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(JSON.stringify({sourceKey,subject:depthSubject(settings),version:DEPTH_MATTE_VERSION,geometry:{width:meta.width,height:meta.height,fps:meta.fps,duration:meta.duration}})));
  const identity=[...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,"0")).join("");
  const maskJob=await depthNewMaskJob(sdk,pid,sid,identity),record=fs.join(maskJob.dir,"render.json");
  let p=null;
  if(await fs.exists(record)) {
    const saved=JSON.parse(await depthReadText(fs,record));
    if(saved.sourceKey===sourceKey&&saved.width===meta.width&&saved.height===meta.height&&saved.fps===meta.fps&&await fs.exists(saved.path))p=saved;
  }
  if(!p){
    p=await depthPrepareVideo(pid,sid,excluded,control,progress,meta,fs.join(maskJob.dir,"render.mp4"));
    await fs.writeFile(record,JSON.stringify(p));
  }
  if (control.canceled) throw new Error("Canceled.");
  onRender?.(p);
  return await depthPrepareMasks(sdk, p, settings, maskJob, progress, control, pid);
}
// Masks are reused while the footage, canvas and speaker setting are what they were made from.
async function depthMaskIsCurrent(files, meta, settings, pid, sid, excluded) {
  if (!files || files.canvasWidth !== meta.width || files.canvasHeight !== meta.height) return false;
  if ((files.subject || "foreground") !== depthSubject(settings) || (files.grow || 0) !== DEPTH_MATTE_GROW || (files.version || 0) !== DEPTH_MATTE_VERSION) return false;
  try {
    const fs = hostSdk.files;
    if (!(await fs.exists(fs.join(files.dir, "matte_" + String(files.count).padStart(6, "0") + ".png")))) return false;
    return (await depthCurrentKey(pid, sid, excluded)) === files.sourceKey;
  } catch {
    return false;
  }
}
// Make and Redo: dialogue → speaker masks (`reuse`d while the footage is unchanged) →
// lines placed around the speaker → one caption clip on the timeline, replacing `owned`.
// The hooks let the panel show each stage; the template run passes none.
async function depthMakeCaptions({ sdk, pid, sid, settings, owned = null, reuse = null, control, progress, fallbackSize = {}, hooks = {} }) {
  const recoveryKey = DEPTH_TAG + ":" + pid + ":" + sid;
  const previous = JSON.parse(await depthStorage().getItem(recoveryKey) || "null");
  await depthSave(recoveryKey, { ...previous, settings, owned });
  if (control.canceled) throw new Error("Canceled.");
  const r = await sdk.runScript({ script: depthReadScript(pid, sid), summary: "Read dialogue for Depth Type captions", allowCommit: false });
  if (r.isError || !r.result) throw new Error(r.output || "No draft data returned.");
  const meta = r.result;
  let next = depthComposeFromWords(meta.words, meta, settings, fallbackSize.width, fallbackSize.height);
  if (!next.length) throw new Error("No dialogue found in this draft.");
  hooks.onRead?.(meta, next);
  // Everything this panel placed: never part of the speaker render or its key.
  const excluded = [owned, ...await depthCutawayRefs(pid, sid)];
  if (control.canceled) throw new Error("Canceled.");
  let files = null, around = 0;
  if (settings.depth) {
    depthRequireHost();
    let layoutMask;
    if (reuse?.files && (await depthMaskIsCurrent(reuse.files, meta, settings, pid, sid, excluded))) {
      files = reuse.files;
      layoutMask = reuse.mask || (await depthLoadLayoutMask(files));
      if (!reuse.mask) hooks.onMaskLoaded?.(layoutMask);
    } else {
      const made = await depthMakeSpeakerMasks(sdk, pid, sid, meta, settings, excluded, control, progress, hooks.onRender);
      hooks.onMasks?.(made);
      files = made.files;
      layoutMask = made.mask;
    }
    const composed = depthCopy(next);
    for (let i = 0; i < next.length; i++) {
      if (control.canceled) throw new Error("Canceled.");
      progress("Placing captions around the speaker · " + (i + 1) + " / " + next.length);
      try {
        const c = await depthComposeWithSpeaker(next[i], next, settings, layoutMask, meta.width, meta.height, () => {});
        if (c) {
          composed[i] = c;
          around++;
          continue;
        }
      } catch {}
      // No open space around the speaker for this phrase: its supporting lines keep the
      // design's stack, inside the frame, drawn in front of the speaker so they stay readable.
      const placed = await depthFallbackPlacement(next[i], settings, meta.width, meta.height, layoutMask);
      composed[i] = { ...placed, layers: placed.layers.map((l) => (l.id.endsWith("-hero") ? l : { ...l, depth: "front" })) };
    }
    next = composed;
  } else {
    const placed = [];
    for (const p of next) placed.push(await depthFallbackPlacement(p, settings, meta.width, meta.height, null));
    next = placed;
  }
  hooks.onPlaced?.(next);
  if (control.canceled) throw new Error("Canceled.");
  progress("Saving captions…");
  const savePlan = depthCleanPlan(next);
  await depthSave(recoveryKey, { ...previous, settings, owned, plan: savePlan, masks: files, savedMasks: files?.dir || null });
  if (control.canceled) throw new Error("Canceled.");
  const cutawayRefs = await depthCutawayRefs(pid, sid);
  if (control.canceled) throw new Error("Canceled.");
  const ar = await sdk.runScript({ summary: "Apply Depth Type captions", allowCommit: true, script: depthApplyScript(pid, sid, savePlan, settings, files, owned, cutawayRefs).script });
  if (ar.isError || !ar.result?.owned) throw new Error(ar.output || "Captions were not confirmed on the timeline.");
  return { meta, savePlan, files, around, result: ar.result };
}

// --- Template run: headless, for a built-in app, nobody watching ---------------
// Behind speaker currently caps a Draft at 90 seconds (depthPrepareVideo). A longer
// clip becomes a Draft of its first 90 seconds, ending with the last word that
// finishes by then; the margin keeps frame rounding on insert under the cap.
const DEPTH_TEMPLATE_SECONDS = 90, DEPTH_TEMPLATE_MARGIN = 0.1;
const DEPTH_TEMPLATE_ERRORS = {
  "no-project": "Open a project, then try again.",
  "no-video": "Pick a video of one person talking to camera, then try again.",
  "host": "Depth Type Captions needs a newer version of Selects. Update Selects, then try again.",
  "tools": "Placing words behind the speaker needs macOS 12 or later.",
  "no-transcript": "This video has no transcript to make captions from.",
  "no-speech-in-limit": "The first 90 seconds of this video have no speech to caption.",
  "no-draft": "Open a draft of one person talking to camera, then try again.",
  "too-long": "This draft runs over 90 seconds. Depth Type Captions works on drafts up to 90 seconds.",
  "no-dialogue": "This draft has no speech to caption.",
};
const DEPTH_TEMPLATE_FAILED = "Depth Type Captions could not make the captioned timeline. Try again.";
const depthTemplateError = (code) => Object.assign(new Error(DEPTH_TEMPLATE_ERRORS[code] || DEPTH_TEMPLATE_FAILED), { code });
// A file name without its extension, for naming the new Draft.
function depthClipBaseName(name) {
  const trimmed = String(name || "").trim();
  return trimmed.replace(/\.[A-Za-z0-9]{1,5}$/, "") || trimmed || "Video";
}
// Speaker masks run on the Mac's own frameworks through shared AI (RVM segmentation,
// macOS 12 or later); nothing is installed.
// A new Draft holding the clip on Main at the clip's own frame size (fps is the
// project's), named "<clip> · Depth Type", unique among the Project's drafts, and
// committed so later scripts read it by id. A clip longer than the cap is inserted up
// to its last word that finishes by then. Nothing is created without spoken words.
function depthClipDraftScript(pid, resourceId, baseName) {
  const limit = DEPTH_TEMPLATE_SECONDS - DEPTH_TEMPLATE_MARGIN;
  return `const p=selects.project(${JSON.stringify(pid)});const resourceId=${JSON.stringify(resourceId)};const res=p.resource(resourceId);
let spoken;try{spoken=(await res.words({view:'playback'})).filter(w=>!w.nonSpeech&&!w.unanalyzed&&String(w.text||'').trim());}catch(e){if(/not_analyzed/.test(String(e&&e.message||e)))return {noWords:true};throw e;}
if(!spoken.length)return {noWords:true};
const rm=await res.meta();const fps=Number(rm.fps);if(!(fps>0))throw new Error('The clip has no frame rate.');
const total=Number(rm.durationFrames)/fps;let range=null;
if(!(total<=${limit})){const fit=spoken.filter(w=>w.endFrame/fps<=${limit});if(!fit.length)return {noSpeechInLimit:true};range={startSeconds:0,endSeconds:Math.max(...fit.map(w=>w.endFrame))/fps};}
let size=null;const fsz=rm.frameSize;if(fsz&&Number.isInteger(fsz.width)&&Number.isInteger(fsz.height)&&fsz.width>0&&fsz.height>0)size={width:fsz.width,height:fsz.height};
const base=${JSON.stringify(baseName + " · Depth Type")};const names=[];for(const id of (await p.meta()).draftIds||[]){try{names.push((await selects.draft(id).meta()).name);}catch{}}
let name=base;for(let n=2;names.includes(name);n++)name=base+' ('+n+')';
const d=await p.createDraft({name});
await d.insertResource(range?{resourceId,sourceRange:range}:{resourceId});
try{await d.setFrameSize(size||'original');}catch{}
const dm=await d.meta();
const words=(await d.words({view:'playback'})).filter(w=>!w.nonSpeech&&!w.cut&&!w.unanalyzed&&String(w.text||'').trim());
if(!words.length)return {noWords:true};
if(!(dm.durationFrames>0)||dm.durationFrames/dm.fps>${DEPTH_TEMPLATE_SECONDS})throw new Error('The new Draft runs '+(dm.durationFrames/dm.fps)+' s, over the ${DEPTH_TEMPLATE_SECONDS} s limit.');
const r=await d.commitAll('Create Depth Type draft from a video');if(!r.createdDraftId)throw new Error('The Draft was not created.');
return {id:r.createdDraftId,name,sourceSeconds:total,endSeconds:range?range.endSeconds:null,draftSeconds:dm.durationFrames/dm.fps,words:words.length};`;
}
function DepthTemplateRun({ sdk, context }) {
  const template = context.template,
    runId = template?.runId;
  const live = useRef(runId), started = useRef(null);
  live.current = runId;
  const [status, setStatus] = useState("Starting Depth Type Captions…");
  useEffect(() => {
    if (!runId || started.current === runId) return;
    started.current = runId;
    const control = { canceled: false, workflowId: null, stop: null };
    const superseded = () => live.current !== runId;
    const progress = (text) => {
      if (!superseded() && !control.canceled) setStatus(text);
    };
    let done = false;
    // Exactly once, and only for the current run: the runtime reports under the current run id.
    const finish = (result) => {
      if (done) return;
      done = true;
      if (superseded() || control.canceled) return;
      setStatus("sequenceId" in result ? "Done." : result.error);
      sdk.finishTemplate(result);
    };
    (async () => {
      try {
        const pid = context.projectId;
        if (!pid) throw depthTemplateError("no-project");
        const runKey = DEPTH_TAG + ":template:" + pid + ":" + runId;
        const previousRun = JSON.parse(await depthStorage().getItem(runKey) || "null");
        control.retryAi=!previousRun;
        await depthSave(runKey, previousRun || { status: "ready" });
        if (control.canceled || superseded()) throw new Error("Canceled.");
        const given = template.inputs?.speaker || [];
        // The open draft (a timeline) is captioned in place; a picked video, from older apps, gets a new Draft.
        const timeline = given.find((x) => x?.kind === "timeline" && x.sequenceId);
        const speaker = timeline || given.find((x) => x?.kind === "video" && x.resourceId);
        if (!speaker) throw depthTemplateError(given.some((x) => x?.kind === "video") ? "no-video" : "no-draft");
        // The app hands over the library: the person may move to another page while this runs.
        const libraryId = template.libraryId;
        if (!libraryId || !sdk?.runScript) throw depthTemplateError("host");
        if (depthHostProblem()) throw depthTemplateError("host");
        if (control.canceled) throw new Error("Canceled.");
        let sid;
        if (timeline) {
          // Behind speaker handles a draft up to 90 seconds, as the panel does.
          const m = await sdk.runScript({ script: `const m=await selects.draft(${JSON.stringify(String(timeline.sequenceId))}).meta();return {seconds:Number(m.durationFrames)/Number(m.fps)};`, summary: "Read the draft's length", allowCommit: false });
          if (m.isError || !m.result) throw new Error(m.output || "The draft could not be read.");
          if (!(m.result.seconds <= DEPTH_TEMPLATE_SECONDS)) throw depthTemplateError("too-long");
          sid = String(timeline.sequenceId);
        } else if (previousRun?.sequenceId) {
          sid = previousRun.sequenceId;
        } else {
          if (previousRun?.status === "pending") throw new Error("A Draft may already exist. Inspect the project before starting a new template run.");
          await depthSave(runKey, { status: "pending" });
          if (control.canceled || superseded()) throw new Error("Canceled.");
          progress("Placing your video…");
          const r = await sdk.runScript({ script: depthClipDraftScript(pid, speaker.resourceId, depthClipBaseName(speaker.name)), summary: "Create Depth Type draft from a video", allowCommit: true });
          if (r.isError || !r.result) throw new Error(r.output || "The Draft was not created.");
          if (r.result.noWords) throw depthTemplateError("no-transcript");
          if (r.result.noSpeechInLimit) throw depthTemplateError("no-speech-in-limit");
          if (!r.result.id) throw new Error("The Draft was not created.");
          sid = String(r.result.id);
          await depthSave(runKey, { status: "saved", sequenceId: sid });
          if (r.result.endSeconds != null)
            console.info("[depth-type] template run: clip of " + r.result.sourceSeconds + " s placed up to " + r.result.endSeconds + " s (Behind speaker handles " + DEPTH_TEMPLATE_SECONDS + " s).");
        }
        if (control.canceled || superseded()) throw new Error("Canceled.");
        const settings = { ...DEPTH_DEFAULTS };
        let made;
        try {
          made = await depthMakeCaptions({ sdk, pid, sid, settings, control, progress });
        } catch (e) {
          if (/No dialogue found/.test(String(e?.message || e))) throw depthTemplateError("no-dialogue");
          if (/up to 90 seconds/.test(String(e?.message || e))) throw depthTemplateError("too-long");
          throw e;
        }
        const { savePlan, files, around, result } = made;
        // Remembered as the panel remembers a save, so opening the panel on this Draft
        // shows these captions for Fine-tune, Redo (reusing the masks) and Remove.
        const plan = result.trimmed ? depthBoundPlan(savePlan, result.duration).plan : savePlan;
        const summary = { phrases: savePlan.length, around, masks: files?.count || 0, width: files?.width || 0, height: files?.height || 0 };
        await depthSave(DEPTH_TAG + ":" + pid + ":" + sid, { settings, plan, owned: result.owned, summary, masks: files, savedMasks: files?.dir || null });
        finish({ sequenceId: sid });
      } catch (e) {
        if (superseded() || control.canceled) return finish({ error: DEPTH_TEMPLATE_FAILED });
        console.warn("[depth-type] template run failed:", e?.code || "", e?.message || e);
        finish({ error: /^Update Selects/.test(String(e?.message || "")) ? e.message : e?.code && DEPTH_TEMPLATE_ERRORS[e.code] ? DEPTH_TEMPLATE_ERRORS[e.code] : DEPTH_TEMPLATE_FAILED });
      }
    })().catch(() => finish({ error: DEPTH_TEMPLATE_FAILED }));
    // A newer run, or the app taking the frame down, stops this one's render and masks.
    return () => {
      control.canceled = true;
      try {
        if (control.workflowId) depthCancelWorkflow(control.workflowId).catch(() => {});
      } catch {}
      try {
        control.stop?.()?.catch?.(() => {});
      } catch {}
    };
  }, [runId]);
  return h("small", null, status);
}

function DepthVideo({ preview, time, playing, onTime, onEnded, onError }) {
  const mount = useRef(null), video = useRef(null), callbacks = useRef({ onTime, onEnded, onError });
  callbacks.current = { onTime, onEnded, onError };
  useEffect(() => {
    if(!preview?.url||!mount.current)return;
    const doc=document,v=doc.createElement('video'),canvas=doc.createElement('canvas'),ctx=canvas.getContext('2d');let raf;
    v.src=preview.url;v.muted=true;v.playsInline=true;v.preload='auto';
    canvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;display:block';
    mount.current.appendChild(canvas);video.current=v;
    const draw=()=>{if(v.videoWidth){canvas.width=v.videoWidth;canvas.height=v.videoHeight;ctx.drawImage(v,0,0);}};
    v.onloadeddata=draw;v.onseeked=draw;
    const tick=()=>{if(!v.paused&&!v.ended){draw();callbacks.current.onTime(v.currentTime);}raf=requestAnimationFrame(tick);};raf=requestAnimationFrame(tick);
    v.onended=()=>callbacks.current.onEnded();v.onerror=()=>callbacks.current.onError('Preview video could not load. Choose Redo.');
    return()=>{cancelAnimationFrame(raf);v.pause();v.removeAttribute('src');v.load();canvas.remove();video.current=null;};
  },[preview?.url]);
  useEffect(()=>{const v=video.current;if(v){if(playing)v.play().catch(e=>callbacks.current.onError(e.message));else v.pause();}},[playing]);
  useEffect(()=>{const v=video.current;if(v&&!playing&&Math.abs(v.currentTime-time)>1e-3)v.currentTime=time;},[time,playing]);
  return h('div',{ref:mount,style:{position:'absolute',inset:0}});
}
function DepthTypePanel({ sdk, context }) {
  hostUseSdk(sdk);
  if (context.template) return h(DepthTemplateRun, { sdk, context });
  return h(DepthEditor, {
    key: String(context.projectId) + ":" + String(context.sequenceId),
    sdk,
    context,
  });
}
function DepthEditor({ sdk, context }) {
  const key = DEPTH_TAG + ":" + context.projectId + ":" + context.sequenceId;
  const [restored, setRestored] = useState(null), [failure, setFailure] = useState("");
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        await depthWrites.get(key)?.catch(() => {});
        const value = JSON.parse(await depthStorage().getItem(key) || "null");
        if (live) setRestored({ value });
      } catch (error) { if (live) setFailure(String(error.message || error)); }
    })();
    return () => { live = false; };
  }, [key]);
  if (!restored) return h("p", { role: failure ? "alert" : "status" }, failure || "Restoring saved captions…");
  return h(DepthEditorReady, { sdk, context, saved: restored.value });
}
function DepthEditorReady({ sdk, context, saved }) {
  const pid = context.projectId, sid = context.sequenceId, key = DEPTH_TAG + ":" + pid + ":" + sid;
  const initial = useRef(saved);
  const [settings, setSettings] = useState({ ...DEPTH_DEFAULTS, ...initial.current?.settings }),
    [plan, setPlan] = useState(() => (initial.current?.plan || []).map((p) => ({ ...p, layers: p.layers.map(({ front, ...l }) => l) }))),
    [owned, setOwned] = useState(initial.current?.owned || null),
    [summary, setSummary] = useState(initial.current?.summary || null),
    [selected, setSelected] = useState(0),
    [layerIndex, setLayerIndex] = useState(0),
    [wordIndex, setWordIndex] = useState(0),
    [moveUnit, setMoveUnit] = useState("word"),
    [info, setInfo] = useState(null),
    [status, setStatus] = useState(""),
    [busy, setBusy] = useState(false),
    [preview, setPreview] = useState(null),
    [mask, setMask] = useState(null),
    [maskFiles, setMaskFiles] = useState(initial.current?.masks || null),
    [savedMasks, setSavedMasks] = useState(initial.current?.savedMasks || null),
    [time, setTime] = useState(0),
    [playing, setPlaying] = useState(false),
    [undo, setUndo] = useState(null),
    [edited, setEdited] = useState(false),
    [wide, setWide] = useState(window.innerWidth > 760);
  const lock = useRef(false), alive = useRef(true), job = useRef(null), drag = useRef(null), stage = useRef(null);
  // The captions as last saved to the timeline; Undo brings the editor back to them.
  const lastSaved = useRef(plan);
  useEffect(() => {
    alive.current = true;
    const resize = () => setWide(window.innerWidth > 760);
    window.addEventListener("resize", resize);
    return () => {
      alive.current = false;
      window.removeEventListener("resize", resize);
      if (job.current) {
        job.current.canceled = true;
        job.current.stop?.();
        if (job.current.workflowId) depthCancelWorkflow(job.current.workflowId).catch(() => {});
      }
    };
  }, []);
  const recovery = useRef(null);
  recovery.current = { settings, plan, owned, summary, masks: maskFiles, savedMasks };
  useEffect(() => {
    depthSave(key, recovery.current).catch(error => {
      if (alive.current) setStatus("Captions could not be saved. Keep this panel open and retry. " + error.message);
    });
  }, [settings, plan, owned, summary, maskFiles, savedMasks]);
  // Reopening the panel keeps the last full-size render as the preview video.
  useEffect(() => {
    let live = true;
    if (!maskFiles?.render) return;
    (async () => {
    try {
      const fs = hostSdk.files;
      if (!(await fs.exists(maskFiles.render))) return;
      const url = await fs.pathToLocalURL(maskFiles.render);
      if (!live) return;
      setPreview({ path: maskFiles.render, url, sourceKey: maskFiles.sourceKey, duration: maskFiles.duration, fps: maskFiles.fps, width: maskFiles.canvasWidth, height: maskFiles.canvasHeight });
      depthLoadLayoutMask(maskFiles).then((m) => alive.current && setMask((current) => current || m)).catch(() => {});
    } catch {}
    })();
    return () => { live = false; };
  }, []);
  useEffect(() => {
    if (!pid || !sid) return;
    let live = true;
    sdk
      .runScript({ script: depthReadScript(pid, sid), summary: "Read Depth Type draft", allowCommit: false })
      .then((r) => {
        if (!live) return;
        if (r.isError || !r.result) throw new Error(r.output || "Draft read returned no data.");
        setInfo(r.result);
      })
      .catch((e) => {
        if (live) setStatus(e.message);
      });
    return () => {
      live = false;
    };
  }, []);
  const run = async (label, fn) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setPlaying(false);
    setStatus(label);
    try {
      await depthSave(key, recovery.current);
      if (!alive.current) return;
      await fn();
      await depthWrites.get(key);
    } catch (e) {
      if (alive.current) {
        let message = String(e.message || e);
        try {
          const detail = JSON.parse(message);
          if (typeof detail.error === "string") message = detail.error + (detail.diagnostics?.length ? ": " + detail.diagnostics.map((d) => d.message).join("; ") : "");
        } catch {}
        setStatus(message);
      }
    } finally {
      lock.current = false;
      if (alive.current) setBusy(false);
    }
  };
  const row = plan[selected],
    layer = row?.layers[layerIndex],
    fps = info?.fps || 60,
    duration = info?.duration || Math.max(10, ...plan.map((p) => p.end)),
    W = info?.width || 1916,
    H = info?.height || 1078;
  const seek = (t) => {
    setPlaying(false);
    setTime(Math.max(0, Math.min(duration - 0.0001, t)));
  };
  const choose = (i) => {
    setSelected(i);
    setLayerIndex(0);
    setWordIndex(0);
    seek(plan[i].start);
  };
  const editLine = (li, patch) => {
    setEdited(true);
    setPlan((ps) =>
      ps.map((p, i) =>
        i === selected
          ? {
              ...p,
              designOriginal: undefined,
              layers: p.layers.map((l, j) =>
                j === li
                  ? {
                      ...l,
                      ...patch,
                      wordEdits: Object.hasOwn(patch, "text") ? undefined : patch.wordEdits || l.wordEdits,
                    }
                  : l,
              ),
            }
          : p,
      ),
    );
  };
  const editWord = (patch) => editLine(layerIndex, { wordEdits: { ...(layer?.wordEdits || {}), [wordIndex]: { ...(layer?.wordEdits?.[wordIndex] || {}), ...patch } } });
  const updateSettings = (patch) => {
    setEdited(true);
    setSettings((s) => ({ ...s, ...patch }));
  };
  const cleanPlan = depthCleanPlan;
  // Everything this panel placed: never part of the speaker render or its key.
  const excludedRefs = async (ownedRef = owned) => [ownedRef, ...await depthCutawayRefs(pid, sid)];
  const maskIsCurrent = async (meta) => depthMaskIsCurrent(maskFiles, meta, settings, pid, sid, await excludedRefs());
  const verifyMask = async () => {
    if (!maskFiles) throw new Error("Choose Make depth captions first, or turn off Behind speaker.");
    const fresh = await sdk.runScript({ script: depthReadScript(pid, sid), summary: "Verify speaker mask canvas", allowCommit: false });
    if (fresh.isError || !fresh.result) throw new Error(fresh.output || "Could not verify the draft canvas.");
    if (!(await maskIsCurrent(fresh.result))) throw new Error("The draft changed since the captions were made. Choose Redo to follow the current edit.");
  };
  // Saved captions read the mask folder they were saved with; keep it and the one
  // before it (Undo), drop older folders of this draft.
  const pruneMasks = (saved, previous) => depthPruneMasks(sdk, pid, sid, [saved, previous]).catch(() => {});
  const describe = (s) => s.phrases + " caption" + (s.phrases === 1 ? "" : "s") + (s.masks ? " · " + s.around + " placed around the speaker" : " · Behind speaker off");
  const saveNote = (result) =>
    (result.recovered ? " The previous caption clip was missing, so a new one was added." : "") +
    (result.replaced > 1 ? " Replaced " + result.replaced + " earlier caption clips." : "") +
    (result.cutaways ? " Captions step aside during " + result.cutaways + " earlier cutaway" + (result.cutaways === 1 ? "" : "s") + "." : "") +
    (result.trimmed ? " Fitted timing to the draft end: " + result.clippedLayers + " lines shortened, " + result.droppedLayers + " out-of-range lines skipped." : "");
  const cancel = () => {
    if (!job.current) return;
    job.current.canceled = true;
    void job.current.cancelAi?.()?.catch?.(() => {});
    job.current.stop?.();
    if (job.current.workflowId) depthCancelWorkflow(job.current.workflowId).catch(() => {});
    setStatus("Cancel requested. The current step stops within a few seconds.");
  };
  // Make and Redo: dialogue → speaker masks (reused while the footage is unchanged) →
  // lines placed around the speaker → one caption clip on the timeline.
  const make = () =>
    run("Reading dialogue…", async () => {
      const control = { canceled: false, workflowId: null, stop: null, retryAi:true };
      job.current = control;
      const progress = (s) => {
        if (alive.current) setStatus(s);
      };
      const before = { owned, savedMasks, summary, plan: lastSaved.current };
      try {
        const { savePlan, files, around, result } = await depthMakeCaptions({
          sdk,
          pid,
          sid,
          settings,
          owned,
          reuse: { files: maskFiles, mask },
          control,
          progress,
          fallbackSize: { width: W, height: H },
          hooks: {
            onRead: (meta, next) => {
              if (!alive.current) return;
              setInfo(meta);
              setPlan(next);
              setSelected(0);
              setLayerIndex(0);
              setTime(next[0]?.start || 0);
            },
            onMaskLoaded: (layoutMask) => {
              if (alive.current) setMask(layoutMask);
            },
            onRender: (p) => {
              if (!alive.current) return;
              setPreview(p);
              setMask(null);
            },
            onMasks: (made) => {
              if (!alive.current || control.canceled) return;
              setMask(made.mask);
              setMaskFiles(made.files);
            },
            onPlaced: (next) => {
              if (alive.current) setPlan(next);
            },
          },
        });
        const done = { phrases: savePlan.length, around, masks: files?.count || 0, width: files?.width || 0, height: files?.height || 0 };
        if (alive.current) {
          setOwned(result.owned);
          setSavedMasks(files?.dir || null);
          lastSaved.current = result.trimmed ? depthBoundPlan(savePlan, result.duration).plan : savePlan;
          if (result.trimmed) setPlan(lastSaved.current);
          setSummary(done);
          setEdited(false);
          setUndo({ id: result.commitId, ...before, owned: result.recovered ? null : before.owned });
          setStatus(
            "Done. " + describe(done) + "." +
              (files && done.around < done.phrases ? " The other " + (done.phrases - done.around) + " keep their smaller lines in front of the speaker." : "") +
              (files ? " Words behind the speaker use " + files.count + " full-size masks (" + files.width + " × " + files.height + ")" + (files.misses ? "; " + files.misses + " frames without a detected speaker hide them" : "") + "." : "") +
              saveNote(result),
          );
        }
        await depthSave(key, { settings, plan: result.trimmed ? depthBoundPlan(savePlan, result.duration).plan : savePlan, owned: result.owned, summary: done, masks: files, savedMasks: files?.dir || null });
        await pruneMasks(files?.dir, before.savedMasks);
      } finally {
        job.current = null;
      }
    });
  // Fine-tune edits reuse the current masks.
  const apply = () =>
    run("Saving changes…", async () => {
      const savePlan = cleanPlan(plan);
      depthValidate(savePlan);
      if (settings.depth) {
        depthRequireHost();
        await verifyMask();
      }
      const before = { owned, savedMasks, summary, plan: lastSaved.current }, files = settings.depth ? maskFiles : null;
      const built = depthApplyScript(pid, sid, savePlan, settings, files, owned, await depthCutawayRefs(pid, sid));
      await depthSave(key, { settings, plan: savePlan, owned, summary, masks: files, savedMasks });
      if (!alive.current) return;
      const r = await sdk.runScript({ summary: "Apply Depth Type captions", allowCommit: true, script: built.script });
      if (r.isError || !r.result?.owned) throw new Error(r.output || "No save confirmation. Check the timeline before retrying.");
      if (alive.current) {
        const bounded = r.result.trimmed ? depthBoundPlan(savePlan, r.result.duration).plan : savePlan;
        lastSaved.current = bounded;
        setOwned(r.result.owned);
        setSavedMasks(files?.dir || null);
        setPlan(bounded);
        setSelected((i) => Math.max(0, Math.min(i, bounded.length - 1)));
        setLayerIndex(0);
        const done = { ...(summary || { around: 0 }), phrases: bounded.length, masks: files?.count || 0, width: files?.width || 0, height: files?.height || 0 };
        setSummary(done);
        setEdited(false);
        setUndo({ id: r.result.commitId, ...before, owned: r.result.recovered ? null : before.owned });
        setStatus("Saved. " + describe(done) + "." + saveNote(r.result));
      }
      await depthSave(key, { settings, plan: r.result.trimmed ? depthBoundPlan(savePlan, r.result.duration).plan : savePlan, owned: r.result.owned, summary, masks: files, savedMasks: files?.dir || null });
      await pruneMasks(files?.dir, before.savedMasks);
    });
  const remove = () =>
    run("Removing the captions…", async () => {
      if (!owned) return;
      const r = await sdk.runScript({
        summary: "Remove Depth Type captions",
        allowCommit: true,
        script:
          depthOwner(pid, sid) +
          "const ref=" +
          JSON.stringify(owned) +
          ';const c=(await d.clips({trackScope:"all"})).find(x=>x.clipId===ref.clipId&&x.trackId===ref.trackId);if(!c)throw new Error("The caption clip is no longer on the timeline.");await d.removeClips([c]);const result=await d.commitAll("Remove Depth Type Captions");return {commitId:result.commitId};',
      });
      if (r.isError || !r.result) throw new Error(r.output || "No removal confirmation.");
      setUndo({ id: r.result.commitId, owned, savedMasks, summary });
      setOwned(null);
      setSummary(null);
      await depthSave(key, { settings, plan, owned: null, summary: null, masks: maskFiles, savedMasks });
      setStatus("Removed the captions from the timeline.");
    });
  const undoApply = () =>
    run("Undoing…", async () => {
      const r = await sdk.runScript({ summary: "Undo Depth Type change", allowCommit: true, script: depthOwner(pid, sid) + "return await d.revertCommit(" + JSON.stringify(undo.id) + ");" });
      if (r.isError) throw new Error(r.output);
      setOwned(undo.owned);
      setSavedMasks(undo.savedMasks);
      setSummary(undo.summary);
      if (undo.plan) {
        lastSaved.current = undo.plan;
        setPlan(undo.plan);
        setSelected(0);
        setLayerIndex(0);
      }
      setUndo(null);
      setEdited(false);
      await depthSave(key, { settings, plan: undo.plan || plan, owned: undo.owned, summary: undo.summary, masks: maskFiles, savedMasks: undo.savedMasks });
      setStatus("Undone.");
    });
  const button = (text, onClick, disabled = false, variant = "secondary") =>
    h("button", { type: "button", onClick, disabled: busy || disabled, "data-variant": variant, style: { width: "auto", minWidth: 0 } }, text);
  const field = (label, value, onChange, type = "text", props = {}) =>
    h(
      "label",
      { style: { display: "grid", gap: 4, minWidth: 0 } },
      h("span", null, label),
      h("input", { ...props, "aria-label": label, type, value, onChange: (e) => onChange(type === "number" ? Number(e.target.value) : e.target.value), style: { minWidth: 0 } }),
    );
  const select = (label, value, onChange, opts) =>
    h("label", { style: { display: "grid", gap: 4 } }, label, h("select", { "aria-label": label, value, onChange: (e) => onChange(e.target.value) }, ...opts.map(([v, l]) => h("option", { key: v, value: v }, l))));
  const toggle = (label, checked, onChange) =>
    h("label", { style: { display: "flex", gap: 8, alignItems: "center" } }, h("input", { type: "checkbox", checked, onChange: (e) => onChange(e.target.checked), style: { width: "auto", height: "auto" } }), label);
  const onDown = (e) => {
    const t = e.target.closest?.("text[data-layer]");
    if (!t) return;
    const pi = plan.findIndex((p) => p.id === t.getAttribute("data-phrase")),
      li = plan[pi]?.layers.findIndex((l) => l.id === t.getAttribute("data-layer"));
    if (pi < 0 || li < 0) return;
    e.preventDefault();
    setPlaying(false);
    setSelected(pi);
    setLayerIndex(li);
    const wi = Number(e.target.closest?.("tspan[data-word]")?.getAttribute("data-word") || 0);
    setWordIndex(wi);
    const l = plan[pi].layers[li],
      rect = stage.current.getBoundingClientRect();
    drag.current = {
      pi,
      li,
      wi: moveUnit === "word" ? wi : null,
      x: moveUnit === "word" ? l.wordEdits?.[wi]?.dx || 0 : l.x,
      y: moveUnit === "word" ? l.wordEdits?.[wi]?.dy || 0 : l.y,
      px: e.clientX,
      py: e.clientY,
      w: rect.width,
      h: rect.height,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = (e) => {
    const d = drag.current;
    if (!d) return;
    setEdited(true);
    setPlan((ps) =>
      ps.map((p, i) =>
        i === d.pi
          ? {
              ...p,
              designOriginal: undefined,
              layers: p.layers.map((l, j) =>
                j === d.li
                  ? d.wi !== null
                    ? { ...l, wordEdits: { ...(l.wordEdits || {}), [d.wi]: { ...(l.wordEdits?.[d.wi] || {}), dx: d.x + ((e.clientX - d.px) / d.w) * 100, dy: d.y + ((e.clientY - d.py) / d.h) * 100 } } }
                    : { ...l, typeBase: undefined, x: Math.max(-20, Math.min(120, d.x + ((e.clientX - d.px) / d.w) * 100)), y: Math.max(-20, Math.min(120, d.y + ((e.clientY - d.py) / d.h) * 100)) }
                  : l,
              ),
            }
          : p,
      ),
    );
  };
  const deletePhrase = () => {
    setEdited(true);
    setPlan((ps) => ps.filter((_, i) => i !== selected));
    setSelected(Math.max(0, selected - 1));
    setLayerIndex(0);
  };
  const hostProblem = settings.depth ? depthHostProblem() : "";
  let validation = "";
  try {
    if (plan.length) depthValidate(cleanPlan(plan));
  } catch (e) {
    validation = e.message;
  }
  const svg = depthSvg(plan, { ...settings, depth: settings.depth && !!mask }, time, W, H, mask, false);
  const alert = (text) => h("p", { role: "alert", style: { margin: 0, color: "var(--panel-danger,#ff736d)" } }, text);
  const main = h(
    "section",
    { style: { display: "grid", gap: 8, padding: "10px 12px", border: "1px solid var(--panel-accent,#6c8cff)", borderRadius: 6 } },
    owned
      ? h("div", { style: { display: "grid", gap: 2 } }, h("strong", null, "Captions are on the timeline"), h("small", null, summary ? describe(summary) : plan.length + " captions"))
      : h("small", null, "Turns the draft's dialogue into captions and tucks the key word of each phrase behind the speaker."),
    h(
      "div",
      { style: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" } },
      owned ? button("Redo", make, !pid || !sid || !!hostProblem) : button("Make depth captions", make, !pid || !sid || !!hostProblem, "primary"),
      owned && button("Remove", remove),
      undo && button("Undo", undoApply),
      busy && job.current && h("button", { type: "button", "data-variant": "secondary", onClick: cancel }, "Cancel"),
    ),
    owned && h("small", null, "Redo follows the current edit of the draft and replaces changes made in Fine-tune."),
    hostProblem && alert(hostProblem),
  );
  const phraseList = h(
    "div",
    { style: { display: "grid", gap: 6, maxHeight: wide ? 520 : 200, overflow: "auto", scrollbarGutter: "stable", alignContent: "start" } },
    ...plan.map((p, i) =>
      h(
        "button",
        {
          key: p.id,
          type: "button",
          onClick: () => choose(i),
          disabled: busy,
          "data-variant": "ghost",
          style: { textAlign: "left", whiteSpace: "normal", height: "auto", padding: "8px", border: "1px solid " + (selected === i ? "#e44a43" : "var(--panel-border,#333)"), background: selected === i ? "#442525" : "transparent" },
        },
        h("strong", { style: { display: "block", fontSize: 12 } }, p.layers.map((l) => l.text).filter(Boolean).join(" ") || "(empty)"),
        h("small", null, p.start.toFixed(1) + " s"),
      ),
    ),
  );
  const previewSection = h(
    "section",
    { style: { display: "grid", gap: 8, minWidth: 0 } },
    h(
      "div",
      {
        ref: stage,
        onPointerDown: onDown,
        onPointerMove: onMove,
        onPointerUp: () => {
          drag.current = null;
        },
        onPointerCancel: () => {
          drag.current = null;
        },
        style: { position: "relative", aspectRatio: W + "/" + H, background: "#070707", overflow: "hidden", touchAction: "none", borderRadius: 6, border: "1px solid var(--panel-border,#333)" },
      },
      preview && h(DepthVideo, { preview, time, playing, onTime: setTime, onEnded: () => setPlaying(false), onError: setStatus }),
      h("div", { style: { position: "absolute", inset: 0, cursor: "move" }, dangerouslySetInnerHTML: { __html: svg } }),
    ),
    h(
      "div",
      { style: { display: "flex", gap: 8, alignItems: "center" } },
      button(playing ? "Pause" : "Play", () => setPlaying((p) => !p), !preview),
      h("input", { "aria-label": "Playhead", type: "range", min: 0, max: Math.max(0, duration - 1 / fps), step: 1 / fps, value: time, onChange: (e) => seek(Number(e.target.value)), style: { flex: 1, minWidth: 0 } }),
    ),
    h("small", null, settings.depth && !mask ? "Words appear behind the speaker after Make depth captions." : "Drag a word on the picture to move it."),
    row &&
      h(
        "div",
        { style: { display: "grid", gap: 8 } },
        ...row.layers.map((l, i) =>
          h(
            "label",
            { key: l.id, style: { display: "grid", gap: 4 } },
            h("span", null, l.id.endsWith("-hero") ? "Headline" : "Line"),
            h("textarea", {
              "aria-label": (l.id.endsWith("-hero") ? "Headline" : "Line") + " " + (i + 1),
              value: l.text,
              rows: 1,
              onFocus: () => {
                setLayerIndex(i);
                seek(l.start);
              },
              onChange: (e) => editLine(i, { text: e.target.value }),
              style: { width: "100%", resize: "vertical" },
            }),
          ),
        ),
        h("small", null, "Clear a line to leave it out."),
        h("div", null, button("Delete phrase", deletePhrase, plan.length <= 1)),
      ),
  );
  const wordSection =
    row &&
    h(
      "section",
      { style: { display: "grid", gap: 8 } },
      h("strong", null, "Words"),
      h(
        "div",
        { style: { display: "flex", gap: 6, flexWrap: "wrap" } },
        ...row.layers.flatMap((l, li) =>
          l.text
            .trim()
            .split(/\s+/)
            .filter(Boolean)
            .map((word, wi) =>
              button(
                word,
                () => {
                  setLayerIndex(li);
                  setWordIndex(wi);
                  seek(Math.max(row.start, row.end - 1 / fps));
                },
                false,
                layerIndex === li && wordIndex === wi ? "primary" : "secondary",
              ),
            ),
        ),
      ),
      layer &&
        h(
          "div",
          { style: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end" } },
          select("“" + (layer.text.trim().split(/\s+/)[wordIndex] || "") + "”", layer.wordEdits?.[wordIndex]?.depth || layer.depth || "behind", (v) => editWord({ depth: v }), [
            ["behind", "Behind the speaker"],
            ["front", "In front of the speaker"],
          ]),
          select("Dragging moves", moveUnit, setMoveUnit, [
            ["word", "One word"],
            ["layer", "The whole line"],
          ]),
          button("Reset word", () => editWord({ dx: 0, dy: 0, depth: undefined })),
        ),
    );
  const depthSection = h(
    "section",
    { style: { display: "grid", gap: 8 } },
    toggle("Behind speaker", settings.depth, (v) => updateSettings({ depth: v })),
    select("In front of the text", settings.subject || "foreground", (v) => updateSettings({ subject: v }), [
          ["foreground", "Everything in front (people, hands, mics, desks)"],
          ["person", "People only (desks and props never hide text)"],
        ]),
    h("small", null, "A new speaker setting takes effect on Redo."),
  );
  const styleSection = h(
    "details",
    null,
    h("summary", null, "Fonts & colors"),
    h(
      "div",
      { style: { display: "grid", gap: 8, paddingTop: 8 } },
      field("Headline font", settings.blockFont, (v) => updateSettings({ blockFont: v })),
      field("Serif font", settings.serifFont, (v) => updateSettings({ serifFont: v })),
      field("Script font", settings.scriptFont, (v) => updateSettings({ scriptFont: v })),
      field("Connector font", settings.connectorFont, (v) => updateSettings({ connectorFont: v })),
      field("Red", settings.red, (v) => updateSettings({ red: v }), "color"),
      field("White", settings.white, (v) => updateSettings({ white: v }), "color"),
      select("Background", settings.background, (v) => updateSettings({ background: v }), [
        ["footage", "Keep footage"],
        ["black", "Black behind speaker"],
      ]),
    ),
  );
  const fineTune = h(
    "details",
    null,
    h("summary", null, "Fine-tune"),
    h(
      "div",
      { style: { display: "grid", gap: 14, paddingTop: 10 } },
      plan.length > 0 &&
        h(
          "div",
          { style: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" } },
          button("Save changes", apply, !edited || !!validation || !info || (settings.depth && (!maskFiles || !!hostProblem)), "primary"),
          h("small", null, edited ? "Unsaved changes." : "No unsaved changes."),
        ),
      validation && alert(validation),
      plan.length > 0 && h("div", { style: { display: "grid", gridTemplateColumns: wide ? "minmax(140px,200px) minmax(0,1fr)" : "minmax(0,1fr)", gap: 14 } }, phraseList, previewSection),
      plan.length > 0 && wordSection,
      depthSection,
      styleSection,
    ),
  );
  return h(
    "div",
    { style: { display: "grid", gap: 12, minWidth: 0 } },
    h("header", null, h("h2", { style: { margin: 0 } }, "Depth Type Captions"), h("small", null, info?.name || "Open a draft to begin")),
    h("div", { role: "status", style: { fontSize: 12, color: "var(--panel-muted-fg,#aaa)", overflowWrap: "anywhere" } }, status || (owned ? "" : "Works on drafts with dialogue, up to 90 seconds.")),
    main,
    fineTune,
  );
}

let hostSdk: any = null;
function hostUseSdk(sdk: any) { hostSdk = panelLocalClient(sdk); if (!hostSdk?.files || !hostSdk?.media || !hostSdk?.environment) throw new Error("Update Selects to use this plugin."); }


// video-ai:start
function videoAiClient(sdk, projectId, scope) {
  const key="shared-ai:"+scope;
  if (!sdk.storage?.getItem || !sdk.storage?.setItem) throw new Error("Update Selects to save AI job progress.");
  return createSharedAiJobClient({projectId,scope,
    runScript:async(script,summary,allowCommit=false)=>{
      const response=await sdk.runScript({script,summary,allowCommit});
      if(response?.isError||response?.result===undefined)throw new Error(response?.output||"AI operation returned no result.");
      return response.result;
    },
    load:async()=>JSON.parse(await sdk.storage.getItem(key)||"null"),
    save:journal=>sdk.storage.setItem(key,JSON.stringify(journal))});
}
// video-ai:end

// shared-ai-job-client:start
const sharedAiJobs=(()=>{const module={exports:{}};
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
const {createSharedAiJobClient}=sharedAiJobs;
// shared-ai-job-client:end

// shared-ai-resources:start
const sharedAiResources=(()=>{const module={exports:{}};
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
const {canonicalResourceBindings, resolveSharedAiResources, importSharedAiVideo}=sharedAiResources;
// shared-ai-resources:end

// shared-video-ai-frames:start
const sharedVideoAiFrames=(()=>{const module={exports:{}};
// prepareMatte owns durable URL adoption. Validate the entire sequence first,
// then copy verified URLs in bounded scripts: a long clip must not keep one
// script open beyond the host's deadline. Postprocessing never reads job scratch.
// This helper accepts only newly encoded CFR sources whose source clock starts at zero.
async function prepareSharedAiVideoFrames(sdk,projectId,manifest,folder,expected) {
  const response=await sdk.runScript({summary:"Prepare durable shared AI masks",allowCommit:true,script:`
    const m=await selects.ai.prepareMatte(${JSON.stringify(manifest)},${JSON.stringify(projectId)});
    const expected=${JSON.stringify(expected)};
    if(!m.sourceRange || m.sourceRange.startSeconds!==0 ||
      !Number.isFinite(expected.fps) || expected.fps<=0 ||
      !Number.isSafeInteger(expected.frames) || expected.frames<1 ||
      m.sourceResourceId!==expected.resourceId || m.alphaEncoding!=='grayscale-png-8bit' ||
      m.frameSize.width!==expected.width || m.frameSize.height!==expected.height ||
      !Array.isArray(m.frames) || Math.abs(m.frames.length-expected.frames)>1 || !m.frames.length)
      throw new Error('Shared mask geometry or frame count differs from the source.');
    for(let i=0;i<m.frames.length;i++) {
      const f=m.frames[i];
      if(f.index!==i || !Number.isFinite(f.sourceTimeSeconds) ||
        Math.abs(f.sourceTimeSeconds-i/expected.fps)>1/expected.fps/2+0.0001 ||
        typeof f.url!=='string' || !f.url || /[\\r\\n]/.test(f.url))
        throw new Error('Shared mask clock differs from the encoded source.');
    }
    let prefix=m.frames[0].url;
    for(const f of m.frames) {
      let end=0;
      while(end<prefix.length && prefix[end]===f.url[end])end++;
      prefix=prefix.slice(0,end);
    }
    const suffixes=m.frames.map(f=>f.url.slice(prefix.length));
    const match=/^(\\d+)(\\.[a-z0-9]+)$/i.exec(suffixes[0]);
    const sequence=match && Number.isSafeInteger(Number(match[1])) &&
      suffixes.every((s,i)=>s===String(Number(match[1])+i).padStart(match[1].length,'0')+match[2])
      ? {start:Number(match[1]),width:match[1].length,extension:match[2]} : null;
    // This is lossless compression of every verified URL, never an assumption
    // that host filenames start at zero or use a particular naming convention.
    const result={count:m.frames.length,width:m.frameSize.width,height:m.frameSize.height,
      prefix,sequence,suffixes:sequence?null:suffixes.join('\\n')};
    if(JSON.stringify(result).length>128*1024)
      throw new Error('Shared mask URL metadata exceeds the bounded script result.');
    return result;`});
  if(response?.isError || !Number.isSafeInteger(response?.result?.count)) throw new Error(response?.output||"The shared mask files could not be prepared.");
  const prepared=response.result;
  if(prepared.count<1 || prepared.count>20000 || Math.abs(prepared.count-expected.frames)>1 ||
    prepared.width!==expected.width || prepared.height!==expected.height || typeof prepared.prefix!=="string")
    throw new Error("The shared mask preparation returned incomplete metadata.");
  const sequence=prepared.sequence;
  if(sequence && (!Number.isSafeInteger(sequence.start) || sequence.start<0 ||
    !Number.isSafeInteger(sequence.width) || sequence.width<1 || sequence.width>20 ||
    typeof sequence.extension!=="string" || !/^\.[a-z0-9]+$/i.test(sequence.extension)))
    throw new Error("The shared mask preparation returned invalid URL metadata.");
  const suffixes=sequence?null:typeof prepared.suffixes==="string"?prepared.suffixes.split("\n"):null;
  if(!sequence && suffixes?.length!==prepared.count)
    throw new Error("The shared mask preparation returned incomplete URL metadata.");
  const separator=String(folder).includes("\\")?"\\":"/";
  for(let first=0;first<prepared.count;first+=32) {
    const urls=Array.from({length:Math.min(32,prepared.count-first)},(_,offset)=>{
      const index=first+offset;
      return prepared.prefix+(sequence?String(sequence.start+index).padStart(sequence.width,"0")+sequence.extension:suffixes[index]);
    });
    const copied=await sdk.runScript({summary:"Copy durable shared AI masks",allowCommit:true,script:`
      const urls=${JSON.stringify(urls)}, folder=${JSON.stringify(folder)};
      await selects.files.mkdir(folder,{recursive:true});
      let next=0,failed=false;
      await Promise.all(Array.from({length:Math.min(8,urls.length)},async()=>{
        for(;;) {
          const index=next++;
          if(failed || index>=urls.length)return;
          try {
            const path=await selects.files.pathFromLocalUrl(urls[index]);
            const output=folder+${JSON.stringify(separator)}+'frame_'+String(${first}+index+1).padStart(6,'0')+'.png';
            await selects.files.copy(path,output);
          } catch(error) {failed=true;throw error;}
        }
      }));
      return {count:urls.length};`});
    if(copied?.isError || copied?.result?.count!==urls.length)
      throw new Error(copied?.output||"The shared mask files could not be copied.");
  }
  return {count:prepared.count,width:prepared.width,height:prepared.height,
    pattern:folder.replace(/[\\/]+$/,"")+separator+"frame_%06d.png"};
}

module.exports={prepareSharedAiVideoFrames};

return module.exports;})();
const {prepareSharedAiVideoFrames}=sharedVideoAiFrames;
// shared-video-ai-frames:end

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
  const SCRIPT_BYTES = 256 * 1024;
  const runSource = async (script: string, write = false) => {
    if (new TextEncoder().encode(script).byteLength > SCRIPT_BYTES) throw new Error("The local file script exceeds the 256 KiB limit.");
    const response = await sdk.runScript({
      summary: "Use local media workspace",
      allowCommit: write,
      script,
    });
    if (response.isError) throw new Error(response.output || "Local SDK operation failed.");
    // A clipped report has no result. Every read returning data rejects that case below.
    return response.result;
  };
  // Direct arguments keep object literals contextually typed by the SDK signature.
  const run = (method: string, args: unknown[], write = false) =>
    runSource("return await selects." + method + "(" + JSON.stringify(args).slice(1, -1) + ");", write);
  const environment = await run("files.environment", []);
  if (!environment || typeof environment.platform !== "string" || !environment.homedir)
    throw new Error("Update Selects to use this plugin's local media workspace.");
  const paths = panelLocalPaths(environment.platform);
  const CHUNK_BYTES = 48 * 1024;
  // Three base64 chunks occupy 192 KiB, below the Panel's default 256 KiB result
  // budget. The same script still awaits each canonical file operation in order.
  const fileBatch = async (method: "readRange" | "writeChunk", inputs: unknown[], lengths: number[]) => {
    let count = Math.min(3, inputs.length), script = "";
    while (count > 0) {
      script = "const rows=[];" + inputs.slice(0, count).map((input, index) => {
        const call = "{const result=await selects.files." + method + "(" + JSON.stringify(input) + ");";
        if (method === "writeChunk")
          return call + "if(result?.bytesWritten!==" + lengths[index] + ")throw Error('The file write returned an incomplete result. Check the file before retrying.');rows.push(result);}";
        return call + "if(!result||typeof result.base64!=='string'||!Number.isSafeInteger(result.bytesRead)||result.bytesRead<0||result.bytesRead>" + lengths[index] + ")throw Error('The file read returned an incomplete result.');rows.push(result);if(result.bytesRead<" + lengths[index] + ")return rows;}";
      }).join("") + "return rows;";
      if (new TextEncoder().encode(script).byteLength <= SCRIPT_BYTES) break;
      count--;
    }
    if (!count) throw new Error("The local file script exceeds the 256 KiB limit.");
    return { count, rows: await runSource(script, method === "writeChunk") };
  };
  const readRange = async (path: string, offset: number, length: number) => {
    const parts: Uint8Array[] = [];
    let total = 0;
    while (total < length) {
      const inputs = Array.from({ length: Math.min(3, Math.ceil((length - total) / CHUNK_BYTES)) }, (_, index) =>
        ({ path, offset: offset + total + index * CHUNK_BYTES, length: Math.min(CHUNK_BYTES, length - total - index * CHUNK_BYTES) }));
      const lengths = inputs.map(input => input.length);
      const { rows, count } = await fileBatch("readRange", inputs, lengths);
      if (!Array.isArray(rows) || rows.length < 1 || rows.length > count) throw new Error("The file read returned an incomplete result.");
      let short = false;
      for (let index = 0; index < rows.length; index++) {
        const result = rows[index];
        if (!result || typeof result.base64 !== "string" || !Number.isSafeInteger(result.bytesRead) || result.bytesRead < 0 || result.bytesRead > lengths[index]) throw new Error("The file read returned an incomplete result.");
        const bytes = Uint8Array.from(atob(result.base64), (character) => character.charCodeAt(0));
        if (bytes.length !== result.bytesRead) throw new Error("The file read returned invalid bytes.");
        short = bytes.length < lengths[index];
        if (short && index !== rows.length - 1) throw new Error("The file read returned invalid bytes.");
        parts.push(bytes); total += bytes.length;
      }
      if (rows.length !== count && !short) throw new Error("The file read returned an incomplete result.");
      if (short) break;
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
        let offset = 0;
        do {
          const inputs = [], lengths = [];
          for (let index = 0; index < (replacement ? 3 : 1) && (offset + index * CHUNK_BYTES < bytes.length || index === 0); index++) {
            const position = offset + index * CHUNK_BYTES, chunk = bytes.subarray(position, position + CHUNK_BYTES);
            let binary = "";
            for (const byte of chunk) binary += String.fromCharCode(byte);
            const mode = position === 0 ? (flag === "a" ? "append" : "exclusive") : undefined;
            inputs.push({ path: destination, offset: position, base64: btoa(binary), ...(mode ? { mode } : {}) });
            lengths.push(chunk.length);
          }
          if (!replacement) {
            const result = await run("files.writeChunk", [inputs[0]], true);
            if (result?.bytesWritten !== lengths[0]) throw new Error("The file write returned an incomplete result. Check the file before retrying.");
          } else {
            const { rows, count } = await fileBatch("writeChunk", inputs, lengths);
            if (!Array.isArray(rows) || rows.length !== count || rows.some((row, index) => row?.bytesWritten !== lengths[index])) throw new Error("The file write returned an incomplete result. Check the file before retrying.");
            lengths.length = count;
          }
          offset += lengths.reduce((sum, size) => sum + size, 0);
        } while (offset < bytes.length);
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

export default withPanelLocalClient(DepthTypePanel);
// local-sdk:end
