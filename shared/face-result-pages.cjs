// Keep face observations below the existing script-result limit. Projection
// drops unused landmarks, never frames/faces or their source clock/coordinates.
const FACE_RESULT_PAGE_BYTES = 65536;
const FACE_RESULT_PAGE_SAMPLES = 128;

// Self-contained: this function is serialized into the existing read-only SDK.
function faceResultPage(data, options) {
  const {offset, maxSamples, maxBytes} = options || {};
  const invalid = () => new Error('FACE_RESULT_PAGE_INVALID: face observations do not match the source contract.');
  if (!Number.isSafeInteger(offset) || offset < 0 || !Number.isSafeInteger(maxSamples) || maxSamples < 1 || maxSamples > 128 ||
      !Number.isSafeInteger(maxBytes) || maxBytes < 512 || maxBytes > 65536) throw invalid();
  const w = data?.frameSize?.width, h = data?.frameSize?.height, range = data?.parameters?.sourceRange;
  if (data?.contractVersion !== 1 || data.task !== 'faces.detect' || (data.sourceKind !== undefined && data.sourceKind !== 'video') ||
      data.coordinateSpace !== 'display-pixels' || data.boxFormat !== 'xyxy' || !Number.isSafeInteger(w) || !Number.isSafeInteger(h) || w <= 0 || h <= 0 ||
      !data.parameters || typeof data.parameters !== 'object' ||
      (range !== undefined && (!range || !Number.isFinite(range.startSeconds) || !Number.isFinite(range.endSeconds) || range.startSeconds < 0 || range.endSeconds <= range.startSeconds)) ||
      (data.parameters.sampleEverySeconds !== undefined && (!Number.isFinite(data.parameters.sampleEverySeconds) || data.parameters.sampleEverySeconds <= 0)) ||
      (data.parameters.scoreThreshold !== undefined && (!Number.isFinite(data.parameters.scoreThreshold) || data.parameters.scoreThreshold < 0 || data.parameters.scoreThreshold > 1)) ||
      !Array.isArray(data.samples) || data.samples.length > 1000000 || offset > data.samples.length) throw invalid();
  const header = {contractVersion: 1, task: 'faces.detect', ...(data.sourceKind === undefined ? {} : {sourceKind: 'video'}),
    coordinateSpace: 'display-pixels', boxFormat: 'xyxy', frameSize: {width: w, height: h},
    parameters: {...(range === undefined ? {} : {sourceRange: {startSeconds: range.startSeconds, endSeconds: range.endSeconds}}),
      ...(data.parameters.sampleEverySeconds === undefined ? {} : {sampleEverySeconds: data.parameters.sampleEverySeconds}),
      ...(data.parameters.scoreThreshold === undefined ? {} : {scoreThreshold: data.parameters.scoreThreshold})}};
  let totalFaces = 0, emptySamples = 0;
  for (const row of data.samples) {
    if (!Array.isArray(row?.faces)) throw invalid();
    totalFaces += row.faces.length; if (!row.faces.length) emptySamples++;
  }
  const page = {header, totalSamples: data.samples.length, totalFaces, emptySamples, offset, nextOffset: offset, done: offset === data.samples.length, samples: []};
  for (let i = offset; i < data.samples.length && page.samples.length < maxSamples; i++) {
    const row = data.samples[i];
    if (!Number.isSafeInteger(row.index) || row.index < 0 || !Number.isFinite(row.sourceTimeSeconds) || row.sourceTimeSeconds < 0 || (range && (row.sourceTimeSeconds < range.startSeconds || row.sourceTimeSeconds >= range.endSeconds))) throw invalid();
    const faces = row.faces.map(face => {
      const b = face?.box;
      if (!b || ![face.score, b.xmin, b.ymin, b.xmax, b.ymax].every(Number.isFinite) || face.score < 0 || face.score > 1 ||
          b.xmin < 0 || b.ymin < 0 || b.xmax > w || b.ymax > h || b.xmax <= b.xmin || b.ymax <= b.ymin) throw invalid();
      return {box: {xmin: b.xmin, ymin: b.ymin, xmax: b.xmax, ymax: b.ymax}, score: face.score};
    });
    const sample = {index: row.index, sourceTimeSeconds: row.sourceTimeSeconds, faces};
    page.samples.push(sample); page.nextOffset = i + 1; page.done = page.nextOffset === data.samples.length;
    // Every returned string is a validated fixed ASCII contract value, so the
    // JSON character count is its exact UTF-8 byte count, including the envelope.
    if (JSON.stringify(page).length > maxBytes) {
      page.samples.pop(); page.nextOffset = i; page.done = false;
      if (!page.samples.length) throw new Error('FACE_RESULT_FRAME_TOO_LARGE: one complete face frame exceeds the read budget.');
      break;
    }
  }
  if (JSON.stringify(page).length > maxBytes) throw invalid();
  return page;
}

async function readFaceResultPages(readScript, artifact, projectId, options = {}) {
  const maxBytes = options.maxBytes ?? FACE_RESULT_PAGE_BYTES, maxSamples = options.maxSamples ?? FACE_RESULT_PAGE_SAMPLES;
  if (typeof readScript !== 'function' || !artifact || typeof projectId !== 'string' || !projectId ||
      !Number.isSafeInteger(maxBytes) || maxBytes < 512 || maxBytes > FACE_RESULT_PAGE_BYTES ||
      !Number.isSafeInteger(maxSamples) || maxSamples < 1 || maxSamples > FACE_RESULT_PAGE_SAMPLES) throw new Error('FACE_RESULT_PAGE_INVALID: invalid read budget or source.');
  let offset = 0, metadata, header, totals, previousTime = -Infinity, previousIndex = -1;
  const samples = [];
  for (;;) {
    const script = `const data:any = await selects.ai.readJSON(${JSON.stringify(artifact)}, ${JSON.stringify(projectId)});return (${faceResultPage.toString()})(data, ${JSON.stringify({offset, maxSamples, maxBytes})});`;
    const page = await readScript(script, 'Read source face observations ' + (offset + 1));
    if (!page || JSON.stringify(page).length > maxBytes || !page.header || !Array.isArray(page.samples) ||
        !Number.isSafeInteger(page.totalSamples) || page.totalSamples < 0 || page.totalSamples > 1000000 ||
        !Number.isSafeInteger(page.totalFaces) || page.totalFaces < 0 || !Number.isSafeInteger(page.emptySamples) || page.emptySamples < 0 || page.emptySamples > page.totalSamples ||
        page.offset !== offset || page.samples.length > maxSamples || page.nextOffset !== offset + page.samples.length || page.nextOffset > page.totalSamples ||
        page.done !== (page.nextOffset === page.totalSamples) || (!page.done && !page.samples.length)) throw new Error('FACE_RESULT_PAGE_INVALID: incomplete or out-of-order face page.');
    const stamp = JSON.stringify({header: page.header, totalSamples: page.totalSamples, totalFaces: page.totalFaces, emptySamples: page.emptySamples});
    if (metadata !== undefined && stamp !== metadata) throw new Error('FACE_RESULT_PAGE_INVALID: face artifact changed between pages.');
    metadata = stamp; header = page.header; totals = page;
    for (const sample of page.samples) {
      if (!Number.isSafeInteger(sample?.index) || sample.index <= previousIndex || !Number.isFinite(sample.sourceTimeSeconds) || sample.sourceTimeSeconds <= previousTime || !Array.isArray(sample.faces)) throw new Error('FACE_RESULT_PAGE_INVALID: face frame clock changed between pages.');
      previousIndex = sample.index; previousTime = sample.sourceTimeSeconds; samples.push(sample);
    }
    offset = page.nextOffset;
    if (page.done) break;
  }
  if (samples.length !== totals.totalSamples || samples.reduce((n, sample) => n + sample.faces.length, 0) !== totals.totalFaces || samples.filter(sample => !sample.faces.length).length !== totals.emptySamples) throw new Error('FACE_RESULT_PAGE_INVALID: face observations were lost while reading.');
  return {...header, samples};
}
module.exports = {FACE_RESULT_PAGE_BYTES, FACE_RESULT_PAGE_SAMPLES, faceResultPage, readFaceResultPages};
