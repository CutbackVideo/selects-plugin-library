// @name Depth Type Captions
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
    throw new Error("Load dialogue or add a phrase first.");
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
  if(!bounded.length)throw new Error("All captions fall outside this draft. Refresh dialogue timing or load the current draft dialogue.");
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

// Compact persisted mask: 1-bit silhouettes, XOR frame deltas, raw deflate, base64.
// Decoding is pure JS so the timeline renderer and exporter need no platform APIs.
function depthInflateRaw(src){
  let pos=0,bitBuf=0,bitCnt=0,out=new Uint8Array(Math.max(4096,src.length*8)),outLen=0;
  const fail=()=>{throw new Error("Subject mask data is damaged. Refresh video & mask.");};
  const ensure=n=>{if(outLen+n>out.length){const nb=new Uint8Array(Math.max(out.length*2,outLen+n));nb.set(out.subarray(0,outLen));out=nb;}};
  const bits=n=>{while(bitCnt<n){if(pos>=src.length)fail();bitBuf|=src[pos++]<<bitCnt;bitCnt+=8;}const v=bitBuf&((1<<n)-1);bitBuf>>>=n;bitCnt-=n;return v;};
  const build=lengths=>{const count=new Uint16Array(16),offs=new Uint16Array(16),sym=new Uint16Array(lengths.length);for(const l of lengths)count[l]++;count[0]=0;for(let i=1;i<16;i++)offs[i]=offs[i-1]+count[i-1];for(let i=0;i<lengths.length;i++)if(lengths[i])sym[offs[lengths[i]]++]=i;return {count,sym};};
  const decode=t=>{let code=0,first=0,index=0;for(let len=1;len<16;len++){code|=bits(1);const c=t.count[len];if(code-c<first)return t.sym[index+(code-first)];index+=c;first+=c;first<<=1;code<<=1;}fail();};
  const LBASE=[3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258],LEXT=[0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0];
  const DBASE=[1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577],DEXT=[0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13];
  let fixedL=null,fixedD=null;
  for(;;){
    const last=bits(1),type=bits(2);
    if(type===0){
      bitBuf=0;bitCnt=0;if(pos+4>src.length)fail();
      const len=src[pos]|(src[pos+1]<<8);pos+=4;if(pos+len>src.length)fail();
      ensure(len);out.set(src.subarray(pos,pos+len),outLen);outLen+=len;pos+=len;
    }else{
      let lt,dt;
      if(type===1){
        if(!fixedL){const l=new Array(288);for(let i=0;i<288;i++)l[i]=i<144?8:i<256?9:i<280?7:8;fixedL=build(l);fixedD=build(new Array(30).fill(5));}
        lt=fixedL;dt=fixedD;
      }else if(type===2){
        const nlen=bits(5)+257,ndist=bits(5)+1,ncode=bits(4)+4,ORDER=[16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15];
        const cl=new Array(19).fill(0);for(let i=0;i<ncode;i++)cl[ORDER[i]]=bits(3);
        const ct=build(cl),lens=[];
        while(lens.length<nlen+ndist){const s=decode(ct);if(s<16)lens.push(s);else{let rep,val=0;if(s===16){if(!lens.length)fail();val=lens[lens.length-1];rep=3+bits(2);}else if(s===17)rep=3+bits(3);else rep=11+bits(7);while(rep--)lens.push(val);}}
        if(lens.length>nlen+ndist)fail();
        lt=build(lens.slice(0,nlen));dt=build(lens.slice(nlen));
      }else fail();
      for(;;){
        const s=decode(lt);
        if(s<256){ensure(1);out[outLen++]=s;}
        else if(s===256)break;
        else{const li=s-257;if(li>=29)fail();const len=LBASE[li]+bits(LEXT[li]);const di=decode(dt);if(di>=30)fail();const dist=DBASE[di]+bits(DEXT[di]);if(dist>outLen)fail();ensure(len);for(let k=0;k<len;k++){out[outLen]=out[outLen-dist];outLen++;}}
      }
    }
    if(last)break;
  }
  return out.subarray(0,outLen);
}
function depthBase64ToBytes(b64){
  const s=atob(b64),u=new Uint8Array(s.length);for(let i=0;i<s.length;i++)u[i]=s.charCodeAt(i);return u;
}
function depthBytesToBase64(bytes){
  let s="";for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode.apply(null,bytes.subarray(i,i+8192));return btoa(s);
}
// Downsample packed full-resolution 1-bit frames, then XOR each frame with its predecessor.
function depthPackMaskFrames(frames,width,height,scale,step){
  const W=Math.max(1,Math.round(width/scale)),H=Math.max(1,Math.round(height/scale)),size=Math.ceil(W*H/8);
  const kept=[];for(let i=0;i<frames.length;i+=step)kept.push(i);
  const out=new Uint8Array(size*kept.length);let prev=null;
  kept.forEach((fi,n)=>{
    const src=frames[fi],cur=new Uint8Array(size);
    for(let y=0;y<H;y++){const sy=Math.min(height-1,Math.floor((y+.5)*height/H));for(let x=0;x<W;x++){const sx=Math.min(width-1,Math.floor((x+.5)*width/W)),k=sy*width+sx;if(src[k>>3]&(128>>(k&7))){const b=y*W+x;cur[b>>3]|=128>>(b&7);}}}
    for(let k=0;k<size;k++)out[n*size+k]=prev?cur[k]^prev[k]:cur[k];
    prev=cur;
  });
  return {bytes:out,width:W,height:H,indices:kept};
}
// Expand a persisted pack into frames of packed bits; PNG data is produced lazily.
function depthMaskFromData(m){
  if(!m)return null;
  if(typeof m.data!=="string")return m.frames?m:null;
  const size=Math.ceil(m.width*m.height/8),raw=depthInflateRaw(depthBase64ToBytes(m.data));
  if(!Array.isArray(m.times)||!m.times.length||raw.length!==size*m.times.length)throw new Error("Subject mask data does not match its index. Refresh video & mask.");
  const frames=[];let prev=null;
  for(let n=0;n<m.times.length;n++){const cur=new Uint8Array(size);for(let k=0;k<size;k++)cur[k]=prev?raw[n*size+k]^prev[k]:raw[n*size+k];frames.push({t:m.times[n],bits:cur});prev=cur;}
  return {width:m.width,height:m.height,fps:m.fps,canvasWidth:m.canvasWidth,canvasHeight:m.canvasHeight,misses:m.misses||0,frames,packed:true};
}
function depthMaskFramePng(mask,index){
  const f=mask.frames[index];
  if(f.png)return f.png;
  if(!f.bits||typeof document==="undefined")return "";
  const W=mask.width,H=mask.height,canvas=document.createElement("canvas");canvas.width=W;canvas.height=H;
  const ctx=canvas.getContext("2d"),img=ctx.createImageData(W,H),px=img.data;
  for(let k=0,n=W*H;k<n;k++){const v=f.bits[k>>3]&(128>>(k&7))?255:0;px[k*4]=v;px[k*4+1]=v;px[k*4+2]=v;px[k*4+3]=255;}
  ctx.putImageData(img,0,0);
  f.png=canvas.toDataURL("image/png").split(",")[1];
  return f.png;
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
function depthSvg(
  plan,
  settings,
  time,
  width,
  height,
  mask = null,
  showMask = false,
  namespace = "depth-type",
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
  const uid =
      String(namespace).replace(/[^a-zA-Z0-9_-]/g, "") +
      "-" +
      Math.round(time * 1000000),
    growId = uid + "-grow",
    maskId = uid + "-subject";
  const W = 1000,
    H = (1000 * height) / width;
  const modes=depthRevealModes(plan,settings);
  const active = plan
    .flatMap((p) => p.layers.map((l) => ({ ...l, start:modes.get(p.id)==="phrase"&&Number.isFinite(p.start)?p.start:l.start, phraseId: p.id, cues:modes.get(p.id)==="words"?depthLayerWordCues(p,l):null })))
    .filter((l) => time >= l.start && time < l.end)
    .sort((a, b) => a.z - b.z);
  const sample = depthMaskAt(mask, time);
  const maskSrc = sample
    ? sample.png
      ? "data:image/png;base64," + sample.png
      : sample.url ||
        mask.urlTemplate.replace(
          "{frame}",
          String(sample.index).padStart(6, "0"),
        )
    : "";
  let defs = "",
    body = "";
  if (settings.depth && sample) {
    defs =
      '<defs><filter id="' +
      growId +
      '"><feMorphology operator="erode" radius="' +
      Math.max(0, Number(settings.maskGrow) || 0) +
      '"/></filter><mask id="' +
      maskId +
      '" maskUnits="userSpaceOnUse" x="0" y="0" width="' +
      W +
      '" height="' +
      H +
      '" style="mask-type:luminance"><image width="' +
      W +
      '" height="' +
      H +
      '" preserveAspectRatio="none" href="' +
      esc(maskSrc) +
      '" filter="url(#' +
      growId +
      ')"/></mask></defs>';
  }
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
      const front=edit.depth==="front"||l.depth==="front";
      if(settings.depth&&!sample&&!front)return "";
      let wi=0;
      const content=tokens.map(token=>{
        if(!token||/^\s+$/.test(token))return esc(token);
        const index=wi++,visible=(!l.cues||time*1000+1e-6>=l.cues[index].startMs)&&(only===null||index===only);
        return '<tspan data-word="'+index+'" opacity="'+(visible?1:0)+'" style="pointer-events:'+(visible?'auto':'none')+'">'+esc(token)+'</tspan>';
      }).join("");
      return (settings.depth&&sample&&!front?'<g mask="url(#'+maskId+')">':'<g>')+
        '<text xml:space="preserve" data-layer="'+esc(l.id)+'" data-phrase="'+esc(l.phraseId)+
        '" x="'+((l.x+(Number(edit.dx)||0))/100*W)+'" y="'+((l.y+(Number(edit.dy)||0))/100*H+(l.anchor==="ink"?ascent:0))+
        '" dominant-baseline="'+(l.anchor==="ink"?'alphabetic':'hanging')+'" text-anchor="middle" font-family="'+esc(font)+
        '" font-size="'+fontSize+'" font-weight="400" fill="'+esc(color)+'"'+protection+'>'+content+'</text></g>';
    };
    if(edited){for(let wi=0;wi<count;wi++)body+=render(wi,l.wordEdits?.[wi]||{});}
    else body+=render(null);
  }
  const bg =
    settings.background === "black"
      ? '<rect width="100%" height="100%" fill="black"/>'
      : "";
  // In depth mode, no mask means no unsafe unmasked caption rendering.

  return (
    '<svg style="display:block;width:100%;height:100%;max-width:none;max-height:none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 ' +
    W +
    " " +
    H +
    '">' +
    defs +
    "<g" +
    "" +
    ">" +
    bg +
    body +
    "</g></svg>"
  );
}

const DEPTH_MASK_SOURCE="import Foundation\nimport AVFoundation\nimport Vision\nimport CoreImage\nimport ImageIO\nimport UniformTypeIdentifiers\n// Local-only foreground matting; output inverse luminance PNGs keyed by presentation time.\nlet args=CommandLine.arguments\nif args.count<3 { fputs(\"Usage: mask input.mp4 output.json\\n\",stderr); exit(2) }\nlet asset=AVURLAsset(url:URL(fileURLWithPath:args[1]))\nguard let track=asset.tracks(withMediaType:.video).first else {exit(3)}\nif args.count >= 5, let expectedWidth=Double(args[3]), let expectedHeight=Double(args[4]), expectedWidth>0, expectedHeight>0 {\n let actualWidth=Double(abs(track.naturalSize.width)),actualHeight=Double(abs(track.naturalSize.height))\n if actualHeight<=0 || abs(actualWidth/actualHeight-expectedWidth/expectedHeight)>2/max(1,actualHeight) {\n  fputs(\"Preview canvas does not match the draft. Expected \\(Int(expectedWidth)) x \\(Int(expectedHeight)); received \\(Int(actualWidth)) x \\(Int(actualHeight)). No masks were applied.\\n\",stderr);exit(5)\n }\n}\nlet reader=try AVAssetReader(asset:asset)\nlet output=AVAssetReaderTrackOutput(track:track,outputSettings:[kCVPixelBufferPixelFormatTypeKey as String:kCVPixelFormatType_32BGRA]);reader.add(output)\nguard reader.startReading() else{exit(4)}\nlet ctx=CIContext(options:[.cacheIntermediates:false]);var rows:[[String:Any]]=[];var misses=0\nlet width=384;let height=Int((Double(width)*abs(track.naturalSize.height/track.naturalSize.width)).rounded())\nwhile let sample=output.copyNextSampleBuffer(){try autoreleasepool{\n guard let pb=CMSampleBufferGetImageBuffer(sample) else {throw NSError(domain:\"mask\",code:1)}\n let time=CMTimeGetSeconds(CMSampleBufferGetPresentationTimeStamp(sample));let handler=VNImageRequestHandler(cvPixelBuffer:pb,options:[:]);var mask:CIImage?=nil\n if #available(macOS 14.0,*){let req=VNGenerateForegroundInstanceMaskRequest();try handler.perform([req]);if let o=req.results?.first,!o.allInstances.isEmpty{let buffer=try o.generateScaledMaskForImage(forInstances:o.allInstances,from:handler);mask=CIImage(cvPixelBuffer:buffer)}}\n if mask==nil{misses+=1}\n let bounds=CGRect(x:0,y:0,width:width,height:height)\n // Missing subject -> black inverse mask: suppress captions instead of covering a face.\n var inverse=CIImage(color:CIColor(red:0,green:0,blue:0)).cropped(to:bounds)\n if let m=mask {inverse=m.transformed(by:CGAffineTransform(scaleX:CGFloat(width)/m.extent.width,y:CGFloat(height)/m.extent.height)).applyingFilter(\"CIColorInvert\").cropped(to:bounds)}\n guard let cg=ctx.createCGImage(inverse,from:bounds,format:.L8,colorSpace:CGColorSpaceCreateDeviceGray()) else {throw NSError(domain:\"mask\",code:2)}\n let bytes=NSMutableData();guard let dest=CGImageDestinationCreateWithData(bytes,UTType.png.identifier as CFString,1,nil) else{throw NSError(domain:\"mask\",code:3)};CGImageDestinationAddImage(dest,cg,nil);guard CGImageDestinationFinalize(dest) else{throw NSError(domain:\"mask\",code:4)}\n rows.append([\"t\":time,\"png\":(bytes as Data).base64EncodedString()]);if rows.count%30==0{fputs(\"Masked \\(rows.count) frames\\n\",stderr)}\n}}\nif reader.status == .failed {throw reader.error!}\nlet result:[String:Any]=[\"width\":width,\"height\":height,\"fps\":track.nominalFrameRate,\"frames\":rows,\"misses\":misses]\ntry JSONSerialization.data(withJSONObject:result).write(to:URL(fileURLWithPath:args[2]),options:.atomic)\nprint(\"Prepared \\(rows.count) masks; \\(misses) frames without a detected subject.\")\n";
const DEPTH_GRAPHIC="import React, {useEffect,useId,useState} from 'react';\nimport {useCurrentFrame,useVideoConfig,delayRender,continueRender,cancelRender} from 'remotion';\n// Independent phrase-layer model. No Editorial Blur runtime or state dependency.\nconst DEPTH_DEFAULTS = {\n  red: \"#EB0706\",\n  white: \"#FFFDF7\",\n  blockFont: \"Impact\",\n  serifFont: \"Bodoni 72\",\n  scriptFont: \"Snell Roundhand\",\n  connectorFont: \"Didot\",\n  depth: true,\n  maskGrow: 1,\n  maxCoveredLetters: 2,\n  wordBuildShare: 80,\n  background: \"footage\",\n  contrast: \"subtle\",\n  rowSpacing: -1.5,\n};\nconst depthCopy = (v) => JSON.parse(JSON.stringify(v));\nfunction depthValidate(plan) {\n  if (!Array.isArray(plan) || !plan.length)\n    throw new Error(\"Load dialogue or add a phrase first.\");\n  const ids = new Set();\n  for (const p of plan) {\n    if (!p.id || ids.has(p.id))\n      throw new Error(\"Phrase identities must be unique.\");\n    ids.add(p.id);\n    if (\n      !Number.isFinite(p.start) ||\n      !Number.isFinite(p.end) ||\n      p.start < 0 ||\n      p.end <= p.start\n    )\n      throw new Error(\"Each phrase needs a valid start and end time.\");\n    if (!p.layers?.length)\n      throw new Error(\"Each phrase needs at least one layer.\");\n    for (const l of p.layers) {\n      if (!String(l.text || \"\").trim()) throw new Error(\"A layer has no text.\");\n      if (\n        !Number.isFinite(l.start) ||\n        !Number.isFinite(l.end) ||\n        l.start < p.start - 1e-6 ||\n        l.end > p.end + 1e-6 ||\n        l.end <= l.start\n      )\n        throw new Error(\"Layer times must be inside their phrase.\");\n      for (const k of [\"x\", \"y\", \"width\", \"height\", \"z\"])\n        if (!Number.isFinite(l[k])) throw new Error(\"Invalid layer \" + k);\n      if (l.width <= 0 || l.height <= 0)\n        throw new Error(\"Layer width and size must be positive.\");\n    }\n  }\n  return plan;\n}\n// Intersect caption intervals with the current picture; never stretch the footage.\nfunction depthBoundPlan(plan, duration) {\n  if (!Number.isFinite(duration) || duration <= 0) throw new Error(\"This draft has no video to caption.\");\n  let clippedLayers=0,droppedLayers=0,droppedPhrases=0,clippedPhrases=0;\n  const bounded=[];\n  for (const original of plan) {\n    const p=JSON.parse(JSON.stringify(original));\n    p.end=Math.min(p.end,duration);\n    if(p.end<original.end-1e-9)clippedPhrases++;\n    p.layers=p.layers.flatMap(l=>{\n      const end=Math.min(l.end,p.end);\n      if(l.start>=end-1e-9){droppedLayers++;return [];}\n      if(end<l.end-1e-9)clippedLayers++;\n      return [{...l,end}];\n    });\n    if(p.start>=p.end-1e-9 || !p.layers.length){droppedPhrases++;continue;}\n    bounded.push(p);\n  }\n  if(!bounded.length)throw new Error(\"All captions fall outside this draft. Refresh dialogue timing or load the current draft dialogue.\");\n  return {plan:bounded,clippedLayers,droppedLayers,droppedPhrases,clippedPhrases,changed:clippedLayers+droppedLayers+droppedPhrases+clippedPhrases>0};\n}\nfunction depthLayer(id, text, start, end, role, x, y, width, height, z = 0) {\n  return {\n    id,\n    text,\n    start,\n    end,\n    role,\n    x,\n    y,\n    width,\n    height,\n    z,\n    color: \"\",\n    font: \"\",\n  };\n}\n// Shared lexical/timing emphasis: explicit selection always wins. No semantic AI claim.\nfunction depthEmphasisIndex(words){\n  const weak=new Set('a an the this that these those i you he she it we they my your our their is are was were be been being have has had do does did can could would should will shall may might to of in on at for from with and or but so if as than then very really just also everybody everyone somebody something'.split(' '));\n  let best=0,score=-Infinity;\n  words.forEach((w,i)=>{const token=String(w.text).toLowerCase().replace(/[^\\p{L}\\p{N}]/gu,'');\n    const value=(weak.has(token)?-10:0)+Math.min(.8,Math.max(0,(w.e||0)-(w.s||0)))*2+(/[!?]/.test(w.text)?.5:0);\n    if(value>score){score=value;best=i;}\n  });return best;\n}\nfunction depthReadingGroups(tokens,maxChars=32){\n  const groups=[];let group=[];\n  for(const token of tokens){\n    const text=String(token.text),prior=group.at(-1);\n    const chars=group.reduce((n,t)=>n+String(t.text).length+1,0);\n    const boundary=prior&&(/[,:;.!?]$/.test(prior.text)||/^(and|but|because|while|although|which|who|when|if)$/i.test(text));\n    if(group.length&&(boundary||chars+text.length>maxChars)){groups.push(group);group=[];}\n    group.push(token);\n  }if(group.length)groups.push(group);return groups;\n}\nfunction depthCompose(p, preset) {\n  const words = p.words?.length\n    ? p.words\n    : String(p.text || \"\")\n        .trim()\n        .split(/\\s+/)\n        .filter(Boolean)\n        .map((text, i, a) => ({\n          text,\n          s: p.start + ((p.end - p.start) * i) / a.length,\n          e: p.start + ((p.end - p.start) * (i + 1)) / a.length,\n        }));\n  const hero=Number.isInteger(p.emphasisIndex)&&p.emphasisIndex>=0&&p.emphasisIndex<words.length?p.emphasisIndex:depthEmphasisIndex(words);\n  const layers = [],\n    end = p.end,\n    role =\n      preset === \"impact\" ? \"block\" : preset === \"script\" ? \"script\" : \"serif\";\n  if (words.length <= 2) {\n    layers.push(\n      depthLayer(\n        p.id + \"-hero\",\n        words.map((w) => w.text).join(\" \"),\n        p.start,\n        end,\n        role,\n        50,\n        42,\n        94,\n        40,\n        1,\n      ),\n    );\n  } else {\n    const before = words.slice(0, hero),\n      after = words.slice(hero + 1);\n    if (before.length)\n      layers.push(\n        depthLayer(\n          p.id + \"-lead\",\n          before.map((w) => w.text).join(\" \"),\n          p.start,\n          end,\n          preset === \"impact\" ? \"script-white\" : \"connector\",\n          50,\n          14,\n          94,\n          14,\n          0,\n        ),\n      );\n    layers.push(\n      depthLayer(\n        p.id + \"-hero\",\n        words[hero].text,\n        Math.max(p.start, words[hero].s),\n        end,\n        role,\n        50,\n        34,\n        96,\n        34,\n        1,\n      ),\n    );\n    if (after.length)\n      layers.push(\n        depthLayer(\n          p.id + \"-tail\",\n          after.map((w) => w.text).join(\" \"),\n          Math.max(p.start, after[0].s),\n          end,\n          preset === \"script\" ? \"serif\" : \"connector\",\n          50,\n          69,\n          90,\n          15,\n          2,\n        ),\n      );\n  }\n  return { ...p, preset, layers };\n}\nfunction depthPlanWords(words, fps, duration) {\n  const groups = [];\n  let g = [];\n  for (const raw of words) {\n    const w = {\n      text: raw.text.trim(),\n      s: raw.s / fps,\n      e: raw.e / fps,\n      source: raw.source,\n      wordId: raw.wordId,\n      speaker: raw.speaker,\n      resource: raw.resource,\n      utterance: raw.utterance,\n    };\n    if (!w.text) continue;\n    const prev = g.at(-1);\n    if (\n      prev &&\n      (g.length >= 9 ||\n        w.s - prev.e > 0.42 ||\n        prev.speaker !== w.speaker ||\n        prev.resource !== w.resource ||\n        prev.utterance !== w.utterance ||\n        /[.!?]$/.test(prev.text))\n    ) {\n      groups.push(g);\n      g = [];\n    }\n    g.push(w);\n  }\n  if (g.length) groups.push(g);\n  return depthValidate(\n    groups.map((g, i) => {\n      const start = g[0].s,\n        end = Math.min(\n          duration,\n          groups[i + 1]?.[0].s ?? duration,\n          g.at(-1).e + 0.16,\n        );\n      return depthCompose(\n        {\n          id: \"phrase-\" + i,\n          start,\n          end,\n          text: g.map((w) => w.text).join(\" \"),\n          words: g,\n        },\n        \"impact\",\n      );\n    }),\n  );\n}\n// Word cues use Caption-shaped JSON; no font/layout changes during a reveal.\nfunction depthLayerWordCues(phrase, layer) {\n  const tokens=String(layer.text).match(/\\S+/g)||[];\n  const words=phrase.words||[];\n  const norm=t=>String(t).normalize(\"NFKC\").toLowerCase().replace(/[^\\p{L}\\p{N}]/gu,\"\");\n  const candidates=[];\n  for(let i=0;i+tokens.length<=words.length;i++){\n    if(tokens.every((t,j)=>norm(t)===norm(words[i+j].text)) && words.slice(i,i+tokens.length).every(w=>Number.isFinite(w.s)&&Number.isFinite(w.e)))candidates.push(i);\n  }\n  if(!tokens.length||!candidates.length)return null;\n  const offset=candidates.sort((a,b)=>Math.abs(words[a].s-layer.start)-Math.abs(words[b].s-layer.start))[0];\n  return tokens.map((text,j)=>({text,startMs:Math.max(layer.start,words[offset+j].s)*1000,endMs:layer.end*1000,timestampMs:words[offset+j].s*1000,confidence:null}));\n}\nfunction depthRevealModes(plan,settings) {\n  const automatic=plan.filter(p=>!p.revealMode||p.revealMode===\"auto\");\n  const share=Math.max(0,Math.min(100,Number(settings.wordBuildShare??80)));\n  const wholeCount=Math.round(automatic.length*(100-share)/100);\n  // Short statements/reactions get whole-phrase entrances first.\n  const ranked=automatic.map((p,i)=>({p,i,count:String(p.text||p.layers.map(l=>l.text).join(\" \")).trim().split(/\\s+/).length})).sort((a,b)=>a.count-b.count||a.i-b.i);\n  const whole=new Set(ranked.slice(0,wholeCount).map(x=>x.p.id));\n  return new Map(plan.map(p=>[p.id,p.revealMode&&p.revealMode!==\"auto\"?p.revealMode:whole.has(p.id)?\"phrase\":\"words\"]));\n}\n// Measure complete lines once. Reveal opacity never participates in font sizing.\nconst depthTypeCache=new Map();\nfunction depthTypeSpec(l,settings,W,H) {\n  const font=l.font||({block:settings.blockFont,serif:settings.serifFont,\"serif-red\":settings.serifFont,script:settings.scriptFont,\"script-white\":settings.scriptFont,connector:settings.connectorFont}[l.role])||\"serif\";\n  const text=l.role.startsWith(\"script\")?l.text:l.text.toUpperCase();\n  const family=font.split(\",\").map(n=>{n=n.trim().replace(/^[\\\"']|[\\\"']$/g,\"\");return /^(serif|sans-serif|monospace|cursive|fantasy|system-ui)$/.test(n)?n:JSON.stringify(n);}).join(\",\");\n  const key=font+\"\\n\"+text;\n  let m=depthTypeCache.get(key);\n  if(!m){\n    if(typeof document!==\"undefined\"){\n      const ns=\"http://www.w3.org/2000/svg\",svg=document.createElementNS(ns,\"svg\"),node=document.createElementNS(ns,\"text\");\n      svg.setAttribute(\"style\",\"position:fixed;left:-10000px;top:0;width:10000px;height:1000px;visibility:hidden;pointer-events:none\");\n      node.setAttribute(\"font-family\",family);node.setAttribute(\"font-size\",\"100\");node.setAttribute(\"font-weight\",\"400\");node.setAttribute(\"xml:space\",\"preserve\");node.textContent=text;\n      svg.appendChild(node);document.body.appendChild(svg);\n      try{\n        const advance=node.getComputedTextLength()/100;\n        const ctx=document.createElement(\"canvas\").getContext(\"2d\");ctx.font=\"400 100px \"+family;\n        const ink=ctx.measureText(text),cap=ctx.measureText(\"H\");\n        m={advance,cap:(cap.actualBoundingBoxAscent||72)/100,ascent:(ink.actualBoundingBoxAscent||72)/100,descent:(ink.actualBoundingBoxDescent||0)/100};\n      }finally{svg.remove();}\n    }else m={advance:Math.max(1,[...text].length*.65),cap:.72,ascent:.72,descent:0};\n    depthTypeCache.set(key,m);\n  }\n  const fontSize=Math.min(l.height*H/100/m.cap,l.width*W/100/Math.max(.01,m.advance));\n  return {font:family,text,fontSize,advance:m.advance*fontSize,ascent:m.ascent*fontSize,inkHeight:(m.ascent+m.descent)*fontSize};\n}\nfunction depthRowGap(previous,current,settings){\n  const requested=Math.max(-3,Math.min(4,Number(settings.rowSpacing??-1.5)));\n  // Decorative script may interlock. Reading lines below a headline need separation.\n  return previous.role.startsWith('script')?Math.max(requested,-1.5):Math.max(requested,.7);\n}\nfunction depthReferenceComposition(plan,width,height,settings=DEPTH_DEFAULTS){\n  return depthCopy(plan).map(p=>{\n    if(!p.layers.length||p.layers.some(l=>Object.keys(l.wordEdits||{}).length))return p;\n    const hero=p.layers.find(l=>l.id.endsWith('-hero'))||p.layers.reduce((a,b)=>a.height>=b.height?a:b);\n    const hi=p.layers.indexOf(hero),H=1000*height/width;\n    // Headline placement and size limits remain editorial decisions, including overscan.\n    const head={...hero,role:'block',font:settings.blockFont,color:settings.red};\n    const makeRows=(layers,lead)=>{\n      const rows=[];\n      for(const l of layers){\n        const cues=depthLayerWordCues(p,l),tokens=String(l.text).trim().split(/\\s+/).map((text,i)=>({text,cue:cues?.[i]}));\n        // Edited text without reliable cues keeps its original layer timing.\n        for(const [j,g] of depthReadingGroups(tokens,width>height?36:22).entries()){\n          const role=lead?'script-white':'serif';\n          rows.push({...l,id:j===0?l.id:l.id+'-part-'+j,text:g.map(t=>t.text).join(' '),role,font:lead?settings.scriptFont:settings.serifFont,color:settings.white,\n            start:g[0].cue?Math.max(p.start,g[0].cue.startMs/1000):l.start,anchor:'ink',height:lead?17:12,typeBase:undefined});\n        }\n      }return rows;\n    };\n    const before=makeRows(p.layers.slice(0,hi),true),after=makeRows(p.layers.slice(hi+1),false);\n    const ink=l=>depthTypeSpec(l,settings,1000,H).inkHeight/H*100;\n    let y=head.y;\n    for(let i=before.length-1;i>=0;i--){const l=before[i];y-=ink(l)+depthRowGap(l,i===before.length-1?head:before[i+1],settings);l.y=y;}\n    let previous=head;\n    for(const l of after){l.y=previous.y+ink(previous)+depthRowGap(previous,l,settings);previous=l;}\n    return {...p,preset:'impact',layers:[...before,head,...after]};\n  });\n}\nfunction depthRestoreTypography(plan,width,height,settings=DEPTH_DEFAULTS) {\n  return depthCopy(plan).map(p=>{\n    const heroIndex=Math.max(0,p.layers.findIndex(l=>l.id.endsWith(\"-hero\")));\n    const layers=p.layers.map((l,i)=>({...l,x:50,y:0,width:i===heroIndex?98:94,height:i===heroIndex?(p.preset===\"script\"?30:38):17,anchor:\"ink\"}));\n    // Negative spacing deliberately interlocks the edges of neighboring rows.\n    let bottom=0;\n    layers.forEach((l,i)=>{\n      const spec=depthTypeSpec(l,settings,1000,1000*height/width);\n      l.y=bottom+(i?depthRowGap(layers[i-1],l,settings):0);\n      bottom=l.y+spec.inkHeight/(10*height/width);\n    });\n    const offset=(100-bottom)/2;\n    layers.forEach(l=>{\n      l.y+=offset;\n      l.typeBase={x:l.x,y:l.y,width:l.width,height:l.height,canvasWidth:width,canvasHeight:height};\n    });\n    return {...p,layoutMode:\"compact\",layers};\n  });\n}\n\n// Compact persisted mask: 1-bit silhouettes, XOR frame deltas, raw deflate, base64.\n// Decoding is pure JS so the timeline renderer and exporter need no platform APIs.\nfunction depthInflateRaw(src){\n  let pos=0,bitBuf=0,bitCnt=0,out=new Uint8Array(Math.max(4096,src.length*8)),outLen=0;\n  const fail=()=>{throw new Error(\"Subject mask data is damaged. Refresh video & mask.\");};\n  const ensure=n=>{if(outLen+n>out.length){const nb=new Uint8Array(Math.max(out.length*2,outLen+n));nb.set(out.subarray(0,outLen));out=nb;}};\n  const bits=n=>{while(bitCnt<n){if(pos>=src.length)fail();bitBuf|=src[pos++]<<bitCnt;bitCnt+=8;}const v=bitBuf&((1<<n)-1);bitBuf>>>=n;bitCnt-=n;return v;};\n  const build=lengths=>{const count=new Uint16Array(16),offs=new Uint16Array(16),sym=new Uint16Array(lengths.length);for(const l of lengths)count[l]++;count[0]=0;for(let i=1;i<16;i++)offs[i]=offs[i-1]+count[i-1];for(let i=0;i<lengths.length;i++)if(lengths[i])sym[offs[lengths[i]]++]=i;return {count,sym};};\n  const decode=t=>{let code=0,first=0,index=0;for(let len=1;len<16;len++){code|=bits(1);const c=t.count[len];if(code-c<first)return t.sym[index+(code-first)];index+=c;first+=c;first<<=1;code<<=1;}fail();};\n  const LBASE=[3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258],LEXT=[0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0];\n  const DBASE=[1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577],DEXT=[0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13];\n  let fixedL=null,fixedD=null;\n  for(;;){\n    const last=bits(1),type=bits(2);\n    if(type===0){\n      bitBuf=0;bitCnt=0;if(pos+4>src.length)fail();\n      const len=src[pos]|(src[pos+1]<<8);pos+=4;if(pos+len>src.length)fail();\n      ensure(len);out.set(src.subarray(pos,pos+len),outLen);outLen+=len;pos+=len;\n    }else{\n      let lt,dt;\n      if(type===1){\n        if(!fixedL){const l=new Array(288);for(let i=0;i<288;i++)l[i]=i<144?8:i<256?9:i<280?7:8;fixedL=build(l);fixedD=build(new Array(30).fill(5));}\n        lt=fixedL;dt=fixedD;\n      }else if(type===2){\n        const nlen=bits(5)+257,ndist=bits(5)+1,ncode=bits(4)+4,ORDER=[16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15];\n        const cl=new Array(19).fill(0);for(let i=0;i<ncode;i++)cl[ORDER[i]]=bits(3);\n        const ct=build(cl),lens=[];\n        while(lens.length<nlen+ndist){const s=decode(ct);if(s<16)lens.push(s);else{let rep,val=0;if(s===16){if(!lens.length)fail();val=lens[lens.length-1];rep=3+bits(2);}else if(s===17)rep=3+bits(3);else rep=11+bits(7);while(rep--)lens.push(val);}}\n        if(lens.length>nlen+ndist)fail();\n        lt=build(lens.slice(0,nlen));dt=build(lens.slice(nlen));\n      }else fail();\n      for(;;){\n        const s=decode(lt);\n        if(s<256){ensure(1);out[outLen++]=s;}\n        else if(s===256)break;\n        else{const li=s-257;if(li>=29)fail();const len=LBASE[li]+bits(LEXT[li]);const di=decode(dt);if(di>=30)fail();const dist=DBASE[di]+bits(DEXT[di]);if(dist>outLen)fail();ensure(len);for(let k=0;k<len;k++){out[outLen]=out[outLen-dist];outLen++;}}\n      }\n    }\n    if(last)break;\n  }\n  return out.subarray(0,outLen);\n}\nfunction depthBase64ToBytes(b64){\n  const s=atob(b64),u=new Uint8Array(s.length);for(let i=0;i<s.length;i++)u[i]=s.charCodeAt(i);return u;\n}\nfunction depthBytesToBase64(bytes){\n  let s=\"\";for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode.apply(null,bytes.subarray(i,i+8192));return btoa(s);\n}\n// Downsample packed full-resolution 1-bit frames, then XOR each frame with its predecessor.\nfunction depthPackMaskFrames(frames,width,height,scale,step){\n  const W=Math.max(1,Math.round(width/scale)),H=Math.max(1,Math.round(height/scale)),size=Math.ceil(W*H/8);\n  const kept=[];for(let i=0;i<frames.length;i+=step)kept.push(i);\n  const out=new Uint8Array(size*kept.length);let prev=null;\n  kept.forEach((fi,n)=>{\n    const src=frames[fi],cur=new Uint8Array(size);\n    for(let y=0;y<H;y++){const sy=Math.min(height-1,Math.floor((y+.5)*height/H));for(let x=0;x<W;x++){const sx=Math.min(width-1,Math.floor((x+.5)*width/W)),k=sy*width+sx;if(src[k>>3]&(128>>(k&7))){const b=y*W+x;cur[b>>3]|=128>>(b&7);}}}\n    for(let k=0;k<size;k++)out[n*size+k]=prev?cur[k]^prev[k]:cur[k];\n    prev=cur;\n  });\n  return {bytes:out,width:W,height:H,indices:kept};\n}\n// Expand a persisted pack into frames of packed bits; PNG data is produced lazily.\nfunction depthMaskFromData(m){\n  if(!m)return null;\n  if(typeof m.data!==\"string\")return m.frames?m:null;\n  const size=Math.ceil(m.width*m.height/8),raw=depthInflateRaw(depthBase64ToBytes(m.data));\n  if(!Array.isArray(m.times)||!m.times.length||raw.length!==size*m.times.length)throw new Error(\"Subject mask data does not match its index. Refresh video & mask.\");\n  const frames=[];let prev=null;\n  for(let n=0;n<m.times.length;n++){const cur=new Uint8Array(size);for(let k=0;k<size;k++)cur[k]=prev?raw[n*size+k]^prev[k]:raw[n*size+k];frames.push({t:m.times[n],bits:cur});prev=cur;}\n  return {width:m.width,height:m.height,fps:m.fps,canvasWidth:m.canvasWidth,canvasHeight:m.canvasHeight,misses:m.misses||0,frames,packed:true};\n}\nfunction depthMaskFramePng(mask,index){\n  const f=mask.frames[index];\n  if(f.png)return f.png;\n  if(!f.bits||typeof document===\"undefined\")return \"\";\n  const W=mask.width,H=mask.height,canvas=document.createElement(\"canvas\");canvas.width=W;canvas.height=H;\n  const ctx=canvas.getContext(\"2d\"),img=ctx.createImageData(W,H),px=img.data;\n  for(let k=0,n=W*H;k<n;k++){const v=f.bits[k>>3]&(128>>(k&7))?255:0;px[k*4]=v;px[k*4+1]=v;px[k*4+2]=v;px[k*4+3]=255;}\n  ctx.putImageData(img,0,0);\n  f.png=canvas.toDataURL(\"image/png\").split(\",\")[1];\n  return f.png;\n}\nfunction depthMaskAt(mask, time) {\n  if (!mask?.frames?.length) return null;\n  let lo = 0,\n    hi = mask.frames.length - 1;\n  while (lo <= hi) {\n    const mid = (lo + hi) >> 1;\n    if (mask.frames[mid].t <= time + 1e-6) lo = mid + 1;\n    else hi = mid - 1;\n  }\n  return hi >= 0 ? { ...mask.frames[hi], index: hi } : null;\n}\nfunction depthMaskFits(mask, width, height) {\n  if (!mask || ![mask.width, mask.height, width, height].every(v => Number.isFinite(v) && v > 0)) return false;\n  // Allow one mask pixel of rounding, never reshape a portrait mask to landscape.\n  return Math.abs(mask.width / mask.height - width / height) <= 2 / mask.height;\n}\nfunction depthSvg(\n  plan,\n  settings,\n  time,\n  width,\n  height,\n  mask = null,\n  showMask = false,\n  namespace = \"depth-type\",\n) {\n  if (settings.depth && mask && !depthMaskFits(mask, width, height)) {\n    return '<svg style=\"display:block;width:100%;height:100%;max-width:none;max-height:none\" xmlns=\"http://www.w3.org/2000/svg\" width=\"100%\" height=\"100%\"></svg>';\n  }\n  const esc = (s) =>\n    String(s).replace(\n      /[&<>\"']/g,\n      (c) =>\n        ({\n          \"&\": \"&amp;\",\n          \"<\": \"&lt;\",\n          \">\": \"&gt;\",\n          '\"': \"&quot;\",\n          \"'\": \"&#39;\",\n        })[c],\n    );\n  const uid =\n      String(namespace).replace(/[^a-zA-Z0-9_-]/g, \"\") +\n      \"-\" +\n      Math.round(time * 1000000),\n    growId = uid + \"-grow\",\n    maskId = uid + \"-subject\";\n  const W = 1000,\n    H = (1000 * height) / width;\n  const modes=depthRevealModes(plan,settings);\n  const active = plan\n    .flatMap((p) => p.layers.map((l) => ({ ...l, start:modes.get(p.id)===\"phrase\"&&Number.isFinite(p.start)?p.start:l.start, phraseId: p.id, cues:modes.get(p.id)===\"words\"?depthLayerWordCues(p,l):null })))\n    .filter((l) => time >= l.start && time < l.end)\n    .sort((a, b) => a.z - b.z);\n  const sample = depthMaskAt(mask, time);\n  const maskSrc = sample\n    ? sample.png\n      ? \"data:image/png;base64,\" + sample.png\n      : sample.url ||\n        mask.urlTemplate.replace(\n          \"{frame}\",\n          String(sample.index).padStart(6, \"0\"),\n        )\n    : \"\";\n  let defs = \"\",\n    body = \"\";\n  if (settings.depth && sample) {\n    defs =\n      '<defs><filter id=\"' +\n      growId +\n      '\"><feMorphology operator=\"erode\" radius=\"' +\n      Math.max(0, Number(settings.maskGrow) || 0) +\n      '\"/></filter><mask id=\"' +\n      maskId +\n      '\" maskUnits=\"userSpaceOnUse\" x=\"0\" y=\"0\" width=\"' +\n      W +\n      '\" height=\"' +\n      H +\n      '\" style=\"mask-type:luminance\"><image width=\"' +\n      W +\n      '\" height=\"' +\n      H +\n      '\" preserveAspectRatio=\"none\" href=\"' +\n      esc(maskSrc) +\n      '\" filter=\"url(#' +\n      growId +\n      ')\"/></mask></defs>';\n  }\n  if (showMask && sample)\n    return (\n      '<svg style=\"display:block;width:100%;height:100%;max-width:none;max-height:none\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 ' +\n      W +\n      \" \" +\n      H +\n      '\"><image width=\"' +\n      W +\n      '\" height=\"' +\n      H +\n      '\" preserveAspectRatio=\"none\" href=\"' +\n      esc(maskSrc) +\n      '\"/></svg>'\n    );\n  for (const l of active) {\n    const role=l.role,red=[\"block\",\"script\",\"serif-red\"].includes(role);\n    const {font,text,fontSize,ascent}=depthTypeSpec(l,settings,W,H);\n    const color=l.color||(red?settings.red:settings.white);\n    const normalizedColor=String(color).trim().toLowerCase();\n    const rgb=/^#([0-9a-f]{6})$/i.exec(normalizedColor);\n    const channels=rgb?[0,2,4].map(i=>parseInt(rgb[1].slice(i,i+2),16)):[];\n    // Include the reference's warm white (#FFFDF7), but not other pale colors.\n    const isWhite=['white','#fff'].includes(normalizedColor)||(channels.length===3&&Math.min(...channels)>=245);\n    const contrast=settings.contrast||\"subtle\";\n    const edgeWidth=Math.max(.35,Math.min(contrast===\"strong\"?2:1.1,fontSize*(contrast===\"strong\"?.045:.022)));\n    const protection=isWhite&&contrast!==\"off\"?' stroke=\"#151515\" stroke-width=\"'+edgeWidth+'\" stroke-linejoin=\"round\" paint-order=\"stroke fill\"':' stroke=\"none\"';\n    const tokens=text.split(/(\\s+)/);\n    const count=tokens.filter(t=>t&&!/^\\s+$/.test(t)).length;\n    const edited=Object.keys(l.wordEdits||{}).length>0;\n    const render=(only,edit={})=>{\n      const front=edit.depth===\"front\"||l.depth===\"front\";\n      if(settings.depth&&!sample&&!front)return \"\";\n      let wi=0;\n      const content=tokens.map(token=>{\n        if(!token||/^\\s+$/.test(token))return esc(token);\n        const index=wi++,visible=(!l.cues||time*1000+1e-6>=l.cues[index].startMs)&&(only===null||index===only);\n        return '<tspan data-word=\"'+index+'\" opacity=\"'+(visible?1:0)+'\" style=\"pointer-events:'+(visible?'auto':'none')+'\">'+esc(token)+'</tspan>';\n      }).join(\"\");\n      return (settings.depth&&sample&&!front?'<g mask=\"url(#'+maskId+')\">':'<g>')+\n        '<text xml:space=\"preserve\" data-layer=\"'+esc(l.id)+'\" data-phrase=\"'+esc(l.phraseId)+\n        '\" x=\"'+((l.x+(Number(edit.dx)||0))/100*W)+'\" y=\"'+((l.y+(Number(edit.dy)||0))/100*H+(l.anchor===\"ink\"?ascent:0))+\n        '\" dominant-baseline=\"'+(l.anchor===\"ink\"?'alphabetic':'hanging')+'\" text-anchor=\"middle\" font-family=\"'+esc(font)+\n        '\" font-size=\"'+fontSize+'\" font-weight=\"400\" fill=\"'+esc(color)+'\"'+protection+'>'+content+'</text></g>';\n    };\n    if(edited){for(let wi=0;wi<count;wi++)body+=render(wi,l.wordEdits?.[wi]||{});}\n    else body+=render(null);\n  }\n  const bg =\n    settings.background === \"black\"\n      ? '<rect width=\"100%\" height=\"100%\" fill=\"black\"/>'\n      : \"\";\n  // In depth mode, no mask means no unsafe unmasked caption rendering.\n\n  return (\n    '<svg style=\"display:block;width:100%;height:100%;max-width:none;max-height:none\" xmlns=\"http://www.w3.org/2000/svg\" width=\"100%\" height=\"100%\" viewBox=\"0 0 ' +\n    W +\n    \" \" +\n    H +\n    '\">' +\n    defs +\n    \"<g\" +\n    \"\" +\n    \">\" +\n    bg +\n    body +\n    \"</g></svg>\"\n  );\n}\n\nexport default function DepthType({data}){\n const scope=useId(),f=useCurrentFrame(),c=useVideoConfig(),time=f/c.fps;\n const [mask,setMask]=useState(()=>{try{return depthMaskFromData(data.mask);}catch(e){return {error:e};}});\n useEffect(()=>{if(mask?.error)cancelRender(mask.error);},[mask]);\n const [indexHandle]=useState(()=>data.settings.depth&&data.mask?.indexUrl?delayRender('Load mask index'):null);\n useEffect(()=>{if(!data.settings.depth||!data.mask?.indexUrl)return;let live=true;fetch(data.mask.indexUrl).then(r=>{if(!r.ok)throw new Error('Mask index did not load');return r.json()}).then(m=>{if(live){setMask(m);continueRender(indexHandle)}}).catch(cancelRender);return()=>{live=false;continueRender(indexHandle)}},[data.mask?.indexUrl]);\n const live=mask&&!mask.error?mask:null;\n const sample=depthMaskAt(live,time);\n if(sample&&sample.bits&&!sample.png)sample.png=depthMaskFramePng(live,sample.index);\n useEffect(()=>{if(data.settings.depth&&live&&!depthMaskFits(live,c.width,c.height))cancelRender(new Error('Subject mask canvas does not match this graphic. Regenerate depth captions for the current draft canvas.'))},[mask,c.width,c.height,data.settings.depth]);\n useEffect(()=>{if(!data.settings.depth||!sample)return;const handle=delayRender('Load subject mask');const im=new Image();im.onload=()=>continueRender(handle);im.onerror=()=>cancelRender(new Error('Subject mask did not load'));im.src=sample.png?'data:image/png;base64,'+sample.png:sample.url;return()=>{im.onload=null;im.onerror=null;continueRender(handle)}},[sample?.url,sample?.index,data.settings.depth]);\n return React.createElement('div',{style:{position:'absolute',inset:0,overflow:'hidden',lineHeight:0},dangerouslySetInnerHTML:{__html:(function(){const cut=(data.cutaways||[]).find(r=>time>=r.start&&time<r.end);if(cut&&cut.kind==='card')return '';return cut?depthSvg(data.plan,{...data.settings,depth:false},time,c.width,c.height,null,false,scope):depthSvg(data.plan,data.settings,time,c.width,c.height,live,false,scope)})()}});\n}";
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
function depthBase(sequence, owned) {
  const tracks = sequence
    .getTracks()
    .filter((t) => !t.isCaptionTrack())
    .map((t) => {
      const v = t.clone();
      if (owned)
        v.removeClipsByIds(
          new Set(
            v
              .getClips()
              .filter(
                (c) =>
                  t.getId() === owned.trackId && c.getId() === owned.clipId,
              )
              .map((c) => c.getId()),
          ),
        );
      return v;
    })
    .filter((t) => t.getClips().some(c=>!c.isGap()));
  return {
    tracks,
    key: JSON.stringify({
      fps: sequence.getFrameRate(),
      size: sequence.getFrameSize(),
      tracks: tracks.filter(t=>t.isMainTrack()||t.isVideoTrack()).map(t=>{
        const j=t.toJSON();
        return {kind:j.kind,visible:j.visible,solo:j.solo,children:j.children.map(c=>{
          if(c.schema!=="Cutback.Clip.1"&&c.schema!=="Cutback.Gap.1")return c;
          return {schema:c.schema,sourceRange:c.sourceRange,mediaReferences:c.mediaReferences,cut:c.cut,enabled:c.enabled,intrinsicVideoAdjustments:c.intrinsicVideoAdjustments,effects:c.effects,videoIndex:c.metadata?.assignedVideoIndex};
        })};
      }),
    }),
  };
}
function depthDI() {
  const app = window.parent,
    di = app.__DI__,
    libraryId = app.location.pathname.match(/libraries\/([^/]+)/)?.[1];
  if (!di || !libraryId) throw new Error("Open a draft in Selects.");
  return { app, di, libraryId };
}
// Selects rejects an export overlay snapshot without a source revision: the SHA-256 hex of
// the saved sequence plus its ordered resources, which the render task recomputes and checks.
async function depthSourceRevision(app, di, libraryId, sequenceId, resourceIds) {
  const sequence = await di.SequenceRepository.findById(libraryId, sequenceId);
  if (!sequence) throw new Error("The preview draft could not be reloaded.");
  const resources = await Promise.all(resourceIds.map((id) => di.ResourceRepository.findById(libraryId, id)));
  const json = JSON.stringify({ sequence: sequence.toJSON(), resources: resources.map((r) => r?.toJSON() ?? null) });
  const digest = await app.crypto.subtle.digest("SHA-256", new app.TextEncoder().encode(json));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}
async function depthCurrentKey(sid, owned) {
  const { di, libraryId } = depthDI();
  if (typeof di.SequenceRepository?.findById !== "function")
    throw new Error("Sequence service unavailable.");
  const s = await di.SequenceRepository.findById(libraryId, sid);
  if (!s) throw new Error("Draft unavailable.");
  return depthBase(s, owned).key;
}
async function depthPrepareVideo(pid, sid, owned, control, progress, geometry) {
  const { app, di, libraryId } = depthDI();
  for (const [service, member] of [
    ["SequenceRepository", "findById"],
    ["SequenceRepository", "save"],
    ["SequenceRepository", "delete"],
    ["ProjectRepository", "findById"],
    ["ResourceRepository", "findById"],
    ["RemotionOverlay", "getSnapshotForExport"],
    ["WorkflowClient", "start"],
    ["WorkflowClient", "subscribe"],
    ["WorkflowClient", "list"],
    ["WorkflowClient", "cancel"],
    ["FileSystem", "join"],
    ["FileSystem", "pathToLocalURL"],
    ["FileSystem", "getOrCreateTmpDirPath"],
  ])
    if (typeof di[service]?.[member] !== "function")
      throw new Error("Unavailable host capability: " + service + "." + member);
  const project = await di.ProjectRepository.findById(libraryId, pid);
  if (!project?.getEditedSequences().includes(sid))
    throw new Error("The active Draft changed.");
  const source = await di.SequenceRepository.findById(libraryId, sid);
  const base = depthBase(source, owned),
    copyId = app.crypto.randomUUID(),
    name = "Depth Type preview " + copyId,
    copy = source.clone({ id: copyId, name });
  copy.setTracks(base.tracks.filter(t=>!t.isChapterTrack()&&!t.isSubChapterTrack()&&!t.isWordTrack()));
  if (!geometry || ![geometry.width, geometry.height].every(v => Number.isInteger(v) && v > 0)) throw new Error('The draft canvas could not be resolved.');
  if (typeof copy.authorFrameSize !== 'function') throw new Error('Exact preview canvas is unavailable in this Selects version.');
  // Resolve Original/custom canvas intent instead of inheriting the project default.
  copy.authorFrameSize({width:geometry.width,height:geometry.height});
  const end =
    copy.getMainTrack()?.getDuration("resolved") ||
    copy.getDuration("resolved");
  if (end / copy.getFrameRate() > 90)
    throw new Error(
      "Depth preview currently supports drafts up to 90 seconds.",
    );
  if (copy.getDuration("resolved") > end)
    copy.removePlaybackRanges(
      [{ startFrame: end, endFrame: copy.getDuration("resolved") }],
      copy.getTracks().filter(t=>!t.isMainTrack()).map(t=>t.getId()),
    );
  const path = di.FileSystem.join(
    di.FileSystem.getOrCreateTmpDirPath(),
    "depth-type-" + copyId + ".mp4",
  );
  let saved = false;
  try {
    if (control.canceled) throw new Error("Canceled.");
    await di.SequenceRepository.save(copy, "depth-type-preview");
    saved = true;
    progress("Rendering current draft for preview…");
    // The host snapshot carries clip transforms/effects into the export compositor.
    // Omitting it renders untransformed footage even when the native timeline is cropped.
    const overlaySnapshot = await di.RemotionOverlay.getSnapshotForExport(copyId, copy, project);
    const resourceIds = [...project.getResources()];
    const sourceRevision = await depthSourceRevision(app, di, libraryId, copyId, resourceIds);
    const job = await di.WorkflowClient.start({
      type: "export:video",
      input: {
        resolution: "SD",
        title: "Depth Type preview",
        outputPath: path,
        projectId: pid,
        libraryId,
        sequenceId: copyId,
        resourceIds,
        audioOnly: false,
        overwriteOutput: false,
        overlaySnapshot,
        sourceRevision,
      },
    });
    control.workflowId = job.workflowId;
    await new Promise((resolve, reject) => {
      let done = false,
        off = () => {};
      const read = (v) => {
        if (done || !v) return;
        if (["succeeded", "failed", "canceled"].includes(v.status)) {
          done = true;
          off();
          v.status === "succeeded"
            ? resolve()
            : reject(new Error(v.lastError?.message || v.status));
        } else
          progress("Preparing video · " + (v.progressDescription || v.status));
      };
      off = di.WorkflowClient.subscribe((e) => {
        if (e.type === "UPSERT" && e.workflow.workflowId === job.workflowId)
          read(e.workflow);
      });
      read(
        di.WorkflowClient.list().find((x) => x.workflowId === job.workflowId),
      );
      if (done) off();
      if (control.canceled)
        di.WorkflowClient.cancel(job.workflowId).catch(reject);
    });
    return {
      path,
      url: di.FileSystem.pathToLocalURL(path),
      sourceKey: base.key,
      duration: end / copy.getFrameRate(),
      fps: copy.getFrameRate(),
      width: geometry.width,
      height: geometry.height,
    };
  } finally {
    control.workflowId = null;
    if (saved) {
      const temp = await di.SequenceRepository.findById(libraryId, copyId);
      if (temp?.getName() === name)
        await di.SequenceRepository.delete(libraryId, copyId);
    }
  }
}
async function depthPrepareMask(sdk, preview, progress, control) {
  const { di } = depthDI(),
    fs = di.FileSystem;
  for (const name of ["readFile", "writeFile", "join", "getOrCreateTmpDirPath"])
    if (typeof fs?.[name] !== "function")
      throw new Error("File service unavailable: " + name);
  const root = fs.getOrCreateTmpDirPath(),
    swift = fs.join(root, "depth-type-mask-v1.swift"),
    bin = fs.join(root, "depth-type-mask-v1"),
    output = preview.path + ".mask.json";
  await fs.writeFile(swift, DEPTH_MASK_SOURCE);
  progress("Preparing foreground masks locally…");
  const q = (v) => "'" + String(v).replace(/'/g, "'\\''") + "'";
  const r = await sdk.runShell({
    summary: "Prepare subject masks",
    cwd: root,
    timeoutMs: 290000,
    maxOutputBytes: 3000,
    command:
      "set -e\nswiftc -O " +
      q(swift) +
      " -o " +
      q(bin) +
      " 2> " +
      q(swift + ".log") +
      "\n" +
      q(bin) +
      " " +
      q(preview.path) +
      " " +
      q(output) + ' ' + Number(preview.width) + ' ' + Number(preview.height),
  });
  if (r.isError || r.exitCode !== 0)
    throw new Error(r.stderr || r.output || "Mask preparation failed.");
  if (control.canceled)
    throw new Error("Canceled; prepared files were not applied.");
  const raw = await fs.readFile(output, "utf8"),
    mask = JSON.parse(String(raw));
  if (!mask.frames?.length) throw new Error("No mask frames were produced.");
  if (!depthMaskFits(mask, preview.width, preview.height)) throw new Error('The preview canvas does not match the draft. Subject masks were not applied.');
  if (String(raw).length > 16000000)
    throw new Error("Mask data exceeds 16 MB. Use a shorter draft.");
  if (mask.frames.some((f) => typeof f.png !== "string" || !f.png))
    throw new Error("Mask frames are missing image data. Refresh video & mask.");
  mask.sourceKey = preview.sourceKey;
  mask.path = output;
  mask.canvasWidth = preview.width;
  mask.canvasHeight = preview.height;
  // Editor frames stay in memory as PNGs. The saved graphic receives a compact
  // self-contained pack instead: host preview URLs die with the app process and
  // run_script accepts at most 256 KB, so full PNG data cannot be persisted.
  mask.packs = await depthBuildMaskPacks(mask, progress, control);
  return mask;
}
// Candidate persisted masks from best to smallest; Apply picks the largest that fits.
const DEPTH_PACK_LEVELS = [
  { scale: 1, step: 1 },
  { scale: 1.5, step: 1 },
  { scale: 2, step: 1 },
  { scale: 2, step: 2 },
  { scale: 3, step: 2 },
];
async function depthMaskBitFrames(mask, progress, control) {
  const canvas = document.createElement("canvas");
  canvas.width = mask.width;
  canvas.height = mask.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true }),
    n = mask.width * mask.height,
    frames = [];
  for (let i = 0; i < mask.frames.length; i++) {
    if (control?.canceled) throw new Error("Canceled.");
    const im = new Image();
    await new Promise((resolve, reject) => {
      im.onload = resolve;
      im.onerror = () => reject(new Error("A mask frame could not be read. Refresh video & mask."));
      im.src = "data:image/png;base64," + mask.frames[i].png;
    });
    ctx.drawImage(im, 0, 0, mask.width, mask.height);
    const px = ctx.getImageData(0, 0, mask.width, mask.height).data,
      packed = new Uint8Array(Math.ceil(n / 8));
    for (let k = 0; k < n; k++) if (px[k * 4] >= 128) packed[k >> 3] |= 128 >> (k & 7);
    frames.push(packed);
    if (i % 25 === 0) progress("Packing subject masks… " + i + "/" + mask.frames.length);
  }
  return frames;
}
async function depthDeflateRaw(bytes) {
  // Host globals are reached through window so the panel checker sees no free identifiers.
  const g = window;
  if (typeof g.CompressionStream !== "function" || typeof g.Response !== "function")
    throw new Error("This app build cannot compress mask data (CompressionStream unavailable).");
  const stream = new g.Blob([bytes]).stream().pipeThrough(new g.CompressionStream("deflate-raw"));
  return new Uint8Array(await new g.Response(stream).arrayBuffer());
}
async function depthBuildMaskPacks(mask, progress, control) {
  const bitFrames = await depthMaskBitFrames(mask, progress, control);
  const packs = [];
  for (const level of DEPTH_PACK_LEVELS) {
    if (control?.canceled) throw new Error("Canceled.");
    const packed = depthPackMaskFrames(bitFrames, mask.width, mask.height, level.scale, level.step);
    const data = depthBytesToBase64(await depthDeflateRaw(packed.bytes));
    packs.push({
      width: packed.width,
      height: packed.height,
      fps: mask.fps / level.step,
      canvasWidth: mask.canvasWidth,
      canvasHeight: mask.canvasHeight,
      misses: Number(mask.misses) || 0,
      times: packed.indices.map((i) => Math.round(mask.frames[i].t * 10000) / 10000),
      data,
    });
    progress("Packed mask " + packed.width + "×" + packed.height + " (" + Math.round(data.length / 1024) + " KB)");
  }
  return packs;
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
// Only what the renderer reads: word timing without source identities.
function depthGraphicPlan(plan) {
  return plan.map((p) => ({
    ...p,
    words: Array.isArray(p.words) ? p.words.map((w) => ({ text: w.text, s: w.s, e: w.e })) : p.words,
  }));
}
function depthApplyScript(pid, sid, plan, settings, mask, owned, cutaways = []) {
  depthValidate(plan);
  const graphicPlan = depthGraphicPlan(plan);
  if (!settings.depth) return { script: depthApplyScriptSource(pid, sid, { plan: graphicPlan, settings, mask: null, panelId: DEPTH_TAG, cutaways }, owned), pack: null };
  if (!mask?.packs?.length) throw new Error("Prepare the subject mask first, or switch off Behind speaker.");
  let smallest = Infinity;
  for (const pack of mask.packs) {
    const script = depthApplyScriptSource(pid, sid, { plan: graphicPlan, settings, mask: pack, panelId: DEPTH_TAG, cutaways }, owned);
    const bytes = depthScriptBytes(script);
    if (bytes <= DEPTH_SCRIPT_LIMIT - DEPTH_SCRIPT_MARGIN) return { script, pack: { width: pack.width, height: pack.height, frames: pack.times.length, bytes } };
    smallest = Math.min(smallest, bytes);
  }
  throw new Error("Captions and subject mask need " + Math.ceil(smallest / 1024) + " KB but Selects accepts at most 256 KB per save. Use a shorter draft or switch off Behind speaker.");
}
function depthApplyScriptSource(pid, sid, payload, owned) {
  return depthOwner(pid,sid)+`
const oldRef=${JSON.stringify(owned)};
const all=await d.clips({trackScope:"all"});
const old=oldRef?all.find(c=>c.clipId===oldRef.clipId&&c.trackId===oldRef.trackId):null;
const recovered=!!oldRef&&!old;
if(recovered&&all.some(c=>c.trackKind==="video"&&c.resourceId==null))throw new Error("The previous caption link is missing, but this draft contains another graphic. Review that graphic and use Detach saved link to add captions separately.");
if(old&&(old.startFrame!==oldRef.startFrame||old.endFrame!==oldRef.endFrame))throw new Error("The caption clip was moved or trimmed. Detach its saved link before adding a new one.");
const m=await d.meta();
const main=(await d.clips({trackScope:"main"})).reduce((n,c)=>Math.max(n,c.endFrame),0);
const payload=${JSON.stringify(payload)};
const bounded=(${depthBoundPlan.toString()})(payload.plan,main/m.fps);
payload.plan=bounded.plan;
const end=Math.min(main,Math.ceil(Math.max(...payload.plan.map(p=>p.end))*m.fps-1e-6));
if(old)await d.removeClips([old]);
const clip=await d.addMotionGraphic({label:"Depth Type Captions",tsxCode:${JSON.stringify(DEPTH_GRAPHIC)},parameters:payload,within:await d.rangeAtFrames(0,end)});
const placed=(await d.clips({trackScope:"all"})).find(c=>c.clipId===clip.clipId);
if(!placed||placed.startFrame!==0||placed.endFrame!==end)throw new Error("Could not verify caption placement on the current draft.");
const result=await d.commitAll("Apply Depth Type Captions");
return {recovered,duration:main/m.fps,trimmed:bounded.changed,clippedLayers:bounded.clippedLayers,droppedLayers:bounded.droppedLayers,droppedPhrases:bounded.droppedPhrases,owned:{clipId:placed.clipId,trackId:placed.trackId,startFrame:placed.startFrame,endFrame:placed.endFrame},commitId:result.commitId};`;
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
  if(!frames.length)throw new Error('No mask frames cover this phrase. Refresh video & mask.');
  const canvas=document.createElement('canvas');canvas.width=mask.width;canvas.height=mask.height;
  const ctx=canvas.getContext('2d',{willReadFrequently:true}),size=mask.width*mask.height;
  const loaded=[];
  for(let i=0;i<frames.length;i++){
    const f=frames[i],im=new Image();im.crossOrigin='anonymous';
    await new Promise((resolve,reject)=>{im.onload=resolve;im.onerror=()=>reject(new Error('Mask frame could not load. Refresh video & mask.'));im.src=f.png?'data:image/png;base64,'+f.png:f.url;});
    ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(im,0,0,canvas.width,canvas.height);
    const bytes=ctx.getImageData(0,0,canvas.width,canvas.height).data,values=new Float32Array(size);
    let available=0;for(let k=0;k<size;k++){available+=bytes[k*4];values[k]=1-bytes[k*4]/255;}
    if(!available)throw new Error('Subject detection is missing during this phrase; refresh the mask or place words manually.');
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

// ─── Vintage B-roll ─────────────────────────────────────────────────────────
// One shared Remotion "vintage treatment" (stepped clock, soften → posterize →
// duotone, halftone, grain, gate weave, flicker, scratches, vignette) plus a
// stage for entrances, exits and pans on the same clock. It drives archival
// footage (strip / framed / full) and quiet typographic cards.
const VINTAGE_CORE = `import React from 'react';
import {useCurrentFrame,useVideoConfig} from 'remotion';
const vHash=(n,s)=>{const x=Math.sin(n*12.9898+s*78.233)*43758.5453;return x-Math.floor(x);};
const vNum=(v,d)=>{const n=Number(v);return Number.isFinite(n)?n:d;};
const vHex=(h)=>{const m=String(h||'').trim().replace('#','');const s=m.length===3?m.split('').map(c=>c+c).join(''):m;const n=parseInt(s,16);return s.length===6&&Number.isFinite(n)?[(n>>16&255)/255,(n>>8&255)/255,(n&255)/255]:null;};
const V_TONES={'sepia':['#3B2412','#B39A73','#F1E3C2'],'paper-ink':['#1A1410','#9A8F80','#FFFDF7'],'riso':['#1A1410','#EB0706','#FFFDF7'],'red-paper':['#8A0503','#FFFDF7'],'mono':['#000000','#FFFFFF'],'custom':['#1A1410','#FFFDF7'],'color':null};
function vSettings(data,fps){const d=data||{};const baked=!!d.baked;const stepFps=Math.max(1,Math.min(60,vNum(d.stepFps,12)));const step=Math.max(1,Math.round(fps/stepFps));const levels=Math.max(2,Math.min(12,Math.round(vNum(d.levels,7))));const tone=V_TONES[d.tone]===undefined?'sepia':d.tone;let stops=V_TONES[tone];if(tone==='custom'&&vHex(d.ink)&&vHex(d.paper))stops=[d.ink,d.paper];return {baked,step,levels,tone,stops,contrast:vNum(d.contrast,0),soften:vNum(d.soften,1.1),grain:baked?vNum(d.grain,0):vNum(d.grain,0.22),halftone:baked?vNum(d.halftone,0):vNum(d.halftone,0.06),dot:vNum(d.dotSize,6),weave:vNum(d.weave,0.3),flicker:vNum(d.flicker,0.2),vignette:baked?vNum(d.vignette,0.15):vNum(d.vignette,0.35),zoom:vNum(d.zoom,0.06),panX:Math.max(-1,Math.min(1,vNum(d.panX,0))),panY:Math.max(-1,Math.min(1,vNum(d.panY,0))),scratches:baked?vNum(d.scratches,0):vNum(d.scratches,0.06),duration:Math.max(0,Math.round(vNum(d.durationFrames,0))),enter:String(d.enter||'cut'),exit:String(d.exit||'cut'),uid:String(d.uid||'v').replace(/[^a-zA-Z0-9_-]/g,'')};}
function vMix(a,b,t){const A=vHex(a),B=vHex(b);if(!A||!B)return a;const c=A.map((v,i)=>Math.round((v+(B[i]-v)*t)*255));return '#'+c.map(v=>v.toString(16).padStart(2,'0')).join('');}
function vTable(stops,ch){const cols=stops.map(vHex).filter(Boolean);if(cols.length<2)return '0 1';return cols.map(c=>c[ch].toFixed(4)).join(' ');}
function vPalette(s,d){const stops=s.stops||[vHex(d.ink)?d.ink:'#1A1410',vHex(d.paper)?d.paper:'#FFFDF7'];const ink=stops[0],paper=stops[stops.length-1];const accent=stops.length>2?stops[1]:(s.stops?vMix(ink,paper,0.45):(vHex(d.accent)?d.accent:'#EB0706'));return {ink,paper,accent};}
function vFont(d,quiet){const fallback=quiet?'"Bodoni 72", "Didot", Georgia, serif':'Impact, "Arial Black", sans-serif';return typeof d.fontFamily==='string'&&d.fontFamily.trim()?'"'+d.fontFamily.trim()+'", '+fallback:fallback;}
// Slow push + directional pan over the clip, on the stepped clock.
function vPanZoom(s,f,fps){const p=s.duration>0?Math.min(1,f/Math.max(1,s.duration)):Math.min(1,f/Math.max(1,fps*6));const sc=1+s.zoom*(0.6+0.4*p);const margin=(s.zoom*0.5)*100;return {sc,tx:s.panX*margin*(1-2*p),ty:s.panY*margin*(1-2*p),p};}
// Entrance / exit on the stepped clock. k = tick index, kk = ticks left. The
// burn is a paper veil, never a brightness multiply, so it can't blow out.
function vStage(s,f,k,fps){
 const ticksTotal=s.duration>0?Math.ceil(s.duration/s.step):0;const kk=ticksTotal>0?ticksTotal-1-k:99;
 const pz=vPanZoom(s,f,fps);let tx=pz.tx,ty=pz.ty,bright=1,clip='none',sc=pz.sc,bg='transparent',veil=0;
 if(s.enter==='slip'&&k<3){ty+=[62,28,8][k];bg='#0A0806';}
 if(s.enter==='flash'&&k<2)bright=[1.45,1.15][k];
 if(s.enter==='shutter'&&k<3)clip='inset(0 '+[70,38,12][k]+'% 0 0)';
 if(s.exit==='burn'&&kk<3)veil=[0.92,0.62,0.28][kk];
 if(s.exit==='slip'&&kk<2){ty-=[62,26][kk];bg='#0A0806';}
 if(s.exit==='shutter'&&kk<3)clip='inset(0 0 0 '+[70,38,12][kk]+'%)';
 return {tx,ty,bright,clip,sc,bg,veil,kk,k,ticksTotal};
}
function VintageShell({data,children,overlay,background,preserveColor,stage}){
 const frame=useCurrentFrame();const {fps,width:W,height:H}=useVideoConfig();
 const s=vSettings(data,fps);preserveColor=preserveColor||s.baked;const f=Math.floor(frame/s.step)*s.step;const k=f/s.step;
 const id='vt-'+s.uid;const pal=vPalette(s,data||{});
 const st=stage===false?{tx:0,ty:0,bright:1,clip:'none',sc:1,bg:'transparent',veil:0}:vStage(s,f,k,fps);
 const dx=(vHash(k,1)-0.5)*s.weave*W*0.006,dy=(vHash(k,2)-0.5)*s.weave*H*0.006,rot=(vHash(k,5)-0.5)*s.weave*0.35;
 const bright=(1-s.flicker*0.14*vHash(k,9))*st.bright;
 const c=1+s.contrast,inter=(1-c)/2;
 const disc=Array.from({length:s.levels},(_,i)=>(0.04+0.92*i/(s.levels-1)).toFixed(4)).join(' ');
 const scratch=vHash(k,7)<s.scratches;const sx=vHash(k,3)*W;const dust=vHash(k,11)<s.scratches*1.5;
 const dotSize=Math.max(2,s.dot*W/1920);const soften=preserveColor?0:s.soften*W/1080;
 return <div style={{position:'absolute',inset:0,overflow:'hidden',background:st.bg!=='transparent'?st.bg:(background||'transparent')}}>
  <svg width="0" height="0" style={{position:'absolute'}}><defs>
   <filter id={id+'-p'} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
    {soften>0?<feGaussianBlur stdDeviation={soften.toFixed(2)}/>:null}
    <feComponentTransfer><feFuncR type="linear" slope={c} intercept={inter}/><feFuncG type="linear" slope={c} intercept={inter}/><feFuncB type="linear" slope={c} intercept={inter}/></feComponentTransfer>
    {s.stops&&!preserveColor?<feColorMatrix type="saturate" values="0"/>:null}
    <feComponentTransfer><feFuncR type="discrete" tableValues={disc}/><feFuncG type="discrete" tableValues={disc}/><feFuncB type="discrete" tableValues={disc}/></feComponentTransfer>
    {s.stops&&!preserveColor?<feComponentTransfer><feFuncR type="table" tableValues={vTable(s.stops,0)}/><feFuncG type="table" tableValues={vTable(s.stops,1)}/><feFuncB type="table" tableValues={vTable(s.stops,2)}/></feComponentTransfer>:null}
   </filter>
   <filter id={id+'-g'} x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={k%1000} stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>
   <pattern id={id+'-h'} patternUnits="userSpaceOnUse" width={dotSize} height={dotSize} patternTransform="rotate(15)"><circle cx={dotSize/2} cy={dotSize/2} r={dotSize*0.22} fill="#000"/></pattern>
  </defs></svg>
  <div style={{position:'absolute',inset:0,clipPath:st.clip,filter:(preserveColor?'':'url(#'+id+'-p) ')+'brightness('+bright.toFixed(3)+')',transform:'translate('+(dx+st.tx*W/100).toFixed(2)+'px,'+(dy+st.ty*H/100).toFixed(2)+'px) rotate('+rot.toFixed(3)+'deg) scale('+st.sc.toFixed(4)+')',transformOrigin:'50% 50%'}}>{children}</div>
  {overlay?<div style={{position:'absolute',inset:0,clipPath:st.clip,transform:'translate('+(dx+st.tx*W/100).toFixed(2)+'px,'+(dy+st.ty*H/100).toFixed(2)+'px) rotate('+rot.toFixed(3)+'deg)',transformOrigin:'50% 50%'}}>{overlay}</div>:null}
  {st.veil>0?<div style={{position:'absolute',inset:0,background:pal.paper,opacity:st.veil}}/>:null}
  {s.halftone>0?<svg style={{position:'absolute',inset:0,mixBlendMode:'multiply',opacity:s.halftone}} width={W} height={H}><rect width={W} height={H} fill={'url(#'+id+'-h)'}/></svg>:null}
  {s.grain>0?<svg style={{position:'absolute',inset:0,mixBlendMode:'overlay',opacity:s.grain}} width={W} height={H}><rect width={W} height={H} filter={'url(#'+id+'-g)'}/></svg>:null}
  {(scratch||dust)?<svg style={{position:'absolute',inset:0,opacity:0.55}} width={W} height={H}>{scratch?<line x1={sx} y1={0} x2={sx+(vHash(k,4)-0.5)*8} y2={H} stroke={vHash(k,6)>0.5?'#fff':'#000'} strokeWidth={1+vHash(k,8)*1.5}/>:null}{dust?[0,1,2].map(i=><circle key={i} cx={vHash(k+i*17,12)*W} cy={vHash(k+i*31,13)*H} r={1+vHash(k+i,14)*2.5} fill="#000"/>):null}</svg>:null}
  {s.vignette>0?<div style={{position:'absolute',inset:0,background:'radial-gradient(ellipse at center, rgba(0,0,0,0) 50%, rgba(0,0,0,'+(s.vignette*0.85).toFixed(3)+') 100%)'}}/>:null}
 </div>;
}
function vLines(text,upper,maxLen){let t=String(text||'').trim();if(upper)t=t.toUpperCase();else if(t)t=t[0].toUpperCase()+t.slice(1);const words=t.split(/\\s+/).filter(Boolean);const lines=[];let cur='';for(const w of words){if(cur&&(cur+' '+w).length>maxLen){lines.push(cur);cur=w;}else cur=cur?cur+' '+w:w;}if(cur)lines.push(cur);return lines.slice(0,5);}
function VRule({W,H,ink,progress}){const m=Math.min(W,H)*0.05,g=Math.min(W,H)*0.012,sw=Math.max(1.5,Math.min(W,H)*0.003);const per=2*(W-2*m)+2*(H-2*m);const dash=per*Math.max(0,Math.min(1,progress===undefined?1:progress));return <svg style={{position:'absolute',inset:0}} width={W} height={H}><rect x={m} y={m} width={W-2*m} height={H-2*m} fill="none" stroke={ink} strokeWidth={sw*1.6} strokeDasharray={per} strokeDashoffset={per-dash}/><rect x={m+g} y={m+g} width={W-2*(m+g)} height={H-2*(m+g)} fill="none" stroke={ink} strokeWidth={sw*0.7} strokeDasharray={per} strokeDashoffset={per-dash}/></svg>;}
function VCredit({text,fam,ink,W,H,y}){if(!text)return null;return <div style={{position:'absolute',left:0,right:0,top:y,textAlign:'center',fontFamily:fam,fontSize:Math.min(W,H)*0.026,letterSpacing:'0.22em',color:ink,opacity:0.75,whiteSpace:'nowrap'}}>{String(text).toUpperCase()}</div>;}
// Footage inside a window: the padded clip is the whole canvas, the window
// clips it, and pan/zoom apply to the footage only.
function VWindow({Source,s,f,fps,x,y,w,h,W,H}){const pz=vPanZoom(s,f,fps);return <div style={{position:'absolute',left:x,top:y,width:w,height:h,overflow:'hidden'}}><div style={{position:'absolute',left:-x,top:-y,width:W,height:H,transform:'translate('+(pz.tx*w/100).toFixed(2)+'px,'+(pz.ty*h/100).toFixed(2)+'px) scale('+pz.sc.toFixed(4)+')',transformOrigin:(x+w/2)+'px '+(y+h/2)+'px'}}>{Source?<Source/>:null}</div></div>;}
`;
const VINTAGE_CARD = VINTAGE_CORE + `
function VMotif({kind,W,H,ink,k,progress}){
 if(kind==='frame')return <VRule W={W} H={H} ink={ink} progress={progress}/>;
 if(kind==='sunburst'){const n=18;const cx=W/2,cy=H*0.55,R=Math.max(W,H)*1.2;const rot=(k*1.5)%360;const polys=[];for(let i=0;i<n;i++){const a0=(i*2*Math.PI)/n,a1=a0+Math.PI/n;polys.push(<polygon key={i} points={cx+','+cy+' '+(cx+R*Math.cos(a0))+','+(cy+R*Math.sin(a0))+' '+(cx+R*Math.cos(a1))+','+(cy+R*Math.sin(a1))} fill={ink} opacity="0.9"/>);}return <svg style={{position:'absolute',inset:0}} width={W} height={H}><g transform={'rotate('+rot+' '+cx+' '+cy+')'}>{polys}</g></svg>;}
 if(kind==='disc'){const r=Math.min(W,H)*0.36;const pulse=1+0.02*Math.sin(k*0.6);return <svg style={{position:'absolute',inset:0}} width={W} height={H}><circle cx={W/2} cy={H*0.5} r={r*pulse} fill={ink} opacity="0.92"/></svg>;}
 if(kind==='stripes'){const n=9;const bands=[];const w=W*2/n;const off=(k*3)%(w*2);for(let i=-2;i<n+2;i++){bands.push(<rect key={i} x={i*w*2-off} y={-H} width={w} height={H*3} fill={ink} opacity="0.9" transform={'rotate(-18 '+W/2+' '+H/2+')'}/>);}return <svg style={{position:'absolute',inset:0}} width={W} height={H}>{bands}</svg>;}
 return null;
}
export default function VintageCard({data}){
 const d=data||{};const frame=useCurrentFrame();const {fps,width:W,height:H}=useVideoConfig();
 const s=vSettings(d,fps);const f=Math.floor(frame/s.step)*s.step;const k=f/s.step;
 const {ink,paper,accent}=vPalette(s,d);
 const motif=d.motif===undefined?'frame':d.motif;const quiet=motif==='frame'||motif==='none';
 const fam=vFont(d,quiet);
 const upper=d.textCase==='upper'||((d.textCase===undefined||d.textCase==='auto')&&!quiet);
 const lines=vLines(d.text,upper,upper?(String(d.text||'').split(/\\s+/).length>6?14:10):16);const maxLen=lines.reduce((n,l)=>Math.max(n,l.length),1);
 const sub=d.subtext?vLines(d.subtext,false,26):[];
 const size=quiet?Math.min(H*(sub.length?0.1:0.12),(W*0.86)/(maxLen*0.48)):Math.min(H*0.2,(W*0.88)/(maxLen*0.62));
 const subSize=Math.min(size*0.42,(W*0.8)/(sub.reduce((n,l)=>Math.max(n,l.length),1)*0.5));
 const enter=String(d.enter||'stamp');const exit=String(d.exit||'burn');
 const ruleProgress=enter==='rule'?Math.min(1,(k+1)/3):1;
 const textStart=enter==='rule'?2:0;
 const words=lines.map(l=>l.split(' '));let wordIndex=0;
 const textInk=motif==='disc'?paper:ink;
 const ticksTotal=s.duration>0?Math.ceil(s.duration/s.step):0;const kk=ticksTotal>0?ticksTotal-1-k:99;
 let fade=1;if(exit==='fade'&&kk<2)fade=[0,0.5][kk];
 return <VintageShell data={{...d,enter:'cut',exit:exit==='burn'?'burn':'cut',panX:0,panY:0,zoom:0}} background={paper} preserveColor>
  <div style={{position:'absolute',inset:0,background:paper}}/>
  <VMotif kind={motif} W={W} H={H} ink={motif==='disc'?ink:accent} k={k} progress={ruleProgress}/>
  <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:size*0.08,opacity:fade,paddingBottom:sub.length?0:H*0.02}}>
   {lines.map((l,i)=>{
     const tick=k-textStart;
     if(enter==='typewriter'){const ws=words[i];const start=wordIndex;wordIndex+=ws.length;const shown=ws.filter((_,j)=>tick>=start+j);if(!shown.length)return <div key={i} style={{fontSize:size,lineHeight:quiet?1.15:1}}>&nbsp;</div>;return <div key={i} style={{fontFamily:fam,fontWeight:quiet?700:900,fontSize:size,lineHeight:quiet?1.15:1,color:textInk,whiteSpace:'nowrap'}}>{shown.join(' ')}</div>;}
     const t=tick-i;if(t<0)return null;
     const sc=quiet?(t===0?1.03:1):(t===0?1.25:1);
     const bleed=t===0?'0 0 '+(size*0.03).toFixed(1)+'px '+textInk:'none';
     return <div key={i} style={{fontFamily:fam,fontWeight:quiet?700:900,fontSize:size,lineHeight:quiet?1.15:1,letterSpacing:quiet?'0':'-0.01em',color:textInk,textShadow:bleed,transform:'scale('+sc.toFixed(3)+')'+(quiet?'':' rotate('+((vHash(i,21)-0.5)*3).toFixed(2)+'deg)'),whiteSpace:'nowrap'}}>{l}</div>;
   })}
   {sub.length&&k-textStart>=lines.length?<div style={{width:W*0.12,height:Math.max(1.5,W*0.0025),background:accent,margin:size*0.12+'px 0'}}/>:null}
   {sub.length&&k-textStart>=lines.length?sub.map((l,i)=><div key={'s'+i} style={{fontFamily:fam,fontWeight:400,fontSize:subSize,lineHeight:1.25,color:ink,opacity:0.9,whiteSpace:'nowrap'}}>{l}</div>):null}
  </div>
  <VCredit text={d.kicker} fam={fam} ink={ink} W={W} H={H} y={H*0.88}/>
 </VintageShell>;
}`;
const VINTAGE_EFFECT = VINTAGE_CORE + `
export default function VintageEffect({Source,data}){
 const d=data||{};const frame=useCurrentFrame();const {fps,width:W,height:H}=useVideoConfig();
 const s=vSettings(d,fps);const f=Math.floor(frame/s.step)*s.step;const k=f/s.step;
 const layout=String(d.layout||'strip');
 if(layout==='full')return <VintageShell data={d}><div style={{position:'absolute',inset:0}}>{Source?<Source/>:null}</div>{d.credit?<div style={{position:'absolute',left:'5%',bottom:'4.5%',fontFamily:vFont(d,true),fontSize:Math.min(W,H)*0.026,letterSpacing:'0.2em',color:'#F1E3C2',opacity:0.75,textShadow:'0 0 6px rgba(0,0,0,0.6)',whiteSpace:'nowrap'}}>{String(d.credit).toUpperCase()}</div>:null}</VintageShell>;
 // Strip and framed: the fetched clip is the full canvas with the footage
 // already padded into place on paper (see vintageWindow); the shell owns the
 // frame, the window clips + pans the footage, rules/title/credit sit on top.
 const {ink,paper}=vPalette(s,d);const fam=vFont(d,true);
 const framed=layout==='framed';
 const w=framed?Math.round(W*0.84):W,h=framed?Math.round(w*1.25):Math.round(W*0.75),x=framed?Math.round((W-w)/2):0,y=framed?Math.round(H*0.10):Math.round((H-h)/2-H*0.04);
 const lines=vLines(d.caption,false,framed?22:24);const maxLen=lines.reduce((n,l)=>Math.max(n,l.length),1);
 const size=Math.min(H*(framed?0.05:0.044),(W*0.82)/(maxLen*0.5));
 const g=Math.min(W,H)*0.012,sw=Math.max(1.5,Math.min(W,H)*0.003);
 const rules=framed?<svg style={{position:'absolute',inset:0}} width={W} height={H}><rect x={x-g} y={y-g} width={w+2*g} height={h+2*g} fill="none" stroke={ink} strokeWidth={sw*1.6}/><rect x={x-2.4*g} y={y-2.4*g} width={w+4.8*g} height={h+4.8*g} fill="none" stroke={ink} strokeWidth={sw*0.7}/></svg>
  :<svg style={{position:'absolute',inset:0}} width={W} height={H}><line x1={0} y1={y-g} x2={W} y2={y-g} stroke={ink} strokeWidth={sw*1.6}/><line x1={0} y1={y-2.4*g} x2={W} y2={y-2.4*g} stroke={ink} strokeWidth={sw*0.7}/><line x1={0} y1={y+h+g} x2={W} y2={y+h+g} stroke={ink} strokeWidth={sw*1.6}/><line x1={0} y1={y+h+2.4*g} x2={W} y2={y+h+2.4*g} stroke={ink} strokeWidth={sw*0.7}/></svg>;
 const overlay=<div style={{position:'absolute',inset:0}}>{rules}
  <div style={{position:'absolute',left:0,right:0,top:y+h+H*0.045,display:'flex',flexDirection:'column',alignItems:'center',gap:size*0.1}}>
   {lines.map((l,i)=>k>=i?<div key={i} style={{fontFamily:fam,fontWeight:700,fontSize:size,lineHeight:1.15,color:ink,whiteSpace:'nowrap'}}>{l}</div>:null)}
  </div>
  <VCredit text={d.credit} fam={fam} ink={ink} W={W} H={H} y={H*0.935}/>
 </div>;
 return <VintageShell data={{...d,panX:0,panY:0,zoom:0}} background={paper} overlay={overlay}>
  <div style={{position:'absolute',inset:0,background:paper}}/>
  <VWindow Source={Source} s={s} f={f} fps={fps} x={x} y={y} w={w} h={h} W={W} H={H}/>
 </VintageShell>;
}`;

const VINTAGE_LOOK_VERSION = 5;
const VINTAGE_LOOK_VERSION_NOTE = "native";
const VINTAGE_LOOK_DEFAULTS = { lookVersion: VINTAGE_LOOK_VERSION, tone: "custom", stepFps: 12, levels: 0, tint: 0, contrast: 0, soften: 0, texture: 0, grain: 0, halftone: 0, dotSize: 6, weave: 0, flicker: 0, vignette: 0, zoom: 0.04, scratches: 0, ink: "#000000", paper: "#ECE9E2" };
const VINTAGE_LOOK_DEFS = [
  { key: "tone", label: "Tone", type: "select", defaultValue: "sepia", options: [{ label: "Sepia", value: "sepia" }, { label: "Ink on paper", value: "paper-ink" }, { label: "Riso (ink · red · paper)", value: "riso" }, { label: "Red on paper", value: "red-paper" }, { label: "Mono", value: "mono" }, { label: "Posterized color", value: "color" }, { label: "Custom ink / paper", value: "custom" }] },
  { key: "stepFps", label: "Frame step (fps)", type: "number", defaultValue: 12, min: 2, max: 30, step: 1 },
  { key: "levels", label: "Posterize levels (0 = off)", type: "number", defaultValue: 0, min: 0, max: 12, step: 1 },
  { key: "tint", label: "Tint strength (baked)", type: "number", defaultValue: 0, min: 0, max: 1, step: 0.05 },
  { key: "soften", label: "Soften before posterize (px)", type: "number", defaultValue: 0.8, min: 0, max: 4, step: 0.1 },
  { key: "baked", label: "Look baked into the clip (skip live colour filter)", type: "boolean", defaultValue: false },
  { key: "contrast", label: "Contrast", type: "number", defaultValue: 0, min: -0.5, max: 1, step: 0.05 },
  { key: "grain", label: "Grain", type: "number", defaultValue: 0.22, min: 0, max: 1, step: 0.05 },
  { key: "halftone", label: "Halftone", type: "number", defaultValue: 0.06, min: 0, max: 0.6, step: 0.02 },
  { key: "dotSize", label: "Halftone dot", type: "number", defaultValue: 6, min: 2, max: 16, step: 1 },
  { key: "weave", label: "Gate weave", type: "number", defaultValue: 0.3, min: 0, max: 2, step: 0.1 },
  { key: "flicker", label: "Flicker", type: "number", defaultValue: 0.2, min: 0, max: 1, step: 0.05 },
  { key: "vignette", label: "Vignette", type: "number", defaultValue: 0.35, min: 0, max: 1, step: 0.05 },
  { key: "zoom", label: "Slow push", type: "number", defaultValue: 0.06, min: 0, max: 0.3, step: 0.01 },
  { key: "panX", label: "Pan → (−1 left … 1 right)", type: "number", defaultValue: 0, min: -1, max: 1, step: 0.25 },
  { key: "panY", label: "Pan ↓ (−1 up … 1 down)", type: "number", defaultValue: 0, min: -1, max: 1, step: 0.25 },
  { key: "scratches", label: "Scratches & dust", type: "number", defaultValue: 0.06, min: 0, max: 1, step: 0.05 },
  { key: "ink", label: "Ink (custom tone)", type: "color", defaultValue: "#1A1410" },
  { key: "paper", label: "Paper (custom tone)", type: "color", defaultValue: "#FFFDF7" },
];
const VINTAGE_MOTION_DEFS = [
  { key: "enter", label: "Enter", type: "select", defaultValue: "slip", options: [{ label: "Film slip (rolls up)", value: "slip" }, { label: "Flash frame", value: "flash" }, { label: "Shutter wipe", value: "shutter" }, { label: "Hard cut", value: "cut" }] },
  { key: "exit", label: "Exit", type: "select", defaultValue: "burn", options: [{ label: "Burn to paper", value: "burn" }, { label: "Film slip", value: "slip" }, { label: "Shutter wipe", value: "shutter" }, { label: "Hard cut", value: "cut" }] },
  { key: "durationFrames", label: "Clip length (frames, for the exit)", type: "number", defaultValue: 0, min: 0, max: 100000, step: 1 },
];
const VINTAGE_EFFECT_DEFS = [
  { key: "layout", label: "Layout", type: "select", defaultValue: "strip", options: [{ label: "Film strip on paper", value: "strip" }, { label: "Framed on paper", value: "framed" }, { label: "Full frame", value: "full" }] },
  { key: "caption", label: "Title (strip / framed)", type: "text", defaultValue: "" },
  { key: "credit", label: "Credit", type: "text", defaultValue: "" },
  { key: "fontFamily", label: "Font", type: "text", defaultValue: "" },
  ...VINTAGE_MOTION_DEFS,
  ...VINTAGE_LOOK_DEFS,
];
const VINTAGE_CARD_DEFS = [
  { key: "text", label: "Text", type: "text", defaultValue: "" },
  { key: "subtext", label: "Subtext", type: "text", defaultValue: "" },
  { key: "kicker", label: "Kicker", type: "text", defaultValue: "" },
  { key: "fontFamily", label: "Font", type: "text", defaultValue: "" },
  { key: "motif", label: "Style", type: "select", defaultValue: "frame", options: [{ label: "Quiet · ruled frame", value: "frame" }, { label: "Quiet · plain", value: "none" }, { label: "Poster · sunburst", value: "sunburst" }, { label: "Poster · disc", value: "disc" }, { label: "Poster · stripes", value: "stripes" }] },
  { key: "textCase", label: "Text case", type: "select", defaultValue: "auto", options: [{ label: "Auto (quiet = natural, poster = caps)", value: "auto" }, { label: "Natural", value: "natural" }, { label: "ALL CAPS", value: "upper" }] },
  { key: "enter", label: "Enter", type: "select", defaultValue: "stamp", options: [{ label: "Stamp (line by line)", value: "stamp" }, { label: "Typewriter (word by word)", value: "typewriter" }, { label: "Rule draws, then text", value: "rule" }] },
  { key: "exit", label: "Exit", type: "select", defaultValue: "burn", options: [{ label: "Burn to paper", value: "burn" }, { label: "Fade", value: "fade" }, { label: "Hard cut", value: "cut" }] },
  { key: "durationFrames", label: "Clip length (frames, for the exit)", type: "number", defaultValue: 0, min: 0, max: 100000, step: 1 },
  { key: "accent", label: "Accent", type: "color", defaultValue: "#EB0706" },
  ...VINTAGE_LOOK_DEFS,
];
const VINTAGE_SLIDERS = [["tint", "Tint", 0, 1, 0.05], ["texture", "Texture", 0, 1, 0.05], ["grain", "Grain", 0, 1, 0.05], ["halftone", "Halftone", 0, 0.6, 0.02], ["weave", "Weave", 0, 2, 0.1], ["flicker", "Flicker", 0, 1, 0.05], ["vignette", "Vignette", 0, 1, 0.05], ["zoom", "Push", 0, 0.3, 0.01], ["scratches", "Scratches", 0, 1, 0.05], ["soften", "Soften", 0, 4, 0.1]];

// Local-only search + segment fetch. Search hits Internet Archive / Wikimedia
// Commons; fetch lets ffmpeg pull only the needed seconds over HTTPS and conform
// them (optional frame step, scale, no audio) into the panel's plugin-data folder.
const VINTAGE_BROLL_PY = `import json,os,re,sys,html,shutil,subprocess,urllib.parse,urllib.request,time
UA='DepthTypeCaptions/1.0 (Selects desktop vintage b-roll)'
def req(url,timeout=12):
    return urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':UA}),timeout=timeout)
def clean(v): return html.unescape(re.sub('<[^>]+>','',str(v or ''))).strip()
def terms(q):
    stop=set('a an the of in on at to and or with from for footage video archival shot shots close up showing scene broll b roll'.split())
    return [w for w in re.findall(r'[\\w-]+',str(q or '')) if w.lower() not in stop][:8]
def archive(data):
    t=terms(data.get('query',''))
    if not t: raise ValueError('Enter a subject to search for.')
    q='('+' '.join(t)+') AND mediatype:(movies)'
    if data.get('vintage',True): q+=' AND collection:(prelinger)'
    params={'q':q,'fl[]':['identifier','title','year','downloads'],'rows':int(data.get('limit',8)),'page':1,'output':'json','sort[]':'downloads desc'}
    with req('https://archive.org/advancedsearch.php?'+urllib.parse.urlencode(params,doseq=True),15) as r: docs=json.load(r).get('response',{}).get('docs',[])
    items=[];started=time.monotonic();rank={'h.264':0,'mpeg4':1,'512kb mpeg4':2}
    block=re.compile(r'molest|sex|nude|porn|rape|kkk|nazi|execution|autopsy|surgery|venereal|abortion|experiment|organism|dissect|vivisect|cadaver|corpse|death|disease|cancer|tumor|atomic|bomb|war\\b|combat|casualt',re.I)
    for d in docs:
        if time.monotonic()-started>22: break
        ident=d.get('identifier')
        if block.search(str(d.get('title',''))+' '+str(ident)): continue
        try:
            with req('https://archive.org/metadata/'+urllib.parse.quote(ident)+'/files',8) as r: files=json.load(r).get('result',[])
        except Exception: continue
        best=None
        for f in files:
            name=str(f.get('name',''));fmt=str(f.get('format','')).lower()
            if not name.lower().endswith('.mp4'): continue
            score=rank.get(fmt,3)
            if best is None or score<best[0]: best=(score,f)
        if not best: continue
        f=best[1]
        try: length=float(f.get('length') or 0)
        except Exception: length=0
        size=str(f.get('size',''))
        items.append({'id':ident,'provider':'archive','title':clean(d.get('title')) or ident,'year':str(d.get('year') or ''),'duration':length,'url':'https://archive.org/download/'+urllib.parse.quote(ident)+'/'+urllib.parse.quote(str(f.get('name'))),'thumb':'https://archive.org/services/img/'+urllib.parse.quote(ident),'page':'https://archive.org/details/'+urllib.parse.quote(ident),'meta':str(f.get('format') or '')+(' · '+str(round(int(size)/1048576))+' MB' if size.isdigit() else ''),'license':'Internet Archive item; check the item page for rights'})
    return {'items':items}
def commons(data):
    t=terms(data.get('query',''))
    if not t: raise ValueError('Enter a subject to search for.')
    params={'action':'query','format':'json','generator':'search','gsrsearch':'filetype:video '+' '.join(t),'gsrnamespace':6,'gsrlimit':int(data.get('limit',8)),'prop':'videoinfo','viprop':'url|size|mime|derivatives|extmetadata','viurlwidth':320,'viextmetadatalanguage':'en'}
    with req('https://commons.wikimedia.org/w/api.php?'+urllib.parse.urlencode(params),15) as r: res=json.load(r)
    if res.get('error'): raise ValueError(res['error'].get('info','Commons search failed'))
    items=[]
    for p in (res.get('query',{}).get('pages',{}) or {}).values():
        vi=(p.get('videoinfo') or [{}])[0]
        best=None
        for dv in (vi.get('derivatives') or []):
            h=int(dv.get('height') or 0);src=dv.get('src','')
            if not src or h<=0: continue
            score=(0 if h<=720 else 1,-h if h<=720 else h)
            if best is None or score<best[0]: best=(score,dv)
        if not best: continue
        dv=best[1];em=vi.get('extmetadata') or {}
        items.append({'id':str(p.get('pageid')),'provider':'commons','title':clean(p.get('title','')).replace('File:',''),'year':clean((em.get('DateTimeOriginal') or {}).get('value'))[:4],'duration':float(vi.get('duration') or 0),'url':dv.get('src'),'thumb':vi.get('thumburl'),'page':vi.get('descriptionurl'),'meta':str(dv.get('height'))+'p '+str(dv.get('type','')).split(';')[0].replace('video/',''),'license':clean((em.get('LicenseShortName') or {}).get('value'))})
    return {'items':items}
def library(data):
    items=[];started=time.monotonic();rank={'h.264':0,'mpeg4':1,'512kb mpeg4':2}
    for ident in list(data.get('ids') or [])[:4]:
        if time.monotonic()-started>22: break
        try:
            with req('https://archive.org/metadata/'+urllib.parse.quote(str(ident)),8) as r: meta=json.load(r)
        except Exception: continue
        files=meta.get('files') or [];md=meta.get('metadata') or {}
        best=None
        for f in files:
            name=str(f.get('name',''));fmt=str(f.get('format','')).lower()
            if not name.lower().endswith('.mp4'): continue
            score=rank.get(fmt,3)
            if best is None or score<best[0]: best=(score,f)
        if not best: continue
        f=best[1]
        try: length=float(f.get('length') or 0)
        except Exception: length=0
        title=md.get('title');title=title[0] if isinstance(title,list) else title
        year=md.get('year') or str(md.get('date') or '')[:4]
        items.append({'id':ident,'provider':'archive','title':clean(title) or ident,'year':str(year or ''),'duration':length,'url':'https://archive.org/download/'+urllib.parse.quote(str(ident))+'/'+urllib.parse.quote(str(f.get('name'))),'thumb':'https://archive.org/services/img/'+urllib.parse.quote(str(ident)),'page':'https://archive.org/details/'+urllib.parse.quote(str(ident)),'meta':str(f.get('format') or ''),'license':'Prelinger Archives (public domain)'})
    return {'items':items}
def probe_luma(url,start):
    try:
        r=subprocess.run([ffmpeg(),'-hide_banner','-loglevel','info','-user_agent',UA,'-ss',str(start),'-t','0.5','-i',url,'-vf','scale=32:18,signalstats,metadata=print:key=lavfi.signalstats.YAVG','-f','null','-'],capture_output=True,text=True,timeout=45)
    except Exception: return None
    vals=[float(m) for m in re.findall(r'YAVG=([0-9.]+)',r.stderr+r.stdout)]
    return sum(vals)/len(vals) if vals else None
TEX_DIR=os.path.expanduser('~/.selects/plugin-data/depth-type-captions/textures')
TEXTURES={'film':'https://texturelabs.org/wp-content/uploads/Texturelabs_Film_197S.jpg','paper':'https://texturelabs.org/wp-content/uploads/Texturelabs_Paper_120S.jpg'}
def ensure_textures():
    os.makedirs(TEX_DIR,exist_ok=True);out={}
    for k,u in TEXTURES.items():
        path=os.path.join(TEX_DIR,k+'.jpg')
        if not os.path.exists(path) or os.path.getsize(path)<10000:
            try:
                with urllib.request.urlopen(urllib.request.Request(u,headers={'User-Agent':'Mozilla/5.0 (Macintosh) Selects/DepthTypeCaptions'}),timeout=30) as r: data=r.read()
                open(path,'wb').write(data)
            except Exception: continue
        out[k]=path
    return out
def hexrgb(h):
    h=re.sub(r'[^0-9A-Fa-f]','',str(h or ''))[:6]
    if len(h)!=6: return None
    return tuple(int(h[i:i+2],16)/255 for i in (0,2,4))
def baked_filters(data,width,height):
    # sepia duotone + gentle quantise + real textures, all at fetch time
    look=data.get('look') or {}
    ink=hexrgb(look.get('ink'))or(0.23,0.14,0.07);paper=hexrgb(look.get('paper'))or(0.95,0.89,0.76)
    levels=int(look.get('levels',0));step=256.0/levels if levels>=3 else 0
    soft=float(look.get('soften',0));tex=float(look.get('texture',0.5));tint=max(0.0,min(1.0,float(look.get('tint',0.25))))
    # tint blends the duotone endpoints towards plain black/white
    ink=tuple(c*tint for c in ink);paper=tuple(1-(1-c)*tint for c in paper)
    q="lutyuv=y='trunc(val/%.3f)*%.3f+%.3f'"%(step,step,step/2) if step else None
    curves="curves=r='0/%.3f 1/%.3f':g='0/%.3f 1/%.3f':b='0/%.3f 1/%.3f'"%(ink[0],paper[0],ink[1],paper[1],ink[2],paper[2])
    chain=['gblur=sigma=%.2f'%soft if soft>0 else None,'hue=s=0',q,'format=gbrp',curves]
    return [c for c in chain if c],tex
def ffmpeg():
    for c in [shutil.which('ffmpeg'),'/opt/homebrew/bin/ffmpeg','/usr/local/bin/ffmpeg']:
        if c and os.path.exists(c): return c
    raise ValueError('ffmpeg was not found. Install it with Homebrew (brew install ffmpeg).')
def fetch(data):
    url=str(data['url']);p=urllib.parse.urlsplit(url);host=p.hostname or ''
    if p.scheme!='https' or not (host=='archive.org' or host.endswith('.archive.org') or host=='upload.wikimedia.org'): raise ValueError('Unexpected media host: '+host)
    out_dir=os.path.expanduser('~/.selects/plugin-data/depth-type-captions/broll');os.makedirs(out_dir,exist_ok=True)
    safe=re.sub(r'[^A-Za-z0-9._-]+','-',str(data.get('name') or 'broll'))[:60].strip('-') or 'broll'
    out=os.path.join(out_dir,safe+'-'+str(int(time.time()))+'.mp4')
    starts=[max(0.0,float(v)) for v in (data.get('starts') or [data.get('start',0)])][:4];dur=max(0.5,float(data.get('duration',5)))
    start=starts[0];luma=None
    if len(starts)>1:
        best=None
        for cand in starts:
            y=probe_luma(url,cand)
            if y is None: continue
            if 45<=y<=185: start=cand;luma=y;break
            score=abs(y-115)
            if best is None or score<best[0]: best=(score,cand,y)
        else:
            if best: start,luma=best[1],best[2]
    fps=float(data.get('fps',30));step=float(data.get('stepFps',0));height=int(data.get('height',1080));width=int(data.get('width',0))
    vf=[]
    if step and step<fps: vf.append('fps='+str(step))
    win=data.get('window') or None
    if width>0 and win:
        w,h,x,y=int(win['w']),int(win['h']),int(win['x']),int(win['y']);color=re.sub(r'[^0-9A-Fa-f]','',str(win.get('color','F1E3C2')))[:6] or 'F1E3C2'
        vf.append('scale='+str(w)+':'+str(h)+':force_original_aspect_ratio=increase:flags=lanczos,crop='+str(w)+':'+str(h)+',pad='+str(width)+':'+str(height)+':'+str(x)+':'+str(y)+':color=0x'+color)
    elif width>0:
        vf.append('scale='+str(width)+':'+str(height)+':force_original_aspect_ratio=increase:flags=lanczos,crop='+str(width)+':'+str(height))
    else:
        vf.append('scale=-2:'+str(height))
    base=[ffmpeg(),'-y','-hide_banner','-loglevel','error','-user_agent',UA,'-ss',str(start),'-t',str(dur),'-i',url]
    if data.get('bake') and width>0:
        chain,tex=baked_filters(data,width,height);texs=ensure_textures()
        inputs=[];graph='[0:v]'+','.join(vf+chain)+'[b]'
        last='[b]'
        if texs.get('paper') and tex>0:
            inputs+=['-loop','1','-i',texs['paper']];i=len(inputs)//3
            graph+=';[%d:v]scale=%d:%d:force_original_aspect_ratio=increase,crop=%d:%d,hue=s=0,format=gbrp[p];%s[p]blend=all_mode=multiply:all_opacity=%.2f[m]'%(i,width,height,width,height,last,0.55*tex);last='[m]'
        if texs.get('film') and tex>0:
            inputs+=['-loop','1','-i',texs['film']];i=len(inputs)//3
            graph+=';[%d:v]scale=%d:%d:force_original_aspect_ratio=increase,crop=%d:%d:x=(iw-ow)/2+(random(1)-0.5)*40:y=(ih-oh)/2+(random(2)-0.5)*60,hue=s=0,format=gbrp[f];%s[f]blend=all_mode=softlight:all_opacity=%.2f[o]'%(i+0,width+120,height+120,width,height,last,0.7*tex);last='[o]'
        graph+=';%sscale=out_range=tv:out_color_matrix=bt709,format=yuv420p[out]'%last;last='[out]'
        base+=inputs+['-filter_complex',graph,'-map',last,'-t',str(dur),'-r',str(fps),'-an','-pix_fmt','yuv420p','-color_range','tv','-colorspace','bt709','-color_primaries','bt709','-color_trc','bt709','-movflags','+faststart']
    else:
        base+=['-vf',','.join(vf),'-r',str(fps),'-an','-pix_fmt','yuv420p','-movflags','+faststart']
    err=''
    for cmd in [base+['-c:v','h264_videotoolbox','-b:v','10M',out],base+['-c:v','libx264','-preset','veryfast','-crf','18',out]]:
        try: r=subprocess.run(cmd,capture_output=True,text=True,timeout=int(data.get('timeout',240)))
        except subprocess.TimeoutExpired: raise ValueError('Download timed out. Try a shorter phrase or a different clip.')
        if r.returncode==0 and os.path.exists(out) and os.path.getsize(out)>1000: return {'path':out,'bytes':os.path.getsize(out),'start':start,'luma':luma}
        err=(r.stderr or '')[-600:]
    raise ValueError('ffmpeg could not fetch the clip. '+err)
def main():
    data=json.loads(sys.argv[1]);a=data.get('action')
    if a=='search': result=archive(data) if data.get('provider')=='archive' else commons(data)
    elif a=='library': result=library(data)
    elif a=='fetch': result=fetch(data)
    else: raise ValueError('Unknown action')
    print(json.dumps(result))
try: main()
except Exception as e:
    print(json.dumps({'error':str(e)}));sys.exit(1)
`;

function vintageShellQuote(v) {
  return "'" + String(v).replace(/'/g, "'\\''") + "'";
}
// Every helper call is appended to ~/.selects/plugin-data/depth-type-captions/helper.log
// (action, raw output, exit) so a failure inside the app can be read from disk.
const VINTAGE_HELPER_LOG = "$HOME/.selects/plugin-data/depth-type-captions/helper.log";
async function vintagePython(sdk, input, summary, timeoutMs) {
  if (typeof sdk.runShell !== "function") throw new Error("This Selects build does not expose the local shell needed for b-roll search and download.");
  const py = "python3 -c " + vintageShellQuote(VINTAGE_BROLL_PY) + " " + vintageShellQuote(JSON.stringify(input));
  const head = "[" + new Date().toISOString() + "] " + String(input.action) + " " + JSON.stringify(input).slice(0, 300);
  const command = 'mkdir -p "$(dirname ' + VINTAGE_HELPER_LOG + ')"; printf "%s\\n" ' + vintageShellQuote(head) + " >> " + VINTAGE_HELPER_LOG + "; { " + py + "; } 2>&1 | tee -a " + VINTAGE_HELPER_LOG + '; echo "[exit ${pipestatus[1]:-$?}]" >> ' + VINTAGE_HELPER_LOG;
  const r = await sdk.runShell({ summary, command, timeoutMs: Math.min(300000, timeoutMs || 60000), maxOutputBytes: 48000 });
  const text = String(r.stdout || r.output || r.text || "").trim();
  let parsed = null;
  try { parsed = JSON.parse(text.split("\n").filter(Boolean).pop() || "null"); } catch {}
  if (parsed?.error) throw new Error(parsed.error);
  if (r.isError || r.timedOut) throw new Error(r.timedOut ? "The request timed out. Retry." : String(r.stderr || text || "Local helper failed.").slice(0, 300));
  if (!parsed || typeof parsed !== "object") throw new Error("The local helper returned no data: " + (text || JSON.stringify(Object.keys(r || {}))).slice(0, 240));
  return parsed;
}
function vintagePhraseText(p) {
  return String(p?.text || (p?.layers || []).map((l) => l.text).join(" ") || "").replace(/\s+/g, " ").trim();
}
function vintageUid() {
  return Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);
}
function vintageCardScript(pid, sid, items) {
  return depthOwner(pid, sid) + `
const items=${JSON.stringify(items)};
const main=(await d.clips({trackScope:"main"})).reduce((n,c)=>Math.max(n,c.endFrame),0);
if(main<2)throw new Error("The draft has no main content to overlay.");
const placed=[];
for(const it of items){
 const s=Math.max(0,Math.min(main-1,it.startFrame)),e=Math.max(s+1,Math.min(main,it.endFrame));
 const clip=await d.addMotionGraphic({label:it.label,tsxCode:${JSON.stringify(VINTAGE_CARD)},parameters:{...it.parameters,durationFrames:e-s},editableParameters:${JSON.stringify(VINTAGE_CARD_DEFS)},within:await d.rangeAtFrames(s,e)});
 const c=(await d.clips({trackScope:"all"})).find(x=>x.clipId===clip.clipId);
 if(!c)throw new Error("Could not verify b-roll card placement on the current draft.");
 placed.push({clipId:c.clipId,trackId:c.trackId,startFrame:c.startFrame,endFrame:c.endFrame,kind:"card",phraseId:it.phraseId,label:it.label});
}
const r=await d.commitAll("Add vintage b-roll card"+(items.length>1?"s":""));
return {placed,commitId:r.commitId};`;
}
// Selects refuses to commit a Draft edit in the same call as a Project-level
// import, so placement is two scripts: import (returns the resource id), then
// overlay + effect + commit.
function vintageImportScript(pid, path) {
  return `const p=selects.project(${JSON.stringify(pid)});const imported=await p.importFiles({paths:[${JSON.stringify(path)}]});const rid=imported.addedResourceIds?.[0];if(!rid)throw new Error("Selects did not import the downloaded file.");return {resourceId:rid};`;
}
function vintagePlaceScript(pid, sid, item) {
  return depthOwner(pid, sid) + `
const it=${JSON.stringify(item)};
const p=selects.project(pid);
const rid=it.resourceId;
if(!rid)throw new Error("Missing imported resource id.");
const main=(await d.clips({trackScope:"main"})).reduce((n,c)=>Math.max(n,c.endFrame),0);
const s=Math.max(0,Math.min(main-1,it.startFrame)),e=Math.max(s+1,Math.min(main,it.endFrame));
const ov=await d.overlayResource({resource:p.resource(rid),over:await d.rangeAtFrames(s,e),sourceStartSeconds:0});
const all=await d.clips({trackScope:"all"});
const c=all.find(x=>x.resourceId===rid&&x.startFrame===ov.atFrame)||all.filter(x=>x.resourceId===rid).pop();
if(!c)throw new Error("The archival clip was imported but could not be located on the timeline.");
await d.addVideoEffect({clip:c,label:"Vintage treatment",tsxCode:${JSON.stringify(VINTAGE_EFFECT)},parameters:{...it.parameters,durationFrames:c.endFrame-c.startFrame},editableParameters:${JSON.stringify(VINTAGE_EFFECT_DEFS)}});
const r=await d.commitAll("Add vintage archival b-roll");
return {placed:[{clipId:c.clipId,trackId:c.trackId,startFrame:c.startFrame,endFrame:c.endFrame,kind:"archival",phraseId:it.phraseId,label:it.label,resourceId:rid}],commitId:r.commitId};`;
}
function vintageRemoveScript(pid, sid, refs) {
  return depthOwner(pid, sid) + `
const refs=${JSON.stringify(refs)};
const all=await d.clips({trackScope:"all"});
const found=refs.map(r=>all.find(c=>c.clipId===r.clipId&&c.trackId===r.trackId)).filter(Boolean);
if(!found.length)throw new Error("None of the saved b-roll clips are on the timeline any more.");
await d.removeClips(found);
const r=await d.commitAll("Remove vintage b-roll");
return {removed:found.length,commitId:r.commitId};`;
}

// ─── One-click orchestration ────────────────────────────────────────────────
// Picks a restrained set of cutaways, sources footage (archival first, quiet
// card as fallback), places them, then lays the captions on top with the
// cutaway ranges so type renders unmasked over footage and hides over cards.
const VINTAGE_STOP = new Set("a an the this that these those i you he she it we they my your our their me him her us them is are was were be been being have has had do does did can could would should will shall may might to of in on at for from with and or but so if as than then very really just also everybody everyone somebody something not no yes like get got go going went make made thing things way lot kind sort gonna wanna okay right yeah".split(" "));
const VINTAGE_FALLBACK_QUERIES = ["office workers typing", "factory assembly line", "city street crowd", "classroom students", "family dinner home", "businessmen meeting handshake", "highway traffic cars", "farm harvest workers", "newspaper printing press", "telephone operators", "shoppers department store", "construction workers building"];
function vintageContentWords(p) {
  return (p.words || []).map((w) => String(w.text).toLowerCase().replace(/[^\p{L}\p{N}]/gu, "")).filter((t) => t.length >= 4 && !VINTAGE_STOP.has(t));
}
function vintageCardText(p, full) {
  const hero = full ? "" : (p.layers?.find((l) => l.id.endsWith("-hero"))?.text || "");
  const clean = hero.replace(/[^\p{L}\p{N}?!'’-]/gu, "");
  const token = clean.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
  if (token.length >= 4 && !VINTAGE_STOP.has(token) && !/^(um+|uh+|hmm+|like)$/.test(token)) return clean;
  const fillers = /^(um+|uh+|hmm+|and|so|but|like|okay|yeah|well|you know)[,.]?$/i;
  const words = vintagePhraseText(p).split(/\s+/);
  while (words.length > 3 && fillers.test(words[0])) words.shift();
  const tails = /^(because|again|and|so|but|like|um+|uh+|right|okay|yeah|that|which|then)[,.;:]?$/i;
  while (words.length > 3 && tails.test(words[words.length - 1])) words.pop();
  return words.join(" ").replace(/[,;:]+$/, "");
}
function vintageQuery(p) {
  const words = vintageContentWords(p);
  if (!words.length) return "";
  const emphasis = (p.words || [])[depthEmphasisIndex(p.words || [])];
  const e = emphasis ? String(emphasis.text).toLowerCase().replace(/[^\p{L}\p{N}]/gu, "") : "";
  const rest = words.filter((w) => w !== e).sort((x, y) => y.length - x.length).slice(0, 1);
  return [e && !VINTAGE_STOP.has(e) && e.length >= 4 ? e : null, ...rest].filter(Boolean).slice(0, 2).join(" ");
}
// Restraint rules: never open on a cutaway, ≥ 9 s between cutaways, each 2–5 s,
// prefer phrases with concrete words, cap by runtime (~1 per 15 s, max 8).
function vintagePickCutaways(plan, duration, fps) {
  const maxCount = Math.max(1, Math.min(8, Math.round(duration / 15)));
  const minGap = 9, minLen = 2, maxLen = 5, holdOpening = 5;
  const scored = plan.map((p, i) => ({ i, p, score: vintageContentWords(p).length + (p.end - p.start >= 2.5 ? 1 : 0) - (i === 0 || p.start < holdOpening ? 100 : 0) - (p.end - p.start < 1.6 ? 100 : 0) }));
  const picks = [];
  let lastEnd = -Infinity;
  for (const c of scored) {
    if (picks.length >= maxCount) break;
    if (c.score < 1 || c.p.start - lastEnd < minGap) continue;
    // A cutaway is its own beat: ~3.2 s from the phrase start (longer phrases up to 5 s),
    // spanning phrase boundaries — captions hide during it, so short phrases are fine.
    const start = c.p.start, end = Math.min(duration, start + Math.max(minLen, Math.min(maxLen, Math.max(c.p.end - start, 3.2))));
    if (end - start < minLen) continue;
    picks.push({ index: c.i, phraseId: c.p.id, start, end, startFrame: Math.floor(start * fps), endFrame: Math.ceil(end * fps) });
    lastEnd = end;
  }
  return picks;
}
// Variety plan: cycle full → framed → card, vary pan direction and motion so
// consecutive cutaways never repeat. Framed and card need ≥ 2.5 s to read.
function vintageVariety(n, seconds, hasStrongHero) {
  // Footage only: a strip, then a framed window, alternating. No type cards
  // and no titles under the footage — that reads as machine-made.
  const layouts = ["strip", "framed"];
  let layout = layouts[n % layouts.length];
  if (layout === "framed" && seconds < 2.5) layout = "strip";
  const pans = [[1, 0], [0, -1], [-1, 0], [0, 1]];
  const [panX, panY] = pans[n % pans.length];
  const enters = ["slip", "shutter", "flash", "cut"], exits = ["burn", "slip", "burn", "shutter"];
  return { layout, panX, panY, zoom: 0.06 + 0.02 * (n % 3), enter: enters[n % enters.length], exit: exits[n % exits.length], cardEnter: ["stamp", "typewriter", "rule"][n % 3], cardExit: ["burn", "fade", "burn"][n % 3] };
}
const VINTAGE_PAPER = { sepia: "F1E3C2", "paper-ink": "FFFDF7", riso: "FFFDF7", "red-paper": "FFFDF7", mono: "FFFFFF", color: "F1E3C2" };
// Effects render on the clip's own canvas, so archival clips are always fetched
// at the draft size. Framed clips get the footage cropped to the window and
// padded into place on paper so the effect owns the whole frame.
function vintageWindow(width, height, layout, look) {
  if (layout === "full") return { width, height };
  const paper = look?.tone === "custom" ? String(look.paper || "#FFFDF7").replace("#", "") : VINTAGE_PAPER[look?.tone] || "F1E3C2";
  if (layout === "framed") {
    const w = Math.round(width * 0.84), h = Math.round(w * 1.25);
    return { width, height, window: { w: w - (w % 2), h: h - (h % 2), x: Math.round((width - w) / 2), y: Math.round(height * 0.1), color: paper } };
  }
  const h = Math.round(width * 0.75);
  return { width, height, window: { w: width, h: h - (h % 2), x: 0, y: Math.round((height - h) / 2 - height * 0.04), color: paper } };
}
// Exposure-safe offsets: three well-separated candidates; the fetcher probes
// each and skips blown-out or black stretches.
function vintageOffsets(it, seconds, seed) {
  const dur = it.duration || 0, first = vintageOffset(it, seconds, seed);
  if (dur <= seconds + 2) return [0];
  const usable = Math.max(0, dur - seconds - 1);
  return [first, Math.min(usable, first + Math.max(20, dur * 0.18)), Math.max(10, first - Math.max(20, dur * 0.22))].map((v) => Math.round(Math.max(0, Math.min(usable, v))));
}
function vintageStrongHero(p) {
  const hero = p.layers?.find((l) => l.id.endsWith("-hero"))?.text || "";
  const token = hero.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
  return token.length >= 5 && !VINTAGE_STOP.has(token);
}
const VINTAGE_LIBRARY = [{"id":"Designfo1956","title":"Design for Dreaming","year":"1956","duration":557,"tags":["kitchen","home","future","design","dream","cook","food","house"],"desc":"GM Motorama musical: a woman dreams through a push-button kitchen of the future and futuristic concept cars; glossy, theatrical, optimistic"},{"id":"ToNewHor1940","title":"To New Horizons","year":"1940","duration":1381,"tags":["city","future","road","car","traffic","highway","travel","progress","plan","vision"],"desc":"GM Futurama at the 1939 World's Fair: a model city of 1960, superhighways, skyscrapers, the future planned from above"},{"id":"HaveITol1958","title":"Have I Told You Lately That I Love You?","year":"1958","duration":901,"tags":["family","home","father","mother","love","child","dinner","people"],"desc":"Suburban family drama: a father buried in work misses his kids; family dinner table, kitchen, living room, reconciliation"},{"id":"EatforHe1954","title":"Eat for Health","year":"1954","duration":625,"tags":["food","eat","health","kitchen","milk","family","body"],"desc":"Nutrition film: family meals, a mother in the kitchen, children drinking milk, groceries, vegetables, healthy bodies"},{"id":"DayofTha1951","title":"Day of Thanksgiving, A","year":"1951","duration":748,"tags":["family","dinner","home","thanks","gift","people","together"],"desc":"A family counts its blessings: Thanksgiving table, kids, gratitude, small-town suburban home"},{"id":"middleton_family_worlds_fair_1939","title":"The Middleton Family at the New York World's Fair","year":"1939","duration":3284,"tags":["fair","family","future","machine","science","crowd","people","show"],"desc":"A family tours the 1939 World's Fair: crowds, exhibits, a talking robot, the wonders of industry on display"},{"id":"CoffeeHo1969","title":"Coffee House Rendezvous","year":"1969","duration":808,"tags":["coffee","cafe","talk","people","young","music","conversation"],"desc":"1960s youth coffee houses: teenagers talking, folk musicians, candles, earnest conversation"},{"id":"OfficeEt1950","title":"Office Etiquette","year":"1950","duration":795,"tags":["office","work","job","boss","desk","typing","business","secretary","meeting"],"desc":"A 1950s office: typewriters, secretaries, bosses, telephones, filing, desks, how to behave at work"},{"id":"Wordtoth1955","title":"Word to the Wives, A","year":"1955","duration":809,"tags":["home","wife","house","clean","kitchen","family"],"desc":"A housewife tricks her husband into a modern kitchen; appliances, domestic scheming, home life"},{"id":"FashionH1940","title":"Fashion Horizons","year":"1940","duration":1151,"tags":["fashion","clothes","style","look","women","travel","train"],"desc":"Fashion models travel by plane and train to resorts; dresses, glamour, movement, leisure"},{"id":"RelaxedW1957","title":"Relaxed Wife","year":"1957","duration":808,"tags":["relax","stress","calm","wife","home","worry","mind","think"],"desc":"Stress and calm at home: a nervous husband, a serene wife, tranquilizer ad; cartoonish anxiety"},{"id":"Supervis1944","title":"Supervising Women Workers","year":"1944","duration":637,"tags":["work","factory","women","job","boss","supervise","team","people","standard"],"desc":"Wartime factory: women at machines, a supervisor learning to lead, teamwork on the line"},{"id":"0159_Home_Economics_Story_The_E00036_01_16_28_00","title":"Home Economics Story","year":"1951","duration":1506,"tags":["school","student","learn","class","home","study","teach","college"],"desc":"College life: students in classrooms and labs, studying, campus, choosing a path"},{"id":"LeaveItt1940","title":"Leave It to Roll-Oh","year":"1940","duration":523,"tags":["robot","machine","future","home","invention","idea","funny"],"desc":"A robot butler does the housework; gadgets, automation, comic domestic future"},{"id":"Frontier1937","title":"Frontiers of the Future (A Screen Editorial With Lowell Thomas)","year":"1937","duration":597,"tags":["science","future","machine","research","lab","progress","industry"],"desc":"Industry and science march forward: laboratories, factories, engineers, machines, progress narrated with bravado"},{"id":"Wheelsof1950","title":"Wheels of Progress","year":"1950","duration":1143,"tags":["road","car","highway","traffic","travel","progress","build","work"],"desc":"Roads and highways: construction crews, traffic, cars streaming through cities, mobility and growth"},{"id":"MasterHa1936","title":"Master Hands","year":"1936","duration":296,"tags":["factory","work","hands","machine","industry","craft","make","build","standard","detail"],"desc":"Chevrolet factory: foundry, presses, assembly line, the hands of skilled workers building cars; heroic industry"},{"id":"CommandP1942","title":"Command Performance","year":"1942","duration":1139,"tags":["factory","work","industry","machine","war","effort","build","team"],"desc":"Wartime production: factories converting to tanks and planes, workers on the line, collective effort"},{"id":"Townandt1950","title":"Town and the Telephone","year":"1950","duration":1642,"tags":["telephone","town","talk","call","people","connect","communication"],"desc":"Telephone operators at switchboards, a small town connected by calls; communication, service"},{"id":"AttheEnd1946","title":"At the End of the Rainbow","year":"1946","duration":705,"tags":["farm","field","harvest","country","work","land","grow"],"desc":"Farming: fields, harvest, rural family, patience and seasons; work that pays off later"}];
// Auto mode draws from a curated, known-clean Prelinger library first: pick by
// tag overlap with the phrase, then round-robin so a draft never repeats a film.
function vintageLibraryCandidates(phrase, n, used) {
  const words = new Set(vintageContentWords(phrase).map((w) => w.replace(/(ing|ed|es|s)$/, "")));
  const scored = VINTAGE_LIBRARY.filter((e) => !used.has("archive" + e.id)).map((e, i) => ({ e, score: e.tags.reduce((k, t) => k + (words.has(t.replace(/(ing|ed|es|s)$/, "")) ? 1 : 0), 0), order: (i + n * 7) % VINTAGE_LIBRARY.length }));
  scored.sort((a, b) => b.score - a.score || a.order - b.order);
  return scored.slice(0, 3).map((x) => x.e.id);
}
// Meaning: ask the in-app agent once per run to match each planned cutaway to
// the library film whose imagery carries the phrase's idea, and to write a real
// title for the card / strip instead of a transcript chunk. Falls back to tags.
async function vintageAskPlan(sdk, plan, picks, progress) {
  if (typeof sdk.askAI !== "function" || !picks.length) return null;
  const phrases = plan.map((p, i) => i + ": " + vintagePhraseText(p)).join("\n");
  const films = VINTAGE_LIBRARY.map((e) => JSON.stringify({ id: e.id, title: e.title, year: e.year, about: e.desc })).join("\n");
  const prompt = "You are choosing archival b-roll cutaways for a vertical talking-head short. Read the whole transcript for context. For each planned cutaway, choose the library film whose IMAGERY best carries the idea of that phrase — a visual metaphor is good, literal word matches are not required, and never pick a film just because a word overlaps. Then write a card title.\n\nTranscript phrases (index: text):\n" + phrases + "\n\nPlanned cutaways at phrase indexes: " + JSON.stringify(picks.map((p) => p.index)) + "\n\nLibrary (one film per line):\n" + films + "\n\nRules: never use the same film twice in one short; prefer imagery with people or motion; title = 2 to 6 words, sentence case, no trailing punctuation, and it must express the idea rather than quote the transcript; subtitle = at most 10 words or an empty string. Return ONLY JSON, no prose: {\"picks\":[{\"phrase\":<index>,\"film\":\"<id>\",\"why\":\"<one line>\",\"title\":\"<title>\",\"subtitle\":\"<subtitle>\"}]}";
  progress("Choosing footage that fits each moment…");
  const r = await sdk.askAI({ prompt, timeoutMs: 90000 });
  const raw = typeof r === "string" ? r : String(r?.text ?? r?.output ?? r?.result ?? "");
  const m = raw.replace(/```(?:json)?/gi, "").match(/\{[\s\S]*\}/);
  if (!m) return null;
  let parsed;
  try { parsed = JSON.parse(m[0]); } catch { return null; }
  const ids = new Set(VINTAGE_LIBRARY.map((e) => e.id)), byPhrase = new Map(), seen = new Set();
  for (const x of Array.isArray(parsed?.picks) ? parsed.picks : []) {
    const idx = Number(x?.phrase), film = String(x?.film || "");
    if (!Number.isInteger(idx) || !ids.has(film) || seen.has(film)) continue;
    seen.add(film);
    byPhrase.set(idx, { film, why: String(x.why || "").slice(0, 160), title: String(x.title || "").replace(/[.!,;:]+$/, "").trim().slice(0, 60), subtitle: String(x.subtitle || "").trim().slice(0, 90) });
  }
  return byPhrase.size ? byPhrase : null;
}
function vintageBestResult(items, used) {
  const ok = (items || []).filter((it) => !used.has(it.provider + it.id) && it.url && (it.duration || 0) >= 20);
  ok.sort((a, b) => {
    const ya = Number(a.year) || 0, yb = Number(b.year) || 0;
    const score = (it, y) => ((it.meta || "").toLowerCase().includes("h.264") ? 2 : 0) + (y >= 1925 && y <= 1975 ? 2 : 0) + ((it.duration || 0) >= 60 ? 1 : 0);
    return score(b, yb) - score(a, ya);
  });
  return ok[0] || null;
}
function vintageOffset(it, seconds, seed) {
  const dur = it.duration || 0;
  if (dur <= seconds + 2) return 0;
  const usable = dur - seconds - 1;
  const lo = Math.min(usable, Math.max(15, dur * 0.15)), hi = Math.max(lo, dur * 0.8 - seconds);
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return Math.round(lo + (x - Math.floor(x)) * Math.max(0, hi - lo));
}

function DepthBroll({ sdk, pid, sid, plan, selected, info, settings, version }) {
  const key = DEPTH_TAG + ":broll:" + pid + ":" + sid;
  const saved = useRef(
    (() => {
      try {
        return JSON.parse(localStorage.getItem(key) || "null");
      } catch {
        return null;
      }
    })(),
  );
  // A look saved before the softened treatment existed (no `soften` key) is the old loud preset; start fresh.
  const [look, setLook] = useState({ ...VINTAGE_LOOK_DEFAULTS, ...(saved.current?.look?.lookVersion === VINTAGE_LOOK_VERSION ? saved.current.look : {}) }),
    [card, setCard] = useState({ motif: "frame", kicker: "", fontFamily: settings.serifFont || "", accent: settings.red || "#EB0706", ...(saved.current?.card?.lookVersion === VINTAGE_LOOK_VERSION ? saved.current.card : {}), lookVersion: VINTAGE_LOOK_VERSION }),
    [target, setTarget] = useState(selected),
    [pad, setPad] = useState(saved.current?.pad ?? 0.25),
    [text, setText] = useState(""),
    [provider, setProvider] = useState(saved.current?.provider || "archive"),
    [vintageOnly, setVintageOnly] = useState(saved.current?.vintageOnly ?? true),
    [query, setQuery] = useState(""),
    [results, setResults] = useState([]),
    [offsets, setOffsets] = useState({}),
    [stepFootage, setStepFootage] = useState(saved.current?.stepFootage ?? true),
    [placed, setPlaced] = useState(saved.current?.placed || []),
    [undo, setUndo] = useState(null),
    [busy, setBusy] = useState(false),
    [status, setStatus] = useState(""),
    [open, setOpen] = useState(saved.current?.open ?? true);
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify({ look, card, pad, provider, vintageOnly, stepFootage, placed, open }));
    } catch {}
  }, [look, card, pad, provider, vintageOnly, stepFootage, placed, open]);
  useEffect(() => { setTarget((t) => Math.min(Math.max(0, selected), Math.max(0, plan.length - 1))); }, [selected, plan.length]);
  useEffect(() => {
    if (!version) return;
    try {
      const s = JSON.parse(localStorage.getItem(key) || "null");
      if (s?.placed) setPlaced(s.placed);
      if (s?.look?.lookVersion === VINTAGE_LOOK_VERSION) setLook({ ...VINTAGE_LOOK_DEFAULTS, ...s.look });
      setUndo(null);
    } catch {}
  }, [version]);
  const phrase = plan[Math.min(target, plan.length - 1)];
  useEffect(() => {
    const t = vintagePhraseText(phrase);
    setText(t);
    setQuery(t);
  }, [phrase?.id]);
  const fps = info?.fps || 30;
  const spanFor = (p) => {
    const s = Math.max(0, Math.floor((p.start - pad) * fps)), e = Math.ceil((p.end + pad) * fps);
    return { startFrame: s, endFrame: Math.max(s + 1, e) };
  };
  const run = async (label, fn) => {
    if (busy) return;
    setBusy(true);
    setStatus(label);
    try {
      await fn();
    } catch (e) {
      if (alive.current) setStatus(String(e?.message || e));
    } finally {
      if (alive.current) setBusy(false);
    }
  };
  const lookParams = () => ({ ...look, uid: vintageUid() });
  const addCards = (all) =>
    run(all ? "Adding vintage cards for every phrase…" : "Adding vintage card…", async () => {
      const list = all ? plan : [phrase];
      const items = list.map((p, i) => ({ ...spanFor(p), phraseId: p.id, label: "Vintage card · " + vintagePhraseText(p).slice(0, 28), parameters: { ...lookParams(), text: all ? vintageCardText(p) : text || vintagePhraseText(p), subtext: all && vintageStrongHero(p) ? vintageCardText(p, true) : "", enter: ["stamp", "typewriter", "rule"][i % 3], exit: "burn", kicker: card.kicker, fontFamily: card.fontFamily, motif: card.motif, accent: card.accent, ink: look.ink, paper: look.paper } }));
      const r = await sdk.runScript({ summary: "Add vintage b-roll cards", allowCommit: true, script: vintageCardScript(pid, sid, items) });
      if (r.isError || !r.result?.placed) throw new Error(r.output || "No confirmation from the timeline.");
      if (!alive.current) return;
      setPlaced((ps) => [...ps, ...r.result.placed]);
      setUndo(r.result.commitId);
      setStatus("Added " + r.result.placed.length + " vintage card" + (r.result.placed.length === 1 ? "" : "s") + " to the timeline. Every look control is editable in the Inspector.");
    });
  const search = () =>
    run("Searching " + (provider === "archive" ? "Internet Archive" : "Wikimedia Commons") + "…", async () => {
      const r = await vintagePython(sdk, { action: "search", provider, query, vintage: vintageOnly, limit: 8 }, "Search archival b-roll", 45000);
      if (!alive.current) return;
      setResults(r.items || []);
      const o = {};
      for (const it of r.items || []) o[it.id] = Math.round((it.duration || 0) * 0.1);
      setOffsets(o);
      setStatus((r.items || []).length ? (r.items.length + " results. Set an offset (seconds into the source) and place one under the phrase.") : "No downloadable video matched. Try fewer, more concrete words.");
    });
  const place = (it) =>
    run("Fetching “" + it.title.slice(0, 40) + "” and placing it…", async () => {
      const span = spanFor(phrase);
      const seconds = (span.endFrame - span.startFrame) / fps;
      const start = Math.max(0, Number(offsets[it.id]) || 0);
      const win = vintageWindow(info?.width || 1080, info?.height || 1920, "strip", look);
      const fetched = await vintagePython(sdk, { action: "fetch", url: it.url, name: it.title, starts: [start, start + Math.max(20, (it.duration || 0) * 0.18), Math.max(0, start - Math.max(20, (it.duration || 0) * 0.22))], duration: seconds + 0.5, fps, stepFps: stepFootage ? look.stepFps : 0, width: win.width, height: win.height, window: win.window || null, bake: true, look: { ink: look.ink, paper: look.paper, levels: look.levels, soften: look.soften, texture: look.texture, tint: look.tint } }, "Download archival segment", 280000);
      if (!alive.current) return;
      setStatus("Downloaded " + Math.round((fetched.bytes || 0) / 1024) + " KB. Importing and applying the vintage treatment…");
      const imp = await sdk.runScript({ summary: "Import archival b-roll", allowCommit: true, script: vintageImportScript(pid, fetched.path) });
      if (imp.isError || !imp.result?.resourceId) throw new Error(imp.output || "Selects did not import the downloaded file.");
      const r = await sdk.runScript({ summary: "Place archival b-roll", allowCommit: true, script: vintagePlaceScript(pid, sid, { ...span, resourceId: imp.result.resourceId, phraseId: phrase.id, label: "Archival · " + it.title.slice(0, 28), parameters: { ...lookParams(), baked: true, layout: "strip", enter: "slip", exit: "burn", panX: 1, caption: "", credit: "", fontFamily: card.fontFamily } }) });
      if (r.isError || !r.result?.placed) throw new Error(r.output || "No confirmation from the timeline.");
      if (!alive.current) return;
      setPlaced((ps) => [...ps, ...r.result.placed]);
      setUndo(r.result.commitId);
      setStatus("Placed “" + it.title.slice(0, 40) + "” under the phrase with the vintage treatment attached. Source: " + it.page);
    });
  const removeAll = () =>
    run("Removing this panel’s b-roll…", async () => {
      const r = await sdk.runScript({ summary: "Remove vintage b-roll", allowCommit: true, script: vintageRemoveScript(pid, sid, placed) });
      if (r.isError || !r.result) throw new Error(r.output || "No removal confirmation.");
      setPlaced([]);
      setUndo(r.result.commitId);
      setStatus("Removed " + r.result.removed + " b-roll clip" + (r.result.removed === 1 ? "" : "s") + ".");
    });
  const undoLast = () =>
    run("Undoing last b-roll change…", async () => {
      const r = await sdk.runScript({ summary: "Undo vintage b-roll change", allowCommit: true, script: depthOwner(pid, sid) + "return await d.revertCommit(" + JSON.stringify(undo) + ");" });
      if (r.isError) throw new Error(r.output);
      setUndo(null);
      setStatus("Reverted. The placed-clip list may be stale; use Remove to clear anything still on the timeline.");
    });
  const field = { fontSize: 12, padding: "4px 6px", minWidth: 0 };
  const label = (t, el) => h("label", { style: { display: "grid", gap: 3, fontSize: 11, color: "var(--panel-muted-fg,#aaa)", minWidth: 0 } }, t, el);
  const btn = (t, onClick, disabled, variant) => h("button", { onClick, disabled: busy || disabled, ...(variant ? { "data-variant": variant } : {}) }, t);
  const slider = ([k, t, min, max, step]) =>
    label(t + " " + Number(look[k]).toFixed(2), h("input", { type: "range", min, max, step, value: look[k], onChange: (e) => setLook({ ...look, [k]: Number(e.target.value) }) }));
  if (!plan.length) return null;
  return h(
    "section",
    { style: { display: "grid", gap: 10, padding: "10px 12px", border: "1px solid var(--panel-border,#333)", borderRadius: 6 } },
    h("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 } }, h("strong", null, "5. Vintage b-roll"), h("button", { "data-variant": "secondary", onClick: () => setOpen(!open) }, open ? "Hide" : "Show")),
    open && h("div", { role: "status", style: { fontSize: 12, color: "var(--panel-muted-fg,#aaa)", overflowWrap: "anywhere" } }, status || "Cut away from the speaker during a phrase: generate a posterized typographic card, or pull public archival footage and give it the same stepped, grainy, duotone treatment."),
    open &&
      h(
        "div",
        { style: { display: "grid", gridTemplateColumns: "minmax(0,2fr) minmax(90px,1fr)", gap: 8 } },
        label("Phrase", h("select", { style: field, value: target, onChange: (e) => setTarget(Number(e.target.value)) }, ...plan.map((p, i) => h("option", { key: p.id, value: i }, i + 1 + ". " + vintagePhraseText(p).slice(0, 48) + " (" + p.start.toFixed(1) + "–" + p.end.toFixed(1) + "s)")))),
        label("Pad (s each side)", h("input", { style: field, type: "number", min: 0, max: 3, step: 0.05, value: pad, onChange: (e) => setPad(Math.max(0, Number(e.target.value) || 0)) })),
      ),
    open &&
      h(
        "div",
        { style: { display: "grid", gap: 6 } },
        h("small", { style: { fontWeight: 600 } }, "Look (shared by cards and footage)"),
        h(
          "div",
          { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 8 } },
          label("Tone", h("select", { style: field, value: look.tone, onChange: (e) => setLook({ ...look, tone: e.target.value }) }, ...VINTAGE_LOOK_DEFS.find((d) => d.key === "tone").options.map((o) => h("option", { key: o.value, value: o.value }, o.label)))),
          label("Frame step fps", h("input", { style: field, type: "number", min: 2, max: 30, step: 1, value: look.stepFps, onChange: (e) => setLook({ ...look, stepFps: Math.max(2, Math.min(30, Number(e.target.value) || 12)) }) })),
          label("Posterize levels", h("input", { style: field, type: "number", min: 2, max: 10, step: 1, value: look.levels, onChange: (e) => setLook({ ...look, levels: Math.max(2, Math.min(10, Number(e.target.value) || 4)) }) })),
          look.tone === "custom" && label("Ink", h("input", { type: "color", value: look.ink, onChange: (e) => setLook({ ...look, ink: e.target.value }) })),
          look.tone === "custom" && label("Paper", h("input", { type: "color", value: look.paper, onChange: (e) => setLook({ ...look, paper: e.target.value }) })),
        ),
        h("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(110px,1fr))", gap: 8 } }, ...VINTAGE_SLIDERS.map(slider)),
        h("div", null, btn("Reset look", () => setLook({ ...VINTAGE_LOOK_DEFAULTS }), false, "secondary")),
      ),
    open &&
      h(
        "div",
        { style: { display: "grid", gap: 6 } },
        h("small", { style: { fontWeight: 600 } }, "A · Generated card"),
        h(
          "div",
          { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 8 } },
          label("Text", h("input", { style: field, value: text, onChange: (e) => setText(e.target.value) })),
          label("Kicker (small line)", h("input", { style: field, value: card.kicker, placeholder: "optional", onChange: (e) => setCard({ ...card, kicker: e.target.value }) })),
          label("Font", h("input", { style: field, value: card.fontFamily, placeholder: "Impact", onChange: (e) => setCard({ ...card, fontFamily: e.target.value }) })),
          label("Motif", h("select", { style: field, value: card.motif, onChange: (e) => setCard({ ...card, motif: e.target.value }) }, ...VINTAGE_CARD_DEFS.find((d) => d.key === "motif").options.map((o) => h("option", { key: o.value, value: o.value }, o.label)))),
          label("Accent", h("input", { type: "color", value: card.accent, onChange: (e) => setCard({ ...card, accent: e.target.value }) })),
        ),
        h("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" } }, btn("Add card for this phrase", () => addCards(false), !pid || !sid || !info), btn("Add cards for all phrases", () => addCards(true), !pid || !sid || !info, "secondary")),
      ),
    open &&
      h(
        "div",
        { style: { display: "grid", gap: 6 } },
        h("small", { style: { fontWeight: 600 } }, "B · Archival footage"),
        h(
          "div",
          { style: { display: "grid", gridTemplateColumns: "minmax(0,2fr) minmax(120px,1fr)", gap: 8, alignItems: "end" } },
          label("Search", h("input", { style: field, value: query, onChange: (e) => setQuery(e.target.value), onKeyDown: (e) => { if (e.key === "Enter") search(); } })),
          label("Source", h("select", { style: field, value: provider, onChange: (e) => setProvider(e.target.value) }, h("option", { value: "archive" }, "Internet Archive"), h("option", { value: "commons" }, "Wikimedia Commons"))),
        ),
        h(
          "div",
          { style: { display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" } },
          btn("Search", search, !query.trim()),
          provider === "archive" && h("label", { style: { fontSize: 12, display: "flex", gap: 6, alignItems: "center" } }, h("input", { type: "checkbox", checked: vintageOnly, onChange: (e) => setVintageOnly(e.target.checked) }), "Vintage collections only (Prelinger, pre-1980)"),
          h("label", { style: { fontSize: 12, display: "flex", gap: 6, alignItems: "center" } }, h("input", { type: "checkbox", checked: stepFootage, onChange: (e) => setStepFootage(e.target.checked) }), "Step footage to " + look.stepFps + " fps on import"),
        ),
        results.length > 0 &&
          h(
            "div",
            { style: { display: "grid", gap: 6 } },
            ...results.map((it) =>
              h(
                "div",
                { key: it.provider + it.id, style: { display: "grid", gridTemplateColumns: "72px minmax(0,1fr) auto", gap: 8, alignItems: "center", padding: 6, border: "1px solid var(--panel-border,#333)", borderRadius: 6 } },
                h("div", { style: { width: 72, height: 48, background: "#111", borderRadius: 4, overflow: "hidden" } }, it.thumb && h("img", { src: it.thumb, alt: "", style: { width: "100%", height: "100%", objectFit: "cover" }, onError: (e) => { e.target.style.display = "none"; } })),
                h(
                  "div",
                  { style: { minWidth: 0, fontSize: 12 } },
                  h("div", { style: { fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, it.title),
                  h("div", { style: { color: "var(--panel-muted-fg,#aaa)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, [it.year, it.duration ? Math.round(it.duration) + "s" : null, it.meta, it.license].filter(Boolean).join(" · ")),
                  h("a", { href: it.page, target: "_blank", rel: "noreferrer", style: { fontSize: 11 } }, "Source page"),
                ),
                h(
                  "div",
                  { style: { display: "grid", gap: 4, justifyItems: "end" } },
                  h("input", { style: { ...field, width: 72 }, type: "number", min: 0, step: 1, title: "Seconds into the source", value: offsets[it.id] ?? 0, onChange: (e) => setOffsets({ ...offsets, [it.id]: Number(e.target.value) || 0 }) }),
                  btn("Place", () => place(it), !pid || !sid || !info),
                ),
              ),
            ),
          ),
      ),
    open &&
      (placed.length > 0 || undo) &&
      h(
        "div",
        { style: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" } },
        placed.length > 0 && h("small", null, placed.length + " b-roll clip" + (placed.length === 1 ? "" : "s") + " placed by this panel"),
        placed.length > 0 && btn("Remove all b-roll", removeAll, false, "secondary"),
        undo && btn("Undo last b-roll change", undoLast, false, "secondary"),
      ),
  );
}

function DepthVideo({ preview, time, playing, onTime, onEnded, onError }) {
  const mount = useRef(null), video = useRef(null), callbacks = useRef({ onTime, onEnded, onError });
  callbacks.current = { onTime, onEnded, onError };
  useEffect(() => {
    if(!preview?.url||!mount.current)return;
    const doc=window.parent.document,v=doc.createElement('video'),canvas=doc.createElement('canvas'),ctx=canvas.getContext('2d');let raf;
    v.src=preview.url;v.muted=true;v.playsInline=true;v.preload='auto';
    canvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;display:block';
    mount.current.appendChild(canvas);video.current=v;
    const draw=()=>{if(v.videoWidth){canvas.width=v.videoWidth;canvas.height=v.videoHeight;ctx.drawImage(v,0,0);}};
    v.onloadeddata=draw;v.onseeked=draw;
    const tick=()=>{if(!v.paused&&!v.ended){draw();callbacks.current.onTime(v.currentTime);}raf=requestAnimationFrame(tick);};raf=requestAnimationFrame(tick);
    v.onended=()=>callbacks.current.onEnded();v.onerror=()=>callbacks.current.onError('Preview video could not load. Refresh video & mask.');
    return()=>{cancelAnimationFrame(raf);v.pause();v.removeAttribute('src');v.load();canvas.remove();video.current=null;};
  },[preview?.url]);
  useEffect(()=>{const v=video.current;if(v){if(playing)v.play().catch(e=>callbacks.current.onError(e.message));else v.pause();}},[playing]);
  useEffect(()=>{const v=video.current;if(v&&!playing&&Math.abs(v.currentTime-time)>1e-3)v.currentTime=time;},[time,playing]);
  return h('div',{ref:mount,style:{position:'absolute',inset:0}});
}
export default function DepthTypePanel({ sdk, context }) {
  return h(DepthEditor, {
    key: String(context.projectId) + ":" + String(context.sequenceId),
    sdk,
    context,
  });
}
function DepthEditor({ sdk, context }) {
  const pid = context.projectId,
    sid = context.sequenceId,
    key = DEPTH_TAG + ":" + pid + ":" + sid;
  const initial = useRef(
    (() => {
      try {
        return JSON.parse(localStorage.getItem(key) || "null");
      } catch {
        return null;
      }
    })(),
  );
  const [settings, setSettings] = useState({ ...DEPTH_DEFAULTS, ...initial.current?.settings }),
    [plan, setPlan] = useState(() => (initial.current?.plan || []).map((p) => ({ ...p, layers: p.layers.map(({ front, ...l }) => l) }))),
    [owned, setOwned] = useState(initial.current?.owned || null),
    [selected, setSelected] = useState(0),
    [layerIndex, setLayerIndex] = useState(0),
    [wordIndex, setWordIndex] = useState(0),
    [moveUnit, setMoveUnit] = useState("word"),
    [info, setInfo] = useState(null),
    [status, setStatus] = useState(""),
    [busy, setBusy] = useState(false),
    [preview, setPreview] = useState(null),
    [mask, setMask] = useState(null),
    [time, setTime] = useState(0),
    [playing, setPlaying] = useState(false),
    [undo, setUndo] = useState(null),
    [wide, setWide] = useState(window.innerWidth > 760),
    [brollVersion, setBrollVersion] = useState(0);
  const lock = useRef(false), alive = useRef(true), job = useRef(null), drag = useRef(null), stage = useRef(null);
  useEffect(() => {
    alive.current = true;
    const resize = () => setWide(window.innerWidth > 760);
    window.addEventListener("resize", resize);
    return () => {
      alive.current = false;
      window.removeEventListener("resize", resize);
      if (job.current) {
        job.current.canceled = true;
        if (job.current.workflowId) window.parent.__DI__?.WorkflowClient?.cancel(job.current.workflowId);
      }
    };
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify({ settings, plan, owned }));
    } catch {
      setStatus("Local storage is full; this panel cannot remember the plan between sessions.");
    }
  }, [settings, plan, owned]);
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
      await fn();
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
    seek(plan[i].start);
  };
  const editLayer = (patch) =>
    setPlan((ps) =>
      ps.map((p, i) =>
        i === selected
          ? {
              ...p,
              designOriginal: undefined,
              layers: p.layers.map((l, j) =>
                j === layerIndex
                  ? {
                      ...l,
                      ...patch,
                      wordEdits: Object.hasOwn(patch, "text") ? undefined : patch.wordEdits || l.wordEdits,
                      typeBase: Object.keys(patch).some((k) => ["x", "y", "width", "height"].includes(k)) ? undefined : l.typeBase,
                    }
                  : l,
              ),
            }
          : p,
      ),
    );
  const editWord = (patch) => editLayer({ wordEdits: { ...(layer?.wordEdits || {}), [wordIndex]: { ...(layer?.wordEdits?.[wordIndex] || {}), ...patch } } });
  const updateSettings = (patch) => setSettings((s) => ({ ...s, ...patch }));
  const composeFromWords = (words, meta) => {
    const next = depthPlanWords(words, meta.fps, meta.duration),
      w = meta.width || W,
      hh = meta.height || H;
    return { next, plan: depthReferenceComposition(depthRestoreTypography(next, w, hh, settings), w, hh, settings) };
  };
  const read = () =>
    run("Reading current dialogue…", async () => {
      const r = await sdk.runScript({ script: depthReadScript(pid, sid), summary: "Plan Depth Type phrases", allowCommit: false });
      if (r.isError || !r.result) throw new Error(r.output || "No draft data returned.");
      if (!alive.current) return;
      const built = composeFromWords(r.result.words, r.result);
      setInfo(r.result);
      setPlan(built.plan);
      setSelected(0);
      setLayerIndex(0);
      setTime(built.next[0]?.start || 0);
      setStatus("Created " + built.next.length + " phrase compositions. Review the emphasis word in each, then prepare the mask.");
    });
  const prepare = () =>
    run("Preparing draft preview…", async () => {
      const control = { canceled: false, workflowId: null };
      job.current = control;
      const progress = (s) => {
        if (alive.current) setStatus(s);
      };
      try {
        const fresh = await sdk.runScript({ script: depthReadScript(pid, sid), summary: "Resolve current draft canvas", allowCommit: false });
        if (fresh.isError || !fresh.result) throw new Error(fresh.output || "Could not read the draft canvas.");
        if (alive.current) {
          setInfo(fresh.result);
          if (!plan.length && fresh.result.words?.length) {
            const built = composeFromWords(fresh.result.words, fresh.result);
            setPlan(built.plan);
            setSelected(0);
            setLayerIndex(0);
            setTime(built.next[0]?.start || 0);
          }
        }
        const p = await depthPrepareVideo(pid, sid, owned, control, progress, fresh.result);
        if (control.canceled) throw new Error("Canceled.");
        if (alive.current) {
          setPreview(p);
          setMask(null);
        }
        const m = await depthPrepareMask(sdk, p, progress, control);
        if (alive.current && !control.canceled) {
          setMask(m);
          setStatus("Video and " + m.frames.length + " subject masks ready" + (m.misses ? " · " + m.misses + " frames hide captions because no subject was found." : "."));
        }
      } finally {
        job.current = null;
      }
    });
  const verifyMask = async () => {
    if (!mask || !preview) throw new Error("Prepare the subject mask first, or switch off Behind speaker.");
    const fresh = await sdk.runScript({ script: depthReadScript(pid, sid), summary: "Verify subject mask canvas", allowCommit: false });
    if (fresh.isError || !fresh.result) throw new Error(fresh.output || "Could not verify the draft canvas.");
    if (!depthMaskFits(mask, fresh.result.width, fresh.result.height) || mask.canvasWidth !== fresh.result.width || mask.canvasHeight !== fresh.result.height)
      throw new Error("The draft canvas changed. Refresh video & mask before composing or saving.");
    if ((await depthCurrentKey(sid, owned)) !== mask.sourceKey) throw new Error("The footage changed. Refresh video & mask before composing or saving. Your style changes are kept.");
  };
  const resetLayout = () => {
    const next = depthReferenceComposition(plan, W, H, settings);
    const kept = next.filter((p) => p.layers.some((l) => Object.keys(l.wordEdits || {}).length)).length;
    setPlan(next);
    setLayerIndex(0);
    setStatus("Reset to the reference layout: script lead, red headline, serif support." + (kept ? " " + kept + " phrases with manual word edits were kept as they are." : "") + " Save captions to update the timeline.");
  };
  const composeWithSpeaker = () =>
    run("Composing around the speaker…", async () => {
      await verifyMask();
      const next = depthCopy(plan), skipped = [];
      let composed = 0;
      for (let i = 0; i < plan.length; i++) {
        if (!alive.current) return;
        try {
          const r = await depthComposeWithSpeaker(plan[i], plan, settings, mask, W, H, (s) => alive.current && setStatus("Phrase " + (i + 1) + " / " + plan.length + " · " + s));
          if (r) {
            next[i] = r;
            composed++;
          } else skipped.push(i + 1);
        } catch (e) {
          skipped.push(i + 1);
        }
      }
      if (!alive.current) return;
      setPlan(next);
      setLayerIndex(0);
      setStatus(composed + " phrases composed around the speaker" + (skipped.length ? "; " + skipped.length + " kept their current layout (phrase " + skipped.join(", ") + ")." : ".") + " Save captions to update the timeline.");
    });
  const apply = () =>
    run("Saving Depth Type captions…", async () => {
      depthValidate(plan);
      // Saving style changes must never alter placement or subject depth.
      const savePlan = plan.map((p) => ({ ...p, layers: p.layers.map(({ front, ...l }) => l) }));
      if (settings.depth) await verifyMask();
      const before = owned;
      const built = depthApplyScript(pid, sid, savePlan, settings, mask, owned);
      const r = await sdk.runScript({ summary: "Apply Depth Type captions", allowCommit: true, script: built.script });
      if (r.isError || !r.result?.owned) throw new Error(r.output || "No save confirmation. Check the timeline before retrying.");
      if (alive.current) {
        setOwned(r.result.owned);
        if (r.result.trimmed) {
          const bounded = depthBoundPlan(savePlan, r.result.duration);
          setPlan(bounded.plan);
          setSelected((i) => Math.min(i, bounded.plan.length - 1));
          setLayerIndex(0);
        }
        setUndo({ id: r.result.commitId, owned: r.result.recovered ? null : before, plan: depthCopy(plan) });
        setStatus(
          (r.result.recovered ? "The previous caption clip was missing. Added Depth Type Captions back to the timeline." : "Saved to the timeline.") +
            (built.pack ? " Mask embedded at " + built.pack.width + "×" + built.pack.height + ", " + built.pack.frames + " frames, " + Math.round(built.pack.bytes / 1024) + " KB." : "") +
            (r.result.trimmed ? " Fitted timing to the draft end: " + r.result.clippedLayers + " layers shortened, " + r.result.droppedLayers + " out-of-range layers skipped." : ""),
        );
      }
    });
  const autoEdit = () =>
    run("One-click edit: reading dialogue…", async () => {
      const control = { canceled: false, workflowId: null };
      job.current = control;
      const progress = (s) => { if (alive.current) setStatus(s); };
      const brollKey = DEPTH_TAG + ":broll:" + pid + ":" + sid;
      let brollSaved = {};
      try { brollSaved = JSON.parse(localStorage.getItem(brollKey) || "{}") || {}; } catch {}
      const look = { ...VINTAGE_LOOK_DEFAULTS, ...(brollSaved.look?.lookVersion === VINTAGE_LOOK_VERSION ? brollSaved.look : {}) };
      const cardStyle = { motif: "frame", kicker: "", fontFamily: settings.serifFont || "", accent: settings.red || "#EB0706", ...(brollSaved.card?.lookVersion === VINTAGE_LOOK_VERSION ? brollSaved.card : {}) };
      try {
        // 1. dialogue → phrases
        const r = await sdk.runScript({ script: depthReadScript(pid, sid), summary: "Read dialogue for one-click edit", allowCommit: false });
        if (r.isError || !r.result) throw new Error(r.output || "No draft data returned.");
        const meta = r.result;
        const built = composeFromWords(meta.words, meta);
        let nextPlan = built.plan;
        if (!nextPlan.length) throw new Error("No dialogue found in this draft.");
        if (alive.current) { setInfo(meta); setPlan(nextPlan); setSelected(0); setLayerIndex(0); }
        const fpsNow = meta.fps, durationNow = meta.duration;
        // 2. clear b-roll this panel placed before, so re-running doesn't stack
        if (Array.isArray(brollSaved.placed) && brollSaved.placed.length) {
          progress("Removing previous b-roll…");
          try { await sdk.runScript({ summary: "Remove previous b-roll", allowCommit: true, script: vintageRemoveScript(pid, sid, brollSaved.placed) }); } catch {}
        }
        // 3. subject mask (optional) + compose around the speaker — before any b-roll exists
        let m = null;
        if (settings.depth) {
          const p = await depthPrepareVideo(pid, sid, owned, control, progress, meta);
          if (control.canceled) throw new Error("Canceled.");
          if (alive.current) { setPreview(p); setMask(null); }
          m = await depthPrepareMask(sdk, p, progress, control);
          if (control.canceled) throw new Error("Canceled.");
          const composed = depthCopy(nextPlan);
          for (let i = 0; i < nextPlan.length; i++) {
            if (control.canceled) throw new Error("Canceled.");
            try {
              const c = await depthComposeWithSpeaker(nextPlan[i], nextPlan, settings, m, meta.width, meta.height, (s) => progress("Phrase " + (i + 1) + " / " + nextPlan.length + " · " + s));
              if (c) composed[i] = c;
            } catch {}
          }
          nextPlan = composed;
          if (alive.current) setPlan(nextPlan);
        }
        // 4. cutaways: archival footage first, quiet card as fallback
        const picks = vintagePickCutaways(nextPlan, durationNow, fpsNow);
        const placed = [], cutaways = [], used = new Set(), cards = [];
        let aiPlan = null;
        try { aiPlan = await vintageAskPlan(sdk, nextPlan, picks, progress); } catch (e) { progress("Footage matching unavailable (" + String(e?.message || e).slice(0, 60) + "); using subject tags."); }
        for (let n = 0; n < picks.length; n++) {
          if (control.canceled) throw new Error("Canceled.");
          const pick = picks[n], phrase = nextPlan[pick.index];
          const seconds = pick.end - pick.start;
          const strong = vintageStrongHero(phrase);
          const variety = vintageVariety(n, seconds, strong);
          const ai = aiPlan?.get(pick.index) || null;
          const title = ai?.title || vintageCardText(phrase, true);
          let done = variety.layout === "card";
          const queries = done ? [] : ["library", vintageQuery(phrase), VINTAGE_FALLBACK_QUERIES[(pick.index * 7 + n) % VINTAGE_FALLBACK_QUERIES.length]].filter(Boolean);
          for (const q of queries) {
            if (done) break;
            try {
              progress("Cutaway " + (n + 1) + " / " + picks.length + (q === "library" ? " · choosing from the film library…" : " · searching archives for “" + q + "”…"));
              const libraryIds = ai && !used.has("archive" + ai.film) ? [ai.film, ...vintageLibraryCandidates(phrase, n, used).filter((id) => id !== ai.film)].slice(0, 3) : vintageLibraryCandidates(phrase, n, used);
              const res = q === "library" ? await vintagePython(sdk, { action: "library", ids: libraryIds }, "Resolve library films", 45000) : await vintagePython(sdk, { action: "search", provider: "archive", query: q, vintage: true, limit: 6 }, "Search archival b-roll", 45000);
              const best = vintageBestResult(res.items, used);
              if (!best) continue;
              progress("Cutaway " + (n + 1) + " / " + picks.length + " · fetching “" + best.title.slice(0, 40) + "”…");
              const win = vintageWindow(meta.width || 1080, meta.height || 1920, variety.layout, look);
              const fetched = await vintagePython(sdk, { action: "fetch", url: best.url, name: best.title, starts: vintageOffsets(best, seconds, pick.index + 1), duration: seconds + 0.5, fps: fpsNow, stepFps: look.stepFps, width: win.width, height: win.height, window: win.window || null, bake: true, look: { ink: look.ink, paper: look.paper, levels: look.levels, soften: look.soften, texture: look.texture, tint: look.tint } }, "Download archival segment", 280000);
              const imp = await sdk.runScript({ summary: "Import archival b-roll", allowCommit: true, script: vintageImportScript(pid, fetched.path) });
              if (imp.isError || !imp.result?.resourceId) throw new Error(imp.output || "Import failed.");
              const credit = best.title.replace(/\s*\([^)]*\)/g, "").replace(/,\s*(The|A|An)$/i, "").trim().slice(0, 34).trim() + (best.year ? " · " + best.year : "");
              const pr = await sdk.runScript({ summary: "Place archival b-roll", allowCommit: true, script: vintagePlaceScript(pid, sid, { startFrame: pick.startFrame, endFrame: pick.endFrame, resourceId: imp.result.resourceId, phraseId: phrase.id, label: "Archival · " + best.title.slice(0, 28), parameters: { ...look, uid: vintageUid(), baked: true, layout: variety.layout, enter: variety.enter, exit: variety.exit, panX: variety.panX, panY: variety.panY, zoom: variety.zoom, caption: "", credit: "", fontFamily: cardStyle.fontFamily } }) });
              if (pr.isError || !pr.result?.placed) throw new Error(pr.output || "Placement failed.");
              placed.push(...pr.result.placed);
              const c = pr.result.placed[0];
              cutaways.push({ start: c.startFrame / fpsNow, end: c.endFrame / fpsNow, kind: "card" });
              used.add(best.provider + best.id);
              done = true;
            } catch (e) {
              const why = String(e?.message || e).slice(0, 160);
              progress("Cutaway " + (n + 1) + " · footage attempt failed (" + why + "), trying next…");
              try { localStorage.setItem(brollKey + ":lastError", why); } catch {}
            }
          }
          if (!done || variety.layout === "card") {
            const heroText = ai?.title || vintageCardText(phrase), full = ai ? ai.subtitle : vintageCardText(phrase, true);
            cards.push({ startFrame: pick.startFrame, endFrame: pick.endFrame, phraseId: phrase.id, label: "Vintage card · " + heroText.slice(0, 28), parameters: { ...look, uid: vintageUid(), text: heroText, subtext: full && full.toLowerCase() !== heroText.toLowerCase() && (ai || strong) ? full : "", enter: variety.cardEnter, exit: variety.cardExit, kicker: cardStyle.kicker, fontFamily: cardStyle.fontFamily, motif: cardStyle.motif, accent: cardStyle.accent } });
          }
        }
        if (cards.length) {
          progress("Adding " + cards.length + " quiet card" + (cards.length === 1 ? "" : "s") + "…");
          const cr = await sdk.runScript({ summary: "Add vintage cards", allowCommit: true, script: vintageCardScript(pid, sid, cards) });
          if (cr.isError || !cr.result?.placed) throw new Error(cr.output || "Card placement failed.");
          placed.push(...cr.result.placed);
          for (const c of cr.result.placed) cutaways.push({ start: c.startFrame / fpsNow, end: c.endFrame / fpsNow, kind: "card" });
        }
        try { localStorage.setItem(brollKey, JSON.stringify({ ...brollSaved, look, card: cardStyle, placed })); } catch {}
        if (alive.current) setBrollVersion((v) => v + 1);
        // 5. captions last, so they sit on top; the graphic knows where the cutaways are.
        // The saved caption link may point at a clip that no longer exists (e.g. cleared
        // outside this panel); the apply script refuses to "recover" while other graphics
        // exist, and our own b-roll counts, so verify the link first and drop it if stale.
        progress("Saving captions on top…");
        let ownedNow = owned;
        if (owned) {
          const chk = await sdk.runScript({ summary: "Verify caption clip", allowCommit: false, script: depthOwner(pid, sid) + "const ref=" + JSON.stringify(owned) + ';return {exists:(await d.clips({trackScope:"all"})).some(c=>c.clipId===ref.clipId&&c.trackId===ref.trackId)};' });
          if (chk.isError || !chk.result?.exists) ownedNow = null;
        }
        const savePlan = nextPlan.map((p) => ({ ...p, layers: p.layers.map(({ front, ...l }) => l) }));
        const builtScript = depthApplyScript(pid, sid, savePlan, settings, m, ownedNow, cutaways);
        const ar = await sdk.runScript({ summary: "Apply Depth Type captions", allowCommit: true, script: builtScript.script });
        if (ar.isError || !ar.result?.owned) throw new Error(ar.output || "Captions were not confirmed on the timeline.");
        if (m) {
          // The timeline now carries b-roll; re-key the mask so a later manual save doesn't demand a refresh.
          try { m.sourceKey = await depthCurrentKey(sid, ar.result.owned); } catch {}
        }
        if (alive.current) {
          if (m) setMask(m);
          setOwned(ar.result.owned);
          if (ar.result.trimmed) setPlan(depthBoundPlan(savePlan, ar.result.duration).plan);
          setUndo(null);
          const footage = cutaways.filter((c) => c.kind === "footage").length, cardN = cutaways.length - footage;
          setStatus("Done. " + nextPlan.length + " caption phrases, " + footage + " archival cutaway" + (footage === 1 ? "" : "s") + (cardN ? " and " + cardN + " quiet card" + (cardN === 1 ? "" : "s") : "") + ". Captions sit on top; every clip is adjustable in the Inspector.");
        }
      } finally {
        job.current = null;
      }
    });
  const remove = () =>
    run("Removing this plugin’s captions…", async () => {
      if (!owned) return;
      const r = await sdk.runScript({
        summary: "Remove Depth Type captions",
        allowCommit: true,
        script:
          depthOwner(pid, sid) +
          "const ref=" +
          JSON.stringify(owned) +
          ';const c=(await d.clips({trackScope:"all"})).find(x=>x.clipId===ref.clipId&&x.trackId===ref.trackId);if(!c)throw new Error("Saved caption clip not found.");await d.removeClips([c]);const result=await d.commitAll("Remove Depth Type Captions");return {commitId:result.commitId};',
      });
      if (r.isError || !r.result) throw new Error(r.output || "No removal confirmation.");
      setUndo({ id: r.result.commitId, owned });
      setOwned(null);
      setStatus("Removed this plugin’s saved graphic.");
    });
  const undoApply = () =>
    run("Undoing last Depth Type change…", async () => {
      const r = await sdk.runScript({ summary: "Undo Depth Type change", allowCommit: true, script: depthOwner(pid, sid) + "return await d.revertCommit(" + JSON.stringify(undo.id) + ");" });
      if (r.isError) throw new Error(r.output);
      setOwned(undo.owned);
      if (undo.plan) {
        setPlan(undo.plan);
        setLayerIndex(0);
      }
      setUndo(null);
      setStatus("Last Depth Type change undone.");
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
  let validation = "";
  try {
    if (plan.length) depthValidate(plan);
  } catch (e) {
    validation = e.message;
  }
  const svg = depthSvg(plan, { ...settings, depth: settings.depth && !!mask }, time, W, H, mask, false);
  const shiftPhrase = (v) => {
    const delta = v - row.start;
    setPlan((ps) =>
      ps.map((p, i) =>
        i === selected
          ? { ...p, start: v, end: p.end + delta, words: p.words?.map((w) => ({ ...w, s: w.s + delta, e: w.e + delta })), layers: p.layers.map((l) => ({ ...l, start: l.start + delta, end: l.end + delta })) }
          : p,
      ),
    );
  };
  const endPhrase = (v) => setPlan((ps) => ps.map((p, i) => (i === selected ? { ...p, end: v, layers: p.layers.map((l) => ({ ...l, end: l.end === p.end ? v : Math.min(l.end, v) })) } : p)));
  const addPhrase = () => {
    const start = Math.min(duration - 1, plan.at(-1)?.end || 0),
      p = depthCompose({ id: "manual-" + Date.now(), start: Math.max(0, start), end: Math.max(0.5, Math.min(duration, start + 1)), text: "YOUR WORDS" }, "impact");
    setPlan((ps) => [...ps, ...depthRestoreTypography([p], W, H, settings)]);
    setSelected(plan.length);
    setLayerIndex(0);
  };
  const addLayer = () => {
    setPlan((ps) => ps.map((p, i) => (i === selected ? { ...p, layers: [...p.layers, depthLayer(p.id + "-" + Date.now(), "NEW LAYER", p.start, p.end, "connector", 50, 75, 80, 12, p.layers.length)] } : p)));
    setLayerIndex(row.layers.length);
  };
  const deleteLayer = () => {
    setPlan((ps) => ps.map((p, i) => (i === selected ? { ...p, layers: p.layers.filter((_, j) => j !== layerIndex) } : p)));
    setLayerIndex(0);
  };
  const deletePhrase = () => {
    setPlan((ps) => ps.filter((_, i) => i !== selected));
    setSelected(Math.max(0, selected - 1));
    setLayerIndex(0);
  };
  const phraseList = h(
    "section",
    null,
    h("h3", null, "Phrases"),
    h(
      "div",
      { style: { display: "grid", gap: 6, maxHeight: wide ? 600 : 220, overflow: "auto" } },
      ...plan.map((p, i) =>
        h(
          "button",
          {
            key: p.id,
            onClick: () => choose(i),
            disabled: busy,
            "data-variant": "ghost",
            style: { textAlign: "left", whiteSpace: "normal", height: "auto", padding: "9px 8px", border: "1px solid " + (selected === i ? "#e44a43" : "var(--panel-border,#333)"), background: selected === i ? "#442525" : "transparent" },
          },
          h("strong", { style: { display: "block", fontSize: 12 } }, p.layers.map((l) => l.text).join(" / ")),
          h("small", null, p.start.toFixed(2) + "–" + p.end.toFixed(2) + " s · " + p.layers.length + " layers"),
        ),
      ),
    ),
    button("Add phrase", addPhrase, !info),
  );
  const layerEditor =
    layer &&
    h(
      "div",
      { style: { display: "grid", gap: 8, border: "1px solid var(--panel-border,#333)", padding: 10, borderRadius: 6 } },
      h("label", null, "Layer text", h("textarea", { "aria-label": "Layer text", value: layer.text, onChange: (e) => editLayer({ text: e.target.value }), rows: 2, style: { height: 64, width: "100%", resize: "vertical" } })),
      select("Type role", layer.role, (v) => editLayer({ role: v }), [
        ["block", "Heavy red capitals"],
        ["serif", "White serif"],
        ["serif-red", "Red serif"],
        ["script", "Red script"],
        ["script-white", "White script"],
        ["connector", "White connector"],
      ]),
      field("Font override", layer.font, (v) => editLayer({ font: v })),
      layer.font && button("Use role font", () => editLayer({ font: "" })),
      field("Layer color", layer.color || (["block", "script", "serif-red"].includes(layer.role) ? settings.red : settings.white), (v) => editLayer({ color: v }), "color"),
      layer.color && button("Use palette color", () => editLayer({ color: "" })),
      h(
        "div",
        { style: { display: "grid", gridTemplateColumns: wide ? "1fr 1fr" : "1fr", gap: 8 } },
        field("Start frame", Math.round(layer.start * fps), (v) => editLayer({ start: v / fps }), "number", { min: Math.round(row.start * fps), max: Math.round(layer.end * fps) - 1 }),
        field("End frame (exclusive)", Math.round(layer.end * fps), (v) => editLayer({ end: v / fps }), "number", { min: Math.round(layer.start * fps) + 1, max: Math.round(row.end * fps) }),
        field("X (%)", Math.round(layer.x * 10) / 10, (v) => editLayer({ x: v }), "number", { step: 0.5 }),
        field("Y (%)", Math.round(layer.y * 10) / 10, (v) => editLayer({ y: v }), "number", { step: 0.5 }),
        field("Maximum width (%)", layer.width, (v) => editLayer({ width: v }), "number", { min: 1, max: 160 }),
        field("Maximum cap height (%)", layer.height, (v) => editLayer({ height: v }), "number", { min: 1, max: 100 }),
        field("Layer order", layer.z, (v) => editLayer({ z: v }), "number", { step: 1 }),
      ),
      button("Delete layer", deleteLayer, row.layers.length <= 1),
    );
  const previewSection = h(
    "section",
    { style: { display: "grid", gap: 10, minWidth: 0 } },
    h("h3", null, "Preview · phrase " + (selected + 1) + " of " + plan.length),
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
    h("small", null, settings.depth && !mask ? "Typography preview · prepare a subject mask to see text behind the speaker." : "Drag a word to move it. Use the word buttons below to select hidden words."),
    h(
      "div",
      { style: { display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" } },
      button(playing ? "Pause" : "Play", () => setPlaying((p) => !p), !preview),
      button("−1 frame", () => seek(time - 1 / fps)),
      button("+1 frame", () => seek(time + 1 / fps)),
      h("span", { style: { fontVariantNumeric: "tabular-nums", fontSize: 12 } }, "F" + Math.floor(time * fps) + " · " + time.toFixed(3) + " / " + duration.toFixed(2) + " s"),
    ),
    h("input", { "aria-label": "Composition playhead", type: "range", min: 0, max: Math.max(0, duration - 1 / fps), step: 1 / fps, value: time, onChange: (e) => seek(Number(e.target.value)) }),
    row &&
      h(
        "div",
        { style: { display: "grid", gap: 10 } },
        field("Phrase start (seconds)", row.start, shiftPhrase, "number", { min: 0, step: 1 / fps }),
        field("Phrase end (seconds)", row.end, endPhrase, "number", { min: row.start + 1 / fps, step: 1 / fps }),
        h(
          "div",
          { style: { display: "flex", gap: 6, flexWrap: "wrap" } },
          ...row.layers.map((l, i) =>
            button(
              l.role + ": " + l.text,
              () => {
                setLayerIndex(i);
                seek(l.start);
              },
              false,
              layerIndex === i ? "primary" : "secondary",
            ),
          ),
        ),
        layerEditor,
        h("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" } }, button("Add text layer", addLayer), button("Delete phrase", deletePhrase)),
      ),
  );
  const wordSection =
    row &&
    h(
      "section",
      { style: { display: "grid", gap: 8 } },
      h("h3", null, "Move words & depth"),
      select("Drag", moveUnit, setMoveUnit, [
        ["word", "Individual word"],
        ["layer", "Whole text layer"],
      ]),
      h(
        "div",
        { style: { display: "flex", gap: 6, flexWrap: "wrap" } },
        ...row.layers.flatMap((l, li) =>
          l.text
            .trim()
            .split(/\s+/)
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
          { style: { display: "grid", gap: 8 } },
          h("strong", null, "Selected word: " + (layer.text.trim().split(/\s+/)[wordIndex] || "Select a word")),
          select("Word depth", layer.wordEdits?.[wordIndex]?.depth || "behind", (v) => editWord({ depth: v }), [
            ["behind", "Behind speaker"],
            ["front", "In front of speaker"],
          ]),
          field("Word horizontal offset (%)", layer.wordEdits?.[wordIndex]?.dx || 0, (v) => editWord({ dx: v }), "number"),
          field("Word vertical offset (%)", layer.wordEdits?.[wordIndex]?.dy || 0, (v) => editWord({ dy: v }), "number"),
          button("Reset selected word", () => editWord({ dx: 0, dy: 0, depth: "behind" })),
          h("small", null, "Word changes keep the original spacing and spoken timing. Save captions to update the timeline. Composing around the speaker skips phrases with manual word placement."),
        ),
    );
  const styleSection = h(
    "details",
    null,
    h("summary", null, "Fonts, palette & background"),
    h("small", null, plan.flatMap((p) => p.layers).filter((l) => l.font || l.color).length + " layers have custom font/color overrides."),
    button(
      "Use global fonts and colors for all layers",
      () => {
        setPlan((ps) => ps.map((p) => ({ ...p, layers: p.layers.map((l) => ({ ...l, font: "", color: "" })) })));
        setStatus("All layers now follow the global fonts and palette. Save captions to update the timeline.");
      },
      !plan.length,
    ),
    h(
      "div",
      { style: { display: "grid", gap: 8, paddingTop: 8 } },
      field("Block font", settings.blockFont, (v) => updateSettings({ blockFont: v })),
      field("Serif font", settings.serifFont, (v) => updateSettings({ serifFont: v })),
      field("Script font", settings.scriptFont, (v) => updateSettings({ scriptFont: v })),
      field("Connector font", settings.connectorFont, (v) => updateSettings({ connectorFont: v })),
      field("Accent red", settings.red, (v) => updateSettings({ red: v }), "color"),
      field("White", settings.white, (v) => updateSettings({ white: v }), "color"),
      field("Mask expansion (canvas units)", settings.maskGrow, (v) => updateSettings({ maskGrow: v }), "number", { min: 0, max: 6, step: 0.25 }),
      select("Background", settings.background, (v) => updateSettings({ background: v }), [
        ["footage", "Keep footage"],
        ["black", "Black behind speaker"],
      ]),
    ),
  );
  const step = (n, title, ...children) =>
    h("section", { style: { display: "grid", gap: 8, padding: "10px 12px", border: "1px solid var(--panel-border,#333)", borderRadius: 6 } }, h("strong", null, n + ". " + title), ...children);
  const createFlow = h(
    "div",
    { style: { display: "grid", gap: 10 } },
    h(
      "section",
      { style: { display: "grid", gap: 8, padding: "10px 12px", border: "1px solid var(--panel-accent,#6c8cff)", borderRadius: 6 } },
      h("strong", null, "One-click edit"),
      h("small", null, "Captions, a few archival cutaways, and quiet type cards where no footage fits — in one pass, then everything is editable below. About 20 s per cutaway."),
      h(
        "div",
        { style: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" } },
        h("button", { onClick: autoEdit, disabled: busy || !pid || !sid }, "Edit this draft"),
        toggle("Behind speaker", settings.depth, (v) => updateSettings({ depth: v })),
        busy && job.current && h("button", { "data-variant": "secondary", onClick: () => { job.current.canceled = true; if (job.current.workflowId) window.parent.__DI__?.WorkflowClient?.cancel(job.current.workflowId); setStatus("Cancel requested. The current step may finish before stopping."); } }, "Cancel"),
      ),
    ),
    step(
      1,
      "Create captions from dialogue",
      h("div", { style: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" } }, button(plan.length ? "Rebuild from dialogue" : "Load draft dialogue", read, !pid || !sid, plan.length ? "secondary" : "primary"), plan.length ? h("small", null, plan.length + " phrases ready") : null),
    ),
    step(
      2,
      "Prepare video & subject mask",
      h(
        "div",
        { style: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" } },
        button(mask ? "Refresh video & mask" : "Prepare video & subject mask", prepare, !pid || !sid, mask ? "secondary" : "primary"),
        toggle("Behind speaker", settings.depth, (v) => updateSettings({ depth: v })),
        busy &&
          job.current &&
          h(
            "button",
            {
              "data-variant": "secondary",
              onClick: () => {
                job.current.canceled = true;
                if (job.current.workflowId) window.parent.__DI__?.WorkflowClient?.cancel(job.current.workflowId);
                setStatus("Cancel requested. The current local mask pass may finish before stopping.");
              },
            },
            "Cancel preparation",
          ),
      ),
      mask && h("small", null, mask.frames.length + " masks · " + mask.width + " × " + mask.height + " · " + mask.misses + " missing detections"),
    ),
    step(
      3,
      "Layout",
      h("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" } }, button("Compose with speaker", composeWithSpeaker, !mask || !plan.length || !settings.depth), button("Reset to reference layout", resetLayout, !plan.length || !info)),
      h("small", null, "Compose with speaker keeps the headline behind the person and moves the supporting lines into open space around the silhouette. Optional; fine-tune anything below."),
    ),
    step(
      4,
      "Save to timeline",
      validation && h("p", { role: "alert", style: { margin: 0, color: "var(--panel-danger,#ff736d)" } }, validation),
      h(
        "div",
        { style: { display: "flex", gap: 8, flexWrap: "wrap" } },
        h("button", { onClick: apply, disabled: busy || !plan.length || !!validation || !info || (settings.depth && !mask) }, owned ? "Save captions to timeline" : "Add captions to timeline"),
        owned && button("Remove saved captions", remove),
        undo && button("Undo last apply", undoApply),
      ),
    ),
  );
  return h(
    "div",
    { style: { display: "grid", gap: 12, minWidth: 0 } },
    h("header", null, h("h2", { style: { margin: 0 } }, "Depth Type Captions"), h("small", null, info?.name || "Open a draft to begin")),
    h("div", { role: "status", style: { fontSize: 12, color: "var(--panel-muted-fg,#aaa)", overflowWrap: "anywhere" } }, status || "Load dialogue, prepare the mask, save. Edit anything below before or after saving."),
    createFlow,
    plan.length > 0 && h("h3", { style: { marginBottom: 0 } }, "Edit captions"),
    plan.length > 0 && h("div", { style: { display: "grid", gridTemplateColumns: wide ? "minmax(150px,220px) minmax(0,1fr)" : "minmax(0,1fr)", gap: 14 } }, phraseList, previewSection),
    plan.length > 0 && wordSection,
    plan.length > 0 && styleSection,
    plan.length > 0 && h(DepthBroll, { sdk, pid, sid, plan, selected, info, settings, version: brollVersion }),
  );
}
