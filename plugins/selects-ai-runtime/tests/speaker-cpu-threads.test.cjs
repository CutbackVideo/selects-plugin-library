'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {speakerCpuThreads,speakerSessionThreads} = require('../lib/speaker-cpu-threads.cjs');

test('speaker CPU tuning stays within the validated platform and leaves editor headroom',()=>{
  for (const [platform,arch,parallelism,expected] of [
    ['darwin','arm64',12,8],['darwin','arm64',16,8],
    ['darwin','arm64',8,4],['darwin','arm64',10,4],
    ['darwin','x64',16,4],['win32','x64',16,4],['linux','arm64',16,4],
  ]) assert.equal(speakerCpuThreads({platform,arch,parallelism}),expected);
});
test('two host slots share a bounded model thread budget without mutating preparation',()=>{
  const config={intraOpNumThreads:8,hostConcurrency:2};
  assert.equal(speakerSessionThreads(config),4);
  assert.deepEqual(config,{intraOpNumThreads:8,hostConcurrency:2});
  assert.equal(speakerSessionThreads({intraOpNumThreads:8}),8);
  assert.equal(speakerSessionThreads({intraOpNumThreads:4,hostConcurrency:2}),4);
  assert.equal(speakerSessionThreads({intraOpNumThreads:2,hostConcurrency:2}),2);
  assert.equal(speakerSessionThreads({hostConcurrency:2}),4);
});
test('explicit qualified profiles override preparation defaults and reject unknown profiles',()=>{
  for (const [profile,threads] of [['single-4',4],['single-8',8],['paired-4',4]]) {
    assert.equal(speakerSessionThreads({intraOpNumThreads:8,hostSpeakerProfile:profile}),threads);
    assert.equal(speakerSessionThreads({intraOpNumThreads:4,hostSpeakerProfile:profile}),threads);
  }
  for (const profile of ['single-2','toString',null,1])
    assert.throws(()=>speakerSessionThreads({hostSpeakerProfile:profile}),/Unknown host speaker/);
});
