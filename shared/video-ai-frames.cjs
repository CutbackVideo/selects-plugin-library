// prepareMatte owns durable URL adoption. Keep the entire sequence inside the
// edit script, copy only verified URLs through canonical filesystem methods,
// and send the panel bounded metadata. Postprocessing never reads job scratch.
// This helper accepts only newly encoded CFR sources whose source clock starts at zero.
async function prepareSharedAiVideoFrames(sdk,projectId,manifest,folder,expected) {
  const response=await sdk.runScript({summary:"Prepare durable shared AI masks",allowCommit:true,script:`
    const m=await selects.ai.prepareMatte(${JSON.stringify(manifest)},${JSON.stringify(projectId)});
    const expected=${JSON.stringify(expected)};
    if(!m.sourceRange || m.sourceRange.startSeconds!==0 ||
      !Number.isFinite(expected.fps) || expected.fps<=0 ||
      !Number.isSafeInteger(expected.frames) || expected.frames<1 ||
      m.sourceResourceId!==expected.resourceId || m.alphaEncoding!=='grayscale-png-8bit' ||
      m.frameSize.width!==expected.width || m.frameSize.height!==expected.height ||
      !Array.isArray(m.frames) || Math.abs(m.frames.length-expected.frames)>1 || !m.frames.length)
      throw new Error('Shared mask geometry or frame count differs from the source.');
    for(let i=0;i<m.frames.length;i++) {
      const f=m.frames[i];
      if(f.index!==i || !Number.isFinite(f.sourceTimeSeconds) ||
        Math.abs(f.sourceTimeSeconds-i/expected.fps)>1/expected.fps/2+0.0001)
        throw new Error('Shared mask clock differs from the encoded source.');
    }
    const folder=${JSON.stringify(folder)};
    await selects.files.mkdir(folder,{recursive:true});
    for(let i=0;i<m.frames.length;i++) {
      const path=await selects.files.pathFromLocalUrl(m.frames[i].url);
      const output=folder+${JSON.stringify(String(folder).includes("\\")?"\\":"/")}+'frame_'+String(i+1).padStart(6,'0')+'.png';
      await selects.files.copy(path,output);
    }
    return {count:m.frames.length,width:m.frameSize.width,height:m.frameSize.height};`});
  if(response?.isError || !Number.isSafeInteger(response?.result?.count)) throw new Error(response?.output||"The shared mask files could not be prepared.");
  const separator=String(folder).includes("\\")?"\\":"/";
  return {...response.result,pattern:folder.replace(/[\\/]+$/,"")+separator+"frame_%06d.png"};
}

module.exports={prepareSharedAiVideoFrames};
