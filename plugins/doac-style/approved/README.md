# DOAC Style

Open a vertical English talking-head draft and choose **Create captions**. The panel reads the existing transcript, asks Selects AI to plan emphasis, validates the approved typography, and creates a separate editable draft.

Use **Open preview** to review the result. **Edit captions** updates one caption while preserving its clip interval. **Create another version** returns to the original source.

## Implementation

`panel.tsx` owns the user flow. `engine.py` and `native/` retain the approved fonts, composition and animation. `compile-captions.py` packages transparent frame atlases into independent native motion-graphic clips. Video and audio remain separate. Wording is edited through the panel; positioning and scaling are editable on the timeline. Final export uses Selects Handoff → Export.

Current prerequisites: macOS, Python 3 with Pillow and NumPy, the packaged font assets, and a Selects AI profile. The host controls the model and inference effort; the panel does not change account settings. Caption rendering currently uses the validated 540 by 960 working canvas scaled to the draft.

This is a local development installation, not a published cross-platform package.
