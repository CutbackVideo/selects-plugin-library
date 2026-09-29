#!/usr/bin/env bash
# plugins/mini-vlog/dev/build-fonts.sh
# Dev-only: download Google Fonts sources, subset to Latin, write WOFF2 as base64 text,
# rename each subset to its `MV ...` family and record its layout metrics in presets.json.
# Needs uv (fonttools + brotli are installed into "$TMPDIR/mv-fonts"; an existing venv is
# reused as is). Network: raw.githubusercontent.com, pypi.org, files.pythonhosted.org.
set -euo pipefail
export UV_CACHE_DIR="${UV_CACHE_DIR:-$TMPDIR/uvc}"
VENV="$TMPDIR/mv-fonts"
PY="$VENV/bin"
if [ ! -x "$PY/python" ]; then
  uv venv -q "$VENV"
  uv pip install -q --python "$PY/python" fonttools brotli
fi
DEV="$(cd "$(dirname "$0")" && pwd)"
OUT="$DEV/../assets/fonts"
WORK="$TMPDIR/mv-fonts-src"; mkdir -p "$OUT/licenses" "$WORK"
RAW=https://raw.githubusercontent.com/google/fonts/main
# Latin-1 plus common punctuation; U+0131/U+0237 are the dotless i/j the sparkles sit on.
UNI="U+0000-00FF,U+0131,U+0152-0153,U+0237,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD"
# name|source path|variable axis instance or -
FONTS=(
  "dm-serif-display|ofl/dmserifdisplay/DMSerifDisplay-Regular.ttf|-"
  "dm-serif-display-italic|ofl/dmserifdisplay/DMSerifDisplay-Italic.ttf|-"
  "quicksand-bold|ofl/quicksand/Quicksand%5Bwght%5D.ttf|wght=700"
  "dm-mono|ofl/dmmono/DMMono-Regular.ttf|-"
)
for row in "${FONTS[@]}"; do
  IFS='|' read -r name src axis <<<"$row"
  curl -sfL "$RAW/$src" -o "$WORK/$name.ttf"
  # Each OFL family ships its own OFL.txt (it carries that family's copyright notice).
  dir="${src#ofl/}"; dir="${dir%%/*}"; curl -sfL "$RAW/ofl/$dir/OFL.txt" -o "$OUT/licenses/$dir-OFL.txt"
  if [ "$axis" != "-" ]; then "$PY/fonttools" varLib.instancer "$WORK/$name.ttf" "$axis" -o "$WORK/$name.static.ttf" -q; mv "$WORK/$name.static.ttf" "$WORK/$name.ttf"; fi
  # Default layout features (not '*') and no hinting keep each subset under the size guard.
  "$PY/pyftsubset" "$WORK/$name.ttf" --unicodes="$UNI" --flavor=woff2 --no-hinting --desubroutinize --output-file="$WORK/$name.woff2"
  # Subsets are OFL Modified Versions: rename them to the MV family so no Reserved Font Name
  # is kept, and store the advance widths the title layout measures text with.
  "$PY/python" "$DEV/rename-font.py" "$WORK/$name.woff2" "$OUT/presets.json" "$name.woff2.b64"
  base64 -i "$WORK/$name.woff2" | tr -d '\n' > "$OUT/$name.woff2.b64"
done
echo "fonts written to $OUT"
