---
name: doac-style
description: Create expressive, speech-timed captions on a separate editable vertical Draft.
---
# DOAC Style

Experimental. Open a vertical English or Korean talking-head Draft and choose **Create
captions**. The panel reads the transcript, plans emphasis, validates approved
typography, and creates a separate editable caption Draft. **Edit captions**
updates wording while preserving caption intervals; **Create another version**
returns to the source.

Video and audio remain separate. Use **Handoff → Export** for final delivery.

Requires macOS or Windows, the packaged font assets, and a Selects AI profile. On
macOS, on first use the Panel downloads a pinned Python (`runtime.sh`) and sets up
Pillow, NumPy, and SciPy in its own environment, so it needs an internet connection
that once. On Windows the same engine runs inside the Panel (`approved/web/`) with
nothing to download. The host controls AI inference. Released-version
compatibility and final export are unverified.
