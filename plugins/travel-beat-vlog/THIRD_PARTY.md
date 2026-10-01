# Third-party components

## Music

No music is bundled. Each Draft uses the song the user picks from their own Project.

## Gallery preview

`preview.mp4` and `poster.webp` are a Selects export of this plugin. Their photos were generated for this preview with an AI image model and turned into short moving clips; they do not depict a real, identifiable person or a real landmark.

The preview's song is "Party Party Disco Party" by John Bartmann, from Free Music Archive (https://freemusicarchive.org/music/John_Bartmann/eurodisco-party-heaven/party-party-disco-party/), released under CC0 1.0. The plugin cut the preview to it like any user song; the song itself is not in the package.

## Tools

- Apple Vision (`VNGeneratePersonInstanceMaskRequest`, `VNDetectHumanRectanglesRequest`, `VNGenerateForegroundInstanceMaskRequest`) is a macOS system framework, called by `tools/cutout.js` through `osascript`.
- Node.js 22.23.3 (MIT), downloaded on first use by `runtime.sh` from nodejs.org and verified by SHA-256, runs `build-script.mjs` from the Selects panel shell. FFmpeg reads the song and measures clip colour: the one on the PATH, or else the copy inside the Selects app bundle.
- The title uses the Impact font when it is installed on the system, otherwise the closest condensed bold fallback. No font file is included.
- React and Remotion APIs are provided by the Selects panel and effect hosts.
