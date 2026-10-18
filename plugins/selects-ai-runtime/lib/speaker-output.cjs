'use strict';
function verifySpeakerOutput(doc,range,size) {
  if(doc?.contractVersion!==1||doc.task!=='speakers.detect'||doc.scoreKind!=='uncalibrated-logit'||doc.trackingScope!=='three-second-window'||doc.frameSize?.width!==size.width||doc.frameSize?.height!==size.height||!Array.isArray(doc.samples)||!doc.samples.length)throw new Error('Invalid speaker observations');
  let time=-Infinity,index=-1;
  for(const sample of doc.samples){
    if(!Number.isInteger(sample.index)||sample.index<=index||!Number.isFinite(sample.sourceTimeSeconds)||sample.sourceTimeSeconds<=time||sample.sourceTimeSeconds<range.startSeconds||sample.sourceTimeSeconds>=range.endSeconds||!Array.isArray(sample.faces))throw new Error('Invalid speaker observation timestamp');
    time=sample.sourceTimeSeconds;index=sample.index;
    for(const f of sample.faces){const b=f.box;if(!b||![b.xmin,b.ymin,b.xmax,b.ymax,f.score].every(Number.isFinite)||b.xmin<0||b.ymin<0||b.xmax>size.width+.000001||b.ymax>size.height+.000001||b.xmax<=b.xmin||b.ymax<=b.ymin||f.score<0||f.score>1)throw new Error('Invalid speaker face geometry');if(f.activeSpeakerScore!==undefined&&(!Number.isFinite(f.activeSpeakerScore)||typeof f.trackId!=='string'||!f.trackId))throw new Error('Invalid speaker score');}
  }
}
module.exports={verifySpeakerOutput};
