'use strict';
function iou(a,b) {
  const inter=Math.max(0,Math.min(a.xmax,b.xmax)-Math.max(a.xmin,b.xmin))*Math.max(0,Math.min(a.ymax,b.ymax)-Math.max(a.ymin,b.ymin));
  return inter/Math.max(1,(a.xmax-a.xmin)*(a.ymax-a.ymin)+(b.xmax-b.xmin)*(b.ymax-b.ymin)-inter);
}
// Conservative window-local association. No claim of cross-camera identity.
function trackFaces(samples) {
  const tracks=[];
  for(let i=0;i<samples.length;i++) {
    const used=new Set(),matched=new Set();
    const pairs=[];
    tracks.forEach((t,ti)=>{if(i-t.at(-1).i<=5)samples[i].faces.forEach((f,fi)=>pairs.push({ti,fi,score:iou(t.at(-1).face.box,f.box)}));});
    pairs.sort((a,b)=>b.score-a.score);
    for(const p of pairs)if(p.score>=0.3&&!used.has(p.fi)&&!matched.has(p.ti)) {tracks[p.ti].push({i,face:samples[i].faces[p.fi]});used.add(p.fi);matched.add(p.ti);}
    samples[i].faces.forEach((face,fi)=>{if(!used.has(fi))tracks.push([{i,face}]);});
  }
  return tracks.filter(t=>t.length>=samples.length*.7);
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
// Match OpenCV demo's expanded crop -> 224 square -> middle112 grayscale.
function facePixels(rgb,width,height,geometry) {
  const [x,y,s]=geometry,left=Math.trunc(x-s*1.4),top=Math.trunc(y-s),right=Math.trunc(x+s*1.4),bottom=Math.trunc(y+s*1.8);
  const cw=Math.max(1,right-left),ch=Math.max(1,bottom-top),out=new Float32Array(112*112);
  const pixel=(xx,yy,c)=>xx<0||yy<0||xx>=width||yy>=height?110:rgb[(yy*width+xx)*3+c];
  for(let j=0;j<112;j++)for(let i=0;i<112;i++) {
    const sx=(i+56+.5)*cw/224-.5,sy=(j+56+.5)*ch/224-.5,x0=Math.floor(sx),y0=Math.floor(sy),fx=sx-x0,fy=sy-y0;
    const channels=[0,1,2].map(c=>Math.round((pixel(left+x0,top+y0,c)*(1-fx)+pixel(left+x0+1,top+y0,c)*fx)*(1-fy)+(pixel(left+x0,top+y0+1,c)*(1-fx)+pixel(left+x0+1,top+y0+1,c)*fx)*fy));
    out[j*112+i]=Math.round(.299*channels[0]+.587*channels[1]+.114*channels[2]);
  }
  return out;
}
module.exports={iou,trackFaces,smoothBoxes,facePixels};
