export function toneTransfer(tone, range) {
  if (tone === 'drawn' || range == null) return {contrast: 1, brightness: 0};
  if (!Array.isArray(range) || range.length !== 2 ||
      !range.every(Number.isFinite) || range[0] < 0 ||
      range[1] > 255 || range[0] >= range[1]) {
    throw new RangeError('Print output range must contain two increasing values in [0,255]');
  }
  return {contrast: (range[1] - range[0]) / 255, brightness: range[0] / 255};
}
