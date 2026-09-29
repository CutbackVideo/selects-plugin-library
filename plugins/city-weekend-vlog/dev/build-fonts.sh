#!/usr/bin/env bash
# plugins/city-weekend-vlog/dev/build-fonts.sh
# Dev-only: download Google Fonts sources, subset to Latin, write WOFF2 as base64 text.
# Needs fonttools + brotli in "$TMPDIR/cwv-fonts". An existing venv is reused as is;
# it is only created (and the packages installed) when its python is missing.
set -euo pipefail
PY="$TMPDIR/cwv-fonts/bin"
if [ ! -x "$PY/python" ]; then
  python3 -m venv "$TMPDIR/cwv-fonts"
  "$PY/pip" install -q fonttools brotli
fi
DEV="$(cd "$(dirname "$0")" && pwd)"
OUT="$DEV/../assets/fonts"
WORK="$TMPDIR/cwv-fonts-src"; mkdir -p "$OUT/licenses" "$WORK"
RAW=https://raw.githubusercontent.com/google/fonts/main
UNI="U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD"
# name|source path|variable axis instance or -
FONTS=(
  "yellowtail|apache/yellowtail/Yellowtail-Regular.ttf|-"
  "instrument-serif|ofl/instrumentserif/InstrumentSerif-Regular.ttf|-"
  "instrument-serif-italic|ofl/instrumentserif/InstrumentSerif-Italic.ttf|-"
  "sacramento|ofl/sacramento/Sacramento-Regular.ttf|-"
  "great-vibes|ofl/greatvibes/GreatVibes-Regular.ttf|-"
  "playfair-display|ofl/playfairdisplay/PlayfairDisplay%5Bwght%5D.ttf|wght=500"
  "playfair-display-italic|ofl/playfairdisplay/PlayfairDisplay-Italic%5Bwght%5D.ttf|wght=500"
  "parisienne|ofl/parisienne/Parisienne-Regular.ttf|-"
  "lobster|ofl/lobster/Lobster-Regular.ttf|-"
  "abril-fatface|ofl/abrilfatface/AbrilFatface-Regular.ttf|-"
  "pacifico|ofl/pacifico/Pacifico-Regular.ttf|-"
  "bebas-neue|ofl/bebasneue/BebasNeue-Regular.ttf|-"
  "kaushan-script|ofl/kaushanscript/KaushanScript-Regular.ttf|-"
  "dm-serif-display-italic|ofl/dmserifdisplay/DMSerifDisplay-Italic.ttf|-"
  "caveat|ofl/caveat/Caveat%5Bwght%5D.ttf|wght=600"
  "antonio|ofl/antonio/Antonio%5Bwght%5D.ttf|wght=500"
  "allura|ofl/allura/Allura-Regular.ttf|-"
  "cormorant-garamond|ofl/cormorantgaramond/CormorantGaramond%5Bwght%5D.ttf|wght=600"
  "cormorant-garamond-italic|ofl/cormorantgaramond/CormorantGaramond-Italic%5Bwght%5D.ttf|wght=600"
  "mrs-saint-delafield|ofl/mrssaintdelafield/MrsSaintDelafield-Regular.ttf|-"
)
for row in "${FONTS[@]}"; do
  IFS='|' read -r name src axis <<<"$row"
  curl -sfL "$RAW/$src" -o "$WORK/$name.ttf"
  # Each OFL family ships its own OFL.txt (it carries that family's copyright notice).
  case "$src" in ofl/*) dir="${src#ofl/}"; dir="${dir%%/*}"; curl -sfL "$RAW/ofl/$dir/OFL.txt" -o "$OUT/licenses/$dir-OFL.txt";; esac
  if [ "$axis" != "-" ]; then "$PY/fonttools" varLib.instancer "$WORK/$name.ttf" "$axis" -o "$WORK/$name.static.ttf" -q; mv "$WORK/$name.static.ttf" "$WORK/$name.ttf"; fi
  # Default layout features (not '*') and no hinting keep subsets under the size guard; Caveat also drops calt, whose alternates alone exceed it.
  EXTRA=(); if [ "$name" = "caveat" ]; then EXTRA=(--layout-features-=calt); fi
  "$PY/pyftsubset" "$WORK/$name.ttf" --unicodes="$UNI" --flavor=woff2 --no-hinting --desubroutinize ${EXTRA[@]+"${EXTRA[@]}"} --output-file="$WORK/$name.woff2"
  # Subsets are OFL Modified Versions: rename them to the CWV family so no Reserved Font Name is kept.
  "$PY/python" "$DEV/rename-font.py" "$WORK/$name.woff2" "$OUT/presets.json" "$name.woff2.b64"
  base64 -i "$WORK/$name.woff2" | tr -d '\n' > "$OUT/$name.woff2.b64"
done
curl -sfL "$RAW/apache/yellowtail/LICENSE.txt" -o "$OUT/licenses/Apache-2.0.txt"
echo "fonts written to $OUT"
