// Prefer host hashing; retain the serialized legacy implementation only for
// clients missing the SDK method or its bridge operation.
import {sha256} from '@noble/hashes/sha2.js';

export async function fingerprintTemplateFile(files,path,check=()=>{},scheme=null) {
 if(typeof path!=='string'||!path||path.includes('\0')||typeof check!=='function')throw Error('The original file observation input is invalid.');
 if(scheme!==null&&scheme!=='cutback.media-content.v2')throw Error('Unknown media fingerprint scheme.');
 const sampled=scheme!==null;
 check();
 const native=sampled?(files&&'mediaFingerprint' in files?files.mediaFingerprint:null):(files&&'fingerprint' in files?files.fingerprint:null);
 if(typeof native==='function'){
  let supported=true,observed;
  try{observed=await native.call(files,path);}
  catch(error){
   // This is the exact old localFiles bridge response for an unknown action.
   // Permission, timeout, integrity and other operational failures must propagate.
   if(!/^(?:Error: )?Unsupported file operation\.?$/.test(String(error?.message??error)))throw error;
   supported=false;
  }
  check();
  if(supported){
   if(observed===null)return null;
   if(sampled){
    if(!observed||observed.scheme!==scheme||!Number.isSafeInteger(observed.size)||observed.size<=0||typeof observed.digest!=='string'||!/^[a-f0-9]{64}$/.test(observed.digest))throw Error('The sampled media fingerprint could not be confirmed.');
    return {size:observed.size,scheme:observed.scheme,digest:observed.digest};
   }
   if(!observed||!Number.isSafeInteger(observed.size)||observed.size<0||typeof observed.sha256!=='string'||!/^[a-f0-9]{64}$/.test(observed.sha256))throw Error('The complete file fingerprint could not be confirmed.');
   return {size:observed.size,sha256:observed.sha256};
  }
 }
 if(typeof path!=='string'||!path||path.includes('\0')||typeof check!=='function'||typeof files?.stat!=='function'||typeof files?.readRange!=='function')throw Error('The original file observation input is invalid.');
 const observe=async operation=>{check();const result=await operation();check();return result;};
 const identity=stat=>typeof stat?.sourceIdentity==='string'&&stat.sourceIdentity?stat.sourceIdentity:Number.isFinite(stat?.ino)?stat.ino:null;
 const before=await observe(()=>files.stat(path));
 if(before===null)return null;
 if(!before||before.isDirectory!==false||!Number.isSafeInteger(before.size)||before.size<0||!Number.isFinite(before.mtimeMs)||identity(before)===null)throw Error("The file's size or identity could not be confirmed.");
 if(sampled&&before.size===0)throw Error('Cannot fingerprint empty media.');
 const hash=sha256.create(),alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
 if(sampled){const prefix=scheme+':'+before.size+':';hash.update(Uint8Array.from(prefix,character=>character.charCodeAt(0)));}
 const sampleBytes=262144;
 const ranges=!sampled||before.size<=sampleBytes*3?[[0,before.size]]:[[0,sampleBytes],[Math.floor((before.size-sampleBytes)/2),sampleBytes],[before.size-sampleBytes,sampleBytes]];
 for(const [start,count] of ranges)for(let offset=start;offset<start+count;){
  const length=Math.min(49152,start+count-offset);
  const chunk=await observe(()=>files.readRange({path,offset,length}));
  if(!chunk||chunk.bytesRead!==length||typeof chunk.base64!=='string'||chunk.base64.length!==4*Math.ceil(length/3)||!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(chunk.base64))throw Error('The file read returned an incomplete or invalid binary chunk.');
  const bytes=new Uint8Array(length);
  let position=0;
  for(let i=0;i<chunk.base64.length;i+=4){
   const a=alphabet.indexOf(chunk.base64[i]),b=alphabet.indexOf(chunk.base64[i+1]),c=chunk.base64[i+2]==='='?0:alphabet.indexOf(chunk.base64[i+2]),d=chunk.base64[i+3]==='='?0:alphabet.indexOf(chunk.base64[i+3]);
   if(chunk.base64[i+2]==='='&&(b&15)!==0||chunk.base64[i+3]==='='&&chunk.base64[i+2]!=='='&&(c&3)!==0)throw Error('The file read returned a noncanonical binary chunk.');
   bytes[position++]=(a<<2)|(b>>4);
   if(position<length)bytes[position++]=((b&15)<<4)|(c>>2);
   if(position<length)bytes[position++]=((c&3)<<6)|d;
  }
  hash.update(bytes);check();offset+=length;
 }
 const after=await observe(()=>files.stat(path));
 if(!after||after.isDirectory!==false||before.size!==after.size||before.mtimeMs!==after.mtimeMs||identity(before)!==identity(after))throw Error('The file changed while its contents were read.');
 const digest=hash.digest();check();
 let hex='';for(let index=0;index<digest.length;index++)hex+=digest[index].toString(16).padStart(2,'0');
 return sampled?{size:before.size,scheme,digest:hex}:{size:before.size,sha256:hex};
}
