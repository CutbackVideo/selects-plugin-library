// SDK-script adapter for original-media verification. Keep large binary reads
// inside the existing native media job instead of copying Base64 through IPC.
// One deadline covers both pre-placement and pre-commit checks in an assembly.
export function nativeSourceFiles(selects, deadline = Date.now() + 90000) {
 if(!Number.isFinite(deadline))throw Error('The source verification deadline is invalid.');
 const files=selects.files;
 return {
  stat:path=>files.stat(path),
  readRange:input=>files.readRange(input),
  fingerprint:async(path,options={})=>{
   const check=()=>{Object(options).check?.();if(Date.now()>=deadline)throw Error('Original file verification timed out.');};
   if(typeof path!=='string'||!path||path.includes('\0')||!/^(?:[\\/]|[A-Za-z]:[\\/])/.test(path))throw Error('The original source path is invalid.');
   check();const before=await files.stat(path);check();
   if(before===null)return null;
   const valid=row=>row&&row.isDirectory===false&&Number.isSafeInteger(row.size)&&row.size>=0&&Number.isFinite(row.mtimeMs)&&Number.isFinite(row.ino);
   if(!valid(before))throw Error('The original file identity could not be confirmed.');
   if(typeof selects.media?.startFFmpeg!=='function'||typeof selects.media?.job!=='function')throw Error('Update Selects to verify original media with native file reads.');
   let job=null,settled=false;
   try{
    let started;
    try{started=await selects.media.startFFmpeg({args:['-nostdin','-v','error','-protocol_whitelist','file','-f','data','-i','file:'+path,'-map','0:0','-c','copy','-f','hash','-hash','sha256','-']});}
    catch(cause){throw Object.assign(Error('The native source job start could not be confirmed.'),{cause,preserveTemporaryFiles:true});}
    if(typeof started?.jobId!=='string'||!started.jobId)throw Object.assign(Error('The native source job identity could not be confirmed.'),{preserveTemporaryFiles:true});
    job=selects.media.job(started.jobId);check();
    let cursor=0,stdout='',bytes=0;
    for(;;){
     check();const row=await job.status({cursor});check();
     if(!row||!['running','succeeded','failed','cancelled'].includes(row.state)||!Array.isArray(row.events)||row.events.length>8||row.truncated!==false||!Number.isSafeInteger(row.nextCursor)||row.nextCursor<cursor)throw Error('The native source status could not be confirmed.');
     for(const event of row.events){
      if(!event||!['stdout','stderr'].includes(event.stream)||typeof event.text!=='string'||!Number.isSafeInteger(event.cursor)||event.cursor!==cursor+1||event.cursor>row.nextCursor)throw Error('The native source output is incomplete.');
      bytes+=event.text.length;if(bytes>16384)throw Error('The native source output exceeds its verification budget.');
      cursor=event.cursor;if(event.stream==='stdout')stdout+=event.text;
     }
     if(cursor!==row.nextCursor)throw Error('The native source output cursor is incomplete.');
     // A terminal job may have more output pages. Drain them before accepting SHA.
     if(row.state!=='running'&&row.events.length===0){
      settled=true;
      if(row.state!=='succeeded')throw Error('The native source read did not succeed.');
      const match=/^SHA256=([a-fA-F0-9]{64})\r?\n?$/.exec(stdout);
      if(!match)throw Error('The native source hash is incomplete.');
      const after=await files.stat(path);check();
      if(!valid(after)||before.size!==after.size||before.mtimeMs!==after.mtimeMs||before.ino!==after.ino)throw Error('The original file changed during verification.');
      return {size:before.size,sha256:match[1].toLowerCase()};
     }
    }
   }finally{
    if(job&&!settled){
     // Cancel only this invocation's native process, then observe confirmed exit.
     // Do not race a script-local timer: timers do not exist in the SDK sandbox.
     const until=Date.now()+5000;
     try{
      await job.cancel();
      for(;;){const row=await job.status();if(['succeeded','failed','cancelled'].includes(row?.state))break;if(Date.now()>=until)throw Error('Native source cancellation was not confirmed.');}
     }catch(cause){throw Object.assign(Error('The native source job exit could not be confirmed.'),{cause,preserveTemporaryFiles:true});}
    }
   }
  },
 };
}
