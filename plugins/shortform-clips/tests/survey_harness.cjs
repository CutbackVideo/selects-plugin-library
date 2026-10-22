'use strict';
// Synthetic source for prepareSourceSurvey: every frame has a flat color decided by its
// scene, so appearance changes happen exactly at the cut frames and inside the flash.
const fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');

const FPS=30,TILE_W=640,TILE_H=360;
const CUTS=[455,1003,2301],FLASH=[615,617];
const colorOf=f=>f>=FLASH[0]&&f<=FLASH[1]?250:(CUTS.filter(c=>f>=c).length*50)%256;
const pixelsOf=f=>{const c=colorOf(f),d=new Uint8Array(32*18*4);for(let i=0;i<d.length;i+=4){d[i]=c;d[i+1]=c;d[i+2]=c;d[i+3]=255;}return d;};

function loadPanel(names){
 const modules=process.env.SBS_PANEL_TEST_MODULES;
 const dep=createRequire(path.resolve(modules,'../package.json')),esbuild=dep('esbuild'),m={exports:{}};
 const src=fs.readFileSync(path.join(__dirname,'../panel.tsx'),'utf8');
 new Function('require','module','exports',esbuild.transformSync(src+`\nexport {${names.join(',')}};`,{loader:'tsx',format:'cjs'}).code)(dep,m,m.exports);
 return {exports:m.exports,esbuild};
}

// A frame list travels in the image "bytes" so the fake canvas knows which frame a tile is.
const encode=frames=>Buffer.from(JSON.stringify(frames)).toString('base64');
function installCanvas(){
 const old={Image:global.Image,document:global.document};
 class FakeImage{
  constructor(){this.frames=[];this.crossOrigin=null;this._src='';}
  set src(v){this._src=v;const m=/^data:image\/jpeg;base64,(.*)$/.exec(v);this.frames=m?JSON.parse(Buffer.from(m[1],'base64').toString()):(FakeImage.byUrl.get(v)||[]);}
  get src(){return this._src;}
  async decode(){if(FakeImage.failUrls.has(this._src))throw Error('decode failed');}
 }
 FakeImage.byUrl=new Map();FakeImage.failUrls=new Set();
 const canvas=()=>{const c={width:0,height:0,frame:null,drawn:[],texts:[]};c.getContext=()=>({
  fillStyle:'',font:'',fillRect(){},fillText(t){c.texts.push(t);},
  drawImage(src,...a){if(src instanceof FakeImage){if(FakeImage.tainted.has(src._src))c.tainted=true;c.frame=src.frames[Math.round(a[0]/TILE_W)];}else{if(src.tainted)c.tainted=true;c.frame=src.frame;c.drawn.push(src.frame);}},
  getImageData(){if(c.tainted)throw Object.assign(Error('tainted'),{name:'SecurityError'});return {data:pixelsOf(c.frame)};},
 });c.toDataURL=()=>'page:'+JSON.stringify(c.drawn);return c;};
 FakeImage.tainted=new Set();
 global.Image=FakeImage;global.document={createElement:()=>canvas()};
 return {FakeImage,restore(){global.Image=old.Image;global.document=old.document;}};
}

function scenario(){
 const seg=(startFrame,endFrame,sourceStartFrame)=>({startFrame,endFrame,sourceResourceId:'r',sourceStartFrame,sourceEndFrame:sourceStartFrame+(endFrame-startFrame)});
 const segments=[seg(0,900,300),seg(900,1500,2000)];
 const words=[];
 const speakers=[[0,300,'a'],[300,600,'b'],[600,1200,'a'],[1200,1500,'b']];
 for(const [a,b,s] of speakers)for(let f=a;f<b;f+=60){const g=segments.find(x=>f>=x.startFrame&&f<x.endFrame);const src=g.sourceStartFrame+(f-g.startFrame);words.push({startFrame:f,endFrame:f+60,sourceResourceId:'r',sourceStartFrame:src,sourceEndFrame:src+60,speakerId:s,text:'w'});}
 const catalog=[{id:'F1',resourceId:'r',sourceFrame:400},{id:'F2',resourceId:'r',sourceFrame:777},{id:'F3',resourceId:'r',sourceFrame:2100}];
 return {before:{segments,words,sources:[{resourceId:'r',meta:{fps:FPS,frameSize:{width:1920,height:1080}}}]},catalog};
}

// Sequence-frame route (no source path): sdk.call('captureVisualFrames').
function visualSdk(calls){
 return {call:async(method,p)=>{
  if(method==='getResourceAnalyzedSequence')return {owner:{projectId:p},analyzedSequenceJson:{id:'seq'}};
  if(method!=='captureVisualFrames')throw Error(method);
  const frames=p.frames.map(f=>f.frameNumber);calls.push(frames);
  return {data:encode(frames),frames:frames.map((frameNumber,i)=>({frameNumber,hasSourceImage:true,x:i*TILE_W,y:0,width:TILE_W,height:TILE_H}))};
 }};
}

function summarize(result){
 return {
  samples:result.samples,
  boundaries:result.boundaries,
  images:result.images.map(i=>({name:i.name,dataUrl:i.dataUrl})),
 };
}

module.exports={FPS,TILE_W,TILE_H,CUTS,FLASH,colorOf,pixelsOf,loadPanel,installCanvas,scenario,visualSdk,summarize,encode};
