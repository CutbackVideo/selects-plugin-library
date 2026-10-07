# Install Beat Cutout Gallery

Install this folder and `selects-ai-runtime` from the same library commit. Use a Selects host with image AI, persistent plugin storage and public local file/media APIs (verified host baseline 2.0.570).

## Windows

The ordinary photo workflow uses local shared RVM and Selects' bundled FFmpeg. No uploads or Selects credits are needed; users do not install Python, Node, Pillow, Swift, Xcode or FFmpeg themselves. The shared runtime provisions its own model/dependencies.

## macOS

The ordinary photo workflow uses the same runtime, browser image worker and bundled FFmpeg as Windows. It no longer compiles Apple Vision or launches a Python inference pipeline. The optional private pre-approved reference reconstruction remains a separate macOS Python/Pillow path using supplied sticker layers; the private reference assets are not distributed and this branch performs no inference.

## Both

JPEG, PNG and WebP project photos are analyzed once with fresh RVM state. Subjects, including objects and animals, are passed through without a class check. RVM is trained for people; output quality for other subjects varies and is not guaranteed. Existing framing, clean-mask checks, outlines, sticker placement, scene durations and music remain unchanged. The original-size alpha raster receives the same centered cover crop as the photo before sticker composition.

Analysis creates Main-owned background jobs. Closing the panel detaches observation; opening it again and analyzing the same photos recovers/reuses saved jobs. **Cancel** records and sends explicit cancellation; the next explicit analysis can retry a canceled job. A model/transport error stops analysis rather than treating a broken model as an empty mask.

Runs stay in `~/.selects/plugin-data/cutout-beat-gallery/runs/<run>/` (Windows: `%USERPROFILE%\.selects\plugin-data\cutout-beat-gallery\runs\<run>\`). The Draft references these generated scene and sticker files, so keep a run folder while it is used.
