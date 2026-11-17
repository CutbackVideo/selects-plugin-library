'use strict';
// Light-ASD's 1/2/3-second ensemble can repeat an identical tail segment.
// Reuse only within this track/window: different faces must never share logits.
async function scoreSpeakerTrack({ort,model,audioFeatures,visual,n,signal,timed}) {
  const scores=new Float64Array(n),segments=new Map();
  for(const seconds of [1,2,3])for(let offset=0;offset<n;offset+=seconds*25) {
    signal.throwIfAborted();
    const end=Math.min(n,offset+seconds*25),count=end-offset,key=`${offset}:${end}`;
    let values=segments.get(key);
    if(!values) {
      const {at,vt}=timed.measure('speakerInput',()=>({
        at:new ort.Tensor('float32',audioFeatures.slice(offset*4*13,end*4*13),[1,count*4,13]),
        vt:new ort.Tensor('float32',visual.slice(offset*112*112,end*112*112),[1,count,112,112]),
      }));
      let out;
      try {
        out=await timed.measureAsync('speakerInference',()=>model.run({audio:at,video:vt}));
        values=timed.measure('speakerOutput',()=>{
          if(out.scores.data.length!==count)throw new Error('Speaker model output length mismatch');
          const copy=Float64Array.from(out.scores.data);
          if(!copy.every(Number.isFinite))throw new Error('Non-finite speaker score');
          return copy;
        });
        segments.set(key,values);
      } finally {at.dispose();vt.dispose();if(out)for(const v of Object.values(out))v.dispose();}
    }
    // Keep all three ensemble contributions in their original addition order.
    // Dropping a repeated tail would change its weight, even with equal logits.
    for(let i=0;i<count;i++)scores[offset+i]+=values[i]/3;
  }
  return scores;
}
module.exports={scoreSpeakerTrack};
