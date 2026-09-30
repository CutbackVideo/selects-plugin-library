# Third-party components

- React and Remotion are imported from the Selects host environment. This package does not redistribute those runtimes; the host's dependency versions and applicable terms govern their use.
- ffmpeg, ffprobe and Node.js are not bundled. When they are installed, the panel runs them through the Selects shell for music previews, your own music and measuring in-shot motion (ffmpeg).
- Users supply their own footage and, optionally, their own music. No sample recordings, reference footage or model weights are included.

## Fonts

The two fonts are bundled in `assets/fonts/` as base64-encoded WOFF2 text (`*.woff2.b64`). Each is a **Latin subset** of the Google Fonts release with hinting removed. Roboto Serif is a variable font, so a single static instance was cut (width 50, weight 800, optical size 144). Because a subset is a Modified Version under the SIL Open Font License, each bundled font is renamed with the prefix "TEC " so it does not use the original Reserved Font Name.

Each family's licence text is in `assets/fonts/licenses/`.

| Family | Bundled file | Copyright | Licence |
| --- | --- | --- | --- |
| Roboto Serif, bundled as "TEC Title Serif" | `tec-title-serif` | Copyright 2020 The Roboto Serif Project Authors (https://github.com/googlefonts/RobotoSerif) | SIL OFL 1.1 (`assets/fonts/licenses/robotoserif-OFL.txt`) |
| Poppins SemiBold, bundled as "TEC Credits Sans" | `tec-credits-sans` | Copyright 2020 The Poppins Project Authors (https://github.com/itfoundry/Poppins) | SIL OFL 1.1 (`assets/fonts/licenses/poppins-OFL.txt`) |

## Music

The five bundled tracks in `assets/cues/` were generated for this plugin with ElevenLabs Music v2.5 (`force_instrumental`) in the Selects chat on 2026-09-30. Each is an instrumental at its generated tempo (not time-stretched), mastered to about -12.5 LUFS (true peak at or below -1.2 dBTP) with a static gain and a peak limiter. Tempo, first beat, swell position, loudness, usable end and content hash are recorded in `assets/cues/manifest.json`. The generation prompts were:

| Track | File | Felt tempo | Prompt |
| --- | --- | --- | --- |
| Open Road Swell | `post-rock.mp3` | 66 BPM | "post-rock swell 66 bpm" |
| Last Light Ballad | `piano-strings.mp3` | 62 BPM | "piano+strings ballad 62 bpm" |
| Late Night Rhodes | `rhodes-soul.mp3` | 64 BPM | "Rhodes soul ambient 64 bpm" |
| Final Scene | `orchestral.mp3` | 60 BPM | "orchestral film theme 60 bpm" |
| Golden Hour Synth | `dream-synth.mp3` | 65 BPM | "dreamy analog synth 65 bpm" |

The tracks are bundled for use in the videos this plugin builds and are not for redistribution as standalone tracks.

## Gallery preview footage

To be filled with the gallery clips' credits from LICENSES.csv.
