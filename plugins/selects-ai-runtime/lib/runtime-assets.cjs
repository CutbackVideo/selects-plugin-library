'use strict';
const ORT_VERSION = '1.30.0';
const ASSETS = {
  node: {
    url: 'https://registry.npmjs.org/onnxruntime-node/-/onnxruntime-node-1.30.0.tgz',
    size: 113507888,
    integrity: 'sha512-twhs1C2C/BFkz1yc5OY0KIU2GUq6DURO7hD4bx5Q2Qy3nAMJwRXW8xU3NVczE29VA9lolLOYepoD8fjTGOfIqw==',
  },
  common: {
    url: 'https://registry.npmjs.org/onnxruntime-common/-/onnxruntime-common-1.30.0.tgz',
    size: 66795,
    integrity: 'sha512-7fdVWjAID1dVhH/G8qK3APARunV4VkBFoCQAP7qp4Wkab0mrorvmc+sqiT+mKXOzDqdjN5j+/Z9nb4gzNPWcyA==',
  },
};
const MODELS = {
  'faces.detect': {
    name: 'yunet', size: 232589,
    url: 'https://media.githubusercontent.com/media/opencv/opencv_zoo/f12e12798e8314f7c074a6656816c048dcc95b7a/models/face_detection_yunet/face_detection_yunet_2023mar.onnx',
    sha256: '8f2383e4dd3cfbb4553ea8718107fc0423210dc964f9f4280604804ed2552fa4',
  },
  'person.matte': {
    name: 'rvm', size: 14975696,
    url: 'https://github.com/PeterL1n/RobustVideoMatting/releases/download/v1.0.0/rvm_mobilenetv3_fp32.onnx',
    sha256: '88d4531297118f595bf2fd60f6f566aec2e559393802d1f436c380f0cbbd2828',
  },
};
const NATIVE_FILES = {
  'darwin-arm64': ['libonnxruntime.1.30.0.dylib', 'libonnxruntime.1.dylib', 'onnxruntime_binding.node'],
  'win32-x64': ['DirectML.dll', 'dxcompiler.dll', 'dxil.dll', 'onnxruntime.dll', 'onnxruntime_binding.node'],
};
module.exports = { ASSETS, MODELS, NATIVE_FILES, ORT_VERSION };
