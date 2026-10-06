// @name DOAC Style
// @collection visual-highlights
// @icon captions
// Create expressive, speech-timed captions on a separate editable draft.
import React,{useState,useEffect,useRef} from "react";
const PLAN_VERSION="v5-llm-editor";
const CONNECTOR_WORDS=new Set(["a","an","and","as","at","but","by","for","from","if","in","into","of","on","or","so","the","that","this","to","with","you","we","it"]);
function planningPrompt(input,catalogue){
 const templates=catalogue.templates.map(function(t){
  const slots=t.slotMetrics?.map(function(m,i){return String(i)+":"+m.text+" ("+(m.width||0)+"x"+(m.height||0)+", font "+(m.fontIndex||0)+")";}).join(" | ")||t.slots.map(function(x,i){return String(i)+":"+x;}).join(" | ");
  return [t.id,t.name,"condition: "+(t.condition||"general"),"score: "+(t.score||"n/a"),"slots: "+slots].join(" · ");
 }).join("\\n");
 const transcript=input.words.map(function(w,i){return String(i)+"="+w.text+" ["+w.start+"-"+w.end+"]";}).join("\\n");
 return [
  "You are the editorial director for DOAC Style, a premium short-form talking-head caption system.",
  "Read the entire transcript twice: first for meaning and rhetoric, then for timing and typography. Build the complete caption edit, not just a list of highlighted words.",
  "",
  "Return ONLY one compact JSON object:",
  '{"captions":[{"from":0,"to":6,"kind":"emphasis","template":"22","slots":[[0,1],[2,4],[5,6]],"focusSlot":2},{"from":7,"to":13,"kind":"plain"}]}',
  "",
  "Rules for every caption:",
  "- Use inclusive zero-based word indices.",
  "- Cover every transcript word exactly once, in ascending spoken order. No omissions, duplicates, invented words, or reordering.",
  "- Keep a caption to 2-8 words and one clear spoken unit. Attach short connectors to the phrase they belong to. If the ASR has a broken or repeated phrase, keep the fragment with its nearest complete phrase and place the next caption at a real pause; never make a caption that reads like an isolated fragment.",
  '- Never start or end a caption with a stranded connector such as "and", "of", "with", "to", "in", "but", "or", "a", or "the".',
  "- Respect punctuation and pauses as natural boundaries. Do not cut a noun from its verb, a preposition from its object, or an adjective from its noun. Prefer a slightly longer plain caption over a grammatically stranded two-word fragment.",
  '- Use "kind":"plain" for natural speech that should breathe. Plain captions have no template or slots.',
  '- Use "kind":"emphasis" for the most meaningful editorial beats, not every noun. Use 8-12 emphasis scenes across the whole video and cover roughly 35-45% of the words.',
  "- The opening 12 words must contain a compact hook. Place later emphasis at the central contrast, the strongest claim, and the closing idea. Leave ordinary breathing space between emphasis scenes.",
  "- Do not reuse the same template more than twice unless the transcript genuinely demands it. Use higher-energy templates when the idea supports them, while keeping the whole video varied and coherent.",
  "- For an emphasis scene, choose one approved template below. Its slots must cover the scene's words exactly once when sorted by their first index. The slot array is visual slot order, so it may differ from spoken order when the reference composition requires it.",
  "- Put the most important noun, verb, or contrast in the template's visually dominant slot. Set focusSlot to that visual slot index. Do not put a filler connector in focusSlot.",
  "- Preserve the source word casing and punctuation through the word indices. The renderer controls the template's approved casing and color treatment.",
  "- Template 05 is only for a spoken number/count at the start of its phrase. It requires five spoken slots, with the first slot containing that single number.",
  "- Template 19 is only for an actual question. Template 32 is only for a visible reaction and is not in this approved pool. Template 34 is only for playful/casual copy and is not in this approved pool. Do not use a template just because it is available.",
  "- If no approved template fits, use a plain caption instead of forcing a bad composition. Before choosing plain, check whether another approved template with the same slot count can carry the phrase cleanly.",
  '- Do not return explanations, rationale, markdown, or any key other than "captions".',
  "",
  "Approved template catalogue:",
  templates,
  "",
  "Transcript:",
  transcript
 ].join("\\n");
}
function cleanPlanWord(text){return String(text||"").replace(/(?<!\d)[.,]|[.,](?!\d)|["”“]/g,"").trim();}
function planWordText(words,a,z){return words.slice(a,z+1).map(function(w){return cleanPlanWord(w.text);}).join(" ");}
function appendPlain(words,a,z,out){
 while(a<=z){
  // ASR occasionally leaves a duplicated preposition around a date or clause
  // (for example, “of this evolution of in 2023”). Keep the visual break at the
  // repeated connector instead of turning the whole fragment into a bold layout.
  const repeatConnector=Array.from({length:Math.max(0,z-a)},(_,offset)=>a+offset).find(i=>{
   const current=cleanPlanWord(words[i].text).toLowerCase(),next=cleanPlanWord(words[i+1]?.text).toLowerCase();
   return current==='of'&&next==='in'&&i>a;
  });
  if(repeatConnector!==undefined&&repeatConnector>a){
   out.push({words:[a,repeatConnector-1],kind:"plain"});
   a=repeatConnector;
   continue;
  }
  let end=Math.min(z,a+7);
  while(end>a&&planWordText(words,a,end).length>44)end--;
  if(end<a)end=a;
  if(end<z){
   let best=end,bestScore=-Infinity;
   for(let i=a;i<=end;i++){
    const current=String(words[i].text||"");
    const next=words[i+1]?.text||"";
    const pause=words[i+1]?Math.max(0,words[i+1].start-words[i].end):0;
    let score=(/[.!?;,]$/.test(current)?60:0)+(pause>=8?24:pause>=4?10:0);
    if(CONNECTOR_WORDS.has(cleanPlanWord(current).toLowerCase())||CONNECTOR_WORDS.has(cleanPlanWord(next).toLowerCase()))score-=30;
    score+=(i-a)*0.4;
    if(score>bestScore){bestScore=score;best=i;}
   }
   end=Math.max(a,best);
  }
  out.push({words:[a,end],kind:"plain"});
  a=end+1;
 }
}
function completePlan(words,raw,catalogue){
 const allowed=new Map((catalogue.templates||[]).map(function(t){return [String(t.id),t];}));
 const slotCounts=new Map([...allowed].map(function(pair){return [pair[0],pair[1].slots.length];}));
 const proposed=Array.isArray(raw?.captions)?raw.captions:(Array.isArray(raw)?raw.map(function(s){return {from:s.words?.[0],to:s.words?.[1],kind:"emphasis",template:s.template,slots:s.slots,focusSlot:s.focusSlot};}):[]);
 if(!proposed.length)throw Error("The editorial caption plan was empty.");
 const sorted=[...proposed].sort(function(a,b){return Number(a.from??a.words?.[0])-Number(b.from??b.words?.[0]);});
 const out=[];let cursor=0;
 for(const candidate of sorted){
  const a=Number(candidate.from??candidate.words?.[0]),z=Number(candidate.to??candidate.words?.[1]);
  if(!Number.isInteger(a)||!Number.isInteger(z)||a<0||z<a||z>=words.length)throw Error("The editorial caption plan contains an invalid word range.");
  if(a<cursor)throw Error("The editorial caption plan overlaps or reorders spoken words.");
  if(a>cursor)appendPlain(words,cursor,a-1,out);
  const kind=candidate.kind==="emphasis"||candidate.template?"emphasis":"plain";
  if(kind==="plain"){appendPlain(words,a,z,out);}
  else{
   const template=String(candidate.template||"");
   if(!allowed.has(template))throw Error("The editorial plan selected an unavailable template ("+template+").");
   const slots=Array.isArray(candidate.slots)?candidate.slots.map(function(r){return Array.isArray(r)&&r.length?[Number(r[0]),Number(r[r.length-1])]:null;}):[];
   if(slots.some(function(r){return !r||!Number.isInteger(r[0])||!Number.isInteger(r[1])||r[0]<a||r[1]>z||r[1]<r[0];}))throw Error("Template "+template+" has an invalid slot range.");
   if(template!=="05"&&slots.length!==slotCounts.get(template))throw Error("Template "+template+" needs "+slotCounts.get(template)+" slots.");
   if(template==="05"&&(slots.length!==5||slots[0][0]!==a||slots[0][1]!==a))throw Error("The number template must begin with one spoken number and five spoken slots.");
   const spokenRanges=slots.map(function(r,i){return {r:r,i:i};}).sort(function(x,y){return x.r[0]-y.r[0]||x.r[1]-y.r[1];});
   let expected=a;
   for(const item of spokenRanges){if(item.r[0]!==expected)throw Error("Template "+template+" does not cover the spoken phrase exactly once.");expected=item.r[1]+1;}
   if(expected!==z+1)throw Error("Template "+template+" does not cover the spoken phrase exactly once.");
   const scene={...candidate,kind:"emphasis",template:template,words:[a,z],slots:slots};
   const tokens=words.slice(a,z+1).map(w=>cleanPlanWord(w.text).toLowerCase());
   const connectorCount=tokens.filter(t=>CONNECTOR_WORDS.has(t)).length;
   // A designed block should clarify a thought. If the transcript itself is a
   // broken ASR fragment, keep it readable as ordinary speech rather than
   // amplifying the broken grammar with a high-energy template.
   if(connectorCount>=Math.ceil(tokens.length*.7)||(tokens.includes("of")&&tokens.includes("in")&&tokens.indexOf("in")>tokens.indexOf("of")+1&&tokens.slice(tokens.indexOf("in")-1).includes("of"))){
    appendPlain(words,a,z,out);
    cursor=z+1;
    continue;
   }
   if(template==="05"){
    const rawNumber=cleanPlanWord(words[a].text).toLowerCase(),number=/^\d+$/.test(rawNumber)?Number(rawNumber):["zero","one","two","three","four","five","six","seven","eight","nine","ten"].indexOf(rawNumber);
    if(!Number.isInteger(number)||number<1)throw Error("The number template needs a spoken positive number.");
    const spoken=[...slots];spoken.splice(4,0,[a,a]);scene.slots=spoken;scene.texts=spoken.map(function(range){return planWordText(words,range[0],range[1]);});scene.texts[0]=String(number);scene.texts[4]=String(number-1);
   }
   out.push(scene);
  }
  cursor=z+1;
 }
 if(cursor<words.length)appendPlain(words,cursor,words.length-1,out);
 const coverage=out.flatMap(function(s){const [a,z]=s.words;return Array.from({length:z-a+1},function(_,i){return a+i;});});
 if(coverage.length!==words.length||coverage.some(function(v,i){return v!==i;}))throw Error("The editorial caption plan did not cover the transcript exactly once.");
 return out;
}
// Keep the clip interval fixed while redistributing edited words and slot boundaries.
export function replaceWording(job,index,value){
 const j=JSON.parse(JSON.stringify(job)),scene=j.editorial[index],[a,z]=scene.words;
 const tokens=value.trim().split(/\s+/).filter(Boolean);
 if(!tokens.length)throw Error('Enter a caption before saving.');
 const old=j.input.words.slice(a,z+1),delta=tokens.length-old.length;
 const slotOrder=scene.slots?.map((range,i)=>({range,i})).filter(x=>!(scene.template==='05'&&x.i===4)).sort((x,y)=>x.range[0]-y.range[0]);
 if(slotOrder&&tokens.length<slotOrder.length)throw Error(`This composition needs at least ${slotOrder.length} words. Keep a complete phrase.`);
 const end=old.at(-1).end,start=old[0].start;
 if(end-start<tokens.length)throw Error('This phrase is too long for its timing. Shorten it.');
 const replacement=tokens.map((text,i)=>delta===0?{...old[i],text}:{text,start:start+Math.floor(i*(end-start)/tokens.length),end:start+Math.floor((i+1)*(end-start)/tokens.length)});
 if(slotOrder){let cursor=a;const slots=scene.slots.map(v=>[...v]);
 slotOrder.forEach(({range,i},k)=>{const remaining=slotOrder.length-k-1;const desired=Math.round((range[1]-a+1)*tokens.length/old.length)+a;const last=Math.max(cursor,Math.min(a+tokens.length-remaining-1,desired-1));slots[i]=[cursor,last];cursor=last+1;});
 slots[slotOrder.at(-1).i][1]=a+tokens.length-1;
 if(scene.template==='05')slots[4]=[...slots[0]];
 scene.slots=slots;
 }
 j.input.words.splice(a,old.length,...replacement);scene.words=[a,z+delta];
 for(let k=index+1;k<j.editorial.length;k++){const next=j.editorial[k];next.words=next.words.map(v=>v+delta);if(next.slots)next.slots=next.slots.map(r=>r.map(v=>v+delta));}
 if(scene.texts){const raw=tokens[0].toLowerCase().replace(/[.,]/g,'');const number=/^\d+$/.test(raw)?Number(raw):['zero','one','two','three','four','five','six','seven','eight','nine','ten'].indexOf(raw);if(!Number.isInteger(number)||number<1)throw Error('Start this number transition with a positive whole number.');scene.texts=scene.slots.map(([x,y])=>j.input.words.slice(x,y+1).map(w=>w.text.replace(/[.,]/g,'')).join(' '));scene.texts[0]=String(number);scene.texts[4]=String(number-1);}
 return j;
}
// The caption renderer's own Python and font, made on first use inside the
// package so nothing is installed system-wide: a virtual environment with
// approved/requirements.txt, and the bundled font decoded. A stock Mac has no
// Python, so the environment is built on the pinned one runtime.sh fetches
// (shared by every plugin under ~/.selects/plugin-data/_runtime). Checked once
// per panel load, and set up again when a check fails.
// mac-only:start
// The runtime check, setup and compiler run through the macOS login shell
// (runtime.sh fetches a darwin CPython). Reached only through ensureRuntime and
// shell, which run on macOS only; Windows uses the panel engine below.
const RUNTIME_VARS=[
 'ROOT="$SELECTS_USER_SKILLS_ROOT/doac-style"',
 'PY="$ROOT/.runtime/bin/python3"',
 'FONT="$ROOT/approved/native/fonts/permanentmarker/PermanentMarker-Regular.ttf"',
];
const RUNTIME_CHECK=[...RUNTIME_VARS,'if [ -x "$PY" ] && [ -s "$FONT" ] && "$PY" -c "import PIL, numpy, scipy" 2>/dev/null; then echo ready; else echo missing; fi'].join('\n');
const shellQuote=s=>"'"+String(s).replace(/'/g,"'\\''")+"'";
const runtimeSetup=python=>[
 'set -e',
 ...RUNTIME_VARS,
 'if [ ! -x "$PY" ] || ! "$PY" -c "import PIL, numpy, scipy" 2>/dev/null; then',
 '  '+shellQuote(python)+' -m venv --clear "$ROOT/.runtime"',
 '  "$PY" -m pip install --quiet --disable-pip-version-check -r "$ROOT/approved/requirements.txt"',
 'fi',
 '"$PY" -c "import PIL, numpy, scipy"',
].join('\n');
async function macRuntime(sdk,say){
  hostUseSdk(sdk);
 const check=await sdk.runShell({summary:'Check the DOAC Style caption renderer',command:RUNTIME_CHECK,timeoutMs:60000,maxOutputBytes:4000});
 if(!check.isError&&check.exitCode===0&&/\bready\s*$/.test(check.stdout||''))return;
 say('Preparing (first run only)\u2026');
 const py=await sdk.runShell({summary:'Prepare Python (first run only)',command:'sh "$SELECTS_USER_SKILLS_ROOT/doac-style/runtime.sh" python',timeoutMs:290000,maxOutputBytes:8000});
 const python=String(py.stdout||'').trim().split('\n').filter(Boolean).pop();
 if(py.isError||py.exitCode!==0||!/^([A-Za-z]:\\|\/)/.test(python||''))throw stepError('setup',String(py.stderr||'').trim().split('\n').filter(Boolean).pop()||SETUP_FAILED);
 const r=await sdk.runShell({summary:'Set up the DOAC Style caption renderer',command:runtimeSetup(python),timeoutMs:290000,maxOutputBytes:16000});
 if(r.isError||r.exitCode!==0)throw stepError('setup',SETUP_FAILED);
}
// mac-only:end
const SETUP_FAILED='DOAC Style could not set up its caption renderer. Check the internet connection, then try again.';
const RENDER_FAILED='The caption renderer could not complete this version. Check the DOAC Style installation, then try again.';
const FILE_ACCESS='Update Selects to enable caption file access.';
// The installed package folder (it holds approved/), found once per panel load.
let packageRoot=null;
function doacRoot(sdk){
  hostUseSdk(sdk);
 packageRoot??=hostRoots(sdk,'doac-style','approved').then(r=>r.plugin).catch(e=>{packageRoot=null;throw e?.code==='host-missing'?stepError('file-access',FILE_ACCESS):stepError('renderer','The caption renderer is missing. Reinstall DOAC Style.');});
 return packageRoot;
}
// Renderer code comes from the installed package, not an independently generated effect.
async function rendererCode(sdk){
  hostUseSdk(sdk);
 const root=await doacRoot(sdk);
 try{return await hostReadText(hostJoin(root,'approved','caption-scene.tsx.txt'));}
 catch(e){throw e?.code==='host-missing'?stepError('file-access',FILE_ACCESS):stepError('renderer','The caption renderer is missing. Reinstall DOAC Style.');}
}
// The bundled font ships base64-encoded; decode it next to the .b64 once.
async function ensureFont(sdk){
  hostUseSdk(sdk);
 const font=hostJoin(await doacRoot(sdk),'approved','native','fonts','permanentmarker','PermanentMarker-Regular.ttf');
 const f=hostApi('FileSystem',"exists",'writeFile');if(!f)throw stepError('file-access',FILE_ACCESS);
 // An empty file (an interrupted write) is decoded again; with renameSync the new file appears whole.
 const st=hostApi('FileSystem',"stat"),mv=hostApi('FileSystem',"rename");
 if((await f.exists(font))){let size=1;try{if(st)size=Number((await st.stat(font))?.size);}catch{}if(size>0)return;}
 const b64=(await hostReadText(font+'.b64')).replace(/\s+/g,'');
 const tmp=mv?font+'.part':font;
 await f.writeFile(tmp,Uint8Array.from(atob(b64),c=>c.charCodeAt(0)));
 if(mv)(await mv.rename(tmp,font));
}
let runtimeReady=null;
function ensureRuntime(sdk,say=()=>{}){
  hostUseSdk(sdk);
 runtimeReady??=(async()=>{if(hostIsWindows()){await panelEngineFiles(sdk);return;}await ensureFont(sdk);await macRuntime(sdk,say);})().catch(e=>{runtimeReady=null;throw e;});
 return runtimeReady;
}
// Windows: the caption engine runs inside the panel, in a Web Worker. approved/web
// holds engine.js (the JavaScript port of engine.py and compile-captions.py), the
// FreeType + Pillow raster core it draws with (raster.wasm.b64) and worker.js (the
// Worker side and the font choice); dev/parity and tests/doac_style_parity.test.mjs
// show it draws the same frames as the Python engine on the same input. Fonts the
// plans name that Windows has (Arial, Georgia, Times) come from its Fonts folder;
// Helvetica and Helvetica Neue use the bundled Arimo. Read once per panel load.
const ENGINE_DATA=['style.json','template-energy.json','PLANNING.md','native/shortlist.json','native/0YVdjmU13E4/plan.json','native/0YVdjmU13E4/legacy-three-scenes.json','native/NhbCBo1KuU8/plan.json','native/8_dh-IB9jZ8/plan.json'];
const WINDOWS_FONTS=['arial.ttf','arialbd.ttf','arialbi.ttf','ariblk.ttf','arialnb.ttf','georgiab.ttf','times.ttf'];
const fromBase64=s=>Uint8Array.from(atob(String(s).replace(/\s+/g,'')),c=>c.charCodeAt(0));
let engineFiles=null;
function panelEngineFiles(sdk){
  hostUseSdk(sdk);
 engineFiles??=(async()=>{
  const root=await doacRoot(sdk),read=p=>hostReadText(hostJoin(root,'approved',...p.split('/')));
  const source=(await Promise.all(['web/pil.js','web/engine.js','web/worker.js'].map(read))).join('\n;\n');
  const wasm=fromBase64(await read('web/raster.wasm.b64'));
  const files={};for(const name of ENGINE_DATA)files[name]=await read(name);
  const fonts={'permanent-marker':fromBase64(await read('native/fonts/permanentmarker/PermanentMarker-Regular.ttf.b64'))};
  for(const w of ['Regular','Medium','Bold'])fonts['arimo:'+w]=fromBase64(await read('native/fonts/arimo/Arimo-'+w+'.ttf.b64'));
  const fsx=hostApi('FileSystem',"exists",'homedir');
  const drives=['C:'];try{const d=/^([A-Za-z]:)/.exec(String(fsx?.homedir()||''));if(d&&d[1].toUpperCase()!=='C:')drives.unshift(d[1]);}catch{}
  for(const name of WINDOWS_FONTS)for(const drive of drives){
   // A copy, so the bytes belong to this window (the host's buffer is another realm's).
   try{const p=hostJoin(drive+'\\','Windows','Fonts',name);if(fsx&&!(await fsx.exists(p)))continue;fonts['windows:'+name]=(await hostReadBytes(p)).slice();break;}catch{}
  }
  return {source,wasm,files,fonts};
 })().catch(e=>{engineFiles=null;throw e?.code==='host-missing'||e?.code==='file-access'?stepError('file-access',FILE_ACCESS):stepError('renderer','The caption renderer is missing. Reinstall DOAC Style.');});
 return engineFiles;
}
// One Worker per request: { cmd: 'catalogue' }, { cmd: 'check', job } or { cmd: 'compile', job, only }.
// Engine errors keep the Python engine's messages (ValueError / AssertionError) and
// are marked `refused`; a Worker that fails or runs out of time rejects with
// RENDER_FAILED instead. `onProgress` gets the Worker's per-frame progress.
async function panelEngine(sdk,request,onProgress){
  hostUseSdk(sdk);
 const a=await panelEngineFiles(sdk);
 return await new Promise((resolve,reject)=>{
  let worker=null,url=null,timer=null;
  const done=(fn,v)=>{clearTimeout(timer);try{worker?.terminate();}catch{}if(url){try{URL.revokeObjectURL(url);}catch{}}fn(v);};
  try{url=URL.createObjectURL(new Blob([a.source],{type:'text/javascript'}));worker=new Worker(url);}
  catch{done(reject,stepError('render',RENDER_FAILED));return;}
  timer=setTimeout(()=>done(reject,stepError('render',RENDER_FAILED)),(request.cmd==='check'?3:20)*60000);
  worker.onmessage=({data})=>{
   if(data?.progress){try{onProgress?.(data.progress);}catch{}return;}
   if(data?.error){const e=data.error,known=(e.pyType==='ValueError'||e.pyType==='AssertionError')&&e.pyMessage;done(reject,Object.assign(stepError('render',known?e.pyMessage:RENDER_FAILED),{refused:true}));}
   else done(resolve,data?.result);
  };
  worker.onerror=()=>done(reject,stepError('render',RENDER_FAILED));
  worker.onmessageerror=()=>done(reject,stepError('render',RENDER_FAILED));
  worker.postMessage({...request,wasm:a.wasm,files:a.files,fonts:a.fonts});
 });
}
function stepError(code,message){return Object.assign(Error(message),{code});}
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
// The caption renderer lays out a 540×960 canvas stretched to the frame. On any
// other aspect ratio, scale the clip back so captions keep their proportions,
// fitted and centred in the frame. Null when the frame is already 9:16.
export function captionFit(frame){
 const W=Number(frame?.width),H=Number(frame?.height);if(!(W>0&&H>0))return null;
 const k=Math.min(W/540,H/960),x=k*540/W,y=k*960/H;
 return Math.abs(x-1)<1e-6&&Math.abs(y-1)<1e-6?null:{x,y};
}
// The steps that turn a source draft into a separate caption draft, shared by the
// panel and the headless template run. `onStatus` reports progress; `persist`
// records each job checkpoint (the panel keeps them so an interrupted save can
// resume; a template run keeps them in memory only).
function captionSteps({sdk,currentProject,onStatus,persist}){
 hostUseSdk(sdk);
 function fs(){const f=hostSdk.files;if(!f?.getOrCreateTmpDirPath||!f?.join||!f?.mkdir||!f?.writeFile||!f?.readFile)throw stepError('file-access','Update Selects to enable caption file access.');return f;}
 async function read(path){const b=await fs().readFile(path);return typeof b==='string'?b:new TextDecoder().decode(b);}
 async function run(script,summary,allowCommit=false){const r=await sdk.runScript({script,summary,allowCommit});if(r.isError||r.result==null)throw Error(r.output||'Could not confirm the save. Check the result draft before trying again.');return r.result;}
 // mac-only:start
 // The compiler runs through the macOS shell; on Windows compile and prepare use panelEngine instead.
 const quote=s=>"'"+String(s).replace(/'/g,"'\\''")+"'";
 async function shell(args){await ensureRuntime(sdk);const r=await sdk.runShell({summary:'Compile approved captions',command:'"$SELECTS_USER_SKILLS_ROOT/doac-style/.runtime/bin/python3" "$SELECTS_USER_SKILLS_ROOT/doac-style/approved/compile-captions.py" '+args,timeoutMs:300000,maxOutputBytes:48000});if(r.isError||r.exitCode!==0){const detail=(r.stderr||r.output||'').match(/(?:ValueError|AssertionError): ([^\n]+)/);throw stepError('render',detail?detail[1]:"The caption renderer could not complete this version. Check the DOAC Style installation, then try again.");}return r.stdout;}
 // mac-only:end
 function sameProject(j){if(currentProject()!==j.projectId)throw stepError('project-changed','Project changed. Return to the original project to continue.');}
 async function compile(j,scene){await ensureRuntime(sdk,onStatus);onStatus(scene==null?'Preparing typography and checking timing…':'Updating this caption…');const f=fs(),dir=f.join(j.path.replace(/[\\/][^\\/]+$/,''),'revision-'+Date.now());(await f.mkdir(dir,{recursive:true}));const requestPath=f.join(dir,'job.json');await f.writeFile(requestPath,JSON.stringify(j));if(hostIsWindows()){const m=await panelCompile(j,dir,scene);sameProject(j);return m;}const output=await shell('compile '+quote(requestPath)+(scene==null?'':' --scene '+scene));const last=JSON.parse(output.trim().split('\n').pop());const m=JSON.parse(await read(last.manifest));sameProject(j);return m;}
 // Windows: the panel engine compiles, and its files are written where
 // compile-captions.py writes them (compiled/ next to job.json), so the rest of
 // the flow reads the same manifest and scene payloads.
 async function panelCompile(j,dir,scene){
  let shown=-1;const progress=p=>{if(scene==null&&p?.scene!=null&&p.scene!==shown){shown=p.scene;onStatus(`Preparing typography… scene ${p.scene+1} of ${p.total}`);}};
  const r=await panelEngine(sdk,{cmd:'compile',job:{input:j.input,editorial:j.editorial},only:scene==null?null:scene},progress);
  const f=fs(),out=f.join(dir,'compiled'),num=i=>String(i).padStart(3,'0');(await f.mkdir(out,{recursive:true}));
  const scenes=[];
  for(const s of r.scenes){const payload=f.join(out,'scene-'+num(s.scene.index)+'.json'),preview=f.join(out,'scene-'+num(s.scene.index)+'.png');await f.writeFile(payload,JSON.stringify(s.payload));await f.writeFile(preview,s.preview);scenes.push({...s.scene,payload,preview});}
  const m={scenes,records:r.records,placement:r.placement,words:r.words,frames:r.frames,fps:r.fps};
  await f.writeFile(f.join(out,scene==null?'manifest.json':'manifest-'+num(scene)+'.json'),JSON.stringify(m,null,2));
  return m;
 }
 // Windows: a recovery trial only asks whether a plan lays out and validates, so
 // the engine checks it without drawing a frame (no files; seconds, not minutes).
 // compile() still draws the version that is kept.
 async function check(j){await ensureRuntime(sdk,onStatus);await panelEngine(sdk,{cmd:'check',job:{input:j.input,editorial:j.editorial}});sameProject(j);}
 async function compileWithRecovery(j){
  try{return {job:j,manifest:await compile(j)};}
  catch(first){
   const message=String(first?.message||first);
   if(!/fit|hierarchy|composition|reference/i.test(message))throw first;
   // A template can fail because its source hierarchy cannot carry a new phrase.
   // The engine lays out every scene at once, so each designed scene is tried
   // on its own, the others plain: its own template, then a verified sibling
   // with the same number of visual slots, and plain speech only when none
   // fits. This keeps designed typography wherever any of it fits, however
   // many scenes need help.
   const siblings={3:['21','13','38'],4:['23','33'],5:['24','19'],6:['09','11'],7:['22','06']};
   const plain=x=>({words:x.words,kind:'plain'});
   const allPlain=j.editorial.map(x=>x.template?plain(x):x);
   const fits=async(i,scene)=>{
    // Windows: an engine refusal means "does not fit"; a Worker failure stops here with its own message.
    if(hostIsWindows()){try{await check({...j,editorial:allPlain.map((x,k)=>k===i?scene:x)});return true;}catch(e){if(!e?.refused)throw e;return false;}}
    try{await compile({...j,editorial:allPlain.map((x,k)=>k===i?scene:x)});return true;}catch{return false;}};
   const chosen=[...j.editorial],removed=[];
   const designed=j.editorial.filter(x=>x.template).length;let tried=0;
   for(let i=0;i<j.editorial.length;i++){
    const scene=j.editorial[i];if(!scene.template)continue;
    if(hostIsWindows())onStatus(`Checking which layouts fit… ${++tried} of ${designed}`);
    const words=j.input.words.slice(scene.words[0],scene.words[1]+1).map(w=>w.text).join(' ');
    const ids=[String(scene.template),...(siblings[scene.slots?.length]||[]).filter(id=>id!==String(scene.template))];
    let placed=false;
    for(const id of ids){
     // Question and number layouts carry strict semantics; never substitute them blindly.
     if(id!==String(scene.template)&&id==='19'&&!/\?/.test(words))continue;
     const trial={...scene,template:id,focusSlot:Math.min(Number(scene.focusSlot||0),scene.slots.length-1)};
     if(await fits(i,trial)){chosen[i]=trial;placed=true;break;}
    }
    if(!placed){chosen[i]=plain(scene);removed.push(i);}
   }
   const repaired={...j,editorial:chosen};
   // Windows: a Worker failure (not an engine refusal) keeps its own message.
   try{return {job:repaired,manifest:await compile(repaired),removed};}catch(e){throw hostIsWindows()&&!e?.refused?e:first;}
  }
 }
 // Read the source, plan the edit (cached per source) and compile every scene.
 // `anyAspect` accepts frames other than 9:16; the result keeps the source's format.
 // A new draft holding one whole Project video on Main, at the clip's own frame
 // size, committed so later scripts can read it by id. Named like every caption
 // draft, made unique among the Project's drafts. A clip without spoken words
 // creates nothing and reports `noWords`.
 async function createFromClip({projectId:pid,resourceId}){
 if(currentProject()!==pid)throw stepError('project-changed','Project changed. Return to the original project to continue.');
 onStatus('Placing your video…');
 return await run(`const p=selects.project(${JSON.stringify(pid)});const res=p.resource(${JSON.stringify(resourceId)});const spoken=(await res.words({view:'playback'})).filter(w=>!w.nonSpeech&&w.text.trim());if(!spoken.length)return {noWords:true};let size:{width:number;height:number}|null=null;try{const fs=(await res.meta()).frameSize;if(fs&&Number.isInteger(fs.width)&&Number.isInteger(fs.height)&&fs.width>0&&fs.height>0)size={width:fs.width,height:fs.height};}catch{}const base=${JSON.stringify('DOAC Style Captions')};const names=[];for(const id of (await p.meta()).draftIds||[]){try{names.push((await selects.draft(id).meta()).name);}catch{}}let name=base;for(let n=2;names.includes(name);n++)name=base+' ('+n+')';const d=await p.createDraft({name});await d.insertResource({resourceId:${JSON.stringify(resourceId)}});try{await d.setFrameSize(size||'original');}catch{}const r=await d.commitAll('Create DOAC Style caption draft from a video');if(!r.createdDraftId)throw Error('The caption draft was not created.');return {id:r.createdDraftId,name};`,'Create DOAC Style caption draft from a video',true);
 }
 // `cacheKey` names the plan cache (default: the source draft), so a template
 // run from the same video reuses its plan while the words and timing match.
 async function prepare({projectId:pid,sourceId,forceNew=false,anyAspect=false,cacheKey=sourceId,resume=null}){
 if(resume?.uncertain)throw stepError('uncertain','The previous caption operation was not confirmed. Check the saved request before trying again.');
 onStatus('Reading your transcript…');
 const v=await run(`const d=selects.draft(${JSON.stringify(sourceId)});return {meta:await d.meta(),clips:await d.clips({trackScope:'all'}),words:(await d.words({view:'playback'})).filter(w=>!w.nonSpeech&&w.text.trim()).map(w=>({text:w.text,start:w.startFrame,end:w.endFrame}))};`,'Read approved caption input');
 if(!v.words.length)throw stepError('no-transcript','This draft needs a transcript. Analyze its footage in Selects, then create captions.');
 if(!anyAspect&&v.meta.frameSize.width/v.meta.frameSize.height!==1080/1920)throw stepError('not-vertical','This style needs a vertical 9:16 draft. Change the aspect ratio in Selects first.');
 if(v.clips.some(c=>c.trackKind==='video'&&c.resourceId===null))throw stepError('has-graphics','This draft already contains generated graphics. Open the original draft without captions.');
 await ensureRuntime(sdk,onStatus);const catalogue=hostIsWindows()?await panelEngine(sdk,{cmd:'catalogue'}):JSON.parse(await shell('catalogue'));const f=fs(),dir=f.join((await f.getOrCreateTmpDirPath()),'approved-captions-'+Date.now());(await f.mkdir(dir,{recursive:true}));
 const input={fps:v.meta.fps,frames:Math.max(...v.clips.filter(c=>c.trackKind==='main').map(c=>c.endFrame)),words:v.words};
 onStatus('Designing the full caption edit…');
 const cachePath=f.join((await f.getOrCreateTmpDirPath()),'doac-style-plan-'+PLAN_VERSION+'-'+pid+'-'+cacheKey+'.json');
 const cacheSignature=PLAN_VERSION+'|'+JSON.stringify(input);
 let j={projectId:pid,sourceId,cacheKey,name:'DOAC Style Captions',input,editorial:[],path:f.join(dir,'job.json'),signature:JSON.stringify(v.words),baseCount:v.clips.filter(c=>c.trackKind==='video').length,frame:v.meta.frameSize,nonce:Date.now(),next:0};
 let reply= !forceNew&&resume?.projectId===pid&&resume.sourceId===sourceId&&JSON.stringify(resume.input)===JSON.stringify(input)&&typeof resume.planText==='string' ? {text:resume.planText} : null;
 try{
 if(!reply&&!forceNew){try{const cached=JSON.parse(await read(cachePath));if(cached.signature===cacheSignature)reply={text:cached.text};}catch{}}
 if(!reply){
  sameProject(j);await persist({...j,planning:true,uncertain:true});sameProject(j);
  reply=await sdk.askAI({timeoutMs:360000,prompt:planningPrompt(input,catalogue)});
 }
 // Record the acknowledgement before cache writes or compilation can fail.
 j={...j,planText:reply.text,planning:false,uncertain:false};sameProject(j);await persist(j);
 await f.writeFile(cachePath,JSON.stringify({signature:cacheSignature,text:reply.text}));
 await fs().writeFile(f.join(dir,'ai-response.txt'),reply.text);let raw=reply.text.trim().replace(/^```(?:json)?\s*/,'').replace(/\s*```$/,'');
 j={...j,editorial:completePlan(input.words,JSON.parse(raw),catalogue)};await persist(j);
 }catch(e){throw e?.code||e?.storageFailure?e:stepError('plan',e?.message||String(e));}
 const compiled=await compileWithRecovery(j);const prepared={...compiled.job,manifest:compiled.manifest};await persist(prepared);return prepared;
 }
 // Duplicate the source into the caption draft (once) and add each compiled scene.
 // `inPlace` adds the scenes to the source draft itself (a draft this run just
 // made, or the draft a template run was given) instead of a copy, once its
 // words are still the ones the plan was made from; `fit` scales captions to non-9:16 frames;
 // `skipFailedScenes` keeps going past a scene that fails to save (template
 // runs); `open` opens the draft when done.
 async function create(task,{open=true,fit=false,skipFailedScenes=false,inPlace=false}={}){let j=task;sameProject(j);if(!j.manifest)throw Error('Prepare captions before applying them.');
 if(j.uncertain)throw Error('The last save was not confirmed. Check the result draft before retrying.');
 if(inPlace&&!j.targetId){
  const same=await run(`const s=selects.draft(${JSON.stringify(j.sourceId)});const words=(await s.words({view:'playback'})).filter(w=>!w.nonSpeech&&w.text.trim()).map(w=>({text:w.text,start:w.startFrame,end:w.endFrame}));return JSON.stringify(words)===${JSON.stringify(j.signature)};`,'Check the draft is unchanged');
  if(!same)throw stepError('draft-changed','The draft changed while captions were being planned. Try again.');
  j={...j,targetId:j.sourceId,clipIds:[]};await persist(j);
 }
 if(!j.targetId){onStatus('Creating your captioned draft…');await persist({...j,uncertain:true});const r=await run(`const s=selects.draft(${JSON.stringify(j.sourceId)});const words=(await s.words({view:'playback'})).filter(w=>!w.nonSpeech&&w.text.trim()).map(w=>({text:w.text,start:w.startFrame,end:w.endFrame}));if(JSON.stringify(words)!==${JSON.stringify(j.signature)})throw Error('The original draft changed. Create a new caption plan.');const d=await selects.project(${JSON.stringify(j.projectId)}).duplicateDraft({sourceDraftId:${JSON.stringify(j.sourceId)},name:${JSON.stringify('DOAC Style Captions')}});const r=await d.commitAll('Create approved caption draft');return {id:r.createdDraftId,link:await selects.editor.linkToDraftFrame(r.createdDraftId,0)};`,'Create approved caption draft',true);j={...j,targetId:r.id,link:r.link,clipIds:[],uncertain:false};await persist(j);}
 const tsxCode=await rendererCode(sdk);
 const scale=fit?captionFit(j.frame):null,place=scale?`const added=(await d.clips({trackScope:'all'})).find(c=>c.clipId===r.clipId);await d.setClipTransform({clip:added,scale:${JSON.stringify(scale)}});`:'';
 const failed=[];
 for(let i=j.next;i<j.manifest.scenes.length;i++){
 sameProject(j);onStatus(`Adding captions · ${i+1} / ${j.manifest.scenes.length}`);
 let committing=false;
 try{
 const scene=j.manifest.scenes[i],data=JSON.parse(await read(scene.payload));await persist({...j,uncertain:true});
 committing=true;
 // Every saved scene adds one video clip, so the expected count is the base plus the scenes saved so far.
 const r=await run(`const d=selects.draft(${JSON.stringify(j.targetId)});const all=await d.clips({trackScope:'all'});if(all.filter(c=>c.trackKind==='video').length!==${j.baseCount+j.clipIds.length})throw Error('The result draft changed. Saving stopped to avoid duplicate captions.');const r=await d.addMotionGraphic({label:${JSON.stringify('DOAC Style '+scene.template+' · '+scene.text)},within:await d.rangeAtFrames(${scene.start},${scene.end}),tsxCode:${JSON.stringify(tsxCode)},parameters:${JSON.stringify(data)}});${place}await d.commitAll('Add approved caption scene');return {clipId:r.clipId};`,'Save approved caption scene',true);
 j={...j,next:i+1,clipIds:[...j.clipIds,r.clipId],uncertain:false};await persist(j);
 }catch(e){if(committing||e.storageFailure||!skipFailedScenes)throw e;failed.push(i);j={...j,next:i+1,uncertain:false};await persist(j);}
 }
 if(!j.clipIds.length&&j.manifest.scenes.length)throw stepError('no-scenes','No captions could be added to the result draft.');
 if(!failed.length){const f=fs(),cachePath=f.join((await f.getOrCreateTmpDirPath()),'doac-style-plan-'+PLAN_VERSION+'-'+j.projectId+'-'+(j.cacheKey||j.sourceId)+'.json');try{const cache=JSON.parse(await read(cachePath));if(cache.signature===PLAN_VERSION+'|'+JSON.stringify(j.input))await f.writeFile(cachePath,JSON.stringify({...cache,applied:true}));}catch{}}
 onStatus('Your captioned draft is ready.');if(open)await run(`return await selects.editor.openDraft(${JSON.stringify(j.targetId)});`,'Open DOAC Style draft');
 return {job:j,failed};
 }
 return {fs,read,run,sameProject,compile,createFromClip,prepare,create};
}
const TEMPLATE_ERRORS={
 'no-project':'Open a project, then try again.',
 'no-timeline':'Open a timeline with speech, then try again.',
 'no-video':'Pick a video of one person talking, then try again.',
 'no-transcript':'This timeline has no transcript yet. Analyze its footage, then try again.',
 'draft-changed':'The draft changed while captions were being planned. Try again.',
 'has-graphics':'This timeline already has generated graphics. Use a timeline without captions, then try again.',
 'project-changed':'The project changed while captions were being made. Stay in the project, then try again.',
 'file-access':'Update Selects to use DOAC Style captions.',
 'renderer':'DOAC Style is not fully installed. Reinstall it, then try again.',
 'render':'DOAC Style could not draw these captions. Check its installation, then try again.',
 'setup':SETUP_FAILED,
 'plan':'Selects AI could not plan the captions. Try again.',
 'no-scenes':'No captions could be added to the timeline. Try again.',
};
const TEMPLATE_FALLBACK='DOAC Style could not make the captioned timeline. Try again.';
// Each template invocation restores the same project/run journal before it can
// create a source draft, ask AI, or add a scene. Unknown effects stay blocked.
async function runCaptionTemplate({sdk,context,currentProject,onStatus,onJob=()=>{},isCurrent=()=>true}){
 const pid=context.projectId,template=context.template,runId=template?.runId;
 if(!pid)throw stepError('no-project','No project is open.');
 if(typeof sdk.storage?.getItem!=='function'||typeof sdk.storage?.setItem!=='function')throw stepError('storage','Update Selects to restore and save caption progress.');
 const key='doac-style-template:'+JSON.stringify([pid,runId]);
 let job=JSON.parse(await sdk.storage.getItem(key)||'null');onJob(job);
 function current(){if(!isCurrent()||currentProject()!==pid)throw stepError('project-changed','Project changed. Return to the original project to continue.');}
 async function persist(next){current();job=next;onJob(job);try{await sdk.storage.setItem(key,JSON.stringify(job));}catch{const e=stepError('storage','Could not save caption progress. Keep this panel open and retry the saved template run before creating another.');e.storageFailure=true;throw e;}current();}
 current();
 if(job?.uncertain)throw stepError('uncertain','The previous caption operation was not confirmed. Check the saved request and result draft before trying again.');
 const speaker=template.inputs?.speaker||[];
 const source=speaker.find(x=>(x?.kind==='video'&&x.resourceId)||(x?.kind==='timeline'&&x.sequenceId));
 if(!source)throw speaker.some(x=>x?.kind==='video')?stepError('no-video','No video was given.'):stepError('no-timeline','No timeline was given.');
 const steps=captionSteps({sdk,currentProject,onStatus,persist});
 if(!job?.sourceId){
  if(source.kind==='video'){
   await persist({projectId:pid,resourceId:source.resourceId,creatingSource:true,uncertain:true});
   const made=await steps.createFromClip({projectId:pid,resourceId:source.resourceId});
   if(made.noWords){await persist(null);throw stepError('no-transcript','The video has no transcript.');}
   await persist({projectId:pid,sourceId:made.id,resourceId:source.resourceId,uncertain:false});
  }else await persist({projectId:pid,sourceId:source.sequenceId,uncertain:false});
 }
 const prepared=job.manifest?job:await steps.prepare({projectId:pid,sourceId:job.sourceId,anyAspect:true,resume:job,
  cacheKey:source.kind==='video'?'video-'+String(source.resourceId).replace(/[^\w-]/g,'_'):job.sourceId});
 return await steps.create(prepared,{open:false,fit:true,skipFailedScenes:true,inPlace:true});
}
function TemplateRun({sdk,context}){
 const [status,setStatus]=useState('Starting DOAC Style…');
 const started=useRef(new Set()),live=useRef(null),project=useRef(context.projectId),mounted=useRef(true);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
 project.current=context.projectId;
 const template=context.template,runId=template?.runId;live.current=runId;
 useEffect(()=>{
  if(!runId||started.current.has(runId))return;
  started.current.add(runId);
  let done=false,job=null;
  // A superseded run stays quiet: the runtime reports under the current run id.
  const finish=result=>{if(done)return;done=true;if(live.current===runId)sdk.finishTemplate(result);};
  (async()=>{
   try{
    const result=await runCaptionTemplate({sdk,context,currentProject:()=>project.current,onStatus:setStatus,onJob:j=>{job=j;},isCurrent:()=>mounted.current&&live.current===runId});
    finish({sequenceId:result.job.targetId});
   }catch(e){
    // Keep a caption draft that already holds some captions rather than discarding the work.
    if(!e.storageFailure&&!job?.uncertain&&job?.targetId&&job.clipIds?.length)finish({sequenceId:job.targetId});
    else{console.warn('[doac-style] template run failed:',e?.code||'',e?.message||e);finish({error:['storage','uncertain'].includes(e?.code)?e.message:TEMPLATE_ERRORS[e?.code]||TEMPLATE_FALLBACK});}
   }
  })().catch(()=>finish({error:TEMPLATE_FALLBACK}));
 },[runId]);
 return <small>{status}</small>;
}
function Panel(props){
  hostUseSdk(props.sdk);return props.context.template?<TemplateRun {...props}/>:<CaptionPanel {...props}/>;}
function CaptionPanel({sdk,context,ui}) {
 const [busy,setBusy]=useState(false),[status,setStatus]=useState(''),[error,setError]=useState(''),[job,setJob]=useState(null),[index,setIndex]=useState(0),[text,setText]=useState(''),[preview,setPreview]=useState(''),[editing,setEditing]=useState(false),[sourceName,setSourceName]=useState(''),[pendingPlan,setPendingPlan]=useState(false);
 useEffect(()=>{let live=true;if(!context.sequenceId){setSourceName('');return;}sdk.runScript({script:`return await selects.draft(${JSON.stringify(context.sequenceId)}).meta();`,summary:'Read current draft'}).then(r=>{if(live)setSourceName(r.result?.name||'');}).catch(()=>{});return()=>{live=false;};},[context.sequenceId]);
 const lock=useRef(false),project=useRef(context.projectId);project.current=context.projectId;
 const key='doac-style-'+PLAN_VERSION+'-'+context.projectId;
 const [restoredKey,setRestoredKey]=useState(null),readyKey=useRef(null),pendingSave=useRef(null),latestJob=useRef(null),activeKey=useRef(key);activeKey.current=key;
 useEffect(()=>{let live=true;readyKey.current=null;pendingSave.current=null;latestJob.current=null;setJob(null);setIndex(0);setError('');
  (async()=>{if(typeof sdk.storage?.getItem!=='function'||typeof sdk.storage?.setItem!=='function')throw Error('Update Selects to restore and save caption progress.');
   const saved=JSON.parse(await sdk.storage.getItem(key)||'null');if(!live||activeKey.current!==key)return;latestJob.current=saved;setJob(saved);if(saved?.uncertain)setError('The last save was not confirmed. Check the result draft before retrying.');readyKey.current=key;setRestoredKey(key);
  })().catch(e=>{if(live)setError(e.message||'Could not restore captions. Reopen this panel to retry.');});return()=>{live=false;};},[key,sdk]);
 async function save(j){if(activeKey.current!==key||readyKey.current!==key)throw Error('Project changed or captions are still loading. Return to the original project to continue.');
  const previous=latestJob.current;latestJob.current=j;pendingSave.current={key,job:j};setJob(j);
  try{await sdk.storage.setItem(key,JSON.stringify(j));}catch{if(j?.uncertain&&activeKey.current===key){latestJob.current=previous;pendingSave.current=null;setJob(previous);}const e=Error('Could not save caption progress. Keep this panel open and retry saving before continuing.');e.storageFailure=true;throw e;}
  if(activeKey.current!==key)throw Error('Project changed. Return to the original project to continue.');
  pendingSave.current=null;
 }
 const storageLoading=restoredKey!==key;

 const steps=captionSteps({sdk,currentProject:()=>project.current,onStatus:setStatus,persist:save}),{fs,read,run,sameProject,compile}=steps;
 useEffect(()=>{let live=true;const id=job?.sourceId||context.sequenceId;if(!id)return;let f;try{f=fs();}catch{setPendingPlan(false);return;}(async()=>read(f.join(await f.getOrCreateTmpDirPath(),'doac-style-plan-'+PLAN_VERSION+'-'+context.projectId+'-'+id+'.json')))().then(JSON.parse).then(c=>{if(live)setPendingPlan(!c.applied);}).catch(()=>{if(live)setPendingPlan(false);});return()=>{live=false;};},[job?.sourceId,context.sequenceId,busy]);
 async function action(fn){if(lock.current||readyKey.current!==key||activeKey.current!==key)return;lock.current=true;setBusy(true);setError('');try{if(pendingSave.current){await save(pendingSave.current.job);return;}await fn();}catch(e){setError(e.message||String(e));}finally{lock.current=false;setBusy(false);}}
 async function load(sourceOverride,forceNew=false){await action(async()=>{
 if(job?.uncertain)throw Error('The last save was not confirmed. Check the result draft before retrying.');
 if(!context.projectId||!context.sequenceId)throw Error('Open a draft to add captions.');
 const prepared=await steps.prepare({projectId:context.projectId,sourceId:sourceOverride||context.sequenceId,forceNew,resume:forceNew?null:latestJob.current});await create(prepared);
 });}
 async function create(task){await steps.create(task);setPendingPlan(false);}
 async function edit(){await action(async()=>{const j=replaceWording(job,index,text);sameProject(j);
 const m=await compile(j,index),s=m.scenes[0];j.manifest.scenes[index]=s;j.manifest.records=m.records;
 if(j.targetId){if(j.next!==j.editorial.length||j.uncertain)throw Error('Finish creating the draft before editing captions.');const data=JSON.parse(await read(s.payload));const tsxCode=await rendererCode(sdk);await save({...job,uncertain:true});
 const r=await run(`const d=selects.draft(${JSON.stringify(j.targetId)});const old=(await d.clips({trackScope:'all'})).find(c=>c.clipId===${j.clipIds[index]});if(!old)throw Error('This caption clip changed. Reopen the result draft.');if(old.startFrame!==${s.start}||old.endFrame!==${s.end})throw Error('This caption was trimmed on the timeline. Restore its original timing before changing the wording.');const tr=await d.clipTransform(old);await d.removeClips(old);const r=await d.addMotionGraphic({label:${JSON.stringify('DOAC Style '+s.template+' · '+s.text)},within:await d.rangeAtFrames(${s.start},${s.end}),tsxCode:${JSON.stringify(tsxCode)},parameters:${JSON.stringify(data)}});const added=(await d.clips({trackScope:'all'})).find(c=>c.clipId===r.clipId);await d.setClipTransform({clip:added,position:tr.position,scale:tr.scale,rotation:tr.rotation});await d.commitAll('Edit approved caption wording');return {clipId:r.clipId};`,'Edit approved caption wording',true);j.clipIds[index]=r.clipId;j.uncertain=false;}
 await save(j);setStatus('Caption updated.');});}
 useEffect(()=>{let live=true;if(!job?.editorial?.[index])return;const [a,z]=job.editorial[index].words;setText(job.input.words.slice(a,z+1).map(w=>w.text).join(' '));setPreview('');const s=job.manifest?.scenes?.[index];if(s)read(s.payload).then(JSON.parse).then(d=>{if(live)setPreview(d);}).catch(()=>{});return()=>{live=false};},[job,index]);
 const complete=job?.targetId&&job.next===job.editorial.length;
 return <ui.Section title="DOAC Style"><ui.Stack>
 {!complete&&<><p>Make every word count.</p><small>Expressive captions, timed to your voice. Made for English talking-head videos.</small>
 <ui.Button onClick={()=>load()} disabled={storageLoading||busy||!context.sequenceId||!!job?.uncertain} busy={busy} busyLabel="Creating captions…">Create captions</ui.Button>
 <small>Use an analyzed, vertical 9:16 draft. Your original stays intact.</small></>}
 {complete&&<><ui.Message>Your captioned draft is ready.</ui.Message>{pendingPlan&&!busy&&<ui.Button variant="secondary" onClick={()=>load(job.sourceId)}>Finish prepared version</ui.Button>}
 <ui.Button disabled={storageLoading||busy} onClick={()=>action(async()=>{await run(`return await selects.editor.openDraft(${JSON.stringify(job.targetId)});`,'Open captioned draft');})}>Open preview</ui.Button>
 <ui.Button variant="secondary" disabled={storageLoading||busy} onClick={()=>setEditing(!editing)}>{editing?'Close editor':'Edit captions'}</ui.Button>
 {editing&&<><ui.Select label="Caption" value={String(index)} onChange={v=>setIndex(Number(v))} disabled={storageLoading||busy} options={job.editorial.map((s,i)=>({value:String(i),label:`${i+1}. ${job.input.words.slice(s.words[0],s.words[1]+1).map(w=>w.text).join(' ')}`}))}/>
 {preview&&<div style={{width:'100%',aspectRatio:'540 / 320',overflow:'hidden',background:'var(--panel-border)',borderRadius:'var(--panel-radius)'}}><svg viewBox="0 540 540 320" style={{width:'100%',height:'100%'}}><svg x={preview.x} y={preview.y} width={preview.w} height={preview.h} viewBox={`0 0 ${preview.w} ${preview.h}`} overflow="hidden"><image href={preview.atlas} x={-(preview.frameMap[Math.max(0,preview.frameMap.length-4)]%preview.cols)*preview.w} y={-Math.floor(preview.frameMap[Math.max(0,preview.frameMap.length-4)]/preview.cols)*preview.h} width={preview.cols*preview.w} height={preview.rows*preview.h}/></svg></svg></div>}
 <ui.TextField label="Wording" multiline value={text} onChange={setText} disabled={storageLoading||busy}/>
 <ui.Button variant="secondary" disabled={storageLoading||busy||!!job.uncertain} onClick={edit}>Save caption</ui.Button><small>Wording changes stay within the same caption timing. Change position and size on the timeline.</small></>}
 <ui.Button variant="ghost" disabled={storageLoading||busy} onClick={()=>load(job.sourceId,true)}>Create another version</ui.Button>
 {context.sequenceId!==job.targetId&&context.sequenceId!==job.sourceId&&<ui.Button variant="secondary" disabled={storageLoading||busy} onClick={()=>action(async()=>{await save(null);setEditing(false);setStatus('');})}>Use current draft</ui.Button>}
 </>}
 {busy&&<ui.Progress/>}{status&&busy&&<ui.Message>{status}</ui.Message>}
 {!busy&&job?.manifest&&!complete&&!job.uncertain&&<ui.Button variant="secondary" onClick={()=>action(()=>create(job))}>Continue creating captions</ui.Button>}
 {error&&pendingSave.current&&<ui.Button disabled={storageLoading||busy} onClick={()=>action(async()=>{})}>Retry saving progress</ui.Button>}
 {error&&<><ui.Message tone="error">{error}</ui.Message>{!busy&&!job?.uncertain&&<ui.Button variant="secondary" onClick={()=>load(job?.sourceId)}>Try again</ui.Button>}</>}
 </ui.Stack></ui.Section>;
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
