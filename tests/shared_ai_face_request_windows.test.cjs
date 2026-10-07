const test = require('node:test');
const assert = require('node:assert/strict');
const {faceRequestWindows, appendFaceSamples, FACE_DECODE_BUDGET} = require('../shared/face-request-windows.cjs');
const {sampleSelector} = require('../plugins/selects-ai-runtime/tasks/faces-detect.cjs');
const {ceilingTimeTicks} = require('../plugins/selects-ai-runtime/lib/video.cjs');
function selected(range, interval, fps, numerator=1, denominator=fps) {
  const base={numerator,denominator}, first=ceilingTimeTicks(range.startSeconds,base), after=ceilingTimeTicks(range.endSeconds,base);
  const increment=Math.round(denominator/numerator/fps), choose=sampleSelector({sourceRange:range,sampleEverySeconds:interval});
  const rows=[];let decoded=0;
  for(let pts=Math.ceil(first/increment)*increment;pts<after;pts+=increment){
    const sourceTimeSeconds=pts*numerator/denominator;
    if(choose(sourceTimeSeconds))rows.push({index:decoded,sourceTimeSeconds,faces:[]});
    decoded++;
  }
  return {rows,decoded};
}
for(const [label,fps,step,start,end,base] of [
  ['EO twelve minutes /30fps',30,15,240,961,{numerator:1,denominator:30}],
  ['A16Z twelve minutes /30fps',30,5,0,721,{numerator:1,denominator:30}],
  ['A16Z high source rate /60fps',60,10,240.1,961.2,{numerator:1,denominator:60}],
  ['EO fractional /29.97fps',30000/1001,15,240,961,{numerator:1,denominator:30000}],
  ['A16Z fractional /29.97fps from frame zero',30000/1001,5,0,1800,{numerator:1,denominator:30000}],
  ['A16Z fractional /59.94fps',60000/1001,10,0,1800,{numerator:1,denominator:60000}],
  ['A16Z nonzero fractional start /30fps',30,5,240.1,961.1,{numerator:1,denominator:30}],
])test(label+': runtime decoding stays bounded and samples equal one global request',()=>{
  const range={startSeconds:start,endSeconds:end}, interval=step/fps;
  const windows=faceRequestWindows({...range,sourceFps:fps,sampleEverySeconds:interval});
  assert.ok(windows.length>1);
  const baseline=selected(range,interval,fps,base.numerator,base.denominator).rows;
  const merged=[];
  for(const window of windows){
    const chunk=selected(window,interval,fps,base.numerator,base.denominator);
    assert.ok(chunk.decoded<FACE_DECODE_BUDGET);
    appendFaceSamples(merged,chunk.rows,window.acceptFromSeconds);
  }
  assert.deepEqual(merged.map(s=>s.sourceTimeSeconds),baseline.map(s=>s.sourceTimeSeconds));
  assert.equal(new Set(merged.map(s=>s.sourceTimeSeconds)).size,baseline.length);
  assert.deepEqual(merged.map(s=>s.index),merged.map((_,i)=>i));
});
test('a short span keeps its original range and a sparse grid skips unneeded gaps',()=>{
 assert.deepEqual(faceRequestWindows({startSeconds:240,endSeconds:241,sourceFps:60,sampleEverySeconds:.5}),[{startSeconds:240,endSeconds:241}]);
 const windows=faceRequestWindows({startSeconds:0,endSeconds:4000,sourceFps:60,sampleEverySeconds:1000});
 assert.equal(windows.length,4);assert.ok(windows.every(w=>(w.endSeconds-w.startSeconds)*60<4));
});
test('malformed clocks and duplicate/bad window boundaries fail before tracking',()=>{
 assert.throws(()=>faceRequestWindows({startSeconds:0,endSeconds:721,sourceFps:0,sampleEverySeconds:.5}),/clock/);
 const merged=[{index:0,sourceTimeSeconds:1,faces:[]}];
 appendFaceSamples(merged,[{index:0,sourceTimeSeconds:1,faces:[]}]);
 assert.equal(merged.length,1,'overlapping boundary observation is kept once');
 assert.throws(()=>appendFaceSamples(merged,[{index:0,sourceTimeSeconds:.9,faces:[]}]),/order/);
 assert.throws(()=>appendFaceSamples(merged,[{index:1,sourceTimeSeconds:2},{index:0,sourceTimeSeconds:3}]),/order/);
 assert.equal(merged.length,1);
});
