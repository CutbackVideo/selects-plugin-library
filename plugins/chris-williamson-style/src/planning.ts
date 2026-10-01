export type UpdateScope = "preserve" | "captions" | "broll" | "all";
export type Cue = { id: string; kind: "phrase" | "keyword"; start: number; end: number; text: string; wordStartsSeconds: number[]; key?: Key };
export function captionCues(words: W[], keys: Key[], fps: number, endFrame: number): Cue[] {
  const windowOf = (k: Key) => [k.start, k.until ?? k.end] as const;
  // A word spoken while a keyword is on screen (its own frames plus the hold) cannot be shown then; it is
  // revealed the moment the phrase returns. The keyword's own words are the big text and never phrase words.
  const covering = (w: W) => keys.find(k => w.startFrame >= k.start && w.startFrame < windowOf(k)[1]);
  const reveal = (w: W) => { const k = covering(w); return k ? windowOf(k)[1] : w.startFrame; };
  const isKeyWord = (w: W) => keys.some(k => w.startFrame >= k.start && w.startFrame < k.end);
  // Keyword words stay in the stream while phrases are formed (a sentence still ends where it ends) and
  // leave it afterwards.
  const spoken = words.filter(w => !w.nonSpeech && w.text.trim());
  const groups: W[][] = [];
  for (const w of spoken) {
    let g = groups[groups.length - 1];
    const prev = g?.[g.length - 1];
    if (!g || g.length >= 6 || g.map(x => x.text).join(" ").length + w.text.length + 1 > 32 || /[.!?]["']?$/.test(prev.text) || (w.startFrame - prev.endFrame) / fps > 0.55) groups.push(g = []);
    g.push(w);
  }
  const cues: Cue[] = [];
  // Words a keyword pushed past the end of their own phrase (the next phrase starts as the hold ends) are
  // carried into the next phrase instead of being dropped.
  let carry: W[] = [];
  const phraseWords = groups.map(g => g.filter(w => !isKeyWord(w)));
  for (let i = 0; i < groups.length; i++) {
    const g = [...carry, ...phraseWords[i]];
    if (!g.length) continue;
    carry = [];
    const start = Math.min(...g.map(reveal));
    const following = phraseWords.slice(i + 1).find(x => x.length);
    const next = following ? reveal(following[0]) : endFrame;
    const end = Math.min(endFrame, next, g[g.length-1].endFrame + Math.round(0.6 * fps));
    let ranges = [[start, end]];
    for (const k of keys) {
      const [ks, ke] = windowOf(k);
      ranges = ranges.flatMap(([a,b]) => ke <= a || ks >= b ? [[a,b]] : [[a,Math.min(b,ks)],[Math.max(a,ke),b]].filter(([x,y])=>y>x));
    }
    let shownUntil = -Infinity;
    for (const [a,b] of ranges) {
      // Each clip lays out exactly the words it will reveal, so they fill in without moving and the line
      // stays centred; a clip after a keyword holds only the words not shown yet, so the ones the viewer
      // already read do not come back.
      const ws = g.filter(w => reveal(w) >= shownUntil && reveal(w) < b);
      if (!ws.length) continue;
      cues.push({id:`phrase:${g[0].startFrame}:${a}`,kind:"phrase",start:a,end:b,text:ws.map(w=>w.text).join(" "),wordStartsSeconds:ws.map(w=>Math.max(0,reveal(w)-a)/fps)});
      shownUntil = b;
    }
    if (i < groups.length - 1) carry = g.filter(w => reveal(w) >= shownUntil && reveal(w) >= next);
  }
  for (const k of keys) if ((k.until ?? k.end)>k.start) cues.push({id:`keyword:${k.start}`,kind:"keyword",start:k.start,end:Math.min(endFrame,k.until ?? k.end),text:k.text,wordStartsSeconds:[0],key:k});
  return cues.sort((a,b)=>a.start-b.start);
}
export function categoryOf(label: string): string | null {
  if (!label.startsWith(PREFIX)) return null;
  if (/\[cws:(phrase|keyword):/.test(label) || label === PREFIX+"Captions") return "captions";
  if (/\[cws:inversion:/.test(label)) return "inversion";
  if (/\[cws:broll:/.test(label) || label === PREFIX+"B-roll") return "broll";
  if (/\[cws:music\]/.test(label)) return "music";
  if (label === PREFIX+"Look") return "look";
  return null;
}
export function shouldReplace(category: string, scope: UpdateScope) { return ["captions","broll","look","inversion","music"].includes(category) && (scope === "all" || category === scope || category === "inversion" && scope !== "preserve"); }
const cueLabel = (id: string, text = "") => PREFIX + text.slice(0,64) + ` [cws:${id}]`;
const CAPTION_V2_PARAMS = [
  {key:"text",label:"Text",type:"text",defaultValue:""},
  {key:"fontSize",label:"Size",type:"number",defaultValue:53,min:12,max:300,step:1},
  {key:"fontFamily",label:"Font",type:"text",defaultValue:"Chris Reference Inter"},
  {key:"fontWeight",label:"Weight",type:"select",defaultValue:"800",options:[{label:"Bold",value:"700"},{label:"Extra Bold",value:"800"},{label:"Black",value:"900"}]},
  {key:"captionY",label:"Position Y (%)",type:"number",defaultValue:50,min:0,max:100,step:1},
  {key:"color",label:"Color",type:"color",defaultValue:"#ffffff"},
  {key:"trackingEm",label:"Letter spacing",type:"number",defaultValue:-0.03,min:-0.1,max:0.2,step:0.01},
  {key:"dimSeconds",label:"New word grey (seconds)",type:"number",defaultValue:0.1,min:0,max:1,step:0.01},
  {key:"dimOpacity",label:"New word grey opacity",type:"number",defaultValue:0.55,min:0,max:1,step:0.05},
];
// Footage keywords only: how the inverted picture inside the letters is treated.
const KEYWORD_FILL_PARAMS = [
  {key:"fillWhite",label:"Letter white wash",type:"number",defaultValue:0,min:0,max:1,step:0.02},
  {key:"fillBrightness",label:"Letter fill brightness",type:"number",defaultValue:1,min:0.2,max:1.6,step:0.05},
  {key:"fillBlur",label:"Letter fill blur (px)",type:"number",defaultValue:10,min:0,max:40,step:1},
];
const FOOTAGE_KEYWORD_PARAMS = [...CAPTION_V2_PARAMS.filter(p=>!['dimSeconds','dimOpacity','color'].includes(p.key)),...KEYWORD_FILL_PARAMS];

// The letters always show the inverted footage (Hyun: no white fallback). Only on neutral, light footage,
// where inversion lands on a mid grey close to the picture, the inverted fill is darkened so it still reads.
export function keywordFill(band:{y:number;sat:number}|null) {
  if(!band)return {};
  if(band.sat<45&&band.y>140)return {fillBrightness:0.55};
  return {};
}

// Read the public persisted parameter envelope; all edits still go through runScript.
export function readKeywordCarry(core:any,item:any,cue:Cue) {
  let clip:any;const visit=(v:any)=>{if(!v||typeof v!=='object')return;if(v.schema==='Cutback.Clip.2'&&v.id===item.clipId)clip=v;for(const value of Object.values(v))if(value&&typeof value==='object')visit(value);};visit(core.sequenceJson);
  const effect=clip?.effects?.find((e:any)=>e.name===item.label);
  const params=effect?.metadata?.['cutback.editableParameters'];
  if(!params||params.schema!=='Cutback.EditableParameters.1')throw Error('Cannot read the edited footage keyword; no B-roll was replaced.');
  if(clip.intrinsicVideoAdjustments || clip.effects.some((e:any)=>e.name!==item.label&&e.name!==PREFIX+'Double inversion'))throw Error('This footage keyword has additional visual edits. Keep my edits preserves it; replacing captions explicitly resets it before replacing B-roll.');
  if(effect.enabled!==true)throw Error('The footage keyword effect was disabled. Keep my edits preserves it; replace captions explicitly before replacing B-roll.');
  const carry:any={};for(const def of FOOTAGE_KEYWORD_PARAMS)if(params.values[def.key]!==undefined)carry[def.key]=params.values[def.key];
  return carry;
}

export function reviewIssues(result:any,fallback:string):string[] {
  if(result?.ok===true)return [];
  const issues=Array.isArray(result?.issues)?result.issues.filter((x:any)=>typeof x==='string'&&x.trim()):[];
  return issues.length?issues:[fallback];
}
