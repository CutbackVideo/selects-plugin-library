# Third-party provenance

This source package includes no ONNX models, ONNX Runtime native libraries, FFmpeg executable, test media or generated alpha files. The registered preparation entrypoint downloads exact upstream packages and original model files using the URLs and integrity values in `lib/runtime-assets.cjs` and `lib/webgpu-assets.cjs`. The earlier PoC used existing local copies. Mac WebGPU derives a channel-zero-padded RVM graph in memory from verified original bytes; its transform version and distinct SHA are recorded, and the original model is retained. Preserve upstream licenses and notices in any redistributed binary/model bundle.

| Component | Provenance / terms |
| --- | --- |
| YuNet `face_detection_yunet_2023mar.onnx` | [OpenCV Zoo model](https://github.com/opencv/opencv_zoo/tree/main/models/face_detection_yunet), [MIT license](https://github.com/opencv/opencv_zoo/blob/main/models/face_detection_yunet/LICENSE), copyright Shiqi Yu. SHA-256 is pinned in `runtime.json`. |
| YuNet decoding and preprocessing conventions | Adapted from the existing Shorts/Quote runtime and [OpenCV FaceDetectorYN implementation](https://github.com/opencv/opencv/blob/4.x/modules/objdetect/src/face_detect.cpp), [Apache 2.0](https://github.com/opencv/opencv/blob/4.x/LICENSE). OpenCV contributors include Intel Corporation, OpenCV Foundation and OpenCV AI. |
| RVM MobileNetV3 FP32 ONNX | [Robust Video Matting](https://github.com/PeterL1n/RobustVideoMatting), [upstream GPL-3.0 license](https://github.com/PeterL1n/RobustVideoMatting/blob/master/LICENSE). Original and derived models remain external to the source package; WebGPU records its equivalent zero-padding transform separately. Model/distribution terms need to be resolved for a production package. |
| `onnxruntime-node` 1.30.0 | [Microsoft ONNX Runtime](https://github.com/microsoft/onnxruntime), [MIT license](https://github.com/microsoft/onnxruntime/blob/v1.30.0/LICENSE). Native distributions include additional third-party notices; preserve their notices when provisioning a bundle. |
| `onnxruntime-web` 1.30.0 | Same ONNX Runtime MIT terms; pinned native-WebGPU Asyncify WASM build, kept in the plugin dependency cache. Its protobuf codec uses pinned `protobufjs` and small transitive packages. |
| Dawn Node binding `webgpu` 0.6.2 | [Dawn Node package](https://github.com/dawn-gpu/node-webgpu), [Dawn BSD license](https://dawn.googlesource.com/dawn/+/refs/heads/main/LICENSE). Selected Mac native binding is cached without running package installation scripts. |
| Node.js 24.18.0 standalone Mac ARM64 executable | [Official release](https://nodejs.org/dist/v24.18.0/), [license and bundled notices](https://github.com/nodejs/node/blob/v24.18.0/LICENSE). Only the hash-verified executable and its LICENSE are extracted into the plugin cache; this does not install system Node or npm. |
| FFmpeg / FFprobe | Reuses the installed Selects build. [FFmpeg licensing](https://ffmpeg.org/legal.html) depends on the build configuration. This package distributes no binaries. |

## YuNet notice

MIT License

Copyright (c) 2020 Shiqi Yu

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

## OpenCV-derived conventions

The YuNet decoding/preprocessing code incorporates Apache-2.0 OpenCV conventions. The accompanying `licenses/Apache-2.0.txt` applies to those derived portions. The independent test oracle uses OpenCV's implementation rather than this package's decoder. The full source package remains a private experiment; `package.json` does not grant rights to third-party assets.
