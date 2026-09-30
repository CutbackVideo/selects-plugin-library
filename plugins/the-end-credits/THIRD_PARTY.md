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

`preview.mp4` and `poster.webp` show a Draft made by this plugin with its default settings (Classic, Last Light Ballad, Film crew credits) on free stock footage. None of these licences requires attribution; the clips and photos are listed for transparency:

- "Stunning summer landscape with rolling hills" by Beata L. (Pexels, Pexels License): https://www.pexels.com/video/stunning-summer-landscape-with-rolling-hills-38734928/
- "Blurred car lights" by Coverr (in-house) (Coverr, Coverr License): https://coverr.co/videos/blurred-car-lights-f9c1kbdrwo
- "Gorgeous sunset over ocean waves" by Nothing Ahead (Pexels, Pexels License): https://www.pexels.com/photo/gorgeous-sunset-over-ocean-waves-39837537/
- "Scenic palm trees on sao miguel beach" by Constantino Filmes (Pexels, Pexels License): https://www.pexels.com/video/scenic-palm-trees-on-sao-miguel-beach-34628886/
- "Photo of sand dunes in a desert" by MART PRODUCTION (Pexels, Pexels License): https://www.pexels.com/photo/photo-of-sand-dunes-in-a-desert-8869381/
- "Drone adventure over peruvian sand dunes" by Florian Delée (Pexels, Pexels License): https://www.pexels.com/video/drone-adventure-over-peruvian-sand-dunes-35296750/
- "Aerial view of sunset over dense woodland" by Alex Dos Santos (Pexels, Pexels License): https://www.pexels.com/video/aerial-view-of-sunset-over-dense-woodland-36948285/
