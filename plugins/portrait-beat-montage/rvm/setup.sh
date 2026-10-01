#!/bin/sh
# Prepare an isolated macOS arm64 RVM environment, only on explicit invocation.
set -eu
ROOT=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
LOCAL="$ROOT/.local"
test "$(uname -s)-$(uname -m)" = Darwin-arm64 || { echo 'Supported platform: macOS arm64 only.' >&2; exit 2; }
mkdir -p "$LOCAL"
mkdir "$LOCAL/setup.lock" 2>/dev/null || { echo 'Setup is already running, or its lock needs inspection.' >&2; exit 3; }
trap 'rmdir "$LOCAL/setup.lock"' EXIT
exec >>"$LOCAL/setup.log" 2>&1
date -u '+SETUP START %Y-%m-%dT%H:%M:%SZ'
UV="$LOCAL/uv-aarch64-apple-darwin/uv"
if ! test -x "$UV"; then
  curl --fail --location --retry 2 --proto '=https' --tlsv1.2 \
    https://github.com/astral-sh/uv/releases/download/0.8.22/uv-aarch64-apple-darwin.tar.gz \
    -o "$LOCAL/uv-download.tar.gz"
  printf '%s  %s\n' '3f61099e261e449527141dbf125629fab33ad696468c8c90cebbac40185a306c' "$LOCAL/uv-download.tar.gz" | shasum -a 256 -c -
  tar -xzf "$LOCAL/uv-download.tar.gz" -C "$LOCAL"
fi
export UV_PYTHON_INSTALL_DIR="$LOCAL/python"
export UV_CACHE_DIR="$LOCAL/cache"
export UV_NO_PROGRESS=1
if ! test -x "$LOCAL/venv/bin/python"; then
  "$UV" venv --managed-python --python 3.11.13 "$LOCAL/venv"
fi
"$LOCAL/venv/bin/python" -c 'import sys; assert sys.version_info[:3] == (3,11,13), "Unexpected environment; preserve and inspect it"'
"$UV" pip sync --python "$LOCAL/venv/bin/python" --require-hashes "$ROOT/requirements-hashed.txt"
mkdir -p "$LOCAL/models"
MODEL="$LOCAL/models/rvm_mobilenetv3_fp32.onnx"
if ! test -f "$MODEL"; then
  curl --fail --location --retry 2 --proto '=https' --tlsv1.2 \
    https://github.com/PeterL1n/RobustVideoMatting/releases/download/v1.0.0/rvm_mobilenetv3_fp32.onnx \
    -o "$MODEL.partial"
  printf '%s  %s\n' '88d4531297118f595bf2fd60f6f566aec2e559393802d1f436c380f0cbbd2828' "$MODEL.partial" | shasum -a 256 -c -
  mv "$MODEL.partial" "$MODEL"
fi
printf '%s  %s\n' '88d4531297118f595bf2fd60f6f566aec2e559393802d1f436c380f0cbbd2828' "$MODEL" | shasum -a 256 -c -
"$LOCAL/venv/bin/python" "$ROOT/runtime.py" configure
date -u '+SETUP END %Y-%m-%dT%H:%M:%SZ'
