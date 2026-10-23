# Third-party material

## Font (`fonts/`)

Pretendard 1.3.9 (https://github.com/orioncactus/pretendard), Copyright (c) 2021,
Kil Hyung-jin, with Reserved Font Name Pretendard, under the SIL Open Font
License 1.1 (`fonts/OFL-pretendard.txt`).

`fonts/PretendardVariable.ttf.gz.b64` is `public/variable/PretendardVariable.ttf`
from the release archive `Pretendard-1.3.9.zip`, unmodified, gzip-compressed and
base64 encoded (TrueType SHA-256
`3090ccde0442bb347aa7685d9ba8b17436a60682df6e8f92a9a670de14056e22`).

Each Motion Graphic carries a subset of that font holding only the characters
it shows, made in the panel with HarfBuzz. A subset is a Modified Version under
the licence, so every subset is renamed "NM Sans" (every name record that
carries the family name); the packaged file itself keeps its name.

## Font subsetter (`fonts/harfbuzz-subset.wasm.gz.b64`)

`dist/harfbuzz-subset.wasm` from the npm package harfbuzzjs 1.6.2
(https://github.com/harfbuzz/harfbuzzjs), gzip-compressed and base64 encoded
(SHA-256 `5fc12cf6a843a703cbab360169c681704416f330d3979e7e5a3f4b050efbb720`).
harfbuzzjs is under the MIT licence (`fonts/LICENSE-harfbuzzjs.txt`); HarfBuzz
itself is under its Old MIT licence (`fonts/COPYING-harfbuzz.txt`). The panel
checks the decoded bytes against that hash before use. It is gzip-compressed
because the plain base64 of these bytes happens to contain an `AKIA...` run that
`tools/check_public.py` flags as an access token.

## Code

`src/fonts/hbSubset.ts`, `src/fonts/sfnt.ts` and `src/fonts/renameFamily.ts` are
copied from `plugins/eo-shorts/src/mg/` in this repository.
