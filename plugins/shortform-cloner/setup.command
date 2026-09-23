#!/bin/bash
set -euo pipefail
if [ "$(uname -s)" != Darwin ]; then
  echo 'Use setup.ps1 on Windows. This installer is for macOS.'
  exit 1
fi
if ! command -v brew >/dev/null 2>&1; then
  for candidate in /opt/homebrew/bin/brew /usr/local/bin/brew; do
    if [ -x "$candidate" ]; then export PATH="$(dirname "$candidate"):$PATH"; break; fi
  done
fi
missing=()
python3 -c 'import sys; raise SystemExit(sys.version_info < (3,9))' >/dev/null 2>&1 || missing+=(python)
command -v yt-dlp >/dev/null 2>&1 || missing+=(yt-dlp)
command -v ffmpeg >/dev/null 2>&1 && command -v ffprobe >/dev/null 2>&1 || missing+=(ffmpeg)
if [ "${#missing[@]}" -gt 0 ]; then
  if ! command -v brew >/dev/null 2>&1; then
    echo 'Install Homebrew from https://brew.sh, then run this setup again.'
    exit 1
  fi
  brew install "${missing[@]}"
  export PATH="$(brew --prefix)/bin:$PATH"
fi
plugin_dir="$(cd "$(dirname "$0")" && pwd)"
python3 "$plugin_dir/verify_runtime.py"
panel_root="${SELECTS_USER_PANELS_ROOT:-$HOME/.selects/panels}"
mkdir -p "$panel_root/shortform-cloner"
if [ -f "$panel_root/shortform-cloner/panel.tsx" ]; then
  backup_dir="$HOME/.selects/plugin-data/shortform-cloner/backups"
  mkdir -p "$backup_dir"
  cp "$panel_root/shortform-cloner/panel.tsx" "$backup_dir/panel-before-setup-$(date +%s).tsx"
fi
cp "$plugin_dir/panel.tsx" "$panel_root/shortform-cloner/panel.tsx"
echo 'Installed. Open Selects > Plugin > Selects Clips.'
