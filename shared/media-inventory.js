// Bounded, read-only inventory observations. This is not a Project snapshot lock.
async function readInventoryPages(run, script, config, fill, wanted = () => true, options = {}) {
 const issue=(code,message,cause=undefined)=>Object.assign(Error(message),{code:'MEDIA_INVENTORY_'+code,publicMessage:message,...cause===undefined?{}:{cause}});
 const {timeoutMs=120000}=options??{};
 if(typeof run!=='function'||typeof script!=='string'||!script||typeof fill!=='function'||typeof wanted!=='function'||!config||typeof config.projectId!=='string'||!config.projectId||!Number.isFinite(timeoutMs)||timeoutMs<1||timeoutMs>120000)throw issue('INPUT','The Project media observation request is invalid.');
 const encode=value=>{
  const seen=new Set();
  const visit=(value,depth)=>{
   if(depth>24)throw issue('INVALID','Project media returned an unsupported nested value.');
   if(value===null||['string','boolean'].includes(typeof value))return JSON.stringify(value);
   if(typeof value==='number'){if(!Number.isFinite(value))throw issue('INVALID','Project media returned an invalid number.');return JSON.stringify(value);}
   if(value===undefined)return undefined;
   if(typeof value!=='object'||seen.has(value)||!Array.isArray(value)&&Object.prototype.toString.call(value)!=='[object Object]')throw issue('INVALID','Project media returned an unsupported value.');
   seen.add(value);let result;
   if(Array.isArray(value))result='['+value.map(v=>visit(v,depth+1)??'null').join(',')+']';
   else result='{'+Object.keys(value).sort().flatMap(key=>{const item=visit(value[key],depth+1);return item===undefined?[]:[JSON.stringify(key)+':'+item];}).join(',')+'}';
   seen.delete(value);return result;
  };
  return visit(value,0);
 };
 const bytes=text=>new TextEncoder().encode(text).length;
 const requestText=encode(config);
 if(bytes(requestText)>65536||bytes(script)>131072)throw issue('BUDGET','The Project media input exceeds its observation budget.');
 const request=JSON.parse(requestText),deadline=Date.now()+timeoutMs;let closed=false,timer,watch;const waits=new Set();
 const stillWanted=()=>{try{return !!wanted();}catch{return false;}};
 const live=()=>!closed&&stillWanted();
 const check=()=>{if(!live())throw issue('STOPPED','The Project media read ended before completion.');if(Date.now()>=deadline)throw issue('TIMEOUT','The Project media observation timed out.');};
 check();
 const scope=new Promise((_,reject)=>{
  timer=setTimeout(()=>reject(issue('TIMEOUT','The Project media observation timed out.')),Math.max(0,deadline-Date.now()));
  const observe=()=>{try{check();watch=setTimeout(observe,50);}catch(error){reject(error);}};
  watch=setTimeout(observe,50);
 });
 const pause=ms=>{
  check();return new Promise((resolve,reject)=>{
   let id,done=false;const finish=(error)=>{if(done)return;done=true;clearTimeout(id);waits.delete(id);error?reject(error):resolve();};
   id=setTimeout(()=>{try{check();finish();}catch(error){finish(error);}},Math.min(ms,Math.max(0,deadline-Date.now())));waits.add(id);
   scope.catch(error=>finish(error));
  });
 };
 const read=async(offset,budget)=>{
  check();
  let batch;try{batch=await run('Read footage',attempt=>fill(script,{...request,page:{offset,size:32},measureMs:attempt?0:budget.measureMs,probeMs:budget.probeMs,probeMax:budget.probeMax}),false,{wanted:()=>live()&&Date.now()<deadline,deadline,wait:pause});}catch(error){check();throw error;}
  check();const page=batch?.page;
  if(!page||!Number.isSafeInteger(page.total)||page.total<0||!Number.isFinite(page.elapsedMs)||page.elapsedMs<0||!Number.isSafeInteger(page.probeCount??0)||(page.probeCount??0)<0||!Array.isArray(batch.resources)||!Array.isArray(batch.photos)||batch.resources.length+batch.photos.length>Math.max(0,Math.min(32,page.total-offset))||typeof batch.incomplete!=='boolean')throw issue('INVALID','Project media returned an invalid or incomplete page.');
  if(page.total>16384)throw issue('BUDGET','The Project media list exceeds its observation row budget.');
  if(batch.resources.some(row=>!row||typeof row.rid!=='string'||!row.rid||row.kind!=='video'||!Number.isFinite(row.duration)||row.duration<=0)||batch.photos.some(row=>!row||typeof row.rid!=='string'||!row.rid||row.kind!=='photo'))throw issue('INVALID','Project media returned an invalid source identity or duration.');
  for(const key of ['skipped','counts','captureDates'])if(batch[key]!==undefined&&(!batch[key]||typeof batch[key]!=='object'||Array.isArray(batch[key])||Object.values(batch[key]).some(value=>typeof value!=='boolean'&&(!Number.isSafeInteger(value)||value<0||value>32))))throw issue('INVALID','Project media returned invalid counters.');
  if(batch.months!==undefined&&(!Array.isArray(batch.months)||batch.months.length!==12||batch.months.some(n=>!Number.isSafeInteger(n)||n<0)))throw issue('INVALID','Project media returned invalid month counts.');
  const {page:ignored,...data}=batch,snapshot=encode(data);
  if(bytes(snapshot)>196608)throw issue('BUDGET','A Project media page exceeds its observation byte budget.');
  return {page,snapshot,data:JSON.parse(snapshot)};
 };
 const work=async()=>{
  const pages=[],identities=new Set();let total,used=0;
  const budget={measureMs:request.measureMs??8000,probeMs:request.probeMs??4000,probeMax:request.probeMax??200};
  if(Object.values(budget).some(n=>!Number.isFinite(n)||n<0)||!Number.isSafeInteger(budget.probeMax))throw issue('INPUT','The Project media read budget is invalid.');
  for(let offset=0;;offset+=32){
   const observed=await read(offset,budget);
   if(total!==undefined&&observed.page.total!==total)throw issue('CHANGED','Project media changed while loading. Try again.');
   total=observed.page.total;used+=bytes(observed.snapshot);
   if(used>8388608)throw issue('BUDGET','The Project media result exceeds its observation byte budget.');
   for(const row of [...observed.data.resources,...observed.data.photos]){if(identities.has(row.rid))throw issue('CHANGED','Project media changed or repeated an identity while loading. Try again.');identities.add(row.rid);}
   pages.push(observed);
   budget.measureMs=Math.max(0,budget.measureMs-observed.page.elapsedMs);budget.probeMs=Math.max(0,budget.probeMs-observed.page.elapsedMs);budget.probeMax=Math.max(0,budget.probeMax-(observed.page.probeCount??0));
   if(offset+32>=total)break;
  }
  // Reobserve the actual projected values, not a count-only or lossy hash token.
  // This detects observed drift; it cannot lock the Project against later edits.
  for(let index=0;index<pages.length;index++){
   const verified=await read(index*32,{measureMs:0,probeMs:0,probeMax:0});
   if(verified.page.total!==total||verified.snapshot!==pages[index].snapshot)throw issue('CHANGED','Project media changed while its pages were verified. Try again.');
  }
  const result=pages[0].data;
  const keys=value=>Object.keys(value).sort().join('\0');
  for(const {data} of pages.slice(1)){
   if(keys(data)!==keys(result))throw issue('INVALID','Project media changed its result shape.');
   for(const key of Object.keys(data))if(!['resources','photos','skipped','counts','captureDates','months','incomplete'].includes(key)&&encode(data[key])!==encode(result[key]))throw issue('CHANGED','Project media changed its shared metadata.');
   result.resources.push(...data.resources);result.photos.push(...data.photos);
   for(const key of ['skipped','counts','captureDates'])if(data[key]){
    if(!result[key]||keys(result[key])!==keys(data[key]))throw issue('INVALID','Project media changed its counter shape.');
    for(const [name,value] of Object.entries(data[key])){
     if(typeof result[key][name]!==typeof value)throw issue('INVALID','Project media changed its counter shape.');
     result[key][name]=typeof value==='boolean'?result[key][name]&&value:result[key][name]+value;
    }
   }
   if(data.months){if(!result.months)throw issue('INVALID','Project media changed its month shape.');result.months=result.months.map((n,i)=>n+data.months[i]);}
   result.incomplete=result.incomplete||data.incomplete;
  }
  check();return result;
 };
 let value,failure,failed=false;
 try{value=await Promise.race([work(),scope]);}catch(error){failure=error;failed=true;}
 closed=true;const cleanupFailures=[];
 for(const id of new Set([timer,watch,...waits]))if(id!==undefined){try{clearTimeout(id);}catch(error){cleanupFailures.push(error);}}
 // Promise delivery and cleanup can themselves outlive the final page check.
 if(!stillWanted()){failure=issue('STOPPED','The Project media read ended before completion.',failure);failed=true;}
 else if(Date.now()>=deadline){failure=issue('TIMEOUT','The Project media observation timed out.',failure);failed=true;}
 if(cleanupFailures.length){
  const code=failure?.code?.startsWith('MEDIA_INVENTORY_')?failure.code.slice('MEDIA_INVENTORY_'.length):'CLEANUP';
  failure=Object.assign(issue(code,failure?.publicMessage??'Project media read cleanup could not be confirmed.',failed?failure:cleanupFailures[0]),{terminal:true,cleanupFailures});failed=true;
 }
 if(failed)throw failure;return value;
}

// Bind admission to the exact confirmed observation and its mounted Project.
// Displayed old rows may survive a refresh failure; permission to build may not.
function isInventorySnapshotCurrent(snapshot, inventory, projectId, currentProjectId, loadingProjectId, mounted) {
 return mounted === true && typeof projectId === 'string' && projectId.length > 0
  && currentProjectId === projectId && snapshot?.projectId === projectId
  && !!inventory && snapshot.inventory === inventory && loadingProjectId !== projectId;
}
