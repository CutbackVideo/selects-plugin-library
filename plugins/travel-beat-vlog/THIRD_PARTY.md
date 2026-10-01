# Third-party components

## Music

`assets/music.mp3` is an original instrumental generated for this plugin with ElevenLabs Music v2.5 through the Selects generated-media service, then arranged for the format: time-stretched by 0.3 % and offset so its beats land on the section cuts, with a 0.4 s fade-out like the reference.

## Gallery preview

`preview.mp4` and `poster.webp` are a Selects export of this plugin. Their photos were generated for this preview with an AI image model and turned into short moving clips; they do not depict a real, identifiable person or a real landmark.

## Tools

- Apple Vision (`VNGeneratePersonSegmentationRequest`, `VNGenerateForegroundInstanceMaskRequest`) is a macOS system framework, called by `tools/cutout.swift`.
- Node.js runs `build-script.mjs` from the Selects panel shell. FFmpeg measures clip colour: the one on the PATH, or else the copy inside the Selects app bundle.
- The title uses the Impact font when it is installed on the system, otherwise the closest condensed bold fallback. No font file is included.
- React and Remotion APIs are provided by the Selects panel and effect hosts.
