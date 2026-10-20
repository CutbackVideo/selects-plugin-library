const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const os=require('node:os');
const path=require('node:path');
const {run,compareVersions}=require('../update.cjs');
const old='a'.repeat(40),latest='b'.repeat(40);
async function fixture(t){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'shortform-updates-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const skills=path.join(root,'skills','shortform-clips'),panels=path.join(root,'panels','shortform-clips');await fs.mkdir(skills,{recursive:true});await fs.mkdir(panels,{recursive:true});
 const files=['README.md','INSTALL.md','panel.tsx','update.cjs'];const manifest={id:'shortform-clips',version:'0.4.2',files,updates:{protocol:1}};
 const release=Object.fromEntries(files.map(f=>[f,Buffer.from('new '+f)]));release['plugin.json']=Buffer.from(JSON.stringify(manifest));
 for(const [file,data]of Object.entries(release))await fs.writeFile(path.join(file==='panel.tsx'?panels:skills,file),'old '+file);
 await fs.writeFile(path.join(skills,'plugin.json'),JSON.stringify({...manifest,version:'0.4.1'}));
 await fs.writeFile(path.join(skills,'.source-commit'),old);
 const data=path.join(root,'plugin-data','shortform-clips');await fs.mkdir(path.join(data,'overrides'),{recursive:true});await fs.writeFile(path.join(data,'overrides','mine.json'),'my yellow captions');await fs.writeFile(path.join(data,'draft.json'),'saved draft');
 const checkContext={installed:{commit:old,version:'0.4.1'},latest:{commit:latest,version:'0.4.2'}};
 const requests=[];
 const fetchImpl=async url=>{
  requests.push(url);
  assert.ok(url.startsWith(`https://raw.githubusercontent.com/CutbackVideo/selects-plugin-library/${latest}/plugins/shortform-clips/`));
  const file=url.split('/plugins/shortform-clips/')[1];
  return new Response(release[file],{status:release[file]?200:404});
 };
 return {root,skills,panels,data,release,fetchImpl,checkContext,requests};
}
test('manual installs report the initial library installation requirement without network calls',async t=>{
 const f=await fixture(t);await fs.rm(path.join(f.skills,'.source-commit'));
 const deps={...f,fetchImpl:()=>{throw Error('no network')}};
 await assert.rejects(run('check',null,deps),/Install this app from the library once/);
 await assert.rejects(run('check',null,{...deps,checkContext:{...f.checkContext,installed:null}}),/Install this app from the library once/);
 assert.equal(await run('check',null,{...deps,checkContext:{installed:null,latest:null}}),null);
});
test('offers a changed release and preserves all user data on install',async t=>{
 const f=await fixture(t);assert.equal((await run('check',null,f)).id,latest);const result=await run('apply',latest,f);assert.equal(result.updated,true);
 assert.equal(await fs.readFile(path.join(f.data,'overrides','mine.json'),'utf8'),'my yellow captions');assert.equal(await fs.readFile(path.join(f.data,'draft.json'),'utf8'),'saved draft');
 assert.equal(await fs.readFile(path.join(f.skills,'.source-commit'),'utf8'),latest);assert.equal(await fs.readFile(path.join(f.panels,'panel.tsx'),'utf8'),'new panel.tsx');assert.equal(await run('check',null,{...f,checkContext:{installed:{commit:latest,version:'0.4.2'},latest:f.checkContext.latest}}),null);
});
test('rejects a partial download before replacing installed files',async t=>{const f=await fixture(t);delete f.release['panel.tsx'];await assert.rejects(run('apply',latest,f),/download failed/);assert.equal(await fs.readFile(path.join(f.skills,'README.md'),'utf8'),'old README.md');assert.equal(await fs.readFile(path.join(f.skills,'.source-commit'),'utf8'),old);});
test('rolls back replaced files and receipt on a mid-install failure',async t=>{const f=await fixture(t);await assert.rejects(run('apply',latest,{...f,afterPlace:file=>{if(file==='panel.tsx')throw Error('disk failed')}}),/disk failed/);assert.equal(await fs.readFile(path.join(f.panels,'panel.tsx'),'utf8'),'old panel.tsx');assert.equal(await fs.readFile(path.join(f.skills,'README.md'),'utf8'),'old README.md');assert.equal(await fs.readFile(path.join(f.skills,'.source-commit'),'utf8'),old);assert.equal(await fs.readFile(path.join(f.data,'draft.json'),'utf8'),'saved draft');});
test('refuses linked installation files',async t=>{const f=await fixture(t);const p=path.join(f.panels,'panel.tsx');await fs.rm(p);await fs.symlink(path.join(f.data,'draft.json'),p);await assert.rejects(run('apply',latest,f),/symbolic links/);assert.equal(await fs.readFile(path.join(f.data,'draft.json'),'utf8'),'saved draft');});
test('refuses to install releases that remove the update protocol',async t=>{const f=await fixture(t);f.release['plugin.json']=Buffer.from(JSON.stringify({id:'shortform-clips',version:'0.4.2',files:['panel.tsx']}));await assert.rejects(run('apply',latest,f),/does not support app updates/);});
test('serializes installs with a lock rather than overwriting concurrent work',async t=>{const f=await fixture(t);const p=path.join(f.root,'.updates','shortform-clips');await fs.mkdir(p,{recursive:true});await fs.writeFile(path.join(p,'install.lock'),'other');await assert.rejects(run('apply',latest,f),/Another Shortform update/);assert.equal(await fs.readFile(path.join(f.skills,'.source-commit'),'utf8'),old);});

test('failed rollback retains the recovery lock and blocks another installation', async t => {
  const f = await fixture(t);
  const rename = fs.rename;
  fs.rename = async (from, to) => {
    if (from.endsWith('panel.tsx.backup')) throw Error('restore disk failed');
    return rename(from, to);
  };
  try {
    await assert.rejects(run('apply', latest, {
      ...f, afterPlace: file => { if (file === 'panel.tsx') throw Error('install disk failed'); },
    }), /recovery is required/);
  } finally { fs.rename = rename; }
  const base = path.join(f.root, '.updates', 'shortform-clips');
  await fs.access(path.join(base, 'install.lock'));
  const backups = (await fs.readdir(base)).filter(name => name.startsWith('release-'));
  assert.equal(backups.length, 1);
  await fs.access(path.join(base, backups[0], 'panel.tsx.backup'));
  await assert.rejects(run('apply', latest, f), /Another Shortform update/);
  assert.equal(await fs.readFile(path.join(f.data, 'draft.json'), 'utf8'), 'saved draft');
});

test('busy or unsaved app still discovers updates while refusing installation', async () => {
  const source = await fs.readFile(path.join(__dirname, '../panel.tsx'), 'utf8');
  const start = source.indexOf('      async checkUpdate(checkContext: any) {');
  const end = source.indexOf('      async prepareUpdate(id: string) {', start);
  const check = source.slice(start, end).trim().replace(/,$/, '').replace('checkContext: any', 'checkContext');
  const prepareEnd = source.indexOf('\n    });', end);
  const prepare = source.slice(end, prepareEnd).trim().replace('id: string', 'id').replace(/,$/, '');
  let calls = 0;
  const sdk = {runShell: async () => { calls++; return {exitCode: 0, stdout: JSON.stringify({id: latest, version: 'new'})}; }};
  const provider = new Function('sdk', 'updateBlocked', 'shortformUpdateCommand', `let selectedContext = null;return {${check},${prepare}};`)(sdk, {current: true}, mode => mode);
  assert.equal((await provider.checkUpdate({installed:{commit:old,version:'0.4.1'},latest:{commit:latest,version:'0.4.2'}})).id, latest);
  assert.equal(calls, 1);
  await assert.rejects(provider.prepareUpdate(latest), /Finish the current operation/);
});

test('offers only a higher app version, irrespective of library commit changes', async t => {
  const f = await fixture(t);
  for (const v of ['0.4.1', '0.4.0', '0.4.1+other-app', '0.4.1-rc.2']) {
    assert.equal(await run('check', null, {...f, checkContext: {...f.checkContext, latest: {commit: latest, version: v}}}), null);
  }
  assert.equal((await run('check', null, f)).version, '0.4.2');
  assert.deepEqual(f.requests, []);
  await assert.rejects(run('apply', latest, {...f, checkContext: {...f.checkContext, latest: {commit: latest, version: '0.4.1'}}}), /not newer/);
  await assert.rejects(run('check', null, {...f, checkContext: undefined}), /host does not support/);
  await assert.rejects(run('check', null, {...f, checkContext: {installed: null, latest: f.checkContext.latest}}), /Install this app from the library once/);
  assert.equal(await run('check', null, {...f, checkContext: {...f.checkContext, latest: null}}), null);
});

test('semver precedence handles numeric components, prereleases and build metadata', () => {
  for (const [a, b] of [['0.4.10', '0.4.9'], ['1.0.0', '1.0.0-rc.1'], ['1.0.0-rc.10', '1.0.0-rc.2'], ['1.0.0-beta', '1.0.0-2'], ['1.0.0-beta.1', '1.0.0-beta']]) {
    assert.equal(compareVersions(a, b), 1);
    assert.equal(compareVersions(b, a), -1);
  }
  assert.equal(compareVersions('1.2.3+build.2', '1.2.3+build.1'), 0);
  for (const v of [undefined, '', '01.2.3', '1.2', '1.2.3-01']) assert.throws(() => compareVersions(v, '1.0.0'), /Invalid/);
});

test('downloads only the catalog-selected commit and refuses a mismatched version', async t => {
  const f = await fixture(t);
  f.release['plugin.json'] = Buffer.from(JSON.stringify({...JSON.parse(f.release['plugin.json']), version: '0.4.3'}));
  await assert.rejects(run('apply', latest, f), /differs from the published catalog/);
  await assert.rejects(run('apply', old, f), /Selected release differs/);
  assert.equal(await fs.readFile(path.join(f.skills, '.source-commit'), 'utf8'), old);
});

test('accepts new declared app files without changing packs or user data', async t => {
  const f = await fixture(t);
  const manifest = JSON.parse(f.release['plugin.json']);
  manifest.files.push('scripts/helper.cjs');
  f.release['plugin.json'] = Buffer.from(JSON.stringify(manifest));
  f.release['scripts/helper.cjs'] = Buffer.from('new helper');
  await run('apply', latest, f);
  assert.equal(await fs.readFile(path.join(f.skills, 'scripts/helper.cjs'), 'utf8'), 'new helper');
  assert.equal(await fs.readFile(path.join(f.data, 'draft.json'), 'utf8'), 'saved draft');
});

test('rejects unsafe, duplicate and pack destinations before replacing files', async t => {
  for (const file of ['../escape.cjs', '/absolute.cjs', 'x\\evil.cjs', 'plugin-data/data.json', 'template-packs/demo/template.json', 'plugin.json', '.source-commit', 'NUL.txt', 'nested/../escape', 'README.md']) {
    const f = await fixture(t);
    const manifest = JSON.parse(f.release['plugin.json']);
    manifest.files.push(file);
    f.release['plugin.json'] = Buffer.from(JSON.stringify(manifest));
    await assert.rejects(run('apply', latest, f), /file list/);
    assert.equal(await fs.readFile(path.join(f.skills, '.source-commit'), 'utf8'), old);
  }
});

test('panel command forwards the host catalog context to the installed updater', async () => {
  const source = await fs.readFile(path.join(__dirname, '../panel.tsx'), 'utf8');
  const start = source.indexOf('function shortformUpdateCommand(');
  const code = source.slice(start, source.indexOf('\nfunction ShortformClipsPanel', start)).replaceAll(': string', '').replaceAll(': any', '');
  const command = new Function('IS_WIN', `${code};return shortformUpdateCommand;`)(false);
  const context = {installed: {commit: old, version: '0.4.1'}, latest: {commit: latest, version: '0.4.2'}};
  const encoded = command('apply', latest, context).match(/Buffer.from\('([^']+)'/)[1];
  const script = Buffer.from(encoded, 'base64').toString();
  let received;
  const mockRequire = name => name.endsWith('update.cjs') ? {run: async (...args) => {received = args; return {updated: true};}} : require(name);
  await new Function('require', 'console', script.replace("require(f).run(", "return require(f).run("))(mockRequire, {log() {}, error(message) {throw Error(message);}});
  assert.deepEqual(received, ['apply', latest, {checkContext: context}]);
});

test('uses configured skills and panels roots without writing default installation paths', async t => {
  const f = await fixture(t);
  const customPanels = path.join(f.root, 'separate-panels');
  await fs.mkdir(customPanels);
  await fs.rename(path.join(f.root, 'panels', 'shortform-clips'), path.join(customPanels, 'shortform-clips'));
  const deps = {...f, root: undefined, env: {SELECTS_USER_SKILLS_ROOT: path.join(f.root, 'skills'), SELECTS_USER_PANELS_ROOT: customPanels}};
  assert.equal((await run('check', null, deps)).version, '0.4.2');
  await run('apply', latest, deps);
  assert.equal(await fs.readFile(path.join(customPanels, 'shortform-clips/panel.tsx'), 'utf8'), 'new panel.tsx');
  assert.equal(await fs.readFile(path.join(f.skills, '.source-commit'), 'utf8'), latest);
  assert.equal(await fs.readFile(path.join(f.data, 'draft.json'), 'utf8'), 'saved draft');
  await assert.rejects(fs.access(path.join(f.root, 'panels/shortform-clips/panel.tsx')));
});

test('uses the host runtime with spaces in its path and no node on PATH', async t => {
  const source = await fs.readFile(path.join(__dirname, '../panel.tsx'), 'utf8');
  const start = source.indexOf('function shortformUpdateCommand(');
  const code = source.slice(start, source.indexOf('\nfunction ShortformClipsPanel', start)).replaceAll(': string', '').replaceAll(': any', '');
  const command = new Function('IS_WIN', `${code};return shortformUpdateCommand;`)(false);
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'runtime with spaces '));
  t.after(() => fs.rm(dir, {recursive:true,force:true}));
  const skills = path.join(dir, 'skills with spaces');
  await fs.mkdir(path.join(skills, 'shortform-clips'), {recursive:true});
  await fs.writeFile(path.join(skills, 'shortform-clips/update.cjs'), 'exports.run=async(mode,id,deps)=>({mode,id,...deps});');
  const wrapper = path.join(dir, 'host node');
  await fs.writeFile(wrapper, `#!/bin/sh\nexec '${process.execPath.replaceAll("'", "'\\''")}' "$@"\n`, {mode:0o700});
  const context = {installed:{commit:old,version:'0.4.1'},latest:{commit:latest,version:'0.4.2'}};
  const output = require('node:child_process').execFileSync('/bin/sh', ['-c', command('check', '', context)], {
    env:{PATH:'/usr/bin:/bin',SELECTS_NODE:wrapper,SELECTS_USER_SKILLS_ROOT:skills}, encoding:'utf8',
  });
  assert.deepEqual(JSON.parse(output), {mode:'check',id:'',checkContext:context});
  const windows = command('check', '', context, true);
  assert.match(windows, /^if not defined SELECTS_NODE set "SELECTS_NODE=node"\r\n"%SELECTS_NODE%" -e /);
  assert.doesNotMatch(windows, /\$\{SELECTS_NODE/);
});
