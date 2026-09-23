# Install Postcard Cutout Studio

Experimental. Requires macOS, Python 3.9 or later (standard library only), FFmpeg and
FFprobe with `libvpx-vp9` and `libx264` (the Selects shell puts its bundled copies on
`PATH`), and a Selects build with Panel `runScript`/`runShell`, managed media
generation through the `MediaGeneration` service (host 2.0.433 or later), and Draft
authoring.

## Setup

1. Place this package in `postcard-cutout-studio` beneath `SELECTS_USER_SKILLS_ROOT`.
   The Panel runs `scene_preview.py` from there.
2. Create `postcard-cutout-studio` beneath `SELECTS_USER_PANELS_ROOT`. Copy
   `panel.tsx` and `pipeline.py` there byte for byte.
3. Decode the sounds into that folder's `sfx/` and check them against the manifest.
   Never overwrite a sound that already exists: Drafts reference sounds by path,
   and each file name is versioned, so an existing name is already the right sound.

   ```sh
   PKG="$SELECTS_USER_SKILLS_ROOT/postcard-cutout-studio"
   PANEL="$SELECTS_USER_PANELS_ROOT/postcard-cutout-studio"
   mkdir -p "$PANEL/sfx"
   for f in "$PKG"/sfx/*.wav.b64; do
     out="$PANEL/sfx/$(basename "$f" .b64)"
     [ -e "$out" ] || base64 -D -i "$f" -o "$out"
   done
   cp "$PKG/sfx/manifest.json" "$PANEL/sfx/manifest.json"
   cd "$PANEL/sfx" && python3 -c 'import json,hashlib,sys;m=json.load(open("manifest.json"));bad=[v["file"] for v in m.values() if hashlib.sha256(open(v["file"],"rb").read()).hexdigest()!=v["sha256"]];print("mismatch: "+", ".join(bad) if bad else "sounds ok");sys.exit(1 if bad else 0)'
   ```

4. Confirm the tools: `python3 --version`, `ffprobe -version`, and
   `ffmpeg -hide_banner -encoders` listing `libvpx-vp9` and `libx264`. If macOS has
   no working `python3`, `xcode-select --install` provides one.
5. With a Project open, open **Postcard Cutout Studio** from the Plugin list.

## Updating

Replace only `panel.tsx`, `pipeline.py` and `sfx/manifest.json`, and add new sounds
with step 3. Keep everything else in the Panel folder: `runs/`, `logs/`, `held/`,
`cutout-inputs/`, `preview-cache/`, older files in `sfx/`, `active-runs.json`,
`service.json` and the lock files. Existing Drafts reference them.

## Limits

- Cloud background removal requires generated-media access and may use credits.
- The mask service runs on this computer only. After a restart, open the Panel
  before previewing or exporting an existing postcard Draft.
- macOS only: the helper uses Unix-only APIs. Tested on Apple silicon with a
  Selects development build; released builds are unverified.

See [THIRD_PARTY.md](THIRD_PARTY.md).
