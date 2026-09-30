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

const DEPTH_MASK_SOURCE="import Foundation\nimport AVFoundation\nimport Vision\nimport CoreImage\nimport ImageIO\nimport UniformTypeIdentifiers\n// Local speaker mattes. One full-resolution grayscale PNG per video frame (white = text may\n// show, black = speaker) for the saved graphic, and a 384-wide set for layout, keyed by time.\n// Frames are split into ranges read by a few workers at once; each keeps its own reader and\n// Vision request, and names every matte after its presentation time.\nlet args = CommandLine.arguments\nif args.count < 8 { fputs(\"Usage: mattes input.mp4 outdir width height person|foreground growPx maxFrames [workers]\\n\", stderr); exit(2) }\nlet input = URL(fileURLWithPath: args[1])\nlet outDir = URL(fileURLWithPath: args[2], isDirectory: true)\nguard let track = AVURLAsset(url: input).tracks(withMediaType: .video).first else { fputs(\"The render has no video track.\\n\", stderr); exit(3) }\nlet W = Int(abs(track.naturalSize.width).rounded()), H = Int(abs(track.naturalSize.height).rounded())\nif let ew = Double(args[3]), let eh = Double(args[4]), ew > 0, eh > 0, H > 0, abs(Double(W) / Double(H) - ew / eh) > 2 / Double(max(1, H)) {\n  fputs(\"Render canvas does not match the draft. Expected \\(Int(ew)) x \\(Int(eh)); received \\(W) x \\(H).\\n\", stderr); exit(5)\n}\nlet person = args[5] != \"foreground\"\nlet grow = max(0, Int(args[6]) ?? 0)\nlet maxFrames = max(1, Int(args[7]) ?? Int.max)\nlet fps = Double(track.nominalFrameRate)\nif fps <= 0 { fputs(\"The render has no frame rate.\\n\", stderr); exit(4) }\nlet origin = CMTimeGetSeconds(track.timeRange.start)\nlet total = min(maxFrames, max(1, Int((CMTimeGetSeconds(track.timeRange.duration) * fps).rounded())))\n// The Neural Engine saturates around four streams; fewer on smaller Macs.\nlet automatic = min(4, max(1, ProcessInfo.processInfo.activeProcessorCount / 4))\nlet workers = max(1, min(total, args.count > 8 ? (Int(args[8]) ?? automatic) : automatic))\n// The detector now and then loses a large object it sees in the frames around (a desk,\n// for up to a few frames). Such a frame takes back what is speaker in both frames of a\n// pair the same distance before and after it (up to `span`), when that is a large area.\n// Steady motion never qualifies (the middle frame lies between the pair), and small\n// differences (edges, fingers, a waving hand) stay as detected.\nlet span = 4\nlet pixels = W * H\nlet fillArea = max(1, pixels * 15 / 1000)\nlet gray = CGColorSpaceCreateDeviceGray()\nlet lw = 384, lh = max(1, Int((Double(lw) * Double(H) / Double(W)).rounded()))\nlet bounds = CGRect(x: 0, y: 0, width: W, height: H), layoutBounds = CGRect(x: 0, y: 0, width: lw, height: lh)\n// Colour and EXIF metadata would keep the host's decode on its slower canvas path.\nfunc stripColorChunks(_ d: Data) -> Data {\n  let drop: Set<String> = [\"iCCP\", \"sRGB\", \"gAMA\", \"cHRM\", \"eXIf\"]\n  var out = Data(d.prefix(8)); var i = 8\n  while i + 12 <= d.count {\n    let len = Int(d[i]) << 24 | Int(d[i+1]) << 16 | Int(d[i+2]) << 8 | Int(d[i+3])\n    let kind = String(bytes: d[(i+4)..<(i+8)], encoding: .ascii) ?? \"\"\n    let end = i + 12 + len\n    if end > d.count { break }\n    if !drop.contains(kind) { out.append(d[i..<end]) }\n    i = end\n  }\n  return out\n}\nfunc png(_ image: CGImage) -> Data? {\n  let data = NSMutableData()\n  guard let dest = CGImageDestinationCreateWithData(data, UTType.png.identifier as CFString, 1, nil) else { return nil }\n  CGImageDestinationAddImage(dest, image, nil)\n  return CGImageDestinationFinalize(dest) ? stripColorChunks(data as Data) : nil\n}\nfunc grayImage(_ bytes: [UInt8], _ w: Int, _ h: Int) -> CGImage? {\n  guard let provider = CGDataProvider(data: Data(bytes) as CFData) else { return nil }\n  return CGImage(width: w, height: h, bitsPerComponent: 8, bitsPerPixel: 8, bytesPerRow: w, space: gray, bitmapInfo: CGBitmapInfo(rawValue: CGImageAlphaInfo.none.rawValue), provider: provider, decode: nil, shouldInterpolate: false, intent: .defaultIntent)\n}\nfunc matteURL(_ index: Int) -> URL { outDir.appendingPathComponent(String(format: \"matte_%06d.png\", index + 1)) }\nlet lock = NSLock()\nvar rows: [Int: (t: Double, png: String)] = [:]\nvar misses = 0, filled = 0, done = 0\nvar failure: String? = nil\nfunc fail(_ message: String) { lock.lock(); if failure == nil { failure = message }; lock.unlock() }\nfunc failed() -> Bool { lock.lock(); defer { lock.unlock() }; return failure != nil }\n// PNG encoding overlaps detection; the semaphore bounds memory.\nlet writes = OperationQueue(); writes.maxConcurrentOperationCount = workers * 2\nlet slots = DispatchSemaphore(value: workers * 4)\n// Plain loops over raw bytes: the compiler vectorises these, not generic SIMD calls.\nfunc bridgeInto(_ out: UnsafeMutablePointer<UInt8>, _ a: UnsafePointer<UInt8>, _ b: UnsafePointer<UInt8>, _ n: Int) {\n  for i in 0..<n { out[i] = max(out[i], min(a[i], b[i])) }\n}\nfunc gapCount(_ bridge: UnsafePointer<UInt8>, _ cover: UnsafePointer<UInt8>, _ n: Int) -> Int {\n  var gap = 0\n  for i in 0..<n { gap &+= Int(bridge[i]) &- Int(cover[i]) > 128 ? 1 : 0 }\n  return gap\n}\n// A bridged frame takes the pair's coverage everywhere it is higher, soft edges included,\n// so no seam is left around the restored object.\nfunc fillGaps(_ cover: UnsafeMutablePointer<UInt8>, _ bridge: UnsafePointer<UInt8>, _ n: Int) {\n  for i in 0..<n { cover[i] = max(cover[i], bridge[i]) }\n}\nfunc coverSum(_ cover: UnsafePointer<UInt8>, _ n: Int) -> Int {\n  var sum = 0\n  for i in 0..<n { sum &+= Int(cover[i]) }\n  return sum\n}\nfunc invert(_ matte: UnsafeMutablePointer<UInt8>, _ cover: UnsafePointer<UInt8>, _ n: Int) {\n  for i in 0..<n { matte[i] = 255 &- cover[i] }\n}\nfunc work(_ lo: Int, _ hi: Int) {\n  let asset = AVURLAsset(url: input)\n  guard let track = asset.tracks(withMediaType: .video).first, let reader = try? AVAssetReader(asset: asset) else { fail(\"The render could not be read.\"); return }\n  // The neighbours' frames give context only; frames outside [lo, hi) are written by them.\n  let first = max(0, lo - span), last = min(total, hi + span)\n  let start = origin + max(0, Double(first) - 1) / fps\n  reader.timeRange = CMTimeRange(start: CMTime(seconds: start, preferredTimescale: 600000), duration: CMTime(seconds: Double(last - first + 2) / fps, preferredTimescale: 600000))\n  let output = AVAssetReaderTrackOutput(track: track, outputSettings: [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA])\n  output.alwaysCopiesSampleData = false\n  reader.add(output)\n  guard reader.startReading() else { fail(\"The render could not be read.\"); return }\n  // Mask values are data, not colour: no colour management, so soft edges keep Vision's values.\n  let ctx = CIContext(options: [.cacheIntermediates: false, .workingColorSpace: NSNull(), .outputColorSpace: NSNull()])\n  let seg = VNGeneratePersonSegmentationRequest()\n  seg.qualityLevel = .accurate\n  seg.outputPixelFormat = kCVPixelFormatType_OneComponent8\n  // Speaker coverage per frame index (0 = none, 255 = speaker), kept for `span` frames each side,\n  // with the detector's own image for frames that keep it.\n  var window: [Int: (t: Double, cover: [UInt8], image: CIImage?)] = [:]\n  var next = lo\n  func emit(_ index: Int) throws {\n    guard let current = window[index] else { return }\n    var bridge = [UInt8](repeating: 0, count: pixels)\n    bridge.withUnsafeMutableBufferPointer { o in\n      for d in 1...span {\n        guard let a = window[index - d], let b = window[index + d] else { continue }\n        a.cover.withUnsafeBufferPointer { pa in b.cover.withUnsafeBufferPointer { pb in bridgeInto(o.baseAddress!, pa.baseAddress!, pb.baseAddress!, pixels) } }\n      }\n    }\n    var cover = current.cover\n    let gap = bridge.withUnsafeBufferPointer { b in cover.withUnsafeBufferPointer { c in gapCount(b.baseAddress!, c.baseAddress!, pixels) } }\n    let bridged = gap >= fillArea\n    if bridged { cover.withUnsafeMutableBufferPointer { c in bridge.withUnsafeBufferPointer { b in fillGaps(c.baseAddress!, b.baseAddress!, pixels) } } }\n    // A frame with (almost) no speaker pixels counts as a miss.\n    let present = cover.withUnsafeBufferPointer { c in coverSum(c.baseAddress!, pixels) } * 2 >= pixels\n    // No speaker: an all-black matte, so text meant to sit behind a person never covers one.\n    var matte = [UInt8](repeating: 0, count: pixels)\n    if present { matte.withUnsafeMutableBufferPointer { m in cover.withUnsafeBufferPointer { c in invert(m.baseAddress!, c.baseAddress!, pixels) } } }\n    guard let full = grayImage(matte, W, H) else { throw NSError(domain: \"mattes\", code: 2) }\n    // An unchanged frame scales the detector's image for layout, as before.\n    let source: CIImage\n    if !bridged, present, let image = current.image { source = image.applyingFilter(\"CIColorInvert\").cropped(to: bounds) }\n    else if !present { source = CIImage(color: CIColor(red: 0, green: 0, blue: 0)).cropped(to: bounds) }\n    else { source = CIImage(cgImage: full) }\n    let small = source.transformed(by: CGAffineTransform(scaleX: CGFloat(lw) / CGFloat(W), y: CGFloat(lh) / CGFloat(H)))\n    guard let layout = ctx.createCGImage(small.cropped(to: layoutBounds), from: layoutBounds, format: .L8, colorSpace: gray), let layoutPng = png(layout) else { throw NSError(domain: \"mattes\", code: 3) }\n    let url = matteURL(index)\n    slots.wait()\n    writes.addOperation {\n      defer { slots.signal() }\n      guard let data = png(full) else { fail(\"A matte could not be encoded.\"); return }\n      do { try data.write(to: url, options: .atomic) } catch { fail(error.localizedDescription) }\n    }\n    lock.lock()\n    rows[index] = (current.t, layoutPng.base64EncodedString())\n    if !present { misses += 1 }\n    if bridged { filled += 1 }\n    done += 1\n    let count = done\n    lock.unlock()\n    if count % 12 == 0 { fputs(\"frame \\(count)/\\(total)\\n\", stderr) }\n  }\n  func drain(upTo limit: Int) throws {\n    while next < hi && next <= limit {\n      try emit(next)\n      next += 1\n      for key in window.keys where key < next - span { window[key] = nil }\n    }\n  }\n  while !failed(), let sample = output.copyNextSampleBuffer() {\n    do {\n      let stop: Bool = try autoreleasepool {\n        guard let pb = CMSampleBufferGetImageBuffer(sample) else { return false }\n        let t = CMTimeGetSeconds(CMSampleBufferGetPresentationTimeStamp(sample))\n        let index = Int(((t - origin) * fps).rounded())\n        if index >= last { return true }\n        if index < first || window[index] != nil { return false }\n        let handler = VNImageRequestHandler(cvPixelBuffer: pb, options: [:])\n        var mask: CIImage? = nil\n        if person {\n          try handler.perform([seg])\n          if let o = seg.results?.first { mask = CIImage(cvPixelBuffer: o.pixelBuffer) }\n        } else if #available(macOS 14.0, *) {\n          let req = VNGenerateForegroundInstanceMaskRequest()\n          try handler.perform([req])\n          if let o = req.results?.first, !o.allInstances.isEmpty {\n            mask = CIImage(cvPixelBuffer: try o.generateScaledMaskForImage(forInstances: o.allInstances, from: handler))\n          }\n        }\n        var cover = [UInt8](repeating: 0, count: pixels)\n        var image: CIImage? = nil\n        if let m = mask {\n          var full = m.transformed(by: CGAffineTransform(scaleX: CGFloat(W) / m.extent.width, y: CGFloat(H) / m.extent.height)).cropped(to: bounds)\n          if grow > 0 { full = full.applyingFilter(\"CIMorphologyMaximum\", parameters: [kCIInputRadiusKey: grow]).cropped(to: bounds) }\n          cover.withUnsafeMutableBytes { ctx.render(full, toBitmap: $0.baseAddress!, rowBytes: W, bounds: bounds, format: .L8, colorSpace: nil) }\n          image = full\n        }\n        window[index] = (t, cover, image)\n        try drain(upTo: index - span)\n        return false\n      }\n      if stop { break }\n    } catch {\n      fail(error.localizedDescription)\n    }\n  }\n  if reader.status == .reading { reader.cancelReading() }\n  if reader.status == .failed { fail(reader.error?.localizedDescription ?? \"The render could not be read.\") }\n  if !failed() { do { try drain(upTo: Int.max) } catch { fail(error.localizedDescription) } }\n}\nlet chunk = (total + workers - 1) / workers\nlet group = DispatchGroup()\nfor k in 0..<workers {\n  let lo = k * chunk, hi = min(total, lo + chunk)\n  if lo >= hi { continue }\n  group.enter()\n  Thread.detachNewThread { work(lo, hi); group.leave() }\n}\ngroup.wait()\nwrites.waitUntilAllOperationsAreFinished()\nif let e = failure { fputs(\"\\(e)\\n\", stderr); exit(6) }\n// The render can hold a frame or two fewer than its nominal length; a gap inside it is a read error.\nlet count = (rows.keys.max() ?? -1) + 1\nif count == 0 { fputs(\"No frames could be read from the render.\\n\", stderr); exit(6) }\nif rows.count != count { fputs(\"Frames \\(count - rows.count) of \\(count) could not be read from the render.\\n\", stderr); exit(6) }\nlet frames = (0..<count).map { [\"t\": rows[$0]!.t, \"png\": rows[$0]!.png] as [String: Any] }\nlet result: [String: Any] = [\"version\": 4, \"width\": lw, \"height\": lh, \"fps\": fps, \"frames\": frames, \"misses\": misses, \"filled\": filled, \"matteWidth\": W, \"matteHeight\": H, \"count\": count, \"mode\": person ? \"person\" : \"foreground\", \"grow\": grow, \"workers\": workers]\ntry JSONSerialization.data(withJSONObject: result).write(to: outDir.appendingPathComponent(\"layout.json\"), options: .atomic)\nfputs(\"frame \\(count)/\\(count)\\nPrepared \\(count) speaker masks; \\(misses) without a detected speaker; \\(filled) frames bridged.\\n\", stderr)\n";
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
function depthIsCaptionClip(clip) {
  try {
    const j = clip.toJSON?.();
    return j?.name === "Depth Type Captions" || j?.mediaReferences?.defaultMedia?.name === "Depth Type Captions";
  } catch {
    return false;
  }
}
function depthBase(sequence, excluded) {
  const skip = new Set((excluded || []).filter(Boolean).map((r) => r.trackId + ":" + r.clipId));
  const tracks = sequence
    .getTracks()
    .filter((t) => !t.isCaptionTrack())
    .map((t) => {
      const v = t.clone();
      const ids = new Set(v.getClips().filter((c) => skip.has(t.getId() + ":" + c.getId()) || depthIsCaptionClip(c)).map((c) => c.getId()));
      if (ids.size) v.removeClipsByIds(ids);
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
async function depthCurrentKey(sid, excluded) {
  const { di, libraryId } = depthDI();
  if (typeof di.SequenceRepository?.findById !== "function")
    throw new Error("Sequence service unavailable.");
  const s = await di.SequenceRepository.findById(libraryId, sid);
  if (!s) throw new Error("Draft unavailable.");
  return depthBase(s, excluded).key;
}
// Selects 2.0.508 lets procedural renders read plug-in mask files; older hosts
// would silently drop every behind-speaker word.
const DEPTH_MIN_HOST = "2.0.508";
// Windows has no speaker detector this panel can run on the machine, so its masks
// come from Selects generation (depthPrepareCloudMasks). Selects 2.0.512 sends the
// render from, and saves the result into, this plug-in's data folder.
const DEPTH_CLOUD_MASKS = /Windows/i.test(navigator.userAgent);
const DEPTH_CLOUD_MIN_HOST = "2.0.512";
// The cloud model finds people only; desks and props never hide text there.
const depthSubject = (settings) => (DEPTH_CLOUD_MASKS || settings.subject === "person" ? "person" : "foreground");
function depthHostVersion() {
  try {
    return String(window.parent.__DI__?.Runtime?.getHostingVersion?.() || "") || null;
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
  const fs = depthDI().di.FileSystem;
  return fs.join(fs.homedir(), ".selects", "plugin-data", "depth-type-captions");
}
function depthMaskDraftDir(pid, sid) {
  const fs = depthDI().di.FileSystem;
  return fs.join(depthPluginRoot(), "masks", String(pid), String(sid));
}
async function depthPrepareVideo(pid, sid, excluded, control, progress, geometry, outputPath) {
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
  const base = depthBase(source, excluded),
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
  const path = outputPath;
  let saved = false;
  try {
    if (control.canceled) throw new Error("Canceled.");
    await di.SequenceRepository.save(copy, "depth-type-preview");
    saved = true;
    progress("Rendering the draft at full size…");
    // The host snapshot carries clip transforms/effects into the export compositor.
    // Omitting it renders untransformed footage even when the native timeline is cropped.
    const overlaySnapshot = await di.RemotionOverlay.getSnapshotForExport(copyId, copy, project);
    const resourceIds = [...project.getResources()];
    const sourceRevision = await depthSourceRevision(app, di, libraryId, copyId, resourceIds);
    const job = await di.WorkflowClient.start({
      type: "export:video",
      input: {
        resolution: depthRenderPreset(geometry),
        title: "Depth Type preview",
        // The speaker is found in this render; it is not a video for the user, so
        // hosts that know the flag raise no "Video is ready" dialog for it.
        internal: true,
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
const depthQuote = (v) => "'" + String(v).replace(/'/g, "'\\''") + "'";
async function depthReadText(fs, path) {
  return fs.existsSync(path) ? String(await fs.readFile(path, "utf8")) : "";
}
// Full-resolution speaker masks, one PNG per draft frame, made on this Mac. The
// job runs in its own session: the host ends each shell call's process group,
// and a long draft can outlast one shell call.
// Full-resolution mattes keep Vision's soft edge; growing it leaves a band of background
// around hair and hands. (maskGrow still spaces lines from the speaker in the layout.)
const DEPTH_MATTE_GROW = 0;
// Masks from an older tool are made again (v4 restores objects the detector drops for a few frames).
const DEPTH_MATTE_VERSION = 4;
async function depthPrepareMasks(sdk, preview, settings, job, progress, control) {
  const fs = depthDI().di.FileSystem;
  const binDir = fs.join(job.root, "bin"),
    source = fs.join(binDir, "depth-type-mattes-v4.swift"),
    tool = fs.join(binDir, "depth-type-mattes-v4"),
    at = (name) => fs.join(job.dir, name);
  const grow = DEPTH_MATTE_GROW;
  const subject = depthSubject(settings);
  if ((await depthReadText(fs, source)) !== DEPTH_MASK_SOURCE) await fs.writeFile(source, DEPTH_MASK_SOURCE);
  await fs.writeFile(
    at("run.sh"),
    [
      "cd " + depthQuote(job.dir),
      // The launching shell call's scratch TMPDIR is deleted when that call returns.
      "mkdir -p tmp && export TMPDIR=\"$PWD/tmp\"",
      "if [ ! -x " + depthQuote(tool) + " ] || [ " + depthQuote(source) + " -nt " + depthQuote(tool) + " ]; then",
      "  swiftc -O " + depthQuote(source) + " -o " + depthQuote(tool + ".tmp") + " 2> build.log && mv -f " + depthQuote(tool + ".tmp") + " " + depthQuote(tool) +
        " || { echo 'The mask tool did not compile. Install the Xcode Command Line Tools (xcode-select --install).' > error.txt; echo error > state; exit 1; }",
      "fi",
      depthQuote(tool) + " " + depthQuote(preview.path) + " " + depthQuote(job.dir) + " " + preview.width + " " + preview.height + " " + subject + " " + grow +
        " 100000000 2> progress.log || { tail -n 3 progress.log > error.txt; echo error > state; exit 1; }",
      "rm -rf tmp",
      "echo done > state",
    ].join("\n") + "\n",
  );
  const launch = await sdk.runShell({
    summary: "Start speaker masks",
    cwd: job.dir,
    timeoutMs: 20000,
    maxOutputBytes: 2000,
    command:
      "rm -f state error.txt progress.log; python3 -c " +
      depthQuote("import os,subprocess\nos.setsid()\nopen('pgid','w').write(str(os.getpgid(0)))\nsubprocess.Popen(['/bin/zsh','run.sh'],stdin=subprocess.DEVNULL,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)"),
  });
  if (launch.isError || launch.exitCode !== 0) throw new Error(launch.stderr || launch.output || "The speaker mask job did not start.");
  control.stop = () =>
    sdk.runShell({ summary: "Stop speaker masks", cwd: job.dir, timeoutMs: 10000, command: "kill -TERM -$(cat pgid) 2>/dev/null; echo canceled > state" });
  try {
    let last = "", changed = Date.now();
    for (;;) {
      if (control.canceled) {
        await control.stop();
        throw new Error("Canceled.");
      }
      await new Promise((r) => setTimeout(r, 400));
      const state = (await depthReadText(fs, at("state"))).trim();
      if (state === "done") break;
      if (state === "error") throw new Error((await depthReadText(fs, at("error.txt"))).trim() || "Speaker masks failed.");
      if (state === "canceled") throw new Error("Canceled.");
      const tick = (await depthReadText(fs, at("progress.log"))).match(/frame (\d+)\/(\d+)\s*$/);
      if (tick && tick[0] !== last) {
        last = tick[0];
        changed = Date.now();
        progress("Speaker masks · " + tick[1] + " / " + tick[2] + " frames");
      } else if (!tick) progress("Preparing the mask tool…");
      if (Date.now() - changed > 180000) {
        await control.stop();
        throw new Error("Speaker masks stopped making progress. Try again.");
      }
    }
  } finally {
    control.stop = null;
  }
  return depthMaskResult(fs, preview, job);
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
    base: fs.pathToLocalURL(job.dir).replace(/\/+$/, ""),
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
// veed/video-background-removal/fast through Selects generation: people only, edge
// refinement off (it recolours the subject, which a mask never uses), and H.264,
// which returns the alpha alone. It takes the whole draft in one request.
const DEPTH_CLOUD_MODEL = "model_v1_dmVlZC92aWRlby1iYWNrZ3JvdW5kLXJlbW92YWwvZmFzdA";
const DEPTH_CLOUD_FAILED = new Set(["failed", "cancelled", "input_failed", "submission_rejected", "upload_failed", "handoff_failed"]);
function depthCloudMessage(code) {
  if (code === "insufficient_credits") return "Not enough Selects credits to make speaker masks.";
  if (code === "generation_disabled") return "Speaker masks on Windows use Selects generation, which this account cannot use yet. Turn off Behind speaker for plain captions.";
  if (code === "generation_update_required") return "Behind speaker needs Selects " + DEPTH_CLOUD_MIN_HOST + " or later. Update Selects, or turn off Behind speaker under Fine-tune.";
  return "Speaker masks failed" + (code ? " (" + code + ")" : "") + ". Try again.";
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
async function depthPrepareCloudMasks(sdk, preview, pid, job, progress, control) {
  const { di, libraryId } = depthDI(), fs = di.FileSystem, mg = di.MediaGeneration;
  if (!mg?.supportsPluginFiles?.()) throw new Error(depthCloudMessage("generation_update_required"));
  const scope = { libraryId, projectId: pid };
  progress("Sending the draft for speaker masks…");
  let jobId;
  try {
    jobId = (
      await mg.submit({
        scope,
        // One request per mask folder: resending after a reload admits nothing new.
        key: "dtc-" + fs.basename(job.dir),
        modelId: DEPTH_CLOUD_MODEL,
        input: { video_url: "selects-input:source", output_codec: "h264", refine_foreground_edges: false, subject_is_person: true },
        inputMediaSeconds: { video: preview.duration },
        uploads: { source: { pluginFile: preview.path } },
        delivery: { pluginFolder: fs.join(job.dir, "cloud") },
        outputName: "speaker-masks",
        batch: 1,
        origin: { tool: "video", tab: "depth-type-captions", recipeId: "speaker-masks" },
      })
    ).jobIds[0];
  } catch (e) {
    throw new Error(depthCloudMessage(e?.code || e?.message));
  }
  control.stop = () => mg.cancel(scope, jobId).catch(() => {});
  const started = Date.now();
  let alpha = null;
  try {
    for (;;) {
      if (control.canceled) {
        await control.stop();
        throw new Error("Canceled.");
      }
      await new Promise((r) => setTimeout(r, 1000));
      const j = (await mg.list(scope)).find((x) => x.jobId === jobId);
      if (!j) continue;
      if (j.deliveryStatus === "delivered") {
        alpha = j.outputs.find((o) => o.path)?.path;
        break;
      }
      if (DEPTH_CLOUD_FAILED.has(j.status) || ["download_failed", "result_collection_failed"].includes(j.deliveryStatus)) throw new Error(depthCloudMessage(j.errorCode));
      const seconds = Math.round((Date.now() - started) / 1000);
      progress((["preparing", "uploading", "submitting"].includes(j.status) ? "Uploading the draft for speaker masks" : "Making speaker masks with Selects generation") + " · " + seconds + " s");
      if (Date.now() - started > 20 * 60000) {
        await control.stop();
        throw new Error("Speaker masks took too long. Try again.");
      }
    }
  } finally {
    control.stop = null;
  }
  if (!alpha) throw new Error("No speaker masks came back. Try again.");
  // Full-size mattes, white where words show, and the 384-wide frames the layout
  // reads, in one pass. Double quotes read the same in cmd.exe and zsh.
  progress("Writing speaker mask files…");
  const lw = 384, lh = Math.max(1, Math.round((lw * preview.height) / preview.width)), small = fs.join(job.dir, "layout");
  fs.mkdirSync(small, { recursive: true });
  const q = (p) => '"' + p + '"';
  const made = await sdk.runShell({
    summary: "Make speaker mask files",
    cwd: job.dir,
    timeoutMs: 600000,
    maxOutputBytes: 4000,
    command:
      "ffmpeg -v error -y -i " + q(alpha) + ' -filter_complex "[0:v]format=gray,negate,split=2[a][b];[b]scale=' + lw + ":" + lh + ':flags=area[c]" -map "[a]" ' +
      q(fs.join(job.dir, "matte_%06d.png")) + ' -map "[c]" ' + q(fs.join(small, "l_%06d.png")),
  });
  if (made.isError || made.exitCode !== 0) throw new Error((made.stderr || made.output || "").trim() || "The speaker mask files could not be written.");
  const names = fs.readdirSync(small).map(String).filter((n) => /^l_\d{6}\.png$/.test(n)).sort();
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
  fs.rmSync(small, { recursive: true, force: true });
  const layout = { version: DEPTH_MATTE_VERSION, width: lw, height: lh, fps: preview.fps, frames, misses, filled: 0, matteWidth: preview.width, matteHeight: preview.height, count: frames.length, mode: "person", grow: 0, source: "cloud" };
  await fs.writeFile(fs.join(job.dir, "layout.json"), JSON.stringify(layout));
  return depthMaskResult(fs, preview, job);
}
async function depthLoadLayoutMask(files) {
  const fs = depthDI().di.FileSystem;
  const layout = JSON.parse(await depthReadText(fs, fs.join(files.dir, "layout.json")));
  if (!layout.frames?.length) throw new Error("The speaker mask files are gone. Choose Redo.");
  return { width: layout.width, height: layout.height, fps: layout.fps, frames: layout.frames, misses: layout.misses || 0, canvasWidth: files.canvasWidth, canvasHeight: files.canvasHeight, sourceKey: files.sourceKey };
}
// Mask folders take ~3 MB per second of 1080p video. Keep the saved one and the
// one before it (for Undo); drop the rest of this draft's folders.
async function depthPruneMasks(sdk, pid, sid, keep) {
  const fs = depthDI().di.FileSystem, dir = depthMaskDraftDir(pid, sid);
  let names = [];
  try {
    names = fs.readdirSync(dir).map(String);
  } catch {
    return;
  }
  const kept = new Set(keep.filter(Boolean).map((d) => fs.basename(d)));
  for (const n of names.filter((n) => !kept.has(n))) fs.rmSync(fs.join(dir, n), { recursive: true, force: true });
}
// Clip refs of b-roll and cards placed by earlier versions of this panel; captions
// keep stepping aside for them.
function depthCutawayRefs(pid, sid) {
  try {
    const placed = JSON.parse(localStorage.getItem(DEPTH_TAG + ":broll:" + pid + ":" + sid) || "{}")?.placed;
    return Array.isArray(placed) ? placed.map(({ clipId, trackId }) => ({ clipId, trackId })) : [];
  } catch {
    return [];
  }
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
const listed=typeof (d as any).motionGraphics==="function"?(await (d as any).motionGraphics()).filter((g:any)=>g.name==="Depth Type Captions").map((g:any)=>g.clip):[];
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
    v.onended=()=>callbacks.current.onEnded();v.onerror=()=>callbacks.current.onError('Preview video could not load. Choose Redo.');
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
        if (job.current.workflowId) window.parent.__DI__?.WorkflowClient?.cancel(job.current.workflowId);
      }
    };
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify({ settings, plan, owned, summary, masks: maskFiles, savedMasks }));
    } catch {
      setStatus("Local storage is full; this panel cannot remember the captions between sessions.");
    }
  }, [settings, plan, owned, summary, maskFiles, savedMasks]);
  // Reopening the panel keeps the last full-size render as the preview video.
  useEffect(() => {
    if (!maskFiles?.render) return;
    try {
      const fs = depthDI().di.FileSystem;
      if (!fs.existsSync(maskFiles.render)) return;
      setPreview({ path: maskFiles.render, url: fs.pathToLocalURL(maskFiles.render), sourceKey: maskFiles.sourceKey, duration: maskFiles.duration, fps: maskFiles.fps, width: maskFiles.canvasWidth, height: maskFiles.canvasHeight });
      depthLoadLayoutMask(maskFiles).then((m) => alive.current && setMask((current) => current || m)).catch(() => {});
    } catch {}
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
  // A cleared line is left out when saving; a phrase with no lines left is dropped.
  const cleanPlan = (ps) => ps.map((p) => ({ ...p, layers: p.layers.filter((l) => String(l.text || "").trim()).map(({ front, ...l }) => l) })).filter((p) => p.layers.length);
  const composeFromWords = (words, meta) => {
    const next = depthPlanWords(words, meta.fps, meta.duration),
      w = meta.width || W,
      hh = meta.height || H;
    return depthReferenceComposition(depthRestoreTypography(next, w, hh, settings), w, hh, settings);
  };
  // Everything this panel placed: never part of the speaker render or its key.
  const excludedRefs = (ownedRef = owned) => [ownedRef, ...depthCutawayRefs(pid, sid)];
  const newMaskJob = async () => {
    const fs = depthDI().di.FileSystem,
      root = depthPluginRoot(),
      dir = fs.join(depthMaskDraftDir(pid, sid), Date.now().toString(36) + Math.random().toString(36).slice(2, 6));
    try {
      fs.mkdirSync(dir, { recursive: true });
      fs.mkdirSync(fs.join(root, "bin"), { recursive: true });
    } catch (e) {
      throw new Error("Could not create the mask folder: " + (e?.message || e));
    }
    return { root, dir };
  };
  // Full-size render of the draft, then speaker masks from it.
  const makeSpeakerMasks = async (meta, control, progress) => {
    depthRequireHost();
    const fs = depthDI().di.FileSystem, maskJob = await newMaskJob();
    const p = await depthPrepareVideo(pid, sid, excludedRefs(), control, progress, meta, fs.join(maskJob.dir, "render.mp4"));
    if (control.canceled) throw new Error("Canceled.");
    if (alive.current) {
      setPreview(p);
      setMask(null);
    }
    const made = DEPTH_CLOUD_MASKS
      ? await depthPrepareCloudMasks(sdk, p, pid, maskJob, progress, control)
      : await depthPrepareMasks(sdk, p, settings, maskJob, progress, control);
    if (alive.current && !control.canceled) {
      setMask(made.mask);
      setMaskFiles(made.files);
    }
    return made;
  };
  // Masks are reused while the footage, canvas and speaker setting are what they were made from.
  const maskIsCurrent = async (meta) => {
    if (!maskFiles || maskFiles.canvasWidth !== meta.width || maskFiles.canvasHeight !== meta.height) return false;
    if ((maskFiles.subject || "foreground") !== depthSubject(settings) || (maskFiles.grow || 0) !== DEPTH_MATTE_GROW || (maskFiles.version || 0) !== DEPTH_MATTE_VERSION) return false;
    try {
      const fs = depthDI().di.FileSystem;
      if (!fs.existsSync(fs.join(maskFiles.dir, "matte_" + String(maskFiles.count).padStart(6, "0") + ".png"))) return false;
      return (await depthCurrentKey(sid, excludedRefs())) === maskFiles.sourceKey;
    } catch {
      return false;
    }
  };
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
    if (job.current.workflowId) window.parent.__DI__?.WorkflowClient?.cancel(job.current.workflowId);
    setStatus("Cancel requested. The current step stops within a few seconds.");
  };
  // Make and Redo: dialogue → speaker masks (reused while the footage is unchanged) →
  // lines placed around the speaker → one caption clip on the timeline.
  const make = () =>
    run("Reading dialogue…", async () => {
      const control = { canceled: false, workflowId: null, stop: null };
      job.current = control;
      const progress = (s) => {
        if (alive.current) setStatus(s);
      };
      const before = { owned, savedMasks, summary, plan: lastSaved.current };
      try {
        const r = await sdk.runScript({ script: depthReadScript(pid, sid), summary: "Read dialogue for Depth Type captions", allowCommit: false });
        if (r.isError || !r.result) throw new Error(r.output || "No draft data returned.");
        const meta = r.result;
        let next = composeFromWords(meta.words, meta);
        if (!next.length) throw new Error("No dialogue found in this draft.");
        if (alive.current) {
          setInfo(meta);
          setPlan(next);
          setSelected(0);
          setLayerIndex(0);
          setTime(next[0]?.start || 0);
        }
        let files = null, around = 0;
        if (settings.depth) {
          depthRequireHost();
          let layoutMask;
          if (await maskIsCurrent(meta)) {
            files = maskFiles;
            layoutMask = mask || (await depthLoadLayoutMask(maskFiles));
            if (alive.current && !mask) setMask(layoutMask);
          } else {
            const made = await makeSpeakerMasks(meta, control, progress);
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
          if (alive.current) setPlan(next);
        } else {
          const placed = [];
          for (const p of next) placed.push(await depthFallbackPlacement(p, settings, meta.width, meta.height, null));
          next = placed;
          if (alive.current) setPlan(next);
        }
        if (control.canceled) throw new Error("Canceled.");
        progress("Saving captions…");
        const savePlan = cleanPlan(next);
        const ar = await sdk.runScript({ summary: "Apply Depth Type captions", allowCommit: true, script: depthApplyScript(pid, sid, savePlan, settings, files, owned, depthCutawayRefs(pid, sid)).script });
        if (ar.isError || !ar.result?.owned) throw new Error(ar.output || "Captions were not confirmed on the timeline.");
        const done = { phrases: savePlan.length, around, masks: files?.count || 0, width: files?.width || 0, height: files?.height || 0 };
        if (alive.current) {
          setOwned(ar.result.owned);
          setSavedMasks(files?.dir || null);
          lastSaved.current = ar.result.trimmed ? depthBoundPlan(savePlan, ar.result.duration).plan : savePlan;
          if (ar.result.trimmed) setPlan(lastSaved.current);
          setSummary(done);
          setEdited(false);
          setUndo({ id: ar.result.commitId, ...before, owned: ar.result.recovered ? null : before.owned });
          setStatus(
            "Done. " + describe(done) + "." +
              (files && done.around < done.phrases ? " The other " + (done.phrases - done.around) + " keep their smaller lines in front of the speaker." : "") +
              (files ? " Words behind the speaker use " + files.count + " full-size masks (" + files.width + " × " + files.height + ")" + (files.misses ? "; " + files.misses + " frames without a detected speaker hide them" : "") + "." : "") +
              saveNote(ar.result),
          );
        }
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
      const built = depthApplyScript(pid, sid, savePlan, settings, files, owned, depthCutawayRefs(pid, sid));
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
    { style: { display: "grid", gap: 6, maxHeight: wide ? 520 : 200, overflow: "auto", alignContent: "start" } },
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
    DEPTH_CLOUD_MASKS
      ? h("small", null, "On Windows, speaker masks come from Selects generation and use credits. They find people only: desks and props never hide text.")
      : select("In front of the text", settings.subject || "foreground", (v) => updateSettings({ subject: v }), [
          ["foreground", "Everything in front (people, hands, mics, desks)"],
          ["person", "People only (desks and props never hide text)"],
        ]),
    DEPTH_CLOUD_MASKS ? null : h("small", null, "A new speaker setting takes effect on Redo."),
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
