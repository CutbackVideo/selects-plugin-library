// The runner prefixes const A = JSON-serialized inputs. Shared by Panel and chat.
const p = selects.project(A.projectId);
const pm = await p.meta();
const name = 'Portrait Stage · ' + A.jobId;
const found = [];
for (const id of pm.draftIds) {
  const m = await selects.draft(id).meta();
  if (m.name === name) found.push(id);
}
if (found.length > 1) throw new Error('Duplicate plugin Drafts found; inspect instead of creating another.');
if (found.length === 1) {
  const d=selects.draft(found[0]);
  return {draftId:found[0], reused:true, meta:await d.meta(), clips:await d.clips({trackScope:'all'}), link:await selects.editor.linkToDraftFrame(found[0],0)};
}
const flatten = ns => ns.flatMap(n=>n.type==='dir'?flatten(n.children):[n]);
async function getFiles(){const f=await p.sourceFiles();if(!('fileTree' in f))throw new Error('Source inventory is summarized; narrow the Project source scope before running.');return flatten(f.fileTree);}
let files=await getFiles();
for (const path of [A.input,A.output]) {
  if (!files.some(f=>f.path===path)) await p.importFiles({paths:[path]});
}
files=await getFiles();
const byPath = path => { const rows=files.filter(f=>f.path===path); if(rows.length!==1)throw new Error('Expected exactly one Resource for '+path); return rows[0]; };
const original=byPath(A.input), alpha=byPath(A.output);
const d=await p.createDraft({name});
const m=await d.meta();
if (Math.abs(m.fps-A.fps)>0.00001) throw new Error('Draft frame rate '+m.fps+' does not match source '+A.fps+'. No Draft saved.');
await d.insertResource({resourceId:original.resourceId});
await d.setFrameSize({width:540,height:960});
const end=(await d.clips({trackScope:'main'})).reduce((v,c)=>Math.max(v,c.endFrame),0);
if(end!==A.totalFrames) throw new Error('Source duration/frame count does not match intermediate.');
let span=await d.rangeAtFrames(0,end);
await d.addMotionGraphic({within:span,label:'Portrait Stage · Background',
 tsxCode:'import React from "react"; export default function Background({data}) { return <div style={{position:"absolute",inset:0,backgroundColor:data.color}}/>; }',
 parameters:{color:A.color,portraitStageJob:A.jobId},editableParameters:[{key:'color',label:'Background color',type:'color',defaultValue:A.color}]});
span=await d.rangeAtFrames(0,end);
await d.addMotionGraphic({within:span,label:'Portrait Stage · Person',
 tsxCode:'import React from "react"; import {Video} from "remotion"; export default function Person({data}) { return <Video src={data.videoSrc} muted style={{position:"absolute",inset:0,width:"100%",height:"100%",opacity:data.opacity}}/>; }',
 parameters:{videoSrc:A.videoSrc,opacity:1,portraitStageJob:A.jobId},editableParameters:[{key:'opacity',label:'Person opacity',type:'number',defaultValue:1,min:0,max:1,step:0.05}]});
span=await d.rangeAtFrames(0,end);
await d.addMotionGraphic({within:span,label:'Portrait Stage · Title',
 tsxCode:'import React from "react"; export default function Title({data}) { const family = data.fontFamily ? `"${data.fontFamily}", sans-serif` : "sans-serif"; return <div style={{position:"absolute",inset:0,color:data.textColor,fontFamily:family,textAlign:"center"}}><div style={{position:"absolute",top:62,left:42,width:456,fontSize:data.fontSize,fontWeight:800,lineHeight:1.15,whiteSpace:"pre-wrap",overflowWrap:"anywhere"}}>{data.title}</div><div style={{position:"absolute",top:170,left:238,width:64,height:3,backgroundColor:data.textColor}}/></div>; }',
 parameters:{title:A.title,textColor:'#FFFFFF',fontSize:42,fontFamily:'',portraitStageJob:A.jobId},
 editableParameters:[{key:'title',label:'Title',type:'text',defaultValue:A.title},{key:'textColor',label:'Title color',type:'color',defaultValue:'#FFFFFF'},{key:'fontSize',label:'Font size',type:'number',defaultValue:42,min:12,max:64,step:1},{key:'fontFamily',label:'Font family',type:'text',defaultValue:''}]});
const commit=await d.commitAll('Create editable Portrait Stage with separate background, alpha and title; preserve original audio');
const id=commit.createdDraftId;
if(!id) throw new Error('Draft commit returned no id; inspect project before retrying.');
return {draftId:id,reused:false,commit,meta:await d.meta(),clips:await d.clips({trackScope:'all'}),link:await selects.editor.linkToDraftFrame(id,0)};
