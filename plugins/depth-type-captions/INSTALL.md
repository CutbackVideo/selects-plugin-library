# Install Depth Type Captions

Experimental: macOS arm64 and Selects 2.0.508 or later (development build).

1. Place this package in `depth-type-captions` under `SELECTS_USER_SKILLS_ROOT`.
2. Copy `panel.tsx` byte-for-byte to `SELECTS_USER_PANELS_ROOT/depth-type-captions/panel.tsx`.
3. Install the Xcode Command Line Tools for `swiftc` and `python3` if missing:
   `xcode-select --install`
4. Reload Selects and open the **Depth Type Captions** panel on an edited Draft.

No models, credentials or media files are included. Check with
`swiftc --version` and `python3 --version`.
