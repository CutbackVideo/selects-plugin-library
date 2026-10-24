# Daily opening font fallback

Daily's opening saved only `fontFamily: Chelsea Market Pro`. Without that local
font, the operating system selected an unrelated fallback. The generated opening
now prefers `Chelsea Market Pro`, then the bundled public `Chelsea Market`.
Other titles, words, animation, reference positions, font size/weight and colors
retain their existing behavior. Custom family editing remains available.

The public base is not Pro. Adobe describes Pro as an expanded variant with more
characters and dynamic OpenType ligatures. This fallback does not establish exact
Pro reproduction or resolve all visual differences against the reference.

The unmodified Google Fonts TrueType source is stored losslessly as
`assets/fonts/chelseamarket/ChelseaMarket-Regular.ttf.b64`, following this
repository's text-encoded font asset convention. Its decoded size is 172,924 bytes
and SHA256 is
`7243be29a2d74e6a826e1091f74c89e58cc8010047c6db8de13f616e81b1f5f2`.
The original OFL.txt and METADATA.pb accompany it. The three packaged files total
235,573 bytes; no public binary checker exception is added.

The script uses a local strict base64 decoder because the real run_script realm
does not supply browser atob/btoa globals. The existing build script reads these assets in chunks of at most 49,152 bytes
before creating a Draft or importing anything. It rejects missing/truncated
files, invalid encoding, noncanonical padding and an unexpected TrueType header.
Only the first saved graphic receives font CSS: the complete original font data,
correct `font/ttf` MIME, and the full OFL notice/license. This adds 235,095 CSS
bytes to that graphic; the other two titles receive no duplicate font data.
Saved graphics need no plugin path, network request or system-wide installation.
The script returns its usual small result, not a font payload.

Whole-production fixtures verify generated font bytes/license, Pro-first order,
all reference cuts/audio/timing, failures before Draft creation, unchanged legacy
1080 rendering, canvas-relative typography, and Windows path initialization.
An independent client-DOM Chrome check verifies the embedded face loads and its
actual glyph advance differs from the OS sans-serif fallback. App-native
readback, playback and export are separate validation steps.

Sources: [Google Fonts metadata](https://github.com/google/fonts/blob/main/ofl/chelseamarket/METADATA.pb),
[original TrueType](https://github.com/google/fonts/blob/main/ofl/chelseamarket/ChelseaMarket-Regular.ttf),
[OFL license](https://github.com/google/fonts/blob/main/ofl/chelseamarket/OFL.txt),
[Adobe's Open/Pro description](https://fonts.adobe.com/fonts/chelsea-market).
