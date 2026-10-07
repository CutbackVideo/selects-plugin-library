import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {panelSource,posixHits,topLevel} from './windows_host.mjs';
const source=panelSource('depth-type-captions');
test('both platforms make shared RVM masks and retain foreground selection',()=>{
 assert.match(source,/return await depthPrepareMasks\(sdk, p, settings, maskJob, progress, control, pid\)/);
 assert.match(source,/task:"person.matte"/);assert.match(source,/outputMode:"alpha-frames"/);
 assert.match(source,/const depthSubject = \(settings\) => \(settings.subject === "person" \? "person" : "foreground"\)/);
 assert.doesNotMatch(source,/selects\.generation|DEPTH_MASK_SOURCE|depthPrepareCloudMasks/);
});
test('mask preparation needs no shell on either operating system',()=>{
 assert.equal((source.match(/runShell/g)||[]).length,0);assert.deepEqual(posixHits(source),[]);
});
test('shared masks retain the inverted full-size PNG and small layout PNG pipeline',()=>{
 const fn=topLevel(source,'depthWriteSharedMasks');
 const call=/await runtime\.runFFmpeg\(\s*(\[[\s\S]*?\]),\s*true,\s*writing\.signal,\s*\);/.exec(fn);
 assert.ok(call);const fs={join:(...p)=>p.join('\\')};
 const argv=vm.runInNewContext(call[1],{prepared:{pattern:'C:\\masks\\alpha\\frame_%06d.png'},preview:{fps:30},lw:384,lh:683,fs,job:{dir:'C:\\masks'},small:'C:\\masks\\layout'});
 assert.deepEqual(Array.from(argv),['-v','error','-y','-framerate','30','-start_number','1','-i','C:\\masks\\alpha\\frame_%06d.png','-filter_complex','[0:v]format=gray,negate,split=2[a][b];[b]scale=384:683:flags=area[c]','-map','[a]','C:\\masks\\matte_%06d.png','-map','[c]','C:\\masks\\layout\\l_%06d.png']);
});
