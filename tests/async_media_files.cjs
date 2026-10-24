// Extend legacy host fixtures with the existing asynchronous bounded file API.
// Production behavior is exercised separately through the canonical SDK client.
const bytesOf=value=>typeof value==='string'?new TextEncoder().encode(value):ArrayBuffer.isView(value)?Uint8Array.from(new Uint8Array(value.buffer,value.byteOffset,value.byteLength)):Uint8Array.from(new Uint8Array(value));
exports.asyncMediaFiles=base=>{
 const records=new Map();let revision=0;
 const publish=(path,value)=>records.set(path,{bytes:bytesOf(value),revision:++revision});
 const load=async path=>{if(records.has(path))return records.get(path);try{return {bytes:bytesOf(await base.readFile(path)),revision:0};}catch{return null;}};
 const files={...base,
  stat:async path=>{const row=await load(path);return row?{size:row.bytes.length,mtimeMs:row.revision,ino:row.revision,isDirectory:false}:null;},
  readRange:async(path,offset,length)=>{const row=await load(path);if(!row)throw Error('missing file');return row.bytes.slice(offset,offset+length);},
  writeFile:async(path,value,options)=>{if(options?.flag==='wx'&&records.has(path))throw Error('already exists');publish(path,value);},
  compareAndReplace:async(path,expected,value)=>{const row=await load(path);if(!row||new TextDecoder().decode(row.bytes)!==expected)return false;publish(path,value);return true;},
  removeFile:async input=>{await base.removeFile(input);records.delete(input.filePath);},
 };
 return {files,publish};
};
