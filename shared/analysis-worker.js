// One browser Worker invocation. Algorithm, payload units and result protocol
// belong to the caller; no Project, media process or persistent file is touched.
function panelWorkerIssue(code,message,cause=undefined){
 return Object.assign(Error(message),{code:'PANEL_WORKER_'+code,publicMessage:message,...cause?{cause}:{}});
}
async function runPanelWorker(source,payload,options={}){
 if(!options||typeof options!=='object'||Array.isArray(options))throw panelWorkerIssue('INPUT','The analysis worker scope is invalid.');
 const {signal,isCurrent=()=>true,timeoutMs=60000,transfer}=options;
 if(typeof source!=='string'||!source||new TextEncoder().encode(source).length>1024*1024||typeof isCurrent!=='function'||!Number.isFinite(timeoutMs)||timeoutMs<1||timeoutMs>2147483647||signal&&(typeof signal.aborted!=='boolean'||typeof signal.addEventListener!=='function'||typeof signal.removeEventListener!=='function'))throw panelWorkerIssue('INPUT','The analysis worker request is invalid.');
 if(transfer!==undefined&&!Array.isArray(transfer))throw panelWorkerIssue('INPUT','The analysis worker transfer list is invalid.');
 const live=()=>{try{return !signal?.aborted&&isCurrent();}catch{return false;}};
 const stopped=cause=>panelWorkerIssue('STOPPED','Background analysis ended before completion.',cause);
 const timeout=cause=>panelWorkerIssue('TIMEOUT','Background analysis timed out.',cause);
 const deadline=Date.now()+timeoutMs;
 if(!live())throw stopped();
 if(typeof Worker!=='function'||typeof Blob!=='function'||typeof globalThis.URL?.createObjectURL!=='function'||typeof globalThis.URL?.revokeObjectURL!=='function')throw panelWorkerIssue('UNSUPPORTED','This environment cannot run background analysis.');
 return new Promise((resolve,reject)=>{
  let worker,url,timer,watch,done=false,phase='START';
  const finish=(value,failure)=>{
   if(done)return;done=true;
   const cleanupFailures=[],attempt=action=>{try{action();}catch(error){cleanupFailures.push(error);}};
   if(timer!==undefined)attempt(()=>clearTimeout(timer));
   if(watch!==undefined)attempt(()=>clearTimeout(watch));
   attempt(()=>signal?.removeEventListener('abort',onAbort));
   if(worker){
    attempt(()=>{worker.onmessage=null;worker.onerror=null;worker.onmessageerror=null;});
    attempt(()=>worker.terminate());
   }
   if(url!==undefined)attempt(()=>URL.revokeObjectURL(url));
   // Cleanup can itself detach the owner or cross the deadline. Never hand a
   // late result back merely because its message arrived before cleanup began.
   if(!live())failure=stopped(failure);
   else if(Date.now()>=deadline)failure=timeout(failure);
   if(cleanupFailures.length){
    failure=Object.assign(panelWorkerIssue(failure?.code?.replace(/^PANEL_WORKER_/,'')??'CLEANUP',failure?.publicMessage??'Analysis worker cleanup could not be confirmed.',failure??cleanupFailures[0]),{terminal:true,cleanupFailures});
   }
   if(failure)reject(failure);else resolve(value);
  };
  const onAbort=()=>finish(undefined,stopped());
  const current=()=>{
   if(done)return false;
   if(!live()){finish(undefined,stopped());return false;}
   if(Date.now()>=deadline){finish(undefined,timeout());return false;}
   return true;
  };
  const observe=()=>{if(current())watch=setTimeout(observe,50);};
  try{
   url=URL.createObjectURL(new Blob([source],{type:'text/javascript'}));
   if(!current())return;
   worker=new Worker(url);
   worker.onmessage=event=>finish(event.data);
   worker.onerror=event=>{try{event?.preventDefault?.();}catch{}finish(undefined,panelWorkerIssue('ERROR','Background analysis could not be completed.',event));};
   worker.onmessageerror=event=>finish(undefined,panelWorkerIssue('MESSAGE','The background analysis response could not be read.',event));
   // Subscribe after construction: cancellation inside a constructor must not
   // finish before the newly created Worker reference becomes owned.
   signal?.addEventListener('abort',onAbort,{once:true});
   if(!current())return;
   timer=setTimeout(()=>finish(undefined,timeout()),Math.max(0,deadline-Date.now()));
   watch=setTimeout(observe,50);
   phase='DISPATCH';
   // Clone by default. Only callers that already relinquish their buffer opt
   // into transfer; selection/copying and fallback remain caller policy.
   if(transfer===undefined)worker.postMessage(payload);
   else worker.postMessage(payload,transfer);
  }catch(cause){finish(undefined,panelWorkerIssue(phase,phase==='START'?'The analysis worker could not start.':'The analysis worker request could not be sent.',cause));}
 });
}
