'use strict';

// Pure faces.detect request rules shared by the desktop worker and the web
// runtime (web/runtime.mjs embeds this file verbatim). Keep it free of module
// loading so the web build can inline it.
const EPSILON_SECONDS = 1e-7;

function faceParameters(request) {
  const input = request.input;
  const range = input?.sourceRange;
  const sampleEverySeconds = input?.sampleEverySeconds ?? 0.5;
  const scoreThreshold = input?.scoreThreshold ?? 0.8;
  if (input?.source?.kind === 'image') {
    if (range !== undefined || input.sampleEverySeconds !== undefined) throw new Error('Image input cannot have sourceRange or video sampling options');
    if (!Number.isFinite(scoreThreshold) || scoreThreshold < 0 || scoreThreshold > 1) throw new Error('scoreThreshold must be in [0, 1]');
    return { scoreThreshold };
  }
  if (!range || !Number.isFinite(range.startSeconds) || !Number.isFinite(range.endSeconds)
    || range.startSeconds < 0 || range.endSeconds <= range.startSeconds) {
    throw new Error('Expected nonempty sourceRange [startSeconds, endSeconds)');
  }
  if (!Number.isFinite(sampleEverySeconds) || sampleEverySeconds <= 0) throw new Error('sampleEverySeconds must be positive');
  if (!Number.isFinite(scoreThreshold) || scoreThreshold < 0 || scoreThreshold > 1) throw new Error('scoreThreshold must be in [0, 1]');
  return { sourceRange: { startSeconds: range.startSeconds, endSeconds: range.endSeconds }, sampleEverySeconds, scoreThreshold };
}

// Use actual source PTS, choosing the first available frame at/after each sample
// boundary. Advance directly over missing intervals; never invent VFR times.
function sampleSelector(parameters) {
  const { sourceRange, sampleEverySeconds } = parameters;
  if (!sourceRange) return time => time === 0;
  let next = sourceRange.startSeconds;
  return (time) => {
    if (!Number.isFinite(time)) throw new Error('Frame sourceTimeSeconds must be finite');
    if (time < sourceRange.startSeconds || time >= sourceRange.endSeconds || time + EPSILON_SECONDS < next) return false;
    const elapsed = Math.max(0, time - sourceRange.startSeconds);
    next = sourceRange.startSeconds + (Math.floor((elapsed + EPSILON_SECONDS) / sampleEverySeconds) + 1) * sampleEverySeconds;
    return true;
  };
}

module.exports = { faceParameters, sampleSelector };
