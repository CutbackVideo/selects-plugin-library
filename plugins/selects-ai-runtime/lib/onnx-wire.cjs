'use strict';

// Protobuf wire format for ONNX models without a protobuf library or Buffer,
// so a browser Worker can edit a model. canonicalOnnxModel() re-encodes a model
// exactly as ORT Web 1.30.0's protobufjs codec (lib/onnxjs/ort-schema/protobuf/
// onnx.js) does after decoding it: fields in field-number order and repeated
// numbers packed. Fields that codec would silently drop are refused instead.

const VARINT = 0, FIXED64 = 1, BYTES = 2, FIXED32 = 5;

// Field kinds: 'varint', 'fixed32', 'bytes' (strings and bytes, copied raw), a
// message type name, or a repeated kind ending in '*'. Repeated numbers are packed.
const SCHEMA = {
  Model: { 1: 'varint', 2: 'bytes', 3: 'bytes', 4: 'bytes', 5: 'varint', 6: 'bytes', 7: 'Graph', 8: 'OperatorSetId*', 14: 'StringStringEntry*' },
  OperatorSetId: { 1: 'bytes', 2: 'varint' },
  StringStringEntry: { 1: 'bytes', 2: 'bytes' },
  Graph: { 1: 'Node*', 2: 'bytes', 5: 'Tensor*', 10: 'bytes', 11: 'ValueInfo*', 12: 'ValueInfo*', 13: 'ValueInfo*' },
  Node: { 1: 'bytes*', 2: 'bytes*', 3: 'bytes', 4: 'bytes', 5: 'Attribute*', 6: 'bytes', 7: 'bytes' },
  Attribute: {
    1: 'bytes', 2: 'fixed32', 3: 'varint', 4: 'bytes', 5: 'Tensor', 6: 'Graph', 7: 'fixed32*', 8: 'varint*',
    9: 'bytes*', 10: 'Tensor*', 11: 'Graph*', 13: 'bytes', 14: 'Type', 15: 'Type*', 20: 'varint', 21: 'bytes',
  },
  Tensor: {
    1: 'varint*', 2: 'varint', 3: 'Segment', 4: 'fixed32*', 5: 'varint*', 6: 'bytes*', 7: 'varint*', 8: 'bytes',
    9: 'bytes', 10: 'fixed64*', 11: 'varint*', 12: 'bytes', 13: 'StringStringEntry*', 14: 'varint',
  },
  Segment: { 1: 'varint', 2: 'varint' },
  ValueInfo: { 1: 'bytes', 2: 'Type', 3: 'bytes' },
  Type: { 1: 'TypeTensor', 6: 'bytes' },
  TypeTensor: { 1: 'varint', 2: 'TensorShape' },
  TensorShape: { 1: 'Dimension*' },
  Dimension: { 1: 'varint', 2: 'bytes', 3: 'bytes' },
};
const WIRE_TYPES = { varint: VARINT, fixed32: FIXED32, fixed64: FIXED64 };

function readVarint(bytes, offset) {
  let value = 0;
  for (let index = 0; index < 10; index++) {
    if (offset + index >= bytes.length) throw new Error('Truncated protobuf varint');
    const byte = bytes[offset + index];
    value += (byte & 127) * 2 ** (7 * index);
    if (byte < 128) return { value, end: offset + index + 1 };
  }
  throw new Error('Invalid protobuf varint');
}

function writeVarint(value) {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error('Expected a non-negative safe integer');
  const bytes = [];
  for (; value >= 128; value = Math.floor(value / 128)) bytes.push(value % 128 + 128);
  bytes.push(value);
  return bytes;
}

/** [{ number, wireType, data }] where data is the raw payload (a varint keeps its encoded bytes). */
function readFields(bytes) {
  const fields = [];
  for (let offset = 0; offset < bytes.length;) {
    const tag = readVarint(bytes, offset);
    const number = Math.floor(tag.value / 8), wireType = tag.value % 8;
    let start = tag.end, end;
    if (wireType === VARINT) end = readVarint(bytes, start).end;
    else if (wireType === FIXED64) end = start + 8;
    else if (wireType === FIXED32) end = start + 4;
    else if (wireType === BYTES) { const length = readVarint(bytes, start); start = length.end; end = start + length.value; }
    else throw new Error('Unsupported protobuf wire type ' + wireType);
    if (number < 1 || end > bytes.length) throw new Error('Truncated protobuf field');
    fields.push({ number, wireType, data: bytes.subarray(start, end) });
    offset = end;
  }
  return fields;
}

function encodeFields(fields) {
  const parts = fields.map(({ number, wireType, data }) => [
    writeVarint(number * 8 + wireType), wireType === BYTES ? writeVarint(data.length) : [], data,
  ]);
  const output = new Uint8Array(parts.reduce((sum, [tag, length, data]) => sum + tag.length + length.length + data.length, 0));
  let offset = 0;
  for (const part of parts) for (const piece of part) { output.set(piece, offset); offset += piece.length; }
  return output;
}

function concat(chunks) {
  const output = new Uint8Array(chunks.reduce((sum, chunk) => sum + chunk.length, 0));
  let offset = 0;
  for (const chunk of chunks) { output.set(chunk, offset); offset += chunk.length; }
  return output;
}

const bytesField = (number, data) => ({ number, wireType: BYTES, data });
const varintField = (number, value) => ({ number, wireType: VARINT, data: Uint8Array.from(writeVarint(value)) });
const packedVarintField = (number, values) => bytesField(number, Uint8Array.from(values.flatMap(writeVarint)));
const varintValue = (field) => readVarint(field.data, 0).value;
/** Values of a repeated varint field, packed or not. */
function varintValues(fields, number) {
  const values = [];
  for (const field of fields) {
    if (field.number !== number) continue;
    if (field.wireType === VARINT) { values.push(varintValue(field)); continue; }
    for (let offset = 0; offset < field.data.length;) {
      const { value, end } = readVarint(field.data, offset);
      values.push(value); offset = end;
    }
  }
  return values;
}

function canonicalMessage(type, payload) {
  const schema = SCHEMA[type];
  const fields = [], packed = new Map(), seen = new Set();
  for (const field of readFields(payload)) {
    const kind = schema[field.number];
    if (!kind) throw new Error(`Unsupported ONNX ${type} field ${field.number}`);
    const repeated = kind.endsWith('*'), base = repeated ? kind.slice(0, -1) : kind;
    if (!repeated && seen.has(field.number)) throw new Error(`Repeated singular ONNX ${type} field ${field.number}`);
    seen.add(field.number);
    const numberWire = WIRE_TYPES[base];
    if (repeated && numberWire !== undefined) {
      if (field.wireType !== numberWire && field.wireType !== BYTES) throw new Error(`Unexpected ONNX ${type} field ${field.number} wire type`);
      if (!packed.has(field.number)) packed.set(field.number, []);
      packed.get(field.number).push(field.data);
      continue;
    }
    if (field.wireType !== (numberWire ?? BYTES)) throw new Error(`Unexpected ONNX ${type} field ${field.number} wire type`);
    fields.push(SCHEMA[base] ? bytesField(field.number, canonicalMessage(base, field.data)) : field);
  }
  for (const [number, chunks] of packed) {
    const data = concat(chunks);
    if (data.length) fields.push(bytesField(number, data));
  }
  // Array.prototype.sort is stable, so repeated fields keep their order.
  return encodeFields(fields.sort((a, b) => a.number - b.number));
}

const canonicalOnnxModel = (bytes) => canonicalMessage('Model', bytes);

module.exports = {
  readFields, encodeFields, bytesField, varintField, packedVarintField, varintValue, varintValues, canonicalOnnxModel,
};
