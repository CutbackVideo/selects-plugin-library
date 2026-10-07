# Install Travel Beat Vlog

Install this folder and `selects-ai-runtime` from the same library commit. Use a Selects host with image AI, persistent plugin storage, the public local file/media SDK, and editable Image overlays (verified host baseline 2.0.570).

macOS arm64 and Windows x64 use the same local RVM task for the hero cutout. The existing **People** and **Main subject** choices remain available, and object/animal photos are passed to the same model without a class check. RVM is trained for people; results on other subjects vary and are not guaranteed. Supported static photo formats are JPEG, PNG and WebP. No photo is uploaded and no Selects credits are used. The runtime provisions its model/dependencies; users do not install Python, Node, FFmpeg, Swift or Xcode tools themselves.

The plugin keeps only its existing output transform: the bundled FFmpeg combines the original pixels and the shared grayscale mask into an RGBA PNG. Hero cutouts stay in `~/.selects/plugin-data/travel-beat-vlog/cutouts/` (Windows: `%USERPROFILE%\.selects\plugin-data\travel-beat-vlog\cutouts\`). The original photo and cutout remain editable Image clips.

No music is bundled. The chosen Project song is decoded locally with Selects' bundled FFmpeg; its fitted section stays in `plugin-data/travel-beat-vlog/songs/` and is imported into the Project once. Song analysis, colour matching, crop, title, grids and fade retain their existing behavior.

Accepted AI jobs run in the host background. Durable plugin storage retains request/job identities across reopen, so rerunning an unchanged photo reuses successful inference. The manual panel's Create Draft action explicitly retries a failed or canceled analysis. Reopening the same template run recovers its saved job without retrying; applying the template again creates a new run. Keep generated media while a Draft uses it.
