import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {topLevel} from './windows_host.mjs';

const source = fs.readFileSync(new URL('../plugins/multicam-generator/panel.tsx', import.meta.url), 'utf8').replace(/ as any/g, '');
const names = ['safeDetail', 'referenceTimes', 'writeLocalDiagnostic', 'prepareMedia', 'prepareSpeech', 'prepareReference', 'buildInspectionSheet'];
const ctx = vm.createContext({
  window: {parent: {get __DI__() {throw Error('Local operations must not access DI');}}},
  TextEncoder, Uint8Array, AbortController, setTimeout, clearTimeout, btoa,
});
vm.runInContext(names.map(name => topLevel(source, name)).join('\n'), ctx);
const delayed = async value => {await new Promise(resolve => setImmediate(resolve)); return value;};

function localSdk({existing = false, previous = new Uint8Array()} = {}) {
  const events = [], outputs = new Map();
  const files = {
    join: path.join, dirname: path.dirname, homedir: () => '/user', isAbsolute: path.isAbsolute,
    mkdir: async () => {await delayed(); events.push('mkdir');},
    exists: async () => delayed(existing),
    readFile: async file => {assert(existing || file.endsWith('sheet.jpg')); events.push('read'); return delayed(file.endsWith('sheet.jpg') ? new Uint8Array([1,2,3]) : previous);},
    writeFile: async (file, bytes) => {await delayed(); outputs.set(file, bytes); events.push('write');},
    rename: async () => {await delayed(); events.push('rename');},
  };
  const media = {
    runFFmpeg: async (args, quiet, signal) => {assert(events.includes('mkdir')); assert.equal(quiet, true); assert(signal instanceof AbortSignal); await delayed(); events.push('ffmpeg'); return {stdout:'',stderr:''};},
    runFFprobe: async args => {
      const file = args.at(-1), audio = file.endsWith('.wav');
      const streams = audio ? [{codec_type:'audio',duration:4}] : [{codec_type:'video',duration:4,width:1280,height:720,avg_frame_rate:'24/1',nb_frames:96}];
      if(file === '/source.mp4') streams.push({codec_type:'audio',duration:4});
      return delayed({stdout: JSON.stringify({streams, format:{duration:4,size:1000}}),stderr:''});
    },
  };
  return {files,media,events,outputs};
}

test('diagnostics await file creation, absence checks, append and rotation using SDK only', async () => {
  const empty = localSdk();
  await ctx.writeLocalDiagnostic(empty, {phase:'prepare',cause:'token=secret'});
  assert.deepEqual(empty.events, ['mkdir','write']);
  assert(!new TextDecoder().decode([...empty.outputs.values()][0]).includes('token=secret'));
  const full = localSdk({existing:true,previous:new Uint8Array(1048577)});
  await ctx.writeLocalDiagnostic(full, {phase:'prepare'});
  assert.deepEqual(full.events, ['mkdir','read','rename','write']);
});

test('media helpers await file and FFmpeg operations before returning', async () => {
  const sdk = localSdk(), plan={path:'/source.mp4',sourceStartSeconds:0,durationSeconds:4,fps:24};
  assert.equal(await ctx.prepareSpeech(sdk, plan, '/speech.wav'), '/speech.wav');
  assert.equal(sdk.events.at(-1), 'rename');
  await ctx.prepareMedia(sdk, {path:'/source.mp4',output:'/prepared.mp4',action:'prepare',start:0,duration:4});
  assert.equal(sdk.events.at(-1), 'rename');
  assert.equal(await ctx.prepareReference(sdk, plan, 0, '/reference.jpg'), '/reference.jpg');
  assert.equal(sdk.events.at(-1), 'rename');
  assert.equal((await ctx.buildInspectionSheet(sdk, plan, 'job')).dataUrl, 'data:image/jpeg;base64,AQID');
  assert.equal(sdk.events.at(-1), 'read');
  await assert.rejects(ctx.prepareMedia({}, {}), /Update Selects/);
});
