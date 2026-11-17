'use strict';
async function scoreSpeakerTrack({ort,model,visual,audioFeatures,n,signal,timed}) {
    const scores=new Float64Array(n);const began=performance.now();
    for(const seconds of [1,2,3])for(let offset=0;offset<n;offset+=seconds*25) {
      signal.throwIfAborted();const end=Math.min(n,offset+seconds*25),count=end-offset;
      const {at,vt}=timed.measure('speakerInput',()=>({
        at:new ort.Tensor('float32',audioFeatures.slice(offset*4*13,end*4*13),[1,count*4,13]),
        vt:new ort.Tensor('float32',visual.slice(offset*112*112,end*112*112),[1,count,112,112]),
      }));
      const out=await timed.measureAsync('speakerInference',()=>model.run({audio:at,video:vt}));
      try {timed.measure('speakerOutput',()=>{if(out.scores.data.length!==count)throw new Error('Speaker model output length mismatch');for(let i=0;i<count;i++){const score=out.scores.data[i];if(!Number.isFinite(score))throw new Error('Non-finite speaker score');scores[offset+i]+=score/3;}});}
      finally{at.dispose();vt.dispose();for(const v of Object.values(out))v.dispose();}
    }

return scores;
}
module.exports={scoreSpeakerTrack};
