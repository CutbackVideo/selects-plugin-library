// Persist stable public SDK requests before effects; the shared runtime owns execution and artifacts.
import {fs,script,sleep,type Sdk} from "./host";
import {faceRequestRecord,latestFaceRecords,runRecord,readSamples} from "./sharedAiFaces.cjs";
import {createPassJournal} from "./facePassJournal.cjs";
const journals=new Map<string,any>();
function pass(dir:string) {
  let value=journals.get(dir);
  if(!value){value=createPassJournal(fs(),dir);journals.set(dir,value);}
  return value;
}
export async function journal(dir:string){return pass(dir).read();}
export async function detectShared(sdk:Sdk,dir:string,input:any,info:any,progress:(s:string)=>void,signal?:AbortSignal,options:{retryTerminal?:boolean}={}) {
  const owner=pass(dir),book=await owner.read();
  const record=await faceRequestRecord(book.records,input,book.generation,String(fs().normalize?.(dir)||dir).replace(/\\/g,"/"),options.retryTerminal);
  const api={run:(body:string,write:boolean)=>script(sdk,"Shared face tracking",body,write),
    save:()=>owner.saveRecord(book.generation,record),refresh:()=>owner.refreshRecord(book.generation,record),sleep,signal,
    progress:(s:any)=>progress("Shared face job: "+s.status+(s.completed!=null?" · "+s.completed+"/"+s.total:""))};
  await runRecord(record,api);
  return {samples:await readSamples(record,api,info),workflowId:record.workflowId};
}
export async function cancelFaceJobs(sdk:Sdk,dir:string,projectId:string) {
  const owner=pass(dir),book=await owner.read();
  for(const record of latestFaceRecords(book.records))if(record.input.projectId===projectId&&!["succeeded","failed","canceled"].includes(record.status||"")){
    record.cancelRequested=true;await owner.saveRecord(book.generation,record);
    try{await runRecord(record,{run:(s:string,w:boolean)=>script(sdk,"Cancel shared face tracking",s,w),save:()=>owner.saveRecord(book.generation,record),refresh:()=>owner.refreshRecord(book.generation,record),sleep});}
    catch(e:any){if(e.code!=="AI_JOB_CANCELED")throw e;}
  }
}
export async function newFacePass(dir:string,signal?:AbortSignal){await pass(dir).newPass(signal);}
