'use strict';
const {availableParallelism} = require('node:os');

// Matched CPU runs validate 4 -> 8 on Apple Silicon. Reserve at least four
// logical CPUs for decoding/the editor, retain the existing setting elsewhere.
// Do not select arbitrary counts: 1/2 changed floating-point speaker scores.
function speakerCpuThreads({platform=process.platform,arch=process.arch,parallelism=availableParallelism()}={}) {
  return platform==='darwin' && arch==='arm64' && parallelism>=12 ? 8 : 4;
}
// Main owns job slots; the runtime owns model thread counts. Two workers share
// the same eight-thread budget rather than each creating eight model threads.
function speakerSessionThreads(config) {
  if (config.hostSpeakerProfile !== undefined) {
    const profiles={'single-4':4,'single-8':8,'paired-4':4};
    if (!Object.hasOwn(profiles,config.hostSpeakerProfile)) throw new Error('Unknown host speaker execution profile');
    return profiles[config.hostSpeakerProfile];
  }
  const threads=config.intraOpNumThreads??4;
  return config.hostConcurrency===2 ? Math.min(threads,4) : threads;
}
module.exports = {speakerCpuThreads,speakerSessionThreads};
