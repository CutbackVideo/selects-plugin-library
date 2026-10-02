import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {panelSource,posixHits,topLevel} from './windows_host.mjs';

const source=panelSource('depth-type-captions');
// The macOS speaker masks (osascript Vision through the login shell) are macOS-only by design.
const MAC_ONLY=['depthPrepareMasks','depthHasMaskSupport'];

test('the macOS-only shell is reached only off Windows',()=>{
 assert.match(source,/const DEPTH_CLOUD_MASKS = \/Windows\/i\.test\(navigator\.userAgent\);/);
 assert.match(source,/return DEPTH_CLOUD_MASKS\s*\? await depthPrepareCloudMasks\([^)]*\)\s*: await depthPrepareMasks\(/);
 assert.match(source,/if \(!DEPTH_CLOUD_MASKS\) \{\s*progress\("Checking the speaker mask tools…"\);\s*if \(!\(await depthHasMaskSupport\(sdk\)\)\)/);
 assert.equal((source.match(/depthPrepareMasks\(/g)||[]).length,2,'defined once, called once');
 assert.equal((source.match(/depthHasMaskSupport\(/g)||[]).length,2,'defined once, called once');
});

test('no runShell and no POSIX shell syntax outside the macOS-only mask functions',()=>{
 const mac=MAC_ONLY.map(n=>topLevel(source,n));
 let rest=source;for(const m of mac)rest=rest.replace(m,'');
 assert.equal((rest.match(/runShell/g)||[]).length,0);
 assert.deepEqual(posixHits(source,mac),[]);
});

test('Windows speaker masks are written by the host ffmpeg with an argv array',async()=>{
 const fn=topLevel(source,'depthPrepareCloudMasks');
 const call=/await runtime\.runFFmpeg\(\s*(\[[\s\S]*?\]),\s*true,\s*writing\.signal,\s*\);/.exec(fn);
 assert.ok(call,'one runFFmpeg call');
 const fs={join:(...p)=>p.join('\\')};
 const argv=vm.runInNewContext(call[1],{alpha:'C:\\masks\\cloud\\speaker masks.mp4',lw:384,lh:683,fs,job:{dir:'C:\\masks'},small:'C:\\masks\\layout'});
 assert.deepEqual(Array.from(argv),['-v','error','-y','-i','C:\\masks\\cloud\\speaker masks.mp4','-filter_complex','[0:v]format=gray,negate,split=2[a][b];[b]scale=384:683:flags=area[c]',
  '-map','[a]','C:\\masks\\matte_%06d.png','-map','[c]','C:\\masks\\layout\\l_%06d.png']);
 assert.match(fn,/if \(typeof runtime\?\.runFFmpeg !== "function"\) throw new Error\("This Selects build cannot write speaker mask files\. Update Selects, then try again\."\);/);
});
