const cfg=__CONFIG__;
const p=selects.project(cfg.projectId);if(!(await p.meta()).draftIds.includes(cfg.sequenceId))throw Error('Draft is outside this project.');
const d=selects.draft(cfg.sequenceId);const before=await d.clips({trackScope:'all'});
for(const r of cfg.regions){
 if(before.some(c=>c.trackKind==='video'&&c.resourceId===null&&c.startFrame===r.startFrame&&c.endFrame===r.endFrame))continue;
 const intro=r.place===-1;const place=cfg.places[r.place];
 await d.addMotionGraphic({label:intro?'Opening title':'Place '+String(r.place+1).padStart(2,'0'),within:await d.rangeAtFrames(r.startFrame,r.endFrame),tsxCode:cfg.motionSource,parameters:{kind:intro?'intro':'place',title:intro?cfg.title:place.name,description:intro?cfg.subtitle:place.description,index:r.place+1,count:cfg.places.length,accent:cfg.accent||'#e5dc32',titleFont:'Times New Roman'},editableParameters:[{key:'title',label:intro?'City':'Place name',type:'text',defaultValue:''},{key:'description',label:intro?'Country or region':'Short note',type:'text',defaultValue:''},{key:'accent',label:'Title color',type:'color',defaultValue:'#e5dc32'},{key:'titleFont',label:'Title font',type:'text',defaultValue:'Times New Roman'}]});
}
await d.commitAll('Add separate editable Place Count titles');
return {sequenceId:cfg.sequenceId,graphics:(await d.clips({trackScope:'all'})).filter(c=>c.trackKind==='video').length};
