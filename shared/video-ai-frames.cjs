// prepareMatte owns durable URL adoption. Validate the entire sequence first,
// then copy verified URLs in bounded scripts: a long clip must not keep one
// script open beyond the host's deadline. Postprocessing never reads job scratch.
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
        Math.abs(f.sourceTimeSeconds-i/expected.fps)>1/expected.fps/2+0.0001 ||
        typeof f.url!=='string' || !f.url || /[\\r\\n]/.test(f.url))
        throw new Error('Shared mask clock differs from the encoded source.');
    }
    let prefix=m.frames[0].url;
    for(const f of m.frames) {
      let end=0;
      while(end<prefix.length && prefix[end]===f.url[end])end++;
      prefix=prefix.slice(0,end);
    }
    const suffixes=m.frames.map(f=>f.url.slice(prefix.length));
    const match=/^(\\d+)(\\.[a-z0-9]+)$/i.exec(suffixes[0]);
    const sequence=match && Number.isSafeInteger(Number(match[1])) &&
      suffixes.every((s,i)=>s===String(Number(match[1])+i).padStart(match[1].length,'0')+match[2])
      ? {start:Number(match[1]),width:match[1].length,extension:match[2]} : null;
    // This is lossless compression of every verified URL, never an assumption
    // that host filenames start at zero or use a particular naming convention.
    const result={count:m.frames.length,width:m.frameSize.width,height:m.frameSize.height,
      prefix,sequence,suffixes:sequence?null:suffixes.join('\\n')};
    if(JSON.stringify(result).length>128*1024)
      throw new Error('Shared mask URL metadata exceeds the bounded script result.');
    return result;`});
  if(response?.isError || !Number.isSafeInteger(response?.result?.count)) throw new Error(response?.output||"The shared mask files could not be prepared.");
  const prepared=response.result;
  if(prepared.count<1 || prepared.count>20000 || Math.abs(prepared.count-expected.frames)>1 ||
    prepared.width!==expected.width || prepared.height!==expected.height || typeof prepared.prefix!=="string")
    throw new Error("The shared mask preparation returned incomplete metadata.");
  const sequence=prepared.sequence;
  if(sequence && (!Number.isSafeInteger(sequence.start) || sequence.start<0 ||
    !Number.isSafeInteger(sequence.width) || sequence.width<1 || sequence.width>20 ||
    typeof sequence.extension!=="string" || !/^\.[a-z0-9]+$/i.test(sequence.extension)))
    throw new Error("The shared mask preparation returned invalid URL metadata.");
  const suffixes=sequence?null:typeof prepared.suffixes==="string"?prepared.suffixes.split("\n"):null;
  if(!sequence && suffixes?.length!==prepared.count)
    throw new Error("The shared mask preparation returned incomplete URL metadata.");
  const separator=String(folder).includes("\\")?"\\":"/";
  for(let first=0;first<prepared.count;first+=32) {
    const urls=Array.from({length:Math.min(32,prepared.count-first)},(_,offset)=>{
      const index=first+offset;
      return prepared.prefix+(sequence?String(sequence.start+index).padStart(sequence.width,"0")+sequence.extension:suffixes[index]);
    });
    const copied=await sdk.runScript({summary:"Copy durable shared AI masks",allowCommit:true,script:`
      const urls=${JSON.stringify(urls)}, folder=${JSON.stringify(folder)};
      await selects.files.mkdir(folder,{recursive:true});
      let next=0,failed=false;
      await Promise.all(Array.from({length:Math.min(8,urls.length)},async()=>{
        for(;;) {
          const index=next++;
          if(failed || index>=urls.length)return;
          try {
            const path=await selects.files.pathFromLocalUrl(urls[index]);
            const output=folder+${JSON.stringify(separator)}+'frame_'+String(${first}+index+1).padStart(6,'0')+'.png';
            await selects.files.copy(path,output);
          } catch(error) {failed=true;throw error;}
        }
      }));
      return {count:urls.length};`});
    if(copied?.isError || copied?.result?.count!==urls.length)
      throw new Error(copied?.output||"The shared mask files could not be copied.");
  }
  return {count:prepared.count,width:prepared.width,height:prepared.height,
    pattern:folder.replace(/[\\/]+$/,"")+separator+"frame_%06d.png"};
}

module.exports={prepareSharedAiVideoFrames};
