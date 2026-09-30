#!/usr/bin/env bash
# plugins/the-end-credits/dev/build-fonts.sh
# Dev-only: download the Google Fonts sources, cut static instances, subset to Latin,
# rename to the "TEC ..." families and write WOFF2 as base64 text.
# Needs network (raw.githubusercontent.com) and uv (fonttools + brotli are fetched by uv).
set -euo pipefail
export UV_CACHE_DIR="${UV_CACHE_DIR:-$TMPDIR/uvc}"
UVX=(uv run -q --no-project --with fonttools --with brotli)
DEV="$(cd "$(dirname "$0")" && pwd)"
OUT="$DEV/../assets/fonts"
WORK="$TMPDIR/tec-fonts-src"; mkdir -p "$OUT/licenses" "$WORK"
RAW=https://raw.githubusercontent.com/google/fonts/main
UNI="U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD"
# out name|source path|variable axis instance or -|family
FONTS=(
  "tec-title-serif|ofl/robotoserif/RobotoSerif%5BGRAD%2Copsz%2Cwdth%2Cwght%5D.ttf|wdth=50 wght=800 opsz=144 GRAD=0|TEC Title Serif"
  "tec-credits-sans|ofl/poppins/Poppins-SemiBold.ttf|-|TEC Credits Sans"
)
for row in "${FONTS[@]}"; do
  IFS='|' read -r name src axis family <<<"$row"
  curl -sfL "$RAW/$src" -o "$WORK/$name.ttf"
  # Each OFL family ships its own OFL.txt (it carries that family's copyright notice).
  dir="${src#ofl/}"; dir="${dir%%/*}"
  curl -sfL "$RAW/ofl/$dir/OFL.txt" -o "$OUT/licenses/$dir-OFL.txt"
  if [ "$axis" != "-" ]; then
    # shellcheck disable=SC2086
    "${UVX[@]}" fonttools varLib.instancer "$WORK/$name.ttf" $axis --static -o "$WORK/$name.static.ttf" -q
    mv "$WORK/$name.static.ttf" "$WORK/$name.ttf"
  fi
  "${UVX[@]}" pyftsubset "$WORK/$name.ttf" --unicodes="$UNI" --flavor=woff2 --no-hinting --desubroutinize --output-file="$WORK/$name.woff2"
  # Subsets are OFL Modified Versions: rename them so no Reserved Font Name is kept.
  "${UVX[@]}" python "$DEV/rename-font.py" "$WORK/$name.woff2" "$family"
  base64 -i "$WORK/$name.woff2" | tr -d '\n' > "$OUT/$name.woff2.b64"
done
echo "fonts written to $OUT"
