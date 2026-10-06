'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

const ORIGINAL_RVM_SHA256 = '88d4531297118f595bf2fd60f6f566aec2e559393802d1f436c380f0cbbd2828';
const ORIGINAL_RVM_BYTES = 14975696;
const TRANSFORM_VERSION = 'rvm-conv-pad4-v1';
const GRAPH_OPTIMIZATION_LEVEL = 'basic';
const EXPECTED_CONVS = Object.freeze([
  { name: 'Conv_8', weight: '824', dims: [16, 3, 3, 3] },
  { name: 'Conv_200', weight: '965', dims: [80, 171, 3, 3] },
  { name: 'Conv_230', weight: '968', dims: [40, 107, 3, 3] },
  { name: 'Conv_260', weight: '971', dims: [32, 59, 3, 3] },
  { name: 'Conv_290', weight: '974', dims: [16, 35, 3, 3] },
]);

function sha256(bytes) { return crypto.createHash('sha256').update(bytes).digest('hex'); }

function loadSchema(ortWebModule) {
  if (typeof ortWebModule !== 'string' || !path.isAbsolute(ortWebModule)) {
    throw new Error('Expected an absolute pinned onnxruntime-web package directory.');
  }
  if (require(path.join(ortWebModule, 'package.json')).version !== '1.30.0') {
    throw new Error('The RVM WebGPU transform requires onnxruntime-web 1.30.0.');
  }
  return require(path.join(ortWebModule, 'lib/onnxjs/ort-schema/protobuf/onnx.js')).onnx;
}

/** Mutates a decoded graph only after validating every patch site. */
function padRvmGraph(model) {
  const graph = model?.graph;
  if (!graph || !Array.isArray(graph.node) || !Array.isArray(graph.initializer)) {
    throw new Error('Expected an ONNX model graph.');
  }
  const nodes = new Map(), initializers = new Map(), names = new Set();
  for (const node of graph.node) {
    if (node.name && nodes.has(node.name)) throw new Error('Duplicate RVM node name.');
    if (node.name) nodes.set(node.name, node);
    for (const name of [...(node.input ?? []), ...(node.output ?? [])]) names.add(name);
  }
  for (const tensor of graph.initializer) {
    if (!tensor.name || initializers.has(tensor.name)) throw new Error('Duplicate or missing RVM initializer name.');
    initializers.set(tensor.name, tensor); names.add(tensor.name);
  }
  const patches = EXPECTED_CONVS.map(expected => {
    const node = nodes.get(expected.name), weight = initializers.get(expected.weight);
    const dims = weight?.dims?.map(Number);
    const groups = node?.attribute?.filter(attribute => attribute.name === 'group') ?? [];
    if (node?.opType !== 'Conv' || (node.domain && node.domain !== '')
      || node.input?.[1] !== expected.weight || !node.input?.[0]
      || groups.length > 1 || (groups.length === 1 && Number(groups[0].i) !== 1)
      || weight?.dataType !== 1 || dims?.join(',') !== expected.dims.join(',')
      || !(weight.rawData instanceof Uint8Array)
      || weight.rawData.length !== expected.dims.reduce((a, b) => a * b, 4)
      || (weight.floatData?.length ?? 0) > 0 || weight.externalData?.length) {
      throw new Error('Unexpected RVM WebGPU Conv/weight contract: ' + expected.name);
    }
    const padName = node.name + '_Pad', padsName = node.name + '_chpad', paddedName = node.input[0] + '_chpad4';
    if (nodes.has(padName) || names.has(padsName) || names.has(paddedName)) {
      throw new Error('RVM graph already contains channel padding or a conflicting name.');
    }
    return { node, weight, dims, padName, padsName, paddedName };
  });
  const replacementNodes = new Map();
  for (const { node, weight, dims, padName, padsName, paddedName } of patches) {
    const [outputChannels, inputChannels, height, width] = dims;
    const padding = (4 - inputChannels % 4) % 4;
    const oldRowBytes = inputChannels * height * width * 4;
    const newRowBytes = (inputChannels + padding) * height * width * 4;
    const paddedWeights = Buffer.alloc(outputChannels * newRowBytes);
    for (let output = 0; output < outputChannels; output++) {
      paddedWeights.set(weight.rawData.subarray(output * oldRowBytes, (output + 1) * oldRowBytes), output * newRowBytes);
    }
    weight.dims[1] = inputChannels + padding;
    weight.rawData = paddedWeights;
    // ONNX Pad uses [begin N,C,H,W, end N,C,H,W]. Only end C changes.
    const pads = Buffer.alloc(8 * 8);
    pads.writeBigInt64LE(BigInt(padding), 5 * 8);
    graph.initializer.push({ name: padsName, dataType: 7, dims: [8], rawData: pads });
    replacementNodes.set(node, {
      name: padName, opType: 'Pad', input: [node.input[0], padsName], output: [paddedName],
      attribute: [{ name: 'mode', type: 3, s: Buffer.from('constant') }],
    });
    node.input[0] = paddedName;
  }
  graph.node = graph.node.flatMap(node => replacementNodes.has(node) ? [replacementNodes.get(node), node] : [node]);
  return model;
}

function transformPinnedRvmModelBytes(bytes, { schema } = {}) {
  if (!(bytes instanceof Uint8Array) || bytes.length !== ORIGINAL_RVM_BYTES || sha256(bytes) !== ORIGINAL_RVM_SHA256) {
    throw new Error('The RVM WebGPU transform requires the original pinned model bytes.');
  }
  if (!schema?.ModelProto?.decode || !schema?.ModelProto?.encode || !schema?.ModelProto?.verify) {
    throw new Error('Expected the pinned ONNX protobuf codec.');
  }
  const model = padRvmGraph(schema.ModelProto.decode(bytes));
  const validation = schema.ModelProto.verify(model);
  if (validation) throw new Error('Invalid derived RVM protobuf: ' + validation);
  const derived = Buffer.from(schema.ModelProto.encode(model).finish());
  if (derived.length < bytes.length || derived.length > bytes.length + 64 * 1024) {
    throw new Error('Unexpected derived RVM model size.');
  }
  return {
    bytes: derived, sha256: sha256(derived), originalSha256: ORIGINAL_RVM_SHA256,
    transformVersion: TRANSFORM_VERSION, graphOptimizationLevel: GRAPH_OPTIMIZATION_LEVEL,
  };
}

async function deriveRvmWebGpuModel({ model, ortWebModule, schema }) {
  if (!model || typeof model.path !== 'string' || model.sha256 !== ORIGINAL_RVM_SHA256) {
    throw new Error('Expected the original pinned RVM model path and SHA-256.');
  }
  if ((await fs.stat(model.path)).size !== ORIGINAL_RVM_BYTES) throw new Error('Unexpected original RVM model size.');
  return transformPinnedRvmModelBytes(await fs.readFile(model.path), { schema: schema ?? loadSchema(ortWebModule) });
}

module.exports = {
  deriveRvmWebGpuModel, transformPinnedRvmModelBytes, padRvmGraph,
  ORIGINAL_RVM_SHA256, TRANSFORM_VERSION, GRAPH_OPTIMIZATION_LEVEL,
};
