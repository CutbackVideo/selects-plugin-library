# Third-party components

- React and Remotion are imported from the Selects host environment. This package does not redistribute those runtimes; the host's dependency versions and applicable terms govern their use.
- FFmpeg (ffmpeg, ffprobe) is not bundled in this package: the panel uses the ffmpeg and ffprobe that Selects ships (its Runtime service, called with argument lists, no shell) for music previews, decoding your own music and its muffled ending copy, and the quick check of clips without analysis. No Node.js is used at runtime: your own music's beat and drop detection (`beat-detect.cjs`) runs in a Web Worker inside the panel.
- Users supply their own footage and, optionally, their own music. No sample recordings, reference footage or model weights are included.

## Fonts

The title and label fonts are bundled in `assets/fonts/` as base64-encoded WOFF2 text (`*.woff2.b64`). Each is a **Latin subset** of the Google Fonts release (github.com/google/fonts), with hinting removed and only the kerning and basic shaping features kept (`dev/build-fonts.sh`). Because a subset is a Modified Version under the SIL Open Font License, every font is **renamed** with an `ST ` prefix (for example `ST Poppins Bold`), and each renamed font is checked against the family's Reserved Font Names (`dev/rename-font.py`). The fonts of the chosen style are embedded in the graphics' parameters when a Draft is built.

Each family's licence text is in `assets/fonts/licenses/`.

| Family | Bundled files (renamed family) | Copyright | Licence |
| --- | --- | --- | --- |
| Poppins | `poppins-light` (ST Poppins Light), `poppins-light-italic` (ST Poppins Light Italic), `poppins-bold` (ST Poppins Bold), `poppins-black` (ST Poppins Black) | Copyright 2020 The Poppins Project Authors (https://github.com/itfoundry/Poppins) | SIL OFL 1.1 (`poppins-OFL.txt`) |
| Anton | `anton` (ST Anton) | Copyright 2020 The Anton Project Authors (https://github.com/googlefonts/AntonFont.git) | SIL OFL 1.1 (`anton-OFL.txt`) |
| Gloock | `gloock` (ST Gloock) | Copyright 2022 The Gloock Project Authors (https://github.com/duartp/gloock) | SIL OFL 1.1 (`gloock-OFL.txt`) |
| Instrument Serif | `instrument-serif-italic` (ST Instrument Serif Italic) | Copyright 2022 The Instrument Serif Project Authors (https://github.com/Instrument/instrument-serif) | SIL OFL 1.1 (`instrumentserif-OFL.txt`) |

## Music

The four bundled tracks in `assets/cues/` were generated for this plugin on 2026-09-30 with ElevenLabs Music v2.5
through the Selects generated-media service (instrumental, 65 s requests). They are brought to -11 LUFS integrated
(true peak at or under -1 dBTP) with a static gain and a limiter, and each has a muffled (low-passed,
`lowpass=f=2800:p=2`) copy for the ending made
from the same decoded audio (`dev/build-cues.cjs`, filter in `muffle.cjs`). They are bundled for use in the videos
this plugin builds, not for redistribution as standalone tracks. Measured values are in `assets/cues/manifest.json`;
tempo and drop (loudness step at the drop) are measured on the source before the loudness processing.

| File | Prompt (summary) | Tempo | Drop |
| --- | --- | --- | --- |
| `surf-indie.mp3` | Sunny indie pop with clean surf guitar; 2-bar quiet guitar intro, then the full band | 122.01 BPM | 9.86 s (+5.2 dB) |
| `tropical-house.mp3` | Tropical house; quiet marimba/pluck intro, then a four-on-the-floor drop | 120.01 BPM | 16.03 s (+9.2 dB) |
| `cinematic-pop.mp3` | Cinematic summer pop; piano intro, then the full band | 118.01 BPM | none detected |
| `nu-disco.mp3` | Mediterranean nu-disco; filtered electric-piano intro, then the groove | 124.00 BPM | none detected |

## Sounds

The sound effects in `sfx/` are derived from CC0 1.0 (public domain) recordings on Freesound
(`dev/build-sfx.cjs`: trimmed, faded, DC removed, levelled to -3 dBFS, 16-bit stereo 44.1 kHz):

- Shutters (`shutter-1` to `shutter-4`) — "Pentax K1000 Camera Shutter.wav" by yfjesse,
  https://freesound.org/people/yfjesse/sounds/579883/ — the takes made for the Postcard Cutout Studio plugin
  (`panel-shutter-v4-1` to `-4`: trimmed, equalised, pitched and given a short stereo room there).
- Whoosh (`whoosh-1`) — "Whoosh stereo light (transition)" by xkeril,
  https://freesound.org/people/xkeril/sounds/701104/ — built from the Freesound HQ preview of the CC0 original.

## Gallery preview

`preview.mp4` and `poster.webp` show a build of this plugin with its default settings on stock footage and photos used under the
Pexels License (https://www.pexels.com/license/):

- Scenic palm trees on sao miguel beach by Constantino Filmes (Pexels), https://www.pexels.com/video/scenic-palm-trees-on-sao-miguel-beach-34628886/
- Serene beach waves on a sunny day by Nui MALAMA (Pexels), https://www.pexels.com/video/serene-beach-waves-on-a-sunny-day-36301470/
- Aerial view of huacachina desert oasis peru by Florian Delée (Pexels), https://www.pexels.com/video/aerial-view-of-huacachina-desert-oasis-peru-33170755/
- Drone adventure over peruvian sand dunes by Florian Delée (Pexels), https://www.pexels.com/video/drone-adventure-over-peruvian-sand-dunes-35296750/
- Stunning aerial view of lush argentine forest by Alex Dos Santos (Pexels), https://www.pexels.com/video/stunning-aerial-view-of-lush-argentine-forest-36948306/
- Stunning cityscape at twilight with vibrant colors by IslandHopper X (Pexels), https://www.pexels.com/video/stunning-cityscape-at-twilight-with-vibrant-colors-29648731/
- Aerial view of city lights at twilight over mountains by K (Pexels), https://www.pexels.com/video/aerial-view-of-city-lights-at-twilight-over-mountains-31630756/
- An aerial view of a wheat field by K (Pexels), https://www.pexels.com/video/an-aerial-view-of-a-wheat-field-27114575/
- Stunning summer landscape with rolling hills by Beata L. (Pexels), https://www.pexels.com/video/stunning-summer-landscape-with-rolling-hills-38734928/
- Serene ocean sunset with vibrant sky by Ali Soheil (Pexels), https://www.pexels.com/photo/serene-ocean-sunset-with-vibrant-sky-38364507/
- Sun shining over golden wheat field by Nejc Parašuh (Pexels), https://www.pexels.com/photo/sun-shining-over-golden-wheat-field-17228685/
- Gorgeous sunset over ocean waves by Nothing Ahead (Pexels), https://www.pexels.com/photo/gorgeous-sunset-over-ocean-waves-39837537/
- Road in forest by Sean Kernerman (Pexels), https://www.pexels.com/photo/road-in-forest-9920936/

The music is the bundled Surf Indie cue (see Music above); the fonts are the bundled subsets (see Fonts).
