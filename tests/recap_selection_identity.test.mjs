import test from 'node:test';import assert from 'node:assert/strict';import{loadPhotoPanel}from'./photo_face_fixture.mjs';
const api=loadPhotoPanel('recap-2026',['bindRecapSourceIdentities','recapStoredSelection','restoreRecapSelection','saveRecapSelection','recapSelectionKey']);
const plain=x=>JSON.parse(JSON.stringify(x)),a='00000000-0000-4000-8000-000000000001',b='00000000-0000-4000-8000-000000000002';
const videos=(aliases=['r0','r1'])=>[{projectId:'p',resourceId:aliases[0],sourceResourceId:a,name:'duplicate.mp4',path:'/a/duplicate.mp4',folderName:'A',durationSeconds:18},{projectId:'p',resourceId:aliases[1],sourceResourceId:b,name:'duplicate.mp4',path:'/b/duplicate.mp4',folderName:'B',durationSeconds:18}];
const state=rows=>({videos:rows,folders:['A','B'],excludedIds:[],intro:{resourceId:rows[0].resourceId,startSeconds:2},slots:[{resourceId:rows[0].resourceId,startSeconds:2},{resourceId:rows[1].resourceId,startSeconds:6.3}]});
test('Recap restores the exact originals after script aliases and inventory order change, even with duplicate filenames',()=>{
 const saved=api.recapStoredSelection('p',state(videos()),2),fresh=videos(['r9','r0']).reverse(),restored=api.restoreRecapSelection('p',saved,fresh,['B','A'],2,8.4);
 assert.equal(restored.intro.resourceId,'r9');assert.equal(restored.slots[1].resourceId,'r0');assert.equal(restored.slots[1].startSeconds,6.3);assert.equal(saved.slots[0].resourceId,undefined);assert.equal(saved.slots[0].sourceResourceId,a);
});
test('Recap rejects a removed original, duplicate raw binding or another Project instead of replacing the selection',()=>{
 const saved=api.recapStoredSelection('p',state(videos()),2);
 for(const current of [videos().slice(0,1),[videos()[0],{...videos()[1],sourceResourceId:a}],videos().map(row=>({...row,projectId:'other'}))])assert.throws(()=>api.restoreRecapSelection('p',saved,current,['A','B'],2,8.4),/unavailable|another Project/);
 assert.throws(()=>api.restoreRecapSelection('other',saved,videos(),['A','B'],2,8.4),/another Project/);
});
test('Recap never adopts a legacy alias-only record, an edited temporary ID or a source interval that no longer fits',()=>{
 const saved=api.recapStoredSelection('p',state(videos()),2);
 for(const invalid of [state(videos()).slots,{...saved,version:1},{...saved,slots:[{sourceResourceId:'r0',startSeconds:2},saved.slots[1]]},{...saved,intro:{...saved.intro,startSeconds:17},slots:[{...saved.slots[0],startSeconds:17},saved.slots[1]]}])assert.throws(()=>api.restoreRecapSelection('p',invalid,videos(),['A','B'],2,8.4),/unavailable|another Project/);
});
test('Recap persists one versioned atomic selection value while leaving every legacy namespace byte untouched',async()=>{
 const legacy=new Map([['recap-2026:p:A|B','[{"resourceId":"r0","startSeconds":2}]'],['recap-2026:p:intro','{"resourceId":"r0","startSeconds":2}'],['recap-2026:p:excluded','[]'],['recap-2026:p:folders','["A","B"]']]),values=new Map(legacy),writes=[];
 const sdk={storage:{getItem:async key=>values.get(key)??null,setItem:async(key,value)=>{writes.push(key);values.set(key,value)},removeItem:async()=>{throw Error('No legacy deletion allowed')}}};
 await api.saveRecapSelection(sdk,'p',state(videos()),2);assert.deepEqual(writes,['recap-2026:selection-v2:p']);for(const [key,value]of legacy)assert.equal(values.get(key),value);
 const restored=api.restoreRecapSelection('p',JSON.parse(values.get(writes[0])),videos(['r4','r5']),['A','B'],2,8.4);assert.equal(restored.intro.resourceId,'r4');
});
test('Recap binds current SDK aliases through the real canonical resource join, preserving distinct UUIDs with identical names',async()=>{
 const raw=[{resourceId:a,name:'duplicate.mp4',type:'Video'},{resourceId:b,name:'duplicate.mp4',type:'Video'}];
 const sdk={call:async()=>raw,runScript:async({script})=>({result:await new Function('selects','return(async()=>{'+script+'})()')({project:()=>({resources:async()=>[{resourceId:'r3',name:'duplicate.mp4',type:'Video'},{resourceId:'r1',name:'duplicate.mp4',type:'Video'}]})})})};
 const bound=await api.bindRecapSourceIdentities(sdk,'p',[{resourceId:'r1',name:'duplicate.mp4'},{resourceId:'r3',name:'duplicate.mp4'}]);assert.deepEqual(plain(bound.map(x=>x.sourceResourceId)),[b,a]);assert.ok(bound.every(x=>x.projectId==='p'));
});
