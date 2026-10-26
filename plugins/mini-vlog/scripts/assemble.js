// @template-assembly 1
// @template-assembly-intent 1
// Generated from canonical input/placement checks and the Mini assembly policy.
async function fingerprintTemplateFile(files,path,check=()=>{}) {
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
function templateObservedSource(observation,row){
 const invalid=()=>{throw Error('Saved source target could not be confirmed.');};
 if(!Array.isArray(observation?.clips)||!row||!Number.isSafeInteger(row.clipId)||typeof row.trackId!=='string')invalid();
 const found=observation.clips.filter(c=>c.clipId===row.clipId&&c.trackId===row.trackId);
 if(found.length!==1)invalid();
 const actual=found[0],source=actual.source;
 if(actual.trackKind!==row.trackKind||actual.startFrame!==row.startFrame||actual.endFrame!==row.endFrame||source?.clipId!==row.clipId||!Number.isFinite(source.startSeconds)||source.startSeconds<0||!Number.isFinite(source.endSeconds)||source.endSeconds<=source.startSeconds)invalid();
 return {clipId:row.clipId,startSeconds:source.startSeconds,endSeconds:source.endSeconds};
}
async function nativeImageSources(selects, projectId, photos, { matchById=false }={}) {
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
async function nativeImageSourcesById(selects,projectId,photos) {
 const project=selects.project(projectId),nodes=[];
 const visit=items=>{for(const item of items||[]){if(!item)continue;item.type==='dir'?visit(item.children):nodes.push(item);}};
 const overview=await project.sourceFiles();
 if('fileTree' in overview)visit(overview.fileTree);
 else for(const folder of overview.folders||[]){const detail=await project.sourceFiles({folder:folder.name});if('fileTree' in detail)visit(detail.fileTree);}
 const selected=photos.map(photo=>{
  const matches=nodes.filter(node=>node.resourceId===photo.resourceId&&typeof node.path==='string'&&node.path);
  if(matches.length!==1)throw Error('The selected Image path is missing or ambiguous in the Project: '+photo.name);
  return {...photo,path:matches[0].path};
 });
 return nativeImageSources(selects,projectId,selected,{matchById:true});
}
async function resolveTemplateMedia(selects,projectId,files,scratchName='Template source check',options={}) {
 if(!options||typeof options!=='object'||Array.isArray(options)||Object.keys(options).some(key=>!['includeTiming','dimensions','includeKind'].includes(key))||['includeTiming','dimensions','includeKind'].some(key=>options[key]!==undefined&&typeof options[key]!=='boolean'))throw Error('The source observation options are invalid.');
 if(!Array.isArray(files)||!files.length||files.length>50||files.some(file=>!file||typeof file.rid!=='string'||!file.rid||!['video','image'].includes(file.kind))||new Set(files.map(file=>file.rid)).size!==files.length)throw Error('The selected template source request is invalid.');
 const project=selects.project(projectId),resolved=[],failed=[];let shared=null,catalogRead=null;
 const text=error=>String(Object(error).message||error||'Source preparation could not be confirmed.').slice(0,300);
 const unknown=message=>Object.assign(Error(message),{code:'source-resolution-unknown'});
 for(const file of files){
  let phase='create',insertionError;
  try{
   const photo=file.kind==='image',draft=photo||Object(options).includeTiming||!shared?await project.createDraft({name:scratchName}):shared;
   if(!photo)shared=draft;
   phase='readback';const before=await draft.clips({trackScope:'main'});
   if(!Array.isArray(before)||before.some(row=>!Number.isSafeInteger(row?.clipId))||new Set(before.map(row=>row.clipId)).size!==before.length)throw unknown('The private source check could not be observed before placement.');
   const ids=new Set(before.map(row=>row.clipId));
   const observe=async()=>{
    const rows=await draft.clips({trackScope:'main'});
    if(!Array.isArray(rows)||rows.some(row=>!Number.isSafeInteger(row?.clipId))||new Set(rows.map(row=>row.clipId)).size!==rows.length)throw unknown('The private source check returned invalid clips.');
    const added=rows.filter(row=>!ids.has(row.clipId));
    if(added.length>1||added.length===1&&(typeof added[0].resourceId!=='string'||!added[0].resourceId))throw unknown('The placed source alias could not be uniquely confirmed.');
    return added[0]??null;
   };
   phase='insert';
   try{await draft.insertResource({resourceId:file.rid,sourceRange:{startSeconds:0,endSeconds:0.5}});}catch(error){insertionError=error;}
   phase='readback';let clip=await observe();
   // Only the SDK's pre-mutation range validation authorizes the old short-file
   // fallback. An empty observation after an arbitrary transport error does not.
   if(!clip&&insertionError&&/^invalid_source_range(?::|$)/.test(text(insertionError))){
    phase='insert';insertionError=null;
    try{await draft.insertResource({resourceId:file.rid});}catch(error){insertionError=error;}
    phase='readback';clip=await observe();
   }
   if(!clip){if(insertionError){phase='insert';throw insertionError;}throw unknown('Source placement returned no confirmed clip.');}
   let kind=null;
   if(Object(options).includeKind){
    phase='kind';
    const rows=await (catalogRead??=project.resources());
    if(!Array.isArray(rows)||rows.some(row=>!row||typeof row.resourceId!=='string'||!row.resourceId||typeof row.type!=='string')||new Set(rows.map(row=>row.resourceId)).size!==rows.length)throw unknown('The current Project Resource kinds could not be confirmed.');
    const row=rows.find(row=>row.resourceId===clip.resourceId);
    if(!row)throw unknown('The placed source has no confirmed Project Resource kind.');
    kind=row.type==='Video'?'video':row.type==='Image'?'image':null;
    if(kind!==file.kind)throw Object.assign(Error('The selected source kind differs from the handed video/photo declaration.'),{code:'source-kind-mismatch'});
   }
   let size=null;
   if(photo&&Object(options).dimensions!==false){phase='dimensions';const sources=await nativeImageSourcesById(selects,projectId,[{resourceId:clip.resourceId,name:file.rid}]);size={width:sources[0].width,height:sources[0].height};}
   let timing=null;
   if(Object(options).includeTiming){phase='timing';const meta=await draft.meta();if(!Number.isFinite(meta.fps)||meta.fps<=0)throw unknown('The source frame grid could not be confirmed.');timing={insertionFps:meta.fps};}
   resolved.push({rid:file.rid,alias:clip.resourceId,size,...kind?{kind}:{},...timing?{timing}:{}});
  }catch(error){
   const code=typeof Object(error).code==='string'?Object(error).code.slice(0,80):['readback','kind'].includes(phase)?'source-resolution-unknown':'source-resolution-failed';
   failed.push({rid:file.rid,phase,code,error:text(error),...insertionError&&insertionError!==error?{insertionError:text(insertionError)}:{}});
  }
 }
 return {resolved,failed};
}
function requireSourceFileSupport(files) {
 if(typeof files?.stat!=='function'||typeof files?.readRange!=='function'){
  const message='Update Selects to verify complete source file contents before creating this template.';
  throw Object.assign(new Error(message),{code:'source-file-unsupported',publicMessage:message});
 }
}
async function observeSourceFiles(files,paths,expected=null,options=null) {
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
async function confirmProjectSourcePaths(selects,projectId,bindings) {
 const issue=(code,message,cause=null)=>Object.assign(new Error(message),{code:'source-path-'+code,publicMessage:message,cause});
 const valid=value=>typeof value==='string'&&value.length>0&&value.length<=8192&&!value.includes('\0');
 if(!valid(projectId)||!Array.isArray(bindings)||bindings.length>16384||bindings.some(row=>!row||!valid(row.resourceId)||!valid(row.path))||new Set(bindings.map(row=>row.resourceId)).size!==bindings.length)throw issue('input','The selected source bindings are invalid.');
 const expected=bindings.map(row=>({resourceId:row.resourceId,path:row.path}));
 if(!expected.length)return {verified:true};
 const wanted=new Set(expected.map(row=>row.resourceId)),found=new Map(),deadline=Date.now()+25000;let nodes=0;
 const check=()=>{if(Date.now()>=deadline)throw issue('unknown','The current Project source paths could not be confirmed in time.');};
 const visit=(rows,depth=0)=>{
  check();if(!Array.isArray(rows)||depth>24)throw issue('unknown','The Project source tree is incomplete or unsupported.');
  for(const row of rows){
   if(++nodes>16384||!row||typeof row!=='object')throw issue('unknown','The Project source tree exceeds its observation budget or is incomplete.');
   if(row.type==='dir')visit(row.children,depth+1);
   else if(wanted.has(row.resourceId)){
    if(found.has(row.resourceId)||!valid(row.path))throw issue('changed','A selected source path is missing or ambiguous in the Project.');
    found.set(row.resourceId,row.path);
   }
  }
 };
 try{
  const project=selects.project(projectId),overview=await project.sourceFiles();check();
  if(!overview||typeof overview!=='object')throw issue('unknown','The current Project source tree could not be confirmed.');
  if('fileTree' in overview)visit(overview.fileTree);
  else{
   if(!Array.isArray(overview.folders)||overview.folders.length>512||overview.folders.some(row=>!row||!valid(row.name))||new Set(overview.folders.map(row=>row.name)).size!==overview.folders.length)throw issue('unknown','The Project source folder list is incomplete or unsupported.');
   for(const folder of overview.folders){check();const detail=await project.sourceFiles({folder:folder.name});check();if(!detail||typeof detail!=='object'||!('fileTree' in detail))throw issue('unknown','A Project source folder did not return its complete file tree.');visit(detail.fileTree);}
  }
 }catch(cause){if(cause?.code?.startsWith('source-path-'))throw cause;throw issue('unknown','The current Project source paths could not be read.',cause);}
 for(const row of expected)if(found.get(row.resourceId)!==row.path)throw issue('changed','A selected original has moved or changed its Project source link. Reload the Project inputs before trying again.');
 check();return {verified:true};
}
function nativeMediaWindow({startFrame,endFrame,draftFps,sourceFps,sourceStartSeconds=0,sourceDurationSeconds=null,still=false}) {
 const frames=endFrame-startFrame;
 if(!Number.isFinite(draftFps)||draftFps<=0||!Number.isFinite(sourceFps)||sourceFps<=0||!Number.isSafeInteger(startFrame)||startFrame<0||!Number.isSafeInteger(endFrame)||!Number.isSafeInteger(frames)||frames<1||!Number.isFinite(sourceStartSeconds)||sourceStartSeconds<0||typeof still!=='boolean'||sourceDurationSeconds!==null&&(!Number.isFinite(sourceDurationSeconds)||sourceDurationSeconds<=0))throw Error('The media plan has no valid whole-frame interval.');
 const count=Math.max(1,Math.ceil(frames/draftFps*sourceFps-1e-8)),cap=sourceDurationSeconds!==null?Math.floor(sourceDurationSeconds*sourceFps+1e-6)-count:Infinity;
 if(!Number.isSafeInteger(count)||count<1||cap!==Infinity&&(!Number.isSafeInteger(cap)||cap<0))throw Error('The planned source cannot cover its playback interval.');
 const start=still?0:Math.max(0,Math.min(Math.round(sourceStartSeconds*sourceFps),cap));
 if(!Number.isSafeInteger(start)||start<0||!Number.isSafeInteger(start+count))throw Error('The planned source interval cannot be represented.');
 return {startFrame,endFrame,frames,sourceStart:start/sourceFps,sourceEnd:(start+count)/sourceFps,insertedFrames:Math.round(count/sourceFps*draftFps)};
}
function bindMediaPlacement(before,rows,wanted) {
 const fail=()=>{throw Error('The media placement differs from its requested interval or source.');};
 const valid=list=>Array.isArray(list)&&list.length<=1024&&list.every(row=>row&&Number.isSafeInteger(row.clipId)&&row.clipId>=0&&typeof row.trackId==='string'&&row.trackId)&&new Set(list.map(row=>row.clipId)).size===list.length;
 if(!valid(before)||!valid(rows)||!wanted||typeof wanted.resourceId!=='string'||!wanted.resourceId)fail();
 const keys=['trackId','trackKind','resourceId','startFrame','endFrame'],ids=new Set(before.map(row=>row.clipId)),added=rows.filter(row=>!ids.has(row.clipId));
 if(rows.length!==before.length+1||added.length!==1||before.some(old=>{const current=rows.find(row=>row.clipId===old.clipId);return !current||keys.some(key=>current[key]!==old[key]);}))fail();
 const row=added[0];if(!Number.isSafeInteger(row.startFrame)||row.startFrame<0||!Number.isSafeInteger(row.endFrame)||row.endFrame<=row.startFrame)fail();
 for(const key of ['resourceId','trackKind','startFrame','endFrame'])if(wanted[key]!==undefined&&row[key]!==wanted[key])fail();
 return row;
}
async function inspectImageTransforms(draft,expected,includeMain=false){
 // Both consumers author fixed intrinsic transforms; motion belongs to their
 // separate effects. Never adopt an observed transform as the expected value.
 if(!('clipTransform' in draft))throw Error('Update Selects to verify Image transforms.');
 const rows=(await draft.clips({trackScope:'all'})).filter(clip=>clip.trackKind==='video'||includeMain&&clip.trackKind==='main'&&clip.resourceId!=null);
 if(!Array.isArray(expected)||expected.length!==rows.length||new Set(expected.map(row=>row.clipId)).size!==expected.length)throw Error('Visual transform count could not be confirmed.');
 const same=(a,b)=>{
  // Converting domain coordinates to the SDK may introduce floating-point noise.
  if(typeof a==='number'||typeof b==='number')return Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=1e-8*Math.max(1,Math.abs(b));
  if(a===b)return true;
  if(!a||!b||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b))return false;
  const keys=Object.keys(b);return Object.keys(a).length===keys.length&&keys.every(key=>Object.prototype.hasOwnProperty.call(a,key)&&same(a[key],b[key]));
 };
 const receipts=[];
 for(const wanted of expected){
  const clip=rows.find(row=>row.clipId===wanted.clipId&&row.trackId===wanted.trackId);
  if(!clip)throw Error('Visual transform target could not be confirmed.');
  const patch=wanted.transform,transform={enabled:true,rotation:0,flipHorizontal:false,flipVertical:false,positionKeys:[],scaleKeys:[],rotationKeys:[],...patch,position:{x:0,y:0,...patch.position},scale:{x:1,y:1,...patch.scale},anchor:{x:0,y:0,...patch.anchor}};
  const actual=await draft.clipTransform(clip);
  if(!actual||!Object.entries(transform).every(([key,value])=>same(actual[key],value)))throw Error('Visual transform could not be confirmed.');
  receipts.push({clipId:wanted.clipId,trackId:wanted.trackId,transform});
 }
 return receipts;
}
async function inspectImageAudio(draft,expected,project,overlayOnly=false,observedSources=null,readSource=null){
 const mismatch=message=>Object.assign(Error(message),{code:'IMAGE_AUDIO_MISMATCH'});
 const rows=(await draft.clips({trackScope:'all'})).filter(row=>row.trackKind==='audio'||!overlayOnly&&row.trackKind==='main'&&row.resourceId);
 if(!Array.isArray(expected)||rows.length!==expected.length||new Set(expected.map(row=>row.clipId)).size!==expected.length)throw mismatch('Audio clip count could not be confirmed.');
 if(!expected.length)return [];
 if(!('clipAudio' in draft))throw Error('Update Selects to verify Audio settings.');
 const types=new Map((await project.resources()).map(row=>[row.resourceId,row.type])),receipts=[];
 const same=(a,b)=>{
  if(typeof a==='number'||typeof b==='number')return Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=1e-8*Math.max(1,Math.abs(b));
  if(a===b)return true;
  if(!a||!b||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b))return false;
  const keys=Object.keys(b);return Object.keys(a).length===keys.length&&keys.every(key=>Object.prototype.hasOwnProperty.call(a,key)&&same(a[key],b[key]));
 };
 for(const wanted of expected){
  const row=rows.find(c=>c.clipId===wanted.clipId&&c.trackId===wanted.trackId);
  if(!row||row.trackKind!==wanted.trackKind||row.resourceId!==wanted.resourceId||row.startFrame!==wanted.startFrame||row.endFrame!==wanted.endFrame||types.get(row.resourceId)!=='Audio'||!same(row.audioSourceIndexes,wanted.audioSourceIndexes))throw mismatch('Audio placement or routing could not be confirmed.');
  const settings={volumeDb:0,volumeKeys:[],fadeInSeconds:0,fadeOutSeconds:0,...wanted.settings},actual=await draft.clipAudio(row);
  if(!actual||actual.clipId!==row.clipId||!Object.entries(settings).every(([key,value])=>same(actual[key],value)))throw mismatch('Audio volume or fades could not be confirmed.');
  if(!wanted.source||!Number.isFinite(wanted.source.startSeconds)||wanted.source.startSeconds<0||!Number.isFinite(wanted.source.endSeconds)||wanted.source.endSeconds<=wanted.source.startSeconds)throw Error('Audio source evidence is unavailable.');
  const source={startSeconds:wanted.source.startSeconds,endSeconds:wanted.source.endSeconds,playbackSpeed:{numerator:1,denominator:1},preserveAudioPitch:true,...wanted.source};
  if(!Number.isSafeInteger(source.playbackSpeed?.numerator)||source.playbackSpeed.numerator<1||!Number.isSafeInteger(source.playbackSpeed?.denominator)||source.playbackSpeed.denominator<1||typeof source.preserveAudioPitch!=='boolean')throw Error('Audio source evidence is invalid.');
  if(row.playbackSpeed?.numerator!==source.playbackSpeed.numerator||row.playbackSpeed?.denominator!==source.playbackSpeed.denominator||row.preserveAudioPitch!==source.preserveAudioPitch)throw mismatch('Audio playback policy could not be confirmed.');
  // Time uses floating-point arithmetic noise only, not the relative tolerance
  // used for level/fades. A small changed source instant must remain detectable.
  const timeSame=(a,b)=>Number.isFinite(a)&&Math.abs(a-b)<=8*Number.EPSILON*Math.max(1,Math.abs(a),Math.abs(b));
  // An unsaved working copy has no persisted source read. Keep the requested
  // interval as intent; only saved verification supplies independently read
  // sources. Never infer the source offset from timeline placement.
  if(observedSources!==null){
   if(typeof readSource!=='function')throw Error('Audio source observation is unavailable.');
   let observed;try{observed=readSource(observedSources,row);}catch(cause){throw Object.assign(Error('Audio source timing could not be confirmed.'),{cause});}
   if(!observed||observed.clipId!==row.clipId||!timeSame(observed.startSeconds,source.startSeconds)||!timeSame(observed.endSeconds,source.endSeconds))throw mismatch('Audio source timing could not be confirmed.');
  }
  receipts.push({clipId:wanted.clipId,trackId:wanted.trackId,trackKind:wanted.trackKind,resourceId:wanted.resourceId,startFrame:wanted.startFrame,endFrame:wanted.endFrame,audioSourceIndexes:wanted.audioSourceIndexes,settings,source});
 }
 return receipts;
}
function validateMiniAssemblyConfig(cfg) {
 const invalid=()=>{throw Error('The Mini assembly plan is incomplete or invalid.');};
 const id=value=>typeof value==='string'&&value.length>0&&value.length<=1024&&!value.includes('\0');
 const finite=value=>typeof value==='number'&&Number.isFinite(value);
 if(!cfg||!id(cfg.projectId)||!id(cfg.draftName)||!Array.isArray(cfg.picks)||cfg.picks.length<1||cfg.picks.length>256||!Array.isArray(cfg.boundaries)||cfg.boundaries.length!==cfg.picks.length+1||cfg.boundaries[0]!==0||cfg.boundaries.some((value,index)=>!finite(value)||value<0||index>0&&value<=cfg.boundaries[index-1]))invalid();
 if(cfg.clipSound!==undefined&&!['off','ambient','full'].includes(cfg.clipSound)||cfg.ambientDb!==undefined&&(!finite(cfg.ambientDb)||cfg.ambientDb< -60||cfg.ambientDb>12))invalid();
 const photoIds=new Set();
 for(const pick of cfg.picks){
  if(!pick||!id(pick.rid)||pick.kind!==undefined&&!['photo','video'].includes(pick.kind))invalid();
  if(pick.kind!=='photo'&&(!finite(pick.startSeconds)||pick.startSeconds<0)||pick.sourceDuration!==undefined&&(!finite(pick.sourceDuration)||pick.sourceDuration<=0))invalid();
  if(pick.kind==='photo'){if(photoIds.has(pick.rid))invalid();photoIds.add(pick.rid);}
  const size=cfg.crops?.[pick.rid];
  if(pick.kind==='photo'&&(!Number.isSafeInteger(size?.width)||size.width<1||!Number.isSafeInteger(size?.height)||size.height<1))invalid();
  if(size&&[size.width,size.height].some(value=>value!=null&&(!Number.isSafeInteger(value)||value<1)))invalid();
 }
 if(cfg.music!=null&&(!id(cfg.music.resourceId)||!finite(cfg.music.sectionStart)||cfg.music.sectionStart<0||cfg.music.tailSeconds!==undefined&&(!finite(cfg.music.tailSeconds)||cfg.music.tailSeconds<0)||cfg.music.referenceCuts!==undefined&&typeof cfg.music.referenceCuts!=='boolean'))invalid();
}
// Mini policy only: source/draft clocks remain explicit arguments.
function miniAssemblyOffset(cfg,fps){return cfg.music&&!cfg.music.referenceCuts?cfg.music.sectionStart-Math.round(cfg.music.sectionStart*fps)/fps:0;}
function miniAssemblyShot(cfg,index,fps,sourceFps){
 const pick=cfg.picks[index],startFrame=index?Math.round((cfg.boundaries[index]+miniAssemblyOffset(cfg,fps))*fps):0,endFrame=Math.round((cfg.boundaries[index+1]+miniAssemblyOffset(cfg,fps))*fps),frames=endFrame-startFrame;
 if(!Number.isFinite(fps)||fps<=0||!Number.isFinite(sourceFps)||sourceFps<=0||!Number.isSafeInteger(startFrame)||!Number.isSafeInteger(endFrame)||!Number.isSafeInteger(frames)||frames<1)throw Error('The assembly plan has no positive whole-frame interval.');
 return nativeMediaWindow({startFrame,endFrame,draftFps:fps,sourceFps,sourceStartSeconds:pick.kind==='photo'?0:pick.startSeconds,sourceDurationSeconds:pick.sourceDuration??null,still:pick.kind==='photo'});
}
async function miniAssemblyTiming(selects,cfg,resolveMedia){
const seenSources=new Set(),unique=[],timing=new Map();
for(const pick of cfg.picks)if(!seenSources.has(pick.rid)){seenSources.add(pick.rid);unique.push({rid:pick.rid,kind:pick.kind==='photo'?'image':'video'});}
for(let offset=0;offset<unique.length;offset+=50){
 const batch=unique.slice(offset,offset+50),facts=await resolveMedia(selects,cfg.projectId,batch,'Mini source timing check',{includeTiming:true,dimensions:false});
 if(facts.failed.length||facts.resolved.length!==batch.length||facts.resolved.some((row,i)=>row.rid!==batch[i].rid||row.alias!==batch[i].rid||!Number.isFinite(row.timing?.insertionFps)||row.timing.insertionFps<=0))throw Error('The planned source frame grid or identity could not be confirmed.');
 for(const row of facts.resolved)timing.set(row.rid,row.timing.insertionFps);
}
 return timing;
}

const cfg = __CONFIG__;
validateMiniAssemblyConfig(cfg);
const analysisSources=Object(cfg).analysisSources,sourceBindings=Object(cfg).sourceBindings;
const confirmAnalysisSources=async()=>{
 if(sourceBindings!==undefined)await confirmProjectSourcePaths(selects,cfg.projectId,sourceBindings);
 if(analysisSources!==undefined)await observeSourceFiles(selects.files,Array.isArray(analysisSources)?analysisSources.map(row=>row?.path):null,analysisSources);
};
await confirmAnalysisSources();

const p=selects.project(cfg.projectId),notes=[],W=1920,H=1080;
// Observe each source on its own native grid. Never infer an original clock
// from a resized output canvas or from the previous probe's first source.
const timing=await miniAssemblyTiming(selects,cfg,resolveTemplateMedia);
const same=(a,b)=>{
 if(typeof a==='number'||typeof b==='number')return Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=1e-8*Math.max(1,Math.abs(b));
 if(a===b)return true;if(!a||!b||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b))return false;
 const keys=Object.keys(b);return Object.keys(a).length===keys.length&&keys.every(key=>Object.prototype.hasOwnProperty.call(a,key)&&same(a[key],b[key]));
};
let d,fps,endFrame,bindings;
const all=()=>d.clips({trackScope:'all'}),meta=()=>d.meta();
const media=async()=> (await all()).filter(row=>['main','video','audio'].includes(row.trackKind));
const find=async binding=>{const rows=await all(),row=rows.find(c=>c.clipId===binding.clipId&&c.trackId===binding.trackId);if(!row||row.resourceId!==binding.resourceId||row.startFrame!==binding.startFrame||row.endFrame!==binding.endFrame)throw Error('The planned placement changed.');return row;};
// The SDK can confirm placement and speed before save, but exposes no
// working-copy source window. Its planned window is retained only as intent.
const placementMatches=async binding=>{
 const row=await find(binding),speed=row.playbackSpeed;
 if(speed&&(speed.numerator!==speed.denominator))throw Error('The planned playback speed changed during placement.');
};
const offset=f=>miniAssemblyOffset(cfg,f);
const lay=async(rate,final)=>{
 d=await p.createDraft({name:cfg.draftName});if((await media()).length)throw Error('The new assembly working Draft is not empty.');await d.setFrameSize({width:W,height:H});fps=rate||(await meta()).fps;
 if(!Number.isFinite(fps)||fps<=0)throw Error('The assembly frame grid is unavailable.');endFrame=0;bindings=[];
 for(let i=0;i<cfg.picks.length;i++){
  const pick=cfg.picks[i],intent=miniAssemblyShot(cfg,i,fps,timing.get(pick.rid)),targetEnd=intent.endFrame,want=intent.frames,before=await media();
  // Insert and verify a native-frame cover before trimming its declared surplus.
  await d.insertResource({resourceId:pick.rid,sourceRange:{startSeconds:intent.sourceStart,endSeconds:intent.sourceEnd}});
  const actualRate=(await meta()).fps;
  if(i===0&&actualRate!==fps){bindMediaPlacement(before,await media(),{resourceId:pick.rid,trackKind:'main'});if(final)throw Error('The source changed the assembly frame grid twice.');return actualRate;}
  const insertedFrames=intent.insertedFrames;
  if(!Number.isSafeInteger(insertedFrames)||insertedFrames<want)throw Error('The native source interval cannot cover the plan.');
  const added=bindMediaPlacement(before,await media(),{resourceId:pick.rid,trackKind:'main',startFrame:endFrame,endFrame:endFrame+insertedFrames});
  await placementMatches(added);
  if(insertedFrames>want){
   if(typeof d.trimBoundary!=='function')throw Error('Update Selects to trim a native interval to the planned cut.');
   await d.trimBoundary({frame:added.endFrame,side:'before',byFrames:want-insertedFrames});
  }
  const placed=bindMediaPlacement(before,await media(),{resourceId:pick.rid,trackKind:'main',startFrame:endFrame,endFrame:targetEnd});
  await placementMatches(placed);bindings.push({clipId:placed.clipId,trackId:placed.trackId,resourceId:placed.resourceId,startFrame:placed.startFrame,endFrame:placed.endFrame,sourceStart:intent.sourceStart});endFrame=targetEnd;
 }
 return null;
};
const real=await lay(null,false);if(real)await lay(real,true);
await d.setFrameSize({width:W,height:H});
const transforms=[];
for(const binding of bindings){
 const original=await d.clipTransform(await find(binding)),size=cfg.crops?.[binding.resourceId];
 const scale=size?.width>0&&size?.height>0?Math.max(W/size.width,H/size.height)/Math.min(W/size.width,H/size.height):1;
 const patch={scale:{x:scale,y:scale},position:{x:0,y:0}},expected={...original,...patch,positionKeys:[],scaleKeys:[]};
 if(!same(original,expected))await d.setClipTransform({clip:await find(binding),...patch});transforms.push({clipId:binding.clipId,trackId:binding.trackId,transform:expected});
}
await inspectImageTransforms(d,transforms,true);
let ambientClips=0;
if(cfg.clipSound==='ambient'){
 let failed=0;
 for(let i=0;i<bindings.length;i++){
  if(cfg.picks[i].kind==='photo')continue;const binding=bindings[i],db=cfg.ambientDb??-18;
  try{await d.setClipAudio({clip:await find(binding),volumeDb:db});const observed=await d.clipAudio(await find(binding));if(!same(observed.volumeDb,db)||observed.volumeKeys.length)throw Error('The sound level was not applied.');ambientClips++;}catch{failed++;}
 }
 if(failed)notes.push('the sound of '+failed+(failed===1?' clip':' clips')+' could not be lowered under the music');
}
let durationFrames=endFrame;const audioSourceIntents=[];
if(cfg.music){
 const tail=cfg.music.tailSeconds>0?Math.max(0,Math.round((cfg.boundaries.at(-1)+offset(fps)+cfg.music.tailSeconds)*fps)-endFrame):0;
 if(tail)await d.insertGap({seconds:tail/fps});durationFrames=endFrame+tail;
 const before=await media();
 await d.overlayResource({resource:p.resource(cfg.music.resourceId),over:await d.rangeAtFrames(0,durationFrames),sourceStartSeconds:cfg.music.sectionStart,playbackSpeed:{numerator:1,denominator:1}});
 const added=bindMediaPlacement(before,await media(),{resourceId:cfg.music.resourceId,trackKind:'audio',startFrame:0,endFrame:durationFrames}),prior=await d.clipAudio(added);
 const sourceStart=Math.round(cfg.music.sectionStart*fps)/fps;
 const audio=[{clipId:added.clipId,trackId:added.trackId,trackKind:'audio',resourceId:cfg.music.resourceId,startFrame:0,endFrame:durationFrames,audioSourceIndexes:null,settings:{volumeDb:prior.volumeDb,volumeKeys:prior.volumeKeys,fadeInSeconds:0,fadeOutSeconds:Math.min(durationFrames,Math.round(.12*fps))/fps},source:{startSeconds:sourceStart,endSeconds:sourceStart+durationFrames/fps,playbackSpeed:{numerator:1,denominator:1},preserveAudioPitch:true}}];
 const current=(await all()).find(row=>row.clipId===added.clipId&&row.trackId===added.trackId);
 await d.setClipAudio({clip:current,fadeInSeconds:0,fadeOutSeconds:audio[0].settings.fadeOutSeconds});
 await inspectImageAudio(d,audio,p,true,null);
 audioSourceIntents.push({...added,source:{clipId:added.clipId,startSeconds:sourceStart,endSeconds:sourceStart+durationFrames/fps}});
}
// Bind the final working state to intent again, after every styling/sound edit.
const finalRows=await all(),main=finalRows.filter(row=>row.trackKind==='main'&&row.resourceId!=null),finalMeta=await meta();
if(main.length!==bindings.length||finalMeta.fps!==fps||finalMeta.durationFrames!==durationFrames||finalMeta.frameSize.width!==W||finalMeta.frameSize.height!==H)throw Error('The final assembly frame grid or placement differs from the plan.');
for(const binding of bindings)await placementMatches(binding);
await inspectImageTransforms(d,transforms,true);
await confirmAnalysisSources();
const sourceIntents=[];
for(const binding of bindings){const row=await find(binding);sourceIntents.push({clipId:row.clipId,trackId:row.trackId,trackKind:row.trackKind,resourceId:row.resourceId,startFrame:row.startFrame,endFrame:row.endFrame,source:{clipId:row.clipId,startSeconds:binding.sourceStart,endSeconds:binding.sourceStart+(row.endFrame-row.startFrame)/fps}});}
for(const intent of audioSourceIntents)sourceIntents.push({clipId:intent.clipId,trackId:intent.trackId,trackKind:intent.trackKind,resourceId:intent.resourceId,startFrame:intent.startFrame,endFrame:intent.endFrame,source:intent.source});
const beforeCommit=Object(cfg).__beforeCommit;if(typeof beforeCommit==='function')await beforeCommit(d,sourceIntents);
const commit=await d.commitAll('Mini Vlog: assemble');
return {sequenceId:commit.createdDraftId,fps,totalFrames:endFrame,placed:bindings.length,ambientClips,notes};
