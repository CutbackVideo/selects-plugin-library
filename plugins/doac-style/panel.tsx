// @name DOAC Style
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
   const slots=Array.isArray(candidate.slots)?candidate.slots.map(function(r){return Array.isArray(r)?[Number(r[0]),Number(r[1])]:null;}):[];
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
export default function Panel({sdk,context,ui}) {
 const [busy,setBusy]=useState(false),[status,setStatus]=useState(''),[error,setError]=useState(''),[job,setJob]=useState(null),[index,setIndex]=useState(0),[text,setText]=useState(''),[preview,setPreview]=useState(''),[editing,setEditing]=useState(false),[sourceName,setSourceName]=useState(''),[pendingPlan,setPendingPlan]=useState(false);
 useEffect(()=>{let live=true;if(!context.sequenceId){setSourceName('');return;}sdk.runScript({script:`return await selects.draft(${JSON.stringify(context.sequenceId)}).meta();`,summary:'Read current draft'}).then(r=>{if(live)setSourceName(r.result?.name||'');}).catch(()=>{});return()=>{live=false;};},[context.sequenceId]);
 const lock=useRef(false),project=useRef(context.projectId);project.current=context.projectId;
 const key='doac-style-'+PLAN_VERSION+'-'+context.projectId;
 useEffect(()=>{try{setJob(JSON.parse(localStorage.getItem(key)||'null'));}catch{setJob(null);}setIndex(0);setError('');},[key]);
 function save(j){setJob(j);localStorage.setItem(key,JSON.stringify(j));}
 useEffect(()=>{let live=true;const id=job?.sourceId||context.sequenceId;if(!id)return;const f=fs();read(f.join(f.getOrCreateTmpDirPath(),'doac-style-plan-'+PLAN_VERSION+'-'+context.projectId+'-'+id+'.json')).then(JSON.parse).then(c=>{if(live)setPendingPlan(!c.applied);}).catch(()=>{if(live)setPendingPlan(false);});return()=>{live=false;};},[job?.sourceId,context.sequenceId,busy]);
 function fs(){const host=window.parent.opener||window.parent;const f=host.__DI__?.FileSystem;if(!f?.getOrCreateTmpDirPath||!f?.join||!f?.mkdirSync||!f?.writeFile||!f?.readFile)throw Error('Update Selects to enable caption file access.');return f;}
 async function read(path){const b=await fs().readFile(path);return typeof b==='string'?b:new TextDecoder().decode(b);}
 const quote=s=>"'"+String(s).replace(/'/g,"'\\''")+"'";
 async function run(script,summary,allowCommit=false){const r=await sdk.runScript({script,summary,allowCommit});if(r.isError||r.result==null)throw Error(r.output||'Could not confirm the save. Check the result draft before trying again.');return r.result;}
 async function shell(args){const r=await sdk.runShell({summary:'Compile approved captions',command:'python3 "$SELECTS_USER_SKILLS_ROOT/doac-style/approved/compile-captions.py" '+args,timeoutMs:300000,maxOutputBytes:48000});if(r.isError||r.exitCode!==0){const detail=(r.stderr||r.output||'').match(/(?:ValueError|AssertionError): ([^\n]+)/);throw Error(detail?detail[1]:"The caption renderer could not complete this version. Check the DOAC Style installation, then try again.");}return r.stdout;}
 async function action(fn){if(lock.current)return;lock.current=true;setBusy(true);setError('');try{await fn();}catch(e){setError(e.message||String(e));}finally{lock.current=false;setBusy(false);}}
 function sameProject(j){if(project.current!==j.projectId)throw Error('Project changed. Return to the original project to continue.');}
 async function compile(j,scene){setStatus(scene==null?'Preparing typography and checking timing…':'Updating this caption…');const f=fs(),dir=f.join(j.path.replace(/\/[^/]+$/,''),'revision-'+Date.now());f.mkdirSync(dir,{recursive:true});const requestPath=f.join(dir,'job.json');await f.writeFile(requestPath,JSON.stringify(j));const output=await shell('compile '+quote(requestPath)+(scene==null?'':' --scene '+scene));const last=JSON.parse(output.trim().split('\n').pop());const m=JSON.parse(await read(last.manifest));sameProject(j);return m;}
 async function compileWithRecovery(j){
  try{return {job:j,manifest:await compile(j)};}
  catch(first){
   const message=String(first?.message||first);
   if(!/fit|hierarchy|composition|reference/i.test(message))throw first;
   // A template can fail because its source hierarchy cannot carry a new phrase.
   // Try a verified sibling with the same number of visual slots before falling
   // back to plain speech; this preserves designed typography whenever possible.
   const siblings={3:['21','13','38'],4:['23','33'],5:['24','19'],6:['09','11'],7:['22','06']};
   let current=j,removed=[],tried=new Set();
   for(let pass=0;pass<j.editorial.length;pass++){
    try{return {job:current,manifest:await compile(current),removed};}catch{}
    let repaired=false;
    for(let i=0;i<current.editorial.length;i++){
     const scene=current.editorial[i];if(!scene.template||removed.includes(i))continue;
     const alternatives=(siblings[scene.slots?.length]||[]).filter(id=>id!==String(scene.template)&&!tried.has(i+':'+id));
     for(const id of alternatives){
      tried.add(i+':'+id);
      // Question and number layouts carry strict semantics; never substitute them blindly.
      if(id==='19'&&!/\?/.test(current.input.words.slice(scene.words[0],scene.words[1]+1).map(w=>w.text).join(' ')))continue;
      const trial={...current,editorial:current.editorial.map((x,k)=>k===i?{...x,template:id,focusSlot:Math.min(Number(x.focusSlot||0),scene.slots.length-1)}:x)};
      try{await compile(trial);current=trial;repaired=true;break;}catch{}
     }
     if(repaired)break;
     const trial={...current,editorial:current.editorial.map((x,k)=>k===i?{words:x.words,kind:'plain'}:x)};
     try{await compile(trial);current=trial;removed.push(i);repaired=true;break;}catch{}
    }
    if(!repaired)throw first;
   }
   throw first;
  }
 }
 async function load(sourceOverride,forceNew=false){await action(async()=>{
 if(!context.projectId||!context.sequenceId)throw Error('Open a draft to add captions.');
 setStatus('Reading your transcript…');const sourceId=sourceOverride||context.sequenceId,pid=context.projectId;
 const v=await run(`const d=selects.draft(${JSON.stringify(sourceId)});return {meta:await d.meta(),clips:await d.clips({trackScope:'all'}),words:(await d.words({view:'playback'})).filter(w=>!w.nonSpeech&&w.text.trim()).map(w=>({text:w.text,start:w.startFrame,end:w.endFrame}))};`,'Read approved caption input');
 if(!v.words.length)throw Error('This draft needs a transcript. Analyze its footage in Selects, then create captions.');
 if(v.meta.frameSize.width/v.meta.frameSize.height!==1080/1920)throw Error('This style needs a vertical 9:16 draft. Change the aspect ratio in Selects first.');
 if(v.clips.some(c=>c.trackKind==='video'&&c.resourceId===null))throw Error('This draft already contains generated graphics. Open the original draft without captions.');
 const catalogue=JSON.parse(await shell('catalogue'));const f=fs(),dir=f.join(f.getOrCreateTmpDirPath(),'approved-captions-'+Date.now());f.mkdirSync(dir,{recursive:true});
 const input={fps:v.meta.fps,frames:Math.max(...v.clips.filter(c=>c.trackKind==='main').map(c=>c.endFrame)),words:v.words};
 setStatus('Designing the full caption edit…');
 const cachePath=f.join(f.getOrCreateTmpDirPath(),'doac-style-plan-'+PLAN_VERSION+'-'+pid+'-'+sourceId+'.json');
 const cacheSignature=PLAN_VERSION+'|'+JSON.stringify(input);let reply;
 if(!forceNew){try{const cached=JSON.parse(await read(cachePath));if(cached.signature===cacheSignature)reply={text:cached.text};}catch{}}
 if(!reply){reply=await sdk.askAI({timeoutMs:360000,prompt:planningPrompt(input,catalogue)});await f.writeFile(cachePath,JSON.stringify({signature:cacheSignature,text:reply.text}));}
 await fs().writeFile(f.join(dir,'ai-response.txt'),reply.text);let raw=reply.text.trim().replace(/^```(?:json)?\s*/,'').replace(/\s*```$/,'');const editorial=completePlan(input.words,JSON.parse(raw),catalogue);
 const j={projectId:pid,sourceId,name:'DOAC Style Captions',input,editorial,path:f.join(dir,'job.json'),signature:JSON.stringify(v.words),baseCount:v.clips.filter(c=>c.trackKind==='video').length,nonce:Date.now(),next:0};sameProject(j);save(j);
 const compiled=await compileWithRecovery(j);const prepared={...compiled.job,manifest:compiled.manifest};save(prepared);await create(prepared);
 });}
 async function create(task){let j=task;sameProject(j);if(!j.manifest)throw Error('Prepare captions before applying them.');
 if(j.uncertain)throw Error('The last save was not confirmed. Check the result draft before retrying.');
 if(!j.targetId){setStatus('Creating your captioned draft…');save({...j,uncertain:true});const r=await run(`const s=selects.draft(${JSON.stringify(j.sourceId)});const words=(await s.words({view:'playback'})).filter(w=>!w.nonSpeech&&w.text.trim()).map(w=>({text:w.text,start:w.startFrame,end:w.endFrame}));if(JSON.stringify(words)!==${JSON.stringify(j.signature)})throw Error('The original draft changed. Create a new caption plan.');const d=await selects.project(${JSON.stringify(j.projectId)}).duplicateDraft({sourceDraftId:${JSON.stringify(j.sourceId)},name:${JSON.stringify('DOAC Style Captions')}});const r=await d.commitAll('Create approved caption draft');return {id:r.createdDraftId,link:await selects.editor.linkToDraftFrame(r.createdDraftId,0)};`,'Create approved caption draft',true);j={...j,targetId:r.id,link:r.link,clipIds:[],uncertain:false};save(j);}
 // Renderer code comes from the installed package, not an independently generated effect.
 const codeResult=await sdk.runShell({summary:'Read caption renderer',command:'cat "$SELECTS_USER_SKILLS_ROOT/doac-style/approved/caption-scene.tsx.txt"',maxOutputBytes:16000});if(codeResult.isError||codeResult.exitCode!==0)throw Error('The caption renderer is missing. Reinstall DOAC Style.');
 for(let i=j.next;i<j.manifest.scenes.length;i++){
 sameProject(j);setStatus(`Adding captions · ${i+1} / ${j.manifest.scenes.length}`);const scene=j.manifest.scenes[i],data=JSON.parse(await read(scene.payload));save({...j,uncertain:true});
 const r=await run(`const d=selects.draft(${JSON.stringify(j.targetId)});const all=await d.clips({trackScope:'all'});if(all.filter(c=>c.trackKind==='video').length!==${j.baseCount+i})throw Error('The result draft changed. Saving stopped to avoid duplicate captions.');const r=await d.addMotionGraphic({label:${JSON.stringify('DOAC Style '+scene.template+' · '+scene.text)},within:await d.rangeAtFrames(${scene.start},${scene.end}),tsxCode:${JSON.stringify(codeResult.stdout)},parameters:${JSON.stringify(data)}});await d.commitAll('Add approved caption scene');return {clipId:r.clipId};`,'Save approved caption scene',true);
 j={...j,next:i+1,clipIds:[...j.clipIds,r.clipId],uncertain:false};save(j);
 }
 const f=fs(),cachePath=f.join(f.getOrCreateTmpDirPath(),'doac-style-plan-'+PLAN_VERSION+'-'+j.projectId+'-'+j.sourceId+'.json');try{const cache=JSON.parse(await read(cachePath));if(cache.signature===PLAN_VERSION+'|'+JSON.stringify(j.input))await f.writeFile(cachePath,JSON.stringify({...cache,applied:true}));}catch{}setPendingPlan(false);setStatus('Your captioned draft is ready.');await run(`return await selects.editor.openDraft(${JSON.stringify(j.targetId)});`,'Open DOAC Style draft');
 }
 async function edit(){await action(async()=>{const j=replaceWording(job,index,text);sameProject(j);
 const m=await compile(j,index),s=m.scenes[0];j.manifest.scenes[index]=s;j.manifest.records=m.records;
 if(j.targetId){if(j.next!==j.editorial.length||j.uncertain)throw Error('Finish creating the draft before editing captions.');const data=JSON.parse(await read(s.payload));const c=await sdk.runShell({summary:'Read caption renderer',command:'cat "$SELECTS_USER_SKILLS_ROOT/doac-style/approved/caption-scene.tsx.txt"',maxOutputBytes:16000});if(c.isError||c.exitCode!==0)throw Error('The caption renderer could not be read.');save({...job,uncertain:true});
 const r=await run(`const d=selects.draft(${JSON.stringify(j.targetId)});const old=(await d.clips({trackScope:'all'})).find(c=>c.clipId===${j.clipIds[index]});if(!old)throw Error('This caption clip changed. Reopen the result draft.');if(old.startFrame!==${s.start}||old.endFrame!==${s.end})throw Error('This caption was trimmed on the timeline. Restore its original timing before changing the wording.');const tr=await d.clipTransform(old);await d.removeClips(old);const r=await d.addMotionGraphic({label:${JSON.stringify('DOAC Style '+s.template+' · '+s.text)},within:await d.rangeAtFrames(${s.start},${s.end}),tsxCode:${JSON.stringify(c.stdout)},parameters:${JSON.stringify(data)}});const added=(await d.clips({trackScope:'all'})).find(c=>c.clipId===r.clipId);await d.setClipTransform({clip:added,position:tr.position,scale:tr.scale,rotation:tr.rotation});await d.commitAll('Edit approved caption wording');return {clipId:r.clipId};`,'Edit approved caption wording',true);j.clipIds[index]=r.clipId;j.uncertain=false;}
 save(j);setStatus('Caption updated.');});}
 useEffect(()=>{let live=true;if(!job?.editorial?.[index])return;const [a,z]=job.editorial[index].words;setText(job.input.words.slice(a,z+1).map(w=>w.text).join(' '));setPreview('');const s=job.manifest?.scenes?.[index];if(s)read(s.payload).then(JSON.parse).then(d=>{if(live)setPreview(d);}).catch(()=>{});return()=>{live=false};},[job,index]);
 const complete=job?.targetId&&job.next===job.editorial.length;
 return <ui.Section title="DOAC Style"><ui.Stack>
 {!complete&&<><p>Make every word count.</p><small>Expressive captions, timed to your voice. Made for English talking-head videos.</small>
 <ui.Button onClick={()=>load()} disabled={busy||!context.sequenceId||!!job?.uncertain} busy={busy} busyLabel="Creating captions…">Create captions</ui.Button>
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
