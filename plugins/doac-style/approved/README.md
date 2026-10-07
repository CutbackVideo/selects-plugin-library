# DOAC Style

Open a vertical English or Korean talking-head draft and choose **Create captions**. The panel reads the existing transcript, asks Selects AI to plan emphasis, validates the approved typography, and creates a separate editable draft.

Use **Open preview** to review the result. **Edit captions** updates one caption while preserving its clip interval. **Create another version** returns to the original source.

## Implementation

`panel.tsx` owns the user flow. `engine.py` and `native/` retain the approved fonts, composition and animation. `compile-captions.py` packages transparent frame atlases into independent native motion-graphic clips. Video and audio remain separate. Wording is edited through the panel; positioning and scaling are editable on the timeline. Final export uses Selects Handoff → Export.

Current prerequisites: on macOS, Python 3 with Pillow, NumPy and SciPy (the panel sets them up); on Windows, nothing beyond the package: `web/` holds a JavaScript port of `engine.py` and `compile-captions.py` that draws with FreeType and Pillow compiled to WebAssembly and matches the Python engine frame for frame (`../dev/parity/`). Both need the packaged font assets and a Selects AI profile. The host controls the model and inference effort; the panel does not change account settings. Caption rendering currently uses the validated 540 by 960 working canvas scaled to the draft.

This is a local development installation, not a published package.
