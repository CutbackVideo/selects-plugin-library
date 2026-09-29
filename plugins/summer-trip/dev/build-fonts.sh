#!/usr/bin/env bash
# plugins/summer-trip/dev/build-fonts.sh
# Dev-only: download Google Fonts sources (github.com/google/fonts), subset to Latin, rename
# every subset to its "ST ..." family (OFL Modified Version), write WOFF2 as base64 text.
# Needs fonttools + brotli in "$TMPDIR/st-fonts" (created with uv; pip TLS can fail in sandboxes).
# An existing venv is reused as is. Network: raw.githubusercontent.com.
set -euo pipefail
VENV="$TMPDIR/st-fonts"
PY="$VENV/bin"
if [ ! -x "$PY/python" ]; then
  export UV_CACHE_DIR="${UV_CACHE_DIR:-$TMPDIR/uvc}"
  uv venv -q "$VENV"
  uv pip install -q --python "$PY/python" fonttools brotli
fi
DEV="$(cd "$(dirname "$0")" && pwd)"
OUT="$DEV/../assets/fonts"
WORK="$TMPDIR/st-fonts-src"; mkdir -p "$OUT/licenses" "$WORK"
RAW=https://raw.githubusercontent.com/google/fonts/main
# Latin-1 + common punctuation (same range as city-weekend-vlog).
UNI="U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD"
# Only kerning and the basic shaping features are kept: display titles need kerning, while
# alternates, fractions, ordinals and the like only add bytes to the run_script payload.
FEATURES="kern,liga,ccmp,locl,mark,mkmk"
# name|source path|variable axis instance or -
FONTS=(
  "poppins-light|ofl/poppins/Poppins-Light.ttf|-"
  "poppins-light-italic|ofl/poppins/Poppins-LightItalic.ttf|-"
  "poppins-bold|ofl/poppins/Poppins-Bold.ttf|-"
  "poppins-black|ofl/poppins/Poppins-Black.ttf|-"
  "anton|ofl/anton/Anton-Regular.ttf|-"
  "gloock|ofl/gloock/Gloock-Regular.ttf|-"
  "instrument-serif-italic|ofl/instrumentserif/InstrumentSerif-Italic.ttf|-"
)
for row in "${FONTS[@]}"; do
  IFS='|' read -r name src axis <<<"$row"
  curl -sfL "$RAW/$src" -o "$WORK/$name.ttf"
  # Each OFL family ships its own OFL.txt (it carries that family's copyright notice and RFNs).
  dir="${src#ofl/}"; dir="${dir%%/*}"
  curl -sfL "$RAW/ofl/$dir/OFL.txt" -o "$OUT/licenses/$dir-OFL.txt"
  if [ "$axis" != "-" ]; then "$PY/fonttools" varLib.instancer "$WORK/$name.ttf" "$axis" -o "$WORK/$name.static.ttf" -q; mv "$WORK/$name.static.ttf" "$WORK/$name.ttf"; fi
  "$PY/pyftsubset" "$WORK/$name.ttf" --unicodes="$UNI" --flavor=woff2 --no-hinting --desubroutinize \
    --layout-features="$FEATURES" --name-IDs='*' --name-languages=0x409 --output-file="$WORK/$name.woff2"
  "$PY/python" "$DEV/rename-font.py" "$WORK/$name.woff2" "$OUT/presets.json" "$name.woff2.b64" "$OUT/licenses/$dir-OFL.txt"
  base64 -i "$WORK/$name.woff2" | tr -d '\n' > "$OUT/$name.woff2.b64"
done
echo "fonts written to $OUT"
