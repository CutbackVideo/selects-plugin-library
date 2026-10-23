// @name Photo Grid Reveal
// @name:de Photo Grid Reveal
// @name:en Photo Grid Reveal
// @name:es Photo Grid Reveal
// @name:fr Photo Grid Reveal
// @name:it Photo Grid Reveal
// @name:ja Photo Grid Reveal
// @name:ko Photo Grid Reveal
// @name:pt Photo Grid Reveal
// @name:tr Photo Grid Reveal
// @name:zh Photo Grid Reveal
// @collection visual-highlights
// @icon image
// Build a native, editable 3×7 photo/video gallery in the current Selects project.
import React from 'react';
// file-observation:start
// file-observation:end
// draft-observation:start
// draft-observation:end
/*__SHARED_SCRIPT_BUILDER__*/
const galleryFaceFocus=sharedCoverFocus.faceSafeCoverFocus;

// av-host:start
// Local files and media tools use the public async SDK. Paths remain host-native.
let hostSdk = null;
function hostUseSdk(sdk) { hostSdk = panelLocalClient(sdk); }
function hostError(code, message, member = "") { return Object.assign(new Error(message), { code, member,...code==='host-missing'?{publicMessage:message}:{} }); }
// A host service when it has every named method, else null.
function hostApi(name, ...methods) {
  const s = name === "FileSystem" ? hostSdk?.files : name === "Runtime" ? hostSdk?.media : null;
  return s && methods.every((m) => typeof s[m] === "function") ? s : null;
}
// A host service that must have `method`; throws a 'host-missing' error when this build lacks it.
function hostNeed(name, method) {
  const s = hostApi(name, method);
  if (!s) throw hostError("host-missing", "Update Selects to use this plugin: missing SDK " + name + "." + method, name + "." + method);
  return s;
}
// The host initializes the environment before mounting the panel.
function hostIsWindows() { return /^win/i.test(String(hostSdk?.environment?.platform || "")); }
// Joins path parts with the host's join (the OS separator), or by hand with the OS separator.
function hostJoin(...parts) {
  const fs = hostApi("FileSystem", "join");
  if (fs) { try { return String(fs.join(...parts)); } catch { /* join by hand */ } }
  const sep = hostIsWindows() ? "\\" : "/";
  return parts.filter((x) => x !== "").map((x, i) => (i === 0 ? x.replace(/[\\/]+$/, "") : x.replace(/^[\\/]+|[\\/]+$/g, ""))).join(sep);
}
async function hostRoots(sdk, id, marker) {
  hostUseSdk(sdk);
  const fs = hostNeed("FileSystem", "exists");
  const plugin = fs.join(fs.homedir(), ".selects", "skills", id);
  if (!await fs.exists(fs.join(plugin, marker))) throw hostError("not-found", "the plugin folder could not be found");
  let data = fs.join(fs.homedir(), ".selects", "plugin-data", id);
  try { await fs.mkdir(data, { recursive: true }); } catch { data = null; }
  return { plugin, data };
}
// av-host:end

// hold:start
// Short-video hold (formerly hold_video.py), plain JS on the av-host helpers so tests can run it in node:vm. A selected
// video shorter than the result is re-encoded once at 60 fps with its last frame cloned to the full length, by the
// host's bundled ffmpeg/ffprobe (argv arrays, no shell), into <data>/held-v3. Long videos are never touched. Full
// source/output hashes and private source snapshots belong to the shared asset owner. Domain callbacks own
// the encoding and whole-output validation. Result: { status: 'converted', fps: 60, durationFrames, videos: [{
// inputIndex, sourcePath, outputPath, sourceWidth, sourceHeight, outputWidth, outputHeight, cacheHit }] }; source sizes
// are upright (a source with a +-90 degree display rotation reports its height as width), as the held clip is.
const HOLD_FPS = 60, HOLD_MAX_EDGE = 1920, HOLD_MAX_FRAMES = 36000, HOLD_MAX_VIDEOS = 21;
const HOLD_ALGORITHM = 'photo-gallery-hold-v3-sha256-frozen-max1920-h264-crf18';
function holdError(message) { return Object.assign(new Error(message), { code: 'hold-failed',publicMessage:message }); }
// Host paths compared as keys: NFC; a Windows path also gets / separators and is case-folded.
function holdPathKey(path) {
  const text = String(path ?? '').normalize('NFC');
  return /^[A-Za-z]:(?:[\\/]|$)/.test(text) || text.includes('\\') ? text.replace(/\\/g, '/').toLowerCase() : text;
}
// Runs Runtime.runFFmpeg/runFFprobe with a deadline. The host rejects with a JSON string, not an Error.
async function holdTool(kind, argv, seconds, options = {}) {
  const rt = options.client ? options.client.media : hostNeed('Runtime', kind);
  if(typeof rt?.[kind]!=='function')throw hostError('host-missing','Update Selects to prepare media: missing '+kind);
  try{return await runAssetMediaTool(rt,kind,argv,{isCurrent:options.isCurrent,signal:options.signal,deadline:options.deadline,timeoutMs:seconds*1000});}
  catch(error){
    if(error?.code==='host-missing')throw error;
    if(error?.code==='BUNDLED_ASSET_UNSUPPORTED')throw hostError('host-missing',error.publicMessage);
    throw Object.assign(holdError(error?.publicMessage||'Media preparation failed.'),{terminal:!!error?.terminal,cause:error});
  }
}
async function holdProbe(path, countFrames = false, options = {}) {
  let result;
  try {
    result = await holdTool('runFFprobe', ['-v', 'error', ...(countFrames ? ['-count_frames'] : []), '-show_entries',
      'stream=index,codec_type,codec_name,width,height,r_frame_rate,avg_frame_rate,nb_read_frames:stream_side_data=rotation:stream_tags=rotate',
      '-of', 'json', path], 45, options);
  } catch (error) { if (error.code === 'host-missing' || error.terminal) throw error; throw holdError('Video cannot be decoded'); }
  let streams, video;
  try { streams = JSON.parse(String(result?.stdout || '')).streams; video = streams.find(item => item?.codec_type === 'video'); } catch { video = null; }
  if (!video) throw holdError('Media has no readable picture stream');
  if (!Number.isSafeInteger(video.width) || !Number.isSafeInteger(video.height) || video.width <= 0 || video.height <= 0) {
    throw holdError('Media dimensions are unavailable');
  }
  return { video, streams };
}
// A stream's display rotation in degrees (0, 90, 180 or 270): the display matrix side data, else the older `rotate`
// tag. Phone footage is often stored landscape and shown upright through it.
function holdRotation(video) {
  const side = (Array.isArray(video?.side_data_list) ? video.side_data_list : []).find(item => Number.isFinite(Number(item?.rotation)));
  const degrees = side ? Number(side.rotation) : Number(video?.tags?.rotate ?? 0);
  return Number.isFinite(degrees) ? ((Math.round(degrees / 90) * 90) % 360 + 360) % 360 : 0;
}
// The size ffmpeg encodes: it turns a rotated source upright, so a quarter turn swaps width and height.
function holdUpright(video) {
  const quarter = holdRotation(video) % 180 === 90;
  return quarter ? [video.height, video.width] : [video.width, video.height];
}
// The output size: at most 1920 on the long edge, then padded to even sides (as the encode filter does).
function holdDimensions(width, height) {
  const factor = Math.min(1, HOLD_MAX_EDGE / Math.max(width, height));
  // Python's round(): halves go to the even neighbour.
  const round = x => { const r = Math.round(x); return Math.abs(x % 1) === 0.5 && r % 2 ? r - 1 : r; };
  const w = Math.max(1, round(width * factor)), h = Math.max(1, round(height * factor));
  return [w + w % 2, h + h % 2];
}
async function holdValidate(path, frames, dimensions, decode = false, options = {}) {
  const { video, streams } = await holdProbe(path, true, options);
  if (streams.length !== 1 || video.codec_name !== 'h264') throw holdError('Cached video has the wrong stream format');
  if (video.r_frame_rate !== '60/1' || video.avg_frame_rate !== '60/1') throw holdError('Cached video has the wrong frame rate');
  if (video.nb_read_frames !== String(frames)) throw holdError('Cached video has the wrong frame count');
  if (video.width !== dimensions[0] || video.height !== dimensions[1]) throw holdError('Cached video has the wrong dimensions');
  if (decode) {
    try { await holdTool('runFFmpeg', ['-nostdin', '-v', 'error', '-xerror', '-i', path, '-f', 'null', '-'], Math.max(60, Math.floor(frames / HOLD_FPS) * 5 + 30), options); }
    catch (error) { if (error.terminal) throw error; throw holdError('Generated video contains undecodable frames'); }
  }
  return video;
}
async function holdKey(text) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}
async function holdEncode(source, target, frames, options = {}) {
  const scale = 'scale=w=\'min(iw,' + HOLD_MAX_EDGE + ')\':h=\'min(ih,' + HOLD_MAX_EDGE + ')\':' +
    'force_original_aspect_ratio=decrease:flags=lanczos,pad=ceil(iw/2)*2:ceil(ih/2)*2:0:0:black,setsar=1';
  // -write_tmcd 0: a source's timecode tag would otherwise add a tmcd data track, failing the one-stream check.
  const filters = 'fps=' + HOLD_FPS + ',tpad=stop_mode=clone:stop_duration=' + (frames / HOLD_FPS + 1).toFixed(6) + ',' + scale;
  try {
    await holdTool('runFFmpeg', ['-nostdin', '-v', 'error', '-y', '-i', source, '-vf', filters, '-an', '-frames:v', String(frames),
      '-r', String(HOLD_FPS), '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart', '-write_tmcd', '0', '-metadata', 'creation_time=', '-f', 'mp4', target], Math.max(90, Math.min(900, Math.floor(frames / HOLD_FPS) * 8 + 60)), options);
  } catch (error) { if (error.terminal) throw error; throw holdError('ffmpeg could not extend the short video'); }
}
async function holdFileHash(path,options) {
  const result=await holdTool('runFFmpeg',['-nostdin','-v','error','-f','data','-i',path,'-map','0:0','-c','copy','-f','hash','-hash','sha256','-'],900,options);
  const match=String(result?.stdout??'').trim().match(/^SHA256=([0-9a-f]{64})$/i);
  if(!match)throw holdError('The complete media file hash could not be confirmed');
  return match[1].toLowerCase();
}
async function holdConvertOne(source, identity, sourceDimensions, frames, cacheRoot, options) {
  const key = await holdKey([HOLD_ALGORITHM,holdPathKey(source),identity.sha256,identity.bytes,frames,HOLD_FPS,...sourceDimensions].join('\0'));
  const dimensions = holdDimensions(sourceDimensions[0], sourceDimensions[1]);
  const result=await prepareDerivedAsset(options.client.files,{directory:cacheRoot,key,sourcePath:source,source:identity,extension:'mp4',isCurrent:options.isCurrent,signal:options.signal,hashFile:path=>holdFileHash(path,options),
    produce:async(snapshot,target)=>{const {video}=await holdProbe(snapshot,true,options);if(JSON.stringify(holdUpright(video))!==JSON.stringify(sourceDimensions))throw holdError('A video changed before extension');await holdEncode(snapshot,target,frames,options);},
    verify:path=>holdValidate(path,frames,dimensions,true,options)});
  return {videoPath:result.path,dimensions,reused:result.reused};
}
// `request` is { videos: [{ path }], durationFrames }; `dataDir` is the plugin's data folder.
async function holdVideos(request, dataDir, options = {}) {
  const videos = request?.videos, frames = request?.durationFrames;
  if (!Array.isArray(videos) || videos.length < 1 || videos.length > HOLD_MAX_VIDEOS) throw holdError('Provide between 1 and 21 short videos');
  if (!Number.isSafeInteger(frames) || frames < 1 || frames > HOLD_MAX_FRAMES) throw holdError('durationFrames must be a positive integer at most 36000');
  if (!dataDir) throw holdError('The plugin data folder is unavailable');
  if(!options||typeof options!=='object'||Array.isArray(options)||options.isCurrent!==undefined&&typeof options.isCurrent!=='function')throw holdError('Media preparation options need a callable liveness predicate');
  options={...options,client:options.client??hostSdk,isCurrent:options.isCurrent??(()=>true)};
  const current=()=>{if(!options.isCurrent()||options.signal?.aborted)throw holdError('The template run ended during media preparation');};
  const paths=videos.map((item,index)=>{const path=item?.path;if(typeof path!=='string')throw holdError('Video '+(index+1)+' needs a file path');if(!path||path.includes('\0')||path.length>8192)throw holdError('Video '+(index+1)+' has an invalid path');return path;});
  const files=options.client?.files;
  for(const [service,names,label] of [[options.client?.media,['runFFmpeg','runFFprobe'],'Runtime'],[files,['copyFile','rename','join'],'FileSystem']]){
    for(const name of names)if(typeof service?.[name]!=='function')throw hostError('host-missing','Update Selects to prepare media: missing '+label+'.'+name,label+'.'+name);
  }
  if(typeof globalThis.crypto?.subtle?.digest!=='function')throw holdError('Update Selects to verify complete source media contents');
  const cacheRoot = files.join(dataDir, 'held-v3'),selected=new Map();
  // Observe every requested source before generating any derived file.
  for(const raw of paths){current();const key=holdPathKey(raw);if(selected.has(key))continue;
    const identity=await readAssetFileIdentity(files,raw,path=>holdFileHash(path,options),current);
    const {video}=await holdProbe(raw,true,options);if(!(Number(video.nb_read_frames)>=1))throw holdError('Video has no readable frames');selected.set(key,{identity,sourceDimensions:holdUpright(video)});
  }
  const completed = new Map(), output = [];
  for (let index = 0; index < videos.length; index++) {
    const raw = paths[index];
    try {
      current();const {identity,sourceDimensions}=selected.get(holdPathKey(raw));
      const id = holdPathKey(raw) + '\0' + identity.sha256;
      if (!completed.has(id)) {
        const done = await holdConvertOne(raw, identity, sourceDimensions, frames, cacheRoot, options);
        current();
        completed.set(id, { ...done, sourceDimensions });
      }
      const done = completed.get(id);
      output.push({ inputIndex: index, sourcePath: raw, outputPath: done.videoPath, sourceWidth: done.sourceDimensions[0],
        sourceHeight: done.sourceDimensions[1], outputWidth: done.dimensions[0], outputHeight: done.dimensions[1], cacheHit: done.reused });
    } catch (error) {
      if (error?.code === 'host-missing') throw error;
      throw Object.assign(holdError('Video ' + (index + 1) + ': ' + String(error?.message || error)), { detail: error?.detail,...error?.publicMessage?{publicMessage:error.publicMessage}:{} });
    }
  }
  current();return { status: 'converted', fps: HOLD_FPS, durationFrames: frames, videos: output };
}
// hold:end

// tempo:start
// Bounded local BPM suggestion (formerly tempo.py), plain JS so tests can run it in node:vm. The first 30 s are
// decoded from a verified source snapshot to mono samples at 11025 Hz, quantized to 16-bit as tempo.py read
// them, then a ~10 ms RMS onset envelope is autocorrelated over 70-180 BPM. Ambiguous or silent input yields no BPM.
const TEMPO_RATE = 11025, TEMPO_HOP = 110, TEMPO_MIN_BPM = 70, TEMPO_MAX_BPM = 180, TEMPO_SECONDS = 30;
// Python's round(): halves go to the even neighbour.
function tempoRoundEven(x) { const r = Math.round(x); return Math.abs(x % 1) === 0.5 && r % 2 ? r - 1 : r; }
// `samples`: mono floats in [-1, 1] at TEMPO_RATE. Returns { status: 'estimated', bpm } or { status: 'uncertain', reason }.
function tempoEstimate(samples) {
  if (samples.length < TEMPO_RATE * 6) return { status: 'uncertain', reason: 'At least six seconds of audio are needed' };
  const pcm = Int16Array.from(samples, x => Math.max(-32768, Math.min(32767, tempoRoundEven(x * 32768))));
  const energy = [];
  for (let start = 0; start + TEMPO_HOP <= pcm.length; start += TEMPO_HOP) {
    let sum = 0;
    for (let i = start; i < start + TEMPO_HOP; i++) sum += pcm[i] * pcm[i];
    energy.push(Math.sqrt(sum / TEMPO_HOP));
  }
  const onset = [];
  for (let i = 1; i < energy.length; i++) onset.push(Math.max(0, energy[i] - energy[i - 1]));
  if (onset.reduce((sum, v) => sum + v * v, 0) < 1) return { status: 'uncertain', reason: 'No detectable rhythmic audio' };
  const lowerLag = tempoRoundEven(60 * TEMPO_RATE / (TEMPO_MAX_BPM * TEMPO_HOP));
  const upperLag = tempoRoundEven(60 * TEMPO_RATE / (TEMPO_MIN_BPM * TEMPO_HOP));
  const scores = [];
  for (let lag = lowerLag; lag <= upperLag; lag++) {
    const bpm = 60 * TEMPO_RATE / (lag * TEMPO_HOP);
    if (bpm < TEMPO_MIN_BPM || bpm > TEMPO_MAX_BPM) continue;
    let numerator = 0, left = 0, right = 0;
    for (let i = 0; i + lag < onset.length; i++) {
      numerator += onset[i] * onset[i + lag]; left += onset[i] * onset[i]; right += onset[i + lag] * onset[i + lag];
    }
    scores.push([left > 0 && right > 0 ? numerator / Math.sqrt(left * right) : 0, bpm, lag]);
  }
  // Highest correlation first; ties go to the higher BPM, then the larger lag (Python's reverse tuple sort).
  scores.sort((a, b) => b[0] - a[0] || b[1] - a[1] || b[2] - a[2]);
  const best = scores[0];
  // A doubled interval repeats the same pulse; it is not independent evidence for a different tempo.
  const unrelated = lag => Math.abs(lag - best[2]) > 4 && Math.abs(lag - 2 * best[2]) > 1 && Math.abs(best[2] - 2 * lag) > 1;
  const runnerUp = scores.filter(entry => unrelated(entry[2])).reduce((max, entry) => Math.max(max, entry[0]), 0);
  if (best[0] < 0.12 || best[0] < runnerUp * 1.08) return { status: 'uncertain', reason: 'Tempo is ambiguous; enter BPM manually' };
  return { status: 'estimated', bpm: tempoRoundEven(best[1] * 10) / 10 };
}
// Analyze a verified private source through the existing derived-file owner.
// No Resource-ID memo: every invocation checks source and cached PCM bytes.
async function analyzeMusicFile(path, dataDir, options = {}) {
  const client=options.client??hostSdk,files=client?.files;
  const issue=(message,code='tempo-invalid')=>Object.assign(new Error(message),{code,publicMessage:message,terminal:true,safeNotSaved:true});
  if(typeof options.isCurrent!=='undefined'&&typeof options.isCurrent!=='function')throw issue('The music analysis scope is invalid.');
  const timeout=options.timeoutMs??45000;
  if(!Number.isFinite(timeout)||timeout<=0||timeout>45000)throw issue('The music analysis deadline is invalid.');
  const deadline=Date.now()+timeout;
  const live=()=>{try{return !options.signal?.aborted&&(options.isCurrent?.()??true);}catch{return false;}};
  const current=()=>{if(!live())throw issue('The music analysis ended before completion.','tempo-stopped');if(Date.now()>=deadline)throw issue('The music analysis timed out.','tempo-timeout');};
  current();
  if(!dataDir)throw issue('The music analysis folder is unavailable. Check storage and file access.','tempo-storage');
  if(['join','stat','readFile','exists','mkdir','writeFile','copyFile','rename','removeFile'].some(name=>typeof files?.[name]!=='function')||typeof client?.media?.runFFmpeg!=='function'||!globalThis.crypto?.subtle||typeof globalThis.crypto?.randomUUID!=='function')throw hostError('host-missing','Update Selects to verify and analyze the selected music.');
  const work={client,isCurrent:live,signal:options.signal,deadline};
  const hashFile=path=>holdFileHash(path,work);
  let decodeFailed=false;
  try{
    const source=await readAssetFileIdentity(files,path,hashFile,current);current();
    const key=await holdKey(['gallery-tempo-v1-f32le',holdPathKey(path),source.sha256,source.bytes,TEMPO_RATE,TEMPO_SECONDS].join('\0'));current();
    const maxBytes=TEMPO_RATE*TEMPO_SECONDS*4;
    const read=async(file,expected)=>{
      const bytes=await readBundledAssetBytes(files,file,maxBytes,current);current();
      if(expected){
        const digest=await crypto.subtle.digest('SHA-256',bytes);current();
        const sha256=Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');
        if(bytes.length!==expected.bytes||sha256!==expected.sha256)throw issue('The decoded music PCM contents changed before analysis.','tempo-pcm');
      }
      if(bytes.length%4!==0)throw issue('The decoded music PCM length is invalid.','tempo-pcm');
      const values=new Float32Array(bytes.length/4),view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
      for(let i=0;i<values.length;i++){values[i]=view.getFloat32(i*4,true);if(!Number.isFinite(values[i]))throw issue('The decoded music PCM contains an invalid sample.','tempo-pcm');}
      return values;
    };
    const prepared=await prepareDerivedAsset(files,{directory:files.join(dataDir,'tempo-v1'),key,sourcePath:path,source,extension:'f32',isCurrent:()=>{current();return true;},signal:options.signal,hashFile,
      produce:async(snapshot,target)=>{
        try{await holdTool('runFFmpeg',['-nostdin','-v','error','-y','-t',String(TEMPO_SECONDS),'-i',snapshot,'-vn','-ac','1','-ar',String(TEMPO_RATE),'-f','f32le',target],45,work);}
        catch(error){if(!error?.terminal&&error?.code==='hold-failed')decodeFailed=true;throw error;}
      },verify:read});
    current();const samples=await read(prepared.path,prepared.output);current();
    const result=tempoEstimate(samples);current();
    const after=await readAssetFileIdentity(files,path,hashFile,current);current();
    if(after.sha256!==source.sha256||after.bytes!==source.bytes)throw issue('The selected music source changed during analysis.','tempo-changed');
    return {estimate:result,source:{size:source.bytes,sha256:source.sha256}};
  }catch(error){
    current();if(decodeFailed&&!error?.terminal)return {estimate:{status:'uncertain',reason:'Audio could not be decoded'},source:null};
    if(error?.code==='host-missing'||typeof error?.publicMessage==='string'){error.safeNotSaved=true;throw error;}
    throw Object.assign(issue('Music analysis could not be completed. Check the source file and media tools.','tempo-read'),{cause:error});
  }
}
async function tempoOfFile(path,dataDir,options={}) {
  return (await analyzeMusicFile(path,dataDir,options)).estimate;
}
// tempo:end

const SLOT_KEYS = Array.from({ length: 21 }, (_, i) => `tile-${String(i + 1).padStart(2, '0')}`);
const REFERENCE_VIDEO_SLOTS = new Set([4, 6, 11, 17, 19, 21]);
const emptySlots = () => SLOT_KEYS.map(() => ({ resourceId: '', focusX: 0.5, focusY: 0.5 }));
// `preparing.say` is whoever is showing progress at the time (the Panel or a template run).
const preparing = { say: null };
const STRINGS = {
  "ko": {
    "focusHint": "자동 초점이 얼굴을 놓칠 수 있습니다. 각 칸을 확인하고 필요하면 초점 슬라이더로 조정하세요. 멀리 떨어진 여러 사람은 한 칸에 모두 담기 어려울 수 있습니다.",
    "title": "Photo Grid Reveal",
    "description": "3\uc5f4 \u00d7 7\ud589\uc774 \ucc28\ub840\ub85c \ucc44\uc6cc\uc9c0\uace0 \uc804\uccb4\uac00 \ud751\ubc31\uc5d0\uc11c \uceec\ub7ec\ub85c \ubc14\ub01d\ub2c8\ub2e4. \uc0c8 \ud3b8\uc9d1\ubcf8\uc758 21\uce78\uc5d0 \uc0ac\uc9c4\uacfc \uc601\uc0c1\uc744 \uac01\uac01 \uc9c0\uc815\ud569\ub2c8\ub2e4.",
    "noProject": "\uba3c\uc800 \ud504\ub85c\uc81d\ud2b8\ub97c \uc5ec\uc138\uc694.",
    "load": "\ud504\ub85c\uc81d\ud2b8 \ubbf8\ub514\uc5b4 \ubd88\ub7ec\uc624\uae30",
    "changed": "\ud504\ub85c\uc81d\ud2b8 \ub610\ub294 \ud3b8\uc9d1\ubcf8\uc774 \ubc14\ub00c\uc5c8\uc2b5\ub2c8\ub2e4. \ub2e4\uc2dc \ubd88\ub7ec\uc624\uc138\uc694.",
    "createMode": "\uc0c8 \ud3b8\uc9d1\ubcf8",
    "slot": "\uce78",
    "media": "\uc0ac\uc9c4 \ub610\ub294 \uc601\uc0c1",
    "choose": "\ubbf8\ub514\uc5b4 \uc120\ud0dd",
    "noMedia": "\ud504\ub85c\uc81d\ud2b8\uc5d0 \uc0ac\uc9c4 \ub610\ub294 \uc601\uc0c1\uc774 \uc5c6\uc2b5\ub2c8\ub2e4.",
    "assigned": "\uc9c0\uc815\ud55c \uce78",
    "fill": "21\uac1c\ub97c \ubaa9\ub85d \uc21c\uc11c\ub85c \uc9c0\uc815",
    "fillHint": "\uc0ac\uc9c4 21\uac1c\uac00 \uc788\uc73c\uba74 \uc0ac\uc9c4\uc744 \uc6b0\uc120\ud569\ub2c8\ub2e4. \uac19\uc740 \ubbf8\ub514\uc5b4\ub97c \uc5ec\ub7ec \uce78\uc5d0 \uc4f0\ub824\uba74 \uac01 \uce78\uc5d0\uc11c \uc9c1\uc811 \uace0\ub974\uc138\uc694.",
    "referenceMix": "\uc6d0\ubcf8 \uc6c0\uc9c1\uc784 \uad6c\uc131\uc73c\ub85c \uc9c0\uc815 (\uc0ac\uc9c4 15 + \uc601\uc0c1 6)",
    "motionMissing": "\uc6d0\ubcf8\uc5d0\uc11c\ub294 \ub2e4\uc74c \uce78\uc774 \uc6c0\uc9c1\uc785\ub2c8\ub2e4. \ud604\uc7ac \uc0ac\uc9c4\uc73c\ub85c \uc9c0\uc815\ub41c \uce78: ",
    "focusX": "\uac00\ub85c \ucd08\uc810",
    "focusY": "\uc138\ub85c \ucd08\uc810",
    "editLimits": "\uc0dd\uc131\ub41c 21\uce78\uc740 Selects \ud0c0\uc784\ub77c\uc778\uc5d0\uc11c \uac01\uac01 \ud3b8\uc9d1\ud560 \uc218 \uc788\uc2b5\ub2c8\ub2e4. \ud50c\ub7ec\uadf8\uc778\uc758 \uae30\uc874 \ud3b8\uc9d1\ubcf8 \ud55c \uce78\ub9cc \ubc14\uafb8\uae30\ub294 \uc544\uc9c1 \uc9c0\uc6d0\ud558\uc9c0 \uc54a\uc2b5\ub2c8\ub2e4.",
    "music": "\uc74c\uc545",
    "noMusic": "\uc74c\uc545 \uc5c6\uc74c",
    "bpmManual": "BPM \uc9c1\uc811 \uc9c0\uc815",
    "bpm": "BPM",
    "estimate": "\uc74c\uc545 BPM \ucd94\uc815",
    "estimated": "\ucd94\uc815 BPM",
    "uncertain": "BPM\uc744 \ud655\uc2e4\ud788 \ucd94\uc815\ud558\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4. \uc9c1\uc811 \uc785\ub825\ud574 \uc8fc\uc138\uc694.",
    "duration": "\uc601\uc0c1 \uae38\uc774",
    "durationNote": "\uae30\ubcf8 14.217\ucd08 \u00b7 \ud504\ub85c\uc81d\ud2b8 \ud504\ub808\uc784\ub808\uc774\ud2b8\ub97c \uc0ac\uc6a9\ud569\ub2c8\ub2e4. \uc74c\uc545\uc774 \uc774 \uae38\uc774\ub97c \ucc44\uc6b8 \uc218 \uc788\uc5b4\uc57c \ud569\ub2c8\ub2e4.",
    "name": "\ud3b8\uc9d1\ubcf8 \uc774\ub984",
    "create": "\uc0c8 \ud3b8\uc9d1\ubcf8 \ub9cc\ub4e4\uae30",
    "busy": "\ucc98\ub9ac \uc911\u2026",
    "missing": "21\uac1c \uce78\uc5d0 \ubbf8\ub514\uc5b4\ub97c \uc815\ud655\ud788 \uc9c0\uc815\ud574 \uc8fc\uc138\uc694.",
    "bpmMissing": "\uc74c\uc545\uc744 \uc120\ud0dd\ud558\uac70\ub098 BPM\uc744 \uc9c1\uc811 \uc785\ub825\ud574 \uc8fc\uc138\uc694.",
    "saved": "\uc800\uc7a5\ud588\uc2b5\ub2c8\ub2e4. \uc2e4\uc81c \uc7ac\uc0dd\uacfc \ub0b4\ubcf4\ub0b4\uae30\ub294 \ubcc4\ub3c4\ub85c \ud655\uc778\ud574 \uc8fc\uc138\uc694.",
    "readback": "\uc800\uc7a5 \ud6c4 \ud3b8\uc9d1\ubcf8\uc758 21\uce78\uc744 \ub2e4\uc2dc \ud655\uc778\ud588\uc2b5\ub2c8\ub2e4. \uc7ac\uc0dd\uacfc \ub0b4\ubcf4\ub0b4\uae30\ub294 \ubcc4\ub3c4 \uac80\uc99d\uc774 \ud544\uc694\ud569\ub2c8\ub2e4.",
    "readbackMismatch": "\uc800\uc7a5 \ud6c4 \uc694\uccad\ud55c \uce78 \uac12\uc744 \ud655\uc778\ud558\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4. \ub3d9\uc77c\ud55c \uc791\uc5c5\uc744 \ubc18\ubcf5\ud558\uc9c0 \ub9d0\uace0 \ud3b8\uc9d1\ubcf8\uc744 \ud655\uc778\ud574 \uc8fc\uc138\uc694.",
    "failed": "\uc791\uc5c5\uc744 \ub9c8\uce58\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4.",
    "unknown": "\uc800\uc7a5 \uc5ec\ubd80\ub97c \ud655\uc778\ud560 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4. \uac19\uc740 \uc791\uc5c5\uc744 \ub2e4\uc2dc \uc2e4\ud589\ud558\uc9c0 \ub9d0\uace0 \ud3b8\uc9d1\ubcf8\uc744 \ud655\uc778\ud574 \uc8fc\uc138\uc694.",
    "openSaved": "\uc800\uc7a5\ud55c \ud3b8\uc9d1\ubcf8 \uc5f4\uae30",
    "musicSource": "\ucd9c\ucc98",
    "musicCredit": "\uc601\uc0c1\uc744 \uacf5\uc720\ud560 \ub54c \uc774 \ud06c\ub808\ub527\uc744 \ud568\uaed8 \ud45c\uae30\ud558\uc138\uc694. 39.650\u201353.867\ucd08 \ubc1c\ucdcc, \ubcfc\ub968 \u22123.090 dB, \uc18d\ub3c4 \ubcc0\uacbd \uc5c6\uc74c."
  },
  "en": {
    "focusHint": "Automatic face focus can miss faces. Inspect each tile and use the focus sliders when needed; widely separated people may not fit one tile.",
    "title": "Photo Grid Reveal",
    "description": "A 3 \u00d7 7 gallery fills in order, then all tiles switch from monochrome to color. Assign a photo or video to each tile when creating a Draft.",
    "noProject": "Open a project first.",
    "load": "Load project media",
    "changed": "The project or Draft changed. Reload its media.",
    "createMode": "New Draft",
    "slot": "Tile",
    "media": "Photo or video",
    "choose": "Choose media",
    "noMedia": "No photos or videos in this project.",
    "assigned": "Assigned tiles",
    "fill": "Assign all 21 in listed order",
    "fillHint": "When there are 21 photos, they take priority. To reuse an item, choose it for each tile explicitly.",
    "referenceMix": "Assign reference mix",
    "motionMissing": "The reference moves in these tiles, which currently contain still photos: ",
    "focusX": "Horizontal focus",
    "focusY": "Vertical focus",
    "editLimits": "Each of the 21 tiles can be edited in the Selects timeline. Plugin-guided single-tile replacement is not yet available.",
    "music": "Music",
    "noMusic": "No music",
    "bpmManual": "Enter BPM manually",
    "bpm": "BPM",
    "estimate": "Estimate music BPM",
    "estimated": "Estimated BPM",
    "uncertain": "Could not estimate BPM reliably. Enter it manually.",
    "duration": "Video length",
    "durationNote": "Default 14.217 seconds, using the Project frame rate. Music must cover this length.",
    "name": "Draft name",
    "create": "Create Draft",
    "busy": "Working\u2026",
    "missing": "Assign media to exactly 21 tiles.",
    "bpmMissing": "Select music or enter BPM manually.",
    "saved": "Saved. Check actual playback and export separately.",
    "readback": "Saved and read back all 21 tiles. Playback and export still need separate checks.",
    "readbackMismatch": "Saved, but the requested tile values were not verified. Inspect the Draft before repeating this action.",
    "failed": "Could not complete the action.",
    "unknown": "Save outcome is unknown. Inspect the Draft before repeating this action.",
    "openSaved": "Open saved Draft",
    "musicSource": "Source",
    "musicCredit": "Keep this credit with shared videos. Excerpt 39.650\u201353.867 s; gain \u22123.090 dB; no tempo change."
  },
  "de": {
    "title": "Photo Grid Reveal",
    "description": "Ein 3\u00d77-Raster f\u00fcllt sich nacheinander; danach wechseln alle Felder von Schwarzwei\u00df zu Farbe. W\u00e4hlen Sie f\u00fcr jedes Feld ein Foto oder Video.",
    "noProject": "\u00d6ffnen Sie zuerst ein Projekt.",
    "load": "Projektmedien laden",
    "changed": "Projekt oder Entwurf ge\u00e4ndert. Medien erneut laden.",
    "createMode": "Neuer Entwurf",
    "slot": "Feld",
    "media": "Foto oder Video",
    "choose": "Medium w\u00e4hlen",
    "noMedia": "Keine Fotos oder Videos im Projekt.",
    "assigned": "Belegte Felder",
    "fill": "Alle 21 in Listenreihenfolge zuweisen",
    "fillHint": "Bei 21 Fotos werden diese bevorzugt. W\u00e4hlen Sie wiederverwendete Medien ausdr\u00fccklich f\u00fcr jedes Feld.",
    "referenceMix": "Referenzmischung zuweisen",
    "motionMissing": "Diese bewegten Referenzfelder enthalten aktuell Fotos: ",
    "focusX": "Horizontaler Fokus",
    "focusY": "Vertikaler Fokus",
    "editLimits": "Alle 21 Felder sind in der Selects-Timeline editierbar. Einzelne Felder lassen sich noch nicht \u00fcber das Plugin ersetzen.",
    "music": "Musik",
    "noMusic": "Keine Musik",
    "bpmManual": "BPM manuell eingeben",
    "bpm": "BPM",
    "estimate": "Musik-BPM sch\u00e4tzen",
    "estimated": "Gesch\u00e4tzte BPM",
    "uncertain": "BPM nicht zuverl\u00e4ssig ermittelt. Bitte manuell eingeben.",
    "duration": "Videol\u00e4nge",
    "durationNote": "Standard: 14,217 Sekunden bei der Projekt-Bildrate. Die Musik muss diese L\u00e4nge abdecken.",
    "name": "Entwurfsname",
    "create": "Entwurf erstellen",
    "busy": "In Bearbeitung\u2026",
    "missing": "Weisen Sie genau 21 Feldern Medien zu.",
    "bpmMissing": "Musik w\u00e4hlen oder BPM manuell eingeben.",
    "saved": "Gespeichert. Wiedergabe und Export separat pr\u00fcfen.",
    "readback": "Alle 21 Felder gespeichert und erneut gelesen. Wiedergabe und Export separat pr\u00fcfen.",
    "readbackMismatch": "Gespeichert, aber Feldwerte nicht best\u00e4tigt. Vor erneutem Ausf\u00fchren den Entwurf pr\u00fcfen.",
    "failed": "Aktion konnte nicht abgeschlossen werden.",
    "unknown": "Speicherergebnis unbekannt. Vor erneutem Ausf\u00fchren den Entwurf pr\u00fcfen.",
    "openSaved": "Gespeicherten Entwurf \u00f6ffnen",
    "musicSource": "Quelle",
    "musicCredit": "Diesen Hinweis mit geteilten Videos beibehalten. Ausschnitt 39,650\u201353,867 s; Pegel \u22123,090 dB; Tempo unver\u00e4ndert."
  },
  "es": {
    "title": "Photo Grid Reveal",
    "description": "Una cuadr\u00edcula de 3\u00d77 se llena en orden y luego cambia de blanco y negro a color. Asigna una foto o v\u00eddeo a cada celda.",
    "noProject": "Abre primero un proyecto.",
    "load": "Cargar medios del proyecto",
    "changed": "El proyecto o borrador cambi\u00f3. Vuelve a cargar los medios.",
    "createMode": "Nuevo borrador",
    "slot": "Celda",
    "media": "Foto o v\u00eddeo",
    "choose": "Elegir medio",
    "noMedia": "No hay fotos ni v\u00eddeos en este proyecto.",
    "assigned": "Celdas asignadas",
    "fill": "Asignar las 21 en orden de lista",
    "fillHint": "Se priorizan las fotos si hay 21. Para reutilizar un medio, el\u00edgelo expl\u00edcitamente en cada celda.",
    "referenceMix": "Asignar mezcla de referencia",
    "motionMissing": "Estas celdas m\u00f3viles de la referencia contienen fotos: ",
    "focusX": "Enfoque horizontal",
    "focusY": "Enfoque vertical",
    "editLimits": "Las 21 celdas se editan en la l\u00ednea de tiempo de Selects. El plugin a\u00fan no permite sustituir una sola celda.",
    "music": "M\u00fasica",
    "noMusic": "Sin m\u00fasica",
    "bpmManual": "Introducir BPM manualmente",
    "bpm": "BPM",
    "estimate": "Estimar BPM de la m\u00fasica",
    "estimated": "BPM estimados",
    "uncertain": "No se pudo estimar el BPM con fiabilidad. Introd\u00facelo manualmente.",
    "duration": "Duraci\u00f3n del v\u00eddeo",
    "durationNote": "Predeterminado: 14,217 segundos con la tasa de fotogramas del proyecto. La m\u00fasica debe cubrir esta duraci\u00f3n.",
    "name": "Nombre del borrador",
    "create": "Crear borrador",
    "busy": "Procesando\u2026",
    "missing": "Asigna medios a exactamente 21 celdas.",
    "bpmMissing": "Selecciona m\u00fasica o introduce BPM manualmente.",
    "saved": "Guardado. Comprueba reproducci\u00f3n y exportaci\u00f3n por separado.",
    "readback": "Las 21 celdas se guardaron y volvieron a leer. Comprueba reproducci\u00f3n y exportaci\u00f3n por separado.",
    "readbackMismatch": "Guardado, pero los valores no se verificaron. Revisa el borrador antes de repetir.",
    "failed": "No se pudo completar la acci\u00f3n.",
    "unknown": "No se conoce el resultado del guardado. Revisa el borrador antes de repetir.",
    "openSaved": "Abrir borrador guardado",
    "musicSource": "Fuente",
    "musicCredit": "Conserva este cr\u00e9dito al compartir v\u00eddeos. Fragmento 39,650\u201353,867 s; ganancia \u22123,090 dB; sin cambio de tempo."
  },
  "fr": {
    "title": "Photo Grid Reveal",
    "description": "Une grille de 3\u00d77 se remplit dans l\u2019ordre, puis passe du noir et blanc \u00e0 la couleur. Choisissez une photo ou vid\u00e9o par case.",
    "noProject": "Ouvrez d\u2019abord un projet.",
    "load": "Charger les m\u00e9dias du projet",
    "changed": "Le projet ou brouillon a chang\u00e9. Rechargez les m\u00e9dias.",
    "createMode": "Nouveau brouillon",
    "slot": "Case",
    "media": "Photo ou vid\u00e9o",
    "choose": "Choisir un m\u00e9dia",
    "noMedia": "Ce projet ne contient aucune photo ni vid\u00e9o.",
    "assigned": "Cases attribu\u00e9es",
    "fill": "Attribuer les 21 dans l\u2019ordre de la liste",
    "fillHint": "Les 21 photos sont prioritaires si pr\u00e9sentes. Choisissez explicitement chaque r\u00e9utilisation dans sa case.",
    "referenceMix": "Attribuer le m\u00e9lange de r\u00e9f\u00e9rence",
    "motionMissing": "Ces cases anim\u00e9es de la r\u00e9f\u00e9rence contiennent des photos : ",
    "focusX": "Cadrage horizontal",
    "focusY": "Cadrage vertical",
    "editLimits": "Les 21 cases sont modifiables dans la timeline Selects. Le plugin ne remplace pas encore une seule case.",
    "music": "Musique",
    "noMusic": "Sans musique",
    "bpmManual": "Saisir le BPM manuellement",
    "bpm": "BPM",
    "estimate": "Estimer le BPM de la musique",
    "estimated": "BPM estim\u00e9",
    "uncertain": "Estimation du BPM incertaine. Saisissez-le manuellement.",
    "duration": "Dur\u00e9e de la vid\u00e9o",
    "durationNote": "Par d\u00e9faut : 14,217 secondes \u00e0 la fr\u00e9quence du projet. La musique doit couvrir cette dur\u00e9e.",
    "name": "Nom du brouillon",
    "create": "Cr\u00e9er le brouillon",
    "busy": "En cours\u2026",
    "missing": "Attribuez des m\u00e9dias \u00e0 exactement 21 cases.",
    "bpmMissing": "Choisissez une musique ou saisissez le BPM.",
    "saved": "Enregistr\u00e9. V\u00e9rifiez s\u00e9par\u00e9ment la lecture et l\u2019export.",
    "readback": "Les 21 cases sont enregistr\u00e9es et relues. V\u00e9rifiez s\u00e9par\u00e9ment la lecture et l\u2019export.",
    "readbackMismatch": "Enregistr\u00e9, mais les valeurs ne sont pas v\u00e9rifi\u00e9es. Inspectez le brouillon avant de recommencer.",
    "failed": "Impossible de terminer l\u2019action.",
    "unknown": "R\u00e9sultat d\u2019enregistrement inconnu. Inspectez le brouillon avant de recommencer.",
    "openSaved": "Ouvrir le brouillon enregistr\u00e9",
    "musicSource": "Source",
    "musicCredit": "Conservez ce cr\u00e9dit avec les vid\u00e9os partag\u00e9es. Extrait 39,650\u201353,867 s ; gain \u22123,090 dB ; tempo inchang\u00e9."
  },
  "it": {
    "title": "Photo Grid Reveal",
    "description": "Una griglia 3\u00d77 si riempie in ordine, poi passa dal bianco e nero al colore. Assegna una foto o un video a ogni riquadro.",
    "noProject": "Apri prima un progetto.",
    "load": "Carica i media del progetto",
    "changed": "Il progetto o la bozza \u00e8 cambiato. Ricarica i media.",
    "createMode": "Nuova bozza",
    "slot": "Riquadro",
    "media": "Foto o video",
    "choose": "Scegli media",
    "noMedia": "Nessuna foto o video nel progetto.",
    "assigned": "Riquadri assegnati",
    "fill": "Assegna tutti i 21 nell\u2019ordine dell\u2019elenco",
    "fillHint": "Se ci sono 21 foto, hanno priorit\u00e0. Scegli esplicitamente il media in ogni riquadro per riutilizzarlo.",
    "referenceMix": "Assegna combinazione di riferimento",
    "motionMissing": "Questi riquadri animati del riferimento contengono foto: ",
    "focusX": "Fuoco orizzontale",
    "focusY": "Fuoco verticale",
    "editLimits": "Tutti i 21 riquadri sono modificabili nella timeline di Selects. Il plugin non sostituisce ancora un singolo riquadro.",
    "music": "Musica",
    "noMusic": "Nessuna musica",
    "bpmManual": "Inserisci BPM manualmente",
    "bpm": "BPM",
    "estimate": "Stima BPM della musica",
    "estimated": "BPM stimati",
    "uncertain": "Impossibile stimare i BPM in modo affidabile. Inseriscili manualmente.",
    "duration": "Durata del video",
    "durationNote": "Predefinita: 14,217 secondi alla frequenza del progetto. La musica deve coprire questa durata.",
    "name": "Nome della bozza",
    "create": "Crea bozza",
    "busy": "Elaborazione\u2026",
    "missing": "Assegna media a esattamente 21 riquadri.",
    "bpmMissing": "Seleziona musica o inserisci BPM manualmente.",
    "saved": "Salvato. Verifica riproduzione ed esportazione separatamente.",
    "readback": "I 21 riquadri sono salvati e riletti. Verifica riproduzione ed esportazione separatamente.",
    "readbackMismatch": "Salvato, ma i valori non sono verificati. Controlla la bozza prima di ripetere.",
    "failed": "Impossibile completare l\u2019azione.",
    "unknown": "Esito del salvataggio sconosciuto. Controlla la bozza prima di ripetere.",
    "openSaved": "Apri bozza salvata",
    "musicSource": "Fonte",
    "musicCredit": "Mantieni questi crediti nei video condivisi. Estratto 39,650\u201353,867 s; guadagno \u22123,090 dB; tempo invariato."
  },
  "ja": {
    "title": "Photo Grid Reveal",
    "description": "3\u5217\u00d77\u884c\u3092\u9806\u756a\u306b\u8868\u793a\u3057\u3001\u3059\u3079\u3066\u306e\u67a0\u304c\u30e2\u30ce\u30af\u30ed\u304b\u3089\u30ab\u30e9\u30fc\u306b\u5207\u308a\u66ff\u308f\u308a\u307e\u3059\u3002\u5404\u67a0\u306b\u5199\u771f\u307e\u305f\u306f\u52d5\u753b\u3092\u6307\u5b9a\u3057\u307e\u3059\u3002",
    "noProject": "\u5148\u306b\u30d7\u30ed\u30b8\u30a7\u30af\u30c8\u3092\u958b\u3044\u3066\u304f\u3060\u3055\u3044\u3002",
    "load": "\u30d7\u30ed\u30b8\u30a7\u30af\u30c8\u306e\u30e1\u30c7\u30a3\u30a2\u3092\u8aad\u307f\u8fbc\u3080",
    "changed": "\u30d7\u30ed\u30b8\u30a7\u30af\u30c8\u307e\u305f\u306f\u4e0b\u66f8\u304d\u304c\u5909\u308f\u308a\u307e\u3057\u305f\u3002\u518d\u8aad\u307f\u8fbc\u307f\u3057\u3066\u304f\u3060\u3055\u3044\u3002",
    "createMode": "\u65b0\u3057\u3044\u4e0b\u66f8\u304d",
    "slot": "\u67a0",
    "media": "\u5199\u771f\u307e\u305f\u306f\u52d5\u753b",
    "choose": "\u30e1\u30c7\u30a3\u30a2\u3092\u9078\u629e",
    "noMedia": "\u3053\u306e\u30d7\u30ed\u30b8\u30a7\u30af\u30c8\u306b\u5199\u771f\u3084\u52d5\u753b\u306f\u3042\u308a\u307e\u305b\u3093\u3002",
    "assigned": "\u6307\u5b9a\u6e08\u307f\u306e\u67a0",
    "fill": "\u4e00\u89a7\u9806\u306b21\u67a0\u3059\u3079\u3066\u3092\u6307\u5b9a",
    "fillHint": "\u5199\u771f\u304c21\u679a\u3042\u308b\u5834\u5408\u306f\u5199\u771f\u3092\u512a\u5148\u3057\u307e\u3059\u3002\u518d\u5229\u7528\u3059\u308b\u30e1\u30c7\u30a3\u30a2\u306f\u5404\u67a0\u3067\u660e\u793a\u7684\u306b\u9078\u629e\u3057\u3066\u304f\u3060\u3055\u3044\u3002",
    "referenceMix": "\u53c2\u7167\u3068\u540c\u3058\u69cb\u6210\u3092\u6307\u5b9a",
    "motionMissing": "\u53c2\u7167\u3067\u306f\u52d5\u3044\u3066\u3044\u308b\u6b21\u306e\u67a0\u306b\u9759\u6b62\u5199\u771f\u304c\u6307\u5b9a\u3055\u308c\u3066\u3044\u307e\u3059\uff1a",
    "focusX": "\u6a2a\u65b9\u5411\u306e\u7126\u70b9",
    "focusY": "\u7e26\u65b9\u5411\u306e\u7126\u70b9",
    "editLimits": "21\u67a0\u306fSelects\u30bf\u30a4\u30e0\u30e9\u30a4\u30f3\u3067\u500b\u5225\u306b\u7de8\u96c6\u3067\u304d\u307e\u3059\u3002\u30d7\u30e9\u30b0\u30a4\u30f3\u306b\u3088\u308b1\u67a0\u3060\u3051\u306e\u7f6e\u63db\u306f\u672a\u5bfe\u5fdc\u3067\u3059\u3002",
    "music": "\u97f3\u697d",
    "noMusic": "\u97f3\u697d\u306a\u3057",
    "bpmManual": "BPM\u3092\u624b\u52d5\u5165\u529b",
    "bpm": "BPM",
    "estimate": "\u97f3\u697d\u306eBPM\u3092\u63a8\u5b9a",
    "estimated": "\u63a8\u5b9aBPM",
    "uncertain": "BPM\u3092\u78ba\u5b9f\u306b\u63a8\u5b9a\u3067\u304d\u307e\u305b\u3093\u3002\u624b\u52d5\u3067\u5165\u529b\u3057\u3066\u304f\u3060\u3055\u3044\u3002",
    "duration": "\u52d5\u753b\u306e\u9577\u3055",
    "durationNote": "\u521d\u671f\u5024\u306f14.217\u79d2\u3002\u30d7\u30ed\u30b8\u30a7\u30af\u30c8\u306e\u30d5\u30ec\u30fc\u30e0\u30ec\u30fc\u30c8\u3092\u4f7f\u7528\u3057\u307e\u3059\u3002\u97f3\u697d\u306f\u3053\u306e\u9577\u3055\u3092\u6e80\u305f\u3059\u5fc5\u8981\u304c\u3042\u308a\u307e\u3059\u3002",
    "name": "\u4e0b\u66f8\u304d\u540d",
    "create": "\u4e0b\u66f8\u304d\u3092\u4f5c\u6210",
    "busy": "\u51e6\u7406\u4e2d\u2026",
    "missing": "21\u67a0\u3059\u3079\u3066\u306b\u30e1\u30c7\u30a3\u30a2\u3092\u6307\u5b9a\u3057\u3066\u304f\u3060\u3055\u3044\u3002",
    "bpmMissing": "\u97f3\u697d\u3092\u9078\u3076\u304bBPM\u3092\u624b\u52d5\u5165\u529b\u3057\u3066\u304f\u3060\u3055\u3044\u3002",
    "saved": "\u4fdd\u5b58\u3057\u307e\u3057\u305f\u3002\u5b9f\u969b\u306e\u518d\u751f\u3068\u66f8\u304d\u51fa\u3057\u3092\u5225\u9014\u78ba\u8a8d\u3057\u3066\u304f\u3060\u3055\u3044\u3002",
    "readback": "21\u67a0\u3092\u4fdd\u5b58\u3057\u518d\u8aad\u8fbc\u3057\u307e\u3057\u305f\u3002\u518d\u751f\u3068\u66f8\u304d\u51fa\u3057\u306f\u5225\u9014\u78ba\u8a8d\u304c\u5fc5\u8981\u3067\u3059\u3002",
    "readbackMismatch": "\u4fdd\u5b58\u3057\u307e\u3057\u305f\u304c\u67a0\u306e\u5024\u3092\u691c\u8a3c\u3067\u304d\u307e\u305b\u3093\u3067\u3057\u305f\u3002\u518d\u5b9f\u884c\u524d\u306b\u4e0b\u66f8\u304d\u3092\u78ba\u8a8d\u3057\u3066\u304f\u3060\u3055\u3044\u3002",
    "failed": "\u64cd\u4f5c\u3092\u5b8c\u4e86\u3067\u304d\u307e\u305b\u3093\u3067\u3057\u305f\u3002",
    "unknown": "\u4fdd\u5b58\u7d50\u679c\u304c\u4e0d\u660e\u3067\u3059\u3002\u518d\u5b9f\u884c\u524d\u306b\u4e0b\u66f8\u304d\u3092\u78ba\u8a8d\u3057\u3066\u304f\u3060\u3055\u3044\u3002",
    "openSaved": "\u4fdd\u5b58\u3057\u305f\u4e0b\u66f8\u304d\u3092\u958b\u304f",
    "musicSource": "\u51fa\u5178",
    "musicCredit": "\u52d5\u753b\u306e\u5171\u6709\u6642\u306b\u3053\u306e\u30af\u30ec\u30b8\u30c3\u30c8\u3092\u8a18\u8f09\u3057\u3066\u304f\u3060\u3055\u3044\u300239.650\u201353.867\u79d2\u3092\u629c\u7c8b\u3001\u97f3\u91cf \u22123.090 dB\u3001\u901f\u5ea6\u5909\u66f4\u306a\u3057\u3002"
  },
  "pt": {
    "title": "Photo Grid Reveal",
    "description": "Uma grelha 3\u00d77 preenche-se em ordem e muda de preto e branco para cor. Atribua uma foto ou v\u00eddeo a cada c\u00e9lula.",
    "noProject": "Abra primeiro um projeto.",
    "load": "Carregar media do projeto",
    "changed": "O projeto ou rascunho mudou. Recarregue os media.",
    "createMode": "Novo rascunho",
    "slot": "C\u00e9lula",
    "media": "Foto ou v\u00eddeo",
    "choose": "Escolher media",
    "noMedia": "N\u00e3o h\u00e1 fotos nem v\u00eddeos neste projeto.",
    "assigned": "C\u00e9lulas atribu\u00eddas",
    "fill": "Atribuir as 21 pela ordem da lista",
    "fillHint": "Quando h\u00e1 21 fotos, t\u00eam prioridade. Para reutilizar media, escolha-o explicitamente em cada c\u00e9lula.",
    "referenceMix": "Atribuir combina\u00e7\u00e3o da refer\u00eancia",
    "motionMissing": "Estas c\u00e9lulas animadas da refer\u00eancia cont\u00eam fotos: ",
    "focusX": "Foco horizontal",
    "focusY": "Foco vertical",
    "editLimits": "As 21 c\u00e9lulas s\u00e3o edit\u00e1veis na timeline do Selects. O plugin ainda n\u00e3o permite substituir uma s\u00f3 c\u00e9lula.",
    "music": "M\u00fasica",
    "noMusic": "Sem m\u00fasica",
    "bpmManual": "Introduzir BPM manualmente",
    "bpm": "BPM",
    "estimate": "Estimar BPM da m\u00fasica",
    "estimated": "BPM estimados",
    "uncertain": "N\u00e3o foi poss\u00edvel estimar os BPM com confian\u00e7a. Introduza-os manualmente.",
    "duration": "Dura\u00e7\u00e3o do v\u00eddeo",
    "durationNote": "Predefini\u00e7\u00e3o: 14,217 segundos \u00e0 taxa de fotogramas do projeto. A m\u00fasica deve cobrir esta dura\u00e7\u00e3o.",
    "name": "Nome do rascunho",
    "create": "Criar rascunho",
    "busy": "A processar\u2026",
    "missing": "Atribua media a exatamente 21 c\u00e9lulas.",
    "bpmMissing": "Selecione m\u00fasica ou introduza BPM manualmente.",
    "saved": "Guardado. Verifique reprodu\u00e7\u00e3o e exporta\u00e7\u00e3o separadamente.",
    "readback": "As 21 c\u00e9lulas foram guardadas e relidas. Verifique reprodu\u00e7\u00e3o e exporta\u00e7\u00e3o separadamente.",
    "readbackMismatch": "Guardado, mas os valores n\u00e3o foram verificados. Inspecione o rascunho antes de repetir.",
    "failed": "N\u00e3o foi poss\u00edvel concluir a a\u00e7\u00e3o.",
    "unknown": "Resultado da grava\u00e7\u00e3o desconhecido. Inspecione o rascunho antes de repetir.",
    "openSaved": "Abrir rascunho guardado",
    "musicSource": "Fonte",
    "musicCredit": "Mantenha este cr\u00e9dito nos v\u00eddeos partilhados. Excerto 39,650\u201353,867 s; ganho \u22123,090 dB; sem altera\u00e7\u00e3o de tempo."
  },
  "tr": {
    "title": "Photo Grid Reveal",
    "description": "3\u00d77 \u0131zgara s\u0131rayla dolar, sonra t\u00fcm kutular siyah beyazdan renge ge\u00e7er. Her kutuya foto\u011fraf veya video atay\u0131n.",
    "noProject": "\u00d6nce bir proje a\u00e7\u0131n.",
    "load": "Proje medyas\u0131n\u0131 y\u00fckle",
    "changed": "Proje veya taslak de\u011fi\u015fti. Medyay\u0131 yeniden y\u00fckleyin.",
    "createMode": "Yeni taslak",
    "slot": "Kutu",
    "media": "Foto\u011fraf veya video",
    "choose": "Medya se\u00e7",
    "noMedia": "Bu projede foto\u011fraf veya video yok.",
    "assigned": "Atanan kutular",
    "fill": "21 kutuyu liste s\u0131ras\u0131yla ata",
    "fillHint": "21 foto\u011fraf varsa \u00f6nceliklidir. Yeniden kullan\u0131m i\u00e7in medyay\u0131 her kutuda a\u00e7\u0131k\u00e7a se\u00e7in.",
    "referenceMix": "Referans kar\u0131\u015f\u0131m\u0131n\u0131 ata",
    "motionMissing": "Referansta hareketli olan bu kutularda foto\u011fraf var: ",
    "focusX": "Yatay odak",
    "focusY": "Dikey odak",
    "editLimits": "21 kutu Selects zaman \u00e7izelgesinde d\u00fczenlenebilir. Eklenti hen\u00fcz tek kutu de\u011fi\u015ftirmeyi desteklemiyor.",
    "music": "M\u00fczik",
    "noMusic": "M\u00fczik yok",
    "bpmManual": "BPM de\u011ferini elle gir",
    "bpm": "BPM",
    "estimate": "M\u00fczik BPM de\u011ferini tahmin et",
    "estimated": "Tahmini BPM",
    "uncertain": "BPM g\u00fcvenilir \u015fekilde tahmin edilemedi. Elle girin.",
    "duration": "Video uzunlu\u011fu",
    "durationNote": "Varsay\u0131lan: proje kare h\u0131z\u0131nda 14,217 saniye. M\u00fczik bu uzunlu\u011fu kar\u015f\u0131lamal\u0131d\u0131r.",
    "name": "Taslak ad\u0131",
    "create": "Taslak olu\u015ftur",
    "busy": "\u0130\u015fleniyor\u2026",
    "missing": "Tam olarak 21 kutuya medya atay\u0131n.",
    "bpmMissing": "M\u00fczik se\u00e7in veya BPM de\u011ferini elle girin.",
    "saved": "Kaydedildi. Oynatma ve d\u0131\u015fa aktarmay\u0131 ayr\u0131ca kontrol edin.",
    "readback": "21 kutu kaydedildi ve yeniden okundu. Oynatma ve d\u0131\u015fa aktarmay\u0131 ayr\u0131ca kontrol edin.",
    "readbackMismatch": "Kaydedildi, ancak kutu de\u011ferleri do\u011frulanmad\u0131. Tekrarlamadan \u00f6nce tasla\u011f\u0131 inceleyin.",
    "failed": "\u0130\u015flem tamamlanamad\u0131.",
    "unknown": "Kay\u0131t sonucu bilinmiyor. Tekrarlamadan \u00f6nce tasla\u011f\u0131 inceleyin.",
    "openSaved": "Kaydedilen tasla\u011f\u0131 a\u00e7",
    "musicSource": "Kaynak",
    "musicCredit": "Payla\u015f\u0131lan videolarda bu bilgiyi koruyun. 39,650\u201353,867 s kesit; kazan\u00e7 \u22123,090 dB; tempo de\u011fi\u015fmedi."
  },
  "zh": {
    "title": "Photo Grid Reveal",
    "description": "3\u5217\u00d77\u884c\u4f9d\u6b21\u663e\u793a\uff0c\u968f\u540e\u6240\u6709\u683c\u5b50\u4ece\u9ed1\u767d\u5207\u6362\u5230\u5f69\u8272\u3002\u4e3a\u6bcf\u4e2a\u683c\u5b50\u6307\u5b9a\u7167\u7247\u6216\u89c6\u9891\u3002",
    "noProject": "\u8bf7\u5148\u6253\u5f00\u9879\u76ee\u3002",
    "load": "\u52a0\u8f7d\u9879\u76ee\u5a92\u4f53",
    "changed": "\u9879\u76ee\u6216\u8349\u7a3f\u5df2\u66f4\u6539\u3002\u8bf7\u91cd\u65b0\u52a0\u8f7d\u5a92\u4f53\u3002",
    "createMode": "\u65b0\u5efa\u8349\u7a3f",
    "slot": "\u683c\u5b50",
    "media": "\u7167\u7247\u6216\u89c6\u9891",
    "choose": "\u9009\u62e9\u5a92\u4f53",
    "noMedia": "\u6b64\u9879\u76ee\u6ca1\u6709\u7167\u7247\u6216\u89c6\u9891\u3002",
    "assigned": "\u5df2\u6307\u5b9a\u683c\u5b50",
    "fill": "\u6309\u5217\u8868\u987a\u5e8f\u6307\u5b9a\u5168\u90e821\u683c",
    "fillHint": "\u670921\u5f20\u7167\u7247\u65f6\u4f18\u5148\u4f7f\u7528\u7167\u7247\u3002\u91cd\u590d\u4f7f\u7528\u5a92\u4f53\u65f6\uff0c\u8bf7\u5728\u5404\u683c\u4e2d\u660e\u786e\u9009\u62e9\u3002",
    "referenceMix": "\u6307\u5b9a\u53c2\u8003\u6df7\u5408\u5e03\u5c40",
    "motionMissing": "\u53c2\u8003\u89c6\u9891\u4e2d\u4ee5\u4e0b\u683c\u5b50\u6709\u8fd0\u52a8\uff0c\u76ee\u524d\u5374\u662f\u7167\u7247\uff1a",
    "focusX": "\u6c34\u5e73\u7126\u70b9",
    "focusY": "\u5782\u76f4\u7126\u70b9",
    "editLimits": "21\u4e2a\u683c\u5b50\u90fd\u53ef\u5728Selects\u65f6\u95f4\u7ebf\u4e0a\u72ec\u7acb\u7f16\u8f91\u3002\u63d2\u4ef6\u6682\u4e0d\u652f\u6301\u5355\u683c\u66ff\u6362\u3002",
    "music": "\u97f3\u4e50",
    "noMusic": "\u65e0\u97f3\u4e50",
    "bpmManual": "\u624b\u52a8\u8f93\u5165BPM",
    "bpm": "BPM",
    "estimate": "\u4f30\u8ba1\u97f3\u4e50BPM",
    "estimated": "\u4f30\u8ba1BPM",
    "uncertain": "\u65e0\u6cd5\u53ef\u9760\u5730\u4f30\u8ba1BPM\u3002\u8bf7\u624b\u52a8\u8f93\u5165\u3002",
    "duration": "\u89c6\u9891\u957f\u5ea6",
    "durationNote": "\u9ed8\u8ba414.217\u79d2\uff0c\u4f7f\u7528\u9879\u76ee\u5e27\u7387\u3002\u97f3\u4e50\u987b\u8986\u76d6\u6574\u4e2a\u65f6\u957f\u3002",
    "name": "\u8349\u7a3f\u540d\u79f0",
    "create": "\u521b\u5efa\u8349\u7a3f",
    "busy": "\u5904\u7406\u4e2d\u2026",
    "missing": "\u8bf7\u4e3a\u5168\u90e821\u4e2a\u683c\u5b50\u6307\u5b9a\u5a92\u4f53\u3002",
    "bpmMissing": "\u8bf7\u9009\u62e9\u97f3\u4e50\u6216\u624b\u52a8\u8f93\u5165BPM\u3002",
    "saved": "\u5df2\u4fdd\u5b58\u3002\u8bf7\u5206\u522b\u68c0\u67e5\u5b9e\u9645\u64ad\u653e\u548c\u5bfc\u51fa\u3002",
    "readback": "\u5df2\u4fdd\u5b58\u5e76\u91cd\u65b0\u8bfb\u53d6\u5168\u90e821\u683c\u3002\u64ad\u653e\u548c\u5bfc\u51fa\u4ecd\u9700\u5355\u72ec\u9a8c\u8bc1\u3002",
    "readbackMismatch": "\u5df2\u4fdd\u5b58\uff0c\u4f46\u672a\u80fd\u9a8c\u8bc1\u683c\u5b50\u6570\u636e\u3002\u91cd\u8bd5\u524d\u8bf7\u68c0\u67e5\u8349\u7a3f\u3002",
    "failed": "\u65e0\u6cd5\u5b8c\u6210\u64cd\u4f5c\u3002",
    "unknown": "\u4fdd\u5b58\u7ed3\u679c\u672a\u77e5\u3002\u91cd\u8bd5\u524d\u8bf7\u68c0\u67e5\u8349\u7a3f\u3002",
    "openSaved": "\u6253\u5f00\u5df2\u4fdd\u5b58\u8349\u7a3f",
    "musicSource": "\u6765\u6e90",
    "musicCredit": "\u5206\u4eab\u89c6\u9891\u65f6\u8bf7\u4fdd\u7559\u6b64\u7f72\u540d\u3002\u622a\u53d639.650\u201353.867\u79d2\uff0c\u589e\u76ca\u22123.090 dB\uff0c\u672a\u6539\u53d8\u901f\u5ea6\u3002"
  }
};

// The packaged excerpt is pinned to this template release. Existing Drafts keep
// their old content paths; installation paths are never newly registered.
const GALLERY_MUSIC={bytes:457308,sha256:'70146fa3ee1829efc1fff40ffe93f4a6a40394bca094d9b69877756432d8b8f0',seconds:853/60};
async function prepareBundledMusic(sdk, t, { projectId, durationFrames, fps: knownFps, isCurrent, onImportStarted }) {
  if(typeof sdk?.runScript!=='function'){
    const message='Update Selects to prepare bundled music.';
    throw Object.assign(new Error(message),{publicMessage:message,safeNotSaved:true});
  }
  let importStarted=false;
  try {
    if(!Number.isSafeInteger(durationFrames)||durationFrames<1||durationFrames>36000)throw templateIssue('Music length must be an integer from 1 to 36000 frames.');
    if(!isCurrent())throw templateIssue(t.changed);
    const fps=knownFps??await readImageDraftFps(sdk,projectId),{minimumSeconds}=galleryFrameClock(durationFrames,fps);
    if(!isCurrent())throw templateIssue(t.changed);
    if(minimumSeconds<=0)throw templateIssue('The requested duration is shorter than one frame on the Project frame grid.');
    if(minimumSeconds>GALLERY_MUSIC.seconds+1e-9)throw templateIssue('Bundled music is too short for this result on the Project frame grid. Choose No music, another track or a shorter duration.');
    const {plugin}=await hostRoots(sdk,'photo-gallery-no2','SKILL.md'),client=panelLocalClient(sdk);
    const observe={runScript:async request=>{
      if(request.allowCommit){await onImportStarted();if(!isCurrent())throw templateIssue(t.changed);importStarted=true;}
      return sdk.runScript(request);
    }};
    const music=await prepareBundledAsset(observe,client.files,{projectId,pluginId:'photo-gallery-no2',sourcePath:hostJoin(plugin,'assets','music.mp3'),type:'Audio',extension:'mp3',expectedBytes:GALLERY_MUSIC.bytes,expectedSha256:GALLERY_MUSIC.sha256,minimumSeconds,platform:client.environment.platform,normalizeUnicode:true,label:'music',isCurrent});
    return {...music,durationFrames:Math.round(music.durationSeconds*60),startFrame:0};
  }catch(error){
    if(error?.code==='not-found')throw templateIssue('Bundled music could not be located. Reinstall Photo Grid Reveal.');
    if(error&&typeof error==='object')error.safeNotSaved=!importStarted;throw error;
  }
}

function requireGalleryAuthoringHost(sdk) {
  if(typeof sdk?.runScript!=='function'){
    const message='Update Selects to create a complete Photo Grid Reveal Draft.';
    throw Object.assign(new Error(message),{safeNotSaved:true,publicMessage:message});
  }
}

async function verifyGalleryInputs(sdk, t, input, isCurrent) {
  requireGalleryAuthoringHost(sdk);
  const stopped = () => Object.assign(new Error(t.changed), { contextChanged: true, safeNotSaved: true });
  if (!isCurrent()) throw stopped();
  const reply = await sdk.runScript({ script: buildScript({ ...input, operation: 'verifyInputs' }), summary: 'Verify Gallery original inputs', allowCommit: false });
  if (!isCurrent()) throw stopped();
  if (reply.isError || reply.result?.status !== 'inputsReady' || !Array.isArray(reply.result.media) || reply.result.media.length !== 21) {
    const result = reply.result, error = Object.assign(new Error(result?.message || reply.output || t.failed), { safeNotSaved: true });
    if (/^source-file-/.test(result?.code??'')) error.publicMessage=result.message;
    else if (['image-source-missing', 'image-source-unreadable', 'image-source-unknown', 'image-source-changed'].includes(result?.code)) error.publicMessage = result.message + '. Check the original file in the Project, then try again.';
    throw error;
  }
  return { ...input, media: reply.result.media.map((row,i)=>({...row,manualFocus:input.media[i].manualFocus===true})), music: reply.result.music };
}

// Only original still Images are analyzed here. Video motion needs its own source-window contract.
async function galleryFaceScript(sdk,script,summary,allowCommit=false) {
  const response=await sdk.runScript({script,summary,allowCommit});
  if(response?.isError||response?.result==null)throw Error(response?.output||'Face analysis could not be read.');
  return response.result;
}
async function focusGalleryPhotos(sdk,input,isCurrent=()=>true) {
  const current=()=>{if(!isCurrent())throw Object.assign(Error('Gallery context changed during face analysis.'),{contextChanged:true,safeNotSaved:true});};
  current();
  const diagnostics=[],faceFingerprints=[],media=input.media.map(item=>({...item}));
  const candidates=media.filter(item=>item.kind==='image'&&!item.manualFocus&&item.focusX===0.5&&item.focusY===0.5);
  if(!candidates.length)return {...input,media,faceFocus:diagnostics,faceFingerprints};
  let capability;
  try{capability=await galleryFaceScript(sdk,"return {supported:selects.ai?.imageSourceSupported===true&&typeof selects.ai?.submit==='function'};",'Check original-photo face analysis');}catch{}
  current();
  if(!capability?.supported||!sdk.storage?.getItem||!sdk.storage?.setItem)return {...input,media,faceFocus:[{status:'unavailable',reason:'host-support'}],faceFingerprints};
  const aliases=await sharedAiResources.resolveSharedAiResources(sdk,input.projectId,candidates.map(item=>item.resourceId));current();
  const storageKey='photo-gallery-no2:face-focus-v1:'+input.projectId,scope='photo-gallery-no2:face-focus-v1';
  const jobs=sharedAiJobs.createSharedAiJobClient({projectId:input.projectId,scope,
    runScript:(code,summary,write)=>{current();return galleryFaceScript(sdk,code,summary,write)},
    load:async()=>{const value=await sdk.storage.getItem(storageKey);return value==null?null:JSON.parse(value)},
    save:journal=>sdk.storage.setItem(storageKey,JSON.stringify(journal)),maxWaitMs:120000,readTimeoutMs:10000,pollMs:500});
  const observations=new Map(),failures=new Map(),deadline=Date.now()+120000;
  for(let index=0;index<media.length;index++){
    const item=media[index];
    if(item.kind!=='image'||item.manualFocus||item.focusX!==0.5||item.focusY!==0.5)continue;
    current();const rawId=aliases.get(item.resourceId);
    if(Date.now()>=deadline){diagnostics.push({slot:index+1,resourceId:rawId,status:'unavailable',reason:'observation-budget'});continue;}
    const fingerprint=await galleryFaceScript(sdk,'return await ('+fingerprintTemplateFile.toString()+')(selects.files,'+JSON.stringify(item.path)+');','Verify original-photo analysis bytes');current();
    if(!fingerprint)throw Object.assign(Error('The original photo is missing.'),{safeNotSaved:true});
    faceFingerprints.push({path:item.path,...fingerprint});
    const identity=JSON.stringify({resourceId:rawId,path:item.path,...fingerprint,width:item.width,height:item.height});
    let observed=observations.get(identity),workflowId;
    if(failures.has(identity)){diagnostics.push({slot:index+1,resourceId:rawId,...failures.get(identity)});continue;}
    if(!observed){
      try{
        const result=await jobs.run({task:'faces.detect',resourceId:rawId,options:{provider:'cpu',scoreThreshold:0.8}},{identity,maxWaitMs:Math.max(1,deadline-Date.now())});current();
        workflowId=result.workflowId;const artifact=result.result?.files?.detections;
        if(!artifact)throw Error('Photo face analysis returned no coordinates.');
        observed=await galleryFaceScript(sdk,`return await selects.ai.readJSON(${JSON.stringify(artifact)},${JSON.stringify(input.projectId)});`,'Read original-photo face coordinates');current();
        if(observed?.contractVersion!==1||observed.task!=='faces.detect'||observed.sourceKind!=='image'||observed.samples?.length!==1||observed.samples[0]?.sourceTimeSeconds!==0)throw Error('Original-photo face coordinates do not match the Image contract.');
      }catch(error){
        current();const failure={status:'unavailable',reason:error.code||'face-analysis',message:String(error.message||error).slice(0,160)};
        failures.set(identity,failure);diagnostics.push({slot:index+1,resourceId:rawId,...failure});continue;
      }
      const after=await galleryFaceScript(sdk,'return await ('+fingerprintTemplateFile.toString()+')(selects.files,'+JSON.stringify(item.path)+');','Verify original-photo analysis bytes');current();
      if(JSON.stringify(after)!==JSON.stringify(fingerprint))throw Object.assign(Error('Original photo changed during face analysis.'),{safeNotSaved:true});
      observations.set(identity,observed);
    }
    const row=Math.floor(index/3),height=Math.round((row+1)*1920/7)-Math.round(row*1920/7)-4;
    const focus=galleryFaceFocus(item,{width:356,height},observed);
    diagnostics.push({slot:index+1,resourceId:rawId,...workflowId?{workflowId}:{},...focus});
    if(focus.status==='focused')Object.assign(item,{focusX:focus.focusX,focusY:focus.focusY});
  }
  current();return {...input,media,faceFocus:diagnostics,faceFingerprints};
}

async function prepareVisuals(sdk, t, media, clock, projectId, onImportStarted, isCurrent) {
  const frames = clock.durationFrames;
  const videos = [...new Map(media.filter(item => item.kind === 'video').map(item => [item.resourceId, item])).values()];
  const shortVideos = videos.filter(item => gallerySourceSeconds(item, 'Video') + 1e-9 < clock.minimumSeconds);
  if(!shortVideos.length)return media;
  const client=panelLocalClient(sdk);
  const groups = [{ sources: shortVideos, key: 'videos' }];
  const requestPaths = [];
  for (const group of groups) {
    if (!group.sources.length) continue;
    if (group.sources.some(item => !item.path)) throw new Error('Selected Project media has no readable file path.');
    if (!isCurrent()) throw new Error(t.changed);
    const request = { [group.key]: group.sources.map(item => ({ path: item.path })), durationFrames: frames };
    preparing.say?.('Extending short videos…');
    let converted;
    try { converted = await holdVideos(request, (await hostRoots(sdk, 'photo-gallery-no2', 'SKILL.md')).data, {isCurrent,client}); }
    catch (error) { if(error?.publicMessage)throw error;throw new Error(String(error?.message || error) || 'Media conversion failed.'); }
    const output = converted[group.key];
    if (converted.status !== 'converted' || output?.length !== group.sources.length) {
      throw new Error(converted.message || 'Media conversion failed.');
    }
    if (converted.fps !== 60 || converted.durationFrames !== frames || output.some((item, i) =>
      item.inputIndex !== i || item.sourcePath !== group.sources[i].path || typeof item.outputPath !== 'string')) {
      throw new Error('Media conversion result does not match the requested inputs.');
    }
    requestPaths.push(...group.sources.map((source, i) => ({ sourceResourceId: source.resourceId,
      sourcePath: source.path, path: output[i].outputPath })));
  }
  if (!requestPaths.length) return media;
  if (!isCurrent()) throw new Error(t.changed);
  const prepared = [];
  // Keep reusable media imports small; they are separate from complete Draft authoring.
  for (let start = 0; start < requestPaths.length; start += 3) {
    if (!isCurrent()) throw new Error(t.changed);
    const chunk = requestPaths.slice(start, start + 3);
    await onImportStarted();
    if (!isCurrent()) throw Object.assign(new Error(t.changed), { contextChanged: true, safeNotSaved: true });
    const imported = await sdk.runScript({ script: buildScript({ operation: 'importConverted', projectId,
      converted: chunk, durationFrames: frames }), summary: 'Import independent Photo Gallery tile videos', allowCommit: true });
    if (imported.isError || imported.result?.status === 'outcomeUnknown' || !imported.result) throw new Error(t.unknown);
    if (imported.result.status === 'notSaved') {
      throw Object.assign(new Error(imported.result.message || 'Converted videos were not imported.'), { safeNotSaved: true });
    }
    if (imported.result.status !== 'prepared' || imported.result.converted?.length !== chunk.length) {
      throw new Error(imported.result.message || 'Converted videos could not be verified in the Project.');
    }
    prepared.push(...imported.result.converted);
  }
  const bySource = new Map(prepared.map(item => [item.sourceResourceId, item]));
  if (bySource.size !== requestPaths.length || requestPaths.some(item => !bySource.get(item.sourceResourceId)?.resourceId)) {
    throw new Error('Converted Project resources do not match the selected media.');
  }
  return media.map(item => bySource.has(item.resourceId)
    ? { ...bySource.get(item.resourceId), kind: 'video', focusX: item.focusX, focusY: item.focusY }
    : item);
}

// Builds the Draft once its inputs are settled (21 tiles, music, BPM), shared by
// the Panel and a template run. `isCurrent` says the run still belongs to its
// Project; `onDispatched` marks possible Draft persistence, while imports have
// their own observer. `onDraft` gets the complete saved identity. `libraryId`
// is a template run's library. A stale context stops before Draft dispatch.
async function planGalleryPreparation(sdk,input,isCurrent,pendingBpm=false,fitBundledDefault=false) {
  const stopped=()=>Object.assign(new Error('The Gallery context changed before preparation.'),{contextChanged:true,safeNotSaved:true});
  if(!isCurrent())throw stopped();
  input.fps=await readImageDraftFps(sdk,input.projectId);
  if(!isCurrent())throw stopped();
  // Only an untouched bundled default may end on the last complete frame
  // inside the pinned excerpt. Explicit lengths retain the strict music guard.
  if(fitBundledDefault&&input.durationFrames===853){
    while(input.durationFrames>1&&galleryFrameClock(input.durationFrames,input.fps).minimumSeconds>GALLERY_MUSIC.seconds+1e-9)input.durationFrames--;
  }
  try{return planGallery(input,{preparing:true,pendingBpm});}
  catch(error){error.safeNotSaved=true;throw error;}
}

async function buildGalleryDraft(sdk,t,{input,isCurrent,onDispatched,onDraft,libraryId=null,runReceipt=null,onImportStarted=()=>{}}) {
  Object.assign(input,await verifyGalleryInputs(sdk,t,input,isCurrent));
  const plan=await planGalleryPreparation(sdk,input,isCurrent);
  input.media=await prepareVisuals(sdk,t,input.media,plan.preparation,input.projectId,onImportStarted,isCurrent);
  if(!isCurrent())throw Object.assign(new Error(t.changed),{contextChanged:true,safeNotSaved:true});
  input.media=(await galleryNativeResources(sdk,input.projectId,input.media,libraryId)).selected;
  const preflight=await sdk.runScript({script:buildScript({...input,operation:'preflight'}),summary:'Check Photo Gallery media and timing',allowCommit:false});
  if(preflight.isError||preflight.result?.status!=='ready')throw Object.assign(new Error(preflight.result?.message||preflight.output||t.failed),{safeNotSaved:true});
  await onDispatched();
  if(!isCurrent())throw Object.assign(new Error(t.changed),{contextChanged:true,safeNotSaved:true});
  const response=await sdk.runScript({script:buildScript({...input,operation:'create',...runReceipt?{runReceipt}:{}}),summary:'Create complete Photo Gallery Draft',allowCommit:true,timeoutSeconds:120});
  if(typeof response.result?.draftId==='string'&&response.result.draftId)await onDraft(response.result.draftId);
  if(response.isError||response.result?.status!=='saved'||!response.result.draftId){
    const result=response.result;throw Object.assign(new Error(result?.message||response.output||t.unknown),{safeNotSaved:result?.status==='notSaved',draftId:result?.draftId??null});
  }
  const result=response.result;
  await verifyGallerySavedDraft(sdk,input.projectId,result);
  return {...result,verified:true,readReturned:true};
}

// Independent post-save source reads use separate invocations so the original
// Project cache cannot masquerade as fresh facts. Keep saved identity on failure.
async function verifyGallerySavedDraft(sdk,projectId,result){
 const unverified=cause=>Object.assign(Error('The Gallery was saved, but its sources could not be confirmed. Inspect the saved Draft before retrying.'),{code:'IMAGE_SAVE_UNVERIFIED',draftId:result?.draftId,cause});
 try{
  await verifyAtomicImageDraft(sdk,projectId,result);
  let sourceGuard=result.sourceGuard;
  if(!sourceGuard)throw Error('Saved Gallery source evidence is unavailable.');
  if(sourceGuard.version===2){
   const files=panelLocalClient(sdk).files,before=await files.stat(sourceGuard.path);
   if(!before||before.isDirectory!==false||before.size!==sourceGuard.size||before.size<1||before.size>8388608)throw Error('Saved Gallery source evidence is unavailable.');
   const bytes=await files.readRange(sourceGuard.path,0,before.size),after=await files.stat(sourceGuard.path);
   if(Object.prototype.toString.call(bytes)!=='[object Uint8Array]'||bytes.byteLength!==before.size||!after||['size','mtimeMs','ino'].some(key=>before[key]!==after[key]))throw Error('Saved Gallery source evidence changed.');
   const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),n=>n.toString(16).padStart(2,'0')).join('');
   if(digest!==sourceGuard.sha256)throw Error('Saved Gallery source evidence changed.');
   sourceGuard=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
  }
  for(const operation of ['verifySourceFiles','verifySourceMetadata']){
   const response=await sdk.runScript({summary:'Verify saved Gallery original sources',allowCommit:false,script:buildScript({operation,projectId,sourceGuard})});
   if(response.isError||response.result?.status!=='verified')throw Error('Saved Gallery sources changed or could not be read.');
  }
 }catch(cause){throw unverified(cause);}
 return result;
}

// A template run gets its own component, so it never touches the Panel's state.
function Panel(props) {
  hostUseSdk(props.sdk);
  return props.context?.template ? <GalleryTemplateRun {...props}/> : <GalleryPanel {...props}/>;
}

function GalleryPanel({ sdk, context, ui }) {
  useAppUpdateGuard(sdk, context?.language, () => !!(busy || running.current));
  const t = STRINGS[context.language] || STRINGS.en;
  const [inventory, setInventory] = React.useState(null);
  const [loadedKey, setLoadedKey] = React.useState('');
  const [slots, setSlots] = React.useState(emptySlots);
  const [selectedSlot, setSelectedSlot] = React.useState('0');
  const [musicChoice, setMusicChoice] = React.useState('bundled');
  const [manualEnabled, setManualEnabled] = React.useState(true);
  const [manualBpm, setManualBpm] = React.useState(113);
  const [estimated, setEstimated] = React.useState(null);
  const [durationFrames, setDurationFrames] = React.useState(853);
  const durationEdited = React.useRef(false);
  const [name, setName] = React.useState('Photo Grid Reveal');
  const [busy, setBusy] = React.useState(false);
  const [unknown, setUnknown] = React.useState(false);
  const [status, setStatus] = React.useState(null);
  const [savedTarget, setSavedTarget] = React.useState(null);
  const [resourceRevision, setResourceRevision] = React.useState(0);
  const resourceScope = React.useRef(null), inventoryState = React.useRef(null);
  const running = React.useRef(false);
  const alive = React.useRef(true);
  const musicScope = React.useRef(null);
  React.useEffect(()=>()=>{musicScope.current?.abort();},[context.projectId,context.sequenceId]);
  const current = React.useRef({ projectId: context.projectId, sequenceId: context.sequenceId });
  React.useEffect(() => {
    alive.current = true;
    const say = text => setStatus({ tone: 'muted', text });
    preparing.say = say;
    return () => { alive.current = false;if (preparing.say === say) preparing.say = null; };
  }, []);
  current.current = { projectId: context.projectId, sequenceId: context.sequenceId };
  const key = JSON.stringify([context.projectId, context.sequenceId]);
  const ready = loadedKey === key && !!inventory;
  const slotIndex = Number(selectedSlot);
  const slot = slots[slotIndex];
  const selectedMusic = inventory?.audio?.find(item => item.resourceId === musicChoice);
  const assigned = slots.filter(item => !!item.resourceId).length;
  const photos = inventory?.media?.filter(item => item.kind === 'image') || [];
  const videos = inventory?.media?.filter(item => item.kind === 'video') || [];
  const autoFillMedia = photos.length === 21 ? photos : inventory?.media?.length === 21 ? inventory.media : null;
  const canAssignReferenceMix = inventory?.media?.length === 21 && photos.length === 15 && videos.length === 6;
  const missingMotion = assigned === 21 ? [...REFERENCE_VIDEO_SLOTS].filter(number =>
    inventory.media.find(item => item.resourceId === slots[number - 1].resourceId)?.kind !== 'video') : [];
  const sameContext = (projectId, sequenceId) => alive.current && current.current.projectId === projectId && current.current.sequenceId === sequenceId;
  inventoryState.current = { inventory, slots, musicChoice, key, ready };

  React.useEffect(() => {
    // The host opens this new Draft during Create. Retain its frozen inputs
    // and target so completion or a partial-save warning stays actionable.
    if (running.current && inventory?.projectId === context.projectId) {
      setLoadedKey(key);
      return;
    }
    setInventory(null); setLoadedKey(''); setSlots(emptySlots()); setMusicChoice('bundled');
    setManualEnabled(true); setManualBpm(113);
    setEstimated(null); setUnknown(false); setSavedTarget(null); setStatus(null);
  }, [context.projectId, context.sequenceId]);

  React.useEffect(() => {
    const scope = { projectId: context.projectId, pending: false, active: false, closed: false, revision: 0 };
    resourceScope.current = scope;
    const unsubscribe = scope.projectId && typeof sdk.on === 'function' ? sdk.on('resourcesChanged', event => {
      if (event?.projectId !== scope.projectId || scope.closed || !(event.added?.length || event.removed?.length)) return;
      scope.pending = true; scope.revision++; setResourceRevision(value => value + 1);
    }) : null;
    return () => { scope.closed = true; unsubscribe?.(); if (resourceScope.current === scope) resourceScope.current = null; };
  }, [sdk, context.projectId]);

  React.useEffect(() => {
    const scope = resourceScope.current;
    // Imports made by an in-progress Create must not change its frozen inputs
    // or its save verification. Coalesce them until that operation settles.
    if (!scope || scope.closed || !scope.pending || scope.active || running.current || busy || !ready) return;
    scope.pending = false; scope.active = true;
    const projectId = context.projectId, sequenceId = context.sequenceId, requestedKey = key, revision = scope.revision;
    const live = () => !scope.closed && resourceScope.current === scope && sameContext(projectId, sequenceId);
    (async () => {
      try {
        const next = await readInventory(projectId, () => live() && scope.revision === revision && !running.current);
        if (!live()) return;
        if (scope.revision !== revision || running.current || inventoryState.current.key !== requestedKey) { scope.pending = true; return; }
        const before = inventoryState.current;
        const sameSource = (old, fresh) => old && fresh && old.path === fresh.path && old.kind === fresh.kind;
        const changed = before.slots.some(slot => slot.resourceId && !sameSource(before.inventory.media.find(row => row.resourceId === slot.resourceId), next.media.find(row => row.resourceId === slot.resourceId)));
        const selectedAudio = !['bundled', 'none'].includes(before.musicChoice);
        const oldAudio = before.inventory.audio.find(row => row.resourceId === before.musicChoice), newAudio = next.audio.find(row => row.resourceId === before.musicChoice);
        if (changed || selectedAudio && (!oldAudio || !newAudio || oldAudio.path !== newAudio.path)) {
          // Preserve the choice for inspection; never retarget a tile or drop
          // its selected music silently when aliases or membership changed.
          setLoadedKey(''); setStatus({ tone: 'error', text: t.changed }); return;
        }
        setInventory(next);
      } catch (error) {
        if (live() && !running.current) setStatus({ tone: 'error', text: t.failed + ' ' + String(error?.message || error) });
      } finally {
        scope.active = false;
        if (!scope.closed && resourceScope.current === scope && scope.pending) setResourceRevision(value => value + 1);
      }
    })();
  }, [sdk, resourceRevision, busy, ready, key]);

  function updateSlot(patch) {
    if ('focusX' in patch || 'focusY' in patch) patch={...patch,manualFocus:true};
    setSlots(previous => previous.map((item, i) => i === slotIndex ? { ...item, ...patch } : item));
  }

  function deferActiveRefresh() {
    const scope = resourceScope.current;
    if (scope?.active) { scope.pending = true; scope.revision++; }
  }

  async function readInventory(projectId, isCurrent = () => true) {
    const input = { operation: 'inspect', projectId };
    const response = await readMediaPages(sdk, { script: buildScript(input), summary: 'Inspect Photo Gallery project', allowCommit: false });
    if (!isCurrent()) return null;
    if (response.isError || response.result?.status !== 'inspected' || !Array.isArray(response.result.media) || !Array.isArray(response.result.audio)) throw new Error(response.result?.message || response.output || t.failed);
    const native = await galleryNativeResources(sdk, projectId, response.result.media);
    return { ...response.result, media: native.selected.map(({ nativeResource, ...item }) => item) };
  }

  async function load() {
    if (running.current || !context.projectId) return;
    const projectId = context.projectId, sequenceId = context.sequenceId, requestedKey = key;
    deferActiveRefresh();
    running.current = true; setBusy(true); setStatus(null);
    try {
      const next = await readInventory(projectId);
      if (!sameContext(projectId, sequenceId) || requestedKey !== key) { setStatus({ tone: 'error', text: t.changed }); return; }
      setInventory(next); setLoadedKey(requestedKey);
      setSlots(emptySlots()); setName('Photo Grid Reveal'); setDurationFrames(853);durationEdited.current=false;
      setMusicChoice('bundled'); setManualEnabled(true); setManualBpm(113); setEstimated(null);
      setStatus(null);
    } catch (error) { setStatus({ tone: 'error', text: t.failed + ' ' + String(error?.message || error) }); }
    finally { running.current = false; setBusy(false); }
  }

  function beginMusicScope(isCurrent=()=>true) {
    if(typeof AbortController!=='function')throw hostError('host-missing','Update Selects to cancel music analysis safely.');
    musicScope.current?.abort();
    setEstimated(null);
    const controller=new AbortController(),projectId=context.projectId,sequenceId=context.sequenceId;
    musicScope.current=controller;
    return {client:panelLocalClient(sdk),signal:controller.signal,isCurrent:()=>!controller.signal.aborted&&musicScope.current===controller&&sameContext(projectId,sequenceId)&&isCurrent()};
  }

  async function estimateMusic(audio,scope) {
    if (!audio?.path) throw new Error(t.uncertain);
    const current=()=>{if(!scope.isCurrent())throw Object.assign(new Error(t.changed),{contextChanged:true,safeNotSaved:true});};
    const read=async()=>{
      current();const response=await sdk.runScript({script:buildScript({operation:'verifyMusic',projectId:context.projectId,music:audio}),summary:'Verify selected Gallery music',allowCommit:false});current();
      if(response.isError||response.result?.status!=='musicReady'||!response.result.music)throw new Error(response.result?.message||'Selected music could not be verified.');
      return response.result.music;
    };
    const before=await read(),roots=await hostRoots(sdk,'photo-gallery-no2','SKILL.md');current();
    const analysis=await analyzeMusicFile(before.path,roots.data,scope),value=analysis.estimate;current();
    if (value?.status !== 'estimated' || !Number.isFinite(value.bpm)) throw new Error(value?.reason || t.uncertain);
    const after=await read();current();
    if(before.resourceId!==after.resourceId||holdPathKey(before.path)!==holdPathKey(after.path)||before.durationSeconds!==after.durationSeconds)throw new Error('Selected music changed during analysis. Start a new estimate.');
    const musicFingerprint={path:after.path,...analysis.source};
    setEstimated({ resourceId: after.resourceId, path:after.path, bpm: value.bpm,musicFingerprint });
    return {bpm:value.bpm,musicFingerprint};
  }

  async function estimateOnClick() {
    if (running.current || !selectedMusic) return;
    deferActiveRefresh();
    running.current = true; setBusy(true); setStatus(null);
    let scope;
    try { scope=beginMusicScope();const {bpm} = await estimateMusic(selectedMusic,scope);if(scope.isCurrent())setStatus({ tone: 'success', text: t.estimated + ': ' + bpm }); }
    catch (error) { if(!scope||scope.isCurrent())setStatus({ tone: 'error', text: t.uncertain + ' ' + String(error?.publicMessage||error?.message || error) }); }
    finally { running.current = false;if(alive.current)setBusy(false); }
  }

  async function resolveBpm(audio,isCurrent) {
    if (manualEnabled) {
      if (!Number.isFinite(manualBpm) || manualBpm <= 0) throw new Error(t.bpmMissing);
      return { manualBpm };
    }
    if (audio) {
      try{const analysis=await estimateMusic(audio,beginMusicScope(isCurrent));return {estimatedBpm:analysis.bpm,musicFingerprint:analysis.musicFingerprint};}
      catch(error){if(error&&typeof error==='object')error.safeNotSaved=true;throw error;}
    }
    throw new Error(t.bpmMissing);
  }

  async function createGallery() {
    if (running.current || unknown || !ready || !context.projectId) return;
    const projectId = context.projectId, sequenceId = context.sequenceId, requestedKey = key;
    let input;
    try {
      if (assigned !== 21) throw new Error(t.missing);
      input = { operation: 'create', projectId, name: name.trim(), durationFrames,
        media: slots.map(item => ({ ...inventory.media.find(media => media.resourceId === item.resourceId), focusX: item.focusX, focusY: item.focusY, manualFocus:item.manualFocus===true })),
        music: selectedMusic ? { resourceId: selectedMusic.resourceId, path: selectedMusic.path,
          durationFrames: selectedMusic.durationFrames, durationSeconds: selectedMusic.durationSeconds, startFrame: 0 } : null,
        ...(manualEnabled?{manualBpm}:{}) };
      if (!input.name || input.media.some(item => !item.resourceId)) throw new Error(t.missing);
      if (input.media.some(item => !Number.isSafeInteger(item.width) || !Number.isSafeInteger(item.height))) throw new Error('A selected tile has no verified dimensions');
    } catch (error) { setStatus({ tone: 'error', text: String(error?.message || error) }); return; }
    deferActiveRefresh();
    running.current = true; setBusy(true); setStatus(null);
    let dispatched = false;
    const isCurrent = () => sameContext(projectId, sequenceId) && requestedKey === key;
    try {
      input = await verifyGalleryInputs(sdk, t, input, isCurrent);
      input = await focusGalleryPhotos(sdk,input,isCurrent);
      await planGalleryPreparation(sdk,input,isCurrent,!manualEnabled,musicChoice==='bundled'&&!durationEdited.current);
      if(input.durationFrames!==durationFrames)setDurationFrames(input.durationFrames);
      const audio = musicChoice === 'bundled' ? await prepareBundledMusic(sdk, t, { projectId,
        durationFrames: input.durationFrames, fps:input.fps, isCurrent, onImportStarted: () => { dispatched = true; } }) : input.music;
      input.music = audio ? { resourceId: audio.resourceId, path: audio.path, durationFrames: audio.durationFrames, durationSeconds: audio.durationSeconds, startFrame: 0 } : null;
      Object.assign(input, await resolveBpm(audio,isCurrent));
      if (!isCurrent()) { setStatus({ tone: 'error', text: t.changed }); return; }
      const built = await buildGalleryDraft(sdk, t, { input, isCurrent,
        onDispatched: () => { dispatched = true; }, onImportStarted: () => { dispatched = true; }, onDraft: draftId => setSavedTarget({ projectId, draftId }) });
      // Selects may open the just-created Draft while its readback runs. That
      // expected sequence change must not turn a verified save into an error.
      if (built.verified) {
        setStatus({ tone: 'success', text: t.readback });
      } else if (built.readReturned) {
        setUnknown(true); setStatus({ tone: 'error', text: t.readbackMismatch });
      } else { setUnknown(true); setStatus({ tone: 'error', text: t.unknown }); }
    } catch (error) {
      if (error?.contextChanged) setStatus({ tone: 'error', text: t.changed });
      else if (dispatched && !error?.safeNotSaved) {
        // A transport failure after a mutating call may hide a successful save.
        setUnknown(true); setStatus({ tone: 'error', text: t.unknown + ' ' + String(error?.message || error) });
      } else setStatus({ tone: 'error', text: String(error?.message || error) });
    } finally { running.current = false; setBusy(false); }
  }

  async function openSaved() {
    if (!savedTarget || running.current) return;
    try {
      const response = await sdk.runScript({ script: 'return await selects.editor.openDraft(' + JSON.stringify(savedTarget.draftId) + ');', summary: 'Open Photo Gallery Draft', allowCommit: false });
      if (response.isError) throw new Error(response.output || t.failed);
    } catch (error) { setStatus({ tone: 'error', text: String(error?.message || error) }); }
  }

  return <ui.Stack gap={16}>
    <ui.Section title={t.title}><p>{t.description}</p></ui.Section>
    {!context.projectId && <ui.Message tone="error">{t.noProject}</ui.Message>}
    <ui.Section title={t.createMode}>
      <ui.Button variant="secondary" onClick={load} busy={busy} disabled={!context.projectId}>{t.load}</ui.Button>
    </ui.Section>
    {ready && <ui.Section title={t.media}>
      <p>{t.assigned}: {assigned}/21</p>
      {autoFillMedia && <ui.Button variant="secondary" onClick={() => setSlots(autoFillMedia.map(item => ({ resourceId: item.resourceId, focusX: 0.5, focusY: 0.5 })))} disabled={busy}>{t.fill}</ui.Button>}
      {canAssignReferenceMix && <ui.Button variant="secondary" onClick={() => {
        let photoIndex = 0, videoIndex = 0;
        setSlots(SLOT_KEYS.map((_, index) => ({ resourceId: (REFERENCE_VIDEO_SLOTS.has(index + 1)
          ? videos[videoIndex++] : photos[photoIndex++]).resourceId, focusX: 0.5, focusY: 0.5 })));
      }} disabled={busy}>{t.referenceMix}</ui.Button>}
      {autoFillMedia && <small>{t.fillHint}</small>}
      {missingMotion.length > 0 && <small>{t.motionMissing}{missingMotion.join(', ')}</small>}
      {inventory.media.length === 0 && <ui.Message tone="error">{t.noMedia}</ui.Message>}
      <ui.Select label={t.slot} value={selectedSlot} onChange={setSelectedSlot} options={SLOT_KEYS.map((value, i) => ({ value: String(i), label: String(i + 1).padStart(2, '0') + ' · ' + (slots[i].resourceId ? (inventory.media.find(media => media.resourceId === slots[i].resourceId)?.name || slots[i].resourceId) : t.choose) }))}/>
      <ui.Select label={t.media} value={slot.resourceId || null} onChange={resourceId => updateSlot({ resourceId })} options={inventory.media.map(item => ({ value: item.resourceId, label: item.name + ' · ' + item.kind }))} placeholder={t.choose} disabled={busy}/>
      <small>{t.focusHint || STRINGS.en.focusHint}</small>
      <ui.Slider label={t.focusX} value={slot.focusX} onChange={focusX => updateSlot({ focusX })} min={0} max={1} step={0.01} disabled={busy || !slot.resourceId}/>
      <ui.Slider label={t.focusY} value={slot.focusY} onChange={focusY => updateSlot({ focusY })} min={0} max={1} step={0.01} disabled={busy || !slot.resourceId}/>
    </ui.Section>}
    {ready && <ui.Section title={t.music}>
      <ui.Select label={t.music} value={musicChoice} onChange={value => { setMusicChoice(value); setEstimated(null); }} options={[
        { value: 'bundled', label: 'Unexplored \u00b7 TAD MILLER (CC BY 4.0)' },
        { value: 'none', label: t.noMusic },
        ...inventory.audio.map(item => ({ value: item.resourceId, label: item.name })),
      ]} disabled={busy}/>
      {musicChoice === 'bundled' && <small>Unexplored (long ver.) — <a href="https://www.youtube.com/c/Tadon" target="_blank" rel="noreferrer">TAD MILLER</a> · <a href="https://opengameart.org/content/unexplored-long-ver-orchestral-music" target="_blank" rel="noreferrer">{t.musicSource}</a> · <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a>. {t.musicCredit}</small>}
      <ui.Toggle label={t.bpmManual} value={manualEnabled} onChange={setManualEnabled} disabled={busy}/>
      {manualEnabled && <ui.NumberField label={t.bpm} value={manualBpm} onChange={setManualBpm} min={1} max={300} step={0.1} disabled={busy}/>}
      {!manualEnabled && selectedMusic && <ui.Button variant="secondary" onClick={estimateOnClick} disabled={busy}>{t.estimate}</ui.Button>}
      {estimated && selectedMusic && estimated.resourceId === selectedMusic.resourceId && <small>{t.estimated}: {estimated.bpm}</small>}
      <ui.NumberField label={t.duration} value={Number((durationFrames / 60).toFixed(3))} onChange={seconds => {durationEdited.current=true;setDurationFrames(Math.max(1, Math.round(seconds * 60)));}} min={1 / 60} step={1 / 60} unit="s" disabled={busy}/>
      <small>{t.durationNote}</small>
    </ui.Section>}
    {ready && <ui.Section title={t.createMode}>
      <ui.TextField label={t.name} value={name} onChange={setName} disabled={busy}/>
      <ui.Actions><ui.Button variant="primary" busy={busy} busyLabel={t.busy} disabled={unknown || busy || assigned !== 21 || !name.trim() || (musicChoice === 'none' && !manualEnabled)} onClick={createGallery}>{t.create}</ui.Button></ui.Actions>
      <small>{t.editLimits}</small>
    </ui.Section>}
    {status && <ui.Message tone={status.tone}>{status.text}</ui.Message>}
    {savedTarget && <ui.Button variant="secondary" onClick={openSaved} disabled={busy}>{t.openSaved}</ui.Button>}
  </ui.Stack>;
}

// --- Template run ------------------------------------------------------------
// A built-in app can run this Panel as a template: the person picks 15 photos
// (input `photos`) and 6 videos (input `clips`) in the app, and the app mounts the
// Panel out of sight with `context.template`. The videos go to the tiles that move
// in the reference (4, 6, 11, 17, 19, 21) and the photos fill the rest in order.
// Everything else is the Panel's default — its name, 14.217 s at 113 BPM, centred
// focus — with the bundled track unless the `music` option says none. It never
// opens the Draft and ends with one `sdk.finishTemplate`.
const TEMPLATE_NAME = 'Photo Grid Reveal', TEMPLATE_DURATION_FRAMES = 853, TEMPLATE_BPM = 113;
const TEMPLATE_FAILED = 'Photo Grid Reveal could not make the Draft; try again.';
const TEMPLATE_PARTIAL = 'Photo Grid Reveal stopped part way, so the new Draft may be incomplete; check it in this Project before trying again.';
const TEMPLATE_UNCERTAIN = 'Photo Grid Reveal could not confirm whether anything was saved; check this Project before trying again.';
function templateIssue(message) { return Object.assign(new Error(message), { publicMessage: message, safeNotSaved: true }); }

// The library the run works in: the one the app handed over, else (an older app)
// the open Project's page or the tab on screen, read once as the run starts.
function templateLibrary(app, projectId, template) {
  if (template?.libraryId) return template.libraryId;
  const match = String(app?.location?.pathname || '').match(/libraries\/([^/]+)\/projects\/([^/]+)/);
  if (match && match[2] === projectId) return match[1];
  return null;
}

// The app hands over its own Resource ids; the Panel works from the inspected
// media rows, so each pick is joined to its row by its file, the same file the
// native placement later checks the Project's Resource against.
// sdk-selected-media:start
// Match host Resource ids to run_script's project-scoped ids through the SDK.
// Return only the selected files so large Projects stay below the script result limit.
async function sdkSelectedMedia(sdk, projectId, picks) {
  const before = await sdk.call('listProjectResources', projectId);
  if (!Array.isArray(before)) throw Error('Could not read the Project resources.');
  const indices = picks.map(pick => before.findIndex(row => row.resourceId === pick.resourceId));
  if (indices.includes(-1)) throw Error('A picked file is missing from this Project.');
  const response = await sdk.runScript({
    summary: 'Read selected Project files', allowCommit: false,
    script: `const p=selects.project(${JSON.stringify(projectId)});
const resources=await p.resources(),indices=${JSON.stringify(indices)};
const selected=indices.map(i=>resources[i]),ids=new Set(selected.filter(Boolean).map(r=>r.resourceId));
const files=[];
const walk=nodes=>{for(const n of nodes||[])if(n.type==='dir')walk(n.children);else if(ids.has(n.resourceId))files.push(n);};
const top=await p.sourceFiles();
if(Array.isArray(top))walk(top);else if('fileTree' in top)walk(top.fileTree);
else for(const folder of top.folders||[]){const detail=await p.sourceFiles({folder:folder.name});if('fileTree' in detail)walk(detail.fileTree);}
return {count:resources.length,rows:selected.map(r=>r?{name:r.name,type:r.type,files:files.filter(f=>f.resourceId===r.resourceId).map(f=>({resourceId:f.resourceId,path:f.path}))}:null)};`
  });
  if (response.isError || !response.result || !Array.isArray(response.result.rows))
    throw Error(response.output || 'Could not read the selected Project files.');
  const result = response.result, after = await sdk.call('listProjectResources', projectId);
  if (!Array.isArray(after) || before.length !== result.count || after.length !== before.length ||
      after.some((row, i) => row.resourceId !== before[i].resourceId || row.name !== before[i].name || row.type !== before[i].type) ||
      result.rows.length !== picks.length || indices.some((index, i) =>
        result.rows[i]?.name !== before[index].name || result.rows[i]?.type !== before[index].type))
    throw Error('The selected Project files changed. Refresh your media and try again.');
  return result.rows.map((row, i) => {
    const expected = { image: 'Image', video: 'Video', audio: 'Audio' }[picks[i].kind];
    if (expected && row.type !== expected) throw Error('A picked file has the wrong media type.');
    if (row.files.length !== 1 || !row.files[0].path)
      throw Error((picks[i].name || 'A picked file') + ' is missing from this Project or matches more than one file.');
    return { ...row.files[0], resourceType: row.type };
  });
}
// sdk-selected-media:end

async function templateTiles(sdk, app, projectId, libraryId, inputs) {
  const photos = Array.isArray(inputs?.photos) ? inputs.photos : [];
  const clips = Array.isArray(inputs?.clips) ? inputs.clips : [];
  if (photos.length !== 15 || photos.some(x => x?.kind !== 'image' || !x.resourceId)) throw templateIssue('Pick exactly 15 photos, then try again.');
  if (clips.length !== 6 || clips.some(x => x?.kind !== 'video' || !x.resourceId)) throw templateIssue('Pick exactly 6 videos, then try again.');
  const picks = [...photos, ...clips];
  const selected = await sdkSelectedMedia(sdk, projectId, picks);
  const paths = selected.map(row => row.path);
  const pathById = new Map(picks.map((pick, i) => [pick.resourceId, paths[i]]));
  const inspected = await readMediaPages(sdk, { script: buildScript({ operation: 'inspect', projectId, paths }), summary: 'Inspect Photo Gallery project', allowCommit: false });
  if (inspected.isError || inspected.result?.status !== 'inspected' || !Array.isArray(inspected.result.media)) throw new Error(inspected.result?.message || inspected.output || 'Could not read the Project media.');
  const rowFor = async pick => {
    const label = pick.name || (pick.kind === 'video' ? 'A picked video' : 'A picked photo');
    const path = pathById.get(pick.resourceId);
    const rows = path ? inspected.result.media.filter(row => row.path === path && row.kind === pick.kind) : [];
    if (rows.length !== 1) throw templateIssue(label + ' is missing from this Project or matches more than one file.');
    return rows[0];
  };
  const photoRows = [], clipRows = [];
  for (const pick of photos) photoRows.push(await rowFor(pick));
  for (const pick of clips) clipRows.push(await rowFor(pick));
  let p = 0, c = 0;
  const media = SLOT_KEYS.map((_, i) => REFERENCE_VIDEO_SLOTS.has(i + 1) ? clipRows[c++] : photoRows[p++]);
  const native = await galleryNativeResources(sdk, projectId, media, libraryId);
  return native.selected.map(({ nativeResource, ...item }) => ({ ...item, focusX: 0.5, focusY: 0.5 }));
}

// Identity uses effective input choices, never display names or transient paths.
// Validate before a durable claim; invalid input cannot reserve an app run.
function galleryRunRequest(template) {
  const group=(key,count,kind)=>{
    const rows=template?.inputs?.[key];
    if(!Array.isArray(rows)||rows.length!==count||rows.some(p=>p?.kind!==kind||typeof p.resourceId!=='string'||!p.resourceId))throw templateIssue(`Pick exactly ${count} ${key==='photos'?'photos':'videos'}, then try again.`);
    return rows.map(({resourceId,kind})=>({resourceId,kind}));
  };
  const music=template?.options?.music??'bundled';
  if(!['none','bundled'].includes(music))throw templateIssue('Choose bundled music or no music, then try again.');
  return {photos:group('photos',15,'image'),clips:group('clips',6,'video'),music,durationFrames:TEMPLATE_DURATION_FRAMES,bpm:TEMPLATE_BPM};
}

// Read-only, unsaved capability probe before claiming or preparing Project assets.
// Music Off has no Audio reader dependency. Existing saved receipts still need
// the readers used to independently verify the persisted result.
async function requireGalleryRunReaders(sdk,projectId,music) {
  const methods=['motionGraphics','motionGraphicProgram','clipTransform','videoEffects','videoEffectProgram',...music==='none'?[]:['clipAudio']];
  const reply=await sdk.runScript({summary:'Check Gallery saved-result support',allowCommit:false,script:`if(typeof selects.files?.stat!=='function'||typeof selects.files?.readRange!=='function')return {supported:false};const d=await selects.project(${JSON.stringify(projectId)}).createDraft({name:'Gallery support check'});return {supported:${JSON.stringify(methods)}.every(name=>typeof d[name]==='function')};`});
  if(reply.isError||reply.result?.supported!==true)throw templateIssue('Update Selects to create and verify Photo Grid Reveal safely.');
}

// One plain sentence for the person, from a failure before anything was saved.
function templateMessage(error) {
  if (error?.publicMessage) return error.publicMessage;
  const said = String(error?.message || '');
  if (/no verified (image )?dimensions|no unique Project Resource/.test(said)) return 'A picked file is not ready yet; wait for it to finish importing, then try again.';
  if (/no verified duration/.test(said)) return 'A picked video is not ready yet; wait for it to finish importing, then try again.';
  if (/^(Could not download .+|The download of .+ did not match its pinned checksum|Could not prepare Python for .+)\.$/.test(said)) return said;
  if (/does not expose native Image placement|does not support original photo file checks/.test(said)) return 'This version of Selects cannot place photos for Photo Grid Reveal; update Selects, then try again.';
  return TEMPLATE_FAILED;
}

// The shared durable owner survives a new panel realm. Save receipts are read
// back independently; an unknown run is inspected rather than authored again.
function GalleryTemplateRun({ sdk, context }) {
  useAppUpdateGuard(sdk, context?.language, () => !!(true));
  const t = STRINGS[context.language] || STRINGS.en;
  const runId = context.template?.runId;
  const [status, setStatus] = React.useState('Making your Draft…');
  const started = React.useRef(null), alive = React.useRef(true), latest = React.useRef(context);
  latest.current = context;
  React.useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  React.useEffect(() => {
    if (!runId || started.current === runId) return;
    started.current = runId;
    const projectId = context.projectId, template = context.template;
    const live = () => alive.current && latest.current.template?.runId === runId && latest.current.projectId === projectId && latest.current.template?.libraryId === template?.libraryId;
    let ended = false;
    const finish = result => { if (ended) return; ended = true; if (!live()) return; try { sdk.finishTemplate(result); } catch {} };
    const say = text => { if (live()) setStatus(text); };
    preparing.say = say;
    let dispatched = false, draftId = null;
    (async () => {
      try {
        if (!projectId) throw templateIssue('Open a Project, then try again.');
        requireGalleryAuthoringHost(sdk);
        const app = window.parent, libraryId = templateLibrary(app, projectId, template);
        const request=galleryRunRequest(template);
        await requireGalleryRunReaders(sdk,projectId,request.music);
        const built=await executeTemplateRun(sdk,panelLocalClient(sdk).files,{pluginId:'photo-gallery-no2',libraryId,projectId,runId},request,live,async(runReceipt,onDispatch)=>{
          say('Finding your photos and videos…');
          const media=await templateTiles(sdk,app,projectId,libraryId,template?.inputs);
          if(!live())throw templateIssue('The template run ended before the Draft was made.');
          const input={operation:'create',projectId,name:TEMPLATE_NAME,durationFrames:request.durationFrames,media,music:null,manualBpm:request.bpm};
          Object.assign(input,await verifyGalleryInputs(sdk,t,input,live));
          Object.assign(input,await focusGalleryPhotos(sdk,input,live));
          await planGalleryPreparation(sdk,input,live,false,request.music==='bundled');
          if(request.music!=='none'){
            say('Adding the music…');
            const audio=await prepareBundledMusic(sdk,t,{projectId,durationFrames:input.durationFrames,fps:input.fps,isCurrent:live,onImportStarted:()=>{}});
            input.music={resourceId:audio.resourceId,path:audio.path,durationFrames:audio.durationFrames,durationSeconds:audio.durationSeconds,startFrame:0};
          }
          say('Building the gallery…');
          return buildGalleryDraft(sdk,t,{input,isCurrent:live,libraryId,runReceipt,onDispatched:async()=>{await onDispatch();dispatched=true;},onDraft:id=>{draftId=id;}});
        },result=>verifyGallerySavedDraft(sdk,projectId,result));
        draftId=built.draftId;
        if(!draftId||!Array.isArray(built.clips)||built.clips.length!==21)throw templateIssue('The saved Gallery could not be confirmed. Inspect the Project before starting a new run.');
        say('Done.');
        finish({ sequenceId: built.draftId });
      } catch (error) {
        if(!draftId&&typeof error?.draftId==='string'&&error.draftId)draftId=error.draftId;
        console.warn('[photo-gallery-no2] template run failed:', error?.message || String(error), { draftId, dispatched });
        say('Stopped.');
        finish({ error: draftId ? TEMPLATE_PARTIAL+' ('+draftId+')' : dispatched && !error?.safeNotSaved ? TEMPLATE_UNCERTAIN : templateMessage(error) });
      } finally {
        finish({ error: TEMPLATE_FAILED });
      }
    })();
  }, [runId]);
  return <p role="status" style={{ margin: 0, fontSize: 12, color: 'var(--panel-muted-fg)' }}>{status}</p>;
}

// Only read-only media queries use this: keep every row without exceeding run_script's response limit.
async function readMediaPages(sdk, args) {
  let result, total;
  for (let offset = 0; ; offset += 32) {
    const script = `const value=await(async()=>{${args.script}\n})();const array=Array.isArray(value);const data=array?{rows:value}:value;const page={};let total=0;for(const key of Object.keys(data)){const rows=data[key];page[key]=Array.isArray(rows)?rows.slice(${offset},${offset + 32}):rows;if(Array.isArray(rows))total=Math.max(total,rows.length);}return {array,page,total};`;
    const reply = await sdk.runScript({ ...args, script, allowCommit: false });
    if (reply.isError || !reply.result?.page) throw new Error(reply.output || 'Could not read the Project media.');
    const batch = reply.result;
    if (total !== undefined && total !== batch.total) throw new Error('Project media changed while loading. Try again.');
    total = batch.total;
    if (offset === 0) result = batch.page;
    else for (const key of Object.keys(batch.page)) if (Array.isArray(batch.page[key])) result[key].push(...batch.page[key]);
    if (offset + 32 >= total) return { ...reply, result: batch.array ? result.rows : result };
  }
}

// local-sdk:start
/** Pure host-platform path operations; no filesystem or renderer globals. */
function panelLocalPaths(platform: string) {
  const windows = platform === "win32";
  const slash = (path: string) => {
    if (typeof path !== "string")
      throw new TypeError("A path must be a string.");
    return windows ? path.replace(/\\/g, "/") : path;
  };
  const rootOf = (path: string) => {
    if (windows) {
      const unc = path.match(/^\/\/[^/]+\/[^/]+\/?/);
      if (unc) return unc[0].replace(/\/?$/, "/");
      const drive = path.match(/^[a-z]:\/?/i);
      if (drive) return drive[0];
    }
    return path.startsWith("/") ? "/" : "";
  };
  const native = (value: string) =>
    windows ? value.replace(/\//g, "\\") : value;
  const normalize = (value: string) => {
    const path = slash(value),
      root = rootOf(path),
      absolute = root.endsWith("/");
    const segments: string[] = [];
    for (const segment of path
      .slice(Math.min(root.length, path.length))
      .split("/")) {
      if (!segment || segment === ".") continue;
      if (segment === ".." && segments.length && segments.at(-1) !== "..")
        segments.pop();
      else if (segment !== ".." || !absolute) segments.push(segment);
    }
    let result = root + segments.join("/");
    if (!result || (windows && /^[a-z]:$/i.test(result))) result += ".";
    if (path.endsWith("/") && !result.endsWith("/")) result += "/";
    return native(result);
  };
  const basename = (value: string, extension?: string) => {
    const path = slash(value).replace(/\/+$/, "");
    const withoutDrive = windows ? path.replace(/^[a-z]:/i, "") : path;
    const name = withoutDrive.slice(withoutDrive.lastIndexOf("/") + 1);
    return extension && name.endsWith(extension)
      ? name.slice(0, -extension.length)
      : name;
  };
  return {
    normalize,
    join: (...paths: string[]) => {
      const parts = paths.map(slash).filter(Boolean);
      let joined = parts.join("/");
      if (windows && !/^\/\/[^/]/.test(parts[0] || ""))
        joined = joined.replace(/^\/{2,}/, "/");
      return normalize(joined);
    },
    dirname(value: string) {
      const path = slash(value),
        root = rootOf(path);
      const end = path.replace(/\/+$/, "").lastIndexOf("/");
      if (end < root.length) return value.slice(0, root.length) || ".";
      return value.slice(0, end);
    },
    basename,
    extname(value: string) {
      const name = basename(value),
        dot = name.lastIndexOf(".");
      return dot <= 0 || name === ".." ? "" : name.slice(dot);
    },
    isAbsolute: (value: string) => rootOf(slash(value)).endsWith("/"),
  };
}


/** Plugin-private composition of canonical SDK methods, not a public SDK surface. */
async function createPanelLocalClient(sdk: any) {
  const SCRIPT_BYTES = 256 * 1024;
  const runSource = async (script: string, write = false) => {
    if (new TextEncoder().encode(script).byteLength > SCRIPT_BYTES) throw new Error("The local file script exceeds the 256 KiB limit.");
    const response = await sdk.runScript({
      summary: "Use local media workspace",
      allowCommit: write,
      script,
    });
    if (response.isError) throw new Error(response.output || "Local SDK operation failed.");
    // A clipped report has no result. Every read returning data rejects that case below.
    return response.result;
  };
  // Direct arguments keep object literals contextually typed by the SDK signature.
  const run = (method: string, args: unknown[], write = false) =>
    runSource("return await selects." + method + "(" + JSON.stringify(args).slice(1, -1) + ");", write);
  const environment = await run("files.environment", []);
  if (!environment || typeof environment.platform !== "string" || !environment.homedir)
    throw new Error("Update Selects to use this plugin's local media workspace.");
  const paths = panelLocalPaths(environment.platform);
  const CHUNK_BYTES = 48 * 1024;
  // Three encoded chunks occupy 192 KiB, below the Panel's default 256 KiB result
  // budget. The same script still awaits each canonical file operation in order.
  const fileBatch = async (method: "readRange" | "writeChunk", inputs: unknown[], lengths: number[]) => {
    let count = Math.min(3, inputs.length), script = "";
    while (count > 0) {
      script = "const rows=[];" + inputs.slice(0, count).map((input, index) => {
        const call = "{const result=await selects.files." + method + "(" + JSON.stringify(input) + ");";
        if (method === "writeChunk")
          return call + "if(result?.bytesWritten!==" + lengths[index] + ")throw Error('The file write returned an incomplete result. Check the file before retrying.');rows.push(result);}";
        return call + "if(!result||typeof result.base64!=='string'||!Number.isSafeInteger(result.bytesRead)||result.bytesRead<0||result.bytesRead>" + lengths[index] + ")throw Error('The file read returned an incomplete result.');rows.push(result);if(result.bytesRead<" + lengths[index] + ")return rows;}";
      }).join("") + "return rows;";
      if (new TextEncoder().encode(script).byteLength <= SCRIPT_BYTES) break;
      count--;
    }
    if (!count) throw new Error("The local file script exceeds the 256 KiB limit.");
    return { count, rows: await runSource(script, method === "writeChunk") };
  };
  const readRange = async (path: string, offset: number, length: number) => {
    const parts: Uint8Array[] = [];
    let total = 0;
    while (total < length) {
      const inputs = Array.from({ length: Math.min(3, Math.ceil((length - total) / CHUNK_BYTES)) }, (_, index) =>
        ({ path, offset: offset + total + index * CHUNK_BYTES, length: Math.min(CHUNK_BYTES, length - total - index * CHUNK_BYTES) }));
      const lengths = inputs.map(input => input.length);
      const { rows, count } = await fileBatch("readRange", inputs, lengths);
      if (!Array.isArray(rows) || rows.length < 1 || rows.length > count) throw new Error("The file read returned an incomplete result.");
      let short = false;
      for (let index = 0; index < rows.length; index++) {
        const result = rows[index];
        if (!result || typeof result.base64 !== "string" || !Number.isSafeInteger(result.bytesRead) || result.bytesRead < 0 || result.bytesRead > lengths[index]) throw new Error("The file read returned an incomplete result.");
        const bytes = Uint8Array.from(atob(result.base64), (character) => character.charCodeAt(0));
        if (bytes.length !== result.bytesRead) throw new Error("The file read returned invalid bytes.");
        short = bytes.length < lengths[index];
        if (short && index !== rows.length - 1) throw new Error("The file read returned invalid bytes.");
        parts.push(bytes); total += bytes.length;
      }
      if (rows.length !== count && !short) throw new Error("The file read returned an incomplete result.");
      if (short) break;
    }
    const output = new Uint8Array(total);
    let position = 0;
    for (const bytes of parts) { output.set(bytes, position); position += bytes.length; }
    return output;
  };
  const files = {
    ...paths,
    homedir: () => environment.homedir,
    getOrCreateTmpDirPath: async () => environment.tempDirectory,
    exists: (path: string) => run("files.exists", [path]),
    stat: (path: string) => run("files.stat", [path]),
    // One script owns every read and its deadline; only the compact digest returns.
    fingerprint: (path: string) => runSource("return await (" + fingerprintTemplateFile.toString() + ")(selects.files," + JSON.stringify(path) + ");"),
    readdir: (path: string) => run("files.readdir", [path]),
    // SDK-shaped requests support the same shared observation in SDK scripts and
    // the panel. Positional reads retain their existing byte/partial-EOF contract.
    readRange: (path: string | {path: string; offset: number; length: number}, offset?: number, length?: number) =>
      typeof path === "string" ? readRange(path, offset!, length!) : run("files.readRange", [path]),
    async readFile(path: string, encoding?: string) {
      const stat = await run("files.stat", [path]);
      if (!stat || !Number.isSafeInteger(stat.size) || stat.size < 0) throw new Error("The file is unavailable.");
      const bytes = await readRange(path, 0, stat.size);
      if (bytes.length !== stat.size) throw new Error("The file changed while it was being read.");
      if (encoding !== undefined && encoding !== "utf8") throw new Error("Only utf8 text encoding is supported.");
      return encoding === "utf8" ? new TextDecoder().decode(bytes) : bytes;
    },
    async writeFile(path: string, data: string | Uint8Array, options?: string | { encoding?: string; flag?: "w" | "a" | "wx" }) {
      const encoding = typeof options === "string" ? options : options?.encoding;
      const flag = typeof options === "object" ? options.flag : undefined;
      if (flag !== undefined && !["w", "a", "wx"].includes(flag)) throw new Error("Unsupported file write flag.");
      if (encoding !== undefined && encoding !== "utf8") throw new Error("Only utf8 text encoding is supported.");
      const bytes = typeof data === "string" ? new TextEncoder().encode(data) : new Uint8Array(data);
      if ((flag === "a" || flag === "wx") && bytes.length > CHUNK_BYTES) throw new Error("Atomic append and exclusive creation are limited to 48 KiB.");
      // Each complete replacement has its own sibling file. Other panels cannot
      // overwrite one of its chunks before the final atomic rename publishes it.
      const replacement = flag !== "a" && flag !== "wx";
      const destination = replacement ? path + ".tmp-" + crypto.randomUUID() : path;
      let published = false;
      try {
        let offset = 0;
        do {
          const inputs = [], lengths = [];
          for (let index = 0; index < (replacement ? 3 : 1) && (offset + index * CHUNK_BYTES < bytes.length || index === 0); index++) {
            const position = offset + index * CHUNK_BYTES, chunk = bytes.subarray(position, position + CHUNK_BYTES);
            let binary = "";
            for (const byte of chunk) binary += String.fromCharCode(byte);
            const mode = position === 0 ? (flag === "a" ? "append" : "exclusive") : undefined;
            inputs.push({ path: destination, offset: position, base64: btoa(binary), ...(mode ? { mode } : {}) });
            lengths.push(chunk.length);
          }
          if (!replacement) {
            const result = await run("files.writeChunk", [inputs[0]], true);
            if (result?.bytesWritten !== lengths[0]) throw new Error("The file write returned an incomplete result. Check the file before retrying.");
          } else {
            const { rows, count } = await fileBatch("writeChunk", inputs, lengths);
            if (!Array.isArray(rows) || rows.length !== count || rows.some((row, index) => row?.bytesWritten !== lengths[index])) throw new Error("The file write returned an incomplete result. Check the file before retrying.");
            lengths.length = count;
          }
          offset += lengths.reduce((sum, size) => sum + size, 0);
        } while (offset < bytes.length);
        if (replacement) await run("files.rename", [destination, path], true);
        published = true;
      } finally {
        if (replacement && !published) await run("files.remove", [destination, { recursive: false, force: true }], true).catch(() => {});
      }
    },
    async compareAndReplace(path: string, expectedText: string | null, text: string) {
      const encode = (value: string) => {
        const bytes = new TextEncoder().encode(value);
        if (bytes.length > CHUNK_BYTES) throw new Error("Atomic file values are limited to 48 KiB.");
        let binary = "";
        for (const byte of bytes) binary += String.fromCharCode(byte);
        return btoa(binary);
      };
      const result = await run("files.compareAndReplace", [{path, expectedBase64: expectedText === null ? null : encode(expectedText), base64: encode(text)}], true);
      if (typeof result?.replaced !== "boolean") throw new Error("The atomic file update returned an incomplete result. Read the file before retrying.");
      return result.replaced;
    },
    mkdir: (path: string, options?: { recursive?: boolean }) => run("files.mkdir", [path, options ?? {}], true),
    rm: (path: string, options?: { recursive?: boolean; force?: boolean }) => run("files.remove", [path, { recursive: options?.recursive ?? false, force: options?.force ?? false }], true),
    removeFile: ({ filePath }: { filePath: string }) => run("files.remove", [filePath, { recursive: false, force: true }], true),
    rename: (from: string, to: string) => run("files.rename", [from, to], true),
    copyFile: (from: string, to: string) => run("files.copy", [from, to], true),
    downloadFile: (url: string, path: string) => run("files.download", [url, path], true),
    pathToLocalURL: (path: string) => run("files.localUrl", [path]),
    localURLToPath: (url: string) => run("files.pathFromLocalUrl", [url]),
  };
  const activeJobs = new Map<string, () => Promise<void>>();
  let disposed = false;
  const SETTLEMENT_MS = 5000, OUTPUT_BYTES = 4 * 1024 * 1024;
  const mediaIssue = (code: string, message: string, cause?: unknown, uncertain = false) =>
    Object.assign(new Error(message), { code: "LOCAL_MEDIA_" + code, publicMessage: message, terminal: true, cause,
      ...(uncertain ? { preserveTemporaryFiles: true } : {}) });
  const cancel = async (jobId: string) => {
    const response = await sdk.runScript({ summary: "Cancel local media processing", allowCommit: true, script: "await selects.media.job(" + JSON.stringify(jobId) + ").cancel();" });
    if (response.isError) throw new Error(response.output || "Media cancellation failed.");
  };
  const observeMedia = (read: () => Promise<any>, deadline: number): Promise<any> => new Promise((resolve, reject) => {
    const remaining = deadline - Date.now();
    if (remaining <= 0) { reject(mediaIssue("STATUS", "The media job response could not be confirmed.")); return; }
    const timer = setTimeout(() => reject(mediaIssue("STATUS", "The media job response could not be confirmed.")), remaining);
    Promise.resolve().then(read).then(
      value => { clearTimeout(timer); resolve(value); },
      cause => { clearTimeout(timer); reject(mediaIssue("STATUS", "The media job response could not be confirmed.", cause)); });
  });
  const validJob = (value: any) => typeof value?.jobId === "string" && !!value.jobId && value.jobId.length <= 1024;
  const process = async (executable: "FFmpeg" | "FFprobe", args: string[], _withoutLog?: boolean, signal?: AbortSignal, onStdout?: (text: string) => void, onStderr?: (text: string) => void) => {
    if (!Array.isArray(args) || args.some(arg => typeof arg !== "string" || arg.includes("\0")) ||
      signal && (typeof signal.aborted !== "boolean" || typeof signal.addEventListener !== "function" || typeof signal.removeEventListener !== "function") ||
      onStdout !== undefined && typeof onStdout !== "function" || onStderr !== undefined && typeof onStderr !== "function")
      throw mediaIssue("INPUT", "The local media arguments or subscriptions are invalid.");
    if (disposed || signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const startSource = "return await selects.media.start" + executable + "(" + JSON.stringify({ args }) + ");";
    if (new TextEncoder().encode(startSource).byteLength > SCRIPT_BYTES) throw mediaIssue("INPUT", "The local media request exceeds its script byte budget.");
    let started: any;
    const starting = runSource(startSource, true);
    try { started = await observeMedia(() => starting, Date.now() + SETTLEMENT_MS); }
    catch (cause) {
      // A late start identity can only stop that original job. Never start again
      // or authorize cleanup from this background cancellation acknowledgement.
      void starting.then(value => validJob(value) ? cancel(value.jobId) : undefined, () => {}).catch(() => {});
      throw mediaIssue("START_UNKNOWN", "The media job start could not be confirmed. Its temporary workspace is retained for inspection.", cause, true);
    }
    if (!validJob(started))
      throw mediaIssue("START_UNKNOWN", "The media job identity could not be confirmed. Its temporary workspace is retained for inspection.", undefined, true);
    const jobId = started.jobId;
    let cancellation: Promise<void> | null = null, cancellationDeadline: number | null = null, settled = false;
    const requestCancel = () => {
      if (!cancellation) {
        cancellationDeadline = Date.now() + SETTLEMENT_MS;
        cancellation = cancel(jobId);
        void cancellation.catch(() => {});
      }
      return cancellation;
    };
    const abort = () => { void requestCancel(); };
    activeJobs.set(jobId, requestCancel);
    signal?.addEventListener("abort", abort, { once: true });
    if (disposed || signal?.aborted) abort();
    let cursor = 0, outputBytes = 0, stdout = "", stderr = "";
    const knownState = (status: any) => ["running", "succeeded", "failed", "cancelled"].includes(status?.state);
    // Read-only observations may time out; a late reply cannot authorize cleanup.
    const statusAt = (deadline: number) => observeMedia(() => sdk.call("getLocalMediaJobStatus", jobId, { cursor }), deadline);
    const settleAfterFailure = async (cause: unknown) => {
      requestCancel();
      const deadline = cancellationDeadline!;
      while (Date.now() < deadline) {
        try {
          const status = await statusAt(deadline);
          if (knownState(status) && status.state !== "running") { settled = true; return; }
        } catch { /* Only independent status reads may recover an unknown reply. */ }
        if (Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, Math.min(50, deadline - Date.now())));
      }
      throw Object.assign(mediaIssue("SETTLEMENT_UNKNOWN", "The media job exit could not be confirmed. Its temporary workspace is retained for inspection.", cause, true), { jobId });
    };
    try {
      while (true) {
        if (cancellationDeadline !== null && Date.now() >= cancellationDeadline)
          throw mediaIssue("STATUS", "The cancelled media job status could not be confirmed.");
        const status = await statusAt(cancellationDeadline ?? Date.now() + SETTLEMENT_MS);
        if (!knownState(status)) throw mediaIssue("STATUS", "The media job returned an unknown status.");
        settled = status.state !== "running";
        if (!Array.isArray(status.events) || status.events.length > 8 || typeof status.truncated !== "boolean" || !Number.isSafeInteger(status.nextCursor) || status.nextCursor < cursor)
          throw mediaIssue("STATUS", "The media job returned an incomplete status.");
        if (status.truncated) throw mediaIssue("OUTPUT", "Media output was truncated; no incomplete result was accepted.");
        let position = cursor;
        for (const event of status.events) {
          if (!event || !["stdout", "stderr"].includes(event.stream) || typeof event.text !== "string" || event.text.length > 4096 || !Number.isSafeInteger(event.cursor) || event.cursor !== position + 1 || event.cursor > status.nextCursor)
            throw mediaIssue("OUTPUT", "The media job returned incomplete output.");
          outputBytes += new TextEncoder().encode(event.text).byteLength;
          if (outputBytes > OUTPUT_BYTES) throw mediaIssue("OUTPUT_LIMIT", "The media output exceeds its 4 MiB byte budget.");
          position = event.cursor;
          if (event.stream === "stdout") { stdout += event.text; onStdout?.(event.text); }
          else { stderr += event.text; onStderr?.(event.text); }
        }
        if (position !== status.nextCursor) throw mediaIssue("OUTPUT", "The media job returned an incomplete output cursor.");
        cursor = status.nextCursor;
        if (settled && status.events.length === 0) {
          if (status.state === "cancelled" || signal?.aborted || disposed) throw new DOMException("Aborted", "AbortError");
          if (status.state === "failed") throw new Error(status.error || stderr || "Media processing failed.");
          return { stdout, stderr };
        }
        if (!settled) await new Promise(resolve => setTimeout(resolve, 150));
      }
    } catch (error) {
      if (!settled) await settleAfterFailure(error);
      throw error;
    } finally {
      signal?.removeEventListener("abort", abort);
      activeJobs.delete(jobId);
    }
  };
  return {
    files,
    environment,
    media: {
      runFFmpeg: (args: string[], quiet?: boolean, signal?: AbortSignal, stdout?: (text: string) => void, stderr?: (text: string) => void) => process("FFmpeg", args, quiet, signal, stdout, stderr),
      runFFprobe: (args: string[], quiet?: boolean, signal?: AbortSignal) => process("FFprobe", args, quiet, signal),
    },
    dialogs: {
      pickFilePath: (filters?: Array<{ name: string; extensions: string[] }>) => run("editor.pickFile", [{ filters }]),
      pickDirectoryPath: () => run("editor.pickDirectory", []),
      pickSavePath: (defaultPath: string) => run("editor.pickSavePath", [{ defaultPath }]),
    },
    dispose() { disposed = true; for (const requestCancel of activeJobs.values()) void requestCancel().catch(() => {}); },
  };
}

const panelLocalClients = new WeakMap<object, any>();
function panelLocalClient(sdk: any): any {
  const client = panelLocalClients.get(sdk);
  if (!client) throw new Error("Local SDK has not initialized.");
  return client;
}
function withPanelLocalClient(Component: any) {
  return function LocalSdkPanel(props: any) {
    const [state, setState] = React.useState<any>(null);
    const reported = React.useRef(new WeakMap<object, Set<string>>());
    const key = JSON.stringify([props.context?.projectId ?? null,
      props.context?.template?.libraryId ?? props.context?.libraryId ?? null,
      props.context?.template?.runId ?? null]);
    React.useEffect(() => {
      let active = true, settled = false;
      let client: any;
      const fail = (timeout: boolean, cause?: unknown) => {
        if (!active || settled) return;
        settled = true; clearTimeout(timer);
        const error = timeout
          ? "Connecting to Selects took too long. Reopen the Project and try again."
          : "Could not connect to Selects. Reopen the Project and try again; update Selects if the problem continues.";
        // Diagnostics stay private; neither the DOM nor finishTemplate receives
        // raw SDK output, paths or an exception stack.
        setState({sdk: props.sdk, key, error, cause});
      };
      // This is a read-only bootstrap observation, not a mutation retry or cancel.
      const timer = setTimeout(() => fail(true), 30000);
      createPanelLocalClient(props.sdk).then(value => {
        client = {...props.sdk, ...value};
        if (!active || settled) { value.dispose(); return; }
        settled = true; clearTimeout(timer);
        panelLocalClients.set(props.sdk, client);
        setState({sdk: props.sdk, key});
      }).catch(error => fail(false, error));
      return () => {
        active = false; clearTimeout(timer);
        if (client) {
          if (panelLocalClients.get(props.sdk) === client) panelLocalClients.delete(props.sdk);
          client.dispose();
        }
      };
    }, [props.sdk, key]);
    React.useEffect(() => {
      if (!props.context?.template || state?.sdk !== props.sdk || state?.key !== key || !state?.error) return;
      if (typeof props.sdk?.finishTemplate !== "function") return;
      const seen = reported.current.get(props.sdk) ?? new Set<string>();
      if (seen.has(key)) return;
      seen.add(key); reported.current.set(props.sdk, seen);
      // A failed connection never mounts the child, so the wrapper must finish
      // a hidden app run itself. Visible standalone panels keep an alert only.
      try { Promise.resolve(props.sdk.finishTemplate({error: state.error})).catch(() => {}); }
      catch { /* Do not replay completion or expose a transport exception. */ }
    }, [props.sdk, key, state, !!props.context?.template]);
    if (state?.sdk !== props.sdk || state?.key !== key) return React.createElement("div", {role: "status"}, "Connecting to Selects…");
    if (state?.error) return React.createElement("div", {role: "alert"}, state.error);
    return React.createElement(Component, props);
  };
}

export default withPanelLocalClient(Panel);
// local-sdk:end

// app-update-guard:start
// Shared source, inlined into portable panels by tools/sync_app_update_guards.py.
import * as AppUpdateGuardReact from 'react';

const appUpdateGuardScopes = new WeakMap<object, any>();

/** Each mounted editor contributes a live veto; the host receives one guard per SDK. */
function useAppUpdateGuard(sdk: any, language: string | undefined, readBlocked: (context: any) => boolean) {
  const live = AppUpdateGuardReact.useRef({ language, readBlocked });
  live.current = { language, readBlocked };
  AppUpdateGuardReact.useEffect(() => {
    const api = sdk?.updates;
    if (typeof api?.registerGuard !== 'function') return;
    let group = appUpdateGuardScopes.get(api);
    if (!group) {
      group = { entries: new Set(), dispose: null };
      appUpdateGuardScopes.set(api, group);
    }
    group.entries.add(live);
    if (!group.dispose) {
      group.dispose = api.registerGuard({
        async canUpdate(context: any) {
          for (const entry of group.entries) {
            // A partially initialized editor must not lose state during reload.
            let blocked = true;
            try { blocked = Boolean(entry.current.readBlocked(context)); } catch { /* fail closed */ }
            if (blocked) {
              const korean = String(entry.current.language || '').toLowerCase().startsWith('ko');
              throw new Error(korean
                ? '\uc9c4\ud589 \uc911\uc778 \uc791\uc5c5\uc744 \ub9c8\uce58\uace0 \ubcc0\uacbd\uc0ac\ud56d\uc744 \uc800\uc7a5\ud55c \ub4a4 \uc571\uc744 \uc5c5\ub370\uc774\ud2b8\ud574\uc8fc\uc138\uc694.'
                : 'Finish the current operation and save changes before updating this app.');
            }
          }
        },
      });
    }
    return () => {
      group.entries.delete(live);
      if (!group.entries.size) {
        group.dispose?.();
        appUpdateGuardScopes.delete(api);
      }
    };
  }, [sdk?.updates]);
}
// app-update-guard:end
