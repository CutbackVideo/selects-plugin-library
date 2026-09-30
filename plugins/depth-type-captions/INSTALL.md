# Install Depth Type Captions

Experimental: macOS arm64 with Selects 2.0.508 or later, or Windows x64 with
Selects 2.0.512 or later (development builds).

1. Place this package in `depth-type-captions` under `SELECTS_USER_SKILLS_ROOT`.
2. Copy `panel.tsx` byte-for-byte to `SELECTS_USER_PANELS_ROOT/depth-type-captions/panel.tsx`.
3. macOS only: install the Xcode Command Line Tools for `swiftc` and `python3` if
   missing: `xcode-select --install`. Windows needs nothing more; its speaker
   masks come from Selects generation and use credits.
4. Reload Selects and open the **Depth Type Captions** panel on an edited Draft.

No models, credentials or media files are included. On macOS, check with
`swiftc --version` and `python3 --version`.
