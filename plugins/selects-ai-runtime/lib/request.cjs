'use strict';
const path = require('node:path');
const TASKS = new Set(['faces.detect', 'person.matte']);
function validateRequest(request) {
  if (!request || request.contractVersion !== 1 || !TASKS.has(request.task)) throw new Error('Unsupported AI request contract/task');
  const input = request.input;
  if (!input || typeof input.source?.path !== 'string' || !path.isAbsolute(input.source.path)) throw new Error('PoC host must resolve source to an absolute local file path');
  const range = input.sourceRange;
  if (!range || !Number.isFinite(range.startSeconds) || !Number.isFinite(range.endSeconds) || range.startSeconds < 0 || range.endSeconds <= range.startSeconds) throw new Error('Expected a nonempty half-open source range [startSeconds, endSeconds)');
  if (input.outputMode !== undefined && (request.task !== 'person.matte' || !['alpha-frames', 'foreground-video'].includes(input.outputMode))) throw new Error('outputMode is supported only for person.matte and must be alpha-frames or foreground-video');
  if (input.alphaEncoding !== undefined && (request.task !== 'person.matte' || !['grayscale-png-8bit', 'grayscale-avif-8bit'].includes(input.alphaEncoding))) throw new Error('alphaEncoding is supported only for person.matte and must be grayscale-png-8bit or grayscale-avif-8bit');
  if (request.task === 'faces.detect') {
    const sampleEvery = input.sampleEverySeconds ?? 0.5;
    const threshold = input.scoreThreshold ?? 0.8;
    if (!Number.isFinite(sampleEvery) || sampleEvery <= 0) throw new Error('sampleEverySeconds must be positive');
    if (!Number.isFinite(threshold) || threshold < 0 || threshold > 1) throw new Error('scoreThreshold must be in [0, 1]');
  } else {
    const ratio = input.downsampleRatio ?? 0.25;
    if (!Number.isFinite(ratio) || ratio <= 0 || ratio > 1) throw new Error('downsampleRatio must be in (0, 1]');
  }
  return request;
}
module.exports = { validateRequest };
