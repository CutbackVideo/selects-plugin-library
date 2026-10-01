// Fits the Travel Beat Vlog format to a song the user brings. The reference cuts on a ~90 BPM beat and on a
// drum roll (hits 0.10-0.13 s apart) at the first montage; this finds the song's tempo, beat grid and rolls, picks
// the window whose first montage starts on the longest roll, and returns a timing table in 30 fps frames:
// montage and grid cuts on the song's own hits, section cuts on its beat grid.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';

const SR=22050,HOP=110,N=1024,FPS=SR/HOP;
const REF_BEAT=30*60/89.4;                          // reference frames per beat (89.4 BPM at 30 fps)
const b=f=>(f-102)/REF_BEAT;                        // reference frame -> beats from the plane cut (frame 102)
const REF={m1:[12,16,19,22,25,28,32,35,38,42,48],g1:[149,153,158,163],g2:[229,233,237,242],m2:[364,368,374,379,384,390,395,400,405,410,416]};

// --- signal ------------------------------------------------------------------------------------------
export function decode(ffmpeg,file,maxSeconds=900){
 const raw=execFileSync(ffmpeg,['-v','error','-i',file,'-t',String(maxSeconds),'-vn','-ac','1','-ar',String(SR),'-f','f32le','-'],{maxBuffer:1<<30});
 return new Float32Array(raw.buffer,raw.byteOffset,raw.length/4);
}
function fft(re,im){  // in-place radix-2
 const n=re.length;
 for(let i=1,j=0;i<n;i++){let bit=n>>1;for(;j&bit;bit>>=1)j^=bit;j^=bit;if(i<j){[re[i],re[j]]=[re[j],re[i]];[im[i],im[j]]=[im[j],im[i]];}}
 for(let len=2;len<=n;len<<=1){const a=-2*Math.PI/len,wr=Math.cos(a),wi=Math.sin(a);
  for(let i=0;i<n;i+=len){let cr=1,ci=0;for(let k=0;k<len/2;k++){const p=i+k,q=p+len/2,tr=re[q]*cr-im[q]*ci,ti=re[q]*ci+im[q]*cr;re[q]=re[p]-tr;im[q]=im[p]-ti;re[p]+=tr;im[p]+=ti;const nr=cr*wr-ci*wi;ci=cr*wi+ci*wr;cr=nr;}}}
}
const hann=n=>Float64Array.from({length:n},(_,i)=>0.5-0.5*Math.cos(2*Math.PI*i/(n-1)));
function spectrum(x,start,n,win,re,im){for(let i=0;i<n;i++){re[i]=(x[start+i]||0)*win[i];im[i]=0;}fft(re,im);const m=new Float64Array(n/2+1);for(let i=0;i<=n/2;i++)m[i]=Math.hypot(re[i],im[i]);return m;}
// Positive log-spectral flux per hop in three bands; index k is centred at (k*HOP+N/2)/SR seconds.
export function flux(x){
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
// Hits: local maxima of the mid-band flux whose height above the +-150 ms median exceeds `prom` standard deviations.
export function hits(mid,prom=1.2){
 const m=mean(mid),sd=std(mid),z=Array.from(mid,v=>(v-m)/sd),w=Math.round(0.15*FPS),t=[],p=[];
 for(let k=2;k<z.length-2;k++){
  if(z[k]<Math.max(z[k-2],z[k-1],z[k+1],z[k+2]))continue;
  const base=median(z.slice(Math.max(0,k-w),k+w+1));
  if(z[k]-base>prom){t.push((k*HOP+N/2)/SR);p.push(z[k]-base);}
 }
 return {t,p};
}
// Rolls: >= minLen hits each 0.085-0.145 s after the previous (faster than 16ths at ~90 BPM).
export function rolls(t,minLen=5,lo=0.085,hi=0.145){
 const out=[];let cur=t.length?[0]:[];
 const close=()=>{if(cur.length>=minLen)out.push({start:t[cur[0]],end:t[cur.at(-1)],count:cur.length});};
 for(let i=1;i<t.length;i++){const g=t[i]-t[i-1];if(g>=lo&&g<=hi)cur.push(i);else{close();cur=[i];}}
 close();return out;
}
// Tempo from the full-band flux, scored with its 2x and 4x lags so the beat (not a triplet or dotted level) wins;
// 75-200 BPM, folded to half time above 150 (the format counts ~90 BPM beats). Phase from the kick band.
export function beatGrid(f){
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
function pickHits(h,a,c,n){
 const idx=[];for(let i=0;i<h.t.length;i++)if(h.t[i]>=a&&h.t[i]<c)idx.push(i);
 const sel=(idx.length<=n?idx:idx.sort((i,j)=>h.p[j]-h.p[i]).slice(0,n)).map(i=>h.t[i]).sort((u,v)=>u-v),out=[];
 for(const t of sel)if(!out.length||t-out.at(-1)>=2/30)out.push(t);
 return out;
}

// --- window choice -----------------------------------------------------------------------------------
export function analyseSamples(x){
 const dur=x.length/SR,f=flux(x),h=hits(f.mid),R=rolls(h.t),grid=beatGrid(f),P=grid.P;
 const K=(2*grid.bpm/89.4)>=2.5?1.5:1;
 const beats=[];for(let t=grid.phase;t<dur;t+=P)beats.push(t);
 const w=hann(4096),re=new Float64Array(4096),im=new Float64Array(4096);
 const ch=beats.map(t=>chromaAt(x,t,re,im,w));
 const nov=ch.map((c,i)=>i&&c&&ch[i-1]?c.reduce((s,v,j)=>s+Math.abs(v-ch[i-1][j]),0):0);
 const phase=[0,1,2,3].map(k=>{const v=nov.filter((_,i)=>i%4===k);return mean(v.length?v:[0]);}).reduce((bi,v,i,a)=>v>a[bi]?i:bi,0);
 const tb=timbreBlocks(x),blk=2048/SR;
 const rows=[];
 for(let n=0;n<beats.length;n++){
  const D=beats[n],T=fr=>D+K*b(fr)*P,start=T(12)-P/2,end=T(468);
  if(T(12)<0.1||end>dur-0.2)continue;
  const m1=pickHits(h,start,T(55)-P/8,11);if(!m1.length)continue;
  const m2=pickHits(h,T(364)-P/4,T(424)-P/8,11),g1=pickHits(h,T(147),T(182)-P/8,4),g2=pickHits(h,T(227),T(263)-P/8,4);
  const cuts=Math.min(11,m1.length)+Math.min(11,m2.length)+Math.min(4,g1.length)+Math.min(4,g2.length);
  const roll=Math.max(0,...R.filter(r=>Math.abs(r.start-T(12))<=P/2).map(r=>r.count));
  const ba=Math.floor(m1[0]/blk),bc=Math.min(tb.length,Math.floor(end/blk));
  const seg=tb.slice(ba,bc),cen=mean(seg.map(v=>v[0])),flat=mean(seg.map(v=>v[1]));
  rows.push({D,roll,cuts,downbeat:(n-phase)%4===0?1:0,timbre:Math.abs(cen-3169)/3169+Math.abs(flat-0.419)/0.419,m1,m2,g1,g2});
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
export function timingFrom(fit,cuts='hits'){
 const {P,K}=fit,w=fit.window,D=w.D,T=f=>D+K*b(f)*P,half=t=>D+Math.round((t-D)/(P/2))*(P/2);
 const fromRef=list=>list.map(T);
 let m1,m2,g1,g2;
 if(cuts==='reference'||w.m1.length<6){m1=fromRef(REF.m1);m2=fromRef(REF.m2);g1=fromRef(REF.g1);g2=fromRef(REF.g2);if(cuts!=='reference')m1[0]=w.m1[0];}
 else{m1=fill(w.m1,w.m1[0],T(55)-P/8,11,D,P);m2=fill(w.m2,T(364)-P/4,T(424)-P/8,11,D,P);g1=fill(w.g1,T(147),T(182)-P/8,4,D,P);g2=fill(w.g2,T(227),T(263)-P/8,4,D,P);}
 const t0=m1[0]-0.4,fr=t=>Math.round((t-t0)*30);
 const t={m1:m1.map(fr),g1:g1.map(fr),g2:g2.map(fr),m2:m2.map(fr)};
 t.hero=Math.max(fr(half(T(55))),t.m1.at(-1)+2);t.m1.push(t.hero);
 t.v12=fr(half(T(102)));t.v17=fr(half(T(182)));t.v22=fr(half(T(263)));t.v23=fr(half(T(343)));
 t.v26=Math.max(fr(half(T(424))),t.m2.at(-1)+2);t.m2.push(t.v26);
 t.fadeStart=+((T(449.45)-t0)*30).toFixed(2);t.fadeEnd=+((T(463.7)-t0)*30).toFixed(2);
 t.clipEnd=fr(T(465));t.durationFrames=fr(T(468));t.title=[t.hero+7,t.v12];
 const timing={durationFrames:t.durationFrames,m1:t.m1,g1:t.g1,g2:t.g2,m2:t.m2,v12:t.v12,v17:t.v17,v22:t.v22,v23:t.v23,fadeStart:t.fadeStart,fadeEnd:t.fadeEnd,clipEnd:t.clipEnd,title:t.title};
 return timing;
}
// The window of the song as the Draft's music: silence until the first cut (0.4 s, like the reference), the song
// from its first montage hit, the reference's fade, padded past the Draft so the overlay never runs out.
export function arrangeSong(ffmpeg,song,fit,timing,store){
 const st=fs.statSync(song),start=fit.window.m1[0];
 const key=crypto.createHash('sha1').update([song,st.size,st.mtimeMs,start.toFixed(3),JSON.stringify(timing)].join('|')).digest('hex').slice(0,20);
 const out=path.join(store,'songs','song-'+key+'.wav');
 if(fs.existsSync(out))return out;
 fs.mkdirSync(path.dirname(out),{recursive:true});
 const L=timing.durationFrames/30,fs0=timing.fadeStart/30,fe=timing.fadeEnd/30;
 execFileSync(ffmpeg,['-v','error','-y','-ss',String(start),'-t',String(L),'-i',song,'-af',
  `adelay=400|400,asetpts=N/SR/TB,atrim=0:${L},afade=t=out:st=${fs0}:d=${Math.max(0.05,fe-fs0)},apad=whole_dur=${L+0.6}`,'-ar','48000','-ac','2',out+'.tmp.wav']);
 fs.renameSync(out+'.tmp.wav',out);
 return out;
}

export function analyseSong(ffmpeg,song,{cuts='hits',store}={}){
 const fit=analyseSamples(decode(ffmpeg,song));
 const timing=timingFrom(fit,cuts);
 const audio=store?arrangeSong(ffmpeg,song,fit,timing,store):null;
 const w=fit.window;
 return {bpm:+fit.bpm.toFixed(2),songStart:+w.m1[0].toFixed(3),roll:w.roll,hitsUnderCuts:w.cuts,timing,audio};
}
