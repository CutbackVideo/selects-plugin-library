'use strict';
// python_speech_features defaults: rectangular 25ms windows, 10ms hop,
// pre-emphasis .97, 26 mel filters, orthonormal DCT, lifter22, log-energy c0.
function fftPower(input) {
  const re = new Float64Array(512), im = new Float64Array(512);
  re.set(input);
  for (let i=1,j=0;i<512;i++) {let bit=256;for(;j&bit;bit>>=1)j^=bit;j^=bit;if(i<j)[re[i],re[j]]=[re[j],re[i]];}
  for(let len=2;len<=512;len*=2)for(let base=0;base<512;base+=len)for(let j=0;j<len/2;j++) {
    const angle=-2*Math.PI*j/len,c=Math.cos(angle),s=Math.sin(angle),k=base+j,l=k+len/2;
    const tr=re[l]*c-im[l]*s,ti=re[l]*s+im[l]*c;re[l]=re[k]-tr;im[l]=im[k]-ti;re[k]+=tr;im[k]+=ti;
  }
  return Array.from({length:257},(_,i)=>(re[i]*re[i]+im[i]*im[i])/512);
}
const mel=f=>2595*Math.log10(1+f/700), hz=m=>700*(10**(m/2595)-1);
const bins=Array.from({length:28},(_,i)=>Math.floor(513*hz(mel(8000)*i/27)/16000));
function mfcc(pcm) {
  if(!pcm.length)throw new Error('No audio samples');
  const emphasized=Float64Array.from(pcm,(v,i)=>v-(i?0.97*pcm[i-1]:0));
  const count=1+Math.ceil(Math.max(0,pcm.length-400)/160),out=new Float32Array(count*13);
  for(let frame=0;frame<count;frame++) {
    const input=new Float64Array(400);input.set(emphasized.subarray(frame*160,frame*160+400));
    const power=fftPower(input),energy=Math.max(Number.EPSILON,power.reduce((a,b)=>a+b,0));
    const filters=Array.from({length:26},(_,m)=>{let sum=0;for(let k=bins[m];k<bins[m+1];k++)sum+=power[k]*(k-bins[m])/(bins[m+1]-bins[m]);for(let k=bins[m+1];k<bins[m+2];k++)sum+=power[k]*(bins[m+2]-k)/(bins[m+2]-bins[m+1]);return Math.log(Math.max(Number.EPSILON,sum));});
    for(let c=0;c<13;c++) {
      let sum=0;for(let m=0;m<26;m++)sum+=filters[m]*Math.cos(Math.PI*c*(2*m+1)/52);
      out[frame*13+c]=c===0?Math.log(energy):sum*Math.sqrt(2/26)*(1+11*Math.sin(Math.PI*c/22));
    }
  }
  return out;
}
module.exports={mfcc};
