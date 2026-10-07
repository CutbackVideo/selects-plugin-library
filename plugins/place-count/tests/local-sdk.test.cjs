const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../panel.tsx'), 'utf8');
const helpers = source.slice(source.indexOf('const VERSION='), source.indexOf('async function readFrames'));
const validate = source.slice(source.indexOf('async function validateFootageFolder'), source.indexOf('function locationsFromPaths'));
const offline = source.slice(source.indexOf('async function offlineSources'), source.indexOf('// ---- Template run'));

test('folder validation, atomic writes and offline checks use asynchronous SDK files', async () => {
  const events = [];
  const files = {
    homedir:()=>'/home', join:path.join, dirname:path.dirname,
    mkdir:async()=>{await Promise.resolve();events.push('mkdir');},
    writeFile:async()=>{await Promise.resolve();events.push('write');},
    rename:async()=>{await Promise.resolve();events.push('rename');},
    readFile:async()=>new Uint8Array(), pathToLocalURL:async p=>'local:'+p,
    exists:async p=>p.endsWith('present.mp4'),
    readdir:async()=>['present.mp4','notes.txt'],
    stat:async p=>({isDirectory:p==='/footage',mode:0,mtimeMs:1}),
  };
  const ctx=vm.createContext({sdk:{files},window:{parent:{get __DI__(){throw Error('Must use SDK');}}},TextEncoder,TextDecoder,setTimeout,clearTimeout});
  vm.runInContext(helpers+'\n'+validate+'\n'+offline+'\nlocalSdk=sdk;',ctx);
  await ctx.validateFootageFolder('/footage');
  await assert.rejects(ctx.validateFootageFolder('/footage/present.mp4'), /Choose a folder/);
  await ctx.writeJSON('/cache/state.json',{ready:true});
  assert.deepEqual(events,['mkdir','write','rename']);
  assert.equal(await ctx.offlineSources({places:[{included:true,picks:[{path:'missing.mp4'}]}]}),true);
  assert.equal(await ctx.offlineSources({places:[{included:true,picks:[{path:'present.mp4'}]}]}),false);
});
