const cfg = __CONFIG__;
const p = selects.project(cfg.projectId);
const meta = await p.meta();
if(!Array.isArray(cfg.sourceFiles))throw Error('Full-path source inventory is required.');
const files=cfg.sourceFiles;
const pathKey=s=>String(s).replace(/\\/g,'/').replace(/\/+$/,'');
const source = new Map(files.map(f=>[pathKey(f.path),f]));
for(const s of cfg.segments){const f=source.get(pathKey(s.path));if(!f||f.type!=='video'||!f.frameSize||s.start<0||s.end>f.durationSeconds+0.002)throw Error('A source no longer matches this story.');}
const matches=[];
if(cfg.sequenceId){if(!meta.draftIds.includes(cfg.sequenceId))throw Error('Draft is outside this project.');matches.push(cfg.sequenceId);}else{for(const id of meta.draftIds){if((await selects.draft(id).meta()).name===cfg.draftName)matches.push(id);}}
if(matches.length>1)throw Error('More than one draft matches this build.');
if(cfg.recoverOnly&&!matches.length)throw Error('No saved draft matches this build. Start a new story only after checking the project.');
const d=matches.length?selects.draft(matches[0]):await p.createDraft({name:cfg.draftName});
const expectedAliases=[];
if(!matches.length){
 for(const s of cfg.segments){await d.insertResource({resourceId:source.get(pathKey(s.path)).resourceId,sourceRange:{startSeconds:s.start,endSeconds:s.end}});expectedAliases.push((await d.clips({trackScope:'main'})).at(-1).resourceId);}
 await d.setFrameSize(cfg.frameSize);
 for(let i=0;i<cfg.segments.length;i++){
  const clip=(await d.clips({trackScope:'main'}))[i];const s=cfg.segments[i];const f=source.get(pathKey(s.path));const w=f.frameSize.width,h=f.frameSize.height,W=cfg.frameSize.width,H=cfg.frameSize.height;
  const fit=Math.min(W/w,H/h),fill=Math.max(W/w,H/h),scale=fill/fit;
  const dx=Math.max(-(w*fill-W)/2,Math.min((w*fill-W)/2,(0.5-s.cropX)*w*fill));
  const dy=Math.max(-(h*fill-H)/2,Math.min((h*fill-H)/2,(0.5-s.cropY)*h*fill));
  await d.setClipTransform({clip,scale:{x:scale,y:scale},position:{x:dx/H*100,y:dy/H*100}});
 }
}
if(matches.length){const probe=await p.createDraft({name:'Source identity check'});const aliasByPath=new Map();for(const path of new Set(cfg.segments.map(s=>s.path))){const f=source.get(pathKey(path));await probe.insertResource({resourceId:f.resourceId,sourceRange:{startSeconds:0,endSeconds:Math.min(0.1,f.durationSeconds)}});aliasByPath.set(path,(await probe.clips({trackScope:'main'})).at(-1).resourceId);}expectedAliases.push(...cfg.segments.map(s=>aliasByPath.get(s.path)));}
const clips=await d.clips({trackScope:'main'});
if(clips.length!==cfg.segments.length||clips.some((c,i)=>c.resourceId!==expectedAliases[i]))throw Error('Existing draft structure does not match this build.');
const regions=[];
for(let i=-1;i<cfg.places.length;i++){const indices=cfg.segments.map((s,j)=>s.place===i?j:-1).filter(j=>j>=0);if(indices.length)regions.push({place:i,startFrame:clips[indices[0]].startFrame,endFrame:clips[indices.at(-1)].endFrame});}
const result=matches.length?null:await d.commitAll('Create an editable Place Count draft');
const sequenceId=matches[0]||result?.createdDraftId;
if(!sequenceId)throw Error('The saved draft identifier is unavailable.');
return {sequenceId,regions,clipCount:clips.length,frameSize:(await d.meta()).frameSize,fps:(await d.meta()).fps,endFrame:clips.at(-1).endFrame,existing:!!matches.length};
