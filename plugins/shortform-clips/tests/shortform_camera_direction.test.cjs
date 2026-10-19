'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const modules=process.env.SBS_PANEL_TEST_MODULES;
test('speaker-first camera direction',{skip:!modules},async t=>{
 const dep=createRequire(path.resolve(modules,'../package.json')),esbuild=dep('esbuild'),m={exports:{}};
 const src=fs.readFileSync(path.join(__dirname,'../panel.tsx'),'utf8');
 new Function('require','module','exports',esbuild.transformSync(src+'\nexport {cameraUnits,cameraFaceOptions,speakerCrop,validateCameraEditPlan,directCameraPanels};',{loader:'tsx',format:'cjs'}).code)(dep,m,m.exports);
 const {cameraUnits,cameraFaceOptions,speakerCrop,validateCameraEditPlan:validate}=m.exports;
 const observations=[{unit:{startFrame:0,endFrame:900},options:[{id:'0:0'},{id:'2:0'}]}];
 const shot={startFrame:0,endFrame:900,primary:'0:0',secondary:'2:0',distinctPeople:true};
 await t.test('agent can choose a long split without a quota or cooldown',()=>{
  assert.equal(validate({shots:[shot]},observations,true).length,1);
 });
 await t.test('invalid coverage, unknown people and forbidden splits are rejected',()=>{
  for(const change of [{startFrame:1},{endFrame:901},{endFrame:899},{primary:'unknown'},{secondary:'0:0'},{distinctPeople:false},{closeUp:NaN},{faceY:90}])
   assert.throws(()=>validate({shots:[{...shot,...change}]},observations,true));
  assert.throws(()=>validate({shots:[shot]},observations,false));
  assert.equal(validate({shots:[{...shot,secondary:null}]},observations,false).length,1);
 });
 await t.test('agent boundaries can fall inside evidence intervals',()=>{
  const shots=[{...shot,endFrame:57,secondary:null},{...shot,startFrame:57}];
  assert.deepEqual(validate({shots},observations,true),shots);
 });
 await t.test('template zoom and vertical position reach crop geometry',()=>{
  const face={panel:{observation:{W:1920,H:1080}},x:900,y:500,w:100,h:100,headTop:405,headBottom:570};
  const tight=speakerCrop(face,756,{closeUp:4,faceY:40}),wide=speakerCrop(face,756,{closeUp:8,faceY:40});
  assert.ok(wide.w>tight.w);
  const upper=speakerCrop(face,756,{closeUp:8,faceY:25}),lower=speakerCrop(face,756,{closeUp:8,faceY:65});
  assert.ok(upper.cy>lower.cy);
 });
 await t.test('editorial units cover each occurrence once, including recording seams',()=>{
  const panels=[{startFrame:0,endFrame:150},{startFrame:0,endFrame:150},{startFrame:150,endFrame:390}];
  const units=cameraUnits(panels,[{startFrame:80,endFrame:96,text:'Finish.'}],30,2);
  assert.equal(units[0].startFrame,0);assert.equal(units.at(-1).endFrame,390);
  assert.ok(units.every((u,i)=>!i||units[i-1].endFrame===u.startFrame));assert.ok(units.some(u=>u.startFrame===150));
 });
 await t.test('director captures one moment per bridge call and crops faces below portrait letterboxing',async()=>{
  const priorDoc=global.document,priorImage=global.Image,draws=[],captures=[];
  global.Image=class {async decode(){}};
  global.document={createElement:()=>({getContext:()=>({fillRect(){},fillText(){},drawImage(...args){draws.push(args);}}),toDataURL:()=> 'data:image/jpeg;base64,AA=='})};
  try {
   const panel={videoIndex:0,resourceId:'cam',startFrame:0,endFrame:180,sourceStartSeconds:100,playbackSpeed:{numerator:1,denominator:1},observation:{W:1920,H:1080,samples:[101,102,103].map(time=>({time,boxes:[{xmin:600,xmax:800,ymin:200,ymax:450}]}))}};
   let planningCalls=0;
   const sdk={call:async(name,args)=>{
    if(name==='getDraftCore')return {owner:{projectId:'p'},sequenceJson:{}};
    assert.equal(name,'captureVisualFrames');assert.equal(new Set(args.frames.map(f=>f.frameNumber)).size,1);captures.push(args);
    return {data:'AA==',frames:[{videoIndex:0,x:0,y:0,width:360,height:640,hasSourceImage:true}]};
   },askAI:async({prompt})=>{
    if(!prompt.includes('complete short-form clip'))return {text:JSON.stringify({primary:'0:0',confidence:.9,reason:'speaker'})};
    planningCalls++;assert.ok(prompt.includes('"closeUp":7'));assert.ok(prompt.includes('"faceY":35'));
    return {text:JSON.stringify({shots:[{startFrame:planningCalls===1?31:30,endFrame:120,primary:'0:0',secondary:null,reason:'speaker'}]})};
   }};
   const result=await m.exports.directCameraPanels({sdk,guard:p=>p,projectId:'p',draftId:'d',panels:[panel],units:[{startFrame:30,endFrame:120,text:'Actual speech'}],fps:30,windowH:1200,allowSplit:true,closeUp:7,faceY:35,note:()=>{}});
   assert.equal(captures.length,8);assert.equal(draws.length,8);assert.equal(planningCalls,2);
   assert.ok(draws.every(args=>args[2]>200),'face samples must start inside the visible letterboxed image, not the black top margin');
   assert.equal(result.length,1);assert.equal(result[0].sourceStartSeconds,101);assert.equal(result[0].count,1);assert.equal(result[0].observation,undefined);
  } finally {global.document=priorDoc;global.Image=priorImage;}
 });
 await t.test('headroom includes the observed vertical movement instead of only a median face',()=>{
  const face={panel:{observation:{W:1920,H:1080}},x:600,y:350,w:110,h:160,headTop:145,headBottom:480};
  const crop=speakerCrop(face,756),height=crop.w*756/1080,top=crop.cy-height*.4;
  assert.ok(top<=face.headTop+1e-8);assert.ok(top+height>=face.headBottom);
  assert.ok(top>=0&&top+height<=1080);
 });
 await t.test('crop candidates use observed camera source times and remain inside portrait raster',()=>{
  const panel={videoIndex:2,startFrame:300,endFrame:480,sourceStartSeconds:100,playbackSpeed:{numerator:2,denominator:1},observation:{W:1920,H:1080,samples:[{time:102,boxes:[{xmin:400,xmax:600,ymin:100,ymax:350}]},{time:103,boxes:[{xmin:420,xmax:620,ymin:110,ymax:360}]},{time:99,boxes:[{xmin:1400,xmax:1600,ymin:100,ymax:350}]}]}};
  const faces=cameraFaceOptions(panel,330,360,30);assert.equal(faces.length,1);assert.ok(faces[0].x<600);
  const crop=speakerCrop(faces[0],1600);assert.ok(crop.w*1600/1080<=1080);assert.ok(crop.cx>=crop.w/2&&crop.cx+crop.w/2<=1920);
 });
});
