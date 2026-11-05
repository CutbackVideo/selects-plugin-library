'use strict';

// Transform 'rvm-conv-pad4-v1' on the ONNX wire format, for hosts without
// Node or protobufjs (the web runtime). It writes the same bytes as
// lib/rvm-webgpu-model.cjs: ORT WebGPU needs Conv input channels in multiples
// of four, so five RVM Conv inputs and weights are zero-padded on that axis.
const {
  readFields, encodeFields, bytesField, varintField, packedVarintField, varintValue, varintValues, canonicalOnnxModel,
} = require('./onnx-wire.cjs');

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

const utf8 = new TextDecoder('utf-8', { fatal: true }), toUtf8 = new TextEncoder();
const text = (field) => field && utf8.decode(field.data);
const last = (fields, number) => fields.findLast((field) => field.number === number);
const all = (fields, number) => fields.filter((field) => field.number === number);

function readNode(field) {
  const fields = readFields(field.data);
  const groups = all(fields, 5).map((attribute) => readFields(attribute.data))
    .filter((attribute) => text(last(attribute, 1)) === 'group')
    .map((attribute) => last(attribute, 3) && varintValue(last(attribute, 3)));
  return {
    fields, name: text(last(fields, 3)), opType: text(last(fields, 4)), domain: text(last(fields, 7)),
    input: all(fields, 1).map(text), output: all(fields, 2).map(text), groups,
  };
}

function readTensor(field) {
  const fields = readFields(field.data);
  const dataType = last(fields, 2);
  return {
    fields, name: text(last(fields, 8)), dataType: dataType ? varintValue(dataType) : 0,
    dims: varintValues(fields, 1), rawData: last(fields, 9)?.data,
    hasFloatData: all(fields, 4).some((entry) => entry.data.length), hasExternalData: all(fields, 13).length > 0,
  };
}

/** Derived model bytes, identical to the desktop protobufjs transform of the same original. */
function padRvmModelBytes(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.length !== ORIGINAL_RVM_BYTES) {
    throw new Error('The RVM WebGPU transform requires the original pinned model bytes.');
  }
  const modelFields = readFields(bytes);
  const graphField = last(modelFields, 7);
  if (!graphField) throw new Error('Expected an ONNX model graph.');
  const graphFields = readFields(graphField.data);
  const nodes = new Map(), initializers = new Map(), names = new Set();
  for (const field of all(graphFields, 1)) {
    const node = readNode(field);
    if (node.name && nodes.has(node.name)) throw new Error('Duplicate RVM node name.');
    if (node.name) nodes.set(node.name, { field, node });
    for (const name of [...node.input, ...node.output]) names.add(name);
  }
  for (const field of all(graphFields, 5)) {
    const tensor = readTensor(field);
    if (!tensor.name || initializers.has(tensor.name)) throw new Error('Duplicate or missing RVM initializer name.');
    initializers.set(tensor.name, { field, tensor }); names.add(tensor.name);
  }
  const patches = EXPECTED_CONVS.map((expected) => {
    const { field: nodeField, node } = nodes.get(expected.name) ?? {};
    const { field: weightField, tensor: weight } = initializers.get(expected.weight) ?? {};
    if (node?.opType !== 'Conv' || node.domain || node.input[1] !== expected.weight || !node.input[0]
      || node.groups.length > 1 || (node.groups.length === 1 && node.groups[0] !== 1)
      || weight?.dataType !== 1 || weight.dims.join(',') !== expected.dims.join(',')
      || weight.rawData?.length !== expected.dims.reduce((a, b) => a * b, 4)
      || weight.hasFloatData || weight.hasExternalData) {
      throw new Error('Unexpected RVM WebGPU Conv/weight contract: ' + expected.name);
    }
    const padName = node.name + '_Pad', padsName = node.name + '_chpad', paddedName = node.input[0] + '_chpad4';
    if (nodes.has(padName) || names.has(padsName) || names.has(paddedName)) {
      throw new Error('RVM graph already contains channel padding or a conflicting name.');
    }
    return { nodeField, node, weightField, weight, padName, padsName, paddedName };
  });

  const replacements = new Map(), padsInitializers = [];
  for (const { nodeField, node, weightField, weight, padName, padsName, paddedName } of patches) {
    const [outputChannels, inputChannels, height, width] = weight.dims;
    const padding = (4 - inputChannels % 4) % 4;
    const oldRowBytes = inputChannels * height * width * 4, newRowBytes = (inputChannels + padding) * height * width * 4;
    const paddedWeights = new Uint8Array(outputChannels * newRowBytes);
    for (let output = 0; output < outputChannels; output++) {
      paddedWeights.set(weight.rawData.subarray(output * oldRowBytes, (output + 1) * oldRowBytes), output * newRowBytes);
    }
    replacements.set(weightField, bytesField(5, encodeFields([
      ...weight.fields.filter((field) => field.number !== 1 && field.number !== 9),
      packedVarintField(1, [outputChannels, inputChannels + padding, height, width]),
      bytesField(9, paddedWeights),
    ])));
    // ONNX Pad uses int64 [begin N,C,H,W, end N,C,H,W]; only end C is nonzero.
    const pads = new Uint8Array(8 * 8);
    pads[5 * 8] = padding;
    padsInitializers.push(bytesField(5, encodeFields([
      packedVarintField(1, [8]), varintField(2, 7), bytesField(8, toUtf8.encode(padsName)), bytesField(9, pads),
    ])));
    const padNode = bytesField(1, encodeFields([
      bytesField(1, toUtf8.encode(node.input[0])), bytesField(1, toUtf8.encode(padsName)),
      bytesField(2, toUtf8.encode(paddedName)), bytesField(3, toUtf8.encode(padName)), bytesField(4, toUtf8.encode('Pad')),
      bytesField(5, encodeFields([bytesField(1, toUtf8.encode('mode')), bytesField(4, toUtf8.encode('constant')), varintField(20, 3)])),
    ]));
    let firstInput = true;
    const conv = bytesField(1, encodeFields(node.fields.map((field) => {
      if (field.number !== 1 || !firstInput) return field;
      firstInput = false;
      return bytesField(1, toUtf8.encode(paddedName));
    })));
    replacements.set(nodeField, [padNode, conv]);
  }
  const graph = encodeFields([...graphFields.flatMap((field) => replacements.get(field) ?? field), ...padsInitializers]);
  const derived = canonicalOnnxModel(encodeFields(modelFields.map((field) => (field === graphField ? bytesField(7, graph) : field))));
  if (derived.length < bytes.length || derived.length > bytes.length + 64 * 1024) {
    throw new Error('Unexpected derived RVM model size.');
  }
  return derived;
}

module.exports = { padRvmModelBytes, EXPECTED_CONVS, ORIGINAL_RVM_BYTES, TRANSFORM_VERSION, GRAPH_OPTIMIZATION_LEVEL };
