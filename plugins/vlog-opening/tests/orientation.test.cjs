// C-15: the template's source canvas must not come from an unrelated open Draft.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { stripTypeScriptTypes } = require('node:module');
const { test } = require('node:test');
const panel = fs.readFileSync(process.env.VLOG_OPENING_PANEL || path.join(__dirname, '..', 'panel.tsx'), 'utf8');
const between = (a, b) => { const i = panel.indexOf(a), j = panel.indexOf(b, i); assert.ok(i >= 0 && j > i, a); return panel.slice(i, j); };
const strip = s => stripTypeScriptTypes(s, { mode: 'strip' });
const K = new Function(strip([
  between('const TEMPLATE_VARIANTS:', '// Reads the handed clips'),
  between('function templatePoolScript(', 'type TemplateOutcome'),
  between('async function runQuiet(', '// The whole template build.'),
  between('async function runTemplate(', '  // The style\'s own cue:') + 'return {style,picked,frame,landscape};\n}',
].join('\n')) + '\nreturn {runTemplate,templatePoolScript};')();
const wide = {width:1920,height:1080}, tall = {width:1080,height:1920};
async function read(variant, frames, open = tall) {
  const events = [], complete = [];
  const sdk = {runScript: async ({summary,script,allowCommit}) => {
    assert.equal(summary, 'Read picked clips'); assert.equal(allowCommit, false);
    const result = await new Function('selects', strip('async function execute(){'+script+'\n}')+'\nreturn execute();')({
      project: () => ({resource: rid => ({meta: async () => {
        const item = frames[Number(rid.slice(1))];
        if (item.delay) await new Promise(r => setTimeout(r, item.delay));
        complete.push(rid); if (item.error) throw new Error('not analysed');
        return {durationSeconds:item.seconds ?? 10, frameSize:item.frame};
      }}), sourceFiles: async () => ({fileTree:[]})}),
      draft: () => ({meta: async () => {events.push('context-read'); return {frameSize:open};}}),
    });
    return {result};
  }};
  const result = await K.runTemplate(sdk, {projectId:'owned',sequenceId:open ? 'unrelated' : null,
    template:{variant,inputs:{footage:frames.map((_,i)=>({kind:'video',resourceId:'r'+i,name:'source'+i+'.mp4'}))}}},()=>{});
  return {result,events,complete};
}
for (const variant of ['whip-cut','motion-graphics']) {
  for (const [context,frame] of [['portrait',tall],['landscape',wide],['none',null]]) {
    test(`${variant}: landscape inputs ignore ${context} focus`, async () => {
      const {result,events} = await read(variant,[{frame:wide},{frame:wide}],frame);
      assert.deepEqual(result.frame,wide); assert.equal(result.landscape,true); assert.deepEqual(events,[]);
    });
  }
  test(`${variant}: mixed orientation follows selected order despite reversed metadata responses`, async () => {
    const {result,complete} = await read(variant,[{frame:wide,delay:20},{frame:tall}],tall);
    assert.deepEqual(complete,['r1','r0']); assert.deepEqual(result.frame,wide);
    assert.deepEqual(result.picked.map(p=>p.rid),['r0','r1']);
  });
  test(`${variant}: portrait display metadata stays portrait without double-rotating`, async () => {
    const {result} = await read(variant,[{frame:tall},{frame:wide}],wide);
    assert.deepEqual(result.frame,tall); assert.equal(result.landscape,false);
  });
  test(`${variant}: skip unreadable, short and invalid canvas before first valid canvas`, async () => {
    const {result} = await read(variant,[{frame:tall,error:true},{frame:tall,seconds:1},{frame:{width:0,height:1080}},{frame:wide}]);
    assert.deepEqual(result.frame,wide); assert.deepEqual(result.picked.map(p=>p.rid),['r2','r3']);
  });
  test(`${variant}: ordered canvas selection spans metadata batches`, async () => {
    const {result} = await read(variant,[...Array.from({length:8},()=>({frame:null})),{frame:tall},{frame:wide}]);
    assert.deepEqual(result.frame,tall); assert.equal(result.picked.length,10);
  });
  test(`${variant}: missing canvas keeps default without borrowing focus`, async () => {
    const {result,events} = await read(variant,[{frame:null},{frame:{width:NaN,height:1080}}]);
    assert.equal(result.frame,null); assert.equal(result.landscape,true); assert.deepEqual(events,[]);
  });
}
test('Funny quotes preserves the open timeline canvas',async()=>{
  const {result,events}=await read('funny-quotes',[{frame:wide}],tall);
  assert.deepEqual(result.frame,tall); assert.deepEqual(events,['context-read']);
});
test('Funny quotes with no open timeline preserves default canvas',async()=>{
  const {result}=await read('funny-quotes',[{frame:wide}],null); assert.equal(result.frame,null);
});
