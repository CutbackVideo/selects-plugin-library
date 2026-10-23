function faceResultFixture(count = 719) {
  const fps = 24000 / 1001, startSeconds = 16.391375;
  const samples = Array.from({length: count}, (_, index) => {
    const n = index < 67 ? 0 : index < 296 ? 2 : 1;
    return {index, sourceTimeSeconds: startSeconds + index / fps,
      faces: Array.from({length: n}, (_, face) => {
        const x = 453.92578125 + index * .000013 + face * 900;
        return {score: .8087474703788757, box: {xmin: x, ymin: 246.0091094970703, xmax: x + 29.51942253112793, ymax: 283.10835456848145},
          landmarks: Array.from({length: 5}, (_, i) => ({x: x + 8.123456789012345 + i, y: 258.34764862060547 + i}))};
      })};
  });
  return {contractVersion: 1, task: 'faces.detect', sourceKind: 'video', coordinateSpace: 'display-pixels', boxFormat: 'xyxy',
    frameSize: {width: 1920, height: 1080}, parameters: {sourceRange: {startSeconds, endSeconds: startSeconds + count / fps}, sampleEverySeconds: .5 / fps, scoreThreshold: .8}, samples};
}
module.exports = {faceResultFixture};
