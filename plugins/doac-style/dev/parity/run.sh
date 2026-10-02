#!/bin/sh
# Parity of the panel engine (approved/web) with the Python engine on the jobs
# make_jobs.py writes, in each font mode. Dev-time, macOS (mac/winsim modes read
# /System/Library/Fonts).
#
#   sh dev/parity/run.sh <work dir> <python with Pillow, NumPy, SciPy> [modes...]
#
# Then: node dev/parity/compare.js <work dir>/jobs-<mode>
set -eu
HERE=$(cd "$(dirname "$0")" && pwd)
WORK=$1; PY=$2; shift 2
MODES=${*:-mac bundled winsim}
mkdir -p "$WORK"
rm -rf "$WORK/approved" "$WORK/fonts"
cp -R "$HERE/../../approved" "$WORK/approved"
base64 -d < "$WORK/approved/native/fonts/permanentmarker/PermanentMarker-Regular.ttf.b64" > "$WORK/approved/native/fonts/permanentmarker/PermanentMarker-Regular.ttf"
mkdir -p "$WORK/fonts"
for w in Regular Medium Bold; do base64 -d < "$WORK/approved/native/fonts/arimo/Arimo-$w.ttf.b64" > "$WORK/fonts/Arimo-$w.ttf"; done
for mode in $MODES; do
  rm -rf "$WORK/jobs-$mode"
  "$PY" "$HERE/make_jobs.py" "$WORK/jobs-$mode" >/dev/null
  for j in "$WORK/jobs-$mode"/*/; do
    "$PY" "$HERE/run_py.py" "$WORK" "$j" "$mode" catalogue &
    node "$HERE/run_js.js" "$WORK" "$j" "$mode" catalogue &
  done
  wait
done
