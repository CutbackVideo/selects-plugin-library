'use strict';

// Actual source PTS, rather than the container's declared fps, decide whether
// a fixed-rate foreground movie preserves the selected source clock.
function constantFrameRate(average, sourcePts, timeBase) {
  const [numerator, denominator] = String(average).split('/').map(Number);
  if (!Number.isSafeInteger(numerator) || !Number.isSafeInteger(denominator) || numerator <= 0 || denominator <= 0 || sourcePts.length < 2) return null;
  const ticksPerFrame = denominator * timeBase.denominator / (numerator * timeBase.numerator);
  if (!Number.isFinite(ticksPerFrame) || ticksPerFrame < 1) return null;
  // An integral clock has no quantization error. A one-tick allowance could
  // otherwise hide a missing frame when a frame itself occupies one tick.
  const integralClock = Number.isInteger(ticksPerFrame);
  for (let index = 0; index < sourcePts.length; index++) {
    if (!Number.isSafeInteger(sourcePts[index]) || (index && sourcePts[index] <= sourcePts[index - 1]) ||
      (integralClock ? sourcePts[index] !== index * ticksPerFrame : Math.abs(sourcePts[index] - index * ticksPerFrame) > 1.01)) return null;
  }
  return { numerator, denominator };
}
module.exports = { constantFrameRate };
