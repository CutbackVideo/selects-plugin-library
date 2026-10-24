// Build input only. The generated owner includes the dependency inside its
// function so SDK scripts can serialize it without imports or host globals.
import {sha256} from '@noble/hashes/sha2.js';

export async function fingerprintTemplateFile(files,path,check=()=>{}) {
 if(typeof path!=='string'||!path||path.includes('\0')||typeof check!=='function'||typeof files?.stat!=='function'||typeof files?.readRange!=='function')throw Error('The original file observation input is invalid.');
 const observe=async operation=>{check();const result=await operation();check();return result;};
 const before=await observe(()=>files.stat(path));
 if(before===null)return null;
 if(!before||before.isDirectory!==false||!Number.isSafeInteger(before.size)||before.size<0||!Number.isFinite(before.mtimeMs)||!Number.isFinite(before.ino))throw Error("The file's size or identity could not be confirmed.");
 const hash=sha256.create(),alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
 for(let offset=0;offset<before.size;){
  const length=Math.min(49152,before.size-offset);
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
 if(!after||after.isDirectory!==false||before.size!==after.size||before.mtimeMs!==after.mtimeMs||before.ino!==after.ino)throw Error('The file changed while its contents were read.');
 const digest=hash.digest();check();
 let hex='';for(let index=0;index<digest.length;index++)hex+=digest[index].toString(16).padStart(2,'0');
 return {size:before.size,sha256:hex};
}
