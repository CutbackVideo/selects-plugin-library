# Dependencies and media handling

- React: supplied by Selects, not bundled.
- FFmpeg / FFprobe: accessed through Selects host adapters, not bundled.
- Python 3: optional local diagnostic logging only, not bundled.
- Seedance, Wan, MiniMax H3, Gemini Omni, Kling and Sync Lipsync: external managed generation services accessed through Selects. Provider terms, availability and account charges apply. No credentials, weights or service implementation are distributed.
- Embedded angle illustrations: AI-generated examples of a fictional person, resized to 600 pixels wide and encoded as WebP. They are UI assets only and are not sent as generation references. No source footage or images of the test-video participant are included.

Generation uses the selected source-video interval. Models other than Omni also receive three original person-reference frames; Sync receives the generated video and original speech. Source analysis runs through the signed-in Selects AI profile. The plugin does not request a personal provider key.
