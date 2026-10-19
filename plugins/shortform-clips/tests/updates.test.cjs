const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const os=require('node:os');
const path=require('node:path');
const {run,blob}=require('../update.cjs');
const old='a'.repeat(40),latest='b'.repeat(40);
async function fixture(t){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'shortform-updates-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const skills=path.join(root,'skills','shortform-clips'),panels=path.join(root,'panels','shortform-clips');await fs.mkdir(skills,{recursive:true});await fs.mkdir(panels,{recursive:true});
 const files=['README.md','INSTALL.md','panel.tsx','update.cjs'];const manifest={id:'shortform-clips',files,updates:{protocol:1}};
 const release=Object.fromEntries(files.map(f=>[f,Buffer.from('new '+f)]));release['plugin.json']=Buffer.from(JSON.stringify(manifest));
 for(const [file,data]of Object.entries(release))await fs.writeFile(path.join(file==='panel.tsx'?panels:skills,file),'old '+file);
 await fs.writeFile(path.join(skills,'.source-commit'),old);
 const data=path.join(root,'plugin-data','shortform-clips');await fs.mkdir(path.join(data,'overrides'),{recursive:true});await fs.writeFile(path.join(data,'overrides','mine.json'),'my yellow captions');await fs.writeFile(path.join(data,'draft.json'),'saved draft');
 const hashes=Object.entries(release).map(([file,bytes])=>({type:'blob',path:'plugins/shortform-clips/'+file,sha:blob(bytes)}));
 const fetchImpl=async url=>{
  let bytes;if(url.endsWith('/commits/main'))bytes=JSON.stringify({sha:latest});
  else if(url.includes('/git/trees/'))bytes=JSON.stringify({tree:hashes});
  else bytes=release[url.split('/').pop()];
  return new Response(bytes,{status:bytes?200:404});
 };
 return {root,skills,panels,data,release,fetchImpl,hashes};
}
test('unmanaged apps do not check a release',async t=>{const f=await fixture(t);await fs.rm(path.join(f.skills,'.source-commit'));assert.equal(await run('check',null,{...f,fetchImpl:()=>{throw Error('no network')}}),null);});
test('offers a changed release and preserves all user data on install',async t=>{
 const f=await fixture(t);assert.equal((await run('check',null,f)).id,latest);const result=await run('apply',latest,f);assert.equal(result.updated,true);
 assert.equal(await fs.readFile(path.join(f.data,'overrides','mine.json'),'utf8'),'my yellow captions');assert.equal(await fs.readFile(path.join(f.data,'draft.json'),'utf8'),'saved draft');
 assert.equal(await fs.readFile(path.join(f.skills,'.source-commit'),'utf8'),latest);assert.equal(await fs.readFile(path.join(f.panels,'panel.tsx'),'utf8'),'new panel.tsx');assert.equal(await run('check',null,f),null);
});
test('rejects corrupt downloads before replacing any installed file',async t=>{const f=await fixture(t);f.release['panel.tsx']=Buffer.from('corrupt');await assert.rejects(run('apply',latest,f),/verification/);assert.equal(await fs.readFile(path.join(f.skills,'README.md'),'utf8'),'old README.md');assert.equal(await fs.readFile(path.join(f.skills,'.source-commit'),'utf8'),old);});
test('rolls back replaced files and receipt on a mid-install failure',async t=>{const f=await fixture(t);await assert.rejects(run('apply',latest,{...f,afterPlace:file=>{if(file==='panel.tsx')throw Error('disk failed')}}),/disk failed/);assert.equal(await fs.readFile(path.join(f.panels,'panel.tsx'),'utf8'),'old panel.tsx');assert.equal(await fs.readFile(path.join(f.skills,'README.md'),'utf8'),'old README.md');assert.equal(await fs.readFile(path.join(f.skills,'.source-commit'),'utf8'),old);assert.equal(await fs.readFile(path.join(f.data,'draft.json'),'utf8'),'saved draft');});
test('refuses linked installation files',async t=>{const f=await fixture(t);const p=path.join(f.panels,'panel.tsx');await fs.rm(p);await fs.symlink(path.join(f.data,'draft.json'),p);await assert.rejects(run('apply',latest,f),/symbolic links/);assert.equal(await fs.readFile(path.join(f.data,'draft.json'),'utf8'),'saved draft');});
test('does not offer releases that cannot keep the update protocol',async t=>{const f=await fixture(t);f.release['plugin.json']=Buffer.from(JSON.stringify({id:'shortform-clips',files:['panel.tsx']}));assert.equal(await run('check',null,f),null);});
test('serializes installs with a lock rather than overwriting concurrent work',async t=>{const f=await fixture(t);const p=path.join(f.root,'.updates','shortform-clips');await fs.mkdir(p,{recursive:true});await fs.writeFile(path.join(p,'install.lock'),'other');await assert.rejects(run('apply',latest,f),/Another Shortform update/);assert.equal(await fs.readFile(path.join(f.skills,'.source-commit'),'utf8'),old);});
