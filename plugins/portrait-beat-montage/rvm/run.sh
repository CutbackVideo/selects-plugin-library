#!/bin/sh
set -eu
ROOT=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
if ! test -x "$ROOT/.local/venv/bin/python"; then
  echo 'RVM is not ready. Run the plugin setup action first.' >&2
  exit 2
fi
exec "$ROOT/.local/venv/bin/python" "$ROOT/runtime.py" "$@"
