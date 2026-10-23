'use strict';
// A change signal requests dense detection, not a semantic cut classification.
// Four samples per cell reduce sensitivity to individual noisy pixels.
function thumbnail(rgb,width,height){
 const out=new Float32Array(64*36*3);
 for(let y=0;y<36;y++)for(let x=0;x<64;x++)for(let c=0;c<3;c++){
  let sum=0;
  for(const dy of [.25,.75])for(const dx of [.25,.75]){
   const sx=Math.min(width-1,Math.floor((x+dx)*width/64)),sy=Math.min(height-1,Math.floor((y+dy)*height/36));sum+=rgb[(sy*width+sx)*3+c];
  }
  out[(y*64+x)*3+c]=sum/4;
 }
 return out;
}
function difference(a,b){
 let sum=0,changed=0;
 for(let i=0;i<a.length;i+=3){const d=(Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2]))/765;sum+=d;if(d>.1)changed++;}
 return {mean:sum/(a.length/3),changedFraction:changed/(a.length/3)};
}
function detectFrameChanges(rgb,width,height,count){
 const stride=width*height*3,events=[];let previous;
 for(let i=0;i<count;i++){
  const next=thumbnail(rgb.subarray(i*stride,(i+1)*stride),width,height);
  if(previous){const d=difference(previous,next);if(d.mean>.04&&d.changedFraction>.12)events.push({frame:i,...d});}
  previous=next;
 }
 return events;
}
module.exports={thumbnail,difference,detectFrameChanges};
