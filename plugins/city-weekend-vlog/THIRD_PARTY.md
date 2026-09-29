# Third-party components

- React and Remotion are imported from the Selects host environment. This package does not redistribute those runtimes; the host's dependency versions and applicable terms govern their use.
- ffmpeg, ffprobe and Node.js are not bundled. When they are installed, the panel runs them through the Selects shell for music previews and your own music.
- Users supply their own footage and, optionally, their own music. No sample recordings, reference footage or model weights are included.

## Fonts

The title fonts are bundled in `assets/fonts/` as base64-encoded WOFF2 text (`*.woff2.b64`). Each is a **Latin subset** of the Google Fonts release, with hinting removed and, for variable families, a single static weight instance. Because a subset is a Modified Version under the SIL Open Font License, every font is **renamed** with a `CWV ` prefix (for example `CWV Playfair Display`) so that no Reserved Font Name is used. The same renaming applies to the Apache-licensed Yellowtail for consistency. The fonts are embedded in the title graphic's parameters when a Draft is built.

Each family's licence text is in `assets/fonts/licenses/`.

| Family | Bundled files | Copyright | Licence |
| --- | --- | --- | --- |
| Yellowtail | `yellowtail` | Copyright (c) 2011 by Brian J. Bonislawsky DBA Astigmatic (AOETI). All rights reserved. | Apache License 2.0 (`Apache-2.0.txt`) |
| Instrument Serif | `instrument-serif`, `instrument-serif-italic` | Copyright 2022 The Instrument Serif Project Authors (https://github.com/Instrument/instrument-serif) | SIL OFL 1.1 (`instrumentserif-OFL.txt`) |
| Sacramento | `sacramento` | Copyright (c) 2012, Brian J. Bonislawsky DBA Astigmatic (AOETI) (astigma@astigmatic.com), with Reserved Font Names 'Sacramento' | SIL OFL 1.1 (`sacramento-OFL.txt`) |
| Great Vibes | `great-vibes` | Copyright 2015 The Great Vibes Pro Project Authors (https://github.com/googlefonts/great-vibes) | SIL OFL 1.1 (`greatvibes-OFL.txt`) |
| Playfair Display | `playfair-display`, `playfair-display-italic` | Copyright 2017 The Playfair Display Project Authors (https://github.com/clauseggers/Playfair-Display), with Reserved Font Name "Playfair Display" | SIL OFL 1.1 (`playfairdisplay-OFL.txt`) |
| Parisienne | `parisienne` | Copyright (c) 2012 by Brian J. Bonislawsky DBA Astigmatic (AOETI) (astigma@astigmatic.com), with Reserved Font Names "Parisienne" | SIL OFL 1.1 (`parisienne-OFL.txt`) |
| Lobster | `lobster` | Copyright 2010 The Lobster Project Authors (https://github.com/impallari/The-Lobster-Font), with Reserved Font Name "Lobster" | SIL OFL 1.1 (`lobster-OFL.txt`) |
| Abril Fatface | `abril-fatface` | Copyright (c) 2011, TypeTogether (www.type-together.com), with Reserved Font Names "Abril" and "Abril Fatface" | SIL OFL 1.1 (`abrilfatface-OFL.txt`) |
| Pacifico | `pacifico` | Copyright 2018 The Pacifico Project Authors (https://github.com/googlefonts/Pacifico) | SIL OFL 1.1 (`pacifico-OFL.txt`) |
| Bebas Neue | `bebas-neue` | Copyright © 2010 by Dharma Type. | SIL OFL 1.1 (`bebasneue-OFL.txt`) |
| Kaushan Script | `kaushan-script` | Copyright (c) 2011, Pablo Impallari (www.impallari.com\|impallari@gmail.com), Copyright (c) 2011, Igino Marini. (www.ikern.com\|mail@iginomarini.com), with Reserved Font Name Kaushan Script. | SIL OFL 1.1 (`kaushanscript-OFL.txt`) |
| DM Serif Display | `dm-serif-display-italic` | Copyright 2014-2018 Adobe (http://www.adobe.com/), with Reserved Font Name 'Source'. All Rights Reserved. Source is a trademark of Adobe in the United States and/or other countries. Copyright 2019 Google LLC. | SIL OFL 1.1 (`dmserifdisplay-OFL.txt`) |
| Caveat | `caveat` | Copyright 2014 The Caveat Project Authors (https://github.com/googlefonts/caveat) | SIL OFL 1.1 (`caveat-OFL.txt`) |
| Antonio | `antonio` | Copyright 2013 The Antonio Project Authors (https://github.com/googlefonts/antonioFont) | SIL OFL 1.1 (`antonio-OFL.txt`) |
| Allura | `allura` | Copyright 2010 The Allura Project Authors (https://github.com/googlefonts/allura) | SIL OFL 1.1 (`allura-OFL.txt`) |
| Cormorant Garamond | `cormorant-garamond`, `cormorant-garamond-italic` | Copyright 2015 the Cormorant Project Authors (github.com/CatharsisFonts/Cormorant) | SIL OFL 1.1 (`cormorantgaramond-OFL.txt`) |
| Mrs Saint Delafield | `mrs-saint-delafield` | Copyright (c) 2011 Alejandro Paul (sudtipos@sudtipos.com), with Reserved Font Name "Mrs Saint Delafield" | SIL OFL 1.1 (`mrssaintdelafield-OFL.txt`) |

The Yellowtail copyright line is taken from the font's own name table, since the Apache licence text carries no copyright notice.

## Music

The seven bundled tracks in `assets/cues/` were generated for this plugin with ElevenLabs Music v2.5 (model `model_v1_ZWxldmVubGFicy9tdXNpYy92Mi41`) through the Selects generated-media service. Each is a 40-second instrumental, loudness-normalized to -14 LUFS. Tempo, first beat, usable end and content hash are recorded in `assets/cues/manifest.json`.

The tracks are bundled for use in the videos this plugin builds and are not for redistribution as standalone tracks.

| Track | File | Tempo |
| --- | --- | --- |
| Sunny Soul Strut | `sunny-soul-strut.mp3` | 99 BPM |
| Golden Hour Disco | `golden-hour-disco.mp3` | 104 BPM |
| Easy Sunday Lo-fi | `easy-sunday-lofi.mp3` | 88 BPM |
| Weekend Indie Pop | `weekend-indie-pop.mp3` | 112 BPM |
| Brooklyn Boom Bap | `brooklyn-boom-bap.mp3` | 90 BPM |
| Downtown Funk Break | `downtown-funk-break.mp3` | 98 BPM |
| Sunset Afro House | `sunset-afro-house.mp3` | 115 BPM |

Brooklyn Boom Bap, Downtown Funk Break and Sunset Afro House were added on 2026-09-29 as drum-forward tracks. They were generated in a Selects chat with the same model (`force_instrumental: true`, `music_length_ms: 40000`, `output_format: mp3_44100_128`) from these prompts, then normalized to -14 LUFS and re-encoded at 192 kbps like the others (Sunset Afro House with two-pass loudness normalization, which reaches -14.9 LUFS under the -1.5 dBTP ceiling):

- Brooklyn Boom Bap: "Upbeat instrumental boom-bap neo-soul groove at exactly 90 BPM in 4/4, warm, sunny city-weekend mood, no vocals. Drums are front and center: a fat, punchy kick and a loud, snappy snare on beats 2 and 4 for a clear backbeat, with crisp 16th-note hi-hats kept tight and on the grid (not swung). The drums start within the first second with a strong kick downbeat on bar 1, with no fade-in and no ambient intro. Add a short drum fill at the end of every 4 bars. Keep the tempo steady with no rubato or tempo changes. Rhodes chords, a round bass line and light guitar licks sit underneath the drums. The track is 40 seconds long."
- Downtown Funk Break: "Upbeat instrumental funk breakbeat at exactly 98 BPM in 4/4, sunny city-weekend mood, no vocals. Drums are the loudest element in the mix: a prominent, punchy kick and a hard, cracking snare on beats 2 and 4 for a clear backbeat, with crisp, bright 16th-note hi-hats running throughout. The drums start within the first second with a strong downbeat on bar 1, with no fade-in and no ambient intro. Add a short snare and tom drum fill at the end of every 4 bars. Keep the tempo steady and quantized, with no rubato, tempo changes or breakdowns. Tight slap bass, wah guitar stabs and short brass hits sit underneath the drums. The track is 40 seconds long."
- Sunset Afro House: "Upbeat instrumental afro-house-lite at exactly 115 BPM in 4/4, sunny, energetic city-weekend mood, no vocals. Drums and percussion are the loudest elements: a prominent, punchy kick on every beat, a crisp snare and clap on beats 2 and 4 for a clear backbeat, crisp 16th-note shakers and hi-hats, and bright congas and bongos. The drums start within the first second with a strong downbeat on bar 1, with no fade-in and no ambient intro. Add a short percussion and tom fill at the end of every 4 bars. Keep the tempo steady with no rubato, tempo changes or long breakdowns. Marimba and plucked synth riffs and a warm bass sit underneath the drums. The track is 40 seconds long."
