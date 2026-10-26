import assert from 'node:assert/strict';
import test from 'node:test';
import {programFixture as fixture} from './archive_program_fixture.mjs';
for(const kind of ['parameters','source','controls','interval','duplicate'])test('Archive Finish: same-label '+kind+' title is not the intended result',async()=>{
 const f=fixture();f.title();const g=f.graphics[0];if(kind==='parameters')g.program.parameters.text='Unrelated';if(kind==='source')g.program.tsxCode+='//different';if(kind==='controls')g.program.editableParameters[0].label='Wrong';if(kind==='interval')g.clip.endFrame=59;if(kind==='duplicate')f.title();
 await assert.rejects(f.run());assert.equal(f.commits(),0);assert.deepEqual(f.log,[]);
});
for(const kind of ['parameters','source','controls','disabled','duplicate'])test('Archive Finish: same-label '+kind+' effect is not complete',async()=>{
 const f=fixture();f.title();const e=f.look();if(kind==='parameters')e.program.parameters.strength=.1;if(kind==='source')e.program.tsxCode+='//different';if(kind==='controls')e.program.editableParameters=[];if(kind==='disabled')e.enabled=false;f.effects.set(1,[e]);if(kind==='duplicate')f.effects.get(1).push(JSON.parse(JSON.stringify(e)));
 await assert.rejects(f.run());assert.equal(f.commits(),0);assert.deepEqual(f.log,[]);
});
for(const kind of ['Graphic','Effect'])test('Archive Finish: ignored '+kind+' writes cannot commit',async()=>{
 const f=fixture();if(kind==='Effect')f.look();f.hooks['ignore'+kind]=true;await assert.rejects(f.run());assert.equal(f.commits(),0);
});
test('Archive Finish control: healthy programs remain idempotent',async()=>{
 const f=fixture();f.look();assert.equal((await f.run()).committed,true);assert.equal((await f.run()).alreadyDone,true);assert.equal(f.commits(),1);assert.equal(f.graphics.length,1);assert.equal(f.effects.get(1).length,1);
});
test('Archive Finish: muting waits until all existing programs pass preflight',async()=>{
 const f=fixture();f.title();f.graphics[0].program.parameters.text='Unrelated';f.cfg.mute=true;await assert.rejects(f.run());assert.deepEqual(f.log,[]);assert.equal(f.commits(),0);
});
test('Archive Finish: the opening reveal must precede a preexisting Cinematic look',async()=>{
 const f=fixture();f.title();f.effects.set(1,[f.look()]);f.cfg.letterbox={tsx:'export default function Reveal(){return null}',parameters:{revealStart:.22,revealEnd:2.35,visible:.8}};await assert.rejects(f.run());assert.deepEqual(f.log,[]);assert.equal(f.commits(),0);
});
test('Archive Finish: reveal, final fade and look preserve their exact order',async()=>{
 const f=fixture();f.look();f.cfg.letterbox={tsx:'export default function Reveal(){return null}',parameters:{revealStart:.22,revealEnd:2.35,visible:.8}};f.cfg.fade={tsx:'export default function Fade(){return null}',fadeSeconds:1};await f.run();assert.deepEqual(f.effects.get(1).map(e=>e.name),['Letterbox reveal','Fade out','Cinematic look']);assert.equal((await f.run()).alreadyDone,true);assert.equal(f.commits(),1);
});
test('Archive Finish: failed pre-save hook cannot dispatch a save',async()=>{
 const f=fixture();f.cfg.__beforeCommit=async()=>{throw Error('owned state refused');};await assert.rejects(f.run(),/owned state refused/);assert.equal(f.commits(),0);
});
test('Archive Finish: already-complete programs still pass one noncommitting pre-save hook',async()=>{
 const f=fixture();f.title();let seen=0;f.cfg.__beforeCommit=async(_d,committing)=>{seen++;assert.equal(committing,false);};assert.equal((await f.run()).alreadyDone,true);assert.equal(seen,1);assert.equal(f.commits(),0);
});
test('Archive Finish: minified distribution keeps actual program verification',async()=>{
 const f=fixture({minify:true});f.look();await f.run();f.graphics[0].program.parameters.text='Manual edit';await assert.rejects(f.run());assert.equal(f.commits(),1);
});
