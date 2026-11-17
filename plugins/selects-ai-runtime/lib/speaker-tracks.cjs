'use strict';
function iou(a,b) {
  const inter=Math.max(0,Math.min(a.xmax,b.xmax)-Math.max(a.xmin,b.xmin))*Math.max(0,Math.min(a.ymax,b.ymax)-Math.max(a.ymin,b.ymin));
  return inter/Math.max(1,(a.xmax-a.xmin)*(a.ymax-a.ymin)+(b.xmax-b.xmin)*(b.ymax-b.ymin)-inter);
}
// Conservative window-local association. No claim of cross-camera identity.
// Samples are `stride` frames apart; a track survives a gap of five frames
// and is kept when its detections stand for 70% of the window's frames.
function trackFaces(samples,stride=1,frames=samples.length*stride) {
  const tracks=[],gap=Math.max(1,Math.round(5/stride));
  for(let i=0;i<samples.length;i++) {
    const used=new Set(),matched=new Set();
    const pairs=[];
    tracks.forEach((t,ti)=>{if(i-t.at(-1).i<=gap)samples[i].faces.forEach((f,fi)=>pairs.push({ti,fi,score:iou(t.at(-1).face.box,f.box)}));});
    pairs.sort((a,b)=>b.score-a.score);
    for(const p of pairs)if(p.score>=0.3&&!used.has(p.fi)&&!matched.has(p.ti)) {tracks[p.ti].push({i,face:samples[i].faces[p.fi]});used.add(p.fi);matched.add(p.ti);}
    samples[i].faces.forEach((face,fi)=>{if(!used.has(fi))tracks.push([{i,face}]);});
  }
  return tracks.filter(t=>t.length*stride>=frames*.7);
}
function smoothBoxes(track,count) {
  const boxes=[];let cursor=0;
  for(let i=0;i<count;i++) {
    while(cursor+1<track.length&&track[cursor+1].i<=i)cursor++;
    const a=track[cursor],b=track[Math.min(cursor+1,track.length-1)],f=Math.max(0,Math.min(1,(i-a.i)/Math.max(1,b.i-a.i)));
    const v=Object.fromEntries(['xmin','ymin','xmax','ymax'].map(k=>[k,a.face.box[k]+f*(b.face.box[k]-a.face.box[k])]));
    boxes.push([(v.xmin+v.xmax)/2,(v.ymin+v.ymax)/2,Math.max(v.xmax-v.xmin,v.ymax-v.ymin)/2]);
  }
  return boxes.map((_,i)=>[0,1,2].map(k=>Array.from({length:13},(_,j)=>boxes[i+j-6]?.[k]??0).sort((a,b)=>a-b)[6]));
}
// Frames strictly between a track's detections, with the box and detector
// score linear between them. Nothing is invented before or after the track.
function interpolateTrack(track) {
  const out=[];
  for(let t=1;t<track.length;t++) {
    const a=track[t-1],b=track[t];
    for(let i=a.i+1;i<b.i;i++) {
      const f=(i-a.i)/(b.i-a.i);
      const box=Object.fromEntries(['xmin','ymin','xmax','ymax'].map(k=>[k,a.face.box[k]+f*(b.face.box[k]-a.face.box[k])]));
      out.push({i,face:{box,score:a.face.score+f*(b.face.score-a.face.score),interpolated:true}});
    }
  }
  return out;
}
const {facePixels}=require('./speaker-face-crop.cjs');
module.exports={iou,trackFaces,interpolateTrack,smoothBoxes,facePixels};
