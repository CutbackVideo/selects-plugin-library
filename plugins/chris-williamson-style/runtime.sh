#!/bin/sh
# Pinned plugin runtimes for a stock Mac, fetched on first use.
#
#   sh runtime.sh node     prints the path of Node.js 22.23.3
#   sh runtime.sh python   prints the path of CPython 3.11.13 (uv-managed)
#
# Selects puts no Node or Python on the panel shell's PATH, and a Mac without
# the Xcode Command Line Tools has neither. Every download is pinned by URL and
# SHA-256 and shared by all plugins under ~/.selects/plugin-data/_runtime, so
# the first plugin that needs one pays for it once. Only stock macOS tools are
# used here (sh, curl, shasum, tar, lockf). Progress goes to stderr; the last
# stdout line is the interpreter path.
#
# The library keeps one copy in tools/runtime.sh and each plugin ships it
# unchanged as runtime.sh (tests/test_runtime_copies.py).
set -eu

want=${1:-}
case "$want" in
  node|python) ;;
  *) echo "usage: sh runtime.sh node|python" >&2; exit 2 ;;
esac

STORE="$HOME/.selects/plugin-data/_runtime"
mkdir -p "$STORE"

case "$(uname -m)" in
  arm64)
    NODE_ARCH=arm64
    NODE_SHA=72d5d8832b41c9d9646197af614ffd751406ea4d215060eb91b98864e1919a3e
    UV_ARCH=aarch64
    UV_SHA=3f61099e261e449527141dbf125629fab33ad696468c8c90cebbac40185a306c ;;
  x86_64)
    NODE_ARCH=x64
    NODE_SHA=ac41874c3352937119cfec39e1a98c578fe58ce8a86d7e785b89a4706015f305
    UV_ARCH=x86_64
    UV_SHA=76638fdcfa91357858771551a1c88de1f7c3b270b33ab1866f8a0618d9e442d8 ;;
  *) echo "This Mac's processor ($(uname -m)) is not supported." >&2; exit 2 ;;
esac

dir="$STORE/node-v22.23.3-darwin-$NODE_ARCH"
uv="$STORE/uv-0.8.22-$UV_ARCH/uv"
export UV_PYTHON_INSTALL_DIR="$STORE/python" UV_CACHE_DIR="$STORE/uv-cache" UV_NO_PROGRESS=1
# A published executable is ready only when its pinned version actually runs.
# Warm readers do not wait behind another runtime's download. The installer
# re-enters this check under its own lock, so same-runtime cold callers share it.
runtime_ready() {
  if [ "$want" = node ]; then
    [ -x "$dir/bin/node" ] && "$dir/bin/node" -e 'process.exit(process.version === "v22.23.3" ? 0 : 1)' || return 1
    printf '%s\n' "$dir/bin/node"
  else
    [ -x "$uv" ] || return 1
    py=$("$uv" python find --managed-python 3.11.13 2>/dev/null) || return 1
    "$py" -c 'import sys; sys.exit(0 if sys.version_info[:3] == (3, 11, 13) else 1)' || return 1
    printf '%s\n' "$py"
  fi
}
if runtime_ready; then exit 0; fi
if [ "${SELECTS_RUNTIME_LOCKED:-}" != "$want" ]; then
  SELECTS_RUNTIME_LOCKED="$want" exec /usr/bin/lockf -k -t 280 "$STORE/.$want.lock" /bin/sh "$0" "$want"
fi

# fetch URL SHA256 FILE: download, verify, then move into place. A download the
# panel shell cut short (it stops a call after a few minutes) stays as FILE.partial
# and the next call resumes it; one that fails its checksum is thrown away.
fetch() {
  part="$3.partial"
  echo "Downloading $(basename "$1")…" >&2
  if ! curl --fail --location --retry 2 --proto '=https' --tlsv1.2 -sS -C - "$1" -o "$part" \
    && ! printf '%s  %s\n' "$2" "$part" | shasum -a 256 -c - >/dev/null 2>&1; then
    echo "Could not download $(basename "$1"). Check the internet connection, then try again." >&2
    exit 3
  fi
  if ! printf '%s  %s\n' "$2" "$part" | shasum -a 256 -c - >/dev/null 2>&1; then
    rm -f "$part"
    echo "The download of $(basename "$1") did not match its pinned checksum." >&2
    exit 4
  fi
  mv -f "$part" "$3"
}

# unpack ARCHIVE DIR: extract the archive's single top folder as DIR.
unpack() {
  rm -rf "$2.partial"
  mkdir -p "$2.partial"
  tar -xf "$1" -C "$2.partial" --strip-components 1
  rm -f "$1"
  rm -rf "$2"
  mv "$2.partial" "$2"
}

if [ "$want" = node ]; then
  if ! runtime_ready >/dev/null; then
    fetch "https://nodejs.org/dist/v22.23.3/node-v22.23.3-darwin-$NODE_ARCH.tar.xz" "$NODE_SHA" "$STORE/node.tar.xz"
    unpack "$STORE/node.tar.xz" "$dir"
  fi
  "$dir/bin/node" -e 'process.exit(process.version === "v22.23.3" ? 0 : 1)'
  printf '%s\n' "$dir/bin/node"
  exit 0
fi

if [ ! -x "$uv" ]; then
  fetch "https://github.com/astral-sh/uv/releases/download/0.8.22/uv-$UV_ARCH-apple-darwin.tar.gz" "$UV_SHA" "$STORE/uv.tar.gz"
  unpack "$STORE/uv.tar.gz" "$STORE/uv-0.8.22-$UV_ARCH"
fi
if ! py=$("$uv" python find --managed-python 3.11.13 2>/dev/null); then
  echo "Installing Python 3.11.13…" >&2
  "$uv" python install --no-bin 3.11.13 >&2
  py=$("$uv" python find --managed-python 3.11.13)
fi
"$py" -c 'import sys; sys.exit(0 if sys.version_info[:3] == (3, 11, 13) else 1)'
printf '%s\n' "$py"
