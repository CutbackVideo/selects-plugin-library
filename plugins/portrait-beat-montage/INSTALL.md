# Install Portrait Beat Montage

Experimental: macOS arm64 or Windows x64. Install this plugin and
`selects-ai-runtime` from the same library commit. Use a current Selects build
that exposes `selects.ai`, the canonical files/media SDK and panel storage.

Inference uses the shared YuNet/RVM runtime. No plugin-specific Python, Node,
Apple Vision setup or paid background-removal request is needed. The runtime
selects its available GPU provider for RVM; YuNet uses its CPU provider.

Foreground, object and animal inputs are allowed through the existing RVM
model. Results depend on the footage; the migration adds no separate model or
input restriction. Existing layout/coverage safeguards still apply.

Runs and final media stay under `~/.selects/plugin-data/portrait-beat-montage/`.
Keep files referenced by saved Drafts. Shared jobs persist their identity and
result; closing a panel detaches observation, and reopening the same operation
can recover the job. Explicit Cancel requests cancellation.

The migrated paths have automated regression coverage. Full final-template
preview/export on both operating systems remains to be verified at this checkpoint.

A new Create or template run can retry failed/canceled AI jobs. Reopening the same template run preserves cancellation. Closing or replacing a headless template aborts its local work and stops later import/Draft/navigation calls. Windows derived inputs use lossless built-in FFV1 AVI; when its bundled FFmpeg lacks x264, final MP4 encoding uses built-in MPEG4 at the same frame rate. Both encoders were verified using the actual Windows bundle, including 60 fps input and 30000/1001 fps output.
