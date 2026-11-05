'use strict';

// The ORT WebGPU RVM session contract shared by Mac Dawn (lib/webgpu-matte.cjs)
// and the browser (web/runtime.source.mjs): session options and the GPU-side
// first-frame validation. Uses only WebGPU globals, so a browser Worker can run it.
const { GRAPH_OPTIMIZATION_LEVEL } = require('./rvm-conv-padding.cjs');

const RVM_INPUTS = Object.freeze(['src', 'r1i', 'r2i', 'r3i', 'r4i', 'downsample_ratio']);

/** Requested outputs stay on GPU; recurrent state is fed back without readback. */
function rvmSessionOptions(device, outputs) {
  return {
    executionProviders: [{ name: 'webgpu', device }], graphOptimizationLevel: GRAPH_OPTIMIZATION_LEVEL,
    preferredOutputLocation: Object.fromEntries(outputs.map(name => [name, 'gpu-buffer'])), logSeverityLevel: 3,
  };
}

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

module.exports = { RVM_INPUTS, rvmSessionOptions, validateGpuFirstResult, tensorElements, dispatchShape };
