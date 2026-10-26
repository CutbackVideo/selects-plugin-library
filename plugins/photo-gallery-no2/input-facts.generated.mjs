// Generated from shared input/file observation; edit the canonical sources.
export async function fingerprintTemplateFile(files,path,check=()=>{}) {
/* @noble/hashes 2.2.0; license retained inside serialized SDK copies.
The MIT License (MIT)

Copyright (c) 2022 Paul Miller (https://paulmillr.com)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the “Software”), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/
const __templateHashAny=value=>value;
var __templateFileHash = __templateHashAny((() => { var w = __templateHashAny(Object).defineProperty; var G = __templateHashAny(Object).getOwnPropertyDescriptor; var V = __templateHashAny(Object).getOwnPropertyNames; var O = __templateHashAny(__templateHashAny(Object).prototype).hasOwnProperty; var k = (t, e, r) => e in t ? __templateHashAny(w)(t, e, { enumerable: !0, configurable: !0, writable: !0, value: r }) : __templateHashAny(t)[e] = r; var R = (t, e) => { for (var r in e)
    __templateHashAny(w)(t, r, { get: __templateHashAny(e)[r], enumerable: !0 }); }, $ = (t, e, r, o) => { if (e && typeof e == "object" || typeof e == "function")
    for (let n of __templateHashAny(V)(e))
        !__templateHashAny(O).call(t, n) && n !== r && __templateHashAny(w)(t, n, { get: () => __templateHashAny(e)[n], enumerable: !(o = __templateHashAny(G)(e, n)) || __templateHashAny(o).enumerable }); return t; }; var M = t => __templateHashAny($)(__templateHashAny(w)({}, "__esModule", { value: !0 }), t); var a = (t, e, r) => __templateHashAny(k)(t, typeof e != "symbol" ? e + "" : e, r); var N = {}; __templateHashAny(R)(N, { sha256: () => _ }); function j(t) { return t instanceof Uint8Array || __templateHashAny(ArrayBuffer).isView(t) && __templateHashAny(__templateHashAny(t).constructor).name === "Uint8Array" && "BYTES_PER_ELEMENT" in t && __templateHashAny(t).BYTES_PER_ELEMENT === 1; } function m(t, e, r = "") { let o = __templateHashAny(j)(t), n = __templateHashAny(t)?.length, f = e !== void 0; if (!o || f && n !== e) {
    let s = r && `"${r}" `, x = f ? ` of length ${e}` : "", i = o ? `length=${n}` : `type=${typeof t}`, h = s + "expected Uint8Array" + x + ", got " + i;
    throw o ? new (__templateHashAny(RangeError))(h) : new (__templateHashAny(TypeError))(h);
} return t; } function L(t, e = !0) { if (__templateHashAny(t).destroyed)
    throw new (__templateHashAny(Error))("Hash instance has been destroyed"); if (e && __templateHashAny(t).finished)
    throw new (__templateHashAny(Error))("Hash#digest() has already been called"); } function C(t, e) { __templateHashAny(m)(t, void 0, "digestInto() output"); let r = __templateHashAny(e).outputLen; if (__templateHashAny(t).length < r)
    throw new (__templateHashAny(RangeError))('"digestInto() output" expected to be of length >=' + r); } function y(...t) { for (let e = 0; e < __templateHashAny(t).length; e++)
    __templateHashAny(__templateHashAny(t)[e]).fill(0); } function A(t) { return new (__templateHashAny(DataView))(__templateHashAny(t).buffer, __templateHashAny(t).byteOffset, __templateHashAny(t).byteLength); } function d(t, e) { return t << 32 - e | t >>> e; } function F(t, e = {}) { let r = (n, f) => __templateHashAny(__templateHashAny(__templateHashAny(t)(f)).update(n)).digest(), o = __templateHashAny(t)(void 0); return __templateHashAny(r).outputLen = __templateHashAny(o).outputLen, __templateHashAny(r).blockLen = __templateHashAny(o).blockLen, __templateHashAny(r).canXOF = __templateHashAny(o).canXOF, __templateHashAny(r).create = n => __templateHashAny(t)(n), __templateHashAny(Object).assign(r, e), __templateHashAny(Object).freeze(r); } var T = t => ({ oid: __templateHashAny(Uint8Array).from([6, 9, 96, 134, 72, 1, 101, 3, 4, 2, t]) }); function D(t, e, r) { return t & e ^ ~t & r; } function I(t, e, r) { return t & e ^ t & r ^ e & r; } var E = class {
    constructor(e, r, o, n) { __templateHashAny(a)(__templateHashAny(this), "blockLen"); __templateHashAny(a)(__templateHashAny(this), "outputLen"); __templateHashAny(a)(__templateHashAny(this), "canXOF", !1); __templateHashAny(a)(__templateHashAny(this), "padOffset"); __templateHashAny(a)(__templateHashAny(this), "isLE"); __templateHashAny(a)(__templateHashAny(this), "buffer"); __templateHashAny(a)(__templateHashAny(this), "view"); __templateHashAny(a)(__templateHashAny(this), "finished", !1); __templateHashAny(a)(__templateHashAny(this), "length", 0); __templateHashAny(a)(__templateHashAny(this), "pos", 0); __templateHashAny(a)(__templateHashAny(this), "destroyed", !1); __templateHashAny(__templateHashAny(this)).blockLen = e, __templateHashAny(__templateHashAny(this)).outputLen = r, __templateHashAny(__templateHashAny(this)).padOffset = o, __templateHashAny(__templateHashAny(this)).isLE = n, __templateHashAny(__templateHashAny(this)).buffer = new (__templateHashAny(Uint8Array))(e), __templateHashAny(__templateHashAny(this)).view = __templateHashAny(A)(__templateHashAny(__templateHashAny(this)).buffer); }
    update(e) { __templateHashAny(L)(__templateHashAny(this)), __templateHashAny(m)(e); let { view: r, buffer: o, blockLen: n } = __templateHashAny(this), f = __templateHashAny(e).length; for (let s = 0; s < f;) {
        let x = __templateHashAny(Math).min(n - __templateHashAny(__templateHashAny(this)).pos, f - s);
        if (x === n) {
            let i = __templateHashAny(A)(e);
            for (; n <= f - s; s += n)
                __templateHashAny(__templateHashAny(this)).process(i, s);
            continue;
        }
        __templateHashAny(o).set(__templateHashAny(e).subarray(s, s + x), __templateHashAny(__templateHashAny(this)).pos), __templateHashAny(__templateHashAny(this)).pos += x, s += x, __templateHashAny(__templateHashAny(this)).pos === n && (__templateHashAny(__templateHashAny(this)).process(r, 0), __templateHashAny(__templateHashAny(this)).pos = 0);
    } return __templateHashAny(__templateHashAny(this)).length += __templateHashAny(e).length, __templateHashAny(__templateHashAny(this)).roundClean(), __templateHashAny(this); }
    digestInto(e) { __templateHashAny(L)(__templateHashAny(this)), __templateHashAny(C)(e, __templateHashAny(this)), __templateHashAny(__templateHashAny(this)).finished = !0; let { buffer: r, view: o, blockLen: n, isLE: f } = __templateHashAny(this), { pos: s } = __templateHashAny(this); __templateHashAny(r)[s++] = 128, __templateHashAny(y)(__templateHashAny(__templateHashAny(__templateHashAny(this)).buffer).subarray(s)), __templateHashAny(__templateHashAny(this)).padOffset > n - s && (__templateHashAny(__templateHashAny(this)).process(o, 0), s = 0); for (let c = s; c < n; c++)
        __templateHashAny(r)[c] = 0; __templateHashAny(o).setBigUint64(n - 8, __templateHashAny(BigInt)(__templateHashAny(__templateHashAny(this)).length * 8), f), __templateHashAny(__templateHashAny(this)).process(o, 0); let x = __templateHashAny(A)(e), i = __templateHashAny(__templateHashAny(this)).outputLen; if (i % 4)
        throw new (__templateHashAny(Error))("_sha2: outputLen must be aligned to 32bit"); let h = i / 4, u = __templateHashAny(__templateHashAny(this)).get(); if (h > __templateHashAny(u).length)
        throw new (__templateHashAny(Error))("_sha2: outputLen bigger than state"); for (let c = 0; c < h; c++)
        __templateHashAny(x).setUint32(4 * c, __templateHashAny(u)[c], f); }
    digest() { let { buffer: e, outputLen: r } = __templateHashAny(this); __templateHashAny(__templateHashAny(this)).digestInto(e); let o = __templateHashAny(e).slice(0, r); return __templateHashAny(__templateHashAny(this)).destroy(), o; }
    _cloneInto(e) { e || (e = new (__templateHashAny((__templateHashAny(__templateHashAny(this)).constructor)))), __templateHashAny(e).set(...__templateHashAny(__templateHashAny(this)).get()); let { blockLen: r, buffer: o, length: n, finished: f, destroyed: s, pos: x } = __templateHashAny(this); return __templateHashAny(e).destroyed = s, __templateHashAny(e).finished = f, __templateHashAny(e).length = n, __templateHashAny(e).pos = x, n % r && __templateHashAny(__templateHashAny(e).buffer).set(o), e; }
    clone() { return __templateHashAny(__templateHashAny(this))._cloneInto(); }
}, b = __templateHashAny(Uint32Array).from([1779033703, 3144134277, 1013904242, 2773480762, 1359893119, 2600822924, 528734635, 1541459225]); var W = __templateHashAny(Uint32Array).from([1116352408, 1899447441, 3049323471, 3921009573, 961987163, 1508970993, 2453635748, 2870763221, 3624381080, 310598401, 607225278, 1426881987, 1925078388, 2162078206, 2614888103, 3248222580, 3835390401, 4022224774, 264347078, 604807628, 770255983, 1249150122, 1555081692, 1996064986, 2554220882, 2821834349, 2952996808, 3210313671, 3336571891, 3584528711, 113926993, 338241895, 666307205, 773529912, 1294757372, 1396182291, 1695183700, 1986661051, 2177026350, 2456956037, 2730485921, 2820302411, 3259730800, 3345764771, 3516065817, 3600352804, 4094571909, 275423344, 430227734, 506948616, 659060556, 883997877, 958139571, 1322822218, 1537002063, 1747873779, 1955562222, 2024104815, 2227730452, 2361852424, 2428436474, 2756734187, 3204031479, 3329325298]), l = new (__templateHashAny(Uint32Array))(64), B = class extends __templateHashAny(E) {
    constructor(e) { super(64, e, 8, !1); }
    get() { let { A: e, B: r, C: o, D: n, E: f, F: s, G: x, H: i } = __templateHashAny(this); return [e, r, o, n, f, s, x, i]; }
    set(e, r, o, n, f, s, x, i) { __templateHashAny(__templateHashAny(this)).A = e | 0, __templateHashAny(__templateHashAny(this)).B = r | 0, __templateHashAny(__templateHashAny(this)).C = o | 0, __templateHashAny(__templateHashAny(this)).D = n | 0, __templateHashAny(__templateHashAny(this)).E = f | 0, __templateHashAny(__templateHashAny(this)).F = s | 0, __templateHashAny(__templateHashAny(this)).G = x | 0, __templateHashAny(__templateHashAny(this)).H = i | 0; }
    process(e, r) { for (let c = 0; c < 16; c++, r += 4)
        __templateHashAny(l)[c] = __templateHashAny(e).getUint32(r, !1); for (let c = 16; c < 64; c++) {
        let g = __templateHashAny(l)[c - 15], p = __templateHashAny(l)[c - 2], S = __templateHashAny(d)(g, 7) ^ __templateHashAny(d)(g, 18) ^ g >>> 3, H = __templateHashAny(d)(p, 17) ^ __templateHashAny(d)(p, 19) ^ p >>> 10;
        __templateHashAny(l)[c] = H + __templateHashAny(l)[c - 7] + S + __templateHashAny(l)[c - 16] | 0;
    } let { A: o, B: n, C: f, D: s, E: x, F: i, G: h, H: u } = __templateHashAny(this); for (let c = 0; c < 64; c++) {
        let g = __templateHashAny(d)(x, 6) ^ __templateHashAny(d)(x, 11) ^ __templateHashAny(d)(x, 25), p = u + g + __templateHashAny(D)(x, i, h) + __templateHashAny(W)[c] + __templateHashAny(l)[c] | 0, H = (__templateHashAny(d)(o, 2) ^ __templateHashAny(d)(o, 13) ^ __templateHashAny(d)(o, 22)) + __templateHashAny(I)(o, n, f) | 0;
        u = h, h = i, i = x, x = s + p | 0, s = f, f = n, n = o, o = p + H | 0;
    } o = o + __templateHashAny(__templateHashAny(this)).A | 0, n = n + __templateHashAny(__templateHashAny(this)).B | 0, f = f + __templateHashAny(__templateHashAny(this)).C | 0, s = s + __templateHashAny(__templateHashAny(this)).D | 0, x = x + __templateHashAny(__templateHashAny(this)).E | 0, i = i + __templateHashAny(__templateHashAny(this)).F | 0, h = h + __templateHashAny(__templateHashAny(this)).G | 0, u = u + __templateHashAny(__templateHashAny(this)).H | 0, __templateHashAny(__templateHashAny(this)).set(o, n, f, s, x, i, h, u); }
    roundClean() { __templateHashAny(y)(l); }
    destroy() { __templateHashAny(__templateHashAny(this)).destroyed = !0, __templateHashAny(__templateHashAny(this)).set(0, 0, 0, 0, 0, 0, 0, 0), __templateHashAny(y)(__templateHashAny(__templateHashAny(this)).buffer); }
}, U = class extends __templateHashAny(B) {
    constructor() { super(32); __templateHashAny(a)(__templateHashAny(this), "A", __templateHashAny(b)[0] | 0); __templateHashAny(a)(__templateHashAny(this), "B", __templateHashAny(b)[1] | 0); __templateHashAny(a)(__templateHashAny(this), "C", __templateHashAny(b)[2] | 0); __templateHashAny(a)(__templateHashAny(this), "D", __templateHashAny(b)[3] | 0); __templateHashAny(a)(__templateHashAny(this), "E", __templateHashAny(b)[4] | 0); __templateHashAny(a)(__templateHashAny(this), "F", __templateHashAny(b)[5] | 0); __templateHashAny(a)(__templateHashAny(this), "G", __templateHashAny(b)[6] | 0); __templateHashAny(a)(__templateHashAny(this), "H", __templateHashAny(b)[7] | 0); }
}; var _ = __templateHashAny(F)(() => new (__templateHashAny(U)), __templateHashAny(T)(1)); return __templateHashAny(M)(N); }))();

 if(typeof path!=='string'||!path||path.includes('\0')||typeof check!=='function'||typeof files?.stat!=='function'||typeof files?.readRange!=='function')throw Error('The original file observation input is invalid.');
 const observe=async operation=>{check();const result=await operation();check();return result;};
 const before=await observe(()=>files.stat(path));
 if(before===null)return null;
 if(!before||before.isDirectory!==false||!Number.isSafeInteger(before.size)||before.size<0||!Number.isFinite(before.mtimeMs)||!Number.isFinite(before.ino))throw Error("The file's size or identity could not be confirmed.");
 const hash=__templateFileHash.sha256.create(),alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
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
export async function nativeImageSources(selects, projectId, photos, { matchById=false }={}) {
 const project=selects.project(projectId), resources=await project.resources(), nodes=[];
 const visit=items=>{for(const item of items||[])item.type==='dir'?visit(item.children):nodes.push(item);};
 const overview=await project.sourceFiles();
 if('fileTree' in overview)visit(overview.fileTree);
 else for(const folder of overview.folders||[]){const detail=await project.sourceFiles({folder:folder.name});if('fileTree' in detail)visit(detail.fileTree);}
 const sources=photos.map(photo=>{
  const matches=nodes.filter(node=>node.path===photo.path&&(!matchById||node.resourceId===photo.resourceId)&&resources.some(resource=>resource.resourceId===node.resourceId&&resource.type==='Image'));
  if(matches.length!==1||matches[0].resourceId!==photo.resourceId)throw Error('A selected Image is missing or ambiguous in the Project: '+photo.name);
  const row=matches[0],size=row.frameSize;
  if(!Number.isSafeInteger(size?.width)||size.width<1||!Number.isSafeInteger(size?.height)||size.height<1)throw Error('A selected Image has no verified native dimensions: '+photo.name);
  return {resourceId:row.resourceId,path:row.path,name:photo.name,width:size.width,height:size.height};
 });
 const fail=(code,photo,message)=>{throw Object.assign(new Error(message+': '+photo.name),{code,resourceId:photo.resourceId});};
 if(typeof selects.files?.stat!=='function'||typeof selects.files?.readRange!=='function')throw Error('This Selects version does not support original photo file checks.');
 const checked=new Set();
 for(const photo of sources){
  if(checked.has(photo.path))continue;
  let before;
  try{before=await selects.files.stat(photo.path);}catch{fail('image-source-unknown',photo,'Could not confirm the original photo file');}
  if(before===null)fail('image-source-missing',photo,'The original photo file is missing');
  if(!before||!Number.isSafeInteger(before.size)||before.size<0||typeof before.isDirectory!=='boolean')fail('image-source-unknown',photo,'Could not confirm the original photo file');
  if(before.isDirectory||before.size===0)fail('image-source-unreadable',photo,'The original photo file is not readable');
  let first;
  try{first=await selects.files.readRange({path:photo.path,offset:0,length:1});}catch{fail('image-source-unreadable',photo,'Could not read the original photo file');}
  if(!first||first.bytesRead!==1||typeof first.base64!=='string'||!/^[A-Za-z0-9+/]{2}==$/.test(first.base64))fail('image-source-unknown',photo,'Could not confirm reading the original photo file');
  let after;
  try{after=await selects.files.stat(photo.path);}catch{fail('image-source-unknown',photo,'Could not confirm the original photo file after reading');}
  if(!after||after.isDirectory||['size','mtimeMs','ino'].some(key=>before[key]!==after[key]))fail('image-source-changed',photo,'The original photo file changed while reading');
  checked.add(photo.path);
 }
 return sources;
}
export function requireSourceFileSupport(files) {
 if(typeof files?.stat!=='function'||typeof files?.readRange!=='function'){
  const message='Update Selects to verify complete source file contents before creating this template.';
  throw Object.assign(new Error(message),{code:'source-file-unsupported',publicMessage:message});
 }
}
export async function observeSourceFiles(files,paths,expected=null,options=null) {
 const issue=(code,message,cause=null)=>Object.assign(new Error(message),{code,publicMessage:message,cause});
 options=options??{};
 if(!options||typeof options!=='object'||options.check!==undefined&&typeof options.check!=='function'||options.onProgress!==undefined&&typeof options.onProgress!=='function')throw issue('source-file-input','The source observation options are invalid.');
 const check=()=>{if(options.signal?.aborted)throw Object.assign(Error('Original file verification was stopped.'),{name:'AbortError'});options.check?.();};
 // The SDK cannot abort a range read already dispatched. Stop caller waiting
 // immediately; the original promise stays handled and its next check stops it.
 const observe=operation=>new Promise((resolve,reject)=>{
  const abort=()=>reject(Object.assign(Error('Original file verification was stopped.'),{name:'AbortError'}));
  options.signal?.addEventListener('abort',abort,{once:true});
  Promise.resolve().then(()=>{check();return operation();}).then(value=>{check();return value;}).then(resolve,reject).finally(()=>options.signal?.removeEventListener('abort',abort));
 });
 if(!Array.isArray(paths)||paths.some(path=>typeof path!=='string'||!path||path.includes('\0')))throw issue('source-file-input','The selected source paths are invalid.');
 const selected=[...new Set(paths)];
 const valid=row=>row&&typeof row.path==='string'&&Number.isSafeInteger(row.size)&&row.size>0&&typeof row.sha256==='string'&&/^[0-9a-f]{64}$/.test(row.sha256);
 if(expected!==null&&(!Array.isArray(expected)||expected.length!==selected.length||new Set(expected.map(row=>row?.path)).size!==expected.length||expected.some(row=>!valid(row)||!selected.includes(row.path))))throw issue('source-file-input','The expected source observations do not match the selection.');
 if(!selected.length)return [];
 requireSourceFileSupport(files);
 const observed=[];
 for(const path of selected){
  check();
  options.onProgress?.({path,index:observed.length+1,total:selected.length,bytesRead:0,complete:false});
  let fingerprint;
  try{fingerprint=await observe(()=>options.native===true&&typeof files.fingerprint==='function'?files.fingerprint(path,{native:true,signal:options.signal}):fingerprintTemplateFile(files,path,check));}catch(cause){check();if(cause?.name==='AbortError')throw cause;throw issue('source-file-unknown','The selected source file could not be confirmed. Check the Project file and try again.',cause);}
  if(fingerprint===null)throw issue('source-file-missing','The selected source file is missing. Check the Project file and try again.');
  const row={...fingerprint,path};
  if(!valid(row))throw issue('source-file-unknown','The selected source file has no complete, nonempty content identity.');
  const before=expected?.find(row=>row.path===path);
  if(before&&(before.size!==row.size||before.sha256!==row.sha256))throw issue('source-file-changed','The selected source file changed. Reload the Project inputs before trying again.');
  observed.push({path,size:row.size,sha256:row.sha256});
  check();options.onProgress?.({path,index:observed.length,total:selected.length,bytesRead:row.size,complete:true});
 }
 return observed;
}
