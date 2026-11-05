'use strict';
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { performance } = require('node:perf_hooks');
const { deriveRvmWebGpuModel } = require('./rvm-webgpu-model.cjs');
const { throwIfAborted } = require('./errors.cjs');
const { disposeResult } = require('./matte-provider.cjs');
const { validateGpuFirstResult, tensorElements, dispatchShape, rvmSessionOptions, RVM_INPUTS } = require('./webgpu-rvm-session.cjs');

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
    session = await ort.InferenceSession.create(derived.bytes, rvmSessionOptions(device, outputs));
    if (!RVM_INPUTS.every(n => session.inputNames.includes(n))
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
