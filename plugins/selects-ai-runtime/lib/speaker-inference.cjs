'use strict';

// Windows of 1, 2 and 3 seconds can have identical trailing spans. Reuse
// only exactly identical tensor slices within this track/model invocation.
// Preserve all three contributions and their original floating-point order.
async function scoreSpeakerTrack({ort,model,visual,audioFeatures,n,signal,timed}) {
  const scores = new Float64Array(n), spans = new Map();
  for (const seconds of [1,2,3]) for (let offset=0; offset<n; offset+=seconds*25) {
    signal.throwIfAborted();
    const end = Math.min(n,offset+seconds*25), count = end-offset;
    const key = `${offset}:${end}`;
    let values = spans.get(key);
    if (!values) {
      const {at,vt} = timed.measure('speakerInput',()=>({
        at:new ort.Tensor('float32',audioFeatures.slice(offset*4*13,end*4*13),[1,count*4,13]),
        vt:new ort.Tensor('float32',visual.slice(offset*112*112,end*112*112),[1,count,112,112]),
      }));
      let out;
      try {
        out = await timed.measureAsync('speakerInference',()=>model.run({audio:at,video:vt}));
        values = timed.measure('speakerOutput',()=>{
          if (out.scores.data.length!==count) throw new Error('Speaker model output length mismatch');
          // Native output memory belongs to the tensor and is disposed below.
          const copy = Float64Array.from(out.scores.data);
          for (const value of copy) if (!Number.isFinite(value)) throw new Error('Non-finite speaker score');
          return copy;
        });
        spans.set(key,values);
      } finally {
        at.dispose(); vt.dispose();
        if (out) for (const tensor of Object.values(out)) tensor.dispose();
      }
    } else {
      timed.measure('speakerReuse',()=>{});
    }
    timed.measure('speakerOutput',()=>{
      for (let i=0; i<count; i++) scores[offset+i]+=values[i]/3;
    });
  }
  return scores;
}

module.exports = {scoreSpeakerTrack};
