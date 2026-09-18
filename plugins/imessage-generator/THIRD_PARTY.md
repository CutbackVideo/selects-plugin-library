# Third-party components

## Kokoro (local, free voice engine)

- Runtime package: [`kokoro-onnx`](https://github.com/thewh1teagle/kokoro-onnx)
  (MIT license), installed into a private virtualenv under
  `~/.selects/tts/kokoro-v1` on first setup.
- Model weights: Kokoro-82M (Apache-2.0), downloaded from the
  `kokoro-onnx` project's GitHub release assets and verified by SHA-256
  before use.
- Neither the package nor the model weights are bundled in this
  repository; both are fetched at setup time on the user's machine.

## ElevenLabs (optional, cloud voice engine)

- The panel can call the ElevenLabs text-to-speech API
  (`https://api.elevenlabs.io`) using an API key the user supplies at
  runtime. Use is subject to ElevenLabs' own terms and billing; no key is
  stored in this repository.
