'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { readFields, encodeFields, bytesField, varintField, canonicalOnnxModel } = require('../lib/onnx-wire.cjs');
const { padRvmModelBytes } = require('../lib/rvm-conv-padding.cjs');

const text = (value) => new TextEncoder().encode(value);

test('canonical ONNX encoding sorts fields, packs repeated numbers and refuses dropped fields', () => {
  // A graph whose initializer lists unpacked dims after its name, then two nodes.
  const tensor = encodeFields([bytesField(8, text('w')), varintField(1, 2), varintField(1, 300), varintField(2, 1)]);
  const node = (name) => bytesField(1, encodeFields([bytesField(3, text(name)), bytesField(1, text('x'))]));
  const graph = encodeFields([bytesField(5, tensor), node('a'), bytesField(2, text('g')), node('b')]);
  const model = canonicalOnnxModel(encodeFields([bytesField(7, graph), varintField(1, 7)]));

  const [irVersion, graphField] = readFields(model);
  assert.deepEqual([irVersion.number, graphField.number], [1, 7]);
  const fields = readFields(graphField.data);
  assert.deepEqual(fields.map((field) => field.number), [1, 1, 2, 5]);
  assert.deepEqual(fields.slice(0, 2).map((field) => readFields(field.data).map((entry) => entry.number)), [[1, 3], [1, 3]]);
  assert.equal(new TextDecoder().decode(readFields(fields[1].data)[1].data), 'b');
  // dims become one packed record: 2 and the two-byte varint 300.
  assert.deepEqual(readFields(fields[3].data).map(({ number, wireType, data }) => [number, wireType, [...data]]),
    [[1, 2, [2, 172, 2]], [2, 0, [1]], [8, 2, [...text('w')]]]);

  assert.throws(() => canonicalOnnxModel(encodeFields([bytesField(20, new Uint8Array(0))])), /Unsupported ONNX Model field 20/);
  assert.throws(() => canonicalOnnxModel(encodeFields([varintField(7, 1)])), /wire type/);
  assert.throws(() => canonicalOnnxModel(Uint8Array.of(8)), /Truncated/);
});

const modelPath = process.env.RVM_MODEL;
test('the wire transform derives the desktop WebGPU model bytes from the pinned original', { skip: !modelPath && 'Set RVM_MODEL to the original rvm_mobilenetv3_fp32.onnx' }, () => {
  const original = fs.readFileSync(modelPath);
  const derived = padRvmModelBytes(new Uint8Array(original));
  // SHA-256 of lib/rvm-webgpu-model.cjs's protobufjs output for the same original.
  assert.equal(crypto.createHash('sha256').update(derived).digest('hex'), '424978d0ec0aada0037344adfac6d562a5f459c61843fc671c8d54fd8b906df6');
  const ortWebModule = process.env.AI_RUNTIME_ORT_WEB_MODULE;
  if (ortWebModule) {
    const { transformPinnedRvmModelBytes } = require('../lib/rvm-webgpu-model.cjs');
    const schema = require(path.join(ortWebModule, 'lib/onnxjs/ort-schema/protobuf/onnx.js')).onnx;
    assert.deepEqual(Buffer.from(derived), transformPinnedRvmModelBytes(original, { schema }).bytes);
  }
  assert.throws(() => padRvmModelBytes(derived), /original pinned model bytes/);
});
