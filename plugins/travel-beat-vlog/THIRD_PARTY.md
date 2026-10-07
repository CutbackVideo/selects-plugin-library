# Third-party components

## Music

No music is bundled. Each Draft uses the song the user picks from their own Project.

## Gallery preview

`preview.mp4` and `poster.webp` are a Selects export of this plugin. Their photos were generated for this preview with an AI image model and turned into short moving clips; they do not depict a real, identifiable person or a real landmark.

The preview's song is "Party Party Disco Party" by John Bartmann, from Free Music Archive (https://freemusicarchive.org/music/John_Bartmann/eurodisco-party-heaven/party-party-disco-party/), released under CC0 1.0. The plugin cut the preview to it like any user song; the song itself is not in the package.

## Tools

- Hero inference is provided by the separately installed `selects-ai-runtime` RVM task. Model/runtime licensing and provisioning are documented in that plugin; no model is bundled here.
- FFmpeg reads the song, writes the song section and measures clip colour: the copy Selects ships, through its `Runtime.runFFmpeg`. Nothing is downloaded.
- The title uses the Impact font when it is installed on the system, otherwise the closest condensed bold fallback. No font file is included.
- React and Remotion APIs are provided by the Selects panel and effect hosts.
