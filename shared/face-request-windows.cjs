// YuNet samples sparsely, but the runtime decodes every source frame in a range.
// Split on the ORIGINAL sample grid, using source FPS rather than sampling FPS.
// Leave room below the runtime's 20,000 decoded-frame ceiling for boundary ticks.
const FACE_DECODE_BUDGET = 19_000;
function faceRequestWindows({startSeconds, endSeconds, sourceFps, sampleEverySeconds, maxDecodedFrames = FACE_DECODE_BUDGET}) {
  if (![startSeconds, endSeconds, sourceFps, sampleEverySeconds].every(Number.isFinite) ||
      startSeconds < 0 || endSeconds <= startSeconds || sourceFps <= 0 || sampleEverySeconds <= 0 ||
      !Number.isSafeInteger(maxDecodedFrames) || maxDecodedFrames < 4) throw new Error('Invalid source face window clock.');
  const count = Math.ceil((endSeconds - startSeconds) / sampleEverySeconds - 1e-7);
  if (!Number.isSafeInteger(count) || count < 1 || count > 1_000_000) throw new Error('Face sample grid exceeds the supported range.');
  const perWindow = Math.max(1, Math.floor((maxDecodedFrames - 2) / (sourceFps * sampleEverySeconds)) - 1);
  const windows = [];
  for (let first = 0; first < count; first += perWindow) {
    const after = Math.min(count, first + perWindow), boundary = startSeconds + first * sampleEverySeconds;
    const sparse = sourceFps * sampleEverySeconds > (maxDecodedFrames - 2) / 2;
    // One sample of warm-up keeps a fractional-fps sample boundary INSIDE the
    // decoder range. Decimal ceil at a range start must not skip that frame.
    const start = first && !sparse ? startSeconds + (first - 1) * sampleEverySeconds : boundary;
    // A very sparse grid needs no decoding of the gap between adjacent samples.
    const end = sparse
      ? Math.min(endSeconds, start + 2 / sourceFps)
      : after < count ? startSeconds + after * sampleEverySeconds : endSeconds;
    windows.push({startSeconds:start, endSeconds:end, ...(first ? {acceptFromSeconds:boundary - 1e-7} : {})});
  }
  return windows;
}
// Runtime indices restart in each decoded window. Consumers track the merged
// observations by their unchanged source PTS; expose a monotonic observation index.
function appendFaceSamples(target, incoming, acceptFromSeconds = -Infinity) {
  let time = -Infinity, localIndex = -1;
  const last = target.at(-1)?.sourceTimeSeconds ?? -Infinity;
  const rows = incoming.flatMap(row => {
    if (!Number.isSafeInteger(row.index) || row.index <= localIndex || !Number.isFinite(row.sourceTimeSeconds) || row.sourceTimeSeconds <= time)
      throw new Error('Invalid shared face sample order across windows.');
    localIndex = row.index; time = row.sourceTimeSeconds;
    if (row.sourceTimeSeconds < acceptFromSeconds || row.sourceTimeSeconds === last) return [];
    if (row.sourceTimeSeconds < last) throw new Error('Invalid shared face sample order across windows.');
    return [{...row}];
  });
  for (let i = 0; i < rows.length; i++) rows[i].index = target.length + i;
  target.push(...rows);
}
module.exports = {FACE_DECODE_BUDGET, faceRequestWindows, appendFaceSamples};
