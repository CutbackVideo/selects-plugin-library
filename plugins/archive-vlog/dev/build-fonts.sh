#!/usr/bin/env bash
# plugins/archive-vlog/dev/build-fonts.sh
# Dev-only: download Google Fonts sources, subset to Latin, write WOFF2 as base64 text,
# rename each subset to its `AV ...` family and record its layout metrics in presets.json.
# Needs uv (fonttools + brotli are installed into "$TMPDIR/av-fonts"; an existing venv is
# reused as is). Network: raw.githubusercontent.com, pypi.org, files.pythonhosted.org.
set -euo pipefail
export UV_CACHE_DIR="${UV_CACHE_DIR:-$TMPDIR/uvc}"
VENV="$TMPDIR/av-fonts"
PY="$VENV/bin"
if [ ! -x "$PY/python" ]; then
  uv venv -q "$VENV"
  uv pip install -q --python "$PY/python" fonttools brotli
fi
DEV="$(cd "$(dirname "$0")" && pwd)"
OUT="$DEV/../assets/fonts"
WORK="$TMPDIR/av-fonts-src"; mkdir -p "$OUT/licenses" "$WORK"
RAW=https://raw.githubusercontent.com/google/fonts/main
# Latin-1 plus common punctuation.
UNI="U+0000-00FF,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD"
# name|source path|variable axis instance or -
# Anton: the title (drawn condensed to 0.84, see assets/decode-title.tsx). Oswald Bold: the credit and the title's
# alternative face. Inter (opsz 20, between text and display spacing): Medium kicker, Regular tagline.
FONTS=(
  "anton|ofl/anton/Anton-Regular.ttf|-"
  "oswald-bold|ofl/oswald/Oswald%5Bwght%5D.ttf|wght=700"
  "inter-medium|ofl/inter/Inter%5Bopsz,wght%5D.ttf|wght=500 opsz=20"
  "inter-regular|ofl/inter/Inter%5Bopsz,wght%5D.ttf|wght=400 opsz=20"
)
for row in "${FONTS[@]}"; do
  IFS='|' read -r name src axis <<<"$row"
  curl -sfL "$RAW/$src" -o "$WORK/$name.ttf"
  # Each OFL family ships its own OFL.txt (it carries that family's copyright notice).
  dir="${src#ofl/}"; dir="${dir%%/*}"; curl -sfL "$RAW/ofl/$dir/OFL.txt" -o "$OUT/licenses/$dir-OFL.txt"
  # shellcheck disable=SC2086
  if [ "$axis" != "-" ]; then "$PY/fonttools" varLib.instancer "$WORK/$name.ttf" $axis -o "$WORK/$name.static.ttf" -q; mv "$WORK/$name.static.ttf" "$WORK/$name.ttf"; fi
  # Default layout features without kern (the title measures unkerned advances and draws with kerning off),
  # no hinting: keeps each subset under the size guard.
  "$PY/pyftsubset" "$WORK/$name.ttf" --unicodes="$UNI" --layout-features-=kern --flavor=woff2 --no-hinting --desubroutinize --output-file="$WORK/$name.woff2"
  # Subsets are OFL Modified Versions: rename them to the AV family so no Reserved Font Name
  # is kept, and store the advance widths the title layout measures text with.
  "$PY/python" "$DEV/rename-font.py" "$WORK/$name.woff2" "$OUT/presets.json" "$name.woff2.b64" "$OUT/licenses/$dir-OFL.txt"
  base64 -i "$WORK/$name.woff2" | tr -d '\n' > "$OUT/$name.woff2.b64"
done
echo "fonts written to $OUT"
