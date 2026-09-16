# Third-party dependencies

This plugin does not bundle any third-party binaries, models, or credentials. It calls the following external components already present on the host or provided by Selects itself:

- **FFmpeg / FFprobe** — used for all local video trimming, thumbnail/filmstrip generation, and final rendering. Must be installed separately and available on `PATH`. Licensed under the LGPL/GPL by the FFmpeg project (https://ffmpeg.org/legal.html); which license applies depends on the build's included components.
- **Selects `generate_media` tool** — used at build time to run AI background removal (video-to-video) through whichever model the host's Selects AI profile has access to. This plugin does not choose or bundle a specific model; the exact provider and model are resolved by the host and Selects AI at run time, using the signed-in profile's own access — no separate API key is requested or stored by this plugin.

No other third-party code, weights, or services are included.
