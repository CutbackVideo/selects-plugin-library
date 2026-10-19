const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {createRequire} = require('node:module');
const modules = process.env.SBS_PANEL_TEST_MODULES;
test('run folders', {skip: !modules}, async t => {
  const dep = createRequire(path.resolve(modules, '../package.json'));
  const src = fs.readFileSync(path.join(__dirname, '../panel.tsx'), 'utf8');
  const mod = {exports: {}};
  new Function('require', 'module', 'exports', dep('esbuild').transformSync(src + '\nexport {ensureRunFolder,moveRunDrafts};', {loader:'tsx',format:'cjs'}).code)(dep, mod, mod.exports);
  const {ensureRunFolder, moveRunDrafts} = mod.exports;
  const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
  function fixture() {
    const folders = [], moves = [], snapshots = [];
    let creates = 0, loseReply = false;
    const job = {id:'run-1',projectId:'project-1',title:'Interview',created:'2026-10-19T02:30:00Z'};
    const project = {
      readFootage: async () => ({folders}),
      createFolder: async ({name}) => {
        const folder = {folderId:`folder-${++creates}`,name}; folders.push(folder);
        if (loseReply) {loseReply = false; throw Error('connection lost');}
        return folder;
      },
      renameFolder: async ({folderId,name}) => { folders.find(f=>f.folderId===folderId).name=name; },
      moveToFolder: async data => {moves.push(data); return {movedCount:data.draftIds.length,skipped:[]};}
    };
    const script = async (code, summary, allowCommit) => {
      assert.equal(allowCommit,true);
      return new AsyncFunction('selects',code)({project:id=>{assert.equal(id,job.projectId);return project;}});
    };
    const persist = async patch => {Object.assign(job,patch);snapshots.push(structuredClone(job));};
    return {job,folders,moves,snapshots,project,script,persist,lose:()=>{loseReply=true;}, count:()=>creates};
  }
  await t.test('folder display-name script passes host TypeScript checks', async () => {
    const f = fixture(), ts = dep('typescript');
    await ensureRunFolder(f.job, async (script, summary, allowCommit) => {
      if (summary === 'Name shorts run folder') {
        const filename = path.resolve('shortform-folder-check.ts');
        const code = `declare const selects: { project(id:string): {
          readFootage(): Promise<{folders:{folderId:string,name:string}[]}>;
          renameFolder(input:{folderId:string,name:string}): Promise<void>;
        }};
        async function rename() {${script}}`;
        const options = {noEmit:true,strict:true,types:[],target:ts.ScriptTarget.ES2022,skipLibCheck:true};
        const host = ts.createCompilerHost(options), original = host.getSourceFile;
        host.getSourceFile = (file,...args) => file === filename ? ts.createSourceFile(file,code,options.target,true) : original.call(host,file,...args);
        const program = ts.createProgram([filename],options,host);
        assert.deepEqual(ts.getPreEmitDiagnostics(program).map(d=>ts.flattenDiagnosticMessageText(d.messageText,'\n')),[]);
      }
      return f.script(script,summary,allowCommit);
    }, f.persist);
    assert.ok(!f.folders[0].name.endsWith(' · run-1'));
  });
  await t.test('one folder per run; retries reuse renamed folders and move only result Drafts', async () => {
    const f = fixture();
    const id = await ensureRunFolder(f.job,f.script,f.persist);
    assert.ok(!f.folders[0].name.endsWith(' · run-1'));
    assert.ok(f.job.folderName.endsWith(' · run-1'));
    f.folders[0].name = 'User renamed';
    assert.equal(await ensureRunFolder(f.job,f.script,f.persist),id);
    assert.equal(f.folders[0].name,'User renamed');
    await moveRunDrafts(f.job.projectId,id,['draft-a','draft-b','draft-a',undefined],f.script);
    assert.equal(f.count(),1);
    assert.deepEqual(f.moves,[{targetFolderId:id,draftIds:['draft-a','draft-b']}]);
    assert.equal(f.snapshots[0].folderId,undefined);
    assert.ok(f.snapshots[0].folderName.includes('run-1'));
  });
  await t.test('recovers folder when creation succeeded but response or ID persistence was lost', async () => {
    const f = fixture();f.lose();
    await assert.rejects(ensureRunFolder(f.job,f.script,f.persist),/connection lost/);
    assert.equal(f.job.folderId,undefined);
    assert.equal(await ensureRunFolder(f.job,f.script,f.persist),'folder-1');
    assert.equal(f.count(),1);
  });
  await t.test('deleted folder is recreated; different runs do not share folders', async () => {
    const f = fixture();await ensureRunFolder(f.job,f.script,f.persist);
    f.folders.length = 0;
    assert.equal(await ensureRunFolder(f.job,f.script,f.persist),'folder-2');
    delete f.job.folderId;delete f.job.folderName;f.job.id = 'run-2';
    assert.equal(await ensureRunFolder(f.job,f.script,f.persist),'folder-3');
  });
  await t.test('removes only the exact run suffix after moving; keeps custom names and IDs', async () => {
    const f = fixture();
    const names = {a:'Clip 1 · run-1',b:'Custom name'};
    const commits=[];
    const script=async(code,summary,allowCommit)=>{
      assert.equal(allowCommit,true);
      return new AsyncFunction('selects',code)({project:()=>f.project,draft:id=>({
        meta:async()=>({name:names[id]}), setName:async name=>{names[id]=name;},commitAll:async()=>{commits.push(id);}
      })});
    };
    await moveRunDrafts('project-1','folder-1',['a','b'],script,'run-1');
    assert.deepEqual(names,{a:'Clip 1',b:'Custom name'});
    assert.deepEqual(commits,['a']);
    assert.deepEqual(f.moves[0].draftIds,['a','b']);
    await moveRunDrafts('project-1','folder-1',['a','b'],script,'run-1');
    assert.deepEqual(commits,['a']);
  });
  await t.test('missing Draft is reported so resume can retry placement', async () => {
    const f = fixture();
    f.project.moveToFolder = async () => ({movedCount:0,skipped:['missing']});
    await assert.rejects(moveRunDrafts(f.job.projectId,'folder-1',['missing'],f.script),/Resume/);
  });
  await t.test('run prepares folder before clip loop and persists Draft before moving it', () => {
    const body = src.slice(src.indexOf('  async function run(resume?'));
    assert.ok(body.indexOf('await ensureRunFolder') < body.indexOf('for (let i = 0; i < pickd.clips.length'));
    assert.ok(body.indexOf('await moveRunDrafts(job.projectId, folderId, made.map') < body.indexOf('if (onlyDraftId'));
    assert.match(body,/await persist\(\{ built: made, resultWarning \}\);\s+if \(made\[i\]\?\.draftId\) \{\s+await moveRunDrafts/);
  });
});
