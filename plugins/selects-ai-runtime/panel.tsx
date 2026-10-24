// @name AI Test Lab
// @icon eye
import React, { useEffect, useRef, useState } from 'react';

const STRINGS = {
  en: {
    title: 'AI Test Lab', faces: 'Find faces', matte: 'Remove background', source: 'Source video', imageSource: 'Video or photo', chooseSource: 'Choose a source video', chooseImageSource: 'Choose a video or photo', unavailable: 'Saved source unavailable', duration: 'Source duration',
    facesIntro: 'Choose a source to find faces.', matteIntro: 'Separate the person, then open the result as editable clips.', openProject: 'Open a project first.',
    run: 'Run task', cancel: 'Cancel job', open: 'Open in editor', background: 'Background image', chooseBackground: 'Choose a background image',
    details: 'Details', reload: 'Refresh media list', refresh: 'Refresh job', recover: 'Recover same request', workflow: 'Workflow', preparing: 'preparing',
    storage: 'Recovery storage is unavailable. Keep the recovery details before closing this panel.', savedInvalid: 'Saved recovery data is not valid for this project.',
    missing: 'Saved source is no longer available. Saved results remain readable; choose an available source for a new task.', noRequest: 'No request to recover for this project.', invalidSource: 'Choose a source and positive video duration.', failed: 'AI request failed.',
    files: 'Add videos or images with this Project’s Add button. The list updates automatically.', diagram: 'Face coordinates, not the source image.', time: 'Source time', confidence: 'Confidence', noFaces: 'No faces in this sample',
    faceCount: (samples, faces) => `${samples} samples · ${faces} faces`, matteCount: frames => `${frames} frames processed`,
    addBackground: 'Add an image to this Project to use as the background.', invalidTiming: 'The prepared mask metadata is invalid.',
    draftStorage: 'Draft recovery storage is unavailable. Draft creation is blocked until recovery details can be saved.', draftUnknown: 'The Draft may already be saved. Click Open in editor to inspect its outcome before proceeding.',
    missingDraft: 'No saved Draft is visible yet. Inspect again; a missing acknowledgment does not establish that creation failed.', multipleDrafts: 'Multiple matching Drafts need manual inspection.',
    retention: 'The editor combines the original source with saved masks. Removing Draft clips keeps the source and masks available.', states: { queued: 'queued', running: 'running', canceling: 'canceling', succeeded: 'succeeded', failed: 'failed', canceled: 'canceled', interrupted: 'interrupted' },
  },
  ko: {
    title: 'AI \ud14c\uc2a4\ud2b8 \ub7a9', faces: '\uc5bc\uad74 \ucc3e\uae30', matte: '\ubc30\uacbd \uc81c\uac70', source: '\uc6d0\ubcf8 \uc601\uc0c1', imageSource: '\uc601\uc0c1 \ub610\ub294 \uc0ac\uc9c4', chooseImageSource: '\uc601\uc0c1\uc774\ub098 \uc0ac\uc9c4\uc744 \uc120\ud0dd\ud558\uc138\uc694', chooseSource: '\uc6d0\ubcf8 \uc601\uc0c1\uc744 \uc120\ud0dd\ud558\uc138\uc694', unavailable: '\uc800\uc7a5\ub41c \uc6d0\ubcf8 \uc5c6\uc74c', duration: '\ucc98\ub9ac\ud560 \uae38\uc774',
    facesIntro: '\uc6d0\ubcf8\uc744 \uace8\ub77c \uc5bc\uad74\uc744 \ucc3e\uc544\ubcf4\uc138\uc694.', matteIntro: '\uc778\ubb3c\uc744 \ubd84\ub9ac\ud55c \ub4a4 \ud3b8\uc9d1\uae30\uc5d0\uc11c \uacb0\uacfc\ub97c \ud655\uc778\ud558\uc138\uc694.', openProject: '\uba3c\uc800 \ud504\ub85c\uc81d\ud2b8\ub97c \uc5ec\uc138\uc694.',
    run: '\uc2e4\ud589', cancel: '\uc791\uc5c5 \ucde8\uc18c', open: '\ud3b8\uc9d1\uae30\uc5d0\uc11c \uc5f4\uae30', background: '\ubc30\uacbd \uc774\ubbf8\uc9c0', chooseBackground: '\ubc30\uacbd \uc774\ubbf8\uc9c0\ub97c \uc120\ud0dd\ud558\uc138\uc694',
    details: '\uc790\uc138\ud788', reload: '\ubbf8\ub514\uc5b4 \ubaa9\ub85d \uc0c8\ub85c\uace0\uce68', refresh: '\uc791\uc5c5 \uc0c1\ud0dc \uc0c8\ub85c\uace0\uce68', recover: '\uac19\uc740 \uc694\uccad \ubcf5\uad6c', workflow: '\uc791\uc5c5 ID', preparing: '\uc900\ube44 \uc911',
    storage: '\ubcf5\uad6c \uc815\ubcf4\ub97c \uc800\uc7a5\ud560 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4. \ud328\ub110\uc744 \ub2eb\uae30 \uc804\uc5d0 \uc790\uc138\ud788\uc5d0\uc11c \uc815\ubcf4\ub97c \ubcf4\uad00\ud558\uc138\uc694.', savedInvalid: '\uc800\uc7a5\ub41c \ubcf5\uad6c \uc815\ubcf4\uac00 \uc774 \ud504\ub85c\uc81d\ud2b8\uc640 \ub9de\uc9c0 \uc54a\uc2b5\ub2c8\ub2e4.',
    missing: '\uc800\uc7a5\ub41c \uc6d0\ubcf8\uc774 \uc5c6\uc2b5\ub2c8\ub2e4. \uc644\ub8cc\ub41c \uacb0\uacfc\ub294 \ubcfc \uc218 \uc788\uc2b5\ub2c8\ub2e4. \uc0c8 \uc791\uc5c5\uc5d0\ub294 \ub2e4\ub978 \uc6d0\ubcf8\uc744 \uc120\ud0dd\ud558\uc138\uc694.', noRequest: '\uc774 \ud504\ub85c\uc81d\ud2b8\uc5d0\uc11c \ubcf5\uad6c\ud560 \uc694\uccad\uc774 \uc5c6\uc2b5\ub2c8\ub2e4.', invalidSource: '\uc6d0\ubcf8 \uc601\uc0c1\uacfc 0\ubcf4\ub2e4 \ud070 \ucc98\ub9ac \uae38\uc774\ub97c \uc120\ud0dd\ud558\uc138\uc694.', failed: 'AI \uc694\uccad\uc774 \uc2e4\ud328\ud588\uc2b5\ub2c8\ub2e4.',
    files: '\ud504\ub85c\uc81d\ud2b8\uc758 \ucd94\uac00 \ubc84\ud2bc\uc73c\ub85c \uc601\uc0c1\uc774\ub098 \uc774\ubbf8\uc9c0\ub97c \ub123\uc73c\uc138\uc694. \ubaa9\ub85d\uc774 \uc790\ub3d9\uc73c\ub85c \uac31\uc2e0\ub429\ub2c8\ub2e4.', diagram: '\uc6d0\ubcf8 \uc774\ubbf8\uc9c0\uac00 \uc544\ub2cc \uc5bc\uad74 \uc88c\ud45c \ub3c4\uc2dd\uc785\ub2c8\ub2e4.', time: '\uc6d0\ubcf8 \uc2dc\uac01', confidence: '\uac80\ucd9c \uc2e0\ub8b0\ub3c4', noFaces: '\uc774 \uc0d8\ud50c\uc5d0\ub294 \uac80\ucd9c\ub41c \uc5bc\uad74\uc774 \uc5c6\uc2b5\ub2c8\ub2e4.',
    faceCount: (samples, faces) => `${samples}\uac1c \uc0d8\ud50c · \uc5bc\uad74 \uac80\ucd9c ${faces}\uac1c`, matteCount: frames => `${frames}\uac1c \ud504\ub808\uc784 \ucc98\ub9ac \uc644\ub8cc`,
    addBackground: '\ud504\ub85c\uc81d\ud2b8\uc5d0 \ubc30\uacbd\uc73c\ub85c \uc4f8 \uc774\ubbf8\uc9c0\ub97c \ucd94\uac00\ud558\uc138\uc694.', invalidTiming: '\uc900\ube44\ub41c \ub9c8\uc2a4\ud06c \uc815\ubcf4\uac00 \uc62c\ubc14\ub974\uc9c0 \uc54a\uc2b5\ub2c8\ub2e4.',
    draftStorage: '\ud3b8\uc9d1 \ubcf5\uad6c \uc815\ubcf4\ub97c \uc800\uc7a5\ud560 \uc218 \uc5c6\uc5b4 \ud3b8\uc9d1 \uc0dd\uc131\uc744 \uc911\ub2e8\ud588\uc2b5\ub2c8\ub2e4.', draftUnknown: '\ud3b8\uc9d1\uc774 \uc774\ubbf8 \uc800\uc7a5\ub418\uc5c8\uc744 \uc218 \uc788\uc2b5\ub2c8\ub2e4. \ud3b8\uc9d1\uae30\uc5d0\uc11c \uc5f4\uae30\ub97c \ub20c\ub7ec \uc800\uc7a5 \uacb0\uacfc\ub97c \ud655\uc778\ud558\uc138\uc694.',
    missingDraft: '\uc800\uc7a5\ub41c \ud3b8\uc9d1\uc774 \uc544\uc9c1 \ubcf4\uc774\uc9c0 \uc54a\uc2b5\ub2c8\ub2e4. \ub2e4\uc2dc \ud655\uc778\ud558\uc138\uc694. \uc751\ub2f5\uc774 \uc5c6\ub2e4\ub294 \uc774\uc720\ub85c \uc0dd\uc131 \uc2e4\ud328\ub97c \ub2e8\uc815\ud560 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4.', multipleDrafts: '\uac19\uc740 \uc774\ub984\uc758 \ud3b8\uc9d1\uc774 \uc5ec\ub7ec \uac1c \uc788\uc5b4 \uc9c1\uc811 \ud655\uc778\uc774 \ud544\uc694\ud569\ub2c8\ub2e4.',
    retention: '\ud3b8\uc9d1\uae30\ub294 \uc6d0\ubcf8\uacfc \uc800\uc7a5\ub41c \ub9c8\uc2a4\ud06c\ub97c \ud569\uc131\ud569\ub2c8\ub2e4. \ud074\ub9bd\uc744 \uc0ad\uc81c\ud574\ub3c4 \uc6d0\ubcf8\uacfc \ub9c8\uc2a4\ud06c\ub294 \uc720\uc9c0\ub429\ub2c8\ub2e4.', states: { queued: '\ub300\uae30 \uc911', running: '\uc2e4\ud589 \uc911', canceling: '\ucde8\uc18c \uc911', succeeded: '\uc644\ub8cc', failed: '\uc2e4\ud328', canceled: '\ucde8\uc18c\ub428', interrupted: '\uc911\ub2e8\ub428' },
  },
};

// BEGIN GENERATED NATIVE MATTE
// Prepare the original picture and its saved luminance masks side by side.
// The WGSL effect samples both halves and applies the mask on the GPU. The
// intermediate contains no baked composite and retains the original Main audio.
async function preparePackedMatte(run, storage, workflowId, projectId, image, current) {
 const key='wgsl-matte-input:'+workflowId;
 const call=(fn,arg)=>run('return await ('+fn.toString()+')(selects,'+JSON.stringify(arg)+');',true);
 const read=async()=>{const text=await storage.getItem(key);return text?JSON.parse(text):null;};
 let state=await read();
 if(!state) {
  state=await call(async function(selects,cfg){
   const result=await selects.ai.job(cfg.workflowId,cfg.projectId).result();
   if(!result.files.manifest)throw Error('This job has no matte manifest.');
   const matte=cfg.image?await selects.ai.prepareMatte(result.files.manifest,cfg.projectId,{sourceKind:'image'}):await selects.ai.prepareMatte(result.files.manifest,cfg.projectId);
   const p=selects.project(cfg.projectId),files=[];
   const walk=nodes=>{for(const n of nodes||[])if(n.type==='dir')walk(n.children);else files.push(n);};
   const root=await p.sourceFiles();if('fileTree' in root)walk(root.fileTree);else for(const folder of root.folders||[]){const child=await p.sourceFiles({folder:folder.name});if('fileTree' in child)walk(child.fileTree);}
   const source=files.find(f=>f.resourceId===matte.sourceResourceId);if(!source?.path)throw Error('The original matte source is unavailable.');
   const first=await selects.files.pathFromLocalUrl((matte.sourceKind==='image')?matte.maskUrl:matte.frames[0].url);
   const slash=Math.max(first.lastIndexOf('/'),first.lastIndexOf('\\')),folder=first.slice(0,slash+1);
   const extension=(matte.sourceKind==='image')?'.png':'.mov',path=folder+'packed-wgsl-source-v1'+extension;
   const metadata={sourceKind:(matte.sourceKind==='image')?'image':'video',sourceResourceId:matte.sourceResourceId,sourceRange:(matte.sourceKind==='image')?null:matte.sourceRange,frameSize:matte.frameSize,alphaEncoding:matte.alphaEncoding,frameCount:(matte.sourceKind==='image')?1:matte.frames.length,maskUrl:(matte.sourceKind==='image')?matte.maskUrl:null};
   // The final name is published only after verification. A retry can reuse it.
   if(await selects.files.exists(path))return {...metadata,path,status:'ready'};
   if(matte.frameSize.width*matte.frameSize.height*2>33554432)throw Error('The packed mask input exceeds the native image pixel budget.');
   const temp=folder+'packed-wgsl-source-'+Date.now()+'-'+Math.random().toString(36).slice(2)+extension;
   const args=['-v','error','-nostdin','-n'];
   if((matte.sourceKind==='image'))args.push('-i',source.path,'-i',first);
   else {
    const frames=matte.frames;if(!frames.length)throw Error('The matte contains no frames.');
    const list=[];for(let i=0;i<frames.length;i++){
     const path=await selects.files.pathFromLocalUrl(frames[i].url);if(/[\r\n]/.test(path))throw Error('A mask path contains a newline.');
     const duration=(frames[i+1]?.sourceTimeSeconds??matte.sourceRange.endSeconds)-frames[i].sourceTimeSeconds;
     if(!(duration>0))throw Error('The matte frame times are not increasing.');
     list.push("file '"+path.replace(/\\/g,'/').replace(/'/g,"'\\''")+"'\noption framerate 1000000\nduration "+duration);
    }
    const listPath=temp+'.ffconcat',bytes=Array.from(encodeURIComponent('ffconcat version 1.0\n'+list.join('\n')+'\n').replace(/%([0-9A-F]{2})/g,(_,h)=>String.fromCharCode(parseInt(h,16))),c=>c.charCodeAt(0));
    const base64=bytes=>{const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';let out='';for(let i=0;i<bytes.length;i+=3){const a=bytes[i],b=bytes[i+1]||0,c=bytes[i+2]||0;out+=alphabet[a>>2]+alphabet[((a&3)<<4)|(b>>4)]+(i+1<bytes.length?alphabet[((b&15)<<2)|(c>>6)]:'=')+(i+2<bytes.length?alphabet[c&63]:'=');}return out;};
    for(let offset=0;offset<bytes.length;offset+=49152){const part=bytes.slice(offset,offset+49152);const wrote=await selects.files.writeChunk({path:listPath,offset,base64:base64(part)});if(wrote.bytesWritten!==part.length)throw Error('The matte input list was truncated.');}
    args.push('-ss',String(matte.sourceRange.startSeconds),'-t',String(matte.sourceRange.endSeconds-matte.sourceRange.startSeconds),'-i',source.path,'-f','concat','-safe','0','-i',listPath);
   }
   // Match the prepared upright display raster and preserve the original RGB.
   const w=matte.frameSize.width,h=matte.frameSize.height;
   args.push('-filter_complex',`[0:v]setpts=PTS-STARTPTS,scale=${w}:${h},setsar=1,format=rgba[src];[1:v]setpts=PTS-STARTPTS,scale=${w}:${h},setsar=1,format=rgba[mask];[src]pad=${w*2}:${h}:0:0:color=black@0[canvas];[canvas][mask]overlay=x=${w}:y=0:shortest=0:repeatlast=1:format=auto[out]`,'-map','[out]','-an');
   if((matte.sourceKind==='image'))args.push('-frames:v','1','-c:v','png','-pix_fmt','rgba');
   else args.push('-t',String(matte.sourceRange.endSeconds-matte.sourceRange.startSeconds),'-c:v','prores_ks','-profile:v','4','-pix_fmt','yuva444p10le','-alpha_bits','16','-fps_mode','vfr');
   args.push(temp);return {...metadata,path,temp,args,status:'prepared'};
  },{workflowId,projectId,image});
  await storage.setItem(key,JSON.stringify(state));
 }
 if(!current())throw Error('The project changed while preparing a matte.');
 if(state.status==='prepared'){
  state={...state,status:'starting'};await storage.setItem(key,JSON.stringify(state));
  const ack=await run('return await selects.media.startFFmpeg({args:'+JSON.stringify(state.args)+'});',true);
  state={...state,jobId:ack.jobId,status:'encoding'};await storage.setItem(key,JSON.stringify(state));
 }
 if(state.status==='starting')throw Error('The mask-input encoder acknowledgment is unknown. Preserve this preparation record and inspect the local media job before retrying.');
 const wait=async jobId=>{for(;;){if(!current())throw Error('The project changed while preparing a matte.');const status=await run('return await selects.media.job('+JSON.stringify(jobId)+').status();');if(status.state==='succeeded')return;if(status.state==='failed'||status.state==='cancelled')throw Error(status.error||'Mask input preparation failed.');await new Promise(resolve=>setTimeout(resolve,200));}};
 if(state.status==='encoding'){
  try{await wait(state.jobId);}catch(error){await run('return await selects.media.job('+JSON.stringify(state.jobId)+').cancel();',true).catch(()=>{});throw error;}
  // Decoding the entire result catches a truncated or corrupt intermediate.
  const check=await run('return await selects.media.startFFmpeg({args:'+JSON.stringify(['-v','error','-nostdin','-i',state.temp,'-map','0:v:0','-f','null','-'])+'});',true);
  try{await wait(check.jobId);}catch(error){await run('return await selects.media.job('+JSON.stringify(check.jobId)+').cancel();',true).catch(()=>{});throw error;}
  await call(async function(selects,state){if(!await selects.files.exists(state.path))await selects.files.rename(state.temp,state.path);return true;},state);
  state={...state,status:'ready'};await storage.setItem(key,JSON.stringify(state));
 }
 if(state.status!=='ready')throw Error('The prepared mask input is not ready.');
 const imported=await call(async function(selects,cfg){
  const p=selects.project(cfg.projectId);await p.importFiles({paths:[cfg.path]});const files=[];const walk=nodes=>{for(const n of nodes||[])if(n.type==='dir')walk(n.children);else files.push(n);};const root=await p.sourceFiles();if('fileTree' in root)walk(root.fileTree);else for(const folder of root.folders||[]){const child=await p.sourceFiles({folder:folder.name});if('fileTree' in child)walk(child.fileTree);}
  const normalize=p=>String(p).replace(/\\/g,'/');const source=files.find(f=>normalize(f.path)===normalize(cfg.path));if(!source)throw Error('The packed matte input was not imported.');return source.resourceId;
 },{projectId,path:state.path});
 return {...state,packedResourceId:imported};
}

const PACKED_MATTE_SHADER="(()=>{// shared/shader-effects/graph.mjs\nvar IMAGE = `\nfn sat(x:f32)->f32{return clamp(x,0.0,1.0);}\nfn straight(c:vec4f)->vec4f{return vec4f(c.rgb/max(c.a,0.000001),c.a);}\nfn premul(c:vec4f)->vec4f{return vec4f(c.rgb*c.a,c.a);}\nfn over(a:vec4f,b:vec4f)->vec4f{return a+b*(1.0-a.a);}\nfn within(p:vec2f,size:vec2f)->f32 {\n let a=clamp(p*size+0.5,vec2f(0.0),vec2f(1.0));\n let b=clamp((1.0-p)*size+0.5,vec2f(0.0),vec2f(1.0));return a.x*a.y*b.x*b.y;\n}\nfn source(p:vec2f)->vec4f{return textureSampleLevel(input0,linearSampler,p,0.0)*within(p,vec2f(textureDimensions(input0)));}\nfn rotate(p:vec2f,a:f32)->vec2f {let c=cos(a);let s=sin(a);return vec2f(c*p.x-s*p.y,s*p.x+c*p.y);}\nfn ease(p:f32)->f32{let q=sat(p);return q*q*(3.0-2.0*q);}\nfn outCubic(p:f32)->f32{return 1.0-pow(1.0-sat(p),3.0);}\nfn roundRect(p:vec2f,size:vec2f,r:f32)->f32 {\n let q=abs(p-size*0.5)-size*0.5+r;\n let d=length(max(q,vec2f(0.0)))+min(max(q.x,q.y),0.0)-r;\n return sat(0.5-d);\n}\nfn saturation(c:vec3f,s:f32)->vec3f{return clamp(mix(vec3f(dot(c,vec3f(.213,.715,.072))),c,s),vec3f(0.0),vec3f(1.0));}\nfn sepia(c:vec3f,s:f32)->vec3f {\n let v=vec3f(dot(c,vec3f(.393,.769,.189)),dot(c,vec3f(.349,.686,.168)),dot(c,vec3f(.272,.534,.131)));\n return clamp(mix(c,v,sat(s)),vec3f(0.0),vec3f(1.0));\n}\nfn hue(c:vec3f,a:f32)->vec3f {\n let co=cos(a);let si=sin(a);\n let r=vec3f(.213,.715,.072)+co*vec3f(.787,-.715,-.072)+si*vec3f(-.213,-.715,.928);\n let g=vec3f(.213,.715,.072)+co*vec3f(-.213,.285,-.072)+si*vec3f(.143,.140,-.283);\n let b=vec3f(.213,.715,.072)+co*vec3f(-.213,-.715,.928)+si*vec3f(-.787,.715,.072);\n return clamp(vec3f(dot(c,r),dot(c,g),dot(c,b)),vec3f(0.0),vec3f(1.0));\n}\nfn contrast(c:vec3f,s:f32)->vec3f{return clamp((c-.5)*s+.5,vec3f(0.0),vec3f(1.0));}\nfn brightness(c:vec3f,s:f32)->vec3f{return clamp(c*s,vec3f(0.0),vec3f(1.0));}\n`;\nfunction number(value, fallback = 0) {\n  const n = typeof value === \"number\" ? value : Number(value);\n  return value == null || value === \"\" || !Number.isFinite(n) ? fallback : n;\n}\nvar Graph = class {\n  data = null;\n  passes = [];\n  images = [];\n  uniforms = [];\n  svgParameters = [];\n  constructor(data = {}) {\n    this.data = data;\n  }\n  pass(body, { inputs = [\"source\"], values = [], bindings = [], functions = \"\", scale = 1 } = {}) {\n    const id = `p${this.passes.length}`;\n    this.passes.push({ id, inputs, parameters: values, wgsl: IMAGE + functions + `\nfn effect(uv:vec2f)->vec4f {${body}}`, ...scale !== 1 ? { scale } : {} });\n    for (const binding of bindings) this.uniforms.push({ pass: id, ...binding });\n    return id;\n  }\n  image(svg, size = null) {\n    const id = `image${this.images.length}`;\n    this.images.push({ id, svg, ...size ? { size } : {} });\n    return id;\n  }\n  finish(output = this.passes.at(-1)?.id) {\n    if (!output || !this.passes.some((p) => p.id === output)) throw Error(\"Missing shader output\");\n    if (this.passes.length > 128 || this.images.length > 16) throw Error(\"Effect exceeds shader graph budget\");\n    for (const p of this.passes) {\n      if (p.parameters.length > 4096 || p.parameters.some((n) => !Number.isFinite(n))) throw Error(\"Invalid shader parameters\");\n      if (p.wgsl.length > 262144 || p.inputs.length > 8) throw Error(\"Effect exceeds shader pass budget\");\n    }\n    return { graph: { schema: \"Cutback.ShaderEffect.1\", passes: this.passes, output, ...this.images.length ? { images: this.images } : {} }, ...this.uniforms.length ? { uniforms: this.uniforms } : {}, ...this.svgParameters.length ? { svgParameters: this.svgParameters } : {} };\n  }\n};\nfunction parameters(data, defaults) {\n  const values = [], bindings = [], refs = /* @__PURE__ */ Object.create(null);\n  for (const [key, fallback] of Object.entries(defaults)) {\n    const index = values.length;\n    values.push(number(data[key], Number(fallback)));\n    if (data[key] != null) bindings.push({ index, parameter: key });\n    refs[key] = `uniforms.values[${Math.floor(index / 4)}][${index % 4}]`;\n  }\n  return { values, bindings, refs };\n}\n\n// shared/shader-effects/matte.mjs\nfunction packedMatte(data = null) {\n  data = data || {};\n  const g = new Graph(data), p = parameters(data, { opacity: 1 });\n  g.pass(`let size=vec2f(textureDimensions(input0));let left=clamp(vec2f(uv.x*.5,uv.y),.5/size,vec2f(.5-.5/size.x,1.0-.5/size.y));let right=clamp(vec2f(.5+uv.x*.5,uv.y),vec2f(.5+.5/size.x,.5/size.y),1.0-.5/size);let c=textureSampleLevel(input0,linearSampler,left,0.0);let mask=textureSampleLevel(input0,linearSampler,right,0.0);return c*sat(dot(straight(mask).rgb,vec3f(.2126,.7152,.0722)))*sat(${p.refs.opacity});`, p);\n  return g.finish();\n}\n\n// shared/shader-effects/selects-ai-runtime.mjs\nfunction options(kind, input, context = null) {\n  context = context || {};\n  if (\"tsxCode\" in input) throw Error(\"A WGSL effect cannot carry legacy TSX\");\n  const data = { ...Object.fromEntries((input.editableParameters || []).map((control) => [control.key, control.defaultValue])), ...input.parameters };\n  let shader;\n  switch (kind) {\n    case \"matte\":\n      shader = packedMatte(data);\n      break;\n    default:\n      throw Error(\"Unknown selects-ai-runtime effect: \" + kind);\n  }\n  return { ...input, parameters: data, shader };\n}\n\nreturn options;})()";
// END GENERATED NATIVE MATTE

const terminal = status => ['succeeded', 'failed', 'canceled'].includes(status);
const savedInputIsValid = (input, projectId) => input?.runtimeId === 'selects-ai-runtime' &&
  input.projectId === projectId && typeof input.requestKey === 'string' && input.requestKey &&
  typeof input.resourceId === 'string' && input.resourceId && !/^r\d+$/.test(input.resourceId) &&
  ['faces.detect', 'person.matte'].includes(input.task) &&
  (input.sourceRange === undefined ? input.options?.sampleEverySeconds === undefined && input.options?.outputMode !== 'foreground-video' : (input.sourceRange?.startSeconds === 0 &&
    Number.isFinite(input.sourceRange?.endSeconds) && input.sourceRange.endSeconds > 0)) &&
  (input.options?.outputMode == null || ['foreground-video', 'alpha-frames'].includes(input.options.outputMode)) &&
  (input.options?.alphaEncoding == null || ['grayscale-png-8bit', 'grayscale-avif-8bit'].includes(input.options.alphaEncoding));

const recoveryKey = (projectId, task) => `selects-ai-runtime:lab:${projectId}:${task}`;
function recoveryStorage(sdk) {
  if (!sdk.storage?.getItem || !sdk.storage?.setItem) throw new Error("Update Selects to use persistent plugin storage, then reopen this panel.");
  return sdk.storage;
}
const recoveryWrites = new Map();
function orderedRecovery(key, write) {
  const pending = (recoveryWrites.get(key) || Promise.resolve()).catch(() => {}).then(write);
  recoveryWrites.set(key, pending);
  return pending;
}
async function readSaved(sdk, projectId, task) {
  const stored = await recoveryStorage(sdk).getItem(recoveryKey(projectId, task));
  if (stored !== null) return JSON.parse(stored);
  // Read the previous single-task record without deleting or rewriting it.
  // An explicit action publishes to the matching task's new key only.
  const legacy = JSON.parse(await recoveryStorage(sdk).getItem(`selects-ai-runtime:lab:${projectId}`) || 'null');
  return legacy?.input?.task === task ? legacy : null;
}

// Public SDK consumer; both task panes stay mounted so switching modes keeps jobs.
export default function AiRuntimeLab({ sdk, context, ui: U }) {
  const [mode, setMode] = useState('faces.detect');
  const S = STRINGS[context.language?.toLowerCase().startsWith('ko') ? 'ko' : 'en'];
  useEffect(() => { setMode('faces.detect'); }, [context.projectId]);
  return <U.Section title={S.title}><U.Stack gap={8}>
    <U.Tabs value={mode} onChange={setMode} tabs={[{ value: 'faces.detect', label: S.faces, content: null }, { value: 'person.matte', label: S.matte, content: null }]} />
    {['faces.detect', 'person.matte'].map(task => <div key={task} data-task={task} hidden={mode !== task}>
      <TaskPane sdk={sdk} context={context} U={U} task={task} active={mode === task} />
    </div>)}
  </U.Stack></U.Section>;
}

function TaskPane({ sdk, context, U, task, active }) {
  useAppUpdateGuard(sdk, context?.language, () => !!(busy || busyRef.current || !!pending || !restored));
  const projectId = context.projectId;
  const S = STRINGS[context.language?.toLowerCase().startsWith('ko') ? 'ko' : 'en'];
  const [resources, setResources] = useState([]);
  const [imageSupported, setImageSupported] = useState(false);
  const [resourceId, setResourceId] = useState(null);
  const [backgrounds, setBackgrounds] = useState([]);
  const [backgroundId, setBackgroundId] = useState(null);
  const [draftAttempt, setDraftAttempt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [restored, setRestored] = useState(false);
  const [seconds, setSeconds] = useState(2);
  const [job, setJob] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [storageError, setStorageError] = useState('');
  const [sourceNotice, setSourceNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [recoverable, setRecoverable] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const scope = useRef(null);
  const request = useRef(null);
  const busyRef = useRef(false);
  const selection = useRef({ source: null, background: null });
  const inventorySerial = useRef(0);
  const visible = useRef(active); visible.current = active;
  const current = token => scope.current === token;

  async function run(script, allowCommit = false) {
    const response = await sdk.runScript({ script, summary: 'Test AI runtime', allowCommit });
    if (response.isError || response.result == null) {
      let report;
      try { report = JSON.parse(response.output); } catch {}
      const failure = new Error(report?.message || report?.error || response.output || S.failed);
      failure.code = report?.code;
      throw failure;
    }
    return response.result;
  }

  async function loadInventory(token) {
    if (!current(token) || !token.projectId) return;
    const serial = ++inventorySerial.current; setLoading(true);
    try {
      const [rows, supportsImages] = await Promise.all([sdk.call('listProjectResources', token.projectId),
        run(`return (selects.ai as unknown as {imageSourceSupported?:boolean}).imageSourceSupported===true;`)]);
      if (!current(token) || serial !== inventorySerial.current) return;
      const sources = rows.filter(row => (row.type === 'Video' || (supportsImages && row.type === 'Image')) && typeof row.resourceId === 'string');
      setImageSupported(supportsImages === true);
      const images = rows.filter(row => row.type === 'Image' && typeof row.resourceId === 'string');
      const source = selection.current.source ? sources.find(row => row.resourceId === selection.current.source) : sources[0];
      if (source) selection.current.source = source.resourceId;
      setResources(sources); setResourceId(source?.resourceId ?? null);
      setSourceNotice(selection.current.source && !source ? S.missing : '');
      setBackgrounds(images);
      const background = selection.current.background ? images.find(row => row.resourceId === selection.current.background) : images[0];
      if (background) selection.current.background = background.resourceId;
      setBackgroundId(background?.resourceId ?? null);
      if (!request.current && source?.durationSeconds > 0) setSeconds(value => Math.min(value, source.durationSeconds));
    } catch (cause) { if (current(token) && serial === inventorySerial.current) setError(cause.message); }
    finally { if (current(token) && serial === inventorySerial.current) setLoading(false); }
  }

  useEffect(() => {
    const token = { projectId, task };
    scope.current = token;
    selection.current = { source: null, background: null }; inventorySerial.current++;
    setResources([]); setResourceId(null); setImageSupported(false); setBackgrounds([]); setBackgroundId(null); setLoading(Boolean(projectId));
    setDraftAttempt(null);
    setJob(null); setResult(null); setError(''); setStorageError(''); setSourceNotice('');
    setSeconds(2);
    setBusy(false); busyRef.current = false; setRecoverable(false); request.current = null;
    setRestored(false);
    if (projectId) {
      (async () => { try {
        await recoveryWrites.get(recoveryKey(projectId, task))?.catch(() => {});
        const saved = await readSaved(sdk, projectId, task);
        if (!current(token)) return;
        if (saved?.version === 1 && savedInputIsValid(saved.input, projectId) && saved.input.task === task) {
          request.current = saved.input;
          selection.current.source = saved.input.resourceId;
          setSeconds(saved.input.sourceRange?.endSeconds ?? 2);
          setResourceId(saved.input.resourceId);
          if (saved.draftAttempt && saved.draftAttempt.workflowId === saved.workflowId && typeof saved.draftAttempt.name === 'string' &&
              typeof saved.draftAttempt.backgroundId === 'string' && ['unknown', 'saved'].includes(saved.draftAttempt.status)) {
            setDraftAttempt(saved.draftAttempt); setBackgroundId(saved.draftAttempt.backgroundId);
            selection.current.background = saved.draftAttempt.backgroundId;
          }
          if (typeof saved.workflowId === 'string' && saved.workflowId) setJob({ workflowId: saved.workflowId, status: 'queued' });
          else setRecoverable(true);
        } else if (saved) setStorageError(S.savedInvalid);
        setRestored(true);
      } catch (cause) { if (current(token)) setStorageError(`${S.storage} ${cause.message}`); }
      if (current(token)) await loadInventory(token);
      })();
    }
    const unsubscribe = projectId && sdk.on?.('resourcesChanged', event => {
      if (event.projectId === projectId) loadInventory(token);
    });
    return () => { unsubscribe?.(); if (current(token)) scope.current = null; };
  }, [projectId, task]);

  useEffect(() => {
    if (!job?.workflowId || !projectId) return;
    const token = scope.current;
    const workflowId = job.workflowId;
    const requestKey = request.current?.requestKey;
    let alive = true, timer, failures = 0;
    const active = () => alive && current(token) && request.current?.requestKey === requestKey;
    const poll = async () => {
      try {
        const value = await run(`return await selects.ai.job(${JSON.stringify(workflowId)}, ${JSON.stringify(projectId)}).status();`);
        if (!active()) return;
        failures = 0; setJob(value); setError('');
        if (value.status === 'succeeded') {
          // Read the owned artifact inside run_script, then return a bounded
          // projection; full video manifests can exceed the inline result cap.
          const value = await run(`const job=selects.ai.job(${JSON.stringify(workflowId)}, ${JSON.stringify(projectId)});
            const r=await job.result(); const file=r.files.detections ?? r.files.manifest;
            const raw=await selects.ai.readJSON(file, ${JSON.stringify(projectId)});
            if(!raw || typeof raw!=='object') throw new Error('Invalid AI result document.');
            let data;
            if(r.task==='faces.detect') {
              const d=raw as {frameSize:unknown;samples:Array<{index:number;sourceTimeSeconds:number;faces:unknown[]}>};
              if(!Array.isArray(d.samples)) throw new Error('Invalid face result samples.');
              data={frameSize:d.frameSize,sampleCount:d.samples.length,faceCount:d.samples.reduce((n,f)=>n+f.faces.length,0),
                samples:d.samples.slice(0,3).map(f=>({index:f.index,sourceTimeSeconds:f.sourceTimeSeconds,faces:f.faces.slice(0,10)}))};
            } else {
              const d=raw as {frameSize:unknown;frames:unknown[];foregroundVideo?:unknown};
              if(!Array.isArray(d.frames)) throw new Error('Invalid matte result frames.');
              data={frameSize:d.frameSize,frameCount:d.frames.length,frames:d.frames.slice(0,3),foregroundVideo:d.foregroundVideo};
            }
            return {task:r.task,metrics:r.metrics,diagnostics:r.diagnostics,manifest:r.files.manifest,data};`);
          if (active()) setResult(value);
        } else if (!terminal(value.status)) timer = setTimeout(poll, 1000);
      } catch (cause) {
        if (!active()) return;
        setError(cause.message);
        if (cause.code === 'AI_JOB_NOT_FOUND') { setJob(null); setRecoverable(Boolean(request.current)); }
        else if (++failures < 3) timer = setTimeout(poll, failures * 1000);
      }
    };
    poll();
    return () => { alive = false; clearTimeout(timer); };
  }, [job?.workflowId, projectId, refresh]);

  async function save(input, workflowId, token) {
    const storageKey = recoveryKey(input.projectId, input.task);
    return orderedRecovery(storageKey, async () => {
      try {
        const old = await readSaved(sdk, input.projectId, input.task);
        const same = old?.input?.requestKey === input.requestKey;
        if (workflowId && !same) return;
        await recoveryStorage(sdk).setItem(storageKey, JSON.stringify({ version: 1, input, workflowId, ...(same && old.draftAttempt ? { draftAttempt: old.draftAttempt } : {}) }));
        if (current(token)) setStorageError('');
      } catch (cause) {
        if (current(token)) setStorageError(`${S.storage} ${cause.message}`);
        throw cause;
      }
    });
  }

  async function submit(recover = false) {
    const token = scope.current;
    if (!token || token.projectId !== projectId || !restored || busyRef.current) return;
    busyRef.current = true; setBusy(true); setError(''); setResult(null);
    if (!recover) {
      request.current = null; setJob(null); setDraftAttempt(null); setRecoverable(false);
    }
    try {
      // Older AI hosts have no encoding advertisement and retain PNG. Never
      // renegotiate a saved request: its idempotency key owns the exact payload.
      const alphaEncoding = !recover && task === 'person.matte' ? await run(`
        const ai=selects.ai as unknown as {supportedMatteEncodings?:readonly string[]};
        return ai.supportedMatteEncodings?.includes('grayscale-avif-8bit')?'grayscale-avif-8bit':'grayscale-png-8bit';`) : null;
      if (!current(token)) return;
      const input = recover ? request.current : {
        runtimeId: 'selects-ai-runtime', requestKey: `lab:${crypto.randomUUID()}`,
        projectId, resourceId, task, ...(resources.find(row => row.resourceId === resourceId)?.type === 'Image' ? {} : { sourceRange: { startSeconds: 0, endSeconds: seconds } }),
        ...(task === 'person.matte' ? { options: { outputMode: 'alpha-frames',
          ...(alphaEncoding === 'grayscale-avif-8bit' ? { alphaEncoding } : {}) } } : {}),
      };
      if (!input || input.projectId !== projectId) throw new Error(S.noRequest);
      if (!recover && (!resourceId || (input.sourceRange && (!Number.isFinite(seconds) || seconds <= 0)))) throw new Error(S.invalidSource);
      request.current = input; setRecoverable(true); setJob(null);
      await save(input, undefined, token);
      if (!current(token)) return;
      // Obtain only the submission acknowledgment. A later status transport
      // failure must not discard an already known workflow identity.
      const value = await run(`const job=await selects.ai.submit(${JSON.stringify(input)}); return {workflowId:job.workflowId};`, true);
      // Preserve an A-project acknowledgment in A's storage after a switch,
      // without replacing B's visible job or error state.
      if (current(token)) { setJob({ workflowId: value.workflowId, status: 'queued' }); }
      await save(input, value.workflowId, token);
      if (current(token)) setRecoverable(false);
    } catch (cause) { if (current(token)) setError(cause.message); }
    finally { if (current(token)) { busyRef.current = false; setBusy(false); } }
  }

  async function cancel() {
    const token = scope.current;
    const workflowId = job?.workflowId;
    if (!token || token.projectId !== projectId || !workflowId || busyRef.current) return;
    busyRef.current = true; setBusy(true); setError('');
    try {
      const value = await run(`return await selects.ai.job(${JSON.stringify(workflowId)}, ${JSON.stringify(projectId)}).cancel();`, true);
      if (current(token)) { setJob(value); setRefresh(value => value + 1); }
    } catch (cause) { if (current(token)) setError(cause.message); }
    finally { if (current(token)) { busyRef.current = false; setBusy(false); } }
  }

  async function saveDraftAttempt(input, attempt, token) {
    const storageKey = recoveryKey(input.projectId, input.task);
    return orderedRecovery(storageKey, async () => {
      try {
        const old = await readSaved(sdk, input.projectId, input.task);
        if (old?.input?.requestKey !== input.requestKey || old.workflowId !== attempt.workflowId)
          throw new Error('The original job recovery record is unavailable.');
        await recoveryStorage(sdk).setItem(storageKey, JSON.stringify({ ...old, draftAttempt: attempt }));
        return true;
      } catch (cause) {
        if (current(token)) setStorageError(`${S.draftStorage} ${cause.message}`);
        return false;
      }
    });
  }

  async function openInEditor() {
    const token = scope.current, input = request.current;
    if (!token || token.projectId !== projectId || !input || input.task !== task || (!draftAttempt && !result?.manifest) || busyRef.current) return;
    busyRef.current = true; setBusy(true); setError('');
    let attempt = draftAttempt;
    try {
      let draftId = attempt?.status === 'saved' ? attempt.draftId : null;
      if (attempt?.status === 'unknown') {
        // A lost commit acknowledgment is recovered by observation only.
        // No mask preparation or new Draft starts until the saved outcome is known.
        const footage = await sdk.call('readFootage', projectId);
        if (!current(token)) return;
        const matches = footage.drafts.filter(row => row.name === attempt.name);
        if (matches.length !== 1) throw new Error(matches.length ? S.multipleDrafts : S.missingDraft);
        draftId = matches[0].sequenceId;
      } else if (!draftId) {
        if (!backgroundId || !resources.some(row => row.resourceId === input.resourceId)) throw new Error(S.invalidSource);
        const prepared = await preparePackedMatte(run, recoveryStorage(sdk), job.workflowId,
          projectId, input.sourceRange === undefined, () => current(token));
        if (!current(token)) return;
        if ((prepared.sourceKind === 'image') !== (input.sourceRange === undefined) || prepared.sourceResourceId !== input.resourceId || !['grayscale-png-8bit', 'grayscale-avif-8bit'].includes(prepared.alphaEncoding) ||
            (prepared.sourceKind==='image' ? typeof prepared.maskUrl!=='string' : (!Number.isSafeInteger(prepared.frameCount) || prepared.frameCount < 1 ||
            !Number.isFinite(prepared.sourceRange?.startSeconds) || prepared.sourceRange.startSeconds < 0 ||
            !Number.isFinite(prepared.sourceRange?.endSeconds) || prepared.sourceRange.endSeconds <= prepared.sourceRange.startSeconds))) throw new Error(S.invalidTiming);
        attempt = { workflowId: job.workflowId, name: `AI Runtime layered · ${job.workflowId}`, backgroundId, status: 'unknown' };
        if (!await saveDraftAttempt(input, attempt, token) || !current(token)) return;
        setDraftAttempt(attempt);
        const value = await run(`const pluginShaderOptions=${PACKED_MATTE_SHADER};
          const p=selects.project(${JSON.stringify(projectId)});
          const name=${JSON.stringify(attempt.name)};
          const matches=(await p.readFootage()).drafts.filter(d=>d.name===name);
          if(matches.length>1) throw new Error('Multiple matching Drafts need manual inspection.');
          if(matches.length===1) return {draftId:matches[0].sequenceId,recovered:true};
          const r=await selects.ai.job(${JSON.stringify(job.workflowId)},${JSON.stringify(projectId)}).result();
          if(!r.files.manifest) throw new Error('This job has no matte manifest.');
          const matte=await selects.ai.prepareMatte(r.files.manifest,${JSON.stringify(projectId)}${input.sourceRange === undefined ? ",{sourceKind:'image'}" : ''});
          if(matte.sourceResourceId!==${JSON.stringify(input.resourceId)}) throw new Error('The mask belongs to another source.');
          const d=await p.createDraft({name});
          ${input.sourceRange === undefined ? 'await d.insertGap({seconds:5});' : 'await d.insertResource({resourceId:matte.sourceResourceId,sourceRange:matte.sourceRange});'}
          const m=await d.meta();
          if(m.durationFrames<=0) throw new Error('The source window produced an empty Draft.');
          await d.overlayResource({resource:p.resource(${JSON.stringify(backgroundId)}),over:await d.rangeAtFrames(0,m.durationFrames)});
          const before=new Set((await d.clips({trackScope:'all'})).map(c=>c.clipId));
          await d.overlayResource({resource:p.resource(${JSON.stringify(prepared.packedResourceId)}),over:await d.rangeAtFrames(0,m.durationFrames),sourceStartSeconds:0});
          const added=(await d.clips({trackScope:'all'})).filter(c=>!before.has(c.clipId)&&c.trackKind==='video');
          if(added.length!==1) throw new Error('The source overlay did not produce exactly one video clip.');
          const originalFit=Math.min(m.frameSize.width/matte.frameSize.width,m.frameSize.height/matte.frameSize.height);
          const packedFit=Math.min(m.frameSize.width/(2*matte.frameSize.width),m.frameSize.height/matte.frameSize.height);
          await d.setClipTransform({clip:added[0],scale:{x:originalFit/(2*packedFit),y:originalFit/packedFit}});
          const masked=(await d.clips({trackScope:'all'})).find(c=>c.clipId===added[0].clipId);
          await d.addVideoEffect(pluginShaderOptions('matte',{clip:masked,label:'Person mask',parameters:{opacity:1},editableParameters:[{key:'opacity',label:'Opacity',type:'number',defaultValue:1,min:0,max:1,step:0.01}]}));
          const c=await d.commitAll('Layer saved person masks over a background while preserving original Main audio');
          if(!c.createdDraftId) throw new Error('The created Draft acknowledgment has no identity.');
          return {draftId:c.createdDraftId};`, true);
        draftId = value.draftId;
      }
      if (!draftId) throw new Error(S.missingDraft);
      const saved = { ...attempt, status: 'saved', draftId };
      if (current(token)) setDraftAttempt(saved);
      if (!await saveDraftAttempt(input, saved, token) || !current(token)) return;
      if (visible.current) await run(`return await selects.editor.openDraft(${JSON.stringify(draftId)});`);
    } catch (cause) {
      if (current(token)) setError(attempt?.status === 'unknown' ? `${cause.message} ${S.draftUnknown}` : cause.message);
    } finally { if (current(token)) { busyRef.current = false; setBusy(false); } }
  }

  const sameProject = scope.current?.projectId === projectId;
  const visibleJob = sameProject ? job : null;
  const pending = visibleJob && !terminal(visibleJob.status);
  const selected = resources.find(row => row.resourceId === resourceId);
  const selectResource = id => {
    selection.current.source = id; setResourceId(id); setSourceNotice('');
    const duration = resources.find(row => row.resourceId === id)?.durationSeconds;
    if (duration > 0) setSeconds(value => Math.min(value, duration));
  };
  const diagramSize = result?.data?.frameSize;
  const showDiagram = sameProject && result?.task === 'faces.detect' && Number.isFinite(diagramSize?.width) && Number.isFinite(diagramSize?.height) && diagramSize.width > 0 && diagramSize.height > 0;
  const figure = (sample, index) => {
    const faces = (sample?.faces ?? []).slice(0, 10).filter(face => face?.box && [face.box.xmin, face.box.ymin, face.box.xmax, face.box.ymax, face.score].every(Number.isFinite) && face.box.xmax > face.box.xmin && face.box.ymax > face.box.ymin && face.box.xmin >= 0 && face.box.ymin >= 0 && face.box.xmax <= diagramSize.width && face.box.ymax <= diagramSize.height && face.score >= 0 && face.score <= 1);
    return <figure key={index} style={{ margin: 0 }}>
      <figcaption>{S.time}: {Number(sample.sourceTimeSeconds).toFixed(3)} s · {S.confidence}: {faces.length ? faces.map(face => `${Math.round(face.score * 100)}%`).join(', ') : S.noFaces}</figcaption>
      <svg role="img" aria-label={`${S.time} ${sample.sourceTimeSeconds} s`} viewBox={`0 0 ${diagramSize.width} ${diagramSize.height}`} style={{ display: 'block', width: '100%', maxHeight: 180 }}>
        <rect x="0" y="0" width={diagramSize.width} height={diagramSize.height} fill="none" stroke="currentColor" vectorEffect="non-scaling-stroke" />
        {faces.map((face, i) => <rect key={i} x={face.box.xmin} y={face.box.ymin} width={face.box.xmax - face.box.xmin} height={face.box.ymax - face.box.ymin} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" />)}
      </svg>
    </figure>;
  };
  return <U.Stack gap={8}>
    <U.Message>{task === 'faces.detect' ? S.facesIntro : S.matteIntro}</U.Message>
    {!projectId && <U.Message>{S.openProject}</U.Message>}
    <U.Select label={imageSupported ? S.imageSource : S.source} value={sameProject ? resourceId : null} placeholder={sourceNotice ? S.unavailable : imageSupported ? S.chooseImageSource : S.chooseSource} onChange={selectResource} options={(sameProject ? resources : []).map(row => ({ value: row.resourceId, label: row.name }))} disabled={!restored || loading || busy || Boolean(pending)} />
    {sourceNotice && sameProject && <U.Message>{sourceNotice}</U.Message>}
    {selected?.type !== 'Image' && <U.NumberField label={S.duration} value={seconds} onChange={setSeconds} min={0.01} max={selected?.durationSeconds ?? 10} step={0.1} unit="s" disabled={busy || Boolean(pending)} />}
    <U.Actions>
      {pending && <U.Button variant="secondary" disabled={busy} onClick={cancel}>{S.cancel}</U.Button>}
      <U.Button busy={busy} disabled={!restored || !sameProject || !projectId || !resourceId || loading || Boolean(pending) || recoverable || draftAttempt?.status === 'unknown' || (selected?.type !== 'Image' && (!Number.isFinite(seconds) || seconds <= 0))} onClick={() => submit()}>{S.run}</U.Button>
    </U.Actions>
    {visibleJob && <U.Progress value={visibleJob.progress} label={S.states[visibleJob.status] ?? visibleJob.status} />}
    {visibleJob?.lastErrorMessage && <U.Message tone="error">{visibleJob.lastErrorMessage}</U.Message>}
    {error && <U.Message tone="error">{error}</U.Message>}
    {storageError && <U.Message tone="error">{storageError}</U.Message>}
    {recoverable && request.current && !pending && <U.Button variant="secondary" disabled={busy} onClick={() => submit(true)}>{S.recover}</U.Button>}
    {result && sameProject && <U.Message tone="success">{result.task === 'faces.detect' ? S.faceCount(result.data.sampleCount, result.data.faceCount) : S.matteCount(result.data.frameCount)}</U.Message>}
    {showDiagram && result.data.samples?.length > 0 && <U.Stack gap={8}><U.Message>{S.diagram}</U.Message>{figure(result.data.samples[0], 0)}</U.Stack>}
    {sameProject && task === 'person.matte' && (result?.manifest || draftAttempt) && <U.Stack gap={8}>
      <U.Select label={S.background} value={backgroundId} placeholder={S.chooseBackground} onChange={id => { selection.current.background = id; setBackgroundId(id); }} options={backgrounds.map(row => ({ value: row.resourceId, label: row.name }))} disabled={busy || Boolean(draftAttempt)} />
      {backgrounds.length === 0 && !draftAttempt && <U.Message>{S.addBackground}</U.Message>}
      <U.Button variant="secondary" busy={busy} disabled={!draftAttempt && (Boolean(pending) || !backgroundId || !resources.some(row => row.resourceId === request.current?.resourceId))} onClick={openInEditor}>{S.open}</U.Button>
    </U.Stack>}
    <details><summary>{S.details}</summary><U.Stack gap={8}>
      <U.Message>{S.files}</U.Message>
      <U.Button variant="secondary" disabled={!sameProject || !projectId || loading} onClick={() => loadInventory(scope.current)}>{S.reload}</U.Button>
      {visibleJob && <U.Message>{S.workflow}: {visibleJob.workflowId}</U.Message>}
      {visibleJob && <U.Button variant="secondary" disabled={busy} onClick={() => setRefresh(value => value + 1)}>{S.refresh}</U.Button>}
      {showDiagram && (result.data.samples ?? []).slice(1, 3).map((sample, index) => figure(sample, index + 1))}
      <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{JSON.stringify({ input: request.current, job: visibleJob, result, draftAttempt }, null, 2)}</pre>
      {task === 'person.matte' && <U.Message>{S.retention}</U.Message>}
    </U.Stack></details>
  </U.Stack>;
}

// app-update-guard:start
// Shared source, inlined into portable panels by tools/sync_app_update_guards.py.
import * as AppUpdateGuardReact from 'react';

const appUpdateGuardScopes = new WeakMap<object, any>();

/** Each mounted editor contributes a live veto; the host receives one guard per SDK. */
function useAppUpdateGuard(sdk: any, language: string | undefined, readBlocked: (context: any) => boolean) {
  const live = AppUpdateGuardReact.useRef({ language, readBlocked });
  live.current = { language, readBlocked };
  AppUpdateGuardReact.useEffect(() => {
    const api = sdk?.updates;
    if (typeof api?.registerGuard !== 'function') return;
    let group = appUpdateGuardScopes.get(api);
    if (!group) {
      group = { entries: new Set(), dispose: null };
      appUpdateGuardScopes.set(api, group);
    }
    group.entries.add(live);
    if (!group.dispose) {
      group.dispose = api.registerGuard({
        async canUpdate(context: any) {
          for (const entry of group.entries) {
            // A partially initialized editor must not lose state during reload.
            let blocked = true;
            try { blocked = Boolean(entry.current.readBlocked(context)); } catch { /* fail closed */ }
            if (blocked) {
              const korean = String(entry.current.language || '').toLowerCase().startsWith('ko');
              throw new Error(korean
                ? '\uc9c4\ud589 \uc911\uc778 \uc791\uc5c5\uc744 \ub9c8\uce58\uace0 \ubcc0\uacbd\uc0ac\ud56d\uc744 \uc800\uc7a5\ud55c \ub4a4 \uc571\uc744 \uc5c5\ub370\uc774\ud2b8\ud574\uc8fc\uc138\uc694.'
                : 'Finish the current operation and save changes before updating this app.');
            }
          }
        },
      });
    }
    return () => {
      group.entries.delete(live);
      if (!group.entries.size) {
        group.dispose?.();
        appUpdateGuardScopes.delete(api);
      }
    };
  }, [sdk?.updates]);
}
// app-update-guard:end
