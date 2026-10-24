import test from'node:test';import assert from'node:assert/strict';import fs from'node:fs';import{loadPanelModule}from'../../../tests/panel_module_fixture.mjs';
const source=fs.readFileSync(new URL('../panel.tsx',import.meta.url),'utf8');
test('production sprite pipeline uses the built-in PNG encoder with matching file and data MIME',async()=>{
 const calls=[],texts=[];
 const context={hostNeed:()=>({mkdir:async()=>{},rm:async()=>{},stat:async()=>({size:24})}),hostJoin:(...xs)=>xs.join('/'),videoAiClient:()=>({run:async()=>({result:{files:{manifest:'real-contract-manifest'}}})}),sharedAiResources:{importSharedAiVideo:async()=> 'r'},sharedVideoAiFrames:{prepareSharedAiVideoFrames:async()=>({count:15,pattern:'/owned/alpha/frame_%06d.png'})},judeRunFFmpeg:async args=>calls.push(args),judeFFmpegStdout:async()=>Array.from({length:15},()=> 'YAVG=128').join('\n'),hostReadBytes:async()=>new Uint8Array([137,80,78,71,13,10,26,10])};
 const {judeSharedSprites:run}=loadPanelModule(source,{names:['judeSharedSprites'],overrides:context});
 const output=await run({sdk:{},writeText:async(path,text)=>texts.push({path,text})},'p',{fps:30,step:2,blocks:[{key:'b0',pieces:[{from:0,to:30,sw:1920,sh:1080,scale:3.16,posX:0,posY:0,path:'/source',startSeconds:0}],lines:[{key:'line0',fromFrame:0,ink:[20,20,100,40],region:[10,10,140,80]}]}]},'/owned');
 const sprite=calls.find(args=>args.includes('png'));assert.ok(sprite);assert.equal(sprite.at(-1),'/owned/matte-b0/line0.png');assert.ok(!calls.flat().includes('libwebp'));assert.ok(texts[0].text.startsWith('data:image/png;base64,iVBORw0KGgo='));assert.equal(output.line0.count,15);assert.equal(output.line0.fps,15);assert.equal(output.line0.coverage,128/255);
});
