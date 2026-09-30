# Third-party components

- React and Remotion are imported from the Selects host environment. This package does not redistribute those runtimes; the host's dependency versions and applicable terms govern their use.
- ffmpeg, ffprobe and Node.js are not bundled. When they are installed, the panel runs them through the Selects shell for music previews and your own music.
- Users supply their own photos, footage and, optionally, their own music. No sample photos, recordings, reference footage or model weights are included.

## Fonts

The letter fonts are bundled in `assets/fonts/` as base64-encoded WOFF2 text (`tpl-*.woff2.b64`). Each is a **subset** of the Google Fonts release (A-Z, a-z, 0-9, `. , ! ? & ' -` and the heart sign), with hinting removed. Because a subset is a Modified Version under the SIL Open Font License, every font is **renamed** with a `TPL ` prefix (for example `TPL Didone`) so that no Reserved Font Name is used. The same renaming applies to the Apache-licensed Special Elite for consistency. The fonts are embedded in the Ransom letters graphic's parameters when a Draft is built. `assets/fonts/looks.json` maps the renamed faces to the letter looks.

Each family's licence text is in `assets/fonts/licenses/`.

| Family | Bundled file | Renamed to | Copyright | Licence |
| --- | --- | --- | --- | --- |
| Abril Fatface | `tpl-didone` | TPL Didone | Copyright (c) 2011, TypeTogether (www.type-together.com), with Reserved Font Names "Abril" and "Abril Fatface" | SIL OFL 1.1 (`abrilfatface-OFL.txt`) |
| Bebas Neue | `tpl-condensed` | TPL Condensed | Copyright © 2010 by Dharma Type. | SIL OFL 1.1 (`bebasneue-OFL.txt`) |
| DM Serif Display | `tpl-serif` | TPL Serif | Copyright 2014-2018 Adobe (http://www.adobe.com/), with Reserved Font Name 'Source'. All Rights Reserved. Source is a trademark of Adobe in the United States and/or other countries. Copyright 2019 Google LLC. | SIL OFL 1.1 (`dmserifdisplay-OFL.txt`) |
| Alfa Slab One | `tpl-slab` | TPL Slab | Copyright 2016 The Alfa Slab One Project Authors (http://www.jmsole.cl \| info@jmsole.cl), with Reserved Font Name "Alfa Slab". | SIL OFL 1.1 (`alfaslabone-OFL.txt`) |
| Archivo Black | `tpl-black` | TPL Black | Copyright 2017 The Archivo Black Project Authors (https://github.com/Omnibus-Type/ArchivoBlack) | SIL OFL 1.1 (`archivoblack-OFL.txt`) |
| Special Elite | `tpl-typewriter` | TPL Typewriter | See the font's own name table; the Apache licence text carries no copyright notice. | Apache License 2.0 (`specialelite-Apache-2.0.txt`) |

## Music

The bundled tracks in `assets/cues/` were generated with ElevenLabs Music v2.5 (model `model_v1_ZWxldmVubGFicy9tdXNpYy92Mi41`) through the Selects generated-media service. Bedroom Pop Love, Slow R&B Glow and First Love Guitar were generated for Torn Paper Love; each is a 65-second instrumental. Easy Sunday Lo-fi and Sunny Soul Strut were generated for City Weekend Vlog and are reused here unchanged; each is a 40-second instrumental. Every track is loudness-normalized to -14 LUFS. Tempo, first beat, usable end and content hash are recorded in `assets/cues/manifest.json`.

The tracks are bundled for use in the videos this plugin builds and are not for redistribution as standalone tracks.

| Track | File | Tempo |
| --- | --- | --- |
| Bedroom Pop Love | `bedroom-pop-love.mp3` | 86 BPM |
| Slow R&B Glow | `slow-rnb-glow.mp3` | 84 BPM |
| First Love Guitar | `first-love-guitar.mp3` | 88 BPM |
| Easy Sunday Lo-fi | `easy-sunday-lofi.mp3` | 88 BPM |
| Sunny Soul Strut | `sunny-soul-strut.mp3` | 99 BPM |

## Gallery preview photos (Pexels License)

`preview.mp4` and `poster.webp` are not installed with the plugin. They show a Torn Paper Love build made from these Pexels photos under the Pexels License (https://www.pexels.com/license/):

- Photo by Amine İspir: https://www.pexels.com/photo/couple-hugging-on-the-street-13639163/
- Photo by Satumbo 9: https://www.pexels.com/photo/young-couple-taking-a-selfie-photo-18262856/
- Photo by Jamaal Hutchinson: https://www.pexels.com/photo/couple-laughing-and-hugging-18657552/
- Photo by David Salazar Caviedes: https://www.pexels.com/photo/side-view-of-a-couple-standing-face-to-face-and-smiling-21898584/
- Photo by Jorge Zaldívar Marroquín: https://www.pexels.com/photo/romantic-couple-embracing-at-sunset-beach-30716714/
- Photo by Jonathan Borba: https://www.pexels.com/photo/photo-of-couple-about-to-kiss-3156992/
- Photo by DANFER AZA yamit: https://www.pexels.com/photo/romantic-couple-embracing-at-night-outdoors-32206384/
- Photo by Polina Zimmerman: https://www.pexels.com/photo/couple-laughing-together-3958854/
- Photo by Polina Tankilevitch: https://www.pexels.com/photo/a-couple-pointing-and-laughing-7741598/
- Photo by Matheus Bertelli: https://www.pexels.com/photo/couple-smiling-at-each-other-1881091/
- Photo by Fernanda De Freitas: https://www.pexels.com/photo/laughing-couple-lying-on-blanket-26777363/
- Photo by Vitaly Gariev: https://www.pexels.com/photo/couple-taking-selfie-in-cozy-bedroom-setting-36697524/
- Photo by Gustavo Fring: https://www.pexels.com/photo/photo-of-couple-taking-selfie-4148953/
- Photo by Helena Lopes: https://www.pexels.com/photo/photo-of-couple-smiling-4279120/
- Photo by Leeloo The First: https://www.pexels.com/photo/close-up-shot-of-people-laughing-4629922/
- Photo by Anna Tarazevich: https://www.pexels.com/photo/man-kissing-a-woman-on-the-cheek-5080651/
- Photo by Samson Katt: https://www.pexels.com/photo/smiling-asian-couple-taking-selfie-on-smartphone-on-bench-5225487/
- Photo by Uriel Mont: https://www.pexels.com/photo/black-gay-couple-hugging-in-city-street-at-night-6315280/
- Photo by Liliana Drew: https://www.pexels.com/photo/a-couple-laughing-together-8554867/
- Photo by Maksim Goncharenok: https://www.pexels.com/photo/couple-face-to-face-9930077/
