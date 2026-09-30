# Third-party components

- React and Remotion are imported from the Selects host environment. This package does not redistribute those runtimes; the host's dependency versions and applicable terms govern their use.
- ffmpeg, ffprobe and Node.js are not bundled. When they are installed, the panel runs them through the Selects shell for music previews and your own music.
- Users supply their own footage and photos and, optionally, their own music. No sample recordings, reference footage or model weights are included.

## Fonts

The title fonts are bundled in `assets/fonts/` as base64-encoded WOFF2 text (`*.woff2.b64`). Each is a **Latin subset** of the Google Fonts release, with hinting removed and, for the variable Quicksand family, a single static Bold (700) instance. A subset is a Modified Version under the SIL Open Font License. Every bundled font carries an `MV ` prefix in its name table and in the title, and the Quicksand subset is named `MV Rounded Bold` because "Quicksand" is a Reserved Font Name:

- `MV Instrument Serif Italic`: the big word of the Mini vlog title;
- `MV DM Serif Display`: the small word of the Mini vlog title;
- `MV Rounded Bold` (a subset of Quicksand Bold): the big words and tag of A day in my life and the big word of A small glimpse;
- `MV DM Mono`: the top and bottom lines of A small glimpse. The fonts are embedded in the title graphic's parameters when a Draft is built.

The subsets cover Latin text only. Other scripts are drawn in a system font.

Each family's licence text is in `assets/fonts/licenses/`.

| Family | Bundled files | Copyright and Reserved Font Names | Licence |
| --- | --- | --- | --- |
| DM Serif Display | `dm-serif-display` | Copyright 2014-2018 Adobe (http://www.adobe.com/), with Reserved Font Name 'Source'. All Rights Reserved. Source is a trademark of Adobe in the United States and/or other countries. Copyright 2019 Google LLC. | SIL OFL 1.1 (`dmserifdisplay-OFL.txt`) |
| Instrument Serif | `instrument-serif-italic` | Copyright 2022 The Instrument Serif Project Authors (https://github.com/Instrument/instrument-serif). No Reserved Font Name. | SIL OFL 1.1 (`instrumentserif-OFL.txt`) |
| Quicksand | `mv-rounded-bold` | Copyright 2011 The Quicksand Project Authors (https://github.com/andrew-paglinawan/QuicksandFamily), with Reserved Font Name "Quicksand". | SIL OFL 1.1 (`quicksand-OFL.txt`) |
| DM Mono | `dm-mono` | Copyright 2020 The DM Mono Project Authors (https://www.github.com/googlefonts/dm-mono). No Reserved Font Name. | SIL OFL 1.1 (`dmmono-OFL.txt`) |

## Music

The six bundled tracks in `assets/cues/` were generated for the Selects plugin library with ElevenLabs Music v2.5 (model `model_v1_ZWxldmVubGFicy9tdXNpYy92Mi41`) through the Selects generated-media service. Each is an instrumental, brought to -11 LUFS integrated with a static gain and a true-peak limiter at -1 dBTP, and encoded at 44.1 kHz, 192 kbps. Tempo, first beat, usable end, loudness and true peak, bar confidence and the measured downbeat ratio, hook-window scores, list group and content hash are recorded in `assets/cues/manifest.json`.

- **Bedroom Pop** and **Acoustic Pop** were generated for this plugin (instrumental only, 60 seconds, delivered as 44.1 kHz 128 kbps MP3) from the prompts below.
- **Weekend Indie Pop**, **Golden Hour Disco**, **Sunny Soul Strut** and **Easy Sunday Lo-fi** are 40-second tracks that are also bundled with another plugin in this library; here they were re-processed once from those mp3s to the loudness above (no other change). Their generation prompts were not recorded.

The tracks are bundled for use in the videos this plugin builds and are not for redistribution as standalone tracks.

| Track | File | Tempo | Group |
| --- | --- | --- | --- |
| Bedroom Pop | `bedroom-pop-108.mp3` | 108 BPM | Reference |
| Acoustic Pop | `acoustic-pop-104.mp3` | 104 BPM | Reference |
| Weekend Indie Pop | `weekend-indie-pop.mp3` | 112 BPM | Reference |
| Golden Hour Disco | `golden-hour-disco.mp3` | 104 BPM | Reference |
| Sunny Soul Strut | `sunny-soul-strut.mp3` | 99 BPM | Alternatives |
| Easy Sunday Lo-fi | `easy-sunday-lofi.mp3` | 88 BPM | Alternatives |

Prompt for Bedroom Pop (`bedroom-pop-108.mp3`):

> Cute, bright instrumental bedroom-pop at exactly 108 BPM in 4/4, sunny, light, cozy daily-vlog mood, no vocals. Drums are the loudest element in the mix: a soft but punchy kick on every beat, a clean snare and clap on beats 2 and 4 for a clear backbeat, and steady straight 8th-note hi-hats (not 16ths, not swung). The drums start within the first second with a strong downbeat on bar 1, with no fade-in and no ambient intro. Add a short drum fill at the end of every 4 bars. Keep the tempo steady and quantized, with no rubato, tempo changes or breakdowns. Plucky clean electric guitar, a warm bass line, glockenspiel and soft synth pads sit underneath the drums. The track is 60 seconds long.

Prompt for Acoustic Pop (`acoustic-pop-104.mp3`):

> Soft, happy instrumental acoustic-pop at exactly 104 BPM in 4/4, warm morning-coffee daily-vlog mood, no vocals. Drums are the loudest element in the mix: a round, punchy kick on beats 1 and 3 plus light kicks on 2 and 4, a crisp snare and hand clap on beats 2 and 4 for a clear backbeat, and straight 8th-note shaker and hi-hat (not 16ths, not swung). The drums start within the first second with a strong downbeat on bar 1, with no fade-in and no ambient intro. Add a short drum fill at the end of every 4 bars. Keep the tempo steady and quantized, with no rubato, tempo changes or breakdowns. Strummed acoustic guitar, ukulele, a warm bass line and light piano sit underneath the drums. The track is 60 seconds long.
