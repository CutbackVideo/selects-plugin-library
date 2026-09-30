#!/usr/bin/env bash
# plugins/torn-paper-love/dev/build-fonts.sh
# Dev-only: download Google Fonts sources, subset to the chip charset, rename to `TPL ...`,
# write WOFF2 as base64 text, fetch each family's licence and regenerate looks.json.
# Needs uv (fonttools + brotli are fetched on demand). Downloads go to $TMPDIR.
set -euo pipefail
DEV="$(cd "$(dirname "$0")" && pwd)"
OUT="$DEV/../assets/fonts"
WORK="${TMPDIR:-/tmp}/tpl-fonts-src"; mkdir -p "$OUT/licenses" "$WORK"
RAW=https://raw.githubusercontent.com/google/fonts/main
PYRUN() { uv run --quiet --with fonttools --with brotli python "$@"; }
# Subset: A-Z a-z 0-9 . , ! ? & ' - and space.
UNI="U+0020,U+0021,U+0026,U+0027,U+002C-002E,U+0030-0039,U+003F,U+0041-005A,U+0061-007A"
# id|family|source path|original family (forbidden in name records)|Reserved Font Names (from OFL.txt; '-' for none)|licence file
FONTS=(
  "didone|TPL Didone|ofl/abrilfatface/AbrilFatface-Regular.ttf|Abril Fatface|Abril|abrilfatface-OFL.txt"
  "condensed|TPL Condensed|ofl/bebasneue/BebasNeue-Regular.ttf|Bebas Neue|-|bebasneue-OFL.txt"
  "serif|TPL Serif|ofl/dmserifdisplay/DMSerifDisplay-Regular.ttf|DM Serif Display|Source|dmserifdisplay-OFL.txt"
  "slab|TPL Slab|ofl/alfaslabone/AlfaSlabOne-Regular.ttf|Alfa Slab One|Alfa Slab|alfaslabone-OFL.txt"
  "black|TPL Black|ofl/archivoblack/ArchivoBlack-Regular.ttf|Archivo Black|-|archivoblack-OFL.txt"
  "typewriter|TPL Typewriter|apache/specialelite/SpecialElite-Regular.ttf|Special Elite|-|specialelite-Apache-2.0.txt"
)
for row in "${FONTS[@]}"; do
  IFS='|' read -r id family src orig rfn lic <<<"$row"
  curl -sfL "$RAW/$src" -o "$WORK/$id.ttf"
  curl -sfL "$RAW/$(dirname "$src")/$([ "${src%%/*}" = apache ] && echo LICENSE.txt || echo OFL.txt)" -o "$OUT/licenses/$lic"
  PYRUN -m fontTools.subset "$WORK/$id.ttf" --unicodes="$UNI" --flavor=woff2 --no-hinting --desubroutinize --output-file="$WORK/$id.woff2"
  PYRUN "$DEV/rename-font.py" "$WORK/$id.woff2" "$family" "$orig" "$([ "$rfn" = - ] && echo "" || echo "$rfn")"
  base64 -i "$WORK/$id.woff2" | tr -d '\n' > "$OUT/tpl-$id.woff2.b64"
done
PYRUN "$DEV/make-looks.py" "$OUT/looks.json" "$WORK/didone.woff2" "$WORK/condensed.woff2" "$WORK/serif.woff2" "$WORK/slab.woff2" "$WORK/black.woff2" "$WORK/typewriter.woff2"
echo "fonts written to $OUT"
