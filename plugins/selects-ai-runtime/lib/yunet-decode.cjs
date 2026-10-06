'use strict';

// Adapted from shorts-style-lab/plugin/src/perception/yunetDecode.ts and the
// identical quote-reel-lab implementation. The score, landmark and integer-Rect
// NMS equations follow OpenCV FaceDetectorYN (Apache-2.0; see THIRD_PARTY.md).
const YUNET_STRIDES = [8, 16, 32];
const YUNET_INPUT_SIZE = 640;
const YUNET_NMS_THRESHOLD = 0.3;
const YUNET_TOP_K = 5000;
const f32 = Math.fround;
const clamp01 = (value) => Math.min(1, Math.max(0, value));

function validFrame(rgb, width, height) {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width <= 0 || height <= 0) {
    throw new Error('Expected positive integer display frame dimensions');
  }
  if (!(rgb instanceof Uint8Array) || rgb.length !== width * height * 3) {
    throw new Error(`Expected ${width * height * 3} packed RGB24 frame bytes`);
  }
}

// Keep the original model's fixed shape. Resize only when necessary, put the
// content at (0, 0), and zero-pad the right/bottom. Pixels are unnormalized BGR
// float32 planes. Bilinear samples use pixel centres and round to uint8 first.
function rgbToLetterboxBlob(rgb, width, height, out) {
  validFrame(rgb, width, height);
  const size = YUNET_INPUT_SIZE;
  const ratio = Math.min(1, size / width, size / height);
  const contentWidth = Math.max(1, Math.round(width * ratio));
  const contentHeight = Math.max(1, Math.round(height * ratio));
  const plane = size * size;
  const data = out?.length === 3 * plane ? out : new Float32Array(3 * plane);
  data.fill(0);
  const scaleX = width / contentWidth;
  const scaleY = height / contentHeight;
  for (let y = 0; y < contentHeight; y += 1) {
    const sy = Math.max(0, Math.min(height - 1, (y + 0.5) * scaleY - 0.5));
    const y0 = Math.floor(sy), y1 = Math.min(height - 1, y0 + 1), fy = sy - y0;
    for (let x = 0; x < contentWidth; x += 1) {
      const sx = Math.max(0, Math.min(width - 1, (x + 0.5) * scaleX - 0.5));
      const x0 = Math.floor(sx), x1 = Math.min(width - 1, x0 + 1), fx = sx - x0;
      const p00 = (y0 * width + x0) * 3, p01 = (y0 * width + x1) * 3;
      const p10 = (y1 * width + x0) * 3, p11 = (y1 * width + x1) * 3;
      const target = y * size + x;
      for (let channel = 0; channel < 3; channel += 1) {
        const upper = rgb[p00 + channel] * (1 - fx) + rgb[p01 + channel] * fx;
        const lower = rgb[p10 + channel] * (1 - fx) + rgb[p11 + channel] * fx;
        data[(2 - channel) * plane + target] = Math.round(upper * (1 - fy) + lower * fy);
      }
    }
  }
  return { data, width: size, height: size, contentWidth, contentHeight, scaleX, scaleY };
}

function rectOverlap(a, b) {
  const aa = a[2] * a[3], ab = b[2] * b[3];
  if (aa + ab <= 0) return 1;
  const x1 = Math.max(a[0], b[0]), y1 = Math.max(a[1], b[1]);
  const x2 = Math.min(a[0] + a[2], b[0] + b[2]), y2 = Math.min(a[1] + a[3], b[1] + b[3]);
  const intersection = x2 > x1 && y2 > y1 ? (x2 - x1) * (y2 - y1) : 0;
  return f32(1 - f32(1 - intersection / (aa + ab - intersection)));
}

function nmsBoxes(faces, scoreThreshold, nmsThreshold, topK) {
  const order = faces.map((face, index) => ({ score: face.score, index }))
    .filter((candidate) => candidate.score > scoreThreshold);
  order.sort((a, b) => b.score - a.score || a.index - b.index);
  if (topK > 0 && order.length > topK) order.length = topK;
  const rects = faces.map((face) => face.box.map(Math.trunc));
  const kept = [];
  for (const { index } of order) {
    if (kept.every((other) => rectOverlap(rects[index], rects[other]) <= nmsThreshold)) kept.push(index);
  }
  return kept;
}

function decodeYuNet(outputs, padWidth, padHeight, options = {}) {
  const threshold = options.score ?? 0.8;
  const faces = [];
  for (const stride of YUNET_STRIDES) {
    const cols = Math.floor(padWidth / stride), rows = Math.floor(padHeight / stride);
    const count = rows * cols;
    const cls = outputs[`cls_${stride}`], obj = outputs[`obj_${stride}`];
    const bbox = outputs[`bbox_${stride}`], kps = outputs[`kps_${stride}`];
    if (!cls || !obj || !bbox || !kps) throw new Error(`YuNet has no output for stride ${stride}`);
    if (cls.length !== count || obj.length !== count || bbox.length !== count * 4 || kps.length !== count * 10) {
      throw new Error(`YuNet stride-${stride} output does not fit ${padWidth}x${padHeight}`);
    }
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const index = row * cols + col;
        const score = f32(Math.sqrt(f32(clamp01(cls[index]) * clamp01(obj[index]))));
        if (!Number.isFinite(score)) throw new Error('YuNet returned a non-finite score');
        if (score < threshold) continue;
        const cx = f32((col + bbox[index * 4]) * stride), cy = f32((row + bbox[index * 4 + 1]) * stride);
        const width = f32(f32(Math.exp(bbox[index * 4 + 2])) * stride);
        const height = f32(f32(Math.exp(bbox[index * 4 + 3])) * stride);
        const landmarks = [];
        for (let point = 0; point < 5; point += 1) {
          landmarks.push([
            f32((kps[index * 10 + point * 2] + col) * stride),
            f32((kps[index * 10 + point * 2 + 1] + row) * stride),
          ]);
        }
        const box = [f32(cx - width / 2), f32(cy - height / 2), width, height];
        if (![...box, ...landmarks.flat()].every(Number.isFinite)) throw new Error('YuNet returned non-finite coordinates');
        faces.push({ box, landmarks, score });
      }
    }
  }
  // FaceDetectorYN skips NMS when there is only one candidate. Its NMS score
  // filter is strict (> threshold), whereas candidate collection uses >=.
  if (faces.length <= 1) return faces;
  return nmsBoxes(faces, threshold, options.nms ?? YUNET_NMS_THRESHOLD, options.topK ?? YUNET_TOP_K)
    .map((index) => faces[index]);
}

function mapFaceToDisplay(face, preprocessing, width, height) {
  const { scaleX, scaleY } = preprocessing;
  const clamp = (value, limit) => Math.max(0, Math.min(limit, value));
  const x1 = clamp(face.box[0] * scaleX, width), y1 = clamp(face.box[1] * scaleY, height);
  const x2 = clamp((face.box[0] + face.box[2]) * scaleX, width);
  const y2 = clamp((face.box[1] + face.box[3]) * scaleY, height);
  if (x2 <= x1 || y2 <= y1) return null;
  return {
    box: { xmin: x1, ymin: y1, xmax: x2, ymax: y2 },
    score: face.score,
    // Right eye, left eye, nose, right mouth corner, left mouth corner from the
    // person's viewpoint. These source-pixel points can lie outside the image.
    landmarks: face.landmarks.map(([x, y]) => ({ x: x * scaleX, y: y * scaleY })),
  };
}

module.exports = {
  YUNET_INPUT_SIZE, YUNET_STRIDES, YUNET_NMS_THRESHOLD, YUNET_TOP_K,
  rgbToLetterboxBlob, decodeYuNet, nmsBoxes, rectOverlap, mapFaceToDisplay,
};
