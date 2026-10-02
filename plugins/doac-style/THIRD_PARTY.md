# Third-party components

- React and Remotion are imported from the Selects host environment. This package does not redistribute those runtimes.
- On macOS the caption engine runs on Python, Pillow, NumPy and SciPy, which the panel installs from PyPI on first use (`approved/requirements.txt`); they are not part of this package.

## Caption engine on Windows (`approved/web/`)

On Windows the same caption engine runs inside the panel. `approved/web/engine.js` is a JavaScript port of this package's own Python engine (`approved/engine.py`, `approved/compile-captions.py`, `approved/geometry.py` and `approved/native/`). It draws through `approved/web/raster.wasm.b64`, a base64-encoded WebAssembly module compiled by `dev/raster/build.sh` from pinned sources:

| Component | Version | Used for | Licence |
| --- | --- | --- | --- |
| FreeType | 2.14.3 | glyph loading, hinting, stroking and rendering | FreeType License (`approved/web/licenses/FreeType-FTL.txt`) |
| Pillow | 12.3.0 | `libImaging` resampling, blur, paste, crop and bounding box; the text layout of `_imagingft.c`, ported in `dev/raster/raster.c` | MIT-CMU License (`approved/web/licenses/Pillow-LICENSE.txt`) |

Portions of this software are copyright © 2026 The FreeType Project (https://freetype.org). All rights reserved.

`engine.js` also reproduces two numerical routines exactly, so its frames match the Python engine's:

| Component | Version | Used for | Licence |
| --- | --- | --- | --- |
| NumPy | 2.4.6 | `default_rng` (SeedSequence, PCG64), `Generator.choice` and `Generator.normal`, with NumPy's ziggurat tables | BSD 3-Clause (`approved/web/licenses/NumPy-LICENSE.txt`) |
| SciPy | 1.17.1 | `ndimage.gaussian_filter` (kernel and `correlate1d` in `reflect` mode) | BSD 3-Clause (`approved/web/licenses/SciPy-LICENSE.txt`) |

## Fonts

| Family | Bundled files | Used for | Licence |
| --- | --- | --- | --- |
| Permanent Marker | `approved/native/fonts/permanentmarker/PermanentMarker-Regular.ttf.b64` | template 11 | Apache License 2.0 (`approved/native/fonts/permanentmarker/LICENSE.txt`) |
| Arimo | `approved/native/fonts/arimo/Arimo-{Regular,Medium,Bold}.ttf.b64` | Windows only: in place of Helvetica and Helvetica Neue, which Windows does not have, and of any system face below that is missing | SIL Open Font License 1.1, Copyright 2020 The Arimo Project Authors (https://github.com/googlefonts/arimo), no Reserved Font Name (`approved/native/fonts/arimo/OFL.txt`) |

The Arimo files are static instances (weights 400, 500 and 700) of the Google Fonts variable font, subset to Latin (Basic Latin, Latin-1, Latin Extended-A and common punctuation). A subset is a Modified Version under the SIL Open Font License.

The other faces the approved templates name (Arial, Arial Bold, Arial Bold Italic, Arial Black, Arial Narrow Bold, Georgia Bold, Times New Roman) are not bundled. The Python engine reads the macOS copies on macOS; the Windows panel reads the copies in the Windows Fonts folder (Arial Narrow comes with Microsoft Office; without it Arimo Bold is used). Apple SD Gothic Neo, also listed in `approved/font-requirements.json`, only labels the engine's debug view, which caption builds never draw.
