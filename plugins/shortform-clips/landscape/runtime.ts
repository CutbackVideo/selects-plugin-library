// These helpers are embedded in the standalone panel and its build script.
function landscapeTransform(L:any,source:{width:number;height:number}) {
  if(!(source?.width>0&&source?.height>0))throw new Error('Source frame size is required for landscape placement.');
  const fit=Math.min(1280/source.width,720/source.height);
  const scale=Math.min(L.videoWidth/source.width,L.videoWidth*9/16/source.height)/fit;
  return {scale,posX:(L.videoX+L.videoWidth/2-640)/720*100,posY:-(L.videoY+L.videoWidth*9/32-360)/720*100};
}
function landscapeSpeakerCues(words:any[],fps:number,lineMax:number,endFrame:number,fixes:any,makeCues:any,speakers:any[]) {
  const groups:any[][]=[];
  for(const word of words){
    const last=groups[groups.length-1],prev=last?.[last.length-1];
    if(!prev||prev[4]!==word[4]||prev[7]!==word[7])groups.push([word]);else last.push(word);
  }
  return groups.flatMap((group,i)=>{
    const limit=Math.min(endFrame,groups[i+1]?.[0]?.[1]??endFrame);
    const label=String(group[0][6]||'');
    const speaker=speakers.find((s:any)=>s.label.trim()===label&&s.name.trim());
    return makeCues(group,fps,lineMax,limit,fixes).map((cue:any)=>[cue[0],Math.min(cue[1],limit),cue[2],speaker||null]);
  });
}
