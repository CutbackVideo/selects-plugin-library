#!/bin/sh
# Rebuild approved/web/raster.wasm.b64: FreeType 2.14.3 plus the Pillow 12.3.0
# C code the caption engine draws with (text layout/render of _imagingft.c,
# ported in raster.c; libImaging Resample, BoxBlur, Paste, Crop, GetBBox, Copy,
# Fill, Geometry, Access, Mode), compiled to wasm32-wasi with zig cc.
# Dev-time only (macOS or Linux); the panel just loads the result.
#
#   sh dev/raster/build.sh [work dir]
#
# Needs python3 (for pip-installed ziglang 0.16.0), curl, tar, shasum.
set -eu
HERE=$(cd "$(dirname "$0")" && pwd)
PLUGIN=$(cd "$HERE/../.." && pwd)
WORK=${1:-$(mktemp -d)}
mkdir -p "$WORK"
cd "$WORK"

fetch() { # url sha256 file
  [ -f "$3" ] || curl --fail --location -sS "$1" -o "$3"
  echo "$2  $3" | shasum -a 256 -c - >/dev/null || { echo "checksum mismatch: $3" >&2; exit 1; }
}
fetch https://github.com/freetype/freetype/archive/refs/tags/VER-2-14-3.tar.gz \
  dc49de6b01a266eef4876a4dd34d9842c475d3e28ff2eff63bd2fb760ab56261 freetype.tgz
fetch https://files.pythonhosted.org/packages/1c/3d/bb7fca845737cf9d7dbde16ed1843984665ff2e0a518f5db43e77ec540b9/pillow-12.3.0.tar.gz \
  3b8182a766685eaa002637e28b4ec8d6b18819a0c71f579bf0dbaa5830297cce pillow.tgz
[ -d freetype-VER-2-14-3 ] || tar xzf freetype.tgz
[ -d pillow-12.3.0 ] || tar xzf pillow.tgz
# ZIG may name an existing zig 0.16.0 (e.g. "python3 -m ziglang").
if [ -z "${ZIG:-}" ]; then
  [ -x zig/bin/python ] || { python3 -m venv zig && zig/bin/pip install -q ziglang==0.16.0; }
  ZIG="zig/bin/python -m ziglang"
fi
export ZIG_GLOBAL_CACHE_DIR="$WORK/zigcache" ZIG_LOCAL_CACHE_DIR="$WORK/zigcache"

FT=freetype-VER-2-14-3
PIL=pillow-12.3.0/src/libImaging
# FreeType's default options, minus the compression libraries and the
# FREETYPE_PROPERTIES environment variable; no setjmp in wasm (the cmap
# validator only longjmps on a broken font, which then traps).
mkdir -p cfg/freetype/config py
sed -e 's|^#define FT_CONFIG_OPTION_USE_ZLIB|/* no zlib */|' \
    -e 's|^#define FT_CONFIG_OPTION_USE_LZW|/* no lzw */|' \
    -e 's|^#define FT_CONFIG_OPTION_ENVIRONMENT_PROPERTIES|/* no env */|' \
    $FT/include/freetype/config/ftoption.h > cfg/freetype/config/ftoption.h
sed -e 's|^#include <setjmp.h>|typedef int doac_jmp_buf[1];|' \
    -e 's|^#define ft_jmp_buf     jmp_buf.*|#define ft_jmp_buf doac_jmp_buf|' \
    -e 's|^#define ft_longjmp     longjmp|#define ft_longjmp(b,v) __builtin_trap()|' \
    -e 's|^#define ft_setjmp( b ) setjmp.*|#define ft_setjmp( b ) 0|' \
    $FT/include/freetype/config/ftstdlib.h > cfg/freetype/config/ftstdlib.h
cat > cfg/freetype/config/ftmodule.h <<'EOF'
FT_USE_MODULE( FT_Module_Class, autofit_module_class )
FT_USE_MODULE( FT_Driver_ClassRec, tt_driver_class )
FT_USE_MODULE( FT_Module_Class, psnames_module_class )
FT_USE_MODULE( FT_Module_Class, sfnt_module_class )
FT_USE_MODULE( FT_Renderer_Class, ft_smooth_renderer_class )
EOF
cp "$HERE/Python.h" py/Python.h

CFLAGS="-target wasm32-wasi -O2 -fno-fast-math -ffp-contract=off"
OBJS=""
mkdir -p obj
for f in base/ftsystem base/ftinit base/ftdebug base/ftbase base/ftbbox base/ftbitmap base/ftglyph base/ftstroke base/ftmm \
         sfnt/sfnt truetype/truetype smooth/smooth autofit/autofit psnames/psnames; do
  o=obj/ft_$(basename $f).o
  $ZIG cc $CFLAGS -DFT2_BUILD_LIBRARY -Icfg -I$FT/include -c $FT/src/$f.c -o $o
  OBJS="$OBJS $o"
done
for f in Resample BoxBlur Paste Crop GetBBox Mode Copy Fill Geometry Access; do
  o=obj/pil_$f.o
  $ZIG cc $CFLAGS -Ipy -I$PIL -c $PIL/$f.c -o $o
  OBJS="$OBJS $o"
done
$ZIG cc $CFLAGS -Ipy -I$PIL -Icfg -I$FT/include -c "$HERE/raster.c" -o obj/raster.o
$ZIG cc $CFLAGS -mexec-model=reactor -Wl,--export-dynamic -Wl,--strip-all -o raster.wasm $OBJS obj/raster.o
base64 < raster.wasm | tr -d '\n' > "$PLUGIN/approved/web/raster.wasm.b64"
echo "raster.wasm: $(wc -c < raster.wasm) bytes -> approved/web/raster.wasm.b64"
