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
// (runtime.sh fetches a darwin CPython). Reached only through ensureRuntime,
// which refuses Windows first.
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
// The caption renderer is Python, set up by runtime.sh for macOS only, so Windows
// stops here before anything is planned or saved.
const MAC_ONLY='DOAC Style captions: Available on macOS for now.';
const FILE_ACCESS='Update Selects to enable caption file access.';
// The installed package folder (it holds approved/), found once per panel load.
let packageRoot=null;
function doacRoot(sdk){
 packageRoot??=hostRoots(sdk,'doac-style','approved').then(r=>r.plugin).catch(e=>{packageRoot=null;throw e?.code==='host-missing'?stepError('file-access',FILE_ACCESS):stepError('renderer','The caption renderer is missing. Reinstall DOAC Style.');});
 return packageRoot;
}
// Renderer code comes from the installed package, not an independently generated effect.
async function rendererCode(sdk){
 const root=await doacRoot(sdk);
 try{return await hostReadText(hostJoin(root,'approved','caption-scene.tsx.txt'));}
 catch(e){throw e?.code==='host-missing'?stepError('file-access',FILE_ACCESS):stepError('renderer','The caption renderer is missing. Reinstall DOAC Style.');}
}
// The bundled font ships base64-encoded; decode it next to the .b64 once.
async function ensureFont(sdk){
 const font=hostJoin(await doacRoot(sdk),'approved','native','fonts','permanentmarker','PermanentMarker-Regular.ttf');
 const f=hostApi('FileSystem','existsSync','writeFile');if(!f)throw stepError('file-access',FILE_ACCESS);
 // An empty file (an interrupted write) is decoded again; with renameSync the new file appears whole.
 const st=hostApi('FileSystem','statSync'),mv=hostApi('FileSystem','renameSync');
 if(f.existsSync(font)){let size=1;try{if(st)size=Number(st.statSync(font)?.size);}catch{}if(size>0)return;}
 const b64=(await hostReadText(font+'.b64')).replace(/\s+/g,'');
 const tmp=mv?font+'.part':font;
 await f.writeFile(tmp,Uint8Array.from(atob(b64),c=>c.charCodeAt(0)));
 if(mv)mv.renameSync(tmp,font);
}
let runtimeReady=null;
function ensureRuntime(sdk,say=()=>{}){
 if(hostIsWindows())return Promise.reject(stepError('mac-only',MAC_ONLY));
 runtimeReady??=(async()=>{await ensureFont(sdk);await macRuntime(sdk,say);})().catch(e=>{runtimeReady=null;throw e;});
 return runtimeReady;
}
function stepError(code,message){return Object.assign(Error(message),{code});}
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
 function fs(){const host=window.parent.opener||window.parent;const f=host.__DI__?.FileSystem;if(!f?.getOrCreateTmpDirPath||!f?.join||!f?.mkdirSync||!f?.writeFile||!f?.readFile)throw stepError('file-access','Update Selects to enable caption file access.');return f;}
 async function read(path){const b=await fs().readFile(path);return typeof b==='string'?b:new TextDecoder().decode(b);}
 async function run(script,summary,allowCommit=false){const r=await sdk.runScript({script,summary,allowCommit});if(r.isError||r.result==null)throw Error(r.output||'Could not confirm the save. Check the result draft before trying again.');return r.result;}
 // mac-only:start
 // The compiler runs through the macOS shell; ensureRuntime refuses Windows first.
 const quote=s=>"'"+String(s).replace(/'/g,"'\\''")+"'";
 async function shell(args){await ensureRuntime(sdk);const r=await sdk.runShell({summary:'Compile approved captions',command:'"$SELECTS_USER_SKILLS_ROOT/doac-style/.runtime/bin/python3" "$SELECTS_USER_SKILLS_ROOT/doac-style/approved/compile-captions.py" '+args,timeoutMs:300000,maxOutputBytes:48000});if(r.isError||r.exitCode!==0){const detail=(r.stderr||r.output||'').match(/(?:ValueError|AssertionError): ([^\n]+)/);throw stepError('render',detail?detail[1]:"The caption renderer could not complete this version. Check the DOAC Style installation, then try again.");}return r.stdout;}
 // mac-only:end
 function sameProject(j){if(currentProject()!==j.projectId)throw stepError('project-changed','Project changed. Return to the original project to continue.');}
 async function compile(j,scene){await ensureRuntime(sdk,onStatus);onStatus(scene==null?'Preparing typography and checking timing…':'Updating this caption…');const f=fs(),dir=f.join(j.path.replace(/[\\/][^\\/]+$/,''),'revision-'+Date.now());f.mkdirSync(dir,{recursive:true});const requestPath=f.join(dir,'job.json');await f.writeFile(requestPath,JSON.stringify(j));const output=await shell('compile '+quote(requestPath)+(scene==null?'':' --scene '+scene));const last=JSON.parse(output.trim().split('\n').pop());const m=JSON.parse(await read(last.manifest));sameProject(j);return m;}
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
   const fits=async(i,scene)=>{try{await compile({...j,editorial:allPlain.map((x,k)=>k===i?scene:x)});return true;}catch{return false;}};
   const chosen=[...j.editorial],removed=[];
   for(let i=0;i<j.editorial.length;i++){
    const scene=j.editorial[i];if(!scene.template)continue;
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
   try{return {job:repaired,manifest:await compile(repaired),removed};}catch{throw first;}
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
 async function prepare({projectId:pid,sourceId,forceNew=false,anyAspect=false,cacheKey=sourceId}){
 onStatus('Reading your transcript…');
 const v=await run(`const d=selects.draft(${JSON.stringify(sourceId)});return {meta:await d.meta(),clips:await d.clips({trackScope:'all'}),words:(await d.words({view:'playback'})).filter(w=>!w.nonSpeech&&w.text.trim()).map(w=>({text:w.text,start:w.startFrame,end:w.endFrame}))};`,'Read approved caption input');
 if(!v.words.length)throw stepError('no-transcript','This draft needs a transcript. Analyze its footage in Selects, then create captions.');
 if(!anyAspect&&v.meta.frameSize.width/v.meta.frameSize.height!==1080/1920)throw stepError('not-vertical','This style needs a vertical 9:16 draft. Change the aspect ratio in Selects first.');
 if(v.clips.some(c=>c.trackKind==='video'&&c.resourceId===null))throw stepError('has-graphics','This draft already contains generated graphics. Open the original draft without captions.');
 await ensureRuntime(sdk,onStatus);const catalogue=JSON.parse(await shell('catalogue'));const f=fs(),dir=f.join(f.getOrCreateTmpDirPath(),'approved-captions-'+Date.now());f.mkdirSync(dir,{recursive:true});
 const input={fps:v.meta.fps,frames:Math.max(...v.clips.filter(c=>c.trackKind==='main').map(c=>c.endFrame)),words:v.words};
 onStatus('Designing the full caption edit…');
 const cachePath=f.join(f.getOrCreateTmpDirPath(),'doac-style-plan-'+PLAN_VERSION+'-'+pid+'-'+cacheKey+'.json');
 const cacheSignature=PLAN_VERSION+'|'+JSON.stringify(input);let reply,editorial;
 try{
 if(!forceNew){try{const cached=JSON.parse(await read(cachePath));if(cached.signature===cacheSignature)reply={text:cached.text};}catch{}}
 if(!reply){reply=await sdk.askAI({timeoutMs:360000,prompt:planningPrompt(input,catalogue)});await f.writeFile(cachePath,JSON.stringify({signature:cacheSignature,text:reply.text}));}
 await fs().writeFile(f.join(dir,'ai-response.txt'),reply.text);let raw=reply.text.trim().replace(/^```(?:json)?\s*/,'').replace(/\s*```$/,'');editorial=completePlan(input.words,JSON.parse(raw),catalogue);
 }catch(e){throw e?.code?e:stepError('plan',e?.message||String(e));}
 const j={projectId:pid,sourceId,cacheKey,name:'DOAC Style Captions',input,editorial,path:f.join(dir,'job.json'),signature:JSON.stringify(v.words),baseCount:v.clips.filter(c=>c.trackKind==='video').length,frame:v.meta.frameSize,nonce:Date.now(),next:0};sameProject(j);persist(j);
 const compiled=await compileWithRecovery(j);const prepared={...compiled.job,manifest:compiled.manifest};persist(prepared);return prepared;
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
  j={...j,targetId:j.sourceId,clipIds:[]};persist(j);
 }
 if(!j.targetId){onStatus('Creating your captioned draft…');persist({...j,uncertain:true});const r=await run(`const s=selects.draft(${JSON.stringify(j.sourceId)});const words=(await s.words({view:'playback'})).filter(w=>!w.nonSpeech&&w.text.trim()).map(w=>({text:w.text,start:w.startFrame,end:w.endFrame}));if(JSON.stringify(words)!==${JSON.stringify(j.signature)})throw Error('The original draft changed. Create a new caption plan.');const d=await selects.project(${JSON.stringify(j.projectId)}).duplicateDraft({sourceDraftId:${JSON.stringify(j.sourceId)},name:${JSON.stringify('DOAC Style Captions')}});const r=await d.commitAll('Create approved caption draft');return {id:r.createdDraftId,link:await selects.editor.linkToDraftFrame(r.createdDraftId,0)};`,'Create approved caption draft',true);j={...j,targetId:r.id,link:r.link,clipIds:[],uncertain:false};persist(j);}
 const tsxCode=await rendererCode(sdk);
 const scale=fit?captionFit(j.frame):null,place=scale?`const added=(await d.clips({trackScope:'all'})).find(c=>c.clipId===r.clipId);await d.setClipTransform({clip:added,scale:${JSON.stringify(scale)}});`:'';
 const failed=[];
 for(let i=j.next;i<j.manifest.scenes.length;i++){
 sameProject(j);onStatus(`Adding captions · ${i+1} / ${j.manifest.scenes.length}`);
 try{
 const scene=j.manifest.scenes[i],data=JSON.parse(await read(scene.payload));persist({...j,uncertain:true});
 // Every saved scene adds one video clip, so the expected count is the base plus the scenes saved so far.
 const r=await run(`const d=selects.draft(${JSON.stringify(j.targetId)});const all=await d.clips({trackScope:'all'});if(all.filter(c=>c.trackKind==='video').length!==${j.baseCount+j.clipIds.length})throw Error('The result draft changed. Saving stopped to avoid duplicate captions.');const r=await d.addMotionGraphic({label:${JSON.stringify('DOAC Style '+scene.template+' · '+scene.text)},within:await d.rangeAtFrames(${scene.start},${scene.end}),tsxCode:${JSON.stringify(tsxCode)},parameters:${JSON.stringify(data)}});${place}await d.commitAll('Add approved caption scene');return {clipId:r.clipId};`,'Save approved caption scene',true);
 j={...j,next:i+1,clipIds:[...j.clipIds,r.clipId],uncertain:false};persist(j);
 }catch(e){if(!skipFailedScenes)throw e;failed.push(i);j={...j,next:i+1,uncertain:false};persist(j);}
 }
 if(!j.clipIds.length&&j.manifest.scenes.length)throw stepError('no-scenes','No captions could be added to the result draft.');
 if(!failed.length){const f=fs(),cachePath=f.join(f.getOrCreateTmpDirPath(),'doac-style-plan-'+PLAN_VERSION+'-'+j.projectId+'-'+(j.cacheKey||j.sourceId)+'.json');try{const cache=JSON.parse(await read(cachePath));if(cache.signature===PLAN_VERSION+'|'+JSON.stringify(j.input))await f.writeFile(cachePath,JSON.stringify({...cache,applied:true}));}catch{}}
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
 'mac-only':MAC_ONLY,
 'plan':'Selects AI could not plan the captions. Try again.',
 'no-scenes':'No captions could be added to the timeline. Try again.',
};
const TEMPLATE_FALLBACK='DOAC Style could not make the captioned timeline. Try again.';
// Headless run for a built-in app, with the plugin's defaults and nobody
// watching, reported once per run. A Project video is placed whole on a new
// draft and captioned in place; a timeline (the open draft) is captioned in place.
function TemplateRun({sdk,context}){
 const [status,setStatus]=useState('Starting DOAC Style…');
 const started=useRef(new Set()),live=useRef(null),project=useRef(context.projectId);
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
    // Windows cannot run the caption renderer yet: stop before a draft is made.
    if(hostIsWindows())throw stepError('mac-only',MAC_ONLY);
    const pid=context.projectId;if(!pid)throw stepError('no-project','No project is open.');
    const speaker=template.inputs?.speaker||[];
    const source=speaker.find(x=>(x?.kind==='video'&&x.resourceId)||(x?.kind==='timeline'&&x.sequenceId));
    if(!source)throw speaker.some(x=>x?.kind==='video')?stepError('no-video','No video was given.'):stepError('no-timeline','No timeline was given.');
    const steps=captionSteps({sdk,currentProject:()=>project.current,onStatus:setStatus,persist:j=>{job=j;}});
    let result;
    if(source.kind==='video'){
     // The new draft is the output: plan against it and add the scenes to it.
     const made=await steps.createFromClip({projectId:pid,resourceId:source.resourceId});
     if(made.noWords)throw stepError('no-transcript','The video has no transcript.');
     const prepared=await steps.prepare({projectId:pid,sourceId:made.id,anyAspect:true,cacheKey:'video-'+String(source.resourceId).replace(/[^\w-]/g,'_')});
     result=await steps.create(prepared,{open:false,fit:true,skipFailedScenes:true,inPlace:true});
    }else{
     const prepared=await steps.prepare({projectId:pid,sourceId:source.sequenceId,anyAspect:true});
     result=await steps.create(prepared,{open:false,fit:true,skipFailedScenes:true,inPlace:true});
    }
    finish({sequenceId:result.job.targetId});
   }catch(e){
    // Keep a caption draft that already holds some captions rather than discarding the work.
    if(job?.targetId&&job.clipIds?.length)finish({sequenceId:job.targetId});
    else{console.warn('[doac-style] template run failed:',e?.code||'',e?.message||e);finish({error:TEMPLATE_ERRORS[e?.code]||TEMPLATE_FALLBACK});}
   }
  })().catch(()=>finish({error:TEMPLATE_FALLBACK}));
 },[runId]);
 return <small>{status}</small>;
}
export default function Panel(props){return props.context.template?<TemplateRun {...props}/>:<CaptionPanel {...props}/>;}
function CaptionPanel({sdk,context,ui}) {
 const [busy,setBusy]=useState(false),[status,setStatus]=useState(''),[error,setError]=useState(''),[job,setJob]=useState(null),[index,setIndex]=useState(0),[text,setText]=useState(''),[preview,setPreview]=useState(''),[editing,setEditing]=useState(false),[sourceName,setSourceName]=useState(''),[pendingPlan,setPendingPlan]=useState(false);
 useEffect(()=>{let live=true;if(!context.sequenceId){setSourceName('');return;}sdk.runScript({script:`return await selects.draft(${JSON.stringify(context.sequenceId)}).meta();`,summary:'Read current draft'}).then(r=>{if(live)setSourceName(r.result?.name||'');}).catch(()=>{});return()=>{live=false;};},[context.sequenceId]);
 const lock=useRef(false),project=useRef(context.projectId);project.current=context.projectId;
 const key='doac-style-'+PLAN_VERSION+'-'+context.projectId;
 useEffect(()=>{try{setJob(JSON.parse(localStorage.getItem(key)||'null'));}catch{setJob(null);}setIndex(0);setError('');},[key]);
 function save(j){setJob(j);localStorage.setItem(key,JSON.stringify(j));}
 const steps=captionSteps({sdk,currentProject:()=>project.current,onStatus:setStatus,persist:save}),{fs,read,run,sameProject,compile}=steps;
 useEffect(()=>{let live=true;const id=job?.sourceId||context.sequenceId;if(!id)return;let f;try{f=fs();}catch{setPendingPlan(false);return;}read(f.join(f.getOrCreateTmpDirPath(),'doac-style-plan-'+PLAN_VERSION+'-'+context.projectId+'-'+id+'.json')).then(JSON.parse).then(c=>{if(live)setPendingPlan(!c.applied);}).catch(()=>{if(live)setPendingPlan(false);});return()=>{live=false;};},[job?.sourceId,context.sequenceId,busy]);
 async function action(fn){if(lock.current)return;lock.current=true;setBusy(true);setError('');try{await fn();}catch(e){setError(e.message||String(e));}finally{lock.current=false;setBusy(false);}}
 async function load(sourceOverride,forceNew=false){await action(async()=>{
 if(macOnly)throw stepError('mac-only',MAC_ONLY);
 if(!context.projectId||!context.sequenceId)throw Error('Open a draft to add captions.');
 const prepared=await steps.prepare({projectId:context.projectId,sourceId:sourceOverride||context.sequenceId,forceNew});await create(prepared);
 });}
 async function create(task){await steps.create(task);setPendingPlan(false);}
 async function edit(){await action(async()=>{const j=replaceWording(job,index,text);sameProject(j);
 const m=await compile(j,index),s=m.scenes[0];j.manifest.scenes[index]=s;j.manifest.records=m.records;
 if(j.targetId){if(j.next!==j.editorial.length||j.uncertain)throw Error('Finish creating the draft before editing captions.');const data=JSON.parse(await read(s.payload));const tsxCode=await rendererCode(sdk);save({...job,uncertain:true});
 const r=await run(`const d=selects.draft(${JSON.stringify(j.targetId)});const old=(await d.clips({trackScope:'all'})).find(c=>c.clipId===${j.clipIds[index]});if(!old)throw Error('This caption clip changed. Reopen the result draft.');if(old.startFrame!==${s.start}||old.endFrame!==${s.end})throw Error('This caption was trimmed on the timeline. Restore its original timing before changing the wording.');const tr=await d.clipTransform(old);await d.removeClips(old);const r=await d.addMotionGraphic({label:${JSON.stringify('DOAC Style '+s.template+' · '+s.text)},within:await d.rangeAtFrames(${s.start},${s.end}),tsxCode:${JSON.stringify(tsxCode)},parameters:${JSON.stringify(data)}});const added=(await d.clips({trackScope:'all'})).find(c=>c.clipId===r.clipId);await d.setClipTransform({clip:added,position:tr.position,scale:tr.scale,rotation:tr.rotation});await d.commitAll('Edit approved caption wording');return {clipId:r.clipId};`,'Edit approved caption wording',true);j.clipIds[index]=r.clipId;j.uncertain=false;}
 save(j);setStatus('Caption updated.');});}
 useEffect(()=>{let live=true;if(!job?.editorial?.[index])return;const [a,z]=job.editorial[index].words;setText(job.input.words.slice(a,z+1).map(w=>w.text).join(' '));setPreview('');const s=job.manifest?.scenes?.[index];if(s)read(s.payload).then(JSON.parse).then(d=>{if(live)setPreview(d);}).catch(()=>{});return()=>{live=false};},[job,index]);
 const complete=job?.targetId&&job.next===job.editorial.length,macOnly=hostIsWindows();
 return <ui.Section title="DOAC Style"><ui.Stack>
 {!complete&&<><p>Make every word count.</p><small>Expressive captions, timed to your voice. Made for English talking-head videos.</small>
 <ui.Button onClick={()=>load()} disabled={busy||macOnly||!context.sequenceId||!!job?.uncertain} busy={busy} busyLabel="Creating captions…">Create captions</ui.Button>
 {macOnly&&<ui.Message>{MAC_ONLY}</ui.Message>}
 <small>Use an analyzed, vertical 9:16 draft. Your original stays intact.</small></>}
 {complete&&<><ui.Message>Your captioned draft is ready.</ui.Message>{pendingPlan&&!busy&&<ui.Button variant="secondary" onClick={()=>load(job.sourceId)}>Finish prepared version</ui.Button>}
 <ui.Button disabled={busy} onClick={()=>action(async()=>{await run(`return await selects.editor.openDraft(${JSON.stringify(job.targetId)});`,'Open captioned draft');})}>Open preview</ui.Button>
 <ui.Button variant="secondary" disabled={busy} onClick={()=>setEditing(!editing)}>{editing?'Close editor':'Edit captions'}</ui.Button>
 {editing&&<><ui.Select label="Caption" value={String(index)} onChange={v=>setIndex(Number(v))} disabled={busy} options={job.editorial.map((s,i)=>({value:String(i),label:`${i+1}. ${job.input.words.slice(s.words[0],s.words[1]+1).map(w=>w.text).join(' ')}`}))}/>
 {preview&&<div style={{width:'100%',aspectRatio:'540 / 320',overflow:'hidden',background:'var(--panel-border)',borderRadius:'var(--panel-radius)'}}><svg viewBox="0 540 540 320" style={{width:'100%',height:'100%'}}><svg x={preview.x} y={preview.y} width={preview.w} height={preview.h} viewBox={`0 0 ${preview.w} ${preview.h}`} overflow="hidden"><image href={preview.atlas} x={-(preview.frameMap[Math.max(0,preview.frameMap.length-4)]%preview.cols)*preview.w} y={-Math.floor(preview.frameMap[Math.max(0,preview.frameMap.length-4)]/preview.cols)*preview.h} width={preview.cols*preview.w} height={preview.rows*preview.h}/></svg></svg></div>}
 <ui.TextField label="Wording" multiline value={text} onChange={setText} disabled={busy}/>
 <ui.Button variant="secondary" disabled={busy||!!job.uncertain} onClick={edit}>Save caption</ui.Button><small>Wording changes stay within the same caption timing. Change position and size on the timeline.</small></>}
 <ui.Button variant="ghost" disabled={busy} onClick={()=>load(job.sourceId,true)}>Create another version</ui.Button>
 {context.sequenceId!==job.targetId&&context.sequenceId!==job.sourceId&&<ui.Button variant="secondary" disabled={busy} onClick={()=>{save(null);setEditing(false);setStatus('');}}>Use current draft</ui.Button>}
 </>}
 {busy&&<ui.Progress/>}{status&&busy&&<ui.Message>{status}</ui.Message>}
 {!busy&&job?.manifest&&!complete&&!job.uncertain&&<ui.Button variant="secondary" onClick={()=>action(()=>create(job))}>Continue creating captions</ui.Button>}
 {error&&<><ui.Message tone="error">{error}</ui.Message>{!busy&&!job?.uncertain&&<ui.Button variant="secondary" onClick={()=>load(job?.sourceId)}>Try again</ui.Button>}</>}
 </ui.Stack></ui.Section>;
}
