'use strict';
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
module.exports={facePixels};
