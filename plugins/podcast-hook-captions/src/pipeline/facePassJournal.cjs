// Generation-specific recovery files. Only an explicit newPass changes the active pointer.
const {assertInput,assertRetryMetadata,latestFaceRecords}=require('./sharedAiFaces.cjs');
const terminal=s=>['succeeded','failed','canceled'].includes(s);
function createPassJournal(storage,dir,randomUUID=()=>crypto.randomUUID()) {
  const activeFile=storage.join(dir,'face-ai-current.json');
  const inputPrefix=generation=>'face-ai-input-'+generation+'-';
  const inputFile=(generation,key)=>storage.join(dir,inputPrefix(generation)+encodeURIComponent(key)+'.json');
  const cancelFile=(generation,key)=>storage.join(dir,'face-ai-cancel-'+generation+'-'+encodeURIComponent(key)+'.json');
  const dataFile=generation=>storage.join(dir,generation==='legacy'?'face-ai-jobs.json':'face-ai-pass-'+generation+'.json');
  let writes=Promise.resolve();
  const queued=body=>{const next=writes.catch(()=>{}).then(body);writes=next;return next;};
  const validGeneration=value=>typeof value==='string'&&/^[a-zA-Z0-9-]{1,80}$/.test(value);
  function parseActive(text) {
    const value=JSON.parse(String(text));
    if(value?.version!==1||!validGeneration(value.generation))throw new Error('Invalid active face pass pointer.');
    return value.generation;
  }
  function assertAttached(signal) {
    if(signal?.aborted){const e=new Error('New face pass detached before publication.');e.code='AI_OBSERVATION_DETACHED';throw e;}
  }
  async function activeSnapshot() {
    const text=await storage.exists(activeFile)?String(await storage.readFile(activeFile,'utf8')):null;
    return {text,generation:text===null?'legacy':parseActive(text)};
  }
  async function publishActive(previous,generation,signal) {
    assertAttached(signal);
    const current=await activeSnapshot();
    if(current.generation!==previous){const e=new Error('A newer face pass is already active. Recover that saved pass.');e.code='AI_PASS_REPLACED';throw e;}
    assertAttached(signal);
    // Comparison and replacement execute together in the host, including across panel realms.
    // Once dispatched, this committed file operation may finish after observation detaches.
    const replaced=await storage.compareAndReplace(activeFile,current.text,JSON.stringify({version:1,generation}));
    if(!replaced){const e=new Error('A newer face pass is already active. Recover that saved pass.');e.code='AI_PASS_REPLACED';throw e;}
  }
  async function active() {return (await activeSnapshot()).generation;}
  async function readGeneration(generation) {
    const filename=dataFile(generation);
    let value={version:1,generation,records:[]};
    if(await storage.exists(filename)){
      const text=String(await storage.readFile(filename,'utf8'));
      if(text.length>256*1024)throw new Error('Face recovery journal exceeds the bounded transaction limit.');
      value=JSON.parse(text);
      if(value?.version!==1||!Array.isArray(value.records)||value.records.length>256)throw new Error('Invalid face recovery journal.');
    }
    const names=await storage.exists(dir)?(await storage.readdir(dir)).filter(name=>name.startsWith(inputPrefix(generation))&&name.endsWith('.json')):[];
    if(names.length>256)throw new Error('Too many durable face requests in this pass.');
    // Immutable input receipts recover request keys even if another observer's stale registry write lost a row.
    for(const name of names){
      const receipt=JSON.parse(String(await storage.readFile(storage.join(dir,name),'utf8')));
      assertInput(receipt.input);assertRetryMetadata(receipt);
      const saved=value.records.find(record=>record.input.requestKey===receipt.input.requestKey);
      const retry=receipt.retryAttempt===undefined?{}:{retryAttempt:receipt.retryAttempt,retryOf:receipt.retryOf};
      if(saved)Object.assign(saved,retry);
      else value.records.push({input:receipt.input,...retry});
    }
    for(const record of value.records){
      assertInput(record.input);assertRetryMetadata(record);
      if(await storage.exists(cancelFile(generation,record.input.requestKey)))record.cancelRequested=true;
    }
    return {...value,generation};
  }

  async function assertActive(generation) {
    if(await active()!==generation){const e=new Error('This face observation belongs to an older pass. Recover the current saved pass.');e.code='AI_PASS_REPLACED';throw e;}
  }
  async function atomicWrite(filename,value) {
    const text=JSON.stringify(value);
    if(text.length>256*1024)throw new Error('Face recovery journal exceeds the bounded transaction limit.');
    const temporary=filename+'.tmp-'+randomUUID();
    await storage.writeFile(temporary,text);await storage.rename(temporary,filename);
  }
  async function read() {return readGeneration(await active());}
  async function saveRecord(generation,record) {
    return queued(async()=>{
      await assertActive(generation);
      const receipt=inputFile(generation,record.input.requestKey);
      assertRetryMetadata(record);
      if(!(await storage.exists(receipt)))await atomicWrite(receipt,{version:1,input:record.input,...(record.retryAttempt===undefined?{}:{retryAttempt:record.retryAttempt,retryOf:record.retryOf})});
      if(record.cancelRequested&&!(await storage.exists(cancelFile(generation,record.input.requestKey))))
        await atomicWrite(cancelFile(generation,record.input.requestKey),{version:1,requested:true});
      const book=await readGeneration(generation);
      const old=book.records.find(r=>r.input.requestKey===record.input.requestKey);
      if(old){
        record.cancelRequested ||= old.cancelRequested;
        if(terminal(old.status)&&!terminal(record.status))record.status=old.status;
        Object.assign(old,record);
      }else book.records.push(record);
      if(book.records.length>256)throw new Error('Too many face requests in this pass.');
      // Even a delayed old rename can replace only its own history file, never the new pass pointer/data.
      await atomicWrite(dataFile(generation),book);
      await assertActive(generation);
    });
  }
  async function refreshRecord(generation,record) {
    await assertActive(generation);
    const book=await readGeneration(generation);
    await assertActive(generation);
    const old=book.records.find(r=>r.input.requestKey===record.input.requestKey);
    if(old?.cancelRequested)record.cancelRequested=true;
  }
  async function newPass(signal) {
    return queued(async()=>{
      assertAttached(signal);
      const book=await read();
      assertAttached(signal);
      if(latestFaceRecords(book.records).some(r=>!terminal(r.status)))throw new Error('Recover or cancel the pending face pass first.');
      const generation=randomUUID();
      if(!validGeneration(generation)||generation==='legacy')throw new Error('Invalid new face pass identity.');
      await atomicWrite(dataFile(generation),{version:1,generation,records:[]});
      // This is the only writer of the active pointer. Observers/cancellation never publish it.
      await publishActive(book.generation,generation,signal);
      return generation;
    });
  }
  return {read,saveRecord,refreshRecord,newPass};
}
module.exports={createPassJournal};
