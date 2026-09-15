const cfg=__CONFIG__;
const p=selects.project(cfg.projectId);if(!(await p.meta()).draftIds.includes(cfg.sequenceId))throw Error('Draft is outside this project.');
const d=selects.draft(cfg.sequenceId);const before=await d.clips({trackScope:'all'});
for(const r of cfg.regions){
 if(before.some(c=>c.trackKind==='video'&&c.resourceId===null&&c.startFrame===r.startFrame&&c.endFrame===r.endFrame))continue;
 const intro=r.place===-1;const place=cfg.places[r.place];
 await d.addMotionGraphic({label:intro?'Opening title':'Place '+String(r.place+1).padStart(2,'0'),within:await d.rangeAtFrames(r.startFrame,r.endFrame),tsxCode:cfg.motionSource,parameters:{kind:intro?'intro':'place',title:intro?cfg.title:place.name,description:intro?cfg.subtitle:place.description,index:r.place+1,count:cfg.places.length,accent:cfg.accent,contrast:0.72,titleFont:'Georgia'},editableParameters:[{key:'title',label:'Title',type:'text',defaultValue:''},{key:'description',label:'Short description',type:'text',defaultValue:''},{key:'accent',label:'Accent color',type:'color',defaultValue:'#d8c6aa'},{key:'contrast',label:'Background contrast',type:'number',defaultValue:0.72,min:0,max:1,step:0.05},{key:'titleFont',label:'Title font',type:'text',defaultValue:'Georgia'}]});
}
await d.commitAll('Add separate editable Place Stories titles');
return {sequenceId:cfg.sequenceId,graphics:(await d.clips({trackScope:'all'})).filter(c=>c.trackKind==='video').length};
