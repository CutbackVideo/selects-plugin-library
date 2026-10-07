// @name Travel Beat Vlog
// @name:de Travel Beat Vlog
// @name:en Travel Beat Vlog
// @name:es Travel Beat Vlog
// @name:fr Travel Beat Vlog
// @name:it Travel Beat Vlog
// @name:ja Travel Beat Vlog
// @name:ko Travel Beat Vlog
// @name:pt Travel Beat Vlog
// @name:tr Travel Beat Vlog
// @name:zh Travel Beat Vlog
// @collection visual-highlights
// @icon video
import React from 'react';

// @operation-start
// The format's plan, the song fitting, the colour statistics and the finishing step, as pure code (no host
// calls). A `...Source` export is a function kept as source text: run_script or the Web Worker receives exactly
// the code written here. tests/travel_beat_vlog.test.mjs loads everything between the two marker lines.
// Measured frame by frame from the reference (30 fps, 468 frames, 9:16). V1-V26 are
// the user's videos in order; H is the hero photo. Montage 2 reuses V1-V9 (V6 and V7
// continue after their montage-1 part) and adds V24 and V25.
// The fade is linear from frame 449.45 to 463.7 (least-squares fit to the reference's per-frame fade level, rms 0.01)
// onto the reference's near-black, which holds to the end. Export turns this CSS colour into (4.4,3.6,2.0) against the
// reference's (5.5,4.2,3.6); 8-bit video steps near black allow no closer match (rgb(8,6,6) gives blue +3.2).
const END_COLOR='rgb(8,6,5)';
// A timing table, in 30 fps frames: m1/m2 are the montage cuts (last = the next shot's start: hero / video 26),
// g1/g2 the grid panel entries, v12-v23 the long and short shots, then the fade and the end. songAnalysis builds one
// per song; this is the reference's own.
export const REFERENCE_TIMING={durationFrames:468,m1:[12,16,19,22,25,28,32,35,38,42,48,55],g1:[149,153,158,163],g2:[229,233,237,242],
 m2:[364,368,374,379,384,390,395,400,405,410,416,424],v12:102,v17:182,v22:263,v23:343,fadeStart:449.45,fadeEnd:463.7,clipEnd:465,title:[62,102]};
const M2_SLOTS=['V1','V2','V3','V4','V5','V6','V7','V8','V9','V24','V25'];
export const VIDEO_SLOTS=Array.from({length:26},(_,i)=>'V'+(i+1));

export function validateTiming(t){
 const int=(v,l)=>{if(!Number.isSafeInteger(v)||v<0)throw Error('Timing: '+l+' must be a frame number');return v;};
 const list=(v,n,l)=>{if(!Array.isArray(v)||v.length!==n)throw Error('Timing: '+l+' needs '+n+' frames');v.forEach((x,i)=>int(x,l+'['+i+']'));return v;};
 if(!t||typeof t!=='object')throw Error('Timing is missing');
 const m1=list(t.m1,12,'m1'),m2=list(t.m2,12,'m2'),g1=list(t.g1,4,'g1'),g2=list(t.g2,4,'g2'),title=list(t.title,2,'title');
 const order=[...m1,int(t.v12,'v12'),int(t.v17,'v17'),int(t.v22,'v22'),int(t.v23,'v23'),...m2,int(t.clipEnd,'clipEnd'),int(t.durationFrames,'durationFrames')];
 for(let i=1;i<order.length;i++)if(order[i]-order[i-1]<2)throw Error('Timing: shots must be at least 2 frames long');
 for(const [g,a,z,l] of [[g1,t.v12,t.v17,'grid 1'],[g2,t.v17,t.v22,'grid 2']])if(g.some((v,i)=>v<=a||v>=z||(i&&v-g[i-1]<2)))throw Error('Timing: '+l+' must fall inside its long shot');
 if(m1[0]<1||t.durationFrames>900)throw Error('Timing: the vlog must start after frame 0 and last at most 30 s');
 if(!(t.fadeStart<t.fadeEnd&&t.fadeEnd<=t.durationFrames&&t.fadeStart>m2[11]))throw Error('Timing: the fade must sit in the last shot');
 if(title[0]<=m1[11]||title[1]!==t.v12)throw Error('Timing: the title runs over the hero photo');
 return t;
}

export function segments(t=REFERENCE_TIMING){
 const s=[];
 t.m1.slice(0,-1).forEach((a,i)=>s.push({slot:'V'+(i+1),start:a,end:t.m1[i+1],quad:'full'}));
 s.push({slot:'H',start:t.m1[11],end:t.v12,quad:'full',image:true});
 s.push({slot:'V12',start:t.v12,end:t.v17,quad:'full'});
 ['V13','V14','V15','V16'].forEach((slot,i)=>s.push({slot,start:t.g1[i],end:t.v17,quad:['TL','TR','BL','BR'][i]}));
 s.push({slot:'V17',start:t.v17,end:t.v22,quad:'full'});
 ['V18','V19','V20','V21'].forEach((slot,i)=>s.push({slot,start:t.g2[i],end:t.v22,quad:['TL','TR','BL','BR'][i]}));
 s.push({slot:'V22',start:t.v22,end:t.v23,quad:'full'});
 s.push({slot:'V23',start:t.v23,end:t.m2[0],quad:'full'});
 t.m2.slice(0,-1).forEach((a,i)=>{const slot=M2_SLOTS[i],first=s.find(x=>x.slot===slot);
  // V6 and V7 pick up where their montage-1 part ended; the others restart from the same in-point.
  s.push({slot,start:a,end:t.m2[i+1],quad:'full',inRef:(slot==='V6'||slot==='V7')?first.end-first.start:0});});
 s.push({slot:'V26',start:t.m2[11],end:t.clipEnd,quad:'full',fade:[t.fadeStart,t.fadeEnd]});
 return s;
}
export const SEGMENTS=segments();

export function scenePlan(fps=30,timing=REFERENCE_TIMING){
 if(!Number.isFinite(fps)||fps<10||fps>120)throw Error('Unsupported Draft frame rate');
 const t=validateTiming(timing),at=f=>Math.round(f*fps/30);
 return {fps,canvas:{width:1080,height:1920},durationFrames:at(t.durationFrames),
  clips:segments(t).map((s,i)=>({index:i,slot:s.slot,image:!!s.image,quad:s.quad,refStart:s.start,startFrame:at(s.start),endFrame:at(s.end),
   inSeconds:(s.inRef||0)/30,fade:s.fade?{startFrame:at(s.fade[0]),endFrame:at(s.fade[1]),startSeconds:s.fade[0]/30,endSeconds:s.fade[1]/30}:null})),
  title:{startFrame:at(t.title[0]),endFrame:at(t.title[1])},blackTail:at(t.fadeEnd),endColor:END_COLOR};
}

// Longest source span each video slot needs (in-point + longest use), in seconds.
export function slotNeeds(timing=REFERENCE_TIMING){
 const need={};
 for(const s of segments(validateTiming(timing)))if(!s.image)need[s.slot]=Math.max(need[s.slot]||0,((s.inRef||0)+s.end-s.start)/30);
 return need;
}

// The longest source span (seconds) the template promises for its inputs: the long shots (V12, V17, V22) and the
// 23 clips. A song's timing never asks for more: if a montage would, its cuts are spread evenly instead.
export const LIMITS={long:3.6,clip:2.0};
const LONG=['V12','V17','V22'];
export function withinLimits(timing){
 const over=t=>Object.entries(slotNeeds(t)).some(([s,v])=>v>(LONG.includes(s)?LIMITS.long:LIMITS.clip)+1e-9);
 if(!over(timing))return timing;
 const even=c=>[...Array.from({length:11},(_,i)=>Math.round(c[0]+(c[11]-c[0])*i/11)),c[11]];
 const t={...timing,m1:even(timing.m1),m2:even(timing.m2)};
 if(over(t))throw Error('This song is too slow for the format; pick a song with a faster beat.');
 return t;
}

// Per-slot colour transfer. Target: the reference clip's per-channel mean/std in that
// slot. Source: the user's clip over the frames the slot uses. Gains are clamped so an
// unusual clip is nudged, not wrecked.
export function colorTransfer(target,source,strength=1){
 return [0,1,2].map(c=>{
  const g=Math.max(0.6,Math.min(1.6,target.std[c]/Math.max(0.02,source.std[c])));
  const o=Math.max(-0.35,Math.min(0.35,target.mean[c]-g*source.mean[c]));
  return {gain:+(1+(g-1)*strength).toFixed(4),offset:+(o*strength).toFixed(4)};
 });
}

// A clip's colour: ffmpeg writes 64-px-wide rgb24 frames (6 per second over the span the slot uses; a still once) to
// `out`, and rgbStats turns the bytes into per-channel mean and spread.
export function measureArgs(file,inSeconds,seconds,out){
 const still=/\.(jpe?g|png|heic|webp|tiff?)$/i.test(file);
 return still?['-nostdin','-v','error','-y','-i',file,'-frames:v','1','-vf','scale=64:-2','-f','rawvideo','-pix_fmt','rgb24',out]
  :['-nostdin','-v','error','-y','-ss',String(inSeconds),'-t',String(Math.max(0.1,seconds)),'-i',file,'-vf','fps=6,scale=64:-2','-f','rawvideo','-pix_fmt','rgb24',out];
}
export function rgbStats(raw,name){
 const n=raw.length/3; if(!n)throw Error('Could not read frames from '+name);
 const sum=[0,0,0],sq=[0,0,0];
 for(let i=0;i<raw.length;i+=3)for(let c=0;c<3;c++){const v=raw[i+c]/255;sum[c]+=v;sq[c]+=v*v;}
 const mean=sum.map(s=>s/n);
 return {mean,std:sq.map((s,c)=>Math.sqrt(Math.max(0,s/n-mean[c]*mean[c])))};
}
// Fits the Travel Beat Vlog format to a song the user brings. The reference cuts on a ~90 BPM beat and on a
// drum roll (hits 0.10-0.13 s apart) at the first montage; this finds the song's tempo, beat grid and rolls, picks
// the window whose first montage starts on the longest roll, and returns a timing table in 30 fps frames:
// montage and grid cuts on the song's own hits, section cuts on its beat grid.
export const songAnalysisSource=String.raw`function songAnalysis(){
const SR=22050,HOP=110,N=1024,FPS=SR/HOP;
const REF_BEAT=30*60/89.4;                          // reference frames per beat (89.4 BPM at 30 fps)
const b=f=>(f-102)/REF_BEAT;                        // reference frame -> beats from the plane cut (frame 102)
const REF={m1:[12,16,19,22,25,28,32,35,38,42,48],g1:[149,153,158,163],g2:[229,233,237,242],m2:[364,368,374,379,384,390,395,400,405,410,416]};

// --- signal ------------------------------------------------------------------------------------------
function fft(re,im){  // in-place radix-2
 const n=re.length;
 for(let i=1,j=0;i<n;i++){let bit=n>>1;for(;j&bit;bit>>=1)j^=bit;j^=bit;if(i<j){[re[i],re[j]]=[re[j],re[i]];[im[i],im[j]]=[im[j],im[i]];}}
 for(let len=2;len<=n;len<<=1){const a=-2*Math.PI/len,wr=Math.cos(a),wi=Math.sin(a);
  for(let i=0;i<n;i+=len){let cr=1,ci=0;for(let k=0;k<len/2;k++){const p=i+k,q=p+len/2,tr=re[q]*cr-im[q]*ci,ti=re[q]*ci+im[q]*cr;re[q]=re[p]-tr;im[q]=im[p]-ti;re[p]+=tr;im[p]+=ti;const nr=cr*wr-ci*wi;ci=cr*wi+ci*wr;cr=nr;}}}
}
const hann=n=>Float64Array.from({length:n},(_,i)=>0.5-0.5*Math.cos(2*Math.PI*i/(n-1)));
function spectrum(x,start,n,win,re,im){for(let i=0;i<n;i++){re[i]=(x[start+i]||0)*win[i];im[i]=0;}fft(re,im);const m=new Float64Array(n/2+1);for(let i=0;i<=n/2;i++)m[i]=Math.hypot(re[i],im[i]);return m;}
// Positive log-spectral flux per hop in three bands; index k is centred at (k*HOP+N/2)/SR seconds.
function flux(x){
 const frames=Math.max(0,Math.floor((x.length-N)/HOP)+1),w=hann(N),re=new Float64Array(N),im=new Float64Array(N);
 const bin=hz=>Math.round(hz*N/SR),bands={low:[bin(30),bin(150)],mid:[bin(300),bin(3000)],hi:[bin(6000),bin(11000)]};
 const out={low:new Float64Array(frames),mid:new Float64Array(frames),hi:new Float64Array(frames)};let prev=null;
 for(let k=0;k<frames;k++){
  const m=spectrum(x,k*HOP,N,w,re,im);for(let i=0;i<m.length;i++)m[i]=Math.log1p(20*m[i]);
  if(prev)for(const [name,[a,c]] of Object.entries(bands)){let s=0;for(let i=a;i<c;i++){const d=m[i]-prev[i];if(d>0)s+=d;}out[name][k]=s;}
  prev=m;
 }
 return out;
}
const mean=a=>a.reduce((s,v)=>s+v,0)/a.length;
const std=a=>{const m=mean(a);return Math.sqrt(a.reduce((s,v)=>s+(v-m)*(v-m),0)/a.length)||1;};
function median(arr){const s=Float64Array.from(arr).sort();const n=s.length;return n%2?s[(n-1)/2]:(s[n/2-1]+s[n/2])/2;}
// Hits: local maxima of the mid-band flux whose height above the +-150 ms median exceeds prom standard deviations.
function hits(mid,prom=1.2){
 const m=mean(mid),sd=std(mid),z=Array.from(mid,v=>(v-m)/sd),w=Math.round(0.15*FPS),t=[],p=[];
 for(let k=2;k<z.length-2;k++){
  if(z[k]<Math.max(z[k-2],z[k-1],z[k+1],z[k+2]))continue;
  const base=median(z.slice(Math.max(0,k-w),k+w+1));
  if(z[k]-base>prom){t.push((k*HOP+N/2)/SR);p.push(z[k]-base);}
 }
 return {t,p};
}
// Rolls: >= minLen hits each 0.085-0.145 s after the previous (faster than 16ths at ~90 BPM).
function rolls(t,minLen=5,lo=0.085,hi=0.145){
 const out=[];let cur=t.length?[0]:[];
 const close=()=>{if(cur.length>=minLen)out.push({start:t[cur[0]],end:t[cur.at(-1)],count:cur.length});};
 for(let i=1;i<t.length;i++){const g=t[i]-t[i-1];if(g>=lo&&g<=hi)cur.push(i);else{close();cur=[i];}}
 close();return out;
}
// Tempo from the full-band flux, scored with its 2x and 4x lags so the beat (not a triplet or dotted level) wins;
// 75-200 BPM, folded to half time above 150 (the format counts ~90 BPM beats). Phase from the kick band.
function beatGrid(f){
 const full=Float64Array.from(f.mid,(v,i)=>v+f.hi[i]+f.low[i]),n=full.length,W=Math.round(FPS);
 const o=new Float64Array(n);let run=0;const pre=new Float64Array(n+1);for(let i=0;i<n;i++)pre[i+1]=pre[i]+full[i];
 for(let i=0;i<n;i++){const a=Math.max(0,i-Math.floor(W/2)),c=Math.min(n,a+W);o[i]=Math.max(0,full[i]-(pre[c]-pre[a])/W);}
 const ac=lag=>{if(lag>=n)return 0;let s=0;for(let i=0;i+lag<n;i++)s+=o[i]*o[i+lag];return s;},ac0=ac(0)||1;
 let best=-1e9,K=0;
 for(let k=Math.round(0.30*FPS);k<Math.round(0.80*FPS);k++){const s=(ac(k)+0.5*ac(2*k)+0.25*ac(4*k))/ac0;if(s>best){best=s;K=k;}}
 let P=K/FPS;if(60/P>150)P*=2;
 let ph=0,bv=-1;
 for(let p=0;p<P;p+=0.005){let s=0,c=0;for(let t=p;t<n/FPS;t+=P){const i=Math.round(t*FPS-N/2/HOP);if(i>=0&&i<n){s+=f.low[i];c++;}}if(c&&s/c>bv){bv=s/c;ph=p;}}
 return {P,phase:ph,bpm:60/P};
}
function chromaAt(x,t,re,im,w){
 const n=4096,i=Math.round(t*SR);if(i+n>x.length)return null;const m=spectrum(x,i,n,w,re,im),c=new Float64Array(12);
 for(let k=1;k<m.length;k++){const hz=k*SR/n;if(hz<80||hz>=2000)continue;c[((Math.round(12*Math.log2(hz/261.63))%12)+12)%12]+=m[k];}
 const s=c.reduce((a,v)=>a+v,0)||1;return c.map(v=>v/s);
}
function timbreBlocks(x){  // spectral centroid and flatness per 2048-sample block
 const n=2048,w=hann(n),re=new Float64Array(n),im=new Float64Array(n),out=[];
 for(let i=0;i+n<=x.length;i+=n){const m=spectrum(x,i,n,w,re,im);let s=0,sf=0,lg=0;for(let k=0;k<m.length;k++){const v=m[k]+1e-9;s+=v;sf+=v*k*SR/n;lg+=Math.log(v);}out.push([sf/s,Math.exp(lg/m.length)/(s/m.length)]);}
 return out;
}
// n hits in [a,c). Hits within 2 frames of a stronger one are dropped first (one drum stroke can peak twice).
// inOrder keeps the earliest n, so montage 1 rides the roll steadily and only its last shots stretch, like the
// reference; otherwise the strongest n are kept.
function pickHits(h,a,c,n,inOrder=false){
 const idx=[];for(let i=0;i<h.t.length;i++)if(h.t[i]>=a&&h.t[i]<c)idx.push(i);
 const kept=[];
 for(const i of idx.sort((i,j)=>h.p[j]-h.p[i]))if(kept.every(t=>Math.abs(h.t[i]-t)>=2/30))kept.push(h.t[i]);
 return (inOrder?kept.sort((u,v)=>u-v).slice(0,n):kept.slice(0,n)).sort((u,v)=>u-v);
}

// --- window choice -----------------------------------------------------------------------------------
function analyseSamples(x){
 const dur=x.length/SR,f=flux(x),h=hits(f.mid),R=rolls(h.t),grid=beatGrid(f),P=grid.P;
 const K=(2*grid.bpm/89.4)>=2.5?1.5:1;
 const beats=[];for(let t=grid.phase;t<dur;t+=P)beats.push(t);
 const w=hann(4096),re=new Float64Array(4096),im=new Float64Array(4096);
 const ch=beats.map(t=>chromaAt(x,t,re,im,w));
 const nov=ch.map((c,i)=>i&&c&&ch[i-1]?c.reduce((s,v,j)=>s+Math.abs(v-ch[i-1][j]),0):0);
 const phase=[0,1,2,3].map(k=>{const v=nov.filter((_,i)=>i%4===k);return mean(v.length?v:[0]);}).reduce((bi,v,i,a)=>v>a[bi]?i:bi,0);
 const tb=timbreBlocks(x),blk=2048/SR;
 // A section cut on a hit when one is within an eighth of a beat of its half-beat grid point, else the grid point.
 const onHit=(D,t)=>{const g=D+Math.round((t-D)/(P/2))*(P/2);let best=null;for(let i=0;i<h.t.length;i++)if(Math.abs(h.t[i]-g)<=P/8&&(best===null||Math.abs(h.t[i]-g)<Math.abs(h.t[best]-g)))best=i;return best===null?g:h.t[best];};
 const rows=[];
 for(let n=0;n<beats.length;n++){
  const D=beats[n],T=fr=>D+K*b(fr)*P,start=T(12)-P/2,end=T(468);
  if(T(12)<0.1||end>dur-0.2)continue;
  const first=pickHits(h,start,T(55)-P/8,11)[0],m1=first===undefined?[]:pickHits(h,first,T(55)-P/8,11,true);   // opens where the strongest hits beginif(!m1.length)continue;
  const m2=pickHits(h,T(364)-P/4,T(424)-P/8,11),g1=pickHits(h,T(147),T(182)-P/8,4),g2=pickHits(h,T(227),T(263)-P/8,4);
  const cuts=Math.min(11,m1.length)+Math.min(11,m2.length)+Math.min(4,g1.length)+Math.min(4,g2.length);
  const roll=Math.max(0,...R.filter(r=>Math.abs(r.start-T(12))<=P/2).map(r=>r.count));
  const ba=Math.floor(m1[0]/blk),bc=Math.min(tb.length,Math.floor(end/blk));
  const seg=tb.slice(ba,bc),cen=mean(seg.map(v=>v[0])),flat=mean(seg.map(v=>v[1]));
  rows.push({D,roll,cuts,downbeat:(n-phase)%4===0?1:0,timbre:Math.abs(cen-3169)/3169+Math.abs(flat-0.419)/0.419,m1,m2,g1,g2,snap:Object.fromEntries([['hero',55],['v12',102],['v17',182],['v22',263],['v23',343],['v26',424]].map(([k,f])=>[k,onHit(D,T(f))]))});
 }
 // A roll at the montage-1 start (as in the reference) outranks everything; then hits under cuts, downbeat, timbre.
 rows.sort((r,s)=>Math.min(s.roll,12)-Math.min(r.roll,12)||s.cuts-r.cuts||s.downbeat-r.downbeat||r.timbre-s.timbre);
 if(!rows.length)throw Error('The song is too short: it needs about 17 s of music.');
 return {bpm:grid.bpm,P,K,duration:dur,window:rows[0]};
}

// --- timing table ------------------------------------------------------------------------------------
function fill(cuts,a,c,n,D,P){
 cuts=[...cuts].sort((u,v)=>u-v);const g=P/4;
 for(let t=D+Math.ceil((a-D)/g)*g;cuts.length<n&&t<c;t+=g)if(cuts.every(x=>Math.abs(t-x)>=2/30))cuts=[...cuts,t].sort((u,v)=>u-v);
 while(cuts.length<n){const ends=[...cuts,c];let gi=0,gap=-1;for(let i=0;i<cuts.length;i++)if(ends[i+1]-ends[i]>gap){gap=ends[i+1]-ends[i];gi=i;}if(gap<4/30)break;cuts=[...cuts,cuts[gi]+gap/2].sort((u,v)=>u-v);}
 return cuts.slice(0,n);
}
const evenly=(a,c,n)=>Array.from({length:n},(_,i)=>a+(c-a)*i/n);
// cuts: 'hits' puts montage and grid cuts on the song's hits; 'reference' keeps the reference rhythm on the song's beat.
function timingFrom(fit,cuts='hits'){
 const {P,K}=fit,w=fit.window,D=w.D,T=f=>D+K*b(f)*P,half=t=>D+Math.round((t-D)/(P/2))*(P/2);
 const fromRef=list=>list.map(T);
 let m1,m2,g1,g2;
 if(cuts==='reference'||w.m1.length<6){m1=fromRef(REF.m1);m2=fromRef(REF.m2);g1=fromRef(REF.g1);g2=fromRef(REF.g2);if(cuts!=='reference')m1[0]=w.m1[0];}
 else{m1=fill(w.m1,w.m1[0],T(55)-P/8,11,D,P);m2=fill(w.m2,T(364)-P/4,T(424)-P/8,11,D,P);g1=fill(w.g1,T(147),T(182)-P/8,4,D,P);g2=fill(w.g2,T(227),T(263)-P/8,4,D,P);}
 const t0=m1[0]-0.4,fr=t=>Math.round((t-t0)*30);
 const t={m1:m1.map(fr),g1:g1.map(fr),g2:g2.map(fr),m2:m2.map(fr)};
 t.hero=Math.max(fr(w.snap?.hero??half(T(55))),t.m1.at(-1)+2);t.m1.push(t.hero);
 const sec=(k,f)=>fr(w.snap?.[k]??half(T(f)));t.v12=sec('v12',102);t.v17=sec('v17',182);t.v22=sec('v22',263);t.v23=sec('v23',343);
 t.v26=Math.max(fr(w.snap?.v26??half(T(424))),t.m2.at(-1)+2);t.m2.push(t.v26);
 t.fadeStart=+((T(449.45)-t0)*30).toFixed(2);t.fadeEnd=+((T(463.7)-t0)*30).toFixed(2);
 t.clipEnd=fr(T(465));t.durationFrames=fr(T(468));t.title=[t.hero+7,t.v12];
 const timing={durationFrames:t.durationFrames,m1:t.m1,g1:t.g1,g2:t.g2,m2:t.m2,v12:t.v12,v17:t.v17,v22:t.v22,v23:t.v23,fadeStart:t.fadeStart,fadeEnd:t.fadeEnd,clipEnd:t.clipEnd,title:t.title};
 return timing;
}
return {SR,analyseSamples,timingFrom,flux,hits,rolls,beatGrid};
}`;
// The song as mono 32-bit float samples at the analysis rate (the same ffmpeg arguments analyze.mjs used, written to
// `out` instead of a pipe; 22050 Hz is songAnalysis's SR).
// Sample i is at file time i/SR: AAC's first decoded frame can start after 0 (encoder delay, 48 ms on an iTunes m4a),
// and raw output would drop that gap, putting every hit early against the ffmpeg cut in arrangeSong.
export function songDecodeArgs(file,out,maxSeconds=900){
 return ['-nostdin','-v','error','-y','-i',file,'-t',String(maxSeconds),'-vn','-af','aresample=async=1:first_pts=0','-ac','1','-ar','22050','-f','f32le',out];
}
// The window of the song as the Draft's music: silence until the first cut (0.4 s, like the reference), the song
// from its first montage hit, the reference's fade, padded past the Draft so the overlay never runs out.
export function songArrangeArgs(song,start,timing,out){
 const L=timing.durationFrames/30,fs0=timing.fadeStart/30,fe=timing.fadeEnd/30;
 return ['-nostdin','-v','error','-y','-i',song,'-af',
  `atrim=start=${start}:duration=${L},asetpts=PTS-STARTPTS,adelay=400|400,asetpts=N/SR/TB,atrim=0:${L},afade=t=out:st=${fs0}:d=${Math.max(0.05,fe-fs0)},apad=whole_dur=${L+0.6}`,'-ar','48000','-ac','2',out];
}
// What names an arranged song file: the song (path, size, change time), where it starts and the timing table.
export function songKeyText(song,size,mtimeMs,start,timing){return [song,size,mtimeMs,start.toFixed(3),JSON.stringify(timing)].join('|');}
// The Web Worker that runs songAnalysis off the panel's thread: samples and the cuts option in, the fit and its timing out.
export function songWorkerSource(){
 return '"use strict";\nvar songMath=('+songAnalysisSource+')();\n'
  +'onmessage=function(e){try{var fit=songMath.analyseSamples(e.data.samples);postMessage({ok:{fit:fit,timing:songMath.timingFrom(fit,e.data.cuts)}});}'
  +'catch(err){postMessage({error:String((err&&err.message)||err)});}};\n';
}

// Crop to the slot (cover, editable focus), colour transfer through an SVG matrix, and the
// closing fade on the last clip onto the ending colour, sampled by timeline time.
const CLIP_CODE=`import {useCurrentFrame} from 'remotion';
export default function TravelClip({Source,data}) {
 const g=data.g,frame=useCurrentFrame(),t=(frame+data.startFrame)/data.fps;
 const x=Math.max(g.mw-g.w,Math.min(0,g.mw/2-data.focusX*g.w));
 const y=Math.max(g.mh-g.h,Math.min(0,g.mh/2-data.focusY*g.h));
 const k=data.fade?Math.max(0,Math.min(1,(data.fade[1]-t)/(data.fade[1]-data.fade[0]))):1;
 const m=data.grade;
 const id='tbv'+data.id;
 const values=m?[m[0].gain,0,0,0,m[0].offset,0,m[1].gain,0,0,m[1].offset,0,0,m[2].gain,0,m[2].offset,0,0,0,1,0].join(' '):null;
 return <div style={{position:'absolute',inset:0,background:data.fade?data.fadeTo:'transparent'}}><div style={{position:'absolute',inset:0,opacity:k}}>{m&&<svg width="0" height="0" style={{position:'absolute'}}><filter id={id} colorInterpolationFilters="sRGB"><feColorMatrix type="matrix" values={values}/></filter></svg>}<div style={{position:'absolute',left:g.left,top:g.top,width:g.mw,height:g.mh,overflow:'hidden',filter:m?'url(#'+id+')':'none'}}><div style={{position:'absolute',left:x,top:y,width:g.w,height:g.h}}><Source /></div></div></div></div>;
}`;

// Title sized and placed as measured (glyph box 248x108 of 432x768, centred at 215.5, 369.5),
// calibrated on an export: Impact squeezed to the reference's 2.3:1 word shape.
const TITLE_CODE=`export default function TravelTitle({data}) {
 return <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center'}}><div style={{position:'absolute',left:(data.cx-data.w/2)*100+'%',top:(data.cy-data.h/2)*100+'%',width:data.w*100+'%',height:data.h*100+'%',display:'flex',alignItems:'center',justifyContent:'center',overflow:'visible'}}><span style={{fontFamily:data.fontFamily||'Impact',fontSize:data.h*1920*1.2+'px',lineHeight:1,color:data.color,whiteSpace:'nowrap',display:'inline-block',transform:'scaleX('+data.squeeze+')',letterSpacing:0}}>{data.text}</span></div></div>;
}`;

const BLACK_CODE=`export default function EndingBlack({data}){ return <div style={{position:'absolute',inset:0,background:data.color}}/>; }`;

export function normalizeFinish(raw){
 const keys=['mode','projectId','draftId','fps','videos','hero','placements','framing','grades','songResourceId','title','timing'];
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||Object.keys(raw).some(k=>!keys.includes(k))||raw.mode!=='finish')throw Error('Unsupported request');
 const clean=(v,l,max=1000)=>{if(typeof v!=='string'||!v.trim()||v!==v.trim()||v.length>max||/[\u0000-\u001f]/u.test(v))throw Error(l+' is required');return v;};
 const timing=validateTiming(raw.timing),plan=scenePlan(raw.fps??30,timing);
 const media=m=>{if(!m||typeof m!=='object'||!Number.isSafeInteger(m.width)||m.width<1||!Number.isSafeInteger(m.height)||m.height<1)throw Error('Invalid media size');return {resourceId:clean(m.resourceId,'Resource ID'),width:m.width,height:m.height};};
 if(!raw.videos||typeof raw.videos!=='object')throw Error('Choose 26 videos');
 const videos={};for(const s of VIDEO_SLOTS){if(!raw.videos[s])throw Error('Choose a video for '+s);videos[s]=media(raw.videos[s]);}
 const hero=media(raw.hero);
 const title={text:String(raw.title?.text??'TRAVEL').slice(0,40),color:/^#[0-9a-fA-F]{6}$/.test(raw.title?.color||'')?raw.title.color:'#F4C711'};
 if(!Array.isArray(raw.placements)||raw.placements.length!==1||raw.placements.some(p=>!p||!Number.isSafeInteger(p.clipId)||typeof p.trackId!=='string'))throw Error('Expected the hero photo clip');
 const grades=raw.grades&&typeof raw.grades==='object'?raw.grades:{};
 // Every key present (null = centred) so the generated TypeScript never reads a missing property.
 const framing=Object.fromEntries([...VIDEO_SLOTS,'H'].map(k=>{const f=raw.framing?.[k];return [k,f&&Number.isFinite(f.x)&&Number.isFinite(f.y)?{x:Math.min(1,Math.max(0,f.x)),y:Math.min(1,Math.max(0,f.y))}:null];}));
 return {projectId:clean(raw.projectId,'Project ID'),draftId:clean(raw.draftId,'Draft ID',120),fps:plan.fps,videos,hero,title,grades,framing,songResourceId:clean(raw.songResourceId,'Song Resource ID'),timing,placements:raw.placements.map(p=>({clipId:p.clipId,trackId:p.trackId}))};
}

export const authorFinishSource=String.raw`async function authorFinish(selects,input,plan,CLIP_CODE,TITLE_CODE,BLACK_CODE){
 let commitStarted=false,stage='read';
 try{
  const project=selects.project(input.projectId),d=selects.draft(input.draftId);
  if(!(await project.meta()).draftIds?.includes(input.draftId))throw Error('Draft is not in the selected Project');
  const meta=await d.meta();
  if(meta.fps!==plan.fps||meta.durationFrames!==plan.durationFrames||meta.frameSize?.width!==1080||meta.frameSize?.height!==1920)throw Error('Draft frame grid changed');
  const types=new Map((await project.resources()).map(r=>[r.resourceId,r.type]));
  for(const s of Object.keys(input.videos))if(types.get(input.videos[s].resourceId)!=='Video')throw Error(s+' is not a Video resource');
  if(types.get(input.songResourceId)!=='Audio')throw Error('The song is not an Audio resource');
  const W=1080,H=1920;
  const rectOf=quad=>quad==='full'?{x:0,y:0,width:W,height:H}:{x:(quad[1]==='R'?W/2:0),y:(quad[0]==='B'?H/2:0),width:W/2,height:H/2};
  const shape=(media,rect)=>{const w=media.width,h=media.height,q=Math.min(w/rect.width,h/rect.height),c=Math.min(W/w,H/h);
   return {g:{w,h,mw:rect.width*q,mh:rect.height*q,left:(w-rect.width*q)/2,top:(h-rect.height*q)/2},scale:1/(q*c),position:{x:(rect.x+rect.width/2-W/2)/H*100,y:(H/2-rect.y-rect.height/2)/H*100}};};
  const style=async(clip,media,rect,params,label)=>{
   const s=shape(media,rect);
   await d.setClipTransform({clip,enabled:true,scale:{x:s.scale,y:s.scale},position:s.position,anchor:{x:0,y:0},rotation:0});
   const cur=(await d.clips({trackScope:'all'})).find(c=>c.clipId===clip.clipId&&c.trackId===clip.trackId);
   const f=params.focus||{x:.5,y:.5};
   await d.addVideoEffect({clip:cur,label,tsxCode:CLIP_CODE,parameters:{...params,g:s.g,fps:plan.fps,focusX:f.x,focusY:f.y},editableParameters:[{key:'focusX',label:'Horizontal focus',type:'number',defaultValue:f.x,min:0,max:1,step:.01},{key:'focusY',label:'Vertical focus',type:'number',defaultValue:f.y,min:0,max:1,step:.01}]});
  };
  const quadName=q=>q==='full'?'full':q;
  let n=0;
  for(const c of plan.clips){
   if(c.image)continue;
   stage='place '+c.slot+' at '+c.startFrame;
   const v=input.videos[c.slot];
   const before=new Set((await d.clips({trackScope:'all'})).map(r=>r.clipId+':'+r.trackId));
   await d.overlayResource({resource:project.resource(v.resourceId),over:await d.rangeAtFrames(c.startFrame,c.endFrame),sourceStartSeconds:c.inSeconds});
   const row=(await d.clips({trackScope:'all'})).find(r=>r.resourceId===v.resourceId&&r.startFrame===c.startFrame&&!before.has(r.clipId+':'+r.trackId));
   if(!row)throw Error('Video clip for '+c.slot+' was not placed at frame '+c.startFrame);
   await d.setClipAudio({clip:row,volumeDb:-60});
   const cur=(await d.clips({trackScope:'all'})).find(r=>r.clipId===row.clipId&&r.trackId===row.trackId);
   await style(cur,v,rectOf(quadName(c.quad)),{id:++n,startFrame:c.startFrame,grade:input.grades[c.slot+'@'+c.index]||null,fade:c.fade?[c.fade.startSeconds,c.fade.endSeconds]:null,fadeTo:plan.endColor,focus:input.framing[c.slot]},c.slot+' '+(c.quad==='full'?'':c.quad+' ')+'@'+c.refStart);
  }
  stage='hero';
  const rows=await d.clips({trackScope:'all'});
  const hero=plan.clips.find(c=>c.image);
  const heroRow=rows.find(r=>r.clipId===input.placements[0].clipId&&r.trackId===input.placements[0].trackId);
  if(!heroRow||heroRow.resourceId!==input.hero.resourceId||heroRow.startFrame!==hero.startFrame||heroRow.endFrame!==hero.endFrame)throw Error('Hero photo clip differs from the plan');
  await style(heroRow,input.hero,rectOf('full'),{id:++n,startFrame:hero.startFrame,grade:input.grades['H']||null,focus:input.framing.H},'Hero photo');
  stage='title';
  await d.addMotionGraphic({label:'Title',within:await d.rangeAtFrames(plan.title.startFrame,plan.title.endFrame),tsxCode:TITLE_CODE,
   parameters:{text:input.title.text,color:input.title.color,fontFamily:'Impact',cx:(91+341)/2/432,cy:((313+423)/2+2)/768,w:250/432,h:110*1.0385/768,squeeze:0.6537},
   editableParameters:[{key:'text',label:'Title',type:'text',defaultValue:input.title.text},{key:'color',label:'Colour',type:'color',defaultValue:input.title.color},{key:'fontFamily',label:'Font',type:'text',defaultValue:'Impact'}]});
  stage='ending';
  // The reference holds black after the fade; an empty tail would be dropped from the export.
  if(plan.durationFrames>plan.blackTail)await d.addMotionGraphic({label:'Ending black',within:await d.rangeAtFrames(plan.blackTail,plan.durationFrames),tsxCode:BLACK_CODE,parameters:{color:plan.endColor}});
  stage='song';
  await d.overlayResource({resource:project.resource(input.songResourceId),over:await d.rangeAtFrames(0,plan.durationFrames)});
  commitStarted=true;const saved=await d.commitAll('Finish Travel Beat Vlog Draft');
  if(!saved?.commitId)throw Error('Draft save response did not include its commit ID');
  return {status:'saved',draftId:input.draftId,clips:n};
 }catch(error){return {status:commitStarted?'outcomeUnknown':'notSaved',stage,message:String(error?.message||error),draftId:input?.draftId};}
}`;

// After the cutout photo is placed above the title, give it the hero's exact framing.
export const authorCutoutSource=String.raw`async function authorCutout(selects,input,plan,CLIP_CODE){
 let stage='cutout';
 try{
  const d=selects.draft(input.draftId);
  const row=(await d.clips({trackScope:'all'})).find(r=>r.clipId===input.cutout.clipId&&r.trackId===input.cutout.trackId);
  if(!row)throw Error('Cutout clip is missing');
  const W=1080,H=1920,w=input.hero.width,h=input.hero.height,q=Math.min(w/W,h/H),c=Math.min(W/w,H/h);
  await d.setClipTransform({clip:row,enabled:true,scale:{x:1/(q*c),y:1/(q*c)},position:{x:0,y:0},anchor:{x:0,y:0},rotation:0});
  const cur=(await d.clips({trackScope:'all'})).find(r=>r.clipId===row.clipId&&r.trackId===row.trackId);
  const f=input.focus||{x:.5,y:.5};
  await d.addVideoEffect({clip:cur,label:'Hero cutout (in front of the title)',tsxCode:CLIP_CODE,parameters:{id:999,startFrame:plan.title.startFrame,fps:plan.fps,g:{w,h,mw:W*q,mh:H*q,left:(w-W*q)/2,top:(h-H*q)/2},grade:input.grade||null,fade:null,focusX:f.x,focusY:f.y}});
  const saved=await d.commitAll('Put the hero cutout in front of the title');
  return {status:saved?.commitId?'saved':'outcomeUnknown'};
 }catch(error){return {status:'notSaved',stage,message:String(error?.message||error)};}
}`;

export function buildFinishScript(raw){
 const input=normalizeFinish(raw);
 return `const input:any=${JSON.stringify(input)};const plan:any=${JSON.stringify(scenePlan(input.fps,input.timing))};return await (${authorFinishSource})(selects,input,plan,${JSON.stringify(CLIP_CODE)},${JSON.stringify(TITLE_CODE)},${JSON.stringify(BLACK_CODE)});`;
}
export function buildCutoutScript(raw){
 const plan=scenePlan(raw.fps??30,raw.timing??REFERENCE_TIMING);
 const input={draftId:String(raw.draftId),cutout:{clipId:raw.cutout.clipId,trackId:String(raw.cutout.trackId)},hero:{width:raw.hero.width,height:raw.hero.height},grade:raw.grade||null,focus:raw.focus||null};
 return `const input:any=${JSON.stringify(input)};const plan:any=${JSON.stringify(plan)};return await (${authorCutoutSource})(selects,input,plan,${JSON.stringify(CLIP_CODE)});`;
}
// The cached hero cutout's file name: the photo (path, size, change time) and the mode.
export function cutoutKey(photo,size,mtimeMs,mode){
 const bytes=new TextEncoder().encode(photo+':'+size+':'+mtimeMs+':'+mode);let binary='';
 for(const b of bytes)binary+=String.fromCharCode(b);
 return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'').slice(-40);
}
// Merge the shared grayscale raster into the original pixels; there is no inference here.
export function heroAlphaArgs(photo,mask,out){
 return ['-nostdin','-v','error','-y','-i',photo,'-i',mask,'-filter_complex','[0:v]format=rgb24[photo];[1:v]format=gray[mask];[photo][mask]alphamerge[out]','-map','[out]','-frames:v','1','-c:v','png',out];
}
// @operation-end

const INVENTORY=`const p=selects.project(PROJECT_ID);const resources=await p.resources();const types=new Map(resources.map(r=>[r.resourceId,r.type]));const nodes=[];const walk=tree=>{for(const n of tree||[])n.type==='dir'?walk(n.children):nodes.push(n)};const view=await p.sourceFiles();if('fileTree' in view)walk(view.fileTree);else if('folders' in view)for(const folder of view.folders){const detail=await p.sourceFiles({folder:folder.name});if('fileTree' in detail)walk(detail.fileTree)}return nodes.filter(n=>n.path&&types.has(n.resourceId)&&(!scope.paths||scope.paths.includes(n.path))&&(!scope.ids||scope.ids.includes(n.resourceId))).map(n=>({resourceId:n.resourceId,type:types.get(n.resourceId),name:n.name,path:n.path,width:n.frameSize?.width??null,height:n.frameSize?.height??null,duration:n.durationSeconds??null}));`;
// Right after the app opens a Project its file list can briefly fail to read, so try once more.
async function inventory(sdk,projectId,summary,scope={}){
 const run=()=>readMediaPages(sdk, {script:`const scope=JSON.parse(${JSON.stringify(JSON.stringify(scope))});`+INVENTORY.replace('PROJECT_ID',JSON.stringify(projectId)),summary,allowCommit:false}).catch(()=>({isError:true}));
 let r=await run();
 if(r.isError||!Array.isArray(r.result)){await new Promise(done=>setTimeout(done,1500));r=await run();}
 if(r.isError||!Array.isArray(r.result))throw Error('Could not read the Project files. Wait a moment and load again.');
 return r.result;
}
async function script(sdk,source,summary,allowCommit,timeoutSeconds=30){
 const r=await sdk.runScript({script:source,summary,allowCommit,timeoutSeconds});
 if(r.isError)throw Error(r.output||summary+' failed.');
 return r.result;
}

// av-host:start
// Local files and media tools use the public async SDK. Paths remain host-native.
let hostSdk = null;
function hostUseSdk(sdk) { hostSdk = panelLocalClient(sdk); }
function hostError(code, message, member = "") { return Object.assign(new Error(message), { code, member }); }
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
// A Buffer, ArrayBuffer or typed array as bytes (a Buffer may be a view into a larger pool). The value comes from the
// host window (window.parent), another JavaScript realm, so `instanceof ArrayBuffer` is false for it: the checks use
// the internal [[Class]] tag and array-likeness instead.
function hostBytes(v) {
  const tag = (x) => Object.prototype.toString.call(x);
  if (tag(v) === "[object ArrayBuffer]") return new Uint8Array(v);
  if (v && typeof v.byteLength === "number" && v.buffer && tag(v.buffer) === "[object ArrayBuffer]") {
    return new Uint8Array(v.buffer, v.byteOffset || 0, v.byteLength);
  }
  if (v && typeof v === "object" && typeof v.length === "number") return Uint8Array.from(v);
  throw hostError("read-failed", "the file could not be read");
}
// A file's bytes (FileSystem.readFile without an encoding).
async function hostReadBytes(path) {
  const v = await hostNeed("FileSystem", "readFile").readFile(path);
  if (typeof v === "string") throw hostError("read-failed", "the file came back as text");
  return hostBytes(v);
}
// A text file (some host builds return text directly, others bytes).
async function hostReadText(path) {
  const v = await hostNeed("FileSystem", "readFile").readFile(path);
  return typeof v === "string" ? v : new TextDecoder().decode(hostBytes(v));
}
// Cleanup is best effort; all disk operations cross the async SDK bridge.
async function hostRemove(path) {
  try { await hostNeed("FileSystem", "removeFile").removeFile({ filePath: path }); } catch { /* leftover temporary file */ }
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
// Mono 32-bit float samples of an audio file at `rate`, at most `maxSeconds`, decoded by the host's ffmpeg into a
// temporary file in `dataDir` and read back (the file is removed). null when this host has no ffmpeg or no data folder;
// throws when ffmpeg fails or `signal` (optional) aborts it.
async function hostDecodePcm(path, dataDir, rate, maxSeconds, signal, timeoutMs = 120000) {
  const rt = hostApi("Runtime", "runFFmpeg");
  if (!rt || !dataDir || !hostApi("FileSystem", "readFile")) return null;
  const tmp = hostJoin(dataDir, "pcm-" + Date.now() + "-" + Math.floor(Math.random() * 1e6) + ".f32");
  const controller = typeof AbortController === "undefined" ? null : new AbortController();
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  const relay = () => { if (controller) controller.abort(); };
  if (signal) { if (signal.aborted) relay(); else signal.addEventListener("abort", relay); }
  try {
    await rt.runFFmpeg(["-nostdin", "-v", "error", "-y", "-t", String(maxSeconds), "-i", path, "-ac", "1", "-ar", String(rate), "-f", "f32le", tmp], true, controller ? controller.signal : undefined);
    const bytes = await hostReadBytes(tmp);
    // A copy, so the samples sit on a 4-byte boundary.
    const samples = new Float32Array(bytes.slice(0, Math.floor(bytes.byteLength / 4) * 4).buffer);
    if (!samples.length) throw hostError("decode-failed", "ffmpeg returned no audio");
    return samples;
  } finally {
    if (timer) clearTimeout(timer);
    if (signal) signal.removeEventListener("abort", relay);
    await hostRemove(tmp);
  }
}
// An audio or video file's length in seconds from the host's ffprobe, or null.
async function hostProbeSeconds(path) {
  try {
    const rt = hostApi("Runtime", "runFFprobe");
    if (!rt) return null;
    const r = await rt.runFFprobe(["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", path], true);
    const v = parseFloat(String(r?.stdout || "").trim());
    return v > 0 ? v : null;
  } catch { return null; }
}
// av-host:end
// Host paths compare equal across separators and Unicode forms, and on Windows across case.
const hostPathKey=p=>{const s=String(p||'').normalize('NFC').replace(/\\/g,'/');return hostIsWindows()?s.toLowerCase():s;};
// Files the plugin wrote itself (the hero cutout, the song section) live under <home>/.selects/plugin-data/.
const pluginOwned=p=>/[\\/]\.selects[\\/]plugin-data[\\/]/.test(String(p||''));

// ---- Song, colour and output composition on the host bundled media SDK ----
const NEWER='Update Selects to use Travel Beat Vlog.';
const NOT_INSTALLED='Travel Beat Vlog is not fully installed; install it again from the plugin library.';
// The install and data folders, found once per Panel.
let roots=null;
async function engineRoots(sdk){
  hostUseSdk(sdk);
 if(roots)return roots;
 hostNeed('Runtime','runFFmpeg');hostNeed('FileSystem','readFile');hostNeed('FileSystem','rename');
 const found=await hostRoots(sdk,'travel-beat-vlog','color-targets.json');
 if(!found.data)throw hostError('host-missing','this Selects build cannot make the plugin data folder','FileSystem.mkdir');
 return roots=found;
}
async function fileExists(path){try{return !!(await hostNeed('FileSystem','exists').exists(path));}catch(e){if(e?.code==='host-missing')throw e;return false;}}
// A file's size and change time (they name a cached song section or cutout); blank when this host cannot say.
async function fileStamp(path){
 try{const st=(await hostApi('FileSystem','stat')?.stat(path));if(st)return {size:st.size,mtimeMs:st.mtimeMs??+new Date(st.mtime)};}catch{}
 return {size:'',mtimeMs:''};
}
async function ffmpeg(args,timeoutMs=240000){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
 try{await hostNeed('Runtime','runFFmpeg').runFFmpeg(args,true,controller.signal);}finally{clearTimeout(timer);}
}
// Hex SHA-1 of a text (the Web Crypto digest); a panel without crypto.subtle uses FNV-1a, which only names files.
async function textKey(text){
 const bytes=new TextEncoder().encode(text);
 try{const d=await crypto.subtle.digest('SHA-1',bytes);return Array.from(new Uint8Array(d),b=>b.toString(16).padStart(2,'0')).join('');}
 catch{let a=0x811c9dc5,c=0x01000193;for(const b of bytes){a=Math.imul(a^b,0x01000193)>>>0;c=Math.imul(c^b,0x811c9dc5)>>>0;}return a.toString(16).padStart(8,'0')+c.toString(16).padStart(8,'0')+'fnv1';}
}
// songAnalysis in a Web Worker (songWorkerSource), never on the panel's thread. A worker that cannot start, stops
// or takes longer than SONG_TIMEOUT_MS rejects with code 'worker' (the build then keeps the reference rhythm);
// the analysis' own refusals (a song too short) reject as they are.
const SONG_TIMEOUT_MS=60000;
function analyseInWorker(samples,cuts,timeoutMs=SONG_TIMEOUT_MS){
 return new Promise((resolve,reject)=>{
  let worker=null,url=null,timer=null,done=false;
  const finish=fn=>{if(done)return;done=true;clearTimeout(timer);try{worker?.terminate();}catch{}if(url){try{URL.revokeObjectURL(url);}catch{}}fn();};
  const stopped=message=>Object.assign(Error(message),{code:'worker'});
  try{url=URL.createObjectURL(new Blob([songWorkerSource()],{type:'text/javascript'}));worker=new Worker(url);}
  catch(e){finish(()=>reject(stopped('the beat finder could not start: '+String(e?.message||e))));return;}
  worker.onmessage=e=>finish(()=>e.data?.error?reject(Error(e.data.error)):resolve(e.data?.ok));
  worker.onerror=e=>{try{e?.preventDefault?.();}catch{}finish(()=>reject(stopped('the beat finder stopped: '+String(e?.message||'worker error'))));};
  timer=setTimeout(()=>finish(()=>reject(stopped('the beat finder took too long'))),timeoutMs);
  worker.postMessage({samples,cuts},[samples.buffer]);
 });
}
// Fits the format to the user's song and writes the song's window as the Draft's music (songs/song-<key>.wav in the
// data folder, reused while the song and its fit are the same). Resolves to {timing, audio}.
async function fitSong(sdk,song,cuts,say){
 if(!['hits','reference'].includes(cuts))throw Error('Unknown cuts option');
 const {data}=await engineRoots(sdk);
 if(typeof song!=='string'||!(await fileExists(song)))throw Error('The song file is missing.');
 const pcm=hostJoin(data,'song-'+Date.now()+'.f32');
 let samples;
 try{
  await ffmpeg(songDecodeArgs(song,pcm));
  // A copy, so the samples sit on a 4-byte boundary.
  const bytes=await hostReadBytes(pcm);samples=new Float32Array(bytes.slice(0,Math.floor(bytes.byteLength/4)*4).buffer);
 }finally{await hostRemove(pcm);}
 let start=0,timing=REFERENCE_TIMING;
 try{const fit=await analyseInWorker(samples,cuts);start=fit.fit.window.m1[0];timing=fit.timing;}
 catch(error){
  if(error?.code!=='worker')throw error;
  console.warn('[travel-beat-vlog] song analysis unavailable; the reference rhythm from the song start:',error.message);
  say('Could not find the beat in time; using the reference rhythm…');
 }
 const {size,mtimeMs}=(await fileStamp(song));
 const dir=hostJoin(data,'songs');(await hostNeed('FileSystem','mkdir').mkdir(dir,{recursive:true}));
 const audio=hostJoin(dir,'song-'+(await textKey(songKeyText(song,size,mtimeMs,start,timing))).slice(0,20)+'.wav');
 if(!(await fileExists(audio))){
  const tmp=audio+'.tmp.wav';
  await ffmpeg(songArrangeArgs(song,start,timing,tmp));
  (await hostNeed('FileSystem','rename').rename(tmp,audio));
 }
 return {timing:withinLimits(validateTiming(timing)),audio};
}
// Per-slot colour: each clip's statistics over the frames its slot uses, moved towards the reference's
// (color-targets.json). Strength 0 keeps every clip's own colour and measures nothing.
async function gradeClips(sdk,clips,strength){
 const {plugin,data}=await engineRoots(sdk);
 const targets=JSON.parse(await hostReadText(hostJoin(plugin,'color-targets.json')));
 const out={};
 for(const c of clips){
  if(!targets[c.slot])throw Error('No colour target for '+c.slot);
  out[c.key]=strength>0?colorTransfer(targets[c.slot],await measureClip(data,c.path,c.inSeconds,c.seconds),strength):null;
 }
 return out;
}
async function measureClip(data,file,inSeconds,seconds){
 const tmp=hostJoin(data,'measure-'+Date.now()+'.rgb');
 try{await ffmpeg(measureArgs(file,inSeconds,seconds,tmp),60000);return rgbStats(await hostReadBytes(tmp),String(file).split(/[\\/]/).pop());}
 finally{await hostRemove(tmp);}
}
// The existing person/main-subject choices share RVM. No subject-class precheck is applied.
async function heroCutout(sdk,projectId,photo,mode,aiSignal,{scope='travel-beat-vlog',retryTerminal=true}={}){
 if(!['person','foreground'].includes(mode))throw Error('Unknown cutout mode');
 const {data}=await engineRoots(sdk);
 const matte=await photoAiMatte(sdk,projectId,photo,{scope,retryTerminal,control:{observer:{signal:aiSignal}}});
 const {size,mtimeMs}=await fileStamp(photo.path);
 const dir=hostJoin(data,'cutouts');await hostNeed('FileSystem','mkdir').mkdir(dir,{recursive:true});
 const out=hostJoin(dir,'hero-rvm-'+cutoutKey(photo.path,size,mtimeMs,mode)+'-'+matte.workflowId.replace(/[^a-z0-9-]/gi,'')+'.png');
 if(!await fileExists(out)){
  const tmp=out+'.tmp.png';
  try{
   await ffmpeg(heroAlphaArgs(photo.path,matte.path,tmp));
   await hostNeed('FileSystem','rename').rename(tmp,out);
  }finally{await hostRemove(tmp)}
 }
 return {path:out};
}

// native-sdk:start
// Read verified Project resources and place editable images through the Draft working copy.
async function nativeImageSources(selects, projectId, photos) {
 const project=selects.project(projectId), resources=await project.resources(), nodes=[];
 const visit=items=>{for(const item of items||[])item.type==='dir'?visit(item.children):nodes.push(item);};
 const overview=await project.sourceFiles();
 if('fileTree' in overview)visit(overview.fileTree);
 else for(const folder of overview.folders||[]){const detail=await project.sourceFiles({folder:folder.name});if('fileTree' in detail)visit(detail.fileTree);}
 return photos.map(photo=>{
  const matches=nodes.filter(node=>node.path===photo.path&&resources.some(resource=>resource.resourceId===node.resourceId&&resource.type==='Image'));
  if(matches.length!==1)throw Error('A selected Image is missing or ambiguous in the Project: '+photo.name);
  const row=matches[0],size=row.frameSize;
  if(!Number.isSafeInteger(size?.width)||size.width<1||!Number.isSafeInteger(size?.height)||size.height<1)throw Error('A selected Image has no verified native dimensions: '+photo.name);
  return {resourceId:row.resourceId,path:row.path,name:photo.name,width:size.width,height:size.height};
 });
}
async function nativeImageRun(sdk,script,summary,allowCommit=false) {
 const response=await sdk.runScript({script,summary,allowCommit,timeoutSeconds:120});
 if(response.isError||response.result==null)throw Error(response.output||'Image placement could not be confirmed. Inspect the Draft before retrying.');
 return response.result;
}
export async function prepareNativeImages(sdk,projectId,photos,knownLibraryId=null) {
 const sources=await nativeImageRun(sdk,`return await (${nativeImageSources.toString()})(selects,${JSON.stringify(projectId)},${JSON.stringify(photos)});`,'Verify original Project Images');
 return {sdk,projectId,sources};
}
async function nativeImagePlacement(selects,input) {
 const {projectId,draftId,plan,items,sources}=input,project=selects.project(projectId),draft=selects.draft(draftId);
 if(!(await project.meta()).draftIds.includes(draftId))throw Error('The Draft is not owned by the selected Project.');
 const meta=await draft.meta();
 if(meta.fps!==plan.fps||meta.durationFrames!==plan.durationFrames||(plan.canvas&&(meta.frameSize.width!==plan.canvas.width||meta.frameSize.height!==plan.canvas.height)))throw Error('The Draft frame grid differs from the plan.');
 const fresh=await nativeImageSources(selects,projectId,sources);
 if(fresh.some((source,index)=>source.resourceId!==sources[index].resourceId||source.width!==sources[index].width||source.height!==sources[index].height))throw Error('A selected Image changed. Prepare the Images again.');
 const placements=[];
 for(const item of items){
  const source=fresh[item.source];
  if(!source)throw Error('An Image occurrence has no source.');
  const before=new Set((await draft.clips({trackScope:'all'})).map(clip=>clip.clipId));
  await draft.overlayResource({resource:project.resource(source.resourceId),over:await draft.rangeAtFrames(item.startFrame,item.endFrame)});
  const added=(await draft.clips({trackScope:'all'})).filter(clip=>!before.has(clip.clipId));
  if(added.length!==1||added[0].resourceId!==source.resourceId||added[0].startFrame!==item.startFrame||added[0].endFrame!==item.endFrame)throw Error('The Image interval changed during placement.');
  placements.push({...item,clipId:added[0].clipId,trackId:added[0].trackId});
 }
 if((await draft.meta()).durationFrames!==plan.durationFrames)throw Error('Image placement changed the Draft duration.');
 await draft.commitAll('Place original editable Images');
 return {placements,photos:fresh.map(source=>({width:source.width,height:source.height})),status:'committed'};
}
export async function placeNativeImages(prepared,draftId,plan,items,label) {
 const {sdk,projectId,sources}=prepared;
 // The caller supplies the hero and cutout occurrences separately.
 const input={projectId,draftId,plan,items,sources};
 const result=await nativeImageRun(sdk,`const nativeImageSources=${nativeImageSources.toString()};return await (${nativeImagePlacement.toString()})(selects,${JSON.stringify(input)});`,'Place original editable Images',true);
 // A separate script reads persisted state, rather than verifying the same working copy.
 await nativeImageRun(sdk,`const d=selects.draft(${JSON.stringify(draftId)}),clips=await d.clips({trackScope:'all'});for(const expected of ${JSON.stringify(result.placements)}){const actual=clips.find(c=>c.clipId===expected.clipId);if(!actual||actual.trackId!==expected.trackId||actual.startFrame!==expected.startFrame||actual.endFrame!==expected.endFrame)throw Error('Saved Image placement could not be read back.');}if((await d.meta()).durationFrames!==${JSON.stringify(plan.durationFrames)})throw Error('Saved Image Draft duration changed.');return {ok:true};`,'Verify saved Image placement');
 return result;
}
// native-sdk:end

// Registers a file the plugin wrote (hero cutout, song section) in the Project once, reusing an earlier import by path.
async function ensureImported(sdk,projectId,file,type,summary){
 const key=hostPathKey(file),same=r=>hostPathKey(r.path)===key&&r.type===type;
 let rows=await inventory(sdk,projectId,'Find '+summary);
 if(!rows.some(same)){
  await script(sdk,`return await selects.project(${JSON.stringify(projectId)}).importFiles({paths:${JSON.stringify([file])}});`,'Import '+summary,true);
  rows=await inventory(sdk,projectId,'Confirm '+summary);
 }
 const m=rows.find(same);
 if(!m)throw Error('The '+summary+' is not ready in the Project yet. Try again in a moment.');
 return m;
}

// Builds the vlog from 26 chosen videos (by slot), a hero photo and the user's song, all inventory rows:
// the panel's Create Draft and a template run share it. Resolves to the saved Draft.
async function buildTravelVlog(sdk,{projectId,chosen,heroPhoto,song,cuts,title,color,cutoutMode,grade,name,say,stillCurrent,libraryId=null,aiSignal,aiScope='travel-beat-vlog',aiRetryTerminal=true,onDraft=_id=>{}}){
 // The same local RVM task supplies the subject overlay on macOS and Windows.
 const cutout=true;
 say('Finding the beat of your song…');
 const fit=await fitSong(sdk,song.path,cuts,say);
 const timing=fit.timing;
 const needs=slotNeeds(timing);
 for(const s of VIDEO_SLOTS){const d=chosen[s].duration;if(d!=null&&d+1e-3<needs[s])throw Error(s+' ('+chosen[s].name+') is '+d.toFixed(2)+' s; it needs at least '+needs[s].toFixed(2)+' s.');}
 let cutRow=null;
 if(cutout){
  say('Cutting out the hero subject…');
  const cut=await heroCutout(sdk,projectId,heroPhoto,cutoutMode,aiSignal,{scope:aiScope,retryTerminal:aiRetryTerminal});
  cutRow=await ensureImported(sdk,projectId,cut.path,'Image','hero cutout');
 }
 const songRow=await ensureImported(sdk,projectId,fit.audio,'Audio','song section');
 say('Matching colour to the reference…');
 // Measured before the Draft exists (reference 30 fps timing; seconds are rate-free), so a failure leaves no partial Draft.
 const ref=scenePlan(30,timing);
 const clips=ref.clips.filter(c=>!c.image).map(c=>({key:c.slot+'@'+c.index,slot:c.slot,path:chosen[c.slot].path,inSeconds:c.inSeconds,seconds:(c.endFrame-c.startFrame)/30}));
 clips.push({key:'H',slot:'H',path:heroPhoto.path,inSeconds:0,seconds:0.1});
 const grades=await gradeClips(sdk,clips,Number(grade??1));
 const prepared=await prepareNativeImages(sdk,projectId,cutRow?[{...heroPhoto},{...cutRow,name:'hero cutout'}]:[{...heroPhoto}],libraryId);
 if(!stillCurrent())throw Error('The Project changed. Start again in the selected Project.');
 say('Creating the Draft…');
 const seed=await script(sdk,`const p=selects.project(${JSON.stringify(projectId)});const d=await p.createDraft({name:${JSON.stringify(name.trim()||'Travel beat vlog')}});await d.insertGap({seconds:${timing.durationFrames}/30});await d.setFrameSize({width:1080,height:1920});const m=await d.meta();if(m.durationFrames!==Math.round(${timing.durationFrames}*m.fps/30)||m.frameSize?.width!==1080||m.frameSize?.height!==1920)throw Error('Draft frame grid differs from the reference.');const saved=await d.commitAll('Start Travel Beat Vlog Draft');return {draftId:saved.createdDraftId,fps:m.fps};`,'Create travel vlog Draft',true);
 const {draftId,fps}=seed;onDraft(draftId);
 const plan=scenePlan(fps,timing);
 say('Placing the hero photo…');
 const heroClip=plan.clips.find(c=>c.image);
 const placed=await placeNativeImages(prepared,draftId,plan,[{source:0,startFrame:heroClip.startFrame,endFrame:heroClip.endFrame}],'hero');
 say('Placing 35 video clips, grids, title and your song…');
 const request={mode:'finish',projectId,draftId,fps,videos:Object.fromEntries(VIDEO_SLOTS.map(s=>[s,{resourceId:chosen[s].resourceId,width:chosen[s].width,height:chosen[s].height}])),hero:{resourceId:heroPhoto.resourceId,width:placed.photos[0].width,height:placed.photos[0].height},placements:placed.placements,grades,songResourceId:songRow.resourceId,title:{text:title,color},timing};
 const fin=await script(sdk,buildFinishScript(request),'Finish travel vlog Draft',true,120);
 if(fin?.status!=='saved')throw Error((fin?.message||'Could not save the Draft.')+(fin?.stage?' ('+fin.stage+')':''));
 if(!cutout)return {draftId};
 say('Putting the hero subject in front of the title…');
 const top=await placeNativeImages(prepared,draftId,plan,[{source:1,startFrame:plan.title.startFrame,endFrame:plan.title.endFrame}],'cutout');
 const fin2=await script(sdk,buildCutoutScript({mode:'cutoutFinish',fps,draftId,cutout:top.placements[0],hero:request.hero,grade:grades.H||null,timing}),'Finish hero cutout',true,60);
 if(fin2?.status!=='saved')throw Error(fin2?.message||'Could not save the hero cutout.');
 return {draftId};
}

// A template run (Clip highlights): the app hands over the hero photo, the three
// long shots (under the two grids and before the ending), the other 23 clips in the
// order picked, and the song; everything else is this panel's own default.
const LONG_SLOTS=['V12','V17','V22'],SHORT_SLOTS=VIDEO_SLOTS.filter(s=>!LONG_SLOTS.includes(s));
const TEMPLATE_DEFAULTS={title:'TRAVEL',color:'#F4C711',cutoutMode:'person',grade:0.7,name:'Travel beat vlog'};
const TEMPLATE_FAILED='Travel Beat Vlog could not make the timeline; try again.';
function templateIssue(message){return Object.assign(Error(message),{publicMessage:message});}
function templateMessage(error){
 if(error?.publicMessage)return error.publicMessage;
 const said=String(error?.message||'');
 if(error?.code==='host-missing'||/^This Selects version does not support/.test(said))return NEWER;
 if(error?.code==='not-found')return NOT_INSTALLED;
 if(/needs at least/.test(said))return said.replace(/^V\d+ \((.+?)\) is/,'$1 is');
 if(/song is too short|song file is missing/i.test(said))return said;
 if(/^No person found/.test(said))return 'Travel Beat Vlog found no people in the hero photo; pick a photo with people, then try again.';
 if(/^No subject found/.test(said))return 'Travel Beat Vlog found no main subject in the hero photo; pick another photo, then try again.';
 if(/cutout|matte|Cannot read the photo/i.test(said))return 'Travel Beat Vlog could not cut out the hero photo; try again.';
 return TEMPLATE_FAILED;
}
// The app hands a template its own Resource ids, but every run_script read
// (resources(), clips()) speaks the short ids the script SDK gives out (r0, r1…).
// The app's list (sdk.call) and the script's list are the Project's Resources in
// the same order, so they pair up row by row; names and types are compared so a
// list that changed in between is refused rather than mismatched.
async function scriptResourceIds(sdk, projectId, resourceIds) {
  const app = await sdk.call("listProjectResources", projectId);
  if (!Array.isArray(app)) throw new Error("Could not read the project resources.");
  const indices = [...new Set(resourceIds)].map(id => app.findIndex(r => r.resourceId === id));
  if (indices.includes(-1)) throw new Error("A picked file is missing from this project.");
  const run = await readMediaPages(sdk, { summary: "Match picked files", script: `const rows=await selects.project(${JSON.stringify(projectId)}).resources();return {count:rows.length,rows:${JSON.stringify(indices)}.map(i=>{const r=rows[i];return r?{id:r.resourceId,name:r.name,type:r.type}:null;})};` });
  const result = run.result, rows = result.rows;
  if (result.count !== app.length || rows.length !== indices.length || indices.some((index, i) => app[index].name !== rows[i]?.name || app[index].type !== rows[i]?.type)) throw new Error("Could not match the picked files to this project.");
  return new Map(indices.map((index, i) => [app[index].resourceId, rows[i].id]));
}
async function templateMedia(sdk,projectId,inputs){
 const hero=(inputs?.hero||[]).filter(x=>x?.kind==='image'&&x.resourceId);
 const long=(inputs?.long||[]).filter(x=>x?.kind==='video'&&x.resourceId);
 const clips=(inputs?.clips||[]).filter(x=>x?.kind==='video'&&x.resourceId);
 const song=(inputs?.song||[]).filter(x=>x?.kind==='audio'&&x.resourceId);
 if(hero.length!==1)throw templateIssue('Pick one hero photo, then try again.');
 if(long.length!==LONG_SLOTS.length)throw templateIssue('Pick three long shots, then try again.');
 if(clips.length!==SHORT_SLOTS.length)throw templateIssue('Pick 23 clips, then try again.');
 if(song.length!==1)throw templateIssue('Pick one song, then try again.');
 const ids=await scriptResourceIds(sdk, projectId, [...hero, ...long, ...clips, ...song].map(x => x.resourceId));
 const rows=await inventory(sdk,projectId,'List project media',{ids:[...ids.values()]});
 const row=(pick,type)=>{
  const id=ids.get(pick.resourceId)??pick.resourceId;
  const m=rows.find(r=>r.resourceId===id&&r.type===type);
  if(!m)throw templateIssue((pick.name||'A picked file')+' is no longer in this project.');
  if(type==='Video'&&(!m.width||!m.height))throw templateIssue(m.name+' is still being read; wait a moment, then try again.');
  return m;
 };
 const chosen={};
 LONG_SLOTS.forEach((s,i)=>{chosen[s]=row(long[i],'Video');});
 SHORT_SLOTS.forEach((s,i)=>{chosen[s]=row(clips[i],'Video');});
 return {chosen,heroPhoto:row(hero[0],'Image'),song:row(song[0],'Audio')};
}
// Nobody sees this frame, so it shows one status line. It starts once per run id
// and reports once, unless a newer run replaced it.
function TravelTemplateRun({sdk,context}){
 const runId=context.template?.runId,[status,setStatus]=React.useState('Making your travel vlog…');
 const started=React.useRef(null),alive=React.useRef(true),latest=React.useRef(context);latest.current=context;
 React.useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 React.useEffect(()=>{
  if(!runId||started.current===runId)return;started.current=runId;
  const live=()=>alive.current&&latest.current.template?.runId===runId;
  const observer=new AbortController();
  let ended=false,draftId=null;
  const finish=result=>{if(ended)return;ended=true;if(!live())return;try{sdk.finishTemplate(result);}catch{}};
  const say=text=>{if(live())setStatus(text);};
  const projectId=context.projectId,template=context.template;
  (async()=>{
   try{
    if(!projectId)throw templateIssue('Open a project, then try again.');
    say('Finding your clips…');
    const {chosen,heroPhoto,song}=await templateMedia(sdk,projectId,template?.inputs);
    const cutoutMode=template?.options?.subject==='foreground'?'foreground':TEMPLATE_DEFAULTS.cutoutMode;
    const cuts=template?.options?.cuts==='reference'?'reference':'hits';
    const done=await buildTravelVlog(sdk,{projectId,chosen,heroPhoto,song,cuts,...TEMPLATE_DEFAULTS,cutoutMode,say,stillCurrent:live,aiSignal:observer.signal,aiScope:'travel-beat-vlog:template:'+runId,aiRetryTerminal:false,libraryId:template?.libraryId||null,onDraft:id=>{draftId=id;}});
    finish({sequenceId:done.draftId});
   }catch(error){
    console.warn('[travel-beat-vlog] template run failed:',error?.message||String(error),{draftId});
    finish({error:draftId?'Travel Beat Vlog stopped partway; the unfinished timeline "'+TEMPLATE_DEFAULTS.name+'" may need removing.':templateMessage(error)});
   }finally{finish({error:TEMPLATE_FAILED});}
  })();
  return()=>observer.abort();
 },[runId]);
 return <p role="status" style={{margin:0,fontSize:12}}>{status}</p>;
}

function Panel(props){
  hostUseSdk(props.sdk);return props.context.template?<TravelTemplateRun {...props}/>:<TravelPanel {...props}/>;}
// The manual panel asks for the same things, in the same groups, as the template page:
// hero photo, three long shots, 23 clips, the song, and the template's two choices.
function TravelPanel({sdk,context,ui}){
 const [media,setMedia]=React.useState([]),[loadedProject,setLoadedProject]=React.useState(null);
 const [hero,setHero]=React.useState(''),[long,setLong]=React.useState(['','','']),[clips,setClips]=React.useState(Array(23).fill('')),[song,setSong]=React.useState('');
 const [cutoutMode,setCutoutMode]=React.useState('person'),[cuts,setCuts]=React.useState('hits');
 const [title,setTitle]=React.useState('TRAVEL'),[color,setColor]=React.useState('#F4C711'),[grade,setGrade]=React.useState(0.7),[name,setName]=React.useState('Travel beat vlog');
 const [busy,setBusy]=React.useState(false),[status,setStatus]=React.useState(''),[saved,setSaved]=React.useState(null);
 const running=React.useRef(false),currentProject=React.useRef(context.projectId),aiObserver=React.useRef(null);currentProject.current=context.projectId;
 React.useEffect(()=>()=>{currentProject.current=null;aiObserver.current?.abort()},[]);
 React.useEffect(()=>{aiObserver.current?.abort()},[context.projectId]);
 React.useEffect(()=>{setMedia([]);setHero('');setLong(['','','']);setClips(Array(23).fill(''));setSong('');setLoadedProject(null);setSaved(null);setStatus('');},[context.projectId]);
 // Files the plugin created itself (the hero cutout, the song section) are not user media.
 const own=m=>pluginOwned(m.path);
 const of=type=>media.filter(m=>m.type===type&&!own(m));
 async function load(){
  if(!context.projectId||running.current)return;running.current=true;setBusy(true);setStatus('Loading project media…');
  try{
   const projectId=context.projectId,rows=await inventory(sdk,projectId,'List project media');
   if(currentProject.current!==projectId)return;
   setMedia(rows);setLoadedProject(projectId);
   const mine=r=>pluginOwned(r.path),v=rows.filter(r=>r.type==='Video'&&!mine(r)),im=rows.filter(r=>r.type==='Image'&&!mine(r)),au=rows.filter(r=>r.type==='Audio'&&!mine(r));
   setLong(old=>old.map((x,i)=>x||v[i]?.resourceId||''));setClips(old=>old.map((x,i)=>x||v[3+i]?.resourceId||''));
   setHero(old=>old||im[0]?.resourceId||'');setSong(old=>old||au[0]?.resourceId||'');
   setStatus(v.length>=26&&im.length&&au.length?'Check the hero photo, the long shots, the 23 clips and the song.':'The format needs 1 hero photo, 26 videos and 1 song; this Project has '+im.length+' photos, '+v.length+' videos and '+au.length+' songs.');
  }catch(error){setStatus(String(error?.message||error));}finally{running.current=false;setBusy(false);}
 }
 async function create(){
  const projectId=context.projectId;
  if(running.current||!projectId||loadedProject!==projectId)return;
  running.current=true;setBusy(true);setStatus('Checking media…');
  const observer=new AbortController();aiObserver.current=observer;
  try{
   const pick=(id,type,what)=>{const m=media.filter(x=>x.resourceId===id);if(m.length!==1)throw Error('Choose '+what+'.');if(m[0].type!==type)throw Error(m[0].name+' is not '+(type==='Video'?'a video':type==='Image'?'a photo':'a song')+'.');return m[0];};
   const chosen={};
   LONG_SLOTS.forEach((s,i)=>{chosen[s]=pick(long[i],'Video','long shot '+(i+1));});
   SHORT_SLOTS.forEach((s,i)=>{chosen[s]=pick(clips[i],'Video','clip '+(i+1));});
   for(const m of Object.values(chosen))if(!m.width||!m.height)throw Error(m.name+' has no frame size yet; wait for the Project to finish reading it.');
   const {draftId}=await buildTravelVlog(sdk,{projectId,chosen,heroPhoto:pick(hero,'Image','a hero photo'),song:pick(song,'Audio','a song'),cuts,title,color,cutoutMode,grade,name,say:setStatus,aiSignal:observer.signal,stillCurrent:()=>currentProject.current===projectId});
   setSaved({draftId});setStatus('Saved. Every shot is its own clip with focus controls; the title text and colour are editable.');
  }catch(error){setStatus(error?.code==='host-missing'?NEWER:error?.code==='not-found'?NOT_INSTALLED:String(error?.message||error));}finally{running.current=false;setBusy(false);}
 }
 const ready=!busy&&loadedProject===context.projectId;
 const opts=type=>of(type).map(m=>({value:m.resourceId,label:m.name}));
 const vOpts=opts('Video'),setAt=(setter,i)=>v=>setter(old=>old.map((x,j)=>j===i?v:x));
 return <ui.Stack gap={16}><ui.Section title="Travel Beat Vlog">
  <ui.Message>A travel beat vlog in 9:16 cut to your song: two fast montages on its drum hits, a hero photo with the title behind its subject, two 2×2 grids that fill on the beat, and a fade out.</ui.Message>
  {!context.projectId&&<ui.Message>Open a Project first.</ui.Message>}
  <ui.Button variant="secondary" onClick={load} disabled={!context.projectId||busy} busy={busy}>Load Project media</ui.Button>
  <ui.Select label="Hero photo" value={hero} onChange={setHero} options={opts('Image')} placeholder="Choose photo" disabled={!ready}/>
  {long.map((v,i)=><ui.Select key={'l'+i} label={'Long shot '+(i+1)} value={v} onChange={setAt(setLong,i)} options={vOpts} placeholder="Choose video" disabled={!ready}/>)}
  {clips.map((v,i)=><ui.Select key={'c'+i} label={'Clip '+(i+1)} value={v} onChange={setAt(setClips,i)} options={vOpts} placeholder="Choose video" disabled={!ready}/>)}
  <ui.Select label="Song" value={song} onChange={setSong} options={opts('Audio')} placeholder="Choose song" disabled={!ready}/>
  <ui.Select label="In front of the title" value={cutoutMode} onChange={setCutoutMode} options={[{value:'person',label:'People'},{value:'foreground',label:'Main subject'}]} disabled={busy}/>
  <ui.Select label="Cuts" value={cuts} onChange={setCuts} options={[{value:'hits',label:"Follow the song's hits"},{value:'reference',label:'Keep the original rhythm'}]} disabled={busy}/>
  <ui.TextField label="Title" value={title} onChange={setTitle} disabled={busy}/>
  <ui.TextField label="Title colour (#RRGGBB)" value={color} onChange={setColor} disabled={busy}/>
  <ui.Slider label="Match colour to the reference" min={0} max={1} step={0.05} value={grade} onChange={setGrade} disabled={busy}/>
  <ui.TextField label="Draft name" value={name} onChange={setName} disabled={busy}/>
  <ui.Actions><ui.Button variant="primary" onClick={create} disabled={!ready||!hero||!song||long.some(v=>!v)||clips.some(v=>!v)||!/^#[0-9a-fA-F]{6}$/.test(color)} busy={busy}>{saved?'Create another Draft':'Create Draft'}</ui.Button></ui.Actions>
  {status&&<ui.Message>{status}</ui.Message>}
  {saved&&<ui.Button variant="secondary" onClick={()=>sdk.runScript({script:'return await selects.editor.openDraft('+JSON.stringify(saved.draftId)+');',summary:'Open saved Draft',allowCommit:false})}>Open saved Draft</ui.Button>}
 </ui.Section></ui.Stack>;
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
  const run = async (method: string, args: unknown[], write = false) => {
    // method names below are fixed implementation constants; values always use JSON encoding.
    // Direct arguments keep object literals contextually typed by the SDK signature.
    const response = await sdk.runScript({
      summary: "Use local media workspace",
      allowCommit: write,
      script: "return await selects." + method + "(" + JSON.stringify(args).slice(1, -1) + ");",
    });
    if (response.isError) throw new Error(response.output || "Local SDK operation failed.");
    // A clipped report has no result. Every read returning data rejects that case below.
    return response.result;
  };
  const environment = await run("files.environment", []);
  if (!environment || typeof environment.platform !== "string" || !environment.homedir)
    throw new Error("Update Selects to use this plugin's local media workspace.");
  const paths = panelLocalPaths(environment.platform);
  const CHUNK_BYTES = 48 * 1024;
  const readRange = async (path: string, offset: number, length: number) => {
    const parts: Uint8Array[] = [];
    let total = 0;
    while (total < length) {
      const result = await run("files.readRange", [{ path, offset: offset + total, length: Math.min(CHUNK_BYTES, length - total) }]);
      if (!result || typeof result.base64 !== "string" || !Number.isInteger(result.bytesRead)) throw new Error("The file read returned an incomplete result.");
      const bytes = Uint8Array.from(atob(result.base64), (character) => character.charCodeAt(0));
      if (bytes.length !== result.bytesRead) throw new Error("The file read returned invalid bytes.");
      parts.push(bytes); total += bytes.length;
      if (bytes.length < Math.min(CHUNK_BYTES, length - (total - bytes.length))) break;
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
    readdir: (path: string) => run("files.readdir", [path]),
    readRange,
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
        for (let offset = 0; offset < bytes.length || offset === 0; offset += CHUNK_BYTES) {
          const chunk = bytes.subarray(offset, offset + CHUNK_BYTES);
          let binary = "";
          for (const byte of chunk) binary += String.fromCharCode(byte);
          const mode = offset === 0 ? (flag === "a" ? "append" : "exclusive") : undefined;
          const result = await run("files.writeChunk", [{ path: destination, offset, base64: btoa(binary), ...(mode ? { mode } : {}) }], true);
          if (result?.bytesWritten !== chunk.length) throw new Error("The file write returned an incomplete result. Check the file before retrying.");
        }
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
  const activeJobs = new Set<string>();
  let disposed = false;
  const cancel = async (jobId: string) => {
    const response = await sdk.runScript({ summary: "Cancel local media processing", allowCommit: true, script: "await selects.media.job(" + JSON.stringify(jobId) + ").cancel();" });
    if (response.isError) throw new Error(response.output || "Media cancellation failed.");
  };
  const process = async (executable: "FFmpeg" | "FFprobe", args: string[], _withoutLog?: boolean, signal?: AbortSignal, onStdout?: (text: string) => void, onStderr?: (text: string) => void) => {
    if (disposed || signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const started = await run("media.start" + executable, [{ args }], true);
    if (!started?.jobId) throw new Error("The media process did not return a job id.");
    const jobId = started.jobId;
    activeJobs.add(jobId);
    let cancellation: Promise<void> | null = null;
    const abort = () => { cancellation ??= cancel(jobId); void cancellation.catch(() => {}); };
    signal?.addEventListener("abort", abort, { once: true });
    if (disposed || signal?.aborted) abort();
    let cursor = 0, stdout = "", stderr = "";
    try {
      while (true) {
        if (cancellation) await cancellation;
        const status = await sdk.call("getLocalMediaJobStatus", jobId, { cursor });
        if (!status || !Array.isArray(status.events)) throw new Error("Media status is unavailable.");
        if (status.truncated) throw new Error("Media output was truncated; no incomplete result was accepted.");
        for (const event of status.events) {
          if (event.stream === "stdout") { stdout += event.text; onStdout?.(event.text); }
          else { stderr += event.text; onStderr?.(event.text); }
        }
        cursor = status.nextCursor;
        if (status.state !== "running" && status.events.length === 0) {
          if (status.state === "cancelled" || signal?.aborted) throw new DOMException("Aborted", "AbortError");
          if (status.state === "failed") throw new Error(status.error || stderr || "Media processing failed.");
          return { stdout, stderr };
        }
        if (status.state === "running") await new Promise((resolve) => setTimeout(resolve, 150));
      }
    } catch (error) {
      await cancel(jobId).catch(() => {});
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
    dispose() { disposed = true; for (const jobId of activeJobs) void cancel(jobId).catch(() => {}); },
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
    React.useEffect(() => {
      let active = true;
      let client: any;
      createPanelLocalClient(props.sdk).then(value => {
        client = {...props.sdk, ...value};
        if (!active) { value.dispose(); return; }
        panelLocalClients.set(props.sdk, client);
        setState({sdk: props.sdk});
      }).catch(error => { if (active) setState({error: String(error?.message || error)}); });
      return () => {
        active = false;
        if (client) {
          if (panelLocalClients.get(props.sdk) === client) panelLocalClients.delete(props.sdk);
          client.dispose();
        }
      };
    }, [props.sdk]);
    if (state?.error) return React.createElement("div", {role: "alert"}, state.error);
    if (state?.sdk !== props.sdk) return React.createElement("div", {role: "status"}, "Connecting to Selects…");
    return React.createElement(Component, props);
  };
}

export default withPanelLocalClient(Panel);
// local-sdk:end

// photo-ai:start
// Inference lives in the installed shared runtime; this adapter retains only photo/output plumbing.
async function photoAiScript(sdk,code,summary,allowCommit=false){
 const response=await sdk.runScript({script:code,summary,allowCommit,timeoutSeconds:120});
 if(response.isError||response.result==null)throw Error(response.output||'Shared photo analysis returned no result.');
 return response.result;
}
async function photoAiCanonicalId(sdk,projectId,resourceId){
 const ids=await sharedAiResources.resolveSharedAiResources(sdk,projectId,[resourceId],(code,summary,write)=>photoAiScript(sdk,code,summary,write));
 const id=ids.get(resourceId);
 if(!id)throw Error('The selected photo changed. Refresh project photos and try again.');
 return id;
}
function photoAiClient(sdk,projectId,scope){
 if(!sdk.storage?.getItem||!sdk.storage?.setItem)throw Error('Update Selects to use persistent shared AI jobs.');
 const key='shared-ai:'+scope+':'+projectId;
 return sharedAiJobs.createSharedAiJobClient({projectId,scope,
  runScript:(code,summary,write)=>photoAiScript(sdk,code,summary,write),
  load:async()=>{const value=await sdk.storage.getItem(key);return value===null?null:JSON.parse(value)},
  save:journal=>sdk.storage.setItem(key,JSON.stringify(journal))});
}
async function photoAiMatte(sdk,projectId,photo,{scope,client,control,onStatus,retryTerminal=true}={}){
 const resourceId=await photoAiCanonicalId(sdk,projectId,photo.resourceId);
 const jobs=client||photoAiClient(sdk,projectId,scope),identity='image:'+resourceId;
 if(control){control.ai=jobs;control.aiIdentity=identity;}
 const observed=await jobs.run({task:'person.matte',resourceId,options:{provider:'auto',outputMode:'alpha-frames',alphaEncoding:'grayscale-png-8bit'}},
  {identity,retryTerminal,signal:control?.observer?.signal,onProgress:status=>onStatus?.(status)});
 if(control?.canceled)throw Error('Canceled.');
 const manifest=observed.result?.files?.manifest;
 if(!manifest)throw Error('Shared photo analysis returned no mask manifest.');
 const prepared=await photoAiScript(sdk,`return await selects.ai.prepareMatte(${JSON.stringify(manifest)},${JSON.stringify(projectId)},{sourceKind:'image'});`,'Keep the shared photo mask',true);
 if(prepared.sourceKind!=='image'||prepared.sourceResourceId!==resourceId||!Number.isSafeInteger(prepared.frameSize?.width)||prepared.frameSize.width<1||!Number.isSafeInteger(prepared.frameSize?.height)||prepared.frameSize.height<1)throw Error('The shared photo mask does not match the selected photo.');
 const path=await photoAiScript(sdk,`return selects.files.pathFromLocalUrl(${JSON.stringify(prepared.maskUrl)});`,'Read the shared mask path');
 return {...prepared,path,workflowId:observed.workflowId};
}
// photo-ai:end

//shared-ai-jobs:start
const sharedAiJobs = (()=>{const module={exports:{}};
// Plugin-private durable orchestration of the existing public AI SDK.
// This module is bundled into panels; it has no Node or renderer-global dependencies.
const STATUS = new Set(['queued', 'running', 'canceling', 'succeeded', 'failed', 'canceled']);
const terminal = status => ['succeeded', 'failed', 'canceled'].includes(status);
const UUID = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;
const writes = new Map();
const error = (code, message) => Object.assign(new Error(message), { code });
const invalid = () => error('SHARED_AI_INVALID', 'Saved AI analysis does not match this source or task.');
const clone = value => JSON.parse(JSON.stringify(value));
function stable(value) {
  if (Array.isArray(value)) return '[' + value.map(stable).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + stable(value[k])).join(',') + '}';
  if (value === undefined || typeof value === 'function' || typeof value === 'symbol' || typeof value === 'bigint' || typeof value === 'number' && !Number.isFinite(value)) throw invalid();
  return JSON.stringify(value);
}
function attached(signal) {
  if (signal?.aborted) throw error('SHARED_AI_DETACHED', 'AI observation stopped. Reopen to recover the saved job.');
}
function inputFor(projectId, request) {
  if (!request || !['faces.detect', 'person.matte'].includes(request.task) || !UUID.test(request.resourceId)) throw invalid();
  const input = { runtimeId: 'selects-ai-runtime', projectId, resourceId: request.resourceId, task: request.task };
  if (request.sourceRange !== undefined) {
    const { startSeconds, endSeconds } = request.sourceRange || {};
    if (!Number.isFinite(startSeconds) || startSeconds < 0 || !Number.isFinite(endSeconds) || endSeconds <= startSeconds) throw invalid();
    input.sourceRange = { startSeconds, endSeconds };
  }
  if (request.options !== undefined) {
    if (!request.options || Array.isArray(request.options) || typeof request.options !== 'object') throw invalid();
    stable(request.options); input.options = clone(request.options);
  }
  return input;
}
async function requestKey(scope, identity, input, attempt) {
  const withoutKey = { ...input }; delete withoutKey.requestKey;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(stable({ scope, identity, input: withoutKey, attempt })));
  return 'shared-ai-' + Array.from(new Uint8Array(digest), n => n.toString(16).padStart(2, '0')).join('');
}
function createSharedAiJobClient(env) {
  const { projectId, scope, runScript, load, save } = env || {};
  if (typeof projectId !== 'string' || !projectId || typeof scope !== 'string' || !scope ||
      ![runScript, load, save].every(f => typeof f === 'function')) throw invalid();
  const storageKey = stable({ projectId, scope });
  const fresh = () => ({ version: 1, projectId, scope, records: [] });
  async function read() {
    let journal;
    try { journal = await load(); }
    catch (cause) {
      if (String(cause?.message || cause).trim() === 'The file is unavailable.' || /ENOENT|not found|does not exist/i.test(String(cause?.message || cause))) journal = null;
      else throw cause;
    }
    if (journal == null) return fresh();
    if (typeof journal === 'string') { try { journal = JSON.parse(journal); } catch { throw invalid(); } }
    if (journal.version !== 1 || journal.projectId !== projectId || journal.scope !== scope || !Array.isArray(journal.records) || journal.records.length > 10000) throw invalid();
    const keys = new Set();
    for (const r of journal.records) {
      if (!r || typeof r.identity !== 'string' || !Number.isSafeInteger(r.attempt) || r.attempt < 0 || r.attempt > 255 ||
          !/^shared-ai-[\da-f]{64}$/.test(r.input?.requestKey) || keys.has(r.input.requestKey) ||
          (r.workflowId !== undefined && (typeof r.workflowId !== 'string' || !r.workflowId)) ||
          (r.status !== undefined && !STATUS.has(r.status)) || (r.cancelRequested !== undefined && typeof r.cancelRequested !== 'boolean')) throw invalid();
      const input = inputFor(projectId, r.input);
      if (stable({ ...input, requestKey: r.input.requestKey }) !== stable(r.input)) throw invalid();
      keys.add(r.input.requestKey);
    }
    return clone(journal);
  }
  async function update(record) {
    const prior = writes.get(storageKey) || Promise.resolve();
    const pending = prior.catch(() => {}).then(async () => {
      const journal = await read(), i = journal.records.findIndex(r => r.input.requestKey === record.input.requestKey), old = journal.records[i];
      if (old?.workflowId && record.workflowId && old.workflowId !== record.workflowId) throw invalid();
      const next = { ...old, ...record, cancelRequested: Boolean(old?.cancelRequested || record.cancelRequested) };
      if (old?.workflowId) next.workflowId = old.workflowId;
      if (old && terminal(old.status)) next.status = old.status;
      if (i < 0) journal.records.push(next); else journal.records[i] = next;
      await save(clone(journal)); Object.assign(record, next);
    });
    writes.set(storageKey, pending);
    try { await pending; } finally { if (writes.get(storageKey) === pending) writes.delete(storageKey); }
  }
  async function ack(record, signal) {
    if (record.workflowId) return;
    attached(signal);
    const value = await runScript(`if(typeof selects.ai?.submit!=='function')throw new Error('AI_UPDATE_REQUIRED');const j=await selects.ai.submit(${JSON.stringify(record.input)});return {workflowId:j.workflowId};`, 'Start shared AI analysis', true);
    if (typeof value?.workflowId !== 'string' || !value.workflowId) throw invalid();
    record.workflowId = value.workflowId;
    // Preserve an acknowledgment even when a panel detached during submit.
    await update(record); attached(signal);
  }
  async function status(record, cancel = false) {
    const value = await runScript(`return await selects.ai.job(${JSON.stringify(record.workflowId)},${JSON.stringify(projectId)}).${cancel ? 'cancel' : 'status'}();`, cancel ? 'Cancel shared AI analysis' : 'Read shared AI progress', cancel);
    if (value?.workflowId !== record.workflowId || value.projectId !== projectId || value.runtimeId !== 'selects-ai-runtime' || value.task !== record.input.task || !STATUS.has(value.status)) throw invalid();
    record.status = value.status; await update(record); return value;
  }
  async function stop(record, options = {}) {
    record.cancelRequested = true; await update(record); await ack(record, options.signal);
    if (!terminal(record.status)) await status(record, true);
    const deadline = Date.now() + (options.maxWaitMs ?? 60000);
    while (!terminal(record.status)) {
      attached(options.signal);
      if (Date.now() >= deadline) throw error('SHARED_AI_CANCEL_PENDING', 'AI is still stopping. Cancellation is saved; reopen to recover it.');
      await new Promise(resolve => setTimeout(resolve, options.pollMs ?? env.pollMs ?? 500));
      await status(record);
    }
  }
  async function run(request, options = {}) {
    attached(options.signal);
    const input = inputFor(projectId, request), identity = options.identity ?? '';
    if (typeof identity !== 'string') throw invalid();
    const journal = await read();
    let record = journal.records.filter(r => r.identity === identity && stable(inputFor(projectId, r.input)) === stable(input)).sort((a, b) => b.attempt - a.attempt)[0];
    if (record && record.input.requestKey !== await requestKey(scope, identity, input, record.attempt)) throw invalid();
    // A detached panel can have saved 'running' while Main has since stopped.
    // Refresh only during recovery; failure of a newly submitted job is not retried.
    if (record?.workflowId && options.retryTerminal) {
      attached(options.signal); await status(record); attached(options.signal);
    }
    if (record && options.retryTerminal && record.cancelRequested && !terminal(record.status)) await stop(record, options);
    if (!record || options.retryTerminal && (['failed', 'canceled'].includes(record.status) || record.cancelRequested && terminal(record.status))) {
      const attempt = record ? record.attempt + 1 : 0;
      if (attempt > 255) throw invalid();
      record = { identity, attempt, input: { ...input, requestKey: await requestKey(scope, identity, input, attempt) } };
      await update(record);
    }
    await ack(record, options.signal);
    for (;;) {
      attached(options.signal);
      const latest = (await read()).records.find(r => r.input.requestKey === record.input.requestKey);
      if (!latest) throw invalid(); Object.assign(record, latest);
      const value = await status(record, record.cancelRequested && !terminal(record.status));
      attached(options.signal);
      if (record.cancelRequested || record.status === 'canceled') throw error('SHARED_AI_CANCELED', 'AI analysis was canceled. Start again to retry.');
      if (record.status === 'failed') throw error('SHARED_AI_FAILED', 'AI analysis failed. ' + String(value.lastErrorMessage || '').slice(0, 300));
      if (record.status === 'succeeded') {
        const result = await runScript(`return await selects.ai.job(${JSON.stringify(record.workflowId)},${JSON.stringify(projectId)}).result();`, 'Read shared AI result');
        attached(options.signal);
        if (result?.workflowId !== record.workflowId || result.task !== record.input.task || !result.files || typeof result.files !== 'object') throw invalid();
        return { workflowId: record.workflowId, input: clone(record.input), result };
      }
      options.onProgress?.(value);
      await new Promise(resolve => setTimeout(resolve, options.pollMs ?? env.pollMs ?? 500));
    }
  }
  async function cancel(options = {}) {
    const journal = await read();
    for (const record of journal.records) {
      if (options.identity !== undefined && record.identity !== options.identity || terminal(record.status)) continue;
      if (record.input.requestKey !== await requestKey(scope, record.identity, record.input, record.attempt)) throw invalid();
      await stop(record, options);
    }
  }
  return { run, cancel };
}
module.exports = { createSharedAiJobClient };

return module.exports;})();
//shared-ai-jobs:end

//shared-ai-resources:start
const sharedAiResources = (()=>{const module={exports:{}};
// Private joins between short run_script ids and persistent Project Resource ids.
const UUID = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;
const fingerprint = rows => JSON.stringify(rows.map(r => [r.resourceId, r.name, r.type]));
function canonicalResourceBindings(core, { projectId, draftId, trackKinds = ['Main'] } = {}) {
  if (!core?.owner?.projectId || projectId && core.owner.projectId !== projectId || draftId && core.sequenceJson?.id !== draftId) throw new Error('The Draft belongs to another Project.');
  const bindings = new Map();
  function walk(rows) {
    for (const row of rows || []) {
      const id = row.mediaReferences?.defaultMedia?.id;
      if (Number.isSafeInteger(row.id) && UUID.test(id)) {
        if (bindings.has(row.id) && bindings.get(row.id) !== id) throw new Error('Ambiguous clip source binding.');
        bindings.set(row.id, id);
      }
      if (Array.isArray(row.children)) walk(row.children);
    }
  }
  for (const track of core.sequenceJson?.tracks?.children || []) if (trackKinds.includes(track.kind)) walk(track.children);
  return bindings;
}
function pathKey(value) {
  const path = String(value).normalize('NFC'), windows = /^[a-z]:[\\/]|^\\\\/i.test(path);
  const normalized = path.replace(/\\/g, '/'); return windows ? normalized.toLowerCase() : normalized;
}
function runner(sdk, runScript) {
  return runScript || (async (script, summary, allowCommit = false) => {
    const value = await sdk.runScript({ script, summary, allowCommit });
    if (value?.isError || value?.result === undefined) throw new Error(value?.output || 'The Project read returned an incomplete result.');
    return value.result;
  });
}
async function joinRows(sdk, projectId, runScript, script) {
  const before = await sdk.call('listProjectResources', projectId);
  if (!Array.isArray(before)) throw new Error('Could not read Project Resources.');
  const observed = await runner(sdk, runScript)(script, 'Resolve persistent AI source');
  const after = await sdk.call('listProjectResources', projectId);
  if (!Array.isArray(after) || fingerprint(before) !== fingerprint(after) || observed?.count !== before.length || !Array.isArray(observed.rows)) throw new Error('Project Resources changed while resolving the AI source.');
  const out = new Map();
  for (const row of observed.rows) {
    const raw = before[row?.index];
    if (!Number.isSafeInteger(row?.index) || !raw || raw.name !== row.name || raw.type !== row.type || !UUID.test(raw.resourceId) || typeof row.id !== 'string') throw new Error('The persistent AI source could not be matched.');
    out.set(row.id, raw.resourceId);
  }
  return out;
}
async function resolveSharedAiResources(sdk, projectId, aliases, runScript) {
  if (!Array.isArray(aliases) || aliases.some(id => typeof id !== 'string' || !id)) throw new Error('Invalid AI source ids.');
  const wanted = [...new Set(aliases)];
  const mappings = await joinRows(sdk, projectId, runScript, `const p=selects.project(${JSON.stringify(projectId)});const all=await p.resources();const wanted=${JSON.stringify(wanted)};return {count:all.length,rows:all.flatMap((r,index)=>wanted.includes(r.resourceId)?[{index,id:r.resourceId,name:r.name,type:r.type}]:[])};`);
  for (const id of wanted) if (UUID.test(id)) {
    const raw = await sdk.call('listProjectResources', projectId);
    if (!raw.some(r => r.resourceId === id)) throw new Error('The AI source is no longer in this Project.');
    mappings.set(id, id);
  }
  if (wanted.some(id => !mappings.has(id))) throw new Error('The AI source id is unavailable.');
  return mappings;
}
async function importSharedAiResource(sdk, projectId, path, runScript) {
  if (typeof path !== 'string' || !path || !(/^(?:[a-z]:[\\/]|\\\\|\/)/i.test(path))) throw new Error('An absolute AI source path is required.');
  const run = runner(sdk, runScript);
  const script = `const p=selects.project(${JSON.stringify(projectId)});const all=await p.resources();const key=${pathKey.toString()};const aliases=new Set<string>();const visit=(rows:any[])=>{for(const n of rows||[]){if(n.type==='dir')visit(n.children);else if(n.path&&key(n.path)===key(${JSON.stringify(path)}))aliases.add(n.resourceId);}};const tree=await p.sourceFiles();if('fileTree' in tree)visit(tree.fileTree);else for(const f of tree.folders||[]){const part=await p.sourceFiles({folder:f.name});if('fileTree' in part)visit(part.fileTree);}return {count:all.length,rows:all.flatMap((r,index)=>aliases.has(r.resourceId)?[{index,id:r.resourceId,name:r.name,type:r.type}]:[])};`;
  let map = await joinRows(sdk, projectId, run, script);
  if (!map.size) {
    await run(`return await selects.project(${JSON.stringify(projectId)}).importFiles({paths:[${JSON.stringify(path)}]});`, 'Register AI source media', true);
    map = await joinRows(sdk, projectId, run, script);
  }
  const ids = [...new Set(map.values())];
  if (ids.length !== 1) throw new Error('The imported AI source path is missing or ambiguous.');
  return ids[0];
}
module.exports = { canonicalResourceBindings, resolveSharedAiResources, importSharedAiResource, importSharedAiVideo: importSharedAiResource };

return module.exports;})();
//shared-ai-resources:end
