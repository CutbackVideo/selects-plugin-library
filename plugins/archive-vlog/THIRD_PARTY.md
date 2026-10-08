# Third-party components

- React and Remotion are imported from the Selects host environment. This package does not redistribute those runtimes; the host's dependency versions and applicable terms govern their use.
- ffmpeg is not bundled with the plugin: your own music is decoded with the ffmpeg that ships with Selects; Node.js is not used.
- Users supply their own footage and photos and, optionally, their own music. No sample recordings, reference footage or model weights are included.

## Fonts

The title and credit fonts are bundled in `assets/fonts/` as base64-encoded WOFF2 text (`*.woff2.b64`). Each is a **Latin subset** of the Google Fonts release, with hinting and kerning removed and, for the variable Oswald and Inter families, a single static instance (Oswald Bold 700; Inter Medium 500 and Regular 400 at optical size 20). A subset is a Modified Version under the SIL Open Font License. Every bundled font carries an `AV ` prefix in its name table and in the graphics:

- `AV Anton`: the title (drawn at 0.84 width for Latin text);
- `AV Oswald Bold`: the credit line, and the title's alternative face;
- `AV Inter Medium`: the title's small line above (kicker);
- `AV Inter`: the tagline under the title. The fonts are embedded in the graphics' parameters when a Draft is built.

The subsets cover Latin text only. Other scripts (Korean included) are drawn in a system font (Apple SD Gothic Neo on macOS, Malgun Gothic on Windows).

Each family's licence text is in `assets/fonts/licenses/`.

| Family | Bundled files | Copyright and Reserved Font Names | Licence |
| --- | --- | --- | --- |
| Anton | `anton` | Copyright 2020 The Anton Project Authors (https://github.com/googlefonts/AntonFont.git). No Reserved Font Name. | SIL OFL 1.1 (`anton-OFL.txt`) |
| Oswald | `oswald-bold` | Copyright 2016 The Oswald Project Authors (https://github.com/googlefonts/OswaldFont). No Reserved Font Name. | SIL OFL 1.1 (`oswald-OFL.txt`) |
| Inter | `inter-medium`, `inter-regular` | Copyright 2020 The Inter Project Authors (https://github.com/rsms/inter). No Reserved Font Name. | SIL OFL 1.1 (`inter-OFL.txt`) |

## Music

<!-- Music section: maintained with dev/build-cues.cjs and assets/cues/LICENSES.csv. -->

`marimba-motif.mp3` (Marimba Motif, the default track) was generated with **Suno** for Cutback and is bundled with the plugin for use in the videos it builds. It was brought to -16.3 LUFS like the other tracks (`dev/build-cues.cjs`); tempo, pitch and structure are unchanged.

The four other bundled tracks in `assets/cues/` are by **HoliznaCC0**, published on the Free Music Archive under **CC0 1.0 Universal** (public domain dedication, https://creativecommons.org/publicdomain/zero/1.0/). Each track page stated "licensed under a CC0 1.0 Universal License" when it was checked on 2026-10-01. CC0 needs no attribution; the records are kept here as proof of the licence. `assets/cues/LICENSES.csv` lists the same tracks with their download URLs and the licence text found on each page.

What we changed: each track was brought to -16.3 LUFS integrated with a static gain and a true-peak limiter at -1 dBTP, and re-encoded from the 48 kHz, 320 kbps download to 44.1 kHz, 192 kbps MP3 (`dev/build-cues.cjs`). Tempo, pitch and structure are unchanged: nothing is time-stretched, pitch-shifted, cut or rearranged. Tempo, first beat, soft-intro start, loudness, onsets and content hash are recorded in `assets/cues/manifest.json`.

| Track | Bundled file | Author | Track page | Licence | Accessed | Tempo |
| --- | --- | --- | --- | --- | --- | --- |
| Marimba Motif | `marimba-motif.mp3` | Suno for Cutback | (generated for Cutback) | Suno (generated for Cutback) | 2026-10-08 | 71 BPM |
| Peaceful Drift (Lofi, Nostalgic, Calm) | `peaceful-drift.mp3` | HoliznaCC0 | https://freemusicarchive.org/music/holiznacc0/public-domain-lofi/peaceful-drift-lofi-nostalgic-calm/ | CC0 1.0 (https://creativecommons.org/publicdomain/zero/1.0/) | 2026-10-01 | 72 BPM |
| Theta Frequency (Lofi, Chill, Calm) | `theta-frequency.mp3` | HoliznaCC0 | https://freemusicarchive.org/music/holiznacc0/public-domain-lofi/theta-frequency-lofi-chill-calm/ | CC0 1.0 (https://creativecommons.org/publicdomain/zero/1.0/) | 2026-10-01 | 70 BPM |
| Before Everything (LoFi, Nostalgic) | `before-everything.mp3` | HoliznaCC0 | https://freemusicarchive.org/music/holiznacc0/public-domain-lofi/before-everything-lofi-nostalgic-mp3/ | CC0 1.0 (https://creativecommons.org/publicdomain/zero/1.0/) | 2026-10-01 | 75 BPM |
| Fractured | `fractured.mp3` | HoliznaCC0 | https://freemusicarchive.org/music/holiznacc0/public-domain-lofi/fractured-1/ | CC0 1.0 (https://creativecommons.org/publicdomain/zero/1.0/) | 2026-10-01 | 71 BPM |

<!-- End of Music section. -->

## Gallery preview footage

`preview.mp4` and `poster.webp` are not installed with the plugin. They show an Archive Vlog build with the default settings (Peaceful Drift from its soft intro, Cinematic style, Cinematic pace, Standard length, Credit shot with the sample name, Cinematic look, Ambient clip sound) on a set of golden-hour Istanbul stock footage, encoded to 960x540. Every clip and photo below is used under the Pexels License (https://www.pexels.com/license/), accessed 2026-10-01; the music is Peaceful Drift by HoliznaCC0 (CC0 1.0, see Music).

| Title | Kind | Author | Source |
|---|---|---|---|
| Sunset View of Maiden's Tower in Istanbul | video | Sururi Ballıdağ Director | https://www.pexels.com/video/sunset-view-of-maiden-s-tower-in-istanbul-35631868/ |
| Sunset at Maiden's Tower in Istanbul | photo | Aydın Kiraz | https://www.pexels.com/photo/sunset-at-maiden-s-tower-in-istanbul-39523207/ |
| Photo of Istanbul at Sunset, Turkey | photo | Halil Fatih Çetin | https://www.pexels.com/photo/photo-of-istanbul-at-sunset-turkey-20577444/ |
| Bosphorus Evening with Ferry and Crowd | video | bilal findikci | https://www.pexels.com/video/bosphorus-evening-with-ferry-and-crowd-34671857/ |
| Sunset View at Istanbul Waterfront Promenade | video | Sururi Ballıdağ Director | https://www.pexels.com/video/sunset-view-at-istanbul-waterfront-promenade-39443869/ |
| Scenic Sunset at Bosphorus Ferry Dock | video | Sururi Ballıdağ Director | https://www.pexels.com/video/scenic-sunset-at-bosphorus-ferry-dock-34321424/ |
| Sunset View of Suleymaniye Mosque Istanbul | video | Tuğba Kuyoğlu | https://www.pexels.com/video/sunset-view-of-suleymaniye-mosque-istanbul-30209847/ |
| Bustling Outdoor Market Scene at Sunset | video | Yaşar Başkurt | https://www.pexels.com/video/bustling-outdoor-market-scene-at-sunset-39315748/ |
| Serene Sunset by the Waterfront with Ferries | video | Sururi Ballıdağ Director | https://www.pexels.com/video/serene-sunset-by-the-waterfront-with-ferries-31492319/ |
| Romantic Sunset View at Istanbul Waterfront | photo | Aydın Kiraz | https://www.pexels.com/photo/romantic-sunset-view-at-istanbul-waterfront-39227045/ |
| Women Enjoying Scenic Istanbul Waterfront View | photo | Serdar Göksu | https://www.pexels.com/photo/women-enjoying-scenic-istanbul-waterfront-view-30984120/ |
| Sunset Over Bosphorus with Istanbul Skyline | photo | Aydın Kiraz | https://www.pexels.com/photo/sunset-over-bosphorus-with-istanbul-skyline-37084105/ |
| Bustling Evening at Istanbul's Historic District | video | Sururi Ballıdağ Director | https://www.pexels.com/video/bustling-evening-at-istanbul-s-historic-district-34948791/ |
| Vibrant City Traffic at Sunset with Mosque Backdrop | video | bilal findikci | https://www.pexels.com/video/vibrant-city-traffic-at-sunset-with-mosque-backdrop-34671859/ |
| Galata Tower and Busy Street Scene at Sunset | video | Ahmed | https://www.pexels.com/video/galata-tower-and-busy-street-scene-at-sunset-39571301/ |
| Busy Istanbul Street at Sunset with Traffic and Public Transport | video | bilal findikci | https://www.pexels.com/video/busy-istanbul-street-at-sunset-with-traffic-and-public-transport-34978691/ |
| Sunset Street Scene with Tram and Pedestrians | video | Yaşar Başkurt | https://www.pexels.com/video/sunset-street-scene-with-tram-and-pedestrians-33535985/ |
| Scenic Bosphorus Ferry Ride at Sunset | video | Sururi Ballıdağ Director | https://www.pexels.com/video/scenic-bosphorus-ferry-ride-at-sunset-35345597/ |
| Scenic View of Eminonu Istanbul at Dusk | video | Sururi Ballıdağ Director | https://www.pexels.com/video/scenic-view-of-eminonu-istanbul-at-dusk-34948793/ |