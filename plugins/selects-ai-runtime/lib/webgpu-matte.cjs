'use strict';
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { performance } = require('node:perf_hooks');
const { deriveRvmWebGpuModel } = require('./rvm-webgpu-model.cjs');
const { throwIfAborted } = require('./errors.cjs');
const { disposeResult } = require('./matte-provider.cjs');

const RGB_SHADER = `
@group(0) @binding(0) var<storage, read> packed: array<u32>;
@group(0) @binding(1) var<storage, read_write> planar: array<f32>;
fn byteAt(i: u32) -> f32 { return f32((packed[i / 4u] >> ((i % 4u) * 8u)) & 255u); }
@compute @workgroup_size(256) fn main(@builtin(global_invocation_id) id: vec3<u32>, @builtin(num_workgroups) groups: vec3<u32>) {
  let pixels = arrayLength(&planar) / 3u; let p = id.x + id.y * groups.x * 256u;
  if (p >= pixels) { return; }
  planar[p] = byteAt(p * 3u) / 255.0;
  planar[pixels + p] = byteAt(p * 3u + 1u) / 255.0;
  planar[2u * pixels + p] = byteAt(p * 3u + 2u) / 255.0;
}`;
const FINITE_SHADER = `
@group(0) @binding(0) var<storage, read> values: array<f32>;
@group(0) @binding(1) var<storage, read_write> invalid: atomic<u32>;
@compute @workgroup_size(256) fn main(@builtin(global_invocation_id) id: vec3<u32>, @builtin(num_workgroups) groups: vec3<u32>) {
  let p = id.x + id.y * groups.x * 256u; if (p >= arrayLength(&values)) { return; }
  let bits = bitcast<u32>(values[p]);
  if ((bits & 0x7f800000u) == 0x7f800000u) { atomicStore(&invalid, 1u); }
}`;

function tensorElements(tensor, fixedDims) {
  const dims = tensor?.dims;
  if (tensor?.type !== 'float32' || tensor.location !== 'gpu-buffer' || !Array.isArray(dims)
    || dims.length !== 4 || dims[0] !== 1 || dims.some(n => !Number.isSafeInteger(n) || n < 1)
    || fixedDims && dims.join(',') !== fixedDims.join(',')) throw new Error('WebGPU output violates its GPU tensor contract.');
  const count = dims.reduce((a, b) => a * b, 1);
  if (!Number.isSafeInteger(count) || count * 4 > tensor.gpuBuffer.size) throw new Error('WebGPU output buffer is smaller than its shape.');
  return count;
}

function dispatchShape(count, limit) {
  if (!Number.isSafeInteger(count) || count < 1 || !Number.isSafeInteger(limit) || limit < 1) throw new Error('Invalid GPU dispatch size.');
  const groups = Math.ceil(count / 256), x = Math.min(groups, limit), y = Math.ceil(groups / x);
  if (y > limit) throw new Error('Tensor exceeds the GPU dispatch limit.');
  return [x, y];
}

/** Finite validation reads one flag, preserving every recurrent tensor on GPU. */
async function validateGpuFirstResult(device, result, width, height, wantsForeground) {
  const names = ['pha', 'r1o', 'r2o', 'r3o', 'r4o', ...(wantsForeground ? ['fgr'] : [])];
  const counts = names.map(name => tensorElements(result?.[name], name === 'pha' ? [1, 1, height, width]
    : name === 'fgr' ? [1, 3, height, width] : null));
  const flag = device.createBuffer({ size: 4, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST });
  const readback = device.createBuffer({ size: 4, usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST });
  try {
    device.queue.writeBuffer(flag, 0, new Uint32Array([0]));
    const pipeline = device.createComputePipeline({ layout: 'auto', compute: { module: device.createShaderModule({ code: FINITE_SHADER }), entryPoint: 'main' } });
    const encoder = device.createCommandEncoder();
    for (let i = 0; i < names.length; i++) {
      const pass = encoder.beginComputePass(); pass.setPipeline(pipeline);
      pass.setBindGroup(0, device.createBindGroup({ layout: pipeline.getBindGroupLayout(0), entries: [
        { binding: 0, resource: { buffer: result[names[i]].gpuBuffer, size: counts[i] * 4 } },
        { binding: 1, resource: { buffer: flag } },
      ] }));
      pass.dispatchWorkgroups(...dispatchShape(counts[i], device.limits.maxComputeWorkgroupsPerDimension)); pass.end();
    }
    encoder.copyBufferToBuffer(flag, 0, readback, 0, 4); device.queue.submit([encoder.finish()]);
    await readback.mapAsync(GPUMapMode.READ);
    if (new Uint32Array(readback.getMappedRange())[0] !== 0) throw new Error('WebGPU first-frame output contains a non-finite value.');
    readback.unmap();
  } finally { readback.destroy(); flag.destroy(); }
}

async function createWebGpuMatte({ config, model, width, height, downsampleRatio, wantsForeground, signal }) {
  if (process.versions.electron) throw new Error('Dawn requires the plugin-owned standalone Node runtime.');
  const settings = config.webgpu;
  if (!settings?.ortWebModule || !settings?.dawnModule) throw new Error('WebGPU dependencies are not prepared.');
  if (require(path.join(settings.ortWebModule, 'package.json')).version !== '1.30.0') throw new Error('Unexpected WebGPU ORT version.');
  const began = performance.now();
  let gpu, device, session, source, ratio, rgbBuffer, sourceBuffer, gpuError;
  try {
    const dawn = await import(pathToFileURL(settings.dawnModule).href);
    Object.assign(globalThis, dawn.globals);
    gpu = dawn.create(['backend=metal']);
    Object.defineProperty(globalThis.navigator, 'gpu', { value: gpu, configurable: true });
    const adapter = await gpu.requestAdapter({ powerPreference: 'high-performance' });
    if (!adapter || adapter.info.isFallbackAdapter || adapter.info.vendor !== 'apple') throw new Error('A hardware Apple Metal adapter is required.');
    device = await adapter.requestDevice({ requiredLimits: {
      maxStorageBufferBindingSize: adapter.limits.maxStorageBufferBindingSize, maxBufferSize: adapter.limits.maxBufferSize,
    } });
    device.addEventListener('uncapturederror', event => { gpuError ??= event.error; });
    device.lost.then(info => { if (info.reason !== 'destroyed') gpuError ??= new Error('WebGPU device lost: ' + info.message); });
    const pixels = width * height, inputBytes = pixels * 3 * 4;
    if (inputBytes > device.limits.maxStorageBufferBindingSize) throw new Error('Source frame exceeds the WebGPU storage limit.');
    const derived = await deriveRvmWebGpuModel({ model, ortWebModule: settings.ortWebModule });
    throwIfAborted(signal);
    const ort = require(path.join(settings.ortWebModule, 'dist/ort.webgpu.min.js'));
    ort.env.wasm.numThreads = 1; ort.env.logLevel = 'error';
    ort.env.wasm.wasmPaths = pathToFileURL(path.join(settings.ortWebModule, 'dist') + path.sep).href;
    const outputs = ['pha', 'r1o', 'r2o', 'r3o', 'r4o', ...(wantsForeground ? ['fgr'] : [])];
    session = await ort.InferenceSession.create(derived.bytes, {
      executionProviders: [{ name: 'webgpu', device }], graphOptimizationLevel: derived.graphOptimizationLevel,
      preferredOutputLocation: Object.fromEntries(outputs.map(name => [name, 'gpu-buffer'])), logSeverityLevel: 3,
    });
    if (!['src', 'r1i', 'r2i', 'r3i', 'r4i', 'downsample_ratio'].every(n => session.inputNames.includes(n))
      || !outputs.every(n => session.outputNames.includes(n))) throw new Error('Unexpected WebGPU RVM model inputs or outputs.');
    sourceBuffer = device.createBuffer({ size: inputBytes, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST });
    rgbBuffer = device.createBuffer({ size: Math.ceil(pixels * 3 / 4) * 4, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
    const pipeline = device.createComputePipeline({ layout: 'auto', compute: { module: device.createShaderModule({ code: RGB_SHADER }), entryPoint: 'main' } });
    const bindGroup = device.createBindGroup({ layout: pipeline.getBindGroupLayout(0), entries: [
      { binding: 0, resource: { buffer: rgbBuffer } }, { binding: 1, resource: { buffer: sourceBuffer } },
    ] });
    source = ort.Tensor.fromGpuBuffer(sourceBuffer, { dataType: 'float32', dims: [1, 3, height, width] });
    ratio = new ort.Tensor('float32', new Float32Array([downsampleRatio]), [1]);
    const adapterInfo = Object.fromEntries(['vendor', 'architecture', 'device', 'description', 'isFallbackAdapter'].map(k => [k, adapter.info[k]]));
    const createMilliseconds = performance.now() - began;
    let preprocessMilliseconds = 0, lastInferenceMilliseconds = 0;
    async function release() {
      source?.dispose(); ratio?.dispose(); rgbBuffer?.destroy(); sourceBuffer?.destroy();
      try { await session?.release(); } finally { device?.destroy(); delete globalThis.navigator.gpu; gpu = null; }
    }
    return {
      session, createMilliseconds, adapterInfo,
      derivedModel: { sha256: derived.sha256, originalSha256: derived.originalSha256, transformVersion: derived.transformVersion, graphOptimizationLevel: derived.graphOptimizationLevel },
      get preprocessMilliseconds() { return preprocessMilliseconds; },
      get lastInferenceMilliseconds() { return lastInferenceMilliseconds; },
      async run(rgb, rec) {
        throwIfAborted(signal); if (gpuError) throw gpuError;
        if (!Buffer.isBuffer(rgb) || rgb.length !== pixels * 3) throw new Error('WebGPU requires a full RGB24 display frame.');
        const t = performance.now();
        const upload = rgb.length % 4 ? Buffer.concat([rgb, Buffer.alloc(4 - rgb.length % 4)]) : rgb;
        device.queue.writeBuffer(rgbBuffer, 0, upload);
        const encoder = device.createCommandEncoder(), pass = encoder.beginComputePass();
        pass.setPipeline(pipeline); pass.setBindGroup(0, bindGroup);
        pass.dispatchWorkgroups(...dispatchShape(pixels, device.limits.maxComputeWorkgroupsPerDimension)); pass.end();
        device.queue.submit([encoder.finish()]); preprocessMilliseconds += performance.now() - t;
        const initial = !rec ? Array.from({ length: 4 }, () => new ort.Tensor('float32', new Float32Array(1), [1, 1, 1, 1])) : null;
        const state = rec ?? initial;
        let result;
        const inferenceBegan = performance.now();
        try {
          result = await session.run({ src: source, r1i: state[0], r2i: state[1], r3i: state[2], r4i: state[3], downsample_ratio: ratio }, outputs);
          // GPU-resident outputs alone do not mean submitted work has finished.
          await device.queue.onSubmittedWorkDone();
          lastInferenceMilliseconds = performance.now() - inferenceBegan;
          if (gpuError) throw gpuError; throwIfAborted(signal);
          return result;
        } catch (error) {
          disposeResult(result); throw error;
        } finally { for (const tensor of initial ?? []) tensor.dispose(); }
      },
      async validateFirst(result) {
        await validateGpuFirstResult(device, result, width, height, wantsForeground);
        if (gpuError) throw gpuError; throwIfAborted(signal);
      },
      release,
    };
  } catch (error) {
    source?.dispose(); ratio?.dispose(); rgbBuffer?.destroy(); sourceBuffer?.destroy();
    try { await session?.release(); } finally { device?.destroy(); if (gpu) delete globalThis.navigator.gpu; gpu = null; }
    throw error;
  }
}

module.exports = { createWebGpuMatte, validateGpuFirstResult, tensorElements, dispatchShape, RGB_SHADER };
