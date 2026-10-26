// Source-bound local clip evaluation. File snapshots, cache publication,
// media jobs and transient cleanup belong to bundled-assets. No Project is edited.
var QS_VERSION = 3;
// One decode pass at the settings Selfie Aesthetic Edit measured (sae-host saeMotionArgs: fps 8, gray rawvideo,
// 0.25-0.65 s for 120 s of source) gives every per-frame figure below.
var QS_FPS = 8;
var QS_W = 64, QS_H = 36;
// Windows start at least this far into the clip: stock clips often fade in from black over their first frames.
var QS_HEAD = 0.5;
// Scores are kept per bin of this many seconds; pickWindowsLocal joins bins into a window of any length.
var QS_BIN = 0.5;
// At most this many seconds of a clip are decoded (from QS_HEAD); a longer clip is scored over its first QS_SPAN.
var QS_SPAN = 120;
var QS_BUDGET_MS = 30000;
// Frame thresholds (luma 0-1).
var QS_BLACK = 0.07, QS_DARK = 0.16, QS_CLIP_LO = 16 / 255, QS_CLIP_HI = 240 / 255, QS_BRIGHT_SHARE = 0.45;
var QS_FLASH_JUMP = 0.25, QS_CUT_DIFF = 0.12, QS_CUT_RATIO = 4;

// Pure: per-frame statistics of QS_W x QS_H grey frames packed in `bytes`.
function qsFrameStats(bytes, w, h) {
  var size = w * h, n = Math.floor(bytes.length / size), out = [];
  for (var f = 0; f < n; f++) {
    var o = f * size, sum = 0, lo = 0, hi = 0, lap = 0, diff = 0;
    for (var i = 0; i < size; i++) {
      var v = bytes[o + i];
      sum += v;
      if (v <= QS_CLIP_LO * 255) lo++; else if (v >= QS_CLIP_HI * 255) hi++;
      if (f > 0) diff += Math.abs(v - bytes[o - size + i]);
    }
    for (var y = 1; y < h - 1; y++) {
      for (var x = 1; x < w - 1; x++) {
        var k = o + y * w + x;
        lap += Math.abs(4 * bytes[k] - bytes[k - 1] - bytes[k + 1] - bytes[k - w] - bytes[k + w]);
      }
    }
    out.push({ luma: sum / size / 255, lo: lo / size, hi: hi / size, sharp: lap / ((w - 2) * (h - 2)) / 1020,
      diff: f > 0 ? diff / size / 255 : 0 });
  }
  return out;
}

// Pure: scene changes (seconds from `offset`): a frame difference at least QS_CUT_DIFF and QS_CUT_RATIO times the
// median difference of the frames around it.
function qsSceneCuts(stats, fps, offset) {
  var cuts = [];
  for (var i = 1; i < stats.length; i++) {
    var near = [];
    for (var j = Math.max(1, i - 6); j <= Math.min(stats.length - 1, i + 6); j++) if (j !== i) near.push(stats[j].diff);
    near.sort(function (a, b) { return a - b; });
    var med = near.length ? near[Math.floor(near.length / 2)] : 0;
    var d = stats[i].diff;
    var flash = i + 1 < stats.length && stats[i].luma - stats[i - 1].luma > QS_FLASH_JUMP && stats[i].luma - stats[i + 1].luma > QS_FLASH_JUMP;
    if (!flash && d >= QS_CUT_DIFF && d >= QS_CUT_RATIO * Math.max(med, 0.002)) cuts.push(offset + i / fps);
  }
  return cuts;
}

// Pure: scores of `windows` ([{ start, end }], seconds in the clip) from frame stats decoded from `offset` at `fps`.
function qsWindowScores(stats, fps, offset, windows, sceneCuts) {
  var sharpAll = stats.map(function (s) { return s.sharp; }).sort(function (a, b) { return a - b; });
  var sharpMed = sharpAll.length ? sharpAll[Math.floor(sharpAll.length / 2)] : 0;
  var out = [];
  for (var w = 0; w < windows.length; w++) {
    var a = windows[w].start, b = windows[w].end;
    var i0 = Math.max(0, Math.round((a - offset) * fps)), i1 = Math.min(stats.length, Math.round((b - offset) * fps));
    if (i1 <= i0) { out.push({ start: a, end: b, motion: 0, sharp: 0, luma: 0, clipped: 0, flags: { black: false, fade: false, flash: false, blur: false, dark: false, bright: false, cut: false }, empty: true }); continue; }
    var motion = 0, sharp = 0, luma = 0, clipped = 0, black = 0, flash = false, lmin = 1, lmax = 0, dark = 0, bright = 0, nd = 0;
    for (var i = i0; i < i1; i++) {
      var s = stats[i];
      if (i > i0) { motion += s.diff; nd++; }
      sharp += s.sharp; luma += s.luma; clipped += s.lo + s.hi;
      if (s.luma < QS_BLACK) black++;
      if (s.luma < QS_DARK) dark++;
      if (s.hi > QS_BRIGHT_SHARE) bright++;
      lmin = Math.min(lmin, s.luma); lmax = Math.max(lmax, s.luma);
      var p = stats[i - 1], q = stats[i + 1];
      if (p && q && s.luma - p.luma > QS_FLASH_JUMP && s.luma - q.luma > QS_FLASH_JUMP) flash = true;
    }
    var n = i1 - i0;
    motion = nd ? motion / nd : 0; sharp /= n; luma /= n; clipped /= n;
    // A fade: luma rises or falls steadily (at least 80 % of the steps one way) by at least 0.04 and 15 %. A pan or a
    // person walking keeps the mean luma about level; a fade's tail (70 to 100 % brightness) still counts.
    var up = 0, down = 0;
    for (var k = i0 + 1; k < i1; k++) { var dl = stats[k].luma - stats[k - 1].luma; if (dl > 0.003) up++; else if (dl < -0.003) down++; }
    var steps = Math.max(1, i1 - i0 - 1);
    var fade = steps >= 2 && Math.max(up, down) >= 0.8 * steps && lmax - lmin > 0.04 && lmax > 1.15 * Math.max(lmin, 0.01);
    // A cut in [a, b): informational per bin; pickWindowsLocal checks cuts against each whole window.
    var cut = (sceneCuts || []).some(function (t) { return t >= a - 1e-6 && t < b - 1e-6; });
    out.push({ start: a, end: b, motion: motion, sharp: sharp, luma: luma, clipped: clipped,
      flags: { black: black / n > 0.3, fade: fade, flash: flash, blur: sharpMed > 0 ? sharp < 0.45 * sharpMed && sharp < 0.02 : sharp < 0.01,
        dark: dark / n > 0.5, bright: bright / n > 0.5, cut: cut } });
  }
  return out;
}

// QS_BIN-second bins from QS_HEAD to the end of the scored span.
function qsBins(duration, head, span) {
  var end = Math.min(duration, head + span), bins = [];
  for (var t = head; t + QS_BIN <= end + 1e-6; t += QS_BIN) bins.push({ start: Math.round(t * 1000) / 1000, end: Math.round((t + QS_BIN) * 1000) / 1000 });
  return bins;
}
function qsFallback(resource, ms, windows) {
  var dur = Number(resource.durationSeconds) || 0;
  var ws = (windows && windows.length ? windows : qsBins(dur, Math.min(QS_HEAD, Math.max(0, dur - QS_BIN)), QS_SPAN)).map(function (x) {
    return { start: x.start, end: x.end, motion: 0, sharp: 0, luma: 0.5, clipped: 0, flags: { black: false, fade: false, flash: false, blur: false, dark: false, bright: false, cut: false } };
  });
  return { rid: resource.rid, windows: ws, sceneCuts: [], ms: ms || 0, fallback: true, cached: false, duration: dur };
}
function qsAbortError() { var e = new Error("cancelled"); e.name = "AbortError"; return e; }


function clipAnalysisIssue(code,message,cause){return Object.assign(Error(message),{code:'CLIP_ANALYSIS_'+code,publicMessage:message,...cause?{cause}:{}});}
function clipAnalysisResource(resource){
 if(!resource||typeof resource.rid!=='string'||!resource.rid||resource.rid.length>1024||typeof resource.path!=='string'||!resource.path||resource.path.length>8192||resource.path.includes('\0')||!Number.isFinite(resource.durationSeconds)||resource.durationSeconds<=0)throw clipAnalysisIssue('INPUT','The local video analysis input is invalid.');
 return {rid:resource.rid,path:resource.path,durationSeconds:resource.durationSeconds};
}
function clipAnalysisScope(opts){
 if(!opts||typeof opts!=='object'||Array.isArray(opts)||typeof opts.dataDir!=='string'||!opts.dataDir||opts.dataDir.length>8192||opts.dataDir.includes('\0')||opts.onProgress!==undefined&&typeof opts.onProgress!=='function'||opts.isCurrent!==undefined&&typeof opts.isCurrent!=='function'||opts.budgetMs!==undefined&&(!Number.isFinite(opts.budgetMs)||opts.budgetMs<0||opts.budgetMs>300000)||opts.deadline!==undefined&&!Number.isFinite(opts.deadline))throw clipAnalysisIssue('INPUT','The local video analysis scope is invalid.');
 const signal=opts.signal,isCurrent=opts.isCurrent||(()=>true);
 if(signal&&(typeof signal.aborted!=='boolean'||typeof signal.addEventListener!=='function'||typeof signal.removeEventListener!=='function'))throw clipAnalysisIssue('INPUT','The local video analysis cancellation signal is invalid.');
 return ()=>{if(signal?.aborted||!isCurrent())throw clipAnalysisIssue('STOPPED','Local video analysis ended before completion.');};
}
async function quickScore(resource,opts={}){
 const current=clipAnalysisScope(opts),input=clipAnalysisResource(resource);opts={...opts};current();
 const client=opts.client??(typeof hostSdk!=='undefined'?hostSdk:null),files=client?.files,media=client?.media,t0=Date.now(),fps=opts.fps??QS_FPS,dur=input.durationSeconds;
 if(!Number.isSafeInteger(fps)||fps<1||fps>60||typeof opts.dataDir!=='string'||!opts.dataDir||typeof files?.fingerprint!=='function')throw clipAnalysisIssue('UNSUPPORTED','Update Selects to verify original video contents before local analysis.');
 if(opts.windows!=null&&!Array.isArray(opts.windows))throw clipAnalysisIssue('INPUT','The local video analysis windows are invalid.');
 const ws=opts.windows==null?null:opts.windows.map(w=>({start:w?.start,end:w?.end}));
 if(ws&&(!Array.isArray(opts.windows)||!ws.length||ws.length>256||ws.some(w=>!Number.isFinite(w.start)||!Number.isFinite(w.end)||w.start<0||w.end<=w.start||w.end>dur)))throw clipAnalysisIssue('INPUT','The local video analysis windows are invalid.');
 const a=ws?Math.min(...ws.map(w=>w.start)):Math.min(QS_HEAD,Math.max(0,dur-QS_BIN)),b=ws?Math.max(...ws.map(w=>w.end)):Math.min(dur,a+QS_SPAN);
 if(b-a>QS_SPAN)throw clipAnalysisIssue('INPUT','The local video analysis span exceeds its limit.');
 const windows=ws||qsBins(dur,a,b-a),deadline=Math.min(t0+(opts.budgetMs??QS_BUDGET_MS),opts.deadline??Infinity);
 const hashFile=async path=>{current();const row=await files.fingerprint(path);current();if(!row||!Number.isSafeInteger(row.size)||row.size<1||typeof row.sha256!=='string'||!/^[a-f0-9]{64}$/.test(row.sha256))throw clipAnalysisIssue('SOURCE','The original video content could not be confirmed.');return row.sha256;};
 const source=await readAssetFileIdentity(files,input.path,hashFile,current);current();
 const observation={path:input.path,size:source.bytes,sha256:source.sha256};
 const fallback=()=>({...qsFallback(input,Date.now()-t0,windows),sourceObservation:observation});
 if(typeof media?.runFFmpeg!=='function'||Date.now()>=deadline)return fallback();
 const policy=[QS_VERSION,fps,QS_W,QS_H,QS_HEAD,QS_BIN,QS_SPAN,QS_BLACK,QS_DARK,QS_CLIP_LO,QS_CLIP_HI,QS_BRIGHT_SHARE,QS_FLASH_JUMP,QS_CUT_DIFF,QS_CUT_RATIO];
 const bytes=new TextEncoder().encode(JSON.stringify([input,source,policy,windows])),digest=await crypto.subtle.digest('SHA-256',bytes);current();
 const key=Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,'0')).join(''),directory=files.join(opts.dataDir,'quick-score-v3');
 const valid=result=>{
  if(!result||result.rid!==input.rid||result.duration!==dur||result.fallback!==false||result.cached!==false||!Number.isFinite(result.ms)||result.ms<0||!Array.isArray(result.windows)||result.windows.length!==windows.length||!Array.isArray(result.sceneCuts)||result.sceneCuts.length>Math.ceil((b-a)*fps)||result.sceneCuts.some(t=>!Number.isFinite(t)||t<a||t>b))return false;
  return result.windows.every((w,i)=>w&&w.start===windows[i].start&&w.end===windows[i].end&&['motion','sharp','luma','clipped'].every(k=>Number.isFinite(w[k])&&w[k]>=0&&w[k]<=1)&&w.flags&&Object.keys(w.flags).length===7&&['black','fade','flash','blur','dark','bright','cut'].every(k=>typeof w.flags[k]==='boolean')&&(w.empty===undefined||w.empty===true));
 };
 const read=async path=>{const bytes=await readBundledAssetBytes(files,path,262144,current);current();const result=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));if(!valid(result))throw clipAnalysisIssue('CACHE','The local analysis result does not match its original input and policy.');return result;};
 let result;
 try{
  const prepared=await prepareDerivedAsset(files,{directory,key,sourcePath:input.path,source,extension:'json',cleanupRequired:true,signal:opts.signal,isCurrent:()=>{current();return true;},hashFile,
   produce:async(snapshot,target)=>{
    const maximum=(Math.ceil((b-a)*fps)+2)*QS_W*QS_H;
    const frames=await readTransientAsset(client,{directory,extension:'gray',maxBytes:maximum,deadline,timeoutMs:Math.max(1,deadline-Date.now()),signal:opts.signal,isCurrent:()=>{current();return true;},
     produce:async({path,current:live})=>{live();await runAssetMediaTool(media,'runFFmpeg',['-hide_banner','-loglevel','error','-nostdin','-y','-ss',a.toFixed(3),'-t',(b-a).toFixed(3),'-i',snapshot,'-an','-vf','fps='+fps+',scale='+QS_W+':'+QS_H+',setsar=1,format=gray','-f','rawvideo',path],{signal:opts.signal,isCurrent:()=>{current();return true;},deadline,timeoutMs:Math.max(1,deadline-Date.now())});}});
    current();if(frames.length<QS_W*QS_H||frames.length%(QS_W*QS_H))throw bundledAssetIssue('MEDIA','A complete video preview could not be decoded.');
    const stats=qsFrameStats(frames,QS_W,QS_H),cuts=qsSceneCuts(stats,fps,a),score={rid:input.rid,windows:qsWindowScores(stats,fps,a,windows,cuts),sceneCuts:cuts,ms:0,fallback:false,cached:false,duration:dur};
    if(!valid(score))throw clipAnalysisIssue('RESULT','The decoded analysis result is invalid.');current();await files.writeFile(target,JSON.stringify(score));current();
   },verify:read});
  current();result={...await read(prepared.path),cached:prepared.reused,ms:Date.now()-t0,sourceObservation:observation};
 }catch(error){
  current();
  if(error?.terminal||!['BUNDLED_ASSET_MEDIA','BUNDLED_ASSET_PREPARE'].includes(error?.code))throw error;
  const after=await readAssetFileIdentity(files,input.path,hashFile,current);if(after.sha256!==source.sha256||after.bytes!==source.bytes)throw clipAnalysisIssue('SOURCE_CHANGED','The original video changed during local analysis. Reload the Project inputs.');
  return fallback();
 }
 current();return result;
}
async function quickScoreAll(resources,opts={}){
 const current=clipAnalysisScope(opts);opts={...opts};current();
 if(!Array.isArray(resources)||resources.length>256||new Set(resources.map(r=>r?.rid)).size!==resources.length)throw clipAnalysisIssue('INPUT','The local analysis selection is invalid.');
 if(opts.concurrency!==undefined&&(!Number.isSafeInteger(opts.concurrency)||opts.concurrency<1||opts.concurrency>3))throw clipAnalysisIssue('INPUT','The local analysis concurrency is invalid.');
 const inputs=resources.map(clipAnalysisResource),results=new Map(),total=inputs.length,deadline=Math.min(Date.now()+(opts.budgetMs??QS_BUDGET_MS),opts.deadline??Infinity),controller=new AbortController();
 const onAbort=()=>controller.abort();opts.signal?.addEventListener('abort',onAbort,{once:true});
 let next=0,done=0,failure;
 const worker=async()=>{try{while(next<total){current();const input=inputs[next++],score=await quickScore(input,{...opts,signal:controller.signal,deadline,budgetMs:Math.max(0,deadline-Date.now())});current();results.set(input.rid,score);done++;try{opts.onProgress?.({done,total,rid:input.rid});}catch{}current();}}catch(error){failure??=error;controller.abort();}};
 try{await Promise.all(Array.from({length:Math.min(3,Math.max(1,opts.concurrency??3),total||1)},worker));if(failure)throw failure;current();return results;}
 finally{opts.signal?.removeEventListener('abort',onAbort);}
}

// Pure: windows of `durationNeeded` seconds for `role`, best first (see the API above).
function pickWindowsLocal(scores, role, durationNeeded) {
  if (!scores || !scores.windows || !scores.windows.length) return [];
  var bins = scores.windows.filter(function (w) { return !w.empty; });
  var need = Math.max(QS_BIN, Number(durationNeeded) || QS_BIN), dur = Number(scores.duration) || 0;
  var sharpMax = Math.max.apply(null, bins.map(function (w) { return w.sharp; }).concat([1e-6]));
  var motions = bins.map(function (w) { return w.motion; }).sort(function (a, b) { return a - b; });
  var mRef = Math.max(0.01, motions[Math.floor(motions.length * 0.9)] || 0);
  var out = [], strict = [];
  for (var i = 0; i < bins.length; i++) {
    var start = bins[i].start;
    if (start < QS_HEAD - 1e-6 && dur >= need + QS_HEAD) continue;
    var j = i, end = start, group = [];
    while (j < bins.length && end - start < need - 1e-6) { if (group.length && Math.abs(bins[j].start - end) > 1e-3) break; group.push(bins[j]); end = bins[j].end; j++; }
    if (end - start < need - 1e-6) {
      // The last bins may be shorter than the window: accept when the clip itself reaches the end.
      if (dur && start + need <= dur + 1e-6 && group.length) end = start + need; else continue;
    }
    if (dur && start + need > dur + 1e-6) continue;
    var m = 0, sh = 0, lu = 0, bad = false, soft = 0;
    for (var g = 0; g < group.length; g++) {
      var x = group[g];
      m += x.motion; sh += x.sharp; lu += x.luma;
      if (x.flags.black || x.flags.fade || x.flags.flash) bad = true;
      if (x.flags.blur) soft += 0.3; if (x.flags.dark) soft += 0.2; if (x.flags.bright) soft += 0.2;
    }
    // A scene cut inside the window (not at its edges) would show two shots in one.
    var edge = 1 / QS_FPS, wend = start + need;
    if ((scores.sceneCuts || []).some(function (t) { return t > start + edge && t < wend - edge; })) bad = true;
    m /= group.length; sh /= group.length; lu /= group.length; soft /= group.length;
    var mr = Math.min(1, m / mRef);
    var moveTerm = role === "still" ? 1 - mr : role === "steady" ? 1 - Math.abs(mr - 0.35) : 0.4 + 0.6 * mr;
    var expose = Math.max(0, 1 - Math.abs(lu - 0.45) * 2);
    var score = Math.max(0, Math.min(1, 0.35 * (sh / sharpMax) + 0.3 * expose + 0.35 * moveTerm - soft));
    var cand = { start: start, end: start + need, score: Math.round(score * 1000) / 1000, motion: m, flags: { bad: bad, soft: soft > 0 } };
    (bad ? out : strict).push(cand);
  }
  var by = function (x, y) { return y.score - x.score || x.start - y.start; };
  strict.sort(by); out.sort(by);
  // Flagged windows only when nothing clean fits.
  return strict.length ? strict : out;
}

// Planner candidates (window centres) of a scored clip for `role`: at most `max`, at least `apart` seconds apart.
function qsCandidates(scores, role, durationNeeded, max, apart) {
  var picks = pickWindowsLocal(scores, role, durationNeeded), out = [];
  var gap = apart == null ? Math.max(1, durationNeeded) : apart;
  for (var i = 0; i < picks.length && out.length < (max || 6); i++) {
    var c = (picks[i].start + picks[i].end) / 2;
    if (out.some(function (o) { return Math.abs(o.t - c) < gap; })) continue;
    out.push({ t: Math.round(c * 1000) / 1000, score: picks[i].score, motion: picks[i].motion });
  }
  return out;
}

function clipAnalysisSources(results,expected=null){
 if(!Array.isArray(results)||results.length>256)throw clipAnalysisIssue('RESULT','The local analysis source observations are incomplete.');
 if(expected!==null&&(!Array.isArray(expected)||expected.some(row=>!row||typeof row.path!=='string'||!row.path||!Number.isSafeInteger(row.size)||row.size<1||typeof row.sha256!=='string'||!/^[a-f0-9]{64}$/.test(row.sha256))||new Set(expected.map(row=>row.path)).size!==expected.length))throw clipAnalysisIssue('INPUT','The expected local analysis sources are invalid.');
 const originals=expected===null?null:new Map(expected.map(row=>[row.path,row]));
 const seen=new Map();
 for(const result of results){
  const row=result?.scores?.sourceObservation;
  if(!row||typeof row.path!=='string'||!row.path||!Number.isSafeInteger(row.size)||row.size<1||typeof row.sha256!=='string'||!/^[a-f0-9]{64}$/.test(row.sha256))throw clipAnalysisIssue('RESULT','The local analysis source observation could not be confirmed.');
  if(originals){const before=originals.get(row.path);if(!before||before.size!==row.size||before.sha256!==row.sha256)throw clipAnalysisIssue('SOURCE_CHANGED','The analysis result belongs to different original video contents.');}
  const before=seen.get(row.path);if(before&&(before.size!==row.size||before.sha256!==row.sha256))throw clipAnalysisIssue('SOURCE_CHANGED','The original video changed between analysis observations.');
  seen.set(row.path,{path:row.path,size:row.size,sha256:row.sha256});
 }
 return [...seen.values()];
}
