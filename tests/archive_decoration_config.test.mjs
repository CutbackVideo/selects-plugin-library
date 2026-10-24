import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import {checkScriptTypes} from './run_script_types.mjs';
const base=new URL('../plugins/archive-vlog/',import.meta.url),read=rel=>fs.readFileSync(new URL(rel,base),'utf8'),panel=read('panel.tsx');
const section=name=>panel.slice(panel.indexOf('// '+name+':start'),panel.indexOf('// '+name+':end'));
const source=read('scripts/prepare-decoration.js'),box=vm.createContext({});vm.runInContext(read('planner.js')+'\n'+section('av-hook')+'\n'+section('av-build'),box);
const presets=JSON.parse(read('assets/fonts/presets.json')),inventory=JSON.parse(read('dev/fixtures/daily-inventory.json')),found=JSON.parse(read('dev/fixtures/daily-search.json'));
const fonts={};for(const p of presets.presets)for(const f of p.fonts)fonts[f.file]=read('assets/fonts/'+f.file).replace(/\s+/g,'');
const tsx=Object.fromEntries(Object.entries({title:'decode-title',credit:'archived-credit',letterbox:'letterbox-reveal',look:'cinematic-look',fade:'fade-out',motion:'photo-motion'}).map(([k,f])=>[k,read('assets/'+f+'.tsx')]));
const plan=box.avPlanBuild({candidates:box.avMotionBonus(found.list).concat(inventory.photos.map(p=>({rid:p.rid,kind:'photo'}))),bpm:72,accepted:true,fps:30,pace:'cinematic',requested:8,usableEnd:120,seed:'1'});assert.equal(plan.ok,true);
const plain=v=>JSON.parse(JSON.stringify(v));
function config(preset,fps){return {sequenceId:'owned',videoEnd:Math.round(plan.schedule.cuts.at(-1)*fps),fps,plan,presets,tsx,fonts,sizes:Object.fromEntries(inventory.photos.map(p=>[p.rid,{width:p.width,height:p.height}])),openingSize:{width:1920,height:1080},frozen:{seed:1,preset,fields:{kicker:'A DAY',title:'SATURDAY',tagline:'in the city'},credit:{on:true,prefix:'ARCHIVED BY',name:'MANO'},clipSound:'ambient',look:{on:true,strength:.4},sectionStart:2.345},provenance:{plugin:'archive-vlog',version:'fixture'}};}
for(const preset of presets.presets)for(const fps of [24000/1001,25,30000/1001,60])test('Archive frozen decoration builder: '+preset.id+' preserves original config at '+fps,async()=>{
 const input=config(preset.id,fps),actual=await vm.runInNewContext('(async()=>{'+source+'})()',{__CONFIG__:input});assert.deepEqual(plain(actual),plain(box.avDecorateConfig(input)));assert.ok(Buffer.byteLength(JSON.stringify(actual))<180000);
});
test('Archive frozen decoration builder: SDK typing and actual bundled assets fit transport',()=>{
 const input=config('cinematic',30000/1001),script=source.replace('__CONFIG__',()=> 'JSON.parse('+JSON.stringify(JSON.stringify(input))+')');assert.ok(Buffer.byteLength(script)<262144);checkScriptTypes([{name:'Prepare exact original Archive decoration',script}]);
});
