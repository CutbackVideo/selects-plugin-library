# Third-party components

- React and Remotion are imported from the Selects host environment. This package does not redistribute those runtimes; the host's dependency versions and applicable terms govern their use.
- ffmpeg, ffprobe and Node.js are not bundled. When they are installed, the panel runs them through the Selects shell for music previews and your own music.
- Users supply their own footage and photos and, optionally, their own music. No sample recordings, reference footage or model weights are included.

## Fonts

The title fonts are bundled in `assets/fonts/` as base64-encoded WOFF2 text (`*.woff2.b64`). Each is a **Latin subset** of the Google Fonts release, with hinting removed and, for the variable Quicksand family, a single static Bold (700) instance. A subset is a Modified Version under the SIL Open Font License, so every font is **renamed** with an `MV ` prefix in its name table and in the title: `MV DM Serif Display`, `MV Instrument Serif Italic`, `MV Rounded Bold` (from Quicksand, whose name is reserved) and `MV DM Mono`. The fonts are embedded in the title graphic's parameters when a Draft is built.

The subsets cover Latin text only. Other scripts are drawn in a system font.

Each family's licence text is in `assets/fonts/licenses/`.

| Family | Bundled files | Copyright and Reserved Font Names | Licence |
| --- | --- | --- | --- |
| DM Serif Display | `dm-serif-display` | Copyright 2014-2018 Adobe (http://www.adobe.com/), with Reserved Font Name 'Source'. All Rights Reserved. Source is a trademark of Adobe in the United States and/or other countries. Copyright 2019 Google LLC. | SIL OFL 1.1 (`dmserifdisplay-OFL.txt`) |
| Instrument Serif | `instrument-serif-italic` | Copyright 2022 The Instrument Serif Project Authors (https://github.com/Instrument/instrument-serif). No Reserved Font Name. | SIL OFL 1.1 (`instrumentserif-OFL.txt`) |
| Quicksand | `mv-rounded-bold` | Copyright 2011 The Quicksand Project Authors (https://github.com/andrew-paglinawan/QuicksandFamily), with Reserved Font Name "Quicksand". | SIL OFL 1.1 (`quicksand-OFL.txt`) |
| DM Mono | `dm-mono` | Copyright 2020 The DM Mono Project Authors (https://www.github.com/googlefonts/dm-mono). No Reserved Font Name. | SIL OFL 1.1 (`dmmono-OFL.txt`) |

## Music

The four bundled tracks in `assets/cues/` were generated for the Selects plugin library with ElevenLabs Music v2.5 (model `model_v1_ZWxldmVubGFicy9tdXNpYy92Mi41`) through the Selects generated-media service. Each is a 40-second instrumental, loudness-normalized to -14 LUFS and encoded at 192 kbps. The same files are also bundled with another plugin in this library; they are unchanged here. Their generation prompts were not recorded. Tempo, first beat, usable end, bar confidence, list group and content hash are recorded in `assets/cues/manifest.json`.

The tracks are bundled for use in the videos this plugin builds and are not for redistribution as standalone tracks.

| Track | File | Tempo | Group |
| --- | --- | --- | --- |
| Weekend Indie Pop | `weekend-indie-pop.mp3` | 112 BPM | Reference |
| Golden Hour Disco | `golden-hour-disco.mp3` | 104 BPM | Reference |
| Sunny Soul Strut | `sunny-soul-strut.mp3` | 99 BPM | Alternatives |
| Easy Sunday Lo-fi | `easy-sunday-lofi.mp3` | 88 BPM | Alternatives |
