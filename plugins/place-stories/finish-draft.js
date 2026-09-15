const cfg=__CONFIG__;
const p=selects.project(cfg.projectId);if(!(await p.meta()).draftIds.includes(cfg.sequenceId))throw Error('Draft is outside this project.');
const d=selects.draft(cfg.sequenceId);const cs=await d.clips({trackScope:'all'});const main=cs.filter(c=>c.trackKind==='main');const end=main.reduce((n,c)=>Math.max(n,c.endFrame),0);
if(!cfg.sourceAudio)await d.setAudioTracks({target:await d.rangeAtFrames(0,end),audioSourceIndexes:[]});
if(cfg.music&&!cs.some(c=>c.trackKind==='audio')){
 const listing=await p.sourceFiles({folder:'(root)'});const music=listing.fileTree.find(f=>f.type==='audio'&&f.path===cfg.music.path);
 if(!music||!music.durationSeconds)throw Error('The selected music is unavailable.');
 const musicEnd=Math.min(end,Math.floor(music.durationSeconds*(await d.meta()).fps));
 if(musicEnd>0)await d.overlayResource({resource:p.resource(music.resourceId),over:await d.rangeAtFrames(0,musicEnd),sourceStartSeconds:0});
}
await d.commitAll('Finish editable Place Stories layers');
const latest=await d.clips({trackScope:'all'});const link=await selects.editor.linkToDraftFrame(cfg.sequenceId,0);
return {status:'ready',sequenceId:cfg.sequenceId,deepLinkUrl:link.deepLinkUrl,clipCount:latest.filter(c=>c.trackKind==='main').length,graphicCount:latest.filter(c=>c.trackKind==='video').length,audioCount:latest.filter(c=>c.trackKind==='audio').length,seconds:end/(await d.meta()).fps};
