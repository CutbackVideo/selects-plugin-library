# Third-party material

## Music (`assets/music/`)

Twelve instrumental tracks, all dedicated to the public domain under CC0 1.0 by
their artists on Free Music Archive. Attribution is not required; artists and
sources are listed for traceability. A short places one of them as its own clip
named `EO Music - <Title> (<Artist>, CC0).m4a`, which an editor can replace or
delete.

Each file is an excerpt of the recording: 100-105 s from its first sound, cut on
a bar start, with a constant gain, a 2 s fade-out and AAC encoding
(`assets/music/provenance.json` records the source file hashes and the exact
processing). The licence statement read on each source page is in
`assets/music/licenses/<id>.txt`; `assets/music/licenses/CC0-1.0.txt` is the CC0
1.0 legal code.

| id | Title | Artist | Source page |
|---|---|---|---|
| `m01` | Drama | HoliznaCC0 | https://freemusicarchive.org/music/holiznacc0/power-pop/drama/ |
| `m02` | Dear Mr Super Computer | HoliznaCC0 | https://freemusicarchive.org/music/holiznacc0/power-pop/dear-mr-super-computer/ |
| `m03` | Make Money | HoliznaCC0 | https://freemusicarchive.org/music/holiznacc0/bassic/make-money/ |
| `m04` | Funky Pop | HoliznaCC0 | https://freemusicarchive.org/music/holiznacc0/power-pop/funky-pop/ |
| `m05` | Make Funk | HoliznaCC0 | https://freemusicarchive.org/music/holiznacc0/bassic/make-funk/ |
| `m06` | One Cool Minute | Loyalty Freak Music | https://freemusicarchive.org/music/Loyalty_Freak_Music/MINIMAL_AMBIENT_BOUNCE/Loyalty_Freak_Music_-_MINIMAL_AMBIENT_BOUNCE_-_02_One_Cool_Minute/ |
| `m07` | Let's be serious a second | Loyalty Freak Music | https://freemusicarchive.org/music/Loyalty_Freak_Music/INSTRUMENTAL_RB_BEATS_TO_SING_OR_RAP_ON/Loyalty_Freak_Music_-_INSTRUMENTAL_RB_BEATS_TO_SING_OR_RAP_ON_-_11_Lets_be_serious_a_second/ |
| `m08` | Coins | HoliznaCC0 | https://freemusicarchive.org/music/holiznacc0/gamer-beats/coins/ |
| `m09` | Hope On Repeat | HoliznaCC0 | https://freemusicarchive.org/music/holiznacc0/spring-woke-me-up/hope-on-repeat/ |
| `m10` | Static Shoes | Loyalty Freak Music | https://freemusicarchive.org/music/Loyalty_Freak_Music/MINIMAL_AMBIENT_BOUNCE/Loyalty_Freak_Music_-_MINIMAL_AMBIENT_BOUNCE_-_04_Static_Shoes/ |
| `m11` | Toy Box | HoliznaCC0 | https://freemusicarchive.org/music/holiznacc0/spring-woke-me-up/toy-box/ |
| `m12` | Projector Screen | HoliznaCC0 | https://freemusicarchive.org/music/holiznacc0/public-domain-lofi/projector-screen-lofi-happy-mp3/ |

## Sound effects (`assets/sfx/`)

Fifteen short cues from Kenney's sound packs, licensed CC0 1.0 (public domain
dedication; attribution not required). Each is the pack's OGG decoded to WAV
with every sample kept (`assets/sfx/provenance.json`), placed as its own clip
named `EO SFX - <name> (Kenney, CC0).wav`. The packs' own licence files are
included unchanged.

| Pack | Cues | Source page | Licence file |
|---|---|---|---|
| Kenney Casino Audio 1.1 | 10 | https://kenney.nl/assets/casino-audio | `assets/sfx/licenses/Kenney-Casino-Audio-CC0.txt` |
| Kenney Impact Sounds 1.0 | 3 | https://kenney.nl/assets/impact-sounds | `assets/sfx/licenses/Kenney-Impact-Sounds-CC0.txt` |
| Kenney Interface Sounds 1.0 | 2 | https://kenney.nl/assets/interface-sounds | `assets/sfx/licenses/Kenney-Interface-Sounds-CC0.txt` |

## Fonts (`fonts/`)

The typefaces the two film styles set type in, all under the SIL Open Font
License 1.1. Each font is stored as its TrueType file, gzip-compressed, as
base64 text (`<name>.ttf.gz.b64`); Urbanist is the TrueType decoded from the
project's WOFF2 release. `fonts/fonts.json` lists every file with the hashes of
its source and of the TrueType.

| Family | Files | Project | Licence file |
|---|---|---|---|
| Urbanist | `urbanist-complete.ttf.gz.b64` | https://github.com/coreyhu/Urbanist | `fonts/OFL-urbanist.txt` |
| Poppins | `Poppins-{Light,Regular,Medium,SemiBold,Bold}.ttf.gz.b64` | https://github.com/itfoundry/Poppins | `fonts/OFL-poppins.txt` |
| Playfair | `Playfair-Italic-opsz-wdth-wght.ttf.gz.b64` | https://github.com/googlefonts/Playfair | `fonts/OFL-playfair2.txt` |
| Playfair Display | `playfair-italic-wght.ttf.gz.b64` | https://github.com/clauseggers/Playfair-Display | `fonts/OFL-playfair.txt` |
| DM Sans | `dmsans-wght.ttf.gz.b64` | https://github.com/googlefonts/dm-fonts | `fonts/OFL-dmsans.txt` |
| Besley | `besley-italic-wght.ttf.gz.b64` | https://github.com/indestructible-type/Besley | `fonts/OFL-besley.txt` |
| Newsreader | `Newsreader-Italic-opsz-wght.ttf.gz.b64` | https://github.com/productiontype/Newsreader | `fonts/OFL-newsreader.txt` |
| Gloock | `Gloock-Regular.ttf.gz.b64` | https://github.com/duartp/gloock | `fonts/OFL-gloock.txt` |

Each scene's Motion Graphic carries subsets of the fonts it uses (only the
characters on screen), made in the panel with HarfBuzz. A subset is a Modified
Version under the licence. Playfair Display is published with the Reserved Font
Name "Playfair Display", so its subsets are renamed "EO Serif" (every name
record except the copyright notice and the licence); the packaged file itself is
unmodified and keeps its name. The other families reserve no name.

## Code

`panel.tsx` is built from this plugin's sources; React comes from Selects. Parts
of those sources are ports of the following code, whose notices apply to
`panel.tsx` as well.

- `engine/compiler/libm.mjs` ports `cos` from fdlibm and `cbrt` from FreeBSD
  msun (`s_cbrt.c`, optimized by Bruce D. Evans):

  ```
  Copyright (C) 1993 by Sun Microsystems, Inc. All rights reserved.

  Developed at SunSoft, a Sun Microsystems, Inc. business.
  Permission to use, copy, modify, and distribute this
  software is freely granted, provided that this notice
  is preserved.
  ```

- `src/images/lanczos.ts` reimplements Pillow's Lanczos resampling and alpha
  premultiplication (`Resample.c`, `Convert.c`), MIT-CMU License:

  ```
  The Python Imaging Library (PIL) is

      Copyright © 1997-2011 by Secret Labs AB
      Copyright © 1995-2011 by Fredrik Lundh and contributors

  Pillow is the friendly PIL fork. It is

      Copyright © 2010 by Jeffrey A. Clark and contributors

  Like PIL, Pillow is licensed under the open source MIT-CMU License:

  By obtaining, using, and/or copying this software and/or its associated
  documentation, you agree that you have read, understood, and will comply
  with the following terms and conditions:

  Permission to use, copy, modify and distribute this software and its
  documentation for any purpose and without fee is hereby granted,
  provided that the above copyright notice appears in all copies, and that
  both that copyright notice and this permission notice appear in supporting
  documentation, and that the name of Secret Labs AB or the author not be
  used in advertising or publicity pertaining to distribution of the software
  without specific, written prior permission.

  SECRET LABS AB AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS
  SOFTWARE, INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS.
  IN NO EVENT SHALL SECRET LABS AB OR THE AUTHOR BE LIABLE FOR ANY SPECIAL,
  INDIRECT OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
  LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE
  OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
  PERFORMANCE OF THIS SOFTWARE.
  ```

- `src/stages/sound/loudnessMeter.ts` uses the K-weighting filter of
  libebur128 (ITU-R BS.1770 / EBU R 128 loudness), MIT License:

  ```
  Copyright (c) 2011 Jan Kokemüller

  Permission is hereby granted, free of charge, to any person obtaining a copy
  of this software and associated documentation files (the "Software"), to deal
  in the Software without restriction, including without limitation the rights
  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  copies of the Software, and to permit persons to whom the Software is
  furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in
  all copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
  THE SOFTWARE.
  ```

## Downloaded on first use (not in this package)

- harfbuzzjs 1.6.2 (`harfbuzz-subset.wasm`, MIT licence; HarfBuzz itself is
  under its Old MIT licence), the font subsetter, from the npm CDN.

The font subsetter is checked against a pinned SHA-256 before use. YuNet and native ONNX Runtime are supplied by the separately installed `selects-ai-runtime`; see its third-party notices.

## Media found or made per short

- B-roll clips come from Pexels and Pixabay through Selects' stock search,
  under the Pexels and Pixabay content licences. The panel lists each clip's
  creator.
- Photos of named people come from Wikimedia Commons, only under CC0, public
  domain or CC BY, with a credit line naming the author and the licence and
  that the photo was modified (cropped).
- Pictures are generated per short through Selects' generation service.
