'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {webcrypto} = require('node:crypto');
const {createRequire} = require('node:module');
const modulesRoot = process.env.SBS_PANEL_TEST_MODULES;

test('independent panels use collision-resistant run identities', {skip: !modulesRoot && 'Set SBS_PANEL_TEST_MODULES'}, async t => {
  const dep = createRequire(path.resolve(modulesRoot, '../package.json'));
  const source = fs.readFileSync(path.join(__dirname, '../panel.tsx'), 'utf8');
  const run = source.indexOf('  async function run(resume?: any,');
  const initializer = source.slice(run).match(/let job: any = (resume \?\? \{[^\n]+\});/)[1];
  const stamp = 1792540000000;
  class FixedDate extends Date {
    constructor(...args) { super(...(args.length ? args : [stamp])); }
    static now() { return stamp; }
  }
  const panel = (projectId, crypto = webcrypto) => vm.createContext({Date: FixedDate, crypto, projectId, resume: undefined, mode:'project', contentMode:'speech', url:'', pick:'source', program:'template', countMode:'manual', count:1, note:'brief', platform:'shorts', fixedLayout:'grid-4', framing:true, subjectInstructions:'Keep all four people visible'});
  const create = context => vm.runInContext('(' + initializer + ')', context);
  const module = {exports:{}};
  const code = dep('esbuild').transformSync(source + '\nexport {makeStore,thumbnailPath};', {loader:'tsx',format:'cjs'}).code;
  new Function('require','module','exports',code)(dep,module,module.exports);
  const {makeStore,thumbnailPath} = module.exports;

  await t.test('fixed millisecond across independent runtimes never supplies the identity', () => {
    const a = panel('a'), b = panel('b');
    const jobs = Array.from({length:1000}, (_, i) => create(i % 2 ? a : b));
    assert.equal(new Set(jobs.map(j => j.created)).size,1);
    assert.equal(new Set(jobs.map(j => j.id)).size,jobs.length);
    for (const j of jobs) {
      assert.match(j.id,/^[a-f0-9]{32}$/);
      assert.equal(j.fixedLayout,'grid-4');
      assert.equal(j.subjectInstructions,'Keep all four people visible');
      assert.equal(Object.hasOwn(j,'skipFraming'),false);
    }
    // Turning framing off is recorded on the job; the default keeps existing jobs unchanged.
    const skipped=panel('c');skipped.framing=false;
    assert.equal(create(skipped).skipFraming,true);
  });

  await t.test('same-clock projects retain separate shared job files, workspaces and thumbnails', async () => {
    const writes = new Map();
    const files = {homedir:()=>'/home',join:path.posix.join,writeFile:async(p,bytes)=>writes.set(p,Buffer.from(bytes))};
    const a = create(panel('a')), b = create(panel('b'));
    await Promise.all([makeStore(files).put('jobs',a.id,a),makeStore(files).put('jobs',b.id,b)]);
    assert.equal(writes.size,2);
    assert.deepEqual([...writes.values()].map(bytes=>JSON.parse(bytes).projectId).sort(),['a','b']);
    const directoryExpression = source.match(/directory=(`\$\{environment.homedir\}\/\.selects\/plugin-data\/shortform-clips\/scene-runs\/\$\{job.id\}`);/)[1];
    const directory = job => vm.runInNewContext(directoryExpression,{environment:{homedir:'/home'},job});
    assert.notEqual(directory(a),directory(b));
    assert.notEqual(thumbnailPath(a.id,'draft'),thumbnailPath(b.id,'draft'));
  });

  await t.test('resuming an old timestamp ID preserves the same object and never allocates an ID', () => {
    const context = panel('a',{randomUUID:()=>{throw Error('Unexpected new identity');}});
    const saved = {id:'mvhb0q97',projectId:'a',created:'2026-10-20T00:00:00.000Z',sceneStudy:{clips:[]}};
    context.resume = saved;
    assert.equal(create(context),saved);
    assert.equal(create(context).id,'mvhb0q97');
  });
});
