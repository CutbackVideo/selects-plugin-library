# Install Postcard Style Template

Experimental: macOS, Python 3 (standard library only, no extra packages), FFmpeg/FFprobe on `PATH`, and a Selects build with generated-media authoring and Panel support. Released-version and Windows/Linux compatibility are unverified.

## Setup

1. Place this package in `swiss-postcard-style` beneath the Selects-provided `SELECTS_USER_SKILLS_ROOT`. Preserve an existing installation's saved `panel-state.json` (per-project selections) when updating; it is not part of this package.
2. Confirm `python3`, `ffmpeg`, and `ffprobe` are on `PATH`. No virtual environment or model download is required — the helper scripts use only the Python standard library plus the system `ffmpeg`/`ffprobe` binaries, and the AI cutout step goes through the host's own `generate_media` tool (no separate provider key).
3. Make `render_template.sh` executable if it is not already: `chmod +x render_template.sh`.
4. Read `panel.tsx` and register it with `save_panel({ name: "swiss-postcard-style", source })`. Follow [SKILL.md](SKILL.md) to build and verify a Draft.

## Limits

- The renderer's transition timing is fixed to an 8.25s subject window at 60fps; the panel enforces this by trimming the user's dragged in-point to a fixed ~8.5s length before any further processing.
- Supports 1–6 landscape panels and 1–12 photos per build; each landscape slot has its own minimum source length depending on how late it appears in the reveal sequence.
- AI background removal can take anywhere from a few minutes to tens of minutes depending on the AI provider's own queue; the panel keeps its build action "in progress" and automatically resumes across a panel reopen, but cannot force a faster turnaround.
- The base render (footage, transitions, photo montage) is one flattened video Resource; only the title stays as a separate editable Motion Graphic. Changing source media, panel/photo counts, or the subject in-point requires building a new Draft rather than editing slots inside an existing one.
- Panel media pickers use still-frame previews, not live video playback, because the panel's own iframe cannot load the host's media scheme into a `<video>` element.

See [THIRD_PARTY.md](THIRD_PARTY.md) for external dependency terms.
