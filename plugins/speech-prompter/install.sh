#!/bin/bash
set -euo pipefail

source_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
panel_dir="${SELECTS_USER_PANELS_ROOT:-$HOME/.selects/panels}/speech-prompter"
data_dir="$HOME/.selects/plugin-data/speech-prompter"

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "Speech Prompter requires macOS." >&2
  exit 1
fi
if ! /usr/bin/xcode-select -p >/dev/null 2>&1; then
  echo "Install the Apple Command Line Tools with xcode-select --install, then rerun this script." >&2
  exit 1
fi

mkdir -p "$data_dir"
stage="$(mktemp -d "$data_dir/.install.XXXXXX")"
trap 'rm -rf -- "$stage"' EXIT

/usr/bin/xcrun swiftc -target "$(uname -m)-apple-macos13.0" -swift-version 5 -parse-as-library -O \
  -module-cache-path "$stage/swift-cache" \
  -Xlinker -sectcreate -Xlinker __TEXT -Xlinker __info_plist \
  -Xlinker "$source_dir/Info.plist" \
  "$source_dir/RealtimeTranscriber.swift" -o "$stage/openai-transcriber"

# Generate machine-local paths after building the helper.
/usr/bin/python3 - "$data_dir" "$stage" <<'PY'
import json
import pathlib
import sys

data_dir = pathlib.Path(sys.argv[1]).resolve()
stage = pathlib.Path(sys.argv[2])
(stage / "openai-runtime.json").write_text(
    json.dumps({"binary": str(data_dir / "openai-transcriber")}, indent=2) + "\n"
)
PY

mkdir -p "$panel_dir"
install -m 755 "$stage/openai-transcriber" "$data_dir/openai-transcriber"
install -m 644 "$stage/openai-runtime.json" "$data_dir/openai-runtime.json"
install -m 644 "$source_dir/bridge.py" "$data_dir/bridge.py"
install -m 644 "$source_dir/panel.tsx" "$panel_dir/panel.tsx"

printf 'Installed %s\n' "$panel_dir/panel.tsx"
printf 'Open Voice-Following Teleprompter from the Plugin list in Selects.\n'
