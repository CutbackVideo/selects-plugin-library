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

<!-- Music section: maintained with dev/build-cues.cjs and assets/cues/LICENSES.csv. -->

The four bundled tracks in `assets/cues/` are by **HoliznaCC0**, published on the Free Music Archive under **CC0 1.0 Universal** (public domain dedication, https://creativecommons.org/publicdomain/zero/1.0/). Each track page stated "licensed under a CC0 1.0 Universal License" when it was checked on 2026-10-01. CC0 needs no attribution; the records are kept here as proof of the licence. `assets/cues/LICENSES.csv` lists the same tracks with their download URLs and the licence text found on each page.

What we changed: each track was brought to -16.3 LUFS integrated with a static gain and a true-peak limiter at -1 dBTP, and re-encoded from the 48 kHz, 320 kbps download to 44.1 kHz, 192 kbps MP3 (`dev/build-cues.cjs`). Tempo, pitch and structure are unchanged: nothing is time-stretched, pitch-shifted, cut or rearranged. Tempo, first beat, soft-intro start, loudness, onsets and content hash are recorded in `assets/cues/manifest.json`.

| Track | Bundled file | Author | Track page | Licence | Accessed | Tempo |
| --- | --- | --- | --- | --- | --- | --- |
| Peaceful Drift (Lofi, Nostalgic, Calm) | `peaceful-drift.mp3` | HoliznaCC0 | https://freemusicarchive.org/music/holiznacc0/public-domain-lofi/peaceful-drift-lofi-nostalgic-calm/ | CC0 1.0 (https://creativecommons.org/publicdomain/zero/1.0/) | 2026-10-01 | 72 BPM |
| Theta Frequency (Lofi, Chill, Calm) | `theta-frequency.mp3` | HoliznaCC0 | https://freemusicarchive.org/music/holiznacc0/public-domain-lofi/theta-frequency-lofi-chill-calm/ | CC0 1.0 (https://creativecommons.org/publicdomain/zero/1.0/) | 2026-10-01 | 70 BPM |
| Before Everything (LoFi, Nostalgic) | `before-everything.mp3` | HoliznaCC0 | https://freemusicarchive.org/music/holiznacc0/public-domain-lofi/before-everything-lofi-nostalgic-mp3/ | CC0 1.0 (https://creativecommons.org/publicdomain/zero/1.0/) | 2026-10-01 | 75 BPM |
| Fractured | `fractured.mp3` | HoliznaCC0 | https://freemusicarchive.org/music/holiznacc0/public-domain-lofi/fractured-1/ | CC0 1.0 (https://creativecommons.org/publicdomain/zero/1.0/) | 2026-10-01 | 71 BPM |

<!-- End of Music section. -->

## Gallery preview footage

`preview.mp4` and `poster.webp` are not installed with the plugin. They show a Archive Vlog build with the default settings (Bedroom Pop 108, A small glimpse title, Quick, Beat punch, Start at the hook, Standard length) made from these clips and photos under the Pexels License (https://www.pexels.com/license/), which allows free use and modification without attribution; they are credited here anyway.

| File | Title | Author | Source |
|---|---|---|---|
| book-01-landscape.mp4 | Top View of a Book and Coffee | Micheile Henderson | https://www.pexels.com/video/top-view-of-a-book-and-coffee-6822003/ |
| book-02-landscape.mp4 | A Person Flipping Pages of a Book | Micheile Henderson | https://www.pexels.com/video/a-person-flipping-pages-of-a-book-6822006/ |
| book-04-landscape.mp4 | Serene Spring Reading with Lilacs | Stefanie Jockschat | https://www.pexels.com/video/serene-spring-reading-with-lilacs-31994349/ |
| cafe-01-landscape.mp4 | Cozy Modern Cafe Interior with Sunlight | LayG Traveller | https://www.pexels.com/video/cozy-modern-cafe-interior-with-sunlight-36532067/ |
| cafe-02-landscape.mp4 | Modern Cafe Interior with Street View | Paul Neil | https://www.pexels.com/video/modern-cafe-interior-with-street-view-36461686/ |
| cafe-03-landscape.mp4 | Pouring Fresh Coffee into a Mug on a Sunny Morning | Rodrigo Ortega | https://www.pexels.com/video/pouring-fresh-coffee-into-a-mug-on-a-sunny-morning-39559760/ |
| drink-02-landscape.mp4 | Person Mixing Iced Coffee | Charlotte May | https://www.pexels.com/video/person-mixing-iced-coffee-5928832/ |
| flowers-01-landscape.mp4 | Basket Full of Tulips | Gustavo Fring | https://www.pexels.com/video/basket-full-of-tulips-7101059/ |
| flowers-02-landscape.mp4 | Video of Flowers on a Table | Anna Shvets | https://www.pexels.com/video/video-of-flowers-on-a-table-5893637/ |
| flowers-04-landscape.mp4 | Charming Outdoor Flower Market with Colorful Blooms | Anh Nguyen | https://www.pexels.com/video/charming-outdoor-flower-market-with-colorful-blooms-37626637/ |
| food-03-landscape.mp4 | Delicious Breakfast Pastries on Wooden Table | Anh Nguyen | https://www.pexels.com/video/delicious-breakfast-pastries-on-wooden-table-32710205/ |
| park-01-landscape.mp4 | Close-up Shot of a Person Wearing White Sneakers | Hanna Pad | https://www.pexels.com/video/close-up-shot-of-a-person-wearing-white-sneakers-8055346/ |
| park-02-landscape.mp4 | Picnic in the Park | MART PRODUCTION | https://www.pexels.com/video/picnic-in-the-park-8120853/ |
| photo-book-01.jpg | Cozy Reading with Coffee on Wooden Table | Eddie O. | https://www.pexels.com/photo/cozy-reading-with-coffee-on-wooden-table-39611683/ |
| photo-cafe-01.jpg | Sunlight over Cafe Interior | Dũng Phạm | https://www.pexels.com/photo/sunlight-over-cafe-interior-18405036/ |
| photo-drink-01.jpg | Refreshing Iced Coffee on a Sunny Day | azra melek | https://www.pexels.com/photo/refreshing-iced-coffee-on-a-sunny-day-37603073/ |
| photo-flowers-01.jpg | Colorful Spring Flower Bouquets in Outdoor Market | ilayda 0700 | https://www.pexels.com/photo/colorful-spring-flower-bouquets-in-outdoor-market-31497181/ |
| photo-food-01.jpg | Delicious Breakfast Croissants with Coffee | Shivam Patil | https://www.pexels.com/photo/delicious-breakfast-croissants-with-coffee-34800842/ |
| photo-park-01.jpg | A Bag and a Hat Lying on a Blanket | Tho Ta | https://www.pexels.com/photo/a-bag-and-a-hat-lying-on-a-blanket-18668693/ |
| photo-street-01.jpg | Basket with Flowers on a Bicycle | Melike B | https://www.pexels.com/photo/basket-with-flowers-on-a-bicycle-8441056/ |
| photo-transit-01.jpg | Urban City View Framed by Train Window | Quý Nguyễn | https://www.pexels.com/photo/urban-city-view-framed-by-train-window-33972392/ |
| street-01-landscape.mp4 | Casual Stroll on Urban Sidewalk in Daylight | Airam Dato-on | https://www.pexels.com/video/casual-stroll-on-urban-sidewalk-in-daylight-33632016/ |
| street-04-landscape.mp4 | Charming European Street with Busy Shops | Furkan Aktaş | https://www.pexels.com/video/charming-european-street-with-busy-shops-39391962/ |
| transit-02-landscape.mp4 | Scenic Train Journey Through Japanese Cityscape | Rupesh Newar | https://www.pexels.com/video/scenic-train-journey-through-japanese-cityscape-31784578/ |
